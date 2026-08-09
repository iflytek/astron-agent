from typing import Any

import pytest
from common.otlp.trace import trace as common_trace
from opentelemetry.sdk.trace import TracerProvider


def test_agent_trace_initialization_adds_langfuse_processor(
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
