"""
OpenAI Chat AI implementation for LLM interactions.

This module provides an asynchronous interface for communicating with OpenAI's
chat completion API, including streaming support and error handling.
"""

import asyncio
import json
from typing import Any, AsyncIterator, Dict, Tuple

from workflow.consts.engine.chat_status import ChatStatus
from workflow.engine.nodes.entities.llm_response import LLMResponse
from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum
from workflow.extensions.otlp.log_trace.node_log import NodeLog
from workflow.extensions.otlp.trace.span import Span
from workflow.infra.providers.llm.chat_ai import ChatAI


class OpenAIChatAI(ChatAI):
    """
    OpenAI Chat AI implementation for handling chat completions.

    This class extends the base ChatAI class to provide OpenAI-specific
    functionality including streaming responses, token calculation, and
    message processing.
    """

    model_config = {"arbitrary_types_allowed": True, "protected_namespaces": ()}

    def token_calculation(self, text: str) -> int:
        """
        Calculate the number of tokens in the given text.

        :param text: Input text to calculate tokens for
        :return: Number of tokens in the text
        """
        raise NotImplementedError

    def image_processing(self, image_path: str) -> Any:
        """
        Process an image for LLM input.

        :param image_path: Path to the image file
        :return: Processed image data
        """
        raise NotImplementedError

    async def assemble_url(self, span: Span) -> str:
        """
        Assemble and validate the OpenAI API URL.

        :param span: Tracing span for logging
        :return: Validated API URL
        :raises CustomException: If the URL is empty or invalid
        """
        model_url = self.model_url.rsplit("/", 2)[0]
        if not model_url:
            raise CustomException(
                err_code=CodeEnum.OPEN_AI_REQUEST_ERROR,
                err_msg="Request URL is empty",
                cause_error="Request URL is empty",
            )
        await span.add_info_events_async({"openai_base_url": model_url})
        return model_url

    def assemble_payload(self, message: list) -> str:
        """
        Assemble the request payload data.

        :param message: List of messages to include in the payload
        :return: Serialized payload string
        """
        raise NotImplementedError

    def decode_message(self, msg: dict) -> Tuple[str, str, str, Dict[str, Any]]:
        """
        Decode a message from OpenAI API response.

        :param msg: Raw message dictionary from OpenAI API
        :return: Tuple containing (index, status, content, reasoning_content, token_usage)
        """
        token_usage = msg.get("usage") or {}
        choices = msg.get("choices") or []
        if not choices:
            return "", "", "", token_usage

        delta = choices[0]["delta"]
        status = choices[0]["finish_reason"]
        content = delta["content"]
        reasoning_content = delta.get("reasoning_content", "")
        return status, content, reasoning_content, token_usage

    async def _recv_messages(
        self,
        url: str,
        user_message: list,
        extra_params: dict,
        span: Span,
        timeout: float | None = None,
    ) -> AsyncIterator[LLMResponse]:
        """
        Receive streaming messages from OpenAI API.

        :param url: OpenAI API base URL
        :param user_message: List of messages to send
        :param extra_params: Additional parameters for the API request
        :param span: Tracing span for logging
        :param timeout: Optional timeout for frame processing
        :return: Async iterator of LLMResponse objects
        :raises CustomException: If request times out or fails
        """
        # Initialize OpenAI async client
        from openai import AsyncOpenAI  # type: ignore

        aclient = AsyncOpenAI(
            api_key=self.api_key,
            base_url=url,
        )
        stream = None
        try:
            # Create streaming chat completion
            stream = await aclient.chat.completions.create(
                model=self.model_name,
                messages=user_message,
                stream=True,
                **extra_params,
            )

            async for response in self._process_stream(stream, span, timeout):
                yield response

        finally:
            if stream:
                try:
                    await stream.aclose()
                except Exception:
                    span.add_error_events(
                        {"stream_close_error": "Failed to close stream"}
                    )

            if aclient:
                try:
                    await aclient.close()
                except Exception:
                    span.add_error_events(
                        {"client_close_error": "Failed to close client"}
                    )

    async def _process_stream(
        self,
        stream: Any,
        span: Span,
        timeout: float | None = None,
    ) -> AsyncIterator[LLMResponse]:
        last_frame_data: dict[str, Any] = {}
        latest_usage: dict[str, Any] = {}
        is_first_frame = True
        start_time = None

        while True:
            try:
                if is_first_frame and timeout is not None:
                    start_time = asyncio.get_event_loop().time()
                chunk = await self._next_stream_chunk(stream, timeout)

                # Track first frame timing for performance monitoring
                if is_first_frame:
                    is_first_frame = False
                    if start_time is not None:
                        first_frame_cost = asyncio.get_event_loop().time() - start_time
                        await span.add_info_events_async(
                            {"llm first token cost": first_frame_cost}
                        )

                # Log received chunk data
                await span.add_info_events_async(
                    {"recv": json.dumps(chunk.dict(), ensure_ascii=False)}
                )

                frame_data = chunk.dict()
                frame_data, latest_usage = self._normalize_stream_frame(
                    frame_data, latest_usage
                )
                if frame_data is None:
                    continue

                # Update last frame data and yield response
                last_frame_data = frame_data
                yield LLMResponse(
                    msg=last_frame_data,
                )

            except StopAsyncIteration:
                # Stream ended, mark as finished and yield final response
                final_frame_data = self._build_final_stream_frame(
                    last_frame_data, latest_usage
                )
                if final_frame_data is None:
                    break

                yield LLMResponse(
                    msg=final_frame_data,
                )
                break

            except asyncio.TimeoutError as e:
                # Handle timeout error
                raise CustomException(
                    err_code=CodeEnum.OPEN_AI_REQUEST_ERROR,
                    err_msg=f"LLM response timeout ({timeout}s)",
                    cause_error=f"LLM response timeout ({timeout}s)",
                ) from e

    @staticmethod
    async def _next_stream_chunk(stream: Any, timeout: float | None) -> Any:
        if timeout is None:
            return await stream.__anext__()
        return await asyncio.wait_for(stream.__anext__(), timeout=timeout)

    @staticmethod
    def _normalize_stream_frame(
        frame_data: dict[str, Any], latest_usage: dict[str, Any]
    ) -> tuple[dict[str, Any] | None, dict[str, Any]]:
        usage = frame_data.get("usage") or {}
        if usage:
            latest_usage = usage

        # Usage-only chunks have no delta and cannot be consumed downstream.
        if not (frame_data.get("choices") or []):
            return None, latest_usage

        if latest_usage and not usage:
            frame_data = {**frame_data, "usage": latest_usage}
        return frame_data, latest_usage

    @staticmethod
    def _build_final_stream_frame(
        last_frame_data: dict[str, Any], latest_usage: dict[str, Any]
    ) -> dict[str, Any] | None:
        if not last_frame_data:
            raise CustomException(
                err_code=CodeEnum.OPEN_AI_REQUEST_ERROR,
                err_msg="LLM stream returned no data",
                cause_error="LLM stream returned no data",
            )
        if last_frame_data["choices"][0].get("finish_reason"):
            return None

        return {
            **last_frame_data,
            "usage": latest_usage or last_frame_data.get("usage"),
            "choices": [
                {
                    "finish_reason": ChatStatus.FINISH_REASON.value,
                    "delta": {"content": "", "reasoning_content": ""},
                }
            ],
        }

    async def achat(  # noqa: C901
        self,
        flow_id: str,
        user_message: list,
        span: Span,
        extra_params: dict = {},
        timeout: float | None = None,
        search_disable: bool = True,
        event_log_node_trace: NodeLog | None = None,
        multimodal_inputs: list = [],
    ) -> AsyncIterator[LLMResponse]:
        """
        Send chat request and handle streaming response.

        :param flow_id: Unique identifier for the workflow flow
        :param user_message: List of messages to send to the LLM
        :param span: Tracing span for logging and monitoring
        :param extra_params: Additional parameters for the API request
        :param timeout: Optional timeout for the request
        :param search_disable: Whether to disable search functionality
        :param event_log_node_trace: Optional node trace logger
        :param multimodal_inputs: List of multimodal inputs to include
        :return: Async iterator of LLMResponse objects
        :raises CustomException: If request fails or times out
        """
        # Process multimodal inputs if provided
        if multimodal_inputs:
            # Find the last user message to append multimodal content
            last_user_msg_index = -1
            for i in range(len(user_message) - 1, -1, -1):
                if user_message[i].get("role") == "user":
                    last_user_msg_index = i
                    break

            if last_user_msg_index != -1:
                # Get the current content of the user message
                current_content = user_message[last_user_msg_index].get("content", [])

                # If current content is a string, convert it to the proper format
                if isinstance(current_content, str):
                    current_content = [{"type": "text", "text": current_content}]

                # Append multimodal content to the existing content
                for mm_input in multimodal_inputs:
                    mm_type = mm_input.get("type", "")
                    mm_url = mm_input.get("url", "")

                    if mm_type == "image":
                        current_content.append(
                            {"type": "image_url", "image_url": {"url": mm_url}}
                        )
                    elif mm_type == "audio":
                        current_content.append(
                            {"type": "input_audio", "input_audio": {"url": mm_url}}
                        )
                    elif mm_type == "video":
                        current_content.append(
                            {"type": "video_url", "video_url": {"url": mm_url}}
                        )

                # Update the user message with the new content
                user_message[last_user_msg_index]["content"] = current_content

        # Assemble API URL and log request information
        url = await self.assemble_url(span)
        await span.add_info_events_async({"domain": self.model_name})
        await span.add_info_events_async(
            {"extra_params": json.dumps(extra_params, ensure_ascii=False)}
        )

        try:

            # Log configuration data if trace logger is provided
            if event_log_node_trace:
                event_log_node_trace.append_config_data(
                    {
                        "model_name": self.model_name,
                        "base_url": url,
                        "message": user_message,
                        "extra_params": extra_params,
                    }
                )

            # Process streaming messages and yield responses
            async for msg in self._recv_messages(
                url, user_message, extra_params, span, timeout
            ):
                # Log message data if trace logger is provided
                if event_log_node_trace:
                    event_log_node_trace.add_info_log(
                        json.dumps(msg.msg, ensure_ascii=False)
                    )
                yield msg
        except CustomException as e:
            # Re-raise custom exceptions as-is
            raise e
        except Exception as e:
            # Record exception in span and wrap in custom exception
            span.record_exception(e)
            raise CustomException(
                err_code=CodeEnum.OPEN_AI_REQUEST_ERROR,
                err_msg=str(e),
                cause_error=str(e),
            )
