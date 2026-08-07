"""Unit tests for the main entry point module.

This module contains comprehensive tests for all functions in the main.py module,
including path setup, environment loading, and service startup functionality.
"""

import os
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict
from unittest.mock import MagicMock, mock_open, patch

import pytest
from plugin.rpa.main import load_env_file, main, setup_python_path, start_service


class TestLoadEnvFile:
    """Test class for load_env_file function."""

    @patch("plugin.rpa.main.print")
    @patch("plugin.rpa.main.os.path.exists")
    def test_load_env_file_not_exists(
        self, mock_exists: MagicMock, mock_print: MagicMock
    ) -> None:
        """Test load_env_file when file doesn't exist."""
        # Arrange
        mock_exists.return_value = False
        test_file = "nonexistent.env"

        # Act
        load_env_file(test_file)

        # Assert
        mock_print.assert_called_with(
            f"❌ Configuration file {test_file} does not exist"
        )

    @patch("plugin.rpa.main.print")
    @patch("plugin.rpa.main.os.environ.get")
    @patch(
        "builtins.open",
        new_callable=mock_open,
        read_data="KEY1=value1\n# comment\nKEY2=value2\n\ninvalid_line\n",
    )
    @patch("plugin.rpa.main.os.path.exists")
    def test_load_env_file_success(
        self,
        mock_exists: MagicMock,
        mock_file: MagicMock,
        mock_env_get: MagicMock,
        mock_print: MagicMock,
    ) -> None:
        """Test successful loading of environment file."""
        # Arrange
        mock_exists.return_value = True
        mock_env_get.return_value = None  # Environment variable not set
        test_file = "test.env"

        with patch("plugin.rpa.main.os.environ", {}) as mock_environ:
            # Act
            load_env_file(test_file)

            # Assert
            mock_environ["CONFIG_ENV_PATH"] = test_file
            mock_print.assert_any_call(f"📋 Loading configuration file: {test_file}")
            mock_print.assert_any_call("CFG  ✅ KEY1=value1")
            mock_print.assert_any_call("CFG  ✅ KEY2=value2")
            mock_print.assert_any_call("  ⚠️  Line 5 format error: invalid_line")

    @patch("plugin.rpa.main.print")
    @patch("plugin.rpa.main.os.environ.get")
    @patch(
        "builtins.open", new_callable=mock_open, read_data="EXISTING_KEY=new_value\n"
    )
    @patch("plugin.rpa.main.os.path.exists")
    def test_load_env_file_existing_env_var(
        self,
        mock_exists: MagicMock,
        mock_file: MagicMock,
        mock_env_get: MagicMock,
        mock_print: MagicMock,
    ) -> None:
        """Test loading when environment variable already exists."""
        # Arrange
        mock_exists.return_value = True
        mock_env_get.return_value = "existing_value"
        test_file = "test.env"

        with patch(
            "plugin.rpa.main.os.environ",
            {"CONFIG_ENV_PATH": test_file, "EXISTING_KEY": "existing_value"},
        ):
            # Act
            load_env_file(test_file)

            # Assert
            mock_print.assert_any_call("ENV  ✅ EXISTING_KEY=existing_value")


class TestStartService:
    """Test class for start_service function."""

    @patch("plugin.rpa.main.print")
    @patch("plugin.rpa.main.sys.executable", "/usr/bin/python")
    @patch("plugin.rpa.main.Path")
    @patch("plugin.rpa.main.subprocess.run")
    def test_start_service_success(
        self, mock_run: MagicMock, mock_path: MagicMock, mock_print: MagicMock
    ) -> None:
        """Test successful service startup."""
        # Arrange
        mock_file_path = MagicMock()
        mock_resolve = MagicMock()
        mock_parent = MagicMock()
        mock_relative_path = MagicMock()

        mock_path.return_value = mock_file_path
        mock_file_path.resolve.return_value = mock_resolve
        mock_resolve.parent = mock_parent
        mock_parent.relative_to.return_value = mock_relative_path
        mock_relative_path.exists.return_value = True
        mock_relative_path.__truediv__ = MagicMock(return_value=mock_relative_path)

        # Act
        start_service()

        # Assert
        mock_print.assert_called_with("\n🚀 Starting RPA service...")
        mock_run.assert_called_once()

    @patch("plugin.rpa.main.subprocess.run")
    @patch("plugin.rpa.main.Path")
    @patch("plugin.rpa.main.sys.exit")
    @patch("builtins.print")
    def test_start_service_file_not_found(
        self,
        mock_print: MagicMock,
        mock_exit: MagicMock,
        mock_path: MagicMock,
        mock_run: MagicMock,
    ) -> None:
        """Test service startup when app.py is not found."""
        # Arrange
        mock_file_path = MagicMock()
        mock_resolve = MagicMock()
        mock_parent = MagicMock()
        mock_relative_path = MagicMock()

        mock_path.return_value = mock_file_path
        mock_file_path.resolve.return_value = mock_resolve
        mock_resolve.parent = mock_parent
        mock_parent.relative_to.return_value = mock_relative_path
        mock_relative_path.exists.return_value = False
        mock_relative_path.__truediv__ = MagicMock(return_value=mock_relative_path)

        # Act
        start_service()

        # Assert
        mock_exit.assert_called_with(1)

    @patch("plugin.rpa.main.subprocess.run")
    @patch("plugin.rpa.main.Path")
    @patch("plugin.rpa.main.sys.exit")
    @patch("builtins.print")
    def test_start_service_subprocess_error(
        self,
        mock_print: MagicMock,
        mock_exit: MagicMock,
        mock_path: MagicMock,
        mock_run: MagicMock,
    ) -> None:
        """Test service startup with subprocess error."""
        # Arrange
        mock_file_path = MagicMock()
        mock_resolve = MagicMock()
        mock_parent = MagicMock()
        mock_relative_path = MagicMock()

        mock_path.return_value = mock_file_path
        mock_file_path.resolve.return_value = mock_resolve
        mock_resolve.parent = mock_parent
        mock_parent.relative_to.return_value = mock_relative_path
        mock_relative_path.exists.return_value = True
        mock_relative_path.__truediv__ = MagicMock(return_value=mock_relative_path)

        mock_run.side_effect = subprocess.CalledProcessError(1, "cmd", stderr="error")

        # Act
        start_service()

        # Assert
        mock_exit.assert_called_with(1)

    @patch("plugin.rpa.main.subprocess.run")
    @patch("plugin.rpa.main.Path")
    @patch("plugin.rpa.main.sys.exit")
    @patch("builtins.print")
    def test_start_service_keyboard_interrupt(
        self,
        mock_print: MagicMock,
        mock_exit: MagicMock,
        mock_path: MagicMock,
        mock_run: MagicMock,
    ) -> None:
        """Test service startup with keyboard interrupt."""
        # Arrange
        mock_file_path = MagicMock()
        mock_resolve = MagicMock()
        mock_parent = MagicMock()
        mock_relative_path = MagicMock()

        mock_path.return_value = mock_file_path
        mock_file_path.resolve.return_value = mock_resolve
        mock_resolve.parent = mock_parent
        mock_parent.relative_to.return_value = mock_relative_path
        mock_relative_path.exists.return_value = True
        mock_relative_path.__truediv__ = MagicMock(return_value=mock_relative_path)

        mock_run.side_effect = KeyboardInterrupt()

        # Act
        start_service()

        # Assert
        mock_exit.assert_called_with(0)


class TestMain:
    """Test class for main function."""

    @patch("plugin.rpa.main.print")
    @patch("plugin.rpa.main.Path")
    @patch("plugin.rpa.main.load_env_file")
    @patch("plugin.rpa.main.setup_python_path")
    @patch("plugin.rpa.main.start_service")
    def test_main_function(
        self,
        mock_start_service: MagicMock,
        mock_setup_path: MagicMock,
        mock_load_env: MagicMock,
        mock_path: MagicMock,
        mock_print: MagicMock,
    ) -> None:
        """Test the main function execution flow."""
        # Arrange
        mock_file_path = MagicMock()
        mock_parent = MagicMock()
        mock_config_file = MagicMock()

        mock_path.return_value = mock_file_path
        mock_file_path.parent = mock_parent
        mock_parent.__truediv__ = MagicMock(return_value=mock_config_file)

        # Act
        main()

        # Assert
        mock_print.assert_any_call("🌟 RPA Development Environment Launcher")
        mock_print.assert_any_call("=" * 50)
        mock_setup_path.assert_called_once()
        mock_load_env.assert_called_once()
        mock_start_service.assert_called_once()
