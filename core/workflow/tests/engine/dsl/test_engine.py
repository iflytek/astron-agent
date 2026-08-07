import asyncio
import json
from unittest.mock import AsyncMock, Mock, patch

import pytest

from workflow.engine.dsl_engine import (
    DefaultNodeExecutionStrategy,
    ErrorHandlerChain,
    NodeExecutionStrategyManager,
    WorkflowEngine,
    WorkflowEngineCtx,
    WorkflowEngineFactory,
)
from workflow.engine.entities.node_entities import NodeType
from workflow.engine.entities.output_mode import EndNodeOutputModeEnum
from workflow.engine.entities.variable_pool import VariablePool
from workflow.engine.entities.workflow_dsl import WorkflowDSL
from workflow.engine.node import SparkFlowEngineNode
from workflow.engine.nodes.base_node import BaseNode
from workflow.engine.nodes.decision.decision_node import IntentChain
from workflow.engine.nodes.entities.node_run_result import (
    NodeRunResult,
    WorkflowNodeExecutionStatus,
)
from workflow.exception.e import CustomException, CustomExceptionInterrupt
from workflow.exception.errors.err_code import CodeEnum
from workflow.extensions.otlp.trace.span import Span
from workflow.tests.engine.dsl.base import BASE_DSL_SCHEMA


class TestWorkflowEngine:
    """Test cases for the WorkflowEngine class."""

    def setup_method(self) -> None:
        """Set up test fixtures and mock objects for each test method."""
        self.mock_dsl = Mock(spec=WorkflowDSL)
        self.mock_dsl.nodes = []

        self.mock_node = Mock(spec=SparkFlowEngineNode)
        self.mock_node.node_id = "node-start::test_id"
        self.mock_node.id = "node-start::test_id"
        self.mock_node.node_alias_name = "test_alias"
        self.mock_node.node_type = "node-start"

        self.mock_ctx = Mock(spec=WorkflowEngineCtx)
        self.mock_ctx.variable_pool = Mock()
        self.mock_ctx.iteration_engine = {}
        self.mock_ctx.node_run_status = {}
        self.mock_ctx.built_nodes = {}
        self.mock_ctx.chains = Mock()
        self.mock_ctx.responses = []
        self.mock_ctx.dfs_tasks = []
        self.engine = WorkflowEngine(
            engine_ctx=self.mock_ctx,
            sparkflow_engine_node=self.mock_node,
            workflow_dsl=self.mock_dsl,
        )

    def test_create_workflow_engine(self) -> None:
        """Test DSL construction and engine creation from base schema."""
        engine = WorkflowEngineFactory.create_engine(
            WorkflowDSL.model_validate(json.loads(BASE_DSL_SCHEMA).get("data", {})),
            Span(),
        )
        assert engine is not None

    def test_workflow_engine_initialization(self) -> None:
        """Test proper initialization of WorkflowEngine with all required components."""
        assert self.engine.engine_ctx == self.mock_ctx
        assert self.engine.sparkflow_engine_node == self.mock_node
        assert self.engine.workflow_dsl == self.mock_dsl
        assert self.engine.end_node_output_mode == EndNodeOutputModeEnum.VARIABLE_MODE
        assert isinstance(self.engine.strategy_manager, NodeExecutionStrategyManager)
        assert isinstance(self.engine.error_handler_chain, ErrorHandlerChain)

    def test_validate_start_node_valid(self) -> None:
        """Test validation of a valid start node that should not raise exceptions."""
        self.mock_node.id = "node-start:test_id"

        # Should not raise an exception
        self.engine._validate_start_node()

    def test_validate_start_node_invalid(self) -> None:
        """Test validation of an invalid start node that should raise CustomException."""
        self.mock_node.id = "invalid_node:test_id"

        with pytest.raises(CustomException) as exc_info:
            self.engine._validate_start_node()

        assert exc_info.value.code == CodeEnum.ENG_RUN_ERROR.code

    def test_is_end_node_true(self) -> None:
        """Test identification of end nodes by node_id pattern."""
        end_node = Mock(spec=SparkFlowEngineNode)
        end_node.node_id = "node-end::test_id"

        assert self.engine._is_end_node(end_node) is True

    def test_is_end_node_false(self) -> None:
        """Test identification of non-end nodes."""
        regular_node = Mock(spec=SparkFlowEngineNode)
        regular_node.node_id = "regular_node::test_id"

        assert self.engine._is_end_node(regular_node) is False

    def test_is_terminal_node_true(self) -> None:
        """Test identification of terminal nodes (end and iteration-end nodes)."""
        assert self.engine._is_terminal_node("node-end::test_id") is True
        assert self.engine._is_terminal_node("iteration-node-end::test_id") is True

    def test_is_terminal_node_false(self) -> None:
        """Test identification of non-terminal nodes."""
        assert self.engine._is_terminal_node("regular_node::test_id") is False

    @pytest.mark.parametrize(
        "node_type,node_mock,expected",
        [
            ("if-else", None, True),
            ("decision-making", None, True),
            ("question-answer", Mock(answerType="option"), True),
            ("question-answer", Mock(answerType="text"), False),
            ("regular", None, False),
        ],
    )
    def test_is_branch_node(
        self, node_type: str, node_mock: Mock, expected: bool
    ) -> None:
        """Test identification of branch nodes based on node type and configuration.

        :param node_type: The type of the node to test
        :param node_mock: Mock object representing the node instance
        :param expected: Expected boolean result for branch node identification
        """
        test_node = Mock(spec=SparkFlowEngineNode)
        if node_mock:
            test_node.node_instance = node_mock
        else:
            test_node.node_instance = Mock()

        result = self.engine._is_branch_node(node_type, test_node)
        assert result is expected

    def test_dumps_serialization(self) -> None:
        """Test engine serialization using pickle.dumps."""
        mock_span = Mock(spec=Span)

        with patch("pickle.dumps") as mock_dumps:
            mock_dumps.return_value = b"serialized_data"

            result = self.engine.dumps(mock_span)

            assert result == b"serialized_data"
            mock_dumps.assert_called_once_with(self.engine)

    def test_dumps_serialization_exception(self) -> None:
        """Test engine serialization exception handling and error recording."""
        mock_span = Mock(spec=Span)
        mock_span.record_exception = Mock()

        with patch("pickle.dumps") as mock_dumps:
            mock_dumps.side_effect = Exception("Serialization error")

            result = self.engine.dumps(mock_span)

            assert result == b""
            mock_span.record_exception.assert_called_once()

    def test_loads_deserialization_success(self) -> None:
        """Test successful engine deserialization using pickle.loads."""
        mock_span = Mock(spec=Span)
        mock_engine = Mock(spec=WorkflowEngine)
        mock_engine.engine_ctx = Mock()
        mock_engine.engine_ctx.build_timestamp = 123456789

        with patch("pickle.loads") as mock_loads:
            mock_loads.return_value = mock_engine

            engine, timestamp = WorkflowEngine.loads(b"serialized_data", mock_span)

            assert engine == mock_engine
            assert timestamp == 123456789
            mock_loads.assert_called_once_with(b"serialized_data")

    def test_loads_deserialization_exception(self) -> None:
        """Test engine deserialization exception handling and error recording."""
        mock_span = Mock(spec=Span)
        mock_span.record_exception = Mock()

        with patch("pickle.loads") as mock_loads:
            mock_loads.side_effect = Exception("Deserialization error")

            engine, timestamp = WorkflowEngine.loads(b"invalid_data", mock_span)

            assert engine is None
            assert timestamp == 0
            mock_span.record_exception.assert_called_once()


class TestWorkflowEngineAdvanced:
    """Test cases for advanced WorkflowEngine functionality."""

    def setup_method(self) -> None:
        """Set up test fixtures and mock objects for advanced engine tests."""
        self.mock_dsl = Mock(spec=WorkflowDSL)
        self.mock_node = Mock(spec=SparkFlowEngineNode)
        self.mock_node.node_id = "node-start::test_id"
        self.mock_node.node_alias_name = "node-start alias name"
        self.mock_node.id = "node-start::test_id"
        self.mock_ctx = Mock(spec=WorkflowEngineCtx)
        self.mock_ctx.responses = []
        self.engine = WorkflowEngine(
            engine_ctx=self.mock_ctx,
            sparkflow_engine_node=self.mock_node,
            workflow_dsl=self.mock_dsl,
        )

    @pytest.mark.asyncio
    async def test_async_run_with_iteration_start_node(self) -> None:
        """Test asynchronous execution with iteration start node.

        :return: None
        """
        self.mock_node.node_id = "iteration-start::test_id"

        mock_inputs = {"input1": "value1"}
        mock_span = Mock(spec=Span)
        mock_span.start = Mock(
            return_value=Mock(__enter__=Mock(return_value=mock_span), __exit__=Mock())
        )
        mock_callback = Mock()
        mock_history: list = []
        mock_history_v2: list = []
        mock_event_log = Mock()

        self.mock_ctx.iteration_engine = {"iter1": Mock(engine_ctx=Mock())}
        self.mock_ctx.end_complete = Mock()
        self.mock_ctx.qa_node_lock = None

        with patch.object(self.engine, "_validate_start_node"):
            with patch.object(
                self.engine,
                "_initialize_variable_pool_with_start_node",
                new_callable=AsyncMock,
            ):
                with patch.object(
                    self.engine, "_execute_workflow_internal", new_callable=AsyncMock
                ) as mock_execute:
                    mock_execute.return_value = Mock(spec=NodeRunResult)

                    result = await self.engine.async_run(
                        mock_inputs,
                        mock_span,
                        mock_callback,
                        mock_history,
                        mock_history_v2,
                        mock_event_log,
                    )

                    assert self.mock_ctx.qa_node_lock is None
                    assert isinstance(result, Mock)

    @pytest.mark.asyncio
    async def test_initialize_variable_pool_with_exception(self) -> None:
        """Test exception handling during variable pool initialization.

        :return: None
        """
        mock_inputs = {"input1": "value1"}
        mock_span = Mock(spec=Span)
        mock_callback = Mock()
        mock_callback.on_node_end = AsyncMock()
        mock_history: list = []
        mock_history_v2: list = []

        self.mock_ctx.variable_pool = Mock()
        self.mock_ctx.variable_pool.add_init_variable.side_effect = Exception(
            "Init error"
        )

        with pytest.raises(CustomException):
            await self.engine._initialize_variable_pool_with_start_node(
                mock_inputs, mock_span, mock_callback, mock_history, mock_history_v2
            )

        mock_callback.on_node_end.assert_called_once()

    @pytest.mark.asyncio
    async def test_handle_end_node_execution(self) -> None:
        """Test handling of end node execution and response collection.

        :return: None
        """
        mock_result = Mock(spec=NodeRunResult)
        mock_result.node_id = "node-end::test_id"
        await self.engine._handle_end_node(mock_result)

        assert mock_result in self.mock_ctx.responses

    @pytest.mark.asyncio
    async def test_handle_end_node_with_iteration_end(self) -> None:
        """Test handling of iteration end node execution.

        :return: None
        """
        mock_result = Mock(spec=NodeRunResult)
        mock_result.node_id = "iteration-node-end::test_id"

        await self.engine._handle_end_node(mock_result)

        assert mock_result in self.mock_ctx.responses

    @pytest.mark.asyncio
    async def test_handle_end_node_with_non_end_node(self) -> None:
        """Test handling of non-end node execution.

        :return: None
        """
        mock_result = Mock(spec=NodeRunResult)
        mock_result.node_id = "regular::test_id"

        await self.engine._handle_end_node(mock_result)

        assert mock_result not in self.mock_ctx.responses

    @pytest.mark.asyncio
    async def test_get_next_nodes_with_branch_node_no_result(self) -> None:
        """Test getting next nodes when branch node has no result.

        :return: None
        """
        mock_node = Mock(spec=SparkFlowEngineNode)
        mock_node.id = "decision-making:test_id"
        mock_node.get_next_nodes.return_value = []
        mock_node.get_fail_nodes.return_value = []

        with patch.object(self.engine, "_is_branch_node", return_value=True):
            with pytest.raises(CustomException) as exc_info:
                await self.engine._get_next_nodes(mock_node, None, False)

            assert exc_info.value.code == CodeEnum.ENG_RUN_ERROR.code

    @pytest.mark.asyncio
    async def test_handle_branch_node_logic_with_no_intents(self) -> None:
        """Test handling of branch node logic when no intents are available.

        :return: None
        """
        mock_node = Mock(spec=SparkFlowEngineNode)
        mock_node.get_classify_class.return_value = {}
        mock_node.next_nodes = []

        mock_result = Mock(spec=NodeRunResult)
        mock_result.dict.return_value = {"edge_source_handle": "unknown_handle"}

        with pytest.raises(CustomException) as exc_info:
            await self.engine._handle_branch_node_logic(
                mock_node, mock_result, "some_type"
            )

        assert exc_info.value.code == CodeEnum.ENG_RUN_ERROR.code

    def test_get_default_intent_chain_with_default(self) -> None:
        """Test retrieval of default intent chain when available."""
        mock_node = Mock(spec=SparkFlowEngineNode)
        mock_node.node_instance = Mock()
        mock_node.node_instance.intentChains = [
            IntentChain(
                id="intent-one-of::default_id",
                name="default",
                description="description",
                intentType=1,
            )
        ]
        mock_node.get_classify_class.return_value = {
            "intent-one-of::default_id": ["node1", "node2"]
        }

        result = self.engine._get_default_intent_chain(mock_node)

        assert result == ["node1", "node2"]

    def test_get_default_intent_chain_no_default(self) -> None:
        """Test retrieval of default intent chain when no default is available."""
        mock_node = Mock(spec=SparkFlowEngineNode)
        mock_node.node_instance = Mock()
        mock_node.node_instance.intentChains = [
            IntentChain(
                id="intent-one-of::other_id",
                name="other",
                description="description",
                intentType=1,
            )
        ]

        result = self.engine._get_default_intent_chain(mock_node)

        assert result is None

    @pytest.mark.asyncio
    async def test_wait_all_tasks_completion_with_exceptions(self) -> None:
        """Test waiting for all tasks completion with exception handling.

        :return: None
        """
        mock_span = Mock(spec=Span)
        mock_span.record_exception = Mock()

        mock_task1 = Mock()
        mock_task1.cancelled.return_value = False
        mock_task1.result.side_effect = Exception("Task error")

        mock_task2 = Mock()
        mock_task2.cancelled.return_value = True

        self.mock_ctx.dfs_tasks = [mock_task1, mock_task2]
        self.mock_ctx.responses = []

        with patch("asyncio.wait", new_callable=AsyncMock) as mock_wait:
            mock_wait.return_value = ({mock_task1, mock_task2}, set())

            with patch.object(
                self.engine, "_cancel_pending_task", new_callable=AsyncMock
            ):
                with pytest.raises(Exception) as exc_info:
                    await self.engine._wait_all_tasks_completion(mock_span)

                assert "Task error" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_execute_with_error_handling_non_stream_node(self) -> None:
        """Test error handling execution for non-stream nodes.

        :return: None
        """

        mock_node = Mock(spec=SparkFlowEngineNode)
        mock_node.node_id = f"{NodeType.DATABASE.value}::test_id"
        mock_node.node_instance = Mock()
        mock_node.node_instance.retry_config = Mock()
        mock_node.node_instance.retry_config.max_retries = 1
        mock_span = Mock(spec=Span)

        self.engine = WorkflowEngineFactory.create_engine(
            WorkflowDSL.model_validate(json.loads(BASE_DSL_SCHEMA).get("data", {})),
            Span(),
        )

        mock_result = Mock(spec=NodeRunResult)
        mock_result.status = WorkflowNodeExecutionStatus.SUCCEEDED

        with patch.object(
            self.engine, "_execute_non_stream_node", new_callable=AsyncMock
        ) as mock_execute:
            mock_execute.return_value = mock_result

            result, fail_branch = await self.engine._execute_with_error_handling(
                mock_node, mock_span
            )

            assert result == mock_result
            assert fail_branch is False

    @pytest.mark.asyncio
    async def test_execute_stream_node_with_failure_handling(self) -> None:
        """Test execution of stream nodes with failure handling.

        :return: None
        """
        mock_node = Mock(spec=SparkFlowEngineNode)
        mock_node.node_id = "message::test_id"
        mock_node.id = "message::test_id"
        mock_node.node_instance = Mock()
        mock_node.node_instance.stream_node_first_token = Mock()
        mock_node.node_instance.stream_node_first_token.wait = AsyncMock()
        mock_node.fail_nodes = []
        mock_node.next_nodes = []
        mock_span = Mock(spec=Span)

        mock_result = Mock(spec=NodeRunResult)

        self.engine = WorkflowEngineFactory.create_engine(
            WorkflowDSL.model_validate(json.loads(BASE_DSL_SCHEMA).get("data", {})),
            Span(),
        )
        self.engine.engine_ctx.dfs_tasks = []

        with patch.object(
            self.engine, "_deactivate_node_paths", new_callable=AsyncMock
        ):
            with patch.object(
                self.engine, "_set_nodes_logical_run_status", new_callable=AsyncMock
            ):
                with patch("asyncio.create_task") as mock_create_task:
                    mock_task = Mock()
                    mock_create_task.return_value = mock_task

                    with patch.object(
                        self.engine.strategy_manager, "get_strategy"
                    ) as mock_get_strategy:
                        mock_strategy = Mock()
                        mock_strategy.execute_node = AsyncMock(return_value=mock_result)
                        mock_get_strategy.return_value = mock_strategy

                        result = await self.engine._execute_stream_node(
                            mock_node, mock_span
                        )

                        assert result == mock_result
                        assert mock_task in self.engine.engine_ctx.dfs_tasks


class TestEdgeCasesAndBoundaryConditions:
    """Test cases for edge conditions and exception scenarios."""

    @pytest.mark.parametrize(
        "error_type,expected_handled",
        [
            (asyncio.TimeoutError("timeout"), True),
            (CustomExceptionInterrupt(-1, "interrupt"), True),
            (CustomException(CodeEnum.NODE_RUN_ERROR, "custom"), True),
            (ValueError("general"), True),
            (RuntimeError("runtime"), True),
        ],
    )
    @pytest.mark.asyncio
    async def test_error_handler_chain_comprehensive(
        self, error_type: Exception, expected_handled: bool
    ) -> None:
        """Test comprehensive error handler chain coverage for various exception types.

        :param error_type: The type of exception to test
        :param expected_handled: Whether the error is expected to be handled
        :return: None
        """
        chain = ErrorHandlerChain()

        mock_node = Mock(spec=SparkFlowEngineNode)
        mock_node.node_id = "test_node"
        mock_node.node_alias_name = "test_alias"
        mock_node.node_instance = Mock(spec=BaseNode)
        mock_node.node_instance.retry_config = Mock()
        mock_node.node_instance.retry_config.max_retries = 1
        mock_node.node_log = Mock()
        mock_node.node_log.add_error_log = Mock()
        mock_node.node_log.set_end = Mock()

        mock_ctx = Mock(spec=WorkflowEngineCtx)
        mock_ctx.event_log_trace = Mock()
        mock_ctx.event_log_trace.add_node_log = Mock()
        mock_ctx.variable_pool = Mock(spec=VariablePool)
        mock_ctx.callback = Mock()
        mock_ctx.callback.on_node_end = AsyncMock()

        mock_span = Mock(spec=Span)
        mock_span.add_error_event = Mock()
        mock_span.record_exception = Mock()

        if isinstance(error_type, CustomExceptionInterrupt):
            error_type.message = "interrupt message"

        result, should_continue = await chain.handle_error(
            error_type, mock_node, mock_ctx, 0, mock_span
        )

        # All errors should be handled
        assert result is None
        assert should_continue is False

    def test_node_execution_strategy_manager_empty_strategies(self) -> None:
        """Test NodeExecutionStrategyManager with empty strategies list."""
        manager = NodeExecutionStrategyManager()
        manager.strategies = []

        strategy = manager.get_strategy("any_type")

        # Should return default strategy
        assert isinstance(strategy, DefaultNodeExecutionStrategy)

    @pytest.mark.asyncio
    async def test_workflow_engine_error_scenarios_coverage(self) -> None:
        """Test comprehensive error scenario coverage for WorkflowEngine.

        :return: None
        """
        mock_dsl = Mock(spec=WorkflowDSL)
        mock_node = Mock(spec=SparkFlowEngineNode)
        mock_node.node_id = "test::node"
        mock_node.id = "test::node"

        mock_ctx = Mock(spec=WorkflowEngineCtx)

        engine = WorkflowEngine(
            engine_ctx=mock_ctx, sparkflow_engine_node=mock_node, workflow_dsl=mock_dsl
        )

        # Test error LLM content matching statement coverage
        test_cases = [
            (
                NodeType.AGENT.value,
                {"code": -1, "choices": [{"finish_reason": "stop"}]},
            ),
            (NodeType.KNOWLEDGE_PRO.value, {"code": -1, "finish_reason": "stop"}),
            (
                NodeType.FLOW.value,
                {"code": -1, "choices": [{"finish_reason": "stop"}]},
            ),
            ("unknown_type", {"code": -1}),
        ]

        for node_type, expected in test_cases:
            with patch(
                "workflow.consts.engine.chat_status.ChatStatus"
            ) as mock_chat_status:
                mock_chat_status.FINISH_REASON.value = "finish"

                result = engine._get_error_llm_content(node_type, mock_node)
                assert result == expected
