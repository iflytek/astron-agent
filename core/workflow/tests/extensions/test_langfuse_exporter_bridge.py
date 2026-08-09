import base64
import json
from typing import Any, Mapping, NoReturn, Sequence, cast

import pytest
from common.otlp.trace import langfuse as langfuse_bridge
from common.otlp.trace import trace as common_trace
from common.otlp.trace.langfuse import (
    LangfuseBaggageSpanProcessor,
    LangfuseConfig,
    SanitizingSpanExporter,
    add_langfuse_span_processor,
    langfuse_observation_attributes,
    langfuse_trace_attributes,
    langfuse_trace_context,
    serialize_langfuse_value,
)
from loguru import logger
from opentelemetry import baggage
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import ReadableSpan, TracerProvider
from opentelemetry.sdk.trace.export import (
    SimpleSpanProcessor,
    SpanExporter,
    SpanExportResult,
)

from workflow.extensions.fastapi.middleware.otlp import _safe_trace_carrier


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


def _span_attributes(span: ReadableSpan) -> Mapping[str, Any]:
    assert span.attributes is not None
    return cast(Mapping[str, Any], span.attributes)


def _enable_langfuse(monkeypatch: pytest.MonkeyPatch, *, capture: bool = False) -> None:
    monkeypatch.setenv("LANGFUSE_ENABLED", "true")
    monkeypatch.setenv("LANGFUSE_PUBLIC_KEY", "pk-test")
    monkeypatch.setenv("LANGFUSE_SECRET_KEY", "sk-test")
    monkeypatch.setenv("LANGFUSE_HOST", "https://langfuse.example.test/")
    monkeypatch.setenv("LANGFUSE_CAPTURE_INPUT_OUTPUT", "true" if capture else "false")


def test_config_defaults_and_endpoint_normalization() -> None:
    config = LangfuseConfig.from_env({})

    assert config.enabled is False
    assert config.capture_input_output is False
    assert config.max_attribute_length == 8192
    assert config.environment == "default"
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


def test_inbound_carrier_keeps_only_non_langfuse_baggage() -> None:
    carrier = _safe_trace_carrier(
        {
            "traceparent": "00-00000000000000000000000000000001-0000000000000001-01",
            "baggage": (
                "tenant=safe,langfuse.user.id=spoofed,"
                "langfuse%2Etrace%2Epublic=true,"
                "%20langfuse.user.id=spoofed,"
                "+langfuse.trace.name=spoofed,"
                "%09langfuse.session.id=spoofed"
            ),
        }
    )

    assert carrier["baggage"] == "tenant=safe"
    assert "traceparent" in carrier


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
