#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tests for RagflowRAGStrategy.query() datasetId routing."""

import logging
from typing import Any, Mapping
from unittest.mock import AsyncMock, patch

import pytest

from knowledge.domain.entity.chunk_dto import RagflowQueryExt
from knowledge.exceptions.exception import ThirdPartyException
from knowledge.service.impl.ragflow_strategy import RagflowRAGStrategy

_GET_DATASET_NAME = (
    "knowledge.service.impl.ragflow_strategy.RagflowUtils.get_default_dataset_name"
)
_ENSURE_DATASET = "knowledge.service.impl.ragflow_strategy.RagflowUtils.ensure_dataset"
_RETRIEVAL = (
    "knowledge.service.impl.ragflow_strategy.ragflow_client.retrieval_with_dataset"
)
_CONVERT = (
    "knowledge.service.impl.ragflow_strategy."
    "RagflowUtils.convert_ragflow_query_response"
)


def _await_kwargs(mock: AsyncMock) -> Mapping[str, Any]:
    await_args = mock.await_args
    assert await_args is not None
    return await_args.kwargs


def _await_args(mock: AsyncMock) -> tuple[Any, ...]:
    await_args = mock.await_args
    assert await_args is not None
    return await_args.args


# ---------------------------------------------------------------------------
# _resolve_query_datasets helper
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_resolve_query_datasets_no_ids_uses_default() -> None:
    """datasetId=None uses the default dataset."""
    strategy = RagflowRAGStrategy()
    with patch(_GET_DATASET_NAME, return_value="default-group"), patch(
        _ENSURE_DATASET, new=AsyncMock(return_value="ds-default")
    ) as ensure_mock:
        dataset_ids = await strategy._resolve_query_datasets(None)
        assert dataset_ids == ["ds-default"]
        ensure_mock.assert_awaited_once_with("default-group")


@pytest.mark.asyncio
async def test_resolve_query_datasets_empty_list_uses_default() -> None:
    """Empty list also uses the default dataset."""
    strategy = RagflowRAGStrategy()
    with patch(_GET_DATASET_NAME, return_value="default-group"), patch(
        _ENSURE_DATASET, new=AsyncMock(return_value="ds-default")
    ) as ensure_mock:
        dataset_ids = await strategy._resolve_query_datasets([])
        assert dataset_ids == ["ds-default"]
        ensure_mock.assert_awaited_once_with("default-group")


@pytest.mark.asyncio
async def test_resolve_query_datasets_explicit_ids_passthrough() -> None:
    """Explicit dataset_ids are returned unchanged; ensure_dataset is NOT awaited."""
    strategy = RagflowRAGStrategy()
    with patch(
        _ENSURE_DATASET, new=AsyncMock(return_value="ds-default")
    ) as ensure_mock:
        dataset_ids = await strategy._resolve_query_datasets(["ds-1", "ds-2"])
        assert dataset_ids == ["ds-1", "ds-2"]
        ensure_mock.assert_not_called()


@pytest.mark.asyncio
async def test_resolve_query_datasets_single_id_passthrough() -> None:
    """Single dataset id is returned unchanged."""
    strategy = RagflowRAGStrategy()
    with patch(
        _ENSURE_DATASET, new=AsyncMock(return_value="ds-default")
    ) as ensure_mock:
        dataset_ids = await strategy._resolve_query_datasets(["ds-abc"])
        assert dataset_ids == ["ds-abc"]
        ensure_mock.assert_not_called()


# ---------------------------------------------------------------------------
# _build_retrieval_payload + _apply_ragflow_ext helpers
# ---------------------------------------------------------------------------


def test_build_retrieval_payload_basic() -> None:
    """Payload contains dataset_ids, question, top_k, similarity_threshold."""
    strategy = RagflowRAGStrategy()
    payload = strategy._build_retrieval_payload(
        query="hello",
        dataset_ids=["ds-1", "ds-2"],
        doc_ids=None,
        top_k=5,
        threshold=0.3,
        ext=None,
    )
    assert payload["dataset_ids"] == ["ds-1", "ds-2"]
    assert payload["question"] == "hello"
    assert payload["top_k"] == 5
    assert payload["similarity_threshold"] == 0.3
    assert payload["vector_similarity_weight"] == 0.2


def test_build_retrieval_payload_with_doc_ids_double_filter() -> None:
    """Payload includes both dataset_ids and document_ids when doc_ids given."""
    strategy = RagflowRAGStrategy()
    payload = strategy._build_retrieval_payload(
        query="hello",
        dataset_ids=["ds-1"],
        doc_ids=["doc1", "doc2"],
        top_k=5,
        threshold=0.0,
        ext=None,
    )
    assert payload["dataset_ids"] == ["ds-1"]
    assert payload["document_ids"] == ["doc1", "doc2"]


def test_apply_ragflow_ext_sets_keyword_and_other_fields() -> None:
    """_apply_ragflow_ext sets non-top_k fields on payload."""
    strategy = RagflowRAGStrategy()
    payload = {"top_k": 5, "question": "x"}
    ext = RagflowQueryExt(top_k=20, keyword=True)
    strategy._apply_ragflow_ext(payload, ext)
    assert payload["top_k"] == 5  # unchanged: helper does NOT touch top_k
    assert payload["keyword"] is True


def test_apply_ragflow_ext_highlight_str_workaround() -> None:
    """v0.20.5 workaround: highlight is converted to str(bool)."""
    strategy = RagflowRAGStrategy()
    payload: dict = {}
    ext = RagflowQueryExt(highlight=False)
    strategy._apply_ragflow_ext(payload, ext)
    # v0.20.5 highlight string-comparison bug: must pass str(False) = "False".
    assert payload["highlight"] == "False"


# ---------------------------------------------------------------------------
# _execute_retrieval + _empty_query_result helpers
# ---------------------------------------------------------------------------


def test_empty_query_result_format() -> None:
    """Empty result has unified shape: query/count/results."""
    strategy = RagflowRAGStrategy()
    result = strategy._empty_query_result("hello")
    assert result == {"query": "hello", "count": 0, "results": []}


@pytest.mark.asyncio
async def test_execute_retrieval_returns_converted_results() -> None:
    """_execute_retrieval calls retrieval API + converts response."""
    strategy = RagflowRAGStrategy()
    fake_resp = {
        "code": 0,
        "data": {"chunks": [{"similarity": 0.9, "document_id": "d1", "content": "c1"}]},
    }
    converted = [{"docId": "d1", "content": "c1", "score": 0.9}]
    with patch(
        _RETRIEVAL, new=AsyncMock(return_value=fake_resp)
    ) as mock_retrieval, patch(_CONVERT, return_value=converted):
        result = await strategy._execute_retrieval(
            payload={
                "question": "x",
                "dataset_ids": ["ds-1"],
                "top_k": 5,
                "similarity_threshold": 0.0,
                "vector_similarity_weight": 0.2,
            },
            query="x",
            threshold=0.0,
            effective_top_k=5,
        )
    assert result["count"] == 1
    assert result["query"] == "x"
    assert result["results"][0]["docId"] == "d1"
    # The retrieval client takes request_data via keyword.
    assert _await_kwargs(mock_retrieval)["request_data"]["dataset_ids"] == ["ds-1"]


# ---------------------------------------------------------------------------
# query() integration
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_query_with_explicit_dataset_ids_skips_ensure() -> None:
    """Caller-supplied datasetId is forwarded as-is."""
    strategy = RagflowRAGStrategy()
    fake_resp = {
        "code": 0,
        "data": {
            "chunks": [{"similarity": 0.9, "document_id": "d1", "content": "hit"}]
        },
    }
    converted = [{"docId": "d1", "content": "hit", "score": 0.9}]
    with patch(
        _ENSURE_DATASET, new=AsyncMock(return_value="ds-default")
    ) as ensure_mock, patch(
        _RETRIEVAL, new=AsyncMock(return_value=fake_resp)
    ) as mock_retrieval, patch(
        _CONVERT, return_value=converted
    ):
        result = await strategy.query(
            query="hello",
            doc_ids=None,
            top_k=5,
            datasetId=["ds-real-1", "ds-real-2"],
        )
        ensure_mock.assert_not_called()
        sent_payload = _await_kwargs(mock_retrieval)["request_data"]
        assert sent_payload["dataset_ids"] == ["ds-real-1", "ds-real-2"]
        assert result["count"] == 1
        assert result["results"][0]["docId"] == "d1"


@pytest.mark.asyncio
async def test_query_falls_back_to_default_group_when_dataset_id_none() -> None:
    """datasetId=None uses the default dataset."""
    strategy = RagflowRAGStrategy()
    fake_resp = {"code": 0, "data": {"chunks": []}}
    with patch(_GET_DATASET_NAME, return_value="default-group"), patch(
        _ENSURE_DATASET, new=AsyncMock(return_value="ds-default")
    ) as ensure_mock, patch(
        _RETRIEVAL, new=AsyncMock(return_value=fake_resp)
    ) as mock_retrieval, patch(
        _CONVERT, return_value=[]
    ):
        await strategy.query(query="hello", doc_ids=None, top_k=5, datasetId=None)
        ensure_mock.assert_awaited_once_with("default-group")
        sent_payload = _await_kwargs(mock_retrieval)["request_data"]
        assert sent_payload["dataset_ids"] == ["ds-default"]


@pytest.mark.asyncio
async def test_query_falls_back_to_default_group_when_dataset_id_omitted() -> None:
    """Omitting datasetId is equivalent to datasetId=None."""
    strategy = RagflowRAGStrategy()
    fake_resp = {"code": 0, "data": {"chunks": []}}
    with patch(_GET_DATASET_NAME, return_value="default-group"), patch(
        _ENSURE_DATASET, new=AsyncMock(return_value="ds-default")
    ) as ensure_mock, patch(_RETRIEVAL, new=AsyncMock(return_value=fake_resp)), patch(
        _CONVERT, return_value=[]
    ):
        await strategy.query(query="hello", top_k=5)
        ensure_mock.assert_awaited_once_with("default-group")


@pytest.mark.asyncio
async def test_query_default_dataset_unresolvable_returns_empty(
    caplog: pytest.LogCaptureFixture,
) -> None:
    """When ensure_dataset returns falsy, query yields empty."""
    strategy = RagflowRAGStrategy()
    with patch(_GET_DATASET_NAME, return_value="default-group"), patch(
        _ENSURE_DATASET, new=AsyncMock(return_value=None)
    ), patch(_RETRIEVAL, new=AsyncMock()) as mock_retrieval:
        with caplog.at_level(
            logging.INFO, logger="knowledge.service.impl.ragflow_strategy"
        ):
            result = await strategy.query(query="hello", top_k=5)
        mock_retrieval.assert_not_called()
        assert result == {"query": "hello", "count": 0, "results": []}


@pytest.mark.asyncio
async def test_query_doc_ids_passthrough_with_explicit_dataset_id() -> None:
    """doc_ids combine with explicit datasetId for double filter."""
    strategy = RagflowRAGStrategy()
    fake_resp = {"code": 0, "data": {"chunks": []}}
    with patch(
        _ENSURE_DATASET, new=AsyncMock(return_value="ds-default")
    ) as ensure_mock, patch(
        _RETRIEVAL, new=AsyncMock(return_value=fake_resp)
    ) as mock_retrieval, patch(
        _CONVERT, return_value=[]
    ):
        await strategy.query(
            query="hello",
            doc_ids=["doc1", "doc2"],
            top_k=5,
            datasetId=["ds-abc"],
        )
        ensure_mock.assert_not_called()
        sent_payload = _await_kwargs(mock_retrieval)["request_data"]
        assert sent_payload["dataset_ids"] == ["ds-abc"]
        assert sent_payload["document_ids"] == ["doc1", "doc2"]


@pytest.mark.asyncio
async def test_query_propagates_ragflow_errors() -> None:
    """RAGFlow exception bubbles as ThirdPartyException, NOT empty."""
    strategy = RagflowRAGStrategy()
    with patch(_RETRIEVAL, new=AsyncMock(side_effect=RuntimeError("RAGFlow 5xx"))):
        with pytest.raises(ThirdPartyException):
            await strategy.query(
                query="hello",
                doc_ids=None,
                top_k=5,
                datasetId=["ds-abc"],
            )


# ---------------------------------------------------------------------------
# query_doc / query_doc_name
# ---------------------------------------------------------------------------

_LIST_CHUNKS = (
    "knowledge.service.impl.ragflow_strategy.ragflow_client.list_document_chunks"
)
_GET_DOC_INFO = (
    "knowledge.service.impl.ragflow_strategy.ragflow_client.get_document_info"
)


@pytest.mark.asyncio
async def test_query_doc_passes_through_explicit_dataset_id() -> None:
    """query_doc with non-empty datasetId skips ensure_dataset."""
    strategy = RagflowRAGStrategy()
    with patch(_ENSURE_DATASET, new=AsyncMock()) as mock_ensure, patch(
        _LIST_CHUNKS,
        new=AsyncMock(return_value={"code": 0, "data": {"total": 0, "chunks": []}}),
    ) as mock_list:
        await strategy.query_doc(docId="doc-1", datasetId="ds-explicit-123")
        mock_ensure.assert_not_called()
        assert _await_args(mock_list)[0] == "ds-explicit-123"


@pytest.mark.asyncio
async def test_query_doc_with_null_dataset_id_falls_back_to_default() -> None:
    """query_doc with datasetId=None ensures the default dataset exists."""
    strategy = RagflowRAGStrategy()
    with patch(_GET_DATASET_NAME, return_value="default-group"), patch(
        _ENSURE_DATASET, new=AsyncMock(return_value="ds-default")
    ) as mock_ensure, patch(
        _LIST_CHUNKS,
        new=AsyncMock(return_value={"code": 0, "data": {"total": 0, "chunks": []}}),
    ):
        await strategy.query_doc(docId="doc-1", datasetId=None)
        mock_ensure.assert_awaited_once_with("default-group")


@pytest.mark.asyncio
async def test_query_doc_returns_empty_when_default_unresolvable() -> None:
    """query_doc returns [] when ensure_dataset cannot resolve the default."""
    strategy = RagflowRAGStrategy()
    with patch(_GET_DATASET_NAME, return_value="default-group"), patch(
        _ENSURE_DATASET, new=AsyncMock(return_value=None)
    ), patch(_LIST_CHUNKS, new=AsyncMock()) as mock_list:
        result = await strategy.query_doc(docId="doc-1", datasetId=None)
        assert result == []
        mock_list.assert_not_called()


@pytest.mark.asyncio
async def test_query_doc_name_passes_through_explicit_dataset_id() -> None:
    """query_doc_name with non-empty datasetId skips ensure_dataset."""
    strategy = RagflowRAGStrategy()
    with patch(_ENSURE_DATASET, new=AsyncMock()) as mock_ensure, patch(
        _GET_DOC_INFO, new=AsyncMock(return_value={"name": "f.pdf", "run": "DONE"})
    ) as mock_info:
        await strategy.query_doc_name(docId="doc-1", datasetId="ds-explicit-123")
        mock_ensure.assert_not_called()
        assert _await_args(mock_info)[0] == "ds-explicit-123"


@pytest.mark.asyncio
async def test_query_doc_name_with_null_dataset_id_falls_back_to_default() -> None:
    """query_doc_name with datasetId=None ensures the default dataset exists."""
    strategy = RagflowRAGStrategy()
    with patch(_GET_DATASET_NAME, return_value="default-group"), patch(
        _ENSURE_DATASET, new=AsyncMock(return_value="ds-default")
    ) as mock_ensure, patch(
        _GET_DOC_INFO, new=AsyncMock(return_value={"name": "f.pdf", "run": "DONE"})
    ):
        await strategy.query_doc_name(docId="doc-1", datasetId=None)
        mock_ensure.assert_awaited_once_with("default-group")


@pytest.mark.asyncio
async def test_query_doc_name_returns_none_when_default_unresolvable() -> None:
    """query_doc_name returns None when ensure_dataset cannot resolve."""
    strategy = RagflowRAGStrategy()
    with patch(_GET_DATASET_NAME, return_value="default-group"), patch(
        _ENSURE_DATASET, new=AsyncMock(return_value=None)
    ), patch(_GET_DOC_INFO, new=AsyncMock()) as mock_info:
        result = await strategy.query_doc_name(docId="doc-1", datasetId=None)
        assert result is None
        mock_info.assert_not_called()
