#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tests for RagflowRAGStrategy pagination / existence-check fixes (RF-19).

Covers:
- `_validate_document_exists()` — delegates to `ragflow_client.get_document_info`.
- `_get_existing_chunks()` — uses `ragflow_client.fetch_all_document_chunks`.
"""

from typing import Any, Dict, List
from unittest.mock import AsyncMock, patch

import pytest

from knowledge.consts.error_code import CodeEnum
from knowledge.exceptions.exception import CustomException
from knowledge.service.impl.ragflow_strategy import RagflowRAGStrategy

# Mock paths — extracted so a future rename of the strategy module doesn't
# require chasing 6+ string literals.
_GET_DOC_INFO = (
    "knowledge.service.impl.ragflow_strategy.ragflow_client.get_document_info"
)
_LIST_DOCS = (
    "knowledge.service.impl.ragflow_strategy.ragflow_client.list_documents_in_dataset"
)
_FETCH_ALL_CHUNKS = (
    "knowledge.service.impl.ragflow_strategy.ragflow_client.fetch_all_document_chunks"
)
_LIST_CHUNKS = (
    "knowledge.service.impl.ragflow_strategy.ragflow_client.list_document_chunks"
)


# ----------------------------------------------------------------------
# Section A: _validate_document_exists
# ----------------------------------------------------------------------


# Every test below pins BOTH the new helper (`get_document_info`) AND the
# underlying `list_documents_in_dataset`. The second patch is a regression
# guard: it asserts (via `mock_list.assert_not_awaited()`) that the
# implementation never falls back to the old direct-client path. Also keeps
# test failures local/deterministic — no real HTTP regardless of wiring.


@pytest.mark.asyncio
async def test_validate_document_exists_success_when_get_document_info_returns_doc() -> (
    None
):
    """`get_document_info` returns a dict => validation passes silently.

    Also asserts the new helper is the code path actually taken; if the old
    implementation is still in place it will instead call
    `list_documents_in_dataset` and `mock_get` will stay un-awaited.
    """
    strategy = RagflowRAGStrategy()
    with (
        patch(
            _GET_DOC_INFO,
            new=AsyncMock(return_value={"id": "doc-x", "name": "t.pdf"}),
        ) as mock_get,
        patch(
            _LIST_DOCS,
            new=AsyncMock(
                return_value={"code": 0, "data": {"docs": [{"id": "doc-x"}]}}
            ),
        ) as mock_list,
    ):
        await strategy._validate_document_exists("ds-1", "doc-x")
    mock_get.assert_awaited_once_with("ds-1", "doc-x")
    mock_list.assert_not_awaited()


@pytest.mark.asyncio
async def test_validate_document_exists_raises_when_get_document_info_returns_none() -> (
    None
):
    """`get_document_info` returns None => CustomException(ChunkSaveFailed)."""
    strategy = RagflowRAGStrategy()
    # `list_documents_in_dataset` is mocked as "doc exists" so the old implementation
    # would mistakenly PASS validation — that way the red-light failure is stable
    # (CustomException not raised) instead of a network error.
    with (
        patch(
            _GET_DOC_INFO,
            new=AsyncMock(return_value=None),
        ) as mock_get,
        patch(
            _LIST_DOCS,
            new=AsyncMock(
                return_value={"code": 0, "data": {"docs": [{"id": "doc-x"}]}}
            ),
        ) as mock_list,
    ):
        with pytest.raises(CustomException) as exc_info:
            await strategy._validate_document_exists("ds-1", "doc-x")
    assert exc_info.value.code == CodeEnum.ChunkSaveFailed.code
    assert "doc-x" in str(exc_info.value)
    mock_get.assert_awaited_once_with("ds-1", "doc-x")
    mock_list.assert_not_awaited()


@pytest.mark.asyncio
async def test_validate_document_exists_raises_on_unexpected_exception() -> None:
    """Underlying transport error => CustomException, not bare RuntimeError.

    Red-light stability: without the `mock_get.assert_awaited_once` check at
    the end, the old implementation would ALSO pass this test — its own
    try/except converts the RuntimeError raised by the mocked
    list_documents_in_dataset into CustomException(ChunkSaveFailed). The
    assertion that the new helper was called is what distinguishes the
    two implementations.
    """
    strategy = RagflowRAGStrategy()
    with (
        patch(
            _GET_DOC_INFO,
            new=AsyncMock(side_effect=RuntimeError("network down")),
        ) as mock_get,
        patch(
            _LIST_DOCS,
            new=AsyncMock(side_effect=RuntimeError("network down")),
        ) as mock_list,
    ):
        with pytest.raises(CustomException) as exc_info:
            await strategy._validate_document_exists("ds-1", "doc-x")
    assert exc_info.value.code == CodeEnum.ChunkSaveFailed.code
    mock_get.assert_awaited_once_with("ds-1", "doc-x")
    mock_list.assert_not_awaited()


# ----------------------------------------------------------------------
# Section B: _get_existing_chunks
# ----------------------------------------------------------------------


def _make_chunk(chunk_id: str, data_index: str = "") -> Dict[str, Any]:
    return {"id": chunk_id, "dataIndex": data_index, "content": f"body-{chunk_id}"}


# Every test below pins BOTH the new helper (`fetch_all_document_chunks`)
# AND the underlying `list_document_chunks`. The second patch is a regression
# guard: it asserts (via `mock_list.assert_not_awaited()`) that the
# implementation never falls back to the old direct-client path. Also keeps
# test failures local/deterministic — no real HTTP regardless of wiring.


@pytest.mark.asyncio
async def test_get_existing_chunks_maps_by_chunk_id_and_data_index() -> None:
    """Each chunk produces an entry keyed by chunk id, plus an extra entry
    keyed by dataIndex when dataIndex is non-empty."""
    strategy = RagflowRAGStrategy()
    chunks = [
        _make_chunk("c1", data_index="0.0"),
        _make_chunk("c2", data_index=""),
        _make_chunk("c3", data_index="1.0"),
    ]
    with (
        patch(
            _FETCH_ALL_CHUNKS,
            new=AsyncMock(return_value=chunks),
        ) as mock_fetch,
        patch(
            _LIST_CHUNKS,
            new=AsyncMock(
                return_value={
                    "code": 0,
                    "data": {"chunks": chunks, "total": len(chunks)},
                }
            ),
        ) as mock_list,
    ):
        mapping = await strategy._get_existing_chunks("ds-1", "doc-x")

    assert mapping["c1"]["id"] == "c1"
    assert mapping["c2"]["id"] == "c2"
    assert mapping["c3"]["id"] == "c3"
    assert mapping["0.0"]["id"] == "c1"
    assert mapping["1.0"]["id"] == "c3"
    mock_fetch.assert_awaited_once_with("ds-1", "doc-x")
    mock_list.assert_not_awaited()


@pytest.mark.asyncio
async def test_get_existing_chunks_empty_document_returns_empty_mapping() -> None:
    """Fresh document with no chunks => paginator returns [], mapping is {}.

    Guards the for-loop body from being replaced with an early-return
    optimization that might accidentally skip the logger.info or otherwise
    change observable behavior on the empty-doc branch.
    """
    strategy = RagflowRAGStrategy()
    with (
        patch(
            _FETCH_ALL_CHUNKS,
            new=AsyncMock(return_value=[]),
        ) as mock_fetch,
        patch(
            _LIST_CHUNKS,
            new=AsyncMock(return_value={"code": 0, "data": {"chunks": [], "total": 0}}),
        ) as mock_list,
    ):
        mapping = await strategy._get_existing_chunks("ds-1", "doc-x")
    assert mapping == {}
    mock_fetch.assert_awaited_once_with("ds-1", "doc-x")
    mock_list.assert_not_awaited()


@pytest.mark.asyncio
async def test_get_existing_chunks_returns_all_chunks_across_pages() -> None:
    """Regression test for the data-loss bug: a document with 2500 chunks
    must produce 2500 chunk-id entries (previously only page 1 / 1000 were
    returned)."""
    strategy = RagflowRAGStrategy()
    many_chunks = [_make_chunk(f"c{i}") for i in range(2500)]
    with (
        patch(
            _FETCH_ALL_CHUNKS,
            new=AsyncMock(return_value=many_chunks),
        ) as mock_fetch,
        patch(
            _LIST_CHUNKS,
            new=AsyncMock(
                return_value={
                    "code": 0,
                    "data": {"chunks": many_chunks[:1000], "total": 2500},
                }
            ),
        ) as mock_list,
    ):
        mapping = await strategy._get_existing_chunks("ds-1", "doc-x")
    assert len(mapping) == 2500
    assert "c0" in mapping
    assert "c2499" in mapping
    mock_fetch.assert_awaited_once_with("ds-1", "doc-x")
    mock_list.assert_not_awaited()


@pytest.mark.asyncio
async def test_get_existing_chunks_skips_chunks_without_id() -> None:
    """Chunks with neither `id` nor `chunk_id` are ignored (no KeyError).

    Red-light stability: without the `mock_fetch.assert_awaited_once` check
    at the end, the old implementation would ALSO pass this test — it would
    iterate the mocked `list_document_chunks` chunks list (identical content)
    and produce the same mapping. The awaited-once assertion is what makes
    the red light deterministic.
    """
    strategy = RagflowRAGStrategy()
    chunks: List[Dict[str, Any]] = [
        {"id": "c1", "dataIndex": "0.0"},
        {"dataIndex": "1.0"},  # no id at all
        {"chunk_id": "c3", "dataIndex": "2.0"},  # legacy chunk_id key
    ]
    with (
        patch(
            _FETCH_ALL_CHUNKS,
            new=AsyncMock(return_value=chunks),
        ) as mock_fetch,
        patch(
            _LIST_CHUNKS,
            new=AsyncMock(
                return_value={
                    "code": 0,
                    "data": {"chunks": chunks, "total": len(chunks)},
                }
            ),
        ) as mock_list,
    ):
        mapping = await strategy._get_existing_chunks("ds-1", "doc-x")
    assert "c1" in mapping
    assert "c3" in mapping
    assert "1.0" not in mapping
    mock_fetch.assert_awaited_once_with("ds-1", "doc-x")
    mock_list.assert_not_awaited()


@pytest.mark.asyncio
async def test_get_existing_chunks_propagates_fetch_error_fail_closed() -> None:
    """Underlying fetch raises => exception propagates (fail-closed).

    Behavioral change: the previous implementation swallowed errors and
    returned {}, which combined with the downstream dedup logic in
    `_process_single_chunk` silently re-added every chunk on transient
    RAGFlow failures. The new behavior surfaces the error so that
    `chunks_save` aborts (via its `except Exception` -> CustomException
    conversion) rather than corrupt the dataset with duplicates."""
    strategy = RagflowRAGStrategy()
    with (
        patch(
            _FETCH_ALL_CHUNKS,
            new=AsyncMock(side_effect=RuntimeError("network down")),
        ),
        patch(
            _LIST_CHUNKS,
            new=AsyncMock(side_effect=RuntimeError("network down")),
        ),
    ):
        with pytest.raises(RuntimeError) as exc_info:
            await strategy._get_existing_chunks("ds-1", "doc-x")
    assert "network down" in str(exc_info.value)
