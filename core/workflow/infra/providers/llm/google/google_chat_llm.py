"""
Google Gemini Chat AI implementation.

This module integrates the Gemini GenerateContent streaming API and normalizes
streaming frames into the OpenAI-like structure already consumed by the workflow
engine.
"""

import json
from typing import Any, AsyncIterator, Dict, List, Tuple
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import httpx

from workflow.consts.engine.chat_status import ChatStatus
from workflow.engine.nodes.entities.llm_response import LLMResponse
from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum
from workflow.extensions.otlp.log_trace.node_log import NodeLog
from workflow.extensions.otlp.trace.span import Span
from workflow.infra.providers.llm.chat_ai import ChatAI


class GoogleChatAI(ChatAI):
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

        if ":streamGenerateContent" not in model_url:
            model_url = model_url.replace(
                ":generateContent", ":streamGenerateContent"
            )

        parsed = urlsplit(model_url)
        query = dict(parse_qsl(parsed.query, keep_blank_values=True))
        query["alt"] = "sse"
        final_url = urlunsplit(
            (
                parsed.scheme,
                parsed.netloc,
                parsed.path,
                urlencode(query),
                parsed.fragment,
            )
        )
        await span.add_info_events_async({"google_base_url": final_url})
        return final_url

    def assemble_payload(self, message: list) -> Dict[str, Any]:
        system_parts: List[str] = []
        contents: List[Dict[str, Any]] = []

        for item in message:
            role = item.get("role", "user")
            if role == "system":
                system_parts.append(str(item.get("content", "")))
                continue

            content_type = item.get("content_type", "text")
            if content_type == "image":
                parts = [
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": str(item.get("content", "")),
                        }
                    }
                ]
                target_role = "user"
            else:
                parts = [{"text": str(item.get("content", ""))}]
                target_role = "model" if role == "assistant" else "user"

            if contents and contents[-1].get("role") == target_role:
                contents[-1]["parts"].extend(parts)
            else:
                contents.append({"role": target_role, "parts": parts})

        payload: Dict[str, Any] = {"contents": contents}
        generation_config: Dict[str, Any] = {}
        if self.temperature is not None:
            generation_config["temperature"] = self.temperature
        if self.max_tokens is not None:
            generation_config["maxOutputTokens"] = self.max_tokens
        if self.top_k is not None:
            generation_config["topK"] = self.top_k
        if generation_config:
            payload["generationConfig"] = generation_config
        if system_parts:
            payload["system_instruction"] = {
                "parts": [{"text": "\n".join(system_parts)}]
            }
        return payload

    def decode_message(self, msg: dict) -> Tuple[str, str, str, Dict[str, Any]]:
        choice = msg["choices"][0]
        delta = choice.get("delta", {})
        finish_reason = choice.get("finish_reason")
        status = ""
        if finish_reason in {ChatStatus.FINISH_REASON.value, "STOP", "stop"}:
            status = ChatStatus.FINISH_REASON.value
        elif finish_reason:
            status = str(finish_reason).lower()
        content = delta.get("content", "")
        reasoning_content = delta.get("reasoning_content", "")
        token_usage = msg.get("usage") or {}
        return status, content, reasoning_content, token_usage

    def _build_headers(self) -> Dict[str, str]:
        return {
            "content-type": "application/json",
            "x-goog-api-key": self.api_key,
        }

    def _merge_extra_params(
        self, payload: Dict[str, Any], extra_params: Dict[str, Any]
    ) -> Dict[str, Any]:
        if not extra_params:
            return payload

        generation_config = payload.setdefault("generationConfig", {})
        direct_map = {
            "temperature": "temperature",
            "topP": "topP",
            "top_p": "topP",
            "topK": "topK",
            "top_k": "topK",
            "maxOutputTokens": "maxOutputTokens",
            "max_tokens": "maxOutputTokens",
        }
        for source_key, target_key in direct_map.items():
            if source_key in extra_params:
                generation_config[target_key] = extra_params[source_key]

        if "stopSequences" in extra_params:
            generation_config["stopSequences"] = extra_params["stopSequences"]
        elif "stop" in extra_params:
            stop_value = extra_params["stop"]
            generation_config["stopSequences"] = (
                stop_value if isinstance(stop_value, list) else [stop_value]
            )

        for payload_key in ["tools", "toolConfig", "safetySettings", "cachedContent"]:
            if payload_key in extra_params:
                payload[payload_key] = extra_params[payload_key]

        if "generationConfig" in extra_params and isinstance(
            extra_params["generationConfig"], dict
        ):
            generation_config.update(extra_params["generationConfig"])

        return payload

    def _normalize_chunk(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        usage_metadata = payload.get("usageMetadata") or {}
        usage = {
            "prompt_tokens": usage_metadata.get("promptTokenCount", 0),
            "completion_tokens": usage_metadata.get("candidatesTokenCount", 0),
            "total_tokens": usage_metadata.get("totalTokenCount", 0),
        }

        prompt_feedback = payload.get("promptFeedback") or {}
        if prompt_feedback.get("blockReason"):
            raise CustomException(
                err_code=CodeEnum.OPEN_AI_REQUEST_ERROR,
                err_msg=str(prompt_feedback.get("blockReason")),
                cause_error=json.dumps(prompt_feedback, ensure_ascii=False),
            )

        candidate = (payload.get("candidates") or [{}])[0]
        finish_reason = candidate.get("finishReason")
        normalized_finish = None
        if finish_reason in {"STOP", "stop"}:
            normalized_finish = ChatStatus.FINISH_REASON.value
        elif finish_reason:
            normalized_finish = str(finish_reason).lower()

        content_parts: List[str] = []
        reasoning_parts: List[str] = []
        for part in candidate.get("content", {}).get("parts", []):
            text = str(part.get("text", ""))
            if not text:
                continue
            if part.get("thought") is True:
                reasoning_parts.append(text)
            else:
                content_parts.append(text)

        return {
            "choices": [
                {
                    "delta": {
                        "content": "".join(content_parts),
                        "reasoning_content": "".join(reasoning_parts),
                    },
                    "finish_reason": normalized_finish,
                }
            ],
            "usage": usage,
        }

    async def _recv_messages(
        self,
        url: str,
        user_message: list,
        extra_params: dict,
        span: Span,
        timeout: float | None = None,
    ) -> AsyncIterator[LLMResponse]:
        payload = self._merge_extra_params(
            self.assemble_payload(user_message), extra_params or {}
        )
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
                data_lines: List[str] = []

                async for line in response.aiter_lines():
                    if not line:
                        if not data_lines:
                            continue
                        raw_data = "\n".join(data_lines)
                        data_lines = []
                        if raw_data == "[DONE]":
                            break
                        normalized = self._normalize_chunk(json.loads(raw_data))
                        last_frame = normalized
                        await span.add_info_events_async(
                            {"recv": json.dumps(normalized, ensure_ascii=False)}
                        )
                        yield LLMResponse(msg=normalized)
                        continue

                    if line.startswith("data:"):
                        data_lines.append(line.split(":", 1)[1].strip())

        if (
            last_frame["choices"][0].get("finish_reason")
            != ChatStatus.FINISH_REASON.value
        ):
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
        except CustomException as e:
            raise e
        except Exception as e:
            span.record_exception(e)
            raise CustomException(
                err_code=CodeEnum.OPEN_AI_REQUEST_ERROR,
                err_msg=str(e),
                cause_error=str(e),
            )
