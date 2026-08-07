"""
Pytest configuration and fixtures for common module tests
"""

from typing import Generator
from unittest.mock import Mock, patch

import pytest


@pytest.fixture
def mock_service() -> Mock:
    """Mock service for testing"""
    service = Mock()
    service.name = "test_service"
    service.ready = False
    service.teardown = Mock()
    service.set_ready = Mock()
    return service


@pytest.fixture
def mock_service_factory(mock_service: Mock) -> Mock:
    """Mock service factory for testing"""
    factory = Mock()
    factory.service_class = Mock()
    factory.service_class.name = "test_service"
    factory.create = Mock(return_value=mock_service)
    return factory


@pytest.fixture
def sample_config() -> dict:
    """Sample configuration for testing"""
    return {"test_key": "test_value", "nested": {"key": "value"}}


@pytest.fixture
def mock_environment() -> Generator[None, None, None]:
    """Mock environment variables"""
    with patch.dict(
        "os.environ",
        {
            "TEST_ENV_VAR": "test_value",
            "OTLP_ENDPOINT": "http://test-endpoint",
            "SERVICE_NAME": "test-service",
        },
    ):
        yield
