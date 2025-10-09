"""
Unit tests for utils modules
Tests error codes, logging configuration, and other utility functions
"""

from pathlib import Path
from typing import Any, Dict
from unittest.mock import Mock, patch

import pytest
from plugin.link.consts import const
from plugin.link.utils.errors.code import ErrCode
from plugin.link.utils.log.logger import (
    VALID_LOG_LEVELS,
    configure,
    patching,
    serialize,
)


@pytest.mark.unit
class TestErrCode:
    """Test class for ErrCode enumeration"""

    def test_err_code_properties(self) -> None:
        """Test ErrCode enum properties access"""
        success = ErrCode.SUCCESSES
        assert success.code == 0
        assert success.msg == "Success"

        app_init_err = ErrCode.APP_INIT_ERR
        assert app_init_err.code == 30001
        assert app_init_err.msg == "Initialization failed"

    def test_all_error_codes_have_code_and_msg(self) -> None:
        """Test that all error codes have valid code and message properties"""
        for err_code in ErrCode:
            assert isinstance(err_code.code, int)
            assert isinstance(err_code.msg, str)
            assert err_code.code >= 0
            assert len(err_code.msg) > 0

    def test_error_code_uniqueness(self) -> None:
        """Test that all error codes are unique"""
        codes = [err_code.code for err_code in ErrCode]
        assert len(codes) == len(set(codes)), "Error codes should be unique"

    def test_specific_error_codes(self) -> None:
        """Test specific error code values and messages"""
        test_cases = [
            (ErrCode.SUCCESSES, 0, "Success"),
            (ErrCode.COMMON_ERR, 30100, "General error"),
            (ErrCode.JSON_PROTOCOL_PARSER_ERR, 30200, "JSON protocol parsing failed"),
            (ErrCode.TOOL_NOT_EXIST_ERR, 30500, "Tool does not exist"),
            (ErrCode.MCP_SERVER_ID_EMPTY_ERR, 30700, "MCP server ID is empty"),
        ]

        for err_code, expected_code, expected_msg in test_cases:
            assert err_code.code == expected_code
            assert err_code.msg == expected_msg

    def test_json_schema_validation_errors(self) -> None:
        """Test JSON schema validation error codes"""
        json_parser_err = ErrCode.JSON_PROTOCOL_PARSER_ERR
        json_validate_err = ErrCode.JSON_SCHEMA_VALIDATE_ERR
        response_validate_err = ErrCode.RESPONSE_SCHEMA_VALIDATE_ERR

        assert json_parser_err.code == 30200
        assert json_validate_err.code == 30201
        assert response_validate_err.code == 30202

        assert "JSON protocol parsing failed" in json_parser_err.msg
        assert "Protocol validation failed" in json_validate_err.msg
        assert "Response type does not match" in response_validate_err.msg

    def test_openapi_schema_errors(self) -> None:
        """Test OpenAPI schema error codes"""
        openapi_validate_err = ErrCode.OPENAPI_SCHEMA_VALIDATE_ERR
        body_type_err = ErrCode.OPENAPI_SCHEMA_BODY_TYPE_ERR
        server_not_exist_err = ErrCode.OPENAPI_SCHEMA_SERVER_NOT_EXIST_ERR
        auth_type_err = ErrCode.OPENAPI_AUTH_TYPE_ERR

        assert openapi_validate_err.code == 30300
        assert body_type_err.code == 30301
        assert server_not_exist_err.code == 30302
        assert auth_type_err.code == 30303

    def test_api_request_errors(self) -> None:
        """Test API request error codes"""
        official_api_err = ErrCode.OFFICIAL_API_REQUEST_FAILED_ERR
        function_call_err = ErrCode.FUNCTION_CALL_FAILED_ERR
        llm_call_err = ErrCode.LLM_CALL_FAILED_ERR
        third_api_err = ErrCode.THIRD_API_REQUEST_FAILED_ERR

        assert official_api_err.code == 30400
        assert function_call_err.code == 30401
        assert llm_call_err.code == 30402
        assert third_api_err.code == 30403

    def test_tool_version_errors(self) -> None:
        """Test tool and version error codes"""
        tool_not_exist = ErrCode.TOOL_NOT_EXIST_ERR
        version_not_exist = ErrCode.VERSION_NOT_EXIST_ERR
        version_not_assign = ErrCode.VERSION_NOT_ASSIGN_ERR
        operation_not_exist = ErrCode.OPERATION_ID_NOT_EXIST_ERR

        assert tool_not_exist.code == 30500
        assert version_not_exist.code == 30501
        assert version_not_assign.code == 30502
        assert operation_not_exist.code == 30600

    def test_mcp_server_errors(self) -> None:
        """Test MCP server error codes"""
        mcp_errors = [
            (ErrCode.MCP_SERVER_ID_EMPTY_ERR, 30700),
            (ErrCode.MCP_CRUD_OPERATION_FAILED_ERR, 30701),
            (ErrCode.MCP_SERVER_NOT_FOUND_ERR, 30702),
            (ErrCode.MCP_SERVER_CONNECT_ERR, 30703),
            (ErrCode.MCP_SERVER_SESSION_ERR, 30704),
            (ErrCode.MCP_SERVER_INITIAL_ERR, 30705),
            (ErrCode.MCP_SERVER_TOOL_LIST_ERR, 30706),
            (ErrCode.MCP_SERVER_CALL_TOOL_ERR, 30707),
            (ErrCode.MCP_SERVER_URL_EMPTY_ERR, 30708),
            (ErrCode.MCP_SERVER_LOCAL_URL_ERR, 30709),
            (ErrCode.MCP_SERVER_BLACKLIST_URL_ERR, 30710),
        ]

        for err_code, expected_code in mcp_errors:
            assert err_code.code == expected_code
            assert "MCP" in err_code.msg


@pytest.mark.unit
class TestLoggerUtils:
    """Test class for logger utility functions"""

    def test_valid_log_levels_constant(self) -> None:
        """Test that VALID_LOG_LEVELS contains expected values"""
        expected_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        assert VALID_LOG_LEVELS == expected_levels

    def test_serialize_function(self) -> None:
        """Test serialize function creates JSON output"""
        # Mock log record with time attribute
        mock_time = Mock()
        mock_time.timestamp.return_value = 1234567890.123
        mock_record = {"time": mock_time}

        result = serialize(mock_record)

        # Should return bytes (orjson output)
        assert isinstance(result, bytes)
        # Should contain the timestamp
        assert b"1234567890.123" in result

    def test_patching_function(self) -> None:
        """Test patching function adds serialized data to record"""
        mock_time = Mock()
        mock_time.timestamp.return_value = 1234567890.123
        mock_record: Dict[str, Any] = {"time": mock_time, "extra": {}}

        patching(mock_record)

        # Should add serialized key to extra
        assert "serialized" in mock_record["extra"]
        assert isinstance(mock_record["extra"]["serialized"], bytes)

    @patch("plugin.link.utils.log.logger.logger")
    @patch("plugin.link.utils.log.logger.os.getenv")
    def test_configure_with_env_log_level(
        self, mock_getenv: Any, mock_logger: Any
    ) -> None:
        """Test configure function uses environment log level"""
        mock_getenv.side_effect = lambda key, default=None: {
            const.LOG_LEVEL_KEY: "DEBUG",
            const.LOG_PATH_KEY: None,
        }.get(key, default)

        with patch("plugin.link.utils.log.logger.Path") as mock_path_class:
            mock_path_instance = Mock()
            mock_path_instance.parent.mkdir = Mock()
            # Make the path instance support the / operator
            mock_path_instance.__truediv__ = Mock(return_value=mock_path_instance)
            mock_path_class.return_value = mock_path_instance

            with patch(
                "plugin.link.utils.log.logger.appdirs.user_cache_dir"
            ) as mock_cache_dir:
                mock_cache_dir.return_value = "/tmp/cache"

                configure()

                mock_logger.remove.assert_called_once()
                mock_logger.patch.assert_called_once()
                mock_logger.add.assert_called_once()

    @patch("plugin.link.utils.log.logger.logger")
    @patch("plugin.link.utils.log.logger.os.getenv")
    def test_configure_with_custom_log_level(
        self, mock_getenv: Any, mock_logger: Any
    ) -> None:
        """Test configure function with custom log level parameter"""
        mock_getenv.return_value = None

        with patch("plugin.link.utils.log.logger.Path") as mock_path:
            mock_path_instance = Mock()
            mock_path_instance.parent.mkdir = Mock()
            mock_path.return_value = mock_path_instance

            with patch(
                "plugin.link.utils.log.logger.appdirs.user_cache_dir"
            ) as mock_cache_dir:
                mock_cache_dir.return_value = "/tmp/cache"

                configure(log_level="ERROR")

                # Should call logger.add with ERROR level
                call_args = mock_logger.add.call_args
                assert call_args[1]["level"] == "ERROR"

    @patch("plugin.link.utils.log.logger.logger")
    @patch("plugin.link.utils.log.logger.os.getenv")
    def test_configure_with_custom_log_file(
        self, mock_getenv: Any, mock_logger: Any
    ) -> None:
        """Test configure function with custom log file"""
        mock_getenv.return_value = None
        custom_log_path = Path("/custom/log/path")

        with patch("plugin.link.utils.log.logger.Path") as mock_path:
            mock_path_instance = Mock()
            mock_path_instance.parent.mkdir = Mock()
            mock_path.return_value = mock_path_instance

            configure(log_file=custom_log_path)

            # Should use custom log file path
            mock_path_instance.parent.mkdir.assert_called_once_with(
                parents=True, exist_ok=True
            )

    @patch("plugin.link.utils.log.logger.logger")
    @patch("plugin.link.utils.log.logger.os.getenv")
    def test_configure_default_info_level(
        self, mock_getenv: Any, mock_logger: Any
    ) -> None:
        """Test configure function defaults to INFO level"""
        mock_getenv.return_value = None

        with patch("plugin.link.utils.log.logger.Path") as mock_path:
            mock_path_instance = Mock()
            mock_path_instance.parent.mkdir = Mock()
            mock_path.return_value = mock_path_instance

            with patch(
                "plugin.link.utils.log.logger.appdirs.user_cache_dir"
            ) as mock_cache_dir:
                mock_cache_dir.return_value = "/tmp/cache"

                configure()

                # Should default to INFO level
                call_args = mock_logger.add.call_args
                assert call_args[1]["level"] == "INFO"

    @patch("plugin.link.utils.log.logger.logger")
    @patch("plugin.link.utils.log.logger.os.getenv")
    def test_configure_with_env_log_path(
        self, mock_getenv: Any, mock_logger: Any
    ) -> None:
        """Test configure function uses environment log path"""
        mock_getenv.side_effect = lambda key, default=None: {
            const.LOG_LEVEL_KEY: None,
            const.LOG_PATH_KEY: "/env/log/path",
        }.get(key, default)

        with patch("plugin.link.utils.log.logger.Path") as mock_path:
            mock_path_instance = Mock()
            mock_path_instance.parent.mkdir = Mock()
            mock_path.return_value = mock_path_instance

            configure()

            # Should use environment log path
            mock_path.assert_called()

    @patch("plugin.link.utils.log.logger.logger")
    @patch("plugin.link.utils.log.logger.os.getenv")
    def test_configure_log_format(self, mock_getenv: Any, mock_logger: Any) -> None:
        """Test configure function uses correct log format"""
        mock_getenv.return_value = None

        with patch("plugin.link.utils.log.logger.Path") as mock_path:
            mock_path_instance = Mock()
            mock_path_instance.parent.mkdir = Mock()
            mock_path.return_value = mock_path_instance

            with patch(
                "plugin.link.utils.log.logger.appdirs.user_cache_dir"
            ) as mock_cache_dir:
                mock_cache_dir.return_value = "/tmp/cache"

                configure()

                call_args = mock_logger.add.call_args
                log_format = call_args[1]["format"]

                # Should contain expected format elements
                assert "{level}" in log_format
                assert "{time:YYYY-MM-DD HH:mm:ss}" in log_format
                assert "{process}" in log_format
                assert "{thread}" in log_format
                assert "{file}" in log_format
                assert "{function}" in log_format
                assert "{line}" in log_format
                assert "{message}" in log_format

    @patch("plugin.link.utils.log.logger.logger")
    @patch("plugin.link.utils.log.logger.os.getenv")
    def test_configure_rotation_setting(
        self, mock_getenv: Any, mock_logger: Any
    ) -> None:
        """Test configure function sets log rotation"""
        mock_getenv.return_value = None

        with patch("plugin.link.utils.log.logger.Path") as mock_path:
            mock_path_instance = Mock()
            mock_path_instance.parent.mkdir = Mock()
            mock_path.return_value = mock_path_instance

            with patch(
                "plugin.link.utils.log.logger.appdirs.user_cache_dir"
            ) as mock_cache_dir:
                mock_cache_dir.return_value = "/tmp/cache"

                configure()

                call_args = mock_logger.add.call_args
                rotation = call_args[1]["rotation"]

                assert rotation == "10 MB"

    @patch("plugin.link.utils.log.logger.logger")
    @patch("plugin.link.utils.log.logger.os.getenv")
    def test_configure_creates_log_directory(
        self, mock_getenv: Any, mock_logger: Any
    ) -> None:
        """Test configure function creates log directory if it doesn't exist"""
        mock_getenv.return_value = None

        with patch("plugin.link.utils.log.logger.Path") as mock_path:
            mock_path_instance = Mock()
            mock_path_instance.parent = Mock()
            mock_path.return_value = mock_path_instance

            with patch(
                "plugin.link.utils.log.logger.appdirs.user_cache_dir"
            ) as mock_cache_dir:
                mock_cache_dir.return_value = "/tmp/cache"

                configure()

                mock_path_instance.parent.mkdir.assert_called_once_with(
                    parents=True, exist_ok=True
                )

    def test_serialize_with_mock_record(self) -> None:
        """Test serialize function with mock record structure"""
        import time

        # Create a more realistic mock record
        mock_datetime = Mock()
        mock_datetime.timestamp.return_value = time.time()

        record = {
            "time": mock_datetime,
            "level": {"name": "INFO"},
            "message": "Test message",
        }

        result = serialize(record)

        # Should be valid JSON bytes
        assert isinstance(result, bytes)
        # Should contain timestamp key
        import orjson

        parsed = orjson.loads(result)
        assert "timestamp" in parsed
        assert isinstance(parsed["timestamp"], (int, float))

    def test_patching_adds_serialized_extra(self) -> None:
        """Test patching function properly adds serialized data"""
        import time

        mock_datetime = Mock()
        mock_datetime.timestamp.return_value = time.time()

        record: Dict[str, Any] = {
            "time": mock_datetime,
            "extra": {"existing_key": "existing_value"},
        }

        patching(record)

        # Should preserve existing extra data
        assert record["extra"]["existing_key"] == "existing_value"
        # Should add serialized data
        assert "serialized" in record["extra"]
        assert isinstance(record["extra"]["serialized"], bytes)
