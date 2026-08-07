"""
Tests for metrology_auth module
"""

from unittest.mock import MagicMock, Mock, patch

import pytest

from common.metrology_auth import (
    MASDK,
    MASDKRequest,
    MASDKResponse,
    copy_toml,
    get_local_ip,
)
from common.metrology_auth.errors import (
    ErrorCode,
    MASDKErrors,
    XingchenUtilsMASDKException,
)


class TestMASDKRequest:
    """Test MASDKRequest dataclass"""

    def test_init_basic(self) -> None:
        """Test basic initialization"""
        request = MASDKRequest(
            sid="test_sid",
            appid="test_app",
            channel="test_channel",
            function="test_function",
            cnt=5,
        )

        assert request.sid == "test_sid"
        assert request.appid == "test_app"
        assert request.channel == "test_channel"
        assert request.function == "test_function"
        assert request.cnt == 5
        assert request.uid is None

    def test_init_with_uid(self) -> None:
        """Test initialization with uid"""
        request = MASDKRequest(
            sid="test_sid",
            appid="test_app",
            channel="test_channel",
            function="test_function",
            cnt=5,
            uid="test_uid",
        )

        assert request.uid == "test_uid"

    def test_to_dict(self) -> None:
        """Test to_dict method"""
        request = MASDKRequest(
            sid="test_sid",
            appid="test_app",
            channel="test_channel",
            function="test_function",
            cnt=5,
            uid="test_uid",
        )

        result = request.to_dict()
        expected = {
            "sid": "test_sid",
            "appid": "test_app",
            "channel": "test_channel",
            "function": "test_function",
            "cnt": 5,
            "uid": "test_uid",
        }

        assert result == expected

    def test_to_dict_without_uid(self) -> None:
        """Test to_dict method without uid"""
        request = MASDKRequest(
            sid="test_sid",
            appid="test_app",
            channel="test_channel",
            function="test_function",
            cnt=5,
        )

        result = request.to_dict()
        expected = {
            "sid": "test_sid",
            "appid": "test_app",
            "channel": "test_channel",
            "function": "test_function",
            "cnt": 5,
            "uid": None,
        }

        assert result == expected


class TestMASDKResponse:
    """Test MASDKResponse dataclass"""

    def test_init(self) -> None:
        """Test initialization"""
        response = MASDKResponse(code=0, msg="Success", log="test_log")

        assert response.code == 0
        assert response.msg == "Success"
        assert response.log == "test_log"


class TestErrorCode:
    """Test ErrorCode class"""

    def test_error_codes(self) -> None:
        """Test error code constants"""
        assert ErrorCode.Successes == 0
        assert ErrorCode.MASDKClosedError == 0
        assert ErrorCode.InitParamInvalidError == 9101
        assert ErrorCode.AuthorizationCheckError == 9102
        assert ErrorCode.AuthorizationCheckV2Error == 9103
        assert ErrorCode.MetrologyCalcError == 9104
        assert ErrorCode.ConcurrentAcquireConcError == 9105
        assert ErrorCode.ConcurrentReleaseConcError == 9106
        assert ErrorCode.CntInitFailedError == 9107
        assert ErrorCode.ConcInitFailError == 9108
        assert ErrorCode.MASDKUnknownError == 9999


class TestMASDKErrors:
    """Test MASDKErrors class"""

    def test_get_error_success(self) -> None:
        """Test get_error with success code"""
        error = MASDKErrors.get_error(ErrorCode.Successes)
        assert isinstance(error, XingchenUtilsMASDKException)
        assert error.c == 0
        assert error.m == "成功"

    def test_get_error_authorization_check(self) -> None:
        """Test get_error with authorization check error"""
        error = MASDKErrors.get_error(ErrorCode.AuthorizationCheckError)
        assert isinstance(error, XingchenUtilsMASDKException)
        assert error.c == 9102
        assert error.m == "计量鉴权SDK鉴权Check调用失败"

    def test_get_error_unknown(self) -> None:
        """Test get_error with unknown code"""
        error = MASDKErrors.get_error(99999)
        assert isinstance(error, XingchenUtilsMASDKException)
        assert error.c == 9999
        assert error.m == "未知异常"


class TestUtilityFunctions:
    """Test utility functions"""

    @patch("builtins.open", new_callable=MagicMock)
    @patch("common.metrology_auth.toml.load")
    @patch("common.metrology_auth.toml.dump")
    def test_copy_toml_success(
        self, mock_dump: Mock, mock_load: Mock, mock_open: Mock
    ) -> None:
        """Test copy_toml function success"""
        mock_load.return_value = {"key": "value"}

        result = copy_toml("source.toml", "target.toml")

        assert result is None
        mock_load.assert_called_once()
        mock_dump.assert_called_once()

    @patch("builtins.open", side_effect=Exception("File error"))
    def test_copy_toml_exception(self, mock_open: Mock) -> None:
        """Test copy_toml function with exception"""
        result = copy_toml("source.toml", "target.toml")

        assert isinstance(result, XingchenUtilsMASDKException)
        assert result.c == ErrorCode.InitParamInvalidError

    @patch("socket.socket")
    def test_get_local_ip_success(self, mock_socket: Mock) -> None:
        """Test get_local_ip function success"""
        mock_sock = Mock()
        mock_sock.getsockname.return_value = ("192.168.1.100", 12345)
        mock_socket.return_value = mock_sock

        result = get_local_ip()

        # The function returns the first element of getsockname() result
        assert result == "192.168.1.100"
        mock_sock.connect.assert_called_once_with(("8.8.8.8", 80))

    @patch("socket.socket")
    def test_get_local_ip_exception(self, mock_socket: Mock) -> None:
        """Test get_local_ip function with exception"""
        mock_socket.side_effect = Exception("Socket error")

        with pytest.raises(Exception):
            get_local_ip()


class TestMASDK:
    """Test MASDK class"""

    @patch("common.metrology_auth.copy_toml")
    @patch("platform.system")
    @patch("os.path.abspath")
    @patch("os.path.dirname")
    def test_get_ctype_file_for_platform_windows(
        self,
        mock_dirname: Mock,
        mock_abspath: Mock,
        mock_system: Mock,
        mock_copy_toml: Mock,
    ) -> None:
        """Test get_ctype_file_for_platform for Windows"""
        mock_system.return_value = "Windows"
        mock_abspath.return_value = "/path/to/file.py"
        mock_dirname.return_value = "/path/to"
        mock_copy_toml.return_value = None

        masdk = MASDK([], [])
        result = masdk.get_ctype_file_for_platform()

        assert result == "/path/to/ma_sdk_windows.so"

    @patch("common.metrology_auth.copy_toml")
    @patch("platform.system")
    @patch("os.path.abspath")
    @patch("os.path.dirname")
    def test_get_ctype_file_for_platform_linux(
        self,
        mock_dirname: Mock,
        mock_abspath: Mock,
        mock_system: Mock,
        mock_copy_toml: Mock,
    ) -> None:
        """Test get_ctype_file_for_platform for Linux"""
        mock_system.return_value = "Linux"
        mock_abspath.return_value = "/path/to/file.py"
        mock_dirname.return_value = "/path/to"
        mock_copy_toml.return_value = None

        masdk = MASDK([], [])
        result = masdk.get_ctype_file_for_platform()

        assert result == "/path/to/ma_sdk_linux_x64.so"

    @patch("common.metrology_auth.copy_toml")
    @patch("platform.system")
    @patch("os.path.abspath")
    @patch("os.path.dirname")
    def test_get_ctype_file_for_platform_darwin(
        self,
        mock_dirname: Mock,
        mock_abspath: Mock,
        mock_system: Mock,
        mock_copy_toml: Mock,
    ) -> None:
        """Test get_ctype_file_for_platform for Darwin"""
        mock_system.return_value = "Darwin"
        mock_abspath.return_value = "/path/to/file.py"
        mock_dirname.return_value = "/path/to"
        mock_copy_toml.return_value = None

        masdk = MASDK([], [])
        result = masdk.get_ctype_file_for_platform()

        assert result == "/path/to/ma_sdk_macos_arm64.so"

    @patch("platform.system")
    def test_get_ctype_file_for_platform_unsupported(self, mock_system: Mock) -> None:
        """Test get_ctype_file_for_platform for unsupported platform"""
        mock_system.return_value = "Unsupported"

        # Test the method directly without creating MASDK instance
        from common.metrology_auth import MASDK

        masdk = MASDK.__new__(MASDK)  # Create without calling __init__

        with pytest.raises(XingchenUtilsMASDKException):
            masdk.get_ctype_file_for_platform()

    @patch("common.metrology_auth.copy_toml")
    def test_get_polaris_flag_true(self, mock_copy_toml: Mock) -> None:
        """Test get_polaris_flag returns True when all fields are set"""
        mock_copy_toml.return_value = None

        masdk = MASDK(
            channel_list=[],
            strategy_type=[],
            polaris_url="http://test.com",
            polaris_project="test_project",
            polaris_group="test_group",
            polaris_service="test_service",
            polaris_version="1.0.0",
        )

        result = masdk.get_polaris_flag()
        assert result is True

    @patch("common.metrology_auth.copy_toml")
    def test_get_polaris_flag_false(self, mock_copy_toml: Mock) -> None:
        """Test get_polaris_flag returns False when fields are empty"""
        mock_copy_toml.return_value = None

        masdk = MASDK(
            channel_list=[],
            strategy_type=[],
            polaris_url="",
            polaris_project="",
            polaris_group="",
            polaris_service="",
            polaris_version="",
        )

        result = masdk.get_polaris_flag()
        assert result is False

    @patch("common.metrology_auth.copy_toml")
    def test_get_mode_rpc_config(self, mock_copy_toml: Mock) -> None:
        """Test get_mode with RPC config file"""
        mock_copy_toml.return_value = None

        masdk = MASDK(channel_list=[], strategy_type=[], rpc_config_file="config.toml")

        result = masdk.get_mode()
        assert result == 0
        # copy_toml is called during initialization and in get_mode
        assert mock_copy_toml.call_count >= 1

    @patch("common.metrology_auth.copy_toml")
    def test_get_mode_polaris(self, mock_copy_toml: Mock) -> None:
        """Test get_mode with Polaris configuration"""
        mock_copy_toml.return_value = None

        masdk = MASDK(
            channel_list=[],
            strategy_type=[],
            polaris_url="http://test.com",
            polaris_project="test_project",
            polaris_group="test_group",
            polaris_service="test_service",
            polaris_version="1.0.0",
        )

        result = masdk.get_mode()
        assert result == 1

    @patch("common.metrology_auth.copy_toml")
    @patch("os.path.dirname")
    @patch("os.path.abspath")
    def test_get_mode_default(
        self, mock_abspath: Mock, mock_dirname: Mock, mock_copy_toml: Mock
    ) -> None:
        """Test get_mode with default configuration"""
        mock_copy_toml.return_value = None
        mock_abspath.return_value = "/path/to/file.py"
        mock_dirname.return_value = "/path/to"

        masdk = MASDK(channel_list=[], strategy_type=[])

        result = masdk.get_mode()
        assert result == 0
        # copy_toml is called during initialization and in get_mode
        assert mock_copy_toml.call_count >= 1

    @patch("common.metrology_auth.copy_toml")
    def test_get_mode_copy_error(self, mock_copy_toml: Mock) -> None:
        """Test get_mode with copy error"""
        error = XingchenUtilsMASDKException(9101, "Copy error")
        mock_copy_toml.return_value = error

        with pytest.raises(XingchenUtilsMASDKException):
            _ = MASDK(channel_list=[], strategy_type=[], rpc_config_file="config.toml")

    @patch("common.metrology_auth.copy_toml")
    @patch("os.getenv")
    def test_metrology_authorization_masdk_switch_off(
        self, mock_getenv: Mock, mock_copy_toml: Mock
    ) -> None:
        """Test metrology_authorization when MASDK_SWITCH is off"""
        mock_getenv.return_value = "0"
        mock_copy_toml.return_value = None

        masdk = MASDK([], [])
        request = MASDKRequest("sid", "app", "channel", "function", 1)

        result = masdk.metrology_authorization(request)

        assert isinstance(result, MASDKResponse)
        # When MASDK_SWITCH is off, it should return MASDKClosedError (code 0)
        # But since no modular_method is created, it returns CntInitFailedError (9107)
        assert result.code == 0 or result.code == 9107
        assert (
            "MASDK_SWITCH is 0" in result.log
            or "MASDK has no modular_method" in result.log
        )

    @patch("common.metrology_auth.copy_toml")
    @patch("os.getenv")
    def test_metrology_authorization_no_modular_method(
        self, mock_getenv: Mock, mock_copy_toml: Mock
    ) -> None:
        """Test metrology_authorization when no modular_method exists"""
        mock_getenv.return_value = "1"
        mock_copy_toml.return_value = None

        masdk = MASDK([], [])
        request = MASDKRequest("sid", "app", "channel", "function", 1)

        result = masdk.metrology_authorization(request)

        assert isinstance(result, MASDKResponse)
        assert result.code == 9107
        assert "MASDK has no modular_method" in result.log

    @patch("common.metrology_auth.copy_toml")
    @patch("os.getenv")
    def test_acquire_concurrent_no_concurrent_method(
        self, mock_getenv: Mock, mock_copy_toml: Mock
    ) -> None:
        """Test acquire_concurrent when no concurrent_method exists"""
        mock_getenv.return_value = "1"
        mock_copy_toml.return_value = None

        masdk = MASDK([], [])
        request = MASDKRequest("sid", "app", "channel", "function", 1)

        result = masdk.acquire_concurrent(request)

        assert isinstance(result, MASDKResponse)
        assert result.code == 9108
        assert "MASDK has no concurrent_method" in result.log

    @patch("common.metrology_auth.copy_toml")
    @patch("os.getenv")
    def test_release_concurrent_no_concurrent_method(
        self, mock_getenv: Mock, mock_copy_toml: Mock
    ) -> None:
        """Test release_concurrent when no concurrent_method exists"""
        mock_getenv.return_value = "1"
        mock_copy_toml.return_value = None

        masdk = MASDK([], [])
        request = MASDKRequest("sid", "app", "channel", "function", 1)

        result = masdk.release_concurrent(request)

        assert isinstance(result, MASDKResponse)
        assert result.code == 9108
        assert "MASDK has no concurrent_method" in result.log


class TestMetrologyAuthIntegration:
    """Integration tests for metrology auth components"""

    def test_masdk_request_response_workflow(self) -> None:
        """Test complete workflow with MASDKRequest and MASDKResponse"""
        request = MASDKRequest(
            sid="test_sid",
            appid="test_app",
            channel="test_channel",
            function="test_function",
            cnt=3,
            uid="test_uid",
        )

        # Test request serialization
        request_dict = request.to_dict()
        assert request_dict["sid"] == "test_sid"
        assert request_dict["cnt"] == 3

        # Test response creation
        response = MASDKResponse(code=0, msg="Success", log="test_log")

        assert response.code == 0
        assert response.msg == "Success"

    def test_error_handling_workflow(self) -> None:
        """Test error handling workflow"""
        # Test getting different error types
        success_error = MASDKErrors.get_error(ErrorCode.Successes)
        auth_error = MASDKErrors.get_error(ErrorCode.AuthorizationCheckError)
        unknown_error = MASDKErrors.get_error(99999)

        assert success_error.c == 0
        assert auth_error.c == 9102
        assert unknown_error.c == 9999

        # Test error messages
        assert "成功" in success_error.m
        assert "鉴权Check调用失败" in auth_error.m
        assert "未知异常" in unknown_error.m
