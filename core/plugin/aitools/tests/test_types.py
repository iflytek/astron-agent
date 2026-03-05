"""Unit tests for types module."""

from plugin.aitools.api.schemas.types import (
    BaseResponse,
    ErrorResponse,
    SuccessResponse,
)
from plugin.aitools.common.exceptions.error.code_enums import CodeEnums


class TestBaseResponse:
    """Test cases for BaseResponse."""

    def test_base_response_creation(self) -> None:
        """Test BaseResponse creation."""
        response = BaseResponse(code=0, message="success")
        assert response.code == 0
        assert response.message == "success"
        assert response.data is None
        assert response.sid is None

    def test_base_response_with_data(self) -> None:
        """Test BaseResponse with data."""
        response = BaseResponse(code=0, message="success", data={"key": "value"})
        assert response.data == {"key": "value"}

    def test_base_response_with_sid(self) -> None:
        """Test BaseResponse with session ID."""
        response = BaseResponse(code=0, message="success", sid="session123")
        assert response.sid == "session123"

    def test_base_response_to_dict(self) -> None:
        """Test BaseResponse to dict."""
        response = BaseResponse(code=0, message="success")
        data = response.model_dump()
        assert data["code"] == 0
        assert data["message"] == "success"


class TestSuccessResponse:
    """Test cases for SuccessResponse."""

    def test_success_response_default(self) -> None:
        """Test SuccessResponse with default values."""
        response = SuccessResponse()
        assert response.code == 0
        assert response.message == "success"

    def test_success_response_with_data(self) -> None:
        """Test SuccessResponse with data."""
        response = SuccessResponse(data={"result": "ok"})
        assert response.code == 0
        assert response.message == "success"
        assert response.data == {"result": "ok"}

    def test_success_response_with_message(self) -> None:
        """Test SuccessResponse with custom message."""
        response = SuccessResponse(message="Operation completed")
        assert response.message == "Operation completed"

    def test_success_response_to_dict(self) -> None:
        """Test SuccessResponse to dict."""
        response = SuccessResponse(data={"key": "value"})
        data = response.model_dump()
        assert data["code"] == 0
        assert data["message"] == "success"
        assert data["data"] == {"key": "value"}


class TestErrorResponse:
    """Test cases for ErrorResponse."""

    def test_error_response_from_enum(self) -> None:
        """Test ErrorResponse creation from enum."""
        response = ErrorResponse.from_enum(CodeEnums.ServiceInernalError)
        assert response.code == CodeEnums.ServiceInernalError.code
        assert CodeEnums.ServiceInernalError.message in response.message

    def test_error_response_from_enum_with_extra_message(self) -> None:
        """Test ErrorResponse from enum with extra message."""
        response = ErrorResponse.from_enum(
            CodeEnums.ServiceInernalError,
            extra_message="Additional info",
        )
        assert response.code == CodeEnums.ServiceInernalError.code
        assert "Additional info" in response.message

    def test_error_response_from_enum_with_sid(self) -> None:
        """Test ErrorResponse from enum with session ID."""
        response = ErrorResponse.from_enum(
            CodeEnums.ServiceInernalError,
            sid="session123",
        )
        assert response.sid == "session123"

    def test_error_response_from_code(self) -> None:
        """Test ErrorResponse creation from code."""
        response = ErrorResponse.from_code(code=500, message="Custom error")
        assert response.code == 500
        assert response.message == "Custom error"

    def test_error_response_from_code_with_sid(self) -> None:
        """Test ErrorResponse from code with session ID."""
        response = ErrorResponse.from_code(
            code=500,
            message="Custom error",
            sid="session123",
        )
        assert response.sid == "session123"

    def test_error_response_all_enums(self) -> None:
        """Test ErrorResponse can be created from all error enums."""
        for code_enum in CodeEnums:
            response = ErrorResponse.from_enum(code_enum)
            assert response.code == code_enum.code
            assert code_enum.message in response.message
