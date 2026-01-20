"""Unit tests for RPA task creation and querying infrastructure.

This module contains comprehensive tests for task creation and status querying
functionality including HTTP client interactions and error handling.
"""

from typing import Generator
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from fastapi import HTTPException
from plugin.rpa.errors.error_code import ErrorCode
from plugin.rpa.exceptions.config_exceptions import InvalidConfigException
from plugin.rpa.infra.xiaowu.tasks import create_task, query_task_status


class TestCreateTask:
    """Test class for create_task function."""

    @pytest.fixture
    def mock_http_client(self) -> Generator[AsyncMock, None, None]:
        """Fixture providing mocked HTTP client."""
        with patch("plugin.rpa.infra.xiaowu.tasks.httpx.AsyncClient") as mock_client:
            mock_instance = AsyncMock()
            mock_client.return_value.__aenter__.return_value = mock_instance
            mock_client.return_value.__aexit__.return_value = None
            yield mock_instance

    @patch("plugin.rpa.infra.xiaowu.tasks.is_valid_url")
    @patch("plugin.rpa.infra.xiaowu.tasks.os.getenv")
    @pytest.mark.asyncio
    async def test_create_task_success(
        self,
        mock_getenv: MagicMock,
        mock_is_valid_url: MagicMock,
        mock_http_client: AsyncMock,
    ) -> None:
        """Test successful task creation."""
        # Arrange
        mock_getenv.return_value = "https://api.example.com/tasks"
        mock_is_valid_url.return_value = True

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "code": "0000",
            "msg": "Success",
            "data": {"executionId": "task-123"},
        }
        mock_http_client.post.return_value = mock_response

        # Act
        result = await create_task(
            access_token="test-token",
            project_id="project-123",
            version=None,
            phone_number=None,
            exec_position="EXECUTOR",
            params={"key": "value"},
        )

        # Assert
        assert result == "task-123"
        mock_http_client.post.assert_called_once_with(
            "https://api.example.com/tasks",
            headers={
                "Content-Type": "application/json",
                "Authorization": "Bearer test-token",
            },
            json={
                "project_id": "project-123",
                "exec_position": "EXECUTOR",
                "params": {"key": "value"},
            },
        )

    @patch("plugin.rpa.infra.xiaowu.tasks.is_valid_url")
    @patch("plugin.rpa.infra.xiaowu.tasks.os.getenv")
    @pytest.mark.asyncio
    async def test_create_task_invalid_url(
        self, mock_getenv: MagicMock, mock_is_valid_url: MagicMock
    ) -> None:
        """Test create_task with invalid URL."""
        # Arrange
        mock_getenv.return_value = "invalid-url"
        mock_is_valid_url.return_value = False

        # Act & Assert
        with pytest.raises(InvalidConfigException) as exc_info:
            await create_task(
                access_token="test-token",
                project_id="project-123",
                version=None,
                phone_number=None,
                exec_position="EXECUTOR",
                params={"key": "value"},
            )

        assert "Invalid task creation URL" in str(exc_info.value)

    @patch("plugin.rpa.infra.xiaowu.tasks.is_valid_url")
    @patch("plugin.rpa.infra.xiaowu.tasks.os.getenv")
    @pytest.mark.asyncio
    async def test_create_task_api_error_response(
        self,
        mock_getenv: MagicMock,
        mock_is_valid_url: MagicMock,
        mock_http_client: AsyncMock,
    ) -> None:
        """Test create_task with API error response."""
        # Arrange
        mock_getenv.return_value = "https://api.example.com/tasks"
        mock_is_valid_url.return_value = True

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "code": "5001",
            "msg": "Invalid project ID",
            "data": None,
        }
        mock_http_client.post.return_value = mock_response

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await create_task(
                access_token="test-token",
                project_id="invalid-project",
                version=None,
                phone_number=None,
                exec_position="EXECUTOR",
                params={},
            )

        assert exc_info.value.status_code == 500
        assert "Task creation failed" in str(exc_info.value.detail)

    @patch("plugin.rpa.infra.xiaowu.tasks.is_valid_url")
    @patch("plugin.rpa.infra.xiaowu.tasks.os.getenv")
    @pytest.mark.asyncio
    async def test_create_task_missing_execution_id(
        self,
        mock_getenv: MagicMock,
        mock_is_valid_url: MagicMock,
        mock_http_client: AsyncMock,
    ) -> None:
        """Test create_task when executionId is missing from response."""
        # Arrange
        mock_getenv.return_value = "https://api.example.com/tasks"
        mock_is_valid_url.return_value = True

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "code": "0000",
            "msg": "Success",
            "data": {},  # Missing executionId
        }
        mock_http_client.post.return_value = mock_response

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await create_task(
                access_token="test-token",
                project_id="project-123",
                version=None,
                phone_number=None,
                exec_position="EXECUTOR",
                params={},
            )

        assert exc_info.value.status_code == 500
        assert "Task creation failed" in str(exc_info.value.detail)

    @patch("plugin.rpa.infra.xiaowu.tasks.is_valid_url")
    @patch("plugin.rpa.infra.xiaowu.tasks.os.getenv")
    @pytest.mark.asyncio
    async def test_create_task_http_status_error(
        self,
        mock_getenv: MagicMock,
        mock_is_valid_url: MagicMock,
        mock_http_client: AsyncMock,
    ) -> None:
        """Test create_task with HTTP status error."""
        # Arrange
        mock_getenv.return_value = "https://api.example.com/tasks"
        mock_is_valid_url.return_value = True

        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_response.text = "Not Found"
        error = httpx.HTTPStatusError(
            "404", request=MagicMock(), response=mock_response
        )
        mock_http_client.post.side_effect = error

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await create_task(
                access_token="test-token",
                project_id="project-123",
                version=None,
                phone_number=None,
                exec_position="EXECUTOR",
                params={},
            )

        assert exc_info.value.status_code == 404
        assert "Task creation failed" in str(exc_info.value.detail)

    @patch("plugin.rpa.infra.xiaowu.tasks.is_valid_url")
    @patch("plugin.rpa.infra.xiaowu.tasks.os.getenv")
    @pytest.mark.asyncio
    async def test_create_task_request_error(
        self,
        mock_getenv: MagicMock,
        mock_is_valid_url: MagicMock,
        mock_http_client: AsyncMock,
    ) -> None:
        """Test create_task with request error."""
        # Arrange
        mock_getenv.return_value = "https://api.example.com/tasks"
        mock_is_valid_url.return_value = True

        error = httpx.RequestError("Connection failed")
        mock_http_client.post.side_effect = error

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await create_task(
                access_token="test-token",
                project_id="project-123",
                version=None,
                phone_number=None,
                exec_position="EXECUTOR",
                params={},
            )

        assert exc_info.value.status_code == 500
        assert "Connection failed" in str(exc_info.value.detail)

    @patch("plugin.rpa.infra.xiaowu.tasks.is_valid_url")
    @patch("plugin.rpa.infra.xiaowu.tasks.os.getenv")
    @pytest.mark.asyncio
    async def test_create_task_with_none_values(
        self,
        mock_getenv: MagicMock,
        mock_is_valid_url: MagicMock,
        mock_http_client: AsyncMock,
    ) -> None:
        """Test create_task with None values for optional parameters."""
        # Arrange
        mock_getenv.return_value = "https://api.example.com/tasks"
        mock_is_valid_url.return_value = True

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "code": "0000",
            "msg": "Success",
            "data": {"executionId": "task-456"},
        }
        mock_http_client.post.return_value = mock_response

        # Act
        result = await create_task(
            access_token="test-token",
            project_id="project-123",
            version=None,
            phone_number=None,
            exec_position=None,
            params=None,
        )

        # Assert
        assert result == "task-456"
        mock_http_client.post.assert_called_once_with(
            "https://api.example.com/tasks",
            headers={
                "Content-Type": "application/json",
                "Authorization": "Bearer test-token",
            },
            json={"project_id": "project-123", "exec_position": None, "params": None},
        )


class TestQueryTaskStatus:
    """Test class for query_task_status function."""

    @pytest.fixture
    def mock_http_client(self) -> Generator[AsyncMock, None, None]:
        """Fixture providing mocked HTTP client."""
        with patch("plugin.rpa.infra.xiaowu.tasks.httpx.AsyncClient") as mock_client:
            mock_instance = AsyncMock()
            mock_client.return_value.__aenter__.return_value = mock_instance
            mock_client.return_value.__aexit__.return_value = None
            yield mock_instance

    @patch("plugin.rpa.infra.xiaowu.tasks.is_valid_url")
    @patch("plugin.rpa.infra.xiaowu.tasks.os.getenv")
    @pytest.mark.asyncio
    async def test_query_task_status_completed(
        self,
        mock_getenv: MagicMock,
        mock_is_valid_url: MagicMock,
        mock_http_client: AsyncMock,
    ) -> None:
        """Test querying task status for completed task."""
        # Arrange
        mock_getenv.return_value = "https://api.example.com/tasks"
        mock_is_valid_url.return_value = True

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "code": "0000",
            "msg": "Success",
            "data": {
                "execution": {
                    "status": "COMPLETED",
                    "result": {
                        "code": "0000",
                        "msg": "task completed",
                        "data": {"output": "task completed"},
                    },
                }
            },
        }
        mock_http_client.get.return_value = mock_response

        # Act
        result = await query_task_status("test-token", "task-123")

        # Assert
        assert result == (
            ErrorCode.SUCCESS.code,
            "Success: 0000-task completed",
            {"output": "task completed"},
        )
        mock_http_client.get.assert_called_once_with(
            url="https://api.example.com/tasks/task-123",
            headers={"Authorization": "Bearer test-token"},
        )

    @patch("plugin.rpa.infra.xiaowu.tasks.is_valid_url")
    @patch("plugin.rpa.infra.xiaowu.tasks.os.getenv")
    @pytest.mark.asyncio
    async def test_query_task_status_failed(
        self,
        mock_getenv: MagicMock,
        mock_is_valid_url: MagicMock,
        mock_http_client: AsyncMock,
    ) -> None:
        """Test querying task status for failed task."""
        # Arrange
        mock_getenv.return_value = "https://api.example.com/tasks"
        mock_is_valid_url.return_value = True

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "code": "0000",
            "msg": "Success",
            "data": {
                "execution": {"status": "FAILED", "error": "Task execution failed"}
            },
        }
        mock_http_client.get.return_value = mock_response

        # Act
        result = await query_task_status("test-token", "task-123")

        # Assert
        expected_message = (
            f"{ErrorCode.TASK_EXEC_FAILED.message}: Task execution failed"
        )
        assert result == (ErrorCode.TASK_EXEC_FAILED.code, expected_message, {})

    @patch("plugin.rpa.infra.xiaowu.tasks.is_valid_url")
    @patch("plugin.rpa.infra.xiaowu.tasks.os.getenv")
    @pytest.mark.asyncio
    async def test_query_task_status_pending(
        self,
        mock_getenv: MagicMock,
        mock_is_valid_url: MagicMock,
        mock_http_client: AsyncMock,
    ) -> None:
        """Test querying task status for pending task."""
        # Arrange
        mock_getenv.return_value = "https://api.example.com/tasks"
        mock_is_valid_url.return_value = True

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "code": "0000",
            "msg": "Success",
            "data": {"execution": {"status": "PENDING"}},
        }
        mock_http_client.get.return_value = mock_response

        # Act
        result = await query_task_status("test-token", "task-123")

        # Assert
        assert result is None

    @patch("plugin.rpa.infra.xiaowu.tasks.is_valid_url")
    @patch("plugin.rpa.infra.xiaowu.tasks.os.getenv")
    @pytest.mark.asyncio
    async def test_query_task_status_invalid_url(
        self, mock_getenv: MagicMock, mock_is_valid_url: MagicMock
    ) -> None:
        """Test query_task_status with invalid URL."""
        # Arrange
        mock_getenv.return_value = "invalid-url"
        mock_is_valid_url.return_value = False

        # Act & Assert
        with pytest.raises(InvalidConfigException) as exc_info:
            await query_task_status("test-token", "task-123")

        assert "Invalid task query URL" in str(exc_info.value)

    @patch("plugin.rpa.infra.xiaowu.tasks.is_valid_url")
    @patch("plugin.rpa.infra.xiaowu.tasks.os.getenv")
    @pytest.mark.asyncio
    async def test_query_task_status_api_error(
        self,
        mock_getenv: MagicMock,
        mock_is_valid_url: MagicMock,
        mock_http_client: AsyncMock,
    ) -> None:
        """Test query_task_status with API error response."""
        # Arrange
        mock_getenv.return_value = "https://api.example.com/tasks"
        mock_is_valid_url.return_value = True

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "code": "5002",
            "msg": "Task not found",
            "data": None,
        }
        mock_http_client.get.return_value = mock_response

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await query_task_status("test-token", "task-123")

        assert exc_info.value.status_code == 500
        assert "Task status query failed" in str(exc_info.value.detail)

    @patch("plugin.rpa.infra.xiaowu.tasks.is_valid_url")
    @patch("plugin.rpa.infra.xiaowu.tasks.os.getenv")
    @pytest.mark.asyncio
    async def test_query_task_status_missing_execution(
        self,
        mock_getenv: MagicMock,
        mock_is_valid_url: MagicMock,
        mock_http_client: AsyncMock,
    ) -> None:
        """Test query_task_status when execution data is missing."""
        # Arrange
        mock_getenv.return_value = "https://api.example.com/tasks"
        mock_is_valid_url.return_value = True

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "code": "0000",
            "msg": "Success",
            "data": {},  # Missing execution
        }
        mock_http_client.get.return_value = mock_response

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await query_task_status("test-token", "task-123")

        assert exc_info.value.status_code == 500
        assert "Task status query failed" in str(exc_info.value.detail)

    @patch("plugin.rpa.infra.xiaowu.tasks.is_valid_url")
    @patch("plugin.rpa.infra.xiaowu.tasks.os.getenv")
    @pytest.mark.asyncio
    async def test_query_task_status_unknown_status(
        self,
        mock_getenv: MagicMock,
        mock_is_valid_url: MagicMock,
        mock_http_client: AsyncMock,
    ) -> None:
        """Test query_task_status with unknown task status."""
        # Arrange
        mock_getenv.return_value = "https://api.example.com/tasks"
        mock_is_valid_url.return_value = True

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "code": "0000",
            "msg": "Success",
            "data": {"execution": {"status": "UNKNOWN_STATUS"}},
        }
        mock_http_client.get.return_value = mock_response

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await query_task_status("test-token", "task-123")

        assert exc_info.value.status_code == 500
        assert "Unknown task status" in str(exc_info.value.detail)

    @patch("plugin.rpa.infra.xiaowu.tasks.is_valid_url")
    @patch("plugin.rpa.infra.xiaowu.tasks.os.getenv")
    @pytest.mark.asyncio
    async def test_query_task_status_request_error(
        self,
        mock_getenv: MagicMock,
        mock_is_valid_url: MagicMock,
        mock_http_client: AsyncMock,
    ) -> None:
        """Test query_task_status with request error."""
        # Arrange
        mock_getenv.return_value = "https://api.example.com/tasks"
        mock_is_valid_url.return_value = True

        error = httpx.RequestError("Connection timeout")
        mock_http_client.get.side_effect = error

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            await query_task_status("test-token", "task-123")

        assert exc_info.value.status_code == 500
        assert "Connection timeout" in str(exc_info.value.detail)
