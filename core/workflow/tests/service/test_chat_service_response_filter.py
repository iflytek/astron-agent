import asyncio
import json
from contextlib import nullcontext
from datetime import datetime
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock, Mock

import pytest

from workflow.consts.app_audit import AppAuditPolicy
from workflow.consts.engine.chat_status import ChatStatus
from workflow.consts.engine.timeout import QueueTimeout
from workflow.engine.callbacks.openai_types_sse import (
    Choice,
    Delta,
    GenerateUsage,
    LLMGenerate,
    NodeInfo,
    WorkflowStep,
)
from workflow.service import chat_service
from workflow.service.chat_service import _filter_response_frame, _get_response


def test_release_filter_keeps_end_node_variable_content() -> None:
    response = LLMGenerate(
        id="sid",
        workflow_step=WorkflowStep(
            node=NodeInfo(
                id="node-end::1",
                finish_reason=ChatStatus.FINISH_REASON.value,
                ext={"answer_mode": 0},
            ),
            progress=1,
        ),
        choices=[Choice(delta=Delta(content='{"output":[{"name":"test"}]}'), index=0)],
    )
    last_workflow_step = WorkflowStep(seq=3)

    filtered = _filter_response_frame(
        response_frame=response,
        is_stream=True,
        last_workflow_step=last_workflow_step,
        message_cache=[],
        reasoning_content_cache=[],
        is_release=True,
    )

    assert filtered is not None
    assert filtered.workflow_step.node is None
    assert filtered.choices[0].delta.content == '{"output":[{"name":"test"}]}'


def test_release_filter_keeps_workflow_end_content() -> None:
    response = LLMGenerate(
        id="sid",
        workflow_step=WorkflowStep(node=NodeInfo(id="flow_obj"), progress=1),
        choices=[
            Choice(
                delta=Delta(content='{"output":[{"name":"test"}]}'),
                index=0,
                finish_reason=ChatStatus.FINISH_REASON.value,
            )
        ],
    )
    last_workflow_step = WorkflowStep(seq=3)

    filtered = _filter_response_frame(
        response_frame=response,
        is_stream=True,
        last_workflow_step=last_workflow_step,
        message_cache=[],
        reasoning_content_cache=[],
        is_release=True,
    )

    assert filtered is not None
    assert filtered.workflow_step.node is None
    assert filtered.workflow_step.seq == 4
    assert filtered.choices[0].delta.content == '{"output":[{"name":"test"}]}'


@pytest.mark.asyncio
@pytest.mark.parametrize("is_release", [False, True])
@pytest.mark.parametrize("is_resume", [False, True], ids=["initial", "resume"])
@pytest.mark.parametrize(
    "content_chunks",
    [["04恢复", "成功"], ["重复", "重复"], []],
    ids=[
        "node-deltas-before-aggregate",
        "identical-legitimate-deltas",
        "terminal-only",
    ],
)
async def test_chat_stream_emits_content_once_and_preserves_terminal_metadata(
    monkeypatch: pytest.MonkeyPatch,
    is_release: bool,
    is_resume: bool,
    content_chunks: list[str],
) -> None:
    frames = [
        LLMGenerate(
            id="engine-sid",
            workflow_step=WorkflowStep(node=NodeInfo(id="node-end::1"), progress=1),
            choices=[
                Choice(
                    index=0,
                    delta=Delta(content=chunk, reasoning_content="思考"),
                )
            ],
        )
        for chunk in content_chunks
    ]
    final_content = "".join(content_chunks) or "仅终帧答案"
    final_reasoning = "思考" * len(content_chunks) or "仅终帧思考"
    frames.append(
        LLMGenerate(
            id="engine-sid",
            workflow_step=WorkflowStep(
                node=NodeInfo(id="flow_obj", outputs={"answer": final_content}),
                progress=1,
            ),
            choices=[
                Choice(
                    index=0,
                    delta=Delta(
                        content=final_content, reasoning_content=final_reasoning
                    ),
                    finish_reason=ChatStatus.FINISH_REASON.value,
                )
            ],
            usage=GenerateUsage(prompt_tokens=2, completion_tokens=3, total_tokens=5),
        )
    )
    registry = Mock()
    registry.get_event.return_value = SimpleNamespace(
        is_stream=True,
        timeout=1,
        get_workflow_q_name=lambda: "resume-queue",
    )
    registry.fetch_resume_data = AsyncMock(
        side_effect=[{"message": frame.model_dump_json()} for frame in frames]
    )
    monkeypatch.setattr(chat_service, "EventRegistry", lambda: registry)
    span = Mock()
    span.sid = "resume-sid"
    span.start.return_value = nullcontext(span)
    span.add_info_events_async = AsyncMock()
    span.add_info_event_async = AsyncMock()

    if is_resume:
        stream = chat_service.chat_resume_response_stream(
            span=span,
            event_id="resume-event",
            audit_policy=AppAuditPolicy.DEFAULT.value,
            is_release=is_release,
        )
    else:
        response_queue: asyncio.Queue[LLMGenerate] = asyncio.Queue()
        for frame in frames:
            response_queue.put_nowait(frame)
        stream = chat_service._chat_response_stream(
            response_queue=response_queue,
            flow_id="flow-1",
            app_audit_policy=AppAuditPolicy.DEFAULT,
            event_id="resume-event",
            is_stream=True,
            is_release=is_release,
            span=span,
            engine_task=asyncio.create_task(asyncio.sleep(0)),
        )
    responses = [json.loads(chunk.removeprefix("data: ")) async for chunk in stream]

    assert len(responses) == len(frames)
    assert all(response["code"] == 0 for response in responses)
    expected_sid = "resume-sid" if is_resume else "engine-sid"
    assert all(response["id"] == expected_sid for response in responses)
    deltas = [response["choices"][0]["delta"] for response in responses]
    assert "".join(delta["content"] for delta in deltas) == final_content
    assert "".join(delta["reasoning_content"] for delta in deltas) == final_reasoning
    assert [delta["content"] for delta in deltas[:-1]] == content_chunks
    assert deltas[-1]["content"] == ("" if content_chunks else final_content)
    assert deltas[-1]["reasoning_content"] == (
        "" if content_chunks else final_reasoning
    )
    assert responses[-1]["choices"][0]["finish_reason"] == "stop"
    assert responses[-1]["usage"]["total_tokens"] == 5
    assert responses[-1]["workflow_step"]["progress"] == 1
    if not is_release:
        assert responses[-1]["workflow_step"]["node"]["outputs"] == {
            "answer": final_content
        }
    registry.on_finished.assert_called_once_with(event_id="resume-event")
    registry.on_interrupt.assert_not_called()


@pytest.mark.asyncio
async def test_idle_workflow_sends_heartbeat_before_30_seconds(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    observed_timeouts: list[float] = []

    async def timeout_immediately(awaitable: Any, *, timeout: float) -> None:
        observed_timeouts.append(timeout)
        awaitable.close()
        raise asyncio.TimeoutError

    monkeypatch.setattr(asyncio, "wait_for", timeout_immediately)

    response = await _get_response(
        app_audit_policy=AppAuditPolicy.DEFAULT,
        audit_strategy=None,
        response_queue=asyncio.Queue(),
        last_response=None,
    )

    assert observed_timeouts == [15]
    assert QueueTimeout.PingQT.value == 15
    assert response.choices[0].finish_reason == "ping"


@pytest.mark.asyncio
async def test_normal_chat_trace_recursively_redacts_legacy_sandbox_api_keys(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    camel_case_secret = "CAMEL-CASE-E2B-KEY-MUST-NOT-REACH-TRACE"
    snake_case_secret = "SNAKE-CASE-E2B-KEY-MUST-NOT-REACH-TRACE"
    workflow_dsl = {
        "nodes": [
            {
                "data": {
                    "nodeParam": {
                        "sandbox": {
                            "apiKey": camel_case_secret,
                            "nested": {"api_key": snake_case_secret},
                            "workflowId": "flow-1",
                        }
                    }
                }
            }
        ]
    }
    recorded_events: list[str] = []

    class FakeMeter:
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            return None

        def set_label(self, *args: Any, **kwargs: Any) -> None:
            return None

        def in_error_count(self, *args: Any, **kwargs: Any) -> None:
            return None

    class FakeSpanContext:
        def record_exception(self, error: Exception) -> None:
            return None

    class FakeSpan:
        sid = "trace-sid"

        def start(self, *args: Any, **kwargs: Any) -> Any:
            return nullcontext(FakeSpanContext())

        async def add_info_event_async(self, event: str) -> None:
            recorded_events.append(event)

    async def stop_after_trace(*args: Any, **kwargs: Any) -> None:
        raise RuntimeError("stop after trace capture")

    monkeypatch.setattr(chat_service, "Meter", FakeMeter)
    monkeypatch.setattr(
        chat_service, "langfuse_trace_context", lambda *args, **kwargs: nullcontext()
    )
    monkeypatch.setattr(chat_service, "_init_workflow_trace", lambda *args: object())
    monkeypatch.setattr(chat_service, "_get_or_build_workflow_engine", stop_after_trace)
    monkeypatch.setattr(chat_service, "kafka_report", lambda **kwargs: None)
    chat_vo = SimpleNamespace(
        flow_id="flow-1",
        uid="user-1",
        chat_id="chat-1",
        version="v1",
        ext={},
        parameters={},
        json=lambda: "{}",
    )

    await chat_service._run(
        app_alias_id="app-1",
        event_id="event-1",
        workflow_dsl=workflow_dsl,
        workflow_dsl_update_time=datetime.now(),
        chat_vo=chat_vo,
        is_release=False,
        app_audit_policy=AppAuditPolicy.DEFAULT,
        response_queue=asyncio.Queue(),
        span=FakeSpan(),
    )

    trace_event = next(
        event for event in recorded_events if event.startswith("spark dsl: ")
    )
    assert camel_case_secret not in trace_event
    assert snake_case_secret not in trace_event
    sanitized = json.loads(trace_event.removeprefix("spark dsl: "))
    sandbox = sanitized["nodes"][0]["data"]["nodeParam"]["sandbox"]
    assert sandbox == {"nested": {}, "workflowId": "flow-1"}
