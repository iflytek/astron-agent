#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tests for POST /knowledge/v1/chunk/query API-layer behavior.

Covers:
- rewrite switch: default True runs rewrite_query; False skips it.
- ragflow_ext is forwarded to the strategy only when explicitly set.
- Cross-field validation returns the project's error response shape
  (HTTP 200 + application code, not stock HTTP 422).
"""

from contextlib import contextmanager
from typing import Any, Dict, Generator, Tuple
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Patch targets
_REWRITE_QUERY = "knowledge.api.v1.api.rewrite_query"
_GET_STRATEGY = "knowledge.api.v1.api.RAGStrategyFactory.get_strategy"
_GET_SPAN_AND_METRIC = "knowledge.api.v1.api.get_span_and_metric"


def _make_span_context_mock() -> MagicMock:
    """Create a mock span context that acts as a context manager."""
    span_ctx = MagicMock()
    span_ctx.sid = "test-sid-001"
    span_ctx.add_info_events = MagicMock()
    span_ctx.record_exception = MagicMock()
    return span_ctx


def _make_span_mock() -> MagicMock:
    """Create a mock Span that supports span.start() as context manager."""
    span_ctx = _make_span_context_mock()

    @contextmanager
    def _start(**kwargs: Any) -> Generator[MagicMock, None, None]:
        yield span_ctx

    span = MagicMock()
    span.start = _start
    return span


def _make_metric_mock() -> MagicMock:
    """Create a mock Meter."""
    metric = MagicMock()
    metric.in_success_count = MagicMock()
    metric.in_error_count = MagicMock()
    return metric


def _make_strategy_mock(return_value: Dict[str, Any] | None = None) -> AsyncMock:
    if return_value is None:
        return_value = {"query": "q", "count": 0, "results": []}
    strategy = AsyncMock()
    strategy.query = AsyncMock(return_value=return_value)
    return strategy


def _base_request_body() -> Dict[str, Any]:
    return {
        "query": "how to deploy astron-agent",
        "topN": 3,
        "match": {"repoId": ["repo_1"], "threshold": 0.5},
        "ragType": "Ragflow-RAG",
    }


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def app() -> Any:
    """Fresh FastAPI app per test (isolates route state)."""
    from knowledge.main import create_app

    return create_app()


@pytest.fixture
def infra_mocks() -> Tuple[MagicMock, MagicMock]:
    """Span/metric mocks that bypass uninitialized OTLP services."""
    return _make_span_mock(), _make_metric_mock()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_rewrite_default_true_calls_rewrite_query(
    app: Any, infra_mocks: Tuple[MagicMock, MagicMock]
) -> None:
    """Default rewrite=True triggers rewrite_query()."""
    from fastapi.testclient import TestClient

    strategy_mock = _make_strategy_mock()
    with (
        patch(_GET_SPAN_AND_METRIC, return_value=infra_mocks),
        patch(
            _REWRITE_QUERY, new=AsyncMock(return_value="rewritten-query")
        ) as mock_rewrite,
        patch(_GET_STRATEGY, return_value=strategy_mock),
    ):
        client = TestClient(app)
        body = _base_request_body()
        body["history"] = [{"role": "user", "content": "hi"}]
        response = client.post("/knowledge/v1/chunk/query", json=body)

    assert response.status_code == 200
    mock_rewrite.assert_awaited_once()
    strategy_mock.query.assert_awaited_once()
    assert strategy_mock.query.await_args.kwargs["query"] == "rewritten-query"


@pytest.mark.asyncio
async def test_rewrite_false_skips_rewrite_query(
    app: Any, infra_mocks: Tuple[MagicMock, MagicMock]
) -> None:
    """rewrite=False bypasses rewrite_query() entirely."""
    from fastapi.testclient import TestClient

    strategy_mock = _make_strategy_mock()
    with (
        patch(_GET_SPAN_AND_METRIC, return_value=infra_mocks),
        patch(_REWRITE_QUERY, new=AsyncMock()) as mock_rewrite,
        patch(_GET_STRATEGY, return_value=strategy_mock),
    ):
        client = TestClient(app)
        body = _base_request_body()
        body["rewrite"] = False
        body["history"] = [{"role": "user", "content": "hi"}]
        response = client.post("/knowledge/v1/chunk/query", json=body)

    assert response.status_code == 200
    mock_rewrite.assert_not_awaited()
    strategy_mock.query.assert_awaited_once()
    # Raw query forwarded unchanged
    assert strategy_mock.query.await_args.kwargs["query"] == body["query"]


@pytest.mark.asyncio
async def test_ragflow_ext_forwarded_when_set(
    app: Any, infra_mocks: Tuple[MagicMock, MagicMock]
) -> None:
    """ragflow_ext reaches strategy.query() via kwargs when provided."""
    from fastapi.testclient import TestClient

    strategy_mock = _make_strategy_mock()
    with (
        patch(_GET_SPAN_AND_METRIC, return_value=infra_mocks),
        patch(_REWRITE_QUERY, new=AsyncMock(return_value="rewritten-query")),
        patch(_GET_STRATEGY, return_value=strategy_mock),
    ):
        client = TestClient(app)
        body = _base_request_body()
        body["ragflow_ext"] = {"top_k": 50, "highlight": True}
        response = client.post("/knowledge/v1/chunk/query", json=body)

    assert response.status_code == 200
    ext_arg = strategy_mock.query.await_args.kwargs.get("ragflow_ext")
    assert ext_arg is not None
    assert ext_arg.top_k == 50
    assert ext_arg.highlight is True


@pytest.mark.asyncio
async def test_ragflow_ext_not_in_kwargs_when_unset(
    app: Any, infra_mocks: Tuple[MagicMock, MagicMock]
) -> None:
    """Default request does NOT add ragflow_ext=None to strategy kwargs."""
    from fastapi.testclient import TestClient

    strategy_mock = _make_strategy_mock()
    with (
        patch(_GET_SPAN_AND_METRIC, return_value=infra_mocks),
        patch(_REWRITE_QUERY, new=AsyncMock(return_value="rewritten-query")),
        patch(_GET_STRATEGY, return_value=strategy_mock),
    ):
        client = TestClient(app)
        response = client.post("/knowledge/v1/chunk/query", json=_base_request_body())

    assert response.status_code == 200
    assert "ragflow_ext" not in strategy_mock.query.await_args.kwargs


@pytest.mark.asyncio
async def test_dataset_id_forwarded_as_internal_contract(
    app: Any, infra_mocks: Tuple[MagicMock, MagicMock]
) -> None:
    """Service-injected datasetId is forwarded to the Ragflow strategy."""
    from fastapi.testclient import TestClient

    strategy_mock = _make_strategy_mock()
    with (
        patch(_GET_SPAN_AND_METRIC, return_value=infra_mocks),
        patch(_REWRITE_QUERY, new=AsyncMock(return_value="rewritten-query")),
        patch(_GET_STRATEGY, return_value=strategy_mock),
    ):
        client = TestClient(app)
        body = _base_request_body()
        body["match"]["datasetId"] = ["ds-console"]
        response = client.post("/knowledge/v1/chunk/query", json=body)

    assert response.status_code == 200
    assert strategy_mock.query.await_args.kwargs["datasetId"] == ["ds-console"]


@pytest.mark.asyncio
async def test_validation_error_when_ragflow_ext_with_non_ragflow_ragtype(
    app: Any,
) -> None:
    """DTO validator rejects ragflow_ext + AIUI.

    Service uses a custom RequestValidationError handler (main.py:45-63)
    that returns HTTP 200 with an application-level error body
    (code=10003 = ParameterInvalid) instead of stock HTTP 422.
    """
    from fastapi.testclient import TestClient

    client = TestClient(app)
    body = _base_request_body()
    body["ragType"] = "AIUI-RAG2"
    body["ragflow_ext"] = {"top_k": 50}
    response = client.post("/knowledge/v1/chunk/query", json=body)

    assert response.status_code == 200
    assert "ragflow_ext is only allowed when ragType='Ragflow-RAG'" in response.text
