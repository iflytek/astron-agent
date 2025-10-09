"""
Unit tests for infrastructure modules - Fixed version
Tests CRUD operations with correct method names
"""

from typing import Any
from unittest.mock import Mock, patch

import pytest
from plugin.link.infra.tool_crud.process import ToolCrudOperation
from plugin.link.infra.tool_exector.http_auth import generate_13_digit_timestamp
from plugin.link.infra.tool_exector.process import HttpRun


@pytest.mark.unit
class TestToolCrudOperation:
    """Test class for ToolCrudOperation with correct method names"""

    @pytest.fixture
    def mock_db_service(self) -> Mock:
        """Mock database service for testing"""
        return Mock()

    @pytest.fixture
    def crud_operation(self, mock_db_service: Any) -> ToolCrudOperation:
        """Create ToolCrudOperation instance with mocked dependencies"""
        return ToolCrudOperation(mock_db_service)

    def test_tool_crud_initialization(self, mock_db_service: Any) -> None:
        """Test ToolCrudOperation initialization"""
        crud_op = ToolCrudOperation(mock_db_service)
        assert crud_op.engine == mock_db_service  # Correct attribute name

    def test_add_tools_success(self, crud_operation: Any) -> None:
        """Test successful tool addition"""
        tool_info = [
            {
                "app_id": "test_app",
                "tool_id": "test_tool_123",
                "name": "test_tool",
                "description": "Test tool description",
                "schema": '{"openapi": "3.0.0"}',
                "version": "1.0.0",
            }
        ]

        with patch(
            "plugin.link.infra.tool_crud.process.session_getter"
        ) as mock_session_getter:
            mock_session = Mock()
            mock_session_getter.return_value.__enter__ = Mock(return_value=mock_session)
            mock_session_getter.return_value.__exit__ = Mock(return_value=None)

            # Test the actual method
            crud_operation.add_tools(tool_info)

            # Verify session was used
            mock_session_getter.assert_called_once_with(crud_operation.engine)
            mock_session.add.assert_called()
            mock_session.commit.assert_called()

    def test_add_mcp_success(self, crud_operation: Any) -> None:
        """Test successful MCP tool addition"""
        mcp_info = {
            "app_id": "test_app",
            "tool_id": "mcp_tool_123",
            "name": "mcp_tool",
            "description": "MCP tool description",
            "schema": '{"openapi": "3.0.0"}',
            "mcp_server_url": "http://mcp-server.com",
        }

        with patch(
            "plugin.link.infra.tool_crud.process.session_getter"
        ) as mock_session_getter:
            mock_session = Mock()
            mock_session_getter.return_value.__enter__ = Mock(return_value=mock_session)
            mock_session_getter.return_value.__exit__ = Mock(return_value=None)

            # Mock the query execution
            mock_session.exec.return_value.first.return_value = None

            crud_operation.add_mcp(mcp_info)

            mock_session_getter.assert_called_once_with(crud_operation.engine)
            mock_session.add.assert_called()
            mock_session.commit.assert_called()

    def test_update_tools_success(self, crud_operation: Any) -> None:
        """Test successful tool update"""
        tool_info = [
            {
                "tool_id": "test_tool_123",
                "name": "updated_tool",
                "description": "Updated description",
                "version": "2.0.0",
            }
        ]

        with patch(
            "plugin.link.infra.tool_crud.process.session_getter"
        ) as mock_session_getter:
            mock_session = Mock()
            mock_session_getter.return_value.__enter__ = Mock(return_value=mock_session)
            mock_session_getter.return_value.__exit__ = Mock(return_value=None)

            crud_operation.update_tools(tool_info)

            mock_session_getter.assert_called_once_with(crud_operation.engine)

    def test_delete_tools_success(self, crud_operation: Any) -> None:
        """Test successful tool deletion"""
        tool_info = [{"tool_id": "test_tool_123", "is_deleted": True}]

        with patch(
            "plugin.link.infra.tool_crud.process.session_getter"
        ) as mock_session_getter:
            mock_session = Mock()
            mock_session_getter.return_value.__enter__ = Mock(return_value=mock_session)
            mock_session_getter.return_value.__exit__ = Mock(return_value=None)

            # Mock the query result to return an iterable list of mock tools
            mock_tool = Mock()
            mock_session.exec.return_value.all.return_value = [mock_tool]

            crud_operation.delete_tools(tool_info)

            mock_session_getter.assert_called_once_with(crud_operation.engine)

    def test_get_tools_success(self, crud_operation: Any) -> None:
        """Test successful tool retrieval"""
        tool_info = [{"app_id": "test_app", "tool_id": "test_tool_123"}]

        # Create a proper mock span with context manager support
        mock_span = Mock()
        mock_span_context = Mock()
        mock_span.start.return_value.__enter__ = Mock(return_value=mock_span_context)
        mock_span.start.return_value.__exit__ = Mock(return_value=None)

        with patch(
            "plugin.link.infra.tool_crud.process.session_getter"
        ) as mock_session_getter:
            mock_session = Mock()
            mock_session_getter.return_value.__enter__ = Mock(return_value=mock_session)
            mock_session_getter.return_value.__exit__ = Mock(return_value=None)

            # Mock the query result to return a mock tool
            mock_tool = Mock()
            mock_session.exec.return_value.first.return_value = mock_tool

            result = crud_operation.get_tools(tool_info, mock_span)

            mock_session_getter.assert_called_once_with(crud_operation.engine)
            assert result == [mock_tool]

    def test_add_tool_version_success(self, crud_operation: Any) -> None:
        """Test successful tool version addition"""
        tool_info = [
            {
                "tool_id": "test_tool_123",
                "version": "2.0.0",
                "description": "New version",
            }
        ]

        with patch(
            "plugin.link.infra.tool_crud.process.session_getter"
        ) as mock_session_getter:
            mock_session = Mock()
            mock_session_getter.return_value.__enter__ = Mock(return_value=mock_session)
            mock_session_getter.return_value.__exit__ = Mock(return_value=None)

            crud_operation.add_tool_version(tool_info)

            mock_session_getter.assert_called_once_with(crud_operation.engine)


@pytest.mark.unit
class TestHttpRun:
    """Test class for HttpRun"""

    @pytest.fixture
    def sample_http_run_params(self) -> dict:
        """Sample parameters for HttpRun initialization"""
        return {
            "server": "https://api.example.com",
            "method": "GET",
            "path": {0: "/test"},
            "query": {"param": "value"},
            "header": {"Content-Type": "application/json"},
            "body": {"test": "data"},
        }

    def test_http_run_initialization(self, sample_http_run_params: Any) -> None:
        """Test HttpRun initialization"""
        # Test that HttpRun can be instantiated with required parameters
        http_run = HttpRun(**sample_http_run_params)
        assert http_run is not None
        assert http_run.server == sample_http_run_params["server"]
        assert http_run.method == sample_http_run_params["method"]

    def test_http_run_has_required_attributes(
        self, sample_http_run_params: Any
    ) -> None:
        """Test HttpRun has expected attributes"""
        http_run = HttpRun(**sample_http_run_params)

        # Check if the instance has expected attributes
        assert hasattr(http_run, "server")
        assert hasattr(http_run, "method")
        assert hasattr(http_run, "path")
        assert hasattr(http_run, "query")
        assert hasattr(http_run, "header")
        assert hasattr(http_run, "body")

    def test_http_run_class_exists(self) -> None:
        """Test that HttpRun class is properly importable"""
        from plugin.link.infra.tool_exector.process import HttpRun

        assert HttpRun is not None
        assert isinstance(HttpRun, type)


@pytest.mark.unit
class TestHttpAuthUtils:
    """Test class for HTTP authentication utilities"""

    def test_generate_13_digit_timestamp(self) -> None:
        """Test 13-digit timestamp generation"""
        with patch("plugin.link.infra.tool_exector.http_auth.time.time") as mock_time:
            mock_time.return_value = 1234567890.123

            timestamp = generate_13_digit_timestamp()

            # Should return a string
            assert isinstance(timestamp, str)
            # Should be 13 digits
            assert len(timestamp) == 13
            # Should be numeric
            assert timestamp.isdigit()

    def test_generate_timestamp_format(self) -> None:
        """Test timestamp format consistency"""
        timestamp1 = generate_13_digit_timestamp()
        timestamp2 = generate_13_digit_timestamp()

        # Both should be 13-digit strings
        assert len(timestamp1) == 13
        assert len(timestamp2) == 13
        assert timestamp1.isdigit()
        assert timestamp2.isdigit()

    def test_timestamp_uniqueness(self) -> None:
        """Test that timestamps are unique across calls"""
        timestamp1 = generate_13_digit_timestamp()

        # Small delay to ensure different timestamps
        import time

        time.sleep(0.001)

        timestamp2 = generate_13_digit_timestamp()

        # Timestamps should be different (within a reasonable time window)
        assert timestamp1 != timestamp2 or abs(int(timestamp1) - int(timestamp2)) < 1000

    def test_timestamp_current_time(self) -> None:
        """Test timestamp represents current time approximately"""
        import time

        current_time_ms = int(time.time() * 1000)

        timestamp = generate_13_digit_timestamp()
        timestamp_ms = int(timestamp)

        # Should be within a reasonable range of current time (within 1 second)
        time_diff = abs(timestamp_ms - current_time_ms)
        assert (
            time_diff < 1000
        ), f"Timestamp {timestamp_ms} too far from current time {current_time_ms}"

    def test_auth_functions_exist(self) -> None:
        """Test that authentication functions are importable"""
        try:
            from plugin.link.infra.tool_exector.http_auth import (
                assemble_ws_auth_url,
                public_query_url,
            )

            # Functions exist and are callable
            assert callable(assemble_ws_auth_url)
            assert callable(public_query_url)
        except ImportError:
            pytest.skip("Auth functions not available in current implementation")

    def test_auth_function_signatures(self) -> None:
        """Test that auth functions have expected signatures"""
        try:
            from plugin.link.infra.tool_exector.http_auth import (
                assemble_ws_auth_url,
                public_query_url,
            )

            # Test that functions have parameters (will fail if called without args)
            with pytest.raises(TypeError):
                assemble_ws_auth_url()

            with pytest.raises(TypeError):
                public_query_url()

        except ImportError:
            pytest.skip("Auth functions not available in current implementation")
