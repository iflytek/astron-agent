"""Test WorkflowAgentRunner routing and public chunk compatibility."""

from dataclasses import dataclass
from typing import AsyncIterator
from unittest.mock import MagicMock

import pytest
from common.otlp import sid as sid_module
from common.otlp.log_trace.node_trace_log import NodeTraceLog
from common.otlp.trace.span import Span

from agent.api.schemas.agent_response import AgentResponse, CotStep
from agent.engine.nodes.chat.chat_runner import ChatRunner
from agent.engine.nodes.pi.pi_runner import PiRunner
from agent.service.plugin.base import BasePlugin, PluginResponse
from agent.service.runner.workflow_agent_runner import WorkflowAgentRunner


@dataclass
class _DummySidGen:
    value: str = "test-sid"

    def gen(self) -> str:
        return self.value


@pytest.fixture(autouse=True)
def _setup_test_environment() -> None:
    if sid_module.sid_generator2 is None:
        sid_module.sid_generator2 = _DummySidGen()  # type: ignore[assignment]


@pytest.fixture
def span() -> Span:
    return Span(app_id="test_app", uid="test_uid")


@pytest.fixture
def node_trace() -> NodeTraceLog:
    return NodeTraceLog(
        service_id="test_service",
        sid="test_sid",
        app_id="test_app",
        uid="test_uid",
        chat_id="test_chat",
        sub="Agent",
        caller="test_caller",
        log_caller="test_caller",
        question="test question",
    )


@pytest.fixture
def mock_chat_runner() -> ChatRunner:
    return MagicMock(spec=ChatRunner)


@pytest.fixture
def mock_pi_runner() -> PiRunner:
    return MagicMock(spec=PiRunner)


@pytest.fixture
def mock_plugin() -> BasePlugin:
    async def run_plugin() -> None:
        return None

    return BasePlugin(
        name="test_plugin",
        description="test plugin",
        schema_template="legacy",
        parameters={"type": "object", "properties": {}, "required": []},
        typ="mcp",
        run=run_plugin,
    )


def runner(
    chat_runner: ChatRunner | None,
    pi_runner: PiRunner | None,
    plugins: list[BasePlugin],
) -> WorkflowAgentRunner:
    return WorkflowAgentRunner(
        chat_runner=chat_runner,
        pi_runner=pi_runner,
        plugins=plugins,
        knowledge_metadata_list=[],
        question="current question",
    )


@pytest.mark.asyncio
async def test_without_plugins_uses_chat_runner(
    mock_chat_runner: ChatRunner,
    mock_pi_runner: PiRunner,
    span: Span,
    node_trace: NodeTraceLog,
) -> None:
    expected = AgentResponse(typ="content", content="chat", model="model")

    async def chat_run(*args: object) -> AsyncIterator[AgentResponse]:
        yield expected

    mock_chat_runner.run = chat_run
    result = runner(mock_chat_runner, mock_pi_runner, [])

    assert [item async for item in result.run_runner(span, node_trace)] == [expected]


@pytest.mark.asyncio
async def test_with_any_plugin_uses_pi_runner(
    mock_chat_runner: ChatRunner,
    mock_pi_runner: PiRunner,
    mock_plugin: BasePlugin,
    span: Span,
    node_trace: NodeTraceLog,
) -> None:
    expected = AgentResponse(
        typ="cot_step",
        content=CotStep(action="test_plugin", action_output={"ok": True}),
        model="model",
    )

    async def pi_run(*args: object) -> AsyncIterator[AgentResponse]:
        yield expected

    mock_pi_runner.run = pi_run
    result = runner(mock_chat_runner, mock_pi_runner, [mock_plugin])

    assert [item async for item in result.run_runner(span, node_trace)] == [expected]


@pytest.mark.asyncio
async def test_run_emits_knowledge_metadata_before_pi(
    mock_pi_runner: PiRunner,
    mock_plugin: BasePlugin,
    span: Span,
    node_trace: NodeTraceLog,
) -> None:
    async def pi_run(*args: object) -> AsyncIterator[AgentResponse]:
        yield AgentResponse(typ="content", content="answer", model="model")

    mock_pi_runner.run = pi_run
    result = runner(None, mock_pi_runner, [mock_plugin])
    result.knowledge_metadata_list = [{"source_id": "doc-1", "chunk": []}]

    chunks = [item async for item in result.run(span, node_trace)]

    assert chunks[0].choices[0].delta.tool_calls is not None
    function = chunks[0].choices[0].delta.tool_calls[0].function
    assert '"query": "current question"' in function.arguments
    assert chunks[1].choices[0].delta.content == "answer"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("message", "field", "expected"),
    [
        (
            AgentResponse(
                typ="reasoning_content", content="thinking", model="model"
            ),
            "reasoning_content",
            "thinking",
        ),
        (
            AgentResponse(typ="content", content="answer", model="model"),
            "content",
            "answer",
        ),
    ],
)
async def test_text_events_keep_existing_chunk_fields(
    message: AgentResponse,
    field: str,
    expected: str,
    mock_chat_runner: ChatRunner,
    span: Span,
    node_trace: NodeTraceLog,
) -> None:
    result = runner(mock_chat_runner, None, [])

    chunk = await result.convert_message(message, span, node_trace)

    assert getattr(chunk.choices[0].delta, field) == expected


@pytest.mark.asyncio
async def test_pi_tool_step_keeps_existing_tool_call_chunk_and_trace(
    mock_pi_runner: PiRunner,
    mock_plugin: BasePlugin,
    span: Span,
    node_trace: NodeTraceLog,
) -> None:
    mock_plugin.run_result = PluginResponse(
        code=0,
        sid="plugin-sid",
        start_time=1_000,
        end_time=2_000,
        result={"state": "ready"},
    )
    message = AgentResponse(
        typ="cot_step",
        content=CotStep(
            action="test_plugin",
            action_input={"job": "7"},
            action_output={"state": "ready"},
            tool_type="tool",
            plugin=mock_plugin,
        ),
        model="model",
    )
    result = runner(None, mock_pi_runner, [mock_plugin])

    chunk = await result.convert_message(message, span, node_trace)

    assert chunk.choices[0].delta.tool_calls is not None
    function = chunk.choices[0].delta.tool_calls[0].function
    assert function.name == "test_plugin"
    assert function.arguments == '{"job": "7"}'
    assert function.response == '{"state": "ready"}'
    assert node_trace.trace[0].id == "plugin-sid"
