"""Unit tests for the logging utility module.

This module contains comprehensive tests for logging configuration,
serialization, and path handling functionality.
"""

import os
from pathlib import Path
from typing import Any, Dict
from unittest.mock import MagicMock, patch

import pytest
from plugin.rpa.utils.log.logger import VALID_LOG_LEVELS, patching, serialize, set_log


class TestSerialize:
    """Test class for serialize function."""

    def test_serialize_with_timestamp(self) -> None:
        """Test serialize function extracts timestamp correctly."""
        # Arrange
        mock_record = {"time": MagicMock()}
        mock_record["time"].timestamp.return_value = 1609459200.123

        # Act
        result = serialize(mock_record)

        # Assert
        assert result is not None
        # Verify orjson.dumps was called with correct data
        mock_record["time"].timestamp.assert_called_once()

    def test_serialize_timestamp_extraction(self) -> None:
        """Test that serialize correctly extracts timestamp from record."""
        # Arrange
        import datetime

        test_time = datetime.datetime(2021, 1, 1, 0, 0, 0)
        mock_record = {"time": test_time}

        with patch("plugin.rpa.utils.log.logger.orjson.dumps") as mock_dumps:
            mock_dumps.return_value = b'{"timestamp": 1609459200.0}'

            # Act
            result = serialize(mock_record)

            # Assert
            mock_dumps.assert_called_once()
            called_args = mock_dumps.call_args[0][0]
            assert "timestamp" in called_args
            assert called_args["timestamp"] == test_time.timestamp()


class TestPatching:
    """Test class for patching function."""

    def test_patching_adds_serialized_field(self) -> None:
        """Test that patching adds serialized field to record."""
        # Arrange
        mock_record: Dict[str, Any] = {"time": MagicMock(), "extra": {}}
        mock_record["time"].timestamp.return_value = 1609459200.0

        with patch("plugin.rpa.utils.log.logger.serialize") as mock_serialize:
            mock_serialize.return_value = b'{"timestamp": 1609459200.0}'

            # Act
            patching(mock_record)

            # Assert
            assert "serialized" in mock_record["extra"]
            assert mock_record["extra"]["serialized"] == b'{"timestamp": 1609459200.0}'
            mock_serialize.assert_called_once_with(mock_record)

    def test_patching_preserves_existing_extra_fields(self) -> None:
        """Test that patching preserves existing extra fields."""
        # Arrange
        mock_record: Dict[str, Any] = {
            "time": MagicMock(),
            "extra": {"existing_field": "existing_value"},
        }
        mock_record["time"].timestamp.return_value = 1609459200.0

        with patch("plugin.rpa.utils.log.logger.serialize") as mock_serialize:
            mock_serialize.return_value = b'{"serialized": "data"}'

            # Act
            patching(mock_record)

            # Assert
            assert mock_record["extra"]["existing_field"] == "existing_value"
            assert "serialized" in mock_record["extra"]


class TestSetLog:
    """Test class for set_log function."""

    @patch("plugin.rpa.utils.log.logger.logger")
    @patch("plugin.rpa.utils.log.logger.appdirs.user_cache_dir")
    @patch("plugin.rpa.utils.log.logger.Path")
    @patch("plugin.rpa.utils.log.logger.os.getenv")
    def test_set_log_with_all_parameters(
        self,
        mock_getenv: MagicMock,
        mock_path: MagicMock,
        mock_appdirs: MagicMock,
        mock_logger: MagicMock,
    ) -> None:
        """Test set_log function with all parameters provided."""
        # Arrange
        mock_getenv.return_value = None
        mock_path_instance = MagicMock()
        mock_path_instance.parent.mkdir = MagicMock()
        mock_path.return_value = mock_path_instance

        test_log_level = "DEBUG"
        test_log_path = "/custom/log/path"

        # Act
        set_log(test_log_level, test_log_path)

        # Assert
        mock_logger.remove.assert_called_once()
        mock_logger.patch.assert_called_once()
        mock_logger.add.assert_called_once()
        mock_logger.debug.assert_called_once()

        # Verify logger.add was called with correct parameters
        add_call_args = mock_logger.add.call_args
        assert "DEBUG" in str(add_call_args)

    @patch("plugin.rpa.utils.log.logger.logger")
    @patch("plugin.rpa.utils.log.logger.appdirs.user_cache_dir")
    @patch("plugin.rpa.utils.log.logger.Path")
    @patch("plugin.rpa.utils.log.logger.os.getenv")
    def test_set_log_with_env_log_level(
        self,
        mock_getenv: MagicMock,
        mock_path: MagicMock,
        mock_appdirs: MagicMock,
        mock_logger: MagicMock,
    ) -> None:
        """Test set_log using log level from environment variable."""
        # Arrange
        mock_getenv.side_effect = lambda key, default=None: (
            "WARNING" if "LOG_LEVEL" in key else default
        )
        mock_path_instance = MagicMock()
        mock_path_instance.parent.mkdir = MagicMock()
        mock_path.return_value = mock_path_instance

        # Act
        set_log(log_level=None, log_path="/test/path")

        # Assert
        add_call_args = mock_logger.add.call_args
        assert "WARNING" in str(add_call_args)

    @patch("plugin.rpa.utils.log.logger.logger")
    @patch("plugin.rpa.utils.log.logger.appdirs.user_cache_dir")
    @patch("plugin.rpa.utils.log.logger.Path")
    @patch("plugin.rpa.utils.log.logger.os.getenv")
    def test_set_log_default_log_level(
        self,
        mock_getenv: MagicMock,
        mock_path: MagicMock,
        mock_appdirs: MagicMock,
        mock_logger: MagicMock,
    ) -> None:
        """Test set_log with default log level when not specified."""
        # Arrange
        mock_getenv.return_value = None
        mock_path_instance = MagicMock()
        mock_path_instance.parent.mkdir = MagicMock()
        mock_path.return_value = mock_path_instance

        # Act
        set_log(log_level=None, log_path="/test/path")

        # Assert
        add_call_args = mock_logger.add.call_args
        assert "INFO" in str(add_call_args)  # Default level

    @patch("plugin.rpa.utils.log.logger.logger")
    @patch("plugin.rpa.utils.log.logger.appdirs.user_cache_dir")
    @patch("plugin.rpa.utils.log.logger.Path")
    @patch("plugin.rpa.utils.log.logger.os.getenv")
    def test_set_log_default_log_path(
        self,
        mock_getenv: MagicMock,
        mock_path: MagicMock,
        mock_appdirs: MagicMock,
        mock_logger: MagicMock,
    ) -> None:
        """Test set_log with default log path when not specified."""
        # Arrange
        mock_getenv.return_value = None
        mock_appdirs.return_value = "/default/cache/dir"
        mock_path_instance = MagicMock()
        mock_path_instance.parent.mkdir = MagicMock()
        mock_path.return_value = mock_path_instance

        # Act
        set_log(log_level="INFO", log_path=None)

        # Assert
        mock_appdirs.assert_called_once_with("rpa-server")
        mock_path.assert_called_with("/default/cache/dir/rpa-server.log")

    @patch("plugin.rpa.utils.log.logger.logger")
    @patch("plugin.rpa.utils.log.logger.appdirs.user_cache_dir")
    @patch("plugin.rpa.utils.log.logger.Path")
    @patch("plugin.rpa.utils.log.logger.os.getenv")
    def test_set_log_creates_log_directory(
        self,
        mock_getenv: MagicMock,
        mock_path: MagicMock,
        mock_appdirs: MagicMock,
        mock_logger: MagicMock,
    ) -> None:
        """Test that set_log creates log directory if it doesn't exist."""
        # Arrange
        mock_getenv.return_value = None
        mock_path_instance = MagicMock()
        mock_path_instance.parent = MagicMock()
        mock_path.return_value = mock_path_instance

        # Act
        set_log(log_level="INFO", log_path="/test/logs")

        # Assert
        mock_path_instance.parent.mkdir.assert_called_once_with(
            parents=True, exist_ok=True
        )

    @patch("plugin.rpa.utils.log.logger.logger")
    @patch("plugin.rpa.utils.log.logger.appdirs.user_cache_dir")
    @patch("plugin.rpa.utils.log.logger.Path")
    @patch("plugin.rpa.utils.log.logger.os.getenv")
    def test_set_log_format_configuration(
        self,
        mock_getenv: MagicMock,
        mock_path: MagicMock,
        mock_appdirs: MagicMock,
        mock_logger: MagicMock,
    ) -> None:
        """Test that set_log configures logger with correct format."""
        # Arrange
        mock_getenv.return_value = None
        mock_path_instance = MagicMock()
        mock_path_instance.parent.mkdir = MagicMock()
        mock_path.return_value = mock_path_instance

        expected_format = (
            "{level} | {time:YYYY-MM-DD HH:mm:ss} | {process} - {thread} "
            "| {file} - {function}: {line} {message}"
        )

        # Act
        set_log(log_level="DEBUG", log_path="/test/path")

        # Assert
        add_call_args = mock_logger.add.call_args
        add_kwargs = (
            add_call_args[1] if len(add_call_args) > 1 else add_call_args.kwargs
        )

        assert "format" in add_kwargs
        assert add_kwargs["format"] == expected_format
        assert add_kwargs["level"] == "DEBUG"
        assert add_kwargs["rotation"] == "10 MB"

    @patch("plugin.rpa.utils.log.logger.logger")
    @patch("plugin.rpa.utils.log.logger.appdirs.user_cache_dir")
    @patch("plugin.rpa.utils.log.logger.Path")
    @patch("plugin.rpa.utils.log.logger.os.getenv")
    def test_set_log_info_message_when_path_exists(
        self,
        mock_getenv: MagicMock,
        mock_path: MagicMock,
        mock_appdirs: MagicMock,
        mock_logger: MagicMock,
    ) -> None:
        """Test that set_log logs info message when path is configured."""
        # Arrange
        mock_getenv.return_value = None
        mock_path_instance = MagicMock()
        mock_path_instance.parent.mkdir = MagicMock()
        mock_path.return_value = mock_path_instance

        test_path = "/test/logs/rpa-server.log"

        # Act
        set_log(log_level="INFO", log_path=test_path)

        # Assert
        mock_logger.info.assert_called()
        info_calls = [
            call for call in mock_logger.info.call_args_list if "Log file:" in str(call)
        ]
        assert len(info_calls) > 0

    def test_valid_log_levels_constant(self) -> None:
        """Test that VALID_LOG_LEVELS contains expected log levels."""
        # Assert
        expected_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        assert VALID_LOG_LEVELS == expected_levels
        assert isinstance(VALID_LOG_LEVELS, list)
        assert len(VALID_LOG_LEVELS) == 5

    @patch("plugin.rpa.utils.log.logger.logger")
    @patch("plugin.rpa.utils.log.logger.appdirs.user_cache_dir")
    @patch("plugin.rpa.utils.log.logger.Path")
    @patch("plugin.rpa.utils.log.logger.os.getenv")
    def test_set_log_case_insensitive_level(
        self,
        mock_getenv: MagicMock,
        mock_path: MagicMock,
        mock_appdirs: MagicMock,
        mock_logger: MagicMock,
    ) -> None:
        """Test that set_log handles case insensitive log levels."""
        # Arrange
        mock_getenv.return_value = None
        mock_path_instance = MagicMock()
        mock_path_instance.parent.mkdir = MagicMock()
        mock_path.return_value = mock_path_instance

        # Act
        set_log(log_level="debug", log_path="/test/path")  # lowercase

        # Assert
        add_call_args = mock_logger.add.call_args
        add_kwargs = (
            add_call_args[1] if len(add_call_args) > 1 else add_call_args.kwargs
        )
        assert add_kwargs["level"] == "DEBUG"  # Should be converted to uppercase
