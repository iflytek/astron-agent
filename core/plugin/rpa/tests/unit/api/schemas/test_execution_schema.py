"""Unit tests for RPA execution schemas.

This module contains comprehensive tests for the RPAExecutionRequest and
RPAExecutionResponse Pydantic models including validation and serialization.
"""

from typing import Any, Dict

import pytest
from plugin.rpa.api.schemas.execution_schema import (
    RPAExecutionRequest,
    RPAExecutionResponse,
)
from pydantic import ValidationError


class TestRPAExecutionRequest:
    """Test class for RPAExecutionRequest schema."""

    def test_rpa_execution_request_creation_with_all_fields(self) -> None:
        """Test creating RPAExecutionRequest with all fields provided."""
        # Arrange
        sid = "test-sid-123"
        project_id = "test-project-456"
        exec_position = "EXECUTOR"
        params = {"key1": "value1", "key2": "value2"}

        # Act
        request = RPAExecutionRequest(
            sid=sid, project_id=project_id, exec_position=exec_position, params=params
        )

        # Assert
        assert request.sid == sid
        assert request.project_id == project_id
        assert request.exec_position == exec_position
        assert request.params == params

    def test_rpa_execution_request_creation_with_required_fields_only(self) -> None:
        """Test creating RPAExecutionRequest with only required fields."""
        # Arrange
        project_id = "test-project-789"

        # Act
        request = RPAExecutionRequest(project_id=project_id)

        # Assert
        assert request.sid == ""  # Default value
        assert request.project_id == project_id
        assert request.exec_position == "EXECUTOR"  # Default value
        assert request.params is None  # Default value

    def test_rpa_execution_request_missing_required_field(self) -> None:
        """Test validation error when required project_id is missing."""
        # Act & Assert
        with pytest.raises(ValidationError) as exc_info:
            RPAExecutionRequest()  # type: ignore[call-arg]

        # Verify that project_id is in the error
        error_details = exc_info.value.errors()
        assert any(error["loc"] == ("project_id",) for error in error_details)
        assert any("missing" in error["type"] for error in error_details)

    def test_rpa_execution_request_default_values(self) -> None:
        """Test that default values are applied correctly."""
        # Act
        request = RPAExecutionRequest(project_id="test-project")

        # Assert
        assert request.sid == ""
        assert request.exec_position == "EXECUTOR"
        assert request.params is None

    def test_rpa_execution_request_with_none_sid(self) -> None:
        """Test RPAExecutionRequest with None sid value."""
        # Act
        request = RPAExecutionRequest(project_id="test-project", sid=None)

        # Assert
        assert request.sid is None
        assert request.project_id == "test-project"

    def test_rpa_execution_request_with_complex_params(self) -> None:
        """Test RPAExecutionRequest with complex params structure."""
        # Arrange
        complex_params = {
            "nested_dict": {"inner_key": "inner_value"},
            "list_data": [1, 2, 3, "string"],
            "boolean_flag": True,
            "numeric_value": 42.5,
        }

        # Act
        request = RPAExecutionRequest(project_id="test-project", params=complex_params)

        # Assert
        assert request.params == complex_params
        assert isinstance(request.params["nested_dict"], dict)
        assert isinstance(request.params["list_data"], list)

    def test_rpa_execution_request_serialization(self) -> None:
        """Test RPAExecutionRequest model serialization."""
        # Arrange
        request = RPAExecutionRequest(
            sid="test-sid",
            project_id="test-project",
            exec_position="CUSTOM_EXECUTOR",
            params={"test_key": "test_value"},
        )

        # Act
        serialized = request.model_dump()

        # Assert
        expected = {
            "sid": "test-sid",
            "project_id": "test-project",
            "version": None,
            "phone_number": None,
            "exec_position": "CUSTOM_EXECUTOR",
            "params": {"test_key": "test_value"},
        }
        assert serialized == expected

    def test_rpa_execution_request_json_serialization(self) -> None:
        """Test RPAExecutionRequest JSON serialization."""
        # Arrange
        request = RPAExecutionRequest(
            project_id="test-project", params={"key": "value"}
        )

        # Act
        json_str = request.model_dump_json()

        # Assert
        assert isinstance(json_str, str)
        assert "test-project" in json_str
        assert "key" in json_str
        assert "value" in json_str


class TestRPAExecutionResponse:
    """Test class for RPAExecutionResponse schema."""

    def test_rpa_execution_response_creation_with_all_fields(self) -> None:
        """Test creating RPAExecutionResponse with all fields provided."""
        # Arrange
        code = 200
        message = "Success"
        sid = "response-sid-123"
        data = {"result": "completed", "output": "task finished"}

        # Act
        response = RPAExecutionResponse(code=code, message=message, sid=sid, data=data)

        # Assert
        assert response.code == code
        assert response.message == message
        assert response.sid == sid
        assert response.data == data

    def test_rpa_execution_response_creation_with_required_fields_only(self) -> None:
        """Test creating RPAExecutionResponse with only required fields."""
        # Arrange
        code = 500
        message = "Internal Server Error"

        # Act
        response = RPAExecutionResponse(code=code, message=message)

        # Assert
        assert response.code == code
        assert response.message == message
        assert response.sid == ""  # Default value
        assert response.data is None  # Default value

    def test_rpa_execution_response_missing_required_fields(self) -> None:
        """Test validation error when required fields are missing."""
        # Test missing code
        with pytest.raises(ValidationError) as exc_info:
            RPAExecutionResponse(message="test message")  # type: ignore[call-arg]

        error_details = exc_info.value.errors()
        assert any(error["loc"] == ("code",) for error in error_details)

        # Test missing message
        with pytest.raises(ValidationError) as exc_info:
            RPAExecutionResponse(code=200)  # type: ignore[call-arg]

        error_details = exc_info.value.errors()
        assert any(error["loc"] == ("message",) for error in error_details)

    def test_rpa_execution_response_code_type_validation(self) -> None:
        """Test that code field accepts integer values."""
        # Act
        response = RPAExecutionResponse(code=404, message="Not Found")

        # Assert
        assert response.code == 404
        assert isinstance(response.code, int)

        # Test with string that can be converted to int
        response2 = RPAExecutionResponse(code="500", message="Server Error")  # type: ignore[arg-type]
        assert response2.code == 500
        assert isinstance(response2.code, int)

    def test_rpa_execution_response_with_complex_data(self) -> None:
        """Test RPAExecutionResponse with complex data structure."""
        # Arrange
        complex_data = {
            "execution_details": {
                "start_time": "2025-01-01T00:00:00Z",
                "end_time": "2025-01-01T00:05:00Z",
                "duration": 300,
            },
            "results": [
                {"step": 1, "status": "completed"},
                {"step": 2, "status": "completed"},
            ],
            "metadata": {"version": "1.0.0", "environment": "production"},
        }

        # Act
        response = RPAExecutionResponse(
            code=0, message="Task completed successfully", data=complex_data
        )

        # Assert
        assert response.data == complex_data
        assert response.data["execution_details"]["duration"] == 300
        assert len(response.data["results"]) == 2

    def test_rpa_execution_response_serialization(self) -> None:
        """Test RPAExecutionResponse model serialization."""
        # Arrange
        response = RPAExecutionResponse(
            code=200, message="Success", sid="test-sid", data={"key": "value"}
        )

        # Act
        serialized = response.model_dump()

        # Assert
        expected = {
            "code": 200,
            "message": "Success",
            "sid": "test-sid",
            "data": {"key": "value"},
        }
        assert serialized == expected

    def test_rpa_execution_response_json_serialization(self) -> None:
        """Test RPAExecutionResponse JSON serialization."""
        # Arrange
        response = RPAExecutionResponse(
            code=0, message="Operation successful", data={"status": "completed"}
        )

        # Act
        json_str = response.model_dump_json()

        # Assert
        assert isinstance(json_str, str)
        assert "Operation successful" in json_str
        assert "completed" in json_str
        assert "0" in json_str

    def test_rpa_execution_response_error_case(self) -> None:
        """Test RPAExecutionResponse for error scenarios."""
        # Arrange
        error_response = RPAExecutionResponse(
            code=55001, message="Create task error", sid="error-sid-456", data=None
        )

        # Assert
        assert error_response.code == 55001
        assert "error" in error_response.message.lower()
        assert error_response.data is None

    def test_rpa_execution_response_with_none_values(self) -> None:
        """Test RPAExecutionResponse with None values for optional fields."""
        # Act
        response = RPAExecutionResponse(code=200, message="OK", sid=None, data=None)

        # Assert
        assert response.code == 200
        assert response.message == "OK"
        assert response.sid is None
        assert response.data is None
