"""Test plugin base/link/mcp/workflow module"""

import json
from base64 import b64decode
from dataclasses import dataclass
from typing import Any
from unittest.mock import AsyncMock, patch

import pytest
from common.otlp import sid as sid_module
from common.otlp.trace.span import Span

from agent.exceptions.plugin_exc import PluginExc
from agent.service.plugin.base import BasePlugin, PluginResponse
from agent.service.plugin.link import LinkPluginFactory, LinkPluginRunner


@dataclass
class _DummySidGen:
    """Simple sid generator for testing environment."""

    value: str = "test-sid"

    def gen(self) -> str:  # pragma: no cover - only for testing environment
        return self.value


@pytest.fixture(autouse=True)
def _setup_test_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    """Automatically inject environment fixes for all tests.

    - Ensure `sid_generator2` is initialized to avoid `Span` construction failure.
    """
    # Initialize sid generator to avoid Span throwing "sid_generator2 is not initialized"
    if sid_module.sid_generator2 is None:
        sid_module.sid_generator2 = _DummySidGen()  # type: ignore[assignment]
    monkeypatch.setenv("WORKFLOW_INTERNAL_API_KEY", "i" * 32)


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
    """Test LinkPluginRunner logic for assembling parameters and body"""

    @pytest.fixture
    def runner(self) -> LinkPluginRunner:
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
                        "schema": {"x-from": 0, "default": "d"},
                    },
                    {
                        "in": "query",
                        "name": "q1",
                        "schema": {"x-from": 1, "default": 1},
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
        header, query, path = runner.assemble_parameters({"X-A": "override"}, {"q1": 2})
        assert path == {}
        assert header["X-A"] == "override"
        # q1 comes from business_input (x-from=1)
        assert query["q1"] == 2

    def test_assemble_body(self, runner: LinkPluginRunner) -> None:
        body_schema = runner.method_schema["requestBody"]["content"][
            "application/json"
        ]["schema"]
        body = runner.assemble_body(body_schema, {"f1": "y"}, {})
        assert body is not None
        assert body["f1"] == "y"

    def test_dumps(self) -> None:
        payload = {"a": 1}
        s = LinkPluginRunner.dumps(payload)
        assert s
        # Explicit empty JSON differs from an omitted payload.
        assert json.loads(b64decode(LinkPluginRunner.dumps({}))) == {}
        assert LinkPluginRunner.dumps(None) == ""


class TestLinkPluginFactoryParseSchemas:
    """Test LinkPluginFactory schema parsing logic (without real link service request)"""

    @pytest.fixture
    def factory(self) -> LinkPluginFactory:
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
        params, required = factory.parse_request_parameters_schema(schema)
        assert params["p1"]["type"] == "string"
        assert "p1" in required


class TestMcpPluginRunnerAndFactory:
    """Test McpPluginRunner and McpPluginFactory partial logic"""

    @pytest.mark.asyncio
    async def test_mcp_plugin_runner_timeout(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        import asyncio

        from agent.service.plugin.mcp import McpPluginRunner

        runner = McpPluginRunner(server_id="sid", server_url="url", sid="", name="t")
        span = Span(app_id="app", uid="u")

        async def mock_post(*args: Any, **kwargs: Any) -> Any:  # noqa: ANN401
            raise asyncio.TimeoutError()

        import aiohttp

        # aiohttp.ClientSession.post is used as async with in source code, needs to return async CM
        class _CM:
            async def __aenter__(self) -> None:
                import asyncio  # Local import to avoid NameError

                raise asyncio.TimeoutError()

            async def __aexit__(
                self, exc_type: Any, exc: Any, tb: Any
            ) -> bool:  # noqa: ANN001
                return False

        monkeypatch.setattr(aiohttp.ClientSession, "post", lambda *a, **k: _CM())

        # Runtime will trigger PluginExc through RunMcpPluginExc (instance), here catch as PluginExc uniformly
        with pytest.raises(PluginExc):
            await runner.run({}, span)

    @pytest.mark.asyncio
    async def test_mcp_factory_convert_tool(self) -> None:
        from agent.service.plugin.mcp import McpPluginFactory

        tool = {
            "name": "t",
            "description": "d",
            "inputSchema": {"properties": {"x": {"type": "string"}}, "required": ["x"]},
        }
        schema = await McpPluginFactory.convert_tool(tool)
        assert "tool_name:t" in schema
        assert "tool_description:d" in schema


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "servers",
    [
        [],
        [{"server_id": "configured", "server_status": 500, "server_message": "secret"}],
    ],
)
async def test_mcp_initialization_failure_cannot_silently_remove_tools(
    servers: Any,
) -> None:
    from agent.exceptions.plugin_exc import PluginExc
    from agent.service.plugin.mcp import McpPluginFactory

    factory = McpPluginFactory(
        app_id="app", mcp_server_ids=["configured"], mcp_server_urls=[]
    )
    with patch.object(
        McpPluginFactory, "query_servers", AsyncMock(return_value=servers)
    ):
        with pytest.raises(PluginExc) as error:
            await factory.build_tools(Span(app_id="test", uid="user"))
        assert error.value.c == 40026
        assert "secret" not in str(error.value)
