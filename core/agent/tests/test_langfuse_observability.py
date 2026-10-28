"""End-to-end span semantics for Langfuse agent observability."""

import asyncio
from dataclasses import dataclass
from types import SimpleNamespace
from typing import Any, AsyncIterator, Iterator

import pytest
from common.otlp import sid as sid_module
from common.otlp.log_trace.node_trace_log import NodeTraceLog
from common.otlp.trace.langfuse import (
    AGENT_TRACE_AUDIENCE,
    LangfuseBaggageSpanProcessor,
    extract_trusted_langfuse_context,
    inject_trusted_langfuse_context,
    langfuse_trace_attributes,
    langfuse_trace_context,
)
from common.otlp.trace.span import Span
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
from opentelemetry.trace import StatusCode

from agent.api.schemas.llm_message import LLMMessage
from agent.api.schemas.workflow_agent_inputs import (
    CustomCompletionInputs,
    CustomCompletionModelConfigInputs,
)
from agent.api.v1.workflow_agent import CustomChatCompletion
from agent.exceptions.agent_exc import AgentInternalExc


@pytest.fixture(autouse=True)
def _enable_langfuse(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LANGFUSE_ENABLED", "true")
    monkeypatch.setenv("LANGFUSE_PUBLIC_KEY", "pk-test")
    monkeypatch.setenv("LANGFUSE_SECRET_KEY", "sk-test")
    monkeypatch.setenv("ASTRON_TRACE_CONTEXT_SECRET", "astron-trace-test-secret")


@dataclass
class _DummySidGenerator:
    value: str = "langfuse-test-sid"

    def gen(self) -> str:
        return self.value


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
        tags=["astron-agent", "workflow", "root"],
    )
    try:
        with langfuse_trace_context(workflow_attributes), tracer.start_as_current_span(
            "workflow.agent-node"
        ) as parent:
            binding = {
                "method": "POST",
                "audience": AGENT_TRACE_AUDIENCE,
                "tenant_id": "synthetic-app",
            }
            carrier = inject_trusted_langfuse_context(**binding)
            parent_context = parent.get_span_context()

        verified_carrier = extract_trusted_langfuse_context(carrier, **binding)
        assert verified_carrier

        # Invoke the Agent side after leaving the Workflow context.  This
        # simulates a real process boundary and proves the carrier, rather than
        # asyncio context inheritance, establishes the parent relationship.
        frames = [
            frame
            async for frame in completion.do_complete(trace_context=verified_carrier)
        ]

        agent_run = _finished_span(exporter, "agent.run")
        assert frames
        assert agent_run.context.trace_id == parent_context.trace_id
        assert agent_run.parent is not None
        assert agent_run.parent.span_id == parent_context.span_id
        assert (agent_run.attributes or {})["langfuse.trace.name"] == (
            "workflow:flow-42"
        )
        assert (agent_run.attributes or {})["langfuse.session.id"] == (
            "synthetic-session"
        )
        assert (agent_run.attributes or {})["langfuse.trace.tags"] == (
            "astron-agent",
            "workflow",
            "root",
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
