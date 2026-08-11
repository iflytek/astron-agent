"""Tests for the Langfuse observability integration.

Focus areas (acceptance-relevant):
- Graceful degradation: no Langfuse env vars -> tracing disabled, LLM path
  unchanged (wrap returns the original client, context manager is a no-op).
- Enabled but package missing -> still degrades without raising.
"""

import asyncio
from unittest.mock import MagicMock, patch

import pytest

from agent.infra.langfuse_tracing import (
    is_enabled,
    trace_provider_stream,
    wrap_openai_client,
)


@pytest.fixture(autouse=True)
def clean_env():
    """Ensure LANGFUSE_* env vars are absent during tests."""
    keys = [
        "LANGFUSE_ENABLED",
        "LANGFUSE_PUBLIC_KEY",
        "LANGFUSE_SECRET_KEY",
        "LANGFUSE_HOST",
    ]
    saved = {k: __import__("os").environ.get(k) for k in keys}
    for k in keys:
        __import__("os").environ.pop(k, None)
    # Reset module-level client state between tests.
    import agent.infra.langfuse_tracing as mod

    mod._client = None
    mod._client_attempted = False
    yield
    for k, v in saved.items():
        if v is None:
            __import__("os").environ.pop(k, None)
        else:
            __import__("os").environ[k] = v
    mod._client = None
    mod._client_attempted = False


def test_disabled_by_default():
    """LANGFUSE_ENABLED unset -> tracing disabled."""
    assert is_enabled() is False


def test_enabled_requires_credentials():
    """Enabled=true but missing credentials -> disabled + warning (no raise)."""
    import os

    os.environ["LANGFUSE_ENABLED"] = "true"
    assert is_enabled() is False


def test_enabled_with_credentials():
    """Enabled=true with credentials -> enabled."""
    import os

    os.environ["LANGFUSE_ENABLED"] = "true"
    os.environ["LANGFUSE_PUBLIC_KEY"] = "pk-test"
    os.environ["LANGFUSE_SECRET_KEY"] = "sk-test"
    assert is_enabled() is True


def test_wrap_returns_original_when_disabled():
    """Disabled -> wrap_openai_client returns the exact same client."""
    original = MagicMock()
    original.api_key = "k"
    original.base_url = "http://x"
    original.timeout = 300.0
    original.max_retries = 2
    assert wrap_openai_client(original) is original


def test_wrap_falls_back_when_package_missing():
    """Enabled but langfuse not installed -> returns original client."""
    import os

    os.environ["LANGFUSE_ENABLED"] = "true"
    os.environ["LANGFUSE_PUBLIC_KEY"] = "pk-test"
    os.environ["LANGFUSE_SECRET_KEY"] = "sk-test"

    original = MagicMock()
    original.api_key = "k"
    original.base_url = "http://x"
    original.timeout = 300.0
    original.max_retries = 2

    with patch(
        "agent.infra.langfuse_tracing.is_enabled", return_value=True
    ), patch(
        "agent.infra.langfuse_tracing.import_module",
        side_effect=fake_langfuse_import,
    ):
        result = wrap_openai_client(original)
    assert result is original


def test_wrap_returns_same_instance_when_enabled():
    """Enabled + package available -> import triggers global instrumentation,
    the client instance itself stays the original (Langfuse v4 patches the
    SDK at import time, not per-client)."""
    import os

    os.environ["LANGFUSE_ENABLED"] = "true"
    os.environ["LANGFUSE_PUBLIC_KEY"] = "pk-test"
    os.environ["LANGFUSE_SECRET_KEY"] = "sk-test"

    original = MagicMock()

    with patch(
        "agent.infra.langfuse_tracing.is_enabled", return_value=True
    ), patch(
        "agent.infra.langfuse_tracing.import_module",
        return_value=MagicMock(),  # simulate successful langfuse.openai import
    ) as mock_import:
        result = wrap_openai_client(original)
        mock_import.assert_called_once_with("langfuse.openai")
    assert result is original


def fake_langfuse_import(name, *args, **kwargs):
    """Import hook that raises ImportError for any langfuse module."""
    import importlib

    if name == "langfuse" or name.startswith("langfuse."):
        raise ImportError("No module named 'langfuse' (simulated)")
    return importlib.import_module(name)


def test_trace_provider_stream_noop_when_disabled():
    """Disabled -> context manager yields None and body still runs."""

    async def body():
        async with trace_provider_stream("m", "anthropic", []) as obs:
            assert obs is None
            return "ran"

    assert asyncio.run(body()) == "ran"


def test_trace_provider_stream_swallows_langfuse_errors():
    """Langfuse raising inside the context manager must not break the call."""

    async def body():
        with patch(
            "agent.infra.langfuse_tracing.is_enabled", return_value=True
        ), patch(
            "agent.infra.langfuse_tracing.get_client",
            return_value=MagicMock(
                start_observation=MagicMock(side_effect=RuntimeError("boom"))
            ),
        ):
            async with trace_provider_stream("m", "google", []) as obs:
                assert obs is None
                return "still-ran"

    assert asyncio.run(body()) == "still-ran"
