"""Test module for error handling components in the workflow engine.

This module contains comprehensive tests for various error handlers including
timeout errors, custom exceptions, retryable errors, and general error handling.
It validates the chain of responsibility pattern implementation for error processing.
"""

import asyncio
from typing import Any, Dict
from unittest.mock import AsyncMock, Mock, patch

import pytest

# Core workflow engine imports
from workflow.consts.engine.chat_status import ChatStatus
from workflow.consts.engine.error_handler import ErrorHandler
from workflow.consts.engine.model_provider import ModelProviderEnum
from workflow.engine.dsl_engine import (
    CustomExceptionInterruptHandler,
    ErrorHandlerChain,
    ExceptionHandlerBase,
    GeneralErrorHandler,
    RetryableErrorHandler,
    TimeoutErrorHandler,
    WorkflowEngineCtx,
)
from workflow.engine.entities.node_entities import NodeType
from workflow.engine.entities.retry_config import RetryConfig
from workflow.engine.node import SparkFlowEngineNode
from workflow.engine.nodes.entities.node_run_result import (
    NodeRunResult,
    WorkflowNodeExecutionStatus,
)
from workflow.exception.e import CustomException, CustomExceptionInterrupt
from workflow.exception.errors.err_code import CodeEnum
from workflow.extensions.otlp.trace.span import Span


class TestExceptionHandlerBase:
    """Test suite for the base exception handler class.

    This class tests the chain of responsibility pattern implementation
    for exception handlers in the workflow engine.
    """

    def test_set_next_handler_chain(self) -> None:
        """Test the chaining mechanism for setting next handlers.

        :return: None
        """
        handler1 = TimeoutErrorHandler()
        handler2 = CustomExceptionInterruptHandler()
        handler3 = GeneralErrorHandler()

        result = handler1.set_next(handler2).set_next(handler3)

        assert handler1.next_handler == handler2
        assert handler2.next_handler == handler3
        assert result == handler3


class TestTimeoutErrorHandler:
    """Test suite for timeout error handling functionality.

    This class validates the behavior of timeout error handlers,
    including delegation to next handlers in the chain.
    """

    @pytest.mark.asyncio
    async def test_handle_timeout_error(self) -> None:
        """Test handling of timeout errors.

        Verifies that timeout errors are properly handled and workflow
        execution is terminated when timeout occurs.

        :return: None
        """
        handler = TimeoutErrorHandler()
        mock_node = Mock(spec=SparkFlowEngineNode)
        mock_ctx = Mock(spec=WorkflowEngineCtx)
        mock_span = Mock(spec=Span)

        error = asyncio.TimeoutError("Timeout occurred")

        result, should_continue = await handler.handle(
            error, mock_node, mock_ctx, 0, mock_span
        )

        assert result is None
        assert should_continue is False

    @pytest.mark.asyncio
    async def test_handle_non_timeout_error_with_next_handler(self) -> None:
        """Test delegation to next handler for non-timeout errors.

        Ensures that non-timeout errors are properly delegated to the
        next handler in the chain when available.

        :return: None
        """
        handler = TimeoutErrorHandler()
        next_handler = Mock(spec=ExceptionHandlerBase)
        next_handler.handle = AsyncMock(return_value=(None, False))
        handler.set_next(next_handler)

        mock_node = Mock(spec=SparkFlowEngineNode)
        mock_ctx = Mock(spec=WorkflowEngineCtx)
        mock_span = Mock(spec=Span)

        error = ValueError("Not a timeout error")

        result, should_continue = await handler.handle(
            error, mock_node, mock_ctx, 0, mock_span
        )

        next_handler.handle.assert_called_once_with(
            error, mock_node, mock_ctx, 0, mock_span
        )
        assert result is None
        assert should_continue is False

    @pytest.mark.asyncio
    async def test_handle_non_timeout_error_without_next_handler(self) -> None:
        """Test handling of non-timeout errors without next handler.

        Verifies behavior when no next handler is available in the chain
        for processing non-timeout errors.

        :return: None
        """
        handler = TimeoutErrorHandler()
        mock_node = Mock(spec=SparkFlowEngineNode)
        mock_ctx = Mock(spec=WorkflowEngineCtx)
        mock_span = Mock(spec=Span)

        error = ValueError("Not a timeout error")

        result, should_continue = await handler.handle(
            error, mock_node, mock_ctx, 0, mock_span
        )

        assert result is None
        assert should_continue is False


class TestCustomExceptionInterruptHandler:
    """Test suite for custom exception interrupt handling.

    This class tests the handling of custom exception interrupts,
    including proper logging and callback execution.
    """

    @pytest.mark.asyncio
    async def test_handle_custom_exception_interrupt(self) -> None:
        """Test handling of custom exception interrupts.

        Verifies that custom exception interrupts are properly processed,
        logged, and callbacks are executed correctly.

        :return: None
        """
        handler = CustomExceptionInterruptHandler()

        mock_node = Mock(spec=SparkFlowEngineNode)
        mock_node.node_id = "test_node_id"
        mock_node.node_alias_name = "test_alias"
        mock_node.node_log = Mock()
        mock_node.node_log.running_status = True
        mock_node.node_log.add_error_log = Mock()
        mock_node.node_log.set_end = Mock()

        mock_ctx = Mock(spec=WorkflowEngineCtx)
        mock_ctx.event_log_trace = Mock()
        mock_ctx.event_log_trace.add_node_log = Mock()
        mock_ctx.callback = Mock()
        mock_ctx.callback.on_node_end = AsyncMock()

        mock_span = Mock(spec=Span)
        mock_span.add_error_event = Mock()
        mock_span.record_exception = Mock()

        error = CustomExceptionInterrupt(err_code=-1)
        error.message = "Test interrupt message"

        result, should_continue = await handler.handle(
            error, mock_node, mock_ctx, 0, mock_span
        )

        assert result is None
        assert should_continue is False
        mock_span.add_error_event.assert_called_once()
        mock_span.record_exception.assert_called_once_with(error)
        mock_ctx.event_log_trace.add_node_log.assert_called_once()
        mock_node.node_log.add_error_log.assert_called_once_with(
            "Test interrupt message"
        )
        mock_node.node_log.set_end.assert_called_once()
        mock_ctx.callback.on_node_end.assert_called_once_with(
            node_id="test_node_id", alias_name="test_alias", error=error
        )

    @pytest.mark.asyncio
    async def test_handle_non_interrupt_error_with_next_handler(self) -> None:
        """Test delegation to next handler for non-interrupt errors.

        Ensures that non-interrupt errors are properly delegated to the
        next handler in the chain when available.

        :return: None
        """
        handler = CustomExceptionInterruptHandler()
        next_handler = Mock(spec=ExceptionHandlerBase)
        next_handler.handle = AsyncMock(return_value=(None, True))
        handler.set_next(next_handler)

        mock_node = Mock(spec=SparkFlowEngineNode)
        mock_ctx = Mock(spec=WorkflowEngineCtx)
        mock_span = Mock(spec=Span)

        error = ValueError("Not an interrupt error")

        result, should_continue = await handler.handle(
            error, mock_node, mock_ctx, 0, mock_span
        )

        next_handler.handle.assert_called_once_with(
            error, mock_node, mock_ctx, 0, mock_span
        )
        assert result is None
        assert should_continue is True


class TestRetryableErrorHandler:
    """Test suite for retryable error handling functionality.

    This class tests the retry mechanism for errors that can be retried,
    including custom exception handling and retry configuration.
    """

    def setup_method(self) -> None:
        """Set up test fixtures and mock objects.

        Initializes common mock objects and configurations used across
        multiple test methods in this class.

        :return: None
        """
        self.handler = RetryableErrorHandler()

        self.mock_node = Mock(spec=SparkFlowEngineNode)
        self.mock_node.node_id = "test_node_id"
        self.mock_node.node_alias_name = "test_alias"
        self.mock_node.node_instance = Mock()
        self.mock_node.node_instance.retry_config = Mock(spec=RetryConfig)
        self.mock_node.node_instance.retry_config.max_retries = 3
        self.mock_node.node_instance.retry_config.error_strategy = (
            ErrorHandler.CustomReturn.value
        )
        self.mock_node.node_instance.retry_config.custom_output = {"custom": "output"}
        self.mock_node.node_instance.input_identifier = ["input1"]
        self.mock_node.node_type = "test_type"

        self.mock_ctx = Mock(spec=WorkflowEngineCtx)
        self.mock_ctx.variable_pool = Mock()
        self.mock_ctx.variable_pool.get_stream_node_has_sent_first_token = Mock(
            return_value=False
        )
        self.mock_ctx.variable_pool.get_variable = Mock(return_value="test_value")
        self.mock_ctx.variable_pool.add_variable = AsyncMock()
        self.mock_ctx.callback = Mock()
        self.mock_ctx.callback.on_node_end = AsyncMock()

        self.mock_span = Mock(spec=Span)

    @pytest.mark.asyncio
    async def test_handle_custom_exception_with_retry(self) -> None:
        """Test handling of retryable custom exceptions.

        Verifies that custom exceptions are properly identified as retryable
        and the retry mechanism is triggered.

        :return: None
        """
        error = CustomException(CodeEnum.NODE_RUN_ERROR, "Test error")

        result, should_retry = await self.handler.handle(
            error, self.mock_node, self.mock_ctx, 1, self.mock_span
        )

        assert result is None
        assert should_retry is True

    @pytest.mark.asyncio
    async def test_handle_custom_exception_first_token_sent(self) -> None:
        """Test custom exception handling when first token has been sent.

        Verifies that when the first token has been sent in a streaming
        context, the interruption handler is called appropriately.

        :return: None
        """
        self.mock_ctx.variable_pool.get_stream_node_has_sent_first_token.return_value = (
            True
        )

        error = CustomException(CodeEnum.NODE_RUN_ERROR, "Test error")
        error.message = "Test error"

        with patch.object(
            self.handler, "_handle_interruption", new_callable=AsyncMock
        ) as mock_interrupt:
            mock_interrupt.return_value = (None, False)

            _, _ = await self.handler.handle(
                error, self.mock_node, self.mock_ctx, 1, self.mock_span
            )

            mock_interrupt.assert_called_once_with(
                error, self.mock_node, self.mock_ctx, self.mock_span
            )

    @pytest.mark.asyncio
    async def test_handle_custom_exception_max_retries_exceeded(self) -> None:
        """Test custom exception handling when max retries are exceeded.

        Verifies that when the maximum number of retries has been reached,
        the final retry handler is called to handle the error.

        :return: None
        """
        error = CustomException(CodeEnum.NODE_RUN_ERROR, "Test error")

        with patch.object(
            self.handler, "_handle_final_retry", new_callable=AsyncMock
        ) as mock_final:
            mock_final.return_value = (Mock(spec=NodeRunResult), False)

            _, _ = await self.handler.handle(
                error, self.mock_node, self.mock_ctx, 3, self.mock_span
            )

            mock_final.assert_called_once_with(
                error, self.mock_node, self.mock_ctx, self.mock_span
            )

    @pytest.mark.asyncio
    async def test_handle_non_custom_exception_with_next_handler(self) -> None:
        """Test delegation to next handler for non-custom exceptions.

        Ensures that non-custom exceptions are properly delegated to the
        next handler in the chain when available.

        :return: None
        """
        next_handler = Mock(spec=ExceptionHandlerBase)
        next_handler.handle = AsyncMock(return_value=(None, False))
        self.handler.set_next(next_handler)

        error = ValueError("Not a custom exception")

        result, should_retry = await self.handler.handle(
            error, self.mock_node, self.mock_ctx, 0, self.mock_span
        )

        next_handler.handle.assert_called_once_with(
            error, self.mock_node, self.mock_ctx, 0, self.mock_span
        )

    @pytest.mark.asyncio
    async def test_create_custom_return_result(self) -> None:
        """Test creation of custom return results.

        Verifies that custom return results are properly created with
        the correct status and output format.

        :return: None
        """
        error = CustomException(CodeEnum.NODE_RUN_ERROR, "Test error")
        # error.code = "TEST_CODE"
        # error.message = "Test error message"
        custom_output = {"custom": "output"}

        result, fail_branch = await self.handler._create_custom_return_result(
            self.mock_node, self.mock_ctx, error, custom_output, self.mock_span
        )

        assert isinstance(result, NodeRunResult)
        assert result.status == WorkflowNodeExecutionStatus.SUCCEEDED
        assert result.outputs == custom_output
        assert result.error_outputs == {
            "errorCode": CodeEnum.NODE_RUN_ERROR.code,
            "errorMessage": "Node execution failed(Test error)",
        }
        assert fail_branch is False

    @pytest.mark.parametrize(
        "node_type,expected_content",
        [
            (
                NodeType.AGENT.value,
                {
                    "code": -1,
                    "choices": [{"finish_reason": ChatStatus.FINISH_REASON.value}],
                },
            ),
            (
                NodeType.KNOWLEDGE_PRO.value,
                {"code": -1, "finish_reason": ChatStatus.FINISH_REASON.value},
            ),
            (
                NodeType.FLOW.value,
                {
                    "code": -1,
                    "choices": [{"finish_reason": ChatStatus.FINISH_REASON.value}],
                },
            ),
            (
                NodeType.LLM.value,
                {
                    "header": {"code": -1, "status": 2},
                    "payload": {"choices": {"text": [{}]}},
                },
            ),
            ("unknown", {"code": -1}),
        ],
    )
    def test_get_error_llm_content(
        self, node_type: str, expected_content: Dict[str, Any]
    ) -> None:
        """Test retrieval of error LLM content for different node types.

        :param node_type: The type of node being tested
        :param expected_content: Expected content structure for the node type
        :return: None
        """
        self.mock_node.node_instance.source = ModelProviderEnum.XINGHUO.value

        with patch("workflow.consts.engine.chat_status.ChatStatus") as mock_chat_status:
            mock_chat_status.FINISH_REASON.value = "finish"
            with patch(
                "workflow.consts.engine.chat_status.SparkLLMStatus"
            ) as mock_llm_status:
                mock_llm_status.END.value = 2

                result = self.handler._get_error_llm_content(node_type, self.mock_node)

                assert result == expected_content


class TestGeneralErrorHandler:
    """Test suite for general error handling functionality.

    This class tests the fallback error handler that processes
    any errors not handled by more specific handlers.
    """

    @pytest.mark.asyncio
    async def test_handle_general_error(self) -> None:
        """Test handling of general errors.

        Verifies that general errors are properly processed with
        appropriate logging and callback execution.

        :return: None
        """
        handler = GeneralErrorHandler()

        mock_node = Mock(spec=SparkFlowEngineNode)
        mock_node.node_id = "test_node_id"
        mock_node.node_alias_name = "test_alias"
        mock_node.node_log = Mock()
        mock_node.node_log.add_error_log = Mock()
        mock_node.node_log.set_end = Mock()

        mock_ctx = Mock(spec=WorkflowEngineCtx)
        mock_ctx.event_log_trace = Mock()
        mock_ctx.event_log_trace.add_node_log = Mock()
        mock_ctx.callback = Mock()
        mock_ctx.callback.on_node_end = AsyncMock()

        mock_span = Mock(spec=Span)
        mock_span.add_error_event = Mock()

        error = ValueError("General error")

        result, should_continue = await handler.handle(
            error, mock_node, mock_ctx, 0, mock_span
        )

        assert result is None
        assert should_continue is False
        mock_span.add_error_event.assert_called_once()
        mock_node.node_log.add_error_log.assert_called_once()
        mock_ctx.event_log_trace.add_node_log.assert_called_once()
        mock_node.node_log.set_end.assert_called_once()
        mock_ctx.callback.on_node_end.assert_called_once()


class TestErrorHandlerChain:
    """Test suite for the error handler chain implementation.

    This class tests the chain of responsibility pattern implementation
    for error handling in the workflow engine.
    """

    def test_build_chain_structure(self) -> None:
        """Test the structure of the error handler chain.

        Verifies that the error handler chain is properly constructed
        with the correct sequence of handlers.

        :return: None
        """
        chain = ErrorHandlerChain()

        assert isinstance(chain.chain, TimeoutErrorHandler)
        assert isinstance(chain.chain.next_handler, CustomExceptionInterruptHandler)
        assert isinstance(chain.chain.next_handler.next_handler, RetryableErrorHandler)
        assert isinstance(
            chain.chain.next_handler.next_handler.next_handler, GeneralErrorHandler
        )

    @pytest.mark.asyncio
    async def test_handle_error_delegation(self) -> None:
        """Test error handling delegation mechanism.

        Verifies that errors are properly delegated through the
        handler chain until an appropriate handler is found.

        :return: None
        """
        chain = ErrorHandlerChain()

        mock_node = Mock(spec=SparkFlowEngineNode)
        mock_ctx = Mock(spec=WorkflowEngineCtx)
        mock_span = Mock(spec=Span)

        error = asyncio.TimeoutError("Timeout")

        result, should_continue = await chain.handle_error(
            error, mock_node, mock_ctx, 0, mock_span
        )

        assert result is None
        assert should_continue is False


class TestRetryableErrorHandlerAdvanced:
    """Test suite for advanced retryable error handler functionality.

    This class tests advanced features of the retryable error handler,
    including stream node error handling and LLM content generation.
    """

    def setup_method(self) -> None:
        """Set up test fixtures for advanced retryable error handler tests.

        Initializes the retryable error handler for testing advanced
        functionality and error handling scenarios.

        :return: None
        """
        self.handler = RetryableErrorHandler()

    @pytest.mark.asyncio
    async def test_handle_stream_node_error_output_with_stream_data(self) -> None:
        """Test handling of stream node error output with stream data.

        Verifies that stream node errors are properly handled when
        stream data is available in the variable pool.

        :return: None
        """
        mock_node = Mock(spec=SparkFlowEngineNode)
        mock_node.node_id = "agent::test_id"
        mock_node.node_instance = Mock()
        mock_node.node_instance.domain = "test_domain"

        mock_ctx = Mock(spec=WorkflowEngineCtx)
        mock_ctx.variable_pool = Mock()
        mock_ctx.variable_pool.stream_data = {"key1": {"agent::test_id": AsyncMock()}}

        mock_result = Mock(spec=NodeRunResult)
        mock_result.node_id = "agent::test_id"

        await self.handler._handle_stream_node_error_output(
            mock_node, mock_ctx, mock_result
        )

        # Verify that stream data is properly called when handling stream node errors
        mock_ctx.variable_pool.stream_data["key1"][
            "agent::test_id"
        ].put.assert_called_once()

    @pytest.mark.asyncio
    async def test_handle_stream_node_error_output_no_domain(self) -> None:
        """Test handling of stream node error output without domain.

        Verifies that stream node errors are handled correctly even
        when no domain is specified for the node.

        :return: None
        """
        mock_node = Mock(spec=SparkFlowEngineNode)
        mock_node.node_id = "agent::test_id"
        mock_node.node_instance = Mock()
        mock_node.node_instance.domain = ""

        mock_ctx = Mock(spec=WorkflowEngineCtx)
        mock_ctx.variable_pool = Mock()
        mock_ctx.variable_pool.stream_data = {"key1": {"agent::test_id": AsyncMock()}}

        mock_result = Mock(spec=NodeRunResult)
        mock_result.node_id = "agent::test_id"

        await self.handler._handle_stream_node_error_output(
            mock_node, mock_ctx, mock_result
        )

        # Verify that stream data works correctly even without domain attribute
        mock_ctx.variable_pool.stream_data["key1"][
            "agent::test_id"
        ].put.assert_called_once()

    def test_get_error_llm_content_openai_llm(self) -> None:
        """Test retrieval of error content for OpenAI LLM nodes.

        Verifies that error content is properly formatted for OpenAI
        LLM nodes with the correct structure and finish reason.

        :return: None
        """
        mock_node = Mock(spec=SparkFlowEngineNode)
        mock_node.node_instance = Mock()
        mock_node.node_instance.source = ModelProviderEnum.OPENAI.value

        with patch("workflow.consts.engine.chat_status.ChatStatus") as mock_chat_status:
            mock_chat_status.FINISH_REASON.value = "stop"

            result = self.handler._get_error_llm_content(NodeType.LLM.value, mock_node)

            expected = {"code": -1, "choices": [{"finish_reason": "stop"}]}
            assert result == expected

    def test_get_error_llm_content_with_source_attribute(self) -> None:
        """Test retrieval of LLM error content using source attribute.

        Verifies that error content is properly generated based on
        the source attribute of the node instance.

        :return: None
        """
        mock_node = Mock(spec=SparkFlowEngineNode)
        mock_node.node_instance = Mock()
        mock_node.node_instance.domain = ""
        mock_node.node_instance.source = ModelProviderEnum.XINGHUO.value

        with patch(
            "workflow.consts.engine.chat_status.SparkLLMStatus"
        ) as mock_llm_status:
            mock_llm_status.END.value = 2

            result = self.handler._get_error_llm_content(NodeType.LLM.value, mock_node)

            expected = {
                "header": {"code": -1, "status": 2},
                "payload": {"choices": {"text": [{}]}},
            }
            assert result == expected
