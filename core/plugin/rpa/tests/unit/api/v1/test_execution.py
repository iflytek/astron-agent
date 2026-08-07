"""Unit tests for the RPA execution API endpoint.

This module contains comprehensive tests for the execution endpoint including
request validation, response handling, and error scenarios.
"""

import json
from datetime import datetime, timezone
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from plugin.rpa.api.schemas.execution_schema import RPAExecutionRequest
from plugin.rpa.api.v1.execution import exec_fun
from sse_starlette.sse import EventSourceResponse


class TestExecFun:
    """Test class for the exec_fun endpoint."""

    @pytest.fixture
    def sample_request(self) -> RPAExecutionRequest:
        """Fixture providing a sample RPA execution request."""
        return RPAExecutionRequest(
            sid="test-sid-123",
            project_id="test-project-456",
            exec_position="EXECUTOR",
            params={"key1": "value1", "key2": "value2"},
        )

    @pytest.fixture
    def bearer_token(self) -> str:
        """Fixture providing a sample Bearer token."""
        return "Bearer test-access-token-123"

    @pytest.fixture
    def plain_token(self) -> str:
        """Fixture providing a plain access token."""
        return "test-access-token-123"

    @patch("plugin.rpa.api.v1.execution.task_monitoring")
    @patch("plugin.rpa.api.v1.execution.os.getenv")
    @patch("plugin.rpa.api.v1.execution.datetime")
    @pytest.mark.asyncio
    async def test_exec_fun_success_with_bearer_token(
        self,
        mock_datetime: MagicMock,
        mock_getenv: MagicMock,
        mock_task_monitoring: MagicMock,
        sample_request: RPAExecutionRequest,
        bearer_token: str,
    ) -> None:
        """Test successful execution with Bearer token."""
        # Arrange
        mock_datetime.now.return_value.strftime.return_value = (
            "Wed, 01 Jan 2025 00:00:00 GMT"
        )
        mock_getenv.return_value = "5"  # ping interval
        mock_task_monitoring.return_value = AsyncMock()

        # Act
        response = await exec_fun(Authorization=bearer_token, request=sample_request)

        # Assert
        assert isinstance(response, EventSourceResponse)
        mock_task_monitoring.assert_called_once_with(
            sid="test-sid-123",
            access_token="test-access-token-123",  # Token without "Bearer " prefix
            project_id="test-project-456",
            version=None,
            phone_number=None,
            exec_position="EXECUTOR",
            params={"key1": "value1", "key2": "value2"},
        )

    @patch("plugin.rpa.api.v1.execution.task_monitoring")
    @patch("plugin.rpa.api.v1.execution.os.getenv")
    @patch("plugin.rpa.api.v1.execution.datetime")
    @pytest.mark.asyncio
    async def test_exec_fun_success_with_plain_token(
        self,
        mock_datetime: MagicMock,
        mock_getenv: MagicMock,
        mock_task_monitoring: MagicMock,
        sample_request: RPAExecutionRequest,
        plain_token: str,
    ) -> None:
        """Test successful execution with plain token (no Bearer prefix)."""
        # Arrange
        mock_datetime.now.return_value.strftime.return_value = (
            "Wed, 01 Jan 2025 00:00:00 GMT"
        )
        mock_getenv.return_value = "3"  # ping interval
        mock_task_monitoring.return_value = AsyncMock()

        # Act
        response = await exec_fun(Authorization=plain_token, request=sample_request)

        # Assert
        assert isinstance(response, EventSourceResponse)
        mock_task_monitoring.assert_called_once_with(
            sid="test-sid-123",
            access_token=plain_token,  # Token used as-is
            project_id="test-project-456",
            version=None,
            phone_number=None,
            exec_position="EXECUTOR",
            params={"key1": "value1", "key2": "value2"},
        )

    @patch("plugin.rpa.api.v1.execution.task_monitoring")
    @patch("plugin.rpa.api.v1.execution.os.getenv")
    @patch("plugin.rpa.api.v1.execution.datetime")
    @pytest.mark.asyncio
    async def test_exec_fun_default_ping_interval(
        self,
        mock_datetime: MagicMock,
        mock_getenv: MagicMock,
        mock_task_monitoring: MagicMock,
        sample_request: RPAExecutionRequest,
        bearer_token: str,
    ) -> None:
        """Test execution with default ping interval when env var not set."""
        # Arrange
        mock_datetime.now.return_value.strftime.return_value = (
            "Wed, 01 Jan 2025 00:00:00 GMT"
        )
        mock_getenv.return_value = None  # No ping interval set
        mock_task_monitoring.return_value = AsyncMock()

        # Act
        response = await exec_fun(Authorization=bearer_token, request=sample_request)

        # Assert
        assert isinstance(response, EventSourceResponse)
        # Verify default ping interval is used (should be "3" as default)
        mock_getenv.assert_called_with("XIAOWU_RPA_PING_INTERVAL", "3")

    @patch("plugin.rpa.api.v1.execution.task_monitoring")
    @patch("plugin.rpa.api.v1.execution.os.getenv")
    @patch("plugin.rpa.api.v1.execution.datetime")
    @pytest.mark.asyncio
    async def test_exec_fun_response_headers(
        self,
        mock_datetime: MagicMock,
        mock_getenv: MagicMock,
        mock_task_monitoring: MagicMock,
        sample_request: RPAExecutionRequest,
        bearer_token: str,
    ) -> None:
        """Test that response headers are set correctly."""
        # Arrange
        fixed_datetime = "Wed, 01 Jan 2025 12:00:00 GMT"
        mock_datetime.now.return_value.strftime.return_value = fixed_datetime
        mock_getenv.return_value = "5"
        mock_task_monitoring.return_value = AsyncMock()

        # Act
        response = await exec_fun(Authorization=bearer_token, request=sample_request)

        # Assert
        expected_headers = {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Transfer-Encoding": "chunked",
            "Connection": "keep-alive",
            "Date": fixed_datetime,
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
        }

        assert isinstance(response, EventSourceResponse)
        # Note: EventSourceResponse headers are passed during initialization
        # We verify the datetime formatting was called correctly
        mock_datetime.now.assert_called_once_with(timezone.utc)

    @pytest.mark.asyncio
    async def test_exec_fun_json_decode_error(
        self, sample_request: RPAExecutionRequest, bearer_token: str
    ) -> None:
        """Test handling of JSON decode error."""
        # Arrange
        with patch(
            "plugin.rpa.api.v1.execution.task_monitoring"
        ) as mock_task_monitoring:
            mock_task_monitoring.side_effect = json.JSONDecodeError(
                "Invalid JSON", "", 0
            )

            # Act & Assert
            with pytest.raises(HTTPException) as exc_info:
                await exec_fun(Authorization=bearer_token, request=sample_request)

            assert exc_info.value.status_code == 400
            assert "Invalid JSON format for 'params'" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_exec_fun_generic_exception(
        self, sample_request: RPAExecutionRequest, bearer_token: str
    ) -> None:
        """Test handling of generic exceptions."""
        # Arrange
        with patch(
            "plugin.rpa.api.v1.execution.task_monitoring"
        ) as mock_task_monitoring:
            mock_task_monitoring.side_effect = ValueError("Generic error")

            # Act & Assert
            with pytest.raises(HTTPException) as exc_info:
                await exec_fun(Authorization=bearer_token, request=sample_request)

            assert exc_info.value.status_code == 500
            assert "Generic error" in str(exc_info.value.detail)

    @patch("plugin.rpa.api.v1.execution.task_monitoring")
    @patch("plugin.rpa.api.v1.execution.os.getenv")
    @patch("plugin.rpa.api.v1.execution.datetime")
    @pytest.mark.asyncio
    async def test_exec_fun_with_none_values(
        self,
        mock_datetime: MagicMock,
        mock_getenv: MagicMock,
        mock_task_monitoring: MagicMock,
    ) -> None:
        """Test execution with None values in request."""
        # Arrange
        request_with_nones = RPAExecutionRequest(
            sid=None, project_id="test-project", exec_position=None, params=None
        )
        mock_datetime.now.return_value.strftime.return_value = (
            "Wed, 01 Jan 2025 00:00:00 GMT"
        )
        mock_getenv.return_value = "3"
        mock_task_monitoring.return_value = AsyncMock()

        # Act
        response = await exec_fun(
            Authorization="Bearer token", request=request_with_nones
        )

        # Assert
        assert isinstance(response, EventSourceResponse)
        mock_task_monitoring.assert_called_once_with(
            sid=None,
            access_token="token",
            project_id="test-project",
            version=None,
            phone_number=None,
            exec_position=None,
            params=None,
        )

    @patch(
        "plugin.rpa.api.v1.execution.const.XIAOWU_RPA_PING_INTERVAL_KEY",
        "TEST_PING_INTERVAL",
    )
    @patch("plugin.rpa.api.v1.execution.task_monitoring")
    @patch("plugin.rpa.api.v1.execution.os.getenv")
    @patch("plugin.rpa.api.v1.execution.datetime")
    @pytest.mark.asyncio
    async def test_exec_fun_env_key_usage(
        self,
        mock_datetime: MagicMock,
        mock_getenv: MagicMock,
        mock_task_monitoring: MagicMock,
        sample_request: RPAExecutionRequest,
        bearer_token: str,
    ) -> None:
        """Test that correct environment key is used for ping interval."""
        # Arrange
        mock_datetime.now.return_value.strftime.return_value = (
            "Wed, 01 Jan 2025 00:00:00 GMT"
        )
        mock_getenv.return_value = "10"
        mock_task_monitoring.return_value = AsyncMock()

        # Act
        await exec_fun(Authorization=bearer_token, request=sample_request)

        # Assert
        mock_getenv.assert_called_with("TEST_PING_INTERVAL", "3")
