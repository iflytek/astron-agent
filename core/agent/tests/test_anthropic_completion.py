"""Real Anthropic SDK streams over a controlled public HTTP transport."""

import asyncio
import json
from typing import Any, AsyncIterator

import httpx2
import pytest
from anthropic import AsyncAnthropic

from agent.api.schemas.llm_completion_inputs import LLMCompletionInputs
from agent.service.llm_completion import LLMCompletion


def _body() -> dict[str, Any]:
    return {
        "model_config": {
            "provider": "anthropic",
            "domain": "user-model",
            "api": "https://models.example/v1/messages",
            "api_key": "local-test-key",
        },
        "messages": [
            {"role": "system", "content": "Exact instruction"},
            {"role": "user", "content": "earlier"},
            {
                "role": "assistant",
                "content": [
                    {
                        "type": "thinking",
                        "thinking": "earlier thought",
                        "signature": "signed",
                    },
                    {"type": "text", "text": "earlier answer"},
                ],
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "next"},
                    {"type": "image", "url": "https://media.example/image.png"},
                    {"type": "image", "base64": "aW1hZ2U=", "mime_type": "image/png"},
                ],
            },
        ],
        "parameters": {
            "temperature": 0,
            "max_tokens": 2048,
            "top_k": 3,
            "stop": "END",
            "thinking": {"type": "enabled", "budget_tokens": 1024},
            "reasoning_effort": "high",
        },
        "timeout": 5,
    }


def _events(
    *, final_usage: dict[str, int] | None = None, reason: str = "end_turn"
) -> list[dict[str, Any]]:
    return [
        {
            "type": "message_start",
            "message": {
                "id": "msg_test",
                "type": "message",
                "role": "assistant",
                "content": [],
                "model": "user-model",
                "stop_reason": None,
                "stop_sequence": None,
                "usage": {
                    "input_tokens": 7,
                    "output_tokens": 1,
                    "cache_creation_input_tokens": 2,
                    "cache_read_input_tokens": 3,
                },
            },
        },
        {
            "type": "content_block_start",
            "index": 0,
            "content_block": {"type": "thinking", "thinking": "", "signature": ""},
        },
        {
            "type": "content_block_delta",
            "index": 0,
            "delta": {"type": "thinking_delta", "thinking": "Reason"},
        },
        {
            "type": "content_block_delta",
            "index": 0,
            "delta": {"type": "signature_delta", "signature": "new-signature"},
        },
        {"type": "content_block_stop", "index": 0},
        {
            "type": "content_block_start",
            "index": 1,
            "content_block": {"type": "text", "text": ""},
        },
        {
            "type": "content_block_delta",
            "index": 1,
            "delta": {"type": "text_delta", "text": "Hello"},
        },
        {"type": "content_block_stop", "index": 1},
        {
            "type": "message_delta",
            "delta": {"stop_reason": reason, "stop_sequence": None},
            "usage": final_usage or {"output_tokens": 2},
        },
        {"type": "message_stop"},
    ]


class EventBody(httpx2.AsyncByteStream):
    def __init__(self, events: list[dict[str, Any]], block: bool = False) -> None:
        self.events = events
        self.block = block
        self.waiting = asyncio.Event()
        self.closed = False

    async def __aiter__(self) -> AsyncIterator[bytes]:
        for event in self.events:
            yield (f"event: {event['type']}\ndata: {json.dumps(event)}\n\n").encode()
        if self.block:
            self.waiting.set()
            await asyncio.Event().wait()

    async def aclose(self) -> None:
        self.closed = True


def _install(
    monkeypatch: pytest.MonkeyPatch, body: EventBody, status: int = 200
) -> tuple[list[dict[str, Any]], list[AsyncAnthropic]]:
    requests: list[dict[str, Any]] = []
    clients: list[AsyncAnthropic] = []

    def respond(request: httpx2.Request) -> httpx2.Response:
        assert str(request.url) == "https://models.example/v1/messages"
        requests.append(json.loads(request.content))
        return httpx2.Response(
            status, headers={"content-type": "text/event-stream"}, stream=body
        )

    def create(**kwargs: Any) -> AsyncAnthropic:
        assert kwargs["max_retries"] == 0
        client = AsyncAnthropic(
            **kwargs,
            http_client=httpx2.AsyncClient(transport=httpx2.MockTransport(respond)),
        )
        clients.append(client)
        return client

    monkeypatch.setattr("agent.service.anthropic_completion.AsyncAnthropic", create)
    return requests, clients


async def _run(body: dict[str, Any]) -> list[dict[str, Any]]:
    inputs = LLMCompletionInputs.model_validate(body)
    return [
        json.loads(frame.removeprefix("data: "))
        async for frame in LLMCompletion(inputs, "app").stream()
        if "[DONE]" not in frame
    ]


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "final_usage,expected,reason,finish",
    [
        ({"output_tokens": 2}, 14, "end_turn", "stop"),
        (
            {
                "input_tokens": 11,
                "cache_creation_input_tokens": 4,
                "cache_read_input_tokens": 5,
                "output_tokens": 2,
            },
            22,
            "max_tokens",
            "length",
        ),
    ],
)
async def test_real_sdk_preserves_initial_and_final_usage(
    monkeypatch: pytest.MonkeyPatch,
    final_usage: dict[str, int],
    expected: int,
    reason: str,
    finish: str,
) -> None:
    body = EventBody(_events(final_usage=final_usage, reason=reason))
    requests, clients = _install(monkeypatch, body)
    frames = await _run(_body())
    assert all(frame["code"] == 0 for frame in frames), frames
    assert len(requests) == 1
    request = requests[0]
    assert request["system"] == "Exact instruction"
    assert [m["role"] for m in request["messages"]] == ["user", "assistant", "user"]
    assert request["messages"][1]["content"] == _body()["messages"][2]["content"]
    assert request["messages"][-1]["content"] == [
        {"type": "text", "text": "next"},
        {
            "type": "image",
            "source": {"type": "url", "url": "https://media.example/image.png"},
        },
        {
            "type": "image",
            "source": {"type": "base64", "media_type": "image/png", "data": "aW1hZ2U="},
        },
    ]
    assert request["temperature"] == 0 and request["top_k"] == 3
    assert request["stop_sequences"] == ["END"]
    assert request["thinking"] == {"type": "enabled", "budget_tokens": 1024}
    assert request["output_config"] == {"effort": "high"}
    assert "tools" not in request and request["max_tokens"] == 2048
    assert (
        "".join(f["choices"][0]["delta"].get("content", "") for f in frames) == "Hello"
    )
    assert (
        "".join(f["choices"][0]["delta"].get("reasoning_content", "") for f in frames)
        == "Reason"
    )
    assert frames[-1]["usage"] == {
        "prompt_tokens": expected - 2,
        "completion_tokens": 2,
        "total_tokens": expected,
    }
    assert frames[-1]["choices"][0]["finish_reason"] == finish
    assert body.closed and clients[0].is_closed()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "failure", ["truncated", "tool", "tool_stop", "error", "timeout"]
)
async def test_real_sdk_failure_never_reports_success(
    monkeypatch: pytest.MonkeyPatch, failure: str
) -> None:
    events = _events()
    if failure == "tool_stop":
        events[-2]["delta"]["stop_reason"] = "tool_use"
    if failure == "tool":
        events[1]["content_block"] = {
            "type": "tool_use",
            "id": "call",
            "name": "forbidden",
            "input": {},
        }
    if failure in {"truncated", "timeout"}:
        events = events[:-1]
    stream = EventBody(events, block=failure == "timeout")
    requests, clients = _install(
        monkeypatch, stream, status=500 if failure == "error" else 200
    )
    request = _body()
    if failure == "timeout":
        request["timeout"] = 0.1
    frames = await _run(request)
    assert frames[-1]["code"] == 1, frames
    assert not any(f.get("choices", [{}])[0].get("finish_reason") for f in frames)
    assert len(requests) == 1
    assert stream.closed and clients[0].is_closed()


@pytest.mark.asyncio
async def test_real_sdk_cancellation_closes_stream_and_client(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    stream = EventBody(_events()[:-1], block=True)
    _, clients = _install(monkeypatch, stream)
    task = asyncio.create_task(_run(_body()))
    await asyncio.wait_for(stream.waiting.wait(), timeout=2)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task
    assert stream.closed and clients[0].is_closed()
