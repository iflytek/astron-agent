import abc

from workflow.extensions.middleware.base import ServiceType


class BaseOTLPService(abc.ABC):
    """
    Abstract base class for OTLP service implementations.
    """

    name = ServiceType.OTLP_SERVICE
