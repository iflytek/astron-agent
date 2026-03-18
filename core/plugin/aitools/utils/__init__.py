"""Utility package exports."""

from common.service import ServiceManager, ServiceType
from common.service.oss.base_oss import BaseOSSService
from loguru import logger as log
from plugin.aitools.utils.aiokafka_factory import AioKafkaProducerServiceFactory
from plugin.aitools.utils.aiokafka_service import AioKafkaProducerService


class AitoolsServiceManager(ServiceManager):

    def __init__(self) -> None:
        """Initialize the AitoolsServiceManager."""
        super().__init__()

    async def hot_load_callback(self) -> None:
        """"""
        for name in self.services:
            if name == ServiceType.KAFKA_PRODUCER_SERVICE:
                kafka_factory: AioKafkaProducerServiceFactory = self.factories.get(name)
                log.debug("Hot-reloading Kafka producer service...")
                await kafka_factory.shutdown()
                self.services[name] = kafka_factory.create()
                log.info("Kafka producer service restarted successfully.")
                continue
            if name == ServiceType.OSS_SERVICE:
                log.debug(f"Hot-reloaded {name} service...")
                self._create_service(name)
                log.debug(f"{name} service restarted successfully.")


aitools_service_manager = AitoolsServiceManager()


def get_kafka_producer_service() -> AioKafkaProducerService:
    """Get the Kafka producer service instance from the service manager."""
    return aitools_service_manager.get(ServiceType.KAFKA_PRODUCER_SERVICE)


def get_oss_service() -> BaseOSSService:
    """Get the OSS service instance from the service manager."""
    return aitools_service_manager.get(ServiceType.OSS_SERVICE)
