import asyncio
from unittest.mock import Mock

from workflow.engine.dsl_engine import WorkflowEngineCtx
from workflow.engine.entities.chains import Chains
from workflow.engine.entities.variable_pool import VariablePool


class TestWorkflowEngineCtx:
    """Test cases for WorkflowEngineCtx class."""

    def test_workflow_engine_ctx_initialization(self) -> None:
        """Test WorkflowEngineCtx initialization with required parameters.

        Verifies that the context is properly initialized with:
        - Variable pool and chains
        - Default data structures for iteration engine, dependencies, node status, etc.
        - Build timestamp
        """
        # Create mock objects for required dependencies
        mock_variable_pool = Mock(spec=VariablePool)
        mock_chains = Mock(spec=Chains)

        # Initialize the workflow engine context
        ctx = WorkflowEngineCtx(variable_pool=mock_variable_pool, chains=mock_chains)

        # Verify that required components are properly set
        assert ctx.variable_pool == mock_variable_pool
        assert ctx.chains == mock_chains

        # Verify that default data structures are initialized correctly
        assert isinstance(ctx.iteration_engine, dict)
        assert isinstance(ctx.msg_or_end_node_deps, dict)
        assert isinstance(ctx.node_run_status, dict)
        assert isinstance(ctx.built_nodes, dict)
        assert isinstance(ctx.responses, list)
        assert isinstance(ctx.dfs_tasks, list)
        assert isinstance(ctx.build_timestamp, int)

    def test_workflow_engine_ctx_config(self) -> None:
        """Test WorkflowEngineCtx configuration with optional parameters.

        Verifies that the context can be initialized with additional optional components:
        - Callback handlers for chat operations
        - Event logging and tracing
        - Asyncio locks and events for synchronization
        """
        from workflow.engine.callbacks.callback_handler import ChatCallBacks
        from workflow.extensions.otlp.log_trace.workflow_log import WorkflowLog

        # Create mock objects for required dependencies
        mock_variable_pool = Mock(spec=VariablePool)
        mock_chains = Mock(spec=Chains)

        # Initialize context with optional parameters
        ctx = WorkflowEngineCtx(
            variable_pool=mock_variable_pool,
            chains=mock_chains,
            callback=Mock(spec=ChatCallBacks),
            event_log_trace=Mock(spec=WorkflowLog),
            qa_node_lock=asyncio.Lock(),
            end_complete=asyncio.Event(),
        )

        # Verify that optional components are properly set
        assert ctx.callback is not None
        assert ctx.event_log_trace is not None
        assert ctx.qa_node_lock is not None
        assert ctx.end_complete is not None
