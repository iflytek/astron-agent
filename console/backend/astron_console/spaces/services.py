import logging
from datetime import timedelta

from django.conf import settings
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.db.models import Q
from django.http import Http404
from django.utils import timezone

from astron_console.accounts.models import User, UserProfile

from .models import (
    Enterprise,
    EnterpriseMember,
    Invitation,
    Notification,
    Space,
    SpaceMember,
    UserNotification,
)
from .permissions import require_enterprise_permission, require_space_permission

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


def lock_enterprise(enterprise_id):
    enterprise = Enterprise.objects.select_for_update().filter(pk=enterprise_id, deleted=0).first()
    if enterprise is None:
        raise Http404("团队不存在")
    return enterprise


def lock_space(space_id):
    space = Space.objects.filter(pk=space_id, deleted=0).first()
    if space is None:
        raise Http404("空间不存在")
    if space.enterprise_id:
        lock_enterprise(space.enterprise_id)
    elif space.uid:
        UserProfile.objects.select_for_update().filter(uid=space.uid).first()
    space = Space.objects.select_for_update().filter(pk=space_id, deleted=0).first()
    if space is None:
        raise Http404("空间不存在")
    return space


def live_invitations(now):
    return Q(status=1, expire_time__gt=now)


def expired_invitations(now):
    return Q(status=1) & (Q(expire_time__isnull=True) | Q(expire_time__lte=now))


def enterprise_invitations(enterprise_id):
    space_ids = Space.objects.filter(enterprise_id=enterprise_id, deleted=0).values("id")
    return Invitation.objects.filter(
        Q(type=2, enterprise_id=enterprise_id) | Q(type=1, space_id__in=space_ids)
    )


def team_reservations(enterprise, members):
    return (
        enterprise_invitations(enterprise.pk)
        .filter(live_invitations(timezone.now()), invitee_uid__isnull=False)
        .exclude(invitee_uid__in=members.exclude(uid__isnull=True).values("uid"))
    )


def member_limit(space=None, enterprise=None, *, include_pending=True):
    if space and space.enterprise_id:
        enterprise = Enterprise.objects.get(pk=space.enterprise_id)
    if enterprise:
        kind = "team" if enterprise.service_type == 1 else "enterprise"
        team_members = EnterpriseMember.objects.filter(enterprise_id=enterprise.pk)
        members = team_members.count()
        pending = (
            team_reservations(enterprise, team_members).values("invitee_uid").distinct().count()
            if include_pending
            else 0
        )
    else:
        kind = "free" if space.type == 1 else "pro"
        owned = Space.objects.filter(
            uid=space.uid, deleted=0, type=space.type, enterprise_id__isnull=True
        )
        members = (
            SpaceMember.objects.filter(space_id__in=owned.values("id")).exclude(role=1).count()
        )
        pending = (
            Invitation.objects.filter(
                live_invitations(timezone.now()), type=1, space_id__in=owned.values("id")
            ).count()
            if include_pending
            else 0
        )
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
        if space.enterprise_id:
            enterprise = Enterprise.objects.get(pk=space.enterprise_id)
        model, field, container_id = SpaceMember, "space_id", space.pk
    else:
        model, field, container_id = EnterpriseMember, "enterprise_id", enterprise.pk
    # The calling view holds the team or personal quota owner lock.
    now = timezone.now()
    available_slots = member_limit(space, enterprise)["remain"]
    team_members = (
        EnterpriseMember.objects.filter(enterprise_id=enterprise.pk) if enterprise else None
    )
    reservations = team_reservations(enterprise, team_members) if enterprise else None
    if enterprise:
        target_uids = [
            item["uid"]
            for item in targets
            if isinstance(item, dict) and isinstance(item.get("uid"), str)
        ]
        existing_team_uids = set(
            team_members.filter(uid__in=target_uids).values_list("uid", flat=True)
        )
        reserved_uids = set(
            reservations.filter(invitee_uid__in=target_uids).values_list("invitee_uid", flat=True)
        )
        if space and set(target_uids) - existing_team_uids:
            require_enterprise_permission(
                uid, enterprise.pk, "InviteRecordController_enterpriseInvite_POST"
            )
    else:
        existing_team_uids = set()
        reserved_uids = set()
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
        if invitee.uid not in existing_team_uids and invitee.uid not in reserved_uids:
            if available_slots <= 0:
                raise ValidationError("成员名额不足")
            available_slots -= 1
        filters = {
            field: container_id,
            "type": 1 if space else 2,
            "invitee_uid": invitee.uid,
        }
        if Invitation.objects.filter(live_invitations(now), **filters).exists():
            raise ValidationError("用户已有待处理邀请")
        invitation = Invitation.objects.create(
            type=1 if space else 2,
            space_id=space.pk if space else None,
            enterprise_id=enterprise.pk if enterprise else None,
            invitee_uid=invitee.uid,
            invitee_nickname=(invitee.nickname or invitee.username or "")[:64],
            inviter_uid=uid,
            role=int(target["role"]),
            expire_time=now + timedelta(days=7),
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
    invite = Invitation.objects.filter(pk=invitation_id, invitee_uid=uid).first()
    if not invite or invite.invitee_uid != uid:
        raise PermissionDenied("不是此邀请的接收人")
    now = timezone.now()
    if invite.status != 1 or not invite.expire_time or invite.expire_time <= now:
        raise ValidationError("邀请已处理或已过期")
    space = None
    enterprise = None
    if accept:
        if invite.type == 1:
            space = lock_space(invite.space_id)
            if invite.enterprise_id is not None and invite.enterprise_id != space.enterprise_id:
                raise ValidationError("邀请所属团队已变更")
            if space.enterprise_id:
                enterprise = Enterprise.objects.get(pk=space.enterprise_id)
        elif invite.type == 2:
            enterprise = lock_enterprise(invite.enterprise_id)
        else:
            raise ValidationError("无效邀请类型")
    invite = Invitation.objects.select_for_update().get(pk=invitation_id)
    if invite.status != 1 or not invite.expire_time or invite.expire_time <= timezone.now():
        raise ValidationError("邀请已处理或已过期")
    if accept:
        profile(invite.inviter_uid)
        if not User.objects.filter(pk=invite.inviter_uid, is_active=True).exists():
            raise PermissionDenied("邀请人已停用")
        if enterprise and enterprise.expire_time and enterprise.expire_time <= timezone.now():
            raise ValidationError("团队不可用")
        needs_team_seat = (
            enterprise
            and not EnterpriseMember.objects.filter(enterprise_id=enterprise.pk, uid=uid).exists()
        )
        if space:
            actor = require_space_permission(
                invite.inviter_uid, space.pk, "InviteRecordController_spaceInvite_POST"
            )
            needs_personal_seat = (
                not enterprise
                and not SpaceMember.objects.filter(space_id=space.pk, uid=uid).exists()
            )
        else:
            needs_personal_seat = False
            actor = require_enterprise_permission(
                invite.inviter_uid, enterprise.pk, "InviteRecordController_enterpriseInvite_POST"
            )
        if invite.role not in (2, 3) or (invite.role == 2 and actor.role != 1):
            raise PermissionDenied("邀请人已无权授予此角色")
        if space and needs_team_seat:
            require_enterprise_permission(
                invite.inviter_uid, enterprise.pk, "InviteRecordController_enterpriseInvite_POST"
            )
        if (needs_team_seat or needs_personal_seat) and not member_limit(
            space, enterprise, include_pending=False
        )["remain"]:
            raise ValidationError("成员名额不足")
        if enterprise:
            add_member(
                EnterpriseMember, "enterprise_id", enterprise.pk, uid, 3 if space else invite.role
            )
        if space:
            add_member(SpaceMember, "space_id", space.pk, uid, invite.role)
    invite.status = 3 if accept else 2
    invite.update_time = timezone.now()
    invite.save(update_fields=["status", "update_time"])
    logger.info("Invitation %s decided status=%s uid=%s", invite.pk, invite.status, uid)
