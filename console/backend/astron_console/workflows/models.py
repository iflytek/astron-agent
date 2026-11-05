"""Workflow control-plane records. Existing business tables are adopted, never rebuilt."""

import uuid

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone as django_timezone

from astron_console.fields import StoredBooleanField


def run_id():
    return str(uuid.uuid4())


class PromptTemplate(models.Model):
    uid = models.CharField(max_length=128, null=True)
    name = models.CharField(max_length=255)
    description = models.TextField(null=True)
    deleted = StoredBooleanField(default=False)
    prompt = models.TextField(null=True)
    created_time = models.DateTimeField(null=True)
    updated_time = models.DateTimeField(null=True)
    node_category = models.IntegerField(null=True)
    adaptation_model = models.TextField(null=True)
    max_loop_count = models.IntegerField(null=True)

    class Meta:
        db_table = "prompt_template"


class Workflow(models.Model):
    uid = models.CharField(max_length=128)
    app_id = models.CharField(max_length=255)
    flow_id = models.CharField(max_length=255, null=True, db_index=True)
    name = models.CharField(max_length=255)
    description = models.CharField(max_length=512, default="")
    deleted = StoredBooleanField(default=False)
    is_public = StoredBooleanField(default=False)
    create_time = models.DateTimeField(default=django_timezone.now)
    update_time = models.DateTimeField(default=django_timezone.now, null=True)
    published_data = models.TextField(null=True)
    data = models.TextField(null=True)
    avatar_icon = models.CharField(max_length=1000, null=True)
    avatar_color = models.CharField(max_length=255, null=True)
    status = models.SmallIntegerField(default=-1)
    can_publish = StoredBooleanField(default=False)
    app_updatable = StoredBooleanField(default=False)
    top = StoredBooleanField(default=False)
    edge_type = models.CharField(max_length=255, null=True)
    order = models.IntegerField(default=0, null=True)
    eval_set_id = models.BigIntegerField(null=True)
    source = models.SmallIntegerField(default=1, null=True)
    bak = models.TextField(null=True)
    editing = StoredBooleanField(default=True)
    eval_page_first_time = models.TextField(null=True)
    advanced_config = models.TextField(null=True)
    ext = models.TextField(null=True)
    category = models.IntegerField(null=True)
    space_id = models.BigIntegerField(null=True)
    type = models.IntegerField(null=True)

    class Meta:
        db_table = "workflow"


class WorkflowVersion(models.Model):
    name = models.CharField(max_length=100, null=True)
    version_num = models.CharField(max_length=100)
    data = models.TextField(null=True)
    flow_id = models.CharField(max_length=255, db_index=True)
    is_deleted = models.IntegerField(default=0)
    deleted = models.IntegerField(default=1)
    created_time = models.DateTimeField(default=django_timezone.now, null=True)
    updated_time = models.DateTimeField(default=django_timezone.now, null=True)
    is_current = models.IntegerField(default=1)
    is_version = models.IntegerField(default=1)
    sys_data = models.TextField(null=True)
    description = models.CharField(max_length=100, null=True)
    publish_channels = models.CharField(max_length=255, null=True)
    publish_channel = models.IntegerField(null=True)
    publish_result = models.TextField(null=True)
    bot_id = models.CharField(max_length=100, null=True)
    advanced_config = models.TextField(null=True)

    class Meta:
        db_table = "workflow_version"

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValidationError("工作流版本快照不可修改")
        return super().save(*args, **kwargs)


class WorkflowDialog(models.Model):
    uid = models.CharField(max_length=128, null=True)
    workflow_id = models.BigIntegerField(null=True, db_index=True)
    question = models.TextField(null=True)
    answer = models.TextField(null=True)
    data = models.TextField(null=True)
    create_time = models.DateTimeField(default=django_timezone.now, null=True)
    deleted = StoredBooleanField(default=False, null=True)
    sid = models.CharField(max_length=255, null=True)
    type = models.SmallIntegerField(default=1)
    question_item = models.TextField(null=True)
    answer_item = models.TextField(null=True)
    chat_id = models.CharField(max_length=100, null=True)

    class Meta:
        db_table = "workflow_dialog"


class WorkflowNodeHistory(models.Model):
    node_id = models.CharField(max_length=255, db_index=True)
    chat_id = models.CharField(max_length=255, null=True, db_index=True)
    raw_question = models.TextField(null=True)
    raw_answer = models.TextField(null=True)
    create_time = models.DateTimeField(default=django_timezone.now)
    flow_id = models.CharField(max_length=255, null=True)

    class Meta:
        db_table = "workflow_node_history"


class WorkflowTemplate(models.Model):
    title = models.CharField(max_length=128, null=True)
    subtitle = models.CharField(max_length=512, null=True)
    cover_url = models.CharField(max_length=2048, null=True)
    group_id = models.BigIntegerField(null=True)
    source_workflow_id = models.BigIntegerField()
    snapshot_yaml = models.TextField()
    creator_uid = models.CharField(max_length=128)
    space_id = models.BigIntegerField(null=True)
    is_delete = models.SmallIntegerField(default=0)
    create_time = models.DateTimeField(default=django_timezone.now)
    update_time = models.DateTimeField(default=django_timezone.now)

    class Meta:
        db_table = "exported_workflow_template"


class TemplateGroup(models.Model):
    id = models.AutoField(primary_key=True)
    create_user = models.CharField(max_length=32)
    group_name = models.CharField(max_length=20)
    sort_index = models.IntegerField()
    is_delete = models.SmallIntegerField(default=0)
    create_time = models.DateTimeField(default=django_timezone.now)
    update_time = models.DateTimeField(default=django_timezone.now)
    group_name_en = models.CharField(max_length=128, null=True)

    class Meta:
        db_table = "workflow_template_group"


class AutomationTask(models.Model):
    task_name = models.CharField(max_length=128)
    flow_id = models.CharField(max_length=128, db_index=True)
    workflow_name = models.CharField(max_length=255, null=True)
    version = models.CharField(max_length=128, null=True)
    space_id = models.BigIntegerField(null=True)
    uid = models.CharField(max_length=128)
    cron_expression = models.CharField(max_length=128)
    schedule_type = models.CharField(max_length=32, default="CUSTOM", null=True)
    timezone = models.CharField(max_length=64, default="Asia/Shanghai")
    input_params = models.TextField(null=True)
    enabled = StoredBooleanField(default=True)
    deleted = StoredBooleanField(default=False)
    next_fire_time = models.DateTimeField(null=True)
    last_run_time = models.DateTimeField(null=True)
    last_run_status = models.CharField(max_length=32, null=True)
    last_run_message = models.CharField(max_length=512, null=True)
    create_time = models.DateTimeField(default=django_timezone.now)
    update_time = models.DateTimeField(default=django_timezone.now)

    class Meta:
        db_table = "workflow_automation_task"


class AutomationRun(models.Model):
    task_id = models.BigIntegerField(db_index=True)
    flow_id = models.CharField(max_length=128)
    space_id = models.BigIntegerField(null=True)
    uid = models.CharField(max_length=128)
    trigger_type = models.CharField(max_length=32)
    scheduled_fire_time = models.DateTimeField(null=True)
    start_time = models.DateTimeField(null=True)
    end_time = models.DateTimeField(null=True)
    status = models.CharField(max_length=32)
    request_params = models.TextField(null=True)
    response_summary = models.TextField(null=True)
    error_message = models.TextField(null=True)
    duration_ms = models.BigIntegerField(null=True)
    create_time = models.DateTimeField(default=django_timezone.now)
    version = models.CharField(max_length=128, null=True)
    execution_id = models.CharField(max_length=36, null=True)
    # NULL on retained rows; new triggers carry a unique durable idempotency key.
    trigger_key = models.CharField(max_length=160, null=True, unique=True)

    class Meta:
        db_table = "workflow_automation_run"


from .runtime_models import ExecutionContext, WorkflowRun  # noqa: E402,F401


class TextNodeConfig(models.Model):
    uid = models.CharField(max_length=128)
    separator = models.TextField()
    comment = models.CharField(max_length=255, default="")
    deleted = StoredBooleanField(default=False)
    create_time = models.DateTimeField(default=django_timezone.now)
    update_time = models.DateTimeField(default=django_timezone.now)

    class Meta:
        db_table = "text_node_config"
