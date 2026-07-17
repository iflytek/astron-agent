#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tests for POST /knowledge/v1/dataset/create admin endpoint.

Covers:
- success: ensure_dataset returns dataset_id, response wraps it
- ensure_dataset raises ThirdPartyException -> propagates as non-zero code
- ensure_dataset raises bare Exception -> wrapped as RAGFLOW_RAGError
- blank name rejected via project's global validation handler (HTTP 200 + non-zero code)
- description optional
"""

from typing import Any
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from knowledge.consts.error_code import CodeEnum
from knowledge.exceptions.exception import ThirdPartyException

_ENSURE_DATASET = "knowledge.api.v1.api.RagflowUtils.ensure_dataset"


@pytest.fixture
def client() -> Any:
    from knowledge.main import create_app

    app = create_app()
    return TestClient(app)


def test_create_dataset_success(client: Any) -> None:
    with patch(_ENSURE_DATASET, new=AsyncMock(return_value="ds-abc-123")):
        resp = client.post(
            "/knowledge/v1/dataset/create",
            json={"name": "uuid-name", "description": "kb_alpha"},
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["code"] == 0
    assert body["data"] == {"datasetId": "ds-abc-123"}


def test_create_dataset_third_party_propagates(client: Any) -> None:
    err = ThirdPartyException(msg="RAGFlow unreachable", e=CodeEnum.RAGFLOW_RAGError)
    with patch(_ENSURE_DATASET, new=AsyncMock(side_effect=err)):
        resp = client.post(
            "/knowledge/v1/dataset/create",
            json={"name": "uuid-name", "description": "kb_alpha"},
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["code"] != 0
    assert "RAGFlow unreachable" in body["message"]


def test_create_dataset_unexpected_wrapped(client: Any) -> None:
    with patch(_ENSURE_DATASET, new=AsyncMock(side_effect=RuntimeError("boom"))):
        resp = client.post(
            "/knowledge/v1/dataset/create",
            json={"name": "uuid-name", "description": "kb_alpha"},
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["code"] != 0
    assert "boom" in body["message"]


def test_create_dataset_blank_name_rejected(client: Any) -> None:
    """The project's global RequestValidationError handler returns
    HTTP 200 with an application-level non-zero code instead of the
    stock 422 for any pydantic validation failure (see knowledge/main.py).
    """
    resp = client.post(
        "/knowledge/v1/dataset/create",
        json={"name": "", "description": "kb_alpha"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["code"] != 0


def test_create_dataset_description_optional(client: Any) -> None:
    with patch(_ENSURE_DATASET, new=AsyncMock(return_value="ds-only-name")):
        resp = client.post(
            "/knowledge/v1/dataset/create",
            json={"name": "uuid-name"},
        )
    assert resp.status_code == 200
    assert resp.json()["data"] == {"datasetId": "ds-only-name"}
