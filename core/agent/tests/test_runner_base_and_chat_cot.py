"""Test engine.nodes.base / chat_runner / cot_runner / cot_process_runner"""

from dataclasses import dataclass
from typing import Any, AsyncIterator, Optional
from unittest.mock import AsyncMock, MagicMock

import pytest
from common.otlp import sid as sid_module
from common.otlp.log_trace.node_trace_log import NodeTraceLog
from common.otlp.trace.span import Span

from agent.api.schemas.agent_response import AgentResponse, CotStep
from agent.api.schemas.llm_message import LLMMessage
from agent.domain.models.base import BaseLLMModel
from agent.engine.nodes.base import RunnerBase, Scratchpad
from agent.engine.nodes.chat.chat_runner import ChatRunner
from agent.engine.nodes.cot.cot_runner import CotRunner
from agent.engine.nodes.cot_process.cot_process_runner import CotProcessRunner
from agent.exceptions import cot_exc
from agent.service.plugin.base import BasePlugin


@dataclass
class _DummySidGen:
    """Simple sid generator for testing environment."""

    value: str = "test-sid"

    def gen(self) -> str:  # pragma: no cover - only for testing environment
        return self.value


class _TestCotFormatIncorrectExc(cot_exc.CotExc):
    """CotFormatIncorrectExc type used in testing environment."""

    def __init__(
        self,
        c: int = 40022,
        m: str = "Model returned reasoning content format is incorrect",
        **kwargs: dict
    ) -> None:
        """Initialize test exception with default c and m parameters."""
        super().__init__(c, m, **kwargs)


@pytest.fixture(autouse=True)
def _setup_test_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    """Automatically inject environment fixes for all tests.

    - Ensure `sid_generator2` is initialized to avoid `Span` construction failure.
    - Replace `CotFormatIncorrectExc` with a real exception class.
    """
    # 1) Initialize sid generator to avoid Span throwing "sid_generator2 is not initialized"
    if sid_module.sid_generator2 is None:
        sid_module.sid_generator2 = _DummySidGen()  # type: ignore[assignment]

    # 2) Fix CotFormatIncorrectExc: in source code it's an instance, here replace with a real exception type
    monkeypatch.setattr(
        cot_exc, "CotFormatIncorrectExc", _TestCotFormatIncorrectExc, raising=False
    )


class DummyLLM(BaseLLMModel):
    """Simple fake LLM for intercepting stream calls"""

    async def stream(  # type: ignore[override]
        self, messages: list, stream: bool, span: Optional[Span] = None
    ) -> AsyncIterator[Any]:
        """Directly return async iterable for use with async for."""
        chunk = MagicMock()
        # Simulate ReasonChatCompletionChunk-style delta
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
    """Test RunnerBase general behavior"""

    @pytest.fixture
    def runner_base(self) -> RunnerBase:
        # Use model_construct to bypass strict validation of llm type for easier testing
        model = DummyLLM.model_construct(name="m", llm=MagicMock())
        history = [
            LLMMessage(role="user", content="q1"),
            LLMMessage(role="assistant", content="a1"),
        ]
        return RunnerBase(model=model, chat_history=history)

    def test_cur_time_format(self, runner_base: RunnerBase) -> None:
        t = runner_base.cur_time()
        # Only verify that a non-empty string is returned
        assert isinstance(t, str)
        assert t

    @pytest.mark.asyncio
    async def test_create_history_prompt(self, runner_base: RunnerBase) -> None:
        prompt = await runner_base.create_history_prompt()
        assert "User: q1" in prompt
        assert "Assistant: a1" in prompt

    @pytest.mark.asyncio
    async def test_model_general_stream(
        self, runner_base: RunnerBase, span: Span, node_trace: NodeTraceLog
    ) -> None:
        # Replace with DummyLLM instance (also use model_construct to avoid validation errors)
        runner_base.model = DummyLLM.model_construct(name="m", llm=MagicMock())

        results: list[AgentResponse] = []
        async for resp in runner_base.model_general_stream([], span, node_trace):
            results.append(resp)

        # Should produce reasoning_content and content frames
        assert any(r.typ == "reasoning_content" for r in results)
        assert any(r.typ == "content" for r in results)
        # A node should be appended to node trace
        assert node_trace.trace


class TestScratchpad:
    """Test Scratchpad template generation"""

    @pytest.mark.asyncio
    async def test_scratchpad_template(self) -> None:
        sp = Scratchpad(
            steps=[
                CotStep(
                    thought="t",
                    action="a",
                    action_input={"x": 1},
                    action_output={"y": 2},
                )
            ]
        )
        tpl = await sp.template()
        assert "Thought: t" in tpl
        assert "Action: a" in tpl
        assert "Action Input" in tpl
        assert "Observation" in tpl


class TestChatRunner:
    """Test ChatRunner only verifies call chain assembly"""

    @pytest.mark.asyncio
    async def test_chat_runner_run(self, span: Span, node_trace: NodeTraceLog) -> None:
        model = DummyLLM.model_construct(name="m", llm=MagicMock())
        runner = ChatRunner(
            model=model,
            chat_history=[LLMMessage(role="user", content="hi")],
            instruct="inst",
            knowledge="kb",
            question="q",
        )

        results: list[AgentResponse] = []
        async for resp in runner.run(span, node_trace):
            results.append(resp)

        assert results


class DummyPlugin(BasePlugin):
    pass


class TestCotRunnerParseStep:
    """Test CotRunner's parse_cot_step and plugin selection logic"""

    @pytest.fixture
    def cot_runner(self) -> CotRunner:
        model = DummyLLM.model_construct(name="m", llm=MagicMock())
        plugin = DummyPlugin(
            name="tool1",
            description="",
            schema_template="",
            typ="tool",
            run=AsyncMock(),
        )
        # Use real CotProcessRunner to avoid Pydantic type validation failure for process_runner
        from agent.engine.nodes.cot_process.cot_process_runner import CotProcessRunner

        process_runner = CotProcessRunner(
            model=model,
            chat_history=[],
            instruct="inst",
            knowledge="kb",
            question="q",
        )
        return CotRunner(
            model=model,
            plugins=[plugin],
            chat_history=[],
            instruct="inst",
            knowledge="kb",
            question="q",
            process_runner=process_runner,
            max_loop=3,
        )

    @pytest.mark.asyncio
    async def test_parse_cot_step_final_answer(self, cot_runner: CotRunner) -> None:
        content = "Thought: think\nFinal Answer: done"
        step = await cot_runner.parse_cot_step(content)
        assert step.finished_cot is True
        assert step.thought.strip() == "think"

    @pytest.mark.asyncio
    async def test_parse_cot_step_with_action(self, cot_runner: CotRunner) -> None:
        content = (
            "Thought: think\n"
            "Action: tool1\n"
            'Action Input: {"x": 1}\n'
            "Observation: ok"
        )
        step = await cot_runner.parse_cot_step(content)
        assert step.thought == "think"
        assert step.action == "tool1"
        assert step.action_input == {"x": 1}

    @pytest.mark.asyncio
    async def test_parse_cot_step_invalid_format(self, cot_runner: CotRunner) -> None:
        from agent.exceptions import cot_exc

        with pytest.raises(cot_exc.CotFormatIncorrectExc):
            await cot_runner.parse_cot_step("no action here")

    @pytest.mark.asyncio
    async def test_is_valid_plugin(self, cot_runner: CotRunner) -> None:
        assert await cot_runner.is_valid_plugin("tool1") is True
        assert await cot_runner.is_valid_plugin("unknown") is False

    @pytest.mark.asyncio
    async def test_get_plugin(self, cot_runner: CotRunner) -> None:
        step = CotStep(action="tool1")
        plugin = await cot_runner.get_plugin(step)
        assert plugin is not None
        step2 = CotStep(action="none")
        assert await cot_runner.get_plugin(step2) is None


class TestCotProcessRunner:
    """Simple test to verify CotProcessRunner's run logic calls underlying stream"""

    @pytest.mark.asyncio
    async def test_cot_process_runner_run(
        self, span: Span, node_trace: NodeTraceLog
    ) -> None:
        model = DummyLLM.model_construct(name="m", llm=MagicMock())
        runner = CotProcessRunner(
            model=model,
            chat_history=[LLMMessage(role="user", content="hi")],
            instruct="inst",
            knowledge="kb",
            question="q",
        )
        scratchpad = Scratchpad(steps=[CotStep(thought="t", finished_cot=True)])

        results: list[AgentResponse] = []
        async for resp in runner.run(scratchpad, span, node_trace):
            results.append(resp)

        assert results
