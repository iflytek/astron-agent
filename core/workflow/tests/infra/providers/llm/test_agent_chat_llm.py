"""The real HTTP/SSE transport against a controlled streaming HTTP server."""

import asyncio
import json
from collections.abc import AsyncGenerator, AsyncIterator
from typing import Any, Literal, Protocol
from unittest.mock import Mock

import httpx
import pytest

from workflow.engine.nodes.entities.llm_response import LLMResponse
from workflow.engine.nodes.llm.spark_llm_node import SparkLLMNode
from workflow.exception.e import CustomException
from workflow.infra.providers.llm.agent_chat_llm import AgentChatAI


class BytesStream(httpx.AsyncByteStream):
    def __init__(self, data: bytes, *, block: bool = False) -> None:
        self.data = data
        self.block = block
        self.closed = False

    async def __aiter__(self) -> AsyncIterator[bytes]:
        # Split across UTF-8 characters, JSON tokens and SSE frame boundaries.
        for offset in range(0, len(self.data), 7):
            yield self.data[offset : offset + 7]
        if self.block:
            await asyncio.Event().wait()

    async def aclose(self) -> None:
        self.closed = True


def frame(content: str = "", finish: str | None = None, **extra: object) -> str:
    return (
        "data: "
        + json.dumps(
            {
                "code": 0,
                "choices": [{"delta": {"content": content}, "finish_reason": finish}],
                **extra,
            },
            ensure_ascii=False,
        )
        + "\r\n\r\n"
    )


def adapter(
    provider: Literal["openai", "anthropic", "google"] = "openai",
) -> AgentChatAI:
    return AgentChatAI(
        provider=provider,
        model_url="https://model.example/v1/chat/completions",
        model_name="any-user-configured-name",
        temperature=0.3,
        app_id="tenant-1",
        api_key="model-secret",
        api_secret="",
        max_tokens=200,
        top_k=4,
        uid="user-1",
        node_id="spark-llm::node-1",
    )


class ConfigureTransport(Protocol):
    """Configure a response body with optional HTTP status and blocking."""

    def __call__(
        self, data: str, status: int = 200, block: bool = False
    ) -> BytesStream:
        """Install and return the controlled response stream."""
        ...


TransportFixture = tuple[ConfigureTransport, list[httpx.Request], list[BytesStream]]


@pytest.fixture
def transport(monkeypatch: pytest.MonkeyPatch) -> TransportFixture:
    monkeypatch.setenv("WORKFLOW_INTERNAL_API_KEY", "i" * 48)
    monkeypatch.delenv("WORKFLOW_INTERNAL_API_KEY_FILE", raising=False)
    monkeypatch.setenv("AGENT_BASE_URL", "http://agent.example")
    requests: list[httpx.Request] = []
    streams: list[BytesStream] = []

    def configure(data: str, status: int = 200, block: bool = False) -> BytesStream:
        stream = BytesStream(data.encode(), block=block)
        streams.append(stream)

        async def handler(request: httpx.Request) -> httpx.Response:
            requests.append(request)
            return httpx.Response(
                status, headers={"content-type": "text/event-stream"}, stream=stream
            )

        monkeypatch.setattr(
            AgentChatAI,
            "_client",
            staticmethod(
                lambda timeout: httpx.AsyncClient(
                    transport=httpx.MockTransport(handler)
                )
            ),
        )
        return stream

    return configure, requests, streams


def responses(client: AgentChatAI, **kwargs: Any) -> AsyncGenerator[LLMResponse, None]:
    return client.achat(
        "flow-1",
        [
            {"role": "system", "content": "system instruction"},
            {"role": "user", "content": "hello"},
        ],
        Mock(sid="run-1"),
        **kwargs,
    )


@pytest.mark.asyncio
async def test_complete_stream_preserves_parameters_usage_and_closes_before_terminal(
    transport: TransportFixture,
) -> None:
    configure, requests, _ = transport
    usage = {"prompt_tokens": 3, "completion_tokens": 2, "total_tokens": 5}
    stream = configure(
        ": heartbeat\r\n\r\n"
        + frame("你好")
        + frame(finish="stop", usage=usage)
        + "data: [DONE]\r\n\r\n"
    )
    results = []
    async for response in responses(
        adapter(), extra_params={"temperature": 0, "max_tokens": 42}
    ):
        results.append(response.msg)
        if response.msg["choices"][0]["finish_reason"]:
            assert stream.closed
    assert results[0]["choices"][0]["delta"]["content"] == "你好"
    assert results[-1]["usage"] == usage
    request = requests[0]
    assert str(request.url) == "http://agent.example/agent/v1/llm/chat/completions"
    assert request.headers["X-Workflow-Internal-Key"] == "i" * 48
    assert request.headers["x-consumer-username"] == "tenant-1"
    body = json.loads(request.content)
    assert body["model_config"]["provider"] == "openai"
    assert body["model_config"]["api_key"] == "model-secret"
    assert body["parameters"] == {"temperature": 0, "max_tokens": 42}
    assert body["messages"][0]["role"] == "system"
    assert body["meta_data"]["node_id"] == "spark-llm::node-1"
    assert len(requests) == 1


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "data",
    [
        "data: [DONE]\n\n",
        frame("partial"),
        frame("partial") + "data: [DONE]\n\n",
        frame("partial") + frame(finish="stop"),
        frame(finish="stop") + "data: [DONE]\n\n",
        frame("partial") + 'data: {"code": 1, "message": "model-secret"}\n\n',
        frame("partial") + "data: invalid-json\n\n",
        frame("answer")
        + frame(finish="stop")
        + frame("unexpected")
        + "data: [DONE]\n\n",
    ],
)
async def test_failed_or_incomplete_stream_never_yields_success(
    transport: TransportFixture, data: str
) -> None:
    configure, requests, _ = transport
    stream = configure(data)
    output = []
    with pytest.raises(CustomException) as error:
        async for response in responses(adapter()):
            output.append(response.msg)
    assert "model-secret" not in str(error.value)
    assert not any(item["choices"][0]["finish_reason"] for item in output)
    assert stream.closed
    assert len(requests) == 1


@pytest.mark.asyncio
async def test_http_failure_does_not_expose_body_or_retry(
    transport: TransportFixture,
) -> None:
    configure, requests, _ = transport
    stream = configure("model-secret", status=401)
    with pytest.raises(CustomException, match="HTTP 401"):
        _ = [item async for item in responses(adapter())]
    assert stream.closed
    assert len(requests) == 1


@pytest.mark.asyncio
async def test_cancel_closes_active_connection(transport: TransportFixture) -> None:
    configure, _, _ = transport
    stream = configure(frame("partial"), block=True)
    iterator = responses(adapter())
    assert (await anext(iterator)).msg["choices"][0]["delta"]["content"] == "partial"
    pending = asyncio.create_task(anext(iterator))
    await asyncio.sleep(0)
    pending.cancel()
    with pytest.raises(asyncio.CancelledError):
        await pending
    await iterator.aclose()
    assert stream.closed


@pytest.mark.asyncio
async def test_consumer_close_releases_connection(transport: TransportFixture) -> None:
    configure, _, _ = transport
    stream = configure(frame("partial"), block=True)
    iterator = responses(adapter())
    await anext(iterator)
    await iterator.aclose()
    assert stream.closed


@pytest.mark.asyncio
async def test_missing_internal_key_stops_before_network(
    transport: TransportFixture, monkeypatch: pytest.MonkeyPatch
) -> None:
    _, requests, _ = transport
    monkeypatch.delenv("WORKFLOW_INTERNAL_API_KEY")
    with pytest.raises(CustomException, match="authentication"):
        _ = [item async for item in responses(adapter())]
    assert not requests


def test_media_history_and_current_inputs_preserve_order_without_mutation() -> None:
    messages = [
        {"role": "user", "content": "https://example/image", "content_type": "image"},
        {"role": "user", "content": "describe"},
    ]
    body = adapter("google")._request_body(
        messages,
        [{"type": "video", "url": "https://example/video"}],
        {},
        90,
        "f",
        Mock(sid="r"),
    )
    assert body["messages"][0]["content"] == [
        {"type": "image", "url": "https://example/image"}
    ]
    assert body["messages"][1]["content"] == [
        {"type": "text", "text": "describe"},
        {"type": "video", "url": "https://example/video"},
    ]
    assert messages[0]["content_type"] == "image"
    assert body["parameters"]["top_k"] == 4


def test_model_node_always_uses_agent_transport() -> None:
    node = SparkLLMNode(
        input_identifier=[],
        output_identifier=["answer"],
        domain="arbitrary-model",
        appId="app",
        source="openai",
        url="https://model.example/v1",
        apiKey="key",
    )
    client = node._get_chat_ai("user")
    assert isinstance(client, AgentChatAI)
    assert client.remote
    assert client.model_name == "arbitrary-model"
