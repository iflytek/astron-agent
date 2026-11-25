"""Resource serialization and explicit authorization helpers."""

import json
import logging
from functools import wraps
from urllib.parse import urlsplit

from django.core.exceptions import ValidationError
from django.http import Http404

from astron_console.accounts.http import response
from astron_console.spaces.permissions import (
    require_resource_access,
    require_space_permission,
    resolve_scope,
    scope_queryset,
)

logger = logging.getLogger(__name__)


class UpstreamError(Exception):
    """Contains an operation label, never a response body or credentials."""


def upstream_errors(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        try:
            return view(*args, **kwargs)
        except UpstreamError as exc:
            logger.warning("Resource upstream operation failed: %s", exc)
            return response(message=str(exc), status=502)

    return wrapped


def camel(value):
    head, *tail = value.split("_")
    return head + "".join(part.title() for part in tail)


def serialize(row, exclude=()):
    return {
        camel(field.name): getattr(row, field.name)
        for field in row._meta.fields
        if field.name not in exclude
    }


def parsed(value, default=None):
    if value in (None, ""):
        return {} if default is None else default
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value)
    except (ValueError, TypeError) as exc:
        raise ValidationError("保存的资源配置不是有效 JSON") from exc


def text(payload, key, *, required=False, limit=1024):
    value = payload.get(key, "")
    if not isinstance(value, str) or len(value) > limit or (required and not value.strip()):
        raise ValidationError(f"{key} 无效")
    return value.strip()


def number(value, default=None, maximum=2**63 - 1):
    if value is None and default is not None:
        return default
    if isinstance(value, bool):
        raise ValidationError("数字格式无效")
    try:
        value = int(value)
    except (ValueError, TypeError) as exc:
        raise ValidationError("数字格式无效") from exc
    if value < 1 or value > maximum:
        raise ValidationError("数字范围无效")
    return value


def http_url(value):
    parts = urlsplit(value)
    if (
        parts.scheme not in ("http", "https")
        or not parts.hostname
        or parts.username
        or parts.password
    ):
        raise ValidationError("地址必须是无内嵌凭据的 HTTP(S) URL")
    if parts.fragment:
        raise ValidationError("地址不能包含 fragment")
    return value


def scope_for(request, permission):
    scope = resolve_scope(request)
    if scope.space_id is not None:
        require_space_permission(scope.uid, scope.space_id, permission)
    return scope


def owned(request, model, pk, permission, *, uid_field="uid", deleted="is_deleted"):
    scope = resolve_scope(request)
    query = model.objects.all()
    if deleted:
        query = query.filter(**{deleted: False})
    row = query.filter(pk=number(pk)).first()
    if row is None:
        raise Http404
    require_resource_access(
        scope, owner_uid=getattr(row, uid_field), space_id=row.space_id, permission_key=permission
    )
    return row, scope


def listing(query, scope, payload, *, uid_field="uid", name_field="name"):
    query = scope_queryset(query, scope, uid_field=uid_field)
    name = payload.get("name") or payload.get("content")
    if name:
        query = query.filter(**{name_field + "__icontains": text({"name": name}, "name")})
    return query.order_by("-id")


def page(query, payload, serializer=serialize):
    current = number(payload.get("page", payload.get("pageNo")), 1)
    size = number(payload.get("pageSize"), 20, 100)
    total = query.count()
    records = [serializer(item) for item in query[(current - 1) * size : current * size]]
    return {
        "records": records,
        "pageData": records,
        "total": total,
        "totalCount": total,
        "current": current,
        "size": size,
        "pages": (total + size - 1) // size,
    }
