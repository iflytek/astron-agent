"""
Tests for service utils components
"""

from unittest.mock import Mock, patch

import pytest

from common.service.base import ServiceType


class TestServiceUtilsFunctions:
    """Test service utils functions"""

    # Isolate optional service SDKs; use the declared OpenTelemetry dependencies
    # so real factory imports also exercise the tracing integration.
    @patch.dict(
        "sys.modules",
        {
            "redis": Mock(),
            "rediscluster": Mock(),
            "kafka": Mock(),
            "boto3": Mock(),
            "botocore": Mock(),
            "botocore.exceptions": Mock(ClientError=Exception),
            "aiobotocore": Mock(),
        },
    )
    def test_service_type_methods(self) -> None:
        """Test service_type_methods dictionary"""
        from common.service.utils import service_type_methods

        assert isinstance(service_type_methods, dict)
        assert len(service_type_methods) > 0

        # Check that all service types have corresponding methods
        for service_type in ServiceType:
            assert service_type in service_type_methods
            assert callable(service_type_methods[service_type])

    @patch.dict(
        "sys.modules",
        {
            "redis": Mock(),
            "rediscluster": Mock(),
            "kafka": Mock(),
            "boto3": Mock(),
            "botocore": Mock(),
            "botocore.exceptions": Mock(ClientError=Exception),
            "aiobotocore": Mock(),
        },
    )
    def test_get_factories_and_deps(self) -> None:
        """Test get_factories_and_deps function"""
        from common.service.utils import get_factories_and_deps

        # Test with different service types
        for service_type in ServiceType:
            result = get_factories_and_deps([service_type])

            assert isinstance(result, list)
            assert len(result) > 0

    @patch.dict(
        "sys.modules",
        {
            "redis": Mock(),
            "rediscluster": Mock(),
            "kafka": Mock(),
            "boto3": Mock(),
            "botocore": Mock(),
            "botocore.exceptions": Mock(ClientError=Exception),
            "aiobotocore": Mock(),
        },
    )
    def test_get_factories_and_deps_invalid_type(self) -> None:
        """Test get_factories_and_deps with invalid service type"""
        from common.service.utils import get_factories_and_deps

        with pytest.raises(ValueError):
            get_factories_and_deps(["invalid_service_type"])  # type: ignore[arg-type]

    @patch.dict(
        "sys.modules",
        {
            "redis": Mock(),
            "rediscluster": Mock(),
            "kafka": Mock(),
            "boto3": Mock(),
            "botocore": Mock(),
            "botocore.exceptions": Mock(ClientError=Exception),
            "aiobotocore": Mock(),
        },
    )
    def test_service_type_methods_consistency(self) -> None:
        """Test that service_type_methods covers all service types"""
        from common.service.utils import service_type_methods

        for service_type in ServiceType:
            assert service_type in service_type_methods
            method = service_type_methods[service_type]
            assert callable(method)

            # Test that the method returns a list
            result = method()
            assert isinstance(result, list)
            assert len(result) > 0
