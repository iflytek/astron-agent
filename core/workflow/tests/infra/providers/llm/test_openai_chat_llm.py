"""Tests for the OpenAI-compatible chat provider."""

import importlib
import sys
from typing import TYPE_CHECKING, Any

import pytest
from openai.types.chat import ChatCompletionChunk

from workflow.consts.engine.chat_status import SparkLLMStatus
from workflow.engine.nodes.util.frame_processor import OpenAIFrameProcessor
from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum

OPENAI_CHAT_MODULE = "workflow.infra.providers.llm.openai.openai_chat_llm"
if getattr(sys.modules.get(OPENAI_CHAT_MODULE), "__spec__", None) is None:
    # The factory tests install a spec-less fake module during test collection.
    sys.modules.pop(OPENAI_CHAT_MODULE, None)
if TYPE_CHECKING:
    from workflow.infra.providers.llm.openai.openai_chat_llm import OpenAIChatAI
else:
    OpenAIChatAI = importlib.import_module(OPENAI_CHAT_MODULE).OpenAIChatAI


class EmptyAsyncStream:
    async def __anext__(self) -> None:
        raise StopAsyncIteration


class AsyncChunkStream:
    def __init__(self, chunks: list[ChatCompletionChunk]) -> None:
        self._chunks = iter(chunks)

    async def __anext__(self) -> ChatCompletionChunk:
        try:
            return next(self._chunks)
        except StopIteration:
            raise StopAsyncIteration from None


class RecordingSpan:
    async def add_info_events_async(self, _: dict[str, Any]) -> None:
        pass


def build_openai_chat_ai() -> OpenAIChatAI:
    return OpenAIChatAI(
        model_url="https://example.com/v1/chat/completions",
        model_name="openai/test-model",
        temperature=1,
        app_id="",
        api_key="test-key",
        api_secret="",
        max_tokens=256,
        top_k=1,
        uid="test-user",
    )


def build_chunk(
    choices: list[dict[str, Any]],
    usage: dict[str, int] | None = None,
) -> ChatCompletionChunk:
    return ChatCompletionChunk.model_validate(
        {
            "id": "chatcmpl-test",
            "choices": choices,
            "created": 0,
            "model": "openai/test-model",
            "object": "chat.completion.chunk",
            "usage": usage,
        }
    )


async def process_frames(
    chat_ai: OpenAIChatAI,
    chunks: list[ChatCompletionChunk],
) -> list[tuple[dict[str, Any], Any]]:
    processor = OpenAIFrameProcessor()
    processed = []
    async for response in chat_ai._process_stream(  # noqa: SLF001
        AsyncChunkStream(chunks),
        span=RecordingSpan(),  # type: ignore[arg-type]
    ):
        processed.append((response.msg, processor.process_frame(response.msg)))
    return processed


def test_decode_message_accepts_usage_only_stream_chunk() -> None:
    usage = {
        "prompt_tokens": 8,
        "completion_tokens": 4,
        "total_tokens": 12,
    }

    (
        status,
        content,
        reasoning_content,
        token_usage,
    ) = build_openai_chat_ai().decode_message(
        {
            "choices": [],
            "usage": usage,
        }
    )

    assert status == ""
    assert content == ""
    assert reasoning_content == ""
    assert token_usage == usage


@pytest.mark.asyncio
async def test_process_stream_normalizes_usage_chunk_before_stop() -> None:
    usage = {
        "prompt_tokens": 8,
        "completion_tokens": 4,
        "total_tokens": 12,
    }

    processed = await process_frames(
        build_openai_chat_ai(),
        [
            build_chunk(
                [
                    {
                        "delta": {"content": "Hello"},
                        "finish_reason": None,
                        "index": 0,
                    }
                ]
            ),
            build_chunk([], usage),
            build_chunk(
                [
                    {
                        "delta": {},
                        "finish_reason": "stop",
                        "index": 0,
                    }
                ]
            ),
        ],
    )

    assert [frame.text["content"] for _, frame in processed] == ["Hello", ""]
    assert processed[-1][1].status == SparkLLMStatus.END.value
    assert processed[-1][0]["usage"]["total_tokens"] == 12
    assert all(message["choices"] for message, _ in processed)


@pytest.mark.asyncio
async def test_process_stream_normalizes_usage_chunk_before_eof() -> None:
    processed = await process_frames(
        build_openai_chat_ai(),
        [
            build_chunk(
                [
                    {
                        "delta": {"content": "Hello"},
                        "finish_reason": None,
                        "index": 0,
                    }
                ]
            ),
            build_chunk(
                [],
                {
                    "prompt_tokens": 8,
                    "completion_tokens": 4,
                    "total_tokens": 12,
                },
            ),
        ],
    )

    assert [frame.text["content"] for _, frame in processed] == ["Hello", ""]
    assert processed[-1][1].status == SparkLLMStatus.END.value
    assert processed[-1][0]["usage"]["total_tokens"] == 12
    assert all(message["choices"] for message, _ in processed)


@pytest.mark.asyncio
async def test_process_stream_rejects_response_without_sse_chunks() -> None:
    chat_ai = build_openai_chat_ai()

    with pytest.raises(CustomException) as exc_info:
        [
            response
            async for response in chat_ai._process_stream(  # noqa: SLF001
                EmptyAsyncStream(),
                span=None,  # type: ignore[arg-type]
            )
        ]

    assert exc_info.value.code == CodeEnum.OPEN_AI_REQUEST_ERROR.code
    assert exc_info.value.cause_error == "LLM stream returned no data"
