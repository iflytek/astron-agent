from typing import ClassVar

from common.otlp.log_trace.node_log import NodeLog
from common.otlp.log_trace.node_trace_log import NodeTraceLog


class WorkflowLog(NodeTraceLog):

    workflow_stream_node_types: ClassVar[list] = ["message", "node-end"]

    def add_node_log(self, node_logs: list[NodeLog]) -> None:
        if not node_logs:
            return
        """
        遍历节点，获取首响时间
        规则：
            如果遍历到的第一个消息节点，设置首响时间为 (消息节点的开始时间 - 开始时间)
            如果遍历到第一个是
        """
        if self.first_frame_duration == -1:  # type: ignore[has-type]

            for i, node_log in enumerate(node_logs):
                node_type = node_log.node_id.split(":")[0]
                if node_type in self.workflow_stream_node_types:
                    self.first_frame_duration = node_log.start_time - self.start_time
                    break

        self.trace.extend(node_logs)
