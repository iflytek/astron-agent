"""Cancellation applies while a workflow waits at an input node, including retries."""

import asyncio
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock

import pytest

from workflow.domain.entities.chat import ChatVo
from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum
from workflow.infra import console_runtime
from workflow.service import chat_service


@pytest.mark.asyncio
async def test_paused_engine_cancelled_and_awaited_with_failure_event(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    started = asyncio.Event()
    cleaned = asyncio.Event()

    async def execute(*args: Any, **kwargs: Any) -> None:
        started.set()
        try:
            await asyncio.Event().wait()
        finally:
            await asyncio.sleep(0)
            cleaned.set()

    async def control(context: dict) -> None:
        await started.wait()
        raise CustomException(CodeEnum.WORKFLOW_EXECUTION_ERROR, err_msg="cancelled")

    monkeypatch.setattr(chat_service, "_run", execute)
    monkeypatch.setattr(console_runtime, "control", control)
    queue: asyncio.Queue = asyncio.Queue()
    chat = ChatVo(
        flow_id="flow",
        parameters={},
        ext={"console_context": {"run_id": "run", "root_id": "root"}},
    )
    await asyncio.wait_for(
        chat_service._run_controlled(
            "app", "run", {}, None, chat, False, None, queue, SimpleNamespace(sid="sid")
        ),
        1,
    )
    assert cleaned.is_set()
    message = await queue.get()
    assert message.code != 0
    assert message.choices[0].finish_reason == "stop"


@pytest.mark.asyncio
async def test_console_run_does_not_load_legacy_whole_flow_history() -> None:
    chat = ChatVo(
        flow_id="flow",
        uid="user",
        parameters={},
        ext={"console_context": {"run_id": "run", "root_id": "root"}},
    )
    # No engine access should be necessary; whole-flow history could contain another run.
    assert await chat_service._get_chat_history(None, chat, None) == []


@pytest.mark.asyncio
async def test_single_node_control_failure_cleans_up_operation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    cleaned = asyncio.Event()

    async def operation() -> None:
        try:
            await asyncio.Event().wait()
        finally:
            cleaned.set()

    monkeypatch.setattr(
        console_runtime,
        "control",
        AsyncMock(side_effect=CustomException(CodeEnum.WORKFLOW_EXECUTION_ERROR)),
    )
    with pytest.raises(CustomException):
        await console_runtime.execute_with_control(
            operation(), {"run_id": "r", "root_id": "r"}
        )
    assert cleaned.is_set()
