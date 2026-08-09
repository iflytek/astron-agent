import base64

import pytest

from workflow.extensions.otlp.trace.trace import get_langfuse_export_config


def test_langfuse_config_is_disabled_by_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("LANGFUSE_ENABLED", raising=False)
    assert get_langfuse_export_config() is None


def test_langfuse_config_builds_otlp_http_export(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LANGFUSE_ENABLED", "true")
    monkeypatch.setenv("LANGFUSE_HOST", "https://langfuse.example/")
    monkeypatch.setenv("LANGFUSE_PUBLIC_KEY", "pk-test")
    monkeypatch.setenv("LANGFUSE_SECRET_KEY", "sk-test")

    endpoint, headers = get_langfuse_export_config() or (None, None)

    assert endpoint == "https://langfuse.example/api/public/otel/v1/traces"
    assert headers == {
        "Authorization": "Basic "
        + base64.b64encode(b"pk-test:sk-test").decode()
    }


def test_langfuse_config_requires_both_keys(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LANGFUSE_ENABLED", "true")
    monkeypatch.delenv("LANGFUSE_PUBLIC_KEY", raising=False)
    monkeypatch.delenv("LANGFUSE_SECRET_KEY", raising=False)

    with pytest.raises(ValueError, match="LANGFUSE_PUBLIC_KEY"):
        get_langfuse_export_config()
