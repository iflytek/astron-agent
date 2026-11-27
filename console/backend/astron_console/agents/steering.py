"""Deliver messages at graph boundaries and retain their status with the turn."""

import logging
from uuid import UUID

from django.core.exceptions import ValidationError
from django.db import transaction
from django.http import Http404
from django.views.decorators.csrf import csrf_exempt

from astron_console.http import api_endpoint, error_response
from astron_console.resources.sandbox import service_auth

from .conversation_models import AgentRun

logger = logging.getLogger(__name__)
MAX_MESSAGES = 8


def received_messages(run):
    return [event["data"] for event in run.events if event.get("type") == "steering"]


def pending_messages(run):
    received = {item["id"] for item in received_messages(run)}
    return [item for item in run.steering.get("messages", []) if item["id"] not in received]


@api_endpoint(["POST"])
@transaction.atomic
def steer(request, agent_id, session_id, run_id):
    from .conversations import get_session

    _, _, session = get_session(request, agent_id, session_id)
    row = AgentRun.objects.select_for_update().filter(pk=run_id, session=session).first()
    if not row:
        raise Http404
    values = request.payload
    message = values.get("message")
    if set(values) != {"id", "message"} or not isinstance(message, str):
        raise ValidationError("追加指令参数无效")
    message = message.strip()
    if not message or len(message) > 32000:
        raise ValidationError("追加指令须为 1 至 32000 个字符")
    try:
        message_id = str(UUID(values["id"])) if isinstance(values["id"], str) else ""
    except ValueError:
        message_id = ""
    if not message_id:
        raise ValidationError("追加指令标识无效")
    queued = row.steering.get("messages", [])
    for item in queued:
        if item["id"] == message_id:
            if item["message"] != message:
                raise ValidationError("追加指令标识已被使用")
            return item
    if (
        row.status != "running"
        or row.cancel_requested
        or row.steering.get("closed", True)
        or session.active_run_id != row.pk
    ):
        return error_response("这轮已停止接收指令，消息仍在输入框", 409)
    if (
        len(queued) >= MAX_MESSAGES
        or sum(len(item["message"]) for item in queued) + len(message) > 64000
    ):
        raise ValidationError("这轮的追加指令已达上限")
    item = {"id": message_id, "message": message}
    row.steering["messages"] = [*queued, item]
    row.save(update_fields=["steering"])
    logger.info("Agent steering queued run=%s input=%s", run_id, message_id)
    return item


@csrf_exempt
@api_endpoint(["POST"], authenticated=False)
@transaction.atomic
def boundary(request, run_id):
    service_auth(request, "WORKFLOW_INTERNAL_API_KEY", "X-Workflow-Internal-Key")
    after, final = request.payload.get("after"), request.payload.get("final")
    if type(after) is not int or not isinstance(final, bool) or after < 0:
        raise ValidationError("Agent 指令位置无效")
    row = AgentRun.objects.select_for_update().filter(pk=run_id).first()
    if not row or not row.steering:
        raise Http404
    if row.status != "running" or row.cancel_requested:
        return {"messages": []}
    queued = row.steering.get("messages", [])
    if after > len(queued):
        raise ValidationError("Agent 指令位置无效")
    messages = queued[after:]
    if final and not messages and not row.steering["closed"]:
        row.steering["closed"] = True
        row.save(update_fields=["steering"])
    return {"messages": messages}


def record_received(run, ids):
    """Use stored user text, and keep the event ordered with tool results."""
    if not isinstance(ids, list) or not ids or any(not isinstance(item, str) for item in ids):
        raise ValueError("Invalid steering receipt")
    run.steering = AgentRun.objects.values_list("steering", flat=True).get(pk=run.pk)
    pending = pending_messages(run)
    if ids != [item["id"] for item in pending[: len(ids)]]:
        raise ValueError("Steering receipt does not match queued inputs")
    previous = run.answer
    events = []
    for item in pending[: len(ids)]:
        data = {**item, "previousAnswer": previous} if previous else item
        events.append({"type": "steering", "data": data})
        previous = ""
    return events
