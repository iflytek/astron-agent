"""
Tests for service base classes
"""

import pytest

from common.service.base import Service, ServiceFactory, ServiceType


class TestService:
    """Test Service base class"""

    def test_service_attributes(self) -> None:
        """Test service has required attributes"""

        # Create a concrete service class for testing
        class TestServiceClass(Service):
            name = ServiceType.CACHE_SERVICE
            ready = False

        service = TestServiceClass()
        assert hasattr(service, "name")
        assert hasattr(service, "ready")
        assert hasattr(service, "teardown")
        assert hasattr(service, "set_ready")

    def test_service_name_type(self) -> None:
        """Test service name is ServiceType"""

        class TestServiceClass(Service):
            name = ServiceType.CACHE_SERVICE

        service = TestServiceClass()
        assert service.name == ServiceType.CACHE_SERVICE
        assert isinstance(service.name, ServiceType)

    def test_service_ready_default(self) -> None:
        """Test service ready defaults to False"""

        class TestServiceClass(Service):
            name = ServiceType.CACHE_SERVICE

        service = TestServiceClass()
        assert service.ready is False

    def test_set_ready(self) -> None:
        """Test set_ready method"""

        class TestServiceClass(Service):
            name = ServiceType.CACHE_SERVICE

        service = TestServiceClass()
        assert service.ready is False

        service.set_ready()
        assert service.ready is True

    def test_teardown_default(self) -> None:
        """Test teardown method can be called without error"""

        class TestServiceClass(Service):
            name = ServiceType.CACHE_SERVICE

        service = TestServiceClass()
        # Should not raise an exception
        service.teardown()

    def test_teardown_override(self) -> None:
        """Test teardown method can be overridden"""

        class TestServiceClass(Service):
            name = ServiceType.CACHE_SERVICE
            teardown_called = False

            def teardown(self) -> None:
                self.teardown_called = True

        service = TestServiceClass()
        service.teardown()
        assert service.teardown_called is True


class TestServiceFactory:
    """Test ServiceFactory base class"""

    def test_init(self) -> None:
        """Test factory initialization"""

        class TestServiceClass(Service):
            name = ServiceType.CACHE_SERVICE

        factory = ServiceFactory(TestServiceClass)
        assert factory.service_class == TestServiceClass

    def test_create_not_implemented(self) -> None:
        """Test create method raises NotImplementedError by default"""

        class TestServiceClass(Service):
            name = ServiceType.CACHE_SERVICE

        factory = ServiceFactory(TestServiceClass)

        with pytest.raises(NotImplementedError):
            factory.create()

    def test_get_service_class(self) -> None:
        """Test get_service_class method"""

        class TestServiceClass(Service):
            name = ServiceType.CACHE_SERVICE

        factory = ServiceFactory(TestServiceClass)
        assert factory.get_service_class() == TestServiceClass

    def test_create_with_args(self) -> None:
        """Test create method with arguments"""

        class TestServiceClass(Service):
            name = ServiceType.CACHE_SERVICE

        class TestFactory(ServiceFactory):
            def create(self, *args: tuple, **kwargs: dict) -> None:
                return TestServiceClass()  # type: ignore[return-value]

        factory = TestFactory(TestServiceClass)
        service = factory.create("arg1", "arg2", key1="value1")  # type: ignore[func-returns-value,arg-type]

        assert isinstance(service, TestServiceClass)


class TestServiceType:
    """Test ServiceType enum"""

    def test_service_type_values(self) -> None:
        """Test ServiceType enum values"""
        assert ServiceType.CACHE_SERVICE == "cache_service"
        assert ServiceType.DATABASE_SERVICE == "database_service"
        assert ServiceType.LOG_SERVICE == "log_service"
        assert ServiceType.KAFKA_PRODUCER_SERVICE == "kafka_producer_service"
        assert ServiceType.OSS_SERVICE == "oss_service"
        assert ServiceType.MASDK_SERVICE == "masdk_service"
        assert ServiceType.OTLP_METRIC_SERVICE == "otlp_metric_service"
        assert ServiceType.OTLP_NODE_LOG_SERVICE == "otlp_node_log_service"
        assert ServiceType.OTLP_SPAN_SERVICE == "otlp_span_service"
        assert ServiceType.OTLP_SID_SERVICE == "otlp_sid_service"
        assert ServiceType.SETTINGS_SERVICE == "settings_service"

    def test_service_type_inheritance(self) -> None:
        """Test ServiceType inherits from str and Enum"""
        assert isinstance(ServiceType.CACHE_SERVICE, str)
        assert isinstance(ServiceType.CACHE_SERVICE, ServiceType)

    def test_service_type_list(self) -> None:
        """Test ServiceType.list() method"""
        service_types = ServiceType.list()
        assert isinstance(service_types, list)
        assert len(service_types) > 0
        assert all(isinstance(st, str) for st in service_types)
        assert "cache_service" in service_types
        assert "database_service" in service_types

    def test_service_type_comparison(self) -> None:
        """Test ServiceType comparison with strings"""
        assert ServiceType.CACHE_SERVICE == "cache_service"
        assert ServiceType.CACHE_SERVICE != "database_service"
        # ServiceType inherits from str, so it should equal the string value
        assert ServiceType.CACHE_SERVICE == "cache_service"


class TestServiceIntegration:
    """Test service integration patterns"""

    def test_service_factory_pattern(self) -> None:
        """Test typical service factory pattern"""

        class TestServiceClass(Service):
            name = ServiceType.CACHE_SERVICE
            ready = False

            def __init__(self, config: dict = None) -> None:  # type: ignore[assignment]
                self.config = config or {}

        class TestFactory(ServiceFactory):
            def create(self, *args: tuple, **kwargs: dict) -> None:
                return TestServiceClass(*args, **kwargs)  # type: ignore[return-value,arg-type]

        factory = TestFactory(TestServiceClass)

        # Test creating service with config
        config = {"host": "localhost", "port": 6379}
        service = factory.create(config=config)  # type: ignore[func-returns-value]

        assert isinstance(service, TestServiceClass)
        assert service.name == ServiceType.CACHE_SERVICE
        assert service.config == config
        assert service.ready is False

    def test_service_lifecycle(self) -> None:
        """Test service lifecycle methods"""

        class TestServiceClass(Service):
            name = ServiceType.CACHE_SERVICE
            ready = False
            initialized = False
            cleaned_up = False

            def __init__(self) -> None:
                self.initialized = True

            def teardown(self) -> None:
                self.cleaned_up = True

        class TestFactory(ServiceFactory):
            def create(self, *args: tuple, **kwargs: dict) -> None:
                return TestServiceClass()  # type: ignore[return-value,arg-type]

        factory = TestFactory(TestServiceClass)
        service = factory.create()  # type: ignore[func-returns-value]

        # Test initialization
        assert service.initialized is True  # type: ignore[attr-defined]
        assert service.ready is False  # type: ignore[attr-defined]

        # Test setting ready
        service.set_ready()  # type: ignore[attr-defined]
        assert service.ready is True  # type: ignore[attr-defined]

        # Test teardown
        service.teardown()
        assert service.cleaned_up is True
