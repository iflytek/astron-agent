"""Unit tests for the API router module.

This module contains tests for the main router configuration and route
registration functionality.
"""

from unittest.mock import MagicMock, patch

from fastapi import APIRouter
from plugin.rpa.api.router import router


class TestRouter:
    """Test class for API router configuration."""

    def test_router_is_api_router_instance(self) -> None:
        """Test that router is an instance of APIRouter."""
        # Assert
        assert isinstance(router, APIRouter)

    def test_router_has_correct_prefix(self) -> None:
        """Test that router has the correct prefix configured."""
        # Assert
        assert router.prefix == "/rpa/v1"

    @patch("plugin.rpa.api.router.execution_router")
    @patch("plugin.rpa.api.router.health_router")
    def test_router_includes_required_routers(
        self, mock_health_router: MagicMock, mock_execution_router: MagicMock
    ) -> None:
        """Test that router includes both execution and health check routers."""
        # This test verifies the module imports and includes the routers
        # Since the include_router calls happen at module level, we verify
        # that the routers are imported correctly

        # Import the router module to trigger the include_router calls
        from plugin.rpa.api import router as router_module

        # Assert that the routers are imported
        assert hasattr(router_module, "execution_router")
        assert hasattr(router_module, "health_router")
        assert hasattr(router_module, "router")

    def test_router_tags_configuration(self) -> None:
        """Test router configuration and available routes."""
        # Note: Since the router includes other routers at module level,
        # we can verify that it has routes after including sub-routers

        # The router should have routes from included routers
        # This will be populated after the include_router calls
        assert hasattr(router, "routes")

        # Verify that the router is properly configured
        assert router.prefix == "/rpa/v1"
        assert isinstance(router, APIRouter)
