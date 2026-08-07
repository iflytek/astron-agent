#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tests for RAGFlow client pagination helpers and id-filter lookups.

Covers:
- `fetch_all_document_chunks()` — paginator for per-document chunks, follows
  the server-reported `total` field across pages.
- `get_document_info()` — single-document lookup via RAGFlow `id` query param.
"""

from typing import Any, Dict, List
from unittest.mock import AsyncMock, patch

import pytest

from knowledge.infra.ragflow import ragflow_client

# Mock paths — extracted so a future rename of the client module doesn't
# require chasing string literals across tests.
_LIST_CHUNKS = "knowledge.infra.ragflow.ragflow_client.list_document_chunks"
_LIST_DOCS = "knowledge.infra.ragflow.ragflow_client.list_documents_in_dataset"


# ----------------------------------------------------------------------
# Section A: fetch_all_document_chunks
# ----------------------------------------------------------------------


def _chunk_page(chunks: List[Dict[str, Any]], total: int) -> Dict[str, Any]:
    """Build a well-formed RAGFlow chunks-API response envelope."""
    return {"code": 0, "data": {"chunks": chunks, "total": total}}


@pytest.mark.asyncio
async def test_fetch_all_document_chunks_single_page_returns_all_items() -> None:
    """total <= page_size => one API call, all items returned."""
    page1 = _chunk_page(
        chunks=[{"id": "c1"}, {"id": "c2"}, {"id": "c3"}],
        total=3,
    )
    with patch(
        _LIST_CHUNKS,
        new=AsyncMock(return_value=page1),
    ) as mock_list:
        result = await ragflow_client.fetch_all_document_chunks(
            "ds-1", "doc-x", page_size=100
        )
    assert [c["id"] for c in result] == ["c1", "c2", "c3"]
    mock_list.assert_awaited_once_with("ds-1", "doc-x", page=1, page_size=100)


@pytest.mark.asyncio
async def test_fetch_all_document_chunks_multi_page_iterates_until_complete() -> None:
    """total > page_size => multiple API calls, results concatenated in order."""
    page1 = _chunk_page(chunks=[{"id": f"c{i}"} for i in range(1, 3)], total=5)
    page2 = _chunk_page(chunks=[{"id": f"c{i}"} for i in range(3, 5)], total=5)
    page3 = _chunk_page(chunks=[{"id": "c5"}], total=5)
    with patch(
        _LIST_CHUNKS,
        new=AsyncMock(side_effect=[page1, page2, page3]),
    ) as mock_list:
        result = await ragflow_client.fetch_all_document_chunks(
            "ds-1", "doc-x", page_size=2
        )
    assert [c["id"] for c in result] == ["c1", "c2", "c3", "c4", "c5"]
    assert mock_list.await_count == 3
    mock_list.assert_any_await("ds-1", "doc-x", page=1, page_size=2)
    mock_list.assert_any_await("ds-1", "doc-x", page=2, page_size=2)
    mock_list.assert_any_await("ds-1", "doc-x", page=3, page_size=2)


@pytest.mark.asyncio
async def test_fetch_all_document_chunks_empty_document_returns_empty_list() -> None:
    """Document with zero chunks => empty list, one API call."""
    empty = _chunk_page(chunks=[], total=0)
    with patch(
        _LIST_CHUNKS,
        new=AsyncMock(return_value=empty),
    ) as mock_list:
        result = await ragflow_client.fetch_all_document_chunks("ds-1", "doc-x")
    assert result == []
    mock_list.assert_awaited_once()


@pytest.mark.asyncio
async def test_fetch_all_document_chunks_non_zero_code_raises_fail_closed() -> None:
    """API error mid-iteration => raise, do NOT return partial results.

    Returning a partial mapping would make the caller treat missing chunks as
    'not yet ingested' and re-add them, corrupting the dataset with
    duplicates (see fail-closed invariant in the plan header).
    """
    page1 = _chunk_page(chunks=[{"id": "c1"}, {"id": "c2"}], total=10)
    page2_error = {"code": 102, "message": "internal error"}
    with patch(
        _LIST_CHUNKS,
        new=AsyncMock(side_effect=[page1, page2_error]),
    ):
        with pytest.raises(RuntimeError) as exc_info:
            await ragflow_client.fetch_all_document_chunks("ds-1", "doc-x", page_size=2)
    assert "doc-x" in str(exc_info.value)
    assert "102" in str(exc_info.value) or "internal error" in str(exc_info.value)


@pytest.mark.asyncio
async def test_fetch_all_document_chunks_empty_mid_page_raises_fail_closed() -> None:
    """Server declares total=N but a mid-iteration page returns an empty batch
    => raise. Returning the partial list would let _process_single_chunk treat
    the missing chunks as new and re-insert them (duplicate corruption).
    """
    page1 = _chunk_page(chunks=[{"id": "c1"}, {"id": "c2"}], total=10)
    page2_empty = _chunk_page(chunks=[], total=10)  # anomaly: total unmet
    with patch(
        _LIST_CHUNKS,
        new=AsyncMock(side_effect=[page1, page2_empty]),
    ):
        with pytest.raises(RuntimeError) as exc_info:
            await ragflow_client.fetch_all_document_chunks("ds-1", "doc-x", page_size=2)
    assert "doc-x" in str(exc_info.value)
    assert "2/10" in str(exc_info.value)


@pytest.mark.asyncio
async def test_fetch_all_document_chunks_missing_total_mid_page_does_not_return_partial() -> (
    None
):
    """Mid-iteration page drops ``total`` while still returning a real batch =>
    paginator must keep paginating using the last-known total, not hand back a
    partial list that would let _get_existing_chunks re-insert missing chunks.
    """
    page1 = _chunk_page(chunks=[{"id": "c1"}, {"id": "c2"}], total=10)
    page2_no_total = {"code": 0, "data": {"chunks": [{"id": "c3"}]}}
    page3_rest = _chunk_page(chunks=[{"id": f"c{i}"} for i in range(4, 11)], total=10)
    with patch(
        _LIST_CHUNKS,
        new=AsyncMock(side_effect=[page1, page2_no_total, page3_rest]),
    ) as mock_list:
        result = await ragflow_client.fetch_all_document_chunks(
            "ds-1", "doc-x", page_size=2
        )
    assert [c["id"] for c in result] == [f"c{i}" for i in range(1, 11)]
    assert mock_list.await_count == 3


@pytest.mark.asyncio
async def test_fetch_all_document_chunks_empty_data_envelope_mid_page_raises_fail_closed() -> (
    None
):
    """Mid-iteration page with ``code=0`` but an empty ``data`` envelope
    (chunks missing AND total missing) must raise, not silently return the
    so-far list.
    """
    page1 = _chunk_page(chunks=[{"id": "c1"}, {"id": "c2"}], total=10)
    page2_empty_envelope = {"code": 0, "data": {}}
    with patch(
        _LIST_CHUNKS,
        new=AsyncMock(side_effect=[page1, page2_empty_envelope]),
    ):
        with pytest.raises(RuntimeError) as exc_info:
            await ragflow_client.fetch_all_document_chunks("ds-1", "doc-x", page_size=2)
    assert "doc-x" in str(exc_info.value)
    assert "empty page 2" in str(exc_info.value)


@pytest.mark.asyncio
async def test_fetch_all_document_chunks_honors_max_pages_safeguard() -> None:
    """Pathological `total` larger than max_pages*page_size => raise after
    max_pages (fail-closed: we cannot distinguish a real huge document from
    a server mis-reporting ``total``, so surface it to the caller)."""
    # Server always claims total=999_999 but returns one chunk per page.
    # Without the safeguard this would loop ~500k times.
    page_with_one = _chunk_page(chunks=[{"id": "c"}], total=999_999)
    with patch(
        _LIST_CHUNKS,
        new=AsyncMock(return_value=page_with_one),
    ) as mock_list:
        with pytest.raises(RuntimeError) as exc_info:
            await ragflow_client.fetch_all_document_chunks(
                "ds-1", "doc-x", page_size=1, max_pages=3
            )
    assert "max_pages" in str(exc_info.value)
    assert "doc-x" in str(exc_info.value)
    assert mock_list.await_count == 3


# ----------------------------------------------------------------------
# Section B: get_document_info
# ----------------------------------------------------------------------


def _docs_page(docs: List[Dict[str, Any]], total: int) -> Dict[str, Any]:
    """Build a well-formed RAGFlow documents-API response envelope."""
    return {"code": 0, "data": {"docs": docs, "total": total}}


@pytest.mark.asyncio
async def test_get_document_info_passes_doc_id_as_filter_with_page_size_one() -> None:
    """Happy path: server-side id filter, single-row page, returns the match."""
    doc = {"id": "doc-x", "name": "test.pdf", "chunk_count": 3}
    with patch(
        _LIST_DOCS,
        new=AsyncMock(return_value=_docs_page(docs=[doc], total=1)),
    ) as mock_list:
        result = await ragflow_client.get_document_info("ds-1", "doc-x")
    assert result == doc
    mock_list.assert_awaited_once_with("ds-1", doc_id="doc-x", page=1, page_size=1)


@pytest.mark.asyncio
async def test_get_document_info_non_matching_id_returns_none() -> None:
    """Server returns docs list without the requested id => None (defensive)."""
    other = {"id": "doc-y", "name": "other.pdf"}
    with patch(
        _LIST_DOCS,
        new=AsyncMock(return_value=_docs_page(docs=[other], total=1)),
    ):
        result = await ragflow_client.get_document_info("ds-1", "doc-x")
    assert result is None


@pytest.mark.asyncio
async def test_get_document_info_empty_docs_returns_none() -> None:
    """code=0 but docs=[] (id unknown to server, some versions of RAGFlow
    filter to empty list rather than returning a non-zero code) => None."""
    with patch(
        _LIST_DOCS,
        new=AsyncMock(return_value=_docs_page(docs=[], total=0)),
    ):
        result = await ragflow_client.get_document_info("ds-1", "doc-x")
    assert result is None


@pytest.mark.asyncio
async def test_get_document_info_empty_doc_id_returns_none_without_network_call() -> (
    None
):
    """Empty ``doc_id`` short-circuits without hitting RAGFlow."""
    with patch(_LIST_DOCS, new=AsyncMock()) as mock_list:
        result = await ragflow_client.get_document_info("ds-1", "")
    assert result is None
    mock_list.assert_not_called()
