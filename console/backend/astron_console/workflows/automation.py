"""Durable database claims for the existing workflow automation schedule."""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from croniter import CroniterBadCronError, CroniterBadDateError, croniter
from django.conf import settings
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.http import Http404
from django.utils import timezone

from astron_console.http import api_endpoint
from astron_console.resources.common import number, page, parsed, scope_for, serialize, text
from astron_console.spaces.permissions import require_resource_access, scope_queryset

from .authorization import EXECUTE, active_scope, get_workflow
from .management_views import get_version
from .models import AutomationRun, AutomationTask, WorkflowRun

logger = logging.getLogger(__name__)
READ = "WorkflowAutomationController_page_GET"
WRITE = "WorkflowAutomationController_update_PUT"
CREATE = "WorkflowAutomationController_create_POST"


def schedule(expression, zone, start=None):
    if not isinstance(expression, str) or len(expression) > 128 or len(expression.split()) != 6:
        raise ValidationError("Cron必须为秒、分、时、日、月、星期六字段表达式")
    try:
        tz = ZoneInfo(zone)
        # Spring uses intersection of restricted day fields and seconds first.
        # No custom scheduler/parser: croniter owns expression and DST semantics.
        base = start or timezone.now()
        if timezone.is_naive(base):
            base = timezone.make_aware(base, ZoneInfo(settings.TIME_ZONE))
        return croniter(
            expression,
            base.astimezone(tz),
            second_at_beginning=True,
            day_or=False,
            max_years_between_matches=8,
        )
    except (CroniterBadCronError, ZoneInfoNotFoundError, TypeError, ValueError) as exc:
        raise ValidationError("Cron或时区无效/不支持") from exc


def next_fire(expression, zone, start=None):
    try:
        result = schedule(expression, zone, start).get_next(datetime)
        if not settings.USE_TZ and (start is None or timezone.is_naive(start)):
            return timezone.make_naive(result, ZoneInfo(settings.TIME_ZONE))
        return result
    except CroniterBadDateError as exc:
        raise ValidationError("Cron在未来8年内没有触发时间") from exc


def task_access(scope, task_id, permission=READ):
    task = AutomationTask.objects.filter(pk=number(task_id), deleted=False).first()
    if task is None:
        raise Http404
    require_resource_access(
        scope, owner_uid=task.uid, space_id=task.space_id, permission_key=permission
    )
    return task


def apply(task, payload, scope):
    workflow = get_workflow(scope, payload.get("flowId"), EXECUTE)
    version = get_version(workflow, payload.get("version"))
    params = parsed(payload.get("inputParams"))
    if not isinstance(params, dict):
        raise ValidationError("自动化输入必须为JSON对象")
    task.task_name = text(payload, "taskName", required=True, limit=128)
    task.flow_id, task.workflow_name, task.version = (
        workflow.flow_id,
        workflow.name,
        version.version_num,
    )
    task.cron_expression = text(payload, "cronExpression", required=True, limit=128)
    task.timezone = text(payload, "timezone", limit=64) or "Asia/Shanghai"
    task.next_fire_time = next_fire(task.cron_expression, task.timezone)
    task.input_params = json.dumps(params, ensure_ascii=False)
    task.enabled = payload.get("enabled", True)
    if not isinstance(task.enabled, bool):
        raise ValidationError("enabled必须为布尔值")
    task.schedule_type = text(payload, "scheduleType", limit=32) or "CUSTOM"
    task.update_time = timezone.now()
    task.save()
    return task


@api_endpoint(["GET"])
def listing(request):
    scope = scope_for(request, READ)
    payload = request.GET.dict()
    payload["page"] = payload.get("current", payload.get("page", 1))
    query = scope_queryset(AutomationTask.objects.filter(deleted=False), scope)
    if payload.get("search"):
        query = query.filter(task_name__icontains=text(payload, "search", limit=128))
    if payload.get("enabled") in {"true", "false"}:
        query = query.filter(enabled=payload["enabled"] == "true")
    result = page(query.order_by("-id"), payload)
    result.update(page=result["current"], pageSize=result["size"], totalPages=result["pages"])
    return result


@api_endpoint(["POST", "PUT", "DELETE"])
@transaction.atomic
def item(request, task_id=None):
    permission = (
        CREATE
        if task_id is None
        else ("WorkflowAutomationController_delete_DELETE" if request.method == "DELETE" else WRITE)
    )
    scope = scope_for(request, permission)
    if task_id is None:
        task = AutomationTask(uid=scope.uid, space_id=scope.space_id)
    else:
        task = task_access(scope, task_id, permission)
        task = AutomationTask.objects.select_for_update().get(pk=task.pk)
    if request.method == "DELETE":
        task.deleted = True
        task.enabled = False
        task.save(update_fields=["deleted", "enabled"])
        return True
    return serialize(apply(task, request.payload, scope))


@api_endpoint(["POST"])
@transaction.atomic
def enable(request, task_id):
    permission = "WorkflowAutomationController_enable_POST"
    scope = scope_for(request, permission)
    task = task_access(scope, task_id, permission)
    enabled = request.payload.get("enabled")
    if not isinstance(enabled, bool):
        raise ValidationError("enabled必须为布尔值")
    task = AutomationTask.objects.select_for_update().get(pk=task.pk)
    if enabled:
        workflow = get_workflow(scope, task.flow_id, EXECUTE)
        get_version(workflow, task.version)
        task.next_fire_time = next_fire(task.cron_expression, task.timezone)
    task.enabled = enabled
    task.save(update_fields=["enabled", "next_fire_time"])
    return serialize(task)


@api_endpoint(["GET"])
def runs(request, task_id):
    permission = "WorkflowAutomationController_runs_GET"
    scope = scope_for(request, permission)
    task = task_access(scope, task_id, permission)
    payload = request.GET.dict()
    payload["page"] = payload.get("current", payload.get("page", 1))
    result = page(AutomationRun.objects.filter(task_id=task.pk).order_by("-id"), payload)
    result.update(page=result["current"], pageSize=result["size"], totalPages=result["pages"])
    return result


@api_endpoint(["POST"])
def preview(request):
    scope_for(request, "WorkflowAutomationController_cronPreview_POST")
    iterator = schedule(
        request.payload.get("cronExpression"), request.payload.get("timezone", "Asia/Shanghai")
    )
    try:
        return [iterator.get_next(datetime).isoformat() for _ in range(5)]
    except CroniterBadDateError as exc:
        raise ValidationError("Cron没有可用触发时间") from exc


def enqueue(task, kind, fire):
    """Caller holds the task row lock. Old trigger rows remain untouched."""
    if AutomationRun.objects.filter(task_id=task.pk, status="RUNNING").exists():
        if kind == "MANUAL":
            raise ValidationError("此任务已有执行中的运行")
        status, error = "SKIPPED", "上次执行尚未结束"
    else:
        status, error = "RUNNING", None
    trigger_key = f"{task.pk}:{fire.isoformat()}" if kind == "SCHEDULE" else None
    if trigger_key and AutomationRun.objects.filter(trigger_key=trigger_key).exists():
        return None
    run = AutomationRun.objects.create(
        task_id=task.pk,
        flow_id=task.flow_id,
        uid=task.uid,
        space_id=task.space_id,
        trigger_type=kind,
        scheduled_fire_time=fire,
        trigger_key=trigger_key,
        status=status,
        error_message=error,
        request_params=task.input_params,
        version=task.version,
    )
    if kind == "SCHEDULE":
        # Skip missed slots instead of replaying a burst of side effects after a restart.
        task.next_fire_time = next_fire(
            task.cron_expression, task.timezone, max(fire, timezone.now())
        )
        task.save(update_fields=["next_fire_time"])
    return run


@api_endpoint(["POST"])
@transaction.atomic
def run_now(request, task_id):
    scope = scope_for(request, "WorkflowAutomationController_runNow_POST")
    task = task_access(scope, task_id, "WorkflowAutomationController_runNow_POST")
    workflow = get_workflow(scope, task.flow_id, EXECUTE)
    get_version(workflow, task.version)
    task = AutomationTask.objects.select_for_update().get(pk=task.pk)
    return serialize(enqueue(task, "MANUAL", timezone.now()))


def claim_due(now=None):
    now = now or timezone.now()
    ids = list(
        AutomationTask.objects.filter(deleted=False, enabled=True, next_fire_time__lte=now)
        .order_by("next_fire_time")
        .values_list("id", flat=True)[:50]
    )
    count = 0
    for task_id in ids:
        with transaction.atomic():
            task = AutomationTask.objects.select_for_update().get(pk=task_id)
            if (
                task.deleted
                or not task.enabled
                or task.next_fire_time is None
                or task.next_fire_time > now
            ):
                continue
            try:
                enqueue(task, "SCHEDULE", task.next_fire_time)
                count += 1
            except ValidationError:
                # Retain unsupported legacy cron unchanged and expose the failure to its owner.
                task.enabled = False
                task.last_run_status = "FAILED"
                task.last_run_message = "定时表达式无法解析，请编辑任务后重新启用"
                task.save(update_fields=["enabled", "last_run_status", "last_run_message"])
    return count


def claim_pending():
    ids = (
        AutomationRun.objects.filter(status="RUNNING", start_time__isnull=True)
        .order_by("id")
        .values_list("id", flat=True)[:50]
    )
    for record_id in ids:
        with transaction.atomic():
            row = AutomationRun.objects.select_for_update().get(pk=record_id)
            if row.status != "RUNNING" or row.start_time is not None:
                continue
            row.start_time = timezone.now()
            row.save(update_fields=["start_time"])
            return row.pk
    return None


def execute_claim(record_id):
    from .execution_context import cancel_root
    from .lifecycle import prepare_run, stream_run

    record = AutomationRun.objects.get(pk=record_id)
    task = AutomationTask.objects.get(pk=record.task_id)
    execution = None
    error, status, summary = "", "FAILED", ""
    try:
        if task.deleted:
            raise ValidationError("任务已删除")
        scope = active_scope(record.uid, record.space_id)
        workflow = get_workflow(scope, record.flow_id, EXECUTE)
        version = get_version(workflow, record.version)
        execution = prepare_run(
            scope,
            workflow,
            parsed(record.request_params),
            graph=parsed(version.data),
            version_id=version.pk,
            kind="automation",
        )
        record.execution_id = execution.pk
        record.save(update_fields=["execution_id"])

        async def consume():
            async for _ in stream_run(execution):
                pass

        asyncio.run(consume())
        execution.refresh_from_db()
        if execution.status == "completed":
            status, summary = "SUCCESS", execution.output[:4000]
        else:
            error = execution.error or "自动化运行未正常完成"
            if execution.status == "paused":
                cancel_root(execution.context_id)
                error = "自动化运行需要用户输入，已停止；请在画布运行交互式工作流"
    except (ValidationError, Http404, PermissionDenied) as exc:
        error = "；".join(getattr(exc, "messages", [str(exc)]))[:512]
    except Exception as exc:
        logger.warning(
            "Workflow automation failed task_id=%s run_id=%s type=%s",
            task.pk,
            record.pk,
            type(exc).__name__,
        )
        error = "执行失败，请检查当前用户权限、版本和服务状态"
    if (
        execution
        and status != "SUCCESS"
        and execution.status not in {"completed", "failed", "cancelled", "interrupted"}
    ):
        cancel_root(execution.context_id)
    now = timezone.now()
    AutomationRun.objects.filter(pk=record.pk, status="RUNNING").update(
        status=status,
        end_time=now,
        error_message=error,
        response_summary=summary,
        duration_ms=max(0, int((now - record.start_time).total_seconds() * 1000)),
    )
    AutomationTask.objects.filter(pk=task.pk).update(
        last_run_time=now,
        last_run_status=status,
        last_run_message=error or "执行完成",
    )
    logger.info(
        "Workflow automation finished task_id=%s run_id=%s status=%s", task.pk, record.pk, status
    )


def reap_abandoned():
    """Never replay a claimed execution after worker loss; surface its interrupted state."""
    cutoff = timezone.now() - timedelta(hours=1)
    for record in AutomationRun.objects.filter(status="RUNNING", start_time__lt=cutoff):
        if record.execution_id:
            execution = WorkflowRun.objects.filter(pk=record.execution_id).first()
            if execution and execution.heartbeat > timezone.now() - timedelta(seconds=45):
                continue
        AutomationRun.objects.filter(pk=record.pk, status="RUNNING").update(
            status="FAILED",
            end_time=timezone.now(),
            error_message="执行进程中断；未自动重放",
        )
