"""
Utility functions and types for middleware services.

This module provides service type definitions and utility functions
for managing service factories and their dependencies.
"""

from typing import Any, List, Tuple

from workflow.extensions.middleware.base import FactoryConfig, ServiceType


def get_factories_and_deps(
    factory_list: list[FactoryConfig],
) -> List[Tuple[Any, dict[str, Any]]]:
    """
    Get all service factories and their dependencies.

    This function returns a list of tuples containing service factories
    and their corresponding dependencies. The factories are imported
    dynamically to avoid circular import issues.

    :return: List of tuples containing (factory, dependencies) pairs
    """
    from workflow.extensions.middleware.asynchronous import factory as async_factory
    from workflow.extensions.middleware.cache import factory as cache_factory
    from workflow.extensions.middleware.database import factory as database_factory
    from workflow.extensions.middleware.kafka import factory as kafka_producer_factory
    from workflow.extensions.middleware.log import factory as log_factory
    from workflow.extensions.middleware.oss import factory as oss_factory
    from workflow.extensions.middleware.otlp import factory as otlp_factory

    factories = {
        ServiceType.DATABASE_SERVICE: database_factory.DatabaseServiceFactory(),
        ServiceType.CACHE_SERVICE: cache_factory.CacheServiceFactory(),
        ServiceType.KAFKA_PRODUCER_SERVICE: kafka_producer_factory.KafkaProducerServiceFactory(),
        ServiceType.OSS_SERVICE: oss_factory.OSSServiceFactory(),
        ServiceType.OTLP_SERVICE: otlp_factory.OTLPServiceFactory(),
        ServiceType.LOG_SERVICE: log_factory.LogServiceFactory(),
        ServiceType.ASYNC_TASK_SERVICE: async_factory.AsyncServiceFactory(),
    }
    filtered_factories = []
    for factory_config in factory_list:
        if factory_config.name in factories:
            filtered_factories.append(
                (factories[factory_config.name], factory_config.config)
            )

    return filtered_factories
