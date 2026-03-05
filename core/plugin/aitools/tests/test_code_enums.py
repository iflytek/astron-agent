"""Unit tests for code_enums module."""

from enum import Enum

from plugin.aitools.common.exceptions.error.code_enums import BaseCodeEnum, CodeEnums


class TestBaseCodeEnum:
    """Test cases for BaseCodeEnum."""

    def test_code_property(self) -> None:
        """Test code property returns correct value."""
        assert CodeEnums.ServiceInernalError.code == 45000
        assert CodeEnums.ServiceParamsError.code == 45001
        assert CodeEnums.HTTPClientError.code == 45100

    def test_message_property(self) -> None:
        """Test message property returns correct value."""
        assert CodeEnums.ServiceInernalError.message == "服务通用错误"
        assert CodeEnums.ServiceParamsError.message == "服务参数错误"
        assert CodeEnums.HTTPClientError.message == "HTTP客户端错误"

    def test_value_tuple_format(self) -> None:
        """Test that value is a tuple of (code, message)."""
        assert CodeEnums.ServiceInernalError.value == (45000, "服务通用错误")
        assert CodeEnums.HTTPClientError.value == (45100, "HTTP客户端错误")


class TestCodeEnums:
    """Test cases for CodeEnums enum."""

    def test_all_service_errors(self) -> None:
        """Test all service-related error codes."""
        assert CodeEnums.ServiceInernalError.code == 45000
        assert CodeEnums.ServiceParamsError.code == 45001
        assert CodeEnums.ServiceResponseError.code == 45002
        assert CodeEnums.ServiceLocalError.code == 45010

    def test_all_http_client_errors(self) -> None:
        """Test all HTTP client error codes."""
        assert CodeEnums.HTTPClientError.code == 45100
        assert CodeEnums.HTTPClientConnectionError.code == 45101
        assert CodeEnums.HTTPClientAuthError.code == 45102

    def test_all_websocket_client_errors(self) -> None:
        """Test all WebSocket client error codes."""
        assert CodeEnums.WebSocketClientError.code == 45200
        assert CodeEnums.WebSocketClientAuthError.code == 45201
        assert CodeEnums.WebSocketClientNotConnectedError.code == 45202
        assert CodeEnums.WebSocketClientDataFormatError.code == 45203
        assert CodeEnums.WebSocketClientSendLoopError.code == 45204
        assert CodeEnums.WebSocketClientRecvLoopError.code == 45205

    def test_route_error(self) -> None:
        """Test route error code."""
        assert CodeEnums.RouteGetMethodParamsError.code == 46000

    def test_enum_iteration(self) -> None:
        """Test that all enum members can be iterated."""
        all_enums = list(CodeEnums)
        assert len(all_enums) == 14
        assert CodeEnums.ServiceInernalError in all_enums
        assert CodeEnums.HTTPClientError in all_enums
        assert CodeEnums.WebSocketClientError in all_enums

    def test_enum_comparison(self) -> None:
        """Test enum comparison."""
        assert CodeEnums.ServiceInernalError == CodeEnums.ServiceInernalError
        assert CodeEnums.HTTPClientError != CodeEnums.WebSocketClientError

    def test_enum_isinstance(self) -> None:
        """Test enum is instance of BaseCodeEnum and Enum."""
        assert isinstance(CodeEnums.ServiceInernalError, BaseCodeEnum)
        assert isinstance(CodeEnums.ServiceInernalError, Enum)
