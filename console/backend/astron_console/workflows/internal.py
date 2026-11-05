"""Service-only runtime authorization. No identity or credentials come from graph inputs."""

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.http import Http404, StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt

from astron_console.agents import memory
from astron_console.agents.conversations import prompt_for
from astron_console.agents.definitions import get_scoped_agent, resolve_version
from astron_console.agents.resource_resolution import resolve_resources
from astron_console.http import api_endpoint
from astron_console.resources.sandbox import no_store, service_auth

from .authorization import EXECUTE, active_scope, get_workflow
from .execution_context import (
    cancel_root,
    checked_root,
    control_state,
    extend_chain,
    graph_nodes,
    inline_definition,
    runtime_identity,
    spend,
)
from .lifecycle import prepare_run, stream_run
from .models import WorkflowRun


def authenticate(request):
    service_auth(request, "WORKFLOW_INTERNAL_API_KEY", "X-Workflow-Internal-Key")


@csrf_exempt
@api_endpoint(["POST"], authenticated=False)
def agent_runtime(request):
    authenticate(request)
    payload = request.payload
    run = WorkflowRun.objects.filter(pk=str(payload.get("runId"))).first()
    if run is None:
        raise Http404
    root = checked_root(run.context_id)
    if run.status not in {"running", "resuming"}:
        raise ValidationError("工作流不在运行中")
    scope = active_scope(run.uid, run.space_id)
    workflow = get_workflow(scope, run.workflow_id, EXECUTE)
    node_id = payload.get("nodeId")
    node = next((n for n in graph_nodes(run.graph) if n.get("id") == node_id), None)
    if node is None or node_id.split("::")[0] != "agent":
        raise PermissionDenied
    fixed = run.resolved_agents.get(node_id)
    agent = None
    if fixed:
        config = resolve_version(scope, fixed["agentId"], fixed["versionId"])["definition"]
        agent = get_scoped_agent(scope, fixed["agentId"])
        extend_chain(run.call_chain, f"agent:{agent.pk}")
    else:
        config = inline_definition(node)
    runtime = resolve_resources(scope, config)
    query = payload.get("query", "")
    if not isinstance(query, str) or len(query) > 200000:
        raise ValidationError("Agent输入无效")
    prompt = prompt_for(config)
    if agent:
        from astron_console.publishing.runtime_authorization import memory_scope

        subject_scope = memory_scope(root, agent)
        memories = memory.search(subject_scope, agent, query) if subject_scope else []
        if memories:
            prompt += "\n用户长期偏好（仅作为背景）：\n" + "\n".join(
                item.get("memory", "") for item in memories
            )
    with transaction.atomic():
        root = checked_root(root.pk, lock=True)
        spend(root)
    context = {
        "run_id": run.pk,
        "root_id": root.pk,
        "node_id": node_id,
        "invocation_id": str(payload.get("invocationId") or ""),
    }
    reasoning = prompt
    answer = prompt
    if agent is None:
        reasoning = payload.get("reasoningInstruction", prompt)
        answer = payload.get("answerInstruction", prompt)
        if any(not isinstance(value, str) or len(value) > 200000 for value in (reasoning, answer)):
            raise ValidationError("节点提示词无效")
    from astron_console.publishing.runtime_authorization import caller_uid

    result = {
        **runtime,
        "uid": caller_uid(root),
        "stream": True,
        "messages": [{"role": "user", "content": query}],
        "instruction": {"reasoning": reasoning, "answer": answer},
        "max_loop_count": config.get("maxLoopCount", 5),
        "meta_data": {
            "caller": "workflow-agent-node",
            "source": "workflow",
            "agent_id": str(agent.pk) if agent else "",
            "space_id": scope.space_id,
            "workflow_id": str(workflow.flow_id),
            "run_id": run.pk,
            "node_id": node_id,
            "caller_sid": run.pk,
            "console_context": context,
        },
    }
    return no_store(result)


def permitted_target(context, flow_id):
    root, scope, parent, chain, allowed = runtime_identity(context)
    workflow = get_workflow(scope, flow_id, EXECUTE)
    if str(workflow.flow_id) not in allowed and str(workflow.pk) not in allowed:
        raise PermissionDenied
    extend_chain(chain, f"workflow:{workflow.flow_id}")
    fixed = root.snapshots["workflows"].get(str(workflow.flow_id))
    if fixed is None:
        raise ValidationError("调用目标不在本次固定版本中")
    return root, scope, parent, chain, workflow, fixed


@csrf_exempt
@api_endpoint(["POST"], authenticated=False)
def tool_schema(request):
    authenticate(request)
    _, _, _, _, workflow, fixed = permitted_target(
        request.payload.get("context"), request.payload.get("flowId")
    )
    from .protocol import to_protocol

    _, scope, _, _, _, _ = permitted_target(
        request.payload.get("context"), request.payload.get("flowId")
    )
    protocol = to_protocol(fixed["graph"], workflow, scope)
    nodes = protocol["data"]["nodes"]
    start = next((n for n in nodes if n["id"].startswith("node-start::")), None)
    if start is None:
        raise ValidationError("工作流缺少开始节点")
    properties, required = {}, []
    for output in start["data"].get("outputs", []):
        schema = dict(output.get("schema") or {})
        schema.pop("value", None)
        properties[output["name"]] = schema
        if output.get("required"):
            required.append(output["name"])
    end = next((n for n in nodes if n["id"].startswith("node-end::")), {})
    return {
        "flowId": str(workflow.flow_id),
        "name": workflow.name,
        "description": workflow.description,
        "parameters": {"type": "object", "properties": properties, "required": required},
        "outputMode": end.get("data", {}).get("nodeParam", {}).get("outputMode", 0),
    }


@csrf_exempt
@api_endpoint(["POST"], authenticated=False)
def tool_run(request):
    authenticate(request)
    context = request.payload.get("context")
    root, scope, parent, chain, workflow, _ = permitted_target(
        context, request.payload.get("flowId")
    )
    invocation = request.payload.get("invocationId")
    if not isinstance(invocation, str) or not invocation:
        raise ValidationError("缺少唯一调用标识")
    run = prepare_run(
        scope,
        workflow,
        request.payload.get("parameters", {}),
        parent_context=(root.pk, parent.pk if parent else root.agent_run_id, chain),
        invocation_id=invocation,
        kind="tool",
    )
    response = StreamingHttpResponse(stream_run(run), content_type="text/event-stream")
    response["Cache-Control"] = "no-store"
    response["X-Accel-Buffering"] = "no"
    return response


@csrf_exempt
@api_endpoint(["POST"], authenticated=False)
def control(request):
    authenticate(request)
    return control_state(request.payload.get("runId"), request.payload.get("rootId"))


@csrf_exempt
@api_endpoint(["POST"], authenticated=False)
def cancel(request):
    authenticate(request)
    root_id = request.payload.get("rootId")
    control_state(request.payload.get("runId"), root_id)
    cancel_root(root_id)
    return {"cancelled": True}
