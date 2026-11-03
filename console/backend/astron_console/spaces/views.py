import json
import logging
from datetime import timedelta

from django.core.exceptions import PermissionDenied, ValidationError
from django.core.paginator import Paginator
from django.db import transaction
from django.db.models import Q
from django.http import Http404
from django.utils import timezone

from astron_console.accounts.models import UserProfile
from astron_console.http import api_endpoint

from .models import (
    Application,
    BroadcastRead,
    Enterprise,
    EnterpriseMember,
    Invitation,
    Notification,
    Space,
    SpaceMember,
    UserNotification,
)
from .permissions import (
    enterprise_membership,
    identifier,
    require_enterprise_permission,
    require_space_permission,
    resolve_scope,
    space_membership,
)
from .services import (
    add_member,
    create_invites,
    decide_invitation,
    limit_for,
    member_limit,
    notify,
    profile,
)

logger = logging.getLogger(__name__)


def camel(value):
    first, *rest = value.replace("-", "_").split("_")
    return first + "".join(word.title() for word in rest)


def record(obj):
    return {camel(field.name): getattr(obj, field.name) for field in obj._meta.fields}


def nickname(uid):
    user = UserProfile.objects.filter(uid=uid).first()
    return (user.nickname or user.username or "") if user else ""


def text(value, maximum, *, required=False):
    if not isinstance(value, str) or len(value) > maximum or (required and not value.strip()):
        raise ValidationError("字段内容或长度无效")
    return value.strip()


def params(request):
    return {**request.GET.dict(), **request.payload}


def pagination(query, values, serializer=record):
    try:
        number = max(1, int(values.get("pageNum", values.get("pageIndex", 1))))
        size = max(1, min(100, int(values.get("pageSize", 20))))
    except (TypeError, ValueError) as exc:
        raise ValidationError("分页参数无效") from exc
    pager = Paginator(query, size)
    page = pager.get_page(number)
    return {
        "records": [serializer(item) for item in page],
        "total": pager.count,
        "current": page.number,
        "size": size,
        "pages": pager.num_pages,
    }


def space_data(space, uid):
    member = SpaceMember.objects.filter(space_id=space.pk, uid=uid).first()
    result = record(space)
    applying = Application.objects.filter(space_id=space.pk, apply_uid=uid, status=1).exists()
    result.update(
        ownerName=nickname(space.uid),
        memberCount=SpaceMember.objects.filter(space_id=space.pk).count(),
        userRole=member.role if member else None,
        role=member.role if member else None,
        applyStatus=1 if member else (3 if applying else 2),
        lastVisitTime=member.last_visit_time if member else None,
    )
    return result


def enterprise_data(enterprise, uid):
    member = EnterpriseMember.objects.filter(enterprise_id=enterprise.pk, uid=uid).first()
    return {
        **record(enterprise),
        "role": member.role if member else None,
        "officerName": nickname(enterprise.uid),
    }


def member_data(member):
    user = UserProfile.objects.filter(uid=member.uid).first()
    return {
        **record(member),
        "nickname": nickname(member.uid),
        "username": user.username if user else "",
        "avatar": user.avatar if user else "",
    }


def invitation_data(invite):
    result = record(invite)
    space = Space.objects.filter(pk=invite.space_id).first() if invite.space_id else None
    enterprise = (
        Enterprise.objects.filter(pk=invite.enterprise_id).first() if invite.enterprise_id else None
    )
    inviter = UserProfile.objects.filter(uid=invite.inviter_uid).first()
    invitee = UserProfile.objects.filter(uid=invite.invitee_uid).first()
    owner_uid = (space or enterprise).uid if (space or enterprise) else None
    result.update(
        inviterName=nickname(invite.inviter_uid),
        inviterAvatar=inviter.avatar if inviter else "",
        inviteeAvatar=invitee.avatar if invitee else "",
        ownerName=nickname(owner_uid),
        spaceName=space.name if space else "",
        spaceDescription=space.description if space else "",
        spaceAvatar=space.avatar_url if space else "",
        enterpriseName=enterprise.name if enterprise else "",
        enterpriseAvatar=enterprise.avatar_url if enterprise else "",
        isBelong=(
            SpaceMember.objects.filter(space_id=space.pk, uid=invite.invitee_uid).exists()
            if space
            else EnterpriseMember.objects.filter(
                enterprise_id=invite.enterprise_id, uid=invite.invitee_uid
            ).exists()
        ),
    )
    if invite.status == 1 and invite.expire_time and invite.expire_time <= timezone.now():
        result["status"] = 5
    return result


def enterprise_context(request, action, *, controller="EnterpriseController", method=None):
    eid = identifier(request.headers.get("enterprise-id"), required=True)
    Enterprise.objects.select_for_update().filter(pk=eid).first()
    member = require_enterprise_permission(
        request.user.pk, eid, f"{controller}_{camel(action)}_{method or request.method}"
    )
    return Enterprise.objects.get(pk=eid), member


def space_context(request, action, *, controller="SpaceController", method=None):
    scope = resolve_scope(request, require_space=True)
    Space.objects.select_for_update().filter(pk=scope.space_id).first()
    member = require_space_permission(
        scope.uid, scope.space_id, f"{controller}_{camel(action)}_{method or request.method}"
    )
    return Space.objects.get(pk=scope.space_id), member


SPACE_METHODS = {
    "accessible-list": "GET",
    "check-name": "GET",
    "visit-space": "POST",
    "recent-visit-list": "GET",
    "get-last-visit-space": "GET",
    "personal-list": "GET",
    "personal-self-list": "GET",
    "detail": "GET",
    "delete-personal-space": "DELETE",
    "delete-corporate-space": "DELETE",
    "create-personal-space": "POST",
    "create-corporate-space": "POST",
    "update-personal-space": "POST",
    "update-corporate-space": "POST",
    "corporate-list": "GET",
    "corporate-join-list": "GET",
    "corporate-count": "GET",
    "oss-version-user-upgrade": "POST",
}


def check_method(request, action, allowed):
    if action not in allowed:
        raise Http404()
    if request.method != allowed[action]:
        raise ValidationError("请求方法无效")


@api_endpoint(["GET", "POST", "DELETE"])
@transaction.atomic
def spaces(request, action):
    check_method(request, action, SPACE_METHODS)
    values = params(request)
    uid = request.user.pk
    if action == "check-name":
        return (
            Space.objects.filter(name=values.get("name"), deleted=0)
            .exclude(pk=identifier(values.get("id")))
            .exists()
        )
    if action == "accessible-list":
        ids = SpaceMember.objects.filter(uid=uid).values("space_id")
        enterprise_ids = EnterpriseMember.objects.filter(uid=uid).values("enterprise_id")
        query = Space.objects.filter(pk__in=ids, deleted=0).filter(
            Q(enterprise_id__isnull=True)
            | Q(
                enterprise_id__in=Enterprise.objects.filter(
                    pk__in=enterprise_ids, deleted=0
                ).values("id")
            )
        )
        return [space_data(item, uid) for item in query.order_by("name")]
    if action in ("create-personal-space", "create-corporate-space"):
        # Lock the actor to serialize quota/name/owner checks for this user's creations.
        UserProfile.objects.select_for_update().get(uid=uid)
        enterprise = None
        if action == "create-corporate-space":
            enterprise, _ = enterprise_context(request, action, controller="SpaceController")
            Enterprise.objects.select_for_update().get(pk=enterprise.pk)
            kind = "team" if enterprise.service_type == 1 else "enterprise"
            query = Space.objects.filter(enterprise_id=enterprise.pk, deleted=0)
            space_type = 3 if kind == "team" else 4
        else:
            user = profile(uid)
            space_type = 2 if user.enterprise_service_type else 1
            kind = "pro" if space_type == 2 else "free"
            query = Space.objects.filter(
                uid=uid, enterprise_id__isnull=True, type=space_type, deleted=0
            )
        if query.count() >= limit_for(kind)["space_count"]:
            raise ValidationError("空间数量已达到上限")
        name = text(values.get("name"), 50, required=True)
        if Space.objects.filter(name=name, deleted=0).exists():
            raise ValidationError("空间名称已存在")
        space = Space.objects.create(
            name=name,
            description=text(values.get("description", ""), 2000),
            avatar_url=text(values.get("avatarUrl", ""), 1024),
            uid=uid,
            enterprise_id=enterprise.pk if enterprise else None,
            type=space_type,
        )
        add_member(SpaceMember, "space_id", space.pk, uid, 1)
        logger.info("Space created id=%s uid=%s", space.pk, uid)
        return space.pk
    if action == "oss-version-user-upgrade":
        UserProfile.objects.filter(uid=uid).update(enterprise_service_type=2)
        return True
    if action == "visit-space":
        sid = identifier(values.get("spaceId"))
        if sid is None:
            request.session["last_space_id"] = None
            request.session["last_enterprise_id"] = None
            return None
        space, _ = space_membership(uid, sid)
        SpaceMember.objects.filter(space_id=sid, uid=uid).update(last_visit_time=timezone.now())
        request.session["last_space_id"] = sid
        request.session["last_enterprise_id"] = space.enterprise_id
        return space_data(space, uid)
    if action == "get-last-visit-space":
        sid = request.session.get("last_space_id")
        if sid and SpaceMember.objects.filter(space_id=sid, uid=uid).exists():
            space = Space.objects.filter(pk=sid, deleted=0).first()
            if space:
                space_membership(uid, sid)
                return space_data(space, uid)
        return None
    if action in ("recent-visit-list", "personal-list", "personal-self-list"):
        ids = SpaceMember.objects.filter(uid=uid).values("space_id")
        query = Space.objects.filter(deleted=0, pk__in=ids, enterprise_id__isnull=True)
        if action == "personal-self-list":
            query = query.filter(uid=uid)
        if values.get("name"):
            query = query.filter(name__icontains=values["name"])
        result = [space_data(item, uid) for item in query.order_by("-id")]
        if action == "recent-visit-list":
            result = sorted(
                (x for x in result if x["lastVisitTime"]),
                key=lambda x: x["lastVisitTime"],
                reverse=True,
            )[:10]
        return result
    if action.startswith("corporate-"):
        enterprise, _ = enterprise_context(request, action, controller="SpaceController")
        query = Space.objects.filter(enterprise_id=enterprise.pk, deleted=0)
        joined = query.filter(pk__in=SpaceMember.objects.filter(uid=uid).values("space_id"))
        if action == "corporate-count":
            return {"total": query.count(), "joined": joined.count()}
        if action == "corporate-join-list":
            query = joined
        if values.get("name"):
            query = query.filter(name__icontains=values["name"])
        return [space_data(item, uid) for item in query.order_by("-id")]
    if action == "detail":
        space, _ = space_context(request, action)
        return space_data(space, uid)
    sid = identifier(values.get("id", values.get("spaceId")), required=True)
    space = Space.objects.select_for_update().filter(pk=sid, deleted=0).first()
    if not space:
        raise Http404()
    if "corporate" in action:
        enterprise, _ = enterprise_context(request, action, controller="SpaceController")
        if space.enterprise_id != enterprise.pk:
            raise PermissionDenied("空间不属于此团队")
    else:
        if space.enterprise_id is not None:
            raise PermissionDenied("请使用团队空间操作")
        _, member = space_membership(uid, sid)
        if action == "update-personal-space":
            scope = resolve_scope(request, require_space=True)
            if scope.space_id != sid:
                raise PermissionDenied("空间不匹配")
            require_space_permission(uid, sid, "SpaceController_updatePersonalSpace_POST")
        elif member.role != 1:
            raise PermissionDenied("只有空间所有者可以删除")
    if action.startswith("delete-"):
        space.deleted = 1
        Invitation.objects.filter(space_id=sid, status=1).update(status=4)
        # Do not cascade into Agent/workflow or object storage during the resource migration.
        logger.info("Space soft deleted id=%s uid=%s", sid, uid)
    else:
        name = text(values.get("name"), 50, required=True)
        if Space.objects.filter(name=name, deleted=0).exclude(pk=sid).exists():
            raise ValidationError("空间名称已存在")
        space.name = name
        space.description = text(values.get("description", ""), 2000)
        space.avatar_url = text(values.get("avatarUrl", ""), 1024)
    space.update_time = timezone.now()
    space.save()
    return True


ENTERPRISE_METHODS = {
    "visit-enterprise": "POST",
    "check-need-create-team": "GET",
    "check-certification": "GET",
    "create": "POST",
    "check-name": "GET",
    "update-name": "POST",
    "update-logo": "POST",
    "update-avatar": "POST",
    "detail": "GET",
    "join-list": "GET",
}


@api_endpoint(["GET", "POST"])
@transaction.atomic
def enterprises(request, action):
    check_method(request, action, ENTERPRISE_METHODS)
    uid, values = request.user.pk, params(request)
    if action == "check-name":
        return (
            Enterprise.objects.filter(name=values.get("name"), deleted=0)
            .exclude(pk=identifier(values.get("id")))
            .exists()
        )
    if action == "check-need-create-team":
        return (
            0
            if EnterpriseMember.objects.filter(
                uid=uid, enterprise_id__in=Enterprise.objects.filter(deleted=0).values("id")
            ).exists()
            else 1
        )
    if action == "check-certification":
        eid = identifier(request.headers.get("enterprise-id"))
        if not eid:
            return False
        enterprise, _ = enterprise_membership(uid, eid)
        return enterprise.org_id is not None
    if action == "join-list":
        query = Enterprise.objects.filter(
            deleted=0, pk__in=EnterpriseMember.objects.filter(uid=uid).values("enterprise_id")
        )
        return [enterprise_data(item, uid) for item in query.order_by("-id")]
    if action == "visit-enterprise":
        eid = identifier(values.get("enterpriseId"))
        if eid:
            enterprise_membership(uid, eid)
        request.session["last_enterprise_id"] = eid
        return True
    if action == "create":
        UserProfile.objects.select_for_update().get(uid=uid)
        name = text(values.get("name"), 50, required=True)
        if Enterprise.objects.filter(deleted=0).filter(Q(name=name) | Q(uid=uid)).exists():
            raise ValidationError("团队名称已存在或您已创建团队")
        enterprise = Enterprise.objects.create(
            name=name,
            uid=uid,
            avatar_url=text(values.get("avatarUrl", ""), 1024),
            service_type=2,
            expire_time=timezone.now() + timedelta(days=365),
        )
        add_member(EnterpriseMember, "enterprise_id", enterprise.pk, uid, 1)
        logger.info("Enterprise created id=%s uid=%s", enterprise.pk, uid)
        return enterprise.pk
    enterprise, _ = enterprise_context(request, action)
    if action == "detail":
        return enterprise_data(enterprise, uid)
    enterprise = Enterprise.objects.select_for_update().get(pk=enterprise.pk)
    if action == "update-name":
        name = text(values.get("name"), 50, required=True)
        if Enterprise.objects.filter(name=name, deleted=0).exclude(pk=enterprise.pk).exists():
            raise ValidationError("团队名称已存在")
        enterprise.name = name
    elif action == "update-logo":
        enterprise.logo_url = text(values.get("logoUrl"), 1024)
    else:
        enterprise.avatar_url = text(values.get("avatarUrl"), 1024)
    enterprise.update_time = timezone.now()
    enterprise.save()
    return True


MEMBER_METHODS = {
    "page": "POST",
    "remove": "DELETE",
    "update-role": "POST",
    "quit-space": "POST",
    "quit-enterprise": "POST",
    "get-user-limit": "GET",
    "list-space-member": "GET",
    "transfer-space": "POST",
    "enterprise-add": "POST",
}


@api_endpoint(["GET", "POST", "DELETE"])
@transaction.atomic
def members(request, kind, action):
    check_method(request, action, MEMBER_METHODS)
    uid, values = request.user.pk, params(request)
    if kind == "space":
        container, actor = space_context(request, action, controller="SpaceUserController")
        model, field = SpaceMember, "space_id"
        Space.objects.select_for_update().get(pk=container.pk)
    else:
        if action in ("quit-space", "list-space-member", "transfer-space", "enterprise-add"):
            raise Http404()
        container, actor = enterprise_context(
            request, action, controller="EnterpriseUserController"
        )
        model, field = EnterpriseMember, "enterprise_id"
        Enterprise.objects.select_for_update().get(pk=container.pk)
    query = model.objects.filter(**{field: container.pk}).order_by("role", "id")
    if action == "get-user-limit":
        return (
            member_limit(space=container) if kind == "space" else member_limit(enterprise=container)
        )
    if action == "list-space-member":
        return [member_data(item) for item in query.exclude(role=1)]
    if action == "page":
        if values.get("nickname"):
            matching = UserProfile.objects.filter(
                Q(nickname__icontains=values["nickname"])
                | Q(username__icontains=values["nickname"])
            ).values("uid")
            query = query.filter(uid__in=matching)
        if values.get("role") not in (None, "", "all", "0", 0):
            query = query.filter(role=identifier(values["role"]))
        return pagination(query, values, member_data)
    target_uid = uid if action.startswith("quit-") else values.get("uid")
    if not isinstance(target_uid, str) or not target_uid:
        raise ValidationError("缺少用户 UID")
    if action == "enterprise-add":
        if not container.enterprise_id:
            raise ValidationError("不是团队空间")
        enterprise_membership(target_uid, container.enterprise_id)
        role = values.get("role")
        if str(role) not in ("2", "3"):
            raise ValidationError("无效成员角色")
        if query.filter(uid=target_uid).exists():
            raise ValidationError("用户已经是空间成员")
        if member_limit(space=container)["remain"] < 1:
            raise ValidationError("成员名额不足")
        add_member(model, field, container.pk, target_uid, int(role))
        return True
    target = query.select_for_update().filter(uid=target_uid).first()
    if not target:
        raise Http404("成员不存在")
    if action == "transfer-space":
        if actor.role != 1 or target.role == 1:
            raise PermissionDenied("只有所有者可以转让给其他成员")
        if not container.enterprise_id:
            raise ValidationError("个人空间不支持转让")
        actor.role = 2
        actor.save(update_fields=["role"])
        target.role = 1
        target.save(update_fields=["role"])
        container.uid = target.uid
        container.save(update_fields=["uid"])
    elif target.role == 1:
        raise PermissionDenied("不能移除或降级所有者")
    elif not action.startswith("quit-") and actor.role >= target.role:
        raise PermissionDenied("不能管理同级或更高角色")
    elif action == "update-role":
        role = values.get("role")
        if str(role) not in ("2", "3") or (actor.role != 1 and int(role) <= actor.role):
            raise PermissionDenied("不能授予此角色")
        target.role = int(role)
        target.update_time = timezone.now()
        target.save(update_fields=["role", "update_time"])
    else:
        if kind == "enterprise":
            spaces_owned = Space.objects.filter(enterprise_id=container.pk, deleted=0)
            if SpaceMember.objects.filter(
                space_id__in=spaces_owned.values("id"), uid=target_uid, role=1
            ).exists():
                raise ValidationError("请先转让所属团队空间")
            SpaceMember.objects.filter(
                space_id__in=spaces_owned.values("id"), uid=target_uid
            ).delete()
        target.delete()
    logger.info(
        "Membership changed kind=%s id=%s action=%s actor=%s target=%s",
        kind,
        container.pk,
        action,
        uid,
        target_uid,
    )
    return True


INVITE_METHODS = {
    "space-search-user": "GET",
    "space-search-username": "GET",
    "enterprise-search-user": "GET",
    "enterprise-search-username": "GET",
    "space-invite": "POST",
    "enterprise-invite": "POST",
    "space-invite-list": "POST",
    "enterprise-invite-list": "POST",
    "accept-invite": "POST",
    "refuse-invite": "POST",
    "revoke-space-invite": "POST",
    "revoke-enterprise-invite": "POST",
    "get-invite-by-param": "GET",
    "my-invitations": "GET",
    "enterprise-batch-search-username": "POST",
}


@api_endpoint(["GET", "POST"])
@transaction.atomic
def invitations(request, action):
    check_method(request, action, INVITE_METHODS)
    uid, values = request.user.pk, params(request)
    if action == "my-invitations":
        return [
            invitation_data(item)
            for item in Invitation.objects.filter(invitee_uid=uid).order_by("-id")[:100]
        ]
    if action == "get-invite-by-param":
        item = Invitation.objects.filter(
            pk=identifier(values.get("param"), required=True), invitee_uid=uid
        ).first()
        if not item:
            raise Http404()
        return invitation_data(item)
    if action in ("accept-invite", "refuse-invite"):
        decide_invitation(
            uid, identifier(values.get("inviteId"), required=True), action == "accept-invite"
        )
        return True
    enterprise_kind = "enterprise" in action
    if enterprise_kind:
        container, actor = enterprise_context(request, action, controller="InviteRecordController")
        field, model = "enterprise_id", EnterpriseMember
        Enterprise.objects.select_for_update().get(pk=container.pk)
    else:
        container, actor = space_context(request, action, controller="InviteRecordController")
        field, model = "space_id", SpaceMember
        Space.objects.select_for_update().get(pk=container.pk)
    query = Invitation.objects.filter(**{field: container.pk}, type=2 if enterprise_kind else 1)
    if action.startswith("revoke-"):
        invite = (
            query.select_for_update()
            .filter(pk=identifier(values.get("inviteId"), required=True))
            .first()
        )
        if not invite:
            raise Http404()
        if invite.status != 1:
            raise ValidationError("邀请已经处理")
        invite.status = 4
        invite.update_time = timezone.now()
        invite.save(update_fields=["status", "update_time"])
        return True
    if action.endswith("invite-list"):
        if values.get("nickname"):
            query = query.filter(invitee_nickname__icontains=values["nickname"])
        if values.get("status") not in (None, "", "all", "0", 0):
            query = query.filter(status=identifier(values["status"]))
        return pagination(query.order_by("-id"), values, invitation_data)
    if action.endswith("-invite"):
        targets = values.get("members")
        if (
            isinstance(targets, list)
            and actor.role != 1
            and any(str(item.get("role")) == "2" for item in targets if isinstance(item, dict))
        ):
            raise PermissionDenied("只有所有者可邀请管理员")
        return create_invites(
            uid, targets, **({"enterprise": container} if enterprise_kind else {"space": container})
        )
    if action == "enterprise-batch-search-username":
        # Frontend sends a text list; no spreadsheet parsing or object-storage artifact is required.
        names = values.get("usernames")
        if (
            not isinstance(names, list)
            or not names
            or len(names) > 500
            or any(not isinstance(name, str) or len(name) > 255 for name in names)
        ):
            raise ValidationError("请输入最多500个用户名")
        users = UserProfile.objects.filter(username__in=names, account_status=1, deleted=0)
    else:
        key = "username" if "username" in action else "mobile"
        value = text(values.get(key), 255, required=True)
        users = UserProfile.objects.filter(
            **{f"{key}__icontains": value}, account_status=1, deleted=0
        ).order_by("id")[:50]
    result = []
    for user in users:
        belonged = model.objects.filter(**{field: container.pk}, uid=user.uid).exists()
        inviting = query.filter(
            invitee_uid=user.uid, status=1, expire_time__gt=timezone.now()
        ).exists()
        result.append(
            {
                "uid": user.uid,
                "nickname": user.nickname or user.username,
                "username": user.username,
                "avatar": user.avatar,
                "isBelong": belonged,
                "isInviting": inviting,
                "status": 1 if belonged else (2 if inviting else 0),
            }
        )
    return (
        {
            "chatUserVOS": result,
            "missingUsernames": [
                name for name in names if name not in {user["username"] for user in result}
            ],
        }
        if action == "enterprise-batch-search-username"
        else result
    )


APPLICATION_METHODS = {
    "join-enterprise-space": "POST",
    "agree-enterprise-space": "POST",
    "refuse-enterprise-space": "POST",
    "page": "POST",
}


@api_endpoint(["POST"])
@transaction.atomic
def applications(request, action):
    check_method(request, action, APPLICATION_METHODS)
    uid, values = request.user.pk, params(request)
    if action == "join-enterprise-space":
        enterprise, actor = enterprise_context(request, action, controller="ApplyRecordController")
        sid = identifier(values.get("spaceId"), required=True)
        space = (
            Space.objects.select_for_update()
            .filter(pk=sid, enterprise_id=enterprise.pk, deleted=0)
            .first()
        )
        if not space:
            raise Http404()
        if (
            SpaceMember.objects.filter(space_id=sid, uid=uid).exists()
            or Application.objects.filter(space_id=sid, apply_uid=uid, status=1).exists()
        ):
            raise ValidationError("已经加入或存在待审核申请")
        if actor.role == 1:
            add_member(SpaceMember, "space_id", sid, uid, 2)
        else:
            application = Application.objects.create(
                space_id=sid,
                enterprise_id=enterprise.pk,
                apply_uid=uid,
                apply_nickname=nickname(uid)[:64],
            )
            for member in SpaceMember.objects.filter(space_id=sid, role__in=[1, 2]):
                notify(
                    member.uid,
                    "空间加入申请",
                    creator_uid=uid,
                    body=f"{nickname(uid)}申请加入{space.name}",
                    payload={"applicationId": application.pk, "spaceId": sid},
                )
        return True
    space, _ = space_context(request, action, controller="ApplyRecordController")
    Space.objects.select_for_update().get(pk=space.pk)
    query = Application.objects.filter(space_id=space.pk)
    if action == "page":
        if values.get("status") not in (None, "", "all", "0", 0):
            query = query.filter(status=identifier(values["status"]))
        return pagination(query.order_by("-id"), values)
    item = (
        query.select_for_update()
        .filter(pk=identifier(values.get("applyId"), required=True))
        .first()
    )
    if not item:
        raise Http404()
    if item.status != 1:
        raise ValidationError("申请已经处理")
    if action == "agree-enterprise-space":
        enterprise_membership(item.apply_uid, space.enterprise_id)
        add_member(SpaceMember, "space_id", space.pk, item.apply_uid, 3)
        item.status = 2
    else:
        item.status = 3
    item.audit_uid = uid
    item.audit_time = timezone.now()
    item.update_time = timezone.now()
    item.save(update_fields=["status", "audit_uid", "audit_time", "update_time"])
    notify(
        item.apply_uid,
        "空间申请已处理",
        creator_uid=uid,
        body="申请已同意" if item.status == 2 else "申请已拒绝",
        payload={"applicationId": item.pk, "spaceId": space.pk},
    )
    return True


def visible_notifications(uid):
    direct = UserNotification.objects.filter(receiver_uid=uid).values("notification_id")
    return Notification.objects.filter(Q(pk__in=direct) | Q(type__iexact="BROADCAST")).filter(
        Q(expire_at__isnull=True) | Q(expire_at__gt=timezone.now())
    )


def notification_data(item, uid):
    receipt = UserNotification.objects.filter(receiver_uid=uid, notification_id=item.pk).first()
    broadcast = BroadcastRead.objects.filter(receiver_uid=uid, notification_id=item.pk).first()
    read = receipt.is_read if receipt else bool(broadcast)
    result = record(item)
    result["type"] = item.type.upper()
    result.update(
        isRead=read,
        readAt=receipt.read_at if receipt else (broadcast.read_at if broadcast else None),
        receivedAt=receipt.received_at if receipt else item.created_at,
    )
    # Existing notification UI consumes a JSON string, while storage stays JSON.
    result["payload"] = json.dumps(item.payload or {}, ensure_ascii=False)
    return result


@api_endpoint(["GET", "POST", "DELETE"])
@transaction.atomic
def notifications(request, action):
    uid, values = request.user.pk, params(request)
    query = visible_notifications(uid)
    if action == "mark-read" and request.method == "POST":
        ids = values.get("notificationIds", [])
        if not isinstance(ids, list) or len(ids) > 1000:
            raise ValidationError("无效通知列表")
        if not values.get("markAll"):
            ids = [identifier(value, required=True) for value in ids]
            query = query.filter(pk__in=ids)
        for item in query:
            UserNotification.objects.filter(receiver_uid=uid, notification_id=item.pk).update(
                is_read=True, read_at=timezone.now()
            )
            if item.type.upper() == "BROADCAST":
                BroadcastRead.objects.get_or_create(receiver_uid=uid, notification_id=item.pk)
        return True
    if action.isdigit() and request.method == "DELETE":
        item = query.filter(pk=int(action)).first()
        if not item:
            raise Http404()
        if item.type.upper() == "BROADCAST":
            raise ValidationError("广播通知可标记已读，不能删除公共消息")
        UserNotification.objects.filter(receiver_uid=uid, notification_id=item.pk).delete()
        return True
    if request.method != "GET" or action not in ("list", "unread-count"):
        raise Http404()
    direct_read = UserNotification.objects.filter(receiver_uid=uid, is_read=True).values(
        "notification_id"
    )
    broadcast_read = BroadcastRead.objects.filter(receiver_uid=uid).values("notification_id")
    unread = query.exclude(pk__in=direct_read).exclude(pk__in=broadcast_read)
    count = unread.count()
    if action == "unread-count":
        return count
    if str(values.get("unreadOnly", "")).lower() == "true":
        query = unread
    if values.get("type") and str(values["type"]).upper() not in ("ALL", "0"):
        query = query.filter(type__iexact=values["type"])
    page = pagination(
        query.order_by("-created_at", "-id"), values, lambda item: notification_data(item, uid)
    )
    groups = {}
    for item in page["records"]:
        groups.setdefault(item["type"], []).append(item)
    return {
        "notifications": page["records"],
        "pageIndex": page["current"],
        "pageSize": page["size"],
        "totalCount": page["total"],
        "totalPages": page["pages"],
        "unreadCount": count,
        "notificationsByType": groups,
    }
