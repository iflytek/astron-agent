"""
Pytest configuration and fixtures for link plugin tests
"""

import os
import sys
from pathlib import Path
from typing import Any, Generator
from unittest.mock import Mock, patch

import pytest
from fastapi.testclient import TestClient

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(project_root.parent))
sys.path.insert(0, str(project_root.parent.parent))

# Early initialization of SID generator mock to prevent issues during session
# Create mock SID generator that can be imported everywhere
mock_sid_generator = Mock()
mock_sid_generator.gen.return_value = "test_sid_123"

# Patch both plugin and common modules before any imports
mock_sid_module = Mock()
mock_sid_module.sid_generator2 = mock_sid_generator
mock_sid_module.new_sid = Mock(return_value="test_sid_123")
mock_sid_module.get_sid_generate = Mock(return_value=mock_sid_generator)
sys.modules["plugin.link.utils.sid.sid_generator2"] = mock_sid_module

try:
    mock_common_sid_module = Mock()
    mock_common_sid_module.sid_generator2 = mock_sid_generator
    sys.modules["common.utils.sid.sid_generator2"] = mock_common_sid_module
except Exception:
    pass

# Also patch the common span module to prevent sid_generator2 check
try:
    import common.otlp.trace.span as common_span_module

    # Mock the sid_generator2 reference in the common module
    common_span_module.sid_module = Mock()
    common_span_module.sid_module.sid_generator2 = mock_sid_generator
except Exception:
    pass


@pytest.fixture(scope="session")
def test_env() -> Generator[dict, None, None]:
    """Set up test environment variables"""
    test_env_vars = {
        "CONFIG_ENV_PATH": str(project_root / "config.env"),
        "MYSQL_HOST": "localhost",
        "MYSQL_PORT": "3306",
        "MYSQL_USER": "test_user",
        "MYSQL_PASSWORD": "test_password",
        "MYSQL_DATABASE": "test_db",
        "REDIS_HOST": "localhost",
        "REDIS_PORT": "6379",
        "LOG_LEVEL": "DEBUG",
        "LOG_PATH": "logs/test.log",
        "SERVICE_PORT": "8080",
        "USE_POLARIS": "false",
        "MYSQL_DB": "test_db",
    }

    with patch.dict(os.environ, test_env_vars):
        yield test_env_vars


@pytest.fixture
def mock_db() -> Mock:
    """Mock database connection"""
    return Mock()


@pytest.fixture
def mock_redis() -> Mock:
    """Mock Redis connection"""
    return Mock()


@pytest.fixture
def mock_logger() -> Mock:
    """Mock logger instance"""
    return Mock()


@pytest.fixture
def sample_tool_schema() -> dict:
    """Sample tool schema for testing"""
    return {
        "openapi": "3.1.0",
        "info": {"title": "Test Tool", "version": "1.0.0"},
        "paths": {
            "/test": {
                "get": {
                    "description": "Test endpoint",
                    "operationId": "test--beta-pzbKElZp",
                    "responses": {"200": {"description": "Success"}},
                }
            }
        },
    }


@pytest.fixture
def sample_mcp_tool() -> dict:
    """Sample MCP tool configuration"""
    return {
        "name": "test_mcp_tool",
        "description": "Test MCP tool",
        "inputSchema": {"type": "object", "properties": {"param1": {"type": "string"}}},
    }


# Sample schemas for testing - defined at module level for proper scope
update_schema = """{
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "properties": {
        "header": {
            "type": "object",
            "properties": {
                "app_id": {"type": "string"}
            },
            "required": ["app_id"]
        },
        "payload": {
            "type": "object",
            "properties": {
                "tools": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string"},
                            "name": {"type": "string"},
                            "description": {"type": "string"},
                            "schema_type": {"type": "integer"},
                            "openapi_schema": {"type": "string"}
                        }
                    }
                },
                "required": ["tools"]
            }
        },
        "required": ["header", "payload"]
    }
}"""

create_schema = """{
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
            "header": {
                "type": "object",
                "properties": {
                    "app_id": {"type": "string"}
                },
                "required": ["app_id"]
            },
            "payload": {
                "type": "object",
                "properties": {
                    "tools": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "description": {"type": "string"},
                                "schema_type": {"type": "integer"},
                                "openapi_schema": {"type": "string"}
                            }
                        }
                    }
                },
                "required": ["tools"]
            }
        },
        "required": ["header", "payload"]
    }"""

http_run_schema = """{
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "properties": {
        "tool_id": {"type": "string"},
        "operation_id": {"type": "string"},
        "parameters": {"type": "object"}
    },
    "required": ["tool_id", "operation_id"]
}"""


# Global patch for schema functions to ensure they're always mocked
@pytest.fixture(scope="session", autouse=True)
def patch_schema_functions() -> Generator[None, None, None]:
    """Automatically patch schema functions for all tests"""
    with patch(
        "plugin.link.utils.json_schemas.read_json_schemas.get_update_tool_schema",
        return_value=update_schema,
    ), patch(
        "plugin.link.utils.json_schemas.read_json_schemas.get_create_tool_schema",
        return_value=create_schema,
    ), patch(
        "plugin.link.utils.json_schemas.read_json_schemas.get_http_run_schema",
        return_value=http_run_schema,
    ), patch(
        "plugin.link.utils.json_schemas.read_json_schemas.get_tool_debug_schema",
        return_value=update_schema,
    ), patch(
        "plugin.link.utils.json_schemas.read_json_schemas.get_mcp_register_schema",
        return_value=create_schema,
    ), patch(
        "plugin.link.utils.json_schemas.read_json_schemas.load_update_tool_schema"
    ), patch(
        "plugin.link.utils.json_schemas.read_json_schemas.load_create_tool_schema"
    ), patch(
        "plugin.link.utils.json_schemas.read_json_schemas.load_http_run_schema"
    ), patch(
        "plugin.link.utils.json_schemas.read_json_schemas.load_tool_debug_schema"
    ), patch(
        "plugin.link.utils.json_schemas.read_json_schemas.load_mcp_register_schema"
    ):
        yield


@pytest.fixture(scope="session")
def app(test_env: Any) -> Generator:
    """FastAPI test application"""

    # Mock environment setup to avoid loading real config
    from contextlib import ExitStack

    with ExitStack() as stack:
        # Setup all patches
        stack.enter_context(patch("plugin.link.main.load_env_file"))
        stack.enter_context(patch("plugin.link.main.setup_python_path"))
        stack.enter_context(patch("plugin.link.domain.models.manager.init_data_base"))
        # Schema patches are handled by autouse fixture
        stack.enter_context(
            patch(
                "plugin.link.utils.snowflake.gen_snowflake.gen_id",
                return_value=1234567890,
            )
        )
        stack.enter_context(
            patch("plugin.link.utils.sid.sid_generator2.spark_link_init_sid")
        )
        stack.enter_context(
            patch(
                "plugin.link.utils.sid.sid_generator2.new_sid",
                return_value="test_sid_123",
            )
        )
        mock_get_sid = stack.enter_context(
            patch("plugin.link.utils.sid.sid_generator2.get_sid_generate")
        )
        mock_sid_global = stack.enter_context(
            patch("plugin.link.utils.sid.sid_generator2.sid_generator2", create=True)
        )
        mock_setup_span = stack.enter_context(
            patch(
                "plugin.link.service.community.tools.http.management_server.setup_span_and_trace_mgmt"
            )
        )
        stack.enter_context(patch("plugin.link.utils.log.logger.configure"))
        mock_span = stack.enter_context(patch("common.otlp.trace.span.Span"))
        mock_local_span = stack.enter_context(
            patch("plugin.link.utils.otlp.trace.span.Span")
        )
        # Configure mock SID generator
        mock_sid_generator = Mock()
        mock_sid_generator.gen.return_value = "test_sid_123"
        mock_get_sid.return_value = mock_sid_generator
        mock_sid_global.return_value = mock_sid_generator

        # Configure mock setup_span_and_trace_mgmt to return proper span and trace
        mock_node_trace = Mock()
        mock_node_trace.sid = "test_sid_123"
        mock_node_trace.chat_id = "test_sid_123"

        mock_setup_span.return_value = (mock_span, mock_node_trace)

        # Configure mock span
        mock_span_instance = Mock()
        mock_span.return_value = mock_span_instance
        mock_span_instance.get_context.return_value = "test_span_context"
        mock_span_instance.sid = "test_sid_123"  # Add sid attribute to span instance

        # Make the span support context manager protocol
        mock_span_context = Mock()
        mock_span_context.sid = "test_sid_123"
        mock_span_context.app_id = "test_app_123"
        mock_span_context.uid = "test_uid_456"
        mock_span_context.set_attributes = Mock()

        # Configure the context manager for the span
        mock_context_manager = Mock()
        mock_context_manager.__enter__ = Mock(return_value=mock_span_context)
        mock_context_manager.__exit__ = Mock(return_value=None)
        mock_span_instance.start.return_value = mock_context_manager

        # Also configure the direct span object to have proper sid
        mock_span.sid = "test_sid_123"
        mock_span.start = Mock(return_value=mock_context_manager)

        # Configure local span (plugin.link.utils.otlp.trace.span.Span) as well
        mock_local_span_instance = Mock()
        mock_local_span.return_value = mock_local_span_instance
        mock_local_span_instance.sid = "test_sid_123"
        mock_local_span_instance.start = Mock(return_value=mock_context_manager)

        from plugin.link.app.start_server import spark_link_app

        fastapi_app = spark_link_app()
        yield fastapi_app


@pytest.fixture(scope="session")
def client(app: Any) -> TestClient:
    """Test client for FastAPI application"""
    return TestClient(app)


# Pytest markers
pytest_markers = {
    "unit": "Unit tests - test individual functions/classes in isolation",
    "integration": "Integration tests - test component interactions",
    "slow": "Slow tests that may take longer to execute",
    "database": "Tests that require database connectivity",
    "redis": "Tests that require Redis connectivity",
    "network": "Tests that require network connectivity",
}


# Register markers
def pytest_configure(config: Any) -> None:
    for marker, description in pytest_markers.items():
        config.addinivalue_line("markers", f"{marker}: {description}")
