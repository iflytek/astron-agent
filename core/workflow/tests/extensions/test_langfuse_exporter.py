import base64
from unittest.mock import MagicMock

import pytest

from workflow.extensions.otlp.trace.trace import (
    _build_langfuse_headers,
    _init_langfuse_exporter,
)


def test_build_langfuse_headers_encodes_basic_auth() -> None:
    headers = _build_langfuse_headers("pk-lf-abc", "sk-lf-xyz")
    expected = base64.b64encode(b"pk-lf-abc:sk-lf-xyz").decode()
    assert headers["Authorization"] == f"Basic {expected}"
    assert headers["x-langfuse-ingestion-version"] == "4"


def test_langfuse_exporter_disabled_by_default(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("LANGFUSE_OTEL_ENABLE", raising=False)
    provider = MagicMock()
    _init_langfuse_exporter(provider)
    provider.add_span_processor.assert_not_called()


def test_langfuse_exporter_skips_on_incomplete_config(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("LANGFUSE_OTEL_ENABLE", "1")
    monkeypatch.setenv("LANGFUSE_HOST", "http://localhost:3000")
    monkeypatch.delenv("LANGFUSE_PUBLIC_KEY", raising=False)
    monkeypatch.delenv("LANGFUSE_SECRET_KEY", raising=False)
    provider = MagicMock()
    _init_langfuse_exporter(provider)
    provider.add_span_processor.assert_not_called()


def test_langfuse_exporter_attached_when_fully_configured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("LANGFUSE_OTEL_ENABLE", "1")
    monkeypatch.setenv("LANGFUSE_HOST", "http://localhost:3000/")
    monkeypatch.setenv("LANGFUSE_PUBLIC_KEY", "pk-lf-abc")
    monkeypatch.setenv("LANGFUSE_SECRET_KEY", "sk-lf-xyz")
    provider = MagicMock()
    _init_langfuse_exporter(provider)
    provider.add_span_processor.assert_called_once()
