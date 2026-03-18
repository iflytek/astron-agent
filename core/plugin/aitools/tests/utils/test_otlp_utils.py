"""Unit tests for otlp_utils module."""

import json
from unittest.mock import MagicMock, patch

import pytest
from plugin.aitools.api.schemas.types import ErrorResponse, SuccessResponse
from plugin.aitools.utils import otlp_utils
from plugin.aitools.utils.otlp_utils import update_span, upload_trace


class TestUpdateSpan:
    """Test cases for update_span function."""

    def test_update_span_with_none(self) -> None:
        """Test update_span with None span."""
        response = SuccessResponse(data={"key": "value"})
        # Should not raise
        update_span(response, None)

    def test_update_span_success_with_data(self) -> None:
        """Test update_span with success response and data."""
        response = SuccessResponse(data={"result": "ok"})
        mock_span = MagicMock()
        update_span(response, mock_span)
        mock_span.set_attribute.assert_called_once_with("error.code", 0)
        mock_span.add_info_events.assert_called_once_with(
            {"RESPONSE DATA": json.dumps(response.data, ensure_ascii=False)}
        )

    def test_update_span_success_empty_data(self) -> None:
        """Test update_span with success response and empty data."""
        response = SuccessResponse()
        mock_span = MagicMock()
        update_span(response, mock_span)
        mock_span.add_info_event.assert_called_once_with("Empty response data")

    def test_update_span_error(self) -> None:
        """Test update_span with error response."""
        response = ErrorResponse.from_code(code=500, message="Error message")
        mock_span = MagicMock()
        update_span(response, mock_span)
        mock_span.add_error_events.assert_called_once_with(
            {"ERROR MESSAGE": "Error message"}
        )

    def test_update_span_truncate_large_response(self) -> None:
        """Test update_span truncates oversized response payload."""
        response = SuccessResponse(data={"text": "x" * 200})
        mock_span = MagicMock()

        with patch.object(otlp_utils, "SPAN_SIZE_LIMIT", 20):
            update_span(response, mock_span)

        payload = mock_span.add_info_events.call_args.args[0]["RESPONSE DATA"]
        assert "..." in payload


class TestUploadTrace:
    """Test cases for upload_trace function."""

    def test_upload_trace_no_meter(self) -> None:
        """Test upload_trace with no meter."""
        response = SuccessResponse(data={"key": "value"})
        # Should not raise
        upload_trace(response, None, None)

    def test_upload_trace_no_node_trace(self) -> None:
        """Test upload_trace with no node_trace."""
        mock_meter = MagicMock()
        response = SuccessResponse(data={"key": "value"})
        # Should not raise
        upload_trace(response, mock_meter, None)

    def test_upload_trace_success(self) -> None:
        """Test upload_trace with success response."""
        mock_meter = MagicMock()
        mock_node_trace = MagicMock()
        mock_node_trace.to_json.return_value = "{}"
        mock_service = MagicMock()

        response = SuccessResponse(data={"result": "ok"})
        with patch.object(
            otlp_utils, "get_kafka_producer_service", return_value=mock_service
        ):
            upload_trace(response, mock_meter, mock_node_trace)

        mock_meter.in_success_count.assert_called_once()
        assert mock_node_trace.answer == json.dumps(response.data, ensure_ascii=False)
        assert mock_node_trace.status.code == 0
        assert mock_node_trace.status.message == "success"
        mock_service.enqueue.assert_called_once_with("{}")

    def test_upload_trace_error(self) -> None:
        """Test upload_trace with error response."""
        mock_meter = MagicMock()
        mock_node_trace = MagicMock()
        mock_node_trace.to_json.return_value = "{}"
        mock_service = MagicMock()

        response = ErrorResponse.from_code(code=500, message="Error")
        with patch.object(
            otlp_utils, "get_kafka_producer_service", return_value=mock_service
        ):
            upload_trace(response, mock_meter, mock_node_trace)

        mock_meter.in_error_count.assert_called_once_with(500)
        assert mock_node_trace.answer == "Error"
        assert mock_node_trace.status.code == 500
        assert mock_node_trace.status.message == "Error"
        mock_service.enqueue.assert_called_once_with("{}")

    def test_upload_trace_enqueue_exception_bubbles(self) -> None:
        """Current upload_trace does not swallow enqueue exceptions."""
        mock_meter = MagicMock()
        mock_node_trace = MagicMock()
        mock_node_trace.to_json.return_value = "{}"
        mock_service = MagicMock()
        mock_service.enqueue.side_effect = RuntimeError("enqueue failed")

        response = SuccessResponse(data={"key": "value"})
        with patch.object(
            otlp_utils, "get_kafka_producer_service", return_value=mock_service
        ):
            with pytest.raises(RuntimeError):
                upload_trace(response, mock_meter, mock_node_trace)
