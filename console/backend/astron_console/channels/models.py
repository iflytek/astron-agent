"""Media and channel records retain existing IDs; credentials never join public projections."""

from django.db import models
from django.utils import timezone

from astron_console.fields import StoredBooleanField


class Speaker(models.Model):
    create_uid = models.CharField(max_length=128, null=True)
    space_id = models.BigIntegerField(null=True)
    name = models.CharField(max_length=255, null=True)
    task_id = models.CharField(max_length=128, null=True)
    asset_id = models.CharField(max_length=128, null=True)
    deleted = models.IntegerField(default=0)
    create_time = models.DateTimeField(default=timezone.now, null=True)
    update_time = models.DateTimeField(default=timezone.now, null=True)

    class Meta:
        db_table = "custom_speaker"


class Pronunciation(models.Model):
    name = models.CharField(max_length=255, null=True)
    cover_url = models.CharField(max_length=2048, null=True)
    voice_type = models.CharField(max_length=255, null=True)
    sort = models.IntegerField(default=0)
    speaker_type = models.CharField(max_length=32, default="NORMAL")
    exquisite = models.IntegerField(default=0)
    deleted = models.IntegerField(default=0)
    create_time = models.DateTimeField(default=timezone.now, null=True)
    update_time = models.DateTimeField(default=timezone.now, null=True)

    class Meta:
        db_table = "pronunciation_person_config"


class VoiceTask(models.Model):
    uid = models.CharField(max_length=128)
    space_id = models.BigIntegerField(null=True)
    task_id = models.CharField(max_length=128, unique=True)
    status = models.CharField(max_length=32, default="created")
    object_key = models.CharField(max_length=512)
    error = models.CharField(max_length=255, default="")
    speaker_id = models.BigIntegerField(null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "console_voice_task"


class WorkflowMediaConfig(models.Model):
    name = models.CharField(max_length=100, null=True)
    version_num = models.CharField(max_length=100, default="-1")
    flow_id = models.CharField(max_length=255)
    bot_id = models.IntegerField(null=True)
    config = models.TextField(null=True)
    deleted = StoredBooleanField(default=False)
    created_time = models.DateTimeField(default=timezone.now, null=True)
    updated_time = models.DateTimeField(default=timezone.now, null=True)

    class Meta:
        db_table = "workflow_config"


class MediaHistory(models.Model):
    uid = models.CharField(max_length=128)
    space_id = models.BigIntegerField(null=True)
    bot_id = models.IntegerField()
    session_id = models.CharField(max_length=128)
    question = models.TextField()
    answer = models.TextField()
    sid = models.CharField(max_length=128, default="")
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "console_media_history"


class WechatBinding(models.Model):
    uid = models.CharField(max_length=128, null=True)
    bot_id = models.BigIntegerField(null=True)
    appid = models.CharField(max_length=100, null=True)
    release_type = models.SmallIntegerField(default=1)
    status = models.SmallIntegerField(default=0)
    create_time = models.DateTimeField(default=timezone.now, null=True)
    update_time = models.DateTimeField(default=timezone.now, null=True)

    class Meta:
        db_table = "bot_offiaccount"


class WechatRecord(models.Model):
    bot_id = models.BigIntegerField(null=True)
    appid = models.CharField(max_length=100, null=True)
    auth_type = models.SmallIntegerField(null=True)
    create_time = models.DateTimeField(default=timezone.now, null=True)
    update_time = models.DateTimeField(default=timezone.now, null=True)

    class Meta:
        db_table = "bot_offiaccount_record"


class WechatChat(models.Model):
    app_id = models.CharField(max_length=64, null=True)
    open_id = models.CharField(max_length=64, null=True)
    msg_id = models.BigIntegerField(null=True)
    req = models.TextField(null=True)
    resp = models.TextField(null=True)
    sid = models.CharField(max_length=64, null=True)
    create_time = models.DateTimeField(default=timezone.now, null=True)
    update_time = models.DateTimeField(default=timezone.now, null=True)

    class Meta:
        db_table = "bot_offiaccount_chat"


class WechatCredential(models.Model):
    # Empty appid is the component credential. New secrets use the existing RSA key.
    appid = models.CharField(max_length=100, primary_key=True)
    encrypted = models.TextField(default="")
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "console_wechat_credential"


class WechatAuthorization(models.Model):
    appid = models.CharField(max_length=100, primary_key=True)
    receiver_id = models.CharField(max_length=100, default="")
    candidate_id = models.BigIntegerField(null=True)
    publication_id = models.BigIntegerField(null=True)
    uid = models.CharField(max_length=128)
    space_id = models.BigIntegerField(null=True)
    state = models.CharField(max_length=64)
    status = models.CharField(max_length=32, default="pending")
    expires_at = models.DateTimeField()
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "console_wechat_authorization"


class WebhookEvent(models.Model):
    event_key = models.CharField(max_length=64, primary_key=True)
    kind = models.CharField(max_length=64)
    appid = models.CharField(max_length=100)
    publication_id = models.BigIntegerField(null=True)
    candidate_id = models.BigIntegerField(null=True)
    payload = models.JSONField()
    status = models.CharField(max_length=32, default="pending")
    error = models.CharField(max_length=255, default="")
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "console_wechat_event"
