import json
import os
from typing import Any, AsyncIterator, Optional
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import httpx
from common.otlp.trace.span import Span
from openai import APIError, APITimeoutError
from openai.types.chat.chat_completion_chunk import ChatCompletionChunk
from pydantic import BaseModel, ConfigDict, Field

from agent.exceptions.plugin_exc import PluginExc, llm_plugin_error


class BaseLLMModel(BaseModel):
    name: str
    llm: Any = None

    model_config = ConfigDict(arbitrary_types_allowed=True)

    async def create_completion(self, messages: list, stream: bool) -> Any:
        llm_object = await self.llm.chat.completions.create(
            messages=messages,
            stream=stream,
            model=self.name,
            timeout=int(os.getenv("DEFAULT_LLM_TIMEOUT", "90")),
        )
        if os.getenv("DEFAULT_LLM_MAX_TOKEN"):
            llm_object = await self.llm.chat.completions.create(
                messages=messages,
                stream=stream,
                model=self.name,
                timeout=int(os.getenv("DEFAULT_LLM_TIMEOUT", "90")),
                max_tokens=int(os.getenv("DEFAULT_LLM_MAX_TOKEN", "8000")),
            )

        return llm_object

    def _log_messages_to_span(self, sp: Span, messages: list) -> None:
        for message in messages:
            sp.add_info_events({message.get("role"): message.get("content")})

    def _log_request_info_to_span(self, sp: Span, stream: bool) -> None:
        sp.add_info_events({"model": self.name})
        sp.add_info_events({"stream": stream})

    def _handle_api_timeout_error(self, error: APITimeoutError) -> None:
        raise PluginExc(-1, "璇锋眰鏈嶅姟瓒呮椂", om=str(error)) from error

    def _handle_api_error(self, error: APIError, sp: Optional[Span]) -> None:
        if sp is not None:
            sp.add_info_events({"code": error.code or "null"})
            sp.add_info_events({"message": error.message})
            sp.add_info_events(
                {"converted-code": str(getattr(error, "code", "unknown"))}
            )
            sp.add_info_events({"converted-message": error.message})
        llm_plugin_error(error.code, error.message)

    def _handle_general_error(self, error: Exception, sp: Optional[Span]) -> None:
        if sp is not None:
            sp.add_info_events({"code": ""})
            sp.add_info_events({"message": str(error)})
            sp.add_info_events({"converted-code": "-1"})
            sp.add_info_events({"converted-message": str(error)})
        llm_plugin_error("-1", str(error))

    def _get_error_message_for_exception(self, error: Exception) -> str:
        error_type = type(error).__name__
        error_msg = str(error)
        error_msg_lower = error_msg.lower()

        if "ssl" in error_msg_lower or "certificate" in error_msg_lower:
            return (
                f"SSL certificate error: {error_msg}. "
                "Try setting SKIP_SSL_VERIFY=true for testing."
            )
        if "connection" in error_msg_lower or "connect" in error_msg_lower:
            return (
                f"Connection error: {error_msg}. "
                "Please check network connectivity and API endpoint."
            )
        if "timeout" in error_msg_lower:
            return f"Request timeout: {error_msg}. The server took too long to respond."
        return f"{error_type}: {error_msg}"

    def _handle_exception(self, error: Exception, sp: Optional[Span]) -> None:
        if sp is not None:
            sp.add_error_event(
                f"LLM request failed: {type(error).__name__}: {str(error)}"
            )
        llm_plugin_error("-1", self._get_error_message_for_exception(error))

    async def stream(
        self, messages: list, stream: bool, span: Optional[Span] = None
    ) -> AsyncIterator[ChatCompletionChunk]:

        sp = span
        if sp is not None:
            self._log_messages_to_span(sp, messages)
            self._log_request_info_to_span(sp, stream)

        try:
            response = await self.create_completion(messages, stream)
            async for chunk in response:
                chunk_dict = chunk.model_dump()
                if sp is not None:
                    sp.add_info_events({"llm-chunk": chunk.model_dump_json()})
                if chunk_dict.get("code", 0) != 0:
                    llm_plugin_error(chunk_dict.get("code"), chunk_dict.get("message"))
                yield chunk
        except APITimeoutError as error:
            self._handle_api_timeout_error(error)
        except APIError as error:
            self._handle_api_error(error, sp)
        except Exception as error:
            self._handle_exception(error, sp)


class CompatUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class CompatDelta(BaseModel):
    content: str = ""
    reasoning_content: str = ""


class CompatChoice(BaseModel):
    delta: CompatDelta = Field(default_factory=CompatDelta)
    finish_reason: Optional[str] = None


class CompatChunk(BaseModel):
    choices: list[CompatChoice]
    usage: Optional[CompatUsage] = None


class ProviderLLMModel(BaseLLMModel):
    model_url: str
    api_key: str
    http_client: httpx.AsyncClient

    def build_request_url(self) -> str:
        return self.model_url

    def build_headers(self) -> dict[str, str]:
        raise NotImplementedError

    def build_payload(self, messages: list, stream: bool) -> dict[str, Any]:
        raise NotImplementedError

    def _build_compat_chunk(self, payload: dict[str, Any]) -> CompatChunk:
        choice = (payload.get("choices") or [{}])[0]
        usage_data = payload.get("usage") or {}
        return CompatChunk(
            choices=[
                CompatChoice(
                    delta=CompatDelta(**choice.get("delta", {})),
                    finish_reason=choice.get("finish_reason"),
                )
            ],
            usage=CompatUsage(**usage_data) if usage_data else None,
        )

    async def _yield_normalized_chunks(  # type: ignore[override, return-value]  # noqa: C901
        self, response: httpx.Response
    ) -> AsyncIterator[CompatChunk]:
        raise NotImplementedError

    async def stream(  # type: ignore[override]
        self, messages: list, stream: bool, span: Optional[Span] = None
    ) -> AsyncIterator[CompatChunk]:
        sp = span
        if sp is not None:
            self._log_messages_to_span(sp, messages)
            self._log_request_info_to_span(sp, stream)

        try:
            async with self.http_client.stream(
                "POST",
                self.build_request_url(),
                headers=self.build_headers(),
                json=self.build_payload(messages, stream),
            ) as response:
                response.raise_for_status()
                async for chunk in self._yield_normalized_chunks(response):  # type: ignore[attr-defined]
                    if sp is not None:
                        sp.add_info_events({"llm-chunk": chunk.model_dump_json()})
                    yield chunk
        except httpx.TimeoutException as error:
            self._handle_exception(error, sp)
        except httpx.HTTPStatusError as error:
            message = error.response.text or str(error)
            if sp is not None:
                sp.add_info_events({"code": str(error.response.status_code)})
                sp.add_info_events({"message": message})
            llm_plugin_error(str(error.response.status_code), message)
        except Exception as error:
            self._handle_exception(error, sp)


class AnthropicLLMModel(ProviderLLMModel):
    def build_request_url(self) -> str:
        if self.model_url.endswith("/v1/messages"):
            return self.model_url
        return self.model_url.rstrip("/") + "/v1/messages"

    def build_headers(self) -> dict[str, str]:
        return {
            "content-type": "application/json",
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
        }

    def build_payload(self, messages: list, stream: bool) -> dict[str, Any]:
        system_parts: list[str] = []
        payload_messages: list[dict[str, Any]] = []
        for item in messages:
            role = item.get("role", "user")
            content = str(item.get("content", ""))
            if role == "system":
                system_parts.append(content)
                continue
            payload_messages.append(
                {
                    "role": "assistant" if role == "assistant" else "user",
                    "content": [{"type": "text", "text": content}],
                }
            )

        payload: dict[str, Any] = {
            "model": self.name,
            "messages": payload_messages,
            "stream": stream,
            "max_tokens": int(os.getenv("DEFAULT_LLM_MAX_TOKEN", "8000")),
        }
        if system_parts:
            payload["system"] = "\n".join(system_parts)
        return payload

    async def _yield_normalized_chunks(  # type: ignore[override]  # noqa: C901
        self, response: httpx.Response
    ) -> AsyncIterator[CompatChunk]:
        event_type = ""
        data_lines: list[str] = []
        usage: dict[str, Any] = {}
        emitted_stop = False

        async for line in response.aiter_lines():
            if not line:
                if not data_lines:
                    event_type = ""
                    continue
                payload = json.loads("\n".join(data_lines))
                data_lines = []
                usage = payload.get("usage") or usage
                normalized: dict[str, Any] | None = None

                if event_type == "content_block_delta":
                    delta = payload.get("delta", {})
                    normalized = {
                        "choices": [
                            {
                                "delta": {
                                    "content": delta.get("text", ""),
                                    "reasoning_content": delta.get("thinking", ""),
                                },
                                "finish_reason": None,
                            }
                        ],
                        "usage": usage,
                    }
                elif event_type == "message_delta":
                    normalized = {
                        "choices": [
                            {
                                "delta": {"content": "", "reasoning_content": ""},
                                "finish_reason": payload.get("delta", {}).get(
                                    "stop_reason"
                                )
                                or "stop",
                            }
                        ],
                        "usage": payload.get("usage") or usage,
                    }
                    emitted_stop = True
                elif event_type == "message_stop":
                    normalized = {
                        "choices": [
                            {
                                "delta": {"content": "", "reasoning_content": ""},
                                "finish_reason": "stop",
                            }
                        ],
                        "usage": usage,
                    }
                    emitted_stop = True
                elif event_type == "error":
                    error = payload.get("error", {})
                    llm_plugin_error(
                        str(error.get("type", "-1")),
                        str(error.get("message", "Anthropic request failed")),
                    )

                event_type = ""
                if normalized:
                    yield self._build_compat_chunk(normalized)
                continue

            if line.startswith("event:"):
                event_type = line.split(":", 1)[1].strip()
            elif line.startswith("data:"):
                data_lines.append(line.split(":", 1)[1].strip())

        if not emitted_stop:
            yield self._build_compat_chunk(
                {
                    "choices": [
                        {
                            "delta": {"content": "", "reasoning_content": ""},
                            "finish_reason": "stop",
                        }
                    ],
                    "usage": usage,
                }
            )


class GoogleLLMModel(ProviderLLMModel):
    def build_request_url(self) -> str:
        model_url = self.model_url
        if ":generateContent" not in model_url:
            model_url = (
                model_url.rstrip("/") + f"/v1beta/models/{self.name}:generateContent"
            )
        model_url = model_url.replace(":generateContent", ":streamGenerateContent")
        parsed = urlsplit(model_url)
        query = dict(parse_qsl(parsed.query, keep_blank_values=True))
        query["alt"] = "sse"
        return urlunsplit(
            (
                parsed.scheme,
                parsed.netloc,
                parsed.path,
                urlencode(query),
                parsed.fragment,
            )
        )

    def build_headers(self) -> dict[str, str]:
        return {
            "content-type": "application/json",
            "x-goog-api-key": self.api_key,
        }

    def build_payload(self, messages: list, stream: bool) -> dict[str, Any]:
        system_parts: list[str] = []
        contents: list[dict[str, Any]] = []
        for item in messages:
            role = item.get("role", "user")
            content = str(item.get("content", ""))
            if role == "system":
                system_parts.append(content)
                continue
            target_role = "model" if role == "assistant" else "user"
            part = {"text": content}
            if contents and contents[-1].get("role") == target_role:
                contents[-1]["parts"].append(part)
            else:
                contents.append({"role": target_role, "parts": [part]})

        payload: dict[str, Any] = {"contents": contents}
        if system_parts:
            payload["system_instruction"] = {
                "parts": [{"text": "\n".join(system_parts)}]
            }
        max_tokens = os.getenv("DEFAULT_LLM_MAX_TOKEN")
        if max_tokens:
            payload["generationConfig"] = {"maxOutputTokens": int(max_tokens)}
        return payload

    def _normalize_payload_to_chunk(self, payload: dict[str, Any]) -> CompatChunk:
        prompt_feedback = payload.get("promptFeedback") or {}
        if prompt_feedback.get("blockReason"):
            llm_plugin_error(
                "-1",
                str(prompt_feedback.get("blockReason")),
            )

        candidate = (payload.get("candidates") or [{}])[0]
        finish_reason = candidate.get("finishReason")
        parts = candidate.get("content", {}).get("parts", [])
        normalized = {
            "choices": [
                {
                    "delta": {
                        "content": "".join(
                            str(part.get("text", ""))
                            for part in parts
                            if part.get("thought") is not True
                        ),
                        "reasoning_content": "".join(
                            str(part.get("text", ""))
                            for part in parts
                            if part.get("thought") is True
                        ),
                    },
                    "finish_reason": (
                        "stop"
                        if finish_reason in {"STOP", "stop"}
                        else (str(finish_reason).lower() if finish_reason else None)
                    ),
                }
            ],
            "usage": {
                "prompt_tokens": (payload.get("usageMetadata") or {}).get(
                    "promptTokenCount", 0
                ),
                "completion_tokens": (payload.get("usageMetadata") or {}).get(
                    "candidatesTokenCount", 0
                ),
                "total_tokens": (payload.get("usageMetadata") or {}).get(
                    "totalTokenCount", 0
                ),
            },
        }
        return self._build_compat_chunk(normalized)

    async def _yield_normalized_chunks(  # type: ignore[override]  # noqa: C901
        self, response: httpx.Response
    ) -> AsyncIterator[CompatChunk]:
        content_type = response.headers.get("content-type", "").lower()
        if "text/event-stream" not in content_type:
            payload = json.loads((await response.aread()).decode("utf-8"))
            yield self._normalize_payload_to_chunk(payload)
            return

        data_lines: list[str] = []
        emitted_stop = False

        async for line in response.aiter_lines():
            if not line:
                if not data_lines:
                    continue
                raw_data = "\n".join(data_lines)
                data_lines = []
                if raw_data == "[DONE]":
                    break
                chunk = self._normalize_payload_to_chunk(json.loads(raw_data))
                if chunk.choices[0].finish_reason:
                    emitted_stop = True
                yield chunk
                continue

            if line.startswith("data:"):
                data_lines.append(line.split(":", 1)[1].strip())

        if data_lines:
            chunk = self._normalize_payload_to_chunk(json.loads("\n".join(data_lines)))
            if chunk.choices[0].finish_reason:
                emitted_stop = True
            yield chunk

        if not emitted_stop:
            yield self._build_compat_chunk(
                {
                    "choices": [
                        {
                            "delta": {"content": "", "reasoning_content": ""},
                            "finish_reason": "stop",
                        }
                    ]
                }
            )
