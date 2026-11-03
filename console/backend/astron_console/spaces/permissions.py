"""Database-backed scope and permission checks shared by Console resource apps."""

from dataclasses import dataclass

from django.core.exceptions import PermissionDenied, ValidationError
from django.http import Http404
from django.utils import timezone

from .models import (
    Enterprise,
    EnterpriseMember,
    EnterprisePermission,
    Space,
    SpaceMember,
    SpacePermission,
)


@dataclass(frozen=True)
class ResourceScope:
    uid: str
    space_id: int | None
    enterprise_id: int | None


def identifier(value, *, required=False):
    if value in (None, ""):
        if required:
            raise ValidationError("缺少资源标识")
        return None
    if (
        isinstance(value, bool)
        or not str(value).isdigit()
        or int(value) < 1
        or int(value) > 9223372036854775807
    ):
        raise ValidationError("无效的资源标识")
    return int(value)


def space_membership(uid, space_id):
    space = Space.objects.filter(pk=space_id, deleted=0).first()
    if not space:
        raise Http404("空间不存在")
    member = SpaceMember.objects.filter(space_id=space_id, uid=uid).first()
    if not member or member.role not in (1, 2, 3):
        raise PermissionDenied("无权访问此空间")
    if space.enterprise_id:
        enterprise_membership(uid, space.enterprise_id)
    return space, member


def enterprise_membership(uid, enterprise_id):
    enterprise = Enterprise.objects.filter(pk=enterprise_id, deleted=0).first()
    if not enterprise:
        raise Http404("团队不存在")
    member = EnterpriseMember.objects.filter(enterprise_id=enterprise_id, uid=uid).first()
    if not member or member.role not in (1, 2, 3):
        raise PermissionDenied("无权访问此团队")
    return enterprise, member


def resolve_scope(request, *, require_space=False):
    if not request.user.is_authenticated:
        raise PermissionDenied("请先登录")
    sid = identifier(request.headers.get("space-id"), required=require_space)
    eid = identifier(request.headers.get("enterprise-id"))
    if eid:
        enterprise_membership(request.user.pk, eid)
    if sid:
        space, _ = space_membership(request.user.pk, sid)
        if eid is not None and space.enterprise_id != eid:
            raise PermissionDenied("空间不属于所选团队")
        eid = space.enterprise_id
    return ResourceScope(str(request.user.pk), sid, eid)


def require_space_permission(uid, space_id, permission_key):
    space, member = space_membership(uid, space_id)
    rule = SpacePermission.objects.filter(permission_key=permission_key).first()
    role = {1: "owner", 2: "admin", 3: "member"}[member.role]
    if rule is None or not getattr(rule, role):
        raise PermissionDenied("没有此操作权限")
    if space.enterprise_id and not rule.available_expired:
        enterprise = Enterprise.objects.get(pk=space.enterprise_id)
        if enterprise.expire_time and enterprise.expire_time <= timezone.now():
            raise PermissionDenied("团队服务已到期")
    return member


def require_enterprise_permission(uid, enterprise_id, permission_key):
    enterprise, member = enterprise_membership(uid, enterprise_id)
    rule = EnterprisePermission.objects.filter(permission_key=permission_key).first()
    role = {1: "officer", 2: "governor", 3: "staff"}[member.role]
    if rule is None or not getattr(rule, role):
        raise PermissionDenied("没有此团队操作权限")
    if (
        not rule.available_expired
        and enterprise.expire_time
        and enterprise.expire_time <= timezone.now()
    ):
        raise PermissionDenied("团队服务已到期")
    return member


def scope_queryset(queryset, scope, *, uid_field="uid", space_field="space_id"):
    if scope.space_id is None:
        if scope.enterprise_id is not None:
            raise PermissionDenied("请先选择团队空间")
        return queryset.filter(**{uid_field: scope.uid, f"{space_field}__isnull": True})
    space_membership(scope.uid, scope.space_id)
    return queryset.filter(**{space_field: scope.space_id})


def require_resource_access(scope, *, owner_uid, space_id, permission_key):
    if space_id is None:
        if (
            scope.space_id is not None
            or scope.enterprise_id is not None
            or str(owner_uid) != scope.uid
        ):
            raise PermissionDenied("无权访问此个人资源")
    elif scope.space_id != space_id:
        raise PermissionDenied("资源不属于所选空间")
    else:
        require_space_permission(scope.uid, space_id, permission_key)
