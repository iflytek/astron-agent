"""Unit tests for the retry decorator and session discovery utility."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from memory.database.utils.retry import (
    _find_session_from_args,
    retry_on_invalid_cached_statement,
)
from sqlalchemy.exc import InterfaceError

# ---------------------------------------------------------------------------
# A. _find_session_from_args
# ---------------------------------------------------------------------------


class TestFindSessionFromArgs:
    """Tests for the _find_session_from_args helper."""

    def test_session_in_positional_args(self) -> None:
        """Session found in positional args."""
        session = MagicMock()
        session.execute = MagicMock()
        session.connection = MagicMock()
        result = _find_session_from_args((session,), {})
        assert result is session

    def test_session_in_keyword_args(self) -> None:
        """Session found in keyword args."""
        session = MagicMock()
        session.execute = MagicMock()
        session.connection = MagicMock()
        result = _find_session_from_args((), {"db": session})
        assert result is session

    def test_no_session_found(self) -> None:
        """No session found returns None."""
        result = _find_session_from_args(("plain_string", 42), {"key": "value"})
        assert result is None

    def test_object_with_execute_but_no_connection(self) -> None:
        """Object with execute but no connection returns None."""
        obj = MagicMock(spec=["execute"])
        result = _find_session_from_args((obj,), {})
        assert result is None


# ---------------------------------------------------------------------------
# B. retry_on_invalid_cached_statement decorator
# ---------------------------------------------------------------------------


class TestRetryDecorator:
    """Tests for the retry_on_invalid_cached_statement decorator."""

    @pytest.mark.asyncio
    async def test_succeeds_on_first_call(self) -> None:
        """Function succeeds on first call -> called once."""
        mock_fn = AsyncMock(return_value="ok")

        @retry_on_invalid_cached_statement(max_retries=2, delay=0.0)
        async def func() -> str:
            return await mock_fn()

        with patch("memory.database.utils.retry.get_adapter") as mock_get_adapter:
            adapter = MagicMock()
            mock_get_adapter.return_value = adapter

            result = await func()

        assert result == "ok"
        assert mock_fn.call_count == 1

    @pytest.mark.asyncio
    async def test_retries_on_retryable_error(self) -> None:
        """Retryable error then success -> called twice with cache clear."""
        session = AsyncMock()
        session.execute = AsyncMock()
        session.connection = AsyncMock()

        call_count = 0

        @retry_on_invalid_cached_statement(max_retries=2, delay=0.0)
        async def func(db: object) -> str:
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise RuntimeError("retryable")
            return "ok"

        with patch("memory.database.utils.retry.get_adapter") as mock_get_adapter:
            adapter = MagicMock()
            adapter.is_retryable_cache_error.return_value = True
            adapter.clear_statement_cache = AsyncMock()
            adapter.restore_search_path = AsyncMock()
            mock_get_adapter.return_value = adapter

            result = await func(session)

        assert result == "ok"
        assert call_count == 2
        adapter.clear_statement_cache.assert_called_once_with(session)
        adapter.restore_search_path.assert_called_once_with(session)

    @pytest.mark.asyncio
    async def test_non_retryable_error_raises_immediately(self) -> None:
        """Non-retryable error raises immediately without retry."""
        call_count = 0

        @retry_on_invalid_cached_statement(max_retries=2, delay=0.0)
        async def func() -> str:
            nonlocal call_count
            call_count += 1
            raise ValueError("non-retryable")

        with patch("memory.database.utils.retry.get_adapter") as mock_get_adapter:
            adapter = MagicMock()
            adapter.is_retryable_cache_error.return_value = False
            mock_get_adapter.return_value = adapter

            with pytest.raises(ValueError, match="non-retryable"):
                await func()

        assert call_count == 1

    @pytest.mark.asyncio
    async def test_max_retries_exceeded(self) -> None:
        """Raises after max retries are exceeded."""

        @retry_on_invalid_cached_statement(max_retries=2, delay=0.0)
        async def func() -> str:
            raise RuntimeError("always fails")

        with patch("memory.database.utils.retry.get_adapter") as mock_get_adapter:
            adapter = MagicMock()
            adapter.is_retryable_cache_error.return_value = True
            adapter.clear_statement_cache = AsyncMock()
            adapter.restore_search_path = AsyncMock()
            mock_get_adapter.return_value = adapter

            with pytest.raises(RuntimeError, match="always fails"):
                await func()

    @pytest.mark.asyncio
    async def test_interface_error_triggers_retry(self) -> None:
        """InterfaceError triggers retry even if is_retryable_cache_error is False."""
        call_count = 0

        @retry_on_invalid_cached_statement(max_retries=2, delay=0.0)
        async def func() -> str:
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise InterfaceError("statement", {}, Exception("connection lost"))
            return "recovered"

        with patch("memory.database.utils.retry.get_adapter") as mock_get_adapter:
            adapter = MagicMock()
            adapter.is_retryable_cache_error.return_value = False
            adapter.clear_statement_cache = AsyncMock()
            adapter.restore_search_path = AsyncMock()
            mock_get_adapter.return_value = adapter

            result = await func()

        assert result == "recovered"
        assert call_count == 2

    @pytest.mark.asyncio
    async def test_sleep_called_between_retries(self) -> None:
        """asyncio.sleep is called with configured delay between retries."""
        call_count = 0

        @retry_on_invalid_cached_statement(max_retries=2, delay=0.5)
        async def func() -> str:
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise RuntimeError("retryable")
            return "ok"

        with patch("memory.database.utils.retry.get_adapter") as mock_get_adapter:
            adapter = MagicMock()
            adapter.is_retryable_cache_error.return_value = True
            adapter.clear_statement_cache = AsyncMock()
            adapter.restore_search_path = AsyncMock()
            mock_get_adapter.return_value = adapter

            with patch("memory.database.utils.retry.asyncio.sleep") as mock_sleep:
                mock_sleep.return_value = None
                await func()
                mock_sleep.assert_called_once_with(0.5)
