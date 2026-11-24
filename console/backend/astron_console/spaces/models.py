from django.db import models
from django.utils import timezone


class TimedModel(models.Model):
    create_time = models.DateTimeField(default=timezone.now, null=True)
    update_time = models.DateTimeField(default=timezone.now, null=True)

    class Meta:
        abstract = True


class Space(TimedModel):
    name = models.CharField(max_length=50)
    description = models.CharField(max_length=2000, null=True, default="")
    avatar_url = models.CharField(max_length=1024, null=True, default="")
    uid = models.CharField(max_length=128, null=True)
    enterprise_id = models.BigIntegerField(null=True)
    type = models.SmallIntegerField(default=1, null=True)
    deleted = models.SmallIntegerField(default=0, null=True)

    class Meta:
        db_table = "agent_space"


class SpaceMember(TimedModel):
    space_id = models.BigIntegerField()
    uid = models.CharField(max_length=128)
    nickname = models.CharField(max_length=64, null=True, default="")
    role = models.SmallIntegerField(default=3)
    last_visit_time = models.DateTimeField(null=True)

    class Meta:
        db_table = "agent_space_user"
        unique_together = [("space_id", "uid")]


class Enterprise(TimedModel):
    uid = models.CharField(max_length=128, null=True)
    name = models.CharField(max_length=50, null=True)
    logo_url = models.CharField(max_length=1024, null=True, default="")
    avatar_url = models.CharField(max_length=1024, default="")
    org_id = models.BigIntegerField(null=True)
    service_type = models.SmallIntegerField(default=2, null=True)
    expire_time = models.DateTimeField(null=True)
    deleted = models.SmallIntegerField(default=0, null=True)

    class Meta:
        db_table = "agent_enterprise"


class EnterpriseMember(TimedModel):
    enterprise_id = models.BigIntegerField(null=True)
    uid = models.CharField(max_length=128, null=True)
    nickname = models.CharField(max_length=64, null=True, default="")
    role = models.SmallIntegerField(default=3, null=True)

    class Meta:
        db_table = "agent_enterprise_user"
        unique_together = [("enterprise_id", "uid")]


class SpacePermission(TimedModel):
    module = models.CharField(max_length=50, null=True)
    point = models.CharField(max_length=50, null=True)
    description = models.CharField(max_length=255, null=True)
    permission_key = models.CharField(max_length=128, unique=True, null=True)
    owner = models.BooleanField(default=True)
    admin = models.BooleanField(default=False)
    member = models.BooleanField(default=False)
    available_expired = models.BooleanField(default=False)

    class Meta:
        db_table = "agent_space_permission"


class EnterprisePermission(TimedModel):
    module = models.CharField(max_length=50, null=True)
    description = models.CharField(max_length=255, null=True)
    permission_key = models.CharField(max_length=128, null=True)
    officer = models.BooleanField(default=True)
    governor = models.BooleanField(default=False)
    staff = models.BooleanField(default=False)
    available_expired = models.BooleanField(default=False)

    class Meta:
        db_table = "agent_enterprise_permission"


class Invitation(TimedModel):
    type = models.SmallIntegerField(null=True)
    space_id = models.BigIntegerField(null=True)
    enterprise_id = models.BigIntegerField(null=True)
    invitee_uid = models.CharField(max_length=128, null=True)
    role = models.SmallIntegerField(default=3, null=True)
    invitee_nickname = models.CharField(max_length=64, null=True)
    inviter_uid = models.CharField(max_length=128, null=True)
    expire_time = models.DateTimeField(null=True)
    status = models.SmallIntegerField(default=1, null=True)

    class Meta:
        db_table = "agent_invite_record"


class Application(TimedModel):
    enterprise_id = models.BigIntegerField(null=True)
    space_id = models.BigIntegerField(null=True)
    apply_uid = models.CharField(max_length=128, null=True)
    apply_nickname = models.CharField(max_length=64, null=True)
    apply_time = models.DateTimeField(default=timezone.now, null=True)
    status = models.SmallIntegerField(default=1, null=True)
    audit_time = models.DateTimeField(null=True)
    audit_uid = models.CharField(max_length=128, null=True)

    class Meta:
        db_table = "agent_apply_record"


class Notification(models.Model):
    type = models.CharField(max_length=16, default="SYSTEM")
    title = models.CharField(max_length=255)
    body = models.TextField(null=True)
    template_code = models.CharField(max_length=64, null=True)
    payload = models.JSONField(null=True)
    creator_uid = models.CharField(max_length=128, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    expire_at = models.DateTimeField(null=True)
    meta = models.JSONField(null=True)

    class Meta:
        db_table = "notifications"


class UserNotification(models.Model):
    notification_id = models.BigIntegerField()
    receiver_uid = models.CharField(max_length=128)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True)
    received_at = models.DateTimeField(default=timezone.now)
    extra = models.JSONField(null=True)

    class Meta:
        db_table = "user_notifications"
        unique_together = [("notification_id", "receiver_uid")]


class BroadcastRead(models.Model):
    receiver_uid = models.CharField(max_length=128)
    notification_id = models.BigIntegerField()
    read_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "user_broadcast_read"
        unique_together = [("notification_id", "receiver_uid")]


class GroupVisibility(models.Model):
    uid = models.CharField(max_length=128, null=True)
    type = models.IntegerField(null=True)
    user_id = models.CharField(max_length=128, null=True)
    relation_id = models.CharField(max_length=200, null=True)
    create_time = models.DateTimeField(default=timezone.now)
    space_id = models.BigIntegerField(null=True)

    class Meta:
        db_table = "group_visibility"
