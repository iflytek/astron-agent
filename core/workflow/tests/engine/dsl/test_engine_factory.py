from unittest.mock import Mock, patch

from workflow.engine.dsl_engine import WorkflowEngine, WorkflowEngineFactory
from workflow.engine.entities.chains import Chains
from workflow.engine.entities.workflow_dsl import WorkflowDSL
from workflow.extensions.otlp.trace.span import Span


class TestWorkflowEngineFactory:
    """Test cases for WorkflowEngineFactory class."""

    def test_create_engine_calls_builder(self) -> None:
        """Test that create_engine method properly calls the builder with correct sequence.

        This test verifies that the WorkflowEngineFactory.create_engine method:
        - Creates a WorkflowEngineBuilder instance with the provided DSL
        - Calls all required builder methods in the correct order
        - Returns a properly configured WorkflowEngine instance
        """
        # Setup mock DSL and span objects
        mock_dsl = Mock(spec=WorkflowDSL)
        mock_span = Mock(spec=Span)
        # Configure mock span to act as a context manager
        mock_span.start = Mock(
            return_value=Mock(__enter__=Mock(return_value=mock_span), __exit__=Mock())
        )

        # Mock the WorkflowEngineBuilder class and its methods
        with patch(
            "workflow.engine.dsl_engine.WorkflowEngineBuilder"
        ) as mock_builder_class:
            # Setup mock builder with fluent interface pattern
            mock_builder = Mock()
            mock_builder.build_chains.return_value = mock_builder
            mock_builder.build_nodes.return_value = mock_builder
            mock_builder.build_node_dependencies.return_value = mock_builder
            mock_builder.build_node_status.return_value = mock_builder
            mock_builder.build_message_dependencies.return_value = mock_builder
            mock_builder.build.return_value = Mock(spec=WorkflowEngine)
            mock_builder_class.return_value = mock_builder

            # Execute the method under test
            result = WorkflowEngineFactory.create_engine(mock_dsl, mock_span)

            # Verify builder was instantiated with correct DSL
            mock_builder_class.assert_called_once_with(mock_dsl)

            # Verify all builder methods were called in sequence
            mock_builder.build_chains.assert_called_once()
            mock_builder.build_nodes.assert_called_once()
            mock_builder.build_node_dependencies.assert_called_once()
            mock_builder.build_node_status.assert_called_once()
            mock_builder.build_message_dependencies.assert_called_once()
            mock_builder.build.assert_called_once()

            # Verify the result is a WorkflowEngine instance
            assert isinstance(result, Mock)

    def test_create_debug_node_success(self) -> None:
        """Test successful creation of debug node with proper engine context setup.

        This test verifies that the WorkflowEngineFactory.create_debug_node method:
        - Creates a WorkflowEngineBuilder instance with the provided DSL
        - Builds the engine with proper node configuration
        - Returns the correct node instance from the built engine context
        """
        # Setup mock DSL with test node
        mock_dsl = Mock(spec=WorkflowDSL)
        mock_dsl.nodes = [Mock(id="test_node_id")]

        # Setup mock span for tracing
        mock_span = Mock(spec=Span)
        mock_span.start = Mock(
            return_value=Mock(__enter__=Mock(return_value=mock_span), __exit__=Mock())
        )

        # Mock the WorkflowEngineBuilder class
        with patch(
            "workflow.engine.dsl_engine.WorkflowEngineBuilder"
        ) as mock_builder_class:
            # Setup mock builder with required attributes
            mock_builder = Mock()
            mock_builder.build_nodes.return_value = mock_builder
            mock_builder.start_node_id = "test_node_id"
            mock_builder.chains = Mock(spec=Chains)

            # Setup mock engine with built nodes context
            mock_engine = Mock(spec=WorkflowEngine)
            mock_engine.engine_ctx = Mock()
            mock_engine.engine_ctx.built_nodes = {
                "test_node_id": Mock(node_instance=Mock())
            }
            mock_builder.build.return_value = mock_engine
            mock_builder_class.return_value = mock_builder

            # Execute the method under test
            result = WorkflowEngineFactory.create_debug_node(mock_dsl, mock_span)

            # Verify that the correct node instance is returned from the engine context
            assert (
                result
                == mock_engine.engine_ctx.built_nodes["test_node_id"].node_instance
            )
