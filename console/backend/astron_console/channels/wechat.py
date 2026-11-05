"""Authenticated component callbacks and durable publication-bound WeChat messages."""

import hashlib
import hmac
import json
import logging
import secrets
from datetime import timedelta
from urllib.parse import urlencode, urlsplit

from defusedxml import DefusedXmlException
from defusedxml import ElementTree as ET
from django.conf import settings
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import IntegrityError, transaction
from django.http import Http404, HttpResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from redis import Redis
from redis.exceptions import RedisError

from astron_console.agents.memory import decrypt as decrypt_secret
from astron_console.agents.memory import encrypt as encrypt_secret
from astron_console.http import api_endpoint
from astron_console.resources.common import UpstreamError, number, scope_for, text, upstream_errors
from astron_console.spaces.permissions import require_resource_access

from . import clients
from .models import (
    WebhookEvent,
    WechatAuthorization,
    WechatBinding,
    WechatCredential,
    WechatRecord,
)

log = logging.getLogger(__name__)
WRITE = "BotCreateController_updateBot_POST"


def xml_fields(value):
    if len(value) > 64000:
        raise ValidationError("微信XML实体或大小无效")
    try:
        root = ET.fromstring(value, forbid_dtd=True, forbid_entities=True, forbid_external=True)
    except (ET.ParseError, DefusedXmlException):
        raise ValidationError("微信回调XML无效") from None
    if root.tag != "xml" or root.attrib or (root.text or "").strip():
        raise ValidationError("微信回调根元素无效")
    result = {}
    for item in root:
        if item.tag in result or len(item) or item.attrib or (item.tail or "").strip():
            raise ValidationError("微信回调字段重复或结构无效")
        result[item.tag] = item.text or ""
    return result


def credentials(appid):
    row = WechatCredential.objects.filter(pk=appid).first()
    if row:
        return json.loads(decrypt_secret(row.encrypted))
    # Preserve and import only well-defined scalar Redis values, never deserialize
    # Java objects. Unknown legacy codecs remain untouched and explicitly fail.
    keys = (
        {"ticket": "component_verify_ticket"}
        if not appid
        else {"refreshToken": "authorization_refresh_token:" + appid}
    )
    result = {}
    try:
        with Redis.from_url(settings.RESOURCE_REDIS_URL) as redis:
            for field, key in keys.items():
                raw = redis.get("wechat:thirdparty:" + key)
                if raw is None:
                    continue
                try:
                    value = raw.decode("utf-8")
                    if value.startswith('"'):
                        value = json.loads(value)
                    if not isinstance(value, str) or not value or not value.isprintable():
                        raise ValueError
                except (UnicodeError, ValueError):
                    raise UpstreamError("旧微信凭据编码需通过受信管理员导入；旧值已保留") from None
                result[field] = value
    except RedisError:
        raise UpstreamError("微信凭据缓存读取失败") from None
    if result:
        save_credentials(appid, result)
    return result


def save_credentials(appid, data):
    WechatCredential.objects.update_or_create(
        appid=appid,
        defaults={"encrypted": encrypt_secret(json.dumps(data)), "updated_at": timezone.now()},
    )


def access_token():
    data = credentials("")
    if data.get("token") and data.get("expires", 0) > timezone.now().timestamp() + 60:
        return data["token"]
    if not data.get("ticket"):
        raise UpstreamError("尚未收到微信平台验证票据")
    result = clients.component_token(data["ticket"])
    data.update(
        token=result["component_access_token"],
        expires=timezone.now().timestamp() + int(result.get("expires_in", 7200)),
    )
    save_credentials("", data)
    return data["token"]


def authorizer_token(appid):
    data = credentials(appid)
    if data.get("token") and data.get("expires", 0) > timezone.now().timestamp() + 60:
        return data["token"]
    if not data.get("refreshToken"):
        raise UpstreamError("公众号刷新凭据不存在")
    result = clients.refresh_authorizer(access_token(), appid, data["refreshToken"])
    if not result.get("authorizer_access_token"):
        raise UpstreamError("公众号刷新凭据响应无效")
    data.update(
        token=result["authorizer_access_token"],
        refreshToken=result.get("authorizer_refresh_token", data["refreshToken"]),
        expires=timezone.now().timestamp() + int(result.get("expires_in", 7200)),
    )
    save_credentials(appid, data)
    return data["token"]


@api_endpoint(["POST"])
@upstream_errors
def auth_url(request):
    from astron_console.publishing.services import assert_direct_publish, create_candidate

    scope = scope_for(request, WRITE)
    assert_direct_publish(scope)
    clients.configuration()
    appid = text(request.payload, "appid", limit=100) or text(
        request.payload, "appId", required=True, limit=100
    )
    redirect = (
        getattr(settings, "WECHAT_REDIRECT_URL", "")
        or settings.CONSOLE_PUBLIC_ORIGIN + "/publish/wechat/callback"
    )
    # The callback cannot be supplied by a browser: authorization codes are secrets.
    if (
        urlsplit(redirect).scheme != "https"
        or urlsplit(redirect).netloc != urlsplit(settings.CONSOLE_PUBLIC_ORIGIN).netloc
    ):
        raise ValidationError("微信授权回调必须是本站HTTPS地址")
    candidate = create_candidate(scope, number(request.payload.get("botId")))
    code = clients.pre_auth_code(access_token())
    state = secrets.token_urlsafe(32)
    with transaction.atomic():
        previous = WechatAuthorization.objects.select_for_update().filter(appid=appid).first()
        if previous:
            require_resource_access(
                scope, owner_uid=previous.uid, space_id=previous.space_id, permission_key=WRITE
            )
            previous.candidate_id = candidate.pk
            previous.uid = scope.uid
            previous.space_id = scope.space_id
            previous.state = state
            previous.status = "pending"
            previous.expires_at = timezone.now() + timedelta(minutes=10)
            previous.updated_at = timezone.now()
            previous.save()
        else:
            WechatAuthorization.objects.create(
                appid=appid,
                candidate_id=candidate.pk,
                uid=scope.uid,
                space_id=scope.space_id,
                state=state,
                expires_at=timezone.now() + timedelta(minutes=10),
            )
    redirect += ("&" if "?" in redirect else "?") + urlencode({"state": state})
    url = "https://mp.weixin.qq.com/cgi-bin/componentloginpage?" + urlencode(
        {
            "component_appid": clients.configuration()["WECHAT_COMPONENT_APPID"],
            "pre_auth_code": code,
            "redirect_uri": redirect,
            "auth_type": 1,
            "biz_appid": appid,
        }
    )
    return {
        "authUrl": url,
        "url": url,
        "state": state,
        "candidateId": candidate.pk,
        "status": "PENDING",
    }


@api_endpoint(["POST"])
@upstream_errors
def auth_callback(request):
    from astron_console.publishing.models import PublicationCandidate
    from astron_console.publishing.services import (
        _activate,
        assert_direct_publish,
        validate_candidate_engine,
    )

    scope = scope_for(request, WRITE)
    assert_direct_publish(scope)
    state = text(request.payload, "state", required=True, limit=128)
    code = text(request.payload, "authCode", required=True, limit=512)
    with transaction.atomic():
        auth = (
            WechatAuthorization.objects.select_for_update()
            .filter(state=state, status="pending", expires_at__gt=timezone.now())
            .first()
        )
        if auth is None:
            raise ValidationError("微信授权请求无效或已过期")
        require_resource_access(
            scope, owner_uid=auth.uid, space_id=auth.space_id, permission_key=WRITE
        )
        if auth.uid != scope.uid:
            raise PermissionDenied
        auth.status = "exchanging"
        auth.save(update_fields=["status"])
    try:
        info = clients.query_authorizer(access_token(), code)
        if info["authorizer_appid"] != auth.appid:
            raise ValidationError("实际授权公众号与请求不匹配")
        receiver_id = clients.authorizer_identity(access_token(), auth.appid)
        candidate = PublicationCandidate.objects.get(pk=auth.candidate_id)
        validate_candidate_engine(candidate)
        with transaction.atomic():
            auth = WechatAuthorization.objects.select_for_update().get(pk=auth.pk)
            if (
                auth.status != "exchanging"
                or auth.state != state
                or auth.candidate_id != candidate.pk
            ):
                raise ValidationError("微信授权请求已取消")
            assert_direct_publish(scope)
            publication = _activate(candidate, "WECHAT", target_id=auth.appid)
            # A different active agent binding for this account is explicitly revoked.
            from astron_console.publishing.models import Publication

            Publication.objects.filter(channel="WECHAT", target_id=auth.appid).exclude(
                pk=publication.pk
            ).update(active=False)
            save_credentials(
                auth.appid,
                {
                    "token": info["authorizer_access_token"],
                    "refreshToken": info["authorizer_refresh_token"],
                    "expires": timezone.now().timestamp() + int(info.get("expires_in", 7200)),
                },
            )
            WechatBinding.objects.filter(appid=auth.appid, status=1).update(status=2)
            WechatBinding.objects.create(
                bot_id=candidate.bot_id, uid=scope.uid, appid=auth.appid, status=1
            )
            WechatRecord.objects.create(bot_id=candidate.bot_id, appid=auth.appid, auth_type=1)
            auth.publication_id = publication.pk
            auth.receiver_id = receiver_id
            auth.status = "bound"
            auth.updated_at = timezone.now()
            auth.save(update_fields=["publication_id", "receiver_id", "status", "updated_at"])
    except Exception:
        WechatAuthorization.objects.filter(pk=auth.pk, state=state, status="exchanging").update(
            status="unknown", updated_at=timezone.now()
        )
        # No blind replay of a one-use authorization code after transport uncertainty.
        raise
    return {"appid": auth.appid, "status": "BOUND", "publicationId": publication.pk}


@transaction.atomic
def revoke(appid):
    from astron_console.agents.models import AgentState
    from astron_console.publishing.models import Publication
    from astron_console.workflows.models import Workflow

    bindings = list(WechatBinding.objects.filter(appid=appid, status=1))
    publications = list(
        Publication.objects.filter(channel="WECHAT", target_id=appid).select_related("candidate")
    )
    WechatBinding.objects.filter(appid=appid).update(status=2, update_time=timezone.now())
    WechatAuthorization.objects.filter(appid=appid).update(
        status="revoked", updated_at=timezone.now()
    )
    Publication.objects.filter(channel="WECHAT", target_id=appid).update(active=False)
    for row in bindings:
        WechatRecord.objects.create(bot_id=row.bot_id, appid=appid, auth_type=2)
        if not Publication.objects.filter(bot_id=row.bot_id, active=True).exists():
            AgentState.objects.filter(agent_id=row.bot_id).update(published_version_id=None)
            for publication in publications:
                if (
                    publication.bot_id == row.bot_id
                    and publication.candidate.resource_kind == "workflow"
                ):
                    Workflow.objects.filter(flow_id=publication.candidate.resource_id).update(
                        status=0
                    )


@api_endpoint(["GET", "DELETE"])
def binding(request):
    from astron_console.publishing.services import assert_direct_publish

    scope = scope_for(request, WRITE)
    payload = request.GET if request.method == "GET" else request.payload
    auth = WechatAuthorization.objects.filter(
        appid=text(payload, "appid", required=True, limit=100)
    ).first()
    if auth is None:
        raise Http404
    require_resource_access(scope, owner_uid=auth.uid, space_id=auth.space_id, permission_key=WRITE)
    if request.method == "DELETE":
        assert_direct_publish(scope)
        revoke(auth.appid)
        return None
    return {"appid": auth.appid, "status": auth.status, "publicationId": auth.publication_id}


@csrf_exempt
@require_http_methods(["GET", "POST"])
def callback(request, appid=None):
    key = None
    try:
        if request.method == "GET":
            echo = request.GET.get("echostr", "")
            timestamp, nonce = request.GET.get("timestamp", ""), request.GET.get("nonce", "")
            if request.GET.get("msg_signature"):
                return HttpResponse(
                    clients.verify_callback(request.GET["msg_signature"], timestamp, nonce, echo)
                )
            expected = clients.signature(clients.configuration()["WECHAT_TOKEN"], timestamp, nonce)
            if not hmac.compare_digest(expected, request.GET.get("signature", "")):
                raise ValidationError("微信签名无效")
            return HttpResponse(echo)
        if len(request.body) > 64000:
            raise ValidationError("微信消息过长")
        envelope = xml_fields(request.body.decode())
        plain = clients.verify_callback(
            request.GET.get("msg_signature"),
            request.GET.get("timestamp", ""),
            request.GET.get("nonce", ""),
            envelope.get("Encrypt"),
        )
        data = xml_fields(plain)
        if appid is None and data.get("AppId") != clients.configuration()["WECHAT_COMPONENT_APPID"]:
            raise ValidationError("微信平台标识无效")
        key = hashlib.sha256(
            (str(appid or "component") + ":" + (data.get("MsgId") or plain)).encode()
        ).hexdigest()
        with transaction.atomic():
            if WebhookEvent.objects.filter(pk=key).exists():
                return HttpResponse("success")
            if appid is None:
                kind = data.get("InfoType", "")
                if kind == "component_verify_ticket":
                    ticket = data.get("ComponentVerifyTicket")
                    if not ticket:
                        raise ValidationError("验证票据为空")
                    # New ticket invalidates the cached component token only; no Redis flush.
                    save_credentials("", {"ticket": ticket})
                elif kind == "unauthorized":
                    revoke(data.get("AuthorizerAppid", ""))
                # authorized is committed only by the initiating logged-in browser's
                # one-use state+code exchange. A push event cannot choose a new bot.
                WebhookEvent.objects.create(
                    event_key=key,
                    kind=kind,
                    appid=data.get("AuthorizerAppid", ""),
                    payload={},
                    status="done",
                )
            else:
                auth = WechatAuthorization.objects.filter(appid=appid).first()
                binding = WechatBinding.objects.filter(appid=appid, status=1).first()
                if auth is None or binding is None or not auth.publication_id:
                    raise PermissionDenied
                if not auth.receiver_id or data.get("ToUserName") != auth.receiver_id:
                    raise PermissionDenied
                from astron_console.publishing.services import require_publication

                publication = require_publication(publication_id=auth.publication_id)
                if publication.channel != "WECHAT" or publication.target_id != appid:
                    raise PermissionDenied
                if data.get("MsgType") != "text":
                    WebhookEvent.objects.create(
                        event_key=key,
                        kind=data.get("MsgType", "unknown"),
                        appid=appid,
                        payload={},
                        status="ignored",
                    )
                else:
                    if (
                        not 1 <= len(data.get("FromUserName", "")) <= 64
                        or not data.get("MsgId", "").isascii()
                        or not data.get("MsgId", "").isdigit()
                        or len(data["MsgId"]) > 19
                        or int(data["MsgId"]) > 9223372036854775807
                        or not data.get("Content")
                    ):
                        raise ValidationError("微信文本消息无效")
                    WebhookEvent.objects.create(
                        event_key=key,
                        kind="text",
                        appid=appid,
                        publication_id=publication.pk,
                        candidate_id=publication.candidate_id,
                        payload={
                            "openid": data["FromUserName"],
                            "text": data["Content"],
                            "msgId": data["MsgId"],
                        },
                        status="queued",
                    )
        return HttpResponse("success")
    except (ValidationError, PermissionDenied, Http404, UnicodeError, ValueError):
        return HttpResponse("invalid", status=403)
    except UpstreamError:
        return HttpResponse("unavailable", status=503)
    except IntegrityError:
        # Concurrent delivery of the same signed event can race the initial read.
        # The uniqueness constraint is authoritative after the failed transaction.
        if key and WebhookEvent.objects.filter(pk=key).exists():
            return HttpResponse("success")
        return HttpResponse("unavailable", status=503)
