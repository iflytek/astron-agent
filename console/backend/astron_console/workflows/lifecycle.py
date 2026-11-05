"""Control-plane lifecycle. DAG execution stays in core/workflow."""

import asyncio
import hashlib
import json
import logging
from contextlib import suppress
from datetime import timedelta

import httpx
from asgiref.sync import sync_to_async
from django.conf import settings
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.utils import timezone

from astron_console.agents.definitions import resolve_version
from astron_console.agents.resource_resolution import resolve_resources

from .authorization import EXECUTE, active_scope, get_workflow
from .execution_context import (
    cancel_root,
    checked_root,
    control_state,
    extend_chain,
    freeze_dependencies,
    freeze_graph,
    graph_nodes,
    inline_definition,
    spend,
)
from .models import ExecutionContext, WorkflowRun

logger = logging.getLogger(__name__)
TERMINAL = {"completed", "failed", "cancelled", "interrupted"}


def validate_bindings(scope, graph, snapshots):
    bindings = {}
    for node in graph_nodes(graph):
        param = node.get("data", {}).get("nodeParam") or {}
        if node.get("id", "").split("::")[0] == "agent":
            if param.get("agentId"):
                fixed = snapshots["agents"].get(str(param["agentId"]))
                if fixed is None:
                    raise ValidationError("运行快照缺少Agent版本")
                config = resolve_version(scope, fixed["agentId"], fixed["versionId"])["definition"]
                bindings[node["id"]] = fixed
            else:
                config = inline_definition(node)
            resolve_resources(scope, config)
    return bindings


def prepare_run(
    scope,
    workflow,
    inputs,
    *,
    retry_of=None,
    parent_context=None,
    invocation_id=None,
    graph=None,
    kind="workflow",
    version_id=None,
):
    scope = active_scope(scope.uid, scope.space_id)
    workflow = get_workflow(scope, workflow.flow_id, EXECUTE)
    if not isinstance(inputs, dict) or len(json.dumps(inputs)) > 200000:
        raise ValidationError("输入必须为有效对象且不超过200KB")
    if retry_of:
        if retry_of.status not in TERMINAL or retry_of.workflow_id != workflow.pk:
            raise ValidationError("只能重试本工作流已结束的运行")
        if retry_of.uid != scope.uid or retry_of.space_id != scope.space_id:
            raise PermissionDenied
        graph, inputs, version_id = retry_of.graph, retry_of.inputs, retry_of.version_id
        old_root = ExecutionContext.objects.get(pk=retry_of.context_id)
        previous = old_root.snapshots
    else:
        previous = None
    if parent_context:
        root_id, parent_id, chain = parent_context
        root = checked_root(root_id)
        fixed = root.snapshots["workflows"].get(str(workflow.flow_id))
        if fixed is None:
            raise ValidationError("目标工作流不在本次固定依赖中")
        graph, version_id = fixed["graph"], fixed.get("version_id")
        snapshots = root.snapshots
        chain = extend_chain(chain, f"workflow:{workflow.flow_id}")
    else:
        if not retry_of:
            graph = freeze_graph(scope, graph if graph is not None else workflow.data)
        snapshots = freeze_dependencies(scope, workflow=workflow, graph=graph, previous=previous)
        snapshots["workflows"][str(workflow.flow_id)]["version_id"] = version_id
        chain = [f"workflow:{workflow.flow_id}"]
        parent_id = None
    bindings = validate_bindings(scope, graph, snapshots)
    # Conversion also resolves non-Agent resources under the actual caller's scope.
    from .protocol import to_protocol

    to_protocol(graph, workflow, scope)
    with transaction.atomic():
        if parent_context:
            root = checked_root(root_id, lock=True)
            if root.uid != scope.uid or root.space_id != scope.space_id:
                raise PermissionDenied
            spend(root)
        else:
            root = ExecutionContext.objects.create(
                uid=scope.uid,
                space_id=scope.space_id,
                snapshots=snapshots,
                call_chain=chain,
                deadline=timezone.now() + timedelta(seconds=settings.WORKFLOW_TIMEOUT_SECONDS),
            )
        invocation = None
        if invocation_id:
            if not isinstance(invocation_id, str) or len(invocation_id) > 128:
                raise ValidationError("调用标识无效")
            invocation = hashlib.sha256(f"{parent_id}:{invocation_id}".encode()).hexdigest()
            if WorkflowRun.objects.filter(invocation_id=invocation).exists():
                raise ValidationError("该调用已登记，禁止重复执行副作用")
        run = WorkflowRun.objects.create(
            workflow_id=workflow.pk,
            uid=scope.uid,
            space_id=scope.space_id,
            kind=kind,
            graph=graph,
            inputs=inputs,
            resolved_agents=bindings,
            context_id=root.pk,
            parent_run_id=parent_id,
            retry_of=retry_of.pk if retry_of else None,
            call_chain=chain,
            invocation_id=invocation,
            version_id=version_id,
        )
        run.chat_id = run.pk
        run.event_id = run.pk
        run.save(update_fields=["chat_id", "event_id"])
    logger.info(
        "Workflow prepared run=%s flow=%s root=%s kind=%s", run.pk, workflow.flow_id, root.pk, kind
    )
    return run


def reauthorize(run):
    scope = active_scope(run.uid, run.space_id)
    workflow = get_workflow(scope, run.workflow_id, EXECUTE)
    root = checked_root(run.context_id)
    validate_bindings(scope, run.graph, root.snapshots)
    return scope, workflow


def run_data(run):
    return {
        "runId": run.pk,
        "id": run.pk,
        "eventId": run.event_id,
        "status": run.status,
        "resolvedAgents": run.resolved_agents,
        "output": run.output,
        "error": run.error,
        "retryOf": run.retry_of,
        "createTime": run.create_time.isoformat(),
    }


def sse(data, event=None):
    prefix = f"event: {event}\n" if event else ""
    return prefix + "data: " + json.dumps(data, ensure_ascii=False, default=str) + "\n\n"


def core_headers():
    if not settings.WORKFLOW_INTERNAL_API_KEY:
        raise ValidationError("工作流内部身份未配置")
    return {
        "X-Workflow-Internal-Key": settings.WORKFLOW_INTERNAL_API_KEY,
        "X-Consumer-Username": settings.MAAS_APP_ID,
    }


def core_payload(run):
    scope, workflow = reauthorize(run)
    from .protocol import to_protocol

    protocol = to_protocol(run.graph, workflow, scope)
    return {
        "protocol": protocol,
        "chat": {
            "flow_id": str(workflow.flow_id),
            "uid": scope.uid,
            "stream": True,
            "parameters": run.inputs,
            "chat_id": run.chat_id,
            "history": [],
            "ext": {"console_context": {"run_id": run.pk, "root_id": run.context_id}},
        },
    }


async def upstream(path, payload):
    async with httpx.AsyncClient(timeout=httpx.Timeout(120, connect=10)) as client:
        async with client.stream(
            "POST", settings.WORKFLOW_URL.rstrip("/") + path, json=payload, headers=core_headers()
        ) as response:
            response.raise_for_status()
            if "text/event-stream" not in response.headers.get("content-type", ""):
                raise ValueError("工作流返回非事件流")
            parts = []
            async for line in response.aiter_lines():
                if line.startswith("data:"):
                    parts.append(line[5:].lstrip())
                elif not line and parts:
                    yield "\n".join(parts)
                    parts = []
            if parts:
                yield "\n".join(parts)


async def cancel_core(run):
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                settings.WORKFLOW_URL.rstrip("/")
                + f"/workflow/v1/console/events/{run.event_id}/cancel",
                json={"run_id": run.pk, "root_id": run.context_id},
                headers=core_headers(),
            )
            response.raise_for_status()
    except Exception as exc:
        logger.warning("Core cancel delivery failed run=%s type=%s", run.pk, type(exc).__name__)


def checkpoint(run, status=None, error=""):
    now = timezone.now()
    values = {
        "events": run.events,
        "output": run.output,
        "event_id": run.event_id,
        "update_time": now,
        "heartbeat": now,
    }
    if status:
        values.update(status=status, error=error)
    # Cancellation is authoritative and cannot be overwritten by a late success frame.
    changed = WorkflowRun.objects.filter(pk=run.pk, status__in=["running", "resuming"]).update(
        **values
    )
    if not changed:
        WorkflowRun.objects.filter(pk=run.pk).update(
            events=run.events, output=run.output, event_id=run.event_id
        )
        run.refresh_from_db(fields=["status", "error"])
    elif status:
        run.status, run.error = status, error
    if status in TERMINAL and not run.parent_run_id:
        ExecutionContext.objects.filter(pk=run.context_id, status="active").update(status=status)


def claim_run(run, resume=False):
    with transaction.atomic():
        row = WorkflowRun.objects.select_for_update().get(pk=run.pk)
        expected = "paused" if resume else "pending"
        if row.status != expected:
            raise ValidationError("运行已被处理或不可恢复")
        reauthorize(row)
        row.status = "resuming" if resume else "running"
        row.heartbeat = timezone.now()
        row.save(update_fields=["status", "heartbeat"])
        run.status = row.status


def reconcile(run):
    root = ExecutionContext.objects.filter(pk=run.context_id).first()
    stale = run.status in {"running", "resuming"} and (
        timezone.now() - run.heartbeat > timedelta(seconds=45)
    )
    expired = root is not None and root.deadline <= timezone.now()
    if run.status not in TERMINAL and (stale or expired):
        cancel_root(run.context_id, "interrupted")
        run.refresh_from_db()
    return run


async def stream_run(run, *, resume_content=None):
    status, error = "interrupted", "upstream_disconnected"
    source = task = None
    paused = stopped = False
    loop = asyncio.get_running_loop()
    saved = sent = loop.time()
    try:
        if run.status not in {"running", "resuming"}:
            await sync_to_async(claim_run)(run, resume=resume_content is not None)
        yield sse(run_data(run), "run")
        if resume_content is None:
            payload = await sync_to_async(core_payload)(run)
            path = "/workflow/v1/console/run"
        else:
            await sync_to_async(reauthorize)(run)
            path = "/workflow/v1/debug/resume"
            payload = {"event_id": run.event_id, "event_type": "resume", "content": resume_content}
        source = upstream(path, payload)
        while True:
            control = await sync_to_async(control_state)(run.pk, run.context_id)
            if control["cancelled"]:
                status, error = "cancelled", "cancelled"
                break
            if task is None:
                task = asyncio.create_task(anext(source))
            ready, _ = await asyncio.wait({task}, timeout=0.25)
            if loop.time() - saved >= 2:
                await sync_to_async(checkpoint)(run)
                saved = loop.time()
            if loop.time() - sent >= 10:
                yield ": keepalive\n\n"
                sent = loop.time()
            if not ready:
                continue
            try:
                raw = task.result()
            except StopAsyncIteration:
                break
            finally:
                task = None
            if raw == "[DONE]":
                break
            chunk = json.loads(raw)
            if not isinstance(chunk, dict):
                raise ValueError("Invalid workflow event")
            # Runtime events contain outputs, never request model credentials/config.
            run.events.append(chunk)
            if len(run.events) > 20000 or len(json.dumps(run.events)) > 8000000:
                raise ValueError("Workflow trace limit exceeded")
            if chunk.get("code") not in (None, 0, "0"):
                status, error = "failed", f"core_error:{chunk['code']}"
            event = chunk.get("event_data") or {}
            if event.get("event_id"):
                run.event_id = str(event["event_id"])
            for choice in chunk.get("choices") or []:
                delta = choice.get("delta") or {}
                content = delta.get("content") or ""
                if not isinstance(content, str):
                    raise ValueError("Invalid content")
                run.output += content
                reason = choice.get("finish_reason")
                paused = paused or reason == "interrupt"
                # Only workflow terminal frame, not a node stop, completes the run.
                stopped = stopped or (
                    reason == "stop"
                    and ((chunk.get("workflow_step") or {}).get("node") or {}).get("id")
                    in (None, "flow_obj")
                )
            if stopped and status != "failed":
                status, error = "completed", ""
                await sync_to_async(checkpoint)(run, status, error)
            if paused and status != "failed":
                status, error = "paused", ""
                await sync_to_async(checkpoint)(run, status, error)
            yield sse(chunk)
            sent = loop.time()
            if status in {"failed", "completed"}:
                break
            if paused:
                status, error = "paused", ""
                break
        if status not in {"failed", "cancelled", "paused"}:
            status, error = ("completed", "") if stopped else ("interrupted", error)
    except (asyncio.CancelledError, GeneratorExit):
        if status not in {"completed", "paused"}:
            status, error = "interrupted", "client_disconnected"
        raise
    except Exception as exc:
        status, error = "failed", type(exc).__name__
        logger.warning("Workflow failed run=%s error_type=%s", run.pk, error)
        yield sse({"code": 500, "message": "工作流执行失败，已保留实际输出", "choices": []})
    finally:
        if task:
            task.cancel()
            with suppress(asyncio.CancelledError, Exception):
                await task
        if source:
            with suppress(Exception):
                await source.aclose()
        if status not in {"completed", "paused"}:
            await asyncio.shield(sync_to_async(cancel_root)(run.context_id, status))
            await asyncio.shield(cancel_core(run))
        await asyncio.shield(sync_to_async(checkpoint)(run, status, error))
        logger.info("Workflow ended run=%s root=%s status=%s", run.pk, run.context_id, run.status)
    yield sse({"runId": run.pk, "status": run.status, "error": run.error}, "run-end")
