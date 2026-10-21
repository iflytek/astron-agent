"""Official provider integrations owned by a single Agent request."""

import asyncio
import os
import re
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable

import httpx
from langchain_core.language_models import BaseChatModel


@dataclass
class ModelHandle:
    model: BaseChatModel
    name: str
    provider: str
    http_client: httpx.AsyncClient | None = None
    async_close: Callable[[], Awaitable[None]] | None = field(default=None, repr=False)
    sync_close: Callable[[], None] | None = field(default=None, repr=False)
    _closed: bool = field(default=False, init=False, repr=False)

    async def aclose(self) -> None:
        """Close official SDK transports, including cancellation/build failure."""
        if self._closed:
            return
        self._closed = True
        try:
            if self.async_close is not None:
                await self.async_close()
        finally:
            try:
                if self.sync_close is not None:
                    self.sync_close()
            finally:
                if self.http_client is not None:
                    await self.http_client.aclose()


async def create_provider_model(
    *,
    model_name: str,
    base_url: str,
    provider: str,
    api_key: str,
    http_client: httpx.AsyncClient,
) -> ModelHandle:
    """Configure SDK adapters rather than normalizing provider HTTP/SSE by hand."""
    from langchain_anthropic import ChatAnthropic
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_openai import ChatOpenAI

    try:
        normalized = provider.strip().lower() or "openai"
        timeout = int(os.getenv("DEFAULT_LLM_TIMEOUT", "90"))
        max_tokens = os.getenv("DEFAULT_LLM_MAX_TOKEN")
        options: dict[str, Any] = {
            "model": model_name,
            "api_key": api_key,
            "timeout": timeout,
            "max_retries": 2,
        }
        if max_tokens:
            options["max_tokens"] = int(max_tokens)
        endpoint = base_url.rstrip("/")
        if normalized == "anthropic":
            endpoint = re.sub(r"/v1/messages$", "", endpoint)
            if endpoint:
                options["base_url"] = endpoint
            # ChatAnthropic owns provider-managed pooled SDK transports and has
            # no public per-instance http_async_client constructor parameter.
            anthropic_model = ChatAnthropic(**options)
            await http_client.aclose()
            return ModelHandle(anthropic_model, model_name, normalized)
        elif normalized == "google":
            version_match = re.search(r"/(v1(?:beta)?)(?:/|$)", endpoint)
            endpoint = re.sub(
                r"/v1(?:beta)?(?:/models/[^/?]+)?(?::(?:stream)?[Gg]enerateContent)?(?:\?.*)?$",
                "",
                endpoint,
            )
            options.pop("timeout")
            google_model = ChatGoogleGenerativeAI(
                **options,
                vertexai=False,
                base_url=endpoint or None,
                api_version=version_match.group(1) if version_match else None,
                timeout=timeout,
            )
            await http_client.aclose()
            assert google_model.client is not None
            return ModelHandle(
                google_model,
                model_name,
                normalized,
                async_close=google_model.client.aio.aclose,
                sync_close=google_model.client.close,
            )
        elif normalized in {
            "openai",
            "chatgpt",
            "deepseek",
            "doubao",
            "minimax",
            "moonshot",
            "qwen",
            "zhipu",
        }:
            endpoint = re.sub(r"/(?:chat/)?completions$", "", endpoint)
            model = ChatOpenAI(
                **options,
                base_url=endpoint or None,
                http_async_client=http_client,
                use_responses_api=False,
                stream_usage=True,
            )
        else:
            raise ValueError("Unsupported Agent model provider")
        return ModelHandle(
            model,
            model_name,
            normalized,
            http_client,
            sync_close=model.root_client.close,
        )
    except BaseException:
        await asyncio.shield(http_client.aclose())
        raise
