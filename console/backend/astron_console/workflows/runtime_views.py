"""Authenticated run, resume, history and trace endpoints for the workflow canvas."""

import json

from django.core.exceptions import ValidationError
from django.http import Http404, StreamingHttpResponse
from django.utils import timezone

from astron_console.http import api_endpoint
from astron_console.resources.common import page, scope_for

from .authorization import EXECUTE, READ, get_workflow
from .execution_context import cancel_root, select_graph
from .lifecycle import (
    claim_run,
    prepare_run,
    reconcile,
    run_data,
    stream_run,
)
from .models import WorkflowDialog, WorkflowRun


def streaming(run, **kwargs):
    claim_run(run, resume="resume_content" in kwargs)
    response = StreamingHttpResponse(stream_run(run, **kwargs), content_type="text/event-stream")
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response


def owned_run(request, run_id, permission=READ):
    scope = scope_for(request, permission)
    run = WorkflowRun.objects.filter(pk=run_id, uid=scope.uid, space_id=scope.space_id).first()
    if run is None:
        raise Http404
    from astron_console.publishing.models import PublicRunGrant

    if PublicRunGrant.objects.filter(root_id=run.context_id).exists():
        raise Http404
    get_workflow(scope, run.workflow_id, permission)
    return reconcile(run)


@api_endpoint(["POST"])
def chat(request):
    scope = scope_for(request, EXECUTE)
    payload = request.payload
    workflow = get_workflow(scope, payload.get("flow_id", payload.get("flowId")), EXECUTE)
    if payload.get("regen"):
        raise ValidationError("重试请使用原运行标识，不能重新选择当前版本")
    requested_version = payload.get("version")
    graph, version_id = (
        select_graph(workflow, requested_version) if requested_version else (None, None)
    )
    inputs = payload.get("inputs", payload.get("parameters", {}))
    if isinstance(inputs, list):
        inputs = {item["name"]: item.get("content", item.get("default", "")) for item in inputs}
    run = prepare_run(scope, workflow, inputs, graph=graph, version_id=version_id)
    return streaming(run)


@api_endpoint(["POST"])
def resume(request):
    run_id = request.payload.get("runId")
    if not run_id:
        # Retained canvas event identifier is only a lookup key; scope is checked below.
        row = WorkflowRun.objects.filter(event_id=str(request.payload.get("eventId"))).first()
        if row is None:
            raise Http404
        run_id = row.pk
    run = owned_run(request, run_id, EXECUTE)
    content = request.payload.get("content")
    if not isinstance(content, str) or len(content) > 200000:
        raise ValidationError("恢复内容无效")
    return streaming(run, resume_content=content)


@api_endpoint(["POST"])
def stop(request, run_id):
    run = owned_run(request, run_id, EXECUTE)
    if run.status not in {"completed", "failed", "cancelled", "interrupted"}:
        cancel_root(run.context_id)
        run.refresh_from_db()
    return run_data(run)


@api_endpoint(["POST"])
def retry(request, run_id):
    previous = owned_run(request, run_id, EXECUTE)
    scope = scope_for(request, EXECUTE)
    workflow = get_workflow(scope, previous.workflow_id, EXECUTE)
    run = prepare_run(scope, workflow, previous.inputs, retry_of=previous)
    return streaming(run)


@api_endpoint(["GET"])
def detail(request, run_id):
    run = owned_run(request, run_id)
    return {**run_data(run), "events": run.events}


@api_endpoint(["GET"])
def eligibility(request):
    scope = scope_for(request, EXECUTE)
    get_workflow(scope, request.GET.get("flowId"), EXECUTE)
    return True


def dialogue_data(run):
    question = [
        {
            "name": name,
            "type": "string",
            "default": value,
            "description": "",
            "required": False,
            "validationSchema": None,
            "errorMsg": "",
            "originErrorMsg": "",
        }
        for name, value in run.inputs.items()
    ]
    answer = {"messageContent": "", "content": run.output, "reasoningContent": ""}
    output = {}
    for event in run.events:
        node = (event.get("workflow_step") or {}).get("node") or {}
        if str(node.get("id", "")).startswith("node-end::"):
            output = node.get("outputs", {})
    return {
        "id": run.pk,
        "runId": run.pk,
        "workflowId": run.workflow_id,
        "question": json.dumps(question, ensure_ascii=False),
        "answer": json.dumps(answer, ensure_ascii=False),
        "answerItem": json.dumps(output, ensure_ascii=False),
        "data": json.dumps(run.events, ensure_ascii=False),
        "sid": run.pk,
        "status": run.status,
        "resolvedAgents": run.resolved_agents,
        "eventId": run.event_id,
        "interrupt": next(
            (e["event_data"] for e in reversed(run.events) if e.get("event_data")), None
        ),
        "createTime": run.create_time,
        "type": 1,
        "chatId": run.chat_id,
    }


@api_endpoint(["GET"])
def history(request):
    scope = scope_for(request, READ)
    workflow = get_workflow(scope, request.GET.get("workflowId"), READ)
    rows = WorkflowRun.objects.filter(
        workflow_id=workflow.pk,
        uid=scope.uid,
        space_id=scope.space_id,
        parent_run_id__isnull=True,
        history_hidden=False,
    )
    from astron_console.publishing.models import PublicRunGrant

    rows = rows.exclude(context_id__in=PublicRunGrant.objects.values("root_id"))
    requested_version = request.GET.get("version")
    if requested_version:
        _, version_id = select_graph(workflow, requested_version)
        rows = rows.filter(version_id=version_id)
    else:
        rows = rows.filter(version_id__isnull=True)
    rows = rows.exclude(kind="node-debug")
    result = [dialogue_data(reconcile(row)) for row in rows.order_by("create_time")[:500]]
    if requested_version:
        return result
    legacy = WorkflowDialog.objects.filter(
        workflow_id=workflow.pk,
        uid=scope.uid,
        deleted=False,
        type=int(request.GET.get("type", 1)),
    ).order_by("create_time")[:500]
    retained = [
        {
            "id": r.pk,
            "question": r.question,
            "answer": r.answer,
            "answerItem": r.answer_item,
            "data": r.data,
            "sid": r.sid,
            "createTime": r.create_time,
            "type": r.type,
            "status": "interrupted",
            "chatId": r.chat_id,
        }
        for r in legacy
    ]
    return retained + result


def trace_item(run, workflow):
    end = (
        run.update_time
        if run.status in {"completed", "failed", "cancelled", "interrupted"}
        else timezone.now()
    )
    usage = {}
    for event in run.events:
        if event.get("usage"):
            usage = event["usage"]
        elif event.get("node_debug"):
            usage = event["node_debug"].get("token_cost", {})
    return {
        "sid": run.pk,
        "runId": run.pk,
        "flowId": workflow.flow_id,
        "flowName": workflow.name,
        "startTime": int(run.create_time.timestamp() * 1000),
        "endTime": int(end.timestamp() * 1000),
        "duration": int((end - run.create_time).total_seconds() * 1000),
        "status": run.status,
        "usage": {
            "promptTokens": usage.get("prompt_tokens", 0),
            "completionTokens": usage.get("completion_tokens", 0),
            "totalTokens": usage.get("total_tokens", 0),
        },
    }


def trace_rows(request, flow_id):
    scope = scope_for(request, READ)
    workflow = get_workflow(scope, flow_id, READ)
    query = WorkflowRun.objects.filter(
        workflow_id=workflow.pk, uid=scope.uid, space_id=scope.space_id
    ).order_by("-create_time")
    from astron_console.publishing.models import PublicRunGrant

    query = query.exclude(context_id__in=PublicRunGrant.objects.values("root_id"))
    return workflow, query


@api_endpoint(["GET"])
def traces(request, flow_id, run_id=None):
    workflow, query = trace_rows(request, flow_id)
    if run_id:
        run = query.filter(pk=run_id).first()
        if run is None:
            raise Http404
        reconcile(run)
        nodes = []
        for event in run.events:
            node = (event.get("workflow_step") or {}).get("node")
            debug = event.get("node_debug")
            if debug:
                from astron_console.resources.common import parsed

                node = {
                    "id": debug.get("node_id", event.get("node_id", "")),
                    "alias_name": debug.get("alias_name", ""),
                    "executed_time": debug.get("node_exec_cost", 0),
                    "inputs": parsed(debug.get("input")),
                    "outputs": parsed(debug.get("output")),
                    "usage": debug.get("token_cost", {}),
                    "finish_reason": "stop" if run.status == "completed" else run.status,
                }
            if not node:
                continue
            nodes.append(
                {
                    "id": str(len(nodes)),
                    "nodeId": node.get("id"),
                    "nodeName": node.get("alias_name"),
                    "nodeType": str(node.get("id", "")).split("::")[0],
                    "duration": float(node.get("executed_time") or 0) * 1000,
                    "status": "failed"
                    if node.get("error_outputs")
                    else node.get("finish_reason", "running"),
                    "input": node.get("inputs", {}),
                    "output": node.get("outputs", {}),
                    "usage": node.get("usage", {}),
                    "logs": [],
                }
            )
        return {"execution": trace_item(run, workflow), "nodes": nodes}
    paginated = page(query, request.GET, lambda run: trace_item(reconcile(run), workflow))
    return {"list": paginated["records"], "total": paginated["total"]}


@api_endpoint(["GET"])
def statistics(request):
    workflow, rows = trace_rows(request, request.GET.get("flowId"))
    result = {
        key: 0
        for key in [
            "total",
            "completed",
            "failed",
            "cancelled",
            "interrupted",
            "paused",
            "running",
            "totalTokens",
            "averageDurationMs",
        ]
    }
    duration = 0
    for row in rows:
        reconcile(row)
        item = trace_item(row, workflow)
        result["total"] += 1
        result[row.status] = result.get(row.status, 0) + 1
        result["totalTokens"] += item["usage"]["totalTokens"]
        duration += item["duration"]
    if result["total"]:
        result["averageDurationMs"] = duration / result["total"]
    return result


def prepare_node(request, node_id, code_params=None):
    from .execution_context import graph_nodes, graph_value, select_graph

    scope = scope_for(request, EXECUTE)
    workflow = get_workflow(scope, request.payload.get("flowId"), EXECUTE)
    requested_version = request.payload.get("version")
    graph, version_id = (
        select_graph(workflow, requested_version) if requested_version else (None, None)
    )
    graph = graph or graph_value(workflow.data)
    selected = next((n for n in graph_nodes(graph) if n["id"] == node_id), None)
    supplied = (request.payload.get("data") or {}).get("nodes", [])
    if selected is None or len(supplied) != 1 or supplied[0].get("id") != node_id:
        raise ValidationError("调试节点不存在")
    if code_params is not None:
        selected.setdefault("data", {}).setdefault("nodeParam", {}).update(code_params)
        selected["data"]["inputs"] = supplied[0]["data"]["inputs"]
        selected["data"]["outputs"] = []
    inputs = {}
    for item in supplied[0].get("data", {}).get("inputs", []):
        value = item.get("schema", {}).get("value", {})
        if value.get("type") == "literal":
            inputs[item["name"]] = value.get("content")
    run = prepare_run(
        scope,
        workflow,
        inputs,
        kind="node-debug",
        graph={"nodes": [selected], "edges": []},
        version_id=version_id,
    )
    claim_run(run)
    return run


@api_endpoint(["POST"])
def node_debug(request, node_id):
    from asgiref.sync import async_to_sync

    return async_to_sync(_node_debug)(request, node_id)


@api_endpoint(["POST"])
def code_run(request):
    from asgiref.sync import async_to_sync

    from .execution_context import graph_nodes, graph_value, select_graph

    node_id = request.payload.get("node_id")
    scope = scope_for(request, EXECUTE)
    workflow = get_workflow(scope, request.payload.get("flow_id"), EXECUTE)
    requested_version = request.payload.get("version")
    graph, _ = select_graph(workflow, requested_version) if requested_version else (None, None)
    graph = graph or graph_value(workflow.data)
    node = next((item for item in graph_nodes(graph) if item.get("id") == node_id), None)
    if node is None or node_id.split("::")[0] != "ifly-code":
        raise Http404
    param = node.setdefault("data", {}).setdefault("nodeParam", {})
    param["code"] = request.payload.get("code", "")
    variables = request.payload.get("variables", [])
    if not isinstance(variables, list) or any(
        not isinstance(v, dict) or not isinstance(v.get("name"), str) for v in variables
    ):
        raise ValidationError("代码输入格式无效")
    values = {v["name"]: v.get("content") for v in variables}

    def input_type(value):
        if isinstance(value, list):
            return "array-" + (input_type(value[0]) if value else "string")
        return {bool: "boolean", int: "integer", float: "number", dict: "object"}.get(
            type(value), "string"
        )

    node["data"]["inputs"] = [
        {
            "name": name,
            "schema": {"type": input_type(value), "value": {"type": "literal", "content": value}},
        }
        for name, value in values.items()
    ]
    request.payload["flowId"] = workflow.flow_id
    request.payload["version"] = requested_version
    request.payload["data"] = {"nodes": [node], "edges": []}
    result = async_to_sync(_node_debug)(request, node_id, code_params={"code": param["code"]})
    if result.status_code != 200:
        return result
    data = json.loads(result.content)["data"]
    output = data.get("raw_output") or data.get("output", "")
    try:
        output = json.loads(output)
    except (TypeError, ValueError):
        pass
    return {"code": 0, "data": output, "message": "执行成功", "runId": data["runId"]}


async def _node_debug(request, node_id, code_params=None):
    import asyncio

    import httpx
    from asgiref.sync import sync_to_async
    from django.conf import settings

    from astron_console.accounts.http import response

    from .lifecycle import cancel_core, checkpoint, core_headers, core_payload

    run = await sync_to_async(prepare_node)(request, node_id, code_params)
    status, error = "failed", "node_debug_failed"

    async def heartbeat():
        while True:
            await asyncio.sleep(2)
            await sync_to_async(checkpoint)(run)

    heartbeat_task = asyncio.create_task(heartbeat())
    try:
        payload = await sync_to_async(core_payload)(run)
        async with httpx.AsyncClient(timeout=httpx.Timeout(600, connect=10)) as client:
            result = await client.post(
                settings.WORKFLOW_URL.rstrip("/") + f"/workflow/v1/console/node/{node_id}",
                json=payload,
                headers=core_headers(),
            )
            result.raise_for_status()
            value = result.json()
            if value.get("code") not in (0, "0"):
                raise ValueError("Core node failed")
        data = value.get("data") or {}
        run.events.append({"node_debug": data, "node_id": node_id})
        run.output = str(data.get("output", ""))
        status, error = "completed", ""
        return response({**data, "runId": run.pk})
    except asyncio.CancelledError:
        status, error = "interrupted", "client_disconnected"
        raise
    except Exception:
        return response(message="单节点执行失败，已保留实际输出", status=502)
    finally:
        heartbeat_task.cancel()
        await asyncio.gather(heartbeat_task, return_exceptions=True)
        if status != "completed":
            await asyncio.shield(sync_to_async(cancel_root)(run.context_id, status))
            await asyncio.shield(cancel_core(run))
        await asyncio.shield(sync_to_async(checkpoint)(run, status, error))
