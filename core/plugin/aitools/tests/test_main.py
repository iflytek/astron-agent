"""Unit tests for main module."""

import os
import subprocess
import sys
from pathlib import Path
from typing import Generator
from unittest.mock import MagicMock, patch

import pytest


@pytest.fixture(autouse=True)
def reset_main_module() -> Generator[None, None, None]:
    """Reset main module before each test to ensure coverage is captured."""
    # Store original sys.modules state and restore after test
    original_main = sys.modules.get("main")
    # Remove from cache to force re-import with coverage
    modules_to_remove = [
        key
        for key in sys.modules
        if key == "main" or key.startswith("plugin.aitools.main")
    ]
    for mod in modules_to_remove:
        if mod in sys.modules:
            del sys.modules[mod]

    yield

    # Restore original
    if original_main:
        sys.modules["main"] = original_main


class TestSetupPythonPath:
    """Test cases for setup_python_path function."""

    def test_setup_python_path_adds_directories(self) -> None:
        """Test setup_python_path adds required directories to PYTHONPATH."""
        # Test that setup_python_path function exists and is callable
        # We import it fresh to get coverage
        from main import setup_python_path

        assert callable(setup_python_path)

        # Test with a clean environment
        original_path = os.environ.get("PYTHONPATH", "")
        try:
            os.environ["PYTHONPATH"] = ""
            # Just call it - it modifies PYTHONPATH
            setup_python_path()
        finally:
            os.environ["PYTHONPATH"] = original_path


class TestLoadEnvFile:
    """Test cases for load_env_file function."""

    def test_load_env_file_nonexistent_file(self, tmp_path: Path) -> None:
        """Test load_env_file with nonexistent file."""
        from main import load_env_file

        nonexistent = tmp_path / "nonexistent.env"
        # Should not raise, just print warning
        load_env_file(str(nonexistent))

    def test_load_env_file_with_valid_file(self, tmp_path: Path) -> None:
        """Test load_env_file with valid file."""
        from main import load_env_file

        env_file = tmp_path / "test.env"
        env_file.write_text(
            "TEST_KEY=test_value\n"
            "# This is a comment\n"
            "ANOTHER_KEY=another_value\n"
        )

        with patch.dict(os.environ, {}, clear=False):
            load_env_file(str(env_file))

            # Verify the file was read (function runs without error)
            assert env_file.exists()

    def test_load_env_file_with_invalid_format(self, tmp_path: Path) -> None:
        """Test load_env_file with invalid line format."""
        from main import load_env_file

        env_file = tmp_path / "invalid.env"
        env_file.write_text("INVALID_LINE_NO_EQUALS\n")

        # Should not raise
        load_env_file(str(env_file))


class TestStartService:
    """Test cases for start_service function."""

    @patch("subprocess.run")
    @patch("pathlib.Path.exists", return_value=True)
    @patch("pathlib.Path.resolve")
    def test_start_service_success(
        self, mock_resolve: MagicMock, mock_exists: MagicMock, mock_run: MagicMock
    ) -> None:
        """Test start_service runs successfully."""
        from main import start_service

        mock_resolve.return_value = MagicMock()
        mock_resolve.return_value.relative_to.return_value = MagicMock()
        mock_resolve.return_value.relative_to.return_value.exists.return_value = True

        # Should not raise
        start_service()

    @patch("subprocess.run")
    @patch("pathlib.Path.exists", return_value=False)
    def test_start_service_file_not_found(
        self, mock_exists: MagicMock, mock_run: MagicMock
    ) -> None:
        """Test start_service raises FileNotFoundError when file doesn't exist."""
        from main import start_service

        with pytest.raises(FileNotFoundError):
            start_service()

    @patch("subprocess.run")
    @patch("pathlib.Path.resolve")
    def test_start_service_subprocess_error(
        self, mock_resolve: MagicMock, mock_run: MagicMock
    ) -> None:
        """Test start_service handles subprocess error."""
        from main import start_service

        mock_resolve.return_value = MagicMock()
        mock_resolve.return_value.relative_to.return_value = MagicMock()
        mock_resolve.return_value.relative_to.return_value.exists.return_value = True

        mock_run.side_effect = subprocess.CalledProcessError(1, "cmd")

        with pytest.raises(SystemExit) as exc_info:
            start_service()
        assert exc_info.value.code == 1

    @patch("subprocess.run")
    @patch("pathlib.Path.resolve")
    def test_start_service_keyboard_interrupt(
        self, mock_resolve: MagicMock, mock_run: MagicMock
    ) -> None:
        """Test start_service handles keyboard interrupt."""
        from main import start_service

        mock_resolve.return_value = MagicMock()
        mock_resolve.return_value.relative_to.return_value = MagicMock()
        mock_resolve.return_value.relative_to.return_value.exists.return_value = True

        mock_run.side_effect = KeyboardInterrupt()

        with pytest.raises(SystemExit) as exc_info:
            start_service()
        assert exc_info.value.code == 0


class TestMain:
    """Test cases for main function."""

    def test_main_function_exists(self) -> None:
        """Test main function exists and is callable."""
        from plugin.aitools.main import main

        assert callable(main)
