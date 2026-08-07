"""
Base service interface for middleware services.

This module defines the abstract base class for all middleware services,
providing a common interface for service lifecycle management.
"""

from abc import ABC
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class ServiceType(str, Enum):
    """
    Enumeration of available middleware service types.

    This enum defines all the different types of services that can be
    registered with the service manager. Each service type corresponds
    to a specific middleware component.
    """

    CACHE_SERVICE = "cache_service"
    DATABASE_SERVICE = "database_service"
    LOG_SERVICE = "log_service"
    KAFKA_PRODUCER_SERVICE = "kafka_producer_service"
    OSS_SERVICE = "oss_service"
    MASDK_SERVICE = "masdk_service"
    OTLP_SERVICE = "otlp_service"
    ASYNC_TASK_SERVICE = "async_task_service"


class Service(ABC):
    """
    Abstract base class for all middleware services.

    This class defines the common interface that all services must implement,
    including service identification, readiness state, and lifecycle management.
    """

    name: ServiceType
    ready: bool = False

    def teardown(self) -> None:
        """
        Clean up resources when the service is being shut down.

        This method should be overridden by subclasses to perform any necessary
        cleanup operations such as closing connections, releasing resources, etc.
        """
        pass

    def set_ready(self) -> None:
        """
        Mark the service as ready for use.

        This method sets the ready flag to True, indicating that the service
        has been properly initialized and is ready to handle requests.
        """
        self.ready = True


@dataclass
class FactoryConfig(ABC):
    name: ServiceType
    config: dict[str, Any] = field(default_factory=dict)
