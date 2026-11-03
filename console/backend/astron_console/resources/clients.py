"""Calls to existing resource services. No Java or anonymous success fallback."""

import logging
from urllib.parse import quote, urlsplit, urlunsplit

import httpx
from django.conf import settings
from django.core.exceptions import ValidationError

from .common import UpstreamError, http_url

logger = logging.getLogger(__name__)


def call(setting, method, path, *, payload=None, params=None, headers=None, success=(0, "0")):
    base = getattr(settings, setting, "").rstrip("/")
    if not base:
        raise UpstreamError(f"{setting} 未配置")
    http_url(base)
    try:
        with httpx.Client(timeout=60, follow_redirects=False) as client:
            result = client.request(
                method, base + path, json=payload, params=params, headers=headers
            )
            result.raise_for_status()
            body = result.json()
        code = body.get("code", body.get("header", {}).get("code"))
        if code not in success:
            raise UpstreamError(f"{setting} 返回失败")
        return body.get("data", body.get("payload"))
    except (httpx.HTTPError, ValueError, TypeError, AttributeError) as exc:
        logger.warning("Resource upstream %s failed (%s)", setting, type(exc).__name__)
        raise UpstreamError(f"{setting} 请求失败") from None


def normalize_provider(provider):
    provider = (provider or "openai").lower()
    if provider in {"anthropic", "google", "openai"}:
        return provider
    if provider in {"deepseek", "minimax", "zhipu", "qwen", "moonshot", "chatgpt", "doubao"}:
        return "openai"
    raise ValidationError("不支持的模型协议")


def probe_model(provider, endpoint, api_key, domain):
    """Use vendor SDKs for a real minimal inference before saving credentials."""
    http_url(endpoint)
    if not api_key or not domain:
        raise ValidationError("模型名称和 API Key 必填")
    parts = urlsplit(endpoint)
    path = parts.path.rstrip("/")
    try:
        if provider == "openai":
            from openai import OpenAI

            if path.endswith("/chat/completions"):
                path = path[: -len("/chat/completions")]
            base = urlunsplit((parts.scheme, parts.netloc, path, "", ""))
            with OpenAI(api_key=api_key, base_url=base, timeout=30, max_retries=0) as client:
                result = client.chat.completions.create(
                    model=domain, messages=[{"role": "user", "content": "Hi"}], max_tokens=8
                )
            if not result.choices:
                raise UpstreamError("模型返回内容为空")
            return base.rstrip("/") + "/chat/completions"
        if provider == "anthropic":
            from anthropic import Anthropic

            if path.endswith("/v1/messages"):
                path = path[: -len("/v1/messages")]
            base = urlunsplit((parts.scheme, parts.netloc, path, "", ""))
            with Anthropic(api_key=api_key, base_url=base, timeout=30, max_retries=0) as client:
                result = client.messages.create(
                    model=domain, messages=[{"role": "user", "content": "Hi"}], max_tokens=8
                )
            if not result.content:
                raise UpstreamError("模型返回内容为空")
            return base.rstrip("/") + "/v1/messages"
        from google import genai
        from google.genai import types

        path = path.split("/models/")[0]
        if path.endswith("/v1beta"):
            path = path[: -len("/v1beta")]
        base = urlunsplit((parts.scheme, parts.netloc, path, "", ""))
        with genai.Client(
            api_key=api_key, http_options=types.HttpOptions(base_url=base, timeout=30000)
        ) as client:
            result = client.models.generate_content(
                model=domain, contents="Hi", config=types.GenerateContentConfig(max_output_tokens=8)
            )
        if not result.candidates:
            raise UpstreamError("模型返回内容为空")
        return base.rstrip("/") + "/v1beta/models/" + quote(domain, safe="") + ":generateContent"
    except (ValidationError, UpstreamError):
        raise
    except Exception as exc:
        logger.warning("Model probe failed, provider=%s type=%s", provider, type(exc).__name__)
        raise UpstreamError("模型连接验证失败，请检查地址、协议和凭据") from None
