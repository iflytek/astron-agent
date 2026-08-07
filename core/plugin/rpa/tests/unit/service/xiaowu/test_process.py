"""Unit tests for the RPA task processing module.

This module contains comprehensive tests for task monitoring, span/trace setup,
logging, metrics, and OTLP handling functionality.
"""

import asyncio
import os
import time
from typing import Any, Dict, Generator
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from fastapi import HTTPException
from plugin.rpa.api.schemas.execution_schema import RPAExecutionResponse
from plugin.rpa.errors.error_code import ErrorCode
from plugin.rpa.exceptions.config_exceptions import InvalidConfigException
from plugin.rpa.service.xiaowu.process import (
    otlp_handle,
    setup_logging_and_metrics,
    setup_span_and_trace,
    task_monitoring,
)


class TestTaskMonitoring:
    """Test class for task_monitoring function."""

    @pytest.fixture
    def mock_dependencies(self) -> Generator[Dict[str, Any], None, None]:
        """Fixture providing mocked dependencies for task monitoring."""
        with patch(
            "plugin.rpa.service.xiaowu.process.create_task"
        ) as mock_create, patch(
            "plugin.rpa.service.xiaowu.process.query_task_status"
        ) as mock_query, patch(
            "plugin.rpa.service.xiaowu.process.setup_span_and_trace"
        ) as mock_setup_span, patch(
            "plugin.rpa.service.xiaowu.process.setup_logging_and_metrics"
        ) as mock_setup_logging, patch(
            "plugin.rpa.service.xiaowu.process.otlp_handle"
        ) as mock_otlp, patch(
            "plugin.rpa.service.xiaowu.process.os.getenv"
        ) as mock_getenv:

            # Setup mock objects
            mock_span = MagicMock()
            mock_span.sid = "test-span-sid"
            mock_span_context = MagicMock()
            mock_span_context.sid = "test-span-context-sid"
            mock_span.start.return_value.__enter__ = MagicMock(
                return_value=mock_span_context
            )
            mock_span.start.return_value.__exit__ = MagicMock(return_value=None)

            mock_node_trace = MagicMock()
            mock_setup_span.return_value = (mock_span, mock_node_trace)

            mock_meter = MagicMock()
            mock_setup_logging.return_value = mock_meter

            # Default environment variables
            mock_getenv.side_effect = lambda key, default: {
                "XIAOWU_RPA_TIMEOUT": "300",
                "XIAOWU_RPA_TASK_QUERY_INTERVAL": "10",
            }.get(key.replace("_KEY", ""), default)

            yield {
                "create_task": mock_create,
                "query_task_status": mock_query,
                "setup_span_and_trace": mock_setup_span,
                "setup_logging_and_metrics": mock_setup_logging,
                "otlp_handle": mock_otlp,
                "getenv": mock_getenv,
                "span": mock_span,
                "span_context": mock_span_context,
                "node_trace": mock_node_trace,
                "meter": mock_meter,
            }

    @pytest.mark.asyncio
    async def test_task_monitoring_successful_completion(
        self, mock_dependencies: Dict[str, Any]
    ) -> None:
        """Test successful task monitoring with immediate completion."""
        # Arrange
        mocks = mock_dependencies
        mocks["create_task"].return_value = "test-task-id"
        mocks["query_task_status"].return_value = (
            ErrorCode.SUCCESS.code,
            ErrorCode.SUCCESS.message,
            {"result": "completed"},
        )

        # Act
        result_generator = task_monitoring(
            sid="test-sid",
            access_token="test-token",
            project_id="test-project",
            version=None,
            phone_number=None,
            exec_position="EXECUTOR",
            params={"key": "value"},
        )

        results = []
        async for result in result_generator:
            results.append(result)

        # Assert
        assert len(results) == 1
        response_data = RPAExecutionResponse.model_validate_json(results[0])
        assert response_data.code == ErrorCode.SUCCESS.code
        assert response_data.message == ErrorCode.SUCCESS.message
        assert response_data.data == {"result": "completed"}

        mocks["create_task"].assert_called_once_with(
            access_token="test-token",
            project_id="test-project",
            version=None,
            phone_number=None,
            exec_position="EXECUTOR",
            params={"key": "value"},
        )

    @pytest.mark.asyncio
    async def test_task_monitoring_create_task_error(
        self, mock_dependencies: Dict[str, Any]
    ) -> None:
        """Test task monitoring when task creation fails."""
        # Arrange
        mocks = mock_dependencies
        mocks["create_task"].side_effect = HTTPException(
            status_code=500, detail="Creation failed"
        )

        # Act
        result_generator = task_monitoring(
            sid="test-sid",
            access_token="test-token",
            project_id="test-project",
            version=None,
            phone_number=None,
            exec_position="EXECUTOR",
            params={"key": "value"},
        )

        results = []
        async for result in result_generator:
            results.append(result)

        # Assert
        assert len(results) == 1
        response_data = RPAExecutionResponse.model_validate_json(results[0])
        assert response_data.code in {
            ErrorCode.CREATE_URL_INVALID.code,
            ErrorCode.CREATE_TASK_ERROR.code,
        }
        assert "Create task error" in response_data.message

    @pytest.mark.asyncio
    async def test_task_monitoring_query_task_error(
        self, mock_dependencies: Dict[str, Any]
    ) -> None:
        """Test task monitoring when task query returns error."""
        # Arrange
        mocks = mock_dependencies
        mocks["create_task"].return_value = "test-task-id"
        mocks["query_task_status"].return_value = (
            ErrorCode.QUERY_TASK_ERROR.code,
            "Query failed",
            {},
        )

        # Act
        result_generator = task_monitoring(
            sid="test-sid",
            access_token="test-token",
            project_id="test-project",
            version=None,
            phone_number=None,
            exec_position="EXECUTOR",
            params={"key": "value"},
        )

        results = []
        async for result in result_generator:
            results.append(result)

        # Assert
        assert len(results) == 1
        response_data = RPAExecutionResponse.model_validate_json(results[0])
        assert response_data.code in {
            ErrorCode.QUERY_URL_INVALID.code,
            ErrorCode.QUERY_TASK_ERROR.code,
        }

    @pytest.mark.asyncio
    async def test_task_monitoring_timeout(
        self, mock_dependencies: Dict[str, Any]
    ) -> None:
        """Test task monitoring timeout scenario."""
        # Arrange
        mocks = mock_dependencies
        mocks["create_task"].return_value = "test-task-id"
        mocks["query_task_status"].return_value = None  # Task not completed
        mocks["getenv"].side_effect = lambda key, default: {
            "XIAOWU_RPA_TIMEOUT": "1",  # Very short timeout
            "XIAOWU_RPA_TASK_QUERY_INTERVAL": "1",
        }.get(key.replace("_KEY", ""), default)

        with patch(
            "plugin.rpa.service.xiaowu.process.asyncio.sleep", new_callable=AsyncMock
        ):
            with patch("plugin.rpa.service.xiaowu.process.time.time") as mock_time:
                # Mock time progression to trigger timeout
                # Provide enough values for all time.time() calls in the function
                mock_time.side_effect = [
                    0,
                    0,
                    0,
                    2,
                    2,
                ]  # Start, while condition, event log, timeout check, final check

                # Act
                result_generator = task_monitoring(
                    sid="test-sid",
                    access_token="test-token",
                    project_id="test-project",
                    version=None,
                    phone_number=None,
                    exec_position="EXECUTOR",
                    params={"key": "value"},
                )

                results = []
                async for result in result_generator:
                    results.append(result)

                # Assert
                assert len(results) == 1
                response_data = RPAExecutionResponse.model_validate_json(results[0])
                assert response_data.code == ErrorCode.TIMEOUT_ERROR.code

    @pytest.mark.asyncio
    async def test_task_monitoring_with_none_sid(
        self, mock_dependencies: Dict[str, Any]
    ) -> None:
        """Test task monitoring when sid is None."""
        # Arrange
        mocks = mock_dependencies
        mocks["create_task"].return_value = "test-task-id"
        mocks["query_task_status"].return_value = (
            ErrorCode.SUCCESS.code,
            ErrorCode.SUCCESS.message,
            {"result": "completed"},
        )

        # Act
        result_generator = task_monitoring(
            sid=None,
            access_token="test-token",
            project_id="test-project",
            version=None,
            phone_number=None,
            exec_position="EXECUTOR",
            params={"key": "value"},
        )

        results = []
        async for result in result_generator:
            results.append(result)

        # Assert
        assert len(results) == 1
        response_data = RPAExecutionResponse.model_validate_json(results[0])
        assert response_data.sid == "test-span-sid"  # Should use span sid

    @pytest.mark.asyncio
    async def test_task_monitoring_multiple_exceptions(
        self, mock_dependencies: Dict[str, Any]
    ) -> None:
        """Test task monitoring handles different exception types."""
        # Arrange
        mocks = mock_dependencies
        exception_types = [
            InvalidConfigException("Config error"),
            httpx.HTTPStatusError(
                "HTTP error", request=MagicMock(), response=MagicMock()
            ),
            httpx.RequestError("Request error"),
            AssertionError("Assertion failed"),
            KeyError("Missing key"),
            AttributeError("Missing attribute"),
        ]

        for exception in exception_types:
            mocks["create_task"].side_effect = exception

            # Act
            result_generator = task_monitoring(
                sid="test-sid",
                access_token="test-token",
                project_id="test-project",
                version=None,
                phone_number=None,
                exec_position="EXECUTOR",
                params={"key": "value"},
            )

            results = []
            async for result in result_generator:
                results.append(result)

            # Assert
            assert len(results) == 1
            response_data = RPAExecutionResponse.model_validate_json(results[0])
            assert response_data.code in {
                ErrorCode.CREATE_URL_INVALID.code,
                ErrorCode.CREATE_TASK_ERROR.code,
            }


class TestSetupSpanAndTrace:
    """Test class for setup_span_and_trace function."""

    @patch("plugin.rpa.service.xiaowu.process.Span")
    @patch("plugin.rpa.service.xiaowu.process.NodeTraceLog")
    def test_setup_span_and_trace_with_sid(
        self, mock_node_trace_log: MagicMock, mock_span: MagicMock
    ) -> None:
        """Test setup_span_and_trace when sid is provided."""
        # Arrange
        mock_span_instance = MagicMock()
        mock_span.return_value = mock_span_instance

        mock_node_trace_instance = MagicMock()
        mock_node_trace_log.return_value = mock_node_trace_instance

        test_sid = "test-sid-123"
        test_req = "test request"

        # Act
        span, node_trace = setup_span_and_trace(test_req, test_sid)

        # Assert
        assert span == mock_span_instance
        assert node_trace == mock_node_trace_instance
        assert mock_span_instance.sid == test_sid

        mock_node_trace_log.assert_called_once_with(
            service_id="",
            sid=test_sid,
            app_id="defappid",
            uid="",
            chat_id=test_sid,
            sub="rpa-server",
            caller="",
            log_caller="",
            question=test_req,
        )

    @patch("plugin.rpa.service.xiaowu.process.Span")
    @patch("plugin.rpa.service.xiaowu.process.NodeTraceLog")
    def test_setup_span_and_trace_without_sid(
        self, mock_node_trace_log: MagicMock, mock_span: MagicMock
    ) -> None:
        """Test setup_span_and_trace when sid is None."""
        # Arrange
        mock_span_instance = MagicMock()
        mock_span_instance.sid = "generated-sid"
        mock_span.return_value = mock_span_instance

        mock_node_trace_instance = MagicMock()
        mock_node_trace_log.return_value = mock_node_trace_instance

        test_req = "test request"

        # Act
        span, node_trace = setup_span_and_trace(test_req, None)

        # Assert
        assert span == mock_span_instance
        assert node_trace == mock_node_trace_instance

        mock_node_trace_log.assert_called_once_with(
            service_id="",
            sid="generated-sid",
            app_id="defappid",
            uid="",
            chat_id="",
            sub="rpa-server",
            caller="",
            log_caller="",
            question=test_req,
        )


class TestSetupLoggingAndMetrics:
    """Test class for setup_logging_and_metrics function."""

    @patch("plugin.rpa.service.xiaowu.process.Meter")
    @patch("plugin.rpa.service.xiaowu.process.logger")
    def test_setup_logging_and_metrics(
        self, mock_logger: MagicMock, mock_meter: MagicMock
    ) -> None:
        """Test setup_logging_and_metrics function."""
        # Arrange
        mock_span_context = MagicMock()
        mock_span_context.app_id = "test-app-id"

        mock_meter_instance = MagicMock()
        mock_meter.return_value = mock_meter_instance

        test_req = "test request"
        test_product_id = "test-product-123"

        # Act
        result = setup_logging_and_metrics(mock_span_context, test_req, test_product_id)

        # Assert
        assert result == mock_meter_instance
        mock_logger.info.assert_called_once_with(
            {"exec api, rap router usr_input": test_req}
        )
        mock_span_context.add_info_events.assert_called_once_with(
            {"usr_input": test_req}
        )
        mock_span_context.set_attributes.assert_called_once_with(
            attributes={"tool_id": test_product_id}
        )
        mock_meter.assert_called_once_with(app_id="test-app-id", func="task_monitoring")


class TestOtlpHandle:
    """Test class for otlp_handle function."""

    @patch("plugin.rpa.service.xiaowu.process.get_kafka_producer_service")
    @patch("plugin.rpa.service.xiaowu.process.os.getenv")
    @patch("plugin.rpa.service.xiaowu.process.time.time")
    @patch("plugin.rpa.service.xiaowu.process.cast")
    def test_otlp_handle_success_case(
        self,
        mock_cast: MagicMock,
        mock_time: MagicMock,
        mock_getenv: MagicMock,
        mock_kafka_service: MagicMock,
    ) -> None:
        """Test otlp_handle for success case."""
        # Arrange
        mock_getenv.side_effect = lambda key, default: {
            "OTLP_ENABLE": "true",
            "KAFKA_TOPIC": "test-topic",
        }.get(key.replace("_KEY", ""), default)

        mock_time.return_value = 1609459200  # Fixed timestamp
        mock_meter = MagicMock()
        mock_node_trace = MagicMock()
        mock_kafka_producer = MagicMock()
        mock_kafka_service.return_value = mock_kafka_producer
        mock_cast.return_value = mock_kafka_producer

        # Act
        otlp_handle(mock_meter, mock_node_trace, 0, "Success")

        # Assert
        mock_meter.in_success_count.assert_called_once()
        mock_node_trace.status = mock_node_trace.status
        assert mock_node_trace.answer == "Success"
        mock_kafka_producer.send.assert_called_once()

    @patch("plugin.rpa.service.xiaowu.process.get_kafka_producer_service")
    @patch("plugin.rpa.service.xiaowu.process.os.getenv")
    @patch("plugin.rpa.service.xiaowu.process.time.time")
    @patch("plugin.rpa.service.xiaowu.process.cast")
    def test_otlp_handle_error_case(
        self,
        mock_cast: MagicMock,
        mock_time: MagicMock,
        mock_getenv: MagicMock,
        mock_kafka_service: MagicMock,
    ) -> None:
        """Test otlp_handle for error case."""
        # Arrange
        mock_getenv.side_effect = lambda key, default: {
            "OTLP_ENABLE": "true",
            "KAFKA_TOPIC": "test-topic",
        }.get(key.replace("_KEY", ""), default)

        mock_time.return_value = 1609459200
        mock_meter = MagicMock()
        mock_node_trace = MagicMock()
        mock_kafka_producer = MagicMock()
        mock_kafka_service.return_value = mock_kafka_producer
        mock_cast.return_value = mock_kafka_producer

        error_code = 55001

        # Act
        otlp_handle(mock_meter, mock_node_trace, error_code, "Error occurred")

        # Assert
        mock_meter.in_error_count.assert_called_once_with(error_code)
        assert mock_node_trace.answer == "Error occurred"
        mock_kafka_producer.send.assert_called_once()

    @patch("plugin.rpa.service.xiaowu.process.os.getenv")
    def test_otlp_handle_disabled(self, mock_getenv: MagicMock) -> None:
        """Test otlp_handle when OTLP is disabled."""
        # Arrange
        mock_getenv.return_value = "0"
        mock_meter = MagicMock()
        mock_node_trace = MagicMock()

        # Act
        otlp_handle(mock_meter, mock_node_trace, 0, "Success")

        # Assert - function should return early without processing
        mock_meter.in_success_count.assert_not_called()
        mock_meter.in_error_count.assert_not_called()
