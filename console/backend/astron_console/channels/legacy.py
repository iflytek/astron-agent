"""Preserve historical WeChat bindings and expose incomplete migrations explicitly."""

from django.core.exceptions import PermissionDenied, ValidationError
from django.http import Http404

from astron_console.publishing.models import LegacyPublicationIssue
from astron_console.publishing.services import require_publication

from .models import WechatAuthorization, WechatBinding


def adopt_legacy_wechat():
    counts = {"imported": 0, "existing": 0, "unresolved": 0}
    active = list(WechatBinding.objects.filter(status=1))
    sources = [f"wechat:{row.pk}" for row in active]
    # Revoked records remain in their original tables, but no longer demand activation.
    LegacyPublicationIssue.objects.filter(source__startswith="wechat:").exclude(
        source__in=sources
    ).update(resolved=True)
    for binding in active:
        source = f"wechat:{binding.pk}"
        try:
            auth = WechatAuthorization.objects.filter(appid=binding.appid).first()
            if auth is None or not auth.publication_id or not auth.receiver_id:
                raise ValidationError(
                    "旧微信绑定缺少可验证的渠道快照及公众号身份；请重新授权或受信恢复"
                )
            publication = require_publication(publication_id=auth.publication_id)
            if (
                publication.channel != "WECHAT"
                or publication.target_id != binding.appid
                or publication.bot_id != binding.bot_id
                or auth.uid != binding.uid
                or (auth.status == "bound" and auth.candidate_id != publication.candidate_id)
                or auth.status == "revoked"
            ):
                raise ValidationError("旧微信绑定与已验证发布不一致；原绑定和凭据保留，需核验恢复")
            counts["existing"] += 1
            LegacyPublicationIssue.objects.filter(source=source).update(resolved=True)
        except (PermissionDenied, Http404, ValidationError, ValueError, KeyError, TypeError):
            LegacyPublicationIssue.objects.update_or_create(
                source=source,
                defaults={
                    "bot_id": binding.bot_id or 0,
                    "reason": (
                        "旧微信绑定缺少可验证的渠道快照/身份。凭据导入不等于绑定恢复；"
                        "请重新授权，或使用restore_wechat_binding明确选择完整版本并核验公众号身份。"
                    ),
                    "resolved": False,
                },
            )
            counts["unresolved"] += 1
    return counts
