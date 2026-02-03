"""
OSS uploader utils
"""

from typing import Optional

from common.otlp.trace.span import Span
from common.otlp.trace.span_instance import SpanInstance
from common.service import get_oss_service
from plugin.aitools.common.clients.adapters import SpanLike
from plugin.aitools.common.log.logger import log
from starlette.concurrency import run_in_threadpool


async def upload_file(
    filename: str, file_bytes: bytes, span: Optional[SpanLike] = None
) -> str:
    """
    Upload a file to OSS.
    """
    if isinstance(span, SpanInstance):
        span.start("OSS Upload")
        span.add_info_events({"filename": filename, "file_size": len(file_bytes)})

        try:
            oss_service = get_oss_service()
            oss_url = await run_in_threadpool(
                oss_service.upload_file, filename, file_bytes
            )
            span.add_info_events({"oss_url": oss_url})
            return oss_url
        except Exception as e:
            log.error(f"Failed to upload file to oss: {e}")
            span.record_exception(e)
            raise
        finally:
            span.stop()
    elif isinstance(span, Span):
        span_cm = span.start("OSS Upload")

        with span_cm as span_context:
            (
                span_context.add_info_events(
                    {"filename": filename, "file_size": len(file_bytes)}
                )
                if span_context
                else None
            )

            try:
                oss_service = get_oss_service()
                oss_url = await run_in_threadpool(
                    oss_service.upload_file, filename, file_bytes
                )
                (
                    span_context.add_info_events({"oss_url": oss_url})
                    if span_context
                    else None
                )
                return oss_url
            except Exception as e:
                log.error(f"Failed to upload file to oss: {e}")
                span_context.record_exception(e) if span_context else None
                raise
    else:
        try:
            oss_service = get_oss_service()
            oss_url = await run_in_threadpool(
                oss_service.upload_file, filename, file_bytes  # type: ignore[attr-defined]
            )
            return oss_url
        except Exception as e:
            log.error(f"Failed to upload file to oss: {e}")
            raise
