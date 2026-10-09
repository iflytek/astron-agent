from typing import Any

import pytest

from workflow.api.v1.chat import open as open_api
from workflow.cache.event_registry import Event
from workflow.consts.engine.chat_status import ChatStatus
from workflow.domain.entities.chat import ResumeVo


class _SpanContext:
    sid = "span-1"

    def __enter__(self) -> "_SpanContext":
        return self

    def __exit__(self, *_args: Any) -> None:
        return None

    def record_exception(self, _error: Exception) -> None:
        return None


class _Span:
    sid = "span-1"
    app_id = ""
    uid = ""
    chat_id = ""

    def __init__(self, **_kwargs: Any) -> None:
        pass

    def start(self, **_kwargs: Any) -> _SpanContext:
        return _SpanContext()

    def set_attribute(self, *_args: Any, **_kwargs: Any) -> None:
        return None


class _Meter:
    def set_label(self, *_args: Any, **_kwargs: Any) -> None:
        return None

    def in_error_count(self, *_args: Any, **_kwargs: Any) -> None:
        return None


@pytest.mark.asyncio
async def test_resume_rejects_event_owned_by_another_application(
    monkeypatch: Any,
) -> None:
    event = Event(
        event_id="event-1",
        app_id="owner-app",
        status=ChatStatus.INTERRUPT.value,
    )
    lock_calls: list[str] = []

    class _Registry:
        def get_event(self, event_id: str) -> Event:
            assert event_id == event.event_id
            return event

        def lock_event(self, event_id: str, sid: str) -> bool:
            lock_calls.append(f"{event_id}:{sid}")
            return True

    async def send_error(payload: dict[str, Any], _response: Any) -> dict[str, Any]:
        return payload

    monkeypatch.setattr(open_api, "Span", _Span)
    monkeypatch.setattr(open_api, "Meter", _Meter)
    monkeypatch.setattr(open_api, "EventRegistry", _Registry)
    monkeypatch.setattr(open_api.Streaming, "send_error", send_error)

    response = await open_api.resume_open(
        "other-app",
        ResumeVo(event_id=event.event_id, content="continue"),
    )

    assert response["code"] != 0
    assert "does not belong" in response["message"]
    assert lock_calls == []
