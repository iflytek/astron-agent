"""
Tests for OTLP log trace components
"""

import time

from common.otlp.log_trace.base import Usage
from common.otlp.log_trace.node_log import Data, NodeLog
from common.otlp.log_trace.node_trace_log import NodeTraceLog, Status
from common.otlp.log_trace.workflow_log import WorkflowLog


class TestUsage:
    """Test Usage model"""

    def test_init_default(self) -> None:
        """Test initialization with default values"""
        usage = Usage()

        assert usage.question_tokens == 0
        assert usage.prompt_tokens == 0
        assert usage.completion_tokens == 0
        assert usage.total_tokens == 0

    def test_init_with_values(self) -> None:
        """Test initialization with custom values"""
        usage = Usage(
            question_tokens=100,
            prompt_tokens=200,
            completion_tokens=150,
            total_tokens=450,
        )

        assert usage.question_tokens == 100
        assert usage.prompt_tokens == 200
        assert usage.completion_tokens == 150
        assert usage.total_tokens == 450

    def test_validation(self) -> None:
        """Test model validation"""
        # Valid data should work
        usage = Usage(question_tokens=50, prompt_tokens=100)
        assert usage is not None

    def test_serialization(self) -> None:
        """Test model serialization"""
        usage = Usage(
            question_tokens=100,
            prompt_tokens=200,
            completion_tokens=150,
            total_tokens=450,
        )

        data = usage.model_dump()
        assert data["question_tokens"] == 100
        assert data["prompt_tokens"] == 200
        assert data["completion_tokens"] == 150
        assert data["total_tokens"] == 450


class TestData:
    """Test Data model"""

    def test_init_default(self) -> None:
        """Test initialization with default values"""
        data = Data()

        assert data.input == {}
        assert data.output == {}
        assert data.config == {}
        assert isinstance(data.usage, Usage)

    def test_init_with_values(self) -> None:
        """Test initialization with custom values"""
        usage = Usage(question_tokens=100, total_tokens=200)
        data = Data(
            input={"key1": "value1"},
            output={"key2": "value2"},
            config={"key3": "value3"},
            usage=usage,
        )

        assert data.input == {"key1": "value1"}
        assert data.output == {"key2": "value2"}
        assert data.config == {"key3": "value3"}
        assert data.usage == usage

    def test_validation(self) -> None:
        """Test model validation"""
        # Valid data should work
        data = Data(input={"test": "value"})
        assert data is not None

    def test_serialization(self) -> None:
        """Test model serialization"""
        usage = Usage(question_tokens=100)
        data = Data(input={"key1": "value1"}, output={"key2": "value2"}, usage=usage)

        result = data.model_dump()
        assert result["input"] == {"key1": "value1"}
        assert result["output"] == {"key2": "value2"}
        assert result["usage"]["question_tokens"] == 100


class TestNodeLog:
    """Test NodeLog model"""

    def test_init_basic(self) -> None:
        """Test basic initialization"""
        node_log = NodeLog(sid="test_sid")

        assert node_log.sid == "test_sid"
        assert node_log.id is not None
        assert len(node_log.id) > 0
        assert node_log.node_id == ""
        assert node_log.node_type == ""
        assert node_log.node_name == ""
        assert node_log.func_id == ""
        assert node_log.func_type == ""
        assert node_log.func_name == ""
        assert node_log.next_log_ids == set()
        assert node_log.start_time > 0
        assert node_log.end_time > 0
        assert node_log.first_frame_duration == -1
        assert node_log.node_first_cost_time == -1
        assert node_log.llm_output == ""
        assert node_log.running_status is True
        assert isinstance(node_log.data, Data)
        assert node_log.logs == []

    def test_init_with_all_fields(self) -> None:
        """Test initialization with all fields"""
        node_log = NodeLog(
            sid="test_sid",
            func_id="func123",
            func_name="test_function",
            func_type="llm",
            node_id="node123",
            node_type="llm_node",
            node_name="Test Node",
            next_log_ids={"log1", "log2"},
            duration=1000,
            first_frame_duration=500,
            node_first_cost_time=1.5,
            llm_output="Test output",
            running_status=False,
            logs=["log1", "log2"],
        )

        assert node_log.sid == "test_sid"
        assert node_log.func_id == "func123"
        assert node_log.func_name == "test_function"
        assert node_log.func_type == "llm"
        assert node_log.node_id == "node123"
        assert node_log.node_type == "llm_node"
        assert node_log.node_name == "Test Node"
        assert node_log.next_log_ids == {"log1", "log2"}
        assert node_log.duration == 1000
        assert node_log.first_frame_duration == 500
        assert node_log.node_first_cost_time == 1.5
        assert node_log.llm_output == "Test output"
        assert node_log.running_status is False
        assert node_log.logs == ["log1", "log2"]

    def test_id_generation(self) -> None:
        """Test that ID is generated automatically"""
        node_log1 = NodeLog(sid="test_sid")
        node_log2 = NodeLog(sid="test_sid")

        assert node_log1.id != node_log2.id
        assert len(node_log1.id) == 32  # UUID hex length
        assert len(node_log2.id) == 32

    def test_timestamp_generation(self) -> None:
        """Test that timestamps are generated automatically"""
        before = int(time.time() * 1000)
        node_log = NodeLog(sid="test_sid")
        after = int(time.time() * 1000)

        assert before <= node_log.start_time <= after
        assert before <= node_log.end_time <= after

    def test_validation(self) -> None:
        """Test model validation"""
        # Valid data should work
        node_log = NodeLog(sid="test_sid", func_id="func123")
        assert node_log is not None

    def test_serialization(self) -> None:
        """Test model serialization"""
        node_log = NodeLog(
            sid="test_sid",
            func_id="func123",
            func_name="test_function",
            node_id="node123",
        )

        data = node_log.model_dump()
        assert data["sid"] == "test_sid"
        assert data["func_id"] == "func123"
        assert data["func_name"] == "test_function"
        assert data["node_id"] == "node123"
        assert "id" in data
        assert "start_time" in data
        assert "end_time" in data

    def test_deserialization(self) -> None:
        """Test model deserialization"""
        data = {
            "sid": "test_sid",
            "func_id": "func123",
            "func_name": "test_function",
            "node_id": "node123",
            "next_log_ids": ["log1", "log2"],
            "duration": 1000,
            "running_status": False,
        }

        node_log = NodeLog.model_validate(data)
        assert node_log.sid == "test_sid"
        assert node_log.func_id == "func123"
        assert node_log.func_name == "test_function"
        assert node_log.node_id == "node123"
        assert node_log.next_log_ids == {"log1", "log2"}
        assert node_log.duration == 1000
        assert node_log.running_status is False


class TestStatus:
    """Test Status model"""

    def test_init_default(self) -> None:
        """Test initialization with default values"""
        status = Status()

        assert status.code == 0
        assert status.message == ""

    def test_init_with_values(self) -> None:
        """Test initialization with custom values"""
        status = Status(code=200, message="Success")

        assert status.code == 200
        assert status.message == "Success"

    def test_validation(self) -> None:
        """Test model validation"""
        # Valid data should work
        status = Status(code=404, message="Not Found")
        assert status is not None

    def test_serialization(self) -> None:
        """Test model serialization"""
        status = Status(code=500, message="Internal Server Error")

        data = status.model_dump()
        assert data["code"] == 500
        assert data["message"] == "Internal Server Error"


class TestNodeTraceLog:
    """Test NodeTraceLog model"""

    def test_init_basic(self) -> None:
        """Test basic initialization"""
        trace_log = NodeTraceLog(
            service_id="test_service", sid="test_sid", sub="test_sub"
        )

        assert trace_log.service_id == "test_service"
        assert trace_log.sid == "test_sid"
        assert trace_log.sub == "test_sub"
        assert trace_log.app_id == ""
        assert trace_log.uid == ""
        assert trace_log.chat_id == ""
        assert trace_log.caller == ""
        assert trace_log.log_caller == ""
        assert trace_log.question == ""
        assert trace_log.answer == ""
        assert trace_log.start_time > 0
        assert trace_log.end_time > 0
        assert trace_log.duration == 0
        assert trace_log.first_frame_duration == -1.0
        assert trace_log.srv == {}
        assert trace_log.srv_tag == {}
        assert isinstance(trace_log.status, Status)
        assert isinstance(trace_log.usage, Usage)
        assert trace_log.version == "v2.0.0"
        assert trace_log.trace == []

    def test_init_with_all_fields(self) -> None:
        """Test initialization with all fields"""
        trace_log = NodeTraceLog(
            service_id="test_service",
            sid="test_sid",
            sub="test_sub",
            app_id="app123",
            uid="user123",
            chat_id="chat123",
            caller="caller123",
            log_caller="log_caller123",
            question="Test question?",
            answer="Test answer.",
            duration=5000,
            first_frame_duration=1000.0,
            srv={"key1": "value1"},
            srv_tag={"tag1": "value1"},
        )

        assert trace_log.service_id == "test_service"
        assert trace_log.sid == "test_sid"
        assert trace_log.sub == "test_sub"
        assert trace_log.app_id == "app123"
        assert trace_log.uid == "user123"
        assert trace_log.chat_id == "chat123"
        assert trace_log.caller == "caller123"
        assert trace_log.log_caller == "log_caller123"
        assert trace_log.question == "Test question?"
        assert trace_log.answer == "Test answer."
        assert trace_log.duration == 5000
        assert trace_log.first_frame_duration == 1000.0
        assert trace_log.srv == {"key1": "value1"}
        assert trace_log.srv_tag == {"tag1": "value1"}

    def test_add_q_method(self) -> None:
        """Test add_q method"""
        trace_log = NodeTraceLog(
            service_id="test_service", sid="test_sid", sub="test_sub"
        )

        trace_log.add_q("What is the weather?")
        assert trace_log.question == "What is the weather?"

    def test_add_a_method(self) -> None:
        """Test add_a method"""
        trace_log = NodeTraceLog(
            service_id="test_service", sid="test_sid", sub="test_sub"
        )

        trace_log.add_a("It's sunny today.")
        assert trace_log.answer == "It's sunny today."

    def test_usage_aggregation_in_set_end(self) -> None:
        """Test usage aggregation in set_end method"""
        trace_log = NodeTraceLog(
            service_id="test_service", sid="test_sid", sub="test_sub"
        )

        # Create node logs with usage data
        node_log1 = NodeLog(sid="test_sid", func_id="func1")
        node_log1.data.usage = Usage(question_tokens=10, total_tokens=20)

        node_log2 = NodeLog(sid="test_sid", func_id="func2")
        node_log2.data.usage = Usage(question_tokens=15, total_tokens=30)

        # Add node logs
        trace_log.add_node_log([node_log1, node_log2])

        # Call set_end to aggregate usage
        trace_log.set_end()

        # Check aggregated usage
        assert trace_log.usage.question_tokens == 25  # 10 + 15
        assert trace_log.usage.total_tokens == 50  # 20 + 30

    def test_add_node_log_method(self) -> None:
        """Test add_node_log method"""
        trace_log = NodeTraceLog(
            service_id="test_service", sid="test_sid", sub="test_sub"
        )

        node_logs = [NodeLog(sid="test_sid", func_id="func123")]
        trace_log.add_node_log(node_logs)

        assert len(trace_log.trace) == 1
        assert trace_log.trace[0] == node_logs[0]

    def test_add_func_log_method(self) -> None:
        """Test add_func_log method (alias for add_node_log)"""
        trace_log = NodeTraceLog(
            service_id="test_service", sid="test_sid", sub="test_sub"
        )

        node_logs = [
            NodeLog(sid="test_sid", func_id="func1"),
            NodeLog(sid="test_sid", func_id="func2"),
        ]
        trace_log.add_func_log(node_logs)

        assert len(trace_log.trace) == 2
        assert trace_log.trace[0] == node_logs[0]
        assert trace_log.trace[1] == node_logs[1]

    def test_validation(self) -> None:
        """Test model validation"""
        # Valid data should work
        trace_log = NodeTraceLog(
            service_id="test_service", sid="test_sid", sub="test_sub", app_id="app123"
        )
        assert trace_log is not None

    def test_serialization(self) -> None:
        """Test model serialization"""
        trace_log = NodeTraceLog(
            service_id="test_service",
            sid="test_sid",
            sub="test_sub",
            question="Test question?",
            answer="Test answer.",
        )

        data = trace_log.model_dump()
        assert data["service_id"] == "test_service"
        assert data["sid"] == "test_sid"
        assert data["sub"] == "test_sub"
        assert data["question"] == "Test question?"
        assert data["answer"] == "Test answer."
        assert "start_time" in data
        assert "end_time" in data


class TestWorkflowLog:
    """Test WorkflowLog model"""

    def test_init_basic(self) -> None:
        """Test basic initialization"""
        workflow_log = WorkflowLog(
            service_id="test_service", sid="test_sid", sub="test_sub"
        )

        # Check inherited fields
        assert workflow_log.service_id == "test_service"
        assert workflow_log.sid == "test_sid"
        assert workflow_log.sub == "test_sub"

        # Check workflow-specific fields (ClassVar)
        assert WorkflowLog.workflow_stream_node_types == ["message", "node-end"]

    def test_inheritance(self) -> None:
        """Test WorkflowLog inherits from NodeTraceLog"""
        workflow_log = WorkflowLog(
            service_id="test_service", sid="test_sid", sub="test_sub"
        )
        assert isinstance(workflow_log, NodeTraceLog)
        assert isinstance(workflow_log, WorkflowLog)

    def test_add_node_log_method(self) -> None:
        """Test add_node_log method with first frame duration calculation"""
        workflow_log = WorkflowLog(
            service_id="test_service", sid="test_sid", sub="test_sub"
        )

        # Create mock node logs
        node_logs = [
            NodeLog(sid="test_sid", node_id="other:node1"),
            NodeLog(sid="test_sid", node_id="message:node2"),
            NodeLog(sid="test_sid", node_id="node-end:node3"),
        ]

        # Mock the start_time to control first frame duration calculation
        workflow_log.start_time = 1000
        node_logs[1].start_time = 1500  # message node

        workflow_log.add_node_log(node_logs)

        # Should calculate first frame duration
        assert workflow_log.first_frame_duration == 500  # 1500 - 1000
        assert len(workflow_log.trace) == 3

    def test_add_node_log_no_message_node(self) -> None:
        """Test add_node_log when no message node is found"""
        workflow_log = WorkflowLog(
            service_id="test_service", sid="test_sid", sub="test_sub"
        )

        # Create node logs without message type
        node_logs = [
            NodeLog(sid="test_sid", node_id="other:node1"),
            NodeLog(sid="test_sid", node_id="another:node2"),
        ]

        workflow_log.add_node_log(node_logs)

        # Should not calculate first frame duration
        assert workflow_log.first_frame_duration == -1.0
        assert len(workflow_log.trace) == 2

    def test_add_node_log_empty_list(self) -> None:
        """Test add_node_log with empty list"""
        workflow_log = WorkflowLog(
            service_id="test_service", sid="test_sid", sub="test_sub"
        )

        workflow_log.add_node_log([])

        # Should not change anything
        assert workflow_log.first_frame_duration == -1.0
        assert len(workflow_log.trace) == 0

    def test_add_node_log_already_calculated(self) -> None:
        """Test add_node_log when first frame duration already calculated"""
        workflow_log = WorkflowLog(
            service_id="test_service", sid="test_sid", sub="test_sub"
        )

        # Set first frame duration
        workflow_log.first_frame_duration = 1000.0

        node_logs = [NodeLog(sid="test_sid", node_id="message:node1")]

        workflow_log.add_node_log(node_logs)

        # Should not recalculate
        assert workflow_log.first_frame_duration == 1000.0
        assert len(workflow_log.trace) == 1

    def test_validation(self) -> None:
        """Test model validation"""
        # Valid data should work
        workflow_log = WorkflowLog(
            service_id="test_service", sid="test_sid", sub="test_sub"
        )
        assert workflow_log is not None

    def test_serialization(self) -> None:
        """Test model serialization"""
        workflow_log = WorkflowLog(
            service_id="test_service", sid="test_sid", sub="test_sub"
        )

        data = workflow_log.model_dump()
        assert data["service_id"] == "test_service"
        assert data["sid"] == "test_sid"
        assert data["sub"] == "test_sub"
        # workflow_stream_node_types is a ClassVar, not serialized


class TestLogTraceIntegration:
    """Test log trace integration scenarios"""

    def test_complete_workflow_logging(self) -> None:
        """Test complete workflow logging scenario"""
        # Create workflow log
        workflow_log = WorkflowLog(
            service_id="test_service",
            sid="test_sid",
            sub="test_sub",
            app_id="app123",
            uid="user123",
        )

        # Add question and answer
        workflow_log.add_q("What is the weather?")
        workflow_log.add_a("It's sunny today.")

        # Create node logs with different start times
        workflow_log.start_time = 1000
        node_logs = [
            NodeLog(sid="test_sid", func_id="func1", node_id="input:node1"),
            NodeLog(sid="test_sid", func_id="func2", node_id="message:node2"),
            NodeLog(sid="test_sid", func_id="func3", node_id="node-end:node3"),
        ]
        node_logs[1].start_time = 1500  # message node with different time

        # Add node logs
        workflow_log.add_node_log(node_logs)

        # Add usage through node logs
        node_log1 = NodeLog(sid="test_sid", func_id="func1")
        node_log1.data.usage = Usage(question_tokens=10, total_tokens=20)
        workflow_log.add_node_log([node_log1])

        # Call set_end to aggregate usage
        workflow_log.set_end()

        # Verify the complete workflow
        assert workflow_log.question == "What is the weather?"
        assert workflow_log.answer == "It's sunny today."
        assert len(workflow_log.trace) == 4  # 3 original + 1 additional
        # Usage is aggregated from node logs
        assert workflow_log.usage.question_tokens == 10
        assert workflow_log.usage.total_tokens == 20
        assert workflow_log.first_frame_duration > 0

    def test_node_log_serialization_roundtrip(self) -> None:
        """Test NodeLog serialization and deserialization roundtrip"""
        # Create original node log
        original = NodeLog(
            sid="test_sid",
            func_id="func123",
            func_name="test_function",
            node_id="node123",
            next_log_ids={"log1", "log2"},
            duration=1000,
            running_status=False,
        )

        # Serialize to dict
        data = original.model_dump()

        # Deserialize from dict
        restored = NodeLog.model_validate(data)

        # Verify all fields match
        assert restored.sid == original.sid
        assert restored.func_id == original.func_id
        assert restored.func_name == original.func_name
        assert restored.node_id == original.node_id
        assert restored.next_log_ids == original.next_log_ids
        assert restored.duration == original.duration
        assert restored.running_status == original.running_status

    def test_trace_log_serialization_roundtrip(self) -> None:
        """Test NodeTraceLog serialization and deserialization roundtrip"""
        # Create original trace log
        original = NodeTraceLog(
            service_id="test_service",
            sid="test_sid",
            sub="test_sub",
            question="Test question?",
            answer="Test answer.",
            duration=5000,
        )

        # Add a node log
        node_log = NodeLog(sid="test_sid", func_id="func123")
        original.add_node_log([node_log])

        # Serialize to dict
        data = original.model_dump()

        # Deserialize from dict
        restored = NodeTraceLog.model_validate(data)

        # Verify all fields match
        assert restored.service_id == original.service_id
        assert restored.sid == original.sid
        assert restored.sub == original.sub
        assert restored.question == original.question
        assert restored.answer == original.answer
        assert restored.duration == original.duration
        assert len(restored.trace) == 1

    def test_usage_calculation(self) -> None:
        """Test usage calculation and aggregation"""
        # Create trace log
        trace_log = NodeTraceLog(
            service_id="test_service", sid="test_sid", sub="test_sub"
        )

        # Create node logs with usage data
        node_log1 = NodeLog(sid="test_sid", func_id="func1")
        node_log1.data.usage = Usage(
            question_tokens=10, prompt_tokens=20, completion_tokens=15, total_tokens=45
        )

        node_log2 = NodeLog(sid="test_sid", func_id="func2")
        node_log2.data.usage = Usage(
            question_tokens=5, prompt_tokens=10, completion_tokens=8, total_tokens=23
        )

        # Add node logs
        trace_log.add_node_log([node_log1, node_log2])

        # Call set_end to aggregate usage
        trace_log.set_end()

        # Check aggregated usage
        assert trace_log.usage.question_tokens == 15  # 10 + 5
        assert trace_log.usage.total_tokens == 68  # 45 + 23

    def test_node_log_timing(self) -> None:
        """Test node log timing calculations"""
        # Create node log
        node_log = NodeLog(sid="test_sid", func_id="func123")

        # Set specific times
        node_log.start_time = 1000
        node_log.end_time = 2000
        node_log.duration = 1000

        assert node_log.start_time == 1000
        assert node_log.end_time == 2000
        assert node_log.duration == 1000

    def test_workflow_log_node_types(self) -> None:
        """Test workflow log node type filtering"""
        workflow_log = WorkflowLog(
            service_id="test_service", sid="test_sid", sub="test_sub"
        )

        # Verify default node types (ClassVar)
        assert WorkflowLog.workflow_stream_node_types == ["message", "node-end"]

        # Test with different node types
        node_logs = [
            NodeLog(sid="test_sid", node_id="message:node1"),
            NodeLog(sid="test_sid", node_id="node-end:node2"),
            NodeLog(sid="test_sid", node_id="other:node3"),
        ]

        workflow_log.start_time = 1000
        node_logs[0].start_time = 1500  # message node

        workflow_log.add_node_log(node_logs)

        # Should find the message node for first frame duration
        assert workflow_log.first_frame_duration == 500
