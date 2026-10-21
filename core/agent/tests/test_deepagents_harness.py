"""Exercise the installed Deep Agents graph, not a mocked execution engine."""

import asyncio
import json
from types import SimpleNamespace
from typing import Any

import httpx
import pytest
from aiohttp import web
from common.otlp import sid
from common.otlp.trace.span import Span
from langchain_core.language_models.fake_chat_models import FakeMessagesListChatModel
from langchain_core.messages import AIMessage, AIMessageChunk, ToolMessage
from langchain_core.outputs import ChatGenerationChunk
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
from opentelemetry.trace import StatusCode
from pydantic import Field

from agent.api.schemas.base_inputs import BaseInputs
from agent.api.schemas.llm_message import LLMMessage
from agent.api.v1.base_api import CompletionBase
from agent.domain.models.providers import ModelHandle, create_provider_model
from agent.engine.deepagents_runner import DeepAgentsRunner
from agent.engine.plugin_tools import build_plugin_tools
from agent.exceptions.plugin_exc import PluginExc
from agent.service.plugin.base import BasePlugin, PluginResponse
from agent.service.runner.workflow_agent_runner import WorkflowAgentRunner


class RecordingModel(FakeMessagesListChatModel):
    bindings: list[list[str]] = Field(default_factory=list)
    prompts: list[Any] = Field(default_factory=list)
    error: bool = False

    def bind_tools(self, tools: Any, **kwargs: Any) -> Any:
        self.bindings.append(
            [t.name if hasattr(t, "name") else t["name"] for t in tools]
        )
        return self

    def _generate(
        self, messages: Any, stop: Any = None, run_manager: Any = None, **kwargs: Any
    ) -> Any:
        self.prompts.append(messages)
        if self.error:
            raise RuntimeError("secret-api-key-in-provider-error")
        return super()._generate(messages, stop=stop, run_manager=run_manager, **kwargs)

    def get_num_tokens_from_messages(self, messages: Any, tools: Any = None) -> Any:
        return 10


@pytest.fixture
def context(monkeypatch: Any) -> Any:
    monkeypatch.delenv("LANGCHAIN_TRACING_V2", raising=False)
    monkeypatch.delenv("LANGSMITH_TRACING", raising=False)
    sid.sid_generator2 = SimpleNamespace(gen=lambda: "harness-test")
    exporter = InMemorySpanExporter()
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    span = Span(app_id="test", uid="user")
    span.tracer = provider.get_tracer("harness-tests")
    yield (span, SimpleNamespace(trace=[]), exporter)
    provider.shutdown()


def answer(text: Any = "done") -> Any:
    return AIMessage(
        content=text,
        response_metadata={"model_name": "fake-model"},
        usage_metadata={"input_tokens": 5, "output_tokens": 3, "total_tokens": 8},
    )


def call(name: Any = "weather", call_id: Any = "call-1", args: Any = None) -> Any:
    return AIMessage(
        content="checking",
        tool_calls=[
            {
                "name": name,
                "args": args if args is not None else {"city": "Hefei"},
                "id": call_id,
                "type": "tool_call",
            }
        ],
        usage_metadata={"input_tokens": 7, "output_tokens": 4, "total_tokens": 11},
    )


def plugin(
    name: Any = "weather", code: Any = 0, run: Any = None, typ: Any = "tool"
) -> Any:

    async def execute(action_input: Any, span: Any) -> Any:
        return PluginResponse(code=code, result={"forecast": "sunny"})

    return BasePlugin(
        name=name,
        description="Look up weather",
        typ=typ,
        schema_template='tool_parameters:{"type":"object","properties":{"city":{"type":"string"}},"required":["city"]}',
        run=run or execute,
    )


def engine(responses: Any, plugins: Any = None, **kwargs: Any) -> Any:
    model = RecordingModel(responses=responses)
    runner = DeepAgentsRunner(
        model_handle=ModelHandle(model, "fake-model", "test"),
        plugins=plugins or [],
        question="question",
        answer_instruction="Answer in Chinese",
        reasoning_instruction="Check the weather",
        **kwargs,
    )
    return (runner, model)


@pytest.mark.asyncio
async def test_plain_answer_uses_real_graph_and_records_usage_once(
    context: Any,
) -> None:
    (span, trace, _) = context
    (runner, model) = engine([answer()])
    responses = [r async for r in runner.run(span, trace)]
    assert [(r.typ, r.content) for r in responses] == [("content", "done")]
    assert sum((n.data.usage.total_tokens for n in trace.trace)) == 8
    assert len(model.prompts) == 1
    assert "Answer in Chinese" in str(model.prompts[0][0].content)
    assert runner.model_handle._closed


@pytest.mark.asyncio
async def test_tools_budget_and_answer_phase_preserve_platform_protocol(
    context: Any,
) -> None:
    (span, trace, _) = context
    (runner, model) = engine([call(), answer()], [plugin()], max_loop=1)
    adapter = WorkflowAgentRunner(
        engine=runner,
        knowledge_metadata_list=[{"source_id": "doc", "chunk": []}],
    )
    chunks = [r async for r in adapter.run(span, trace)]
    assert chunks[0].choices[0].delta.tool_calls[0].type == "knowledge"
    tool_call = next(
        (
            c.choices[0].delta.tool_calls[0]
            for c in chunks[1:]
            if c.choices[0].delta.tool_calls
        )
    )
    assert tool_call.function.name == "weather"
    assert json.loads(tool_call.function.response) == {"forecast": "sunny"}
    assert "".join((c.choices[0].delta.content or "" for c in chunks)) == "done"
    assert model.bindings and all(
        ("task" not in b and "execute" not in b for b in model.bindings)
    )
    assert len(model.prompts) == 2
    assert "Give the final answer now" in str(model.prompts[-1][0].content)
    assert any((isinstance(m, ToolMessage) for m in model.prompts[-1]))
    assert sum((n.data.usage.total_tokens for n in trace.trace)) == 19
    assert [n for n in trace.trace if n.node_type == "tool"][0].running_status


@pytest.mark.asyncio
async def test_early_completion_transitions_to_final_answer(context: Any) -> None:
    (span, trace, _) = context
    (runner, model) = engine(
        [answer("enough information"), answer("final")], [plugin()]
    )
    responses = [r async for r in runner.run(span, trace)]
    assert "".join((r.content for r in responses if r.typ == "content")) == "final"
    assert len(model.prompts) == 2


@pytest.mark.asyncio
async def test_failure_result_is_visible_to_model_and_trace(
    context: Any, monkeypatch: Any
) -> None:
    monkeypatch.setenv("LANGFUSE_ENABLED", "true")
    monkeypatch.setenv("LANGFUSE_PUBLIC_KEY", "pk-test")
    monkeypatch.setenv("LANGFUSE_SECRET_KEY", "sk-test")
    (span, trace, exporter) = context
    (runner, model) = engine([call(), answer()], [plugin(code=503)], max_loop=1)
    adapter = WorkflowAgentRunner(engine=runner)
    chunks = [r async for r in adapter.run(span, trace)]
    tool = next(
        (
            c.choices[0].delta.tool_calls[0]
            for c in chunks
            if c.choices[0].delta.tool_calls
        )
    )
    assert json.loads(tool.function.response)["code"] == 503
    observed = next((s for s in exporter.get_finished_spans() if s.name == "RunPlugin"))
    assert observed.status.status_code == StatusCode.ERROR
    assert observed.attributes["astron.agent.plugin.code"] == 503
    assert not next((n for n in trace.trace if n.node_type == "tool")).running_status


@pytest.mark.asyncio
async def test_model_error_has_stable_code_and_no_raw_secret(context: Any) -> None:
    (span, trace, _) = context
    (runner, model) = engine([answer()])
    model.error = True
    with pytest.raises(PluginExc) as error:
        _ = [r async for r in runner.run(span, trace)]
    assert error.value.c == 40029
    assert "secret-api-key" not in str(error.value)
    assert runner.model_handle._closed
    assert not trace.trace[0].running_status


@pytest.mark.asyncio
async def test_workflow_async_plugin_streams_and_accumulates_result(
    context: Any,
) -> None:

    async def run(action_input: Any, span: Any) -> Any:
        yield PluginResponse(result={"reasoning_content": "thinking"})
        yield PluginResponse(result={"content": "hello "})
        yield PluginResponse(result={"content": "world"})

    (span, trace, _) = context
    (runner, model) = engine(
        [call(), answer()], [plugin(run=run, typ="workflow")], max_loop=1
    )
    responses = [r async for r in runner.run(span, trace)]
    assert "hello world" in "".join(
        (r.content for r in responses if r.typ == "content")
    )
    result = next((r.content for r in responses if r.typ == "tool_result"))
    assert result.action_output["content"] == "hello world"
    assert result.tool_type == "workflow"


@pytest.mark.parametrize(
    "name", ["task", "read_file", "天气查询", "weather has spaces"]
)
def test_model_tool_aliases_are_stable_and_do_not_shadow_builtins(
    context: Any, name: Any
) -> None:
    first = build_plugin_tools([plugin(name=name)], context[0])[0]
    second = build_plugin_tools([plugin(name=name)], context[0])[0]
    assert first.name == second.name and first.name.startswith("astron_tool_")
    assert name in first.description


def test_duplicate_and_invalid_schemas_are_rejected(context: Any) -> None:
    with pytest.raises(ValueError):
        build_plugin_tools([plugin(), plugin()], context[0])
    p = plugin()
    p.schema_template = "bad-schema"
    with pytest.raises(ValueError):
        build_plugin_tools([p], context[0])


@pytest.mark.asyncio
async def test_invalid_arguments_never_execute_business_plugin(context: Any) -> None:
    executed = []

    async def run(action_input: Any, span: Any) -> Any:
        executed.append(action_input)
        return PluginResponse(result={})

    (runner, _) = engine(
        [call(args={"city": 42}), answer()], [plugin(run=run)], max_loop=1
    )
    try:
        _ = [r async for r in runner.run(context[0], context[1])]
    except Exception:
        pass
    assert executed == []


@pytest.mark.asyncio
async def test_close_after_knowledge_metadata_releases_model(context: Any) -> None:
    client = httpx.AsyncClient()
    (runner, _) = engine([answer()])
    runner.model_handle.http_client = client
    adapter = WorkflowAgentRunner(engine=runner, knowledge_metadata_list=[{}])
    stream = adapter.run(context[0], context[1])
    await anext(stream)
    await stream.aclose()
    assert client.is_closed


@pytest.mark.asyncio
async def test_cancellation_closes_active_plugin_and_model(context: Any) -> None:
    (started, closed) = (asyncio.Event(), asyncio.Event())

    async def run(action_input: Any, span: Any) -> Any:
        started.set()
        try:
            await asyncio.Event().wait()
        finally:
            closed.set()

    (runner, _) = engine([call(), answer()], [plugin(run=run)], max_loop=1)

    async def consume() -> Any:
        return [r async for r in runner.run(context[0], context[1])]

    task = asyncio.create_task(consume())
    await asyncio.wait_for(started.wait(), 5)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task
    assert closed.is_set()
    assert runner.model_handle._closed


@pytest.mark.asyncio
async def test_requests_do_not_share_virtual_files_or_messages(context: Any) -> None:
    (span, _, _) = context
    (r1, m1) = engine([answer("first")])
    (r2, m2) = engine([answer("second")])
    (r1.question, r2.question) = ("tenant-one", "tenant-two")

    async def collect(r: Any) -> Any:
        return [x async for x in r.run(span, SimpleNamespace(trace=[]))]

    outputs = await asyncio.gather(collect(r1), collect(r2))
    assert outputs[0][0].content == "first" and outputs[1][0].content == "second"
    assert "tenant-two" not in str(m1.prompts)
    assert "tenant-one" not in str(m2.prompts)


@pytest.mark.asyncio
async def test_unavailable_delegation_is_rejected_before_execution(
    context: Any,
) -> None:
    (runner, _) = engine(
        [
            call(
                name="task",
                args={"description": "bypass", "subagent_type": "general-purpose"},
            )
        ],
        [plugin()],
    )
    with pytest.raises(PluginExc):
        _ = [r async for r in runner.run(context[0], context[1])]
    assert all((n.node_type == "LLM" for n in context[1].trace))


@pytest.mark.asyncio
async def test_final_answer_streams_before_generation_finishes(context: Any) -> None:
    finished = asyncio.Event()

    class StreamingModel(RecordingModel):

        async def _astream(
            self,
            messages: Any,
            stop: Any = None,
            run_manager: Any = None,
            **kwargs: Any,
        ) -> Any:
            try:
                yield ChatGenerationChunk(message=AIMessageChunk(content="first"))
                await asyncio.Event().wait()
            finally:
                finished.set()

    model = StreamingModel(responses=[answer()])
    runner = DeepAgentsRunner(
        model_handle=ModelHandle(model, "stream", "test"), question="hi"
    )
    stream = runner.run(context[0], context[1])
    first = await asyncio.wait_for(anext(stream), 5)
    assert first.typ == "content" and first.content == "first"
    assert not finished.is_set()
    await stream.aclose()
    assert finished.is_set() and runner.model_handle._closed


@pytest.mark.asyncio
async def test_generation_capture_is_opt_in_and_usage_has_parent(
    context: Any, monkeypatch: Any
) -> None:
    monkeypatch.setenv("LANGFUSE_ENABLED", "true")
    monkeypatch.setenv("LANGFUSE_PUBLIC_KEY", "pk-test")
    monkeypatch.setenv("LANGFUSE_SECRET_KEY", "sk-test")
    monkeypatch.delenv("LANGFUSE_CAPTURE_INPUT_OUTPUT", raising=False)
    (runner, _) = engine([answer()])
    _ = [r async for r in runner.run(context[0], context[1])]
    spans = context[2].get_finished_spans()
    generation = next((s for s in spans if s.name == "RunModelStream"))
    parent = next((s for s in spans if s.name == "RunDeepAgent"))
    assert generation.parent.span_id == parent.context.span_id
    assert generation.attributes["gen_ai.usage.input_tokens"] == 5
    assert "langfuse.observation.input" not in generation.attributes
    assert "langfuse.observation.output" not in generation.attributes


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "provider,url,expected",
    [
        (
            "openai",
            "https://gateway.test/v1/chat/completions",
            "https://gateway.test/v1",
        ),
        ("anthropic", "https://gateway.test/v1/messages", "https://gateway.test"),
        (
            "google",
            "https://gateway.test/v1beta/models/gemini:streamGenerateContent?alt=sse",
            "https://gateway.test",
        ),
    ],
)
async def test_official_provider_configuration_and_cleanup(
    provider: Any, url: Any, expected: Any
) -> None:
    client = httpx.AsyncClient()
    handle = await create_provider_model(
        model_name="test",
        base_url=url,
        provider=provider,
        api_key="synthetic-key",
        http_client=client,
    )
    model = handle.model
    if provider == "openai":
        assert model.openai_api_base == expected and model.use_responses_api is False
    elif provider == "anthropic":
        assert model.anthropic_api_url == expected
        assert "http_async_client" not in model.model_kwargs
    else:
        assert model.base_url == expected
    await handle.aclose()
    await handle.aclose()
    assert client.is_closed


@pytest.mark.asyncio
async def test_virtual_file_tools_are_executed_by_framework_and_reported(
    context: Any,
) -> None:
    runner, model = engine(
        [
            call(
                "write_file", args={"file_path": "/note.txt", "content": "private note"}
            ),
            call("read_file", call_id="call-2", args={"file_path": "/note.txt"}),
            answer(),
        ],
        [plugin()],
        max_loop=2,
    )
    responses = [r async for r in runner.run(context[0], context[1])]
    steps = [r.content for r in responses if r.typ == "tool_result"]
    assert [s.action for s in steps] == ["write_file", "read_file"]
    assert "private note" in str(steps[-1].action_output)
    assert len(model.prompts) == 3


@pytest.mark.asyncio
async def test_unicode_tool_alias_preserves_public_name(context: Any) -> None:
    p = plugin(name="天气查询")
    alias = build_plugin_tools([p], context[0])[0].name
    runner, _ = engine([call(name=alias), answer()], [p], max_loop=1)
    responses = [r async for r in runner.run(context[0], context[1])]
    execution = next(r.content for r in responses if r.typ == "tool_result")
    assert execution.action == "天气查询"


@pytest.mark.asyncio
async def test_parallel_calls_keep_distinct_results_and_trace(context: Any) -> None:
    async def run(action_input: Any, span: Any) -> PluginResponse:
        await asyncio.sleep(0)
        return PluginResponse(result=action_input)

    first = call()
    first.tool_calls.append(
        {
            "name": "weather",
            "args": {"city": "Beijing"},
            "id": "call-2",
            "type": "tool_call",
        }
    )
    runner, _ = engine([first, answer()], [plugin(run=run)], max_loop=1)
    adapter = WorkflowAgentRunner(engine=runner)
    _ = [r async for r in adapter.run(context[0], context[1])]
    nodes = [n for n in context[1].trace if n.node_type == "tool"]
    assert len(nodes) == 2
    assert {json.loads(n.data.output["output"])["city"] for n in nodes} == {
        "Hefei",
        "Beijing",
    }


@pytest.mark.asyncio
async def test_compression_failure_is_sanitized_before_sse_and_tracing(
    context: Any, monkeypatch: Any
) -> None:
    for name in ("UPLOAD_NODE_TRACE", "UPLOAD_METRICS"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("LANGFUSE_ENABLED", "true")
    monkeypatch.setenv("LANGFUSE_PUBLIC_KEY", "pk-test")
    monkeypatch.setenv("LANGFUSE_SECRET_KEY", "sk-test")
    runner, model = engine([answer()])
    model.error = True
    runner.chat_history = [
        LLMMessage(role="user" if i % 2 == 0 else "assistant", content="x" * 35000)
        for i in range(24)
    ]

    class TestCompletion(CompletionBase):
        async def build_runner(self, span: Span) -> WorkflowAgentRunner:
            return WorkflowAgentRunner(engine=runner)

    completion = TestCompletion(
        app_id="test",
        inputs=BaseInputs(messages=[LLMMessage(role="user", content="hi")]),
        log_caller="test",
    )
    trace = SimpleNamespace(trace=[], record_end=lambda: None)
    frames = [
        f async for f in completion.run_runner(trace, SimpleNamespace(), context[0])
    ]
    terminal = json.loads(frames[-2].removeprefix("data: "))
    assert terminal["code"] == 40029
    assert frames[-1] == "data: [DONE]\n\n"
    assert (
        model.prompts and trace.trace == []
    )  # Failure occurs before primary model middleware.
    assert "secret-api-key-in-provider-error" not in str(frames)
    exported = context[2].get_finished_spans()
    assert "secret-api-key-in-provider-error" not in str(
        [(s.attributes, s.events) for s in exported]
    )
    assert runner.model_handle._closed


@pytest.mark.asyncio
@pytest.mark.parametrize("use_tool_first", [False, True])
async def test_real_anthropic_sdk_final_turn_never_uses_assistant_prefill(
    context: Any, use_tool_first: bool
) -> None:
    captured: list[dict[str, Any]] = []

    async def respond(request: Any) -> Any:
        body = await request.json()
        captured.append(body)
        if body["messages"][-1]["role"] == "assistant":
            return web.json_response(
                {
                    "type": "error",
                    "error": {
                        "type": "invalid_request_error",
                        "message": "assistant prefill not supported",
                    },
                },
                status=400,
            )
        tool_turn = use_tool_first and len(captured) == 1
        text = (
            "enough information"
            if len(captured) < (3 if use_tool_first else 2)
            else "final"
        )
        block = (
            {"type": "tool_use", "id": "call-1", "name": "weather", "input": {}}
            if tool_turn
            else {"type": "text", "text": ""}
        )
        delta = (
            {"type": "input_json_delta", "partial_json": '{"city":"Hefei"}'}
            if tool_turn
            else {"type": "text_delta", "text": text}
        )
        events = [
            (
                "message_start",
                {
                    "type": "message_start",
                    "message": {
                        "id": f"msg_{len(captured)}",
                        "type": "message",
                        "role": "assistant",
                        "model": "claude-sonnet-4-6",
                        "content": [],
                        "stop_reason": None,
                        "stop_sequence": None,
                        "usage": {"input_tokens": 5, "output_tokens": 0},
                    },
                },
            ),
            (
                "content_block_start",
                {"type": "content_block_start", "index": 0, "content_block": block},
            ),
            (
                "content_block_delta",
                {"type": "content_block_delta", "index": 0, "delta": delta},
            ),
            ("content_block_stop", {"type": "content_block_stop", "index": 0}),
            (
                "message_delta",
                {
                    "type": "message_delta",
                    "delta": {
                        "stop_reason": "tool_use" if tool_turn else "end_turn",
                        "stop_sequence": None,
                    },
                    "usage": {"output_tokens": 3},
                },
            ),
            ("message_stop", {"type": "message_stop"}),
        ]
        return web.Response(
            text="".join(
                "event: " + name + "\ndata: " + json.dumps(event) + "\n\n"
                for name, event in events
            ),
            content_type="text/event-stream",
        )

    app = web.Application()
    app.router.add_post("/v1/messages", respond)
    server = web.AppRunner(app)
    await server.setup()
    site = web.TCPSite(server, "127.0.0.1", 0)
    await site.start()
    assert isinstance(site._server, asyncio.Server)
    port = site._server.sockets[0].getsockname()[1]
    try:
        handle = await create_provider_model(
            model_name="claude-sonnet-4-6",
            base_url=f"http://127.0.0.1:{port}/v1/messages",
            provider="anthropic",
            api_key="synthetic-key",
            http_client=httpx.AsyncClient(),
        )
        runner = DeepAgentsRunner(
            model_handle=handle,
            plugins=[plugin()],
            question="hi",
            answer_instruction="Answer in Chinese",
            max_loop=3,
        )
        responses = [r async for r in runner.run(context[0], context[1])]
        assert "".join(r.content for r in responses if r.typ == "content") == "final"
        assert len(captured) == (3 if use_tool_first else 2)
        assert captured[-1]["messages"][-1]["role"] == "user"
        assert "Answer in Chinese" in str(captured[-1]["system"])
    finally:
        await server.cleanup()
