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
