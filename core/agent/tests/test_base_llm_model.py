"""Test BaseLLMModel class"""

import json
from dataclasses import dataclass
from typing import Any, AsyncIterator
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest
from common.otlp import sid as sid_module
from common.otlp.trace.span import Span
from openai import APIError, APITimeoutError, AsyncOpenAI, BadRequestError

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
def _setup_test_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    """Automatically inject environment fixes for all tests.

    - Ensure `sid_generator2` is initialized to avoid `Span` construction failure.
    """
    # Initialize sid generator to avoid Span throwing "sid_generator2 is not initialized"
    if sid_module.sid_generator2 is None:
        sid_module.sid_generator2 = _DummySidGen()  # type: ignore[assignment]
    monkeypatch.setenv("LANGFUSE_ENABLED", "true")
    monkeypatch.setenv("LANGFUSE_PUBLIC_KEY", "pk-test")
    monkeypatch.setenv("LANGFUSE_SECRET_KEY", "sk-test")
    monkeypatch.setenv("ASTRON_TRACE_CONTEXT_SECRET", "astron-trace-test-secret")


def _make_langfuse_ineffective(monkeypatch: pytest.MonkeyPatch, reason: str) -> None:
    """Apply one requested-but-unusable or explicitly disabled configuration."""

    if reason == "disabled":
        monkeypatch.setenv("LANGFUSE_ENABLED", "false")
    elif reason == "missing_credentials":
        monkeypatch.delenv("LANGFUSE_PUBLIC_KEY", raising=False)
        monkeypatch.delenv("LANGFUSE_SECRET_KEY", raising=False)
    elif reason == "invalid_host":
        monkeypatch.setenv("LANGFUSE_HOST", "https://user:password@example.test")
    else:
        monkeypatch.setenv("LANGFUSE_ENVIRONMENT", "Production EU")


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
            stream_options={"include_usage": True},
        )
        assert result == mock_response

    @pytest.mark.asyncio
    async def test_non_stream_completion_does_not_request_stream_usage(
        self, model: BaseLLMModel, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """The stream-only option must not leak into non-stream requests."""
        monkeypatch.delenv("DEFAULT_LLM_MAX_TOKEN", raising=False)
        mock_response = AsyncMock()
        model.llm.chat.completions.create = AsyncMock(return_value=mock_response)

        messages = [{"role": "user", "content": "test"}]
        result = await model.create_completion(messages, stream=False)

        model.llm.chat.completions.create.assert_awaited_once_with(
            messages=messages,
            stream=False,
            model="test_model",
            timeout=90,
        )
        assert result == mock_response

    @pytest.mark.asyncio
    async def test_disabled_langfuse_does_not_change_stream_request_body(
        self, model: BaseLLMModel, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Disabled Langfuse preserves the pre-integration provider request."""
        monkeypatch.setenv("LANGFUSE_ENABLED", "false")
        monkeypatch.delenv("DEFAULT_LLM_MAX_TOKEN", raising=False)
        mock_response = AsyncMock()
        model.llm.chat.completions.create = AsyncMock(return_value=mock_response)

        messages = [{"role": "user", "content": "test"}]
        result = await model.create_completion(messages, stream=True)

        model.llm.chat.completions.create.assert_awaited_once_with(
            messages=messages,
            stream=True,
            model="test_model",
            timeout=90,
        )
        assert result == mock_response

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "ineffective_reason",
        ["disabled", "missing_credentials", "invalid_host", "invalid_environment"],
    )
    async def test_ineffective_langfuse_does_not_change_stream_request_body(
        self,
        ineffective_reason: str,
        model: BaseLLMModel,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        """A requested but unusable exporter must preserve provider compatibility."""
        _make_langfuse_ineffective(monkeypatch, ineffective_reason)
        monkeypatch.delenv("DEFAULT_LLM_MAX_TOKEN", raising=False)
        mock_response = AsyncMock()
        model.llm.chat.completions.create = AsyncMock(return_value=mock_response)

        messages = [{"role": "user", "content": "test"}]
        result = await model.create_completion(messages, stream=True)

        model.llm.chat.completions.create.assert_awaited_once_with(
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
            stream_options={"include_usage": True},
        )
        assert result == mock_response

    @pytest.mark.parametrize(
        "error_text",
        [
            "Invalid parameter: stream_options.include_usage",
            "stream_options is not supported",
        ],
    )
    @pytest.mark.asyncio
    async def test_stream_usage_retries_only_when_provider_rejects_the_field(
        self,
        model: BaseLLMModel,
        monkeypatch: pytest.MonkeyPatch,
        error_text: str,
    ) -> None:
        """A strict endpoint gets one retry, then caches the capability."""
        monkeypatch.delenv("DEFAULT_LLM_MAX_TOKEN", raising=False)
        request = httpx.Request("POST", "https://provider.test/v1/chat/completions")
        response = httpx.Response(400, request=request)
        error = BadRequestError(
            error_text,
            response=response,
            body=error_text,
        )
        mock_response = AsyncMock()
        create = AsyncMock(side_effect=[error, mock_response, mock_response])
        model.llm.chat.completions.create = create
        messages = [{"role": "user", "content": "test"}]

        result = await model.create_completion(messages, stream=True)
        cached_result = await model.create_completion(messages, stream=True)

        assert create.await_count == 3
        first_request, fallback_request, cached_request = create.await_args_list
        assert first_request.kwargs["stream_options"] == {"include_usage": True}
        assert "stream_options" not in fallback_request.kwargs
        assert "stream_options" not in cached_request.kwargs
        assert result == mock_response
        assert cached_result == mock_response

    @pytest.mark.asyncio
    async def test_unrelated_bad_request_is_not_retried(
        self, model: BaseLLMModel, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Prompt/model errors must retain normal single-request semantics."""
        monkeypatch.delenv("DEFAULT_LLM_MAX_TOKEN", raising=False)
        request = httpx.Request("POST", "https://provider.test/v1/chat/completions")
        response = httpx.Response(400, request=request)
        error = BadRequestError(
            "Invalid model name",
            response=response,
            body={"message": "Invalid model name"},
        )
        create = AsyncMock(side_effect=error)
        model.llm.chat.completions.create = create

        with pytest.raises(BadRequestError):
            await model.create_completion(
                [{"role": "user", "content": "test"}], stream=True
            )

        create.assert_awaited_once()

    @pytest.mark.parametrize(
        "body",
        [
            {
                "message": "Unknown model requested",
                "request": {"stream_options": {"include_usage": True}},
            },
            'Unknown model; request={"stream_options":{"include_usage":true}}',
            'request={"stream_options":{"include_usage":true}}, unknown model',
            "request stream_options=true: unknown model",
            'stream_options={"include_usage":true}, model name unknown',
            'Unknown parameter temperature, request={"stream_options":true}',
            "Invalid field model, request stream_options=true",
            'Unsupported argument seed, input={"stream_options":true}',
            {
                "message": (
                    'Unknown model; request={"stream_options":'
                    '{"include_usage":true}}'
                ),
                "type": "invalid_request_error",
            },
        ],
    )
    @pytest.mark.asyncio
    async def test_reflected_stream_options_does_not_trigger_retry(
        self, model: BaseLLMModel, monkeypatch: pytest.MonkeyPatch, body: Any
    ) -> None:
        """An unrelated error plus an echoed request must not be conflated."""
        monkeypatch.delenv("DEFAULT_LLM_MAX_TOKEN", raising=False)
        request = httpx.Request("POST", "https://provider.test/v1/chat/completions")
        response = httpx.Response(400, request=request)
        error = BadRequestError(
            "Unknown model requested",
            response=response,
            body=body,
        )
        create = AsyncMock(side_effect=error)
        model.llm.chat.completions.create = create

        with pytest.raises(BadRequestError):
            await model.create_completion(
                [{"role": "user", "content": "test"}], stream=True
            )

        create.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_openai_wire_422_fallback_is_precise_and_cached(self) -> None:
        """Exercise a Pydantic-style 422 rejection through the real SDK."""
        bodies: list[dict[str, Any]] = []

        def handler(request: httpx.Request) -> httpx.Response:
            bodies.append(json.loads(request.content))
            if len(bodies) == 1:
                return httpx.Response(
                    422,
                    json={
                        "detail": [
                            {
                                "type": "extra_forbidden",
                                "loc": ["body", "stream_options"],
                                "msg": "Extra inputs are not permitted",
                                "input": {"include_usage": True},
                            }
                        ]
                    },
                    request=request,
                )
            event = {
                "id": "chatcmpl-synthetic",
                "object": "chat.completion.chunk",
                "created": 0,
                "model": "test-model",
                "choices": [],
                "usage": {
                    "prompt_tokens": 6,
                    "completion_tokens": 2,
                    "total_tokens": 8,
                },
            }
            content = f"data: {json.dumps(event)}\n\ndata: [DONE]\n\n"
            return httpx.Response(
                200,
                headers={"content-type": "text/event-stream"},
                content=content,
                request=request,
            )

        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            llm = AsyncOpenAI(
                api_key="synthetic",
                base_url="https://provider.test/v1",
                http_client=client,
            )
            model = BaseLLMModel.model_construct(name="test-model", llm=llm)
            first = [
                chunk
                async for chunk in model.stream(
                    [{"role": "user", "content": "test"}], stream=True
                )
            ]
            second = [
                chunk
                async for chunk in model.stream(
                    [{"role": "user", "content": "test"}], stream=True
                )
            ]

        assert len(bodies) == 3
        assert bodies[0]["stream_options"] == {"include_usage": True}
        assert "stream_options" not in bodies[1]
        assert "stream_options" not in bodies[2]
        assert first[0].usage is not None
        assert second[0].usage is not None
        assert first[0].usage.total_tokens == 8
        assert second[0].usage.total_tokens == 8

    @pytest.mark.asyncio
    async def test_openai_wire_requests_and_returns_stream_usage(self) -> None:
        """Exercise the real SDK wire body and its choices-less usage frame."""
        bodies: list[dict[str, Any]] = []

        def handler(request: httpx.Request) -> httpx.Response:
            bodies.append(json.loads(request.content))
            events = [
                {
                    "id": "chatcmpl-synthetic",
                    "object": "chat.completion.chunk",
                    "created": 0,
                    "model": "test-model",
                    "choices": [
                        {
                            "index": 0,
                            "delta": {"content": "hello"},
                            "finish_reason": None,
                        }
                    ],
                },
                {
                    "id": "chatcmpl-synthetic",
                    "object": "chat.completion.chunk",
                    "created": 0,
                    "model": "test-model",
                    "choices": [],
                    "usage": {
                        "prompt_tokens": 6,
                        "completion_tokens": 2,
                        "total_tokens": 8,
                    },
                },
            ]
            body = "".join(f"data: {json.dumps(event)}\n\n" for event in events)
            body += "data: [DONE]\n\n"
            return httpx.Response(
                200,
                headers={"content-type": "text/event-stream"},
                content=body,
                request=request,
            )

        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            llm = AsyncOpenAI(
                api_key="synthetic",
                base_url="https://provider.test/v1",
                http_client=client,
            )
            model = BaseLLMModel.model_construct(name="test-model", llm=llm)
            chunks = [
                chunk
                async for chunk in model.stream(
                    [{"role": "user", "content": "test"}], stream=True
                )
            ]

        assert bodies[0]["stream_options"] == {"include_usage": True}
        usage_chunks = [chunk for chunk in chunks if chunk.usage is not None]
        assert len(usage_chunks) == 1
        assert usage_chunks[0].choices == []
        assert usage_chunks[0].usage.total_tokens == 8

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
@pytest.mark.parametrize(
    "ineffective_reason",
    ["disabled", "missing_credentials", "invalid_host", "invalid_environment"],
)
async def test_ineffective_langfuse_does_not_add_anthropic_usage_frame(
    monkeypatch: pytest.MonkeyPatch,
    ineffective_reason: str,
) -> None:
    _make_langfuse_ineffective(monkeypatch, ineffective_reason)
    response = _sse_response(
        [
            (
                "message_start",
                {
                    "type": "message_start",
                    "message": {"content": [], "usage": {"input_tokens": 5}},
                },
            ),
            (
                "message_delta",
                {
                    "type": "message_delta",
                    "delta": {"stop_reason": "end_turn"},
                    "usage": {"output_tokens": 2},
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

    assert chunks
    assert all(chunk.usage is None for chunk in chunks)
    assert all(chunk.choices for chunk in chunks)


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


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "ineffective_reason",
    ["disabled", "missing_credentials", "invalid_host", "invalid_environment"],
)
async def test_ineffective_langfuse_does_not_add_google_usage_frame(
    monkeypatch: pytest.MonkeyPatch,
    ineffective_reason: str,
) -> None:
    _make_langfuse_ineffective(monkeypatch, ineffective_reason)
    payload = {
        "candidates": [
            {"content": {"parts": [{"text": "done"}]}, "finishReason": "STOP"}
        ],
        "usageMetadata": {
            "promptTokenCount": 3,
            "candidatesTokenCount": 1,
            "totalTokenCount": 4,
        },
    }
    response = httpx.Response(
        200,
        headers={"content-type": "text/event-stream"},
        content=f"data: {json.dumps(payload)}\n\n",
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

    assert chunks
    assert all(chunk.usage is None for chunk in chunks)
    assert all(chunk.choices for chunk in chunks)
