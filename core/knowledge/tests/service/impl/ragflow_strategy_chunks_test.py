#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tests for RagflowRAGStrategy chunks_save / chunks_update / chunks_delete
dataset routing behavior."""

import logging
from typing import Any, Mapping
from unittest.mock import AsyncMock, patch

import pytest

from knowledge.exceptions.exception import CustomException
from knowledge.service.impl.ragflow_strategy import RagflowRAGStrategy

_ENSURE_DATASET = "knowledge.service.impl.ragflow_strategy.RagflowUtils.ensure_dataset"
_GET_DATASET_NAME = (
    "knowledge.service.impl.ragflow_strategy.RagflowUtils.get_default_dataset_name"
)


def _await_kwargs(mock: AsyncMock) -> Mapping[str, Any]:
    await_args = mock.await_args
    assert await_args is not None
    return await_args.kwargs


def _await_args(mock: AsyncMock) -> tuple[Any, ...]:
    await_args = mock.await_args
    assert await_args is not None
    return await_args.args


# ----------------------------------------------------------------------
# chunks_save
# ----------------------------------------------------------------------


@pytest.mark.asyncio
async def test_chunks_save_passes_through_explicit_dataset_id() -> None:
    """chunks_save with non-empty datasetId skips ensure_dataset."""
    strategy = RagflowRAGStrategy()
    with patch(
        _ENSURE_DATASET,
        new=AsyncMock(),
    ) as mock_ensure, patch.object(
        strategy,
        "_validate_document_exists",
        new=AsyncMock(return_value=None),
    ), patch.object(
        strategy,
        "_get_existing_chunks",
        new=AsyncMock(return_value={}),
    ), patch.object(
        strategy,
        "_process_chunks_batch",
        new=AsyncMock(
            return_value=([{"id": "c1", "datasetId": "ds-explicit-123"}], [])
        ),
    ) as mock_batch, patch.object(
        strategy,
        "_handle_chunk_results",
        new=AsyncMock(return_value=[{"id": "c1"}]),
    ):
        await strategy.chunks_save(
            docId="doc-1",
            group=None,
            uid="user-1",
            chunks=[{"content": "hello"}],
            datasetId="ds-explicit-123",
        )
        mock_ensure.assert_not_called()
        assert _await_args(mock_batch)[1] == "ds-explicit-123"


@pytest.mark.asyncio
async def test_chunks_save_with_null_dataset_id_falls_back_to_default() -> None:
    """chunks_save with datasetId=None ensures the default dataset exists."""
    strategy = RagflowRAGStrategy()
    with patch(
        _GET_DATASET_NAME,
        return_value="default-group",
    ), patch(
        _ENSURE_DATASET,
        new=AsyncMock(return_value="ds-default"),
    ) as mock_ensure, patch.object(
        strategy,
        "_validate_document_exists",
        new=AsyncMock(return_value=None),
    ), patch.object(
        strategy,
        "_get_existing_chunks",
        new=AsyncMock(return_value={}),
    ), patch.object(
        strategy,
        "_process_chunks_batch",
        new=AsyncMock(return_value=([{"id": "c1"}], [])),
    ), patch.object(
        strategy,
        "_handle_chunk_results",
        new=AsyncMock(return_value=[{"id": "c1"}]),
    ):
        await strategy.chunks_save(
            docId="doc-1",
            group=None,
            uid="user-1",
            chunks=[{"content": "hello"}],
            datasetId=None,
        )
        mock_ensure.assert_awaited_once_with("default-group")


@pytest.mark.asyncio
async def test_chunks_save_raises_when_default_group_unresolvable() -> None:
    """ensure_dataset returning falsy raises ChunkSaveFailed."""
    strategy = RagflowRAGStrategy()
    with patch(
        _GET_DATASET_NAME,
        return_value="default-group",
    ), patch(
        _ENSURE_DATASET,
        new=AsyncMock(return_value=None),
    ):
        with pytest.raises(CustomException) as exc_info:
            await strategy.chunks_save(
                docId="doc-1",
                group=None,
                uid="user-1",
                chunks=[{"content": "hello"}],
                datasetId=None,
            )
        assert "Unable to resolve" in str(exc_info.value)


# ----------------------------------------------------------------------
# chunks_update
# ----------------------------------------------------------------------


@pytest.mark.asyncio
async def test_chunks_update_passes_through_explicit_dataset_id() -> None:
    """chunks_update with non-empty datasetId skips ensure_dataset."""
    strategy = RagflowRAGStrategy()
    with patch(
        _ENSURE_DATASET,
        new=AsyncMock(),
    ) as mock_ensure, patch(
        "knowledge.service.impl.ragflow_strategy.ragflow_client.update_chunk",
        new=AsyncMock(return_value={"code": 0}),
    ) as mock_update_chunk:
        await strategy.chunks_update(
            docId="doc-1",
            group=None,
            uid="user-1",
            chunks=[{"chunkId": "c1", "content": "new"}],
            datasetId="ds-explicit-123",
        )
        mock_ensure.assert_not_called()
        assert _await_kwargs(mock_update_chunk)["dataset_id"] == "ds-explicit-123"


@pytest.mark.asyncio
async def test_chunks_update_with_null_dataset_id_falls_back_to_default() -> None:
    """chunks_update with datasetId=None ensures the default dataset exists."""
    strategy = RagflowRAGStrategy()
    with patch(
        _GET_DATASET_NAME,
        return_value="default-group",
    ), patch(
        _ENSURE_DATASET,
        new=AsyncMock(return_value="ds-default"),
    ) as mock_ensure, patch(
        "knowledge.service.impl.ragflow_strategy.ragflow_client.update_chunk",
        new=AsyncMock(return_value={"code": 0}),
    ):
        await strategy.chunks_update(
            docId="doc-1",
            group=None,
            uid="user-1",
            chunks=[{"chunkId": "c1", "content": "new"}],
            datasetId=None,
        )
        mock_ensure.assert_awaited_once_with("default-group")


@pytest.mark.asyncio
async def test_chunks_update_raises_when_default_group_unresolvable() -> None:
    """ensure_dataset returning falsy raises ChunkUpdateFailed."""
    strategy = RagflowRAGStrategy()
    with patch(
        _GET_DATASET_NAME,
        return_value="default-group",
    ), patch(
        _ENSURE_DATASET,
        new=AsyncMock(return_value=None),
    ):
        with pytest.raises(CustomException) as exc_info:
            await strategy.chunks_update(
                docId="doc-1",
                group=None,
                uid="user-1",
                chunks=[{"chunkId": "c1", "content": "x"}],
                datasetId=None,
            )
        msg = str(exc_info.value).lower()
        assert "unable to resolve" in msg
        assert "update" in msg


# ----------------------------------------------------------------------
# chunks_delete
# ----------------------------------------------------------------------


@pytest.mark.asyncio
async def test_chunks_delete_passes_through_explicit_dataset_id() -> None:
    """chunks_delete with non-empty datasetId skips ensure_dataset."""
    strategy = RagflowRAGStrategy()
    with patch(
        _ENSURE_DATASET,
        new=AsyncMock(),
    ) as mock_ensure, patch(
        "knowledge.service.impl.ragflow_strategy.ragflow_client.delete_chunks",
        new=AsyncMock(return_value={"code": 0}),
    ) as mock_delete:
        await strategy.chunks_delete(
            docId="doc-1",
            chunkIds=["c1", "c2"],
            datasetId="ds-explicit-123",
        )
        mock_ensure.assert_not_called()
        assert _await_kwargs(mock_delete)["dataset_id"] == "ds-explicit-123"


@pytest.mark.asyncio
async def test_chunks_delete_with_null_dataset_id_falls_back_to_default() -> None:
    """chunks_delete with datasetId=None ensures the default dataset exists."""
    strategy = RagflowRAGStrategy()
    with patch(
        _GET_DATASET_NAME,
        return_value="default-group",
    ), patch(
        _ENSURE_DATASET,
        new=AsyncMock(return_value="ds-default"),
    ) as mock_ensure, patch(
        "knowledge.service.impl.ragflow_strategy.ragflow_client.delete_chunks",
        new=AsyncMock(return_value={"code": 0}),
    ):
        await strategy.chunks_delete(
            docId="doc-1",
            chunkIds=["c1"],
            datasetId=None,
        )
        mock_ensure.assert_awaited_once_with("default-group")


@pytest.mark.asyncio
async def test_chunks_delete_silent_skip_when_dataset_unresolvable(
    caplog: pytest.LogCaptureFixture,
) -> None:
    """chunks_delete is a no-op when ensure_dataset cannot resolve the default."""
    strategy = RagflowRAGStrategy()
    with patch(
        _GET_DATASET_NAME,
        return_value="default-group",
    ), patch(
        _ENSURE_DATASET,
        new=AsyncMock(return_value=None),
    ), patch(
        "knowledge.service.impl.ragflow_strategy.ragflow_client.delete_chunks",
        new=AsyncMock(),
    ) as mock_delete:
        with caplog.at_level(
            logging.INFO,
            logger="knowledge.service.impl.ragflow_strategy",
        ):
            await strategy.chunks_delete(
                docId="doc-1",
                chunkIds=["c1"],
                datasetId=None,
            )
        mock_delete.assert_not_called()
        assert any(
            "no-op" in r.message.lower() for r in caplog.records
        ), f"Expected 'no-op' in logs, got: {[r.message for r in caplog.records]}"
