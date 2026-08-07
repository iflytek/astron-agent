"""Test WorkflowAgentRunner class"""

from dataclasses import dataclass
from typing import AsyncIterator
from unittest.mock import MagicMock

import pytest
from common.otlp import sid as sid_module
from common.otlp.log_trace.node_trace_log import NodeTraceLog
from common.otlp.trace.span import Span

from agent.api.schemas.agent_response import AgentResponse, CotStep
from agent.engine.nodes.chat.chat_runner import ChatRunner
from agent.engine.nodes.cot.cot_runner import CotRunner
from agent.service.plugin.base import BasePlugin
from agent.service.runner.workflow_agent_runner import WorkflowAgentRunner


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


class TestWorkflowAgentRunner:
    """Test WorkflowAgentRunner class"""

    @pytest.fixture
    def mock_chat_runner(self) -> ChatRunner:
        """Create mock ChatRunner"""
        runner = MagicMock(spec=ChatRunner)
        return runner

    @pytest.fixture
    def mock_cot_runner(self) -> CotRunner:
        """Create mock CotRunner"""
        runner = MagicMock(spec=CotRunner)
        return runner

    @pytest.fixture
    def mock_plugins(self) -> list[BasePlugin]:
        """Create mock plugin list"""
        plugin = MagicMock(spec=BasePlugin)
        plugin.name = "test_plugin"
        plugin.typ = "tool"
        return [plugin]

    @pytest.fixture
    def runner(
        self,
        mock_chat_runner: ChatRunner,
        mock_cot_runner: CotRunner,
        mock_plugins: list[BasePlugin],
    ) -> WorkflowAgentRunner:
        """Create WorkflowAgentRunner instance for testing"""
        return WorkflowAgentRunner(
            chat_runner=mock_chat_runner,
            cot_runner=mock_cot_runner,
            plugins=mock_plugins,
            knowledge_metadata_list=[],
        )

    @pytest.fixture
    def span(self) -> Span:
        """Create Span instance for testing"""
        return Span(app_id="test_app", uid="test_uid")

    @pytest.fixture
    def node_trace(self) -> NodeTraceLog:
        """Create NodeTrace instance for testing"""
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

    @pytest.mark.asyncio
    async def test_run_with_knowledge_metadata(
        self, runner: WorkflowAgentRunner, span: Span, node_trace: NodeTraceLog
    ) -> None:
        """Test running with knowledge metadata"""
        runner.knowledge_metadata_list = [{"source_id": "doc1", "chunk": []}]

        mock_response = AgentResponse(typ="content", content="test", model="test_model")

        async def mock_run(
            span: Span, node_trace: NodeTraceLog
        ) -> AsyncIterator[AgentResponse]:  # noqa: ARG001
            yield mock_response

        runner.chat_runner.run = mock_run

        results = []
        async for result in runner.run(span, node_trace):
            results.append(result)

        assert len(results) > 0

    @pytest.mark.asyncio
    async def test_run_runner_without_plugins(
        self, runner: WorkflowAgentRunner, span: Span, node_trace: NodeTraceLog
    ) -> None:
        """Test using ChatRunner when no plugins"""
        runner.plugins = []

        mock_response = AgentResponse(typ="content", content="test", model="test_model")

        async def mock_chat_run(
            span: Span, node_trace: NodeTraceLog
        ) -> AsyncIterator[AgentResponse]:  # noqa: ARG001
            yield mock_response

        runner.chat_runner.run = mock_chat_run

        results = []
        async for result in runner.run_runner(span, node_trace):
            results.append(result)

        assert len(results) > 0

    @pytest.mark.asyncio
    async def test_run_runner_with_plugins(
        self, runner: WorkflowAgentRunner, span: Span, node_trace: NodeTraceLog
    ) -> None:
        """Test using CotRunner when plugins exist"""
        mock_response = AgentResponse(
            typ="cot_step", content=CotStep(empty=True), model="test_model"
        )

        async def mock_cot_run(
            span: Span, node_trace: NodeTraceLog
        ) -> AsyncIterator[AgentResponse]:  # noqa: ARG001
            yield mock_response

        runner.cot_runner.run = mock_cot_run

        results = []
        async for result in runner.run_runner(span, node_trace):
            results.append(result)

        assert len(results) > 0

    @pytest.mark.asyncio
    async def test_convert_message_reasoning_content(
        self, runner: WorkflowAgentRunner, span: Span, node_trace: NodeTraceLog
    ) -> None:
        """Test converting reasoning content message"""
        message = AgentResponse(
            typ="reasoning_content", content="thinking...", model="test_model"
        )

        chunk = await runner.convert_message(message, span, node_trace)
        assert chunk.choices[0].delta.reasoning_content == "thinking..."

    @pytest.mark.asyncio
    async def test_convert_message_content(
        self, runner: WorkflowAgentRunner, span: Span, node_trace: NodeTraceLog
    ) -> None:
        """Test converting normal content message"""
        message = AgentResponse(typ="content", content="answer", model="test_model")

        chunk = await runner.convert_message(message, span, node_trace)
        assert chunk.choices[0].delta.content == "answer"

    @pytest.mark.asyncio
    async def test_convert_message_cot_step(
        self, runner: WorkflowAgentRunner, span: Span, node_trace: NodeTraceLog
    ) -> None:
        """Test converting CoT step message"""
        cot_step = CotStep(
            thought="think",
            action="test_action",
            action_input={"param": "value"},
            action_output={"result": "data"},
        )
        message = AgentResponse(typ="cot_step", content=cot_step, model="test_model")

        chunk = await runner.convert_message(message, span, node_trace)
        assert chunk.choices[0].delta.tool_calls is not None
        assert len(chunk.choices[0].delta.tool_calls) > 0

    @pytest.mark.asyncio
    async def test_convert_message_log(
        self, runner: WorkflowAgentRunner, span: Span, node_trace: NodeTraceLog
    ) -> None:
        """Test converting log message"""
        message = AgentResponse(typ="log", content="log message", model="test_model")

        chunk = await runner.convert_message(message, span, node_trace)
        assert chunk.object == "chat.completion.log"
        assert "log message" in chunk.logs

    @pytest.mark.asyncio
    async def test_convert_message_knowledge_metadata(
        self, runner: WorkflowAgentRunner, span: Span, node_trace: NodeTraceLog
    ) -> None:
        """Test converting knowledge metadata message"""
        metadata = [{"source_id": "doc1", "chunk": []}]
        message = AgentResponse(
            typ="knowledge_metadata", content=metadata, model="test_model"
        )

        chunk = await runner.convert_message(message, span, node_trace)
        assert chunk.choices[0].delta.tool_calls is not None
        assert len(chunk.choices[0].delta.tool_calls) > 0

    @pytest.mark.asyncio
    async def test_handle_plugin_trace_with_plugin(
        self, runner: WorkflowAgentRunner, span: Span, node_trace: NodeTraceLog
    ) -> None:
        """Test handling plugin trace (with plugin)"""
        mock_plugin = MagicMock(spec=BasePlugin)
        mock_plugin.run_result = MagicMock()
        mock_plugin.run_result.sid = "plugin_sid"
        mock_plugin.run_result.start_time = 1000
        mock_plugin.run_result.end_time = 2000
        mock_plugin.run_result.code = 0
        mock_plugin.name = "test_plugin"
        mock_plugin.typ = "tool"
        mock_plugin.tool_id = "tool_123"

        cot_step = CotStep(
            thought="think",
            action="test_action",
            action_input={"param": "value"},
            action_output={"result": "data"},
            plugin=mock_plugin,
        )

        message = AgentResponse(typ="cot_step", content=cot_step, model="test_model")
        await runner.convert_message(message, span, node_trace)

        # Verify node trace is added
        assert len(node_trace.trace) > 0

    def test_determine_node_id_tool(self, runner: WorkflowAgentRunner) -> None:
        """Test determining tool node ID"""
        mock_plugin = MagicMock()
        mock_plugin.typ = "tool"
        mock_plugin.tool_id = "tool_123"

        node_id = runner._determine_node_id(mock_plugin)
        assert node_id == "tool_123"

    def test_determine_node_id_workflow(self, runner: WorkflowAgentRunner) -> None:
        """Test determining workflow node ID"""
        mock_plugin = MagicMock()
        mock_plugin.typ = "workflow"
        mock_plugin.flow_id = "flow_123"

        node_id = runner._determine_node_id(mock_plugin)
        assert node_id == "flow_123"

    def test_determine_node_id_mcp_with_server_id(
        self, runner: WorkflowAgentRunner
    ) -> None:
        """Test determining MCP node ID (with server_id)"""
        mock_plugin = MagicMock()
        mock_plugin.typ = "mcp"
        mock_plugin.server_id = "server_123"
        mock_plugin.server_url = "http://example.com"

        node_id = runner._determine_node_id(mock_plugin)
        assert node_id == "server_123"

    def test_determine_node_id_mcp_with_server_url(
        self, runner: WorkflowAgentRunner
    ) -> None:
        """Test determining MCP node ID (no server_id, with server_url)"""
        mock_plugin = MagicMock()
        mock_plugin.typ = "mcp"
        mock_plugin.server_id = None
        mock_plugin.server_url = "http://example.com"

        node_id = runner._determine_node_id(mock_plugin)
        assert node_id == "http://example.com"

    def test_determine_node_id_no_typ(self, runner: WorkflowAgentRunner) -> None:
        """Test determining node ID (no type)"""
        mock_plugin = MagicMock()
        del mock_plugin.typ

        node_id = runner._determine_node_id(mock_plugin)
        assert node_id == ""
