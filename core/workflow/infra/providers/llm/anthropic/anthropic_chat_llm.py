"""
Anthropic Chat AI implementation using official Anthropic SDK.

This module provides integration with the official Anthropic SDK to connect
with Claude models via the Messages API.
"""

import json
from typing import Any, AsyncIterator, Dict, List, Tuple

import anthropic
from anthropic.types import (
    MessageStreamEvent,
    RawContentBlockDeltaEvent,
    RawMessageDeltaEvent,
    RawMessageStartEvent,
    RawMessageStopEvent,
)

from workflow.consts.engine.chat_status import ChatStatus
from workflow.engine.nodes.entities.llm_response import LLMResponse
from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum
from workflow.extensions.otlp.log_trace.node_log import NodeLog
from workflow.extensions.otlp.trace.span import Span
from workflow.infra.providers.llm.chat_ai import ChatAI


class AnthropicChatAI(ChatAI):
    """
    Anthropic Chat AI implementation using official Anthropic SDK.

    This class implements the ChatAI interface to provide integration with
    Anthropic's Claude models using their official Python SDK.
    """

    model_config = {"arbitrary_types_allowed": True, "protected_namespaces": ()}

    def token_calculation(self, text: str) -> int:
        """Token calculation is not implemented for Anthropic."""
        raise NotImplementedError

    def image_processing(self, image_path: str) -> Any:
        """Image processing is not implemented for Anthropic."""
        raise NotImplementedError

    async def assemble_url(self, span: Span) -> str:
        """
        Assemble URL for Anthropic API calls.

        Returns the configured model URL or a default placeholder if not set.
        This allows for custom Anthropic-compatible endpoints.

        Args:
            span: OpenTelemetry span for tracing

        Returns:
            Configured API URL or placeholder
        """
        # If model_url is provided, use it as the base URL for Anthropic client
        if self.model_url:
            await span.add_info_events_async({"anthropic_base_url": self.model_url})
            return self.model_url
        else:
            # For standard Anthropic API, return a placeholder
            return "anthropic-sdk-placeholder"

    def assemble_payload(self, message: list) -> Dict[str, Any]:
        """
        Assemble the payload for Anthropic API calls.

        This method transforms the internal message format into the format
        expected by the Anthropic API.

        Args:
            message: List of message objects with role, content, and content_type

        Returns:
            Dictionary containing the formatted payload
        """
        system_parts: List[str] = []
        payload_messages: List[Dict[str, Any]] = []

        for item in message:
            role = item.get("role", "user")

            # Handle system messages separately
            if role == "system":
                system_parts.append(str(item.get("content", "")))
                continue

            content_type = item.get("content_type", "text")

            # Handle image content
            if content_type == "image":
                payload_messages.append(
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/jpeg",
                                    "data": str(item.get("content", "")),
                                },
                            }
                        ],
                    }
                )
                continue

            # Handle text content
            payload_messages.append(
                {
                    "role": "assistant" if role == "assistant" else "user",
                    "content": str(item.get("content", "")),
                }
            )

        # Prepare the final payload for Anthropic API
        payload: Dict[str, Any] = {
            "model": self.model_name,
            "messages": payload_messages,
            "stream": True,
            "max_tokens": self.max_tokens or 1024,
        }

        # Add system instructions if present
        if system_parts:
            payload["system"] = "\n".join(system_parts)

        # Add temperature if specified
        if self.temperature is not None:
            payload["temperature"] = self.temperature

        # Note: Anthropic doesn't use top_k, this would need to be handled differently
        if self.top_k is not None:
            pass

        return payload

    def decode_message(self, msg: dict) -> Tuple[str, str, str, Dict[str, Any]]:
        """
        Decode a message from the normalized response format.

        This method extracts the status, content, reasoning content, and token usage
        from the normalized response dictionary.

        Args:
            msg: Normalized response dictionary

        Returns:
            Tuple containing (status, content, reasoning_content, token_usage)
        """
        choice = msg["choices"][0]
        delta = choice.get("delta", {})
        finish_reason = choice.get("finish_reason")

        # Determine status based on finish reason
        status = ""
        if finish_reason in {
            ChatStatus.FINISH_REASON.value,
            "end_turn",
            "stop_sequence",
        }:
            status = ChatStatus.FINISH_REASON.value
        elif finish_reason:
            status = finish_reason

        # Extract content fields
        content = delta.get("content", "")
        reasoning_content = delta.get("reasoning_content", "")
        token_usage = msg.get("usage") or {}

        return status, content, reasoning_content, token_usage

    def _normalize_event(
        self, event: MessageStreamEvent, usage: Dict[str, Any]
    ) -> Dict[str, Any] | None:
        """
        Normalize Anthropic stream events to OpenAI-like structure.

        This method converts Anthropic-specific stream events into a standardized
        format that matches the expected OpenAI response structure.

        Args:
            event: Anthropic stream event object
            usage: Token usage statistics

        Returns:
            Normalized response dictionary or None if event should be skipped
        """
        # Message start event - don't emit content
        if isinstance(event, RawMessageStartEvent):
            return None

        # Content delta event - contains the actual text being streamed
        elif isinstance(event, RawContentBlockDeltaEvent):
            text = event.delta.text if hasattr(event.delta, "text") else ""  # type: ignore[union-attr]
            return {
                "choices": [
                    {
                        "delta": {
                            "content": text,
                            "reasoning_content": "",
                        },
                        "finish_reason": None,
                    }
                ],
                "usage": usage,
            }

        # Message delta event - contains usage information
        elif isinstance(event, RawMessageDeltaEvent):
            input_tokens = event.delta.usage.input_tokens  # type: ignore[attr-defined]
            output_tokens = event.delta.usage.output_tokens  # type: ignore[attr-defined]
            return {
                "choices": [
                    {
                        "delta": {"content": "", "reasoning_content": ""},
                        "finish_reason": None,
                    }
                ],
                "usage": {
                    "prompt_tokens": input_tokens,
                    "completion_tokens": output_tokens,
                    "total_tokens": input_tokens + output_tokens,
                },
            }

        # Message stop event - signals end of stream
        elif isinstance(event, RawMessageStopEvent):
            return {
                "choices": [
                    {
                        "delta": {"content": "", "reasoning_content": ""},
                        "finish_reason": ChatStatus.FINISH_REASON.value,
                    }
                ],
                "usage": usage,
            }

        # Error event - raise exception
        elif hasattr(event, "type") and "error" in event.type:
            raise CustomException(
                err_code=CodeEnum.OPEN_AI_REQUEST_ERROR,
                err_msg=str(getattr(event, "error", "Anthropic request failed")),
                cause_error=str(event),
            )
        else:
            # Other event types we don't handle
            return None

    async def _recv_messages(  # noqa: C901
        self,
        url: str,
        user_message: list,
        extra_params: dict,
        span: Span,
        timeout: float | None = None,
    ) -> AsyncIterator[LLMResponse]:
        """
        Receive messages using Anthropic SDK streaming.

        This method handles the streaming response from the Anthropic API,
        normalizes events, and yields LLMResponse objects.

        Args:
            url: API endpoint URL (used as base_url for Anthropic client)
            user_message: List of user messages to send
            extra_params: Additional parameters for the API call
            span: OpenTelemetry span for tracing
            timeout: Request timeout in seconds

        Yields:
            LLMResponse objects containing normalized API responses
        """
        # Prepare the payload
        payload = self.assemble_payload(user_message)
        payload.update(extra_params or {})

        # Initialize the Anthropic client with proper configuration
        # If a custom URL is provided, use it as the base_url for the client
        client_kwargs = {
            "api_key": self.api_key,
            "timeout": timeout or 60.0,  # Default to 60 seconds if no timeout specified
        }

        # If url is not the placeholder, use it as the base_url for custom endpoints
        if url and url != "anthropic-sdk-placeholder":
            client_kwargs["base_url"] = url

        client = anthropic.AsyncAnthropic(**client_kwargs)

        # Extract parameters for the API call
        model = payload.get("model", self.model_name)
        messages = payload.get("messages", [])
        max_tokens = payload.get("max_tokens", 1024)
        system = payload.get("system")
        temperature = payload.get("temperature")

        # Build the API call parameters
        api_params = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "stream": True,  # Enable streaming
        }

        # Add optional parameters if present
        if system:
            api_params["system"] = system
        if temperature is not None:
            api_params["temperature"] = temperature

        # Add any extra parameters that are valid for Anthropic API
        for key, value in (extra_params or {}).items():
            if key not in api_params:
                api_params[key] = value

        # Initialize usage tracking
        usage: Dict[str, Any] = {}

        try:
            # Make the async streaming call using Anthropic SDK
            async with client.messages.stream(**api_params) as stream:
                async for event in stream:
                    # Normalize the event to our standard format
                    normalized = self._normalize_event(event, usage)  # type: ignore[arg-type]

                    if normalized is None:
                        continue

                    # Log the received message for tracing
                    await span.add_info_events_async(
                        {"recv": json.dumps(normalized, ensure_ascii=False)}
                    )

                    # Yield the response
                    yield LLMResponse(msg=normalized)

        except anthropic.AuthenticationError as e:
            raise CustomException(
                err_code=CodeEnum.OPEN_AI_REQUEST_ERROR,
                err_msg="Anthropic authentication failed",
                cause_error=str(e),
            ) from e
        except anthropic.RateLimitError as e:
            raise CustomException(
                err_code=CodeEnum.OPEN_AI_REQUEST_ERROR,
                err_msg="Anthropic rate limit exceeded",
                cause_error=str(e),
            ) from e
        except anthropic.APIConnectionError as e:
            raise CustomException(
                err_code=CodeEnum.OPEN_AI_REQUEST_ERROR,
                err_msg="Anthropic connection error",
                cause_error=str(e),
            ) from e
        except anthropic.APIError as e:
            raise CustomException(
                err_code=CodeEnum.OPEN_AI_REQUEST_ERROR,
                err_msg=f"Anthropic API error: {str(e)}",
                cause_error=str(e),
            ) from e
        finally:
            # Ensure client resources are cleaned up
            await client.close()

    async def achat(
        self,
        flow_id: str,
        user_message: list,
        span: Span,
        extra_params: dict = {},
        timeout: float | None = None,
        search_disable: bool = True,
        event_log_node_trace: NodeLog | None = None,
    ) -> AsyncIterator[LLMResponse]:
        """
        Asynchronous chat method that initiates a conversation with Anthropic.

        This method orchestrates the chat interaction, including setting up spans,
        logging events, and processing the streamed responses.

        Args:
            flow_id: Unique identifier for the workflow flow
            user_message: List of messages from the user
            span: OpenTelemetry span for tracing
            extra_params: Additional parameters for the API call
            timeout: Request timeout in seconds
            search_disable: Whether to disable search functionality
            event_log_node_trace: Node logger for event tracing

        Yields:
            LLMResponse objects containing the API responses
        """
        # Set up tracing information
        url = await self.assemble_url(span)
        await span.add_info_events_async({"domain": self.model_name})
        await span.add_info_events_async(
            {"extra_params": json.dumps(extra_params, ensure_ascii=False)}
        )

        try:
            # Add configuration data to event log if provided
            if event_log_node_trace:
                event_log_node_trace.append_config_data(
                    {
                        "model_name": self.model_name,
                        "base_url": url,  # Log the base URL used
                        "message": user_message,
                        "extra_params": extra_params,
                    }
                )

            # Process the streamed responses
            async for msg in self._recv_messages(
                url, user_message, extra_params, span, timeout
            ):
                # Add response to event log if provided
                if event_log_node_trace:
                    event_log_node_trace.add_info_log(
                        json.dumps(msg.msg, ensure_ascii=False)
                    )
                yield msg
        except CustomException as e:
            raise e
        except Exception as e:
            span.record_exception(e)
            raise CustomException(
                err_code=CodeEnum.OPEN_AI_REQUEST_ERROR,
                err_msg=str(e),
                cause_error=str(e),
            ) from e
