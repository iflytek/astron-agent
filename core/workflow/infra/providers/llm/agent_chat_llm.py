"""Workflow transport for the Agent service's single-completion API."""

import asyncio
import copy
import json
import math
import os
from contextlib import aclosing
from typing import Any, AsyncGenerator, Literal
from urllib.parse import urlsplit

import httpx
from common.otlp.trace.langfuse import (
    AGENT_TRACE_AUDIENCE,
    inject_trusted_langfuse_context,
)
from httpx_sse import aconnect_sse

from workflow.engine.nodes.entities.llm_response import LLMResponse
from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum
from workflow.extensions.otlp.log_trace.node_log import NodeLog
from workflow.extensions.otlp.trace.span import Span
from workflow.infra.providers.llm.chat_ai import ChatAI
from workflow.utils.credentials import credential_from_env_or_file


def _request_error(message: str) -> CustomException:
    return CustomException(err_code=CodeEnum.OPEN_AI_REQUEST_ERROR, err_msg=message)


def _http_endpoint(value: str) -> str:
    parsed = urlsplit(value)
    if (
        parsed.scheme not in {"http", "https"}
        or not parsed.hostname
        or parsed.username
        or parsed.password
        or parsed.query
        or parsed.fragment
    ):
        raise _request_error("Model service endpoint must be an HTTP(S) URL")
    return value.rstrip("/")


def _completion_messages(messages: list, media: list) -> list[dict[str, Any]]:
    """Preserve message order and translate Workflow media to standard blocks."""
    result = copy.deepcopy(messages)
    for message in result:
        content_type = message.pop("content_type", "text")
        if content_type in {"image", "audio", "video"}:
            message["content"] = [{"type": content_type, "url": message["content"]}]
    if media:
        user = next((msg for msg in reversed(result) if msg["role"] == "user"), None)
        if user is None:
            raise _request_error("Multimodal inputs require a user message")
        content = user["content"]
        if isinstance(content, str):
            content = [{"type": "text", "text": content}]
        for item in media:
            if item.get("type") not in {"image", "audio", "video"} or not item.get(
                "url"
            ):
                raise _request_error("Invalid multimodal input")
            content.append({"type": item["type"], "url": item["url"]})
        user["content"] = content
    return result


class AgentChatAI(ChatAI):
    """One remote inference; no provider fallback or automatic transport retry."""

    remote: bool = True
    provider: Literal["openai", "anthropic", "google"]
    node_id: str = ""

    def token_calculation(self, text: str) -> int:
        raise NotImplementedError("Token usage is supplied by the model service")

    def image_processing(self, image_path: str) -> Any:
        raise NotImplementedError("Media is passed as standard message blocks")

    async def assemble_url(self, span: Span) -> str:
        base_url = _http_endpoint(os.getenv("AGENT_BASE_URL", ""))
        return f"{base_url}/agent/v1/llm/chat/completions"

    def assemble_payload(self, message: list) -> str:
        return json.dumps(message, ensure_ascii=False)

    def decode_message(self, msg: dict) -> tuple[str | None, str, str, dict]:
        choice = msg["choices"][0]
        delta = choice.get("delta") or {}
        return (
            choice.get("finish_reason"),
            delta.get("content") or "",
            delta.get("reasoning_content") or "",
            msg.get("usage") or {},
        )

    def _headers(self) -> dict[str, str]:
        key = credential_from_env_or_file(
            "WORKFLOW_INTERNAL_API_KEY",
            "WORKFLOW_INTERNAL_API_KEY_FILE",
            min_length=32,
            placeholders=("CHANGE_ME_WORKFLOW_INTERNAL_API_KEY",),
        )
        if not key:
            raise _request_error(
                "Workflow internal API authentication is not configured"
            )
        headers = {
            "Content-Type": "application/json",
            "x-consumer-username": self.app_id,
            "X-Workflow-Internal-Key": key,
        }
        headers.update(
            inject_trusted_langfuse_context(
                method="POST", audience=AGENT_TRACE_AUDIENCE, tenant_id=self.app_id
            )
        )
        return headers

    def _request_body(
        self,
        messages: list,
        media: list,
        parameters: dict,
        timeout: float,
        flow_id: str,
        span: Span,
    ) -> dict:
        effective = {"temperature": self.temperature, "max_tokens": self.max_tokens}
        if self.provider in {"anthropic", "google"}:
            effective["top_k"] = self.top_k
        effective.update(parameters)
        return {
            "model_config": {
                "provider": self.provider,
                "domain": self.model_name,
                "api": _http_endpoint(self.model_url),
                "api_key": self.api_key,
            },
            "messages": _completion_messages(messages, media),
            "parameters": effective,
            "timeout": timeout,
            "uid": self.uid,
            "stream": True,
            "meta_data": {
                "caller": "workflow-llm-node",
                "caller_sid": span.sid,
                "workflow_id": flow_id,
                "run_id": span.sid,
                "node_id": self.node_id,
            },
        }

    @staticmethod
    def _client(timeout: float) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            timeout=httpx.Timeout(timeout, connect=min(30, timeout)),
            follow_redirects=False,
        )

    async def _events(
        self,
        url: str,
        headers: dict,
        body: dict,
        timeout: float,
    ) -> AsyncGenerator[LLMResponse, None]:
        terminal = None
        received_content = False
        done = False
        async with self._client(timeout) as client:
            async with aconnect_sse(
                client, "POST", url, headers=headers, json=body
            ) as events:
                events.response.raise_for_status()
                async for event in events.aiter_sse():
                    if not event.data:
                        continue
                    if event.data == "[DONE]":
                        done = True
                        break
                    frame = event.json()
                    if not isinstance(frame, dict) or frame.get("code", 0) != 0:
                        raise _request_error("Model completion failed")
                    choices = frame.get("choices")
                    if not isinstance(choices, list) or len(choices) != 1 or terminal:
                        raise _request_error("Invalid model completion stream")
                    choice = choices[0]
                    delta = choice.get("delta") or {}
                    if delta.get("tool_calls"):
                        raise _request_error("Unexpected tool call in model completion")
                    content = delta.get("content") or ""
                    reasoning = delta.get("reasoning_content") or ""
                    if not isinstance(content, str) or not isinstance(reasoning, str):
                        raise _request_error("Invalid model completion content")
                    received_content = received_content or bool(content or reasoning)
                    if choice.get("finish_reason"):
                        terminal = frame
                    else:
                        yield LLMResponse(frame)
        if not done or terminal is None or not received_content:
            raise _request_error(
                "Model completion stream ended without a complete result"
            )
        # Close the HTTP stream before the node sees the terminal frame and stops
        # consuming. Never expose a successful result for a truncated transport.
        yield LLMResponse(terminal)

    async def achat(
        self,
        flow_id: str,
        user_message: list,
        span: Span,
        extra_params: dict = {},
        timeout: float | None = None,
        search_disable: bool = True,
        event_log_node_trace: NodeLog | None = None,
        multimodal_inputs: list = [],
    ) -> AsyncGenerator[LLMResponse, None]:
        budget = float(timeout if timeout is not None else 90)
        if not math.isfinite(budget) or not 0 < budget <= 1800:
            raise _request_error(
                "Model request timeout must be between 0 and 1800 seconds"
            )
        url = await self.assemble_url(span)
        headers = self._headers()
        body = self._request_body(
            user_message, multimodal_inputs, extra_params, budget, flow_id, span
        )
        if event_log_node_trace:
            event_log_node_trace.append_config_data(
                {
                    "model_name": self.model_name,
                    "provider": self.provider,
                    "transport": "agent",
                    "node_id": self.node_id,
                }
            )
        try:
            async with asyncio.timeout(budget + 5):
                async with aclosing(
                    self._events(url, headers, body, budget + 5)
                ) as stream:
                    async for response in stream:
                        yield response
        except CustomException:
            raise
        except httpx.HTTPStatusError as exc:
            raise _request_error(
                f"Model service request failed (HTTP {exc.response.status_code})"
            ) from None
        except (TimeoutError, httpx.TimeoutException):
            raise _request_error("Model service request timed out") from None
        except Exception:
            # Transport/validation errors can contain model keys and request data.
            raise _request_error(
                "Model service returned an invalid or interrupted response"
            ) from None
