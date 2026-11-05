"""Persistent execution identity, cancellation and fixed run snapshots."""

from django.db import models
from django.utils import timezone

from .models import run_id


class ExecutionContext(models.Model):
    id = models.CharField(max_length=36, primary_key=True, default=run_id)
    uid = models.CharField(max_length=128)
    space_id = models.BigIntegerField(null=True)
    status = models.CharField(max_length=32, default="active")
    cancel_requested = models.BooleanField(default=False)
    agent_run_id = models.CharField(max_length=36, null=True)
    agent_id = models.BigIntegerField(null=True)
    snapshots = models.JSONField(default=dict)
    remaining_budget = models.PositiveIntegerField(default=64)
    deadline = models.DateTimeField()
    call_chain = models.JSONField(default=list)
    create_time = models.DateTimeField(default=timezone.now)
    update_time = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "console_execution_context"


class WorkflowRun(models.Model):
    id = models.CharField(max_length=36, primary_key=True, default=run_id)
    workflow_id = models.BigIntegerField(db_index=True)
    uid = models.CharField(max_length=128)
    space_id = models.BigIntegerField(null=True)
    kind = models.CharField(max_length=32, default="workflow")
    graph = models.JSONField(default=dict)
    inputs = models.JSONField(default=dict)
    resolved_agents = models.JSONField(default=dict)
    context_id = models.CharField(max_length=36, db_index=True)
    parent_run_id = models.CharField(max_length=36, null=True)
    retry_of = models.CharField(max_length=36, null=True)
    call_chain = models.JSONField(default=list)
    invocation_id = models.CharField(max_length=128, null=True, unique=True)
    version_id = models.BigIntegerField(null=True)
    chat_id = models.CharField(max_length=128, default="")
    status = models.CharField(max_length=32, default="pending", db_index=True)
    event_id = models.CharField(max_length=255, default="")
    events = models.JSONField(default=list)
    output = models.TextField(default="")
    error = models.TextField(default="")
    cancel_requested = models.BooleanField(default=False)
    history_hidden = models.BooleanField(default=False)
    heartbeat = models.DateTimeField(default=timezone.now)
    create_time = models.DateTimeField(default=timezone.now)
    update_time = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "console_workflow_run"
