from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import Any

import pytest
from aiohttp import web
from common.otlp import sid as sid_module
from common.otlp.log_trace.node_trace_log import NodeTraceLog
from common.otlp.trace.span import Span

from agent.api.schemas.llm_message import LLMMessage
from agent.engine.nodes.pi.pi_runner import PiModelConfig, PiRunner
from agent.exceptions.agent_exc import AgentExc
from agent.service.plugin.base import BasePlugin, PluginResponse
from agent.service.plugin.mcp import McpPlugin


@dataclass
class _DummySidGen:
    value: str = "test-sid"

    def gen(self) -> str:
        return self.value


@pytest.fixture(autouse=True)
def _setup_test_environment() -> None:
    if sid_module.sid_generator2 is None:
        sid_module.sid_generator2 = _DummySidGen()  # type: ignore[assignment]


def node_trace() -> NodeTraceLog:
    return NodeTraceLog(
        service_id="test_service",
        sid="test_sid",
        app_id="test_app",
        uid="test_uid",
        chat_id="test_chat",
        sub="Agent",
    )


@asynccontextmanager
async def serve_pi(
    port: int, handler: Callable[[web.Request], Any]
) -> AsyncIterator[str]:
    app = web.Application()
    app.router.add_get("/internal/v1/runs", handler)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "127.0.0.1", port)
    await site.start()
    try:
        yield f"ws://127.0.0.1:{port}/internal/v1/runs"
    finally:
        await runner.cleanup()


def plugin(
    name: str,
    run: Callable[..., Any],
    *,
    typ: str = "mcp",
    parameters: dict[str, Any] | None = None,
) -> BasePlugin:
    return BasePlugin(
        name=name,
        description=f"Description for {name}",
        schema_template="legacy prompt must not be parsed",
        parameters=parameters
        or {
            "type": "object",
            "properties": {"value": {"type": "string"}},
            "required": ["value"],
        },
        typ=typ,
        run=run,
    )


def pi_runner(runtime_url: str, plugins: list[BasePlugin]) -> PiRunner:
    return PiRunner(
        app_id="app",
        uid="uid",
        run_id="run-1",
        model_config=PiModelConfig(
            id="model-1",
            provider="openai",
            base_url="https://models.example/v1/chat/completions",
            api_key="model-secret",
        ),
        chat_history=[
            LLMMessage(role="user", content="Earlier question"),
            LLMMessage(role="assistant", content="Earlier answer"),
        ],
        instruct="Business instruction",
        knowledge="Reference facts",
        question="Current question",
        plugins=plugins,
        runtime_url=runtime_url,
        internal_secret="bridge-secret",
    )


@pytest.mark.asyncio
async def test_start_payload_uses_native_schema_and_projects_stream_events(
    unused_tcp_port: int,
) -> None:
    captured: dict[str, Any] = {}

    async def tool_run(action_input: dict[str, Any], span: Span) -> PluginResponse:
        return PluginResponse(result=action_input)

    async def handler(request: web.Request) -> web.WebSocketResponse:
        assert request.headers["Authorization"] == "Bearer bridge-secret"
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        captured.update(await ws.receive_json())
        await ws.send_json({"type": "reasoning_delta", "delta": "thinking"})
        await ws.send_json({"type": "content_delta", "delta": "answer"})
        await ws.send_json(
            {
                "type": "usage",
                "inputTokens": 9,
                "outputTokens": 4,
                "totalTokens": 13,
            }
        )
        await ws.send_json({"type": "done"})
        return ws

    async with serve_pi(unused_tcp_port, handler) as url:
        responses = [
            response
            async for response in pi_runner(url, [plugin("lookup", tool_run)]).run(
                Span(app_id="app", uid="uid"), node_trace()
            )
        ]

    assert "maxLoopCount" not in captured
    assert "max_loop_count" not in captured
    assert captured == {
        "type": "start",
        "runId": "run-1",
        "model": {
            "id": "model-1",
            "provider": "openai",
            "baseUrl": "https://models.example/v1/chat/completions",
            "apiKey": "model-secret",
        },
        "systemPrompt": "Business instruction\n\nReference context:\nReference facts",
        "messages": [
            {"role": "user", "content": "Earlier question"},
            {"role": "assistant", "content": "Earlier answer"},
        ],
        "question": "Current question",
        "tools": [
            {
                "name": "lookup",
                "description": "Description for lookup",
                "parameters": {
                    "type": "object",
                    "properties": {"value": {"type": "string"}},
                    "required": ["value"],
                },
                "toolType": "mcp",
            }
        ],
    }
    assert [(item.typ, item.content) for item in responses[:2]] == [
        ("reasoning_content", "thinking"),
        ("content", "answer"),
    ]
    assert responses[2].usage is not None
    assert responses[2].usage.total_tokens == 13


@pytest.mark.asyncio
async def test_remote_tool_call_executes_python_plugin_and_returns_result(
    unused_tcp_port: int,
) -> None:
    received_result: dict[str, Any] = {}

    async def tool_run(action_input: dict[str, Any], span: Span) -> PluginResponse:
        assert action_input == {"value": "job-7"}
        return PluginResponse(
            code=0,
            sid="plugin-sid",
            start_time=10,
            end_time=20,
            result={"state": "ready"},
        )

    async def handler(request: web.Request) -> web.WebSocketResponse:
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        await ws.receive_json()
        await ws.send_json(
            {
                "type": "tool_call",
                "callId": "call-1",
                "name": "lookup",
                "arguments": {"value": "job-7"},
            }
        )
        received_result.update(await ws.receive_json())
        await ws.send_json({"type": "done"})
        return ws

    async with serve_pi(unused_tcp_port, handler) as url:
        responses = [
            response
            async for response in pi_runner(url, [plugin("lookup", tool_run)]).run(
                Span(app_id="app", uid="uid"), node_trace()
            )
        ]

    assert received_result == {
        "type": "tool_result",
        "callId": "call-1",
        "result": {"state": "ready"},
        "isError": False,
    }
    tool_step = next(item.content for item in responses if item.typ == "cot_step")
    assert tool_step.action == "lookup"
    assert tool_step.action_input == {"value": "job-7"}
    assert tool_step.action_output == {"state": "ready"}


@pytest.mark.asyncio
async def test_mcp_plugin_round_trips_through_pi_bridge(
    unused_tcp_port: int,
) -> None:
    received_result: dict[str, Any] = {}
    called_with: dict[str, Any] = {}

    async def mcp_run(
        action_input: dict[str, Any], span: Span
    ) -> PluginResponse:
        called_with.update(action_input)
        return PluginResponse(
            code=0,
            sid="mcp-sid",
            result={"content": [{"type": "text", "text": "ready"}]},
        )

    mcp_plugin = McpPlugin(
        server_id="server-1",
        server_url="https://mcp.example/mcp",
        name="query_status",
        description="Query asynchronous job status",
        schema_template="legacy prompt is not parsed",
        parameters={
            "type": "object",
            "properties": {"job_id": {"type": "string"}},
            "required": ["job_id"],
        },
        typ="mcp",
        run=mcp_run,
    )

    async def handler(request: web.Request) -> web.WebSocketResponse:
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        start = await ws.receive_json()
        assert start["tools"] == [
            {
                "name": "query_status",
                "description": "Query asynchronous job status",
                "parameters": {
                    "type": "object",
                    "properties": {"job_id": {"type": "string"}},
                    "required": ["job_id"],
                },
                "toolType": "mcp",
            }
        ]
        await ws.send_json(
            {
                "type": "tool_call",
                "callId": "mcp-call",
                "name": "query_status",
                "arguments": {"job_id": "job-9"},
            }
        )
        received_result.update(await ws.receive_json())
        await ws.send_json({"type": "done"})
        return ws

    async with serve_pi(unused_tcp_port, handler) as url:
        responses = [
            response
            async for response in pi_runner(url, [mcp_plugin]).run(
                Span(app_id="app", uid="uid"), node_trace()
            )
        ]

    assert called_with == {"job_id": "job-9"}
    assert received_result == {
        "type": "tool_result",
        "callId": "mcp-call",
        "result": {"content": [{"type": "text", "text": "ready"}]},
        "isError": False,
    }
    tool_step = next(item.content for item in responses if item.typ == "cot_step")
    assert tool_step.action == "query_status"
    assert tool_step.action_input == {"job_id": "job-9"}
    assert tool_step.action_output == {
        "content": [{"type": "text", "text": "ready"}]
    }


@pytest.mark.asyncio
async def test_subworkflow_stream_stays_visible_and_is_accumulated_for_pi(
    unused_tcp_port: int,
) -> None:
    received_result: dict[str, Any] = {}

    async def workflow_run(
        action_input: dict[str, Any], span: Span
    ) -> AsyncIterator[PluginResponse]:
        yield PluginResponse(
            sid="workflow-sid",
            start_time=1,
            end_time=2,
            result={"reasoning_content": "checking", "content": "part-1"},
        )
        yield PluginResponse(
            sid="workflow-sid",
            start_time=1,
            end_time=3,
            result={"reasoning_content": "", "content": "part-2"},
        )

    async def handler(request: web.Request) -> web.WebSocketResponse:
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        await ws.receive_json()
        await ws.send_json(
            {
                "type": "tool_call",
                "callId": "workflow-call",
                "name": "subflow",
                "arguments": {"value": "x"},
            }
        )
        received_result.update(await ws.receive_json())
        await ws.send_json({"type": "done"})
        return ws

    async with serve_pi(unused_tcp_port, handler) as url:
        responses = [
            response
            async for response in pi_runner(
                url, [plugin("subflow", workflow_run, typ="workflow")]
            ).run(Span(app_id="app", uid="uid"), node_trace())
        ]

    assert received_result == {
        "type": "tool_result",
        "callId": "workflow-call",
        "result": {"reasoning_content": "checking", "content": "part-1part-2"},
        "isError": False,
    }
    assert [(item.typ, item.content) for item in responses[:3]] == [
        ("reasoning_content", "checking"),
        ("content", "part-1"),
        ("content", "part-2"),
    ]


@pytest.mark.asyncio
async def test_duplicate_normalized_names_invoke_the_correct_plugin(
    unused_tcp_port: int,
) -> None:
    calls: list[str] = []

    async def first_run(action_input: dict[str, Any], span: Span) -> PluginResponse:
        calls.append("first")
        return PluginResponse(result={"source": "first"})

    async def second_run(action_input: dict[str, Any], span: Span) -> PluginResponse:
        calls.append("second")
        return PluginResponse(result={"source": "second"})

    async def handler(request: web.Request) -> web.WebSocketResponse:
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        await ws.receive_json()
        await ws.send_json(
            {
                "type": "tool_call",
                "callId": "duplicate-call",
                "name": "query_status__2",
                "arguments": {"value": "x"},
            }
        )
        await ws.receive_json()
        await ws.send_json({"type": "done"})
        return ws

    async with serve_pi(unused_tcp_port, handler) as url:
        _ = [
            response
            async for response in pi_runner(
                url,
                [
                    plugin("query-status", first_run),
                    plugin("query status", second_run),
                ],
            ).run(Span(app_id="app", uid="uid"), node_trace())
        ]

    assert calls == ["second"]


@pytest.mark.asyncio
async def test_wait_completion_is_visible_without_python_tool_execution(
    unused_tcp_port: int,
) -> None:
    async def handler(request: web.Request) -> web.WebSocketResponse:
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        await ws.receive_json()
        await ws.send_json(
            {
                "type": "tool_call",
                "callId": "wait-call",
                "name": "wait",
                "arguments": {"seconds": 0.01},
            }
        )
        await ws.send_json(
            {
                "type": "tool_completed",
                "callId": "wait-call",
                "name": "wait",
                "arguments": {"seconds": 0.01},
                "result": {"seconds": 0.01},
                "isError": False,
            }
        )
        await ws.send_json({"type": "done"})
        return ws

    async with serve_pi(unused_tcp_port, handler) as url:
        responses = [
            response
            async for response in pi_runner(url, []).run(
                Span(app_id="app", uid="uid"), node_trace()
            )
        ]

    tool_step = next(item.content for item in responses if item.typ == "cot_step")
    assert tool_step.action == "wait"
    assert tool_step.action_input == {"seconds": 0.01}
    assert tool_step.action_output == {"seconds": 0.01}


@pytest.mark.asyncio
async def test_unavailable_pi_runtime_raises_explicit_error() -> None:
    runner = pi_runner("ws://127.0.0.1:1/internal/v1/runs", [])

    with pytest.raises(AgentExc, match="Pi runtime unavailable"):
        _ = [
            response
            async for response in runner.run(
                Span(app_id="app", uid="uid"), node_trace()
            )
        ]
