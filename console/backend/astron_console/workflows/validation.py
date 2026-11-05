"""Read-only Core engine validation shared by editing and publication."""

import logging

import httpx
from django.conf import settings
from django.core.exceptions import ValidationError

from .protocol import to_protocol

logger = logging.getLogger(__name__)


class WorkflowValidationUnavailable(ValidationError):
    pass


def validate_graph(graph, workflow, scope, *, timeout=60):
    protocol = to_protocol(graph, workflow, scope)
    base = getattr(settings, "WORKFLOW_URL", "").rstrip("/")
    key = getattr(settings, "WORKFLOW_INTERNAL_API_KEY", "")
    if not base or not key:
        raise WorkflowValidationUnavailable("工作流服务未配置")
    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.post(
                base + "/workflow/v1/console/validate",
                json={"protocol": protocol},
                headers={"X-Workflow-Internal-Key": key, "X-Consumer-Username": workflow.app_id},
            )
            response.raise_for_status()
            body = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        logger.warning(
            "Workflow validation unavailable flow_id=%s error_type=%s",
            workflow.flow_id,
            type(exc).__name__,
        )
        raise WorkflowValidationUnavailable("工作流校验服务不可用") from exc
    header = body.get("header") if isinstance(body, dict) else None
    code = (
        body.get("code", header.get("code") if isinstance(header, dict) else None)
        if isinstance(body, dict)
        else None
    )
    if type(code) is not int or code != 0:
        logger.warning("Workflow validation rejected flow_id=%s", workflow.flow_id)
        raise ValidationError("工作流校验失败，请检查节点及连线")
    return protocol
