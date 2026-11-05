"""Persistent invocation tree, fixed dependency snapshots and shared execution limits."""

import copy
from datetime import timedelta

from django.conf import settings
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.http import Http404
from django.utils import timezone

from astron_console.agents.definitions import resolve_version
from astron_console.agents.resource_resolution import reference, refs

from .authorization import EXECUTE, active_scope, get_workflow
from .models import ExecutionContext, WorkflowRun, WorkflowVersion

MAX_DEPTH = 12


def graph_nodes(graph):
    from .protocol import iter_nodes

    yield from iter_nodes(graph)


def graph_value(value):
    from .protocol import normalize_graph

    return normalize_graph(value)


def freeze_graph(scope, value):
    from astron_console.agents.resource_resolution import snapshot_references

    graph = graph_value(value)
    for node in graph_nodes(graph):
        param = node.get("data", {}).get("nodeParam") or {}
        if node.get("id", "").startswith("agent::") and not param.get("agentId"):
            config = snapshot_references(scope, inline_definition(node))
            plugin = param.setdefault("plugin", {})
            plugin["mcpServerIds"] = config["mcpServerIds"]
            plugin["mcpServerUrls"] = []
            plugin["tools"] = config["tools"]
            plugin["skills"] = config["skills"]
            plugin["knowledge"] = [{"repoId": value} for value in config["repoIds"]]
            plugin["workflowIds"] = config["workflows"]
    return graph


def workflow_reference(value):
    return reference(value, "flowId", "flow_id", "workflowId")


def inline_definition(node):
    param = (node.get("data") or {}).get("nodeParam") or {}
    plugin = param.get("plugin") or {}
    instruction = param.get("instruction") or {}
    return {
        "modelId": param.get("modelId"),
        "prompt": param.get("prompt") or instruction.get("reasoning") or "",
        "maxLoopCount": param.get("maxLoopCount", 5),
        "tools": plugin.get("tools", []),
        "mcpServerIds": plugin.get("mcpServerIds", []),
        "mcpServerUrls": plugin.get("mcpServerUrls", []),
        "skills": plugin.get("skills", []),
        "repoIds": [
            item.get("repoId", item.get("id")) if isinstance(item, dict) else item
            for item in plugin.get("knowledge", [])
        ],
        "workflows": plugin.get("workflowIds", []),
    }


def select_graph(workflow, version=None):
    if version is None:
        return graph_value(workflow.data), None
    row = (
        WorkflowVersion.objects.filter(
            flow_id=workflow.flow_id, version_num=str(version), is_deleted=0
        )
        .exclude(deleted=2)
        .first()
    )
    if row is None:
        raise ValidationError("工作流版本不存在，不会回退到最新版本")
    return graph_value(row.data), row.pk


def freeze_dependencies(scope, *, workflow=None, graph=None, agent_config=None, previous=None):
    snapshots = copy.deepcopy(previous or {"workflows": {}, "agents": {}})
    seen_flows, seen_agents = set(), set()

    def agent_dependencies(config):
        for value in refs(config.get("workflows")):
            visit_flow(get_workflow(scope, workflow_reference(value), EXECUTE))

    def visit_agent(agent_id):
        key = str(agent_id)
        if key in seen_agents:
            return
        seen_agents.add(key)
        fixed = snapshots["agents"].get(key)
        resolved = resolve_version(scope, agent_id, fixed["versionId"] if fixed else None)
        snapshots["agents"][key] = {
            "agentId": resolved["agentId"],
            "versionId": resolved["versionId"],
        }
        agent_dependencies(resolved["definition"])

    def visit_flow(row, selected=None):
        key = str(row.flow_id)
        if key in seen_flows:
            return
        if len(seen_flows) + len(seen_agents) >= 100:
            raise ValidationError("执行依赖超过100项")
        seen_flows.add(key)
        fixed = snapshots["workflows"].get(key)
        current = fixed["graph"] if fixed else freeze_graph(scope, selected or row.data)
        snapshots["workflows"].setdefault(key, {"graph": current, "version_id": None})
        for node in graph_nodes(current):
            param = (node.get("data") or {}).get("nodeParam") or {}
            kind = node.get("id", "").split("::")[0]
            if kind == "agent":
                if param.get("agentId"):
                    visit_agent(param["agentId"])
                else:
                    agent_dependencies(inline_definition(node))
            elif kind == "flow" and param.get("flowId"):
                visit_flow(get_workflow(scope, param["flowId"], EXECUTE))

    if workflow:
        visit_flow(workflow, graph)
    if agent_config:
        agent_dependencies(agent_config)
    return snapshots


def register_agent_root(run, agent, scope, config):
    snapshots = freeze_dependencies(scope, agent_config=config)
    context = ExecutionContext.objects.create(
        id=run.pk,
        uid=scope.uid,
        space_id=scope.space_id,
        agent_run_id=run.pk,
        agent_id=agent.pk,
        snapshots=snapshots,
        call_chain=[f"agent:{agent.pk}"],
        deadline=timezone.now() + timedelta(seconds=settings.AGENT_TIMEOUT_SECONDS),
    )
    return {"run_id": run.pk, "root_id": context.pk}


def checked_root(root_id, *, lock=False):
    query = ExecutionContext.objects.select_for_update() if lock else ExecutionContext.objects
    root = query.filter(pk=str(root_id)).first()
    if root is None:
        raise PermissionDenied
    if root.cancel_requested or root.status != "active" or root.deadline <= timezone.now():
        raise ValidationError("调用已取消、结束或超时")
    active_scope(root.uid, root.space_id)
    from astron_console.publishing.runtime_authorization import check_root

    check_root(root)
    if root.agent_run_id:
        from astron_console.agents.models import AgentRun

        parent = AgentRun.objects.filter(pk=root.agent_run_id, status="running").first()
        if not parent or parent.cancel_requested:
            raise ValidationError("上游Agent已结束或取消")
    return root


def spend(root):
    if root.remaining_budget < 1:
        raise ValidationError("执行总调用预算已耗尽")
    root.remaining_budget -= 1
    root.update_time = timezone.now()
    root.save(update_fields=["remaining_budget", "update_time"])


def extend_chain(chain, subject):
    if subject in chain:
        raise ValidationError("检测到循环引用，已拒绝重复执行")
    if len(chain) >= MAX_DEPTH:
        raise ValidationError("执行调用深度超过限制")
    return [*chain, subject]


def runtime_identity(context):
    if not isinstance(context, dict):
        raise PermissionDenied
    root = checked_root(context.get("root_id"))
    scope = active_scope(root.uid, root.space_id)
    run = WorkflowRun.objects.filter(pk=str(context.get("run_id")), context_id=root.pk).first()
    if run:
        if run.status not in {"running", "resuming"}:
            raise ValidationError("上游工作流已结束")
        get_workflow(scope, run.workflow_id, EXECUTE)
        node = next(
            (n for n in graph_nodes(run.graph) if n.get("id") == context.get("node_id")), None
        )
        if node is None:
            raise PermissionDenied
        param = node.get("data", {}).get("nodeParam") or {}
        kind = node["id"].split("::")[0]
        if kind == "flow":
            allowed = [param.get("flowId")]
            chain = run.call_chain
        elif kind == "agent":
            fixed = run.resolved_agents.get(node["id"])
            if fixed:
                resolved = resolve_version(scope, fixed["agentId"], fixed["versionId"])
                config = resolved["definition"]
                chain = extend_chain(run.call_chain, f"agent:{fixed['agentId']}")
            else:
                config = inline_definition(node)
                chain = extend_chain(run.call_chain, f"inline:{run.workflow_id}:{node['id']}")
            allowed = refs(config.get("workflows"))
        else:
            raise PermissionDenied
    elif root.agent_run_id == str(context.get("run_id")):
        from astron_console.agents.definitions import get_scoped_agent
        from astron_console.agents.models import AgentRun
        from astron_console.agents.resource_resolution import resolve_resources

        parent = AgentRun.objects.get(pk=root.agent_run_id)
        get_scoped_agent(scope, root.agent_id)
        resolve_resources(scope, parent.definition)
        allowed = refs(parent.definition.get("workflows"))
        chain = root.call_chain
    else:
        raise PermissionDenied
    return root, scope, run, chain, {workflow_reference(x) for x in allowed if x is not None}


def cancel_root(root_id, status="cancelled"):
    now = timezone.now()
    with transaction.atomic():
        root = ExecutionContext.objects.select_for_update().filter(pk=root_id).first()
        if root is None or root.status != "active":
            return
        root.cancel_requested = True
        root.status = status
        root.update_time = now
        root.save(update_fields=["cancel_requested", "status", "update_time"])
        WorkflowRun.objects.filter(context_id=root.pk).exclude(
            status__in=["completed", "failed", "cancelled", "interrupted"]
        ).update(cancel_requested=True, status=status, error=status, update_time=now)
        if root.agent_run_id:
            from astron_console.agents.models import AgentRun

            AgentRun.objects.filter(pk=root.agent_run_id, status="running").update(
                cancel_requested=True
            )


def control_state(run_id, root_id):
    root = ExecutionContext.objects.filter(pk=str(root_id)).first()
    if root is None:
        raise Http404
    run = WorkflowRun.objects.filter(pk=str(run_id), context_id=root.pk).first()
    if str(run_id) != root.agent_run_id and run is None:
        raise PermissionDenied
    cancelled = root.cancel_requested or root.status != "active" or root.deadline <= timezone.now()
    try:
        if not cancelled:
            checked_root(root.pk)
            scope = active_scope(root.uid, root.space_id)
            if run:
                if run.cancel_requested or run.status in {"cancelled", "failed", "interrupted"}:
                    cancelled = True
                get_workflow(scope, run.workflow_id, EXECUTE)
            elif root.agent_id:
                from astron_console.agents.definitions import get_scoped_agent

                get_scoped_agent(scope, root.agent_id)
    except (PermissionDenied, ValidationError, Http404):
        cancelled = True
    if cancelled and root.status == "active":
        cancel_root(root.pk)
    # Explicit timezone avoids interpreting naive local DB timestamps as host UTC.
    from zoneinfo import ZoneInfo

    if root.deadline.tzinfo is None:
        deadline = root.deadline.replace(tzinfo=ZoneInfo(settings.TIME_ZONE)).timestamp()
    else:
        deadline = root.deadline.timestamp()
    return {"cancelled": cancelled, "deadline": deadline}
