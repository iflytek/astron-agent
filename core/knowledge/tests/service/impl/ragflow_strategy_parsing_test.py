#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Regression tests for RAGFlow strategy parsing orchestration."""

from unittest.mock import AsyncMock, patch

import pytest

from knowledge.consts.error_code import CodeEnum
from knowledge.exceptions.exception import CustomException, ThirdPartyException
from knowledge.service.impl.ragflow_strategy import RagflowRAGStrategy

_PARSER_CONFIG = {
    "chunk_token_num": 256,
    "delimiter": "\n",
}


@pytest.mark.asyncio
async def test_handle_document_parsing_waits_with_canonical_client() -> None:
    strategy = RagflowRAGStrategy()
    calls: list[str] = []

    async def update_document(*args: object, **kwargs: object) -> dict[str, int]:
        calls.append("update")
        return {"code": 0}

    async def parse_documents(*args: object, **kwargs: object) -> dict[str, int]:
        calls.append("parse")
        return {"code": 0}

    with patch(
        "knowledge.service.impl.ragflow_strategy.ragflow_client.update_document",
        new=AsyncMock(side_effect=update_document),
    ) as mock_update, patch(
        "knowledge.service.impl.ragflow_strategy.ragflow_client.parse_documents",
        new=AsyncMock(side_effect=parse_documents),
    ) as mock_parse, patch(
        "knowledge.service.impl.ragflow_strategy.ragflow_client.wait_for_parsing",
        new=AsyncMock(return_value="DONE"),
    ) as mock_wait:
        await strategy._handle_document_parsing("ds-1", "doc-1", _PARSER_CONFIG)

    mock_update.assert_awaited_once_with(
        "ds-1",
        "doc-1",
        parser_config=_PARSER_CONFIG,
    )
    mock_parse.assert_awaited_once_with("ds-1", ["doc-1"])
    mock_wait.assert_awaited_once_with("ds-1", "doc-1", max_wait_time=300)
    assert calls == ["update", "parse"]


@pytest.mark.asyncio
async def test_handle_document_parsing_stops_when_configuration_fails() -> None:
    strategy = RagflowRAGStrategy()
    with patch(
        "knowledge.service.impl.ragflow_strategy.ragflow_client.update_document",
        new=AsyncMock(return_value={"code": 102, "message": "invalid parser config"}),
    ), patch(
        "knowledge.service.impl.ragflow_strategy.ragflow_client.parse_documents",
        new=AsyncMock(),
    ) as mock_parse, patch(
        "knowledge.service.impl.ragflow_strategy.ragflow_client.wait_for_parsing",
        new=AsyncMock(),
    ) as mock_wait:
        with pytest.raises(ThirdPartyException, match="invalid parser config"):
            await strategy._handle_document_parsing("ds-1", "doc-1", _PARSER_CONFIG)

    mock_parse.assert_not_awaited()
    mock_wait.assert_not_awaited()


@pytest.mark.asyncio
async def test_handle_document_parsing_surfaces_trigger_failure() -> None:
    strategy = RagflowRAGStrategy()
    with patch(
        "knowledge.service.impl.ragflow_strategy.ragflow_client.update_document",
        new=AsyncMock(return_value={"code": 0}),
    ), patch(
        "knowledge.service.impl.ragflow_strategy.ragflow_client.parse_documents",
        new=AsyncMock(return_value={"code": 103, "message": "queue unavailable"}),
    ), patch(
        "knowledge.service.impl.ragflow_strategy.ragflow_client.wait_for_parsing",
        new=AsyncMock(),
    ) as mock_wait:
        with pytest.raises(ThirdPartyException) as exc_info:
            await strategy._handle_document_parsing("ds-1", "doc-1", _PARSER_CONFIG)

    assert "queue unavailable" in str(exc_info.value)
    mock_wait.assert_not_awaited()


@pytest.mark.asyncio
async def test_handle_document_parsing_propagates_wait_failure() -> None:
    strategy = RagflowRAGStrategy()
    wait_error = ThirdPartyException(
        msg="RAGFlow document parsing timed out",
        e=CodeEnum.RAGFLOW_RAGError,
    )
    with patch(
        "knowledge.service.impl.ragflow_strategy.ragflow_client.update_document",
        new=AsyncMock(return_value={"code": 0}),
    ), patch(
        "knowledge.service.impl.ragflow_strategy.ragflow_client.parse_documents",
        new=AsyncMock(return_value={"code": 0}),
    ), patch(
        "knowledge.service.impl.ragflow_strategy.ragflow_client.wait_for_parsing",
        new=AsyncMock(side_effect=wait_error),
    ):
        with pytest.raises(ThirdPartyException, match="timed out"):
            await strategy._handle_document_parsing("ds-1", "doc-1", _PARSER_CONFIG)


class _Upload:
    filename = "large.docx"


@pytest.mark.asyncio
async def test_first_upload_zero_chunks_returns_explicit_failure() -> None:
    strategy = RagflowRAGStrategy()
    with patch.object(
        strategy, "_resolve_dataset_id", new=AsyncMock(return_value="ds-1")
    ), patch.object(
        strategy,
        "_process_document_upload",
        new=AsyncMock(return_value="doc-1"),
    ), patch.object(
        strategy, "_handle_document_parsing", new=AsyncMock(return_value=None)
    ), patch(
        "knowledge.service.impl.ragflow_strategy.RagflowUtils.get_document_chunks",
        new=AsyncMock(return_value=[]),
    ), patch.object(
        strategy, "_safe_delete_document", new=AsyncMock(return_value=None)
    ):
        with pytest.raises(CustomException) as exc_info:
            await strategy.split(file=_Upload(), datasetId="ds-1")

    assert exc_info.value.code == CodeEnum.ChunkQueryFailed.code
    assert "zero chunks" in str(exc_info.value)


@pytest.mark.asyncio
async def test_first_upload_accepts_large_single_chunk_without_delimiters() -> None:
    strategy = RagflowRAGStrategy()
    oversized = [{"id": "chunk-1", "content": "中" * 33_000}]
    with patch.object(
        strategy, "_resolve_dataset_id", new=AsyncMock(return_value="ds-1")
    ), patch.object(
        strategy,
        "_process_document_upload",
        new=AsyncMock(return_value="doc-1"),
    ), patch.object(
        strategy, "_handle_document_parsing", new=AsyncMock(return_value=None)
    ), patch(
        "knowledge.service.impl.ragflow_strategy.RagflowUtils.get_document_chunks",
        new=AsyncMock(return_value=oversized),
    ), patch.object(
        strategy, "_safe_delete_document", new=AsyncMock(return_value=None)
    ) as mock_delete:
        result = await strategy.split(
            file=_Upload(), datasetId="ds-1", lengthRange=[256, 1024]
        )

    assert len(result) == 1
    assert result[0]["content"] == oversized[0]["content"]
    mock_delete.assert_not_awaited()
