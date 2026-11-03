"""Global platform credentials. The persisted JSON contract is shared with core services."""

import json

from django.conf import settings
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.utils import timezone
from redis import Redis
from redis.exceptions import RedisError

from astron_console.http import api_endpoint

from .common import UpstreamError, parsed, upstream_errors
from .models import ConfigInfo

TYPES = {
    "iflytek_open_platform": ("IFLYTEK_OPEN_PLATFORM", "iflytekOpenPlatform", "讯飞开放平台"),
    "ai_ability_chat": ("AI_ABILITY_CHAT", "aiAbilityChat", "AI Ability Chat"),
    "virtual_man": ("VIRTUAL_MAN", "virtualMan", "虚拟人能力"),
    "knowledge_platform": ("KNOWLEDGE_PLATFORM", "knowledgePlatform", "知识库平台"),
}
SECRETS = {
    "platformApiKey",
    "platformApiSecret",
    "sparkApiPassword",
    "sparkRtasrApiKey",
    "apiKey",
    "apiToken",
    "sparkVirtualManApiKey",
    "sparkVirtualManApiSecret",
}


def get_platform_config(kind):
    if kind not in TYPES:
        raise ValidationError("未知平台账号")
    row = (
        ConfigInfo.objects.filter(category="PLATFORM_ACCOUNT", code=TYPES[kind][0], is_valid=1)
        .order_by("-update_time", "-id")
        .first()
    )
    value = parsed(row.value) if row else {}
    if not isinstance(value, dict):
        raise ValidationError("平台配置格式无效")
    return value


def mask(value):
    if isinstance(value, dict):
        return {k: ("******" if v else "") if k in SECRETS else mask(v) for k, v in value.items()}
    return value


def merge(value, previous):
    if not isinstance(value, dict):
        raise ValidationError("平台配置必须是对象")
    result = {}
    for key, item in value.items():
        if isinstance(item, dict):
            result[key] = merge(item, previous.get(key, {}))
        elif key in SECRETS and item == "******":
            result[key] = previous.get(key, "")
        elif isinstance(item, (str, int, float, bool)) or item is None:
            result[key] = item
        else:
            raise ValidationError("平台配置字段格式无效")
    return result


def configured(kind, value):
    required = {
        "iflytek_open_platform": [
            "platformAppId",
            "platformApiKey",
            "platformApiSecret",
            "sparkApiPassword",
            "sparkRtasrApiKey",
        ],
        "ai_ability_chat": ["baseUrl", "model", "apiKey"],
        "virtual_man": [
            "sparkVirtualManAppId",
            "sparkVirtualManApiKey",
            "sparkVirtualManApiSecret",
        ],
    }
    if kind == "knowledge_platform":
        return bool(
            (value.get("ragflow", {}).get("baseUrl") and value.get("ragflow", {}).get("apiToken"))
            or value.get("xinghuo", {}).get("datasetId")
        )
    return all(value.get(key) for key in required[kind])


def masked(kind):
    value = get_platform_config(kind)
    return {TYPES[kind][1]: mask(value), "configured": configured(kind, value)}


def administrator(request):
    if not request.user.is_superuser and str(request.user.pk) != getattr(
        settings, "RESOURCE_ADMIN_UID", ""
    ):
        raise PermissionDenied


@api_endpoint(["GET"])
def cards(request):
    administrator(request)
    return [
        {
            "type": kind,
            "name": values[2],
            "configured": configured(kind, get_platform_config(kind)),
            "config": masked(kind),
        }
        for kind, values in TYPES.items()
    ]


@api_endpoint(["GET", "PUT"])
@upstream_errors
def config(request, kind):
    administrator(request)
    if kind not in TYPES:
        raise ValidationError("未知平台账号")
    if request.method == "GET":
        return masked(kind)
    with transaction.atomic():
        row = (
            ConfigInfo.objects.select_for_update()
            .filter(category="PLATFORM_ACCOUNT", code=TYPES[kind][0])
            .order_by("-id")
            .first()
        )
        previous = parsed(row.value) if row else {}
        value = merge(request.payload.get(TYPES[kind][1], {}), previous)
        # Shared cache uses plain JSON; never use Django's prefixed/pickled cache here.
        try:
            with Redis.from_url(settings.RESOURCE_REDIS_URL) as client:
                client.delete("platform_account_text:" + kind)
        except RedisError:
            raise UpstreamError("平台账号缓存失效失败，配置未保存") from None
        if row is None:
            row = ConfigInfo(category="PLATFORM_ACCOUNT", code=TYPES[kind][0])
        row.name = TYPES[kind][2]
        row.value = json.dumps(value, ensure_ascii=False)
        row.is_valid = 1
        row.update_time = timezone.now()
        row.save()

        # Write after commit so direct core consumers cannot refill stale database values.
        def publish():
            try:
                with Redis.from_url(settings.RESOURCE_REDIS_URL) as client:
                    client.set("platform_account_text:" + kind, row.value)
            except RedisError:
                # The persistent update remains authoritative. Surface cache failure to caller.
                raise UpstreamError("平台配置已保存，但共享缓存刷新失败，请重试保存") from None

        transaction.on_commit(publish)
    return masked(kind)


@api_endpoint(["GET"])
def runtime_config(request):
    platform = get_platform_config("iflytek_open_platform")
    virtual = get_platform_config("virtual_man")
    knowledge = get_platform_config("knowledge_platform")
    return {
        "sparkAppId": platform.get("platformAppId"),
        "sparkVirtualManAppId": virtual.get("sparkVirtualManAppId"),
        "iflytekOpenPlatformConfigured": configured("iflytek_open_platform", platform),
        "aiAbilityChatConfigured": configured(
            "ai_ability_chat", get_platform_config("ai_ability_chat")
        ),
        "virtualManConfigured": configured("virtual_man", virtual),
        "ragflowConfigured": bool(
            knowledge.get("ragflow", {}).get("baseUrl")
            and knowledge.get("ragflow", {}).get("apiToken")
        ),
        "xinghuoKnowledgeConfigured": bool(knowledge.get("xinghuo", {}).get("datasetId")),
    }
