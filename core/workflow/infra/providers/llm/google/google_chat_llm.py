"""
Google Gemini Chat AI implementation using official Google Generative AI SDK.

This module integrates with the official Google Generative AI SDK to connect
with Gemini models.
"""

import json
from typing import Any, AsyncIterator, Dict, List, Optional, Tuple

# Import Google GenAI SDK (new package name)
from google.genai import Client
from google.genai.types import Content, GenerateContentConfig, Part
from pydantic import Field

from workflow.consts.engine.chat_status import ChatStatus
from workflow.engine.nodes.entities.llm_response import LLMResponse
from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum
from workflow.extensions.otlp.log_trace.node_log import NodeLog
from workflow.extensions.otlp.trace.span import Span
from workflow.infra.providers.llm.chat_ai import ChatAI


class GoogleChatAI(ChatAI):
    """
    Google Gemini Chat AI implementation using official Google Generative AI SDK.

    This class implements the ChatAI interface to provide integration with
    Google's Gemini models using their official Python SDK.
    """

    model_config = {"arbitrary_types_allowed": True, "protected_namespaces": ()}

    # Google GenAI client instance (declared as field for Pydantic compatibility)
    client: Optional[Client] = Field(default=None, exclude=True)

    def __init__(self, **data: Any) -> None:
        """
        Initialize GoogleChatAI and create the GenAI client.

        Args:
            **data: Configuration data including api_key, model_name, etc.
        """
        super().__init__(**data)
        # Initialize the GenAI client once for reuse
        self.client = Client(api_key=self.api_key)

        # Handle custom endpoint if provided
        if self.model_url and self.model_url != "google-genai-sdk-placeholder":
            # Note: Custom endpoint configuration may require additional setup
            # depending on the specific endpoint requirements
            pass

    def token_calculation(self, text: str) -> int:
        """Token calculation is not implemented for Google."""
        raise NotImplementedError

    def image_processing(self, image_path: str) -> Any:
        """Image processing is not implemented for Google."""
        raise NotImplementedError

    async def assemble_url(self, span: Span) -> str:
        """
        Assemble URL for Google API calls.

        Returns the configured model URL or a default placeholder if not set.
        This allows for custom Google-compatible endpoints.

        Args:
            span: OpenTelemetry span for tracing

        Returns:
            Configured API URL or placeholder
        """
        if self.model_url:
            await span.add_info_events_async({"google_base_url": self.model_url})
            return self.model_url
        else:
            return "google-genai-sdk-placeholder"

    def assemble_payload(self, message: list) -> Dict[str, Any]:
        """
        Assemble the payload for Google API calls.

        This method transforms the internal message format into the format
        expected by the Google GenAI SDK. This is primarily for compatibility
        with the base ChatAI interface, as the SDK handles message conversion internally.

        Args:
            message: List of message objects with role, content, and content_type

        Returns:
            Dictionary containing the formatted payload
        """
        system_parts: List[str] = []
        converted_messages: List[Dict[str, Any]] = []

        for item in message:
            role = item.get("role", "user")

            # Handle system messages separately
            if role == "system":
                system_parts.append(str(item.get("content", "")))
                continue

            content_type = item.get("content_type", "text")

            # Handle image content
            if content_type == "image":
                converted_messages.append(
                    {
                        "role": "user",
                        "parts": [
                            Part.from_data(  # type: ignore[attr-defined]
                                mime_type="image/jpeg", data=item.get("content", "")
                            ),
                        ],
                    }
                )
            else:
                # Handle text content
                converted_messages.append(
                    {
                        "role": "model" if role == "assistant" else "user",
                        "parts": [str(item.get("content", ""))],
                    }
                )

        payload: Dict[str, Any] = {
            "messages": converted_messages,
            "system_instruction": "\n".join(system_parts) if system_parts else None,
        }

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
        if finish_reason in {ChatStatus.FINISH_REASON.value, "STOP", "stop"}:
            status = ChatStatus.FINISH_REASON.value
        elif finish_reason:
            status = str(finish_reason).lower()

        # Extract content fields
        content = delta.get("content", "")
        reasoning_content = delta.get("reasoning_content", "")
        token_usage = msg.get("usage") or {}

        return status, content, reasoning_content, token_usage

    async def _convert_messages_to_genai_format(
        self, message: list
    ) -> Tuple[List[Content], Optional[str]]:
        """
        Convert the internal message format to Google GenAI format.

        This helper method transforms messages from the internal representation
        to the Content format expected by Google's Generative AI SDK.

        Args:
            message: List of message objects with role, content, and content_type

        Returns:
            Tuple of (List of Content objects, system_instruction)
        """
        contents: List[Content] = []
        system_parts: List[str] = []

        for item in message:
            role = item.get("role", "user")
            content_type = item.get("content_type", "text")

            # Collect system messages
            if role == "system":
                system_parts.append(str(item.get("content", "")))
                continue

            if content_type == "image":
                # Handle image content
                image_data = item.get("content", "")
                if isinstance(image_data, str):
                    # Assuming it's base64 encoded image data
                    try:
                        part = Part.from_data(  # type: ignore[attr-defined]
                            mime_type="image/jpeg", data=image_data
                        )
                        contents.append(Content(role="user", parts=[part]))
                    except Exception as e:
                        # Log error but continue
                        print(f"Error processing image: {e}")
                        continue
            else:
                # Handle text content
                text_content = str(item.get("content", ""))
                if text_content:  # Only add non-empty text
                    # Use Part.from_text for text content
                    part = Part.from_text(text=text_content)
                    # Map roles: 'assistant' -> 'model', 'user' -> 'user'
                    mapped_role = "model" if role == "assistant" else "user"
                    contents.append(Content(role=mapped_role, parts=[part]))

        system_instruction = "\n".join(system_parts) if system_parts else None
        return contents, system_instruction

    async def _recv_messages(  # noqa: C901
        self,
        url: str,
        user_message: list,
        extra_params: dict,
        span: Span,
        timeout: float | None = None,
    ) -> AsyncIterator[LLMResponse]:
        """
        Receive messages using Google Generative AI SDK streaming.

        This method handles the streaming response from the Google GenAI API,
        processes chunks, and yields LLMResponse objects.

        Args:
            url: API endpoint URL (used for custom Google-compatible endpoints)
            user_message: List of user messages to send
            extra_params: Additional parameters for the API call
            span: OpenTelemetry span for tracing
            timeout: Request timeout in seconds

        Yields:
            LLMResponse objects containing normalized API responses
        """
        # Convert messages to Google GenAI format
        contents, system_instruction = await self._convert_messages_to_genai_format(
            user_message
        )

        # Validate we have content to send
        if not contents:
            raise CustomException(
                err_code=CodeEnum.OPEN_AI_REQUEST_ERROR,
                err_msg="No valid content to send to Google API",
                cause_error="Empty content after conversion",
            )

        # Build generation configuration
        generation_config = GenerateContentConfig(
            max_output_tokens=self.max_tokens,
            temperature=self.temperature,
        )

        # Add system instruction if present
        if system_instruction:
            generation_config.system_instruction = system_instruction

        # Handle extra parameters
        if extra_params:
            # Map common parameters to GenerateContentConfig fields
            param_mapping = {
                "top_p": "top_p",
                "top_k": "top_k",
                "candidate_count": "candidate_count",
                "stop_sequences": "stop_sequences",
                "presence_penalty": "presence_penalty",
                "frequency_penalty": "frequency_penalty",
            }

            for extra_key, config_key in param_mapping.items():
                if extra_key in extra_params:
                    setattr(generation_config, config_key, extra_params[extra_key])

            # Handle response_mime_type if specified
            if "response_mime_type" in extra_params:
                generation_config.response_mime_type = extra_params[
                    "response_mime_type"
                ]

        try:
            usage = {}  # Initialize usage dict

            # Use the async streaming method from the client
            async for chunk in self.client.aio.models.generate_content_stream(  # type: ignore[union-attr]
                model=self.model_name,
                contents=contents,
                config=generation_config,
            ):
                # Extract text from chunk
                text = ""
                if hasattr(chunk, "text") and chunk.text:
                    text = chunk.text
                elif hasattr(chunk, "candidates") and chunk.candidates:
                    # Alternative way to extract text from response
                    candidate = chunk.candidates[0]
                    if hasattr(candidate, "content") and candidate.content:
                        for part in candidate.content.parts:
                            if hasattr(part, "text"):
                                text += part.text

                # Extract usage metadata if available
                if hasattr(chunk, "usage_metadata") and chunk.usage_metadata:
                    usage_metadata = chunk.usage_metadata
                    usage = {
                        "prompt_tokens": getattr(
                            usage_metadata, "prompt_token_count", 0
                        ),
                        "completion_tokens": getattr(
                            usage_metadata, "candidates_token_count", 0
                        ),
                        "total_tokens": getattr(usage_metadata, "total_token_count", 0),
                    }

                # Build normalized response structure similar to OpenAI
                normalized_response = {
                    "choices": [
                        {
                            "delta": {
                                "content": text,
                                "reasoning_content": "",  # Google doesn't provide reasoning in streams
                            },
                            "finish_reason": None,  # Will be set on final chunk
                        }
                    ],
                    "usage": usage,
                }

                # Log the received message for tracing
                await span.add_info_events_async(
                    {"recv": json.dumps(normalized_response, ensure_ascii=False)}
                )

                # Yield the response
                yield LLMResponse(msg=normalized_response)

            # Send final message indicating completion
            final_response = {
                "choices": [
                    {
                        "delta": {"content": "", "reasoning_content": ""},
                        "finish_reason": ChatStatus.FINISH_REASON.value,
                    }
                ],
                "usage": usage,
            }

            await span.add_info_events_async(
                {"recv": json.dumps(final_response, ensure_ascii=False)}
            )

            yield LLMResponse(msg=final_response)

        except Exception as e:
            raise CustomException(
                err_code=CodeEnum.OPEN_AI_REQUEST_ERROR,
                err_msg=f"Google Generative AI error: {str(e)}",
                cause_error=str(e),
            ) from e

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
        Asynchronous chat method that initiates a conversation with Google Gemini.

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
                        "base_url": url,
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
