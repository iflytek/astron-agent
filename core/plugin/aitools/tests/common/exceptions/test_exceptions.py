"""Unit tests for exceptions module."""

from plugin.aitools.common.exceptions.error.code_enums import CodeEnums
from plugin.aitools.common.exceptions.exceptions import (
    HTTPClientException,
    ServiceException,
    WebSocketClientException,
)


class TestServiceException:
    """Test cases for ServiceException."""

    def test_default_values(self) -> None:
        """Test ServiceException with default values."""
        exc = ServiceException()
        assert exc.code == 500
        assert exc.message == "Internal server error"
        assert exc.sid is None

    def test_custom_values(self) -> None:
        """Test ServiceException with custom values."""
        exc = ServiceException(code=400, message="Custom error", sid="session123")
        assert exc.code == 400
        assert exc.message == "Custom error"
        assert exc.sid == "session123"

    def test_from_error_code(self) -> None:
        """Test creating exception from error code."""
        exc = ServiceException.from_error_code(CodeEnums.ServiceParamsError)
        assert exc.code == CodeEnums.ServiceParamsError.code
        assert exc.message == CodeEnums.ServiceParamsError.message + ": None"

    def test_from_error_code_with_extra_message(self) -> None:
        """Test creating exception from error code with extra message."""
        exc = ServiceException.from_error_code(
            CodeEnums.ServiceParamsError, extra_message="Invalid parameter"
        )
        assert exc.code == CodeEnums.ServiceParamsError.code
        assert "Invalid parameter" in exc.message

    def test_from_error_code_with_sid(self) -> None:
        """Test creating exception from error code with session ID."""
        exc = ServiceException.from_error_code(
            CodeEnums.ServiceParamsError, sid="session123"
        )
        assert exc.sid == "session123"

    def test_convert_to_response(self) -> None:
        """Test converting exception to error response."""
        exc = ServiceException(code=400, message="Custom error")
        response = exc.convert_to_response()
        assert response.code == 400
        assert response.message == "Custom error"

    def test_code_none_uses_default(self) -> None:
        """Test that None code uses default."""
        exc = ServiceException(code=None)  # type: ignore[arg-type]
        assert exc.code == ServiceException.default_code

    def test_message_none_uses_default(self) -> None:
        """Test that None message uses default."""
        exc = ServiceException(message=None)  # type: ignore[arg-type]
        assert exc.message == ServiceException.default_message

    def test_exception_inheritance(self) -> None:
        """Test that ServiceException inherits from Exception."""
        exc = ServiceException()
        assert isinstance(exc, Exception)


class TestHTTPClientException:
    """Test cases for HTTPClientException."""

    def test_default_values(self) -> None:
        """Test HTTPClientException with default values."""
        exc = HTTPClientException()
        assert exc.code == 500
        assert exc.message == "Internal server error"

    def test_custom_values(self) -> None:
        """Test HTTPClientException with custom values."""
        exc = HTTPClientException(code=401, message="Unauthorized")
        assert exc.code == 401
        assert exc.message == "Unauthorized"

    def test_from_error_code(self) -> None:
        """Test creating HTTPClientException from error code."""
        exc = HTTPClientException.from_error_code(CodeEnums.HTTPClientConnectionError)
        assert exc.code == CodeEnums.HTTPClientConnectionError.code

    def test_inheritance(self) -> None:
        """Test that HTTPClientException inherits from ServiceException."""
        exc = HTTPClientException()
        assert isinstance(exc, ServiceException)


class TestWebSocketClientException:
    """Test cases for WebSocketClientException."""

    def test_default_values(self) -> None:
        """Test WebSocketClientException with default values."""
        exc = WebSocketClientException()
        assert exc.code == 500
        assert exc.message == "Internal server error"

    def test_custom_values(self) -> None:
        """Test WebSocketClientException with custom values."""
        exc = WebSocketClientException(code=450, message="Connection failed")
        assert exc.code == 450
        assert exc.message == "Connection failed"

    def test_from_error_code(self) -> None:
        """Test creating WebSocketClientException from error code."""
        exc = WebSocketClientException.from_error_code(
            CodeEnums.WebSocketClientNotConnectedError
        )
        assert exc.code == CodeEnums.WebSocketClientNotConnectedError.code

    def test_inheritance(self) -> None:
        """Test that WebSocketClientException inherits from ServiceException."""
        exc = WebSocketClientException()
        assert isinstance(exc, ServiceException)
