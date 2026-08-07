"""
Logging module providing unified logging configuration and interfaces.
"""

import logging
import os
import sys
import traceback
from types import FrameType
from typing import List, Optional, cast

from loguru import logger
from plugin.aitools.const.const import (
    LOG_ENCODING_KEY,
    LOG_FILE_KEY,
    LOG_LEVEL_KEY,
    LOG_RETENTION_KEY,
    LOG_ROTATION_KEY,
    LOG_STDOUT_ENABLE_KEY,
)
from plugin.aitools.utils.env_utils import safe_get_bool_env

LOG_FILE = os.getenv(LOG_FILE_KEY, "logs/aitools.log")
ROTATION = os.getenv(LOG_ROTATION_KEY, "5 MB")
RETENTION = os.getenv(LOG_RETENTION_KEY, "30 days")
ENCODING = os.getenv(LOG_ENCODING_KEY, "UTF-8")
LEVEL = os.getenv(LOG_LEVEL_KEY, "DEBUG")
LOG_STDOUT_ENABLE = safe_get_bool_env(LOG_STDOUT_ENABLE_KEY, False)

logger.remove()  # Remove default logger
logger.add(
    LOG_FILE, rotation=ROTATION, retention=RETENTION, encoding=ENCODING, level=LEVEL
)

# Add console handler for local environment
if LOG_STDOUT_ENABLE:
    logger.add(
        sys.stdout,
        level=LEVEL,
        colorize=True,
    )


def init_uvicorn_logger() -> None:
    logger_names = (
        "uvicorn.asgi",
        "uvicorn.access",
        "uvicorn",
        "uvicorn.error",
        "fastapi",
    )

    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.addHandler(InterceptHandler())

    # change handler for default uvicorn logger
    for logger_name in logger_names:
        logging_logger = logging.getLogger(logger_name)
        logging_logger.handlers.clear()
        logging_logger.handlers = [InterceptHandler()]
        logging_logger.propagate = False


def get_loguru_level(record: logging.LogRecord) -> str:
    try:
        return logger.level(record.levelname).name
    except ValueError:
        return str(record.levelno)


def find_caller_depth() -> int:
    frame, depth = logging.currentframe(), 2
    while frame and frame.f_code.co_filename == logging.__file__:
        frame = cast(FrameType, frame.f_back)
        depth += 1
    return depth


def format_exception(exc_info: Optional[tuple]) -> Optional[str]:
    if not exc_info:
        return None

    exc_type, exc_value, tb = exc_info
    full_traceback = traceback.extract_tb(tb)
    key_frames: List[traceback.FrameSummary] = []

    for frame_summary in full_traceback:
        filename = frame_summary.filename
        if any(
            lib in filename
            for lib in [
                "site-packages",
                "uvicorn",
                "starlette",
                "fastapi",
                "asyncio",
                "logging.py",
            ]
        ):
            continue
        key_frames.append(frame_summary)

    if not key_frames:
        key_frames = full_traceback[-3:]

    if key_frames:
        lines = ["Traceback (most recent call last):"]
        for frame_summary in key_frames:
            lines.append(
                f'  File "{frame_summary.filename}", line {frame_summary.lineno}, in {frame_summary.name}'
            )
            if frame_summary.line:
                lines.append(f"    {frame_summary.line}")
        lines.append(f"{exc_type.__name__}: {exc_value}")
        return "\n".join(lines)

    return f"{exc_type.__name__}: {exc_value}"


class InterceptHandler(logging.Handler):
    def emit(self, record: logging.LogRecord) -> None:  # pragma: no cover
        level = get_loguru_level(record)
        depth = find_caller_depth()
        exc_text = format_exception(record.exc_info)

        message = record.getMessage()
        if exc_text:
            message = f"{message}\n{exc_text}"

        logger.opt(depth=depth, exception=None).log(level, message)


log = logger
