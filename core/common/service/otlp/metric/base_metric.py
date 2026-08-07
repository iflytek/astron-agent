import abc
from typing import Type

from common.otlp.metrics.meter import Meter
from common.service.base import Service, ServiceType


class BaseOtlpMetricService(Service):

    name = ServiceType.OTLP_METRIC_SERVICE

    @abc.abstractmethod
    def get_meter(self) -> Type[Meter]:
        return Meter
