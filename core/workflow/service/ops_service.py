import os
import threading
from datetime import datetime, timezone
from typing import Any

import requests
from loguru import logger

from workflow.extensions.middleware.getters import get_kafka_producer_service
from workflow.extensions.otlp.log_trace.workflow_log import WorkflowLog
from workflow.extensions.otlp.trace.span import Span


def _report_to_elasticsearch(workflow_data: str) -> None:
    base_url = os.environ["WORKFLOW_TRACE_ES_URL"].rstrip("/")
    index_prefix = os.getenv(
        "WORKFLOW_TRACE_ES_INDEX_PREFIX", "spark-agent-builder-"
    )
    index_month = datetime.now(timezone.utc).strftime("%Y.%m")
    url = f"{base_url}/{index_prefix}{index_month}/_doc"
    timeout = float(os.getenv("WORKFLOW_TRACE_ES_TIMEOUT_SECONDS", "5"))
    request_kwargs: dict[str, Any] = {
        "data": workflow_data,
        "headers": {"Content-Type": "application/json"},
        "timeout": timeout,
    }
    username = os.getenv("WORKFLOW_TRACE_ES_USERNAME")
    if username:
        request_kwargs["auth"] = (
            username,
            os.getenv("WORKFLOW_TRACE_ES_PASSWORD", ""),
        )

    response = requests.post(url, **request_kwargs)
    response.raise_for_status()


def kafka_report(
    workflow_log: WorkflowLog, span: Span, code: int = 0, message: str = "success"
) -> None:
    """
    Report workflow execution status asynchronously.

    The open-source deployment writes directly to Elasticsearch when
    ``WORKFLOW_TRACE_ES_URL`` is configured. Existing deployments can continue to
    use Kafka when that setting is absent.

    :param workflow_log: The workflow log object containing execution details
    :param span: The tracing span for observability
    :param code: Status code indicating the execution result (default: 0 for success)
    :param message: Status message describing the execution result (default: "success")
    """

    def _report() -> None:
        """
        Internal function to perform the actual Kafka reporting.

        Sets the final status and end time for the workflow log, then attempts
        to send the log data to the configured Kafka topic.
        """
        # Set final execution status and end timestamp
        workflow_log.set_status(code=code, message=message)
        workflow_log.set_end()

        try:
            workflow_data = workflow_log.to_json()
            logger.info(f"Workflow trace data: {workflow_data}")
            if os.getenv("WORKFLOW_TRACE_ES_URL"):
                _report_to_elasticsearch(workflow_data)
            else:
                topic = os.getenv("KAFKA_TOPIC") or ""
                get_kafka_producer_service().send(topic, workflow_data)
        except Exception as err:
            logger.error("Failed to report workflow trace: {}".format(err))

    # Create and start daemon thread for asynchronous reporting
    thread = threading.Thread(target=_report, daemon=True)
    thread.start()
