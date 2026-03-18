"""Test plugin base/link/mcp/workflow module"""

# pylint: disable=missing-function-docstring,protected-access
# pylint: disable=unused-argument,import-outside-toplevel
# pylint: disable=too-few-public-methods,unused-variable

from dataclasses import dataclass
from typing import Any

import pytest
from agent.exceptions.plugin_exc import PluginExc
from agent.service.plugin.base import BasePlugin, PluginResponse
from agent.service.plugin.link import LinkPluginFactory, LinkPluginRunner
from agent.service.plugin.workflow import (
    ResponseContext,
    WorkflowPluginFactory,
    WorkflowPluginRunner,
)
from common.otlp import sid as sid_module
from common.otlp.trace.span import Span


@dataclass
class _DummySidGen:
    """Simple sid generator for testing environment."""

    value: str = "test-sid"

    def gen(self) -> str:  # pragma: no cover
        """Generate a test sid value."""
        return self.value


@pytest.fixture(autouse=True)
def _setup_test_environment() -> None:
    """Automatically inject environment fixes for all tests.

    - Ensure ``sid_generator2`` is initialized.
    """
    # Initialize sid generator
    if sid_module.sid_generator2 is None:
        sid_module.sid_generator2 = _DummySidGen()  # type: ignore[assignment]


class TestPluginBase:
    """Test PluginResponse / BasePlugin"""

    def test_plugin_response_basic(self) -> None:
        resp = PluginResponse(
            code=0, sid="s", start_time=1, end_time=2, result={"ok": True}
        )
        assert resp.code == 0
        assert resp.sid == "s"
        assert resp.result["ok"] is True
        assert resp.log == []

    def test_base_plugin_creation(self) -> None:
        async def dummy_run(*args: Any, **kwargs: Any) -> None:  # noqa: ANN401
            return None

        plugin = BasePlugin(
            name="p",
            description="d",
            schema_template="st",
            typ="t",
            run=dummy_run,
        )
        assert plugin.name == "p"
        assert plugin.run_result is None


class TestLinkPluginRunner:
    """Test LinkPluginRunner logic"""

    @pytest.fixture
    def runner(self) -> LinkPluginRunner:
        """Create LinkPluginRunner instance for testing."""
        return LinkPluginRunner(
            app_id="app",
            uid="u",
            tool_id="tool1",
            version="V1.0",
            operation_id="op1",
            method_schema={
                "parameters": [
                    {
                        "in": "header",
                        "name": "X-A",
                        "schema": {
                            "x-from": 0,
                            "default": "d",
                        },
                    },
                    {
                        "in": "query",
                        "name": "q1",
                        "schema": {
                            "x-from": 1,
                            "default": 1,
                        },
                    },
                ],
                "requestBody": {
                    "content": {
                        "application/json": {
                            "schema": {
                                "properties": {
                                    "f1": {
                                        "type": "string",
                                        "x-from": 0,
                                        "default": "x",
                                    },
                                }
                            }
                        }
                    }
                },
            },
        )

    def test_assemble_parameters(self, runner: LinkPluginRunner) -> None:
        header, query = runner.assemble_parameters({"X-A": "override"}, {"q1": 2})
        assert header["X-A"] == "override"
        # q1 comes from business_input (x-from=1)
        assert query["q1"] == 2

    def test_assemble_body(self, runner: LinkPluginRunner) -> None:
        body_schema = runner.method_schema["requestBody"]["content"][
            "application/json"
        ]["schema"]
        body = runner.assemble_body(body_schema, {"f1": "y"}, {})
        assert body["f1"] == "y"

    def test_dumps(self) -> None:
        payload = {"a": 1}
        s = LinkPluginRunner.dumps(payload)
        assert s
        # Empty payload returns empty string
        assert LinkPluginRunner.dumps({}) == ""


class TestLinkPluginFactoryParseSchemas:
    """Test LinkPluginFactory schema parsing logic"""

    @pytest.fixture
    def factory(self) -> LinkPluginFactory:
        """Create LinkPluginFactory for testing."""
        return LinkPluginFactory(app_id="app", uid="u", tool_ids=[])

    def test_parse_request_query_schema(self, factory: LinkPluginFactory) -> None:
        schema = [
            {
                "name": "p1",
                "in": "query",
                "description": "d",
                "required": True,
                "schema": {"type": "string", "x-from": 0},
            }
        ]
        params, required = factory.parse_request_query_schema(schema)
        assert params["p1"]["type"] == "string"
        assert "p1" in required

    def test_recursive_parse_request_body_schema(
        self, factory: LinkPluginFactory
    ) -> None:
        body_schema = {
            "properties": {
                "f1": {
                    "type": "string",
                    "description": "d",
                    "x-from": 0,
                },
                "nested": {
                    "type": "object",
                    "properties": {
                        "f2": {
                            "type": "number",
                            "description": "n",
                            "x-from": 0,
                        }
                    },
                },
            },
            "required": ["f1"],
        }
        props: dict[str, dict[str, Any]] = {}
        required: set[str] = set()
        factory.recursive_parse_request_body_schema(body_schema, props, required)
        assert "f1" in props and "f2" in props
        assert "f1" in required


class TestMcpPluginRunnerAndFactory:
    """Test McpPluginRunner and McpPluginFactory"""

    @pytest.mark.asyncio
    async def test_mcp_plugin_runner_timeout(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        import asyncio

        from agent.service.plugin.mcp import McpPluginRunner

        runner = McpPluginRunner(
            server_id="sid",
            server_url="url",
            sid="",
            name="t",
        )
        span = Span(app_id="app", uid="u")

        async def mock_post(*args: Any, **kwargs: Any) -> Any:  # noqa: ANN401
            raise asyncio.TimeoutError()

        import aiohttp

        # Return async CM that raises timeout
        class _CM:
            """Async context manager for timeout."""

            async def __aenter__(self) -> None:
                import asyncio

                raise asyncio.TimeoutError()

            async def __aexit__(
                self,
                exc_type: Any,
                exc: Any,
                tb: Any,
            ) -> bool:  # noqa: ANN001
                return False

        monkeypatch.setattr(
            aiohttp.ClientSession,
            "post",
            lambda *a, **k: _CM(),
        )

        # Catch as PluginExc uniformly
        with pytest.raises(PluginExc):
            await runner.run({}, span)

    @pytest.mark.asyncio
    async def test_mcp_factory_convert_tool(self) -> None:
        from agent.service.plugin.mcp import McpPluginFactory

        tool = {
            "name": "t",
            "description": "d",
            "inputSchema": {
                "properties": {
                    "x": {"type": "string"},
                },
                "required": ["x"],
            },
        }
        schema = await McpPluginFactory.convert_tool(tool)
        assert "tool_name:t" in schema
        assert "tool_description:d" in schema


class TestWorkflowPluginRunnerAndFactory:
    """Test WorkflowPluginRunner / Factory"""

    def test_response_context_dataclass(self) -> None:
        ctx = ResponseContext(
            code=0,
            sid="s",
            start_time=1,
            end_time=2,
            action_input={"x": 1},
        )
        assert ctx.code == 0
        assert ctx.sid == "s"

    def test_build_request_params(self) -> None:
        runner = WorkflowPluginRunner(app_id="app", uid="u", flow_id="fid")
        params = runner._build_request_params({"p": 1})
        assert params["extra_body"]["flow_id"] == "fid"
        assert params["extra_body"]["parameters"] == {"p": 1}

    def test_create_error_and_success_response(
        self,
    ) -> None:
        runner = WorkflowPluginRunner(app_id="app", uid="u", flow_id="fid")
        ctx = ResponseContext(
            code=1,
            sid="s",
            start_time=1,
            end_time=2,
            action_input={"x": 1},
        )
        err_resp = runner._create_error_response(ctx, {"code": 1})
        assert err_resp.code == 1
        ok_resp = runner._create_success_response(ctx, "c", "r")
        assert ok_resp.result["content"] == "c"
        assert ok_resp.result["reasoning_content"] == "r"

    @pytest.mark.asyncio
    async def test_workflow_runner_timeout(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        runner = WorkflowPluginRunner(app_id="app", uid="u", flow_id="fid")
        span = Span(app_id="app", uid="u")

        # mock AsyncOpenAI to raise timeout
        import agent.service.plugin.workflow as wf_mod
        import httpx

        # Mock supporting chat.completions.create
        class DummyCompletions:
            """Mock completions."""

            async def create(
                self, *args: Any, **kwargs: Any
            ) -> Any:  # noqa: ANN401,E501
                raise httpx.TimeoutException("timeout")

        class DummyChat:
            """Mock chat."""

            def __init__(self) -> None:
                self.completions = DummyCompletions()

        class DummyClient:
            """Mock client."""

            def __init__(self, *args: Any, **kwargs: Any) -> None:  # noqa: ANN401
                self.chat = DummyChat()

        class DummyConfig:
            """Mock config."""

            WORKFLOW_SSE_BASE_URL = "http://workflow"

        monkeypatch.setattr(wf_mod, "AsyncOpenAI", DummyClient)
        monkeypatch.setattr(
            wf_mod,
            "agent_config",
            DummyConfig(),
            raising=False,
        )

        with pytest.raises(PluginExc):
            async for _ in runner.run({"x": 1}, span):
                pass

    @pytest.mark.asyncio
    async def test_workflow_factory_create_default_plugin(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        factory = WorkflowPluginFactory(app_id="app", uid="u", workflow_ids=[])
        # When schema has no node-start node, take default
        schema = {
            "data": {
                "data": {
                    "id": "fid",
                    "name": "n",
                    "description": "d",
                    "data": {"nodes": []},
                }
            }
        }
        plugin = await factory.create_workflow_plugin(schema)
        assert plugin.flow_id == "fid"
        assert plugin.typ == "workflow"
