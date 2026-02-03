"""Test KnowledgePlugin and KnowledgePluginFactory"""

import asyncio
import os
from dataclasses import dataclass
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import aiohttp
import pytest
from common.otlp import sid as sid_module
from common.otlp.trace.span import Span

from agent.exceptions.plugin_exc import PluginExc
from agent.service.plugin.knowledge import KnowledgePlugin, KnowledgePluginFactory


@dataclass
class _DummySidGen:
    """Simple sid generator for testing environment."""

    value: str = "test-sid"

    def gen(self) -> str:  # pragma: no cover - only for testing environment
        return self.value


@pytest.fixture(autouse=True)
def _setup_test_environment() -> None:
    """Automatically inject environment fixes for all tests.

    - Ensure `sid_generator2` is initialized to avoid `Span` construction failure.
    """
    # Initialize sid generator to avoid Span throwing "sid_generator2 is not initialized"
    if sid_module.sid_generator2 is None:
        sid_module.sid_generator2 = _DummySidGen()  # type: ignore[assignment]


class TestKnowledgePluginFactory:
    """Test KnowledgePluginFactory class"""

    @pytest.fixture
    def factory(self) -> KnowledgePluginFactory:
        """Create Factory instance for testing"""
        return KnowledgePluginFactory(
            query="test query",
            top_k=3,
            repo_ids=["repo1"],
            doc_ids=["doc1"],
            score_threshold=0.3,
            rag_type="AIUI-RAG2",
        )

    def test_gen(self, factory: KnowledgePluginFactory) -> None:
        """Test generating KnowledgePlugin"""
        plugin = factory.gen()

        assert isinstance(plugin, KnowledgePlugin)
        assert plugin.name == "knowledge"
        assert plugin.typ == "knowledge"
        assert callable(plugin.run)

    @pytest.mark.asyncio
    async def test_retrieve_success(self, factory: KnowledgePluginFactory) -> None:
        """Test successful knowledge retrieval"""
        span = Span(app_id="test_app", uid="test_uid")

        mock_response_data: dict[str, Any] = {
            "data": {
                "results": [
                    {
                        "title": "Test Doc",
                        "docId": "doc1",
                        "content": "Test content",
                        "references": {},
                    }
                ]
            }
        }

        def mock_post(*args: Any, **kwargs: Any) -> AsyncMock:  # noqa: ANN001
            mock_resp = AsyncMock()
            mock_resp.status = 200
            mock_resp.json = AsyncMock(return_value=mock_response_data)
            mock_resp.raise_for_status = MagicMock()
            mock_resp.read = AsyncMock(return_value=b'{"data": {}}')
            mock_resp.__aenter__.return_value = mock_resp
            mock_resp.__aexit__.return_value = False
            return mock_resp

        with patch.dict(os.environ, {"CHUNK_QUERY_URL": "http://test.com/query"}):
            with patch("aiohttp.ClientSession.post", new=mock_post):
                result = await factory.retrieve(span)

                assert "data" in result
                assert "results" in result["data"]

    @pytest.mark.asyncio
    async def test_retrieve_no_repo_ids(self, factory: KnowledgePluginFactory) -> None:
        """Test returning empty result when no repo_ids"""
        factory.repo_ids = []
        span = Span(app_id="test_app", uid="test_uid")

        result = await factory.retrieve(span)

        assert result == {}

    @pytest.mark.asyncio
    async def test_retrieve_cbg_rag_with_doc_ids(
        self, factory: KnowledgePluginFactory
    ) -> None:
        """Test CBG-RAG type containing doc_ids"""
        factory.rag_type = "CBG-RAG"
        factory.doc_ids = ["doc1", "doc2"]
        span = Span(app_id="test_app", uid="test_uid")

        mock_response_data: dict[str, Any] = {"data": {"results": []}}

        def mock_post(*args: Any, **kwargs: Any) -> AsyncMock:  # noqa: ANN001
            # Verify request data contains docIds
            request_data = kwargs.get("json", {})
            if "match" in request_data and "docIds" in request_data["match"]:
                assert "doc1" in request_data["match"]["docIds"]
                assert "doc2" in request_data["match"]["docIds"]

            mock_resp = AsyncMock()
            mock_resp.status = 200
            mock_resp.json = AsyncMock(return_value=mock_response_data)
            mock_resp.raise_for_status = MagicMock()
            mock_resp.read = AsyncMock(return_value=b'{"data": {}}')
            mock_resp.__aenter__.return_value = mock_resp
            mock_resp.__aexit__.return_value = False
            return mock_resp

        with patch.dict(os.environ, {"CHUNK_QUERY_URL": "http://test.com/query"}):
            with patch("aiohttp.ClientSession.post", new=mock_post):
                await factory.retrieve(span)

    @pytest.mark.asyncio
    async def test_retrieve_non_200_status(
        self, factory: KnowledgePluginFactory
    ) -> None:
        """Test non-200 status code"""
        span = Span(app_id="test_app", uid="test_uid")

        def mock_post(*args: Any, **kwargs: Any) -> AsyncMock:  # noqa: ANN001
            mock_resp = AsyncMock()
            mock_resp.status = 500
            mock_resp.raise_for_status = MagicMock(
                side_effect=aiohttp.ClientResponseError(
                    request_info=MagicMock(),
                    history=(),
                    status=500,
                )
            )
            mock_resp.__aenter__.return_value = mock_resp
            mock_resp.__aexit__.return_value = False
            return mock_resp

        with patch.dict(os.environ, {"CHUNK_QUERY_URL": "http://test.com/query"}):
            with patch("aiohttp.ClientSession.post", new=mock_post):
                with pytest.raises(Exception):  # May throw various exceptions
                    await factory.retrieve(span)

    @pytest.mark.asyncio
    async def test_retrieve_timeout(self, factory: KnowledgePluginFactory) -> None:
        """Test request timeout"""
        span = Span(app_id="test_app", uid="test_uid")

        def mock_post(*args: Any, **kwargs: Any) -> AsyncMock:  # noqa: ANN001
            async def _raise_timeout() -> None:
                raise asyncio.TimeoutError("Request timeout")

            # Return an async context manager that raises timeout in __aenter__
            mock_resp = AsyncMock()

            async def _aenter(*_a: Any, **_k: Any) -> Any:  # noqa: ANN001
                await _raise_timeout()

            mock_resp.__aenter__.side_effect = _aenter
            mock_resp.__aexit__.return_value = False
            return mock_resp

        with patch.dict(os.environ, {"CHUNK_QUERY_URL": "http://test.com/query"}):
            with patch("aiohttp.ClientSession.post", new=mock_post):
                with pytest.raises(PluginExc):
                    await factory.retrieve(span)

    @pytest.mark.asyncio
    async def test_retrieve_request_data_format(
        self, factory: KnowledgePluginFactory
    ) -> None:
        """Test request data format"""
        span = Span(app_id="test_app", uid="test_uid")

        captured_data: dict[str, Any] = {}

        def mock_post(*args: Any, **kwargs: Any) -> AsyncMock:  # noqa: ANN001
            captured_data.update(kwargs.get("json", {}))
            mock_resp = AsyncMock()
            mock_resp.status = 200
            mock_resp.json = AsyncMock(return_value={"data": {"results": []}})
            mock_resp.raise_for_status = MagicMock()
            mock_resp.read = AsyncMock(return_value=b'{"data": {}}')
            mock_resp.__aenter__.return_value = mock_resp
            mock_resp.__aexit__.return_value = False
            return mock_resp

        with patch.dict(os.environ, {"CHUNK_QUERY_URL": "http://test.com/query"}):
            with patch("aiohttp.ClientSession.post", new=mock_post):
                await factory.retrieve(span)

                assert captured_data["query"] == "test query"
                assert captured_data["topN"] == "3"
                assert "match" in captured_data
                assert captured_data["ragType"] == "AIUI-RAG2"


class TestKnowledgePlugin:
    """Test KnowledgePlugin class"""

    def test_knowledge_plugin_creation(self) -> None:
        """Test creating KnowledgePlugin"""
        plugin = KnowledgePlugin(
            name="knowledge",
            description="knowledge plugin",
            schema_template="",
            typ="knowledge",
            run=AsyncMock(),
        )

        assert plugin.name == "knowledge"
        assert plugin.typ == "knowledge"
        assert callable(plugin.run)
