"""Unit tests for the FastAPI application module.

This module contains comprehensive tests for the RPAServer class and related
functionality including server setup, configuration checking, and startup.
"""

import os
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from fastapi import FastAPI
from plugin.rpa.api.app import RPAServer, rpa_server_app
from plugin.rpa.exceptions.config_exceptions import EnvNotFoundException


class TestRPAServer:
    """Test class for RPAServer functionality."""

    @patch("plugin.rpa.api.app.RPAServer.start_uvicorn")
    @patch("plugin.rpa.api.app.RPAServer.set_config")
    @patch("plugin.rpa.api.app.RPAServer.check_env")
    @patch("plugin.rpa.api.app.RPAServer.setup_server")
    def test_start_method_calls_all_steps(
        self,
        mock_setup: MagicMock,
        mock_check_env: MagicMock,
        mock_set_config: MagicMock,
        mock_start_uvicorn: MagicMock,
    ) -> None:
        """Test that start method calls all required setup steps in order."""
        # Arrange
        server = RPAServer()

        # Act
        server.start()

        # Assert - verify all methods are called in order
        mock_setup.assert_called_once()
        mock_check_env.assert_called_once()
        mock_set_config.assert_called_once()
        mock_start_uvicorn.assert_called_once()

    @patch("plugin.rpa.api.app.initialize_services")
    def test_setup_server(self, mock_initialize: MagicMock) -> None:
        """Test setup_server initializes required services."""
        # Arrange
        expected_services = [
            "settings_service",
            "log_service",
            "otlp_sid_service",
            "otlp_span_service",
            "otlp_metric_service",
            "kafka_producer_service",
        ]

        # Act
        RPAServer.setup_server()

        # Assert
        mock_initialize.assert_called_once_with(services=expected_services)

    @patch("plugin.rpa.api.app.print")
    @patch("plugin.rpa.api.app.os.getenv")
    def test_load_polaris_disabled(
        self, mock_getenv: MagicMock, mock_print: MagicMock
    ) -> None:
        """Test load_polaris when USE_POLARIS is false."""
        # Arrange
        mock_getenv.side_effect = lambda key, default=None: {
            "USE_POLARIS": "false"
        }.get(key, default)

        # Act
        RPAServer.load_polaris()

        # Assert
        mock_print.assert_called_with("🔧 Config: USE_POLARIS :false")

    @patch("plugin.rpa.api.app.Polaris")
    @patch("plugin.rpa.api.app.ConfigFilter")
    @patch("plugin.rpa.api.app.os.getenv")
    @patch("builtins.print")
    def test_load_polaris_success(
        self,
        mock_print: MagicMock,
        mock_getenv: MagicMock,
        mock_config_filter: MagicMock,
        mock_polaris: MagicMock,
    ) -> None:
        """Test successful polaris configuration loading."""
        # Arrange
        mock_getenv.side_effect = lambda key, default=None: {
            "USE_POLARIS": "true",
            "POLARIS_URL": "http://polaris.example.com",
            "PROJECT_NAME": "test-project",
            "POLARIS_CLUSTER": "test-cluster",
            "SERVICE_NAME": "test-service",
            "VERSION": "2.0.0",
            "CONFIG_FILE": "test-config.env",
            "POLARIS_USERNAME": "test-user",
            "POLARIS_PASSWORD": "test-pass",
        }.get(key, default)

        mock_polaris_instance = MagicMock()
        mock_polaris.return_value = mock_polaris_instance
        mock_polaris_instance.pull.return_value = {"status": "success"}

        # Act
        RPAServer.load_polaris()

        # Assert
        mock_polaris.assert_called_once_with(
            base_url="http://polaris.example.com",
            username="test-user",
            password="test-pass",
        )
        mock_polaris_instance.pull.assert_called_once()

    @patch("plugin.rpa.api.app.Polaris")
    @patch("plugin.rpa.api.app.ConfigFilter")
    @patch("plugin.rpa.api.app.os.getenv")
    @patch("builtins.print")
    def test_load_polaris_missing_required_params(
        self,
        mock_print: MagicMock,
        mock_getenv: MagicMock,
        mock_config_filter: MagicMock,
        mock_polaris: MagicMock,
    ) -> None:
        """Test polaris loading with missing required parameters."""
        # Arrange
        mock_getenv.side_effect = lambda key, default=None: {
            "USE_POLARIS": "true",
            "POLARIS_URL": None,  # Missing required parameter
            "POLARIS_CLUSTER": "test-cluster",
            "POLARIS_USERNAME": "test-user",
            "POLARIS_PASSWORD": "test-pass",
        }.get(key, default)

        # Act
        RPAServer.load_polaris()

        # Assert - should return early without creating Polaris instance
        mock_polaris.assert_not_called()

    @patch("plugin.rpa.api.app.print")
    @patch("plugin.rpa.api.app.Polaris")
    @patch("plugin.rpa.api.app.ConfigFilter")
    @patch("plugin.rpa.api.app.os.getenv")
    def test_load_polaris_connection_error(
        self,
        mock_getenv: MagicMock,
        mock_config_filter: MagicMock,
        mock_polaris: MagicMock,
        mock_print: MagicMock,
    ) -> None:
        """Test polaris loading with connection error."""
        # Arrange
        mock_getenv.side_effect = lambda key, default=None: {
            "USE_POLARIS": "true",
            "POLARIS_URL": "http://polaris.example.com",
            "POLARIS_CLUSTER": "test-cluster",
            "POLARIS_USERNAME": "test-user",
            "POLARIS_PASSWORD": "test-pass",
        }.get(key, default)

        mock_polaris_instance = MagicMock()
        mock_polaris.return_value = mock_polaris_instance
        mock_polaris_instance.pull.side_effect = ConnectionError("Connection failed")

        # Act
        RPAServer.load_polaris()

        # Assert
        mock_print.assert_any_call(
            "⚠️ Polaris configuration loading failed, "
            "continuing with local configuration: Connection failed"
        )

    @patch("plugin.rpa.api.app.print")
    @patch("plugin.rpa.api.app.const")
    @patch("plugin.rpa.api.app.os.getenv")
    def test_check_env_success(
        self, mock_getenv: MagicMock, mock_const: MagicMock, mock_print: MagicMock
    ) -> None:
        """Test successful environment variable checking."""
        # Arrange
        mock_const.base_keys = ["KEY1", "KEY2"]
        mock_const.otlp_keys = ["OTLP_KEY1"]
        mock_const.OTLP_ENABLE_KEY = "OTLP_ENABLE"

        mock_getenv.side_effect = lambda key, default=None: {
            "OTLP_ENABLE": "0",
            "KEY1": "value1",
            "KEY2": "value2",
        }.get(key, default)

        # Act
        RPAServer.check_env()

        # Assert
        mock_print.assert_any_call(
            "\033[94mAll required environment variables are set.\033[0m"
        )

    @patch("plugin.rpa.api.app.const")
    @patch("plugin.rpa.api.app.os.getenv")
    @patch("builtins.print")
    def test_check_env_missing_keys(
        self, mock_print: MagicMock, mock_getenv: MagicMock, mock_const: MagicMock
    ) -> None:
        """Test environment checking with missing keys."""
        # Arrange
        mock_const.base_keys = ["KEY1", "KEY2"]
        mock_const.otlp_keys = ["OTLP_KEY1"]
        mock_const.OTLP_ENABLE_KEY = "OTLP_ENABLE"

        mock_getenv.side_effect = lambda key, default=None: {
            "OTLP_ENABLE": "0",
            "KEY1": "value1",
            "KEY2": None,  # Missing key
        }.get(key, default)

        # Act & Assert
        with pytest.raises(EnvNotFoundException):
            RPAServer.check_env()

    @patch("plugin.rpa.api.app.print")
    @patch("plugin.rpa.api.app.const")
    @patch("plugin.rpa.api.app.os.getenv")
    def test_check_env_with_otlp_enabled(
        self, mock_getenv: MagicMock, mock_const: MagicMock, mock_print: MagicMock
    ) -> None:
        """Test environment checking with OTLP enabled."""
        # Arrange
        mock_const.base_keys = ["KEY1"]
        mock_const.otlp_keys = ["OTLP_KEY1"]
        mock_const.OTLP_ENABLE_KEY = "OTLP_ENABLE"

        mock_getenv.side_effect = lambda key, default=None: {
            "OTLP_ENABLE": "1",
            "KEY1": "value1",
            "OTLP_KEY1": "otlp_value1",
        }.get(key, default)

        # Act
        RPAServer.check_env()

        # Assert
        mock_print.assert_any_call(
            "\033[94mAll required environment variables are set.\033[0m"
        )

    @patch("plugin.rpa.api.app.set_log")
    @patch("plugin.rpa.api.app.const")
    @patch("plugin.rpa.api.app.os.getenv")
    def test_set_config(
        self, mock_getenv: MagicMock, mock_const: MagicMock, mock_set_log: MagicMock
    ) -> None:
        """Test set_config method."""
        # Arrange
        mock_const.LOG_LEVEL_KEY = "LOG_LEVEL"
        mock_const.LOG_PATH_KEY = "LOG_PATH"

        mock_getenv.side_effect = lambda key, default=None: {
            "LOG_LEVEL": "DEBUG",
            "LOG_PATH": "/var/log",
        }.get(key, default)

        # Act
        RPAServer.set_config()

        # Assert
        mock_set_log.assert_called_once_with("DEBUG", "/var/log")

    @patch("plugin.rpa.api.app.uvicorn.Server")
    @patch("plugin.rpa.api.app.uvicorn.Config")
    @patch("plugin.rpa.api.app.rpa_server_app")
    @patch("plugin.rpa.api.app.const")
    @patch("plugin.rpa.api.app.os.getenv")
    def test_start_uvicorn(
        self,
        mock_getenv: MagicMock,
        mock_const: MagicMock,
        mock_app: MagicMock,
        mock_config: MagicMock,
        mock_server: MagicMock,
    ) -> None:
        """Test Uvicorn server startup."""
        # Arrange
        mock_const.SERVICE_PORT_KEY = "SERVICE_PORT"
        mock_getenv.side_effect = lambda key, default=None: {
            "SERVICE_PORT": "8080"
        }.get(key, default)

        mock_app_instance = MagicMock()
        mock_app.return_value = mock_app_instance

        mock_config_instance = MagicMock()
        mock_config.return_value = mock_config_instance

        mock_server_instance = MagicMock()
        mock_server.return_value = mock_server_instance

        # Act
        RPAServer.start_uvicorn()

        # Assert
        mock_config.assert_called_once_with(
            app=mock_app_instance,
            host="0.0.0.0",
            port=8080,
            workers=20,
            reload=False,
            log_config=None,
        )
        mock_server_instance.run.assert_called_once()


class TestRPAServerApp:
    """Test class for rpa_server_app function."""

    def test_rpa_server_app_creates_fastapi_instance(self) -> None:
        """Test that rpa_server_app creates and configures FastAPI instance."""
        # Act
        app = rpa_server_app()

        # Assert
        assert isinstance(app, FastAPI)
