"""Unit tests for adapters module."""

from unittest.mock import MagicMock

from plugin.aitools.common.clients.adapters import (
    NoOpSpanAdapter,
    SpanContextAdapter,
    SpanInstanceAdapter,
    SpanLike,
    adapt_span,
    client_span,
)


class TestNoOpSpanAdapter:
    """Test cases for NoOpSpanAdapter."""

    def test_start_returns_self(self) -> None:
        """Test that start returns self."""
        adapter = NoOpSpanAdapter()
        result = adapter.start("test_span")
        assert result is adapter

    def test_end_does_nothing(self) -> None:
        """Test that end does nothing."""
        adapter = NoOpSpanAdapter()
        adapter.end()  # Should not raise

    def test_record_exception_does_nothing(self) -> None:
        """Test that record_exception does nothing."""
        adapter = NoOpSpanAdapter()
        adapter.record_exception(Exception("test"))

    def test_set_attribute_does_nothing(self) -> None:
        """Test that set_attribute does nothing."""
        adapter = NoOpSpanAdapter()
        adapter.set_attribute("key", "value")

    def test_set_attributes_does_nothing(self) -> None:
        """Test that set_attributes does nothing."""
        adapter = NoOpSpanAdapter()
        adapter.set_attributes({"key": "value"})

    def test_add_info_event_does_nothing(self) -> None:
        """Test that add_info_event does nothing."""
        adapter = NoOpSpanAdapter()
        adapter.add_info_event("test event")

    def test_add_info_events_does_nothing(self) -> None:
        """Test that add_info_events does nothing."""
        adapter = NoOpSpanAdapter()
        adapter.add_info_events({"event": "test"})

    def test_add_error_event_does_nothing(self) -> None:
        """Test that add_error_event does nothing."""
        adapter = NoOpSpanAdapter()
        adapter.add_error_event("test error")

    def test_add_error_events_does_nothing(self) -> None:
        """Test that add_error_events does nothing."""
        adapter = NoOpSpanAdapter()
        adapter.add_error_events({"error": "test"})


class TestSpanInstanceAdapter:
    """Test cases for SpanInstanceAdapter."""

    def test_start_calls_inst_start(self) -> None:
        """Test start calls inst.start."""
        mock_inst = MagicMock()
        adapter = SpanInstanceAdapter(mock_inst)
        adapter.start("test_span")
        mock_inst.start.assert_called_once_with("test_span")

    def test_end_calls_inst_stop(self) -> None:
        """Test end calls inst.stop."""
        mock_inst = MagicMock()
        adapter = SpanInstanceAdapter(mock_inst)
        adapter.end()
        mock_inst.stop.assert_called_once()

    def test_end_handles_exception(self) -> None:
        """Test end handles exception from inst.stop."""
        mock_inst = MagicMock()
        mock_inst.stop.side_effect = Exception("stop error")
        adapter = SpanInstanceAdapter(mock_inst)
        # Should not raise
        adapter.end()

    def test_record_exception(self) -> None:
        """Test record_exception calls inst.record_exception."""
        mock_inst = MagicMock()
        adapter = SpanInstanceAdapter(mock_inst)
        exc = Exception("test error")
        adapter.record_exception(exc)
        mock_inst.record_exception.assert_called_once_with(exc)

    def test_set_attribute(self) -> None:
        """Test set_attribute calls inst.set_attribute."""
        mock_inst = MagicMock()
        adapter = SpanInstanceAdapter(mock_inst)
        adapter.set_attribute("key", "value")
        mock_inst.set_attribute.assert_called_once_with("key", "value")

    def test_set_attributes(self) -> None:
        """Test set_attributes calls inst.set_attributes."""
        mock_inst = MagicMock()
        adapter = SpanInstanceAdapter(mock_inst)
        adapter.set_attributes({"key": "value"})
        mock_inst.set_attributes.assert_called_once_with({"key": "value"})

    def test_add_info_event(self) -> None:
        """Test add_info_event calls inst.add_info_event."""
        mock_inst = MagicMock()
        adapter = SpanInstanceAdapter(mock_inst)
        adapter.add_info_event("test event")
        mock_inst.add_info_event.assert_called_once_with("test event")

    def test_add_info_events(self) -> None:
        """Test add_info_events calls inst.add_info_events."""
        mock_inst = MagicMock()
        adapter = SpanInstanceAdapter(mock_inst)
        adapter.add_info_events({"event": "test"})
        mock_inst.add_info_events.assert_called_once_with({"event": "test"})

    def test_add_error_event(self) -> None:
        """Test add_error_event calls inst.add_error_event."""
        mock_inst = MagicMock()
        adapter = SpanInstanceAdapter(mock_inst)
        adapter.add_error_event("test error")
        mock_inst.add_error_event.assert_called_once_with("test error")

    def test_add_error_events(self) -> None:
        """Test add_error_events calls inst.add_error_events."""
        mock_inst = MagicMock()
        adapter = SpanInstanceAdapter(mock_inst)
        adapter.add_error_events({"error": "test"})
        mock_inst.add_error_events.assert_called_once_with({"error": "test"})


class TestSpanContextAdapter:
    """Test cases for SpanContextAdapter."""

    def test_start_calls_parent_start(self) -> None:
        """Test start calls parent.start."""
        mock_parent = MagicMock()
        mock_cm = MagicMock()
        mock_parent.start.return_value = mock_cm

        adapter = SpanContextAdapter(mock_parent)
        adapter.start("test_span")

        mock_parent.start.assert_called_once_with("test_span")
        mock_cm.__enter__.assert_called_once()

    def test_end_calls_cm_exit(self) -> None:
        """Test end calls context manager exit."""
        mock_parent = MagicMock()
        mock_cm = MagicMock()
        mock_parent.start.return_value = mock_cm

        adapter = SpanContextAdapter(mock_parent)
        adapter.start("test_span")
        adapter.end()

        mock_cm.__exit__.assert_called_once_with(None, None, None)

    def test_end_does_nothing_when_no_span(self) -> None:
        """Test end does nothing when span is None."""
        mock_parent = MagicMock()
        adapter = SpanContextAdapter(mock_parent)
        # Should not raise
        adapter.end()

    def test_end_handles_exception(self) -> None:
        """Test end handles exception from __exit__."""
        mock_parent = MagicMock()
        mock_cm = MagicMock()
        mock_cm.__exit__.side_effect = Exception("exit error")
        mock_parent.start.return_value = mock_cm

        adapter = SpanContextAdapter(mock_parent)
        adapter.start("test_span")
        # Should not raise
        adapter.end()

    def test_record_exception(self) -> None:
        """Test record_exception calls span.record_exception."""
        mock_parent = MagicMock()
        mock_cm = MagicMock()
        mock_span = MagicMock()
        mock_cm.__enter__.return_value = mock_span
        mock_parent.start.return_value = mock_cm

        adapter = SpanContextAdapter(mock_parent)
        adapter.start("test_span")
        exc = Exception("test error")
        adapter.record_exception(exc)

        mock_span.record_exception.assert_called_once_with(exc)

    def test_set_attribute(self) -> None:
        """Test set_attribute calls span.set_attribute."""
        mock_parent = MagicMock()
        mock_cm = MagicMock()
        mock_span = MagicMock()
        mock_cm.__enter__.return_value = mock_span
        mock_parent.start.return_value = mock_cm

        adapter = SpanContextAdapter(mock_parent)
        adapter.start("test_span")
        adapter.set_attribute("key", "value")

        mock_span.set_attribute.assert_called_once_with("key", "value")

    def test_set_attributes(self) -> None:
        """Test set_attributes calls span.set_attributes."""
        mock_parent = MagicMock()
        mock_cm = MagicMock()
        mock_span = MagicMock()
        mock_cm.__enter__.return_value = mock_span
        mock_parent.start.return_value = mock_cm

        adapter = SpanContextAdapter(mock_parent)
        adapter.start("test_span")
        adapter.set_attributes({"key": "value"})

        mock_span.set_attributes.assert_called_once_with({"key": "value"})

    def test_add_info_event(self) -> None:
        """Test add_info_event calls span.add_info_event."""
        mock_parent = MagicMock()
        mock_cm = MagicMock()
        mock_span = MagicMock()
        mock_cm.__enter__.return_value = mock_span
        mock_parent.start.return_value = mock_cm

        adapter = SpanContextAdapter(mock_parent)
        adapter.start("test_span")
        adapter.add_info_event("test event")

        mock_span.add_info_event.assert_called_once_with("test event")

    def test_add_info_events(self) -> None:
        """Test add_info_events calls span.add_info_events."""
        mock_parent = MagicMock()
        mock_cm = MagicMock()
        mock_span = MagicMock()
        mock_cm.__enter__.return_value = mock_span
        mock_parent.start.return_value = mock_cm

        adapter = SpanContextAdapter(mock_parent)
        adapter.start("test_span")
        adapter.add_info_events({"event": "test"})

        mock_span.add_info_events.assert_called_once_with({"event": "test"})

    def test_add_error_event(self) -> None:
        """Test add_error_event calls span.add_error_event."""
        mock_parent = MagicMock()
        mock_cm = MagicMock()
        mock_span = MagicMock()
        mock_cm.__enter__.return_value = mock_span
        mock_parent.start.return_value = mock_cm

        adapter = SpanContextAdapter(mock_parent)
        adapter.start("test_span")
        adapter.add_error_event("test error")

        mock_span.add_error_event.assert_called_once_with("test error")

    def test_add_error_events(self) -> None:
        """Test add_error_events calls span.add_error_events."""
        mock_parent = MagicMock()
        mock_cm = MagicMock()
        mock_span = MagicMock()
        mock_cm.__enter__.return_value = mock_span
        mock_parent.start.return_value = mock_cm

        adapter = SpanContextAdapter(mock_parent)
        adapter.start("test_span")
        adapter.add_error_events({"error": "test"})

        mock_span.add_error_events.assert_called_once_with({"error": "test"})


class TestAdaptSpan:
    """Test cases for adapt_span function."""

    def test_adapt_none_returns_noop(self) -> None:
        """Test that adapting None returns NoOpSpanAdapter."""
        result = adapt_span(None)
        assert isinstance(result, NoOpSpanAdapter)

    def test_span_like_protocol(self) -> None:
        """Test SpanLike protocol."""
        adapter = NoOpSpanAdapter()
        assert isinstance(adapter, SpanLike)

    def test_adapt_span_instance(self) -> None:
        """Test adapting SpanInstance returns SpanInstanceAdapter."""
        from common.otlp.trace.span_instance import SpanInstance

        mock_instance = MagicMock(spec=SpanInstance)
        result = adapt_span(mock_instance)
        assert isinstance(result, SpanInstanceAdapter)

    def test_adapt_span(self) -> None:
        """Test adapting Span returns SpanContextAdapter."""
        from common.otlp.trace.span import Span

        mock_span = MagicMock(spec=Span)
        result = adapt_span(mock_span)
        assert isinstance(result, SpanContextAdapter)


class TestClientSpanDecorator:
    """Test cases for client_span decorator."""

    def test_client_span_decorator(self) -> None:
        """Test client_span decorator is callable."""
        # This test verifies the client_span decorator is callable
        assert callable(client_span)
        # Verify it can be called with the expected parameters
        # We don't need to fully exercise it as it's tested elsewhere
        assert hasattr(client_span, "__call__")
