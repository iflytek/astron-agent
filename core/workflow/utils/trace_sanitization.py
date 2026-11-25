"""Helpers for recording structured payloads without leaking credentials."""

import re
from typing import Any

from common.otlp.trace.langfuse import serialize_langfuse_value

_PRIVATE_WORKFLOW_UPLOAD_URL = re.compile(
    r"https?://[^/\s<>\"']+/[^/\s<>\"']+/published-workflow-inputs/"
    r"[a-f0-9]{32}/input\.[a-z0-9]+\?[^\s<>\"'\)\]\}]+",
    re.IGNORECASE,
)


def redact_private_workflow_upload_urls(value: str) -> str:
    """Remove private market upload URLs from legacy telemetry text."""
    return _PRIVATE_WORKFLOW_UPLOAD_URL.sub("[REDACTED_PRESIGNED_URL]", value)


def serialize_trace_payload(payload: Any) -> str:
    """Recursively remove sensitive keys before serializing a trace attribute."""
    return serialize_langfuse_value(payload) or "{}"
