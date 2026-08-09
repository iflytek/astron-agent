"""Unit tests for the Langfuse OpenTelemetry bridge.

The exporter module is intentionally dependency-light so these tests run
without a live Langfuse instance: they verify env gating, the Basic auth
header, the OTLP endpoint, and that a real OTel span is exported over HTTP to
``{host}/api/public/otel`` with the required headers.
"""

import base64
import os
from typing import Optional

import pytest
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor

from workflow.extensions.otlp.trace.langfuse_exporter import (
    _auth_header,
    _headers,
    build_langfuse_exporter,
    init_langfuse_processor,
    langfuse_enabled,
)


@pytest.fixture(autouse=True)
def _clean_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for key in (
        "LANGFUSE_ENABLED",
        "LANGFUSE_PUBLIC_KEY",
        "LANGFUSE_SECRET_KEY",
        "LANGFUSE_HOST",
    ):
        monkeypatch.delenv(key, raising=False)


def test_disabled_by_default(monkeypatch: pytest.MonkeyPatch) -> None:
    assert langfuse_enabled() is False
    assert init_langfuse_processor() is None


@pytest.mark.parametrize("value", ["1", "true", "TRUE", "yes", "on"])
def test_enabled_values(monkeypatch: pytest.MonkeyPatch, value: str) -> None:
    monkeypatch.setenv("LANGFUSE_ENABLED", value)
    assert langfuse_enabled() is True


def test_auth_header_encodes_public_and_secret_key() -> None:
    expected = "Basic " + base64.b64encode(b"pk-lf-1:sk-lf-2").decode("ascii")
    assert _auth_header("pk-lf-1", "sk-lf-2") == expected


def test_headers_include_auth_and_ingestion_version() -> None:
    headers = _headers("pk-lf-1", "sk-lf-2")
    assert headers["Authorization"].startswith("Basic ")
    assert headers["x-langfuse-ingestion-version"] == "4"


def test_headers_work_without_credentials() -> None:
    headers = _headers("", "")
    assert "Authorization" not in headers
    assert headers["x-langfuse-ingestion-version"] == "4"


def test_exporter_endpoint_uses_langfuse_otel_path() -> None:
    exporter = build_langfuse_exporter(
        host="http://localhost:3000", public_key="pk", secret_key="sk"
    )
    assert exporter._endpoint == "http://localhost:3000/api/public/otel"  # type: ignore[attr-defined]


def test_init_returns_processor_when_enabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LANGFUSE_ENABLED", "1")
    processor = init_langfuse_processor()
    assert processor is not None
    processor.shutdown()


def test_span_exported_to_langfuse_endpoint_with_headers(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """End-to-end: a real OTel span is POSTed to Langfuse's OTLP endpoint.

    ``pytest-httpserver`` must be installed for this test; it is skipped when
    unavailable so the rest of the suite still runs.
    """
    httpserver_module = pytest.importorskip("pytest_httpserver")
    server = httpserver_module.HTTPServer(host="127.0.0.1", port=0)
    server.expect_request("/api/public/otel").respond_with_data("{}")
    server.start()

    monkeypatch.setenv("LANGFUSE_ENABLED", "1")
    exporter = build_langfuse_exporter(
        host=f"http://127.0.0.1:{server.port}",
        public_key="pk-lf-test",
        secret_key="sk-lf-test",
    )
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    trace.set_tracer_provider(provider)
    with trace.get_tracer("test").start_as_current_span("workflow-run") as span:
        span.set_attribute("gen_ai.request.model", "gpt-4o")

    requests = list(server.log) if hasattr(server, "log") else []
    assert len(requests) == 1
    request = requests[0][0]
    assert request.path == "/api/public/otel"
    assert request.headers["Authorization"] == _auth_header("pk-lf-test", "sk-lf-test")
    assert request.headers["x-langfuse-ingestion-version"] == "4"
    server.stop()
