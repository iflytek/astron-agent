from datetime import datetime, timezone
from unittest.mock import Mock

from workflow.extensions.otlp.log_trace.workflow_log import WorkflowLog
from workflow.service import ops_service


class ImmediateThread:
    def __init__(self, target, daemon):
        self.target = target
        self.daemon = daemon

    def start(self):
        self.target()


def test_trace_is_written_directly_to_elasticsearch_when_configured(monkeypatch):
    monkeypatch.setenv("WORKFLOW_TRACE_ES_URL", "http://elasticsearch:9200/")
    monkeypatch.setenv("WORKFLOW_TRACE_ES_INDEX_PREFIX", "spark-agent-builder-")
    monkeypatch.setattr(ops_service.threading, "Thread", ImmediateThread)

    response = Mock()
    post = Mock(return_value=response)
    monkeypatch.setattr(ops_service.requests, "post", post)
    kafka = Mock()
    monkeypatch.setattr(ops_service, "get_kafka_producer_service", kafka)

    workflow_log = WorkflowLog(sid="trace-sid", flow_id="trace-flow")
    ops_service.kafka_report(workflow_log=workflow_log, span=Mock())

    month = datetime.now(timezone.utc).strftime("%Y.%m")
    post.assert_called_once()
    assert post.call_args.args[0] == (
        f"http://elasticsearch:9200/spark-agent-builder-{month}/_doc"
    )
    assert post.call_args.kwargs["headers"] == {
        "Content-Type": "application/json"
    }
    assert post.call_args.kwargs["timeout"] == 5.0
    response.raise_for_status.assert_called_once_with()
    kafka.assert_not_called()
