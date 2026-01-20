"""
Unit tests for main.py module
Tests the main entry point functions including environment setup and service startup
"""

import os
import subprocess
from typing import Any
from unittest.mock import Mock, mock_open, patch

import pytest
from plugin.link.main import load_env_file, main, start_service


@pytest.mark.unit
class TestMain:
    """Test class for main module functions"""

    def test_load_env_file_missing_file(self, capsys: Any) -> None:
        """Test load_env_file behavior when file doesn't exist"""
        non_existent_file = "/path/to/nonexistent/file.env"

        load_env_file(non_existent_file)

        captured = capsys.readouterr()
        assert f"Configuration file {non_existent_file} does not exist" in captured.out

    def test_load_env_file_parses_variables(self, capsys: Any) -> None:
        """Test load_env_file correctly parses environment variables"""
        env_content = """# Test configuration
TEST_VAR=test_value
USE_POLARIS=false
ANOTHER_VAR=another_value

# Comment line
EMPTY_LINE_ABOVE=value"""

        with patch("builtins.open", mock_open(read_data=env_content)):
            with patch("os.path.exists", return_value=True):
                with patch.dict(os.environ, {}, clear=True):
                    load_env_file("test.env")

        captured = capsys.readouterr()
        assert "Loading configuration file: test.env" in captured.out
        assert "TEST_VAR=test_value" in captured.out

    def test_load_env_file_sets_env_variables(self) -> None:
        """Test load_env_file correctly sets environment variables"""
        env_content = "USE_POLARIS=true"

        with patch("builtins.open", mock_open(read_data=env_content)):
            with patch("os.path.exists", return_value=True):
                with patch.dict(os.environ, {}, clear=True):
                    load_env_file("test.env")

                    # Verify that CONFIG_ENV_PATH is set
                    assert os.environ.get("CONFIG_ENV_PATH") == "test.env"

    def test_load_env_file_processes_config_variables(self) -> None:
        """Test load_env_file processes various configuration variables"""
        env_content = "USE_POLARIS=false"

        with patch("builtins.open", mock_open(read_data=env_content)):
            with patch("os.path.exists", return_value=True):
                with patch.dict(os.environ, {}, clear=True):
                    load_env_file("test.env")

                    # Verify that CONFIG_ENV_PATH is set
                    assert os.environ.get("CONFIG_ENV_PATH") == "test.env"

    def test_load_env_file_handles_malformed_lines(self, capsys: Any) -> None:
        """Test load_env_file handles malformed configuration lines"""
        env_content = """VALID_VAR=value
malformed line without equals
ANOTHER_VALID=value2"""

        with patch("builtins.open", mock_open(read_data=env_content)):
            with patch("os.path.exists", return_value=True):
                load_env_file("test.env")

        captured = capsys.readouterr()
        assert "Line 2 format error" in captured.out

    def test_start_service_missing_server_file(self) -> None:
        """Test start_service handles missing server file"""
        with patch("plugin.link.main.Path") as mock_path_class:
            mock_file = Mock()
            mock_resolved = Mock()
            mock_parent = Mock()
            mock_relative_path = Mock()

            mock_relative_path.exists.return_value = False
            mock_relative_path.__truediv__ = Mock(return_value=mock_relative_path)
            mock_parent.relative_to.return_value = mock_relative_path
            mock_resolved.parent = mock_parent
            mock_file.resolve.return_value = mock_resolved
            mock_path_class.return_value = mock_file

            # Mock Path.cwd() for the relative_to call
            with patch("plugin.link.main.Path.cwd", return_value=Mock()):
                with pytest.raises(FileNotFoundError):
                    start_service()

    def test_start_service_successful_startup(self) -> None:
        """Test start_service successfully starts the service"""
        with patch("plugin.link.main.Path") as mock_path_class:
            mock_file = Mock()
            mock_resolved = Mock()
            mock_parent = Mock()
            mock_relative_path = Mock()

            mock_relative_path.exists.return_value = True
            mock_relative_path.__truediv__ = Mock(return_value=mock_relative_path)
            mock_parent.relative_to.return_value = mock_relative_path
            mock_resolved.parent = mock_parent
            mock_file.resolve.return_value = mock_resolved
            mock_path_class.return_value = mock_file

            # Mock Path.cwd() for the relative_to call
            with patch("plugin.link.main.Path.cwd", return_value=Mock()):
                with patch("plugin.link.main.subprocess.run") as mock_run:
                    start_service()
                    mock_run.assert_called_once()

    def test_start_service_handles_subprocess_error(self) -> None:
        """Test start_service handles subprocess errors"""
        with patch("plugin.link.main.Path") as mock_path_class:
            mock_file = Mock()
            mock_resolved = Mock()
            mock_parent = Mock()
            mock_relative_path = Mock()

            mock_relative_path.exists.return_value = True
            mock_relative_path.__truediv__ = Mock(return_value=mock_relative_path)
            mock_parent.relative_to.return_value = mock_relative_path
            mock_resolved.parent = mock_parent
            mock_file.resolve.return_value = mock_resolved
            mock_path_class.return_value = mock_file

            # Mock Path.cwd() for the relative_to call
            with patch("plugin.link.main.Path.cwd", return_value=Mock()):
                with patch("plugin.link.main.subprocess.run") as mock_run:
                    mock_run.side_effect = subprocess.CalledProcessError(1, "cmd")

                    with pytest.raises(SystemExit):
                        start_service()

    def test_start_service_handles_keyboard_interrupt(self) -> None:
        """Test start_service handles keyboard interrupt gracefully"""
        with patch("plugin.link.main.Path") as mock_path_class:
            mock_file = Mock()
            mock_resolved = Mock()
            mock_parent = Mock()
            mock_relative_path = Mock()

            mock_relative_path.exists.return_value = True
            mock_relative_path.__truediv__ = Mock(return_value=mock_relative_path)
            mock_parent.relative_to.return_value = mock_relative_path
            mock_resolved.parent = mock_parent
            mock_file.resolve.return_value = mock_resolved
            mock_path_class.return_value = mock_file

            # Mock Path.cwd() for the relative_to call
            with patch("plugin.link.main.Path.cwd", return_value=Mock()):
                with patch("plugin.link.main.subprocess.run") as mock_run:
                    mock_run.side_effect = KeyboardInterrupt()

                    with pytest.raises(SystemExit):
                        start_service()

    def test_main_function_integration(self, capsys: Any) -> None:
        """Test main function integrates all components"""
        with patch("plugin.link.main.setup_python_path") as mock_setup_path:
            with patch("plugin.link.main.load_env_file") as mock_load_env:
                with patch("plugin.link.main.start_service") as mock_start_service:
                    main()

                    mock_setup_path.assert_called_once()
                    mock_load_env.assert_called_once()
                    mock_start_service.assert_called_once()

        captured = capsys.readouterr()
        assert "Link Development Environment Launcher" in captured.out
