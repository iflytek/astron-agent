"""
Unit tests for main.py module
Tests the main entry point functions including environment setup and service startup
"""

import os
import subprocess
from typing import Any
from unittest.mock import Mock, mock_open, patch

import pytest
from plugin.link.consts import const
from plugin.link.main import (
    load_env_file,
    load_polaris,
    main,
    setup_python_path,
    start_service,
)


@pytest.mark.unit
class TestMain:
    """Test class for main module functions"""

    def test_setup_python_path_adds_required_paths(self) -> None:
        """Test that setup_python_path adds required directories to PYTHONPATH"""
        with patch.dict(os.environ, {"PYTHONPATH": ""}, clear=True):
            with patch("plugin.link.main.Path") as mock_path_class:
                # Create custom mock classes that properly handle str()
                class MockPath:
                    def __init__(self, path_str: str) -> None:
                        self.path_str = path_str
                        self.parent: Any = None

                    def __str__(self) -> str:
                        return self.path_str

                # Create mock path hierarchy
                mock_great_grandparent = MockPath("/grandparent/dir")
                mock_grandparent = MockPath("/parent/dir")
                mock_parent = MockPath("/project/root")
                mock_file = MockPath("/current/file")

                # Set up parent relationships
                mock_file.parent = mock_parent
                mock_parent.parent = mock_grandparent
                mock_grandparent.parent = mock_great_grandparent

                mock_path_class.return_value = mock_file

                setup_python_path()

                pythonpath = os.environ.get("PYTHONPATH", "")
                assert "/project/root" in pythonpath
                assert "/parent/dir" in pythonpath
                assert "/grandparent/dir" in pythonpath

    def test_setup_python_path_preserves_existing_paths(self) -> None:
        """Test that setup_python_path preserves existing PYTHONPATH"""
        existing_path = "/existing/path"
        with patch.dict(os.environ, {"PYTHONPATH": existing_path}):
            with patch("plugin.link.main.Path") as mock_path_class:
                # Create custom mock classes that properly handle str()
                class MockPath:
                    def __init__(self, path_str: str) -> None:
                        self.path_str = path_str
                        self.parent: Any = None

                    def __str__(self) -> str:
                        return self.path_str

                # Create mock path hierarchy
                mock_great_grandparent = MockPath("/grandparent/dir")
                mock_grandparent = MockPath("/parent/dir")
                mock_parent = MockPath("/project/root")
                mock_file = MockPath("/current/file")

                # Set up parent relationships
                mock_file.parent = mock_parent
                mock_parent.parent = mock_grandparent
                mock_grandparent.parent = mock_great_grandparent

                mock_path_class.return_value = mock_file

                setup_python_path()

                pythonpath = os.environ.get("PYTHONPATH", "")
                assert existing_path in pythonpath

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

    def test_load_env_file_triggers_polaris_when_enabled(self) -> None:
        """Test load_env_file triggers Polaris loading when USE_POLARIS=true"""
        env_content = "USE_POLARIS=true"

        with patch("builtins.open", mock_open(read_data=env_content)):
            with patch("os.path.exists", return_value=True):
                with patch("plugin.link.main.load_polaris") as mock_load_polaris:
                    load_env_file("test.env")

        mock_load_polaris.assert_called_once()

    def test_load_env_file_skips_polaris_when_disabled(self) -> None:
        """Test load_env_file skips Polaris loading when USE_POLARIS=false"""
        env_content = "USE_POLARIS=false"

        with patch("builtins.open", mock_open(read_data=env_content)):
            with patch("os.path.exists", return_value=True):
                with patch("plugin.link.main.load_polaris") as mock_load_polaris:
                    load_env_file("test.env")

        mock_load_polaris.assert_not_called()

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

    @patch("plugin.link.main.os.getenv")
    @patch("common.settings.polaris.ConfigFilter")
    def test_load_polaris_missing_required_params(
        self, mock_config_filter: Any, mock_getenv: Any
    ) -> None:
        """Test load_polaris returns early when required parameters are missing"""
        # Mock missing required parameters
        mock_getenv.side_effect = lambda key, default=None: {
            const.POLARIS_URL_KEY: None,
            const.POLARIS_USERNAME_KEY: "user",
            const.POLARIS_PASSWORD_KEY: "pass",
            const.POLARIS_CLUSTER_KEY: None,
            const.PROJECT_NAME_KEY: "test_project",
            const.SERVICE_NAME_KEY: "spark-link",
            const.VERSION_KEY: "1.0.0",
            const.CONFIG_FILE_KEY: "config.env",
        }.get(key, default)

        mock_filter_instance = Mock()
        mock_config_filter.return_value = mock_filter_instance

        with patch("common.settings.polaris.Polaris") as mock_polaris_class:
            load_polaris()

        # ConfigFilter is created but Polaris class should not be called due to missing params
        mock_config_filter.assert_called_once()
        mock_polaris_class.assert_not_called()

    @patch("plugin.link.main.os.getenv")
    @patch("common.settings.polaris.ConfigFilter")
    def test_load_polaris_successful_config_load(
        self, mock_config_filter: Any, mock_getenv: Any
    ) -> None:
        """Test load_polaris successfully loads configuration"""
        # Mock all required parameters
        mock_getenv.side_effect = lambda key, default=None: {
            const.POLARIS_URL_KEY: "http://polaris.example.com",
            const.POLARIS_USERNAME_KEY: "test_user",
            const.POLARIS_PASSWORD_KEY: "test_pass",
            const.POLARIS_CLUSTER_KEY: "test_cluster",
            const.PROJECT_NAME_KEY: "test_project",
            const.SERVICE_NAME_KEY: "test_service",
            const.VERSION_KEY: "1.0.0",
            const.CONFIG_FILE_KEY: "config.env",
        }.get(key, default)

        mock_filter_instance = Mock()
        mock_config_filter.return_value = mock_filter_instance

        with patch("common.settings.polaris.Polaris") as mock_polaris_class:
            mock_polaris = Mock()
            mock_polaris_class.return_value = mock_polaris

            load_polaris()

            mock_polaris.pull.assert_called_once()

    @patch("plugin.link.main.os.getenv")
    @patch("common.settings.polaris.ConfigFilter")
    def test_load_polaris_handles_connection_error(
        self, mock_config_filter: Any, mock_getenv: Any, capsys: Any
    ) -> None:
        """Test load_polaris handles connection errors gracefully"""
        # Mock all required parameters
        mock_getenv.side_effect = lambda key, default=None: {
            const.POLARIS_URL_KEY: "http://polaris.example.com",
            const.POLARIS_USERNAME_KEY: "test_user",
            const.POLARIS_PASSWORD_KEY: "test_pass",
            const.POLARIS_CLUSTER_KEY: "test_cluster",
            const.PROJECT_NAME_KEY: "test_project",
            const.SERVICE_NAME_KEY: "test_service",
            const.VERSION_KEY: "1.0.0",
            const.CONFIG_FILE_KEY: "config.env",
        }.get(key, default)

        mock_filter_instance = Mock()
        mock_config_filter.return_value = mock_filter_instance

        with patch("common.settings.polaris.Polaris") as mock_polaris_class:
            mock_polaris = Mock()
            mock_polaris.pull.side_effect = ConnectionError("Connection failed")
            mock_polaris_class.return_value = mock_polaris

            load_polaris()

            captured = capsys.readouterr()
            assert "Polaris configuration loading failed" in captured.out

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
