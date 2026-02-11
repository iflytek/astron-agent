"""Span Adapter"""

from contextlib import asynccontextmanager
from functools import wraps
from typing import (
    Any,
    AsyncContextManager,
    AsyncIterator,
    Callable,
    Dict,
    Optional,
    Protocol,
    TypeVar,
    runtime_checkable,
)

from common.otlp.trace.span import Span
from common.otlp.trace.span_instance import SpanInstance
from plugin.aitools.common.log.logger import log


@runtime_checkable
class SpanLike(Protocol):
    def start(self, name: str) -> "SpanLike":
        pass

    def end(self) -> None:
        pass

    def record_exception(self, exc: Exception) -> None:
        pass

    def set_attribute(self, key: str, value: object) -> None:
        pass

    def set_attributes(self, attr: Dict) -> None:
        pass

    def add_info_event(self, value: str) -> None:
        pass

    def add_info_events(self, events: Dict) -> None:
        pass

    def add_error_event(self, value: str) -> None:
        pass

    def add_error_events(self, events: Dict) -> None:
        pass


class SpanInstanceAdapter:
    def __init__(self, inst: SpanInstance):
        self._inst = inst

    def start(self, name: str) -> "SpanInstanceAdapter":
        self._inst.start(name)
        return self

    def end(self) -> None:
        try:
            self._inst.stop()
        except Exception:
            log.exception("Failed to stop SpanInstance")

    def record_exception(self, exc: Exception) -> None:
        self._inst.record_exception(exc)

    def set_attribute(self, key: str, value: object) -> None:
        self._inst.set_attribute(key, value)

    def set_attributes(self, attr: Dict) -> None:
        self._inst.set_attributes(attr)

    def add_info_event(self, value: str) -> None:
        self._inst.add_info_event(value)

    def add_info_events(self, events: Dict) -> None:
        self._inst.add_info_events(events)

    def add_error_event(self, value: str) -> None:
        self._inst.add_error_event(value)

    def add_error_events(self, events: Dict) -> None:
        self._inst.add_error_events(events)


class SpanContextAdapter:
    def __init__(self, parent: Span):
        self._parent = parent
        self._span: Optional[Span] = None

    def start(self, name: str) -> "SpanContextAdapter":
        self._cm = self._parent.start(name)
        self._span = self._cm.__enter__()
        return self

    def end(self) -> None:
        if self._span:
            try:
                self._cm.__exit__(None, None, None)
            except Exception:
                log.exception("Failed to exit Span context")

    def record_exception(self, exc: Exception) -> None:
        assert self._span is not None
        self._span.record_exception(exc)

    def set_attribute(self, key: str, value: object) -> None:
        assert self._span is not None
        self._span.set_attribute(key, value)

    def set_attributes(self, attr: Dict) -> None:
        assert self._span is not None
        self._span.set_attributes(attr)

    def add_info_event(self, value: str) -> None:
        assert self._span is not None
        self._span.add_info_event(value)

    def add_info_events(self, events: Dict) -> None:
        assert self._span is not None
        self._span.add_info_events(events)

    def add_error_event(self, value: str) -> None:
        assert self._span is not None
        self._span.add_error_event(value)

    def add_error_events(self, events: Dict) -> None:
        assert self._span is not None
        self._span.add_error_events(events)


class NoOpSpanAdapter:
    def start(self, name: str) -> "NoOpSpanAdapter":
        return self

    def end(self) -> None:
        pass

    def record_exception(self, exc: Exception) -> None:
        pass

    def set_attribute(self, key: str, value: object) -> None:
        pass

    def set_attributes(self, attr: Dict) -> None:
        pass

    def add_info_event(self, value: str) -> None:
        pass

    def add_info_events(self, events: Dict) -> None:
        pass

    def add_error_event(self, value: str) -> None:
        pass

    def add_error_events(self, events: Dict) -> None:
        pass


class ClientSpanHooks(Protocol):
    def setup(self, client: Any, span: SpanLike) -> None:
        pass

    async def teardown(self, client: Any, span: SpanLike) -> None:
        pass


class InstrumentedClient:
    span_name: str
    span_hooks: ClientSpanHooks
    parent_span: SpanLike

    def __init_subclass__(cls) -> None:
        if hasattr(cls, "start"):
            cls.start = client_span(
                span_name=cls.span_name,
                hooks=cls.span_hooks,
            )(cls.start)


ClientT = TypeVar("ClientT", bound=InstrumentedClient)


def adapt_span(span: Span | SpanInstance | None) -> SpanLike:
    if span is None:
        return NoOpSpanAdapter()
    if isinstance(span, SpanInstance):
        return SpanInstanceAdapter(span)
    return SpanContextAdapter(span)


def client_span(
    *,
    span_name: str,
    hooks: ClientSpanHooks,
) -> Callable[
    [Callable[[ClientT], AsyncContextManager[ClientT]]],
    Callable[[ClientT], AsyncContextManager[ClientT]],
]:
    def decorator(
        func: Callable[[ClientT], AsyncContextManager[ClientT]],
    ) -> Callable[[ClientT], AsyncContextManager[ClientT]]:
        @asynccontextmanager
        @wraps(func)
        async def wrapper(self: ClientT) -> AsyncIterator[ClientT]:
            span = self.parent_span

            if isinstance(span, NoOpSpanAdapter):
                async with func(self):
                    yield self
                return

            span.start(span_name)
            hooks.setup(self, span)

            try:
                async with func(self):
                    yield self
            except Exception as e:
                log.exception(f"Error in {span_name}: {e}")
                span.record_exception(e)
                raise
            finally:
                await hooks.teardown(self, span)
                span.end()

        return wrapper

    return decorator
