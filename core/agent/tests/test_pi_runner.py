import asyncio
from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import Any

import pytest
from aiohttp import web
from common.otlp import sid as sid_module
from common.otlp.log_trace.node_trace_log import NodeTraceLog
from common.otlp.trace.span import Span

from agent.api.schemas.agent_event import AgentEventBase
from agent.api.schemas.agent_response import AgentResponse
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


def public_events(responses: list[AgentResponse]) -> list[AgentEventBase]:
    return [
        response.content
        for response in responses
        if response.typ == "agent_event"
        and isinstance(response.content, AgentEventBase)
    ]


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
    legacy_responses = [
        response for response in responses if response.typ != "agent_event"
    ]
    assert [(item.typ, item.content) for item in legacy_responses[:2]] == [
        ("reasoning_content", "thinking"),
        ("content", "answer"),
    ]
    assert legacy_responses[2].usage is not None
    assert legacy_responses[2].usage.total_tokens == 13
    events = public_events(responses)
    assert [event.type for event in events] == [
        "execution_start",
        "usage_update",
        "execution_end",
    ]
    assert [event.seq for event in events] == [1, 2, 3]
    assert events[1].totalTokens == 13
    assert events[-1].status == "success"
    assert events[-1].durationMs >= 0


@pytest.mark.asyncio
async def test_usage_events_are_cumulative_while_legacy_usage_remains_per_turn(
    unused_tcp_port: int,
) -> None:
    async def handler(request: web.Request) -> web.WebSocketResponse:
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        await ws.receive_json()
        await ws.send_json(
            {
                "type": "usage",
                "inputTokens": 10,
                "outputTokens": 5,
                "totalTokens": 15,
            }
        )
        await ws.send_json(
            {
                "type": "usage",
                "inputTokens": 4,
                "outputTokens": 3,
                "totalTokens": 7,
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

    usage_events = [
        event for event in public_events(responses) if event.type == "usage_update"
    ]
    assert [
        (event.inputTokens, event.outputTokens, event.totalTokens)
        for event in usage_events
    ] == [(10, 5, 15), (14, 8, 22)]

    legacy_usages = [
        response.usage for response in responses if response.usage is not None
    ]
    assert [
        (usage.prompt_tokens, usage.completion_tokens, usage.total_tokens)
        for usage in legacy_usages
    ] == [(10, 5, 15), (4, 3, 7)]


@pytest.mark.asyncio
async def test_structured_runtime_events_receive_one_public_sequence(
    unused_tcp_port: int,
) -> None:
    async def handler(request: web.Request) -> web.WebSocketResponse:
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        await ws.receive_json()
        await ws.send_json(
            {
                "type": "agent_event",
                "event": {
                    "version": 1,
                    "runId": "runtime-value-is-not-authoritative",
                    "type": "segment_start",
                    "turnId": "turn-1",
                    "segmentId": "turn-1-text-0",
                    "source": "text",
                    "channel": "pending",
                },
            }
        )
        await ws.send_json(
            {
                "type": "agent_event",
                "event": {
                    "version": 1,
                    "runId": "runtime-value-is-not-authoritative",
                    "type": "segment_delta",
                    "turnId": "turn-1",
                    "segmentId": "turn-1-text-0",
                    "delta": "Hi",
                },
            }
        )
        await ws.send_json({"type": "done"})
        return ws

    async with serve_pi(unused_tcp_port, handler) as url:
        runner = pi_runner(url, [])
        responses = [
            response
            async for response in runner.run(
                Span(app_id="app", uid="uid"), node_trace()
            )
        ]

    events = public_events(responses)
    assert [event.type for event in events] == [
        "execution_start",
        "segment_start",
        "segment_delta",
        "execution_end",
    ]
    assert events[1].visibility == "user"
    assert [event.seq for event in events] == [1, 2, 3, 4]
    assert [event.runId for event in events] == ["run-1"] * 4
    assert events[2].delta == "Hi"


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
                "type": "agent_event",
                "event": {
                    "version": 1,
                    "runId": "run-1",
                    "type": "turn_commit",
                    "turnId": "turn-1",
                    "channel": "reasoning",
                    "partial": False,
                    "reason": "tool_call",
                },
            }
        )
        await ws.send_json(
            {
                "type": "tool_call",
                "callId": "call-1",
                "turnId": "turn-1",
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
    events = public_events(responses)
    assert [event.type for event in events] == [
        "execution_start",
        "turn_commit",
        "tool_start",
        "tool_finish",
        "execution_end",
    ]
    assert [event.seq for event in events] == [1, 2, 3, 4, 5]
    assert events[2].callId == "call-1"
    assert events[2].turnId == "turn-1"
    assert events[2].arguments == {"value": "job-7"}
    assert events[3].status == "success"
    assert events[3].response == {"state": "ready"}
    assert events[3].durationMs >= 0


@pytest.mark.asyncio
async def test_plugin_failure_finishes_tool_card_and_returns_model_error(
    unused_tcp_port: int,
) -> None:
    received_result: dict[str, Any] = {}
    credential = "Authorization: Bearer plugin-secret"

    async def tool_run(action_input: dict[str, Any], span: Span) -> PluginResponse:
        raise RuntimeError(f"tool exploded with {credential}")

    async def handler(request: web.Request) -> web.WebSocketResponse:
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        await ws.receive_json()
        await ws.send_json(
            {
                "type": "tool_call",
                "callId": "call-error",
                "turnId": "turn-1",
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

    assert received_result["isError"] is True
    assert received_result["result"] == {"message": "Tool execution failed"}
    events = public_events(responses)
    assert [event.type for event in events] == [
        "execution_start",
        "tool_start",
        "tool_finish",
        "execution_end",
    ]
    assert events[-2].status == "error"
    assert events[-2].response == received_result["result"]
    tool_step = next(item.content for item in responses if item.typ == "cot_step")
    assert tool_step.action_output == {"message": "Tool execution failed"}
    assert credential not in str(received_result)
    assert credential not in str(events[-2].model_dump())
    assert credential not in str(tool_step.model_dump())


@pytest.mark.asyncio
async def test_cancelled_plugin_finishes_tool_card_before_propagating_cancel() -> None:
    entered = asyncio.Event()
    release = asyncio.Event()

    async def tool_run(action_input: dict[str, Any], span: Span) -> PluginResponse:
        entered.set()
        await release.wait()
        return PluginResponse(result={"ready": True})

    class _WebSocket:
        async def send_json(self, payload: dict[str, Any]) -> None:
            raise AssertionError(f"cancelled tool must not return a result: {payload}")

    runner = pi_runner(
        "ws://runtime.invalid/internal/v1/runs",
        [plugin("lookup", tool_run)],
    )
    responses = runner._handle_tool_call(
        {
            "type": "tool_call",
            "callId": "cancelled-call",
            "turnId": "turn-1",
            "name": "lookup",
            "arguments": {"value": "job-7"},
        },
        {"lookup": runner.plugins[0]},
        _WebSocket(),  # type: ignore[arg-type]
        Span(app_id="app", uid="uid"),
    )

    started = await anext(responses)
    assert started.typ == "agent_event"
    assert started.content.type == "tool_start"

    pending = asyncio.create_task(anext(responses))
    await entered.wait()
    pending.cancel()
    finished = await pending
    assert finished.typ == "agent_event"
    assert finished.content.type == "tool_finish"
    assert finished.content.status == "cancelled"

    with pytest.raises(asyncio.CancelledError):
        await anext(responses)


@pytest.mark.asyncio
async def test_mcp_plugin_round_trips_through_pi_bridge(
    unused_tcp_port: int,
) -> None:
    received_result: dict[str, Any] = {}
    called_with: dict[str, Any] = {}

    async def mcp_run(action_input: dict[str, Any], span: Span) -> PluginResponse:
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
                "turnId": "turn-1",
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
    assert tool_step.action_output == {"content": [{"type": "text", "text": "ready"}]}


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
                "turnId": "turn-1",
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
    assert not any(
        item.typ in {"reasoning_content", "content"} and item.content
        for item in responses
    )
    events = public_events(responses)
    assert [event.type for event in events] == [
        "execution_start",
        "tool_start",
        "tool_progress",
        "tool_progress",
        "tool_finish",
        "execution_end",
    ]
    assert events[2].summary == '{"reasoning_content":"checking","content":"part-1"}'
    assert events[3].summary == '{"reasoning_content":"","content":"part-2"}'
    assert events[4].response == {
        "reasoning_content": "checking",
        "content": "part-1part-2",
    }


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
                "turnId": "turn-1",
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
                "turnId": "turn-1",
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
    events = public_events(responses)
    assert [event.type for event in events] == [
        "execution_start",
        "tool_start",
        "tool_finish",
        "execution_end",
    ]
    assert events[2].response == {"seconds": 0.01}


@pytest.mark.asyncio
async def test_cancelled_wait_finishes_tool_card_before_propagating_cancel(
    unused_tcp_port: int,
) -> None:
    wait_sent = asyncio.Event()

    async def handler(request: web.Request) -> web.WebSocketResponse:
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        await ws.receive_json()
        await ws.send_json(
            {
                "type": "tool_call",
                "callId": "wait-call",
                "turnId": "turn-1",
                "name": "wait",
                "arguments": {"seconds": 30},
            }
        )
        wait_sent.set()
        await ws.receive()
        return ws

    async with serve_pi(unused_tcp_port, handler) as url:
        responses = pi_runner(url, []).run(Span(app_id="app", uid="uid"), node_trace())
        yielded = [await anext(responses)]
        if yielded[-1].content.type == "execution_start":
            yielded.append(await anext(responses))
        await wait_sent.wait()

        pending = asyncio.create_task(anext(responses))
        await asyncio.sleep(0)
        pending.cancel()
        yielded.append(await pending)
        with pytest.raises(asyncio.CancelledError):
            while True:
                yielded.append(await anext(responses))

    events = public_events(yielded)
    assert [event.type for event in events] == [
        "execution_start",
        "tool_start",
        "tool_finish",
        "execution_end",
    ]
    assert events[-2].status == "cancelled"
    assert events[-2].callId == "wait-call"
    assert events[-1].status == "cancelled"
    assert not any(event.type == "execution_error" for event in events)


@pytest.mark.asyncio
async def test_runtime_error_finishes_pending_wait_card_before_unwinding(
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
                "turnId": "turn-1",
                "name": "wait",
                "arguments": {"seconds": 30},
            }
        )
        await ws.send_json({"type": "error", "message": "runtime stopped"})
        return ws

    async with serve_pi(unused_tcp_port, handler) as url:
        responses: list[AgentResponse] = []
        with pytest.raises(AgentExc, match="Pi agent runtime failed"):
            async for response in pi_runner(url, []).run(
                Span(app_id="app", uid="uid"), node_trace()
            ):
                responses.append(response)

    events = public_events(responses)
    assert [event.type for event in events] == [
        "execution_start",
        "tool_start",
        "tool_finish",
        "execution_error",
        "execution_end",
    ]
    assert events[2].status == "error"
    assert events[2].callId == "wait-call"
    assert events[-2].code == "PI_RUNTIME_ERROR"
    assert events[-2].message == "Pi agent runtime failed"
    assert events[-1].status == "error"


@pytest.mark.asyncio
async def test_malformed_usage_finishes_pending_wait_and_execution_once(
    unused_tcp_port: int,
) -> None:
    credential = "Authorization: Bearer malformed-usage-secret"

    async def handler(request: web.Request) -> web.WebSocketResponse:
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        await ws.receive_json()
        await ws.send_json(
            {
                "type": "tool_call",
                "callId": "wait-call",
                "turnId": "turn-1",
                "name": "wait",
                "arguments": {"seconds": 30},
            }
        )
        await ws.send_json(
            {
                "type": "usage",
                "inputTokens": credential,
                "outputTokens": 1,
                "totalTokens": 2,
            }
        )
        return ws

    responses: list[AgentResponse] = []
    async with serve_pi(unused_tcp_port, handler) as url:
        with pytest.raises(AgentExc) as raised:
            async for response in pi_runner(url, []).run(
                Span(app_id="app", uid="uid"), node_trace()
            ):
                responses.append(response)

    events = public_events(responses)
    assert [event.type for event in events] == [
        "execution_start",
        "tool_start",
        "tool_finish",
        "execution_error",
        "execution_end",
    ]
    assert events[2].status == "error"
    assert events[-2].message == "Pi agent runtime failed"
    assert sum(event.type == "execution_end" for event in events) == 1
    assert credential not in str(raised.value)
    assert credential not in str([event.model_dump() for event in events])


@pytest.mark.asyncio
async def test_malformed_wait_tool_message_terminates_execution_once(
    unused_tcp_port: int,
) -> None:
    async def handler(request: web.Request) -> web.WebSocketResponse:
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        await ws.receive_json()
        await ws.send_json(
            {
                "type": "tool_call",
                "name": "wait",
                "arguments": {"seconds": 30},
            }
        )
        return ws

    responses: list[AgentResponse] = []
    async with serve_pi(unused_tcp_port, handler) as url:
        with pytest.raises(AgentExc, match="Pi agent runtime failed"):
            async for response in pi_runner(url, []).run(
                Span(app_id="app", uid="uid"), node_trace()
            ):
                responses.append(response)

    events = public_events(responses)
    assert [event.type for event in events] == [
        "execution_start",
        "execution_error",
        "execution_end",
    ]
    assert sum(event.type == "execution_end" for event in events) == 1


@pytest.mark.asyncio
async def test_unavailable_pi_runtime_raises_explicit_error() -> None:
    runner = pi_runner("ws://127.0.0.1:1/internal/v1/runs", [])
    responses: list[AgentResponse] = []

    with pytest.raises(AgentExc, match="Pi agent runtime unavailable"):
        async for response in runner.run(Span(app_id="app", uid="uid"), node_trace()):
            responses.append(response)

    events = public_events(responses)
    assert [event.type for event in events] == [
        "execution_start",
        "execution_error",
        "execution_end",
    ]
    assert events[-2].code == "PI_RUNTIME_UNAVAILABLE"
    assert events[-2].message == "Pi agent runtime unavailable"
    assert events[-1].status == "error"


@pytest.mark.asyncio
async def test_pi_runtime_disconnect_emits_sanitized_error_before_unwinding(
    unused_tcp_port: int,
) -> None:
    async def handler(request: web.Request) -> web.WebSocketResponse:
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        await ws.receive_json()
        return ws

    responses: list[AgentResponse] = []
    async with serve_pi(unused_tcp_port, handler) as url:
        with pytest.raises(AgentExc, match="Pi agent runtime disconnected"):
            async for response in pi_runner(url, []).run(
                Span(app_id="app", uid="uid"), node_trace()
            ):
                responses.append(response)

    events = public_events(responses)
    assert [event.type for event in events] == [
        "execution_start",
        "execution_error",
        "execution_end",
    ]
    assert events[-2].code == "PI_RUNTIME_DISCONNECTED"
    assert events[-2].message == "Pi agent runtime disconnected"
    assert events[-1].status == "error"
