"""Pytest configuration and shared fixtures for RPA service tests.

This module provides common fixtures and configuration for all test modules
in the RPA service test suite.
"""

import os
import tempfile
from pathlib import Path
from typing import Any, Generator
from unittest.mock import MagicMock, patch

import pytest


@pytest.fixture
def temp_dir() -> Generator[Path, None, None]:
    """Fixture providing a temporary directory for tests."""
    with tempfile.TemporaryDirectory() as temp_dir_path:
        yield Path(temp_dir_path)


@pytest.fixture
def mock_env_vars() -> Generator[dict[str, str], None, None]:
    """Fixture providing mocked environment variables for testing."""
    env_vars = {
        "SERVICE_NAME": "test-rpa-service",
        "SERVICE_PORT": "17198",
        "LOG_LEVEL": "DEBUG",
        "LOG_PATH": "/tmp/test-logs",
        "XIAOWU_RPA_PING_INTERVAL": "3",
        "XIAOWU_RPA_TASK_CREATE_URL": "https://api.test.com/tasks",
        "XIAOWU_RPA_TASK_QUERY_INTERVAL": "10",
        "XIAOWU_RPA_TASK_QUERY_URL": "https://api.test.com/tasks/query",
        "XIAOWU_RPA_TIMEOUT": "300",
        "OTLP_ENABLE": "false",
        "OTLP_DC": "test-dc",
        "OTLP_SERVICE_NAME": "test-service",
        "KAFKA_TOPIC": "test-topic",
        "OTLP_ENDPOINT": "http://otlp.test.com",
        "KAFKA_SERVERS": "localhost:9092",
        "KAFKA_TIMEOUT": "30",
    }

    with patch.dict(os.environ, env_vars, clear=False):
        yield env_vars


@pytest.fixture
def mock_logger() -> Generator[MagicMock, None, None]:
    """Fixture providing a mocked logger for testing."""
    with patch("plugin.rpa.utils.log.logger.logger") as mock_logger:
        yield mock_logger


@pytest.fixture
def mock_httpx_client() -> Generator[MagicMock, None, None]:
    """Fixture providing a mocked httpx AsyncClient for testing."""
    with patch("httpx.AsyncClient") as mock_client:
        mock_instance = MagicMock()
        mock_client.return_value.__aenter__.return_value = mock_instance
        mock_client.return_value.__aexit__.return_value = None
        yield mock_instance


@pytest.fixture
def sample_rpa_request() -> dict[str, Any]:
    """Fixture providing a sample RPA execution request."""
    return {
        "sid": "test-sid-123",
        "project_id": "test-project-456",
        "exec_position": "EXECUTOR",
        "params": {"key1": "value1", "key2": "value2"},
    }


@pytest.fixture
def sample_rpa_response() -> dict[str, Any]:
    """Fixture providing a sample RPA execution response."""
    return {
        "code": 0,
        "message": "Success",
        "sid": "test-sid-123",
        "data": {"result": "completed", "output": "Task finished successfully"},
    }


@pytest.fixture
def mock_task_api_response() -> dict[str, Any]:
    """Fixture providing mocked task API responses."""
    return {
        "create_success": {
            "code": "0000",
            "msg": "Success",
            "data": {"executionId": "task-12345"},
        },
        "create_error": {"code": "5001", "msg": "Invalid project ID", "data": None},
        "query_completed": {
            "code": "0000",
            "msg": "Success",
            "data": {
                "execution": {
                    "status": "COMPLETED",
                    "result": {"data": {"output": "Task completed successfully"}},
                }
            },
        },
        "query_pending": {
            "code": "0000",
            "msg": "Success",
            "data": {"execution": {"status": "PENDING"}},
        },
        "query_failed": {
            "code": "0000",
            "msg": "Success",
            "data": {
                "execution": {"status": "FAILED", "error": "Task execution failed"}
            },
        },
    }


@pytest.fixture
def config_file_content() -> str:
    """Fixture providing sample configuration file content."""
    return """# RPA Service Configuration
SERVICE_NAME=rpa-test-service
SERVICE_PORT=17198
LOG_LEVEL=DEBUG
LOG_PATH=/var/log/rpa

# RPA specific settings
XIAOWU_RPA_PING_INTERVAL=3
XIAOWU_RPA_TASK_CREATE_URL=https://api.test.com/tasks
XIAOWU_RPA_TASK_QUERY_INTERVAL=10
XIAOWU_RPA_TASK_QUERY_URL=https://api.test.com/tasks/query
XIAOWU_RPA_TIMEOUT=300

# OTLP settings
OTLP_ENABLE=false
OTLP_DC=test-dc
KAFKA_TOPIC=rpa-events
"""


@pytest.fixture
def temp_config_file(temp_dir: Path, config_file_content: str) -> Path:
    """Fixture providing a temporary configuration file."""
    config_file = temp_dir / "test-config.env"
    config_file.write_text(config_file_content)
    return config_file


@pytest.fixture(autouse=True)
def reset_environment() -> Generator[None, None, None]:
    """Fixture to reset environment after each test."""
    # Store original environment
    original_env = dict(os.environ)

    yield

    # Restore original environment
    os.environ.clear()
    os.environ.update(original_env)


@pytest.fixture
def mock_span_and_trace() -> dict[str, MagicMock]:
    """Fixture providing mocked span and trace objects."""
    mock_span = MagicMock()
    mock_span.sid = "test-span-sid"
    mock_span_context = MagicMock()
    mock_span_context.sid = "test-span-context-sid"
    mock_span_context.app_id = "test-app-id"

    mock_span.start.return_value.__enter__ = MagicMock(return_value=mock_span_context)
    mock_span.start.return_value.__exit__ = MagicMock(return_value=None)

    mock_node_trace = MagicMock()
    mock_node_trace.sid = "test-trace-sid"

    return {
        "span": mock_span,
        "span_context": mock_span_context,
        "node_trace": mock_node_trace,
    }


@pytest.fixture
def mock_meter() -> MagicMock:
    """Fixture providing a mocked meter object."""
    mock_meter = MagicMock()
    mock_meter.in_success_count = MagicMock()
    mock_meter.in_error_count = MagicMock()
    return mock_meter


@pytest.fixture
def mock_kafka_service() -> MagicMock:
    """Fixture providing a mocked Kafka producer service."""
    mock_service = MagicMock()
    mock_service.send = MagicMock()
    return mock_service


# Pytest configuration
def pytest_configure(config: Any) -> None:
    """Configure pytest with custom markers."""
    config.addinivalue_line("markers", "unit: mark test as a unit test")
    config.addinivalue_line("markers", "integration: mark test as an integration test")
    config.addinivalue_line("markers", "slow: mark test as slow running")


def pytest_collection_modifyitems(config: Any, items: Any) -> None:
    """Automatically mark tests based on their location."""
    for item in items:
        if "unit" in str(item.fspath):
            item.add_marker(pytest.mark.unit)
        elif "integration" in str(item.fspath):
            item.add_marker(pytest.mark.integration)
