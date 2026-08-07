import abc

from common.service.base import ServiceType


class BaseOtlpNodeLogService(abc.ABC):

    name = ServiceType.OTLP_NODE_LOG_SERVICE
