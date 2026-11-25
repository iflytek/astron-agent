"""Durable channel work: callbacks acknowledge storage, not model completion."""

import asyncio
import logging
from datetime import timedelta

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.http import Http404
from django.utils import timezone

from astron_console.resources.common import UpstreamError

from . import clients, wechat
from .models import VoiceTask, WebhookEvent, WechatAuthorization, WechatBinding, WechatChat

log = logging.getLogger(__name__)


@transaction.atomic
def claim():
    row = (
        WebhookEvent.objects.select_for_update()
        .filter(status="queued")
        .order_by("created_at")
        .first()
    )
    if row:
        row.status = "running"
        row.updated_at = timezone.now()
        row.save(update_fields=["status", "updated_at"])
    return row


def require_channel(row):
    from astron_console.publishing.public_runtime import frozen_channel_publication

    if row.candidate_id is None:
        raise ValidationError("消息缺少可验证的接收时发布快照")
    publication = frozen_channel_publication(row.publication_id, row.candidate_id)
    if (
        publication.channel != "WECHAT"
        or publication.target_id != row.appid
        or not WechatAuthorization.objects.filter(
            appid=row.appid,
            publication_id=publication.pk,
        )
        .exclude(status="revoked")
        .exists()
        or not WechatBinding.objects.filter(
            appid=row.appid,
            bot_id=publication.bot_id,
            status=1,
        ).exists()
    ):
        raise PermissionDenied


def perform(row):
    from astron_console.publishing.public_runtime import execute_channel

    try:
        require_channel(row)
        subject = f"wechat:{row.appid}:{row.payload['openid']}"
        answer = asyncio.run(
            execute_channel(
                row.publication_id,
                subject,
                row.payload["text"],
                subject,
                candidate_id=row.candidate_id,
            )
        )
        WechatChat.objects.create(
            app_id=row.appid,
            open_id=row.payload["openid"],
            msg_id=int(row.payload["msgId"]),
            req=row.payload["text"],
            resp=answer,
            sid=row.pk,
        )
        require_channel(row)
        # A timeout after this state is ambiguous. Never automatically resend a
        # customer-service message or rerun tools on worker restart.
        row.status = "sending"
        row.updated_at = timezone.now()
        row.save(update_fields=["status", "updated_at"])
        token = wechat.authorizer_token(row.appid)
        # WeChat text payloads have a 2048-byte limit; preserve full answer in history.
        text = answer.encode()[:2000].decode(errors="ignore")
        clients.send_customer_message(token, row.payload["openid"], text)
        row.status = "done"
    except (PermissionDenied, Http404, ValidationError):
        row.status = "failed"
        row.error = (
            "旧消息缺少接收时发布快照，不能安全重放"
            if row.candidate_id is None
            else "渠道授权或输入已失效"
        )
    except Exception as exc:
        row.error = "渠道投递结果待核验" if row.status == "sending" else "渠道执行失败"
        row.status = "unknown" if row.status == "sending" else "failed"
        log.warning("Channel job failed event=%s type=%s", row.pk, type(exc).__name__)
    row.updated_at = timezone.now()
    row.save(update_fields=["status", "error", "updated_at"])


def reap_abandoned():
    WebhookEvent.objects.filter(
        status__in=["running", "sending"], updated_at__lt=timezone.now() - timedelta(hours=1)
    ).update(status="unknown", error="处理进程中断，结果待核验", updated_at=timezone.now())


def poll_training():
    from .media import refresh_training

    task = (
        VoiceTask.objects.filter(
            status__in=["training", "unknown"],
            updated_at__lt=timezone.now() - timedelta(seconds=15),
        )
        .order_by("updated_at")
        .first()
    )
    if task is None:
        return
    try:
        refresh_training(task)
    except (UpstreamError, ValidationError):
        # Read-only status lookups are safe to retry. Do not resubmit training.
        VoiceTask.objects.filter(pk=task.pk).update(updated_at=timezone.now())
