import json
from typing import Any

import httpx

from agent_runtime.db.models import AgentRelease, AgentRun
from agent_runtime.settings import Settings


class AdapterError(RuntimeError):
    pass


class RunNotResumableError(AdapterError):
    pass


def _extract_sse_result(body: str) -> dict[str, Any]:
    text_parts: list[str] = []
    final_payload: dict[str, Any] | None = None
    for line in body.splitlines():
        if not line.startswith("data: "):
            continue
        raw = line.removeprefix("data: ").strip()
        if not raw or raw == "[DONE]":
            continue
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            continue
        if not isinstance(payload, dict):
            continue
        if payload.get("code") not in (None, 0):
            raise AdapterError(str(payload.get("message") or "Core agent failed"))
        final_payload = payload
        choices = payload.get("choices") or []
        if choices and isinstance(choices[0], dict):
            delta = choices[0].get("delta") or {}
            content = delta.get("content") if isinstance(delta, dict) else None
            if content:
                text_parts.append(str(content))
    return {"content": "".join(text_parts), "response": final_payload or {}}


def _agent_request(release: AgentRelease, run: AgentRun) -> dict[str, Any]:
    template = release.snapshot.get("agent_request")
    if not isinstance(template, dict):
        raise AdapterError("Published snapshot is missing agent_request")
    request = json.loads(json.dumps(template))
    messages = run.input_data.get("messages")
    if not isinstance(messages, list):
        question = run.input_data.get("question") or run.input_data.get("requirement")
        if not isinstance(question, str) or not question:
            raise AdapterError("Run input must contain messages or question")
        messages = [{"role": "user", "content": question}]
    request["messages"] = messages
    request["uid"] = run.end_user_id
    request["stream"] = True
    metadata = request.setdefault("meta_data", {})
    metadata.update(
        {"caller": "agent-runtime", "caller_sid": run.trace_id, "run_id": run.id}
    )
    return request


async def _resolve_model_credential(
    request: dict[str, Any], settings: Settings, client: httpx.AsyncClient
) -> None:
    model_config = request.get("model_config")
    if not isinstance(model_config, dict):
        raise AdapterError("Published snapshot is missing model_config")
    credential_ref = model_config.pop("credential_ref", None)
    if credential_ref is None:
        return
    if (
        not isinstance(credential_ref, dict)
        or credential_ref.get("type") != "console_model"
    ):
        raise AdapterError("Published model credential reference is invalid")
    model_id = credential_ref.get("model_id")
    owner_uid = credential_ref.get("owner_uid")
    space_id = credential_ref.get("space_id")
    if not str(model_id).isdigit() or not owner_uid or str(space_id) == "":
        raise AdapterError("Published model credential reference is incomplete")
    internal_key = settings.management_key()
    if len(internal_key) < 32:
        raise AdapterError("Model credential resolver is not configured")
    response = await client.get(
        f"{settings.console_hub_url.rstrip('/')}/internal/agent-runtime/model-credentials/{model_id}",
        headers={"X-Runtime-Internal-Key": internal_key},
        params={"ownerUid": owner_uid, "spaceId": space_id},
    )
    response.raise_for_status()
    payload = response.json()
    api_key = payload.get("api_key") if isinstance(payload, dict) else None
    if not isinstance(api_key, str) or not api_key:
        raise AdapterError("Model credential could not be resolved")
    model_config["api_key"] = api_key


async def _execute_agent(
    release: AgentRelease, run: AgentRun, settings: Settings
) -> dict[str, Any]:
    headers = {
        "X-Consumer-Username": run.app_id,
        "X-Workflow-Internal-Key": settings.workflow_key(),
    }
    timeout = httpx.Timeout(900, connect=10)
    async with httpx.AsyncClient(timeout=timeout) as client:
        request = _agent_request(release, run)
        await _resolve_model_credential(request, settings, client)
        response = await client.post(
            f"{settings.core_agent_url.rstrip('/')}/agent/v1/custom/chat/completions",
            headers=headers,
            json=request,
        )
    response.raise_for_status()
    return _extract_sse_result(response.text)


async def _execute_workflow(
    release: AgentRelease, run: AgentRun, settings: Settings
) -> dict[str, Any]:
    workflow = release.snapshot.get("workflow")
    if not isinstance(workflow, dict) or not workflow.get("flow_id"):
        raise AdapterError("Published snapshot is missing workflow.flow_id")
    parameters = run.input_data.get("parameters", run.input_data)
    payload = {
        "flow_id": workflow["flow_id"],
        "version": workflow.get("version", ""),
        "uid": run.end_user_id,
        "chat_id": run.conversation_id or run.id,
        "stream": False,
        "parameters": parameters,
        "ext": {"runtime_run_id": run.id},
        "history": run.input_data.get("history", []),
    }
    headers = {
        "X-Consumer-Username": run.app_id,
        "X-Workflow-Internal-Key": settings.workflow_key(),
    }
    timeout = httpx.Timeout(900, connect=10)
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(
            f"{settings.core_workflow_url.rstrip('/')}/workflow/v1/chat/completions",
            headers=headers,
            json=payload,
        )
    response.raise_for_status()
    try:
        result = response.json()
    except json.JSONDecodeError as exc:
        raise AdapterError("Core workflow returned invalid JSON") from exc
    if not isinstance(result, dict):
        raise AdapterError("Core workflow returned an invalid response")
    if result.get("code") not in (None, 0):
        raise AdapterError("Core workflow execution failed")
    return {"response": result}


async def execute_release(
    release: AgentRelease, run: AgentRun, settings: Settings
) -> dict[str, Any]:
    if release.mode in {"chat", "react"}:
        return await _execute_agent(release, run, settings)
    if release.mode == "workflow":
        return await _execute_workflow(release, run, settings)
    if release.mode == "plan_execute":
        from agent_runtime.services.plan_execute import execute_plan

        return await execute_plan(release, run, settings)
    raise AdapterError(f"Execution mode is not available yet: {release.mode}")
