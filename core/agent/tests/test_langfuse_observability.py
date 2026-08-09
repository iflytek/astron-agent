"""End-to-end span semantics for Langfuse agent observability."""

import asyncio
import json
from dataclasses import dataclass
from types import SimpleNamespace
from typing import Any, AsyncIterator, Iterator, Optional

import pytest
from common.otlp import sid as sid_module
from common.otlp.log_trace.node_trace_log import NodeTraceLog
from common.otlp.trace.langfuse import (
    LangfuseBaggageSpanProcessor,
    langfuse_trace_attributes,
    langfuse_trace_context,
)
from common.otlp.trace.span import Span
from common.otlp.trace.trace import Trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
from opentelemetry.trace import StatusCode

from agent.api.schemas.agent_response import CotStep
from agent.api.schemas.llm_message import LLMMessage
from agent.api.schemas.workflow_agent_inputs import (
    CustomCompletionInputs,
    CustomCompletionModelConfigInputs,
)
from agent.api.v1.workflow_agent import CustomChatCompletion
from agent.domain.models.base import (
    BaseLLMModel,
    CompatChoice,
    CompatChunk,
    CompatDelta,
    CompatUsage,
)
from agent.engine.nodes.base import RunnerBase
from agent.engine.nodes.cot.cot_runner import CotRunner
from agent.engine.nodes.cot_process.cot_process_runner import CotProcessRunner
from agent.exceptions.agent_exc import AgentInternalExc
from agent.service.plugin.base import BasePlugin, PluginResponse
from agent.service.plugin.workflow import WorkflowPlugin


@dataclass
class _DummySidGenerator:
    value: str = "langfuse-test-sid"

    def gen(self) -> str:
        return self.value


class _StreamingLLM(BaseLLMModel):
    """Deterministic model boundary while exercising the real runner stream logic."""

    async def stream(  # type: ignore[override]
        self, messages: list, stream: bool, span: Optional[Span] = None
    ) -> AsyncIterator[CompatChunk]:
        yield CompatChunk(
            choices=[
                CompatChoice(
                    delta=CompatDelta(
                        reasoning_content="brief reasoning",
                        content="Thought: complete\nFinal Answer: traced answer",
                    )
                )
            ]
        )
        # OpenAI-compatible streams commonly send usage in a choices-less final frame.
        yield CompatChunk(
            choices=[],
            usage=CompatUsage(
                prompt_tokens=11,
                completion_tokens=7,
                total_tokens=18,
            ),
        )


@pytest.fixture
def traced_span() -> Iterator[tuple[Span, InMemorySpanExporter]]:
    if sid_module.sid_generator2 is None:
        sid_module.sid_generator2 = _DummySidGenerator()  # type: ignore[assignment]

    exporter = InMemorySpanExporter()
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    span = Span(app_id="app", uid="user", chat_id="chat")
    span.tracer = provider.get_tracer("langfuse-agent-tests")
    yield span, exporter
    provider.shutdown()


@pytest.fixture
def node_trace() -> NodeTraceLog:
    return NodeTraceLog(
        service_id="agent",
        sid="langfuse-test-sid",
        app_id="app",
        uid="user",
        chat_id="chat",
        sub="Agent",
        caller="test",
        log_caller="test",
        question="How is the weather?",
    )


def _finished_span(exporter: InMemorySpanExporter, name: str) -> Any:
    matches = [span for span in exporter.get_finished_spans() if span.name == name]
    assert len(matches) == 1
    return matches[0]


def _cot_runner(plugins: list[BasePlugin] | None = None) -> CotRunner:
    model = _StreamingLLM.model_construct(name="trace-model", llm=None)
    process_runner = CotProcessRunner(
        model=model,
        chat_history=[],
        instruct="",
        knowledge="",
        question="How is the weather?",
    )
    return CotRunner(
        model=model,
        chat_history=[],
        plugins=plugins or [],
        instruct="",
        knowledge="",
        question="How is the weather?",
        process_runner=process_runner,
        max_loop=1,
    )


@pytest.mark.asyncio
async def test_model_stream_exports_generation_attributes_and_usage(
    monkeypatch: pytest.MonkeyPatch,
    traced_span: tuple[Span, InMemorySpanExporter],
    node_trace: NodeTraceLog,
) -> None:
    monkeypatch.setenv("LANGFUSE_CAPTURE_INPUT_OUTPUT", "true")
    span, exporter = traced_span
    model = _StreamingLLM.model_construct(name="trace-model", llm=None)
    runner = RunnerBase(model=model, chat_history=[])
    messages = [{"role": "user", "content": "safe synthetic prompt"}]

    responses = [
        response
        async for response in runner.model_general_stream(messages, span, node_trace)
    ]

    assert [response.typ for response in responses] == [
        "reasoning_content",
        "content",
    ]
    exported = _finished_span(exporter, "RunModelStream")
    attributes = exported.attributes
    assert attributes["langfuse.observation.type"] == "generation"
    assert attributes["langfuse.observation.model.name"] == "trace-model"
    assert json.loads(attributes["langfuse.observation.model.parameters"]) == {
        "stream": True
    }
    assert json.loads(attributes["langfuse.observation.usage_details"]) == {
        "input": 11,
        "output": 7,
        "total": 18,
    }
    assert attributes["langfuse.observation.metadata.provider"] == "openai"
    assert attributes["gen_ai.provider.name"] == "openai"
    assert attributes["gen_ai.request.model"] == "trace-model"
    assert attributes["gen_ai.response.model"] == "trace-model"
    assert attributes["gen_ai.usage.input_tokens"] == 11
    assert attributes["gen_ai.usage.output_tokens"] == 7
    assert json.loads(attributes["langfuse.observation.input"]) == messages
    assert json.loads(attributes["langfuse.observation.output"])["content"].endswith(
        "traced answer"
    )


@pytest.mark.asyncio
async def test_cot_run_exports_agent_with_nested_generation(
    monkeypatch: pytest.MonkeyPatch,
    traced_span: tuple[Span, InMemorySpanExporter],
    node_trace: NodeTraceLog,
) -> None:
    monkeypatch.setenv("LANGFUSE_CAPTURE_INPUT_OUTPUT", "true")
    span, exporter = traced_span
    runner = _cot_runner()

    responses = [response async for response in runner.run(span, node_trace)]

    assert any(
        response.typ == "content" and response.content == "traced answer"
        for response in responses
    )
    agent_span = _finished_span(exporter, "RunCotAgent")
    generation_span = _finished_span(exporter, "MakingStep")
    assert agent_span.attributes["langfuse.observation.type"] == "agent"
    assert generation_span.attributes["langfuse.observation.type"] == "generation"
    assert generation_span.parent.span_id == agent_span.context.span_id
    assert json.loads(agent_span.attributes["langfuse.observation.input"]) == {
        "question": "How is the weather?"
    }
    assert json.loads(agent_span.attributes["langfuse.observation.output"])[-1] == {
        "content": "traced answer",
        "type": "content",
    }
    assert json.loads(
        generation_span.attributes["langfuse.observation.usage_details"]
    ) == {"input": 11, "output": 7, "total": 18}


@pytest.mark.asyncio
async def test_tool_and_workflow_handoff_export_semantic_observations(
    monkeypatch: pytest.MonkeyPatch,
    traced_span: tuple[Span, InMemorySpanExporter],
) -> None:
    monkeypatch.setenv("LANGFUSE_CAPTURE_INPUT_OUTPUT", "true")
    span, exporter = traced_span

    async def run_tool(action_input: dict[str, Any], span: Span) -> PluginResponse:
        return PluginResponse(result={"forecast": "sunny"})

    async def run_workflow(
        *, action_input: dict[str, Any], span: Span
    ) -> AsyncIterator[PluginResponse]:
        yield PluginResponse(
            result={"reasoning_content": "checked", "content": "workflow answer"}
        )

    tool = BasePlugin(
        name="weather",
        description="",
        schema_template="",
        typ="tool",
        run=run_tool,
    )
    workflow = WorkflowPlugin(
        name="forecast_flow",
        description="",
        schema_template="",
        typ="workflow",
        flow_id="flow-42",
        run=run_workflow,
    )
    runner = _cot_runner([tool, workflow])

    tool_step = CotStep(action="weather", action_input={"city": "Hefei"})
    tool_response = await runner.run_plugin(tool_step, span)
    workflow_step = CotStep(
        action="forecast_flow",
        action_input={"city": "Hefei"},
        plugin=workflow,
    )
    workflow_responses = [
        response
        async for response in runner.run_workflow_plugin(workflow, workflow_step, span)
    ]

    assert tool_response.result == {"forecast": "sunny"}
    assert any(response.typ == "content" for response in workflow_responses)
    tool_span = _finished_span(exporter, "RunPlugin")
    workflow_span = _finished_span(exporter, "RunWorkflowPlugin")
    assert tool_span.attributes["langfuse.observation.type"] == "tool"
    assert tool_span.attributes["gen_ai.tool.name"] == "weather"
    assert tool_span.attributes["langfuse.observation.metadata.plugin_name"] == (
        "weather"
    )
    assert json.loads(tool_span.attributes["langfuse.observation.input"]) == {
        "city": "Hefei"
    }
    assert json.loads(tool_span.attributes["langfuse.observation.output"]) == {
        "forecast": "sunny"
    }
    assert workflow_span.attributes["langfuse.observation.type"] == "chain"
    assert workflow_span.attributes["gen_ai.tool.name"] == "forecast_flow"
    assert (
        workflow_span.attributes["langfuse.observation.metadata.handoff_type"]
        == "agent_to_workflow"
    )
    assert (
        workflow_span.attributes["langfuse.observation.metadata.workflow_id"]
        == "flow-42"
    )
    assert json.loads(workflow_span.attributes["langfuse.observation.output"]) == {
        "content": "workflow answer",
        "reasoning_content": "checked",
    }


@pytest.mark.asyncio
async def test_production_generation_span_does_not_capture_content_by_default(
    monkeypatch: pytest.MonkeyPatch,
    traced_span: tuple[Span, InMemorySpanExporter],
    node_trace: NodeTraceLog,
) -> None:
    monkeypatch.delenv("LANGFUSE_CAPTURE_INPUT_OUTPUT", raising=False)
    span, exporter = traced_span
    model = _StreamingLLM.model_construct(name="trace-model", llm=None)
    runner = RunnerBase(
        model=model, chat_history=[LLMMessage(role="user", content="x")]
    )

    async for _ in runner.model_general_stream(
        [{"role": "user", "content": "must stay local"}], span, node_trace
    ):
        pass

    attributes = _finished_span(exporter, "RunModelStream").attributes
    assert "langfuse.observation.input" not in attributes
    assert "langfuse.observation.output" not in attributes
    assert attributes["langfuse.observation.type"] == "generation"
    assert attributes["gen_ai.usage.input_tokens"] == 11


@pytest.mark.asyncio
async def test_sse_close_ends_spans_in_producer_context(
    monkeypatch: pytest.MonkeyPatch,
    traced_span: tuple[Span, InMemorySpanExporter],
) -> None:
    """Closing from another task must not strand or cross-reset OTel contexts."""
    span, exporter = traced_span
    inputs = CustomCompletionInputs(
        uid="test-user",
        messages=[LLMMessage(role="user", content="synthetic question")],
        model_config=CustomCompletionModelConfigInputs(
            domain="trace-model",
            api="http://127.0.0.1:1",
        ),
        max_loop_count=1,
    )
    completion = CustomChatCompletion(
        app_id="test-app",
        inputs=inputs,
        log_caller="test",
        span=span,
        bot_id="test-bot",
        uid="test-user",
        question="synthetic question",
    )
    child_started = asyncio.Event()

    async def fake_build_node_trace(
        self: CustomChatCompletion, bot_id: str, span: Span
    ) -> Any:
        del self, bot_id, span
        return object()

    async def fake_build_meter(self: CustomChatCompletion, span: Span) -> Any:
        del self, span
        return object()

    async def fake_run_runner(
        self: CustomChatCompletion, node_trace_log: Any, meter: Any, span: Span
    ) -> AsyncIterator[str]:
        del self, node_trace_log, meter
        with span.start("generation.child"):
            child_started.set()
            yield 'data: {"choices":[{"delta":{"content":"first"}}]}\n\n'
            await asyncio.Event().wait()

    monkeypatch.setattr(CustomChatCompletion, "build_node_trace", fake_build_node_trace)
    monkeypatch.setattr(CustomChatCompletion, "build_meter", fake_build_meter)
    monkeypatch.setattr(CustomChatCompletion, "run_runner", fake_run_runner)

    stream = completion.do_complete()
    consumer_tracer = span.tracer
    with consumer_tracer.start_as_current_span("consumer") as consumer_span:
        first = await anext(stream)
        await child_started.wait()
        assert "first" in first
        assert span.get_otlp_span() is consumer_span
        await asyncio.create_task(stream.aclose())
        assert span.get_otlp_span() is consumer_span

    spans = {item.name: item for item in exporter.get_finished_spans()}
    assert spans["generation.child"].end_time is not None
    assert spans["agent.run"].end_time is not None
    assert spans["generation.child"].end_time <= spans["agent.run"].end_time


@pytest.mark.asyncio
async def test_workflow_handoff_continues_exact_parent_trace(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A workflow child agent must remain a child observation, not a new trace."""
    if sid_module.sid_generator2 is None:
        sid_module.sid_generator2 = _DummySidGenerator()  # type: ignore[assignment]

    exporter = InMemorySpanExporter()
    provider = TracerProvider()
    provider.add_span_processor(LangfuseBaggageSpanProcessor(8192))
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    tracer = provider.get_tracer("workflow-agent-handoff-test")
    span = Span(app_id="synthetic-app", uid="synthetic-user")
    span.tracer = tracer
    inputs = CustomCompletionInputs(
        uid="synthetic-user",
        messages=[LLMMessage(role="user", content="synthetic question")],
        model_config=CustomCompletionModelConfigInputs(
            domain="trace-model",
            api="http://127.0.0.1:1",
        ),
        meta_data={
            "caller": "workflow-agent-node",
            "workflow_id": "flow-42",
            "node_id": "agent::1",
        },
        max_loop_count=1,
    )
    completion = CustomChatCompletion(
        app_id="synthetic-app",
        inputs=inputs,
        log_caller="workflow-agent-node",
        span=span,
        bot_id="",
        uid="synthetic-user",
        question="synthetic question",
    )

    async def fake_build_node_trace(
        self: CustomChatCompletion, bot_id: str, span: Span
    ) -> Any:
        del self, bot_id, span
        return object()

    async def fake_build_meter(self: CustomChatCompletion, span: Span) -> Any:
        del self, span
        return object()

    async def fake_run_runner(
        self: CustomChatCompletion, node_trace_log: Any, meter: Any, span: Span
    ) -> AsyncIterator[str]:
        del self, node_trace_log, meter, span
        yield 'data: {"code":0,"choices":[{"delta":{"content":"ok"}}]}\n\n'

    monkeypatch.setattr(CustomChatCompletion, "build_node_trace", fake_build_node_trace)
    monkeypatch.setattr(CustomChatCompletion, "build_meter", fake_build_meter)
    monkeypatch.setattr(CustomChatCompletion, "run_runner", fake_run_runner)

    workflow_attributes = langfuse_trace_attributes(
        "workflow:flow-42",
        user_id="synthetic-user",
        session_id="synthetic-session",
    )
    try:
        with langfuse_trace_context(workflow_attributes), tracer.start_as_current_span(
            "workflow.agent-node"
        ) as parent:
            carrier = Trace.inject_context()
            parent_context = parent.get_span_context()

        # Invoke the Agent side after leaving the Workflow context.  This
        # simulates a real process boundary and proves the carrier, rather than
        # asyncio context inheritance, establishes the parent relationship.
        frames = [
            frame async for frame in completion.do_complete(trace_context=carrier)
        ]

        agent_run = _finished_span(exporter, "agent.run")
        assert frames
        assert agent_run.context.trace_id == parent_context.trace_id
        assert agent_run.parent is not None
        assert agent_run.parent.span_id == parent_context.span_id
        assert "langfuse.trace.name" not in (agent_run.attributes or {})
        assert (agent_run.attributes or {})["langfuse.trace.tags"] == (
            "astron-agent",
            "agent",
            "workflow-child",
        )
    finally:
        provider.shutdown()


@pytest.mark.asyncio
async def test_swallowed_agent_failure_marks_runner_and_root_as_error(
    monkeypatch: pytest.MonkeyPatch,
    traced_span: tuple[Span, InMemorySpanExporter],
    node_trace: NodeTraceLog,
) -> None:
    """Protocol-level error frames must remain errors in Langfuse/OTel."""
    span, exporter = traced_span
    inputs = CustomCompletionInputs(
        uid="test-user",
        messages=[LLMMessage(role="user", content="synthetic question")],
        model_config=CustomCompletionModelConfigInputs(
            domain="trace-model",
            api="http://127.0.0.1:1",
        ),
        max_loop_count=1,
    )
    completion = CustomChatCompletion(
        app_id="test-app",
        inputs=inputs,
        log_caller="test",
        span=span,
        bot_id="test-bot",
        uid="test-user",
        question="synthetic question",
    )

    async def fake_build_node_trace(
        self: CustomChatCompletion, bot_id: str, span: Span
    ) -> Any:
        del self, bot_id, span
        assert node_trace.trace == []
        return SimpleNamespace(trace=[], record_end=lambda: None)

    async def fake_build_meter(self: CustomChatCompletion, span: Span) -> Any:
        del self, span
        return SimpleNamespace(in_error_count=lambda _: None)

    async def fail_run(*args: Any, **kwargs: Any) -> AsyncIterator[Any]:
        del args, kwargs
        raise AgentInternalExc("synthetic internal detail")
        yield  # pragma: no cover - keeps this an async generator

    async def fake_build_runner(
        self: CustomChatCompletion, span: Span
    ) -> SimpleNamespace:
        del self, span
        return SimpleNamespace(run=fail_run)

    monkeypatch.setattr(CustomChatCompletion, "build_node_trace", fake_build_node_trace)
    monkeypatch.setattr(CustomChatCompletion, "build_meter", fake_build_meter)
    monkeypatch.setattr(CustomChatCompletion, "build_runner", fake_build_runner)

    frames = [frame async for frame in completion.do_complete()]

    assert any('"code":40500' in frame for frame in frames)
    spans = {item.name: item for item in exporter.get_finished_spans()}
    for name in ("RunRunner", "agent.run"):
        exported = spans[name]
        assert exported.status.status_code == StatusCode.ERROR
        attributes = exported.attributes
        assert attributes is not None
        assert attributes["langfuse.observation.level"] == "ERROR"
        assert (
            attributes["langfuse.observation.status_message"]
            == "Agent execution failed"
        )
        assert attributes["astron.agent.error_code"] == 40500
