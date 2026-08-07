from pydantic import Field

from common.otlp.args.base import BaseOtlpArgs


class OtlpMetricArgs(BaseOtlpArgs):
    metric_timeout: int = Field(default=0)
    metric_export_interval_millis: int = Field(default=0)
    metric_export_timeout_millis: int = Field(default=0)
