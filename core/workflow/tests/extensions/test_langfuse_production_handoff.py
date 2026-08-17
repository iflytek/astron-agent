"""Production middleware regression tests for trusted Langfuse propagation."""

from typing import Any, Mapping, cast

import httpx
import pytest
from common.otlp.trace.langfuse import (
    WORKFLOW_TRACE_AUDIENCE,
    LangfuseBaggageSpanProcessor,
    inject_trusted_langfuse_context,
    langfuse_observation_attributes,
    langfuse_trace_attributes,
    langfuse_trace_context,
)
from fastapi import FastAPI
from opentelemetry.sdk.trace import ReadableSpan, TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
from opentelemetry.trace import SpanContext, Tracer

from workflow.extensions.fastapi.middleware import auth as auth_middleware
from workflow.extensions.fastapi.middleware import otlp as otlp_middleware
from workflow.extensions.otlp.trace.span import Span as WorkflowSpan


def _enable_langfuse(monkeypatch: pytest.MonkeyPatch) -> None:
    """Enable deterministic local Langfuse propagation for the regression."""

    monkeypatch.setenv("LANGFUSE_ENABLED", "true")
    monkeypatch.setenv("LANGFUSE_PUBLIC_KEY", "pk-test")
    monkeypatch.setenv("LANGFUSE_SECRET_KEY", "sk-test")
    monkeypatch.setenv("ASTRON_TRACE_CONTEXT_SECRET", "astron-trace-test-secret")
    monkeypatch.setenv("LANGFUSE_HOST", "https://langfuse.example.test/")
    monkeypatch.setenv("LANGFUSE_CAPTURE_INPUT_OUTPUT", "false")
    monkeypatch.setenv("LANGFUSE_MAX_ATTRIBUTE_LENGTH", "8192")
    monkeypatch.setenv("LANGFUSE_ENVIRONMENT", "default")


def _production_headers(tracer: Tracer) -> tuple[dict[str, str], SpanContext]:
    """Create FlowNode-equivalent production headers and the caller context."""

    trace_attributes = langfuse_trace_attributes(
        "workflow:production-parent",
        user_id="synthetic-user",
        session_id="synthetic-session",
        tags=["workflow", "production"],
    )
    with langfuse_trace_context(trace_attributes), tracer.start_as_current_span(
        "production-caller"
    ) as caller:
        signed_carrier = inject_trusted_langfuse_context(
            method="POST",
            audience=WORKFLOW_TRACE_AUDIENCE,
            tenant_id="synthetic-app",
        )
        caller_context = caller.get_span_context()

    headers = {
        "Authorization": "Bearer synthetic-key:synthetic-secret",
        **signed_carrier,
    }
    assert "x-consumer-username" not in {key.lower() for key in headers}
    return headers, caller_context


def _span_attributes(span: ReadableSpan) -> Mapping[str, Any]:
    """Return recorded attributes with a narrow type for assertions."""

    assert span.attributes is not None
    return cast(Mapping[str, Any], span.attributes)


def _assert_production_trace(
    exporter: InMemorySpanExporter, caller_context: SpanContext
) -> None:
    """Assert the request hierarchy and trace-wide attributes end to end."""

    spans = {item.name: item for item in exporter.get_finished_spans()}
    request_span = spans["/workflow/v1/chat/completions"]
    workflow_span = spans["workflow.run"]
    assert request_span.parent is not None
    assert request_span.parent.span_id == caller_context.span_id
    assert request_span.context.trace_id == caller_context.trace_id
    assert workflow_span.parent is not None
    assert workflow_span.parent.span_id == request_span.context.span_id
    assert workflow_span.context.trace_id == caller_context.trace_id

    for traced_item in (request_span, workflow_span):
        attributes = _span_attributes(traced_item)
        assert attributes["langfuse.trace.name"] == "workflow:production-parent"
        assert attributes["langfuse.user.id"] == "synthetic-user"
        assert attributes["langfuse.session.id"] == "synthetic-session"
        assert attributes["langfuse.trace.tags"] == ("workflow", "production")


@pytest.mark.asyncio
async def test_production_auth_handoff_preserves_trusted_trace_context(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Exercise the production Auth -> OTLP middleware handoff end to end."""

    _enable_langfuse(monkeypatch)
    monkeypatch.setenv("RUNTIME_ENV", "prod")
    exporter = InMemorySpanExporter()
    provider = TracerProvider()
    provider.add_span_processor(LangfuseBaggageSpanProcessor(8192))
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    tracer = provider.get_tracer("workflow-production-auth-handoff-test")

    def traced_span() -> WorkflowSpan:
        span = WorkflowSpan(app_id="app", uid="user", chat_id="session")
        span.tracer = tracer
        return span

    resolved_authorizations: list[str] = []

    async def resolve_app_id(
        middleware: auth_middleware.AuthMiddleware,
        authorization: str,
        span: WorkflowSpan,
    ) -> str:
        del middleware, span
        resolved_authorizations.append(authorization)
        return "synthetic-app"

    monkeypatch.setattr(auth_middleware, "Span", traced_span)
    monkeypatch.setattr(otlp_middleware, "Span", traced_span)
    monkeypatch.setattr(
        auth_middleware.AuthMiddleware,
        "_get_app_source_detail_with_api_key",
        resolve_app_id,
    )
    headers, caller_context = _production_headers(tracer)

    app = FastAPI()
    app.add_middleware(otlp_middleware.OtlpMiddleware)
    app.add_middleware(auth_middleware.AuthMiddleware)

    @app.post("/workflow/v1/chat/completions")
    async def workflow_route() -> dict[str, bool]:
        with langfuse_trace_context({}, trust_parent=True), traced_span().start(
            "workflow.run",
            attributes=langfuse_observation_attributes("chain"),
        ):
            pass
        return {"ok": True}

    try:
        transport = httpx.ASGITransport(app=cast(Any, app))
        async with httpx.AsyncClient(
            transport=transport, base_url="http://test"
        ) as client:
            response = await client.post(
                "/workflow/v1/chat/completions", headers=headers
            )

        assert response.status_code == 200
        assert resolved_authorizations == ["Bearer synthetic-key:synthetic-secret"]
        _assert_production_trace(exporter, caller_context)
    finally:
        provider.shutdown()
