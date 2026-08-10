from typing import Any

import pytest
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import (
    InMemorySpanExporter,
)

from workflow.extensions.otlp.trace.span import SPAN_SIZE_LIMIT, Span


@pytest.fixture()
def span_capture() -> tuple[Span, InMemorySpanExporter]:
    exporter = InMemorySpanExporter()
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    span = Span(app_id="app", uid="uid", chat_id="chat")
    span.tracer = provider.get_tracer("test")
    return span, exporter


@pytest.mark.asyncio
async def test_sets_gen_ai_usage_and_model_attributes(
    span_capture: tuple[Span, InMemorySpanExporter],
) -> None:
    span, exporter = span_capture
    with span.start("run_node:test") as ctx:
        await ctx.set_gen_ai_attributes_async(
            usage={"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15},
            model="gpt-4o",
            input_payload={"query": "hi"},
            output_payload={"answer": "ok"},
        )
    finished = exporter.get_finished_spans()[0]
    assert finished.attributes["gen_ai.request.model"] == "gpt-4o"
    assert finished.attributes["gen_ai.usage.input_tokens"] == 10
    assert finished.attributes["gen_ai.usage.output_tokens"] == 5
    assert finished.attributes["gen_ai.usage.total_tokens"] == 15
    assert '"query"' in finished.attributes["langfuse.observation.input"]
    assert '"answer"' in finished.attributes["langfuse.observation.output"]


@pytest.mark.asyncio
async def test_skips_model_attribute_for_non_llm_nodes(
    span_capture: tuple[Span, InMemorySpanExporter],
) -> None:
    span, exporter = span_capture
    with span.start("run_node:test") as ctx:
        await ctx.set_gen_ai_attributes_async(
            usage=None, model="", input_payload={"a": 1}, output_payload=None
        )
    finished = exporter.get_finished_spans()[0]
    assert "gen_ai.request.model" not in finished.attributes
    assert "gen_ai.usage.total_tokens" not in finished.attributes
    assert "langfuse.observation.input" in finished.attributes


@pytest.mark.asyncio
async def test_oversized_payload_offloaded_to_oss(
    span_capture: tuple[Span, InMemorySpanExporter],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class _FakeOss:
        async def upload_file_async(self, name: str, data: bytes) -> str:
            return "http://oss/link"

    monkeypatch.setattr(
        "workflow.extensions.otlp.trace.span.get_oss_service", lambda: _FakeOss()
    )
    span, exporter = span_capture
    big = {"blob": "x" * (SPAN_SIZE_LIMIT + 1)}
    with span.start("run_node:test") as ctx:
        await ctx.set_gen_ai_attributes_async(output_payload=big)
    finished = exporter.get_finished_spans()[0]
    assert finished.attributes["langfuse.observation.output"] == (
        "trace_link: http://oss/link"
    )


@pytest.mark.asyncio
async def test_never_raises_on_unserializable_payload(
    span_capture: tuple[Span, InMemorySpanExporter],
) -> None:
    class _Weird:
        def __repr__(self) -> str:
            return "weird-object"

    span, exporter = span_capture
    with span.start("run_node:test") as ctx:
        await ctx.set_gen_ai_attributes_async(
            usage={"prompt_tokens": "not-an-int"},
            input_payload=_Weird(),
        )
    finished = exporter.get_finished_spans()[0]
    assert "weird-object" in finished.attributes["langfuse.observation.input"]
