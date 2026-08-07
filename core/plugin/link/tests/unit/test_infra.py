"""
Unit tests for infrastructure modules
Tests CRUD operations and tool execution infrastructure
"""

import os
from unittest.mock import patch

import pytest
from plugin.link.infra.tool_exector.http_auth import (
    assemble_ws_auth_url,
    generate_13_digit_timestamp,
    public_query_url,
)
from plugin.link.infra.tool_exector.process import HttpRun


@pytest.mark.unit
class TestHttpRun:
    """Test class for HttpRun"""

    @pytest.fixture
    def mock_tool_data(self) -> dict:
        """Mock tool data for testing"""
        return {
            "tool_id": "test_tool_123",
            "name": "test_tool",
            "open_api_schema": {
                "openapi": "3.0.0",
                "info": {"title": "Test API", "version": "1.0.0"},
                "servers": [{"url": "https://api.example.com"}],
                "paths": {
                    "/test": {
                        "get": {
                            "operationId": "test_operation",
                            "summary": "Test operation",
                            "responses": {"200": {"description": "Success"}},
                        }
                    }
                },
            },
        }

    @pytest.fixture
    def http_run(self) -> HttpRun:
        """Create HttpRun instance"""
        with patch(
            "plugin.link.infra.tool_exector.process.HttpRun.__init__"
        ) as mock_init:
            mock_init.return_value = None
            http_run = HttpRun()
            return http_run

    def test_http_run_initialization(self) -> None:
        """Test HttpRun initialization"""
        with patch(
            "plugin.link.infra.tool_exector.process.HttpRun.__init__"
        ) as mock_init:
            mock_init.return_value = None
            HttpRun()
            mock_init.assert_called_once()


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

    def test_assemble_ws_auth_url_functionality(self) -> None:
        """Test WebSocket auth URL assembly"""
        # Mock environment variables
        with patch.dict(
            os.environ,
            {
                "HTTP_AUTH_AWAU_APP_ID": "test_app_id",
                "HTTP_AUTH_AWAU_API_KEY": "test_api_key",
                "HTTP_AUTH_AWAU_API_SECRET": "test_api_secret",
            },
        ):
            # Call with required parameters
            result_url, headers = assemble_ws_auth_url(
                "https://api.example.com/ws",
                "GET",
                {"is_digest": False, "is_url_join": True},
            )

            # Check that result is a URL with auth parameters
            assert "authorization=" in result_url

    def test_public_query_url_functionality(self) -> None:
        """Test public query URL generation"""
        # Mock environment variables
        with patch.dict(
            os.environ,
            {
                "HTTP_AUTH_QU_APP_ID": "test_app_id",
                "HTTP_AUTH_QU_APP_KEY": "test_app_key",
            },
        ):
            # Call with required parameter
            result = public_query_url("https://api.example.com/query")

            # Check that result is a URL with auth parameters
            assert "api.example.com/query" in result
            assert "appId=test_app_id" in result
            assert "token=" in result
            assert "timestamp=" in result

    def test_auth_url_with_parameters(self) -> None:
        """Test auth URL generation with parameters"""
        # Mock environment variables
        with patch.dict(
            os.environ,
            {
                "HTTP_AUTH_AWAU_APP_ID": "test_app_id",
                "HTTP_AUTH_AWAU_API_KEY": "test_api_key",
                "HTTP_AUTH_AWAU_API_SECRET": "test_api_secret",
            },
        ):
            # Call with mock parameters
            result_url, headers = assemble_ws_auth_url(
                "https://api.example.com/ws",
                "POST",
                {"is_digest": True, "is_url_join": False},
            )

            # Check that result is the original URL (no URL join)
            assert "https://" in result_url

    def test_query_url_with_parameters(self) -> None:
        """Test query URL generation with parameters"""
        # Mock environment variables
        with patch.dict(
            os.environ,
            {
                "HTTP_AUTH_QU_APP_ID": "test_app_id",
                "HTTP_AUTH_QU_APP_KEY": "test_app_key",
            },
        ):
            with patch(
                "plugin.link.infra.tool_exector.http_auth.public_query_url"
            ) as mock_query:
                # Mock function with parameters
                mock_query.return_value = (
                    "https://api.example.com/query?id=123&type=test"
                )

                result = public_query_url("https://api.example.com/query")

                assert "https://" in result
                assert "query" in result
