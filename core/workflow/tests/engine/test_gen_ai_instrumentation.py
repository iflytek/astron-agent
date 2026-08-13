from types import SimpleNamespace
from typing import Any, Dict

import pytest
from opentelemetry.sdk.trace import ReadableSpan, TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter

from workflow.engine.callbacks.openai_types_sse import GenerateUsage
from workflow.engine.node import NodeExecutionTemplate
from workflow.engine.nodes.entities.node_run_result import NodeRunResult
from workflow.extensions.otlp.trace.span import Span


def attrs_of(span: ReadableSpan) -> Dict[str, Any]:
    """Return span attributes as a plain dict for assertion convenience."""
    return dict(span.attributes or {})


def _make_template(node_instance: object) -> NodeExecutionTemplate:
    template = NodeExecutionTemplate.__new__(NodeExecutionTemplate)
    template.node = SimpleNamespace(node_instance=node_instance)
    return template


def _make_span() -> tuple[Span, InMemorySpanExporter]:
    exporter = InMemorySpanExporter()
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    span = Span(app_id="app", uid="uid", chat_id="chat")
    span.tracer = provider.get_tracer("test")
    return span, exporter


@pytest.mark.asyncio
async def test_llm_node_records_model_and_usage(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("LANGFUSE_OTEL_ENABLE", "1")
    template = _make_template(SimpleNamespace(domain="gpt-4o"))
    result = NodeRunResult(
        node_id="spark-llm::n1",
        alias_name="llm",
        node_type="LLM",
        inputs={"query": "hi"},
        outputs={"answer": "ok"},
        token_cost=GenerateUsage(
            prompt_tokens=10, completion_tokens=5, total_tokens=15
        ),
    )
    span, exporter = _make_span()
    with span.start("run_node:spark-llm::n1") as ctx:
        await template._record_gen_ai_attributes(result, ctx)
    attributes = attrs_of(exporter.get_finished_spans()[0])
    assert attributes["gen_ai.request.model"] == "gpt-4o"
    assert attributes["gen_ai.usage.total_tokens"] == 15
    assert '"query"' in attributes["langfuse.observation.input"]


@pytest.mark.asyncio
async def test_non_llm_node_records_io_without_model(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("LANGFUSE_OTEL_ENABLE", "1")
    template = _make_template(object())  # no `domain` attribute
    result = NodeRunResult(
        node_id="ifly-code::n2",
        alias_name="code",
        node_type="CODE",
        inputs={"x": 1},
        outputs={"y": 2},
        token_cost=None,
    )
    span, exporter = _make_span()
    with span.start("run_node:ifly-code::n2") as ctx:
        await template._record_gen_ai_attributes(result, ctx)
    attributes = attrs_of(exporter.get_finished_spans()[0])
    assert "gen_ai.request.model" not in attributes
    assert "gen_ai.usage.total_tokens" not in attributes
    assert '"y"' in attributes["langfuse.observation.output"]
