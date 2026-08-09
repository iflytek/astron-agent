"""
Langfuse OpenTelemetry bridge for Astron Agent.

Astron Agent already emits OpenTelemetry spans for every workflow run, node,
and LLM call (see ``workflow.extensions.otlp.trace``). This module forwards
those spans to Langfuse's OpenTelemetry ingestion endpoint so traces, latency,
and (where the underlying instrumentation records them) token usage appear in
Langfuse without re-instrumenting every provider.

The bridge is strictly opt-in and off by default. Enable it with:

    LANGFUSE_ENABLED=1
    LANGFUSE_PUBLIC_KEY=pk-lf-...
    LANGFUSE_SECRET_KEY=sk-lf-...
    LANGFUSE_HOST=https://cloud.langfuse.com   # or http://localhost:3000 (self-hosted >= v3.22.0)

Transport follows Langfuse's documented OTLP contract:
- endpoint ``{LANGFUSE_HOST}/api/public/otel``
- Basic auth header built from ``public_key:secret_key``
- ``x-langfuse-ingestion-version: 4`` for real-time ingestion

Langfuse accepts OTLP over HTTP (JSON or protobuf); gRPC is not supported, so
this module intentionally uses the OTLP HTTP exporter rather than the gRPC
exporter used for the main OTLP backend.
"""

from __future__ import annotations

import base64
import os
from typing import Optional

from loguru import logger
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace.export import BatchSpanProcessor, SpanExporter

#: Header that makes directly-ingested OTel data appear in real time on the
#: Langfuse v4 data model (without it, ingestion can be delayed up to 10 min).
_LANGFUSE_INGESTION_VERSION = "4"

_ENABLED_VALUES = {"1", "true", "yes", "on"}


def langfuse_enabled() -> bool:
    """Return True when ``LANGFUSE_ENABLED`` is a truthy value."""
    return os.getenv("LANGFUSE_ENABLED", "0").strip().lower() in _ENABLED_VALUES


def _auth_header(public_key: str, secret_key: str) -> str:
    """Build the Basic auth value for Langfuse ingestion."""
    token = base64.b64encode(f"{public_key}:{secret_key}".encode("utf-8")).decode("ascii")
    return f"Basic {token}"


def _headers(public_key: str, secret_key: str) -> dict[str, str]:
    headers = {"x-langfuse-ingestion-version": _LANGFUSE_INGESTION_VERSION}
    if public_key and secret_key:
        headers["Authorization"] = _auth_header(public_key, secret_key)
    return headers


def build_langfuse_exporter(
    host: Optional[str] = None,
    public_key: Optional[str] = None,
    secret_key: Optional[str] = None,
    timeout: int = 5000,
) -> SpanExporter:
    """Build an OTLP HTTP span exporter pointed at Langfuse.

    Falls back to environment variables for any unset argument. Credentials
    come from ``LANGFUSE_HOST`` / ``LANGFUSE_PUBLIC_KEY`` / ``LANGFUSE_SECRET_KEY``.
    """
    host = (host or os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com")).rstrip("/")
    public_key = public_key if public_key is not None else os.getenv("LANGFUSE_PUBLIC_KEY", "")
    secret_key = secret_key if secret_key is not None else os.getenv("LANGFUSE_SECRET_KEY", "")
    endpoint = f"{host}/api/public/otel"
    return OTLPSpanExporter(
        endpoint=endpoint,
        headers=_headers(public_key, secret_key),
        timeout=timeout,
    )


def init_langfuse_processor(exporter: Optional[SpanExporter] = None) -> Optional[BatchSpanProcessor]:
    """Create a span processor forwarding spans to Langfuse.

    Returns ``None`` when the integration is disabled, so callers can attach it
    conditionally without importing optional dependencies eagerly.

    :param exporter: Optional pre-built exporter (mainly for tests); defaults to
        :func:`build_langfuse_exporter` using environment configuration.
    """
    if not langfuse_enabled():
        return None
    exporter = exporter or build_langfuse_exporter()
    logger.info("Langfuse OpenTelemetry bridge enabled -> exporting spans to Langfuse")
    return BatchSpanProcessor(exporter)
