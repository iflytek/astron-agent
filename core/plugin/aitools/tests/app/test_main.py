"""Unit tests for main module."""

# pylint: disable=too-few-public-methods,unused-argument,import-outside-toplevel

import importlib
import sys
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
        """Ensure setup_python_path moved out of main module."""
        module = importlib.import_module("main")
        assert not hasattr(module, "setup_python_path")


class TestMainConfig:
    """Test config wiring in main()."""

    @patch("main.AIToolsServer")
    def test_main_starts_server(self, mock_server_cls: MagicMock) -> None:
        """main should delegate startup to AIToolsServer."""
        from main import main

        main()

        mock_server_cls.assert_called_once()
        mock_server_cls.return_value.start_uvicorn.assert_called_once()


class TestStartService:
    """Test cases for start_service function."""

    def test_start_service_removed(self) -> None:
        """Ensure start_service helper is removed from main module."""
        module = importlib.import_module("main")
        assert not hasattr(module, "start_service")


class TestMain:
    """Test cases for main function."""

    def test_main_function_exists(self) -> None:
        """Test main function exists and is callable."""
        from plugin.aitools.main import main

        assert callable(main)
