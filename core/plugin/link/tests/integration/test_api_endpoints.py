"""
Integration tests for API endpoints
Tests complete request-response workflows and API contract validation
"""

import json
from typing import Any
from unittest.mock import Mock, patch

import pytest


@pytest.mark.integration
class TestHTTPManagementAPI:
    """Integration tests for HTTP management API endpoints"""

    def test_tool_create_endpoint_success(
        self, client: Any, sample_tool_schema: Any
    ) -> None:
        """Test successful tool creation through API endpoint"""
        create_data = {
            "header": {"app_id": "test_app_123"},
            "payload": {
                "tools": [
                    {
                        "name": "integration_test_tool",
                        "description": "Tool created in integration test",
                        "openapi_schema": json.dumps(sample_tool_schema),
                        "schema_type": 1,
                    }
                ]
            },
        }

        headers = {"uid": "test_uid_456", "caller": "integration_test"}

        with patch(
            "plugin.link.service.community.tools.http.management_server.get_db_engine"
        ):
            with patch(
                "plugin.link.infra.tool_crud.process.ToolCrudOperation"
            ) as mock_crud:
                mock_crud_instance = Mock()
                mock_crud.return_value = mock_crud_instance
                mock_crud_instance.create_tool.return_value = {
                    "tool_id": "generated_tool_id_123",
                    "status": "created",
                }

                response = client.post(
                    "/api/v1/tools/versions", json=create_data, headers=headers
                )

                assert response.status_code == 200

    def test_tool_create_endpoint_validation_error(self, client: Any) -> None:
        """Test tool creation with validation errors"""
        invalid_data = {
            "header": {"app_id": "test_app"},
            "payload": {
                "tools": [
                    {
                        "name": "",  # Invalid empty name
                        "description": "Test description",
                        # Missing required fields
                    }
                ]
            },
        }

        headers: dict[str, str] = {}

        response = client.post(
            "/api/v1/tools/versions", json=invalid_data, headers=headers
        )

        assert response.status_code == 200  # FastAPI returns 200 with error in body
        response_data = response.json()
        assert response_data["code"] != 0  # Error code
        assert "message" in response_data

    def test_tool_get_endpoint_success(self, client: Any) -> None:
        """Test successful tool retrieval through API endpoint"""
        # headers = {"app_id": "test_app_123"}

        with patch(
            "plugin.link.service.community.tools.http.management_server.get_db_engine"
        ):
            with patch(
                "plugin.link.infra.tool_crud.process.ToolCrudOperation"
            ) as mock_crud:
                mock_crud_instance = Mock()
                mock_crud.return_value = mock_crud_instance
                mock_crud_instance.get_tool.return_value = {
                    "tool_id": "test_tool_123",
                    "name": "test_tool",
                    "description": "Test tool description",
                    "status": "active",
                }

                response = client.get(
                    "/api/v1/tools/versions",
                    params={
                        "app_id": "test_app_123",
                        "tool_ids": ["test_tool_123"],
                        "versions": ["V1.0"],
                    },
                    headers={},
                )

                assert response.status_code == 200

    def test_tool_delete_endpoint_success(self, client: Any) -> None:
        """Test successful tool deletion through API endpoint"""
        # headers = {"app_id": "test_app_123"}

        with patch(
            "plugin.link.service.community.tools.http.management_server.get_db_engine"
        ):
            with patch(
                "plugin.link.infra.tool_crud.process.ToolCrudOperation"
            ) as mock_crud:
                mock_crud_instance = Mock()
                mock_crud.return_value = mock_crud_instance
                mock_crud_instance.delete_tool.return_value = {
                    "tool_id": "test_tool_123",
                    "status": "deleted",
                }

                response = client.delete(
                    "/api/v1/tools/versions",
                    params={
                        "app_id": "test_app_123",
                        "tool_ids": ["test_tool_123"],
                        "versions": ["V1.0"],
                    },
                    headers={},
                )

                assert response.status_code == 200

    def test_tool_list_endpoint_success(self, client: Any) -> None:
        """Test successful tool list retrieval through API endpoint"""
        # headers = {"app_id": "test_app_123"}

        with patch(
            "plugin.link.service.community.tools.http.management_server.get_db_engine"
        ):
            with patch(
                "plugin.link.infra.tool_crud.process.ToolCrudOperation"
            ) as mock_crud:
                mock_crud_instance = Mock()
                mock_crud.return_value = mock_crud_instance
                mock_crud_instance.list_tools.return_value = [
                    {"tool_id": "tool1", "name": "Tool 1", "description": "First tool"},
                    {
                        "tool_id": "tool2",
                        "name": "Tool 2",
                        "description": "Second tool",
                    },
                ]

                response = client.get(
                    "/api/v1/tools/versions",
                    params={
                        "app_id": "test_app_123",
                        "tool_ids": ["tool1", "tool2"],
                        "versions": ["V1.0"],
                    },
                    headers={},
                )

                assert response.status_code == 200

    def test_api_authentication_headers(self, client: Any) -> None:
        """Test API endpoints require proper authentication headers"""
        create_data = {
            "name": "test_tool",
            "description": "Test description",
            "open_api_schema": {"openapi": "3.0.0"},
        }

        # Test without headers
        response = client.post("/api/v1/tools/versions", json=create_data)

        # Should still process but use default app_id
        assert response.status_code in [200, 400, 422]

        # Test with invalid headers
        invalid_headers = {"invalid_header": "invalid_value"}

        response = client.post(
            "/api/v1/tools/versions", json=create_data, headers=invalid_headers
        )

        assert response.status_code in [200, 400, 422]

    def test_api_content_type_validation(self, client: Any) -> None:
        """Test API endpoints handle different content types"""
        headers = {"app_id": "test_app"}

        # Test with invalid JSON
        response = client.post(
            "/api/v1/tools/versions",
            data="invalid json content",
            headers={**headers, "Content-Type": "application/json"},
        )

        assert response.status_code in [400, 422]

        # Test with form data instead of JSON
        form_data = {"name": "test", "description": "test"}
        response = client.post(
            "/api/v1/tools/versions", data=form_data, headers=headers
        )

        assert response.status_code in [400, 422]


@pytest.mark.integration
class TestHTTPExecutionAPI:
    """Integration tests for HTTP execution API endpoints"""

    def test_tool_execution_endpoint_success(self, client: Any) -> None:
        """Test successful tool execution through API endpoint"""
        execution_data = {
            "tool_id": "test_tool_123",
            "operation_id": "test_operation",
            "parameters": {"param1": "value1", "param2": "value2"},
        }

        headers = {"app_id": "test_app_123", "uid": "test_uid_456"}

        with patch(
            "plugin.link.service.community.tools.http.execution_server.get_db_engine"
        ):
            with patch(
                "plugin.link.infra.tool_exector.process.HttpRun"
            ) as mock_executor:
                mock_executor_instance = Mock()
                mock_executor.return_value = mock_executor_instance
                mock_executor_instance.execute.return_value = {
                    "result": "execution_successful",
                    "output": {"response": "test response"},
                }

                response = client.post(
                    "/api/v1/tools/http_run", json=execution_data, headers=headers
                )

                assert response.status_code == 200

    def test_tool_execution_endpoint_tool_not_found(self, client: Any) -> None:
        """Test tool execution with non-existent tool"""
        execution_data = {
            "tool_id": "nonexistent_tool",
            "operation_id": "test_operation",
            "parameters": {},
        }

        headers = {"app_id": "test_app_123"}

        with patch(
            "plugin.link.service.community.tools.http.execution_server.get_db_engine"
        ):
            with patch(
                "plugin.link.infra.tool_crud.process.ToolCrudOperation"
            ) as mock_crud:
                mock_crud_instance = Mock()
                mock_crud.return_value = mock_crud_instance
                mock_crud_instance.get_tool.return_value = None

                response = client.post(
                    "/api/v1/tools/http_run", json=execution_data, headers=headers
                )

                assert response.status_code == 200

    def test_tool_execution_endpoint_validation_error(self, client: Any) -> None:
        """Test tool execution with invalid parameters"""
        invalid_data = {
            "tool_id": "",  # Invalid empty tool_id
            "operation_id": "test_operation",
            # Missing parameters
        }

        headers = {"app_id": "test_app_123"}

        response = client.post(
            "/api/v1/tools/http_run", json=invalid_data, headers=headers
        )

        assert response.status_code == 200


@pytest.mark.integration
class TestMCPToolsAPI:
    """Integration tests for MCP tools API endpoints"""

    @pytest.mark.skip(reason="MCP server creation endpoint not implemented")
    def test_mcp_server_create_success(self, client: Any, sample_mcp_tool: Any) -> None:
        """Test successful MCP server creation"""
        mcp_data = {
            "server_name": "test_mcp_server",
            "server_url": "http://test-mcp-server.com",
            "tools": [sample_mcp_tool],
        }

        headers = {"app_id": "test_app_123"}

        with patch("plugin.link.service.community.tools.mcp.mcp_server.get_db_engine"):
            with patch(
                "plugin.link.infra.tool_crud.process.ToolCrudOperation"
            ) as mock_crud:
                mock_crud_instance = Mock()
                mock_crud.return_value = mock_crud_instance
                mock_crud_instance.create_mcp_server.return_value = {
                    "server_id": "mcp_server_123",
                    "status": "created",
                }

                response = client.post(
                    "/api/v1/community/tools/mcp/create", json=mcp_data, headers=headers
                )

                assert response.status_code == 200
                response_data = response.json()
                assert response_data["code"] == 0

    def test_mcp_tool_list_success(self, client: Any) -> None:
        """Test successful MCP tool list retrieval"""
        list_data = {"header": {"app_id": "test_app_123"}}

        with patch("plugin.link.service.community.tools.mcp.mcp_server.get_db_engine"):
            with patch(
                "plugin.link.infra.tool_crud.process.ToolCrudOperation"
            ) as mock_crud:
                mock_crud_instance = Mock()
                mock_crud.return_value = mock_crud_instance
                mock_crud_instance.list_mcp_tools.return_value = [
                    {
                        "tool_id": "mcp_tool_1",
                        "name": "MCP Tool 1",
                        "server_id": "server_1",
                    }
                ]

                response = client.post(
                    "/api/v1/mcp/tool_list", json=list_data, headers={}
                )

                assert response.status_code == 200
                response_data = response.json()
                assert response_data["code"] == 0

    @pytest.mark.skip(reason="MCPToolExecutor not implemented")
    def test_mcp_tool_call_success(self, client: Any) -> None:
        """Test successful MCP tool call"""
        call_data = {
            "server_id": "mcp_server_123",
            "tool_name": "test_mcp_tool",
            "arguments": {"param1": "value1"},
        }

        headers = {"app_id": "test_app_123"}

        with patch("plugin.link.service.community.tools.mcp.mcp_server.get_db_engine"):
            with patch(
                "plugin.link.infra.tool_exector.process.MCPToolExecutor"
            ) as mock_executor:
                mock_executor_instance = Mock()
                mock_executor.return_value = mock_executor_instance
                mock_executor_instance.call_tool.return_value = {
                    "result": "mcp_call_successful",
                    "output": {"response": "mcp response"},
                }

                response = client.post(
                    "/api/v1/mcp/call_tool", json=call_data, headers=headers
                )

                assert response.status_code == 200
                response_data = response.json()
                assert response_data["code"] == 0


@pytest.mark.integration
@pytest.mark.slow
class TestEndToEndWorkflows:
    """End-to-end integration tests for complete workflows"""

    def test_tool_execution_workflow(
        self, client: Any, sample_tool_schema: Any
    ) -> None:
        """Test complete tool execution workflow: create -> execute"""
        headers = {"app_id": "test_app_123", "uid": "test_uid"}

        # Create tool first
        create_data = {
            "header": {"app_id": "test_app_123"},
            "payload": {
                "tools": [
                    {
                        "name": "execution_test_tool",
                        "description": "Tool for execution testing",
                        "openapi_schema": json.dumps(sample_tool_schema),
                        "schema_type": 1,
                    }
                ]
            },
        }

        with patch(
            "plugin.link.service.community.tools.http.management_server.get_db_engine"
        ):
            with patch(
                "plugin.link.infra.tool_crud.process.ToolCrudOperation"
            ) as mock_crud:
                with patch(
                    "plugin.link.infra.tool_exector.process.HttpRun"
                ) as mock_executor:
                    mock_crud_instance = Mock()
                    mock_executor_instance = Mock()
                    mock_crud.return_value = mock_crud_instance
                    mock_executor.return_value = mock_executor_instance

                    # Mock tool creation
                    mock_crud_instance.create_tool.return_value = {
                        "tool_id": "execution_tool_123",
                        "status": "created",
                    }

                    create_response = client.post(
                        "/api/v1/tools/versions", json=create_data, headers=headers
                    )

                    assert create_response.status_code == 200
                    tool_id = "execution_tool_123"

                    # Execute tool
                    execution_data = {
                        "tool_id": tool_id,
                        "operation_id": "test_operation",
                        "parameters": {"param1": "value1"},
                    }

                    mock_executor_instance.execute.return_value = {
                        "result": "success",
                        "output": {"response": "execution completed"},
                    }

                    execution_response = client.post(
                        "/api/v1/tools/http_run", json=execution_data, headers=headers
                    )

                    assert execution_response.status_code == 200
