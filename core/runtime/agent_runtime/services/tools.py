from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select

from agent_runtime.db.events import append_event
from agent_runtime.db.models import (
    AgentRun,
    Approval,
    MaterialDraft,
    RunStatus,
    ToolCall,
)
from agent_runtime.db.session import SessionLocal
from agent_runtime.errors import RunPaused
from agent_runtime.services.runs import canonical_hash

MATERIAL_DRAFT_SAVE = "commerce_material_draft_save"
ALLOWED_APPROVER_ROLES = {"business_user", "space_admin"}


def _lookup(path: str, run: AgentRun, results: list[dict[str, Any]]) -> Any:
    parts = path.split(".")
    if parts[0] == "$input":
        value: Any = run.input_data
    elif parts[0] == "$steps" and len(parts) >= 2:
        value = next(
            (item for item in results if item.get("step_id") == parts[1]), None
        )
        parts = [parts[0], *parts[2:]]
    else:
        return path
    for part in parts[1:]:
        if not isinstance(value, dict) or part not in value:
            raise ValueError(f"Unable to resolve tool argument reference: {path}")
        value = value[part]
    return value


def _resolve(value: Any, run: AgentRun, results: list[dict[str, Any]]) -> Any:
    if isinstance(value, str) and value.startswith("$"):
        return _lookup(value, run, results)
    if isinstance(value, dict):
        return {key: _resolve(item, run, results) for key, item in value.items()}
    if isinstance(value, list):
        return [_resolve(item, run, results) for item in value]
    return value


def _require_approval(
    run: AgentRun,
    *,
    operation_id: str,
    parameter_hash: str,
    policy: dict[str, Any],
) -> None:
    expired = False
    with SessionLocal.begin() as session:
        current = session.get(AgentRun, run.id)
        if current is None:
            raise ValueError("Run no longer exists")
        approval = session.scalar(
            select(Approval).where(
                Approval.run_id == run.id,
                Approval.operation_id == operation_id,
                Approval.parameter_hash == parameter_hash,
            )
        )
        if approval and approval.status == "APPROVED":
            return
        if approval and approval.status == "REJECTED":
            raise ValueError("Tool operation was rejected")
        if approval:
            expires_at = approval.expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at <= datetime.now(timezone.utc):
                approval.status = "EXPIRED"
                current.status = RunStatus.EXPIRED.value
                current.error_code = "APPROVAL_EXPIRED"
                current.error_message = "Approval expired"
                current.finished_at = datetime.now(timezone.utc)
                append_event(
                    session,
                    current,
                    "run.failed",
                    {"status": current.status, "code": "APPROVAL_EXPIRED"},
                )
                expired = True
        if approval is None:
            superseded = session.scalars(
                select(Approval).where(
                    Approval.run_id == run.id,
                    Approval.operation_id == operation_id,
                    Approval.parameter_hash != parameter_hash,
                    Approval.status.in_(["PENDING", "APPROVED"]),
                )
            ).all()
            for previous in superseded:
                previous.status = "SUPERSEDED"
            approval = Approval(
                run_id=run.id,
                operation_id=operation_id,
                parameter_hash=parameter_hash,
                policy=policy,
                expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            )
            session.add(approval)
            session.flush()
            append_event(
                session,
                current,
                "approval.required",
                {
                    "approval_id": approval.id,
                    "operation_id": operation_id,
                    "parameter_hash": parameter_hash,
                    "policy": policy,
                },
            )
        if not expired:
            current.status = RunStatus.WAITING_APPROVAL.value
            current.lease_owner = None
            current.lease_expires_at = None
            append_event(
                session,
                current,
                "run.waiting",
                {"status": current.status, "reason": "approval_required"},
            )
    message = "Approval expired" if expired else "Run is waiting for approval"
    raise RunPaused(message)


def _save_material_draft(
    run: AgentRun,
    *,
    operation_id: str,
    arguments: dict[str, Any],
) -> dict[str, Any]:
    product_id = arguments.get("product_id")
    content = arguments.get("content")
    if not isinstance(product_id, str) or not product_id:
        raise ValueError("product_id is required")
    if not isinstance(content, dict) or not content:
        raise ValueError("content must be a non-empty object")
    with SessionLocal.begin() as session:
        draft = session.scalar(
            select(MaterialDraft).where(
                MaterialDraft.space_id == run.space_id,
                MaterialDraft.logical_operation_id == operation_id,
            )
        )
        if draft is None:
            draft = MaterialDraft(
                space_id=run.space_id,
                end_user_id=run.end_user_id,
                product_id=product_id,
                logical_operation_id=operation_id,
                content=content,
                status="PENDING_PUBLISH",
            )
            session.add(draft)
            session.flush()
        return {
            "draft_id": draft.id,
            "product_id": draft.product_id,
            "status": draft.status,
            "version": draft.version,
        }


def execute_tool_step(
    run: AgentRun,
    step: dict[str, Any],
    results: list[dict[str, Any]],
) -> dict[str, Any]:
    tool_name = str(step.get("tool", ""))
    if tool_name != MATERIAL_DRAFT_SAVE:
        raise ValueError(f"Tool is not allowed: {tool_name}")
    raw_arguments = step.get("arguments", {})
    if not isinstance(raw_arguments, dict):
        raise ValueError("Tool arguments must be an object")
    arguments = _resolve(raw_arguments, run, results)
    operation_id = f"{run.id}:{step['id']}:{tool_name}"
    argument_hash = canonical_hash(arguments)
    raw_policy = step.get("approval_policy", {})
    policy = (
        raw_policy
        if isinstance(raw_policy, dict) and raw_policy
        else {"allowed_roles": sorted(ALLOWED_APPROVER_ROLES)}
    )
    raw_roles = policy.get("allowed_roles", [])
    allowed_roles = (
        {str(role) for role in raw_roles} if isinstance(raw_roles, list) else set()
    )
    if not allowed_roles or not allowed_roles.issubset(ALLOWED_APPROVER_ROLES):
        raise ValueError("Invalid approval policy for governed tool")
    _require_approval(
        run,
        operation_id=operation_id,
        parameter_hash=argument_hash,
        policy={**policy, "allowed_roles": sorted(allowed_roles)},
    )

    with SessionLocal.begin() as session:
        current = session.get(AgentRun, run.id)
        if current is None:
            raise ValueError("Run no longer exists")
        tool_call = session.scalar(
            select(ToolCall).where(
                ToolCall.run_id == run.id,
                ToolCall.logical_operation_id == operation_id,
            )
        )
        if tool_call:
            if tool_call.argument_hash != argument_hash:
                raise ValueError("Logical tool operation was reused with new arguments")
            if tool_call.status == "SUCCEEDED" and tool_call.result:
                return tool_call.result
        else:
            tool_call = ToolCall(
                run_id=run.id,
                step_id=step["id"],
                tool_name=tool_name,
                logical_operation_id=operation_id,
                argument_hash=argument_hash,
                arguments=arguments,
                status="RUNNING",
            )
            session.add(tool_call)
            append_event(
                session,
                current,
                "tool.started",
                {"tool": tool_name, "operation_id": operation_id},
                step_id=step["id"],
            )

    result = _save_material_draft(
        run,
        operation_id=operation_id,
        arguments=arguments,
    )
    with SessionLocal.begin() as session:
        current = session.get(AgentRun, run.id)
        tool_call = session.scalar(
            select(ToolCall).where(
                ToolCall.run_id == run.id,
                ToolCall.logical_operation_id == operation_id,
            )
        )
        if current is None or tool_call is None:
            raise ValueError("Tool call state no longer exists")
        tool_call.status = "SUCCEEDED"
        tool_call.result = result
        append_event(
            session,
            current,
            "tool.completed",
            {"tool": tool_name, "operation_id": operation_id, "result": result},
            step_id=step["id"],
        )
    return result
