#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tests for RagflowRAGStrategy.query with the ragflow_ext extension.

Covers:
- Baseline payload is unchanged when ragflow_ext is not provided.
- ragflow_ext.top_k overrides topN as the retrieval and result limit.
- Optional fields (keyword / rerank_id / use_kg / highlight) are only added
  when set on ragflow_ext.
- Highlight is sent as a string to work around a RAGFlow v0.20.5 quirk.
"""

from typing import Any, Mapping
from unittest.mock import AsyncMock, patch

import pytest

from knowledge.domain.entity.chunk_dto import RagflowQueryExt
from knowledge.service.impl.ragflow_strategy import RagflowRAGStrategy

_GET_DATASET_NAME = (
    "knowledge.service.impl.ragflow_strategy.RagflowUtils.get_default_dataset_name"
)
_ENSURE_DATASET = "knowledge.service.impl.ragflow_strategy.RagflowUtils.ensure_dataset"
_RETRIEVAL = (
    "knowledge.service.impl.ragflow_strategy.ragflow_client.retrieval_with_dataset"
)
_CONVERT = "knowledge.service.impl.ragflow_strategy.RagflowUtils.convert_ragflow_query_response"


def _await_kwargs(mock: AsyncMock) -> Mapping[str, Any]:
    await_args = mock.await_args
    assert await_args is not None
    return await_args.kwargs


class TestRagflowQueryPayloadBaseline:
    """Without ragflow_ext, the RAGFlow payload is unchanged."""

    @pytest.mark.asyncio
    async def test_payload_without_ragflow_ext_matches_baseline(self) -> None:
        strategy = RagflowRAGStrategy()
        mock_retrieval = AsyncMock(
            return_value={"code": 0, "data": {"chunks": [], "total": 0}}
        )
        with (
            patch(_GET_DATASET_NAME, return_value="ds-name"),
            patch(_ENSURE_DATASET, new=AsyncMock(return_value="ds-1")),
            patch(_RETRIEVAL, new=mock_retrieval),
            patch(_CONVERT, return_value=[]),
        ):
            await strategy.query("hello", top_k=3, threshold=0.5)

        assert mock_retrieval.await_count == 1
        payload = _await_kwargs(mock_retrieval)["request_data"]
        assert payload == {
            "question": "hello",
            "dataset_ids": ["ds-1"],
            "top_k": 3,
            "similarity_threshold": 0.5,
            "vector_similarity_weight": 0.2,
        }

    @pytest.mark.asyncio
    async def test_payload_with_doc_ids_includes_document_ids(self) -> None:
        strategy = RagflowRAGStrategy()
        mock_retrieval = AsyncMock(
            return_value={"code": 0, "data": {"chunks": [], "total": 0}}
        )
        with (
            patch(_GET_DATASET_NAME, return_value="ds-name"),
            patch(_ENSURE_DATASET, new=AsyncMock(return_value="ds-1")),
            patch(_RETRIEVAL, new=mock_retrieval),
            patch(_CONVERT, return_value=[]),
        ):
            await strategy.query("hello", doc_ids=["d1", "d2"], top_k=3, threshold=0.5)

        payload = _await_kwargs(mock_retrieval)["request_data"]
        assert payload["document_ids"] == ["d1", "d2"]


class TestRagflowQueryTopKSemantics:
    """ragflow_ext.top_k overrides topN as retrieval and result limit."""

    @pytest.mark.asyncio
    async def test_ext_top_k_used_in_payload_when_set(self) -> None:
        strategy = RagflowRAGStrategy()
        mock_retrieval = AsyncMock(
            return_value={"code": 0, "data": {"chunks": [], "total": 0}}
        )
        with (
            patch(_GET_DATASET_NAME, return_value="ds-name"),
            patch(_ENSURE_DATASET, new=AsyncMock(return_value="ds-1")),
            patch(_RETRIEVAL, new=mock_retrieval),
            patch(_CONVERT, return_value=[]),
        ):
            await strategy.query(
                "q",
                top_k=3,
                ragflow_ext=RagflowQueryExt(top_k=50),
            )
        payload = _await_kwargs(mock_retrieval)["request_data"]
        assert payload["top_k"] == 50

    @pytest.mark.asyncio
    async def test_topN_used_when_ext_top_k_unset(self) -> None:
        strategy = RagflowRAGStrategy()
        mock_retrieval = AsyncMock(
            return_value={"code": 0, "data": {"chunks": [], "total": 0}}
        )
        with (
            patch(_GET_DATASET_NAME, return_value="ds-name"),
            patch(_ENSURE_DATASET, new=AsyncMock(return_value="ds-1")),
            patch(_RETRIEVAL, new=mock_retrieval),
            patch(_CONVERT, return_value=[]),
        ):
            await strategy.query(
                "q",
                top_k=3,
                ragflow_ext=RagflowQueryExt(),
            )
        payload = _await_kwargs(mock_retrieval)["request_data"]
        assert payload["top_k"] == 3

    @pytest.mark.asyncio
    async def test_ext_top_k_overrides_returned_result_count(self) -> None:
        """With ext.top_k=10 and topN=3, the API returns 10 results."""
        strategy = RagflowRAGStrategy()
        ten_chunks = [
            {"id": f"c{i}", "content": f"chunk-{i}", "score": 0.9} for i in range(10)
        ]
        with (
            patch(_GET_DATASET_NAME, return_value="ds-name"),
            patch(_ENSURE_DATASET, new=AsyncMock(return_value="ds-1")),
            patch(
                _RETRIEVAL,
                new=AsyncMock(
                    return_value={"code": 0, "data": {"chunks": [], "total": 0}}
                ),
            ),
            patch(_CONVERT, return_value=ten_chunks),
        ):
            result = await strategy.query(
                "q",
                top_k=3,
                ragflow_ext=RagflowQueryExt(top_k=10),
            )
        assert result["count"] == 10
        assert len(result["results"]) == 10

    @pytest.mark.asyncio
    async def test_slicing_uses_topN_when_no_ragflow_ext(self) -> None:
        """Without ragflow_ext, results are still sliced to topN."""
        strategy = RagflowRAGStrategy()
        ten_chunks = [
            {"id": f"c{i}", "content": f"chunk-{i}", "score": 0.9} for i in range(10)
        ]
        with (
            patch(_GET_DATASET_NAME, return_value="ds-name"),
            patch(_ENSURE_DATASET, new=AsyncMock(return_value="ds-1")),
            patch(
                _RETRIEVAL,
                new=AsyncMock(
                    return_value={"code": 0, "data": {"chunks": [], "total": 0}}
                ),
            ),
            patch(_CONVERT, return_value=ten_chunks),
        ):
            result = await strategy.query("q", top_k=3)
        assert result["count"] == 3
        assert len(result["results"]) == 3


class TestRagflowQueryPayloadWithExt:
    """Optional ragflow_ext fields forwarded to the RAGFlow payload."""

    async def _run_query_with_ext(self, ext: RagflowQueryExt) -> dict:
        strategy = RagflowRAGStrategy()
        mock_retrieval = AsyncMock(
            return_value={"code": 0, "data": {"chunks": [], "total": 0}}
        )
        with (
            patch(_GET_DATASET_NAME, return_value="ds-name"),
            patch(_ENSURE_DATASET, new=AsyncMock(return_value="ds-1")),
            patch(_RETRIEVAL, new=mock_retrieval),
            patch(_CONVERT, return_value=[]),
        ):
            await strategy.query("q", top_k=3, ragflow_ext=ext)
        return _await_kwargs(mock_retrieval)["request_data"]

    @pytest.mark.asyncio
    async def test_vsw_override(self) -> None:
        payload = await self._run_query_with_ext(
            RagflowQueryExt(vector_similarity_weight=0.5)
        )
        assert payload["vector_similarity_weight"] == 0.5

    @pytest.mark.asyncio
    async def test_vsw_default_preserved_when_unset(self) -> None:
        payload = await self._run_query_with_ext(RagflowQueryExt(top_k=10))
        assert payload["vector_similarity_weight"] == 0.2

    @pytest.mark.asyncio
    async def test_keyword_passthrough(self) -> None:
        payload = await self._run_query_with_ext(RagflowQueryExt(keyword=True))
        assert payload["keyword"] is True

    @pytest.mark.asyncio
    async def test_rerank_id_passthrough(self) -> None:
        payload = await self._run_query_with_ext(
            RagflowQueryExt(rerank_id="bge-reranker-v2-m3")
        )
        assert payload["rerank_id"] == "bge-reranker-v2-m3"

    @pytest.mark.asyncio
    async def test_use_kg_passthrough(self) -> None:
        payload = await self._run_query_with_ext(RagflowQueryExt(use_kg=True))
        assert payload["use_kg"] is True

    @pytest.mark.asyncio
    async def test_highlight_true_sent_as_string(self) -> None:
        payload = await self._run_query_with_ext(RagflowQueryExt(highlight=True))
        assert payload["highlight"] == "True"
        assert isinstance(payload["highlight"], str)

    @pytest.mark.asyncio
    async def test_highlight_false_sent_as_string(self) -> None:
        payload = await self._run_query_with_ext(RagflowQueryExt(highlight=False))
        assert payload["highlight"] == "False"
        assert isinstance(payload["highlight"], str)

    @pytest.mark.asyncio
    async def test_unset_optional_fields_absent_from_payload(self) -> None:
        payload = await self._run_query_with_ext(RagflowQueryExt(top_k=10))
        assert "keyword" not in payload
        assert "rerank_id" not in payload
        assert "use_kg" not in payload
        assert "highlight" not in payload
