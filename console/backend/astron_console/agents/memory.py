"""Mem0 platform access with retained credentials and authoritative memory scope."""

import base64
import logging
from contextlib import contextmanager

import httpx
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.http import Http404
from django.utils import timezone

from astron_console.http import api_endpoint
from astron_console.resources.common import UpstreamError, number, text, upstream_errors
from astron_console.resources.models import ConfigInfo

from .definitions import get_agent, get_scoped_agent
from .models import MemoryConfig

logger = logging.getLogger(__name__)


def private_key():
    value = (
        ConfigInfo.objects.filter(category="MODEL_SECRET_KEY", code="private_key", is_valid=1)
        .values_list("value", flat=True)
        .first()
    )
    try:
        key = serialization.load_der_private_key(base64.b64decode(value, validate=True), None)
        if not isinstance(key, rsa.RSAPrivateKey):
            raise ValueError
        return key
    except (ValueError, TypeError) as exc:
        raise UpstreamError("记忆密钥配置不可用") from exc


def decrypt(ciphertext):
    try:
        key = private_key()
        data = base64.b64decode(ciphertext, validate=True)
        size = key.key_size // 8
        if not data or len(data) % size:
            raise ValueError
        return b"".join(
            key.decrypt(data[i : i + size], padding.PKCS1v15()) for i in range(0, len(data), size)
        ).decode()
    except (ValueError, TypeError, UnicodeError) as exc:
        raise UpstreamError("记忆密钥无法解密") from exc


def encrypt(value):
    key = private_key().public_key()
    data = value.encode()
    size = key.key_size // 8 - 11
    return base64.b64encode(
        b"".join(
            key.encrypt(data[i : i + size], padding.PKCS1v15()) for i in range(0, len(data), size)
        )
    ).decode()


def config_for(scope, agent):
    get_scoped_agent(scope, agent.pk)
    # Zero is the retained personal namespace, never a fallback for a team config.
    return MemoryConfig.objects.filter(
        bot_id=agent.pk,
        uid=scope.uid,
        space_id=scope.space_id or 0,
        provider="MEM0",
        is_delete=0,
        delete_time=0,
    ).first()


def config_data(row):
    return {
        "provider": "MEM0",
        "enabled": bool(row and row.enabled),
        "autoSearch": bool(row.auto_search) if row else True,
        "hasApiKey": bool(row and row.api_key_ciphertext),
        "searchTopK": row.search_top_k if row else 5,
        "minScore": float(row.min_score) if row else 0,
    }


@contextmanager
def client_for(row):
    # The official hosted client owns API versioning, authentication and result parsing.
    from mem0 import MemoryClient

    try:
        with httpx.Client(timeout=httpx.Timeout(10, connect=3)) as transport:
            yield MemoryClient(api_key=decrypt(row.api_key_ciphertext), client=transport)
    except (PermissionDenied, Http404, ValidationError, UpstreamError):
        raise
    except Exception as exc:
        logger.warning("Mem0 request failed bot_id=%s type=%s", row.bot_id, type(exc).__name__)
        raise UpstreamError("长期记忆服务请求失败") from exc


def filters(scope, agent):
    parts = [{"user_id": scope.uid}, {"app_id": f"bot-{agent.pk}"}]
    if scope.space_id is not None:
        parts.append({"metadata": {"space_id": scope.space_id}})
    return {"AND": parts}


def in_scope(item, scope, agent):
    if not isinstance(item, dict):
        return False
    # Entity filters are authoritative; also reject explicit mismatches returned upstream.
    if item.get("user_id", scope.uid) != scope.uid:
        return False
    if item.get("app_id", f"bot-{agent.pk}") != f"bot-{agent.pk}":
        return False
    metadata = item.get("metadata") or {}
    if not isinstance(metadata, dict):
        return False
    sid = metadata.get("space_id")
    return sid in (None, 0, "0") if scope.space_id is None else str(sid) == str(scope.space_id)


def results(data):
    rows = (
        data if isinstance(data, list) else data.get("results") if isinstance(data, dict) else None
    )
    if not isinstance(rows, list):
        raise UpstreamError("长期记忆服务响应无效")
    return rows


def public_item(row):
    return {
        "id": row.get("id"),
        "memory": row.get("memory", row.get("text", "")),
        "score": row.get("score"),
        "createdAt": row.get("created_at"),
        "updatedAt": row.get("updated_at"),
    }


def search(scope, agent, query):
    row = config_for(scope, agent)
    if not row or not row.enabled or not row.auto_search or not row.api_key_ciphertext:
        return []
    with client_for(row) as client:
        data = client.search(
            query,
            filters=filters(scope, agent),
            top_k=row.search_top_k,
            threshold=float(row.min_score),
        )
    return [public_item(item) for item in results(data) if in_scope(item, scope, agent)]


def remember(scope, agent, user_text, assistant_text, run_id):
    row = config_for(scope, agent)
    if (
        not row
        or not row.enabled
        or not row.api_key_ciphertext
        or not user_text
        or not assistant_text
    ):
        return None
    with client_for(row) as client:
        client.add(
            [
                {"role": "user", "content": user_text},
                {"role": "assistant", "content": assistant_text},
            ],
            user_id=scope.uid,
            app_id=f"bot-{agent.pk}",
            run_id=str(run_id),
            infer=True,
            metadata={
                "space_id": scope.space_id or 0,
                "bot_id": agent.pk,
                "source": "independent-user-conversation",
            },
        )
    return None


@api_endpoint(["GET", "PUT"])
@upstream_errors
@transaction.atomic
def config(request, agent_id):
    from .definitions import boolean

    agent, scope = get_agent(request, agent_id)
    row = config_for(scope, agent)
    if request.method == "GET":
        return config_data(row)
    payload = request.payload
    if set(payload) - {"provider", "enabled", "autoSearch", "apiKey", "searchTopK", "minScore"}:
        raise ValidationError("不支持的记忆配置字段")
    if payload.get("provider", "MEM0") != "MEM0":
        raise ValidationError("记忆提供方仅支持MEM0")
    row = row or MemoryConfig(bot_id=agent.pk, uid=scope.uid, space_id=scope.space_id or 0)
    row.enabled = int(boolean(payload, "enabled", bool(row.enabled)))
    row.auto_search = int(boolean(payload, "autoSearch", bool(row.auto_search)))
    row.search_top_k = number(payload.get("searchTopK", row.search_top_k), maximum=20)
    score = payload.get("minScore", float(row.min_score))
    if isinstance(score, bool) or not isinstance(score, (int, float)) or not 0 <= score <= 1:
        raise ValidationError("记忆相关度必须为0至1")
    row.min_score = score
    if payload.get("apiKey"):
        row.api_key_ciphertext = encrypt(text(payload, "apiKey", required=True, limit=4096))
    if row.enabled and not row.api_key_ciphertext:
        raise ValidationError("启用记忆需要API Key")
    row.update_time = timezone.now()
    row.save()
    return config_data(row)


def all_scoped(client, scope, agent):
    page = 1
    while True:
        data = client.get_all(filters=filters(scope, agent), page=page, page_size=100)
        batch = results(data)
        yield from (item for item in batch if in_scope(item, scope, agent))
        if isinstance(data, list) or not data.get("next"):
            break
        if not batch:
            raise UpstreamError("长期记忆分页响应无效")
        page += 1


@api_endpoint(["GET", "POST", "DELETE"])
@upstream_errors
def items(request, agent_id, memory_id=None):
    agent, scope = get_agent(request, agent_id)
    row = config_for(scope, agent)
    if row is None or not row.api_key_ciphertext:
        if request.method == "GET":
            return []
        raise ValidationError("请先配置长期记忆")
    with client_for(row) as client:
        if request.method == "GET":
            return [public_item(item) for item in all_scoped(client, scope, agent)]
        if request.method == "POST":
            value = text(request.payload, "memory", required=True, limit=8000)
            result = client.add(
                [{"role": "user", "content": value}],
                user_id=scope.uid,
                app_id=f"bot-{agent.pk}",
                infer=False,
                metadata={
                    "space_id": scope.space_id or 0,
                    "bot_id": agent.pk,
                    "source": "explicit-user-preference",
                },
            )
            # v3 extraction is asynchronous: expose acceptance, never pretend it is stored.
            return {"accepted": True, "eventId": result.get("event_id")}
        memory_id = memory_id or request.GET.get("memoryId") or request.payload.get("memoryId")
        scoped = list(all_scoped(client, scope, agent))
        if memory_id:
            scoped = [item for item in scoped if str(item.get("id")) == str(memory_id)]
            if not scoped:
                raise Http404
        for item in scoped:
            if not item.get("id"):
                raise UpstreamError("长期记忆缺少标识")
            client.delete(item["id"])
        return {"deleted": len(scoped)}
