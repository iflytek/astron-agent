#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Regression tests for RAGFlow document parsing status polling."""

from unittest.mock import AsyncMock, patch

import pytest

from knowledge.exceptions.exception import ThirdPartyException
from knowledge.infra.ragflow import ragflow_client

_GET_DOCUMENT_INFO = "knowledge.infra.ragflow.ragflow_client.get_document_info"
_SLEEP = "knowledge.infra.ragflow.ragflow_client.asyncio.sleep"
_MONOTONIC = "knowledge.infra.ragflow.ragflow_client.time.monotonic"


def _document(
    run: str,
    *,
    chunk_count: int = 0,
    token_count: int = 0,
    progress: float = 0,
    progress_msg: str = "",
) -> dict:
    return {
        "id": "doc-1",
        "run": run,
        "chunk_count": chunk_count,
        "token_count": token_count,
        "progress": progress,
        "progress_msg": progress_msg,
    }


@pytest.mark.asyncio
async def test_done_with_zero_token_count_completes_immediately() -> None:
    """DONE is terminal even when the token statistic is zero."""
    doc = _document(
        "DONE",
        chunk_count=12,
        token_count=0,
        progress=1,
        progress_msg="Task done",
    )
    with patch(_GET_DOCUMENT_INFO, new=AsyncMock(return_value=doc)) as mock_get, patch(
        _SLEEP, new=AsyncMock()
    ) as mock_sleep:
        result = await ragflow_client.wait_for_parsing(
            "ds-1", "doc-1", max_wait_time=10, poll_interval=0.1
        )

    assert result == "DONE"
    mock_get.assert_awaited_once_with("ds-1", "doc-1")
    mock_sleep.assert_not_awaited()


@pytest.mark.asyncio
async def test_done_with_zero_chunks_is_terminal_for_status_poller() -> None:
    """Chunk validation is separate from the authoritative RAGFlow run state."""
    doc = _document(
        "DONE",
        chunk_count=0,
        token_count=0,
        progress=1,
        progress_msg="No chunk built from file.docx",
    )
    with patch(_GET_DOCUMENT_INFO, new=AsyncMock(return_value=doc)), patch(
        _SLEEP, new=AsyncMock()
    ) as mock_sleep:
        result = await ragflow_client.wait_for_parsing(
            "ds-1", "doc-1", max_wait_time=10, poll_interval=0.1
        )

    assert result == "DONE"
    mock_sleep.assert_not_awaited()


@pytest.mark.asyncio
async def test_running_then_done_polls_until_terminal_state() -> None:
    running = _document("RUNNING", progress=0.5, progress_msg="Embedding")
    done = _document("DONE", chunk_count=3, token_count=42, progress=1)
    with patch(
        _GET_DOCUMENT_INFO,
        new=AsyncMock(side_effect=[running, done]),
    ) as mock_get, patch(_SLEEP, new=AsyncMock()) as mock_sleep:
        result = await ragflow_client.wait_for_parsing(
            "ds-1", "doc-1", max_wait_time=10, poll_interval=0.1
        )

    assert result == "DONE"
    assert mock_get.await_count == 2
    mock_sleep.assert_awaited_once()


@pytest.mark.asyncio
@pytest.mark.parametrize("terminal_status", ["FAIL", "CANCEL"])
async def test_failure_states_raise_immediately(terminal_status: str) -> None:
    doc = _document(
        terminal_status,
        progress=-1,
        progress_msg="Embedding service unavailable",
    )
    with patch(_GET_DOCUMENT_INFO, new=AsyncMock(return_value=doc)), patch(
        _SLEEP, new=AsyncMock()
    ) as mock_sleep:
        with pytest.raises(ThirdPartyException) as exc_info:
            await ragflow_client.wait_for_parsing(
                "ds-1", "doc-1", max_wait_time=10, poll_interval=0.1
            )

    assert terminal_status in str(exc_info.value)
    assert "Embedding service unavailable" in str(exc_info.value)
    mock_sleep.assert_not_awaited()


@pytest.mark.asyncio
async def test_single_status_transport_error_is_retried() -> None:
    done = _document("DONE", chunk_count=2, token_count=0, progress=1)
    with patch(
        _GET_DOCUMENT_INFO,
        new=AsyncMock(side_effect=[RuntimeError("connection reset"), done]),
    ) as mock_get, patch(_SLEEP, new=AsyncMock()) as mock_sleep:
        result = await ragflow_client.wait_for_parsing(
            "ds-1", "doc-1", max_wait_time=10, poll_interval=0.1
        )

    assert result == "DONE"
    assert mock_get.await_count == 2
    mock_sleep.assert_awaited_once()


@pytest.mark.asyncio
async def test_repeated_status_transport_errors_fail_after_limit() -> None:
    with patch(
        _GET_DOCUMENT_INFO,
        new=AsyncMock(side_effect=RuntimeError("connection reset")),
    ) as mock_get, patch(_SLEEP, new=AsyncMock()) as mock_sleep:
        with pytest.raises(ThirdPartyException) as exc_info:
            await ragflow_client.wait_for_parsing(
                "ds-1",
                "doc-1",
                max_wait_time=10,
                poll_interval=0.1,
                max_status_errors=2,
            )

    assert "after 2 attempts" in str(exc_info.value)
    assert "connection reset" in str(exc_info.value)
    assert mock_get.await_count == 2
    mock_sleep.assert_awaited_once()


@pytest.mark.asyncio
async def test_timeout_raises_instead_of_returning_last_status() -> None:
    running = _document("RUNNING", progress=0.8, progress_msg="Indexing")
    with patch(_GET_DOCUMENT_INFO, new=AsyncMock(return_value=running)), patch(
        _SLEEP, new=AsyncMock()
    ) as mock_sleep, patch(_MONOTONIC, side_effect=[0.0, 0.0, 2.0]):
        with pytest.raises(ThirdPartyException) as exc_info:
            await ragflow_client.wait_for_parsing(
                "ds-1", "doc-1", max_wait_time=1, poll_interval=0.1
            )

    assert "timed out after 1 seconds" in str(exc_info.value)
    assert "status=RUNNING" in str(exc_info.value)
    mock_sleep.assert_not_awaited()


@pytest.mark.asyncio
async def test_done_response_arriving_after_deadline_is_timeout() -> None:
    """A terminal response cannot turn an already-expired wait into success."""
    done = _document("DONE", chunk_count=2, token_count=0, progress=1)
    with patch(_GET_DOCUMENT_INFO, new=AsyncMock(return_value=done)), patch(
        _SLEEP, new=AsyncMock()
    ) as mock_sleep, patch(_MONOTONIC, side_effect=[0.0, 0.0, 2.0]):
        with pytest.raises(ThirdPartyException) as exc_info:
            await ragflow_client.wait_for_parsing(
                "ds-1", "doc-1", max_wait_time=1, poll_interval=0.1
            )

    assert "timed out after 1 seconds" in str(exc_info.value)
    assert "status=DONE" in str(exc_info.value)
    mock_sleep.assert_not_awaited()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("max_wait_time", "poll_interval", "max_status_errors", "expected"),
    [
        (0, 1.0, 3, "max_wait_time"),
        (1, 0, 3, "poll_interval"),
        (1, 1.0, 0, "max_status_errors"),
    ],
)
async def test_invalid_wait_parameters_are_rejected(
    max_wait_time: int,
    poll_interval: float,
    max_status_errors: int,
    expected: str,
) -> None:
    with pytest.raises(ValueError, match=expected):
        await ragflow_client.wait_for_parsing(
            "ds-1",
            "doc-1",
            max_wait_time=max_wait_time,
            poll_interval=poll_interval,
            max_status_errors=max_status_errors,
        )
