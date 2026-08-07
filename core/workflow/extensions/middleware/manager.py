"""
Service manager for middleware services.

This module provides the ServiceManager class which handles the registration,
creation, and management of middleware services using the factory pattern.
"""

from typing import Any, Dict, List, Optional

from loguru import logger

from workflow.extensions.middleware.base import Service, ServiceType
from workflow.extensions.middleware.factory import ServiceFactory


class ServiceManager:
    """
    Manages middleware services using the factory pattern.

    This class handles the registration of service factories, manages service
    dependencies, and provides lazy instantiation of services when needed.
    """

    def __init__(self) -> None:
        """
        Initialize the service manager with empty collections.
        """
        self.services: Dict[ServiceType, "Service"] = {}
        self.factories: Dict[ServiceType, "ServiceFactory"] = {}
        self.dependencies: Dict[ServiceType, List[ServiceType]] = {}

    def register_factory(
        self,
        service_factory: "ServiceFactory",
        config: dict[str, Any] = {},
        dependencies: Optional[List[ServiceType]] = None,
    ) -> None:
        """
        Register a new service factory with its dependencies.

        This method registers a service factory and immediately creates
        the service instance if all dependencies are satisfied.

        :param service_factory: The factory to register
        :param dependencies: List of service types this service depends on
        """
        if dependencies is None:
            dependencies = []
        service_name = service_factory.service_class.name
        self.factories[service_name] = service_factory
        self.dependencies[service_name] = dependencies
        self._create_service(service_name, config)

    def get(self, service_name: ServiceType) -> "Service":
        """
        Get a service instance by its name, creating it if necessary.

        This method provides lazy instantiation of services. If the service
        doesn't exist, it will be created using the registered factory.

        :param service_name: The name of the service to retrieve
        :return: The service instance
        """
        if service_name not in self.services:
            self._create_service(service_name)

        return self.services[service_name]

    def _create_service(
        self, service_name: ServiceType, config: dict[str, Any] = {}
    ) -> None:
        """
        Create a new service instance using its registered factory.

        This method validates that a factory exists for the service and
        creates the service instance, marking it as ready.

        :param service_name: The name of the service to create
        """
        logger.info(f"🔍 Creating service: {service_name}")
        self._validate_service_creation(service_name)

        # Create the actual service
        self.services[service_name] = self.factories[service_name].create(**config)
        self.services[service_name].set_ready()
        logger.info(f"✅ Service {service_name} created successfully")

    def _validate_service_creation(self, service_name: ServiceType) -> None:
        """
        Validate that a factory exists for the given service.

        :param service_name: The name of the service to validate
        :raises ValueError: If no factory is registered for the service
        """
        if service_name not in self.factories:
            raise ValueError(
                f"No factory registered for the service class '{service_name.name}'"
            )


# Global service manager instance
service_manager = ServiceManager()
