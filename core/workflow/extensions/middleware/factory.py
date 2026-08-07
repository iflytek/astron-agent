"""
Service factory base class for creating middleware services.

This module provides the abstract factory pattern implementation for creating
and managing service instances in the middleware system.
"""

from typing import Any


class ServiceFactory:
    """
    Abstract base class for service factories.

    This class provides the interface for creating service instances.
    Subclasses must implement the create method to provide specific
    service instantiation logic.
    """

    def __init__(self, service_class: Any) -> None:
        """
        Initialize the service factory with a service class.

        :param service_class: The service class that this factory will create instances of
        """
        self.service_class = service_class

    def create(self, *args: Any, **kwargs: Any) -> Any:
        """
        Create a new instance of the service.

        This method must be implemented by subclasses to provide the specific
        logic for creating service instances.

        :param args: Positional arguments to pass to the service constructor
        :param kwargs: Keyword arguments to pass to the service constructor
        :return: A new instance of the service
        :raises NotImplementedError: If not implemented by subclass
        """
        raise NotImplementedError
