"""Read queued inputs for an independent Console Agent run."""

import os
from typing import TypedDict, cast
from urllib.parse import quote, urlsplit

import httpx

from agent.infra.workflow_internal_auth import (
    WORKFLOW_INTERNAL_API_KEY_HEADER,
    optional_workflow_internal_api_key,
)

MAX_STEERING_INPUTS = 8


class SteeringInput(TypedDict):
    id: str
    message: str


async def read_steering(run_id: str, after: int, final: bool) -> list[SteeringInput]:
    base = os.getenv("CONSOLE_INTERNAL_BASE_URL", "").rstrip("/")
    parsed = urlsplit(base)
    key = optional_workflow_internal_api_key()
    if (
        not key
        or parsed.scheme not in {"http", "https"}
        or not parsed.hostname
        or parsed.username
        or parsed.password
        or parsed.query
        or parsed.fragment
    ):
        raise ValueError("Console steering is not configured")
    async with httpx.AsyncClient(timeout=5, follow_redirects=False) as client:
        response = await client.post(
            f"{base}/agents/internal/runs/{quote(run_id, safe='')}/steering",
            headers={WORKFLOW_INTERNAL_API_KEY_HEADER: key},
            json={"after": after, "final": final},
        )
        response.raise_for_status()
        data = response.json()
    messages = (data.get("data") or {}).get("messages")
    if (
        data.get("code") != 0
        or not isinstance(messages, list)
        or after + len(messages) > MAX_STEERING_INPUTS
        or any(
            not isinstance(item, dict)
            or not isinstance(item.get("id"), str)
            or not isinstance(item.get("message"), str)
            for item in messages
        )
    ):
        raise ValueError("Invalid Console steering response")
    return cast(list[SteeringInput], messages)
