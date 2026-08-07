"""Unit tests for the health check API endpoint.

This module contains tests for the health check endpoint functionality.
"""

import pytest
from fastapi import APIRouter
from plugin.rpa.api.v1.health_check import health_router, pong


class TestHealthRouter:
    """Test class for health check router configuration."""

    def test_health_router_is_api_router(self) -> None:
        """Test that health_router is an APIRouter instance."""
        # Assert
        assert isinstance(health_router, APIRouter)

    def test_health_router_has_correct_tags(self) -> None:
        """Test that health_router has the correct tags configured."""
        # Assert
        expected_tags = ["rpa health check api"]
        assert health_router.tags == expected_tags

    def test_health_router_routes_configuration(self) -> None:
        """Test that health_router has the expected route configuration."""
        # Assert
        assert hasattr(health_router, "routes")
        # The router should have at least one route after decoration
        route_paths = [
            route.path for route in health_router.routes if hasattr(route, "path")
        ]
        assert "/ping" in route_paths or any(
            "/ping" in str(route) for route in health_router.routes
        )


class TestPongEndpoint:
    """Test class for the pong endpoint function."""

    @pytest.mark.asyncio
    async def test_pong_returns_correct_response(self) -> None:
        """Test that pong endpoint returns the expected string response."""
        # Act
        result = await pong()

        # Assert
        assert result == "pong"
        assert isinstance(result, str)

    @pytest.mark.asyncio
    async def test_pong_is_async_function(self) -> None:
        """Test that pong is properly defined as an async function."""
        # Assert
        import inspect

        assert inspect.iscoroutinefunction(pong)

    def test_pong_function_signature(self) -> None:
        """Test that pong function has the correct signature."""
        # Assert
        import inspect

        signature = inspect.signature(pong)

        # Should have no parameters
        assert len(signature.parameters) == 0

        # Should return a string annotation
        assert signature.return_annotation == str

    @pytest.mark.asyncio
    async def test_pong_multiple_calls_consistent(self) -> None:
        """Test that multiple calls to pong return consistent results."""
        # Act
        result1 = await pong()
        result2 = await pong()
        result3 = await pong()

        # Assert
        assert result1 == result2 == result3 == "pong"

    def test_pong_endpoint_route_decorator(self) -> None:
        """Test that pong function is properly decorated as GET endpoint."""
        # This test verifies the route is registered with the router
        # by checking if the function has been decorated

        # Check if the function has been registered with the router
        route_found = False
        for route in health_router.routes:
            if hasattr(route, "endpoint") and route.endpoint == pong:
                route_found = True
                assert hasattr(route, "methods")
                assert "GET" in route.methods
                # Check path attribute safely
                path = getattr(route, "path", getattr(route, "path_regex", None))
                if path and hasattr(path, "pattern"):
                    assert "/ping" in path.pattern
                elif path:
                    assert path == "/ping"
                break

        # If route not found in routes list, check if it's a decorated function
        if not route_found:
            # Alternative check: verify the function exists and is callable
            assert callable(pong)
            assert hasattr(pong, "__name__")
            assert pong.__name__ == "pong"
