import logging
from datetime import timedelta

from django.conf import settings
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.utils import timezone

from astron_console.accounts.models import UserProfile

from .models import (
    Enterprise,
    EnterpriseMember,
    Invitation,
    Notification,
    Space,
    SpaceMember,
    UserNotification,
)

logger = logging.getLogger(__name__)
DEFAULT_LIMITS = {
    "free": {"space_count": 1, "user_count": 50},
    "pro": {"space_count": 10, "user_count": 100},
    "team": {"space_count": 10000, "user_count": 100},
    "enterprise": {"space_count": 10000, "user_count": 500},
}


def profile(uid):
    if not isinstance(uid, str) or not uid or len(uid) > 128:
        raise ValidationError("无效用户 UID")
    item = UserProfile.objects.filter(uid=uid, deleted=0, account_status=1).first()
    if not item:
        raise ValidationError("用户不存在或已停用")
    return item


def limit_for(kind):
    return {**DEFAULT_LIMITS[kind], **getattr(settings, "CONSOLE_SPACE_LIMITS", {}).get(kind, {})}


def member_limit(space=None, enterprise=None):
    if space and space.enterprise_id:
        enterprise = Enterprise.objects.get(pk=space.enterprise_id)
    if enterprise:
        kind = "team" if enterprise.service_type == 1 else "enterprise"
        members = EnterpriseMember.objects.filter(enterprise_id=enterprise.pk).count()
        pending = (
            Invitation.objects.filter(
                enterprise_id=enterprise.pk, status=1, expire_time__gt=timezone.now()
            )
            .values("invitee_uid")
            .distinct()
            .count()
        )
    else:
        kind = "free" if space.type == 1 else "pro"
        owned = Space.objects.filter(
            uid=space.uid, deleted=0, type=space.type, enterprise_id__isnull=True
        )
        members = (
            SpaceMember.objects.filter(space_id__in=owned.values("id")).exclude(role=1).count()
        )
        pending = Invitation.objects.filter(
            space_id__in=owned.values("id"), status=1, expire_time__gt=timezone.now()
        ).count()
    total = limit_for(kind)["user_count"]
    return {"total": total, "used": members + pending, "remain": max(0, total - members - pending)}


def notify(uid, title, *, creator_uid, body="", payload=None, template=None):
    notification = Notification.objects.create(
        title=title, body=body, creator_uid=creator_uid, payload=payload, template_code=template
    )
    UserNotification.objects.create(notification_id=notification.pk, receiver_uid=uid)
    return notification


def add_member(model, field, container_id, uid, role):
    user = profile(uid)
    member, _ = model.objects.get_or_create(
        **{field: container_id, "uid": uid},
        defaults={"nickname": (user.nickname or user.username or "")[:64], "role": role},
    )
    return member


def create_invites(uid, targets, *, space=None, enterprise=None):
    if not isinstance(targets, list) or not targets or len(targets) > 500:
        raise ValidationError("请选择要邀请的成员")
    if space:
        Space.objects.select_for_update().get(pk=space.pk)
        if space.enterprise_id:
            enterprise = Enterprise.objects.select_for_update().get(pk=space.enterprise_id)
        model, field, container_id = SpaceMember, "space_id", space.pk
    else:
        Enterprise.objects.select_for_update().get(pk=enterprise.pk)
        model, field, container_id = EnterpriseMember, "enterprise_id", enterprise.pk
    if len(targets) > member_limit(space, enterprise)["remain"]:
        raise ValidationError("成员名额不足")
    seen = set()
    result = []
    for target in targets:
        if not isinstance(target, dict) or str(target.get("role")) not in ("2", "3"):
            raise ValidationError("邀请角色必须为管理员或成员")
        invitee = profile(target.get("uid"))
        if (
            invitee.uid in seen
            or model.objects.filter(**{field: container_id, "uid": invitee.uid}).exists()
        ):
            raise ValidationError("用户已经加入或重复邀请")
        seen.add(invitee.uid)
        filters = {
            field: container_id,
            "type": 1 if space else 2,
            "invitee_uid": invitee.uid,
            "status": 1,
            "expire_time__gt": timezone.now(),
        }
        if Invitation.objects.filter(**filters).exists():
            raise ValidationError("用户已有待处理邀请")
        invitation = Invitation.objects.create(
            type=1 if space else 2,
            space_id=space.pk if space else None,
            enterprise_id=enterprise.pk if enterprise else None,
            invitee_uid=invitee.uid,
            invitee_nickname=(invitee.nickname or invitee.username or "")[:64],
            inviter_uid=uid,
            role=int(target["role"]),
            expire_time=timezone.now() + timedelta(days=7),
        )
        notify(
            invitee.uid,
            "空间邀请" if space else "团队邀请",
            creator_uid=uid,
            body=f"邀请加入{(space or enterprise).name}",
            payload={
                "inviteId": invitation.pk,
                "url": f"/space/invitations?inviteId={invitation.pk}",
            },
            template="RESOURCE_INVITATION",
        )
        result.append(invitation.pk)
    logger.info("Created %d invitations by uid=%s", len(result), uid)
    return result


@transaction.atomic
def decide_invitation(uid, invitation_id, accept):
    invite = Invitation.objects.select_for_update().filter(pk=invitation_id).first()
    if not invite or invite.invitee_uid != uid:
        raise PermissionDenied("不是此邀请的接收人")
    if invite.status != 1 or not invite.expire_time or invite.expire_time <= timezone.now():
        raise ValidationError("邀请已处理或已过期")
    if accept:
        if invite.type == 1:
            space = Space.objects.select_for_update().filter(pk=invite.space_id, deleted=0).first()
            if not space:
                raise ValidationError("空间不存在")
            if space.enterprise_id:
                enterprise = (
                    Enterprise.objects.select_for_update()
                    .filter(pk=space.enterprise_id, deleted=0)
                    .first()
                )
                if not enterprise or (
                    enterprise.expire_time and enterprise.expire_time <= timezone.now()
                ):
                    raise ValidationError("团队不可用")
                add_member(EnterpriseMember, "enterprise_id", enterprise.pk, uid, 3)
            add_member(SpaceMember, "space_id", space.pk, uid, invite.role)
        elif invite.type == 2:
            enterprise = (
                Enterprise.objects.select_for_update()
                .filter(pk=invite.enterprise_id, deleted=0)
                .first()
            )
            if not enterprise or (
                enterprise.expire_time and enterprise.expire_time <= timezone.now()
            ):
                raise ValidationError("团队不可用")
            add_member(EnterpriseMember, "enterprise_id", enterprise.pk, uid, invite.role)
        else:
            raise ValidationError("无效邀请类型")
    invite.status = 3 if accept else 2
    invite.update_time = timezone.now()
    invite.save(update_fields=["status", "update_time"])
    logger.info("Invitation %s decided status=%s uid=%s", invite.pk, invite.status, uid)
