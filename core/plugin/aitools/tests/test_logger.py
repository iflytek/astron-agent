"""Unit tests for logger module."""

import logging

from plugin.aitools.common.log.logger import (
    InterceptHandler,
    format_exception,
    get_loguru_level,
    init_uvicorn_logger,
)


class TestGetLoguruLevel:
    """Test cases for get_loguru_level function."""

    def test_known_level(self) -> None:
        """Test with known log level."""
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="test.py",
            lineno=1,
            msg="test",
            args=(),
            exc_info=None,
        )
        level = get_loguru_level(record)
        assert level == "INFO"

    def test_unknown_level(self) -> None:
        """Test with unknown log level."""
        record = logging.LogRecord(
            name="test",
            level=9999,  # Non-standard level
            pathname="test.py",
            lineno=1,
            msg="test",
            args=(),
            exc_info=None,
        )
        level = get_loguru_level(record)
        assert level == "9999"


class TestFormatException:
    """Test cases for format_exception function."""

    def test_none_exc_info(self) -> None:
        """Test with None exc_info."""
        result = format_exception(None)
        assert result is None

    def test_with_traceback(self) -> None:
        """Test with exception and traceback."""
        try:
            raise ValueError("test error")
        except ValueError:
            import sys

            exc_info = sys.exc_info()
            result = format_exception(exc_info)
            assert result is not None
            assert "ValueError" in result
            assert "test error" in result


class TestInterceptHandler:
    """Test cases for InterceptHandler."""

    def test_emit_with_message(self) -> None:
        """Test emit with log record."""
        handler = InterceptHandler()
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="test.py",
            lineno=1,
            msg="test message",
            args=(),
            exc_info=None,
        )
        # Should not raise
        handler.emit(record)

    def test_emit_with_exception(self) -> None:
        """Test emit with exception."""
        handler = InterceptHandler()
        try:
            raise ValueError("test error")
        except ValueError:
            import sys

            record = logging.LogRecord(
                name="test",
                level=logging.ERROR,
                pathname="test.py",
                lineno=1,
                msg="error occurred",
                args=(),
                exc_info=sys.exc_info(),
            )
            # Should not raise
            handler.emit(record)


class TestInitUvicornLogger:
    """Test cases for init_uvicorn_logger function."""

    def test_init_uvicorn_logger(self) -> None:
        """Test init_uvicorn_logger runs without error."""
        # Should not raise
        init_uvicorn_logger()
