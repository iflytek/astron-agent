"""Initialization services for the plugin."""

from common.service import ServiceType
from common.service.oss import factory as oss_factory
from common.service.otlp.metric import factory as otlp_metric_factory
from common.service.otlp.sid import factory as otlp_sid_factory
from common.service.otlp.span import factory as otlp_span_factory
from common.service.settings import factory as settings_factory
from loguru import logger as log
from plugin.aitools.utils import aitools_service_manager
from plugin.aitools.utils.aiokafka_factory import AioKafkaProducerServiceFactory

FACTORY_AND_DEPS = [
    (settings_factory.SettingsServiceFactory(), [ServiceType.SETTINGS_SERVICE]),
    (AioKafkaProducerServiceFactory(), [ServiceType.KAFKA_PRODUCER_SERVICE]),
    (oss_factory.OSSServiceFactory(), [ServiceType.OSS_SERVICE]),
    (otlp_sid_factory.OtlpSidFactory(), [ServiceType.OTLP_SID_SERVICE]),
    (otlp_span_factory.OtlpSpanFactory(), [ServiceType.OTLP_SPAN_SERVICE]),
    (otlp_metric_factory.OtlpMetricFactory(), [ServiceType.OTLP_METRIC_SERVICE]),
]


def initialize_services() -> None:
    """
    Initialize all the services needed.
    """
    for factory, dependencies in FACTORY_AND_DEPS:
        try:
            aitools_service_manager.register_factory(factory, dependencies=dependencies)
        except Exception as exc:
            log.exception(exc)
