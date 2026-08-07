"""
Unit tests for API schema modules - Fixed version
Tests request/response schemas and validation with correct structure
"""

import pytest
from plugin.link.api.schemas.community.tools.http.management_schema import (
    CreateInfo,
    ToolCreatePayload,
    ToolCreateRequest,
    ToolManagerHeader,
    ToolManagerResponse,
    ToolUpdateRequest,
    UpdateInfo,
)
from pydantic import ValidationError


@pytest.mark.unit
class TestManagementSchemas:
    """Test class for management schema validation"""

    def test_tool_manager_header_valid(self) -> None:
        """Test ToolManagerHeader with valid data"""
        header_data = {"app_id": "test_app_123"}
        header = ToolManagerHeader(**header_data)
        assert header.app_id == "test_app_123"

    def test_create_info_valid(self) -> None:
        """Test CreateInfo with valid data"""
        create_data = {
            "name": "test_tool",
            "description": "A test tool",
            "schema_type": 1,
            "openapi_schema": '{"openapi": "3.0.0"}',
        }
        create_info = CreateInfo(**create_data)
        assert create_info.name == "test_tool"
        assert create_info.description == "A test tool"

    def test_update_info_valid(self) -> None:
        """Test UpdateInfo with valid data"""
        update_data = {
            "id": "tool_123",
            "name": "updated_tool",
            "version": "2.0.0",
            "description": "Updated description",
        }
        update_info = UpdateInfo(**update_data)
        assert update_info.id == "tool_123"
        assert update_info.name == "updated_tool"

    def test_tool_create_request_valid(self) -> None:
        """Test ToolCreateRequest with valid data"""
        valid_data = {
            "header": {"app_id": "test_app_123"},
            "payload": {
                "tools": [
                    {
                        "name": "test_tool",
                        "description": "A test tool for unit testing",
                        "openapi_schema": '{"openapi": "3.0.0"}',
                        "schema_type": 1,
                    }
                ]
            },
        }

        request = ToolCreateRequest(**valid_data)

        assert request.header.app_id == "test_app_123"
        assert request.payload.tools[0].name == "test_tool"
        assert request.payload.tools[0].description == "A test tool for unit testing"

    def test_tool_create_request_missing_header(self) -> None:
        """Test ToolCreateRequest validation with missing header"""
        invalid_data = {"payload": {"tools": [{"name": "test_tool"}]}}

        with pytest.raises(ValidationError) as exc_info:
            ToolCreateRequest(**invalid_data)

        errors = exc_info.value.errors()
        field_names = [error["loc"][0] for error in errors]
        assert "header" in field_names

    def test_tool_create_request_missing_payload(self) -> None:
        """Test ToolCreateRequest validation with missing payload"""
        invalid_data = {"header": {"app_id": "test_app"}}

        with pytest.raises(ValidationError) as exc_info:
            ToolCreateRequest(**invalid_data)

        errors = exc_info.value.errors()
        field_names = [error["loc"][0] for error in errors]
        assert "payload" in field_names

    def test_tool_update_request_valid(self) -> None:
        """Test ToolUpdateRequest with valid data"""
        valid_data = {
            "header": {"app_id": "test_app_123"},
            "payload": {
                "tools": [
                    {
                        "id": "tool_12345",
                        "name": "updated_tool",
                        "description": "An updated test tool",
                        "version": "2.0.0",
                    }
                ]
            },
        }

        request = ToolUpdateRequest(**valid_data)

        assert request.header.app_id == "test_app_123"
        assert request.payload.tools[0].id == "tool_12345"
        assert request.payload.tools[0].name == "updated_tool"

    def test_tool_manager_response_success(self) -> None:
        """Test ToolManagerResponse with successful response"""
        success_data = {
            "code": 0,
            "message": "Success",
            "sid": "session_12345",
            "data": {
                "tool_id": "tool_67890",
                "name": "created_tool",
                "status": "active",
            },
        }

        response = ToolManagerResponse(**success_data)

        assert response.code == 0
        assert response.message == "Success"
        assert response.sid == "session_12345"
        assert response.data["tool_id"] == "tool_67890"

    def test_tool_manager_response_error(self) -> None:
        """Test ToolManagerResponse with error response"""
        error_data = {
            "code": 30201,
            "message": "Protocol validation failed",
            "sid": "session_12345",
            "data": {},
        }

        response = ToolManagerResponse(**error_data)

        assert response.code == 30201
        assert response.message == "Protocol validation failed"
        assert response.sid == "session_12345"
        assert response.data == {}

    def test_tool_manager_response_minimal(self) -> None:
        """Test ToolManagerResponse with minimal required fields"""
        minimal_data = {"code": 0, "message": "Success", "sid": "session_123"}

        response = ToolManagerResponse(**minimal_data)

        assert response.code == 0
        assert response.message == "Success"
        assert response.sid == "session_123"
        assert response.data is None  # Optional field

    def test_schema_serialization(self) -> None:
        """Test schema serialization to dict"""
        create_request = ToolCreateRequest(
            header=ToolManagerHeader(app_id="test_app"),
            payload=ToolCreatePayload(
                tools=[
                    CreateInfo(
                        name="test_tool", description="Test description", schema_type=1
                    )
                ]
            ),
        )

        serialized = create_request.dict()

        assert isinstance(serialized, dict)
        assert serialized["header"]["app_id"] == "test_app"
        assert serialized["payload"]["tools"][0]["name"] == "test_tool"

    def test_schema_json_serialization(self) -> None:
        """Test schema JSON serialization"""
        response = ToolManagerResponse(
            code=0, message="Success", sid="test_session", data={"key": "value"}
        )

        json_str = response.json()

        assert isinstance(json_str, str)
        assert "Success" in json_str
        assert "test_session" in json_str
        assert "key" in json_str

    def test_optional_fields_behavior(self) -> None:
        """Test behavior of optional fields in schemas"""
        # Test CreateInfo with minimal data
        minimal_create = CreateInfo()
        assert minimal_create.name is None
        assert minimal_create.description is None
        assert minimal_create.schema_type is None
        assert minimal_create.openapi_schema is None

        # Test UpdateInfo with partial data
        partial_update = UpdateInfo(id="tool_123", name="new_name")
        assert partial_update.id == "tool_123"
        assert partial_update.name == "new_name"
        assert partial_update.version is None
        assert partial_update.description is None

    def test_nested_schema_structure(self) -> None:
        """Test complex nested schema structure"""
        complex_data = {
            "header": {"app_id": "complex_app_id"},
            "payload": {
                "tools": [
                    {"name": "tool1", "description": "First tool", "schema_type": 1},
                    {"name": "tool2", "description": "Second tool", "schema_type": 2},
                ]
            },
        }

        request = ToolCreateRequest(**complex_data)

        assert request.header.app_id == "complex_app_id"
        assert len(request.payload.tools) == 2
        assert request.payload.tools[0].name == "tool1"
        assert request.payload.tools[1].name == "tool2"

    def test_schema_type_validation(self) -> None:
        """Test type validation in schemas"""
        # Test invalid type for code in ToolManagerResponse
        with pytest.raises(ValidationError):
            ToolManagerResponse(
                code="not_an_integer", message="Test", sid="session"  # Should be int
            )

        # Test valid types
        valid_response = ToolManagerResponse(
            code=200, message="Valid message", sid="valid_session"
        )
        assert valid_response.code == 200
        assert isinstance(valid_response.code, int)
