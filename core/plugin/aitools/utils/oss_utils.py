"""
OSS uploader utils
"""

from typing import Optional

from common.otlp.trace.span import Span
from common.otlp.trace.span_instance import SpanInstance
from loguru import logger as log
from plugin.aitools.common.clients.adapters import SpanLike
from plugin.aitools.utils import get_oss_service
from starlette.concurrency import run_in_threadpool


async def _upload_to_oss(filename: str, file_bytes: bytes) -> str:
    """Upload bytes to OSS and return the URL."""
    oss_service = get_oss_service()
    upload_file_fn = oss_service.upload_file  # type: ignore[attr-defined]
    return await run_in_threadpool(upload_file_fn, filename, file_bytes)


async def _upload_with_span_instance(
    filename: str, file_bytes: bytes, span: SpanInstance
) -> str:
    """Upload with SpanInstance lifecycle and events."""
    span.start("OSS Upload")
    span.add_info_events({"filename": filename, "file_size": len(file_bytes)})
    try:
        oss_url = await _upload_to_oss(filename, file_bytes)
        span.add_info_events({"oss_url": oss_url})
        return oss_url
    except Exception as e:
        log.error(f"Failed to upload file to oss: {e}")
        span.record_exception(e)
        raise
    finally:
        span.stop()


async def _upload_with_span_context(
    filename: str, file_bytes: bytes, span: Span
) -> str:
    """Upload with Span context manager and optional context events."""
    span_cm = span.start("OSS Upload")
    with span_cm as span_context:
        if span_context:
            span_context.add_info_events(
                {"filename": filename, "file_size": len(file_bytes)}
            )
        try:
            oss_url = await _upload_to_oss(filename, file_bytes)
            if span_context:
                span_context.add_info_events({"oss_url": oss_url})
            return oss_url
        except Exception as e:
            log.error(f"Failed to upload file to oss: {e}")
            if span_context:
                span_context.record_exception(e)
            raise


async def _upload_without_span(filename: str, file_bytes: bytes) -> str:
    """Upload without tracing span and still log upload failures."""
    try:
        return await _upload_to_oss(filename, file_bytes)
    except Exception as e:
        log.error(f"Failed to upload file to oss: {e}")
        raise


async def upload_file(
    filename: str, file_bytes: bytes, span: Optional[SpanLike] = None
) -> str:
    """
    Upload a file to OSS.
    """
    if isinstance(span, SpanInstance):
        return await _upload_with_span_instance(filename, file_bytes, span)
    if isinstance(span, Span):
        return await _upload_with_span_context(filename, file_bytes, span)
    return await _upload_without_span(filename, file_bytes)
