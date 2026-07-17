#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Error-propagation contract tests for ``ragflow_client.get_document_info``.

- ``DATA_ERROR`` (102) returns ``None`` (server's not-owned / not-found path).
- Any other non-zero code raises ``ThirdPartyException``.
- Transport-level exceptions propagate unchanged.
"""

from unittest.mock import AsyncMock, patch

import pytest

from knowledge.exceptions.exception import ThirdPartyException
from knowledge.infra.ragflow import ragflow_client

_LIST_DOCS = "knowledge.infra.ragflow.ragflow_client.list_documents_in_dataset"


@pytest.mark.asyncio
async def test_get_document_info_data_error_returns_none() -> None:
    """DATA_ERROR (code=102) returns ``None``."""
    error_resp = {"code": 102, "message": "You don't own the document doc-x."}
    with patch(_LIST_DOCS, new=AsyncMock(return_value=error_resp)):
        result = await ragflow_client.get_document_info("ds-1", "doc-x")
    assert result is None


@pytest.mark.asyncio
async def test_get_document_info_authentication_error_raises() -> None:
    """AUTHENTICATION_ERROR (code=109) raises ThirdPartyException."""
    error_resp = {"code": 109, "message": "Authentication failed"}
    with patch(_LIST_DOCS, new=AsyncMock(return_value=error_resp)):
        with pytest.raises(ThirdPartyException) as exc_info:
            await ragflow_client.get_document_info("ds-1", "doc-x")
    assert "Authentication failed" in str(exc_info.value)


@pytest.mark.asyncio
async def test_get_document_info_operating_error_raises() -> None:
    """OPERATING_ERROR (code=103) raises ThirdPartyException."""
    error_resp = {"code": 103, "message": "Internal operating failure"}
    with patch(_LIST_DOCS, new=AsyncMock(return_value=error_resp)):
        with pytest.raises(ThirdPartyException) as exc_info:
            await ragflow_client.get_document_info("ds-1", "doc-x")
    assert "Internal operating failure" in str(exc_info.value)


@pytest.mark.asyncio
async def test_get_document_info_propagates_transport_exception() -> None:
    """Transport-level exceptions propagate unchanged."""
    with patch(_LIST_DOCS, new=AsyncMock(side_effect=RuntimeError("boom"))):
        with pytest.raises(RuntimeError, match="boom"):
            await ragflow_client.get_document_info("ds-1", "doc-x")
