"""Langfuse observability integration for the agent service.

Provides opt-in LLM tracing/cost monitoring via Langfuse (https://langfuse.com).

Design goals:
- Zero impact when Langfuse is not configured (graceful degradation).
- Optional dependency: langfuse is only required if the `[langfuse]` extra
  is installed and `LANGFUSE_ENABLED=true` is set.
- Async-safe: tracing must never raise into the LLM call path.

Usage:
    - OpenAI-compatible providers: builder wraps the client with
      `langfuse.openai.AsyncOpenAI` when enabled (automatic tracing).
    - Anthropic/Google providers: `trace_provider_stream()` wraps the
      httpx-based streaming call with a manual generation observation.
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from importlib import import_module
from typing import Any, AsyncIterator, Optional

logger = logging.getLogger(__name__)

# Total switch. Set to "true" to enable Langfuse tracing.
ENV_ENABLED = "LANGFUSE_ENABLED"
# Langfuse project credentials / endpoint.
ENV_PUBLIC_KEY = "LANGFUSE_PUBLIC_KEY"
ENV_SECRET_KEY = "LANGFUSE_SECRET_KEY"
ENV_HOST = "LANGFUSE_HOST"

_client = None
_client_attempted = False


def is_enabled() -> bool:
    """Return True when Langfuse tracing is enabled.

    Enabled means: LANGFUSE_ENABLED=true AND required credentials are present.
    Missing credentials log a warning once instead of failing silently.
    """
    global _client_attempted
    if os.getenv(ENV_ENABLED, "false").strip().lower() != "true":
        return False
    if not _client_attempted:
        _client_attempted = True
        if not os.getenv(ENV_PUBLIC_KEY) or not os.getenv(ENV_SECRET_KEY):
            logger.warning(
                "[langfuse] LANGFUSE_ENABLED=true but credentials missing; "
                "tracing disabled."
            )
            return False
        if not os.getenv(ENV_HOST):
            logger.warning(
                "[langfuse] %s not set; defaulting to Langfuse Cloud.", ENV_HOST
            )
    return True


def get_client() -> Optional[Any]:
    """Return the shared Langfuse client (lazy singleton)."""
    global _client
    if _client is None:
        try:
            langfuse_mod = import_module("langfuse")
            Langfuse = langfuse_mod.Langfuse
        except (ImportError, AttributeError):
            logger.warning(
                "[langfuse] package not installed. "
                "Install with: pip install 'agent[langfuse]'"
            )
            return None
        _client = Langfuse(
            public_key=os.getenv(ENV_PUBLIC_KEY),
            secret_key=os.getenv(ENV_SECRET_KEY),
            host=os.getenv(ENV_HOST) or "https://cloud.langfuse.com",
            # v4 exports asynchronously by default; never blocks LLM path.
            flush_at=10,
            flush_interval=15,
        )
    return _client


def wrap_openai_client(openai_client: Any) -> Any:
    """Enable Langfuse automatic tracing for an OpenAI-compatible client.

    Langfuse v4 instruments the OpenAI SDK globally at import time
    (register_tracing() wraps every chat/embedding method via wrapt), so
    enabling tracing is as simple as importing `langfuse.openai`.

    Returns the original client unchanged in all cases — the wrapper import
    is the actual enabler. Falls back to the raw client when Langfuse is
    disabled or unavailable (graceful degradation).
    """
    if not is_enabled():
        return openai_client
    try:
        import_module("langfuse.openai")
    except (ImportError, AttributeError):
        logger.warning("[langfuse] langfuse.openai unavailable; using raw client.")
    return openai_client


def _safe_observe_start(
    lf: Any, model_name: str, provider: str, messages: list
) -> Optional[Any]:
    """Start a Langfuse generation observation; never raises."""
    try:
        return lf.start_observation(
            name="llm-call",
            as_type="generation",
            input={"model": model_name, "provider": provider, "messages": messages},
            metadata={"provider": provider},
            model=model_name,
        )
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning("[langfuse] start_observation failed: %s", exc)
        return None


def _safe_observe_finish(
    observation: Optional[Any],
    metadata: dict,
    level: Optional[str] = None,
    status_message: Optional[str] = None,
) -> None:
    """Finalize an observation (update + end); never raises."""
    if observation is None:
        return
    try:
        update_kwargs: dict[str, Any] = {"metadata": metadata}
        if level is not None:
            update_kwargs["level"] = level
        if status_message is not None:
            update_kwargs["status_message"] = status_message
        observation.update(**update_kwargs)
        observation.end()
    except Exception:  # pragma: no cover - defensive
        logger.debug("[langfuse] failed to finalize observation", exc_info=True)


@asynccontextmanager
async def trace_provider_stream(
    model_name: str,
    provider: str,
    messages: list,
    payload: Optional[dict] = None,
) -> AsyncIterator[Any]:
    """Context manager adding a Langfuse 'generation' observation around a
    non-OpenAI provider stream (Anthropic/Google httpx calls).

    Never raises: any Langfuse error is logged and swallowed so the LLM call
    path stays unaffected (graceful degradation).
    """
    lf = get_client() if is_enabled() else None
    observation = (
        _safe_observe_start(lf, model_name, provider, messages) if lf else None
    )

    try:
        yield observation
    except Exception as exc:
        _safe_observe_finish(
            observation,
            {"provider": provider, "error": str(exc)[:500]},
            level="ERROR",
            status_message=str(exc)[:500],
        )
        raise
    else:
        _safe_observe_finish(
            observation, {"provider": provider, "payload": payload or {}}
        )
