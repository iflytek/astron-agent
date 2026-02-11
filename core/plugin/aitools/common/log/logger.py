"""
Logging module providing unified logging configuration and interfaces.
"""

import logging
import os
import sys
from types import FrameType
from typing import cast

from loguru import logger

# def init_logger():
LOG_FILE = "logs/aitools.log"
ROTATION = "5 MB"
RETENTION = "30 days"
ENCODING = "UTF-8"
LEVEL = "DEBUG"
logger.remove()  # Remove default logger
logger.add(
    LOG_FILE, rotation=ROTATION, retention=RETENTION, encoding=ENCODING, level=LEVEL
)

# Add console handler for local environment
if os.getenv("LOG_STDOUT_ENABLE", "0") == "1":
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

    # change handler for default uvicorn logger
    logging.getLogger().handlers = [InterceptHandler()]
    for logger_name in logger_names:
        logging_logger = logging.getLogger(logger_name)
        logging_logger.handlers = [InterceptHandler()]


class InterceptHandler(logging.Handler):
    def emit(self, record: logging.LogRecord) -> None:  # pragma: no cover
        # Get corresponding Loguru level if it exists
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = str(record.levelno)

        # Find caller from where originated the logged message
        frame, depth = logging.currentframe(), 2
        while frame.f_code.co_filename == logging.__file__:  # noqa: WPS609
            frame = cast(FrameType, frame.f_back)
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(
            level,
            record.getMessage(),
        )


log = logger
