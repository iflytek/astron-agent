from common.service.base import ServiceType
from common.service.cache import factory as cache_factory
from common.service.db import factory as db_factory
from common.service.kafka import factory as kafka_factory
from common.service.log import factory as log_factory
from common.service.ma import factory as ma_factory
from common.service.oss import factory as oss_factory
from common.service.otlp.metric import factory as otlp_metric_factory
from common.service.otlp.node_log import factory as otlp_node_log_factory
from common.service.otlp.sid import factory as otlp_sid_factory
from common.service.otlp.span import factory as otlp_span_factory
from common.service.settings import factory as settings_factory


def get_cache_factories_and_deps() -> list:
    """get cache factories and dependencies"""
    fac_and_deps = [
        (
            cache_factory.CacheServiceFactory(),
            [ServiceType.CACHE_SERVICE],
        )
    ]
    return fac_and_deps


def get_db_factories_and_deps() -> list:
    """get db factories and dependencies"""
    fac_and_deps = [
        (
            db_factory.DatabaseServiceFactory(),
            [ServiceType.DATABASE_SERVICE],
        )
    ]
    return fac_and_deps


def get_log_factories_and_deps() -> list:
    """get log factories and dependencies"""
    fac_and_deps = [
        (
            log_factory.LogServiceFactory(),
            [ServiceType.LOG_SERVICE],
        )
    ]
    return fac_and_deps


def get_ma_factories_and_deps() -> list:
    """get ma factories and dependencies"""
    fac_and_deps = [
        (
            ma_factory.MASDKServiceFactory(),
            [ServiceType.MASDK_SERVICE],
        )
    ]
    return fac_and_deps


def get_kafka_factories_and_deps() -> list:
    """get kafka factories and dependencies"""
    fac_and_deps = [
        (
            kafka_factory.KafkaProducerServiceFactory(),
            [ServiceType.KAFKA_PRODUCER_SERVICE],
        )
    ]
    return fac_and_deps


def get_oss_factories_and_deps() -> list:

    fac_and_deps = [
        (
            oss_factory.OSSServiceFactory(),
            [ServiceType.OSS_SERVICE],
        )
    ]
    return fac_and_deps


def get_otlp_metric_factories_and_deps() -> list:

    fac_and_deps = [
        (
            otlp_metric_factory.OtlpMetricFactory(),
            [ServiceType.OTLP_METRIC_SERVICE],
        )
    ]
    return fac_and_deps


def get_otlp_span_factories_and_deps() -> list:

    fac_and_deps = [
        (
            otlp_span_factory.OtlpSpanFactory(),
            [ServiceType.OTLP_SPAN_SERVICE],
        )
    ]
    return fac_and_deps


def get_otlp_node_log_factories_and_deps() -> list:

    fac_and_deps = [
        (
            otlp_node_log_factory.OtlpNodeLogFactory(),
            [ServiceType.OTLP_NODE_LOG_SERVICE],
        )
    ]
    return fac_and_deps


def get_otlp_sid_factories_and_deps() -> list:

    fac_and_deps = [
        (
            otlp_sid_factory.OtlpSidFactory(),
            [ServiceType.OTLP_SID_SERVICE],
        )
    ]
    return fac_and_deps


def get_settings_factories_and_deps() -> list:
    """
    Get the factories and dependencies for the settings service.
    """

    fac_and_deps = [
        (
            settings_factory.SettingsServiceFactory(),
            [ServiceType.SETTINGS_SERVICE],
        )
    ]
    return fac_and_deps


service_type_methods = {
    ServiceType.CACHE_SERVICE: get_cache_factories_and_deps,
    ServiceType.DATABASE_SERVICE: get_db_factories_and_deps,
    ServiceType.LOG_SERVICE: get_log_factories_and_deps,
    ServiceType.MASDK_SERVICE: get_ma_factories_and_deps,
    ServiceType.KAFKA_PRODUCER_SERVICE: get_kafka_factories_and_deps,
    ServiceType.OSS_SERVICE: get_oss_factories_and_deps,
    ServiceType.OTLP_METRIC_SERVICE: get_otlp_metric_factories_and_deps,
    ServiceType.OTLP_NODE_LOG_SERVICE: get_otlp_node_log_factories_and_deps,
    ServiceType.OTLP_SID_SERVICE: get_otlp_sid_factories_and_deps,
    ServiceType.OTLP_SPAN_SERVICE: get_otlp_span_factories_and_deps,
    ServiceType.SETTINGS_SERVICE: get_settings_factories_and_deps,
}


def get_factories_and_deps(services: list | None = None) -> list:
    """
    Get factories and dependencies for the given services.
    """

    fac_and_deps = []
    for service in services or []:
        # print("---- service:: ", service)
        if service not in service_type_methods:
            raise ValueError(f"{service} is not a valid service")

        fac_and_deps.extend(service_type_methods[service]())

    return fac_and_deps
