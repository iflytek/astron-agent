"""Tests for the shared, privacy-preserving Langfuse OTLP bridge."""

import asyncio
import base64
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from typing import Any, Mapping, NoReturn, Sequence, cast

import httpx
import pytest
from common.otlp.trace import langfuse as langfuse_bridge
from common.otlp.trace import trace as common_trace
from common.otlp.trace.langfuse import (
    WORKFLOW_TRACE_AUDIENCE,
    LangfuseBaggageSpanProcessor,
    LangfuseConfig,
    SanitizingSpanExporter,
    add_langfuse_span_processor,
    extract_trusted_langfuse_context,
    inject_trusted_langfuse_context,
    langfuse_enabled,
    langfuse_observation_attributes,
    langfuse_trace_attributes,
    langfuse_trace_context,
    redact_trusted_trace_headers,
    serialize_langfuse_value,
)
from fastapi import FastAPI
from loguru import logger
from opentelemetry import baggage
from opentelemetry.proto.collector.trace.v1.trace_service_pb2 import (
    ExportTraceServiceRequest,
)
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import ReadableSpan, TracerProvider
from opentelemetry.sdk.trace.export import (
    SimpleSpanProcessor,
    SpanExporter,
    SpanExportResult,
)
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator

from workflow.extensions.fastapi.middleware import otlp as otlp_middleware
from workflow.extensions.fastapi.middleware.otlp import _trusted_trace_carrier
from workflow.extensions.otlp.trace.span import Span as WorkflowSpan


class RecordingExporter(SpanExporter):
    def __init__(self) -> None:
        self.spans: list[ReadableSpan] = []
        self.shutdown_called = False
        self.force_flush_called = False

    def export(self, spans: Sequence[ReadableSpan]) -> SpanExportResult:
        self.spans.extend(spans)
        return SpanExportResult.SUCCESS

    def shutdown(self) -> None:
        self.shutdown_called = True

    def force_flush(self, timeout_millis: int = 30000) -> bool:
        self.force_flush_called = True
        return True


class _OTLPCaptureHandler(BaseHTTPRequestHandler):
    """Capture one local OTLP/HTTP request without external test services."""

    requests: list[dict[str, Any]] = []

    def do_POST(self) -> None:  # pylint: disable=invalid-name
        """Record the request and return the empty OTLP success response."""

        content_length = int(self.headers.get("Content-Length", "0"))
        self.__class__.requests.append(
            {
                "path": self.path,
                "headers": {key.lower(): value for key, value in self.headers.items()},
                "body": self.rfile.read(content_length),
            }
        )
        self.send_response(200)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def log_message(  # pylint: disable=redefined-builtin
        self, format: str, *args: Any
    ) -> None:
        """Keep the deterministic local transport test quiet."""

        del format, args


def _span_attributes(span: ReadableSpan) -> Mapping[str, Any]:
    assert span.attributes is not None
    return cast(Mapping[str, Any], span.attributes)


def _enable_langfuse(monkeypatch: pytest.MonkeyPatch, *, capture: bool = False) -> None:
    monkeypatch.setenv("LANGFUSE_ENABLED", "true")
    monkeypatch.setenv("LANGFUSE_PUBLIC_KEY", "pk-test")
    monkeypatch.setenv("LANGFUSE_SECRET_KEY", "sk-test")
    monkeypatch.setenv("ASTRON_TRACE_CONTEXT_SECRET", "astron-trace-test-secret")
    monkeypatch.setenv("LANGFUSE_HOST", "https://langfuse.example.test/")
    monkeypatch.setenv("LANGFUSE_CAPTURE_INPUT_OUTPUT", "true" if capture else "false")
    monkeypatch.setenv("LANGFUSE_MAX_ATTRIBUTE_LENGTH", "8192")
    monkeypatch.setenv("LANGFUSE_ENVIRONMENT", "default")


def test_config_defaults_and_endpoint_normalization() -> None:
    config = LangfuseConfig.from_env({})

    assert config.enabled is False
    assert config.is_effectively_enabled is False
    assert config.trace_context_secret == ""
    assert config.capture_input_output is False
    assert config.max_attribute_length == 8192
    assert config.environment == "default"
    assert config.has_valid_environment is True
    assert config.host == "https://cloud.langfuse.com"
    assert config.endpoint == "https://cloud.langfuse.com/api/public/otel/v1/traces"

    explicit_endpoint = LangfuseConfig.from_env(
        {
            "LANGFUSE_ENABLED": "yes",
            "LANGFUSE_HOST": "http://localhost:3000/api/public/otel/v1/traces/",
            "LANGFUSE_MAX_ATTRIBUTE_LENGTH": "256",
        }
    )
    assert explicit_endpoint.enabled is True
    assert explicit_endpoint.max_attribute_length == 256
    assert (
        explicit_endpoint.endpoint == "http://localhost:3000/api/public/otel/v1/traces"
    )

    invalid_environment = LangfuseConfig.from_env(
        {"LANGFUSE_ENVIRONMENT": "Production EU"}
    )
    assert invalid_environment.has_valid_environment is False


@pytest.mark.parametrize(
    ("environment", "is_valid"),
    [
        ("a", True),
        ("a" * 40, True),
        ("a" * 41, False),
        ("langfuse-production", False),
        ("prod.eu", False),
        ("主站", False),
    ],
)
def test_environment_validation_matches_langfuse_contract(
    environment: str, is_valid: bool
) -> None:
    config = LangfuseConfig.from_env({"LANGFUSE_ENVIRONMENT": environment})

    assert config.has_valid_environment is is_valid


def test_unsigned_public_trace_context_is_rejected(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _enable_langfuse(monkeypatch)
    carrier = _trusted_trace_carrier(
        {
            "x-consumer-username": "synthetic-app",
            "traceparent": "00-00000000000000000000000000000001-0000000000000001-01",
            "tracestate": "vendor=synthetic-sensitive,other=value",
            "baggage": (
                "tenant=safe,langfuse.user.id=spoofed,"
                "langfuse%2Etrace%2Epublic=true,"
                "%20langfuse.user.id=spoofed,"
                "+langfuse.trace.name=spoofed,"
                "%09langfuse.session.id=spoofed"
            ),
        },
        method="POST",
        path="/workflow/v1/chat/completions",
    )

    assert carrier == {}


def test_signed_internal_trace_context_round_trips_and_detects_tampering(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _enable_langfuse(monkeypatch)
    provider = TracerProvider()
    tracer = provider.get_tracer("trusted-trace-carrier-test")
    attributes = langfuse_trace_attributes(
        "workflow:flow", session_id="session", tags=["workflow", "root"]
    )
    try:
        with langfuse_trace_context(attributes), tracer.start_as_current_span("parent"):
            signed = inject_trusted_langfuse_context(
                method="POST",
                audience=WORKFLOW_TRACE_AUDIENCE,
                tenant_id="synthetic-app",
            )

        binding = {
            "method": "POST",
            "audience": WORKFLOW_TRACE_AUDIENCE,
            "tenant_id": "synthetic-app",
        }
        verified = extract_trusted_langfuse_context(signed, **binding)
        assert verified["traceparent"] == signed["traceparent"]
        assert "langfuse.trace.name=workflow%3Aflow" in verified["baggage"]
        request_headers = {"X-Consumer-Username": "synthetic-app", **signed}
        assert (
            _trusted_trace_carrier(
                request_headers,
                method="POST",
                path="/workflow/v1/chat/completions",
            )
            == verified
        )
        assert (
            _trusted_trace_carrier(
                request_headers,
                method="POST",
                path="/workflow/v1/debug/chat/completions",
            )
            == {}
        )

        tampered = dict(signed)
        tampered["traceparent"] = (
            "00-00000000000000000000000000000001-0000000000000001-01"
        )
        assert extract_trusted_langfuse_context(tampered, **binding) == {}
        assert (
            extract_trusted_langfuse_context(signed, **{**binding, "method": "GET"})
            == {}
        )
        assert (
            extract_trusted_langfuse_context(
                signed, **{**binding, "audience": "astron-workflow:/other"}
            )
            == {}
        )
        assert (
            extract_trusted_langfuse_context(
                signed, **{**binding, "tenant_id": "another-app"}
            )
            == {}
        )

        recorded = redact_trusted_trace_headers(
            {"Content-Type": "application/json", **signed}
        )
        assert recorded == {"Content-Type": "application/json"}

        issued_at = int(signed["x-astron-langfuse-trace-timestamp"])
        monkeypatch.setattr(
            langfuse_bridge.time,
            "time",
            lambda: issued_at + 61,
        )
        assert extract_trusted_langfuse_context(signed, **binding) == {}
    finally:
        provider.shutdown()


def test_disabled_helpers_do_not_change_span_or_baggage_shape(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("LANGFUSE_ENABLED", "false")
    monkeypatch.setenv("LANGFUSE_CAPTURE_INPUT_OUTPUT", "true")
    exporter = InMemorySpanExporter()
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    tracer = provider.get_tracer("disabled-langfuse-test")

    assert langfuse_observation_attributes("generation", model="model") == {}
    assert langfuse_trace_attributes("trace", session_id="session") == {}
    assert (
        inject_trusted_langfuse_context(
            method="POST",
            audience=WORKFLOW_TRACE_AUDIENCE,
            tenant_id="synthetic-app",
        )
        == {}
    )
    with langfuse_trace_context({"langfuse.trace.name": "must-not-appear"}):
        assert "langfuse.trace.name" not in baggage.get_all()
        with tracer.start_as_current_span("existing", attributes={"existing": "value"}):
            pass

    finished = exporter.get_finished_spans()
    assert len(finished) == 1
    assert finished[0].name == "existing"
    assert dict(finished[0].attributes or {}) == {"existing": "value"}
    provider.shutdown()


@pytest.mark.asyncio
async def test_middleware_context_reaches_background_workflow_observation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Mirror the production middleware -> route -> background task hierarchy."""

    _enable_langfuse(monkeypatch, capture=True)
    exporter = InMemorySpanExporter()
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exporter))

    def traced_span() -> WorkflowSpan:
        span = WorkflowSpan(app_id="app", uid="user", chat_id="session")
        span.tracer = provider.get_tracer("workflow-http-hierarchy-test")
        return span

    monkeypatch.setattr(otlp_middleware, "Span", traced_span)
    app = FastAPI()
    app.add_middleware(otlp_middleware.OtlpMiddleware)

    async def run_workflow() -> None:
        trace_attributes = langfuse_trace_attributes(
            "workflow:flow", user_id="user", session_id="session"
        )
        observation_attributes = langfuse_observation_attributes(
            "chain",
            input_value={"question": "synthetic"},
            output_value={"answer": "synthetic"},
        )
        observation_attributes.update(trace_attributes)
        with langfuse_trace_context(trace_attributes), traced_span().start(
            "workflow.run", attributes=observation_attributes
        ):
            pass

    @app.get("/workflow/v1/debug/chat/completions")
    async def workflow_route() -> dict[str, bool]:
        with traced_span().start("chat_debug"):
            task = asyncio.create_task(run_workflow())
        await task
        return {"ok": True}

    try:
        transport = httpx.ASGITransport(app=cast(Any, app))
        async with httpx.AsyncClient(
            transport=transport, base_url="http://test"
        ) as client:
            response = await client.get("/workflow/v1/debug/chat/completions")
        assert response.status_code == 200

        spans = {item.name: item for item in exporter.get_finished_spans()}
        request_span = spans["/workflow/v1/debug/chat/completions"]
        route_span = spans["chat_debug"]
        workflow_span = spans["workflow.run"]
        assert request_span.parent is None
        assert route_span.parent is not None
        assert route_span.parent.span_id == request_span.context.span_id
        assert workflow_span.parent is not None
        assert workflow_span.parent.span_id == route_span.context.span_id
        assert workflow_span.context.trace_id == request_span.context.trace_id
        assert "langfuse.observation.input" not in _span_attributes(request_span)
        workflow_attributes = _span_attributes(workflow_span)
        assert workflow_attributes["langfuse.observation.type"] == "chain"
        assert json.loads(workflow_attributes["langfuse.observation.input"]) == {
            "question": "synthetic"
        }
        assert json.loads(workflow_attributes["langfuse.observation.output"]) == {
            "answer": "synthetic"
        }
    finally:
        provider.shutdown()


@pytest.mark.parametrize(
    "invalid_config",
    ["missing_credentials", "invalid_host", "invalid_environment"],
)
def test_invalid_configuration_is_effectively_disabled_and_inert(
    invalid_config: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _enable_langfuse(monkeypatch)
    if invalid_config == "missing_credentials":
        monkeypatch.delenv("LANGFUSE_PUBLIC_KEY", raising=False)
        monkeypatch.delenv("LANGFUSE_SECRET_KEY", raising=False)
    elif invalid_config == "invalid_host":
        monkeypatch.setenv("LANGFUSE_HOST", "https://user:password@example.test")
    else:
        monkeypatch.setenv("LANGFUSE_ENVIRONMENT", "Production EU")

    provider = TracerProvider()
    try:
        assert langfuse_enabled() is False
        assert langfuse_observation_attributes("generation", model="model") == {}
        assert langfuse_trace_attributes("trace", session_id="session") == {}
        assert (
            inject_trusted_langfuse_context(
                method="POST",
                audience=WORKFLOW_TRACE_AUDIENCE,
                tenant_id="synthetic-app",
            )
            == {}
        )
        assert add_langfuse_span_processor(provider) is False
    finally:
        provider.shutdown()


def test_missing_internal_trace_secret_disables_only_trusted_handoff(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _enable_langfuse(monkeypatch)
    monkeypatch.delenv("ASTRON_TRACE_CONTEXT_SECRET", raising=False)

    assert langfuse_enabled() is True
    assert langfuse_observation_attributes("generation", model="model")
    assert (
        inject_trusted_langfuse_context(
            method="POST",
            audience=WORKFLOW_TRACE_AUDIENCE,
            tenant_id="synthetic-app",
        )
        == {}
    )


def test_missing_credentials_and_invalid_host_fail_closed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("LANGFUSE_ENABLED", "true")
    monkeypatch.delenv("LANGFUSE_PUBLIC_KEY", raising=False)
    monkeypatch.delenv("LANGFUSE_SECRET_KEY", raising=False)
    provider = TracerProvider()

    assert add_langfuse_span_processor(provider) is False

    monkeypatch.setenv("LANGFUSE_PUBLIC_KEY", "pk-test")
    monkeypatch.setenv("LANGFUSE_SECRET_KEY", "sk-test")
    monkeypatch.setenv("LANGFUSE_HOST", "https://user:password@example.test")
    assert add_langfuse_span_processor(provider) is False
    provider.shutdown()


def test_initialization_error_log_never_contains_credentials(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _enable_langfuse(monkeypatch)
    messages: list[str] = []
    sink_id = logger.add(messages.append, format="{message}")

    def failing_exporter(**kwargs: Any) -> NoReturn:
        raise RuntimeError("pk-test:sk-test")

    monkeypatch.setattr(langfuse_bridge, "OTLPHTTPSpanExporter", failing_exporter)
    provider = TracerProvider()
    try:
        assert add_langfuse_span_processor(provider) is False
    finally:
        logger.remove(sink_id)
        provider.shutdown()

    logged = "".join(messages)
    assert "pk-test" not in logged
    assert "sk-test" not in logged


def test_invalid_environment_fails_closed_without_logging_value(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _enable_langfuse(monkeypatch)
    invalid_environment = "Production-EU-sensitive-tenant"
    monkeypatch.setenv("LANGFUSE_ENVIRONMENT", invalid_environment)
    messages: list[str] = []
    sink_id = logger.add(messages.append, format="{message}")
    provider = TracerProvider()

    try:
        assert add_langfuse_span_processor(provider) is False
    finally:
        logger.remove(sink_id)
        provider.shutdown()

    logged = "".join(messages)
    assert "invalid environment" in logged
    assert invalid_environment not in logged


def test_exporter_uses_http_v4_auth_and_supports_flush_shutdown(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _enable_langfuse(monkeypatch)
    constructor: dict[str, Any] = {}
    delegate = RecordingExporter()

    def exporter_factory(**kwargs: Any) -> RecordingExporter:
        constructor.update(kwargs)
        return delegate

    monkeypatch.setattr(langfuse_bridge, "OTLPHTTPSpanExporter", exporter_factory)
    provider = TracerProvider(resource=Resource({"service.name": "agent"}))

    assert add_langfuse_span_processor(provider) is True
    assert add_langfuse_span_processor(provider) is True
    assert (
        constructor["endpoint"]
        == "https://langfuse.example.test/api/public/otel/v1/traces"
    )
    expected_auth = base64.b64encode(b"pk-test:sk-test").decode("ascii")
    assert constructor["headers"] == {
        "Authorization": f"Basic {expected_auth}",
        "x-langfuse-ingestion-version": "4",
    }

    with provider.get_tracer("test").start_as_current_span("root") as span:
        span.set_attribute("langfuse.observation.type", "span")

    assert provider.force_flush(timeout_millis=5000) is True
    assert [span.name for span in delegate.spans] == ["root"]
    provider.shutdown()
    assert delegate.shutdown_called is True


def test_actual_otlp_http_export_uses_signal_path_auth_and_sanitized_body(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Exercise the real exporter against a loopback OTLP/HTTP receiver."""

    _OTLPCaptureHandler.requests.clear()
    server = ThreadingHTTPServer(("127.0.0.1", 0), _OTLPCaptureHandler)
    server_thread = Thread(target=server.serve_forever, daemon=True)
    server_thread.start()

    _enable_langfuse(monkeypatch)
    monkeypatch.setenv("LANGFUSE_HOST", f"http://127.0.0.1:{server.server_port}")
    monkeypatch.setenv("NO_PROXY", "127.0.0.1,localhost")
    monkeypatch.setenv("no_proxy", "127.0.0.1,localhost")
    monkeypatch.setenv("OTEL_EXPORTER_OTLP_TIMEOUT", "5")
    monkeypatch.setenv("OTEL_EXPORTER_OTLP_TRACES_TIMEOUT", "5")
    monkeypatch.delenv("OTEL_EXPORTER_OTLP_COMPRESSION", raising=False)
    monkeypatch.delenv("OTEL_EXPORTER_OTLP_TRACES_COMPRESSION", raising=False)
    provider = TracerProvider(resource=Resource({"service.name": "workflow"}))
    trace_id_hex = "0123456789abcdef0123456789abcdef"
    parent_span_id_hex = "0123456789abcdef"
    parent_context = TraceContextTextMapPropagator().extract(
        carrier={
            "traceparent": f"00-{trace_id_hex}-{parent_span_id_hex}-01",
            "tracestate": "vendor=synthetic-sensitive,other=value",
        }
    )

    try:
        assert add_langfuse_span_processor(provider) is True
        with provider.get_tracer("wire-test").start_as_current_span(
            "llm.generate", context=parent_context
        ) as span:
            local_context = span.get_span_context()
            assert local_context.trace_state.get("vendor") == "synthetic-sensitive"
            span.set_attributes(
                {
                    "authorization": "Bearer must-not-leak",
                    "gen_ai.request.model": "wire-model",
                    "langfuse.observation.type": "generation",
                }
            )
        assert provider.force_flush(timeout_millis=5000) is True
    finally:
        provider.shutdown()
        server.shutdown()
        server.server_close()
        server_thread.join(timeout=5)

    assert len(_OTLPCaptureHandler.requests) == 1
    request = _OTLPCaptureHandler.requests[0]
    assert request["path"] == "/api/public/otel/v1/traces"
    expected_auth = base64.b64encode(b"pk-test:sk-test").decode("ascii")
    assert request["headers"]["authorization"] == f"Basic {expected_auth}"
    assert request["headers"]["x-langfuse-ingestion-version"] == "4"
    assert request["headers"]["content-type"] == "application/x-protobuf"
    assert request["body"]
    otlp_request = ExportTraceServiceRequest()
    otlp_request.ParseFromString(request["body"])
    wire_spans = [
        span
        for resource_spans in otlp_request.resource_spans
        for scope_spans in resource_spans.scope_spans
        for span in scope_spans.spans
    ]
    assert len(wire_spans) == 1
    wire_span = wire_spans[0]
    wire_attributes = {item.key: item.value for item in wire_span.attributes}
    assert wire_span.trace_state == ""
    assert wire_span.trace_id == bytes.fromhex(trace_id_hex)
    assert wire_span.parent_span_id == bytes.fromhex(parent_span_id_hex)
    assert wire_span.span_id == local_context.span_id.to_bytes(8, "big")
    assert wire_attributes["gen_ai.request.model"].string_value == "wire-model"
    assert "authorization" not in wire_attributes
    assert b"synthetic-sensitive" not in request["body"]
    assert b"must-not-leak" not in request["body"]


def test_sanitized_export_clears_tracestate_without_mutating_raw_export() -> None:
    raw_delegate = RecordingExporter()
    sanitized_delegate = RecordingExporter()
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(raw_delegate))
    provider.add_span_processor(
        SimpleSpanProcessor(
            SanitizingSpanExporter(sanitized_delegate, LangfuseConfig.from_env({}))
        )
    )
    parent_context = TraceContextTextMapPropagator().extract(
        carrier={
            "traceparent": ("00-0123456789abcdef0123456789abcdef-0123456789abcdef-01"),
            "tracestate": "vendor=synthetic-sensitive,other=value",
        }
    )

    try:
        with provider.get_tracer("tracestate-test").start_as_current_span(
            "llm.generate", context=parent_context
        ):
            pass
    finally:
        provider.shutdown()

    assert len(raw_delegate.spans) == 1
    assert len(sanitized_delegate.spans) == 1
    raw_span = raw_delegate.spans[0]
    sanitized_span = sanitized_delegate.spans[0]
    assert raw_span.context is not None
    assert raw_span.parent is not None
    assert sanitized_span.context is not None
    assert sanitized_span.parent is not None
    expected_tracestate = [
        ("vendor", "synthetic-sensitive"),
        ("other", "value"),
    ]
    assert list(raw_span.context.trace_state.items()) == expected_tracestate
    assert list(raw_span.parent.trace_state.items()) == expected_tracestate
    assert list(sanitized_span.context.trace_state.items()) == []
    assert list(sanitized_span.parent.trace_state.items()) == []
    for field in ("trace_id", "span_id", "trace_flags", "is_remote"):
        assert getattr(sanitized_span.context, field) == getattr(
            raw_span.context, field
        )
        assert getattr(sanitized_span.parent, field) == getattr(raw_span.parent, field)


def test_sanitizing_exporter_drops_events_links_and_unapproved_content(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _enable_langfuse(monkeypatch)
    delegate = RecordingExporter()
    config = LangfuseConfig.from_env()
    provider = TracerProvider(
        resource=Resource(
            {
                "service.name": "workflow",
                "ip": "192.0.2.10",
                "deployment.environment": "test",
            }
        )
    )
    provider.add_span_processor(
        SimpleSpanProcessor(SanitizingSpanExporter(delegate, config))
    )

    with provider.get_tracer("test").start_as_current_span("llm.generate") as span:
        span.set_attributes(
            {
                "authorization": "Bearer must-not-leak",
                "config": "contains-secret",
                "gen_ai.prompt": "private prompt",
                "gen_ai.request.model": "model-a",
                "gen_ai.usage.input_tokens": 11,
                "langfuse.observation.input": "private input",
                "langfuse.observation.type": "generation",
            }
        )
        span.add_event("request", {"headers": "secret", "body": "private prompt"})

    exported = delegate.spans[0]
    assert exported.events == ()
    assert exported.links == ()
    assert exported.attributes == {
        "gen_ai.request.model": "model-a",
        "gen_ai.usage.input_tokens": 11,
        "langfuse.observation.type": "generation",
    }
    assert exported.resource.attributes == {
        "service.name": "workflow",
        "deployment.environment": "test",
    }
    provider.shutdown()


def test_capture_allows_only_explicit_sanitized_observation_content(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _enable_langfuse(monkeypatch, capture=True)
    monkeypatch.setenv("LANGFUSE_MAX_ATTRIBUTE_LENGTH", "512")
    delegate = RecordingExporter()
    provider = TracerProvider()
    provider.add_span_processor(
        SimpleSpanProcessor(SanitizingSpanExporter(delegate, LangfuseConfig.from_env()))
    )

    with provider.get_tracer("test").start_as_current_span("tool.call") as span:
        span.set_attributes(
            {
                "astron.workflow.input": "not an explicit content attribute",
                "gen_ai.completion": "not explicitly allowed",
                "langfuse.observation.input": json.dumps(
                    {
                        "question": "safe",
                        "api_key": "must-not-leak",
                        "token": "must-not-leak-token",
                        "accessToken": "must-not-leak-access-token",
                        "refreshToken": "must-not-leak-refresh-token",
                        "clientSecret": "must-not-leak-client-secret",
                        "privateKey": "must-not-leak-private-key",
                    }
                ),
                "langfuse.observation.output": json.dumps({"answer": "ok"}),
                "langfuse.trace.input": "legacy content is never exported",
            }
        )

    exported = delegate.spans[0]
    attributes = _span_attributes(exported)
    assert "astron.workflow.input" not in attributes
    assert "gen_ai.completion" not in attributes
    assert "langfuse.trace.input" not in attributes
    assert "must-not-leak" not in attributes["langfuse.observation.input"]
    assert json.loads(attributes["langfuse.observation.input"]) == {"question": "safe"}
    provider.shutdown()


def test_attribute_helpers_are_opt_in_truncated_and_remove_sensitive_metadata(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _enable_langfuse(monkeypatch)
    attributes = langfuse_observation_attributes(
        "generation",
        input_value={"question": "private"},
        output_value="private answer",
        model="model-a",
        model_parameters={"temperature": 0.2, "api_key": "hidden"},
        usage_details={"input": 2, "output": 3},
        metadata={"provider": "test", "access_token": "hidden"},
    )

    assert "langfuse.observation.input" not in attributes
    assert "langfuse.observation.output" not in attributes
    assert attributes["langfuse.observation.type"] == "generation"
    assert attributes["langfuse.observation.model.name"] == "model-a"
    assert attributes["gen_ai.request.model"] == "model-a"
    assert "api_key" not in attributes["langfuse.observation.model.parameters"]
    assert json.loads(attributes["langfuse.observation.usage_details"]) == {
        "input": 2,
        "output": 3,
        "total": 5,
    }
    assert attributes["gen_ai.usage.input_tokens"] == 2
    assert attributes["gen_ai.usage.output_tokens"] == 3
    assert attributes["gen_ai.usage.total_tokens"] == 5
    assert "langfuse.observation.metadata.access_token" not in attributes

    monkeypatch.setenv("LANGFUSE_CAPTURE_INPUT_OUTPUT", "true")
    monkeypatch.setenv("LANGFUSE_MAX_ATTRIBUTE_LENGTH", "32")
    captured = langfuse_observation_attributes(
        "unknown-type",
        input_value={"question": "x" * 100},
        output_value="y" * 100,
    )
    assert captured["langfuse.observation.type"] == "span"
    assert len(captured["langfuse.observation.input"]) <= 32
    assert len(captured["langfuse.observation.output"]) <= 32
    assert json.loads(captured["langfuse.observation.input"]) == {"truncated": True}


@pytest.mark.parametrize("max_length", [1, 2, 4, 11, 18])
def test_truncated_structured_values_remain_valid_json(max_length: int) -> None:
    serialized = serialize_langfuse_value(
        {"question": "x" * 100}, max_length=max_length
    )

    assert serialized is not None
    assert len(serialized) <= max_length
    json.loads(serialized)


def test_non_finite_numbers_are_standard_json_nulls() -> None:
    serialized = serialize_langfuse_value(
        {"nan": float("nan"), "negative": float("-inf"), "positive": float("inf")}
    )

    assert serialized is not None

    def reject_non_finite(value: str) -> NoReturn:
        raise AssertionError(f"non-standard JSON constant: {value}")

    assert json.loads(serialized, parse_constant=reject_non_finite) == {
        "nan": None,
        "negative": None,
        "positive": None,
    }


@pytest.mark.parametrize(
    "header_name",
    ["x-api-key", "X-Api-Key", "x-goog-api-key", "X_Custom_Api_Key"],
)
def test_capture_sanitizer_removes_prefixed_api_key_headers(
    header_name: str,
) -> None:
    serialized = serialize_langfuse_value(
        {"headers": {header_name: "SENTINEL-CREDENTIAL", "accept": "text/event-stream"}}
    )

    assert serialized is not None
    assert "SENTINEL-CREDENTIAL" not in serialized
    assert json.loads(serialized) == {"headers": {"accept": "text/event-stream"}}


def test_trace_helper_replaces_untrusted_langfuse_baggage(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _enable_langfuse(monkeypatch)
    monkeypatch.setenv("LANGFUSE_ENVIRONMENT", "staging")
    monkeypatch.setenv("LANGFUSE_RELEASE", "v1.2.3")
    attributes = langfuse_trace_attributes(
        "local-agent",
        user_id="user-1",
        session_id="session-1",
        metadata={"flow_id": "flow-1", "password": "hidden"},
        tags=["agent", "test"],
    )
    assert attributes["langfuse.environment"] == "staging"
    assert attributes["langfuse.release"] == "v1.2.3"
    assert "langfuse.trace.metadata.password" not in attributes

    delegate = RecordingExporter()
    provider = TracerProvider()
    provider.add_span_processor(LangfuseBaggageSpanProcessor(8192))
    provider.add_span_processor(SimpleSpanProcessor(delegate))
    upstream_context = baggage.set_baggage("langfuse.trace.name", "upstream-workflow")

    with langfuse_trace_context(attributes, parent_context=upstream_context):
        with provider.get_tracer("test").start_as_current_span("agent"):
            pass

    exported = delegate.spans[0]
    exported_attributes = _span_attributes(exported)
    assert exported_attributes["langfuse.trace.name"] == "local-agent"
    assert exported_attributes["langfuse.user.id"] == "user-1"
    assert exported_attributes["langfuse.session.id"] == "session-1"
    assert exported_attributes["langfuse.trace.tags"] == ("agent", "test")
    provider.shutdown()


def test_baggage_preserves_string_identity_types(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _enable_langfuse(monkeypatch)
    delegate = RecordingExporter()
    provider = TracerProvider()
    provider.add_span_processor(LangfuseBaggageSpanProcessor(8192))
    provider.add_span_processor(SimpleSpanProcessor(delegate))
    attributes = langfuse_trace_attributes(
        "123",
        user_id="true",
        session_id='{"tenant":"synthetic"}',
        tags=["42"],
    )

    with langfuse_trace_context(attributes):
        with provider.get_tracer("test").start_as_current_span("agent"):
            pass

    exported = delegate.spans[0]
    exported_attributes = _span_attributes(exported)
    assert exported_attributes["langfuse.trace.name"] == "123"
    assert exported_attributes["langfuse.user.id"] == "true"
    assert exported_attributes["langfuse.session.id"] == '{"tenant":"synthetic"}'
    assert exported_attributes["langfuse.trace.tags"] == ("42",)
    provider.shutdown()


def test_usage_aliases_and_extended_observation_types_are_preserved(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _enable_langfuse(monkeypatch)
    usage = langfuse_observation_attributes(
        "generation",
        usage_details={
            "prompt_tokens": 4,
            "completion_tokens": 6,
            "total_tokens": 10,
        },
    )
    assert json.loads(usage["langfuse.observation.usage_details"]) == {
        "input": 4,
        "output": 6,
        "total": 10,
    }

    # Raw OTLP documentation historically listed span/generation/event only.
    # Langfuse v4 SDK-compatible extended values are forwarded unchanged, and
    # the sanitizer never filters an entire span based on its observation type.
    for observation_type in ("agent", "tool", "retriever"):
        attributes = langfuse_observation_attributes(observation_type)
        assert attributes["langfuse.observation.type"] == observation_type


def test_sanitizing_exporter_delegates_force_flush_and_shutdown(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _enable_langfuse(monkeypatch)
    delegate = RecordingExporter()
    exporter = SanitizingSpanExporter(delegate, LangfuseConfig.from_env())

    assert exporter.force_flush(timeout_millis=1234) is True
    exporter.shutdown()
    assert delegate.force_flush_called is True
    assert delegate.shutdown_called is True


def test_common_trace_initialization_adds_langfuse_processor(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, Any] = {}

    def add_processor(provider: TracerProvider) -> bool:
        captured["provider"] = provider
        return True

    monkeypatch.setenv("OTLP_ENABLE", "false")
    monkeypatch.setattr(common_trace, "add_langfuse_span_processor", add_processor)
    monkeypatch.setattr(common_trace.trace, "set_tracer_provider", lambda _: None)

    common_trace.init_trace(
        endpoint="127.0.0.1:4317",
        service_name="agent-test",
        schedule_delay_millis=10,
    )

    assert "provider" in captured
    captured["provider"].shutdown()


def test_workflow_trace_initialization_adds_langfuse_processor(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from workflow.extensions.otlp.trace import trace as workflow_trace

    captured: dict[str, Any] = {}

    def add_processor(provider: TracerProvider) -> bool:
        captured["provider"] = provider
        return True

    monkeypatch.setenv("OTLP_ENABLE", "0")
    monkeypatch.setattr(workflow_trace, "add_langfuse_span_processor", add_processor)
    monkeypatch.setattr(workflow_trace.trace, "set_tracer_provider", lambda _: None)

    workflow_trace.init_trace(
        endpoint="127.0.0.1:4317",
        service_name="workflow-test",
        schedule_delay_millis=10,
    )

    assert "provider" in captured
    captured["provider"].shutdown()
