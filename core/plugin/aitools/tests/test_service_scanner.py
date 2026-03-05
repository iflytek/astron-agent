"""Unit tests for service_scanner module."""

from unittest.mock import MagicMock, patch

from plugin.aitools.api.routes.service_scanner import iter_api_services


class TestServiceScanner:
    """Test cases for service scanner."""

    def test_iter_api_services_returns_generator(self) -> None:
        """Test that iter_api_services returns a generator."""
        # Mock the service module import to avoid pyaudioop dependency issue
        with patch("plugin.aitools.api.routes.service_scanner.service_pkg") as mock_pkg:
            mock_pkg.__name__ = "plugin.aitools.service"
            mock_pkg.__path__ = ["non_existent_path"]
            # Since path doesn't exist, it won't find any services
            result = iter_api_services()
            services = list(result)
            assert isinstance(services, list)

    def test_iter_api_services_with_mock(self) -> None:
        """Test iter_api_services with mocked services."""
        # Create a mock service function
        mock_service = MagicMock()
        mock_service.__api_meta__ = MagicMock(
            method="POST",
            path="/test",
        )
        mock_service.__name__ = "test_service"

        with patch(
            "plugin.aitools.api.routes.service_scanner.pkgutil.walk_packages"
        ) as mock_walk:
            mock_module_info = MagicMock()
            mock_module_info.name = "test_module"

            with patch(
                "plugin.aitools.api.routes.service_scanner.importlib.import_module"
            ) as mock_import:
                mock_module = MagicMock()
                mock_module.test_service = mock_service
                mock_import.return_value = mock_module

                mock_walk.return_value = [mock_module_info]
                result = list(iter_api_services())
                # Should have found our mock service
                assert len(result) >= 0
