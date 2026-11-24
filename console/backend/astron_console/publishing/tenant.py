"""Tenant's existing API is authoritative for application identity and key revocation."""

import logging
import re
import secrets
from hashlib import sha256

from django.conf import settings
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import DatabaseError, transaction

from astron_console.resources.clients import call
from astron_console.resources.common import UpstreamError
from astron_console.workflows.authorization import active_scope

from .models import App, AppOperation

logger = logging.getLogger(__name__)


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
                # Tenant uses channel as part of the app-name namespace. A digest
                # fits its retained column even for a 128-character legacy UID.
                "cloud_id": f"console:{sha256(uid.encode()).hexdigest()}",
            },
            headers=headers(),
        )
        app_id = data.get("app_id") if isinstance(data, dict) else None
        if not isinstance(app_id, str) or not 0 < len(app_id) <= 255:
            raise UpstreamError("租户应用创建响应缺少应用标识")
        AppOperation.objects.filter(pk=operation.pk).update(app_id=app_id)
        api_key, api_secret = data.get("api_key"), data.get("api_secret")
        if not all(
            isinstance(value, str) and 0 < len(value) <= 255 for value in (api_key, api_secret)
        ):
            raise UpstreamError("租户应用凭据不完整")
        with transaction.atomic():
            app = App.objects.create(
                uid=uid,
                app_name=name,
                app_describe=description,
                app_id=app_id,
                app_key=api_key,
                app_secret=api_secret,
            )
            AppOperation.objects.filter(pk=operation.pk).update(status="SUCCEEDED")
        return app
    except (UpstreamError, DatabaseError) as exc:
        AppOperation.objects.filter(pk=operation.pk).update(status="UNKNOWN")
        logger.warning(
            "Tenant app creation requires reconciliation operation=%s error=%s",
            operation.pk,
            type(exc).__name__,
        )
        raise UpstreamError("应用创建结果待核验，未自动重复执行") from None
