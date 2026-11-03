"""Shared request/response helpers for resource metadata."""

import json
import re
from math import ceil

from django.core.exceptions import ValidationError
from django.http import Http404
from django.utils import timezone

from astron_console.spaces.permissions import require_resource_access, resolve_scope


def number(value, default=None, minimum=1):
    if value in (None, "") and default is not None:
        return default
    if isinstance(value, bool):
        raise ValidationError("标识必须是整数")
    try:
        result = int(value)
    except (ValueError, TypeError):
        raise ValidationError("标识必须是整数") from None
    if result < minimum:
        raise ValidationError("标识超出范围")
    return result


def text(value, maximum=255, required=True):
    if not isinstance(value, str) or len(value) > maximum or (required and not value.strip()):
        raise ValidationError("文本为空或超过长度限制")
    return value.strip()


def filename(value):
    name = text(value, 255)
    if name in (".", "..") or re.search(r"[\\/\x00-\x1f]", name):
        raise ValidationError("文件名不合法")
    return name


def camel(name):
    first, *rest = name.split("_")
    return first + "".join(x.title() for x in rest)


def dump(row):
    return {camel(field.name): getattr(row, field.attname) for field in row._meta.fields}


def validate(row):
    row.full_clean(
        exclude=[f.name for f in row._meta.fields if f.null and getattr(row, f.attname) is None],
        validate_unique=False,
        validate_constraints=False,
    )
    return row


def save(row):
    if hasattr(row, "update_time"):
        row.update_time = timezone.now()
    validate(row)
    row.save()
    return row


def payload(request):
    return request.GET if request.method == "GET" else {**request.GET.dict(), **request.payload}


def paginate(query, params, serializer=dump):
    page = number(params.get("pageNo", params.get("pageNum", params.get("page"))), 1)
    size = min(number(params.get("pageSize"), 10), 100)
    total = query.count()
    records = [serializer(row) for row in query[(page - 1) * size : page * size]]
    return {
        "records": records,
        "total": total,
        "current": page,
        "pageNo": page,
        "size": size,
        "pageSize": size,
        "pages": ceil(total / size),
    }


def owned(request, model, identifier, key, uid_field="uid", deleted=True):
    query = model.objects.filter(pk=number(identifier))
    if deleted:
        query = query.filter(deleted=False)
    row = query.first()
    if row is None:
        raise Http404("资源不存在")
    require_resource_access(
        resolve_scope(request),
        owner_uid=getattr(row, uid_field),
        space_id=row.space_id,
        permission_key=key,
    )
    return row


def json_value(value, fallback=None):
    if value in (None, ""):
        return fallback
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value)
    except (ValueError, TypeError):
        return fallback
