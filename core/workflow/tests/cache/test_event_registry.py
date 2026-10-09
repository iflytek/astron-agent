from typing import Any

from workflow.cache.event_registry import EventRegistry


class _RecordingCache:
    def __init__(self, result: bool) -> None:
        self.result = result
        self.calls: list[dict[str, Any]] = []

    def setnx(self, key: str, value: Any, ex: int = 0) -> bool:
        self.calls.append({"key": key, "value": value, "ex": ex})
        return self.result


def test_lock_event_uses_atomic_setnx(monkeypatch: Any) -> None:
    cache = _RecordingCache(result=True)
    monkeypatch.setattr(
        "workflow.cache.event_registry.get_cache_service", lambda: cache
    )

    acquired = EventRegistry.lock_event("event-1", "sid-1", timeout=42)

    assert acquired is True
    assert cache.calls == [
        {
            "key": "event_lock:event-1",
            "value": "locked_by_sid-1",
            "ex": 42,
        }
    ]


def test_lock_event_reports_existing_claim(monkeypatch: Any) -> None:
    cache = _RecordingCache(result=False)
    monkeypatch.setattr(
        "workflow.cache.event_registry.get_cache_service", lambda: cache
    )

    assert EventRegistry.lock_event("event-1", "sid-2") is False
