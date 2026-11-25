"""Trusted Console runtime authorization; no credentials are cached or persisted."""

import asyncio
import os
import time
from typing import Any, AsyncIterator, Coroutine
from urllib.parse import urlsplit

import httpx
from httpx_sse import aconnect_sse

from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum
from workflow.utils.credentials import credential_from_env_or_file


def endpoint(action: str) -> str:
    base = os.getenv("CONSOLE_INTERNAL_BASE_URL", "").rstrip("/")
    parsed = urlsplit(base)
    if (
        parsed.scheme not in {"http", "https"}
        or not parsed.hostname
        or parsed.username
        or parsed.password
        or parsed.query
        or parsed.fragment
    ):
        raise error("Console runtime endpoint is not configured")
    return f"{base}/workflow/internal/{action}"


def headers() -> dict[str, str]:
    key = credential_from_env_or_file(
        "WORKFLOW_INTERNAL_API_KEY",
        "WORKFLOW_INTERNAL_API_KEY_FILE",
        min_length=32,
        placeholders=("CHANGE_ME_WORKFLOW_INTERNAL_API_KEY",),
    )
    if not key:
        raise error("Workflow internal authentication is not configured")
    return {"X-Workflow-Internal-Key": key}


def error(message: str) -> CustomException:
    return CustomException(CodeEnum.WORKFLOW_EXECUTION_ERROR, err_msg=message)


def validate_context(value: Any) -> dict[str, str]:
    if not isinstance(value, dict) or any(
        not isinstance(value.get(key), str) or not value[key]
        for key in ("run_id", "root_id")
    ):
        raise error("Trusted Console execution context is required")
    return value


async def request(action: str, payload: dict) -> dict:
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=False) as client:
            response = await client.post(
                endpoint(action), json=payload, headers=headers()
            )
            response.raise_for_status()
            result = response.json()
        if (
            not isinstance(result, dict)
            or result.get("code") != 0
            or not isinstance(result.get("data"), dict)
        ):
            raise error("Console runtime authorization failed")
        return result["data"]
    except (httpx.HTTPError, ValueError):
        raise error("Console runtime authorization failed") from None


async def control(context: dict) -> dict:
    validate_context(context)
    state = await request(
        "control", {"runId": context["run_id"], "rootId": context["root_id"]}
    )
    deadline = state.get("deadline")
    if state.get("cancelled") or (
        deadline is not None and time.time() >= float(deadline)
    ):
        raise error("Console execution cancelled or expired")
    return state


async def cancel(context: dict) -> None:
    await request("cancel", {"runId": context["run_id"], "rootId": context["root_id"]})


async def tool_stream(payload: dict) -> AsyncIterator[dict]:
    """No automatic retries: a disconnected request may already have side effects."""
    context = validate_context(payload.get("context"))
    complete = False
    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(1800, connect=10), follow_redirects=False
        ) as client:
            async with aconnect_sse(
                client, "POST", endpoint("tool-run"), json=payload, headers=headers()
            ) as stream:
                stream.response.raise_for_status()
                async for event in stream.aiter_sse():
                    if (
                        not event.data
                        or event.event != "message"
                        or event.data == "[DONE]"
                    ):
                        continue
                    message = event.json()
                    if not isinstance(message, dict):
                        raise error("Invalid child workflow response")
                    if message.get("code", 0):
                        raise error("Child workflow execution failed")
                    if message.get("event_data"):
                        raise error(
                            "A workflow used as a tool cannot wait for user input"
                        )
                    choices = message.get("choices") or []
                    if not choices:
                        continue
                    node = (message.get("workflow_step") or {}).get("node") or {}
                    complete = choices[0].get("finish_reason") == "stop" and node.get(
                        "id"
                    ) in (None, "flow_obj")
                    yield message
                    if complete:
                        return
        if not complete:
            raise error("Child workflow stream ended without completion")
    finally:
        if not complete:
            # Bound cleanup; never hide the original cancellation or execution error.
            try:
                await asyncio.wait_for(asyncio.shield(cancel(context)), timeout=11)
            except (Exception, asyncio.CancelledError):
                pass


async def execute_with_control(
    operation: Coroutine[Any, Any, Any], context: dict
) -> Any:
    async def watch() -> None:
        while True:
            await control(context)
            await asyncio.sleep(0.5)

    execution = asyncio.create_task(operation)
    watcher = asyncio.create_task(watch())
    try:
        completed, _ = await asyncio.wait(
            {execution, watcher}, return_when=asyncio.FIRST_COMPLETED
        )
        if watcher in completed:
            await watcher
        return await execution
    finally:
        execution.cancel()
        watcher.cancel()
        await asyncio.gather(execution, watcher, return_exceptions=True)
