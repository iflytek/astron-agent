#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Regression tests for RAGFlow strategy parsing orchestration."""

from unittest.mock import AsyncMock, patch

import pytest

from knowledge.consts.error_code import CodeEnum
from knowledge.exceptions.exception import CustomException, ThirdPartyException
from knowledge.service.impl.ragflow_strategy import RagflowRAGStrategy


@pytest.mark.asyncio
async def test_handle_document_parsing_waits_with_canonical_client() -> None:
    strategy = RagflowRAGStrategy()
    with patch(
        "knowledge.service.impl.ragflow_strategy.ragflow_client.parse_documents",
        new=AsyncMock(return_value={"code": 0}),
    ) as mock_parse, patch(
        "knowledge.service.impl.ragflow_strategy.ragflow_client.wait_for_parsing",
        new=AsyncMock(return_value="DONE"),
    ) as mock_wait:
        await strategy._handle_document_parsing("ds-1", "doc-1")

    mock_parse.assert_awaited_once_with("ds-1", ["doc-1"])
    mock_wait.assert_awaited_once_with("ds-1", "doc-1", max_wait_time=300)


@pytest.mark.asyncio
async def test_handle_document_parsing_surfaces_trigger_failure() -> None:
    strategy = RagflowRAGStrategy()
    with patch(
        "knowledge.service.impl.ragflow_strategy.ragflow_client.parse_documents",
        new=AsyncMock(return_value={"code": 103, "message": "queue unavailable"}),
    ), patch(
        "knowledge.service.impl.ragflow_strategy.ragflow_client.wait_for_parsing",
        new=AsyncMock(),
    ) as mock_wait:
        with pytest.raises(ThirdPartyException) as exc_info:
            await strategy._handle_document_parsing("ds-1", "doc-1")

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
        "knowledge.service.impl.ragflow_strategy.ragflow_client.parse_documents",
        new=AsyncMock(return_value={"code": 0}),
    ), patch(
        "knowledge.service.impl.ragflow_strategy.ragflow_client.wait_for_parsing",
        new=AsyncMock(side_effect=wait_error),
    ):
        with pytest.raises(ThirdPartyException, match="timed out"):
            await strategy._handle_document_parsing("ds-1", "doc-1")


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
    ):
        with pytest.raises(CustomException) as exc_info:
            await strategy.split(file=_Upload(), datasetId="ds-1")

    assert exc_info.value.code == CodeEnum.ChunkQueryFailed.code
    assert "zero chunks" in str(exc_info.value)
