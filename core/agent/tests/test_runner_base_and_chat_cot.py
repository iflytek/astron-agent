"""Test engine.nodes.base / chat_runner / cot_runner / cot_process_runner"""

import json
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
from agent.service.plugin.base import BasePlugin, PluginResponse


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


class UsageOnlyFinalChunkLLM(BaseLLMModel):
    """Fake an OpenAI-compatible stream ending with a usage-only chunk."""

    async def stream(  # type: ignore[override]
        self, messages: list, stream: bool, span: Optional[Span] = None
    ) -> AsyncIterator[Any]:
        content_delta = MagicMock()
        content_delta.dict.return_value = {
            "reasoning_content": "",
            "content": "Final Answer: 26.2°C",
        }
        content_chunk = MagicMock()
        content_chunk.choices = [MagicMock(delta=content_delta)]
        content_chunk.usage = None
        yield content_chunk

        usage = MagicMock()
        usage.model_dump.return_value = {
            "completion_tokens": 8,
            "prompt_tokens": 12,
            "total_tokens": 20,
        }
        usage_chunk = MagicMock()
        usage_chunk.choices = []
        usage_chunk.usage = usage
        yield usage_chunk


class FinalAnswerThenReasoningOnlyLLM(BaseLLMModel):
    """Fake a final answer followed by a reasoning-only stream chunk."""

    async def stream(  # type: ignore[override]
        self, messages: list, stream: bool, span: Optional[Span] = None
    ) -> AsyncIterator[Any]:
        for delta_data in (
            {"reasoning_content": "", "content": "Final Answer: done"},
            {"reasoning_content": "trailing thought", "content": ""},
        ):
            delta = MagicMock()
            delta.dict.return_value = delta_data
            chunk = MagicMock()
            chunk.choices = [MagicMock(delta=delta)]
            chunk.usage = None
            yield chunk


class ReasoningActionThenFinalAnswerLLM(BaseLLMModel):
    """Fake the complete action, observation, and final-answer model flow."""

    stream_call_count: int = 0

    async def stream(  # type: ignore[override]
        self, messages: list, stream: bool, span: Optional[Span] = None
    ) -> AsyncIterator[Any]:
        self.stream_call_count += 1
        if self.stream_call_count == 1:
            delta_data = {
                "reasoning_content": "Need to read the sensor.",
                "content": (
                    "Thought: Read the current temperature.\n"
                    "Action: tool1\n"
                    'Action Input: {"scenario": "normal"}'
                ),
            }
        elif self.stream_call_count == 2:
            delta_data = {
                "reasoning_content": "",
                "content": (
                    "Thought: The sensor reading is available.\n"
                    "Final Answer: Current temperature: 26.2°C"
                ),
            }
        else:
            raise AssertionError("Unexpected extra model stream call")

        delta = MagicMock()
        delta.dict.return_value = delta_data
        delta.model_dump.return_value = delta_data
        chunk = MagicMock()
        chunk.choices = [MagicMock(delta=delta)]
        chunk.usage = None
        yield chunk


class PlainFinalAnswerAfterActionLLM(BaseLLMModel):
    """Fake a provider that omits Final Answer after a successful tool call."""

    stream_call_count: int = 0
    received_user_prompts: list[str] = []

    async def stream(  # type: ignore[override]
        self, messages: list, stream: bool, span: Optional[Span] = None
    ) -> AsyncIterator[Any]:
        self.stream_call_count += 1
        self.received_user_prompts.append(messages[-1]["content"])
        if self.stream_call_count == 1:
            delta_data = {
                "reasoning_content": "",
                "content": (
                    "Thought: Read the current temperature.\n"
                    "Action: tool1\n"
                    'Action Input: {"scenario": "normal"}'
                ),
            }
        elif self.stream_call_count == 2:
            delta_data = {
                "reasoning_content": "",
                "content": "The tool succeeded and the temperature is 26.2°C.",
            }
        else:
            raise AssertionError("Unexpected extra model stream call")

        delta = MagicMock()
        delta.dict.return_value = delta_data
        delta.model_dump.return_value = delta_data
        chunk = MagicMock()
        chunk.choices = [MagicMock(delta=delta)]
        chunk.usage = None
        yield chunk


class InvalidThenCorrectedActionLLM(BaseLLMModel):
    """Fake one malformed first step followed by a corrected ReAct step."""

    stream_call_count: int = 0
    received_user_prompts: list[str] = []

    async def stream(  # type: ignore[override]
        self, messages: list, stream: bool, span: Optional[Span] = None
    ) -> AsyncIterator[Any]:
        self.stream_call_count += 1
        self.received_user_prompts.append(messages[-1]["content"])
        if self.stream_call_count == 1:
            delta_data = {
                "reasoning_content": "",
                "content": "I should read the current temperature first.",
            }
        elif self.stream_call_count == 2:
            delta_data = {
                "reasoning_content": "",
                "content": (
                    "Thought: Read the current temperature.\n"
                    "Action: tool1\n"
                    'Action Input: {"scenario": "normal"}'
                ),
            }
        elif self.stream_call_count == 3:
            delta_data = {
                "reasoning_content": "",
                "content": (
                    "Thought: The reading is available.\n"
                    "Final Answer: Current temperature: 26.2°C"
                ),
            }
        else:
            raise AssertionError("Unexpected extra model stream call")

        delta = MagicMock()
        delta.dict.return_value = delta_data
        delta.model_dump.return_value = delta_data
        chunk = MagicMock()
        chunk.choices = [MagicMock(delta=delta)]
        chunk.usage = None
        yield chunk


class PartialActionAfterSuccessfulActionLLM(BaseLLMModel):
    """Fake a truncated post-tool step followed by a corrected final answer."""

    stream_call_count: int = 0
    received_user_prompts: list[str] = []

    async def stream(  # type: ignore[override]
        self, messages: list, stream: bool, span: Optional[Span] = None
    ) -> AsyncIterator[Any]:
        self.stream_call_count += 1
        self.received_user_prompts.append(messages[-1]["content"])
        if self.stream_call_count == 1:
            content = (
                "Thought: Read the current temperature.\n"
                "Action: tool1\n"
                'Action Input: {"scenario": "normal"}'
            )
        elif self.stream_call_count == 2:
            content = "Thought: Continue with another tool.\nAction: tool1"
        elif self.stream_call_count == 3:
            content = (
                "Thought: The previous tool result is sufficient.\n"
                "Final Answer: Current temperature: 26.2°C"
            )
        else:
            raise AssertionError("Unexpected extra model stream call")

        delta_data = {"reasoning_content": "", "content": content}
        delta = MagicMock()
        delta.dict.return_value = delta_data
        delta.model_dump.return_value = delta_data
        chunk = MagicMock()
        chunk.choices = [MagicMock(delta=delta)]
        chunk.usage = None
        yield chunk


class ReasoningOnlyProtocolLLM(BaseLLMModel):
    """Fake a provider that puts a complete ReAct step in reasoning_content."""

    stream_call_count: int = 0
    received_user_prompts: list[str] = []

    async def stream(  # type: ignore[override]
        self, messages: list, stream: bool, span: Optional[Span] = None
    ) -> AsyncIterator[Any]:
        self.stream_call_count += 1
        self.received_user_prompts.append(messages[-1]["content"])
        if self.stream_call_count == 1:
            delta_data = {
                "reasoning_content": (
                    "Thought: Read the current temperature.\n"
                    "Action: tool1\n"
                    'Action Input: {"scenario": "normal"}'
                ),
                "content": "",
            }
        elif self.stream_call_count == 2:
            delta_data = {
                "reasoning_content": "",
                "content": (
                    "Thought: The reading is available.\n"
                    "Final Answer: Current temperature: 26.2°C"
                ),
            }
        else:
            raise AssertionError("Unexpected extra model stream call")

        delta = MagicMock()
        delta.dict.return_value = delta_data
        delta.model_dump.return_value = delta_data
        chunk = MagicMock()
        chunk.choices = [MagicMock(delta=delta)]
        chunk.usage = None
        yield chunk


class AlwaysInvalidProtocolLLM(BaseLLMModel):
    """Fake a provider that answers in plain text even after format correction."""

    stream_call_count: int = 0
    received_user_prompts: list[str] = []

    async def stream(  # type: ignore[override]
        self, messages: list, stream: bool, span: Optional[Span] = None
    ) -> AsyncIterator[Any]:
        self.stream_call_count += 1
        self.received_user_prompts.append(messages[-1]["content"])
        delta_data = {
            "reasoning_content": "",
            "content": "I will not follow the required protocol.",
        }
        delta = MagicMock()
        delta.dict.return_value = delta_data
        delta.model_dump.return_value = delta_data
        chunk = MagicMock()
        chunk.choices = [MagicMock(delta=delta)]
        chunk.usage = None
        yield chunk


class AlwaysPartialProtocolLLM(BaseLLMModel):
    """Fake a provider that returns an unsafe partial action twice."""

    stream_call_count: int = 0
    received_user_prompts: list[str] = []

    async def stream(  # type: ignore[override]
        self, messages: list, stream: bool, span: Optional[Span] = None
    ) -> AsyncIterator[Any]:
        self.stream_call_count += 1
        self.received_user_prompts.append(messages[-1]["content"])
        delta_data = {
            "reasoning_content": "",
            "content": "Thought: I should call a tool.\nAction: tool1",
        }
        delta = MagicMock()
        delta.dict.return_value = delta_data
        delta.model_dump.return_value = delta_data
        chunk = MagicMock()
        chunk.choices = [MagicMock(delta=delta)]
        chunk.usage = None
        yield chunk


class MixedReasoningActionContentLLM(BaseLLMModel):
    """Fake a provider that puts the action in reasoning and prose in content."""

    stream_call_count: int = 0

    async def stream(  # type: ignore[override]
        self, messages: list, stream: bool, span: Optional[Span] = None
    ) -> AsyncIterator[Any]:
        self.stream_call_count += 1
        if self.stream_call_count == 1:
            delta_data = {
                "reasoning_content": (
                    "Thought: Read the current temperature.\n"
                    "Action: tool1\n"
                    'Action Input: {"scenario": "normal"}'
                ),
                "content": "I will check the sensor now.",
            }
        elif self.stream_call_count == 2:
            delta_data = {
                "reasoning_content": "",
                "content": "Final Answer: Current temperature: 26.2°C",
            }
        else:
            raise AssertionError("Unexpected extra model stream call")

        delta = MagicMock()
        delta.dict.return_value = delta_data
        delta.model_dump.return_value = delta_data
        chunk = MagicMock()
        chunk.choices = [MagicMock(delta=delta)]
        chunk.usage = None
        yield chunk


class ReasoningFinalWithContentLLM(BaseLLMModel):
    """Fake a reasoning model that emits its user-facing answer in content."""

    async def stream(  # type: ignore[override]
        self, messages: list, stream: bool, span: Optional[Span] = None
    ) -> AsyncIterator[Any]:
        delta_data = {
            "reasoning_content": "Thought: Enough context.\nFinal Answer: internal",
            "content": "User-facing answer",
        }
        delta = MagicMock()
        delta.dict.return_value = delta_data
        delta.model_dump.return_value = delta_data
        chunk = MagicMock()
        chunk.choices = [MagicMock(delta=delta)]
        chunk.usage = None
        yield chunk


class ReasoningOnlyFinalLLM(BaseLLMModel):
    """Fake a provider that places the whole final protocol in reasoning."""

    async def stream(  # type: ignore[override]
        self, messages: list, stream: bool, span: Optional[Span] = None
    ) -> AsyncIterator[Any]:
        delta_data = {
            "reasoning_content": (
                "Thought: Enough context.\nFinal Answer: Reasoning-channel answer"
            ),
            "content": "",
        }
        delta = MagicMock()
        delta.dict.return_value = delta_data
        delta.model_dump.return_value = delta_data
        chunk = MagicMock()
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

    @pytest.mark.asyncio
    async def test_chat_runner_preserves_placeholder_text_in_history(
        self, span: Span, node_trace: NodeTraceLog
    ) -> None:
        model = DummyLLM.model_construct(name="m", llm=MagicMock())
        runner = ChatRunner(
            model=model,
            chat_history=[LLMMessage(role="user", content="keep {question} literal")],
            instruct="inst",
            knowledge="kb",
            question="actual question",
        )

        async for _ in runner.run(span, node_trace):
            pass

        model_input = node_trace.trace[0].data.input["model_general_stream_input"]
        messages = json.loads(model_input)
        user_prompt = messages[1]["content"]

        assert "keep {question} literal" in user_prompt
        assert "Follow up question: actual question" in user_prompt


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
    async def test_parse_cot_step_accepts_common_marker_variations(
        self, cot_runner: CotRunner
    ) -> None:
        content = (
            "**thought**： read the sensor\n"
            "**ACTION**： tool1\n"
            "**Action_Input**： ```json\n"
            '{"x": 1}\n'
            "```"
        )

        step = await cot_runner.parse_cot_step(content)

        assert step.thought == "read the sensor"
        assert step.action == "tool1"
        assert step.action_input == {"x": 1}

    @pytest.mark.asyncio
    async def test_parse_cot_step_accepts_inline_markers(
        self, cot_runner: CotRunner
    ) -> None:
        content = "Thought: read the sensor Action: tool1 " 'Action Input: {"x": 1}'

        step = await cot_runner.parse_cot_step(content)

        assert step.thought == "read the sensor"
        assert step.action == "tool1"
        assert step.action_input == {"x": 1}

    @pytest.mark.asyncio
    async def test_parse_cot_step_invalid_format(self, cot_runner: CotRunner) -> None:
        from agent.exceptions import cot_exc

        with pytest.raises(cot_exc.CotFormatIncorrectExc):
            await cot_runner.parse_cot_step("no action here")

    @pytest.mark.asyncio
    async def test_read_response_accepts_usage_only_final_chunk(
        self,
        cot_runner: CotRunner,
        span: Span,
        node_trace: NodeTraceLog,
    ) -> None:
        cot_runner.model = UsageOnlyFinalChunkLLM.model_construct(
            name="gpt-5.2-chat", llm=MagicMock()
        )
        messages = MagicMock()
        messages.list.return_value = []

        responses = [
            response
            async for response in cot_runner.read_response(
                messages,
                first_loop=True,
                span=span,
                node_trace_log=node_trace,
            )
        ]

        assert [(response.typ, response.content) for response in responses] == [
            ("content", "26.2°C")
        ]
        usage = node_trace.trace[-1].data.usage
        assert usage.prompt_tokens == 12
        assert usage.completion_tokens == 8
        assert usage.total_tokens == 20

    @pytest.mark.asyncio
    async def test_read_response_collects_usage_after_later_final_answer(
        self,
        cot_runner: CotRunner,
        span: Span,
        node_trace: NodeTraceLog,
    ) -> None:
        cot_runner.model = UsageOnlyFinalChunkLLM.model_construct(
            name="gpt-5.2-chat", llm=MagicMock()
        )
        messages = MagicMock()
        messages.list.return_value = []

        responses = [
            response
            async for response in cot_runner.read_response(
                messages,
                first_loop=False,
                span=span,
                node_trace_log=node_trace,
            )
        ]

        assert [(response.typ, response.content) for response in responses] == [
            ("content", "26.2°C")
        ]
        usage = node_trace.trace[-1].data.usage
        assert usage.prompt_tokens == 12
        assert usage.completion_tokens == 8
        assert usage.total_tokens == 20

    @pytest.mark.asyncio
    async def test_read_response_does_not_repeat_final_answer_for_reasoning_only_chunk(
        self,
        cot_runner: CotRunner,
        span: Span,
        node_trace: NodeTraceLog,
    ) -> None:
        cot_runner.model = FinalAnswerThenReasoningOnlyLLM.model_construct(
            name="gpt-5.2-chat",
            llm=MagicMock(),
        )
        messages = MagicMock()
        messages.list.return_value = []

        responses = [
            response
            async for response in cot_runner.read_response(
                messages,
                first_loop=True,
                span=span,
                node_trace_log=node_trace,
            )
        ]

        assert [(response.typ, response.content) for response in responses] == [
            ("content", "done"),
            ("reasoning_content", "trailing thought"),
        ]

    @pytest.mark.asyncio
    async def test_read_response_parses_content_sharing_reasoning_chunk(
        self,
        cot_runner: CotRunner,
        span: Span,
        node_trace: NodeTraceLog,
    ) -> None:
        cot_runner.model = ReasoningActionThenFinalAnswerLLM.model_construct(
            name="gpt-5.2-chat",
            llm=MagicMock(),
            stream_call_count=0,
        )
        messages = MagicMock()
        messages.list.return_value = []

        responses = [
            response
            async for response in cot_runner.read_response(
                messages,
                first_loop=True,
                span=span,
                node_trace_log=node_trace,
            )
        ]

        assert [response.typ for response in responses] == [
            "reasoning_content",
            "cot_step",
        ]
        assert responses[0].content == "Need to read the sensor."
        cot_step = responses[-1].content
        assert isinstance(cot_step, CotStep)
        assert cot_step.action == "tool1"
        assert cot_step.action_input == {"scenario": "normal"}

    @pytest.mark.asyncio
    async def test_run_executes_action_when_reasoning_shares_content_chunk(
        self,
        cot_runner: CotRunner,
        span: Span,
        node_trace: NodeTraceLog,
    ) -> None:
        model = ReasoningActionThenFinalAnswerLLM.model_construct(
            name="gpt-5.2-chat",
            llm=MagicMock(),
            stream_call_count=0,
        )
        cot_runner.model = model
        cot_runner.process_runner.model = model
        plugin_run = AsyncMock(
            return_value=PluginResponse(
                result={"temperature": 26.2},
                log=[],
            )
        )
        cot_runner.plugins[0].run = plugin_run

        responses = [
            response
            async for response in cot_runner.run(
                span=span,
                node_trace_log=node_trace,
            )
        ]

        assert responses[0].typ == "reasoning_content"
        assert responses[0].content == "Need to read the sensor."
        plugin_run.assert_awaited_once()
        await_args = plugin_run.await_args
        assert await_args is not None
        assert await_args.args[0] == {"scenario": "normal"}
        assert any(
            response.typ == "cot_step"
            and isinstance(response.content, CotStep)
            and response.content.action_output == {"temperature": 26.2}
            for response in responses
        )
        assert responses[-1].typ == "content"
        assert responses[-1].content == "Current temperature: 26.2°C"
        assert model.stream_call_count == 2

    @pytest.mark.asyncio
    async def test_run_recovers_plain_final_answer_after_successful_action(
        self,
        cot_runner: CotRunner,
        span: Span,
        node_trace: NodeTraceLog,
    ) -> None:
        model = PlainFinalAnswerAfterActionLLM.model_construct(
            name="gpt-5.2-chat",
            llm=MagicMock(),
            stream_call_count=0,
            received_user_prompts=[],
        )
        cot_runner.model = model
        cot_runner.process_runner.model = model
        plugin_run = AsyncMock(
            return_value=PluginResponse(
                result={"temperature": 26.2},
                log=[],
            )
        )
        cot_runner.plugins[0].run = plugin_run

        responses = [
            response
            async for response in cot_runner.run(
                span=span,
                node_trace_log=node_trace,
            )
        ]

        plugin_run.assert_awaited_once()
        assert responses[-1].typ == "content"
        assert (
            responses[-1].content == "The tool succeeded and the temperature is 26.2°C."
        )
        assert model.stream_call_count == 2

    @pytest.mark.asyncio
    async def test_run_retries_one_invalid_first_step_with_format_correction(
        self,
        cot_runner: CotRunner,
        span: Span,
        node_trace: NodeTraceLog,
    ) -> None:
        model = InvalidThenCorrectedActionLLM.model_construct(
            name="gpt-5.2-chat",
            llm=MagicMock(),
            stream_call_count=0,
            received_user_prompts=[],
        )
        cot_runner.model = model
        cot_runner.process_runner.model = model
        plugin_run = AsyncMock(
            return_value=PluginResponse(
                result={"temperature": 26.2},
                log=[],
            )
        )
        cot_runner.plugins[0].run = plugin_run

        responses = [
            response
            async for response in cot_runner.run(
                span=span,
                node_trace_log=node_trace,
            )
        ]

        plugin_run.assert_awaited_once()
        assert "上一次输出格式无法解析" not in model.received_user_prompts[0]
        assert "上一次输出格式无法解析" in model.received_user_prompts[1]
        assert all(
            "上一次输出格式无法解析" not in prompt
            for prompt in model.received_user_prompts[2:]
        )
        assert responses[-1].typ == "content"
        assert responses[-1].content == "Current temperature: 26.2°C"
        assert model.stream_call_count == 3

    @pytest.mark.asyncio
    async def test_run_retries_partial_protocol_without_repeating_successful_action(
        self,
        cot_runner: CotRunner,
        span: Span,
        node_trace: NodeTraceLog,
    ) -> None:
        model = PartialActionAfterSuccessfulActionLLM.model_construct(
            name="gpt-5.2-chat",
            llm=MagicMock(),
            stream_call_count=0,
            received_user_prompts=[],
        )
        cot_runner.model = model
        cot_runner.process_runner.model = model
        plugin_run = AsyncMock(
            return_value=PluginResponse(
                result={"temperature": 26.2},
                log=[],
            )
        )
        cot_runner.plugins[0].run = plugin_run

        responses = [
            response
            async for response in cot_runner.run(
                span=span,
                node_trace_log=node_trace,
            )
        ]

        plugin_run.assert_awaited_once()
        assert "上一次输出格式无法解析" in model.received_user_prompts[2]
        assert responses[-1].content == "Current temperature: 26.2°C"
        assert model.stream_call_count == 3

    @pytest.mark.asyncio
    async def test_run_parses_complete_protocol_from_reasoning_content(
        self,
        cot_runner: CotRunner,
        span: Span,
        node_trace: NodeTraceLog,
    ) -> None:
        model = ReasoningOnlyProtocolLLM.model_construct(
            name="gpt-5.2-chat",
            llm=MagicMock(),
            stream_call_count=0,
            received_user_prompts=[],
        )
        cot_runner.model = model
        cot_runner.process_runner.model = model
        plugin_run = AsyncMock(
            return_value=PluginResponse(
                result={"temperature": 26.2},
                log=[],
            )
        )
        cot_runner.plugins[0].run = plugin_run

        responses = [
            response
            async for response in cot_runner.run(
                span=span,
                node_trace_log=node_trace,
            )
        ]

        plugin_run.assert_awaited_once()
        await_args = plugin_run.await_args
        assert await_args is not None
        assert await_args.args[0] == {"scenario": "normal"}
        assert "上一次输出格式无法解析" not in model.received_user_prompts[1]
        assert responses[-1].content == "Current temperature: 26.2°C"
        assert model.stream_call_count == 2

    @pytest.mark.asyncio
    async def test_run_accepts_plain_answer_after_one_format_correction(
        self,
        cot_runner: CotRunner,
        span: Span,
        node_trace: NodeTraceLog,
    ) -> None:
        model = AlwaysInvalidProtocolLLM.model_construct(
            name="gpt-5.2-chat",
            llm=MagicMock(),
            stream_call_count=0,
            received_user_prompts=[],
        )
        cot_runner.model = model
        cot_runner.process_runner.model = model
        cot_runner.max_loop = 1
        plugin_run = AsyncMock()
        cot_runner.plugins[0].run = plugin_run

        responses = [
            response
            async for response in cot_runner.run(
                span=span,
                node_trace_log=node_trace,
            )
        ]

        plugin_run.assert_not_awaited()
        assert "上一次输出格式无法解析" not in model.received_user_prompts[0]
        assert "上一次输出格式无法解析" in model.received_user_prompts[1]
        assert responses[-1].content == "I will not follow the required protocol."
        assert model.stream_call_count == 2

    @pytest.mark.asyncio
    async def test_run_limits_partial_protocol_correction_to_one_retry(
        self,
        cot_runner: CotRunner,
        span: Span,
        node_trace: NodeTraceLog,
    ) -> None:
        model = AlwaysPartialProtocolLLM.model_construct(
            name="gpt-5.2-chat",
            llm=MagicMock(),
            stream_call_count=0,
            received_user_prompts=[],
        )
        cot_runner.model = model
        cot_runner.process_runner.model = model
        cot_runner.max_loop = 1
        plugin_run = AsyncMock()
        cot_runner.plugins[0].run = plugin_run

        with pytest.raises(cot_exc.CotExc):
            async for _ in cot_runner.run(
                span=span,
                node_trace_log=node_trace,
            ):
                pass

        plugin_run.assert_not_awaited()
        assert "上一次输出格式无法解析" in model.received_user_prompts[1]
        assert model.stream_call_count == 2

    @pytest.mark.asyncio
    async def test_run_prefers_complete_reasoning_action_over_plain_content(
        self,
        cot_runner: CotRunner,
        span: Span,
        node_trace: NodeTraceLog,
    ) -> None:
        model = MixedReasoningActionContentLLM.model_construct(
            name="gpt-5.2-chat",
            llm=MagicMock(),
            stream_call_count=0,
        )
        cot_runner.model = model
        cot_runner.process_runner.model = model
        plugin_run = AsyncMock(
            return_value=PluginResponse(result={"temperature": 26.2}, log=[])
        )
        cot_runner.plugins[0].run = plugin_run

        responses = [
            response
            async for response in cot_runner.run(
                span=span,
                node_trace_log=node_trace,
            )
        ]

        plugin_run.assert_awaited_once()
        await_args = plugin_run.await_args
        assert await_args is not None
        assert await_args.args[0] == {"scenario": "normal"}
        assert responses[-1].content == "Current temperature: 26.2°C"
        assert model.stream_call_count == 2

    @pytest.mark.asyncio
    async def test_read_response_uses_content_when_reasoning_has_final_protocol(
        self,
        cot_runner: CotRunner,
        span: Span,
        node_trace: NodeTraceLog,
    ) -> None:
        cot_runner.model = ReasoningFinalWithContentLLM.model_construct(
            name="gpt-5.2-chat", llm=MagicMock()
        )
        messages = MagicMock()
        messages.list.return_value = []

        responses = [
            response
            async for response in cot_runner.read_response(
                messages,
                first_loop=False,
                span=span,
                node_trace_log=node_trace,
            )
        ]

        assert responses[-1].typ == "content"
        assert responses[-1].content == "User-facing answer"

    @pytest.mark.asyncio
    async def test_read_response_uses_reasoning_only_final_answer(
        self,
        cot_runner: CotRunner,
        span: Span,
        node_trace: NodeTraceLog,
    ) -> None:
        cot_runner.model = ReasoningOnlyFinalLLM.model_construct(
            name="gpt-5.2-chat", llm=MagicMock()
        )
        messages = MagicMock()
        messages.list.return_value = []

        responses = [
            response
            async for response in cot_runner.read_response(
                messages,
                first_loop=False,
                span=span,
                node_trace_log=node_trace,
            )
        ]

        assert responses[-1].typ == "content"
        assert responses[-1].content == "Reasoning-channel answer"

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
