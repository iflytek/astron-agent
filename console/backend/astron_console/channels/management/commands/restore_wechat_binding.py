"""Explicit operator recovery: select a frozen version and verify the actual account."""

import secrets

from django.core.exceptions import PermissionDenied, ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.http import Http404
from django.utils import timezone

from astron_console.channels import clients, wechat
from astron_console.channels.models import WechatAuthorization, WechatBinding, WechatRecord
from astron_console.publishing.models import LegacyPublicationIssue, PublicationCandidate
from astron_console.publishing.services import (
    _activate,
    assert_direct_publish,
    candidate_scope,
    validate_candidate_engine,
)
from astron_console.resources.common import UpstreamError


class Command(BaseCommand):
    help = (
        "Explicitly publish a selected immutable candidate for a retained WeChat binding. "
        "Verifies the live authorizer identity; does not infer a historical release from a draft."
    )

    def add_arguments(self, parser):
        parser.add_argument("--binding-id", required=True, type=int)
        parser.add_argument("--candidate-id", required=True, type=int)
        parser.add_argument("--confirm-publication", required=True, action="store_true")

    def handle(self, *args, **options):
        binding = WechatBinding.objects.filter(pk=options["binding_id"], status=1).first()
        candidate = PublicationCandidate.objects.filter(pk=options["candidate_id"]).first()
        if (
            binding is None
            or candidate is None
            or not binding.appid
            or candidate.bot_id != binding.bot_id
            or candidate.created_by != binding.uid
        ):
            raise CommandError("绑定与完整候选版本的资源或发布人不匹配")
        if (
            WechatBinding.objects.filter(appid=binding.appid, status=1)
            .exclude(pk=binding.pk)
            .exists()
        ):
            raise CommandError("公众号存在多个活动旧绑定，须先核验并通过正常授权流程重新绑定")
        existing = WechatAuthorization.objects.filter(appid=binding.appid).first()
        if existing and existing.status != "revoked":
            raise CommandError("已有授权状态，请通过正常授权流程更新，不能覆盖")
        try:
            scope = candidate_scope(candidate)
            assert_direct_publish(scope)
            validate_candidate_engine(candidate)
            # Importing a refresh token alone is insufficient. Both the token and the
            # platform account identity must still be accepted by WeChat.
            wechat.authorizer_token(binding.appid)
            receiver = clients.authorizer_identity(wechat.access_token(), binding.appid)
            self.commit_binding(binding, candidate, receiver)
        except (PermissionDenied, ValidationError, Http404, UpstreamError):
            raise CommandError("公众号身份、凭据或候选版本未通过核验，原绑定保持不变") from None
        self.stdout.write(self.style.SUCCESS("指定版本已恢复微信发布；原绑定与凭据已保留"))

    @transaction.atomic
    def commit_binding(self, previous, candidate, receiver):
        binding = WechatBinding.objects.select_for_update().filter(pk=previous.pk, status=1).first()
        if binding is None or (binding.appid, binding.bot_id, binding.uid) != (
            previous.appid,
            previous.bot_id,
            previous.uid,
        ):
            raise ValidationError("旧绑定已变化")
        if (
            WechatBinding.objects.filter(appid=binding.appid, status=1)
            .exclude(pk=binding.pk)
            .exists()
        ):
            raise ValidationError("活动绑定已变化")
        existing = (
            WechatAuthorization.objects.select_for_update().filter(appid=binding.appid).first()
        )
        if existing and existing.status != "revoked":
            raise ValidationError("已有授权状态")
        assert_direct_publish(candidate_scope(candidate))
        publication = _activate(candidate, "WECHAT", target_id=binding.appid)
        WechatAuthorization.objects.update_or_create(
            appid=binding.appid,
            defaults={
                "receiver_id": receiver,
                "candidate_id": candidate.pk,
                "publication_id": publication.pk,
                "uid": binding.uid,
                "space_id": candidate.space_id,
                "state": secrets.token_urlsafe(32),
                "status": "bound",
                "expires_at": timezone.now(),
                "updated_at": timezone.now(),
            },
        )
        WechatRecord.objects.create(bot_id=binding.bot_id, appid=binding.appid, auth_type=1)
        LegacyPublicationIssue.objects.filter(source=f"wechat:{binding.pk}").update(resolved=True)
