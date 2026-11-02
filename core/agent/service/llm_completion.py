"""One model call with provider-owned streaming, usage and resource cleanup."""

import asyncio
import json
import time
import uuid
from collections.abc import AsyncGenerator, AsyncIterator
from contextlib import aclosing
from typing import Any, cast

import httpx
from common.otlp.trace.langfuse import (
    LangfuseConfig,
    langfuse_observation_attributes,
    langfuse_trace_context,
)
from common.otlp.trace.trace import Trace
from langchain_core.messages import AIMessageChunk, BaseMessageChunk
from loguru import logger
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode

from agent.api.schemas.llm_completion_inputs import LLMCompletionInputs
from agent.domain.models.providers import ModelHandle, create_provider_model
from agent.service.anthropic_completion import anthropic_completion

_END = object()


def _finish_reason(chunk: AIMessageChunk) -> str | None:
    raw = chunk.response_metadata.get("finish_reason") or chunk.response_metadata.get(
        "stop_reason"
    )
    if not raw:
        return None
    reason = str(raw).lower()
    return {
        "end_turn": "stop",
        "stop_sequence": "stop",
        "max_tokens": "length",
        "safety": "content_filter",
        "recitation": "content_filter",
        "blocklist": "content_filter",
        "prohibited_content": "content_filter",
        "spii": "content_filter",
        "image_safety": "content_filter",
    }.get(reason, reason)


def _delta(chunk: AIMessageChunk) -> dict[str, str]:
    if chunk.tool_call_chunks or chunk.tool_calls:
        raise ValueError("Tool calls are not part of a pure completion")
    content: list[str] = []
    reasoning: list[str] = []
    for block in chunk.content_blocks:
        text = block.get("text")
        thought = block.get("reasoning")
        if block.get("type") == "text" and isinstance(text, str):
            content.append(text)
        elif block.get("type") == "reasoning" and isinstance(thought, str):
            reasoning.append(thought)
    delta = {}
    if content:
        delta["content"] = "".join(content)
    if reasoning:
        delta["reasoning_content"] = "".join(reasoning)
    return delta


class LLMCompletion:
    """Keep tracing contexts and the model stream inside one producer task."""

    def __init__(
        self,
        inputs: LLMCompletionInputs,
        app_id: str,
        trace_context: dict[str, str] | None = None,
    ) -> None:
        self.inputs = inputs
        self.app_id = app_id
        self.trace_context = trace_context
        self.request_id = f"chatcmpl-{uuid.uuid4().hex}"
        self.created = int(time.time())

    def _frame(
        self,
        delta: dict[str, str],
        finish_reason: str | None = None,
        usage: dict[str, int] | None = None,
    ) -> str:
        payload: dict[str, Any] = {
            "id": self.request_id,
            "object": "chat.completion.chunk",
            "created": self.created,
            "model": self.inputs.model_config_inputs.domain,
            "code": 0,
            "choices": [{"index": 0, "delta": delta, "finish_reason": finish_reason}],
        }
        if usage is not None:
            payload["usage"] = usage
        return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"

    async def _model_stream(
        self, queue: asyncio.Queue[object], generation: trace.Span
    ) -> None:
        config = self.inputs.model_config_inputs
        if config.provider == "anthropic":
            await self._consume_chunks(
                anthropic_completion(self.inputs), queue, generation
            )
            return
        handle: ModelHandle | None = None
        client = httpx.AsyncClient(timeout=self.inputs.timeout)
        try:
            handle = await create_provider_model(
                model_name=config.domain,
                base_url=config.api,
                provider=config.provider,
                api_key=config.api_key,
                http_client=client,
                parameters=self.inputs.parameters.model_dump(exclude_none=True),
                timeout=self.inputs.timeout,
                max_retries=0,
            )
            messages = [message.model_dump() for message in self.inputs.messages]
            await self._consume_chunks(
                cast(
                    AsyncGenerator[BaseMessageChunk, None],
                    handle.model.astream(messages),
                ),
                queue,
                generation,
            )
        finally:
            # Shield cleanup from cancellation, but await it before returning.
            cleanup = asyncio.create_task(
                handle.aclose() if handle else client.aclose()
            )
            try:
                await asyncio.shield(cleanup)
            except asyncio.CancelledError:
                await cleanup
                raise

    async def _consume_chunks(
        self,
        stream: AsyncGenerator[BaseMessageChunk, None],
        queue: asyncio.Queue[object],
        generation: trace.Span,
    ) -> None:
        usage_chunk: AIMessageChunk | None = None
        finish_reason = None
        has_content = False
        captured_output: list[str] = []
        captured_length = 0
        config = LangfuseConfig.from_env()
        async with aclosing(stream):
            async for chunk in stream:
                if not isinstance(chunk, AIMessageChunk):
                    raise ValueError("Unexpected model stream message")
                delta = _delta(chunk)
                if delta:
                    if finish_reason:
                        raise ValueError("Content received after model completion")
                    has_content = has_content or bool(delta.get("content"))
                    if config.capture_input_output:
                        text = delta.get("content", "")
                        remaining = max(
                            0, config.max_attribute_length - captured_length
                        )
                        captured_output.append(text[:remaining])
                        captured_length += len(text[:remaining])
                    await queue.put(self._frame(delta))
                if chunk.usage_metadata is not None:
                    # Official integrations normalize usage to additive chunks.
                    # Retain only usage, rather than buffering the full answer.
                    current = AIMessageChunk(
                        content="", usage_metadata=chunk.usage_metadata
                    )
                    usage_chunk = (
                        current if usage_chunk is None else usage_chunk + current
                    )
                finish_reason = _finish_reason(chunk) or finish_reason
        if not finish_reason or not has_content:
            raise ValueError("Model returned an incomplete or empty completion")
        counts = usage_chunk.usage_metadata if usage_chunk is not None else None
        usage = (
            {
                "prompt_tokens": counts["input_tokens"],
                "completion_tokens": counts["output_tokens"],
                "total_tokens": counts["total_tokens"],
            }
            if counts is not None
            else None
        )
        generation.set_attributes(
            langfuse_observation_attributes(
                "generation",
                output_value="".join(captured_output),
                usage_details=usage,
            )
        )
        generation.set_attribute("gen_ai.response.finish_reasons", [finish_reason])
        await queue.put(self._frame({}, finish_reason, usage))

    async def _produce(self, queue: asyncio.Queue[object]) -> None:
        config = self.inputs.model_config_inputs
        attributes = langfuse_observation_attributes(
            "generation",
            input_value=[message.model_dump() for message in self.inputs.messages],
            model=config.domain,
            model_parameters=self.inputs.parameters.model_dump(exclude_none=True),
            metadata={
                "provider": config.provider,
                "app_id": self.app_id,
                "workflow_id": self.inputs.meta_data.workflow_id,
                "node_id": self.inputs.meta_data.node_id,
            },
        )
        attributes.update(
            {"gen_ai.provider.name": config.provider, "gen_ai.operation.name": "chat"}
        )
        parent = (
            Trace.extract_context(self.trace_context) if self.trace_context else None
        )
        tracer = trace.get_tracer(__name__)
        started = time.monotonic()
        with langfuse_trace_context(
            {}, parent_context=parent, trust_parent=bool(parent)
        ), tracer.start_as_current_span(
            f"llm.generate:{config.domain}", context=parent, attributes=attributes
        ) as generation:
            try:
                async with asyncio.timeout(self.inputs.timeout):
                    await self._model_stream(queue, generation)
            except asyncio.CancelledError:
                generation.set_status(Status(StatusCode.ERROR, "Completion cancelled"))
                raise
            except Exception as exc:  # pylint: disable=broad-exception-caught
                generation.set_status(
                    Status(StatusCode.ERROR, "Model completion failed")
                )
                # Provider exceptions can contain credentials or request bodies.
                logger.warning(
                    "Model completion failed request_id={} protocol={} error_type={}",
                    self.request_id,
                    config.provider,
                    type(exc).__name__,
                )
                await queue.put(
                    "data: "
                    + json.dumps(
                        {
                            "code": 1,
                            "message": "Model completion failed",
                            "id": self.request_id,
                        }
                    )
                    + "\n\n"
                )
            finally:
                generation.set_attribute(
                    "astron.llm.duration_ms",
                    round((time.monotonic() - started) * 1000, 3),
                )
        await queue.put("data: [DONE]\n\n")
        await queue.put(_END)

    async def stream(self) -> AsyncIterator[str]:
        queue: asyncio.Queue[object] = asyncio.Queue(maxsize=1)
        producer = asyncio.create_task(self._produce(queue), name=self.request_id)
        try:
            while True:
                # Also observe unexpected producer failure; never wait forever.
                receive = asyncio.create_task(queue.get())
                try:
                    done, _ = await asyncio.wait(
                        {receive, producer}, return_when=asyncio.FIRST_COMPLETED
                    )
                    if receive not in done and producer.done():
                        await producer
                        break
                    item = await receive
                finally:
                    if not receive.done():
                        receive.cancel()
                    try:
                        await receive
                    except asyncio.CancelledError:
                        pass
                if item is _END:
                    break
                yield str(item)
        finally:
            producer.cancel()
            try:
                await producer
            except asyncio.CancelledError:
                pass
