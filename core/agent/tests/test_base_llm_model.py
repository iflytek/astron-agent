"""Test BaseLLMModel class"""

import json
from dataclasses import dataclass
from typing import Any, AsyncIterator
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest
from common.otlp import sid as sid_module
from common.otlp.trace.span import Span
from openai import APIError, APITimeoutError, AsyncOpenAI

from agent.domain.models.base import (
    AnthropicLLMModel,
    BaseLLMModel,
    CompatChoice,
    CompatChunk,
    CompatDelta,
    CompatUsage,
    GoogleLLMModel,
)
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
    async def test_create_completion(
        self, model: BaseLLMModel, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Test creating completion request"""
        monkeypatch.delenv("DEFAULT_LLM_MAX_TOKEN", raising=False)
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

    @pytest.mark.asyncio
    async def test_create_completion_with_max_tokens_sends_one_request(
        self, model: BaseLLMModel, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """A configured token limit must not duplicate the upstream request."""
        monkeypatch.setenv("DEFAULT_LLM_MAX_TOKEN", "2048")
        mock_response = AsyncMock()
        model.llm.chat.completions.create = AsyncMock(return_value=mock_response)

        messages = [{"role": "user", "content": "test"}]
        result = await model.create_completion(messages, stream=True)

        model.llm.chat.completions.create.assert_awaited_once_with(
            messages=messages,
            stream=True,
            model="test_model",
            timeout=90,
            max_tokens=2048,
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

    @pytest.mark.asyncio
    async def test_openai_stream_keeps_single_final_cumulative_usage(
        self, model: BaseLLMModel
    ) -> None:
        """OpenAI usage is one choices-less total immediately before [DONE]."""
        content_chunk = CompatChunk(
            choices=[CompatChoice(delta=CompatDelta(content="hello"))]
        )
        usage_chunk = CompatChunk(
            choices=[],
            usage=CompatUsage(
                prompt_tokens=10,
                completion_tokens=4,
                total_tokens=14,
            ),
        )

        async def mock_stream() -> AsyncIterator[CompatChunk]:
            yield content_chunk
            yield usage_chunk

        mock_response = AsyncMock()
        mock_response.__aiter__ = lambda self: mock_stream()
        model.llm.chat.completions.create = AsyncMock(return_value=mock_response)

        chunks = [
            chunk
            async for chunk in model.stream(
                [{"role": "user", "content": "test"}], stream=True
            )
        ]

        usage_chunks = [chunk for chunk in chunks if chunk.usage is not None]
        assert usage_chunks == [usage_chunk]
        assert usage_chunks[0].choices == []


def _sse_response(events: list[tuple[str, dict[str, Any]]]) -> httpx.Response:
    body = "".join(
        f"event: {event_type}\ndata: {json.dumps(payload)}\n\n"
        for event_type, payload in events
    )
    return httpx.Response(
        200,
        headers={"content-type": "text/event-stream"},
        content=body,
        request=httpx.Request("POST", "https://provider.test/v1/messages"),
    )


@pytest.mark.asyncio
async def test_anthropic_stream_merges_cumulative_usage_once() -> None:
    """Anthropic input and cumulative output usage become one canonical frame."""
    response = _sse_response(
        [
            (
                "message_start",
                {
                    "type": "message_start",
                    "message": {
                        "content": [],
                        "usage": {"input_tokens": 25, "output_tokens": 1},
                    },
                },
            ),
            (
                "content_block_delta",
                {
                    "type": "content_block_delta",
                    "delta": {"type": "text_delta", "text": "Hello"},
                },
            ),
            (
                "message_delta",
                {
                    "type": "message_delta",
                    "delta": {},
                    "usage": {"output_tokens": 10},
                },
            ),
            (
                "content_block_delta",
                {
                    "type": "content_block_delta",
                    "delta": {"type": "text_delta", "text": "!"},
                },
            ),
            (
                "message_delta",
                {
                    "type": "message_delta",
                    "delta": {"stop_reason": "end_turn"},
                    "usage": {"output_tokens": 15},
                },
            ),
            ("message_stop", {"type": "message_stop"}),
        ]
    )
    async with httpx.AsyncClient(trust_env=False) as client:
        model = AnthropicLLMModel(
            name="claude-test",
            model_url="https://provider.test",
            api_key="synthetic",
            http_client=client,
        )
        chunks = [chunk async for chunk in model._yield_normalized_chunks(response)]

    assert [
        choice.delta.content
        for chunk in chunks
        for choice in chunk.choices
        if choice.delta.content
    ] == ["Hello", "!"]
    assert [
        choice.finish_reason
        for chunk in chunks
        for choice in chunk.choices
        if choice.finish_reason
    ] == ["end_turn"]
    usage_chunks = [chunk for chunk in chunks if chunk.usage is not None]
    assert len(usage_chunks) == 1
    assert usage_chunks[0].choices == []
    assert usage_chunks[0].usage == CompatUsage(
        prompt_tokens=25,
        completion_tokens=15,
        total_tokens=40,
    )


@pytest.mark.asyncio
async def test_google_stream_keeps_latest_cumulative_usage_once() -> None:
    """Repeated Gemini total snapshots must not be summed across chunks."""
    payloads = [
        {
            "candidates": [
                {"content": {"parts": [{"text": "Hello"}]}, "finishReason": None}
            ]
        },
        {
            "candidates": [
                {"content": {"parts": [{"text": " "}]}, "finishReason": None}
            ],
            "usageMetadata": {
                "promptTokenCount": 10,
                "candidatesTokenCount": 2,
                "totalTokenCount": 12,
            },
        },
        {
            "candidates": [
                {"content": {"parts": [{"text": "world"}]}, "finishReason": "STOP"}
            ],
            "usageMetadata": {
                "promptTokenCount": 10,
                "candidatesTokenCount": 4,
                "totalTokenCount": 14,
            },
        },
    ]
    body = "".join(f"data: {json.dumps(payload)}\n\n" for payload in payloads)
    response = httpx.Response(
        200,
        headers={"content-type": "text/event-stream"},
        content=body,
        request=httpx.Request("POST", "https://provider.test/streamGenerateContent"),
    )
    async with httpx.AsyncClient(trust_env=False) as client:
        model = GoogleLLMModel(
            name="gemini-test",
            model_url="https://provider.test",
            api_key="synthetic",
            http_client=client,
        )
        chunks = [chunk async for chunk in model._yield_normalized_chunks(response)]

    assert all(chunk.usage is None for chunk in chunks[:-1])
    assert chunks[-1].choices == []
    assert chunks[-1].usage == CompatUsage(
        prompt_tokens=10,
        completion_tokens=4,
        total_tokens=14,
    )
