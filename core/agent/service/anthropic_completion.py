"""Pure completions using the official SDK's accumulated final message.

LangChain Anthropic 1.5–1.7.7 drops message_start usage. The SDK preserves
those input/cache counts when message_delta reports only output counts.
"""

import asyncio
import os
import re
from collections.abc import AsyncGenerator
from typing import Any

from anthropic import AsyncAnthropic
from langchain_core.messages import AIMessageChunk

from agent.api.schemas.llm_completion_inputs import LLMCompletionInputs


def _image_source(block: dict[str, Any]) -> dict[str, Any]:
    if "source" in block:
        return dict(block["source"])
    if "base64" in block:
        return {
            "type": "base64",
            "media_type": block["mime_type"],
            "data": block["base64"],
        }
    url = block.get("url") or block.get("image_url")
    if isinstance(url, dict):
        url = url.get("url")
    if not isinstance(url, str):
        raise ValueError("Image content requires a source")
    if url.startswith("data:"):
        header, data = url.split(",", 1)
        if not header.endswith(";base64"):
            raise ValueError("Image data must use base64")
        return {"type": "base64", "media_type": header[5:-7], "data": data}
    return {"type": "url", "url": url}


def _content(content: str | list[dict[str, Any]]) -> str | list[dict[str, Any]]:
    if isinstance(content, str):
        return content
    blocks = []
    for block in content:
        kind = block.get("type")
        if kind in {"image", "image_url"}:
            blocks.append({"type": "image", "source": _image_source(block)})
        elif kind == "reasoning":
            blocks.append(
                {
                    "type": "thinking",
                    "thinking": block["reasoning"],
                    "signature": block.get("extras", {})["signature"],
                }
            )
        elif kind in {"text", "thinking", "redacted_thinking", "document"}:
            blocks.append(dict(block))
        else:
            raise ValueError("Unsupported Anthropic completion content block")
    return blocks


def _request(inputs: LLMCompletionInputs) -> dict[str, Any]:
    parameters = inputs.parameters.model_dump(exclude_none=True)
    parameters.setdefault(
        "max_tokens", int(os.getenv("DEFAULT_LLM_MAX_TOKEN") or "1024")
    )
    if "stop" in parameters:
        stop = parameters.pop("stop")
        parameters["stop_sequences"] = [stop] if isinstance(stop, str) else stop
    if "reasoning_effort" in parameters:
        parameters["output_config"] = {"effort": parameters.pop("reasoning_effort")}
    # SDK 1.17 exposes sampling for older compatible models through extra_body.
    parameters["extra_body"] = {
        key: parameters.pop(key)
        for key in ("temperature", "top_p", "top_k")
        if key in parameters
    }
    messages = [
        {"role": message.role, "content": _content(message.content)}
        for message in inputs.messages
    ]
    if messages[0]["role"] == "system":
        parameters["system"] = messages.pop(0)["content"]
    return {
        **parameters,
        "model": inputs.model_config_inputs.domain,
        "messages": messages,
    }


def _initial_chunk(block: Any) -> AIMessageChunk | None:
    if block.type == "text" and block.text:
        return AIMessageChunk(content=block.text)
    if block.type == "thinking" and block.thinking:
        return AIMessageChunk(
            content=[{"type": "reasoning", "reasoning": block.thinking}]
        )
    if block.type not in {"text", "thinking", "redacted_thinking"}:
        raise ValueError("Unexpected content in a pure completion")
    return None


async def anthropic_completion(
    inputs: LLMCompletionInputs,
) -> AsyncGenerator[AIMessageChunk, None]:
    config = inputs.model_config_inputs
    client = AsyncAnthropic(
        api_key=config.api_key,
        base_url=re.sub(r"/v1/messages$", "", config.api.rstrip("/")),
        timeout=inputs.timeout,
        max_retries=0,
    )
    try:
        async with client.messages.stream(**_request(inputs)) as stream:
            stopped = False
            async for event in stream:
                if event.type == "text":
                    yield AIMessageChunk(content=event.text)
                elif event.type == "thinking":
                    yield AIMessageChunk(
                        content=[{"type": "reasoning", "reasoning": event.thinking}]
                    )
                elif event.type == "content_block_start":
                    initial = _initial_chunk(event.content_block)
                    if initial is not None:
                        yield initial
                elif event.type == "message_stop":
                    stopped = True
            final = await stream.get_final_message()
            if (
                not stopped
                or not final.stop_reason
                or final.stop_reason == "tool_use"
                or any(
                    block.type not in {"text", "thinking", "redacted_thinking"}
                    for block in final.content
                )
            ):
                raise ValueError("Model stream ended without a final message")
            usage = final.usage
            input_tokens = (
                usage.input_tokens
                + (usage.cache_read_input_tokens or 0)
                + (usage.cache_creation_input_tokens or 0)
            )
            yield AIMessageChunk(
                content="",
                response_metadata={"stop_reason": final.stop_reason},
                usage_metadata={
                    "input_tokens": input_tokens,
                    "output_tokens": usage.output_tokens,
                    "total_tokens": input_tokens + usage.output_tokens,
                },
            )
    finally:
        cleanup = asyncio.create_task(client.close())
        try:
            await asyncio.shield(cleanup)
        except asyncio.CancelledError:
            await cleanup
            raise
