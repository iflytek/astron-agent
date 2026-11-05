"""Retained publication data and immutable, credential-free release candidates."""

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class App(models.Model):
    uid = models.CharField(max_length=128)
    app_name = models.CharField(max_length=128)
    app_describe = models.CharField(max_length=512, null=True)
    app_id = models.CharField(max_length=255, db_index=True)
    app_key = models.CharField(max_length=255)
    app_secret = models.CharField(max_length=255)
    is_delete = models.IntegerField(default=0)
    create_time = models.DateTimeField(default=timezone.now, null=True)
    update_time = models.DateTimeField(default=timezone.now, null=True)

    class Meta:
        db_table = "app_mst"


class BotAPI(models.Model):
    uid = models.CharField(max_length=128)
    bot_id = models.IntegerField(db_index=True)
    assistant_id = models.CharField(max_length=255, null=True)
    app_id = models.CharField(max_length=255)
    api_secret = models.CharField(max_length=255, null=True)
    api_key = models.CharField(max_length=255, null=True)
    api_path = models.CharField(max_length=255, null=True)
    prompt = models.TextField(null=True)
    plugin_id = models.TextField(null=True)
    embedding_id = models.TextField(null=True)
    description = models.TextField(null=True)
    create_time = models.DateTimeField(default=timezone.now, null=True)
    update_time = models.DateTimeField(default=timezone.now, null=True)

    class Meta:
        db_table = "chat_bot_api"


class WorkflowBot(models.Model):
    bot_id = models.IntegerField(db_index=True)
    name = models.CharField(max_length=255, null=True)
    desc = models.TextField(null=True)
    open = models.TextField(null=True)
    gcy = models.TextField(null=True)
    uid = models.CharField(max_length=128, null=True)
    flow_id = models.CharField(max_length=255, null=True)
    maas_id = models.BigIntegerField(null=True)
    bot_name = models.CharField(max_length=255, null=True)
    extra_inputs = models.TextField(null=True)
    extra_inputs_config = models.TextField(null=True)
    space_id = models.BigIntegerField(null=True)
    create_time = models.DateTimeField(default=timezone.now, null=True)
    update_time = models.DateTimeField(default=timezone.now, null=True)

    class Meta:
        db_table = "user_lang_chain_info"


class ShareRecord(models.Model):
    uid = models.CharField(max_length=128)
    base_id = models.BigIntegerField()
    share_key = models.CharField(max_length=128, db_index=True)
    share_type = models.IntegerField(default=0)
    is_act = models.IntegerField(default=1)
    create_time = models.DateTimeField(default=timezone.now, null=True)
    update_time = models.DateTimeField(default=timezone.now, null=True)

    class Meta:
        db_table = "agent_share_record"


class PublicationCandidate(models.Model):
    bot_id = models.IntegerField(db_index=True)
    resource_kind = models.CharField(max_length=16)
    resource_id = models.CharField(max_length=255)
    version_id = models.BigIntegerField()
    definition = models.JSONField()
    owner_uid = models.CharField(max_length=128)
    space_id = models.BigIntegerField(null=True)
    created_by = models.CharField(max_length=128)
    create_time = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "console_publication_candidate"

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValidationError("发布候选快照不可修改")
        return super().save(*args, **kwargs)


class Publication(models.Model):
    bot_id = models.IntegerField(db_index=True)
    channel = models.CharField(max_length=16)
    target_id = models.CharField(max_length=255, default="")
    candidate = models.ForeignKey(PublicationCandidate, on_delete=models.PROTECT)
    active = models.BooleanField(default=True)
    update_time = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "console_publication"
        constraints = [
            models.UniqueConstraint(
                fields=["bot_id", "channel", "target_id"], name="publication_target"
            )
        ]


class PublicRunGrant(models.Model):
    run_id = models.CharField(max_length=96, unique=True)
    root_id = models.CharField(max_length=96, db_index=True, default="")
    share_id = models.BigIntegerField(null=True)
    publication = models.ForeignKey(Publication, on_delete=models.PROTECT)
    candidate = models.ForeignKey(PublicationCandidate, on_delete=models.PROTECT)
    app_id = models.CharField(max_length=255, default="")
    caller_uid = models.CharField(max_length=128)
    caller_space_id = models.BigIntegerField(null=True)
    identity_kind = models.CharField(max_length=16, default="console")
    session_id = models.CharField(max_length=96, default="")
    create_time = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "console_public_run_grant"


class Approval(models.Model):
    space_id = models.BigIntegerField(null=True)
    space_type = models.IntegerField(null=True)
    resource_type = models.CharField(max_length=32, default="BOT")
    resource_id = models.CharField(max_length=255)
    resource_name = models.CharField(max_length=255, null=True)
    publish_type = models.CharField(max_length=32)
    publish_action = models.CharField(max_length=32, default="PUBLISH")
    target_id = models.CharField(max_length=255, default="")
    target_hash = models.CharField(max_length=64)
    approval_status = models.CharField(max_length=32, default="PENDING")
    requester_uid = models.CharField(max_length=128)
    reviewer_uid = models.CharField(max_length=128, null=True)
    app_owner_uid = models.CharField(max_length=128, null=True)
    request_reason = models.CharField(max_length=512, null=True)
    review_comment = models.CharField(max_length=512, null=True)
    publish_snapshot = models.TextField(null=True)
    execution_result = models.TextField(null=True)
    created_time = models.DateTimeField(default=timezone.now, null=True)
    reviewed_time = models.DateTimeField(null=True)
    executed_time = models.DateTimeField(null=True)
    updated_time = models.DateTimeField(default=timezone.now, null=True)
    deleted = models.IntegerField(default=0)
    candidate = models.ForeignKey(PublicationCandidate, null=True, on_delete=models.PROTECT)

    class Meta:
        db_table = "publish_approval"


class ConversationStats(models.Model):
    uid = models.CharField(max_length=128, null=True)
    space_id = models.BigIntegerField(null=True)
    bot_id = models.IntegerField()
    chat_id = models.BigIntegerField(null=True)
    sid = models.CharField(max_length=255, null=True)
    token_consumed = models.IntegerField(null=True)
    conversation_date = models.DateField(null=True)
    create_time = models.DateTimeField(default=timezone.now, null=True)
    is_delete = models.IntegerField(default=0)

    class Meta:
        db_table = "bot_conversation_stats"


class AppOperation(models.Model):
    """Do not automatically repeat an application creation after an ambiguous timeout."""

    uid = models.CharField(max_length=128)
    request_id = models.CharField(max_length=64, unique=True)
    app_name = models.CharField(max_length=128)
    status = models.CharField(max_length=32, default="PREPARING")
    app_id = models.CharField(max_length=255, default="")
    create_time = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "console_app_operation"


class BotType(models.Model):
    order_num = models.IntegerField(default=0)
    show_index = models.IntegerField(default=0)
    is_act = models.IntegerField(default=1)
    type_key = models.IntegerField()
    type_name = models.CharField(max_length=255, null=True)
    type_name_en = models.CharField(max_length=255, null=True)
    icon = models.CharField(max_length=1024, null=True)

    class Meta:
        db_table = "bot_type_list"


class LegacyMarket(models.Model):
    model_id = models.BigIntegerField(null=True)
    model = models.CharField(max_length=64, null=True)
    opened_tool = models.CharField(max_length=255, null=True)
    support_context = models.IntegerField(default=0)
    support_document = models.IntegerField(default=0)
    bot_id = models.IntegerField(db_index=True)
    uid = models.CharField(max_length=128, null=True)
    bot_name = models.CharField(max_length=255, null=True)
    bot_desc = models.TextField(null=True)
    avatar = models.CharField(max_length=1024, null=True)
    bot_type = models.IntegerField(null=True)
    prompt = models.TextField(null=True)
    prologue = models.TextField(null=True)
    version = models.IntegerField(null=True)
    bot_status = models.IntegerField(default=0, null=True)
    is_delete = models.IntegerField(default=0, null=True)
    publish_channels = models.CharField(max_length=255, null=True)
    create_time = models.DateTimeField(default=timezone.now, null=True)
    update_time = models.DateTimeField(default=timezone.now, null=True)

    class Meta:
        db_table = "chat_bot_market"


class LegacyPublicationIssue(models.Model):
    source = models.CharField(max_length=255, unique=True)
    bot_id = models.IntegerField()
    reason = models.CharField(max_length=255)
    resolved = models.BooleanField(default=False)

    class Meta:
        db_table = "console_legacy_publication_issue"


class PublicFileGrant(models.Model):
    file = models.OneToOneField("agents.AgentFile", on_delete=models.PROTECT)
    publication = models.ForeignKey(Publication, on_delete=models.PROTECT)
    candidate = models.ForeignKey(PublicationCandidate, on_delete=models.PROTECT)
    caller_uid = models.CharField(max_length=128)
    caller_space_id = models.BigIntegerField(null=True)
    identity_kind = models.CharField(max_length=16, default="console")
    app_id = models.CharField(max_length=255, default="")
    share_id = models.BigIntegerField(null=True)

    class Meta:
        db_table = "console_public_file_grant"
