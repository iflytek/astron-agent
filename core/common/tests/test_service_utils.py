"""
Tests for service utils components
"""

from unittest.mock import Mock, patch

import pytest

from common.service.base import ServiceType


class TestServiceUtilsFunctions:
    """Test service utils functions"""

    @patch.dict(
        "sys.modules",
        {
            "redis": Mock(),
            "rediscluster": Mock(),
            "kafka": Mock(),
            "boto3": Mock(),
            "aiobotocore": Mock(),
            "opentelemetry": Mock(),
            "opentelemetry.exporter": Mock(),
            "opentelemetry.exporter.otlp": Mock(),
            "opentelemetry.exporter.otlp.proto": Mock(),
            "opentelemetry.exporter.otlp.proto.grpc": Mock(),
            "opentelemetry.exporter.otlp.proto.grpc.trace_exporter": Mock(),
            "opentelemetry.exporter.otlp.proto.grpc.metric_exporter": Mock(),
            "opentelemetry.sdk": Mock(),
            "opentelemetry.sdk.trace": Mock(),
            "opentelemetry.sdk.trace.export": Mock(),
            "opentelemetry.sdk.metrics": Mock(),
            "opentelemetry.sdk.metrics.export": Mock(),
            "opentelemetry.sdk.resources": Mock(),
            "opentelemetry.trace": Mock(),
            "opentelemetry.metrics": Mock(),
            "opentelemetry.util": Mock(),
            "opentelemetry.util.http": Mock(),
            "opentelemetry.util.http.httplib": Mock(),
            "opentelemetry.util.http.requests": Mock(),
            "opentelemetry.util.http.urllib3": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.request": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.getresponse": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.close": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.connect": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.sock": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.sock.send": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.sock.recv": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.sock.close": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.sock.connect": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.sock.setsockopt": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.sock.getsockopt": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.sock.settimeout": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.sock.gettimeout": Mock(),
            "opentelemetry.propagate": Mock(),
            "loguru": Mock(),
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
            "aiobotocore": Mock(),
            "opentelemetry": Mock(),
            "opentelemetry.exporter": Mock(),
            "opentelemetry.exporter.otlp": Mock(),
            "opentelemetry.exporter.otlp.proto": Mock(),
            "opentelemetry.exporter.otlp.proto.grpc": Mock(),
            "opentelemetry.exporter.otlp.proto.grpc.trace_exporter": Mock(),
            "opentelemetry.exporter.otlp.proto.grpc.metric_exporter": Mock(),
            "opentelemetry.sdk": Mock(),
            "opentelemetry.sdk.trace": Mock(),
            "opentelemetry.sdk.trace.export": Mock(),
            "opentelemetry.sdk.metrics": Mock(),
            "opentelemetry.sdk.metrics.export": Mock(),
            "opentelemetry.sdk.resources": Mock(),
            "opentelemetry.trace": Mock(),
            "opentelemetry.metrics": Mock(),
            "opentelemetry.util": Mock(),
            "opentelemetry.util.http": Mock(),
            "opentelemetry.util.http.httplib": Mock(),
            "opentelemetry.util.http.requests": Mock(),
            "opentelemetry.util.http.urllib3": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.request": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.getresponse": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.close": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.connect": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.sock": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.sock.send": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.sock.recv": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.sock.close": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.sock.connect": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.sock.setsockopt": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.sock.getsockopt": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.sock.settimeout": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.sock.gettimeout": Mock(),
            "opentelemetry.propagate": Mock(),
            "loguru": Mock(),
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
            "aiobotocore": Mock(),
            "opentelemetry": Mock(),
            "opentelemetry.exporter": Mock(),
            "opentelemetry.exporter.otlp": Mock(),
            "opentelemetry.exporter.otlp.proto": Mock(),
            "opentelemetry.exporter.otlp.proto.grpc": Mock(),
            "opentelemetry.exporter.otlp.proto.grpc.trace_exporter": Mock(),
            "opentelemetry.exporter.otlp.proto.grpc.metric_exporter": Mock(),
            "opentelemetry.sdk": Mock(),
            "opentelemetry.sdk.trace": Mock(),
            "opentelemetry.sdk.trace.export": Mock(),
            "opentelemetry.sdk.metrics": Mock(),
            "opentelemetry.sdk.metrics.export": Mock(),
            "opentelemetry.sdk.resources": Mock(),
            "opentelemetry.trace": Mock(),
            "opentelemetry.metrics": Mock(),
            "opentelemetry.util": Mock(),
            "opentelemetry.util.http": Mock(),
            "opentelemetry.util.http.httplib": Mock(),
            "opentelemetry.util.http.requests": Mock(),
            "opentelemetry.util.http.urllib3": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.request": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.getresponse": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.close": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.connect": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.sock": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.sock.send": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.sock.recv": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.sock.close": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.sock.connect": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.sock.setsockopt": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.sock.getsockopt": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.sock.settimeout": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.sock.gettimeout": Mock(),
            "opentelemetry.propagate": Mock(),
            "loguru": Mock(),
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
            "aiobotocore": Mock(),
            "opentelemetry": Mock(),
            "opentelemetry.exporter": Mock(),
            "opentelemetry.exporter.otlp": Mock(),
            "opentelemetry.exporter.otlp.proto": Mock(),
            "opentelemetry.exporter.otlp.proto.grpc": Mock(),
            "opentelemetry.exporter.otlp.proto.grpc.trace_exporter": Mock(),
            "opentelemetry.exporter.otlp.proto.grpc.metric_exporter": Mock(),
            "opentelemetry.sdk": Mock(),
            "opentelemetry.sdk.trace": Mock(),
            "opentelemetry.sdk.trace.export": Mock(),
            "opentelemetry.sdk.metrics": Mock(),
            "opentelemetry.sdk.metrics.export": Mock(),
            "opentelemetry.sdk.resources": Mock(),
            "opentelemetry.trace": Mock(),
            "opentelemetry.metrics": Mock(),
            "opentelemetry.util": Mock(),
            "opentelemetry.util.http": Mock(),
            "opentelemetry.util.http.httplib": Mock(),
            "opentelemetry.util.http.requests": Mock(),
            "opentelemetry.util.http.urllib3": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.request": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.getresponse": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.close": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.connect": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.sock": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.sock.send": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.sock.recv": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.sock.close": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.sock.connect": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.sock.setsockopt": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.sock.getsockopt": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.sock.settimeout": Mock(),
            "opentelemetry.util.http.urllib3.connectionpool.httpsconnection.HTTPSConnection.sock.gettimeout": Mock(),
            "opentelemetry.propagate": Mock(),
            "loguru": Mock(),
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
