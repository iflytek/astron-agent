"""
OTLP utils module for generating OTLP spans and sending them to the collector.
"""

import json
from typing import Optional

from common.otlp.log_trace.node_trace_log import NodeTraceLog, Status
from common.otlp.metrics.meter import Meter
from common.otlp.trace.span import SPAN_SIZE_LIMIT
from plugin.aitools.api.schemas.types import BaseResponse, SuccessResponse
from plugin.aitools.common.clients.adapters import SpanLike
from plugin.aitools.utils import get_kafka_producer_service


def update_span(response: BaseResponse, span: Optional[SpanLike] = None) -> None:
    """Update span with response details."""
    if not span:
        return

    span.set_attribute("error.code", response.code)

    if isinstance(response, SuccessResponse):
        if response.data:
            response_data_str = json.dumps(response.data, ensure_ascii=False)
            if len(response_data_str) >= SPAN_SIZE_LIMIT:
                response_data_str = (
                    f"{response_data_str[:SPAN_SIZE_LIMIT // 2]}..."
                    f"{len(response_data_str) - SPAN_SIZE_LIMIT // 2}"
                )
            span.add_info_events({"RESPONSE DATA": response_data_str})
        else:
            span.add_info_event("Empty response data")
    else:
        span.add_error_events({"ERROR MESSAGE": response.message})


def upload_trace(
    response: BaseResponse, meter: Meter | None, node_trace: NodeTraceLog | None
) -> None:
    """Upload node trace and meter data."""
    if not meter or not node_trace:
        return

    if isinstance(response, SuccessResponse):
        meter.in_success_count()
        node_trace.answer = json.dumps(response.data, ensure_ascii=False)
    else:
        meter.in_error_count(response.code)
        node_trace.answer = response.message

    node_trace.status = Status(code=response.code, message=response.message)

    service = get_kafka_producer_service()
    service.enqueue(node_trace.to_json())
