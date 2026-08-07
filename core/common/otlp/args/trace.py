from pydantic import Field

from common.otlp.args.base import BaseOtlpArgs


class OtlpTraceArgs(BaseOtlpArgs):
    trace_timeout: int = Field(default=0)
    trace_max_queue_size: int = Field(default=0)
    trace_schedule_delay_millis: int = Field(default=0)
    trace_max_export_batch_size: int = Field(default=0)
    trace_export_timeout_millis: int = Field(default=0)
