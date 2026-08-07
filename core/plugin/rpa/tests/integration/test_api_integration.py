"""Integration tests for RPA API endpoints.

This module contains integration tests that verify the interaction between
different API components and the complete request-response flow.
"""

import json
from typing import Any, AsyncGenerator, Dict
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from plugin.rpa.api.app import rpa_server_app
from plugin.rpa.api.schemas.execution_schema import RPAExecutionRequest
from plugin.rpa.errors.error_code import ErrorCode


class TestRPAAPIIntegration:
    """Integration test class for RPA API functionality."""

    @pytest.fixture
    def test_client(self) -> TestClient:
        """Fixture providing a test client for the FastAPI application."""
        app = rpa_server_app()
        return TestClient(app)

    @pytest.fixture
    def auth_headers(self) -> Dict[str, str]:
        """Fixture providing authentication headers."""
        return {"Authorization": "Bearer test-token-123"}

    @pytest.fixture
    def valid_request_payload(self) -> Dict[str, Any]:
        """Fixture providing a valid RPA execution request payload."""
        return {
            "sid": "integration-test-sid",
            "project_id": "integration-test-project",
            "exec_position": "EXECUTOR",
            "params": {"test_param": "test_value"},
        }

    def test_health_check_endpoint(self, test_client: TestClient) -> None:
        """Test the health check endpoint integration."""
        # Act
        response = test_client.get("/rpa/v1/ping")

        # Assert
        assert response.status_code == 200
        assert response.text == '"pong"'  # FastAPI returns JSON string

    @patch("plugin.rpa.api.v1.execution.task_monitoring")
    def test_execution_endpoint_integration_success(
        self,
        mock_task_monitoring: MagicMock,
        test_client: TestClient,
        auth_headers: Dict[str, str],
        valid_request_payload: Dict[str, Any],
    ) -> None:
        """Test successful execution endpoint integration."""

        # Arrange
        async def mock_generator() -> AsyncGenerator[str, None]:
            """Mock async generator for task monitoring."""
            success_response = {
                "code": ErrorCode.SUCCESS.code,
                "message": ErrorCode.SUCCESS.message,
                "sid": "integration-test-sid",
                "data": {"result": "completed"},
            }
            yield json.dumps(success_response)

        mock_task_monitoring.return_value = mock_generator()

        # Act
        response = test_client.post(
            "/rpa/v1/exec", json=valid_request_payload, headers=auth_headers
        )

        # Assert
        assert response.status_code == 200
        assert "text/event-stream" in response.headers.get("content-type", "")

        # Verify task_monitoring was called with correct parameters
        mock_task_monitoring.assert_called_once()
        call_args = mock_task_monitoring.call_args[1]
        assert call_args["access_token"] == "test-token-123"
        assert call_args["project_id"] == "integration-test-project"
        assert call_args["sid"] == "integration-test-sid"

    def test_execution_endpoint_missing_authorization(
        self, test_client: TestClient, valid_request_payload: Dict[str, Any]
    ) -> None:
        """Test execution endpoint without authorization header."""
        # Act
        response = test_client.post("/rpa/v1/exec", json=valid_request_payload)

        # Assert
        assert (
            response.status_code == 422
        )  # Unprocessable Entity due to missing required header

    def test_execution_endpoint_invalid_request_body(
        self, test_client: TestClient, auth_headers: Dict[str, str]
    ) -> None:
        """Test execution endpoint with invalid request body."""
        # Arrange
        invalid_payload = {
            "sid": "test-sid"
            # Missing required project_id
        }

        # Act
        response = test_client.post(
            "/rpa/v1/exec", json=invalid_payload, headers=auth_headers
        )

        # Assert
        assert response.status_code == 422  # Validation error

    @patch("plugin.rpa.api.v1.execution.task_monitoring")
    def test_execution_endpoint_task_monitoring_error(
        self,
        mock_task_monitoring: MagicMock,
        test_client: TestClient,
        auth_headers: Dict[str, str],
        valid_request_payload: Dict[str, Any],
    ) -> None:
        """Test execution endpoint when task monitoring raises an error."""
        # Arrange
        mock_task_monitoring.side_effect = ValueError("Task monitoring failed")

        # Act
        response = test_client.post(
            "/rpa/v1/exec", json=valid_request_payload, headers=auth_headers
        )

        # Assert
        assert response.status_code == 500
        assert "Task monitoring failed" in response.json()["detail"]

    def test_api_router_prefix_integration(self, test_client: TestClient) -> None:
        """Test that API router prefix is correctly applied."""
        # Test that endpoints are available under /rpa/v1 prefix

        # Health check should be available
        response = test_client.get("/rpa/v1/ping")
        assert response.status_code == 200

        # Endpoints should not be available without prefix
        response = test_client.get("/ping")
        assert response.status_code == 404

    @patch("plugin.rpa.api.v1.execution.task_monitoring")
    def test_execution_endpoint_bearer_token_handling(
        self,
        mock_task_monitoring: MagicMock,
        test_client: TestClient,
        valid_request_payload: Dict[str, Any],
    ) -> None:
        """Test execution endpoint correctly handles Bearer token format."""

        # Arrange
        async def mock_generator() -> AsyncGenerator[str, None]:
            yield json.dumps({"code": 0, "message": "Success"})

        mock_task_monitoring.return_value = mock_generator()

        # Test with Bearer prefix
        bearer_headers = {"Authorization": "Bearer test-token-456"}
        response = test_client.post(
            "/rpa/v1/exec", json=valid_request_payload, headers=bearer_headers
        )

        assert response.status_code == 200
        call_args = mock_task_monitoring.call_args[1]
        assert call_args["access_token"] == "test-token-456"

        # Test without Bearer prefix
        plain_headers = {"Authorization": "plain-token-789"}
        response = test_client.post(
            "/rpa/v1/exec", json=valid_request_payload, headers=plain_headers
        )

        assert response.status_code == 200
        call_args = mock_task_monitoring.call_args[1]
        assert call_args["access_token"] == "plain-token-789"


class TestRPASchemaIntegration:
    """Integration test class for RPA schema validation."""

    @pytest.fixture
    def test_client(self) -> TestClient:
        """Fixture providing a test client for the FastAPI application."""
        app = rpa_server_app()
        return TestClient(app)

    @patch("plugin.rpa.api.v1.execution.task_monitoring")
    def test_request_schema_validation_integration(
        self, mock_task_monitoring: MagicMock, test_client: TestClient
    ) -> None:
        """Test request schema validation through the API."""

        # Arrange - mock task_monitoring to avoid dependency issues
        async def mock_generator() -> AsyncGenerator[str, None]:
            yield json.dumps({"code": 0, "message": "Success"})

        mock_task_monitoring.return_value = mock_generator()

        # Test valid request
        valid_request = {
            "project_id": "test-project",
            "exec_position": "CUSTOM_EXECUTOR",
            "params": {"complex": {"nested": "data"}},
        }

        response = test_client.post(
            "/rpa/v1/exec",
            json=valid_request,
            headers={"Authorization": "Bearer test-token"},
        )

        # Should not fail due to schema validation (might fail for other reasons)
        assert response.status_code != 422

        # Test invalid request - missing required field
        invalid_request = {
            "exec_position": "EXECUTOR"
            # Missing project_id
        }

        response = test_client.post(
            "/rpa/v1/exec",
            json=invalid_request,
            headers={"Authorization": "Bearer test-token"},
        )

        assert response.status_code == 422
        error_detail = response.json()
        assert "project_id" in str(error_detail)

    def test_request_schema_default_values_integration(
        self, test_client: TestClient
    ) -> None:
        """Test that schema default values work through the API."""
        # Arrange - minimal request with only required field
        minimal_request = {"project_id": "minimal-test-project"}

        with patch("plugin.rpa.api.v1.execution.task_monitoring") as mock_monitoring:

            async def mock_generator() -> AsyncGenerator[str, None]:
                yield json.dumps({"code": 0, "message": "Success"})

            mock_monitoring.return_value = mock_generator()

            # Act
            response = test_client.post(
                "/rpa/v1/exec",
                json=minimal_request,
                headers={"Authorization": "Bearer test-token"},
            )

            # Assert
            assert response.status_code == 200

            # Verify default values were applied
            call_args = mock_monitoring.call_args[1]
            assert call_args["sid"] == ""  # Default value
            assert call_args["version"] is None  # Default value
            assert call_args["exec_position"] == "EXECUTOR"  # Default value
            assert call_args["params"] is None  # Default value


class TestEndToEndIntegration:
    """End-to-end integration tests for complete request flows."""

    @pytest.fixture
    def test_client(self) -> TestClient:
        """Fixture providing a test client for the FastAPI application."""
        app = rpa_server_app()
        return TestClient(app)

    @pytest.fixture
    def mock_span_and_trace(self) -> Dict[str, MagicMock]:
        """Fixture providing mock span and trace objects."""
        mock_span = MagicMock()
        mock_span.sid = "test-span-sid"
        mock_node_trace = MagicMock()
        return {"span": mock_span, "node_trace": mock_node_trace}

    @patch("plugin.rpa.service.xiaowu.process.create_task")
    @patch("plugin.rpa.service.xiaowu.process.query_task_status")
    @patch("plugin.rpa.service.xiaowu.process.setup_span_and_trace")
    @patch("plugin.rpa.service.xiaowu.process.setup_logging_and_metrics")
    @patch("plugin.rpa.service.xiaowu.process.otlp_handle")
    def test_complete_successful_execution_flow(
        self,
        mock_otlp_handle: MagicMock,
        mock_setup_logging: MagicMock,
        mock_setup_span: MagicMock,
        mock_query_status: MagicMock,
        mock_create_task: MagicMock,
        test_client: TestClient,
        mock_span_and_trace: Dict[str, MagicMock],
    ) -> None:
        """Test complete successful execution flow from API to task completion."""
        # Arrange
        mock_create_task.return_value = "test-task-id-123"
        mock_query_status.return_value = (
            ErrorCode.SUCCESS.code,
            ErrorCode.SUCCESS.message,
            {"output": "Task completed successfully"},
        )

        mock_setup_span.return_value = (
            mock_span_and_trace["span"],
            mock_span_and_trace["node_trace"],
        )
        mock_setup_logging.return_value = MagicMock()

        request_payload = {
            "sid": "e2e-test-sid",
            "project_id": "e2e-test-project",
            "exec_position": "EXECUTOR",
            "params": {"test_data": "e2e_value"},
        }

        # Act
        response = test_client.post(
            "/rpa/v1/exec",
            json=request_payload,
            headers={"Authorization": "Bearer e2e-test-token"},
        )

        # Assert
        assert response.status_code == 200
        assert "text/event-stream" in response.headers.get("content-type", "")

        # Verify the complete flow was executed
        mock_create_task.assert_called_once_with(
            access_token="e2e-test-token",
            project_id="e2e-test-project",
            version=None,
            phone_number=None,
            exec_position="EXECUTOR",
            params={"test_data": "e2e_value"},
        )

        # Note: In a real integration test, we would need to handle the streaming response
        # For this test, we verify that the endpoint was called correctly

    def test_api_error_handling_integration(self, test_client: TestClient) -> None:
        """Test API error handling integration across different error scenarios."""
        # Test 404 for non-existent endpoint
        response = test_client.get("/rpa/v1/nonexistent")
        assert response.status_code == 404

        # Test 405 for wrong HTTP method
        response = test_client.get("/rpa/v1/exec")  # Should be POST
        assert response.status_code == 405

        # Test 422 for validation errors
        response = test_client.post(
            "/rpa/v1/exec",
            json={"invalid": "data"},
            headers={"Authorization": "Bearer token"},
        )
        assert response.status_code == 422
