"""
Tests for OTLP trace exporter selection.
"""

from unittest.mock import Mock, patch

from common.otlp.trace import trace as trace_module


def test_init_trace_uses_grpc_exporter_by_default() -> None:
    """A missing protocol must keep the existing OTLP/gRPC behavior."""
    with patch.dict("os.environ", {"OTLP_ENABLE": "true"}, clear=True), patch.object(
        trace_module, "GrpcOTLPSpanExporter", create=True
    ) as grpc_exporter, patch.object(
        trace_module, "HttpOTLPSpanExporter", create=True
    ) as http_exporter, patch.object(
        trace_module, "BatchSpanProcessor"
    ), patch.object(
        trace_module.trace, "set_tracer_provider"
    ):
        grpc_exporter.return_value = Mock()

        trace_module.init_trace(
            endpoint="127.0.0.1:4317",
            service_name="test-service",
            timeout=3000,
        )

    grpc_exporter.assert_called_once_with(
        insecure=True,
        endpoint="127.0.0.1:4317",
        timeout=3000,
    )
    http_exporter.assert_not_called()


def test_init_trace_uses_http_exporter_for_http_protobuf_protocol() -> None:
    """http/protobuf must use the OTLP/HTTP exporter with parsed headers."""
    with patch.dict(
        "os.environ",
        {
            "OTLP_ENABLE": "true",
            "OTEL_EXPORTER_OTLP_PROTOCOL": "http/protobuf",
            "OTEL_EXPORTER_OTLP_ENDPOINT": "https://cloud.langfuse.com/api/public/otel",
            "OTEL_EXPORTER_OTLP_HEADERS": "Authorization=Basic%20token",
        },
        clear=True,
    ), patch.object(
        trace_module, "GrpcOTLPSpanExporter", create=True
    ) as grpc_exporter, patch.object(
        trace_module, "HttpOTLPSpanExporter", create=True
    ) as http_exporter, patch.object(
        trace_module, "BatchSpanProcessor"
    ), patch.object(
        trace_module.trace, "set_tracer_provider"
    ):
        http_exporter.return_value = Mock()

        trace_module.init_trace(
            endpoint="127.0.0.1:4317",
            service_name="test-service",
            timeout=3000,
        )

    http_exporter.assert_called_once_with(
        endpoint="https://cloud.langfuse.com/api/public/otel/v1/traces",
        headers={"authorization": "Basic token"},
        timeout=3000,
    )
    grpc_exporter.assert_not_called()
