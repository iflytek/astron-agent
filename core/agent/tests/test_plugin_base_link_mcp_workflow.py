"""Test plugin base/link/mcp/workflow module"""

import json
from base64 import b64decode
from dataclasses import dataclass
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from common.otlp import sid as sid_module
from common.otlp.trace.span import Span
from openai import AsyncOpenAI
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter

from agent.exceptions.plugin_exc import PluginExc
from agent.service.plugin.base import BasePlugin, PluginResponse
from agent.service.plugin.link import LinkPluginFactory, LinkPluginRunner
from agent.service.plugin.workflow import (
    ResponseContext,
    WorkflowPluginFactory,
    WorkflowPluginRunner,
)


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


class TestWorkflowPluginRunnerAndFactory:
    """Test WorkflowPluginRunner / Factory partial logic"""

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
        assert params["extra_body"]["ext"] == {
            "bot_id": "workflow",
            "caller": "agent",
        }
        assert params["extra_headers"]["X-Workflow-Internal-Key"] == "i" * 32
        assert "extra_body" not in params["extra_body"]

    @pytest.mark.asyncio
    async def test_openai_wire_request_preserves_nested_trace_context(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("LANGFUSE_ENABLED", "true")
        monkeypatch.setenv("LANGFUSE_PUBLIC_KEY", "pk-test")
        monkeypatch.setenv("LANGFUSE_SECRET_KEY", "sk-test")
        monkeypatch.setenv("ASTRON_TRACE_CONTEXT_SECRET", "astron-trace-test-secret")
        captured: dict[str, Any] = {}

        async def handle_request(request: httpx.Request) -> httpx.Response:
            captured["body"] = json.loads(request.content)
            captured["headers"] = dict(request.headers)
            return httpx.Response(
                200,
                headers={"content-type": "text/event-stream"},
                content=b"data: [DONE]\n\n",
            )

        provider = TracerProvider()
        tracer = provider.get_tracer("agent-workflow-wire-test")
        runner = WorkflowPluginRunner(
            app_id="synthetic-app", uid="synthetic-user", flow_id="flow-42"
        )

        try:
            async with httpx.AsyncClient(
                transport=httpx.MockTransport(handle_request)
            ) as http_client:
                client = AsyncOpenAI(
                    base_url="http://workflow.test/workflow/v1",
                    api_key="synthetic-key",
                    http_client=http_client,
                )
                with tracer.start_as_current_span("agent.workflow-handoff") as parent:
                    params = runner._build_request_params({"city": "Hefei"})
                    stream = await client.chat.completions.create(**params)
                    async for _ in stream:
                        pass

                    parent_context = parent.get_span_context()
        finally:
            provider.shutdown()

        assert captured["body"]["ext"] == {
            "bot_id": "workflow",
            "caller": "agent",
        }
        traceparent = captured["headers"]["traceparent"].split("-")
        assert traceparent[1] == f"{parent_context.trace_id:032x}"
        assert traceparent[2] == f"{parent_context.span_id:016x}"
        assert "x-astron-langfuse-trace-timestamp" in captured["headers"]
        assert "x-astron-langfuse-trace-signature" in captured["headers"]

    def test_create_error_and_success_response(self) -> None:
        runner = WorkflowPluginRunner(app_id="app", uid="u", flow_id="fid")
        ctx = ResponseContext(
            code=1, sid="s", start_time=1, end_time=2, action_input={"x": 1}
        )
        err_resp = runner._create_error_response(ctx, {"code": 1})
        assert err_resp.code == 1
        ok_resp = runner._create_success_response(ctx, "c", "r")
        assert ok_resp.result["content"] == "c"
        assert ok_resp.result["reasoning_content"] == "r"

    @pytest.mark.asyncio
    async def test_query_workflow_schema_sends_internal_key_without_logging_it(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        import aiohttp

        import agent.service.plugin.workflow as workflow_module

        configured_key = "q" * 32
        monkeypatch.setenv("WORKFLOW_INTERNAL_API_KEY", configured_key)
        monkeypatch.delenv("WORKFLOW_INTERNAL_API_KEY_FILE", raising=False)

        class DummyConfig:
            GET_WORKFLOWS_URL = "http://workflow/sparkflow/v1/protocol/get"

        monkeypatch.setattr(workflow_module, "agent_config", DummyConfig())
        captured: dict[str, Any] = {}
        disclosed_api_key = "workflow-api-key-must-not-enter-telemetry"
        disclosed_api_secret = "workflow-api-secret-must-not-enter-telemetry"
        protocol_marker = "workflow-protocol-body-must-not-enter-telemetry"
        payload = {
            "code": 0,
            "sid": "safe-request-id",
            "data": {
                "data": {
                    "id": "flow-1",
                    "apiKey": disclosed_api_key,
                    "apiSecret": disclosed_api_secret,
                    "data": {"nodes": [{"prompt": protocol_marker}]},
                }
            },
        }

        class ResponseContextManager:
            async def __aenter__(self) -> "ResponseContextManager":
                return self

            async def __aexit__(self, exc_type: Any, exc: Any, traceback: Any) -> bool:
                return False

            def raise_for_status(self) -> None:
                return None

            async def json(self) -> dict[str, Any]:
                return payload

        def fake_post(
            _session: aiohttp.ClientSession, url: str, **kwargs: Any
        ) -> ResponseContextManager:
            captured.update({"url": url, **kwargs})
            return ResponseContextManager()

        monkeypatch.setattr(aiohttp.ClientSession, "post", fake_post)
        span = MagicMock(spec=Span)
        span_context = MagicMock()
        span.start.return_value.__enter__.return_value = span_context

        result = await WorkflowPluginFactory.do_query_workflow_schema("flow-1", span)

        assert result == payload
        assert captured["headers"] == {"X-Workflow-Internal-Key": configured_key}
        telemetry_calls = span_context.add_info_events.call_args_list
        telemetry_text = repr(telemetry_calls)
        assert configured_key not in telemetry_text
        assert disclosed_api_key not in telemetry_text
        assert disclosed_api_secret not in telemetry_text
        assert protocol_marker not in telemetry_text
        output_attributes = telemetry_calls[1].kwargs["attributes"]
        output_summary = json.loads(
            output_attributes["workflow-plugin-do-query-workflow-schema-outputs"]
        )
        assert output_summary == {
            "code": 0,
            "sid": "safe-request-id",
            "flow_id": "flow-1",
            "has_data": True,
        }

    @pytest.mark.asyncio
    async def test_query_workflow_schema_fails_closed_without_internal_key(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.delenv("WORKFLOW_INTERNAL_API_KEY", raising=False)
        monkeypatch.delenv("WORKFLOW_INTERNAL_API_KEY_FILE", raising=False)
        span = MagicMock(spec=Span)
        span_context = MagicMock()
        span.start.return_value.__enter__.return_value = span_context

        with pytest.raises(PluginExc):
            await WorkflowPluginFactory.do_query_workflow_schema("flow-1", span)

    @pytest.mark.asyncio
    async def test_workflow_runner_timeout(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("LANGFUSE_ENABLED", "true")
        monkeypatch.setenv("LANGFUSE_PUBLIC_KEY", "pk-test")
        monkeypatch.setenv("LANGFUSE_SECRET_KEY", "sk-test")
        monkeypatch.setenv("ASTRON_TRACE_CONTEXT_SECRET", "astron-trace-test-secret")
        runner = WorkflowPluginRunner(app_id="app", uid="u", flow_id="fid")
        exporter = InMemorySpanExporter()
        provider = TracerProvider()
        provider.add_span_processor(SimpleSpanProcessor(exporter))
        span = Span(app_id="app", uid="u")
        span.tracer = provider.get_tracer("workflow-plugin-log-redaction-test")

        # mock AsyncOpenAI.chat.completions.create to raise timeout
        import httpx

        import agent.service.plugin.workflow as wf_mod

        # Create mock object supporting chat.completions.create structure
        class DummyCompletions:
            async def create(
                self, *args: Any, **kwargs: Any
            ) -> Any:  # noqa: ANN401,E501
                raise httpx.TimeoutException("timeout")

        class DummyChat:
            def __init__(self) -> None:
                self.completions = DummyCompletions()

        class DummyClient:
            def __init__(self, *args: Any, **kwargs: Any) -> None:  # noqa: ANN401
                self.chat = DummyChat()

        # Simply monkeypatch AsyncOpenAI to an object that raises exceptions, and add workflow required configuration
        class DummyConfig:
            WORKFLOW_SSE_BASE_URL = "http://workflow"

        monkeypatch.setattr(wf_mod, "AsyncOpenAI", DummyClient)
        # workflow module originally doesn't have agent_config attribute, here dynamically add it via raising=False
        monkeypatch.setattr(wf_mod, "agent_config", DummyConfig(), raising=False)

        try:
            with pytest.raises(PluginExc):
                async for _ in runner.run({"x": 1}, span):
                    pass

            finished = exporter.get_finished_spans()
            assert len(finished) == 1
            event_attributes = [
                dict(event.attributes or {}) for event in finished[0].events
            ]
            logged_request = next(
                attributes["workflow-plugin-run-inputs"]
                for attributes in event_attributes
                if "workflow-plugin-run-inputs" in attributes
            )
            assert isinstance(logged_request, str)
            assert "traceparent" not in logged_request
            assert "tracestate" not in logged_request
            assert "baggage" not in logged_request
            assert "x-astron-langfuse-trace-timestamp" not in logged_request
            assert "x-astron-langfuse-trace-signature" not in logged_request
            assert "X-Workflow-Internal-Key" not in logged_request
            assert "i" * 32 not in logged_request
        finally:
            provider.shutdown()

    @pytest.mark.asyncio
    async def test_workflow_factory_create_default_plugin(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        factory = WorkflowPluginFactory(app_id="app", uid="u", workflow_ids=[])
        # When schema has no node-start node, take default branch
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
