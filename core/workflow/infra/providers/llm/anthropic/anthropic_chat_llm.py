"""
Anthropic Chat AI implementation.

This module provides a minimal Anthropic messages API integration that normalizes
streaming frames into the OpenAI-like structure already consumed by the workflow
engine and frame processors.
"""

import asyncio
import json
from typing import Any, AsyncIterator, Dict, Tuple

import httpx

from workflow.consts.engine.chat_status import ChatStatus
from workflow.engine.nodes.entities.llm_response import LLMResponse
from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum
from workflow.extensions.otlp.log_trace.node_log import NodeLog
from workflow.extensions.otlp.trace.span import Span
from workflow.infra.providers.llm.chat_ai import ChatAI


class AnthropicChatAI(ChatAI):
    model_config = {"arbitrary_types_allowed": True, "protected_namespaces": ()}

    def token_calculation(self, text: str) -> int:
        raise NotImplementedError

    def image_processing(self, image_path: str) -> Any:
        raise NotImplementedError

    async def assemble_url(self, span: Span) -> str:
        model_url = self.model_url
        if not model_url:
            raise CustomException(
                err_code=CodeEnum.OPEN_AI_REQUEST_ERROR,
                err_msg="Request URL is empty",
                cause_error="Request URL is empty",
            )
        await span.add_info_events_async({"anthropic_base_url": model_url})
        return model_url

    def assemble_payload(self, message: list) -> Dict[str, Any]:
        system_parts: list[str] = []
        payload_messages: list[Dict[str, Any]] = []
        for item in message:
            role = item.get("role", "user")
            if role == "system":
                system_parts.append(str(item.get("content", "")))
                continue
            content_type = item.get("content_type", "text")
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
            payload_messages.append(
                {
                    "role": "assistant" if role == "assistant" else "user",
                    "content": [{"type": "text", "text": str(item.get("content", ""))}],
                }
            )

        payload: Dict[str, Any] = {
            "model": self.model_name,
            "messages": payload_messages,
            "stream": True,
            "max_tokens": self.max_tokens,
        }
        if system_parts:
            payload["system"] = "\n".join(system_parts)
        if self.temperature is not None:
            payload["temperature"] = self.temperature
        if self.top_k is not None:
            payload["top_k"] = self.top_k
        return payload

    def decode_message(self, msg: dict) -> Tuple[str, str, str, Dict[str, Any]]:
        choice = msg["choices"][0]
        delta = choice.get("delta", {})
        finish_reason = choice.get("finish_reason")
        status = ""
        if finish_reason in {
            ChatStatus.FINISH_REASON.value,
            "end_turn",
            "stop_sequence",
        }:
            status = ChatStatus.FINISH_REASON.value
        elif finish_reason:
            status = finish_reason
        content = delta.get("content", "")
        reasoning_content = delta.get("reasoning_content", "")
        token_usage = msg.get("usage") or {}
        return status, content, reasoning_content, token_usage

    def _build_headers(self) -> Dict[str, str]:
        return {
            "content-type": "application/json",
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
        }

    def _normalize_event(
        self, event_type: str, payload: Dict[str, Any], usage: Dict[str, Any]
    ) -> Dict[str, Any] | None:
        if event_type == "content_block_delta":
            delta = payload.get("delta", {})
            text = delta.get("text", "")
            thinking = delta.get("thinking", "")
            return {
                "choices": [
                    {
                        "delta": {
                            "content": text,
                            "reasoning_content": thinking,
                        },
                        "finish_reason": None,
                    }
                ],
                "usage": usage,
            }
        if event_type == "message_delta":
            delta = payload.get("delta", {})
            return {
                "choices": [
                    {
                        "delta": {"content": "", "reasoning_content": ""},
                        "finish_reason": delta.get("stop_reason")
                        or ChatStatus.FINISH_REASON.value,
                    }
                ],
                "usage": payload.get("usage") or usage,
            }
        if event_type == "message_stop":
            return {
                "choices": [
                    {
                        "delta": {"content": "", "reasoning_content": ""},
                        "finish_reason": ChatStatus.FINISH_REASON.value,
                    }
                ],
                "usage": usage,
            }
        if event_type == "error":
            error = payload.get("error", {})
            raise CustomException(
                err_code=CodeEnum.OPEN_AI_REQUEST_ERROR,
                err_msg=str(error.get("message", "Anthropic request failed")),
                cause_error=str(error),
            )
        return None

    async def _recv_messages(
        self,
        url: str,
        user_message: list,
        extra_params: dict,
        span: Span,
        timeout: float | None = None,
    ) -> AsyncIterator[LLMResponse]:
        payload = self.assemble_payload(user_message)
        payload.update(extra_params or {})
        usage: Dict[str, Any] = {}
        last_frame: Dict[str, Any] = {
            "choices": [{"delta": {"content": "", "reasoning_content": ""}}],
            "usage": {},
        }
        request_timeout = httpx.Timeout(timeout) if timeout else None

        async with httpx.AsyncClient(timeout=request_timeout) as client:
            async with client.stream(
                "POST", url, headers=self._build_headers(), json=payload
            ) as response:
                response.raise_for_status()
                event_type = ""
                data_lines: list[str] = []

                async for line in response.aiter_lines():
                    if not line:
                        if not data_lines:
                            event_type = ""
                            continue
                        raw_data = "\n".join(data_lines)
                        data_lines = []
                        if raw_data == "[DONE]":
                            break
                        event_payload = json.loads(raw_data)
                        usage = event_payload.get("usage") or usage
                        normalized = self._normalize_event(
                            event_type, event_payload, usage
                        )
                        event_type = ""
                        if normalized is None:
                            continue
                        last_frame = normalized
                        await span.add_info_events_async(
                            {"recv": json.dumps(normalized, ensure_ascii=False)}
                        )
                        yield LLMResponse(msg=normalized)
                        continue

                    if line.startswith("event:"):
                        event_type = line.split(":", 1)[1].strip()
                    elif line.startswith("data:"):
                        data_lines.append(line.split(":", 1)[1].strip())

        if last_frame["choices"][0].get("finish_reason") != ChatStatus.FINISH_REASON.value:
            last_frame["choices"] = [
                {
                    "delta": {"content": "", "reasoning_content": ""},
                    "finish_reason": ChatStatus.FINISH_REASON.value,
                }
            ]
            yield LLMResponse(msg=last_frame)

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
        url = await self.assemble_url(span)
        await span.add_info_events_async({"domain": self.model_name})
        await span.add_info_events_async(
            {"extra_params": json.dumps(extra_params, ensure_ascii=False)}
        )

        try:
            if event_log_node_trace:
                event_log_node_trace.append_config_data(
                    {
                        "model_name": self.model_name,
                        "base_url": url,
                        "message": user_message,
                        "extra_params": extra_params,
                    }
                )

            async for msg in self._recv_messages(
                url, user_message, extra_params, span, timeout
            ):
                if event_log_node_trace:
                    event_log_node_trace.add_info_log(
                        json.dumps(msg.msg, ensure_ascii=False)
                    )
                yield msg
        except httpx.TimeoutException as e:
            raise CustomException(
                err_code=CodeEnum.OPEN_AI_REQUEST_ERROR,
                err_msg=f"LLM response timeout ({timeout}s)",
                cause_error=f"LLM response timeout ({timeout}s)",
            ) from e
        except httpx.HTTPStatusError as e:
            raise CustomException(
                err_code=CodeEnum.OPEN_AI_REQUEST_ERROR,
                err_msg=e.response.text,
                cause_error=e.response.text,
            ) from e
        except CustomException as e:
            raise e
        except Exception as e:
            span.record_exception(e)
            raise CustomException(
                err_code=CodeEnum.OPEN_AI_REQUEST_ERROR,
                err_msg=str(e),
                cause_error=str(e),
            ) from e
