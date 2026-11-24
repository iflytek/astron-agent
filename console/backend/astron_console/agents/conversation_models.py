"""Persist actual independent Agent runs; workflow histories stay in their own domain."""

import uuid

from django.db import models
from django.utils import timezone


def new_id():
    return uuid.uuid4().hex


class AgentSession(models.Model):
    id = models.CharField(primary_key=True, max_length=96, default=new_id)
    agent_id = models.IntegerField(db_index=True)
    uid = models.CharField(max_length=128)
    space_id = models.BigIntegerField(null=True)
    kind = models.CharField(max_length=16, default="chat")
    title = models.CharField(max_length=255, default="新会话")
    deleted = models.BooleanField(default=False)
    active_run_id = models.CharField(max_length=96, null=True)
    create_time = models.DateTimeField(default=timezone.now)
    update_time = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "console_agent_session"
        indexes = [
            models.Index(fields=["uid", "space_id", "agent_id", "kind"], name="agent_session_scope")
        ]


class AgentRun(models.Model):
    id = models.CharField(primary_key=True, max_length=96, default=new_id)
    session = models.ForeignKey(AgentSession, on_delete=models.PROTECT)
    question = models.TextField()
    answer = models.TextField(default="")
    reasoning = models.TextField(default="")
    events = models.JSONField(default=list)
    files = models.JSONField(default=list)
    definition = models.JSONField(default=dict)
    version_id = models.BigIntegerField(null=True)
    regenerate_id = models.CharField(max_length=96, null=True)
    status = models.CharField(max_length=24, default="running")
    cancel_requested = models.BooleanField(default=False)
    error_code = models.CharField(max_length=64, default="")
    create_time = models.DateTimeField(default=timezone.now)
    update_time = models.DateTimeField(default=timezone.now)
    finished_at = models.DateTimeField(null=True)

    class Meta:
        db_table = "console_agent_run"
        ordering = ["create_time", "id"]


class AgentFile(models.Model):
    id = models.CharField(primary_key=True, max_length=96, default=new_id)
    agent_id = models.IntegerField(db_index=True)
    uid = models.CharField(max_length=128)
    space_id = models.BigIntegerField(null=True)
    name = models.CharField(max_length=512)
    size = models.BigIntegerField()
    object_key = models.CharField(max_length=1024)
    bucket = models.CharField(max_length=255)
    content_type = models.CharField(max_length=255, default="application/octet-stream")
    text = models.TextField(default="")
    direction = models.CharField(max_length=16, default="input")
    run_id = models.CharField(max_length=96, null=True)
    create_time = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "console_agent_file"
