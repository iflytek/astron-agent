#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tests for RagflowRAGStrategy error propagation.

RAGFlow transport errors and non-zero response codes should raise
``ThirdPartyException``. Legitimate empty results should still return the
existing empty response shape.
"""

from typing import Any, Dict
from unittest.mock import AsyncMock, patch

import aiohttp
import pytest

from knowledge.consts.error_code import CodeEnum
from knowledge.exceptions.exception import ThirdPartyException
from knowledge.service.impl.ragflow_strategy import RagflowRAGStrategy

# Patch targets - keep in sync with imports in `ragflow_strategy.py`.
_GET_DATASET_NAME = (
    "knowledge.service.impl.ragflow_strategy.RagflowUtils.get_default_dataset_name"
)
_ENSURE_DATASET = "knowledge.service.impl.ragflow_strategy.RagflowUtils.ensure_dataset"
_LIST_CHUNKS = (
    "knowledge.service.impl.ragflow_strategy.ragflow_client.list_document_chunks"
)
_GET_DOC_INFO = (
    "knowledge.service.impl.ragflow_strategy.ragflow_client.get_document_info"
)
_RETRIEVAL = (
    "knowledge.service.impl.ragflow_strategy.ragflow_client.retrieval_with_dataset"
)


# ----------------------------------------------------------------------
# Section 0: query (the /chunk/query main retrieval path)
# ----------------------------------------------------------------------


@pytest.mark.asyncio
async def test_query_raises_on_transport_exception() -> None:
    """Main retrieval path propagates aiohttp.ClientError as ThirdPartyException."""
    strategy = RagflowRAGStrategy()
    with (
        patch(_GET_DATASET_NAME, return_value="ds-name"),
        patch(_ENSURE_DATASET, new=AsyncMock(return_value="ds-1")),
        patch(
            _RETRIEVAL,
            new=AsyncMock(
                side_effect=aiohttp.ClientConnectionError("RAGFlow unreachable")
            ),
        ),
    ):
        with pytest.raises(ThirdPartyException) as exc_info:
            await strategy.query("hello", top_k=6)
    assert "RAGFlow" in str(exc_info.value) or "query" in str(exc_info.value)


@pytest.mark.asyncio
async def test_query_raises_on_ragflow_error_code() -> None:
    """Main retrieval path raises ThirdPartyException on non-zero RAGFlow code."""
    strategy = RagflowRAGStrategy()
    bad_response: Dict[str, Any] = {
        "code": 500,
        "message": "RAGFlow internal failure",
    }
    with (
        patch(_GET_DATASET_NAME, return_value="ds-name"),
        patch(_ENSURE_DATASET, new=AsyncMock(return_value="ds-1")),
        patch(_RETRIEVAL, new=AsyncMock(return_value=bad_response)),
    ):
        with pytest.raises(ThirdPartyException) as exc_info:
            await strategy.query("hello", top_k=6)
    assert "RAGFlow internal failure" in str(exc_info.value)


@pytest.mark.asyncio
async def test_query_returns_empty_results_when_no_chunks_matched() -> None:
    """A genuine no-match (code=0, empty chunks) returns the empty-results dict."""
    strategy = RagflowRAGStrategy()
    empty_response: Dict[str, Any] = {
        "code": 0,
        "data": {"chunks": []},
    }
    with (
        patch(_GET_DATASET_NAME, return_value="ds-name"),
        patch(_ENSURE_DATASET, new=AsyncMock(return_value="ds-1")),
        patch(_RETRIEVAL, new=AsyncMock(return_value=empty_response)),
    ):
        result = await strategy.query("hello", top_k=6)
    assert result == {"query": "hello", "count": 0, "results": []}


# ----------------------------------------------------------------------
# Section A: query_doc
# ----------------------------------------------------------------------


@pytest.mark.asyncio
async def test_query_doc_raises_on_transport_exception() -> None:
    """aiohttp.ClientError from the client layer surfaces as ThirdPartyException."""
    strategy = RagflowRAGStrategy()
    with (
        patch(_GET_DATASET_NAME, return_value="ds-name"),
        patch(_ENSURE_DATASET, new=AsyncMock(return_value="ds-1")),
        patch(
            _LIST_CHUNKS,
            new=AsyncMock(
                side_effect=aiohttp.ClientConnectionError("RAGFlow unreachable")
            ),
        ),
    ):
        with pytest.raises(ThirdPartyException) as exc_info:
            await strategy.query_doc("doc-x")
    assert "doc-x" in str(exc_info.value) or "RAGFlow" in str(exc_info.value)


@pytest.mark.asyncio
async def test_query_doc_raises_on_ragflow_error_code() -> None:
    """``code != 0`` from the chunks endpoint raises ThirdPartyException."""
    strategy = RagflowRAGStrategy()
    bad_response: Dict[str, Any] = {
        "code": 500,
        "message": "internal RAGFlow failure",
    }
    with (
        patch(_GET_DATASET_NAME, return_value="ds-name"),
        patch(_ENSURE_DATASET, new=AsyncMock(return_value="ds-1")),
        patch(_LIST_CHUNKS, new=AsyncMock(return_value=bad_response)),
    ):
        with pytest.raises(ThirdPartyException) as exc_info:
            await strategy.query_doc("doc-x")
    assert "internal RAGFlow failure" in str(exc_info.value)


@pytest.mark.asyncio
async def test_query_doc_preserves_third_party_exception() -> None:
    """Existing ThirdPartyException instances from dataset resolution propagate."""
    strategy = RagflowRAGStrategy()
    original = ThirdPartyException(
        msg="dataset lookup failed",
        e=CodeEnum.RAGFLOW_RAGError,
    )
    with (
        patch(_GET_DATASET_NAME, return_value="ds-name"),
        patch(_ENSURE_DATASET, new=AsyncMock(side_effect=original)),
    ):
        with pytest.raises(ThirdPartyException) as exc_info:
            await strategy.query_doc("doc-x")
    assert exc_info.value is original


@pytest.mark.asyncio
async def test_query_doc_returns_empty_list_when_document_has_no_chunks() -> None:
    """A document with zero chunks returns ``[]`` without raising."""
    strategy = RagflowRAGStrategy()
    empty_response: Dict[str, Any] = {
        "code": 0,
        "data": {"total": 0, "chunks": []},
    }
    with (
        patch(_GET_DATASET_NAME, return_value="ds-name"),
        patch(_ENSURE_DATASET, new=AsyncMock(return_value="ds-1")),
        patch(_LIST_CHUNKS, new=AsyncMock(return_value=empty_response)),
    ):
        result = await strategy.query_doc("doc-x")
    assert result == []


# ----------------------------------------------------------------------
# Section B: query_doc_name
# ----------------------------------------------------------------------


@pytest.mark.asyncio
async def test_query_doc_name_raises_on_transport_exception() -> None:
    """Transport exception inside ``get_document_info`` surfaces as ThirdPartyException."""
    strategy = RagflowRAGStrategy()
    with (
        patch(_GET_DATASET_NAME, return_value="ds-name"),
        patch(_ENSURE_DATASET, new=AsyncMock(return_value="ds-1")),
        patch(
            _GET_DOC_INFO,
            new=AsyncMock(side_effect=aiohttp.ClientError("connection reset")),
        ),
    ):
        with pytest.raises(ThirdPartyException) as exc_info:
            await strategy.query_doc_name("doc-x")
    assert "doc-x" in str(exc_info.value) or "connection reset" in str(exc_info.value)


@pytest.mark.asyncio
async def test_query_doc_name_preserves_third_party_exception() -> None:
    """Existing ThirdPartyException instances propagate unchanged."""
    strategy = RagflowRAGStrategy()
    original = ThirdPartyException(
        msg="document info failed",
        e=CodeEnum.RAGFLOW_RAGError,
    )
    with (
        patch(_GET_DATASET_NAME, return_value="ds-name"),
        patch(_ENSURE_DATASET, new=AsyncMock(return_value="ds-1")),
        patch(_GET_DOC_INFO, new=AsyncMock(side_effect=original)),
    ):
        with pytest.raises(ThirdPartyException) as exc_info:
            await strategy.query_doc_name("doc-x")
    assert exc_info.value is original


@pytest.mark.asyncio
async def test_query_doc_name_returns_none_when_document_truly_missing() -> None:
    """'document not found' (``get_document_info`` returns None) stays a normal None."""
    strategy = RagflowRAGStrategy()
    with (
        patch(_GET_DATASET_NAME, return_value="ds-name"),
        patch(_ENSURE_DATASET, new=AsyncMock(return_value="ds-1")),
        patch(_GET_DOC_INFO, new=AsyncMock(return_value=None)),
    ):
        result = await strategy.query_doc_name("doc-x")
    assert result is None
