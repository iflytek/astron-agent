"""Tests that streaming requests ask OpenAI-compatible providers for usage."""

import importlib
import sys
from typing import TYPE_CHECKING, Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

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

    async def aclose(self) -> None:
        pass


class RecordingSpan:
    async def add_info_events_async(self, _: dict[str, Any]) -> None:
        pass

    def add_error_events(self, _: dict[str, Any]) -> None:
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


async def run_recv_messages(extra_params: dict) -> AsyncMock:
    """Drive _recv_messages against a mocked client; return the create mock."""
    create_mock = AsyncMock(return_value=EmptyAsyncStream())
    client = MagicMock()
    client.chat.completions.create = create_mock
    client.close = AsyncMock()

    chat_ai = build_openai_chat_ai()
    with patch("openai.AsyncOpenAI", return_value=client):
        with pytest.raises(Exception):
            # Empty stream makes _build_final_stream_frame raise; we only
            # care that the create call was issued with the right kwargs.
            async for _ in chat_ai._recv_messages(  # noqa: SLF001
                "https://example.com/v1",
                [{"role": "user", "content": "hi"}],
                extra_params,
                RecordingSpan(),
            ):
                pass
    return create_mock


@pytest.mark.asyncio
async def test_recv_messages_defaults_include_usage() -> None:
    extra_params: dict = {"temperature": 0.5}
    create_mock = await run_recv_messages(extra_params)

    assert create_mock.call_args.kwargs["stream_options"] == {"include_usage": True}
    # The caller's dict must not be mutated in place.
    assert "stream_options" not in extra_params


@pytest.mark.asyncio
async def test_recv_messages_respects_caller_stream_options() -> None:
    caller_options = {"include_usage": False}
    create_mock = await run_recv_messages({"stream_options": caller_options})

    assert create_mock.call_args.kwargs["stream_options"] is caller_options
