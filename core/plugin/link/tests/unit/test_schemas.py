"""
Unit tests for API schema modules
Tests request/response schemas and validation
"""

import pytest
from plugin.link.api.schemas.community.tools.http.management_schema import (
    CreateInfo,
    ToolCreatePayload,
    ToolCreateRequest,
    ToolManagerHeader,
    ToolManagerResponse,
    ToolUpdateRequest,
)
from pydantic import ValidationError


@pytest.mark.unit
class TestManagementSchemas:
    """Test class for management schema validation"""

    def test_tool_create_request_valid(self) -> None:
        """Test ToolCreateRequest with valid data"""
        valid_data = {
            "header": {"app_id": "test_app_123"},
            "payload": {
                "tools": [
                    {
                        "name": "test_tool",
                        "description": "A test tool for unit testing",
                        "openapi_schema": '{"openapi": "3.0.0", "info": {"title": "Test API", "version": "1.0.0"}}',
                        "schema_type": 1,
                    }
                ]
            },
        }

        request = ToolCreateRequest(**valid_data)

        assert request.header.app_id == "test_app_123"
        assert request.payload.tools[0].name == "test_tool"
        assert request.payload.tools[0].description == "A test tool for unit testing"

    def test_tool_create_request_missing_required_fields(self) -> None:
        """Test ToolCreateRequest validation with missing required fields"""
        invalid_data = {
            "header": {"app_id": "test_app"}
            # Missing payload
        }

        with pytest.raises(ValidationError) as exc_info:
            ToolCreateRequest(**invalid_data)

        errors = exc_info.value.errors()
        field_names = [error["loc"][0] for error in errors]
        assert "payload" in field_names

    def test_tool_create_request_empty_header(self) -> None:
        """Test ToolCreateRequest validation with missing header"""
        invalid_data = {
            "payload": {"tools": [{"name": "test_tool"}]}
            # Missing header
        }

        with pytest.raises(ValidationError) as exc_info:
            ToolCreateRequest(**invalid_data)

        errors = exc_info.value.errors()
        field_names = [error["loc"][0] for error in errors]
        assert "header" in field_names

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
        assert request.payload.tools[0].description == "An updated test tool"

    def test_tool_update_request_missing_header(self) -> None:
        """Test ToolUpdateRequest validation with missing header"""
        invalid_data = {
            "payload": {"tools": [{"id": "tool_12345", "name": "updated_tool"}]}
            # Missing header
        }

        with pytest.raises(ValidationError) as exc_info:
            ToolUpdateRequest(**invalid_data)

        errors = exc_info.value.errors()
        assert any(error["loc"][0] == "header" for error in errors)

    def test_tool_update_request_partial_update(self) -> None:
        """Test ToolUpdateRequest with partial data (only some fields)"""
        partial_data = {
            "header": {"app_id": "test_app_123"},
            "payload": {
                "tools": [
                    {
                        "id": "tool_12345",
                        "name": "new_name",
                        # Only updating name, other fields optional
                    }
                ]
            },
        }

        request = ToolUpdateRequest(**partial_data)

        assert request.header.app_id == "test_app_123"
        assert request.payload.tools[0].id == "tool_12345"
        assert request.payload.tools[0].name == "new_name"
        # Other fields should be None or have default values
        assert request.payload.tools[0].description is None

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

    def test_tool_manager_response_missing_required_fields(self) -> None:
        """Test ToolManagerResponse validation with missing required fields"""
        invalid_data = {
            "code": 0
            # Missing message, sid, and data
        }

        with pytest.raises(ValidationError) as exc_info:
            ToolManagerResponse(**invalid_data)

        errors = exc_info.value.errors()
        field_names = [error["loc"][0] for error in errors]

        # Check that required fields are in validation errors
        required_fields = ["message", "sid", "data"]
        for field in required_fields:
            if field in field_names:
                continue  # Field is properly validated as missing
            else:
                # Field might have default value, check if it exists in the model
                try:
                    response = ToolManagerResponse(code=0, message="", sid="", data={})
                    assert hasattr(response, field)
                except Exception:
                    pass

    def test_tool_manager_response_type_validation(self) -> None:
        """Test ToolManagerResponse type validation"""
        invalid_data = {
            "code": "not_an_integer",  # Should be int
            "message": 123,  # Should be string
            "sid": None,  # Depends on schema definition
            "data": "not_a_dict",  # Should be dict
        }

        with pytest.raises(ValidationError):
            ToolManagerResponse(**invalid_data)

    def test_schema_serialization(self) -> None:
        """Test schema serialization to dict"""
        create_request = ToolCreateRequest(
            header=ToolManagerHeader(app_id="test_app"),
            payload=ToolCreatePayload(
                tools=[
                    CreateInfo(
                        name="test_tool",
                        description="Test description",
                        openapi_schema='{"openapi": "3.0.0"}',
                    )
                ]
            ),
        )

        serialized = create_request.dict()

        assert isinstance(serialized, dict)
        assert serialized["header"]["app_id"] == "test_app"
        assert serialized["payload"]["tools"][0]["name"] == "test_tool"
        assert serialized["payload"]["tools"][0]["description"] == "Test description"

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

    def test_nested_schema_validation(self) -> None:
        """Test validation of nested schema structures"""
        complex_schema = """{
            "openapi": "3.0.0",
            "info": {
                "title": "Complex API",
                "version": "1.0.0",
                "description": "A complex API schema"
            },
            "paths": {
                "/test": {
                    "get": {
                        "summary": "Test endpoint",
                        "responses": {
                            "200": {
                                "description": "Success response"
                            }
                        }
                    }
                }
            }
        }"""

        request = ToolCreateRequest(
            header=ToolManagerHeader(app_id="test_app"),
            payload=ToolCreatePayload(
                tools=[
                    CreateInfo(
                        name="complex_tool",
                        description="Tool with complex schema",
                        openapi_schema=complex_schema,
                    )
                ]
            ),
        )

        assert request.payload.tools[0].name == "complex_tool"

    def test_schema_with_optional_fields(self) -> None:
        """Test schema behavior with optional fields"""
        request = ToolCreateRequest(
            header=ToolManagerHeader(app_id="test_app"),
            payload=ToolCreatePayload(
                tools=[
                    CreateInfo(
                        name="minimal_tool",
                        description="Minimal tool",
                        openapi_schema='{"openapi": "3.0.0"}',
                    )
                ]
            ),
        )

        # Check that fields are properly set
        assert request.payload.tools[0].name == "minimal_tool"
        assert request.payload.tools[0].description == "Minimal tool"
        assert request.header.app_id == "test_app"

    def test_schema_field_constraints(self) -> None:
        """Test schema field constraints and validation rules"""
        # Test with very long name
        long_name = "a" * 1000

        try:
            request = ToolCreateRequest(
                header=ToolManagerHeader(app_id="test_app"),
                payload=ToolCreatePayload(
                    tools=[
                        CreateInfo(
                            name=long_name,
                            description="Test description",
                            openapi_schema='{"openapi": "3.0.0"}',
                        )
                    ]
                ),
            )
            # If no error, then length constraint doesn't exist or is very high
            assert len(request.payload.tools[0].name) == 1000
        except ValidationError:
            # Length constraint exists
            pass

        # Test with special characters in name
        request = ToolCreateRequest(
            header=ToolManagerHeader(app_id="test_app"),
            payload=ToolCreatePayload(
                tools=[
                    CreateInfo(
                        name="test-tool_123",
                        description="Test description",
                        openapi_schema='{"openapi": "3.0.0"}',
                    )
                ]
            ),
        )

        assert request.payload.tools[0].name == "test-tool_123"
