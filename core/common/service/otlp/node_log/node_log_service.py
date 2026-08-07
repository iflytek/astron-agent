from typing import Type

from common.otlp.log_trace.node_log import NodeLog
from common.otlp.log_trace.node_trace_log import NodeTraceLog
from common.service.base import ServiceType
from common.service.otlp.node_log.base_node_log import BaseOtlpNodeLogService


class OtlpNodeLogService(BaseOtlpNodeLogService):

    name = ServiceType.OTLP_NODE_LOG_SERVICE

    def get_node_log(self) -> Type[NodeLog]:
        return NodeLog

    def get_node_trace_log(self) -> Type[NodeTraceLog]:
        return NodeTraceLog
