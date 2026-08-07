#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Regression tests for explicit dataset upload and legacy fallback."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from knowledge.infra.ragflow import ragflow_client


def _make_dataset_mock(ds_id: str) -> MagicMock:
    """Build a mock dataset object with recordable upload_documents."""
    ds = MagicMock()
    ds.id = ds_id
    ds.upload_documents = MagicMock(return_value=[{"id": f"doc-of-{ds_id}"}])
    return ds


@pytest.mark.asyncio
async def test_upload_honors_dataset_id_when_provided_and_resolvable() -> None:
    """When dataset_id resolves via SDK, upload to that dataset (not default group)."""
    target_ds = _make_dataset_mock("ds-A")
    mock_rag = MagicMock()
    mock_rag.list_datasets = MagicMock(return_value=[target_ds])

    with patch.object(
        ragflow_client, "get_rag_object", return_value=mock_rag
    ), patch.dict("os.environ", {"RAGFLOW_DEFAULT_GROUP": "wrong-group"}, clear=False):
        result = await ragflow_client.upload_document_to_dataset(
            dataset_id="ds-A",
            file_content=b"hello",
            filename="t.pdf",
        )

    mock_rag.list_datasets.assert_called_once_with(id="ds-A")
    target_ds.upload_documents.assert_called_once_with(
        [{"displayed_name": "t.pdf", "blob": b"hello"}]
    )
    assert result == [{"id": "doc-of-ds-A"}]


@pytest.mark.asyncio
async def test_upload_raises_when_dataset_id_provided_but_sdk_returns_empty() -> None:
    """Explicit dataset_id misses fail without falling back to the env group."""
    mock_rag = MagicMock()
    mock_rag.list_datasets = MagicMock(return_value=[])
    rest_mock = AsyncMock()

    with patch.object(
        ragflow_client, "get_rag_object", return_value=mock_rag
    ), patch.object(ragflow_client, "list_datasets", new=rest_mock), patch.dict(
        "os.environ", {"RAGFLOW_DEFAULT_GROUP": "default-group"}, clear=False
    ):
        with pytest.raises(
            ValueError,
            match=(
                r"not visible to RAGFlow SDK"
                r".*refusing to silently fall back"
                r".*cross-repo upload contamination"
            ),
        ):
            await ragflow_client.upload_document_to_dataset(
                dataset_id="ds-missing",
                file_content=b"hello",
                filename="t.pdf",
            )

    name_based_calls = [
        call
        for call in mock_rag.list_datasets.call_args_list
        if call.kwargs.get("name") is not None
    ]
    assert not name_based_calls, (
        f"Fail-closed violated: SDK name-based lookup attempted after id miss: "
        f"{name_based_calls}"
    )
    rest_mock.assert_not_called()


@pytest.mark.asyncio
async def test_upload_uses_env_default_group_when_dataset_id_empty() -> None:
    """dataset_id='' uses the legacy env-based path."""
    default_ds = _make_dataset_mock("ds-default")
    mock_rag = MagicMock()
    mock_rag.list_datasets = MagicMock(return_value=[default_ds])

    with patch.object(
        ragflow_client, "get_rag_object", return_value=mock_rag
    ), patch.dict(
        "os.environ", {"RAGFLOW_DEFAULT_GROUP": "default-group"}, clear=False
    ):
        result = await ragflow_client.upload_document_to_dataset(
            dataset_id="",
            file_content=b"hello",
            filename="t.pdf",
        )

    mock_rag.list_datasets.assert_called_once_with(name="default-group")
    default_ds.upload_documents.assert_called_once_with(
        [{"displayed_name": "t.pdf", "blob": b"hello"}]
    )
    assert result == [{"id": "doc-of-ds-default"}]


@pytest.mark.asyncio
async def test_upload_raises_when_dataset_id_empty_and_env_group_missing() -> None:
    """Configured env group absent from RAGFlow raises ValueError."""
    mock_rag = MagicMock()
    mock_rag.list_datasets = MagicMock(return_value=[])

    with patch.object(
        ragflow_client, "get_rag_object", return_value=mock_rag
    ), patch.dict(
        "os.environ", {"RAGFLOW_DEFAULT_GROUP": "missing-group"}, clear=False
    ), patch.object(
        ragflow_client,
        "list_datasets",
        new=AsyncMock(return_value={"data": []}),
    ):
        with pytest.raises(ValueError, match="does not exist"):
            await ragflow_client.upload_document_to_dataset(
                dataset_id="",
                file_content=b"hello",
                filename="t.pdf",
            )


@pytest.mark.asyncio
async def test_upload_payload_contains_displayed_name_and_blob() -> None:
    """Verify the exact payload shape passed to SDK upload_documents."""
    target_ds = _make_dataset_mock("ds-A")
    mock_rag = MagicMock()
    mock_rag.list_datasets = MagicMock(return_value=[target_ds])

    with patch.object(ragflow_client, "get_rag_object", return_value=mock_rag):
        await ragflow_client.upload_document_to_dataset(
            dataset_id="ds-A",
            file_content=b"content-bytes",
            filename="doc.txt",
        )

    target_ds.upload_documents.assert_called_once_with(
        [{"displayed_name": "doc.txt", "blob": b"content-bytes"}]
    )


@pytest.mark.parametrize("env_value", [None, ""])
@pytest.mark.asyncio
async def test_upload_raises_when_dataset_id_empty_and_default_group_unconfigured(
    monkeypatch: pytest.MonkeyPatch, env_value: str | None
) -> None:
    """Empty default group fails before SDK dataset lookup."""
    mock_rag = MagicMock()
    if env_value is None:
        monkeypatch.delenv("RAGFLOW_DEFAULT_GROUP", raising=False)
    else:
        monkeypatch.setenv("RAGFLOW_DEFAULT_GROUP", env_value)

    with patch.object(
        ragflow_client, "get_rag_object", return_value=mock_rag
    ) as get_rag_object_mock:
        with pytest.raises(ValueError, match="RAGFLOW_DEFAULT_GROUP is not set"):
            await ragflow_client.upload_document_to_dataset(
                dataset_id="",
                file_content=b"hello",
                filename="t.pdf",
            )

    get_rag_object_mock.assert_not_called()
    mock_rag.list_datasets.assert_not_called()
