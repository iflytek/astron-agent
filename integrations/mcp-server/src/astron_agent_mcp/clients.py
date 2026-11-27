"""HTTP clients for the Spark chat API and the published Astron workflow API."""

import json
import logging
from typing import Any, Literal

import anyio
import httpx2
from pydantic import BaseModel, Field

from astron_agent_mcp.config import Settings

logger = logging.getLogger(__name__)

SPARK_TIMEOUT = httpx2.Timeout(120.0, connect=10.0)
# Workflow streams stay open for long-running nodes and send heartbeat frames,
# so only the connect phase gets a short timeout; the overall deadline is
# enforced by ASTRON_WORKFLOW_TIMEOUT_SECONDS.
WORKFLOW_TIMEOUT = httpx2.Timeout(None, connect=10.0)
MAX_ERROR_DETAIL = 300


class UpstreamError(Exception):
    """An error returned by Spark or Astron Agent, safe to show to the caller."""


class WorkflowResult(BaseModel):
    status: Literal["completed", "interrupted"] = Field(
        description="`interrupted` means the workflow is waiting for a reply."
    )
    content: str = Field(description="Workflow output text collected so far.")
    reasoning_content: str = Field(default="", description="Reasoning output, if any.")
    session_id: str = Field(default="", description="Astron trace ID for support.")
    event_id: str | None = Field(
        default=None,
        description="Pass to astron_resume_workflow when status is `interrupted`.",
    )
    interrupt: dict[str, Any] | None = Field(
        default=None, description="Question or options the workflow is waiting on."
    )


async def spark_chat(
    settings: Settings,
    messages: list[dict[str, str]],
    model: str | None,
    temperature: float | None,
    max_tokens: int | None,
    transport: httpx2.AsyncBaseTransport | None = None,
) -> str:
    payload: dict[str, Any] = {
        "model": model or settings.spark_model,
        "messages": messages,
        "stream": False,
    }
    if temperature is not None:
        payload["temperature"] = temperature
    if max_tokens is not None:
        payload["max_tokens"] = max_tokens

    async with httpx2.AsyncClient(timeout=SPARK_TIMEOUT, transport=transport) as client:
        try:
            response = await client.post(
                f"{settings.spark_base_url}/chat/completions",
                headers={"Authorization": f"Bearer {settings.spark_api_password}"},
                json=payload,
            )
        except httpx2.TimeoutException as exc:
            raise UpstreamError("Spark request timed out") from exc
        except httpx2.HTTPError as exc:
            raise UpstreamError(f"Spark request failed: {type(exc).__name__}") from exc

    body = _json_body(response)
    if response.status_code >= 400:
        raise UpstreamError(f"Spark returned HTTP {response.status_code}: {_error_detail(body)}")
    if not isinstance(body, dict):
        raise UpstreamError("Spark returned a non-JSON response")
    if body.get("code", 0) != 0:
        raise UpstreamError(f"Spark error {body.get('code')}: {_error_detail(body)}")

    try:
        content = body["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise UpstreamError("Spark response has no choices[0].message.content") from exc
    logger.info("spark_chat completed sid=%s model=%s", body.get("sid", ""), payload["model"])
    return str(content)


async def run_workflow(
    settings: Settings,
    flow_id: str,
    parameters: dict[str, Any],
    uid: str | None,
    chat_id: str | None,
    transport: httpx2.AsyncBaseTransport | None = None,
) -> WorkflowResult:
    payload: dict[str, Any] = {
        "flow_id": flow_id,
        "parameters": parameters,
        "stream": True,
    }
    if uid:
        payload["uid"] = uid
    if chat_id:
        payload["chat_id"] = chat_id
    return await _stream_workflow(settings, "/workflow/v1/chat/completions", payload, transport)


async def resume_workflow(
    settings: Settings,
    event_id: str,
    content: str,
    transport: httpx2.AsyncBaseTransport | None = None,
) -> WorkflowResult:
    payload = {"event_id": event_id, "event_type": "resume", "content": content}
    return await _stream_workflow(settings, "/workflow/v1/resume", payload, transport)


async def _stream_workflow(
    settings: Settings,
    path: str,
    payload: dict[str, Any],
    transport: httpx2.AsyncBaseTransport | None,
) -> WorkflowResult:
    headers = {
        "Authorization": f"Bearer {settings.astron_api_key}:{settings.astron_api_secret}",
        "Accept": "text/event-stream",
    }
    try:
        with anyio.fail_after(settings.workflow_timeout_seconds):
            async with httpx2.AsyncClient(timeout=WORKFLOW_TIMEOUT, transport=transport) as client:
                async with client.stream(
                    "POST", f"{settings.astron_base_url}{path}", headers=headers, json=payload
                ) as response:
                    if response.status_code >= 400:
                        body = _json_body(response, await response.aread())
                        raise UpstreamError(
                            f"Astron returned HTTP {response.status_code}: {_error_detail(body)}"
                        )
                    return await _collect_events(response)
    except TimeoutError as exc:
        raise UpstreamError(
            f"Workflow did not finish within {settings.workflow_timeout_seconds:g}s"
        ) from exc
    except httpx2.HTTPError as exc:
        raise UpstreamError(f"Astron request failed: {type(exc).__name__}") from exc


async def _collect_events(response: httpx2.Response) -> WorkflowResult:
    content: list[str] = []
    reasoning: list[str] = []
    session_id = ""
    async for line in response.aiter_lines():
        if not line.startswith("data:"):
            continue
        try:
            event = json.loads(line.removeprefix("data:").strip())
        except json.JSONDecodeError:
            logger.warning("Skipping malformed workflow frame")
            continue

        session_id = event.get("id") or session_id
        if event.get("code", 0) != 0:
            raise UpstreamError(
                f"Workflow error {event.get('code')}: {_error_detail(event)} (sid={session_id})"
            )

        choice = (event.get("choices") or [{}])[0]
        finish_reason = choice.get("finish_reason")
        if finish_reason == "ping":
            continue
        delta = choice.get("delta") or {}
        content.append(delta.get("content") or "")
        reasoning.append(delta.get("reasoning_content") or "")

        if finish_reason == "interrupt":
            event_data = event.get("event_data") or {}
            logger.info("Workflow interrupted sid=%s", session_id)
            return WorkflowResult(
                status="interrupted",
                content="".join(content),
                reasoning_content="".join(reasoning),
                session_id=session_id,
                event_id=event_data.get("event_id"),
                interrupt=event_data.get("value"),
            )
        if finish_reason == "stop":
            logger.info("Workflow completed sid=%s", session_id)
            return WorkflowResult(
                status="completed",
                content="".join(content),
                reasoning_content="".join(reasoning),
                session_id=session_id,
            )

    raise UpstreamError(f"Workflow stream ended before completion (sid={session_id})")


def _json_body(response: httpx2.Response, raw: bytes | None = None) -> Any:
    try:
        return json.loads(raw if raw is not None else response.content)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None


def _error_detail(body: Any) -> str:
    if isinstance(body, dict):
        error = body.get("error")
        if isinstance(error, dict) and error.get("message"):
            return str(error["message"])[:MAX_ERROR_DETAIL]
        if body.get("message"):
            return str(body["message"])[:MAX_ERROR_DETAIL]
    return "no error message"
