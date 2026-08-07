from workflow.extensions.middleware.base import Service, ServiceType


class LogService(Service):
    """
    Log service implementation for the workflow middleware.

    This service provides logging functionality through the middleware system.
    It extends the base Service class and is identified by the LOG_SERVICE type.
    The actual logging implementation is handled by the LogServiceFactory which
    configures the loguru logger with appropriate settings.
    """

    name = ServiceType.LOG_SERVICE
