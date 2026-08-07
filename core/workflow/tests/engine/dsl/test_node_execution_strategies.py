from unittest.mock import AsyncMock, Mock, patch

import pytest

from workflow.engine.dsl_engine import (
    DefaultNodeExecutionStrategy,
    NodeExecutionStrategyManager,
    QuestionAnswerNodeStrategy,
    WorkflowEngineCtx,
)
from workflow.engine.entities.node_entities import NodeType
from workflow.engine.node import SparkFlowEngineNode
from workflow.engine.nodes.entities.node_run_result import NodeRunResult
from workflow.extensions.otlp.trace.span import Span


class TestNodeExecutionStrategies:
    """Test cases for node execution strategies."""

    def test_default_strategy_can_handle_all_nodes(self) -> None:
        """Test that default strategy can handle all node types."""
        strategy = DefaultNodeExecutionStrategy()

        assert strategy.can_handle("any_node_type") is True
        assert strategy.can_handle(NodeType.START.value) is True
        assert strategy.can_handle(NodeType.END.value) is True

    @pytest.mark.asyncio
    async def test_default_strategy_execute_node(self) -> None:
        """Test default strategy node execution."""
        strategy = DefaultNodeExecutionStrategy()

        mock_node = Mock(spec=SparkFlowEngineNode)
        mock_node.node_id = "test_node"
        mock_node.async_call = AsyncMock(return_value=Mock(spec=NodeRunResult))

        mock_ctx = Mock(spec=WorkflowEngineCtx)
        mock_ctx.node_run_status = {"test_node": Mock()}
        mock_ctx.node_run_status["test_node"].processing = Mock()
        mock_ctx.node_run_status["test_node"].processing.set = Mock()
        mock_ctx.variable_pool = Mock()
        mock_ctx.callback = Mock()
        mock_ctx.iteration_engine = {}
        mock_ctx.event_log_trace = Mock()
        mock_ctx.msg_or_end_node_deps = {}
        mock_ctx.chains = Mock()
        mock_ctx.built_nodes = {}

        mock_span = Mock(spec=Span)

        result = await strategy.execute_node(mock_node, mock_ctx, mock_span)

        mock_ctx.node_run_status["test_node"].processing.set.assert_called_once()
        mock_node.async_call.assert_called_once()
        assert isinstance(result, Mock)

    def test_question_answer_strategy_can_handle_qa_nodes(self) -> None:
        """Test that question-answer strategy can handle QA nodes."""
        strategy = QuestionAnswerNodeStrategy()

        assert strategy.can_handle(NodeType.QUESTION_ANSWER.value) is True
        assert strategy.can_handle(NodeType.START.value) is False
        assert strategy.can_handle("other_type") is False

    @pytest.mark.asyncio
    async def test_question_answer_strategy_execute_with_lock(self) -> None:
        """Test question-answer strategy execution with lock mechanism."""
        strategy = QuestionAnswerNodeStrategy()

        mock_node = Mock(spec=SparkFlowEngineNode)
        mock_ctx = Mock(spec=WorkflowEngineCtx)
        mock_ctx.qa_node_lock = AsyncMock()
        mock_span = Mock(spec=Span)

        with patch.object(
            DefaultNodeExecutionStrategy, "execute_node", new_callable=AsyncMock
        ) as mock_execute:
            mock_execute.return_value = Mock(spec=NodeRunResult)

            _ = await strategy.execute_node(mock_node, mock_ctx, mock_span)

            mock_execute.assert_called_once_with(mock_node, mock_ctx, mock_span)

    def test_strategy_manager_get_strategy(self) -> None:
        """Test strategy manager's strategy retrieval functionality."""
        manager = NodeExecutionStrategyManager()

        qa_strategy = manager.get_strategy(NodeType.QUESTION_ANSWER.value)
        assert isinstance(qa_strategy, QuestionAnswerNodeStrategy)

        default_strategy = manager.get_strategy("other_type")
        assert isinstance(default_strategy, DefaultNodeExecutionStrategy)

    def test_strategy_manager_order_matters(self) -> None:
        """Test that strategy order matters in the strategy manager."""
        manager = NodeExecutionStrategyManager()

        qa_index: int = 0
        default_index: int = 0

        # Ensure QA strategy is checked before default strategy
        for strategy in manager.strategies:
            if isinstance(strategy, QuestionAnswerNodeStrategy):
                qa_index = manager.strategies.index(strategy)
                break

        for strategy in manager.strategies:
            if isinstance(strategy, DefaultNodeExecutionStrategy):
                default_index = manager.strategies.index(strategy)
                break

        assert qa_index < default_index
