"""
File service module for handling file upload validation and processing.

This module provides functionality to validate uploaded files including
file type checking and size limit enforcement.
"""

from fastapi import UploadFile

from workflow.configs import workflow_config
from workflow.extensions.otlp.trace.span import Span


def check(file: UploadFile, contents: bytes, span_context: Span) -> None:
    """
    Validate uploaded file against supported file types and size limits.

    :param file: The uploaded file object containing metadata
    :param contents: The file contents as bytes (currently unused but kept
                     for future use)
    :param span_context: Tracing span for logging validation events
    :raises CustomException: If file type is not supported or file size exceeds limit
    """
    file_name = file.filename
    file_size = file.size
    # Extract file extension from filename
    extension = file_name.split(".")[-1].lower() if file_name else ""

    workflow_config.file_config.is_valid(
        extension=extension,
        file_size=file_size if file_size else 0,
    )
