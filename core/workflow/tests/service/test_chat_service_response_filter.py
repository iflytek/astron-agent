import asyncio
from typing import Any

import pytest

from workflow.consts.app_audit import AppAuditPolicy
from workflow.consts.engine.chat_status import ChatStatus
from workflow.consts.engine.timeout import QueueTimeout
from workflow.engine.callbacks.openai_types_sse import (
    Choice,
    Delta,
    LLMGenerate,
    NodeInfo,
    WorkflowStep,
)
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
