#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tests for RagflowRAGStrategy blue-green upsert path.

Covers:
- `_safe_delete_document()` — thin wrapper around `ragflow_client.delete_documents`
- `_upsert_document()` — blue-green upsert orchestration (later task)
- `RagflowRAGStrategy.split()` — document_id branching (later task)
- Cross-strategy `**kwargs` compatibility (later task)
"""

import inspect
from typing import Any, Literal
from unittest.mock import AsyncMock, patch

import pytest

from knowledge.consts.error_code import CodeEnum
from knowledge.exceptions.exception import CustomException
from knowledge.service.impl.ragflow_strategy import RagflowRAGStrategy

# ----------------------------------------------------------------------
# Section A: _safe_delete_document
# ----------------------------------------------------------------------


@pytest.mark.asyncio
async def test_safe_delete_document_log_only_true_swallows_non_zero_code() -> None:
    """log_only=True + RAGFlow returns non-zero code => NO exception."""
    strategy = RagflowRAGStrategy()
    with patch(
        "knowledge.service.impl.ragflow_strategy.ragflow_client.delete_documents",
        new=AsyncMock(return_value={"code": 102, "message": "document not found"}),
    ) as mock_delete:
        await strategy._safe_delete_document(
            dataset_id="ds-1", doc_id="doc-x", log_only=True
        )
        mock_delete.assert_awaited_once_with("ds-1", ["doc-x"])


@pytest.mark.asyncio
async def test_safe_delete_document_log_only_false_raises_on_non_zero_code() -> None:
    """log_only=False + RAGFlow returns non-zero code => CustomException."""
    strategy = RagflowRAGStrategy()
    with patch(
        "knowledge.service.impl.ragflow_strategy.ragflow_client.delete_documents",
        new=AsyncMock(return_value={"code": 500, "message": "internal error"}),
    ):
        with pytest.raises(CustomException) as exc_info:
            await strategy._safe_delete_document(
                dataset_id="ds-1", doc_id="doc-x", log_only=False
            )
    assert exc_info.value.code == CodeEnum.ChunkDeleteFailed.code


@pytest.mark.asyncio
async def test_safe_delete_document_success_returns_silently() -> None:
    """RAGFlow returns code == 0 => success, no exception for either mode."""
    strategy = RagflowRAGStrategy()
    with patch(
        "knowledge.service.impl.ragflow_strategy.ragflow_client.delete_documents",
        new=AsyncMock(return_value={"code": 0}),
    ):
        await strategy._safe_delete_document(
            dataset_id="ds-1", doc_id="doc-x", log_only=False
        )
        await strategy._safe_delete_document(
            dataset_id="ds-1", doc_id="doc-y", log_only=True
        )


# ----------------------------------------------------------------------
# Section B: _upsert_document (blue-green orchestrator)
# ----------------------------------------------------------------------


@pytest.mark.asyncio
async def test_upsert_document_happy_path_deletes_old_returns_new(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Upload OK + parse OK + fetch chunks OK + delete old OK =>
    returns (pending_doc_id, chunks_data) tuple."""
    strategy = RagflowRAGStrategy()
    file_input = object()  # placeholder; strategies accept anything here
    new_doc_id = "new-doc-abc"
    fake_chunks = [{"id": "c1", "content": "hello world"}]

    async def fake_get_chunks(
        dataset_id: str, doc_id: str, **kwargs: Any
    ) -> list[dict[str, str]]:
        return fake_chunks

    monkeypatch.setattr(
        "knowledge.service.impl.ragflow_strategy.RagflowUtils.get_document_chunks",
        fake_get_chunks,
    )

    with (
        patch.object(
            strategy,
            "_process_document_upload",
            new=AsyncMock(return_value=new_doc_id),
        ) as mock_upload,
        patch.object(
            strategy,
            "_handle_document_parsing",
            new=AsyncMock(return_value=None),
        ) as mock_parse,
        patch.object(
            strategy,
            "_safe_delete_document",
            new=AsyncMock(return_value=None),
        ) as mock_delete,
    ):
        result = await strategy._upsert_document(
            file_input=file_input,
            dataset_id="ds-1",
            old_doc_id="old-doc-xyz",
        )

    # Return is now a tuple of (doc_id, chunks_data) since the fetch+validate
    # is absorbed into the atomic transaction.
    assert result == (new_doc_id, fake_chunks)
    mock_upload.assert_awaited_once_with(file_input, "ds-1")
    mock_parse.assert_awaited_once_with("ds-1", new_doc_id)
    # Only the OLD doc is deleted on success; pending is kept (it's now live)
    mock_delete.assert_awaited_once_with("ds-1", "old-doc-xyz")


@pytest.mark.asyncio
async def test_upsert_document_upload_fails_no_delete_called() -> None:
    """Upload raises => exception propagates, _safe_delete_document NOT called."""
    strategy = RagflowRAGStrategy()
    upload_error = ValueError("S3 unreachable")

    with (
        patch.object(
            strategy,
            "_process_document_upload",
            new=AsyncMock(side_effect=upload_error),
        ),
        patch.object(
            strategy,
            "_handle_document_parsing",
            new=AsyncMock(return_value=None),
        ) as mock_parse,
        patch.object(
            strategy,
            "_safe_delete_document",
            new=AsyncMock(return_value=None),
        ) as mock_delete,
    ):
        with pytest.raises(ValueError, match="S3 unreachable"):
            await strategy._upsert_document(
                file_input=object(),
                dataset_id="ds-1",
                old_doc_id="old-doc-xyz",
            )

    mock_parse.assert_not_awaited()
    mock_delete.assert_not_awaited()


@pytest.mark.asyncio
async def test_upsert_document_parse_fails_deletes_pending_not_old() -> None:
    """Upload OK + parse fails => delete PENDING doc, propagate parse error,
    OLD doc stays alive (DB.lastUuid unchanged)."""
    strategy = RagflowRAGStrategy()
    pending_doc_id = "pending-doc-new"
    parse_error = ValueError("parse timeout")

    delete_calls: list[tuple[str, str, bool]] = []

    async def mock_safe_delete(
        dataset_id: str, doc_id: str, log_only: bool = False
    ) -> None:
        delete_calls.append((dataset_id, doc_id, log_only))

    with (
        patch.object(
            strategy,
            "_process_document_upload",
            new=AsyncMock(return_value=pending_doc_id),
        ),
        patch.object(
            strategy,
            "_handle_document_parsing",
            new=AsyncMock(side_effect=parse_error),
        ),
        patch.object(
            strategy,
            "_safe_delete_document",
            new=AsyncMock(side_effect=mock_safe_delete),
        ),
    ):
        with pytest.raises(ValueError, match="parse timeout"):
            await strategy._upsert_document(
                file_input=object(),
                dataset_id="ds-1",
                old_doc_id="old-doc-xyz",
            )

    # Exactly one delete call, targeting the PENDING doc (rollback), not the old one
    assert delete_calls == [("ds-1", pending_doc_id, True)]


@pytest.mark.asyncio
async def test_upsert_document_delete_old_failure_raises_and_preserves_db_state(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Commit-phase old-doc delete failure must fail the upsert.

    Returning success here would advance Java's lastUuid to the new doc while
    leaking the old doc as an orphan, which reintroduces the original bug under
    delete-failure conditions.
    """
    strategy = RagflowRAGStrategy()
    new_doc_id = "new-doc-ok"
    fake_chunks = [{"id": "c1", "content": "chunk content"}]

    async def fake_get_chunks(
        dataset_id: str, doc_id: str, **kwargs: Any
    ) -> list[dict[str, str]]:
        return fake_chunks

    monkeypatch.setattr(
        "knowledge.service.impl.ragflow_strategy.RagflowUtils.get_document_chunks",
        fake_get_chunks,
    )

    with (
        patch.object(
            strategy,
            "_process_document_upload",
            new=AsyncMock(return_value=new_doc_id),
        ),
        patch.object(
            strategy,
            "_handle_document_parsing",
            new=AsyncMock(return_value=None),
        ),
        patch.object(
            strategy,
            "_safe_delete_document",
            new=AsyncMock(
                side_effect=CustomException(
                    CodeEnum.ChunkDeleteFailed, "delete old failed"
                )
            ),
        ) as mock_delete,
    ):
        with pytest.raises(CustomException) as exc_info:
            await strategy._upsert_document(
                file_input=object(),
                dataset_id="ds-1",
                old_doc_id="old-doc-xyz",
            )

    assert exc_info.value.code == CodeEnum.ChunkDeleteFailed.code
    mock_delete.assert_awaited_once_with("ds-1", "old-doc-xyz")


@pytest.mark.asyncio
async def test_upsert_document_get_chunks_raises_rolls_back_pending(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Fetch raise => rollback pending, preserve old doc, re-raise."""
    strategy = RagflowRAGStrategy()
    pending_doc_id = "pending-doc-abc"
    fetch_error = ValueError("RAGFlow index not ready")

    delete_calls: list[tuple[str, str, bool]] = []

    async def mock_safe_delete(
        dataset_id: str, doc_id: str, log_only: bool = False
    ) -> None:
        delete_calls.append((dataset_id, doc_id, log_only))

    async def mock_get_chunks(dataset_id: str, doc_id: str, **kwargs: Any) -> Any:
        raise fetch_error

    monkeypatch.setattr(
        "knowledge.service.impl.ragflow_strategy.RagflowUtils.get_document_chunks",
        mock_get_chunks,
    )

    with (
        patch.object(
            strategy,
            "_process_document_upload",
            new=AsyncMock(return_value=pending_doc_id),
        ),
        patch.object(
            strategy,
            "_handle_document_parsing",
            new=AsyncMock(return_value=None),
        ),
        patch.object(
            strategy,
            "_safe_delete_document",
            new=AsyncMock(side_effect=mock_safe_delete),
        ),
    ):
        with pytest.raises(ValueError, match="RAGFlow index not ready"):
            await strategy._upsert_document(
                file_input=object(),
                dataset_id="ds-1",
                old_doc_id="old-doc-xyz",
            )

    # Exactly ONE delete call: the PENDING doc (rollback). Old doc must NOT be touched.
    assert delete_calls == [("ds-1", pending_doc_id, True)]


@pytest.mark.asyncio
async def test_upsert_document_get_chunks_empty_rolls_back_pending(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Fetch returns [] => treat as failure, rollback pending, preserve old doc."""
    strategy = RagflowRAGStrategy()
    pending_doc_id = "pending-doc-xyz"

    delete_calls: list[tuple[str, str, bool]] = []

    async def mock_safe_delete(
        dataset_id: str, doc_id: str, log_only: bool = False
    ) -> None:
        delete_calls.append((dataset_id, doc_id, log_only))

    async def mock_get_chunks_empty(
        dataset_id: str, doc_id: str, **kwargs: Any
    ) -> list[Any]:
        return []  # simulate the silent-failure path in ragflow_utils.py:344-346

    monkeypatch.setattr(
        "knowledge.service.impl.ragflow_strategy.RagflowUtils.get_document_chunks",
        mock_get_chunks_empty,
    )

    with (
        patch.object(
            strategy,
            "_process_document_upload",
            new=AsyncMock(return_value=pending_doc_id),
        ),
        patch.object(
            strategy,
            "_handle_document_parsing",
            new=AsyncMock(return_value=None),
        ),
        patch.object(
            strategy,
            "_safe_delete_document",
            new=AsyncMock(side_effect=mock_safe_delete),
        ),
    ):
        # Empty chunks raises CustomException(ChunkQueryFailed) — same
        # domain error pattern the rest of ragflow_strategy uses for empty
        # chunk lists (see lines 621-625, 796). Downstream Java sees this
        # as a failed upload and leaves lastUuid untouched.
        with pytest.raises(CustomException) as exc_info:
            await strategy._upsert_document(
                file_input=object(),
                dataset_id="ds-1",
                old_doc_id="old-doc-preserved",
            )

    assert exc_info.value.code == CodeEnum.ChunkQueryFailed.code
    assert "zero chunks" in str(exc_info.value)
    # Only the pending doc is deleted; old doc is preserved.
    assert delete_calls == [("ds-1", pending_doc_id, True)]


# ----------------------------------------------------------------------
# Section C: split() — document_id routing
# ----------------------------------------------------------------------


@pytest.mark.asyncio
async def test_split_document_id_none_uses_legacy_create_only_path(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """split(document_id=None) => _upsert_document NOT called, legacy path used."""
    strategy = RagflowRAGStrategy()
    file_input = object()

    async def fake_ensure_dataset(group: str, description: str | None = None) -> str:
        return "ds-1"

    async def fake_get_document_chunks(dataset_id: str, doc_id: str) -> list[Any]:
        return []

    monkeypatch.setattr(
        "knowledge.service.impl.ragflow_strategy.RagflowUtils.ensure_dataset",
        fake_ensure_dataset,
    )
    monkeypatch.setattr(
        "knowledge.service.impl.ragflow_strategy.RagflowUtils.get_document_chunks",
        fake_get_document_chunks,
    )
    monkeypatch.setattr(
        "knowledge.service.impl.ragflow_strategy.RagflowUtils.convert_to_standard_format",
        lambda doc_id, chunks: [],
    )

    with (
        patch.object(
            strategy,
            "_process_document_upload",
            new=AsyncMock(return_value="legacy-doc-id"),
        ) as mock_upload,
        patch.object(
            strategy,
            "_handle_document_parsing",
            new=AsyncMock(return_value=None),
        ) as mock_parse,
        patch.object(
            strategy,
            "_upsert_document",
            new=AsyncMock(return_value="should-not-be-used"),
        ) as mock_upsert,
    ):
        await strategy.split(file=file_input, document_id=None)

    mock_upsert.assert_not_awaited()
    mock_upload.assert_awaited_once_with(file_input, "ds-1")
    mock_parse.assert_awaited_once_with("ds-1", "legacy-doc-id")


@pytest.mark.asyncio
async def test_split_document_id_set_uses_upsert_path(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """split(document_id='doc-old') => _upsert_document called, legacy path not.

    _upsert_document returns a (doc_id, chunks) tuple that split() unpacks
    directly, so split() no longer calls get_document_chunks in the upsert
    branch. The get_document_chunks monkeypatch below is a safety net in
    case a future refactor reintroduces the outer-branch call.
    """
    strategy = RagflowRAGStrategy()
    file_input = object()

    async def fake_ensure_dataset(group: str, description: str | None = None) -> str:
        return "ds-1"

    async def fake_get_document_chunks(dataset_id: str, doc_id: str) -> list[Any]:
        return []

    monkeypatch.setattr(
        "knowledge.service.impl.ragflow_strategy.RagflowUtils.ensure_dataset",
        fake_ensure_dataset,
    )
    monkeypatch.setattr(
        "knowledge.service.impl.ragflow_strategy.RagflowUtils.get_document_chunks",
        fake_get_document_chunks,
    )
    monkeypatch.setattr(
        "knowledge.service.impl.ragflow_strategy.RagflowUtils.convert_to_standard_format",
        lambda doc_id, chunks: [],
    )

    with (
        patch.object(
            strategy,
            "_upsert_document",
            new=AsyncMock(return_value=("new-doc-upsert", [{"id": "c1"}])),
        ) as mock_upsert,
        patch.object(
            strategy,
            "_process_document_upload",
            new=AsyncMock(return_value="should-not-be-used"),
        ) as mock_upload,
        patch.object(
            strategy,
            "_handle_document_parsing",
            new=AsyncMock(return_value=None),
        ) as mock_parse,
    ):
        await strategy.split(file=file_input, document_id="doc-old")

    mock_upsert.assert_awaited_once_with(file_input, "ds-1", "doc-old")
    mock_upload.assert_not_awaited()
    mock_parse.assert_not_awaited()


@pytest.mark.asyncio
async def test_split_preserves_custom_exception_from_upsert(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """split() must preserve domain errors so API returns the right code."""
    strategy = RagflowRAGStrategy()

    async def fake_ensure_dataset(group: str, description: str | None = None) -> str:
        return "ds-1"

    monkeypatch.setattr(
        "knowledge.service.impl.ragflow_strategy.RagflowUtils.ensure_dataset",
        fake_ensure_dataset,
    )

    with patch.object(
        strategy,
        "_upsert_document",
        new=AsyncMock(
            side_effect=CustomException(CodeEnum.ChunkDeleteFailed, "delete old failed")
        ),
    ):
        with pytest.raises(CustomException) as exc_info:
            await strategy.split(file=object(), document_id="doc-old")

    assert exc_info.value.code == CodeEnum.ChunkDeleteFailed.code


@pytest.mark.asyncio
async def test_split_prefers_kwargs_group_over_default(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """split() honors kwargs['group'] over the env-loaded default."""
    strategy = RagflowRAGStrategy()
    captured: dict[str, Any] = {}

    async def fake_ensure_dataset(group: str, description: str | None = None) -> str:
        captured["group"] = group
        return "ds-1"

    async def fake_get_document_chunks(dataset_id: str, doc_id: str) -> list[Any]:
        return []

    monkeypatch.setattr(
        "knowledge.service.impl.ragflow_strategy.RagflowUtils.ensure_dataset",
        fake_ensure_dataset,
    )
    monkeypatch.setattr(
        "knowledge.service.impl.ragflow_strategy.RagflowUtils.get_document_chunks",
        fake_get_document_chunks,
    )
    monkeypatch.setattr(
        "knowledge.service.impl.ragflow_strategy.RagflowUtils.convert_to_standard_format",
        lambda doc_id, chunks: [],
    )

    with (
        patch.object(
            strategy,
            "_process_document_upload",
            new=AsyncMock(return_value="some-doc-id"),
        ),
        patch.object(
            strategy,
            "_handle_document_parsing",
            new=AsyncMock(return_value=None),
        ),
    ):
        await strategy.split(
            file=object(),
            document_id=None,
            group="UserProvidedKB",
        )

    assert captured["group"] == "UserProvidedKB"


# ----------------------------------------------------------------------
# Section D: /knowledge/v1/document/upload — documentId form field passthrough
# ----------------------------------------------------------------------


def _build_test_app_for_upload(
    monkeypatch: pytest.MonkeyPatch,
) -> tuple[Any, Any]:
    """Build a minimal FastAPI app that mounts rag_router for TestClient use.

    The production api.py exposes `rag_router` as an APIRouter with prefix
    `/knowledge/v1`; we wrap it in a bare FastAPI() so TestClient can route
    to it without pulling in the whole service bootstrap (OTLP, DB, etc.).

    We also monkeypatch `get_span_and_metric` because it reaches out to the
    OTLP service manager which is not initialized in test environments.
    """
    from fastapi import FastAPI

    from knowledge.api.v1 import api as api_module

    # Stub get_span_and_metric so the handler can call span/metric methods
    # without a live OTLP service manager.
    class _StubSpanCtx:
        sid = "test-sid"

        def add_info_events(self, *_args: Any, **_kwargs: Any) -> None:
            pass

        def record_exception(self, *_args: Any, **_kwargs: Any) -> None:
            pass

    class _StubSpan:
        def start(self, *_args: Any, **_kwargs: Any) -> Any:
            stub = _StubSpanCtx()

            class _Cm:
                def __enter__(self_inner: Any) -> _StubSpanCtx:
                    return stub

                def __exit__(self_inner: Any, *exc: Any) -> Literal[False]:
                    return False

            return _Cm()

    class _StubMetric:
        def in_success_count(self) -> None:
            pass

        def in_error_count(self, *_args: Any, **_kwargs: Any) -> None:
            pass

    def fake_get_span_and_metric(
        app_id: str, function_name: str = "unknown"
    ) -> tuple[_StubSpan, _StubMetric]:
        return _StubSpan(), _StubMetric()

    monkeypatch.setattr(api_module, "get_span_and_metric", fake_get_span_and_metric)

    app = FastAPI()
    # rag_router already has prefix="/knowledge/v1"; mount without extra prefix
    # so the path matches production (main.py does the same).
    app.include_router(api_module.rag_router)
    return app, api_module


def test_file_upload_endpoint_no_document_id_passes_none_to_strategy(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """POST /knowledge/v1/document/upload WITHOUT documentId form field =>
    strategy.split receives document_id=None."""
    from fastapi.testclient import TestClient

    app, api_module = _build_test_app_for_upload(monkeypatch)

    captured: dict[str, Any] = {}

    async def fake_split(self: Any, **kwargs: Any) -> list[Any]:
        captured.update(kwargs)
        # strip out the span kwarg that handle_rag_operation injects
        captured.pop("span", None)
        return []

    # Patch the strategy method so we intercept what the router forwards
    from knowledge.service.impl.ragflow_strategy import RagflowRAGStrategy

    monkeypatch.setattr(RagflowRAGStrategy, "split", fake_split)

    # Override the get_app_id dependency so we don't need real auth
    from knowledge.api.v1.api import get_app_id

    app.dependency_overrides[get_app_id] = lambda: "test-app"

    client = TestClient(app)
    files = {"file": ("t.txt", b"hello", "text/plain")}
    data = {"ragType": "Ragflow-RAG"}

    resp = client.post("/knowledge/v1/document/upload", files=files, data=data)

    assert (
        resp.status_code == 200
    ), f"Expected 200, got {resp.status_code}, body={resp.text}"
    assert (
        "document_id" in captured
    ), "Expected split() to receive document_id kwarg (value may be None)"
    assert captured["document_id"] is None


def test_file_upload_endpoint_with_document_id_passes_value_to_strategy(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """POST /knowledge/v1/document/upload WITH documentId=doc-old =>
    strategy.split receives document_id='doc-old'."""
    from fastapi.testclient import TestClient

    app, api_module = _build_test_app_for_upload(monkeypatch)

    captured: dict[str, Any] = {}

    async def fake_split(self: Any, **kwargs: Any) -> list[Any]:
        captured.update(kwargs)
        captured.pop("span", None)
        return []

    from knowledge.service.impl.ragflow_strategy import RagflowRAGStrategy

    monkeypatch.setattr(RagflowRAGStrategy, "split", fake_split)

    from knowledge.api.v1.api import get_app_id

    app.dependency_overrides[get_app_id] = lambda: "test-app"

    client = TestClient(app)
    files = {"file": ("t.txt", b"hello", "text/plain")}
    data = {"ragType": "Ragflow-RAG", "documentId": "doc-old"}

    resp = client.post("/knowledge/v1/document/upload", files=files, data=data)

    assert (
        resp.status_code == 200
    ), f"Expected 200, got {resp.status_code}, body={resp.text}"
    assert (
        captured.get("document_id") == "doc-old"
    ), f"Expected document_id='doc-old', got {captured.get('document_id')!r}"


def test_file_split_endpoint_no_document_id_passes_none_to_strategy(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """POST /knowledge/v1/document/split WITHOUT documentId JSON field =>
    strategy.split receives document_id=None."""
    from fastapi.testclient import TestClient

    app, _api_module = _build_test_app_for_upload(monkeypatch)

    captured: dict[str, Any] = {}

    async def fake_split(self: Any, **kwargs: Any) -> list[Any]:
        captured.update(kwargs)
        captured.pop("span", None)
        return []

    from knowledge.service.impl.ragflow_strategy import RagflowRAGStrategy

    monkeypatch.setattr(RagflowRAGStrategy, "split", fake_split)

    from knowledge.api.v1.api import get_app_id

    app.dependency_overrides[get_app_id] = lambda: "test-app"

    client = TestClient(app)
    resp = client.post(
        "/knowledge/v1/document/split",
        json={"file": "https://example.com/a.txt", "ragType": "Ragflow-RAG"},
    )

    assert (
        resp.status_code == 200
    ), f"Expected 200, got {resp.status_code}, body={resp.text}"
    assert (
        "document_id" in captured
    ), "Expected split() to receive document_id kwarg (value may be None)"
    assert captured["document_id"] is None


def test_file_split_endpoint_with_document_id_passes_value_to_strategy(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """POST /knowledge/v1/document/split WITH documentId=doc-old =>
    strategy.split receives document_id='doc-old' so the upsert path
    deduplicates the re-slice instead of creating a new RAGFlow doc."""
    from fastapi.testclient import TestClient

    app, _api_module = _build_test_app_for_upload(monkeypatch)

    captured: dict[str, Any] = {}

    async def fake_split(self: Any, **kwargs: Any) -> list[Any]:
        captured.update(kwargs)
        captured.pop("span", None)
        return []

    from knowledge.service.impl.ragflow_strategy import RagflowRAGStrategy

    monkeypatch.setattr(RagflowRAGStrategy, "split", fake_split)

    from knowledge.api.v1.api import get_app_id

    app.dependency_overrides[get_app_id] = lambda: "test-app"

    client = TestClient(app)
    resp = client.post(
        "/knowledge/v1/document/split",
        json={
            "file": "https://example.com/a.txt",
            "ragType": "Ragflow-RAG",
            "documentId": "doc-old",
        },
    )

    assert (
        resp.status_code == 200
    ), f"Expected 200, got {resp.status_code}, body={resp.text}"
    assert (
        captured.get("document_id") == "doc-old"
    ), f"Expected document_id='doc-old', got {captured.get('document_id')!r}"


# ----------------------------------------------------------------------
# Section E: cross-strategy **kwargs forward-compat regression guard
# ----------------------------------------------------------------------
# /v1/document/upload always forwards document_id to strategy.split().
# Only RagflowRAGStrategy acts on it; the other strategies must silently
# ignore it via **kwargs. If these tests fail, restore **kwargs — don't
# delete the tests.


def _split_signature_accepts_var_keyword(strategy_cls: type[Any]) -> bool:
    """Return True iff strategy_cls.split() has a **kwargs (VAR_KEYWORD) param."""
    sig = inspect.signature(strategy_cls.split)
    return any(p.kind is inspect.Parameter.VAR_KEYWORD for p in sig.parameters.values())


def test_aiui_strategy_split_accepts_var_keyword_for_forward_compat() -> None:
    """AIUI strategy must keep **kwargs so document_id is silently ignored."""
    from knowledge.service.impl.aiui_strategy import AIUIRAGStrategy

    assert _split_signature_accepts_var_keyword(AIUIRAGStrategy), (
        f"{AIUIRAGStrategy.__name__}.split() dropped **kwargs — breaks "
        "forward-compat for non-Ragflow strategies."
    )


def test_cbg_strategy_split_accepts_var_keyword_for_forward_compat() -> None:
    """CBG strategy must keep **kwargs so document_id is silently ignored."""
    from knowledge.service.impl.cbg_strategy import CBGRAGStrategy

    assert _split_signature_accepts_var_keyword(CBGRAGStrategy), (
        f"{CBGRAGStrategy.__name__}.split() dropped **kwargs — breaks "
        "forward-compat for non-Ragflow strategies."
    )


def test_sparkdesk_strategy_split_accepts_var_keyword_for_forward_compat() -> None:
    """SparkDesk strategy must keep **kwargs so document_id is silently ignored."""
    from knowledge.service.impl.sparkdesk_strategy import SparkDeskRAGStrategy

    assert _split_signature_accepts_var_keyword(SparkDeskRAGStrategy), (
        f"{SparkDeskRAGStrategy.__name__}.split() dropped **kwargs — breaks "
        "forward-compat for non-Ragflow strategies."
    )
