"""One retained media configuration contract for canvas, versions, and publications."""

import json

from django.core.exceptions import ValidationError
from django.utils import timezone

from astron_console.resources.common import parsed
from astron_console.workflows.protocol import clean_config

from .models import WorkflowMediaConfig


def record(flow_id, version_num="-1"):
    return (
        WorkflowMediaConfig.objects.filter(
            flow_id=flow_id, version_num=str(version_num), deleted=False
        )
        .order_by("-id")
        .first()
    )


def read_version(flow_id, version_num):
    row = record(flow_id, version_num)
    return clean_config(parsed(row.config)) if row else {}


def read_draft(workflow):
    return read_version(workflow.flow_id, "-1")


def save_draft(scope, workflow, value):
    from astron_console.publishing.models import WorkflowBot

    from .media import media_config

    config = media_config(scope, parsed(value))
    binding = WorkflowBot.objects.filter(flow_id=workflow.flow_id).order_by("id").first()
    row = record(workflow.flow_id)
    if row is None:
        row = WorkflowMediaConfig(flow_id=workflow.flow_id, version_num="-1")
    row.bot_id = binding.bot_id if binding else row.bot_id
    row.config = json.dumps(config, ensure_ascii=False)
    row.updated_time = timezone.now()
    row.save()
    return config


def freeze_version(workflow, version):
    """Copy only the current draft when creating its new immutable graph version."""
    draft = record(workflow.flow_id)
    if draft is None:
        return
    frozen = record(workflow.flow_id, version.version_num)
    if frozen is not None:
        if parsed(frozen.config) != parsed(draft.config):
            raise ValidationError("工作流版本媒体配置已冻结")
        return
    WorkflowMediaConfig.objects.create(
        flow_id=workflow.flow_id,
        bot_id=draft.bot_id,
        version_num=version.version_num,
        config=draft.config,
        name=version.name,
    )


def restore_version(scope, workflow, version):
    frozen = record(workflow.flow_id, version.version_num)
    if frozen is not None:
        save_draft(scope, workflow, frozen.config)
    elif workflow.type == 4 or record(workflow.flow_id) is not None:
        raise ValidationError("历史版本缺少完整媒体配置，不能用当前草稿替代")
