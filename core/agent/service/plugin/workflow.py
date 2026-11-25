"""Workflow tools authorized and tracked by Console, executed by core/workflow."""

import asyncio
import json
import os
import time
from typing import AsyncIterator
from urllib.parse import urlsplit
from uuid import uuid4

import httpx
from common.otlp.trace.span import Span
from httpx_sse import aconnect_sse
from pydantic import BaseModel, Field

from agent.exceptions.plugin_exc import RunWorkflowExc
from agent.infra.credentials import credential_from_env_or_file
from agent.service.plugin.base import BasePlugin, PluginResponse


def _endpoint(action: str) -> str:
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
        raise RunWorkflowExc
    return f"{base}/workflow/internal/{action}"


def _headers() -> dict[str, str]:
    key = credential_from_env_or_file(
        "WORKFLOW_INTERNAL_API_KEY",
        "WORKFLOW_INTERNAL_API_KEY_FILE",
        min_length=32,
        placeholders=("CHANGE_ME_WORKFLOW_INTERNAL_API_KEY",),
    )
    if not key:
        raise RunWorkflowExc
    return {"X-Workflow-Internal-Key": key}


def _context(value: dict) -> dict:
    if any(
        not isinstance(value.get(key), str) or not value[key]
        for key in ("run_id", "root_id")
    ):
        raise RunWorkflowExc
    return value


async def _request(action: str, payload: dict) -> dict:
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=False) as client:
            response = await client.post(
                _endpoint(action), json=payload, headers=_headers()
            )
            response.raise_for_status()
            data = response.json()
        if (
            not isinstance(data, dict)
            or data.get("code") != 0
            or not isinstance(data.get("data"), dict)
        ):
            raise RunWorkflowExc
        return data["data"]
    except (httpx.HTTPError, ValueError):
        raise RunWorkflowExc from None


class WorkflowPluginRunner(BaseModel):
    app_id: str
    uid: str
    flow_id: str
    context: dict = Field(default_factory=dict)

    async def run(
        self, action_input: dict, span: Span
    ) -> AsyncIterator[PluginResponse]:
        context = _context(self.context)
        started = int(time.time() * 1000)
        invocation_id = str(uuid4())
        complete = False
        with span.start("RunWorkflow") as sp:
            # Runtime arguments and credentials must not enter telemetry.
            sp.add_info_events(
                {"flow_id": self.flow_id, "invocation_id": invocation_id}
            )
            try:
                async with httpx.AsyncClient(
                    timeout=httpx.Timeout(
                        float(os.getenv("WORKFLOWS_CALL_TIMEOUT", "1800")), connect=10
                    ),
                    follow_redirects=False,
                ) as client:
                    async with aconnect_sse(
                        client,
                        "POST",
                        _endpoint("tool-run"),
                        headers=_headers(),
                        json={
                            "context": context,
                            "flowId": self.flow_id,
                            "parameters": action_input,
                            "invocationId": invocation_id,
                        },
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
                            if (
                                not isinstance(message, dict)
                                or message.get("code", 0)
                                or message.get("event_data")
                            ):
                                raise RunWorkflowExc
                            choices = message.get("choices") or []
                            if not choices:
                                continue
                            choice = choices[0]
                            delta = choice.get("delta") or {}
                            node = (message.get("workflow_step") or {}).get(
                                "node"
                            ) or {}
                            complete = choice.get(
                                "finish_reason"
                            ) == "stop" and node.get("id") in (None, "flow_obj")
                            content = delta.get("content") or ""
                            reasoning = delta.get("reasoning_content") or ""
                            yield PluginResponse(
                                code=0,
                                sid=message.get("id", ""),
                                start_time=started,
                                end_time=int(time.time() * 1000),
                                result={
                                    "content": content,
                                    "reasoning_content": reasoning,
                                },
                                log=[
                                    {
                                        "name": self.flow_id,
                                        "input": action_input,
                                        "content": content,
                                        "reasoning_content": reasoning,
                                    }
                                ],
                            )
                            if complete:
                                return
                if not complete:
                    raise RunWorkflowExc
            except (httpx.HTTPError, ValueError):
                raise RunWorkflowExc from None
            finally:
                if not complete:
                    try:
                        await asyncio.wait_for(
                            asyncio.shield(
                                _request(
                                    "cancel",
                                    {
                                        "runId": context["run_id"],
                                        "rootId": context["root_id"],
                                    },
                                )
                            ),
                            timeout=11,
                        )
                    except (Exception, asyncio.CancelledError):
                        pass


class WorkflowPlugin(BasePlugin):
    flow_id: str


class WorkflowPluginFactory(BaseModel):
    app_id: str
    uid: str
    workflow_ids: list
    context: dict = Field(default_factory=dict)

    async def gen(self, span: Span) -> list[WorkflowPlugin]:
        context = _context(self.context)
        plugins = []
        for flow_id in self.workflow_ids:
            schema = await _request(
                "tool-schema", {"context": context, "flowId": flow_id}
            )
            if str(schema.get("flowId")) != str(flow_id) or not isinstance(
                schema.get("parameters"), dict
            ):
                raise RunWorkflowExc
            name = schema.get("name") or f"workflow_{flow_id}"
            description = schema.get("description") or ""
            plugins.append(
                WorkflowPlugin(
                    flow_id=str(flow_id),
                    name=name,
                    description=description,
                    schema_template=(
                        f"tool_name:{name}, tool_description:{description}, "
                        f"tool_parameters:{json.dumps(schema['parameters'], ensure_ascii=False)}"
                    ),
                    typ="workflow",
                    run=WorkflowPluginRunner(
                        app_id=self.app_id,
                        uid=self.uid,
                        flow_id=str(flow_id),
                        context=context,
                    ).run,
                )
            )
        return plugins
