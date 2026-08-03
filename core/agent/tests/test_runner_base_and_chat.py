"""Test shared runner behavior and the no-tool ChatRunner path."""

import json
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any
from unittest.mock import MagicMock

import pytest
from common.otlp import sid as sid_module
from common.otlp.log_trace.node_trace_log import NodeTraceLog
from common.otlp.trace.span import Span

from agent.api.schemas.agent_response import AgentResponse
from agent.api.schemas.llm_message import LLMMessage
from agent.domain.models.base import BaseLLMModel
from agent.engine.nodes.base import RunnerBase
from agent.engine.nodes.chat.chat_runner import ChatRunner


@dataclass
class _DummySidGen:
    value: str = "test-sid"

    def gen(self) -> str:
        return self.value


@pytest.fixture(autouse=True)
def _setup_test_environment() -> None:
    if sid_module.sid_generator2 is None:
        sid_module.sid_generator2 = _DummySidGen()  # type: ignore[assignment]


class DummyLLM(BaseLLMModel):
    async def stream(  # type: ignore[override]
        self, messages: list, stream: bool, span: Span | None = None
    ) -> AsyncIterator[Any]:
        chunk = MagicMock()
        delta = MagicMock()
        delta.model_dump.return_value = {
            "reasoning_content": "think",
            "content": "answer",
        }
        chunk.choices = [MagicMock(delta=delta)]
        chunk.usage = None
        yield chunk


@pytest.fixture
def span() -> Span:
    return Span(app_id="app", uid="u")


@pytest.fixture
def node_trace() -> NodeTraceLog:
    return NodeTraceLog(
        service_id="s",
        sid="sid",
        app_id="app",
        uid="u",
        chat_id="c",
        sub="Agent",
        caller="caller",
        log_caller="caller",
        question="q",
    )


class TestRunnerBase:
    @pytest.fixture
    def runner_base(self) -> RunnerBase:
        model = DummyLLM.model_construct(name="m", llm=MagicMock())
        return RunnerBase(
            model=model,
            chat_history=[
                LLMMessage(role="user", content="q1"),
                LLMMessage(role="assistant", content="a1"),
            ],
        )

    def test_cur_time_format(self, runner_base: RunnerBase) -> None:
        assert runner_base.cur_time()

    @pytest.mark.asyncio
    async def test_create_history_prompt(self, runner_base: RunnerBase) -> None:
        prompt = await runner_base.create_history_prompt()
        assert "User: q1" in prompt
        assert "Assistant: a1" in prompt

    @pytest.mark.asyncio
    async def test_model_general_stream(
        self, runner_base: RunnerBase, span: Span, node_trace: NodeTraceLog
    ) -> None:
        results: list[AgentResponse] = []
        async for response in runner_base.model_general_stream([], span, node_trace):
            results.append(response)

        assert any(item.typ == "reasoning_content" for item in results)
        assert any(item.typ == "content" for item in results)
        assert node_trace.trace


class TestChatRunner:
    @pytest.mark.asyncio
    async def test_chat_runner_run(
        self, span: Span, node_trace: NodeTraceLog
    ) -> None:
        runner = ChatRunner(
            model=DummyLLM.model_construct(name="m", llm=MagicMock()),
            chat_history=[LLMMessage(role="user", content="hi")],
            instruct="inst",
            knowledge="kb",
            question="q",
        )

        assert [response async for response in runner.run(span, node_trace)]

    @pytest.mark.asyncio
    async def test_chat_runner_preserves_placeholder_text_in_history(
        self, span: Span, node_trace: NodeTraceLog
    ) -> None:
        runner = ChatRunner(
            model=DummyLLM.model_construct(name="m", llm=MagicMock()),
            chat_history=[
                LLMMessage(role="user", content="keep {question} literal")
            ],
            instruct="inst",
            knowledge="kb",
            question="actual question",
        )

        _ = [response async for response in runner.run(span, node_trace)]

        model_input = node_trace.trace[0].data.input["model_general_stream_input"]
        messages = json.loads(model_input)
        user_prompt = messages[1]["content"]
        assert "keep {question} literal" in user_prompt
        assert "Follow up question: actual question" in user_prompt
