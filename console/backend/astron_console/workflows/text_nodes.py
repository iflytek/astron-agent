"""User and built-in text-node separator configurations."""

from django.core.exceptions import ValidationError
from django.db import transaction
from django.http import Http404
from django.utils import timezone

from astron_console.http import api_endpoint
from astron_console.resources.common import number, scope_for, text

from .models import TextNodeConfig

READ = "WorkflowController_list_GET"
WRITE = "WorkflowController_update_PUT"


@api_endpoint(["GET"])
def listing(request):
    scope_for(request, READ)
    return list(
        TextNodeConfig.objects.filter(deleted=False, uid__in=[scope_for(request, READ).uid, "-1"])
        .order_by("-create_time")
        .values("id", "uid", "separator", "comment", "create_time", "update_time")
    )


@api_endpoint(["POST"])
@transaction.atomic
def save(request):
    scope = scope_for(request, WRITE)
    payload = request.payload
    separator = payload.get("separator")
    if not isinstance(separator, str) or not separator or len(separator) > 32:
        raise ValidationError("分隔符无效")
    comment = text(payload, "comment", limit=255)
    if TextNodeConfig.objects.filter(uid=scope.uid, separator=separator, deleted=False).exists():
        raise ValidationError("该分隔符已存在")
    row = TextNodeConfig.objects.create(
        uid=scope.uid,
        separator=separator,
        comment=comment,
        deleted=False,
        create_time=timezone.now(),
        update_time=timezone.now(),
    )
    return {"id": row.pk, "uid": row.uid, "separator": row.separator, "comment": row.comment}


@api_endpoint(["POST", "GET"])
@transaction.atomic
def remove(request):
    scope = scope_for(request, WRITE)
    key = request.GET.get("id") if request.method == "GET" else request.payload.get("id")
    row = TextNodeConfig.objects.filter(pk=number(key), uid=scope.uid, deleted=False).first()
    if row is None:
        raise Http404
    row.deleted = True
    row.update_time = timezone.now()
    row.save(update_fields=["deleted", "update_time"])
    return None
