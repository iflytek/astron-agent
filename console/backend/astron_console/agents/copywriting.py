"""Authorized writing assistance through Core's existing single-model completion."""

import asyncio
import json
import logging
from contextlib import aclosing

import httpx
from asgiref.sync import async_to_sync
from django.conf import settings

from astron_console.http import api_endpoint
from astron_console.resources.common import UpstreamError, text, upstream_errors
from astron_console.spaces.permissions import identifier, resolve_scope

from . import conversations
from .resource_resolution import resolve_resources

logger = logging.getLogger(__name__)
TIMEOUT_SECONDS = 60
PROMPTS = {
    "zh": (
        "请根据给定的助手名称，在100字内生成智能助手简介，准确专业，用于作为助手的宣传文本，"
        "向用户展示其能力。请直接返回简介，不要添加其他无关语句。"
    ),
    "en": (
        "Please generate an intelligent agent profile within 100 words based on the given "
        "agent name, using no more than 255 characters, accurate and professional, "
        "to be used as promotional text for the agent "
        "to showcase its capabilities to users. Return the profile directly without adding "
        "other irrelevant statements."
    ),
}


async def completion(payload, *, max_length):
    """Require both a normal terminal frame and DONE; never return partial output."""
    pieces = []
    length = 0
    finished = done = False
    async with (
        asyncio.timeout(TIMEOUT_SECONDS + 5),
        aclosing(conversations.upstream(payload, direct_completion=True)) as events,
    ):
        async for raw in events:
            if raw == "[DONE]":
                done = True
                break
            chunk = json.loads(raw)
            if not isinstance(chunk, dict) or chunk.get("code") != 0:
                raise UpstreamError("AI描述生成失败，请稍后重试")
            choices = chunk.get("choices")
            if not isinstance(choices, list) or len(choices) != 1:
                raise ValueError("Invalid completion choices")
            choice = choices[0]
            if not isinstance(choice, dict) or not isinstance(choice.get("delta"), dict):
                raise ValueError("Invalid completion delta")
            content = choice["delta"].get("content", "")
            if not isinstance(content, str) or finished:
                raise ValueError("Invalid completion content")
            pieces.append(content)
            length += len(content)
            if length > max_length:
                raise UpstreamError("AI描述过长，请重试")
            reason = choice.get("finish_reason")
            if reason is not None:
                if reason != "stop":
                    raise UpstreamError("AI描述未完整生成，请重试")
                finished = True
    result = "".join(pieces).strip()
    if not done or not finished:
        raise UpstreamError("AI描述生成中断，请重试")
    if not result:
        raise UpstreamError("模型返回内容为空，请重试")
    return result


@api_endpoint(["POST"])
@upstream_errors
def generate_prologue(request):
    name = text(request.payload, "name", required=True, limit=520)
    model_id = identifier(request.payload.get("modelId"), required=True)
    scope = resolve_scope(request)
    runtime = resolve_resources(scope, {"modelId": model_id})
    if not settings.WORKFLOW_INTERNAL_API_KEY or not settings.MAAS_APP_ID:
        raise UpstreamError("模型服务内部身份未配置")
    language = "en" if request.headers.get("Accept-Language", "").lower().startswith("en") else "zh"
    payload = {
        "model_config": runtime["model_config"],
        "messages": [
            {"role": "system", "content": PROMPTS[language]},
            {"role": "user", "content": name},
        ],
        "parameters": {"max_tokens": 1024},
        "timeout": TIMEOUT_SECONDS,
        "uid": scope.uid,
        "meta_data": {"caller": "console-copywriting", "source": "prologue"},
        "stream": True,
    }
    try:
        result = async_to_sync(completion)(payload, max_length=100 if language == "zh" else 255)
    except (TimeoutError, httpx.TimeoutException):
        logger.warning("Prologue generation timed out model_id=%s", model_id)
        raise UpstreamError("AI描述生成超时，请重试") from None
    except UpstreamError:
        logger.warning("Prologue generation failed model_id=%s", model_id)
        raise
    except (httpx.HTTPError, ValueError, TypeError, RuntimeError) as exc:
        logger.warning(
            "Prologue generation failed model_id=%s error_type=%s", model_id, type(exc).__name__
        )
        raise UpstreamError("AI描述生成失败，请稍后重试") from None
    logger.info("Prologue generated model_id=%s length=%s", model_id, len(result))
    return result
