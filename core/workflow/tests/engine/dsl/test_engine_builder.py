import json
from unittest.mock import Mock, patch

import pytest

from workflow.consts.engine.error_handler import ErrorHandler
from workflow.engine.dsl_engine import WorkflowEngineBuilder
from workflow.engine.entities.node_entities import NodeType
from workflow.engine.entities.node_running_status import NodeRunningStatus
from workflow.engine.entities.output_mode import EndNodeOutputModeEnum
from workflow.engine.entities.variable_pool import VariablePool
from workflow.engine.entities.workflow_dsl import WorkflowDSL
from workflow.engine.node import SparkFlowEngineNode
from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum
from workflow.tests.engine.dsl.base import BASE_DSL_SCHEMA


class TestWorkflowEngineBuilder:
    """Test cases for WorkflowEngineBuilder class."""

    def setup_method(self) -> None:
        """Set up test method with mock DSL and builder instance."""
        self.mock_dsl = WorkflowDSL.model_validate(
            json.loads(BASE_DSL_SCHEMA).get("data", {})
        )
        self.builder = WorkflowEngineBuilder(self.mock_dsl)

    def test_builder_initialization(self) -> None:
        """Test WorkflowEngineBuilder initialization with proper attributes."""
        assert self.builder.sparkflow_dsl == self.mock_dsl
        assert isinstance(self.builder.built_nodes, dict)
        assert isinstance(self.builder.iteration_engine_nodes, dict)
        assert isinstance(self.builder.iteration_engine, dict)
        assert isinstance(self.builder.node_max_token, dict)
        assert isinstance(self.builder.msg_or_end_node_deps, dict)
        assert isinstance(self.builder.node_run_status, dict)
        assert self.builder.start_node_id == ""
        assert isinstance(self.builder.variable_pool, VariablePool)

    def test_build_chains(self) -> None:
        """Test building execution chains from workflow DSL."""
        _ = self.builder.build_chains()

    def test_build_node_status(self) -> None:
        """Test building node status for all nodes in the workflow."""
        self.mock_dsl.nodes = [Mock(id="node1"), Mock(id="node2")]

        result = self.builder.build_node_status()

        assert result == self.builder
        assert "node1" in self.builder.node_run_status
        assert "node2" in self.builder.node_run_status
        assert isinstance(self.builder.node_run_status["node1"], NodeRunningStatus)
        assert isinstance(self.builder.node_run_status["node2"], NodeRunningStatus)

    def test_handle_special_node_types_start(self) -> None:
        """Test handling special node types - start node."""
        mock_node = Mock()
        mock_node.get_node_type.return_value = NodeType.START.value
        mock_node.id = "start_node_id"

        mock_engine_node = Mock(spec=SparkFlowEngineNode)

        self.builder._handle_special_node_types(mock_node, mock_engine_node)

        assert self.builder.start_node_id == "start_node_id"

    def test_handle_special_node_types_end(self) -> None:
        """Test handling special node types - end node."""
        mock_node = Mock()
        mock_node.get_node_type.return_value = NodeType.END.value

        mock_engine_node = Mock(spec=SparkFlowEngineNode)
        mock_engine_node.node_instance = Mock()
        mock_engine_node.node_instance.outputMode = 1

        self.builder._handle_special_node_types(mock_node, mock_engine_node)

        assert self.builder.end_node_output_mode == EndNodeOutputModeEnum.PROMPT_MODE

    def test_validate_node_invalid_type(self) -> None:
        """Test validation of invalid node types."""
        mock_node = Mock()

        with patch("workflow.engine.nodes.cache_node.tool_classes", {}):
            with pytest.raises(CustomException) as exc_info:
                self.builder._validate_node("invalid_type:node_id", mock_node)

            assert exc_info.value.code == CodeEnum.ENG_RUN_ERROR.code

    def test_merge_message_dependencies(self) -> None:
        """Test merging message dependencies from multiple dependency lists."""
        deps_list = [
            {"node1": Mock(node_dep={"dep1", "dep2"})},
            {"node1": Mock(node_dep={"dep3"}), "node2": Mock(node_dep={"dep4"})},
        ]

        self.builder._merge_message_dependencies(deps_list)

        assert "node1" in self.builder.msg_or_end_node_deps
        assert "node2" in self.builder.msg_or_end_node_deps

    @pytest.mark.parametrize(
        "node_id,node_fail_branch,expected",
        [
            ("message::test", False, True),
            ("node-end::test", False, True),
            ("if-else::test", False, True),
            ("decision-making::test", False, True),
            ("question-answer::test", False, True),
            ("iteration::test", False, True),
            ("regular::test", True, True),
            ("regular::test", False, False),
        ],
    )
    def test_should_build_message_dependency(
        self, node_id: str, node_fail_branch: bool, expected: bool
    ) -> None:
        """Test whether message dependency should be built for given node conditions."""
        result = self.builder._should_build_message_dependency(
            node_id, node_fail_branch
        )
        assert result is expected

    def test_check_node_fail_branch_true(self) -> None:
        """Test checking if node has fail branch - with fail branch."""
        mock_node = Mock()
        mock_node.id = "test_node"
        mock_node.data = Mock()
        mock_node.data.retryConfig = Mock()
        mock_node.data.retryConfig.should_retry = True
        mock_node.data.retryConfig.error_strategy = ErrorHandler.FailBranch.value

        self.mock_dsl.nodes = [mock_node]

        result = self.builder._check_node_fail_branch("test_node")
        assert result is True

    def test_check_node_fail_branch_false(self) -> None:
        """Test checking if node has fail branch - without fail branch."""
        mock_node = Mock()
        mock_node.id = "test_node"
        mock_node.data = Mock()
        mock_node.data.retryConfig = Mock()
        mock_node.data.retryConfig.should_retry = False

        self.mock_dsl.nodes = [mock_node]

        result = self.builder._check_node_fail_branch("test_node")
        assert result is False


class TestWorkflowEngineBuilderAdvanced:
    """Test cases for advanced WorkflowEngineBuilder functionality."""

    def setup_method(self) -> None:
        """Set up test method with mock DSL and builder instance."""
        self.mock_dsl = WorkflowDSL.model_validate(
            json.loads(BASE_DSL_SCHEMA).get("data", {})
        )
        self.builder = WorkflowEngineBuilder(self.mock_dsl)

    def test_build_single_edge_dependency_source_not_found(self) -> None:
        """Test building single edge dependency when source node is not found."""
        mock_edge = Mock()
        mock_edge.sourceNodeId = "missing_source"
        mock_edge.targetNodeId = "target"
        mock_edge.sourceHandle = "handle"

        self.builder.built_nodes = {"target": Mock()}

        with pytest.raises(CustomException) as exc_info:
            self.builder._build_single_edge_dependency(mock_edge)

        assert exc_info.value.code == CodeEnum.ENG_PROTOCOL_VALIDATE_ERROR.code

    def test_build_single_edge_dependency_target_not_found(self) -> None:
        """Test building single edge dependency when target node is not found."""
        mock_edge = Mock()
        mock_edge.sourceNodeId = "source"
        mock_edge.targetNodeId = "missing_target"
        mock_edge.sourceHandle = "handle"

        self.builder.built_nodes = {"source": Mock()}

        with pytest.raises(CustomException) as exc_info:
            self.builder._build_single_edge_dependency(mock_edge)

        assert exc_info.value.code == CodeEnum.ENG_PROTOCOL_VALIDATE_ERROR.code

    def test_build_single_edge_dependency_fail_handle(self) -> None:
        """Test building single edge dependency with fail handle."""
        mock_edge = Mock()
        mock_edge.sourceNodeId = "source"
        mock_edge.targetNodeId = "target"
        mock_edge.sourceHandle = "fail_one_of"

        mock_source = Mock()
        mock_target = Mock()
        mock_source.add_fail_node = Mock()
        mock_target.add_pre_node = Mock()

        self.builder.built_nodes = {"source": mock_source, "target": mock_target}

        self.builder._build_single_edge_dependency(mock_edge)

        mock_source.add_fail_node.assert_called_once_with(mock_target)
        mock_target.add_pre_node.assert_called_once_with(mock_source)

    def test_build_single_edge_dependency_intent_chain_handle(self) -> None:
        """Test building single edge dependency with intent chain handle."""
        mock_edge = Mock()
        mock_edge.sourceNodeId = "source"
        mock_edge.targetNodeId = "target"
        mock_edge.sourceHandle = "intent_chain|test_handle"

        mock_source = Mock()
        mock_target = Mock()
        mock_source.add_next_node = Mock()
        mock_target.add_pre_node = Mock()
        mock_source.add_classify_class = Mock()

        self.builder.built_nodes = {"source": mock_source, "target": mock_target}

        self.builder._build_single_edge_dependency(mock_edge)

        mock_source.add_next_node.assert_called_once_with(mock_target)
        mock_target.add_pre_node.assert_called_once_with(mock_source)
        mock_source.add_classify_class.assert_called_once_with("test_handle", "target")

    def test_build_iteration_engines_missing_start_node(self) -> None:
        """Test building iteration engines when start node is missing."""
        self.builder.iteration_engine_nodes = {"missing_node": "iteration_node"}
        self.builder.built_nodes = {}

        with pytest.raises(CustomException) as exc_info:
            self.builder._build_iteration_engines()

        assert exc_info.value.code == CodeEnum.ENG_PROTOCOL_VALIDATE_ERROR.code
        assert exc_info.value.message == (
            "Workflow engine protocol validation failed"
            "(Iteration start node: missing_node does not exist)"
        )

    def test_handle_decision_making_node_missing_intent_chains(self) -> None:
        """Test handling decision making node when intent chains are missing."""
        mock_node = Mock()
        mock_node.data = Mock()
        mock_node.data.nodeParam = {}

        with pytest.raises(CustomException) as exc_info:
            self.builder._handle_decision_making_node("test_node", mock_node)

        assert exc_info.value.code == CodeEnum.ENG_PROTOCOL_VALIDATE_ERROR.code

    def test_handle_iteration_node_missing_start_node_id(self) -> None:
        """Test handling iteration node when start node ID is missing."""
        mock_node = Mock()
        mock_node.id = "iteration_node"
        mock_node.data = Mock()
        mock_node.data.nodeParam = {}

        with pytest.raises(CustomException) as exc_info:
            self.builder._handle_iteration_node("test_node", mock_node)

        assert exc_info.value.code == CodeEnum.ENG_PROTOCOL_VALIDATE_ERROR.code

    def test_has_normal_path_true(self) -> None:
        """Test checking if normal path exists between nodes."""
        self.mock_dsl.edges = [
            Mock(sourceNodeId="source", targetNodeId="target", sourceHandle="normal"),
        ]

        result = self.builder._has_normal_path("source", "target")
        assert result is True

    def test_has_normal_path_false_with_fail_path(self) -> None:
        """Test checking normal path when only fail path exists."""
        self.mock_dsl.edges = [
            Mock(
                sourceNodeId="source", targetNodeId="target", sourceHandle="fail_one_of"
            ),
        ]

        result = self.builder._has_normal_path("source", "target")
        assert result is False

    def test_has_normal_path_with_circular_dependency(self) -> None:
        """Test path finding with circular dependency."""
        self.mock_dsl.edges = [
            Mock(sourceNodeId="source", targetNodeId="middle", sourceHandle="normal"),
            Mock(sourceNodeId="middle", targetNodeId="source", sourceHandle="normal"),
        ]

        result = self.builder._has_normal_path("source", "target")
        assert result is False

    def test_iteration_chain_has_message_true(self) -> None:
        """Test checking if iteration chain contains message nodes."""
        mock_chain = Mock()
        mock_chain.master_chains = [Mock(node_id_list=["message::test", "other::test"])]

        self.builder.chains = Mock()
        self.builder.chains.iteration_chains = {"test_node": mock_chain}

        result = self.builder._iteration_chain_has_message("test_node")
        assert result is True

    def test_iteration_chain_has_message_false(self) -> None:
        """Test checking if iteration chain does not contain message nodes."""
        mock_chain = Mock()
        mock_chain.master_chains = [Mock(node_id_list=["other::test", "another::test"])]

        self.builder.chains = Mock()
        self.builder.chains.iteration_chains = {"test_node": mock_chain}

        result = self.builder._iteration_chain_has_message("test_node")
        assert result is False
