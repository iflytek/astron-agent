import base64
import json
import os
from enum import Enum
from typing import Any, Sequence

from loguru import logger
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import SERVICE_NAME, Resource
from opentelemetry.sdk.trace import ReadableSpan, SpanLimits, TracerProvider
from opentelemetry.sdk.trace.export import (
    BatchSpanProcessor,
    SpanExporter,
    SpanExportResult,
)
from opentelemetry.trace import StatusCode

from workflow.extensions.otlp.util.ip import ip


class SpanLevel(Enum):
    """
    Enumeration of span log levels for OpenTelemetry tracing.
    """

    DEBUG = "DEBUG"
    INFO = "INFO"
    WARN = "WARN"
    ERROR = "ERROR"


class FileSpanExporter(SpanExporter):
    """
    Custom span exporter that writes trace information to local files.

    This exporter processes spans and logs them using different log levels
    based on the span name and status code.
    """

    def export(self, spans: Sequence[ReadableSpan]) -> SpanExportResult:
        """
        Export spans to local files using appropriate log levels.

        :param spans: Sequence of readable spans to export
        :return: Export result indicating success or failure
        """
        try:
            for span in spans:
                # Remove newlines from span's native to_json method
                content = f"Span: {json.dumps(json.loads(span.to_json()), ensure_ascii=False)}"

                # Log based on span name and status code
                if (
                    span.name == SpanLevel.ERROR.value
                    or span.status.status_code == StatusCode.ERROR
                ):
                    logger.error(content)
                elif span.name == SpanLevel.INFO.value:
                    logger.info(content)
                elif span.name == SpanLevel.WARN.value:
                    logger.warning(content)
                else:
                    logger.debug(content)
        except Exception as e:
            logger.error(f"Error exporting spans: {e}")
        return SpanExportResult.SUCCESS

    def shutdown(self) -> None:
        """
        Shutdown the exporter.

        This is a no-op implementation as no cleanup is required.
        """
        return None


def _build_langfuse_headers(public_key: str, secret_key: str) -> dict:
    """
    Build HTTP headers for Langfuse OTLP ingestion (Basic auth).

    :param public_key: Langfuse project public key
    :param secret_key: Langfuse project secret key
    :return: Headers dict for the OTLP HTTP exporter
    """
    auth = base64.b64encode(f"{public_key}:{secret_key}".encode()).decode()
    # x-langfuse-ingestion-version: recommended by Langfuse's OTel docs
    # for real-time ingestion (v4 data model)
    return {
        "Authorization": f"Basic {auth}",
        "x-langfuse-ingestion-version": "4",
    }


def _init_langfuse_exporter(
    provider: TracerProvider,
    max_queue_size: int = 2048,
    schedule_delay_millis: int = 5000,
    max_export_batch_size: int = 512,
    export_timeout_millis: int = 30000,
) -> None:
    """
    Attach an optional OTLP/HTTP span processor targeting Langfuse.

    Langfuse's OTel endpoint only supports OTLP over HTTP (not gRPC).
    Disabled unless LANGFUSE_OTEL_ENABLE=1 and all credentials are present;
    misconfiguration is logged and skipped so the service always starts.

    :param provider: Tracer provider to attach the processor to
    :param max_queue_size: Maximum queue size for BatchSpanProcessor data export (default: 2048)
    :param schedule_delay_millis: Delay interval between consecutive exports in BatchSpanProcessor (default: 5000)
    :param max_export_batch_size: Maximum batch size for BatchSpanProcessor data export (default: 512)
    :param export_timeout_millis: Maximum allowed time for data export from BatchSpanProcessor (default: 30000)
    """
    if os.getenv("LANGFUSE_OTEL_ENABLE", "0") != "1":
        return
    host = (os.getenv("LANGFUSE_HOST") or "").rstrip("/")
    public_key = os.getenv("LANGFUSE_PUBLIC_KEY") or ""
    secret_key = os.getenv("LANGFUSE_SECRET_KEY") or ""
    if not (host and public_key and secret_key):
        logger.error(
            "LANGFUSE_OTEL_ENABLE=1 but LANGFUSE_HOST/LANGFUSE_PUBLIC_KEY/"
            "LANGFUSE_SECRET_KEY are not fully configured, "
            "skipping Langfuse exporter"
        )
        return
    try:
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import (
            OTLPSpanExporter as OTLPHttpSpanExporter,
        )
    except ImportError as e:
        logger.error(f"Langfuse exporter unavailable, missing http exporter: {e}")
        return
    endpoint = f"{host}/api/public/otel/v1/traces"
    try:
        exporter = OTLPHttpSpanExporter(
            endpoint=endpoint,
            headers=_build_langfuse_headers(public_key, secret_key),
        )
        provider.add_span_processor(
            BatchSpanProcessor(
                exporter,
                max_queue_size=max_queue_size,
                schedule_delay_millis=schedule_delay_millis,
                max_export_batch_size=max_export_batch_size,
                export_timeout_millis=export_timeout_millis,
            )
        )
        logger.info(f"✅ Langfuse OTLP exporter enabled, endpoint: {endpoint}")
    except Exception as e:
        logger.error(f"Failed to attach Langfuse exporter: {e}")


def init_trace(
    endpoint: str,
    service_name: str,
    timeout: int = 5000,
    max_queue_size: int = 2048,
    schedule_delay_millis: int = 5000,
    max_export_batch_size: int = 512,
    export_timeout_millis: int = 30000,
    span_limit: int = 1000,
    headers: str | None = None,
) -> None:
    """
    Initialize OpenTelemetry tracing with OTLP exporter and file exporter.

    :param endpoint: OTLP endpoint URL for trace export
    :param service_name: Name of the service being traced
    :param timeout: Timeout for OTLP export operations in milliseconds
    :param max_queue_size: Maximum queue size for BatchSpanProcessor data export (default: 2048)
    :param schedule_delay_millis: Delay interval between consecutive exports in BatchSpanProcessor (default: 5000)
    :param max_export_batch_size: Maximum batch size for BatchSpanProcessor data export (default: 512)
    :param export_timeout_millis: Maximum allowed time for data export from BatchSpanProcessor (default: 30000)
    :param span_limit: Maximum number of spans that can be tracked per tracer (default: 1000)
    :param headers: headers as string, will be converted to "key=value" format string
    """
    # Validate required parameters
    assert endpoint is not None, "otlp endpoint is None"
    assert service_name is not None, "service_name is None"

    # Configure span limits
    span_limits = SpanLimits(max_events=span_limit)

    # Create resource with service information
    resource = Resource(
        attributes={
            SERVICE_NAME: service_name,
            "ip": ip,
            "serviceName": service_name,
        }
    )

    # Create tracer provider and add OTLP processor
    provider = TracerProvider(resource=resource, span_limits=span_limits)

    # Create OTLP exporter for remote trace export
    if os.getenv("OTLP_ENABLE", "0") == "1":
        if headers:
            headers = ",".join([f"{k}={v}" for k, v in json.loads(headers).items()])
        exporter = OTLPSpanExporter(
            insecure=True, endpoint=endpoint, timeout=timeout, headers=headers
        )
        processor = BatchSpanProcessor(
            exporter,
            max_queue_size=max_queue_size,
            schedule_delay_millis=schedule_delay_millis,
            max_export_batch_size=max_export_batch_size,
            export_timeout_millis=export_timeout_millis,
        )
        provider.add_span_processor(processor)

    # Add file exporter for local persistence
    file_exporter = FileSpanExporter()
    file_processor = BatchSpanProcessor(file_exporter)
    provider.add_span_processor(file_processor)

    # Attach optional Langfuse OTLP/HTTP processor (off by default)
    _init_langfuse_exporter(
        provider,
        max_queue_size=max_queue_size,
        schedule_delay_millis=schedule_delay_millis,
        max_export_batch_size=max_export_batch_size,
        export_timeout_millis=export_timeout_millis,
    )

    # Set global default tracer provider
    trace.set_tracer_provider(provider)
    logger.debug("✅ Trace initialized successfully")


class Trace:
    """
    Utility class for trace context management in distributed tracing.

    Provides static methods for injecting and extracting trace context
    to enable distributed tracing across service boundaries.
    """

    @staticmethod
    def inject_context() -> dict:
        """
        Extract trace context from the current active span.

        Gets the trace context from the global context for the currently active span.

        :return: Dictionary containing trace context information
        """
        from opentelemetry.propagate import inject

        trace_context: dict[str, Any] = {}
        inject(trace_context)
        return trace_context

    @staticmethod
    def extract_context(trace_context: Any) -> Any:
        """
        Extract trace context from a carrier and use it to continue tracing.

        :param trace_context: Trace context dictionary to extract from
        :return: Extracted trace context for continuing the trace
        """
        from opentelemetry.propagate import extract

        return extract(trace_context)
