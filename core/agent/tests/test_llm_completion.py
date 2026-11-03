"""Direct-model API contracts using official LangChain streaming messages."""

import asyncio
import json
from typing import Any, AsyncIterator

import httpx
import pytest
from fastapi import FastAPI
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessageChunk, BaseMessage
from langchain_core.outputs import ChatGenerationChunk, ChatResult
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
from pydantic import Field, ValidationError

from agent.api.schemas.llm_completion_inputs import LLMCompletionInputs
from agent.api.v1.llm_completion import llm_completion_router
from agent.domain.models.providers import ModelHandle, create_provider_model
from agent.service.llm_completion import LLMCompletion


class ScriptModel(BaseChatModel):
    frames: list[AIMessageChunk]
    seen: list[BaseMessage] = Field(default_factory=list)
    delay: float = 0
    fail: bool = False
    closed: bool = False

    @property
    def _llm_type(self) -> str:
        return "plain-chat-without-tools"

    def _generate(self, *args: Any, **kwargs: Any) -> ChatResult:
        raise NotImplementedError

    async def _astream(
        self,
        messages: list[BaseMessage],
        stop: list[str] | None = None,
        run_manager: Any = None,
        **kwargs: Any,
    ) -> AsyncIterator[ChatGenerationChunk]:
        self.seen.extend(messages)
        try:
            for frame in self.frames:
                await asyncio.sleep(self.delay)
                yield ChatGenerationChunk(message=frame)
            if self.fail:
                raise RuntimeError("sensitive-api-key-in-provider-exception")
        finally:
            self.closed = True


def request_body(**overrides: Any) -> dict[str, Any]:
    body: dict[str, Any] = {
        "model_config": {
            "provider": "openai",
            "domain": "user-configured-model",
            "api": "https://models.example/v1/chat/completions",
            "api_key": "private-model-key",
        },
        "messages": [
            {"role": "system", "content": "Keep my exact instruction"},
            {"role": "user", "content": "first"},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "second"},
                    {
                        "type": "image_url",
                        "image_url": {"url": "https://media.example/image.png"},
                    },
                ],
            },
        ],
        "parameters": {"temperature": 0, "max_tokens": 24},
        "meta_data": {
            "caller": "workflow-llm-node",
            "workflow_id": "flow",
            "node_id": "node",
        },
    }
    body.update(overrides)
    return body


def parse_frames(frames: list[str]) -> list[dict[str, Any]]:
    return [
        json.loads(frame.removeprefix("data: "))
        for frame in frames
        if "[DONE]" not in frame
    ]


def install_model(
    monkeypatch: pytest.MonkeyPatch, model: ScriptModel
) -> list[dict[str, Any]]:
    calls: list[dict[str, Any]] = []

    async def create(**kwargs: Any) -> ModelHandle:
        calls.append(kwargs)
        return ModelHandle(
            model, kwargs["model_name"], kwargs["provider"], kwargs["http_client"]
        )

    monkeypatch.setattr("agent.service.llm_completion.create_provider_model", create)
    return calls


@pytest.mark.asyncio
async def test_direct_model_preserves_messages_and_trailing_usage(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    model = ScriptModel(
        frames=[
            AIMessageChunk(
                content=[
                    {"type": "text", "text": "answer"},
                    {"type": "reasoning", "reasoning": "reason"},
                ]
            ),
            AIMessageChunk(content="", response_metadata={"finish_reason": "stop"}),
            AIMessageChunk(
                content="",
                usage_metadata={
                    "input_tokens": 7,
                    "output_tokens": 3,
                    "total_tokens": 10,
                },
            ),
        ]
    )
    calls = install_model(monkeypatch, model)
    inputs = LLMCompletionInputs.model_validate(request_body())
    frames = [frame async for frame in LLMCompletion(inputs, "app").stream()]
    parsed = parse_frames(frames)

    assert len(calls) == 1
    assert calls[0]["max_retries"] == 0
    assert calls[0]["parameters"] == {"temperature": 0, "max_tokens": 24}
    assert [message.type for message in model.seen] == ["system", "human", "human"]
    assert model.seen[0].content == "Keep my exact instruction"
    assert model.seen[-1].content == inputs.messages[-1].content
    assert parsed[0]["choices"][0]["delta"] == {
        "content": "answer",
        "reasoning_content": "reason",
    }
    assert parsed[-1]["usage"] == {
        "prompt_tokens": 7,
        "completion_tokens": 3,
        "total_tokens": 10,
    }
    assert parsed[-1]["choices"][0]["finish_reason"] == "stop"
    assert frames[-1] == "data: [DONE]\n\n"
    assert model.closed and calls[0]["http_client"].is_closed


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "reason,expected",
    [
        ("STOP", "stop"),
        ("end_turn", "stop"),
        ("max_tokens", "length"),
        ("content_filter", "content_filter"),
    ],
)
async def test_end_reasons_and_additive_usage(
    monkeypatch: pytest.MonkeyPatch, reason: str, expected: str
) -> None:
    model = ScriptModel(
        frames=[
            AIMessageChunk(
                content="a",
                usage_metadata={
                    "input_tokens": 4,
                    "output_tokens": 0,
                    "total_tokens": 4,
                },
            ),
            AIMessageChunk(
                content="b",
                response_metadata={"stop_reason": reason},
                usage_metadata={
                    "input_tokens": 0,
                    "output_tokens": 2,
                    "total_tokens": 2,
                },
            ),
        ]
    )
    install_model(monkeypatch, model)
    frames = parse_frames(
        [
            frame
            async for frame in LLMCompletion(
                LLMCompletionInputs.model_validate(request_body()), "app"
            ).stream()
        ]
    )
    assert frames[-1]["choices"][0]["finish_reason"] == expected
    assert frames[-1]["usage"]["total_tokens"] == 6


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "frames,fail",
    [
        ([], False),
        ([AIMessageChunk(content="partial")], False),
        ([AIMessageChunk(content="partial")], True),
        (
            [AIMessageChunk(content="", response_metadata={"finish_reason": "stop"})],
            False,
        ),
        (
            [
                AIMessageChunk(
                    content=[{"type": "reasoning", "reasoning": "only thinking"}],
                    response_metadata={"finish_reason": "stop"},
                )
            ],
            False,
        ),
        (
            [
                AIMessageChunk(
                    content="",
                    tool_call_chunks=[
                        {"name": "unexpected", "args": "{}", "id": "tool", "index": 0}
                    ],
                )
            ],
            False,
        ),
    ],
)
async def test_incomplete_or_failed_stream_never_reports_success(
    monkeypatch: pytest.MonkeyPatch, frames: list[AIMessageChunk], fail: bool
) -> None:
    model = ScriptModel(frames=frames, fail=fail)
    calls = install_model(monkeypatch, model)
    output = [
        frame
        async for frame in LLMCompletion(
            LLMCompletionInputs.model_validate(request_body()), "app"
        ).stream()
    ]
    assert parse_frames(output)[-1]["code"] != 0
    assert "sensitive-api-key" not in "".join(output)
    assert not any(
        frame.get("choices", [{}])[0].get("finish_reason")
        for frame in parse_frames(output)
    )
    assert model.closed and calls[0]["http_client"].is_closed


@pytest.mark.asyncio
async def test_unknown_usage_is_not_fabricated(monkeypatch: pytest.MonkeyPatch) -> None:
    model = ScriptModel(
        frames=[
            AIMessageChunk(content="ok", response_metadata={"finish_reason": "stop"})
        ]
    )
    install_model(monkeypatch, model)
    output = parse_frames(
        [
            frame
            async for frame in LLMCompletion(
                LLMCompletionInputs.model_validate(request_body()), "app"
            ).stream()
        ]
    )
    assert "usage" not in output[-1]


@pytest.mark.asyncio
async def test_timeout_closes_provider(monkeypatch: pytest.MonkeyPatch) -> None:
    model = ScriptModel(frames=[AIMessageChunk(content="too late")], delay=0.1)
    calls = install_model(monkeypatch, model)
    output = [
        frame
        async for frame in LLMCompletion(
            LLMCompletionInputs.model_validate(request_body(timeout=0.01)), "app"
        ).stream()
    ]
    assert parse_frames(output)[-1]["code"] != 0
    assert model.closed and calls[0]["http_client"].is_closed


@pytest.mark.asyncio
async def test_consumer_cancellation_closes_provider(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    model = ScriptModel(
        frames=[
            AIMessageChunk(content="a"),
            AIMessageChunk(content="b"),
            AIMessageChunk(content="c"),
        ]
    )
    calls = install_model(monkeypatch, model)
    stream = LLMCompletion(
        LLMCompletionInputs.model_validate(request_body()), "app"
    ).stream()
    await anext(stream)
    await stream.aclose()
    assert model.closed and calls[0]["http_client"].is_closed


@pytest.mark.asyncio
async def test_endpoint_requires_auth_and_preserves_sse(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("WORKFLOW_INTERNAL_API_KEY", "a" * 32)
    model = ScriptModel(
        frames=[
            AIMessageChunk(content="ok", response_metadata={"finish_reason": "stop"})
        ]
    )
    calls = install_model(monkeypatch, model)
    app = FastAPI()
    app.include_router(llm_completion_router, prefix="/agent/v1")
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        missing = await client.post(
            "/agent/v1/llm/chat/completions",
            json=request_body(),
            headers={"x-consumer-username": "app"},
        )
        assert missing.status_code == 401
        assert not calls
        response = await client.post(
            "/agent/v1/llm/chat/completions",
            json=request_body(),
            headers={"x-consumer-username": "app", "X-Workflow-Internal-Key": "a" * 32},
        )
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/event-stream")
        assert response.text.endswith("data: [DONE]\n\n")
        invalid = await client.post(
            "/agent/v1/llm/chat/completions",
            json=request_body(parameters={"top_k": 3}),
            headers={"x-consumer-username": "app", "X-Workflow-Internal-Key": "a" * 32},
        )
        assert invalid.status_code == 422
        assert "private-model-key" not in invalid.text


@pytest.mark.parametrize(
    "parameters",
    [{"tools": []}, {"api_key": "override"}, {"top_k": 3}, {"model": "override"}],
)
def test_parameter_contract_blocks_transport_and_tool_overrides(
    parameters: dict[str, Any]
) -> None:
    with pytest.raises(ValidationError):
        LLMCompletionInputs.model_validate(request_body(parameters=parameters))


@pytest.mark.parametrize(
    "endpoint",
    [
        "ws://models.example",
        "https://user:secret@models.example",
        "https://models.example?key=secret",
        "missing-host",
    ],
)
def test_endpoint_has_common_http_contract(endpoint: str) -> None:
    body = request_body()
    body["model_config"]["api"] = endpoint
    with pytest.raises(ValidationError):
        LLMCompletionInputs.model_validate(body)


@pytest.mark.asyncio
async def test_request_options_reach_official_model_without_changing_agent_defaults() -> (
    None
):
    client = httpx.AsyncClient()
    handle = await create_provider_model(
        model_name="generic",
        base_url="https://models.example/v1/chat/completions",
        provider="openai",
        api_key="key",
        http_client=client,
        parameters={
            "temperature": 0,
            "max_tokens": 20,
            "response_format": {"type": "json_object"},
        },
        timeout=12,
        max_retries=0,
    )
    try:
        assert handle.model.temperature == 0  # type: ignore[attr-defined]
        assert handle.model.max_tokens == 20  # type: ignore[attr-defined]
        assert handle.model.max_retries == 0  # type: ignore[attr-defined]
        assert handle.model.model_kwargs == {"response_format": {"type": "json_object"}}  # type: ignore[attr-defined]
    finally:
        await handle.aclose()
    assert client.is_closed


@pytest.mark.asyncio
@pytest.mark.parametrize("stop", ["END", ["END", "STOP"]])
async def test_google_stop_reaches_official_constructor(stop: str | list[str]) -> None:
    client = httpx.AsyncClient()
    handle = await create_provider_model(
        model_name="gemini-2.5-flash",
        base_url="https://models.example/v1beta",
        provider="google",
        api_key="key",
        http_client=client,
        parameters={"stop": stop},
        max_retries=0,
    )
    try:
        assert handle.model.stop == ([stop] if isinstance(stop, str) else stop)  # type: ignore[attr-defined]
    finally:
        await handle.aclose()
    assert client.is_closed


@pytest.mark.asyncio
async def test_trace_is_one_child_generation_and_closes_across_tasks(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    for key, value in {
        "LANGFUSE_ENABLED": "true",
        "LANGFUSE_PUBLIC_KEY": "pk-test",
        "LANGFUSE_SECRET_KEY": "sk-test",
        "LANGFUSE_CAPTURE_INPUT_OUTPUT": "false",
    }.items():
        monkeypatch.setenv(key, value)
    exporter = InMemorySpanExporter()
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    tracer = provider.get_tracer("completion-test")
    monkeypatch.setattr(
        "agent.service.llm_completion.trace.get_tracer", lambda *a, **kw: tracer
    )
    model = ScriptModel(
        frames=[
            AIMessageChunk(content="private answer"),
            AIMessageChunk(content="later"),
        ]
    )
    install_model(monkeypatch, model)
    try:
        with tracer.start_as_current_span("workflow-node") as parent:
            stream = LLMCompletion(
                LLMCompletionInputs.model_validate(request_body()), "app"
            ).stream()
            await anext(stream)
            await asyncio.create_task(stream.aclose())
            assert (
                trace.get_current_span().get_span_context().span_id
                == parent.get_span_context().span_id
            )
        spans = exporter.get_finished_spans()
        generations = [
            span
            for span in spans
            if (span.attributes or {}).get("langfuse.observation.type") == "generation"
        ]
        assert len(generations) == 1
        assert generations[0].parent is not None
        assert generations[0].attributes is not None
        assert generations[0].parent.span_id == parent.get_span_context().span_id
        assert "langfuse.observation.input" not in generations[0].attributes
        assert "private-model-key" not in str(generations[0].attributes)
        assert model.closed
    finally:
        provider.shutdown()
