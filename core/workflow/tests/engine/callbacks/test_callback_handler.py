"""
Unit tests for callback handler module.

This module provides comprehensive unit tests for the callback_handler.py module,
covering all classes and methods with focus on 100% code coverage and various
test scenarios including normal flows, edge cases, and exception handling.
"""

import asyncio
import json
from unittest.mock import AsyncMock, Mock, patch

import pytest

from workflow.consts.engine.chat_status import ChatStatus
from workflow.engine.callbacks.callback_handler import (
    ChatCallBackConsumer,
    ChatCallBacks,
    ChatCallBackStreamResult,
    StructuredConsumer,
)
from workflow.engine.callbacks.openai_types_sse import GenerateUsage, LLMGenerate
from workflow.engine.entities.chains import Chains, SimplePath
from workflow.engine.entities.output_mode import EndNodeOutputModeEnum
from workflow.engine.nodes.entities.node_run_result import NodeRunResult
from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum


class TestChatCallBackStreamResult:
    """
    Test cases for ChatCallBackStreamResult dataclass.

    Tests the data structure and its initialization with various parameters.
    """

    def test_init_with_required_params(self) -> None:
        """Test initialization with required parameters."""
        llm_generate = LLMGenerate(id="test_sid", choices=[])
        result = ChatCallBackStreamResult(
            node_id="test_node", node_answer_content=llm_generate
        )

        assert result.node_id == "test_node"
        assert result.node_answer_content == llm_generate
        assert result.finish_reason == ""

    def test_init_with_all_params(self) -> None:
        """Test initialization with all parameters."""
        llm_generate = LLMGenerate(id="test_sid", choices=[])
        result = ChatCallBackStreamResult(
            node_id="test_node", node_answer_content=llm_generate, finish_reason="stop"
        )

        assert result.node_id == "test_node"
        assert result.node_answer_content == llm_generate
        assert result.finish_reason == "stop"

    @pytest.mark.parametrize("finish_reason", ["", "stop", "interrupt", "error"])
    def test_finish_reason_values(self, finish_reason: str) -> None:
        """Test different finish_reason values."""
        llm_generate = LLMGenerate(id="test_sid", choices=[])
        result = ChatCallBackStreamResult(
            node_id="test_node",
            node_answer_content=llm_generate,
            finish_reason=finish_reason,
        )

        assert result.finish_reason == finish_reason


class TestChatCallBacks:
    """
    Test cases for ChatCallBacks class.

    Covers initialization, progress calculation, and all callback methods.
    """

    @pytest.fixture
    def mock_chains(self) -> Chains:
        """Create mock chains for testing."""
        # Create mock simple path
        simple_path1 = Mock(spec=SimplePath)
        simple_path1.inactive = Mock()
        simple_path1.inactive.is_set.return_value = False
        simple_path1.node_id_list = ["node1", "node2", "node3"]
        simple_path1.every_node_index = {"node1": 1, "node2": 2, "node3": 3}

        simple_path2 = Mock(spec=SimplePath)
        simple_path2.inactive = Mock()
        simple_path2.inactive.is_set.return_value = False
        simple_path2.node_id_list = ["node4", "node5"]
        simple_path2.every_node_index = {"node4": 1, "node5": 2}

        chains = Mock(spec=Chains)
        chains.master_chains = [simple_path1, simple_path2]
        chains.get_all_simple_paths_node_cnt.return_value = 5

        return chains

    @pytest.fixture
    def callback_handler(self, mock_chains: Chains) -> ChatCallBacks:
        """Create a ChatCallBacks instance for testing."""
        stream_queue: asyncio.Queue = asyncio.Queue()
        order_queue: asyncio.Queue = asyncio.Queue()
        support_stream_node_ids = {"node1", "node2"}

        return ChatCallBacks(
            sid="test_sid",
            stream_queue=stream_queue,
            end_node_output_mode=EndNodeOutputModeEnum.PROMPT_MODE,
            support_stream_node_ids=support_stream_node_ids,
            need_order_stream_result_q=order_queue,
            chains=mock_chains,
            event_id="test_event",
            flow_id="test_flow",
        )

    def test_init_with_chains(self, mock_chains: Chains) -> None:
        """Test initialization with chains."""
        stream_queue: asyncio.Queue = asyncio.Queue()
        order_queue: asyncio.Queue = asyncio.Queue()
        support_stream_node_ids = {"node1", "node2"}

        handler = ChatCallBacks(
            sid="test_sid",
            stream_queue=stream_queue,
            end_node_output_mode=EndNodeOutputModeEnum.PROMPT_MODE,
            support_stream_node_ids=support_stream_node_ids,
            need_order_stream_result_q=order_queue,
            chains=mock_chains,
            event_id="test_event",
            flow_id="test_flow",
        )

        assert handler.sid == "test_sid"
        assert handler.stream_queue == stream_queue
        assert handler.end_node_output_mode == EndNodeOutputModeEnum.PROMPT_MODE
        assert handler.support_stream_node_id_set == support_stream_node_ids
        assert handler.order_stream_result_q == order_queue
        assert handler.chains == mock_chains
        assert handler.event_id == "test_event"
        assert handler.flow_id == "test_flow"
        assert handler.all_simple_paths_node_cnt == 5
        assert isinstance(handler.generate_usage, GenerateUsage)
        assert isinstance(handler.node_execute_start_time, dict)

    def test_init_without_chains(self) -> None:
        """Test initialization without chains."""
        stream_queue: asyncio.Queue = asyncio.Queue()
        order_queue: asyncio.Queue = asyncio.Queue()
        support_stream_node_ids: set = {"node1", "node2"}

        handler = ChatCallBacks(
            sid="test_sid",
            stream_queue=stream_queue,
            end_node_output_mode=EndNodeOutputModeEnum.PROMPT_MODE,
            support_stream_node_ids=support_stream_node_ids,
            need_order_stream_result_q=order_queue,
            chains=None,  # type: ignore
            event_id="test_event",
            flow_id="test_flow",
        )

        assert handler.chains is None
        assert not hasattr(handler, "all_simple_paths_node_cnt")

    def test_get_node_progress_active_paths(
        self, callback_handler: ChatCallBacks
    ) -> None:
        """Test progress calculation with active paths."""
        progress = callback_handler._get_node_progress("node2")

        # Expected: (2 + 0) / 5 = 0.4
        assert progress == 0.4

    def test_get_node_progress_inactive_path(
        self, callback_handler: ChatCallBacks
    ) -> None:
        """Test progress calculation with inactive path."""
        # Make first path inactive
        callback_handler.chains.master_chains[0].inactive.is_set.return_value = True  # type: ignore

        progress = callback_handler._get_node_progress("node4")

        # Expected: (3 + 1) / 5 = 0.8
        assert progress == 0.8

    def test_get_node_progress_unknown_node(
        self, callback_handler: ChatCallBacks
    ) -> None:
        """Test progress calculation with unknown node."""
        progress = callback_handler._get_node_progress("unknown_node")

        # Expected: (0 + 0) / 5 = 0.0
        assert progress == 0.0

    @pytest.mark.asyncio
    async def test_on_sparkflow_start(self, callback_handler: ChatCallBacks) -> None:
        """Test workflow start event handling."""
        with patch.object(LLMGenerate, "workflow_start") as mock_workflow_start:
            mock_resp = Mock()
            mock_workflow_start.return_value = mock_resp

            await callback_handler.on_sparkflow_start()

            mock_workflow_start.assert_called_once_with("test_sid")
            # Check if response was put in queue
            assert callback_handler.stream_queue.qsize() == 1
            queued_item = await callback_handler.stream_queue.get()
            assert queued_item == mock_resp

    @pytest.mark.asyncio
    async def test_on_sparkflow_end_success(
        self, callback_handler: ChatCallBacks
    ) -> None:
        """Test workflow end event handling with successful result."""
        message = Mock(spec=NodeRunResult)
        message.error = None

        with patch.object(LLMGenerate, "workflow_end") as mock_workflow_end:
            mock_resp = Mock()
            mock_workflow_end.return_value = mock_resp

            await callback_handler.on_sparkflow_end(message)

            mock_workflow_end.assert_called_once_with(
                sid="test_sid",
                workflow_usage=callback_handler.generate_usage,
                code=CodeEnum.Success.code,
                message=CodeEnum.Success.msg,
            )

            assert callback_handler.stream_queue.qsize() == 1
            queued_item = await callback_handler.stream_queue.get()
            assert queued_item == mock_resp

    @pytest.mark.asyncio
    async def test_on_sparkflow_end_variable_mode_uses_outputs(
        self, callback_handler: ChatCallBacks
    ) -> None:
        """Variable-mode end nodes should put selected outputs in final content."""
        callback_handler.end_node_output_mode = EndNodeOutputModeEnum.VARIABLE_MODE
        message = NodeRunResult(
            node_id="node-end::1",
            alias_name="End",
            node_type="node-end",
            error=None,
            outputs={"output": [{"name": "test"}]},
            node_answer_content="",
        )

        await callback_handler.on_sparkflow_end(message)

        queued_item = await callback_handler.stream_queue.get()
        assert queued_item.choices[0].delta.content == '{"output":[{"name":"test"}]}'

    @pytest.mark.asyncio
    async def test_on_sparkflow_end_with_error(
        self, callback_handler: ChatCallBacks
    ) -> None:
        """Test workflow end event handling with error."""
        error = CustomException(CodeEnum.PARAM_ERROR, "Test error")
        message = Mock(spec=NodeRunResult)
        message.error = error

        with patch.object(LLMGenerate, "workflow_end") as mock_workflow_end:
            mock_resp = Mock()
            mock_workflow_end.return_value = mock_resp

            await callback_handler.on_sparkflow_end(message)

            mock_workflow_end.assert_called_once_with(
                sid="test_sid",
                workflow_usage=callback_handler.generate_usage,
                code=error.code,
                message=error.message,
            )

    @pytest.mark.asyncio
    async def test_on_node_start(self, callback_handler: ChatCallBacks) -> None:
        """Test node start event handling."""
        with patch.object(
            callback_handler, "_put_frame_into_queue", new_callable=AsyncMock
        ) as mock_put:
            with patch.object(LLMGenerate, "node_start") as mock_node_start:
                with patch("time.time", return_value=1000.0):
                    mock_resp = Mock()
                    mock_node_start.return_value = mock_resp

                    await callback_handler.on_node_start(0, "test_node", "Test Node")

                    # Check start time was recorded
                    assert (
                        callback_handler.node_execute_start_time["test_node"] == 1000.0
                    )

                    mock_node_start.assert_called_once_with(
                        sid="test_sid",
                        node_id="test_node",
                        alias_name="Test Node",
                        progress=0.0,  # Unknown node returns 0.0 progress
                        code=0,
                        message="Success",
                    )

                    mock_put.assert_called_once_with("test_node", mock_resp)

    @pytest.mark.asyncio
    async def test_on_node_process_success(
        self, callback_handler: ChatCallBacks
    ) -> None:
        """Test node process event handling with success."""
        callback_handler.node_execute_start_time["test_node"] = 1000.0

        with patch.object(
            callback_handler, "_put_frame_into_queue", new_callable=AsyncMock
        ) as mock_put:
            with patch.object(LLMGenerate, "node_process") as mock_node_process:
                with patch("time.time", return_value=1005.0):
                    mock_resp = Mock()
                    mock_node_process.return_value = mock_resp

                    await callback_handler.on_node_process(
                        0, "test_node", "Test Node", "Test message", "Test reasoning"
                    )

                    mock_node_process.assert_called_once_with(
                        sid="test_sid",
                        node_id="test_node",
                        alias_name="Test Node",
                        node_executed_time=5.0,
                        node_ext=None,
                        progress=0.0,
                        content="Test message",
                        reasoning_content="Test reasoning",
                        code=0,
                        message="Success",
                    )

                    mock_put.assert_called_once_with("test_node", mock_resp)

    @pytest.mark.asyncio
    async def test_on_node_process_error(self, callback_handler: ChatCallBacks) -> None:
        """Test node process event handling with error."""
        callback_handler.node_execute_start_time["test_node"] = 1000.0

        with patch.object(
            callback_handler, "_put_frame_into_queue", new_callable=AsyncMock
        ):
            with patch.object(LLMGenerate, "node_process") as mock_node_process:
                with patch("time.time", return_value=1005.0):
                    mock_resp = Mock()
                    mock_node_process.return_value = mock_resp

                    await callback_handler.on_node_process(
                        500, "test_node", "Test Node", "Error message"
                    )

                    mock_node_process.assert_called_once_with(
                        sid="test_sid",
                        node_id="test_node",
                        alias_name="Test Node",
                        node_executed_time=5.0,
                        node_ext=None,
                        progress=0.0,
                        content="",  # Empty content on error
                        reasoning_content="",
                        code=500,
                        message="Error message",
                    )

    @pytest.mark.asyncio
    async def test_on_node_process_end_node_prompt_mode(
        self, callback_handler: ChatCallBacks
    ) -> None:
        """Test node process for end node in prompt mode."""
        callback_handler.node_execute_start_time["node-end:1"] = 1000.0

        with patch.object(
            callback_handler, "_put_frame_into_queue", new_callable=AsyncMock
        ):
            with patch.object(LLMGenerate, "node_process") as mock_node_process:
                with patch("time.time", return_value=1005.0):
                    mock_resp = Mock()
                    mock_node_process.return_value = mock_resp

                    await callback_handler.on_node_process(
                        0, "node-end:1", "End Node", "Test message"
                    )

                    # Check ext parameter for end node
                    args, kwargs = mock_node_process.call_args
                    assert kwargs["node_ext"] == {
                        "answer_mode": EndNodeOutputModeEnum.PROMPT_MODE.value
                    }
                    assert kwargs["content"] == "Test message"

    @pytest.mark.asyncio
    async def test_on_node_process_end_node_variable_mode(
        self, callback_handler: ChatCallBacks
    ) -> None:
        """Test node process for end node in variable mode."""
        callback_handler.end_node_output_mode = EndNodeOutputModeEnum.VARIABLE_MODE
        callback_handler.node_execute_start_time["node-end:1"] = 1000.0

        with patch.object(
            callback_handler, "_put_frame_into_queue", new_callable=AsyncMock
        ):
            with patch.object(LLMGenerate, "node_process") as mock_node_process:
                with patch("time.time", return_value=1005.0):
                    mock_resp = Mock()
                    mock_node_process.return_value = mock_resp

                    await callback_handler.on_node_process(
                        0, "node-end:1", "End Node", "Test message"
                    )

                    # Check content is empty for variable mode
                    args, kwargs = mock_node_process.call_args
                    assert kwargs["content"] == ""

    @pytest.mark.asyncio
    async def test_on_node_interrupt(self, callback_handler: ChatCallBacks) -> None:
        """Test node interrupt event handling."""
        callback_handler.node_execute_start_time["test_node"] = 1000.0

        with patch.object(
            callback_handler, "_put_frame_into_queue", new_callable=AsyncMock
        ) as mock_put:
            with patch.object(LLMGenerate, "node_interrupt") as mock_node_interrupt:
                with patch("time.time", return_value=1005.0):
                    mock_resp = Mock()
                    mock_node_interrupt.return_value = mock_resp

                    interrupt_value = {"reason": "user_requested"}

                    await callback_handler.on_node_interrupt(
                        "event_123",
                        interrupt_value,
                        "test_node",
                        "Test Node",
                        500,
                        "interrupt",
                        True,
                    )

                    mock_node_interrupt.assert_called_once_with(
                        sid="test_sid",
                        event_id="event_123",
                        need_reply=True,
                        value=interrupt_value,
                        node_id="test_node",
                        alias_name="Test Node",
                        node_executed_time=5.0,
                        node_ext=None,
                        progress=0.0,
                        code=500,
                        message="Success",
                        finish_reason="interrupt",
                    )

                    mock_put.assert_called_once_with("test_node", mock_resp)

    @pytest.mark.asyncio
    async def test_on_node_end_success(self, callback_handler: ChatCallBacks) -> None:
        """Test node end event handling with successful result."""
        callback_handler.node_execute_start_time["test_node"] = 1000.0

        # Create mock node result
        message = Mock(spec=NodeRunResult)
        message.error = None
        message.token_cost = GenerateUsage(
            prompt_tokens=10, completion_tokens=20, total_tokens=30
        )
        message.raw_output = "Raw output"
        message.node_answer_content = "Answer content"
        message.node_answer_reasoning_content = "Reasoning content"
        message.inputs = {"input1": "value1"}
        message.outputs = {"output1": "result1"}
        message.error_outputs = {}

        with patch.object(
            callback_handler, "_put_frame_into_queue", new_callable=AsyncMock
        ) as mock_put:
            with patch("time.time", return_value=1005.0):
                await callback_handler.on_node_end("spark-llm:1", "LLM Node", message)

                # Check usage was updated
                assert callback_handler.generate_usage.prompt_tokens == 10
                assert callback_handler.generate_usage.completion_tokens == 20
                assert callback_handler.generate_usage.total_tokens == 30

                mock_put.assert_called_once()
                args, kwargs = mock_put.call_args
                assert args[0] == "spark-llm:1"
                assert kwargs["finish_reason"] == ChatStatus.FINISH_REASON.value

    @pytest.mark.asyncio
    async def test_on_node_end_with_error_param(
        self, callback_handler: ChatCallBacks
    ) -> None:
        """Test node end event handling with error parameter."""
        error = CustomException(CodeEnum.PARAM_ERROR, "Test error")

        with patch.object(
            callback_handler, "_on_node_end_error", new_callable=AsyncMock
        ) as mock_error:
            await callback_handler.on_node_end("test_node", "Test Node", None, error)

            mock_error.assert_called_once_with("test_node", "Test Node", error)

    @pytest.mark.asyncio
    async def test_on_node_end_with_none_message(
        self, callback_handler: ChatCallBacks
    ) -> None:
        """Test node end event handling with None message."""
        with patch.object(
            callback_handler, "_on_node_end_error", new_callable=AsyncMock
        ) as mock_error:
            await callback_handler.on_node_end("test_node", "Test Node", None)

            mock_error.assert_called_once()
            args, kwargs = mock_error.call_args
            assert args[0] == "test_node"
            assert args[1] == "Test Node"
            assert isinstance(args[2], CustomException)
            assert args[2].code == CodeEnum.NODE_RUN_ERROR.value[0]

    @pytest.mark.asyncio
    async def test_on_node_end_with_message_error(
        self, callback_handler: ChatCallBacks
    ) -> None:
        """Test node end event handling with message containing error."""
        error = CustomException(CodeEnum.PARAM_ERROR, "Test error")
        message = Mock(spec=NodeRunResult)
        message.error = error

        with patch.object(
            callback_handler, "_on_node_end_error", new_callable=AsyncMock
        ) as mock_error:
            await callback_handler.on_node_end("test_node", "Test Node", message)

            mock_error.assert_called_once_with("test_node", "Test Node", error)

    @pytest.mark.asyncio
    async def test_on_node_end_end_node_variable_mode(
        self, callback_handler: ChatCallBacks
    ) -> None:
        """Test node end for end node in variable mode."""
        callback_handler.end_node_output_mode = EndNodeOutputModeEnum.VARIABLE_MODE
        callback_handler.node_execute_start_time["node-end:1"] = 1000.0

        message = Mock(spec=NodeRunResult)
        message.error = None
        message.token_cost = None
        message.raw_output = None
        message.node_answer_content = "Answer content"
        message.node_answer_reasoning_content = "Reasoning content"
        message.inputs = {"input1": "value1"}
        message.outputs = {"output1": "result1"}
        message.error_outputs = {}

        with patch.object(
            callback_handler, "_put_frame_into_queue", new_callable=AsyncMock
        ) as mock_put:
            with patch("time.time", return_value=1005.0):
                await callback_handler.on_node_end("node-end:1", "End Node", message)

                mock_put.assert_called_once()
                args, kwargs = mock_put.call_args
                llm_generate = args[1]

                # Content should be JSON serialized outputs for variable mode
                content = llm_generate.choices[0].delta.content
                assert content == json.dumps(
                    message.outputs, ensure_ascii=False, separators=(",", ":")
                )

    @pytest.mark.asyncio
    async def test_on_node_end_error(self, callback_handler: ChatCallBacks) -> None:
        """Test node end error handling."""
        callback_handler.node_execute_start_time["test_node"] = 1000.0
        error = CustomException(CodeEnum.PARAM_ERROR, "Test error")

        with patch.object(
            callback_handler, "_put_frame_into_queue", new_callable=AsyncMock
        ) as mock_put:
            with patch("time.time", return_value=1005.0):
                await callback_handler._on_node_end_error(
                    "test_node", "Test Node", error
                )

                mock_put.assert_called_once()
                args, kwargs = mock_put.call_args
                assert args[0] == "test_node"
                assert kwargs["finish_reason"] == ChatStatus.FINISH_REASON.value

                llm_generate = args[1]
                assert llm_generate.code == error.code
                assert llm_generate.message == error.message

    @pytest.mark.asyncio
    async def test_on_node_end_error_llm_node(
        self, callback_handler: ChatCallBacks
    ) -> None:
        """Test node end error handling for LLM node."""
        callback_handler.node_execute_start_time["spark-llm:1"] = 1000.0
        error = CustomException(CodeEnum.PARAM_ERROR, "Test error")

        with patch.object(
            callback_handler, "_put_frame_into_queue", new_callable=AsyncMock
        ) as mock_put:
            with patch("time.time", return_value=1005.0):
                await callback_handler._on_node_end_error(
                    "spark-llm:1", "LLM Node", error
                )

                mock_put.assert_called_once()
                args, kwargs = mock_put.call_args
                llm_generate = args[1]

                # LLM nodes should have usage information
                assert llm_generate.workflow_step.node.usage is not None
                assert isinstance(llm_generate.workflow_step.node.usage, GenerateUsage)

    @pytest.mark.asyncio
    async def test_put_frame_into_queue_message_node(
        self, callback_handler: ChatCallBacks
    ) -> None:
        """Test putting frame into queue for message node."""
        resp = Mock()

        await callback_handler._put_frame_into_queue("message:1", resp, "stop")

        # Should go to order queue
        assert callback_handler.order_stream_result_q.qsize() == 1
        queued_item = await callback_handler.order_stream_result_q.get()

        assert isinstance(queued_item, ChatCallBackStreamResult)
        assert queued_item.node_id == "message:1"
        assert queued_item.node_answer_content == resp
        assert queued_item.finish_reason == "stop"

    @pytest.mark.asyncio
    async def test_put_frame_into_queue_end_node(
        self, callback_handler: ChatCallBacks
    ) -> None:
        """Test putting frame into queue for end node."""
        resp = Mock()

        await callback_handler._put_frame_into_queue("node-end:1", resp, "stop")

        # Should go to order queue
        assert callback_handler.order_stream_result_q.qsize() == 1
        queued_item = await callback_handler.order_stream_result_q.get()

        assert isinstance(queued_item, ChatCallBackStreamResult)
        assert queued_item.node_id == "node-end:1"

    @pytest.mark.asyncio
    async def test_put_frame_into_queue_other_node(
        self, callback_handler: ChatCallBacks
    ) -> None:
        """Test putting frame into queue for other node types."""
        resp = Mock()

        await callback_handler._put_frame_into_queue("spark-llm:1", resp)

        # Should go directly to stream queue
        assert callback_handler.stream_queue.qsize() == 1
        queued_item = await callback_handler.stream_queue.get()
        assert queued_item == resp


class TestChatCallBackConsumer:
    """
    Test cases for ChatCallBackConsumer class.

    Tests the consumer functionality for callback results processing.
    """

    @pytest.fixture
    def consumer(self) -> ChatCallBackConsumer:
        """Create a ChatCallBackConsumer instance for testing."""
        need_order_q: asyncio.Queue = asyncio.Queue()
        support_node_q: asyncio.Queue = asyncio.Queue()
        structured_data: dict = {}

        return ChatCallBackConsumer(
            need_order_stream_result_q=need_order_q,
            support_stream_node_id_queue=support_node_q,
            structured_data=structured_data,
        )

    def test_init(self, consumer: ChatCallBackConsumer) -> None:
        """Test initialization of ChatCallBackConsumer."""
        assert isinstance(consumer.need_order_stream_result_q, asyncio.Queue)
        assert isinstance(consumer.support_stream_node_id_queue, asyncio.Queue)
        assert isinstance(consumer.structured_data, dict)
        assert isinstance(consumer.support_stream_node_id_set, set)
        assert len(consumer.support_stream_node_id_set) == 0

    @pytest.mark.asyncio
    async def test_consume_new_node(self, consumer: ChatCallBackConsumer) -> None:
        """Test consuming result from new node."""
        llm_generate = LLMGenerate(id="test_sid", choices=[])
        result = ChatCallBackStreamResult(
            node_id="test_node", node_answer_content=llm_generate
        )

        # Put result in queue
        await consumer.need_order_stream_result_q.put(result)

        # Mock _add_node_in_q
        with patch.object(
            consumer, "_add_node_in_q", new_callable=AsyncMock
        ) as mock_add:
            # Start consumer task
            task = asyncio.create_task(consumer.consume())

            # Wait a bit for processing
            await asyncio.sleep(0.01)

            # Stop the task
            task.cancel()

            try:
                await task
            except asyncio.CancelledError:
                pass

            # Check that node was added and result was stored
            mock_add.assert_called_once_with("test_node")
            assert "test_node" in consumer.structured_data
            assert consumer.structured_data["test_node"].qsize() == 1

    @pytest.mark.asyncio
    async def test_consume_existing_node(self, consumer: ChatCallBackConsumer) -> None:
        """Test consuming result from existing node."""
        # Add node to existing set
        consumer.support_stream_node_id_set.add("test_node")
        consumer.structured_data["test_node"] = asyncio.Queue()

        llm_generate = LLMGenerate(id="test_sid", choices=[])
        result = ChatCallBackStreamResult(
            node_id="test_node", node_answer_content=llm_generate
        )

        await consumer.need_order_stream_result_q.put(result)

        with patch.object(
            consumer, "_add_node_in_q", new_callable=AsyncMock
        ) as mock_add:
            task = asyncio.create_task(consumer.consume())
            await asyncio.sleep(0.01)
            task.cancel()

            try:
                await task
            except asyncio.CancelledError:
                pass

            # Should not add node again
            mock_add.assert_not_called()
            assert consumer.structured_data["test_node"].qsize() == 1

    @pytest.mark.asyncio
    async def test_consume_end_node_finish(
        self, consumer: ChatCallBackConsumer
    ) -> None:
        """Test consuming end node with finish reason."""
        llm_generate = LLMGenerate(id="test_sid", choices=[])
        result = ChatCallBackStreamResult(
            node_id="node-end::1",
            node_answer_content=llm_generate,
            finish_reason=ChatStatus.FINISH_REASON.value,
        )

        await consumer.need_order_stream_result_q.put(result)

        with patch.object(
            consumer, "_add_node_in_q", new_callable=AsyncMock
        ) as mock_add:
            # Consumer should exit after processing end node
            await consumer.consume()

            # Should add both the end node and finish reason
            assert mock_add.call_count == 2
            mock_add.assert_any_call("node-end::1")
            mock_add.assert_any_call(ChatStatus.FINISH_REASON.value)

    @pytest.mark.asyncio
    async def test_consume_cancelled_error(
        self, consumer: ChatCallBackConsumer
    ) -> None:
        """Test consume handling CancelledError."""
        # Create a task that will be cancelled
        task = asyncio.create_task(consumer.consume())
        await asyncio.sleep(0.01)  # Let it start
        task.cancel()

        # Should exit gracefully
        try:
            await task
        except asyncio.CancelledError:
            pass  # Expected

    @pytest.mark.asyncio
    async def test_consume_runtime_error_event_loop_closed(
        self, consumer: ChatCallBackConsumer
    ) -> None:
        """Test consume handling RuntimeError for closed event loop."""
        # Put a result to process
        llm_generate = LLMGenerate(id="test_sid", choices=[])
        result = ChatCallBackStreamResult(
            node_id="test_node", node_answer_content=llm_generate
        )
        await consumer.need_order_stream_result_q.put(result)

        # Mock the queue to raise RuntimeError
        with patch.object(
            consumer.need_order_stream_result_q,
            "get",
            side_effect=RuntimeError("Event loop is closed"),
        ):
            # Should exit gracefully
            await consumer.consume()

    @pytest.mark.asyncio
    async def test_consume_runtime_error_other(
        self, consumer: ChatCallBackConsumer
    ) -> None:
        """Test consume handling other RuntimeError."""
        # Put a result to process
        llm_generate = LLMGenerate(id="test_sid", choices=[])
        result = ChatCallBackStreamResult(
            node_id="test_node", node_answer_content=llm_generate
        )
        await consumer.need_order_stream_result_q.put(result)

        # Mock the queue to raise RuntimeError
        with patch.object(
            consumer.need_order_stream_result_q,
            "get",
            side_effect=RuntimeError("Other error"),
        ):
            with pytest.raises(RuntimeError, match="Other error"):
                await consumer.consume()

    @pytest.mark.asyncio
    async def test_consume_general_exception(
        self, consumer: ChatCallBackConsumer
    ) -> None:
        """Test consume handling general exceptions."""
        # Put a result to process
        llm_generate = LLMGenerate(id="test_sid", choices=[])
        result = ChatCallBackStreamResult(
            node_id="test_node", node_answer_content=llm_generate
        )
        await consumer.need_order_stream_result_q.put(result)

        # Create a second result to continue loop after exception
        result2 = ChatCallBackStreamResult(
            node_id="node-end::1",
            node_answer_content=llm_generate,
            finish_reason=ChatStatus.FINISH_REASON.value,
        )
        await consumer.need_order_stream_result_q.put(result2)

        # Mock _add_node_in_q to raise exception for first call
        call_count = 0

        async def mock_add_node(node_id: str) -> None:
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise ValueError("Test exception")

        with patch.object(consumer, "_add_node_in_q", side_effect=mock_add_node):
            with patch("logging.exception") as mock_log:
                await consumer.consume()

                # Should log the exception and continue
                mock_log.assert_called_once_with(
                    "ChatCallBackConsumer consume exception"
                )

    @pytest.mark.asyncio
    async def test_add_node_in_q(self, consumer: ChatCallBackConsumer) -> None:
        """Test adding node to queue and set."""
        await consumer._add_node_in_q("test_node")

        assert "test_node" in consumer.support_stream_node_id_set
        assert consumer.support_stream_node_id_queue.qsize() == 1

        queued_node = await consumer.support_stream_node_id_queue.get()
        assert queued_node == "test_node"


class TestStructuredConsumer:
    """
    Test cases for StructuredConsumer class.

    Tests the structured data consumer functionality.
    """

    @pytest.fixture
    def consumer(self) -> StructuredConsumer:
        """Create a StructuredConsumer instance for testing."""
        support_node_q: asyncio.Queue = asyncio.Queue()
        structured_data: dict = {}
        stream_queue: asyncio.Queue = asyncio.Queue()
        support_node_set: set = set()

        return StructuredConsumer(
            support_stream_node_id_queue=support_node_q,
            structured_data=structured_data,
            stream_queue=stream_queue,
            support_stream_node_id_set=support_node_set,
        )

    def test_init(self, consumer: StructuredConsumer) -> None:
        """Test initialization of StructuredConsumer."""
        assert isinstance(consumer.support_stream_node_id_queue, asyncio.Queue)
        assert isinstance(consumer.structured_data, dict)
        assert isinstance(consumer.stream_queue, asyncio.Queue)
        assert isinstance(consumer.support_stream_node_id_set, set)

    @pytest.mark.asyncio
    async def test_consume_normal_node(self, consumer: StructuredConsumer) -> None:
        """Test consuming normal node."""
        # Add node to queue
        await consumer.support_stream_node_id_queue.put("test_node")

        with patch.object(
            consumer, "order_stream_output", new_callable=AsyncMock
        ) as mock_order:
            task = asyncio.create_task(consumer.consume())
            await asyncio.sleep(0.01)  # Let it process
            task.cancel()

            try:
                await task
            except asyncio.CancelledError:
                pass

            mock_order.assert_called_once_with("test_node")

    @pytest.mark.asyncio
    async def test_consume_finish_reason(self, consumer: StructuredConsumer) -> None:
        """Test consuming finish reason to stop loop."""
        await consumer.support_stream_node_id_queue.put(ChatStatus.FINISH_REASON.value)

        with patch.object(
            consumer, "order_stream_output", new_callable=AsyncMock
        ) as mock_order:
            # Should exit after processing finish reason
            await consumer.consume()

            # Should not call order_stream_output for finish reason
            mock_order.assert_not_called()

    @pytest.mark.asyncio
    async def test_consume_exception_event_loop_closed(
        self, consumer: StructuredConsumer
    ) -> None:
        """Test consume handling event loop closed exception."""
        with patch.object(
            consumer.support_stream_node_id_queue,
            "get",
            side_effect=Exception("Event loop is closed"),
        ):
            # Should exit gracefully
            await consumer.consume()

    @pytest.mark.asyncio
    async def test_consume_exception_other(self, consumer: StructuredConsumer) -> None:
        """Test consume handling other exceptions."""
        await consumer.support_stream_node_id_queue.put("test_node")

        with patch.object(
            consumer, "order_stream_output", side_effect=ValueError("Test error")
        ):
            with patch("logging.error") as mock_log:
                with pytest.raises(ValueError, match="Test error"):
                    await consumer.consume()

                mock_log.assert_called_once()

    @pytest.mark.asyncio
    async def test_consume_task_done_called(self, consumer: StructuredConsumer) -> None:
        """Test that task_done is called even on exceptions."""
        await consumer.support_stream_node_id_queue.put("test_node")

        with patch.object(
            consumer.support_stream_node_id_queue, "task_done"
        ) as mock_done:
            with patch.object(
                consumer, "order_stream_output", side_effect=ValueError("Test error")
            ):
                with pytest.raises(ValueError):
                    await consumer.consume()

                mock_done.assert_called_once()

    @pytest.mark.asyncio
    async def test_order_stream_output_success(
        self, consumer: StructuredConsumer
    ) -> None:
        """Test successful order stream output."""
        # Set up structured data
        node_queue: asyncio.Queue = asyncio.Queue()
        consumer.structured_data["test_node"] = node_queue
        consumer.support_stream_node_id_set.add("test_node")

        # Add results to node queue
        llm_generate1 = LLMGenerate(id="test_sid", choices=[])
        result1 = ChatCallBackStreamResult(
            node_id="test_node", node_answer_content=llm_generate1
        )

        llm_generate2 = LLMGenerate(id="test_sid", choices=[])
        result2 = ChatCallBackStreamResult(
            node_id="test_node",
            node_answer_content=llm_generate2,
            finish_reason=ChatStatus.FINISH_REASON.value,
        )

        await node_queue.put(result1)
        await node_queue.put(result2)

        await consumer.order_stream_output("test_node")

        # Check results were added to stream queue
        assert consumer.stream_queue.qsize() == 2

        item1 = await consumer.stream_queue.get()
        assert item1 == llm_generate1

        item2 = await consumer.stream_queue.get()
        assert item2 == llm_generate2

        # Check node was cleaned up
        assert "test_node" not in consumer.support_stream_node_id_set
        assert "test_node" not in consumer.structured_data

    @pytest.mark.asyncio
    async def test_order_stream_output_no_queue(
        self, consumer: StructuredConsumer
    ) -> None:
        """Test order stream output with no queue for node."""
        with patch("logging.error") as mock_log:
            with pytest.raises(Exception, match="structured data queue is None"):
                await consumer.order_stream_output("nonexistent_node")

            mock_log.assert_called_once()

    @pytest.mark.asyncio
    async def test_order_stream_output_invalid_result_type(
        self, consumer: StructuredConsumer
    ) -> None:
        """Test order stream output with invalid result type."""
        # Set up structured data with wrong type
        node_queue: asyncio.Queue = asyncio.Queue()
        consumer.structured_data["test_node"] = node_queue
        consumer.support_stream_node_id_set.add("test_node")

        # Add invalid result type
        await node_queue.put("invalid_result")

        with patch("logging.error") as mock_log:
            with pytest.raises(
                Exception, match="need order stream result queue type error"
            ):
                await consumer.order_stream_output("test_node")

            mock_log.assert_called_once()

    @pytest.mark.asyncio
    async def test_wait_for_completion(self, consumer: StructuredConsumer) -> None:
        """Test waiting for completion."""
        # Mock the join method
        with patch.object(
            consumer.support_stream_node_id_queue, "join", new_callable=AsyncMock
        ) as mock_join:
            await consumer.wait_for_completion()
            mock_join.assert_called_once()


# Integration tests for full workflow
class TestCallbackHandlerIntegration:
    """
    Integration tests for callback handler components working together.
    """

    @pytest.mark.asyncio
    async def test_full_workflow_integration(self, mock_chains: Chains) -> None:
        """Test full workflow with all components working together."""
        # Set up all components
        stream_queue: asyncio.Queue = asyncio.Queue()
        order_queue: asyncio.Queue = asyncio.Queue()
        support_node_queue: asyncio.Queue = asyncio.Queue()
        structured_data: dict = {}
        support_node_set: set = set()

        callback_handler = ChatCallBacks(
            sid="test_sid",
            stream_queue=stream_queue,
            end_node_output_mode=EndNodeOutputModeEnum.PROMPT_MODE,
            support_stream_node_ids=support_node_set,
            need_order_stream_result_q=order_queue,
            chains=mock_chains,
            event_id="test_event",
            flow_id="test_flow",
        )

        consumer = ChatCallBackConsumer(
            need_order_stream_result_q=order_queue,
            support_stream_node_id_queue=support_node_queue,
            structured_data=structured_data,
        )

        _ = StructuredConsumer(
            support_stream_node_id_queue=support_node_queue,
            structured_data=structured_data,
            stream_queue=stream_queue,
            support_stream_node_id_set=support_node_set,
        )

        # Test workflow start
        await callback_handler.on_sparkflow_start()

        # Test message node (goes to order queue)
        await callback_handler._put_frame_into_queue(
            "message:1",
            LLMGenerate(id="test_sid", choices=[]),
            ChatStatus.FINISH_REASON.value,
        )

        # Process through consumer
        task = asyncio.create_task(consumer.consume())
        await asyncio.sleep(0.01)
        task.cancel()

        try:
            await task
        except asyncio.CancelledError:
            pass

        # Verify structured data was created
        assert "message:1" in structured_data
        assert "message:1" in consumer.support_stream_node_id_set

    @pytest.fixture
    def mock_chains(self) -> Chains:
        """Create mock chains for integration testing."""
        simple_path = Mock(spec=SimplePath)
        simple_path.inactive = Mock()
        simple_path.inactive.is_set.return_value = False
        simple_path.node_id_list = ["node1", "node2"]
        simple_path.every_node_index = {"node1": 1, "node2": 2}

        chains = Mock(spec=Chains)
        chains.master_chains = [simple_path]
        chains.get_all_simple_paths_node_cnt.return_value = 2

        return chains
