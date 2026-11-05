import base64
import hashlib
import hmac
import importlib
import json
from datetime import timedelta
from io import BytesIO
from unittest.mock import AsyncMock, patch
from urllib.parse import parse_qs, unquote, urlencode, urlsplit

import httpx
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from django.apps import apps
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import connection
from django.test import SimpleTestCase, TestCase, TransactionTestCase, override_settings
from django.urls import include, path
from django.utils import timezone

from astron_console.accounts.models import User, UserProfile
from astron_console.agents.models import Agent, AgentState
from astron_console.channels import clients, jobs, legacy, media, media_client, wechat
from astron_console.channels.models import (
    MediaHistory,
    Speaker,
    VoiceTask,
    WebhookEvent,
    WechatAuthorization,
    WechatBinding,
    WechatCredential,
    WorkflowMediaConfig,
)
from astron_console.publishing import services
from astron_console.publishing.models import LegacyPublicationIssue, Publication, WorkflowBot
from astron_console.resources.common import UpstreamError
from astron_console.resources.models import ConfigInfo, Model
from astron_console.spaces.permissions import ResourceScope
from astron_console.workflows.models import WorkflowVersion

urlpatterns = [
    path("", include("astron_console.channels.urls")),
    path("", include("astron_console.workflows.management_urls")),
    path("", include("astron_console.publishing.urls")),
]
WECHAT = {
    "ROOT_URLCONF": __name__,
    "WECHAT_COMPONENT_APPID": "wxcomponent",
    "WECHAT_COMPONENT_SECRET": "component-secret",
    "WECHAT_TOKEN": "callback-token",
    "WECHAT_ENCODING_AES_KEY": base64.b64encode(bytes(range(32))).decode().rstrip("="),
    "CONSOLE_PUBLIC_ORIGIN": "https://console.example",
    "WECHAT_REDIRECT_URL": "",
}


@override_settings(**WECHAT)
class CryptoTests(SimpleTestCase):
    def test_signature_encryption_tamper_and_recipient(self):
        message = "<xml><Content>你好</Content></xml>"
        encrypted, signed, timestamp, nonce = clients.encrypt(message, timestamp="123", nonce="n")
        self.assertEqual(clients.verify_callback(signed, timestamp, nonce, encrypted), message)
        with self.assertRaises(ValidationError):
            clients.verify_callback(signed, timestamp, nonce + "x", encrypted)
        with override_settings(WECHAT_COMPONENT_APPID="another-component"):
            with self.assertRaises(ValidationError):
                clients.decrypt(encrypted)
        with self.assertRaises(ValidationError):
            clients.decrypt("not-base64")
        with self.assertRaises(ValidationError):
            clients.decrypt(base64.b64encode(b"invalid-block").decode())

    def test_xml_rejects_entities_duplicate_and_nested_fields(self):
        for value in [
            '<!DOCTYPE xml [<!ENTITY a "secret">]><xml><Content>&a;</Content></xml>',
            "<xml><MsgId>1</MsgId><MsgId>2</MsgId></xml>",
            "<xml><Content><Nested/></Content></xml>",
            '<!DOCTYPE xml SYSTEM "file:///etc/passwd"><xml/>',
            '<xml><Content id="unexpected">text</Content></xml>',
            "<xml>unexpected<Content>text</Content></xml>",
        ]:
            with self.assertRaises(ValidationError):
                wechat.xml_fields(value)

    def test_cdata_is_text_even_when_it_mentions_xml_declarations(self):
        content = '正常文字 <!DOCTYPE xml> <!ENTITY a "text"> & <example>'
        self.assertEqual(
            wechat.xml_fields(f"<xml><Content><![CDATA[{content}]]></Content></xml>"),
            {"Content": content},
        )

    def test_wire_training_signatures_cover_actual_multipart_bytes(self):
        requests = []

        def handle(request):
            requests.append(request)
            body = request.read()
            if request.url.path.endswith("/token"):
                data = json.loads(body)
                timestamp = data["base"]["timestamp"]
                expected = hashlib.md5(
                    (hashlib.md5(("key" + timestamp).encode()).hexdigest() + body.decode()).encode()
                ).hexdigest()
                self.assertEqual(request.headers["Authorization"], expected)
                return httpx.Response(200, json={"retcode": "000000", "accesstoken": "token"})
            expected = hashlib.md5(
                ("key" + request.headers["X-Time"] + hashlib.md5(body).hexdigest()).encode()
            ).hexdigest()
            self.assertEqual(request.headers["X-Sign"], expected)
            self.assertEqual(request.headers["X-Token"], "token")
            if request.url.path.endswith("submitWithAudio"):
                self.assertIn(b'filename="voice.pcm"', body)
                self.assertIn(b"audio-content", body)
                self.assertIn(b"task-123", body)
            return httpx.Response(200, json={"code": 0, "data": "task-123"})

        real_client = httpx.Client
        with (
            patch.object(
                media_client,
                "platform",
                return_value={"platformAppId": "app", "platformApiKey": "key"},
            ),
            patch.object(
                media_client.httpx,
                "Client",
                side_effect=lambda **kw: real_client(transport=httpx.MockTransport(handle), **kw),
            ),
        ):
            trainer = media_client.VoiceTraining()
            self.assertEqual(trainer.request("task/add", {"taskName": "voice"}), "task-123")
            audio = BytesIO(b"audio-content")
            audio.name = "voice.pcm"
            trainer.request(
                "task/submitWithAudio", {"taskId": "task-123", "textId": 5001}, file=audio
            )
        self.assertEqual(len(requests), 3)

    def test_rtasr_signature_is_base64_hmac_not_hex(self):
        with (
            patch.object(
                media_client,
                "platform",
                return_value={"platformAppId": "app", "sparkRtasrApiKey": "key"},
            ),
            patch.object(media_client.time, "time", return_value=123),
        ):
            data = media_client.rtasr_sign()
        digest = hashlib.md5(b"app123").hexdigest().encode()
        expected = base64.b64encode(hmac.new(b"key", digest, hashlib.sha1).digest()).decode()
        self.assertEqual(unquote(data["signa"]), expected)


@override_settings(**WECHAT)
class ChannelTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        ConfigInfo.objects.create(
            category="MODEL_SECRET_KEY",
            code="private_key",
            is_valid=1,
            value=base64.b64encode(
                key.private_bytes(
                    serialization.Encoding.DER,
                    serialization.PrivateFormat.PKCS8,
                    serialization.NoEncryption(),
                )
            ).decode(),
        )

    def setUp(self):
        self.owner = User.objects.create_user(id="retained-owner", username="owner")
        self.other = User.objects.create_user(id="other", username="other")
        for user in [self.owner, self.other]:
            UserProfile.objects.create(uid=user.pk, username=user.username)
        self.model = Model.objects.create(
            uid=self.owner.pk, name="model", provider="openai", domain="model"
        )
        self.bot = Agent.objects.create(
            uid=self.owner.pk, bot_name="retained", model_id=self.model.pk
        )
        self.scope = ResourceScope(self.owner.pk, None, None)
        self.client.force_login(self.owner)
        ConfigInfo.objects.create(
            category="PLATFORM_ACCOUNT",
            code="IFLYTEK_OPEN_PLATFORM",
            is_valid=1,
            value=json.dumps({"platformAppId": "app", "platformApiKey": "key"}),
        )

    def write(self, url, data):
        return self.client.post(url, json.dumps(data), content_type="application/json")

    def bind(self, appid="wxaccount"):
        candidate = services.create_candidate(self.scope, self.bot.pk)
        pub = services.activate(candidate, "WECHAT", target_id=appid)
        auth = WechatAuthorization.objects.create(
            appid=appid,
            receiver_id="gh_" + appid,
            uid=self.owner.pk,
            candidate_id=candidate.pk,
            publication_id=pub.pk,
            state="state",
            status="bound",
            expires_at=timezone.now() + timedelta(minutes=10),
        )
        WechatBinding.objects.create(appid=appid, bot_id=self.bot.pk, uid=self.owner.pk, status=1)
        return auth, pub

    def push(self, message, appid="wxaccount", **overrides):
        encrypted, signed, timestamp, nonce = clients.encrypt(message)
        query = {"msg_signature": signed, "timestamp": timestamp, "nonce": nonce, **overrides}
        path = "/api/wx/callback" + ("/" + appid if appid else "")
        return self.client.post(
            path + "?" + urlencode(query),
            "<xml><Encrypt><![CDATA[" + encrypted + "]]></Encrypt></xml>",
            content_type="text/xml",
        )

    def text_message(self, receiver="gh_wxaccount", msgid="123"):
        return (
            f"<xml><ToUserName><![CDATA[{receiver}]]></ToUserName>"
            "<FromUserName><![CDATA[openid]]></FromUserName><MsgType><![CDATA[text]]></MsgType>"
            f"<MsgId>{msgid}</MsgId><Content><![CDATA[hello]]></Content></xml>"
        )

    def test_signed_official_cdata_callback_preserves_literal_text_and_blocks_dtd(self):
        self.bind()
        content = '你好 <!DOCTYPE xml> & <xml> <!ENTITY x "text">'
        message = self.text_message().replace("<![CDATA[hello]]>", f"<![CDATA[{content}]]>")
        self.client.logout()
        response = self.push(message)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(WebhookEvent.objects.get().payload["text"], content)
        hostile = (
            '<!DOCTYPE xml [<!ENTITY secret SYSTEM "file:///etc/passwd">]>'
            + self.text_message(msgid="456").replace("<![CDATA[hello]]>", "&secret;")
        )
        self.assertEqual(self.push(hostile).status_code, 403)
        self.assertEqual(WebhookEvent.objects.count(), 1)

    def test_callback_deduplicates_and_checks_receiver_and_message_id(self):
        self.bind()
        for _ in range(2):
            self.assertEqual(self.push(self.text_message()).status_code, 200)
        self.assertEqual(WebhookEvent.objects.filter(status="queued").count(), 1)
        self.assertEqual(
            self.push(self.text_message(receiver="gh_other", msgid="456")).status_code, 403
        )
        self.assertEqual(self.push(self.text_message(msgid="not-numeric")).status_code, 403)
        self.assertEqual(self.push(self.text_message(msgid="9223372036854775808")).status_code, 403)
        self.assertEqual(
            self.push(self.text_message(msgid="222"), msg_signature="wrong").status_code, 403
        )
        self.assertEqual(WebhookEvent.objects.count(), 1)

    def test_revoke_blocks_existing_queue_and_preserves_other_channels(self):
        auth, pub = self.bind()
        market = services.activate(pub.candidate, "MARKET")
        self.push(self.text_message())
        wechat.revoke(auth.appid)
        pub.refresh_from_db()
        self.assertFalse(pub.active)
        self.assertEqual(self.push(self.text_message(msgid="456")).status_code, 403)
        self.assertTrue(Publication.objects.get(pk=market.pk).active)
        self.assertIsNotNone(AgentState.objects.get(agent_id=self.bot.pk).published_version_id)
        event = jobs.claim()
        with patch(
            "astron_console.publishing.public_runtime.execute_channel", new_callable=AsyncMock
        ) as execute:
            jobs.perform(event)
            execute.assert_not_called()
        self.assertEqual(WebhookEvent.objects.get(pk=event.pk).status, "failed")

    def test_job_subject_and_unknown_send_are_not_replayed(self):
        self.bind()
        self.push(self.text_message())
        event = jobs.claim()
        with (
            patch(
                "astron_console.publishing.public_runtime.execute_channel",
                new_callable=AsyncMock,
                return_value="answer",
            ) as execute,
            patch.object(wechat, "authorizer_token", return_value="access"),
            patch.object(clients, "send_customer_message", side_effect=UpstreamError("timeout")),
        ):
            jobs.perform(event)
        self.assertEqual(
            execute.call_args.args[1:],
            ("wechat:wxaccount:openid", "hello", "wechat:wxaccount:openid"),
        )
        self.assertEqual(WebhookEvent.objects.get(pk=event.pk).status, "unknown")
        self.assertEqual(execute.call_args.kwargs, {"candidate_id": event.candidate_id})
        self.assertIsNone(jobs.claim())

    def test_queued_message_uses_receipt_candidate_after_republication(self):
        auth, publication = self.bind()
        received_candidate = publication.candidate_id
        self.push(self.text_message())
        event = jobs.claim()
        self.assertEqual(event.candidate_id, received_candidate)
        newer_model = Model.objects.create(
            uid=self.owner.pk, name="new", provider="openai", domain="new"
        )
        self.bot.model_id = newer_model.pk
        self.bot.bot_name = "new draft"
        self.bot.save()
        newer = services.create_candidate(self.scope, self.bot.pk)
        services.activate(newer, "WECHAT", target_id=auth.appid)
        auth.candidate_id = newer.pk
        auth.save()
        # Only the new candidate's model becomes unavailable. The queued snapshot
        # still references the valid original model and must remain executable.
        newer_model.is_deleted = True
        newer_model.save()
        with (
            patch(
                "astron_console.publishing.public_runtime.execute_channel",
                new_callable=AsyncMock,
                return_value="old snapshot answer",
            ) as execute,
            patch.object(wechat, "authorizer_token", return_value="access"),
            patch.object(clients, "send_customer_message"),
        ):
            jobs.perform(event)
        self.assertEqual(execute.call_args.kwargs, {"candidate_id": received_candidate})
        self.assertEqual(WebhookEvent.objects.get(pk=event.pk).status, "done")

    def test_unpinned_old_event_and_changed_authorization_cannot_run(self):
        auth, publication = self.bind()
        self.push(self.text_message())
        event = jobs.claim()
        event.candidate_id = None
        event.save()
        with patch(
            "astron_console.publishing.public_runtime.execute_channel", new_callable=AsyncMock
        ) as execute:
            jobs.perform(event)
            execute.assert_not_called()
        event.refresh_from_db()
        self.assertEqual(event.status, "failed")
        self.assertIn("缺少接收时发布快照", event.error)
        event.candidate_id = publication.candidate_id
        auth.publication_id = publication.pk + 999
        auth.save()
        with patch(
            "astron_console.publishing.public_runtime.execute_channel", new_callable=AsyncMock
        ) as execute:
            jobs.perform(event)
            execute.assert_not_called()
        self.assertEqual(WebhookEvent.objects.get(pk=event.pk).status, "failed")

    def test_upgrade_marks_old_pending_messages_without_guessing_current_version(self):
        event = WebhookEvent.objects.create(
            event_key="old",
            kind="text",
            appid="old",
            payload={"text": "retained"},
            status="pending",
        )
        migration = importlib.import_module(
            "astron_console.channels.migrations.0004_webhookevent_candidate_id"
        )
        migration.reject_unpinned(apps, None)
        event.refresh_from_db()
        self.assertEqual(event.status, "failed")
        self.assertIsNone(event.candidate_id)
        self.assertEqual(event.payload, {"text": "retained"})

    def test_authorization_url_does_not_publish_and_failure_preserves_version(self):
        auth, pub = self.bind()
        old_candidate = pub.candidate_id
        self.bot.bot_name = "changed"
        self.bot.save()
        with (
            patch.object(wechat, "access_token", return_value="component"),
            patch.object(clients, "pre_auth_code", return_value="preauth"),
        ):
            response = self.write("/api/wx/auth-url", {"botId": self.bot.pk, "appid": auth.appid})
        self.assertEqual(response.status_code, 200, response.content)
        pub.refresh_from_db()
        self.assertEqual(pub.candidate_id, old_candidate)
        state = response.json()["data"]["state"]
        redirect = parse_qs(urlsplit(response.json()["data"]["authUrl"]).query)["redirect_uri"][0]
        self.assertEqual(parse_qs(urlsplit(redirect).query)["state"], [state])
        with (
            patch.object(wechat, "access_token", return_value="component"),
            patch.object(
                clients, "query_authorizer", return_value={"authorizer_appid": "other-account"}
            ),
        ):
            response = self.write("/api/wx/authCallback", {"state": state, "authCode": "secret"})
        self.assertEqual(response.status_code, 400)
        pub.refresh_from_db()
        self.assertEqual(pub.candidate_id, old_candidate)
        self.assertTrue(pub.active)
        self.assertEqual(WechatAuthorization.objects.get(pk=auth.pk).status, "unknown")

    def test_authorization_success_encrypted_credentials_and_single_use_state(self):
        auth, pub = self.bind()
        auth.status = "pending"
        auth.save()
        info = {
            "authorizer_appid": auth.appid,
            "authorizer_access_token": "access-secret",
            "authorizer_refresh_token": "refresh-secret",
            "expires_in": 7200,
        }
        transaction_depth = len(connection.atomic_blocks)

        def query_without_publication_lock(*args):
            self.assertEqual(len(connection.atomic_blocks), transaction_depth)
            return info

        with (
            patch.object(wechat, "access_token", return_value="component"),
            patch.object(
                clients, "query_authorizer", side_effect=query_without_publication_lock
            ) as exchange,
            patch.object(clients, "authorizer_identity", return_value="gh_wxaccount"),
        ):
            response = self.write("/api/wx/authCallback", {"state": "state", "authCode": "one-use"})
            self.assertEqual(response.status_code, 200, response.content)
            self.assertEqual(
                self.write(
                    "/api/wx/authCallback", {"state": "state", "authCode": "one-use"}
                ).status_code,
                400,
            )
            exchange.assert_called_once()
        raw = WechatCredential.objects.get(pk=auth.appid).encrypted
        self.assertNotIn("access-secret", raw)
        self.assertEqual(wechat.credentials(auth.appid)["refreshToken"], "refresh-secret")

    def test_other_user_cannot_exchange_state(self):
        auth, _ = self.bind()
        auth.status = "pending"
        auth.save()
        self.client.force_login(self.other)
        with patch.object(clients, "query_authorizer") as exchange:
            response = self.write("/api/wx/authCallback", {"state": "state", "authCode": "secret"})
        self.assertEqual(response.status_code, 403)
        exchange.assert_not_called()

    def test_credential_import_is_encrypted_and_requires_explicit_replacement(self):
        from io import StringIO

        value = json.dumps({"appid": "legacy", "refreshToken": "retained-token"})
        with patch("sys.stdin", StringIO(value)):
            call_command("import_wechat_credentials", stdout=StringIO())
        self.assertEqual(wechat.credentials("legacy")["refreshToken"], "retained-token")
        with patch("sys.stdin", StringIO(value)), self.assertRaises(CommandError):
            call_command("import_wechat_credentials", stdout=StringIO())
        with patch("sys.stdin", StringIO("java-serialized")), self.assertRaises(CommandError):
            call_command("import_wechat_credentials", stdout=StringIO())

    def test_ticket_callback_encrypts_storage_and_unauthorized_revokes(self):
        auth, pub = self.bind()
        message = (
            "<xml><AppId>wxcomponent</AppId><InfoType>component_verify_ticket</InfoType>"
            "<ComponentVerifyTicket>ticket-secret</ComponentVerifyTicket></xml>"
        )
        self.assertEqual(self.push(message, appid=None).status_code, 200)
        self.assertEqual(wechat.credentials("")["ticket"], "ticket-secret")
        message = (
            "<xml><AppId>wxcomponent</AppId><InfoType>unauthorized</InfoType>"
            "<AuthorizerAppid>wxaccount</AuthorizerAppid></xml>"
        )
        self.assertEqual(self.push(message, appid=None).status_code, 200)
        pub.refresh_from_db()
        self.assertFalse(pub.active)

    def test_voice_training_lifecycle_is_idempotent_and_scoped(self):
        task = VoiceTask.objects.create(
            uid=self.owner.pk, task_id="task", status="training", object_key=""
        )
        with patch.object(media.VoiceTraining, "request", return_value={"trainStatus": -1}):
            self.assertEqual(media.refresh_training(task).status, "training")
        with patch.object(
            media.VoiceTraining,
            "request",
            return_value={"trainStatus": 1, "assetId": "private-asset"},
        ):
            first = media.refresh_training(task)
            second = media.refresh_training(task)
        self.assertEqual(first.speaker_id, second.speaker_id)
        self.assertEqual(Speaker.objects.filter(asset_id="private-asset").count(), 1)
        self.client.force_login(self.other)
        self.assertEqual(self.client.get("/speaker/train/tasks/task").status_code, 403)
        self.assertEqual(self.client.get("/voice/tts-sign?code=private-asset").status_code, 403)
        self.assertEqual(
            self.write("/speaker/train/delete-speaker", {"id": first.speaker_id}).status_code, 403
        )
        self.assertFalse(Speaker.objects.get(pk=first.speaker_id).deleted)

    def test_voice_submission_uncertainty_is_persisted_without_resubmission(self):
        audio = SimpleUploadedFile(
            "voice.pcm", b"\0\0" * 24000, content_type="application/octet-stream"
        )
        with (
            patch.object(
                media.VoiceTraining, "request", side_effect=["task-id", UpstreamError("timeout")]
            ) as call,
            patch.object(
                media_client,
                "platform",
                return_value={"platformAppId": "app", "platformApiKey": "key"},
            ),
        ):
            response = self.client.post("/speaker/train/create?segId=1&sex=1", {"file": audio})
        self.assertEqual(response.status_code, 502)
        self.assertEqual(call.call_count, 2)
        self.assertEqual(VoiceTask.objects.get(task_id="task-id").status, "unknown")
        self.assertFalse(Speaker.objects.exists())

    def test_avatar_creation_scope_and_untrusted_history_separation(self):
        response = self.write(
            "/talkAgent/create", {"name": "avatar", "botDesc": "description", "talkAgentConfig": {}}
        )
        self.assertEqual(response.status_code, 200, response.content)
        data = response.json()["data"]
        bot = Agent.objects.get(pk=data["botId"])
        self.assertEqual(bot.version, 4)
        self.assertEqual(WorkflowBot.objects.get(bot_id=bot.pk).flow_id, data["flowId"])
        self.assertTrue(WorkflowMediaConfig.objects.filter(bot_id=bot.pk).exists())
        response = self.write(
            "/talkAgent/saveHistory",
            {"botId": bot.pk, "sessionId": "session", "req": "q", "resp": "untrusted"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(MediaHistory.objects.get().answer, "untrusted")
        self.client.force_login(self.other)
        self.assertEqual(
            self.write(
                "/talkAgent/updateConfig", {"botId": bot.pk, "talkAgentConfig": {}}
            ).status_code,
            403,
        )
        self.assertEqual(
            self.write(
                "/talkAgent/saveHistory", {"botId": bot.pk, "sessionId": "session"}
            ).status_code,
            403,
        )

    @patch("astron_console.publishing.services.validate_graph")
    def test_avatar_canvas_save_refresh_version_restore_and_publish_keep_media(self, validate):
        response = self.write(
            "/talkAgent/create",
            {
                "name": "avatar",
                "botDesc": "description",
                "avatar": "https://example.com/avatar.png",
                "botType": 2,
                "talkAgentConfig": {"interactType": 2, "vcn": "x5_lingxiaoyue_flow"},
            },
        )
        self.assertEqual(response.status_code, 200, response.content)
        created = response.json()["data"]
        url = f"/workflow?id={created['maasId']}"
        detail = self.client.get(url).json()["data"]
        self.assertEqual(detail["avatarIcon"], "https://example.com/avatar.png")
        self.assertEqual(str(detail["category"]), "2")
        self.assertEqual(detail["advancedConfig"]["textToSpeech"]["vcn_cn"], "x5_lingxiaoyue_flow")
        self.assertEqual(
            json.loads(self.client.get(url).json()["data"]["flowConfig"])["interactType"], 2
        )
        response = self.client.put(
            "/workflow",
            json.dumps(
                {
                    "id": created["maasId"],
                    "flowConfig": {"interactType": 1},
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        detail = self.client.get(url).json()["data"]
        self.assertEqual(json.loads(detail["flowConfig"])["interactType"], 1)
        saved = self.write("/workflow/version", {"flowId": created["flowId"]})
        self.assertEqual(saved.status_code, 200, saved.content)
        version = saved.json()["data"]
        self.assertEqual(json.loads(version["flowConfig"])["interactType"], 1)
        self.assertEqual(
            version["advancedConfig"]["textToSpeech"]["vcn_cn"],
            "x5_lingxiaoyue_flow",
        )
        self.write(
            "/talkAgent/updateConfig",
            {"botId": created["botId"], "talkAgentConfig": {"interactType": 2}},
        )
        self.assertEqual(
            json.loads(self.client.get(url).json()["data"]["flowConfig"])["interactType"], 2
        )
        candidate = services.create_candidate(
            self.scope, created["botId"], version_id=version["id"]
        )
        self.assertEqual(candidate.definition["talkAgentConfig"]["interactType"], 1)
        services.activate(candidate, "MARKET")
        public = self.client.get(f"/workflow/web/info?botId={created['botId']}")
        self.assertEqual(public.status_code, 200, public.content)
        self.assertEqual(public.json()["data"]["talkAgentConfig"]["interactType"], 1)
        candidate2 = services.create_candidate(self.scope, created["botId"])
        self.assertEqual(candidate2.definition["talkAgentConfig"]["interactType"], 2)
        frozen_version = WorkflowVersion.objects.get(pk=candidate2.version_id)
        frozen_media = WorkflowMediaConfig.objects.get(
            flow_id=created["flowId"],
            version_num=frozen_version.version_num,
        )
        self.assertEqual(json.loads(frozen_media.config)["interactType"], 2)
        restored = self.write("/workflow/version/restore", {"id": version["id"]})
        self.assertEqual(restored.status_code, 200, restored.content)
        self.assertEqual(
            json.loads(self.client.get(url).json()["data"]["flowConfig"])["interactType"], 1
        )
        self.assertEqual(
            self.client.get(url).json()["data"]["advancedConfig"]["textToSpeech"]["vcn_cn"],
            "x5_lingxiaoyue_flow",
        )

    def test_speaker_rename_rejects_legacy_column_overflow(self):
        speaker = Speaker.objects.create(create_uid=self.owner.pk, name="original", task_id="old")
        response = self.write(
            "/speaker/train/update-speaker", {"id": speaker.pk, "name": "名" * 65}
        )
        self.assertEqual(response.status_code, 400)
        speaker.refresh_from_db()
        self.assertEqual(speaker.name, "original")
        response = self.write(
            "/speaker/train/update-speaker", {"id": speaker.pk, "name": "名" * 64}
        )
        self.assertEqual(response.status_code, 200)

    def test_legacy_wechat_binding_requires_verified_explicit_recovery(self):
        from io import StringIO

        binding = WechatBinding.objects.create(
            appid="legacy", uid=self.owner.pk, bot_id=self.bot.pk, status=1
        )
        candidate = services.create_candidate(self.scope, self.bot.pk)
        for _ in range(2):
            self.assertEqual(legacy.adopt_legacy_wechat()["unresolved"], 1)
        self.assertEqual(
            LegacyPublicationIssue.objects.filter(source=f"wechat:{binding.pk}").count(), 1
        )
        self.assertFalse(Publication.objects.exists())
        wechat.save_credentials("legacy", {"refreshToken": "old-secret"})
        self.assertEqual(legacy.adopt_legacy_wechat()["unresolved"], 1)
        with self.assertRaises(CommandError):
            call_command("adopt_legacy_publications", stdout=StringIO())
        self.bot.bot_name = "unapproved draft"
        self.bot.save()
        with patch.object(wechat, "authorizer_token", side_effect=UpstreamError("rejected")):
            with self.assertRaises(CommandError):
                call_command(
                    "restore_wechat_binding",
                    binding_id=binding.pk,
                    candidate_id=candidate.pk,
                    confirm_publication=True,
                    stdout=StringIO(),
                )
        self.assertFalse(Publication.objects.exists())
        transaction_depth = len(connection.atomic_blocks)

        def identity_without_publication_lock(*args):
            self.assertEqual(len(connection.atomic_blocks), transaction_depth)
            return "gh_legacy"

        with (
            patch.object(wechat, "authorizer_token", return_value="token"),
            patch.object(wechat, "access_token", return_value="component"),
            patch.object(
                clients, "authorizer_identity", side_effect=identity_without_publication_lock
            ),
        ):
            call_command(
                "restore_wechat_binding",
                binding_id=binding.pk,
                candidate_id=candidate.pk,
                confirm_publication=True,
                stdout=StringIO(),
            )
        self.assertEqual(Publication.objects.get().candidate.definition["botName"], "retained")
        self.assertEqual(
            legacy.adopt_legacy_wechat(), {"imported": 0, "existing": 1, "unresolved": 0}
        )
        binding.refresh_from_db()
        self.assertEqual(
            (binding.uid, binding.bot_id, binding.status), (self.owner.pk, self.bot.pk, 1)
        )
        self.assertEqual(wechat.credentials("legacy")["refreshToken"], "old-secret")


class AdoptionTests(TransactionTestCase):
    def test_repeated_adoption_retains_ids_unknown_columns_and_original_credentials(self):
        Speaker.objects.create(id=192, create_uid="old-uid", asset_id="old-asset", name="old-name")
        with connection.cursor() as cursor:
            cursor.execute("ALTER TABLE custom_speaker ADD COLUMN external_secret TEXT")
            cursor.execute(
                "UPDATE custom_speaker SET external_secret=%s WHERE id=192", ["retained-secret"]
            )
        try:
            migration = importlib.import_module("astron_console.channels.migrations.0001_initial")
            for _ in range(2):
                with connection.schema_editor() as editor:
                    migration.adopt(apps, editor)
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT id,create_uid,asset_id,external_secret FROM custom_speaker WHERE id=192"
                )
                self.assertEqual(
                    cursor.fetchone(), (192, "old-uid", "old-asset", "retained-secret")
                )
        finally:
            with connection.cursor() as cursor:
                cursor.execute("ALTER TABLE custom_speaker DROP COLUMN external_secret")
