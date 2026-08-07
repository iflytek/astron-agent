#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Unit tests for ``RagflowUtils`` helpers used by the RAGFlow strategy.

Covers:

- ``get_default_dataset_name``: unified ``RAGFLOW_DEFAULT_GROUP`` reader
  used as the fallback dataset for write/lookup paths when no explicit
  dataset id is supplied.
- ``ensure_dataset``: lazy create + best-effort description sync.
"""

from unittest.mock import AsyncMock, patch

import pytest

from knowledge.infra.ragflow.ragflow_utils import (
    DEFAULT_RAGFLOW_DATASET_NAME,
    RagflowUtils,
)


class TestGetDefaultDatasetName:
    """Tests for ``RagflowUtils.get_default_dataset_name``."""

    def test_returns_env_value_when_set(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("RAGFLOW_DEFAULT_GROUP", "MyCustomKB")
        assert RagflowUtils.get_default_dataset_name() == "MyCustomKB"

    def test_returns_default_when_env_unset(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.delenv("RAGFLOW_DEFAULT_GROUP", raising=False)
        assert RagflowUtils.get_default_dataset_name() == DEFAULT_RAGFLOW_DATASET_NAME

    def test_returns_default_when_env_empty(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setenv("RAGFLOW_DEFAULT_GROUP", "")
        assert RagflowUtils.get_default_dataset_name() == DEFAULT_RAGFLOW_DATASET_NAME


class TestBuildParserConfig:
    """Tests for the RAGFlow v0.20.5 naive parser payload."""

    def test_uses_official_chunk_token_field_and_normalizes_newline(self) -> None:
        config = RagflowUtils.build_parser_config(
            [1, 256], overlap=16, separator=["\\n", "。"], titleSplit=False
        )

        assert config["chunk_token_num"] == 256
        assert "chunk_token_count" not in config
        assert config["delimiter"] == "\n。"
        assert "layout_recognize" not in config

    def test_defaults_and_caps_chunk_token_num(self) -> None:
        default_config = RagflowUtils.build_parser_config(
            None, overlap=16, separator=None, titleSplit=True
        )
        capped_config = RagflowUtils.build_parser_config(
            [1, 4096], overlap=16, separator=["。"], titleSplit=False
        )

        assert default_config["chunk_token_num"] == 256
        assert default_config["delimiter"] == "\n"
        assert "layout_recognize" not in default_config
        assert capped_config["chunk_token_num"] == 2048

    def test_wraps_multi_character_delimiter_for_ragflow(self) -> None:
        config = RagflowUtils.build_parser_config(
            [1, 256], overlap=16, separator=["EOF", "。"], titleSplit=False
        )

        assert config["delimiter"] == "`EOF`。\n"

    @pytest.mark.parametrize("length_range", [[], [0, 256], [256, 1], [1, 2, 3]])
    def test_rejects_invalid_length_range(self, length_range: list[int]) -> None:
        with pytest.raises(ValueError):
            RagflowUtils.build_parser_config(
                length_range, overlap=16, separator=None, titleSplit=False
            )


@pytest.mark.asyncio
async def test_wait_for_parsing_delegates_to_canonical_client() -> None:
    """Legacy utility entry point must not maintain a second polling policy."""
    with patch(
        "knowledge.infra.ragflow.ragflow_utils.wait_for_document_parsing",
        new=AsyncMock(return_value="DONE"),
    ) as mock_wait:
        result = await RagflowUtils.wait_for_parsing("ds-1", "doc-1", max_wait_time=12)

    assert result == "DONE"
    mock_wait.assert_awaited_once_with(
        dataset_id="ds-1",
        doc_id="doc-1",
        max_wait_time=12,
    )


@pytest.mark.asyncio
async def test_get_document_chunks_retries_empty_complete_results() -> None:
    chunks = [{"id": "chunk-1", "content": "hello"}]
    with patch(
        "knowledge.infra.ragflow.ragflow_utils.get_document_info",
        new=AsyncMock(return_value={"id": "doc-1", "chunk_count": 1}),
    ), patch(
        "knowledge.infra.ragflow.ragflow_utils.fetch_all_document_chunks",
        new=AsyncMock(side_effect=[[], chunks]),
    ) as mock_fetch, patch(
        "knowledge.infra.ragflow.ragflow_utils.asyncio.sleep",
        new=AsyncMock(),
    ) as mock_sleep:
        result = await RagflowUtils.get_document_chunks(
            "ds-1", "doc-1", max_retries=1, retry_delay=0
        )

    assert result == chunks
    assert mock_fetch.await_count == 2
    mock_sleep.assert_awaited_once_with(0)


@pytest.mark.asyncio
async def test_get_document_chunks_zero_metadata_count_returns_without_retry() -> None:
    with patch(
        "knowledge.infra.ragflow.ragflow_utils.get_document_info",
        new=AsyncMock(return_value={"id": "doc-1", "chunk_count": 0}),
    ), patch(
        "knowledge.infra.ragflow.ragflow_utils.fetch_all_document_chunks",
        new=AsyncMock(return_value=[]),
    ) as mock_fetch, patch(
        "knowledge.infra.ragflow.ragflow_utils.asyncio.sleep",
        new=AsyncMock(),
    ) as mock_sleep:
        result = await RagflowUtils.get_document_chunks("ds-1", "doc-1")

    assert result == []
    mock_fetch.assert_awaited_once()
    mock_sleep.assert_not_awaited()


@pytest.mark.asyncio
async def test_get_document_chunks_propagates_fetch_failure() -> None:
    with patch(
        "knowledge.infra.ragflow.ragflow_utils.get_document_info",
        new=AsyncMock(return_value={"id": "doc-1", "chunk_count": 1}),
    ), patch(
        "knowledge.infra.ragflow.ragflow_utils.fetch_all_document_chunks",
        new=AsyncMock(side_effect=RuntimeError("incomplete page")),
    ):
        with pytest.raises(RuntimeError, match="incomplete page"):
            await RagflowUtils.get_document_chunks(
                "ds-1", "doc-1", max_retries=1, retry_delay=0
            )


@pytest.mark.asyncio
async def test_get_document_chunks_retries_non_empty_partial_snapshot() -> None:
    partial = [{"id": "chunk-1"}]
    complete = [
        {"id": "chunk-1"},
        {"id": "chunk-2"},
        {"id": "chunk-3"},
    ]
    with patch(
        "knowledge.infra.ragflow.ragflow_utils.get_document_info",
        new=AsyncMock(return_value={"id": "doc-1", "chunk_count": 3}),
    ), patch(
        "knowledge.infra.ragflow.ragflow_utils.fetch_all_document_chunks",
        new=AsyncMock(side_effect=[partial, complete]),
    ) as mock_fetch, patch(
        "knowledge.infra.ragflow.ragflow_utils.asyncio.sleep",
        new=AsyncMock(),
    ):
        result = await RagflowUtils.get_document_chunks(
            "ds-1", "doc-1", max_retries=1, retry_delay=0
        )

    assert result == complete
    assert mock_fetch.await_count == 2


@pytest.mark.asyncio
async def test_get_document_chunks_accepts_stable_deduplicated_snapshot() -> None:
    partial = [{"id": "chunk-1"}]
    with patch(
        "knowledge.infra.ragflow.ragflow_utils.get_document_info",
        new=AsyncMock(return_value={"id": "doc-1", "chunk_count": 3}),
    ), patch(
        "knowledge.infra.ragflow.ragflow_utils.fetch_all_document_chunks",
        new=AsyncMock(return_value=partial),
    ), patch(
        "knowledge.infra.ragflow.ragflow_utils.asyncio.sleep",
        new=AsyncMock(),
    ):
        result = await RagflowUtils.get_document_chunks(
            "ds-1", "doc-1", max_retries=2, retry_delay=0
        )

    assert result == partial


@pytest.mark.asyncio
async def test_get_document_chunks_without_expected_count_waits_for_stability() -> None:
    visible = [{"id": "chunk-1"}, {"id": "chunk-2"}]
    with patch(
        "knowledge.infra.ragflow.ragflow_utils.get_document_info",
        new=AsyncMock(return_value={"id": "doc-1"}),
    ), patch(
        "knowledge.infra.ragflow.ragflow_utils.fetch_all_document_chunks",
        new=AsyncMock(return_value=visible),
    ) as mock_fetch, patch(
        "knowledge.infra.ragflow.ragflow_utils.asyncio.sleep",
        new=AsyncMock(),
    ):
        result = await RagflowUtils.get_document_chunks(
            "ds-1", "doc-1", max_retries=2, retry_delay=0
        )

    assert result == visible
    assert mock_fetch.await_count == 3


@pytest.mark.asyncio
async def test_get_document_chunks_rejects_missing_expected_chunks() -> None:
    with patch(
        "knowledge.infra.ragflow.ragflow_utils.get_document_info",
        new=AsyncMock(return_value={"id": "doc-1", "chunk_count": 3}),
    ), patch(
        "knowledge.infra.ragflow.ragflow_utils.fetch_all_document_chunks",
        new=AsyncMock(return_value=[]),
    ), patch(
        "knowledge.infra.ragflow.ragflow_utils.asyncio.sleep",
        new=AsyncMock(),
    ):
        with pytest.raises(RuntimeError, match="visible=0, expected=3"):
            await RagflowUtils.get_document_chunks(
                "ds-1", "doc-1", max_retries=1, retry_delay=0
            )


# ---------------------------------------------------------------------------
# ensure_dataset description sync (lazy + best-effort)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_ensure_dataset_skips_update_when_description_matches() -> None:
    """No update_dataset call when existing description == desired."""
    list_resp = {
        "code": 0,
        "data": [{"name": "g", "id": "ds-1", "description": "客服库"}],
    }
    with patch(
        "knowledge.infra.ragflow.ragflow_utils.list_datasets",
        new=AsyncMock(return_value=list_resp),
    ), patch(
        "knowledge.infra.ragflow.ragflow_utils.update_dataset", new=AsyncMock()
    ) as mock_update:
        result = await RagflowUtils.ensure_dataset("g", description="客服库")
        assert result == "ds-1"
        mock_update.assert_not_called()


@pytest.mark.asyncio
async def test_ensure_dataset_updates_when_description_stale() -> None:
    """Best-effort update when existing description differs from desired."""
    list_resp = {
        "code": 0,
        "data": [{"name": "g", "id": "ds-1", "description": "Old name"}],
    }
    with patch(
        "knowledge.infra.ragflow.ragflow_utils.list_datasets",
        new=AsyncMock(return_value=list_resp),
    ), patch(
        "knowledge.infra.ragflow.ragflow_utils.update_dataset",
        new=AsyncMock(return_value={"code": 0}),
    ) as mock_update:
        result = await RagflowUtils.ensure_dataset("g", description="新名字")
        assert result == "ds-1"
        mock_update.assert_awaited_once_with("ds-1", description="新名字")


@pytest.mark.asyncio
async def test_ensure_dataset_skips_update_when_description_none() -> None:
    """No update when caller passes description=None (no label to sync)."""
    list_resp = {
        "code": 0,
        "data": [{"name": "g", "id": "ds-1", "description": "Old name"}],
    }
    with patch(
        "knowledge.infra.ragflow.ragflow_utils.list_datasets",
        new=AsyncMock(return_value=list_resp),
    ), patch(
        "knowledge.infra.ragflow.ragflow_utils.update_dataset", new=AsyncMock()
    ) as mock_update:
        await RagflowUtils.ensure_dataset("g", description=None)
        mock_update.assert_not_called()


@pytest.mark.asyncio
async def test_ensure_dataset_swallows_update_failures(
    caplog: pytest.LogCaptureFixture,
) -> None:
    """update_dataset failure logs warning + returns dataset_id (does not raise)."""
    import logging

    list_resp = {
        "code": 0,
        "data": [{"name": "g", "id": "ds-1", "description": "stale"}],
    }
    with patch(
        "knowledge.infra.ragflow.ragflow_utils.list_datasets",
        new=AsyncMock(return_value=list_resp),
    ), patch(
        "knowledge.infra.ragflow.ragflow_utils.update_dataset",
        new=AsyncMock(side_effect=RuntimeError("RAGFlow 5xx")),
    ):
        with caplog.at_level(logging.WARNING):
            result = await RagflowUtils.ensure_dataset("g", description="new")
        assert result == "ds-1"
        assert any(
            "Best-effort description sync failed" in r.message for r in caplog.records
        )


@pytest.mark.asyncio
async def test_ensure_dataset_warns_on_non_zero_update_code(
    caplog: pytest.LogCaptureFixture,
) -> None:
    """update_dataset HTTP 200 with non-zero RAGFlow code logs warning, no raise."""
    import logging

    list_resp = {
        "code": 0,
        "data": [{"name": "g", "id": "ds-1", "description": "stale"}],
    }
    update_resp = {"code": 102, "message": "permission denied"}
    with patch(
        "knowledge.infra.ragflow.ragflow_utils.list_datasets",
        new=AsyncMock(return_value=list_resp),
    ), patch(
        "knowledge.infra.ragflow.ragflow_utils.update_dataset",
        new=AsyncMock(return_value=update_resp),
    ):
        with caplog.at_level(logging.WARNING):
            result = await RagflowUtils.ensure_dataset("g", description="new")
        assert result == "ds-1"
        assert any(
            "rejected by RAGFlow" in r.message and "permission denied" in r.message
            for r in caplog.records
        )
