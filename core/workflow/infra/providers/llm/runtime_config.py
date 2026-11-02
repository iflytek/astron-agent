"""Resolve model credentials from Console immediately before inference."""

import os
from typing import Any
from urllib.parse import urlsplit

import httpx

from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum
from workflow.utils.credentials import credential_from_env_or_file


def _error(message: str) -> CustomException:
    return CustomException(CodeEnum.LLM_REQUEST_ERROR, err_msg=message)


async def resolve_model_config(flow_id: str, model_id: str) -> dict[str, Any]:
    """Fetch the current authorized model; never cache credentials or log responses."""
    if not flow_id or not model_id:
        raise _error("Workflow model reference is required")
    endpoint = os.getenv("MODEL_RUNTIME_CONFIG_URL", "").strip()
    parsed = urlsplit(endpoint)
    if (
        parsed.scheme not in {"http", "https"}
        or not parsed.hostname
        or parsed.username
        or parsed.password
        or parsed.query
        or parsed.fragment
    ):
        raise _error("Model runtime configuration endpoint is not configured")
    credential = credential_from_env_or_file(
        "WORKFLOW_INTERNAL_API_KEY",
        "WORKFLOW_INTERNAL_API_KEY_FILE",
        min_length=32,
        placeholders=("CHANGE_ME_WORKFLOW_INTERNAL_API_KEY",),
    )
    if not credential:
        raise _error("Workflow internal API authentication is not configured")
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=False) as client:
            response = await client.get(
                endpoint,
                params={"flowId": flow_id, "modelId": model_id},
                headers={"X-Workflow-Internal-Key": credential},
            )
        if response.status_code != 200:
            raise _error("Model runtime configuration request failed")
        payload = response.json()
    except (httpx.HTTPError, ValueError):
        # Exception strings and server bodies can contain credentials.
        raise _error("Model runtime configuration request failed") from None
    if not isinstance(payload, dict) or payload.get("code") != 0:
        raise _error("Model runtime configuration is not available")
    config = payload.get("data")
    if (
        not isinstance(config, dict)
        or str(config.get("modelId", "")) != model_id
        or config.get("provider") not in {"openai", "anthropic", "google"}
        or any(
            not isinstance(config.get(key), str) for key in ("api", "domain", "apiKey")
        )
        or not config["api"]
        or not config["domain"]
    ):
        raise _error("Model runtime configuration is invalid")
    return {key: config[key] for key in ("provider", "api", "domain", "apiKey")}
