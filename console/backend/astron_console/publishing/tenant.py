"""Tenant's existing API is authoritative for application identity and key revocation."""

import re
import secrets

from django.conf import settings
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import DatabaseError, transaction

from astron_console.resources.clients import call
from astron_console.resources.common import UpstreamError
from astron_console.workflows.authorization import active_scope

from .models import App, AppOperation


def headers():
    key = settings.TENANT_INTERNAL_API_KEY
    if (
        not isinstance(key, str)
        or not re.fullmatch(r"[A-Za-z0-9._~-]{32,50}", key)
        or key == "NjhmY2NmM2NkZDE4MDFlNmM5ZjcyZjMy"
    ):
        raise UpstreamError("租户内部身份未配置")
    return {"X-Tenant-Internal-Key": key}


def authenticate(authorization):
    if not isinstance(authorization, str) or not authorization.startswith("Bearer "):
        raise PermissionDenied
    parts = authorization[7:].strip().split(":")
    if len(parts) != 2 or not all(parts) or any(len(x) > 255 for x in parts):
        raise PermissionDenied
    try:
        data = call(
            "TENANT_URL",
            "POST",
            "/v2/app/key/verify",
            payload={"api_key": parts[0], "api_secret": parts[1]},
            headers=headers(),
        )
    except UpstreamError:
        raise PermissionDenied from None
    if not isinstance(data, dict):
        raise PermissionDenied
    app_id = data.get("app_id", data.get("appid"))
    app = (
        App.objects.filter(app_id=app_id, is_delete=0).first()
        if isinstance(app_id, str) and app_id
        else None
    )
    if app is None:
        raise PermissionDenied
    active_scope(app.uid, None)
    return app


def create_app(uid, name, description, request_id=None):
    if (
        not isinstance(name, str)
        or not isinstance(description, str)
        or not name
        or len(name) > 128
        or len(description) > 512
    ):
        raise ValidationError("应用名称或说明无效")
    request_id = request_id or secrets.token_hex(24)
    if not isinstance(request_id, str) or len(request_id) > 64 or not request_id:
        raise ValidationError("请求标识无效")
    with transaction.atomic():
        from astron_console.accounts.models import User

        User.objects.select_for_update().get(pk=uid)
        previous = AppOperation.objects.filter(request_id=request_id).first()
        if previous:
            if previous.uid != uid:
                raise PermissionDenied
            if previous.status == "SUCCEEDED":
                return App.objects.get(app_id=previous.app_id, uid=uid)
            raise ValidationError("应用创建结果待核验，请勿重复创建")
        if App.objects.filter(uid=uid, app_name=name, is_delete=0).exists():
            raise ValidationError("应用名称已存在")
        if AppOperation.objects.filter(
            uid=uid, app_name=name, status__in=["UNKNOWN", "PREPARING"]
        ).exists():
            raise ValidationError("同名应用创建结果待核验，请勿重复创建")
        operation = AppOperation.objects.create(uid=uid, request_id=request_id, app_name=name)
    try:
        data = call(
            "TENANT_URL",
            "POST",
            "/v2/app",
            payload={
                "request_id": request_id,
                "app_name": name,
                "app_desc": description,
                "dev_id": 1,
                "cloud_id": "0",
            },
            headers=headers(),
        )
        app_id = data.get("app_id") if isinstance(data, dict) else None
        if not app_id:
            raise UpstreamError("租户应用创建响应缺少应用标识")
        AppOperation.objects.filter(pk=operation.pk).update(app_id=app_id)
        details = call(
            "TENANT_URL", "GET", "/v2/app/details", params={"app_ids": app_id}, headers=headers()
        )
        auth = details[0]["auth_list"][0]
        if not auth.get("api_key") or not auth.get("api_secret"):
            raise UpstreamError("租户应用凭据不完整")
        with transaction.atomic():
            app = App.objects.create(
                uid=uid,
                app_name=name,
                app_describe=description,
                app_id=app_id,
                app_key=auth["api_key"],
                app_secret=auth["api_secret"],
            )
            AppOperation.objects.filter(pk=operation.pk).update(status="SUCCEEDED")
        return app
    except (UpstreamError, DatabaseError, IndexError, KeyError, TypeError, AttributeError):
        AppOperation.objects.filter(pk=operation.pk).update(status="UNKNOWN")
        raise UpstreamError("应用创建结果待核验，未自动重复执行") from None
