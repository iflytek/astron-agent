"""Test BaseLLMModel class"""

from dataclasses import dataclass
from typing import AsyncIterator
from unittest.mock import AsyncMock, MagicMock

import pytest
from common.otlp import sid as sid_module
from common.otlp.trace.span import Span
from openai import APIError, APITimeoutError, AsyncOpenAI

from agent.domain.models.base import BaseLLMModel
from agent.exceptions.plugin_exc import PluginExc


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


class TestBaseLLMModel:
    """Test BaseLLMModel class"""

    @pytest.fixture
    def mock_llm(self) -> AsyncOpenAI:
        """Create mock AsyncOpenAI client"""
        # Only needs chat.completions.create interface, doesn't depend on real AsyncOpenAI implementation
        return MagicMock()

    @pytest.fixture
    def model(self, mock_llm: AsyncOpenAI) -> BaseLLMModel:
        """Create model instance for testing"""
        # Use model_construct to bypass Pydantic's strict validation of llm field type
        return BaseLLMModel.model_construct(name="test_model", llm=mock_llm)

    @pytest.fixture
    def span(self) -> Span:
        """Create Span instance for testing"""
        return Span(app_id="test_app", uid="test_uid")

    @pytest.mark.asyncio
    async def test_create_completion(self, model: BaseLLMModel) -> None:
        """Test creating completion request"""
        mock_response = AsyncMock()
        model.llm.chat.completions.create = AsyncMock(return_value=mock_response)

        messages = [{"role": "user", "content": "test"}]
        result = await model.create_completion(messages, stream=True)

        model.llm.chat.completions.create.assert_called_once_with(
            messages=messages,
            stream=True,
            model="test_model",
            timeout=90,
        )
        assert result == mock_response

    def test_log_messages_to_span(self, model: BaseLLMModel, span: Span) -> None:
        """Test logging messages to span"""
        messages = [
            {"role": "user", "content": "question"},
            {"role": "assistant", "content": "answer"},
        ]
        model._log_messages_to_span(span, messages)
        # Verify span is called (specific implementation depends on Span class)

    def test_log_request_info_to_span(self, model: BaseLLMModel, span: Span) -> None:
        """Test logging request info to span"""
        model._log_request_info_to_span(span, stream=True)
        # Verify span is called

    def test_handle_api_timeout_error(self, model: BaseLLMModel) -> None:
        """Test handling API timeout error"""

        # Use simple Dummy error object to avoid depending on openai package's specific constructor signature
        class DummyTimeoutError(APITimeoutError):  # type: ignore[misc]
            def __init__(self, message: str) -> None:
                self.message = message

        error = DummyTimeoutError("timeout")
        with pytest.raises(PluginExc):
            model._handle_api_timeout_error(error)

    def test_handle_api_error_with_span(self, model: BaseLLMModel, span: Span) -> None:
        """Test handling API error (with span)"""

        class DummyAPIError(APIError):  # type: ignore[misc]
            def __init__(self, message: str, code: str) -> None:
                self.message = message
                self.code = code

        error = DummyAPIError(message="api error", code="error_code")
        with pytest.raises(PluginExc):
            model._handle_api_error(error, span)

    def test_handle_api_error_without_span(self, model: BaseLLMModel) -> None:
        """Test handling API error (without span)"""

        class DummyAPIError(APIError):  # type: ignore[misc]
            def __init__(self, message: str, code: str) -> None:
                self.message = message
                self.code = code

        error = DummyAPIError(message="api error", code="error_code")
        with pytest.raises(PluginExc):
            model._handle_api_error(error, None)

    def test_handle_general_error(self, model: BaseLLMModel, span: Span) -> None:
        """Test handling general error"""
        error = ValueError("value error")
        with pytest.raises(PluginExc):
            model._handle_general_error(error, span)

    @pytest.mark.parametrize(
        "error_msg,expected_keyword",
        [
            ("SSL certificate error", "SSL certificate error"),
            ("Connection refused", "Connection error"),
            ("Request timeout", "Request timeout"),
            ("Some other error", "ValueError"),
        ],
    )
    def test_get_error_message_for_exception(
        self, model: BaseLLMModel, error_msg: str, expected_keyword: str
    ) -> None:
        """Test getting error message for exception"""
        error = ValueError(error_msg)
        message = model._get_error_message_for_exception(error)
        assert expected_keyword in message

    def test_handle_exception(self, model: BaseLLMModel, span: Span) -> None:
        """Test handling exception"""
        error = Exception("general error")
        with pytest.raises(PluginExc):
            model._handle_exception(error, span)

    @pytest.mark.asyncio
    async def test_stream_success(self, model: BaseLLMModel, span: Span) -> None:
        """Test successful streaming response"""
        mock_chunk1 = MagicMock()
        mock_chunk1.model_dump.return_value = {"code": 0, "content": "chunk1"}
        mock_chunk1.model_dump_json.return_value = '{"code": 0}'

        mock_chunk2 = MagicMock()
        mock_chunk2.model_dump.return_value = {"code": 0, "content": "chunk2"}
        mock_chunk2.model_dump_json.return_value = '{"code": 0}'

        async def mock_stream() -> AsyncIterator[MagicMock]:
            yield mock_chunk1
            yield mock_chunk2

        mock_response = AsyncMock()
        mock_response.__aiter__ = lambda self: mock_stream()

        model.llm.chat.completions.create = AsyncMock(return_value=mock_response)

        messages = [{"role": "user", "content": "test"}]
        chunks = []
        async for chunk in model.stream(messages, stream=True, span=span):
            chunks.append(chunk)

        assert len(chunks) == 2

    @pytest.mark.asyncio
    async def test_stream_with_error_code(
        self, model: BaseLLMModel, span: Span
    ) -> None:
        """Test streaming response containing error code"""
        mock_chunk = MagicMock()
        mock_chunk.model_dump.return_value = {"code": 400, "message": "error"}
        mock_chunk.model_dump_json.return_value = '{"code": 400}'

        async def mock_stream() -> AsyncIterator[MagicMock]:
            yield mock_chunk

        mock_response = AsyncMock()
        mock_response.__aiter__ = lambda self: mock_stream()

        model.llm.chat.completions.create = AsyncMock(return_value=mock_response)

        messages = [{"role": "user", "content": "test"}]
        with pytest.raises(PluginExc):
            async for _ in model.stream(messages, stream=True, span=span):
                pass

    @pytest.mark.asyncio
    async def test_stream_timeout_error(self, model: BaseLLMModel, span: Span) -> None:
        """Test streaming response timeout error"""

        class DummyTimeoutError(APITimeoutError):  # type: ignore[misc]
            def __init__(self, message: str) -> None:
                self.message = message

        error = DummyTimeoutError("timeout")
        model.llm.chat.completions.create = AsyncMock(side_effect=error)

        messages = [{"role": "user", "content": "test"}]
        with pytest.raises(PluginExc):
            async for _ in model.stream(messages, stream=True, span=span):
                pass

    @pytest.mark.asyncio
    async def test_stream_api_error(self, model: BaseLLMModel, span: Span) -> None:
        """Test streaming response API error"""

        class DummyAPIError(APIError):  # type: ignore[misc]
            def __init__(self, message: str, code: str) -> None:
                self.message = message
                self.code = code

        error = DummyAPIError(message="api error", code="error_code")
        model.llm.chat.completions.create = AsyncMock(side_effect=error)

        messages = [{"role": "user", "content": "test"}]
        with pytest.raises(PluginExc):
            async for _ in model.stream(messages, stream=True, span=span):
                pass

    @pytest.mark.asyncio
    async def test_stream_without_span(self, model: BaseLLMModel) -> None:
        """Test streaming response without span"""
        mock_chunk = MagicMock()
        mock_chunk.model_dump.return_value = {"code": 0}
        mock_chunk.model_dump_json.return_value = '{"code": 0}'

        async def mock_stream() -> AsyncIterator[MagicMock]:
            yield mock_chunk

        mock_response = AsyncMock()
        mock_response.__aiter__ = lambda self: mock_stream()

        model.llm.chat.completions.create = AsyncMock(return_value=mock_response)

        messages = [{"role": "user", "content": "test"}]
        chunks = []
        async for chunk in model.stream(messages, stream=True, span=None):
            chunks.append(chunk)

        assert len(chunks) == 1
