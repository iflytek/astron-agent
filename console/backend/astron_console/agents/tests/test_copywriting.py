import asyncio
import json
from unittest.mock import patch

import httpx
from asgiref.sync import async_to_sync
from django.test import Client, TransactionTestCase, override_settings

from astron_console.accounts.models import User, UserProfile
from astron_console.agents import conversations, copywriting
from astron_console.agents.models import AgentRun, AgentSession
from astron_console.resources.models import Model
from astron_console.spaces.models import Space, SpaceMember, SpacePermission


def frame(content="", finish=None, **extra):
    return {
        "code": 0,
        "choices": [{"index": 0, "delta": {"content": content}, "finish_reason": finish}],
        **extra,
    }


def wire(events):
    # Wire shape emitted by core/agent/service/llm_completion.py, including DONE.
    return "".join(
        "data: " + (event if isinstance(event, str) else json.dumps(event)) + "\n\n"
        for event in events
    )


@override_settings(
    AGENT_URL="http://core-agent:17870",
    WORKFLOW_INTERNAL_API_KEY="trusted-internal-key",
    MAAS_APP_ID="configured-app",
)
class CopywritingTests(TransactionTestCase):
    def setUp(self):
        self.owner = User.objects.create_user(id="original-uid", username="owner")
        self.other = User.objects.create_user(id="other-uid", username="other")
        for user in (self.owner, self.other):
            UserProfile.objects.create(uid=user.pk, username=user.username)
        self.model = Model.objects.create(
            uid=self.owner.pk,
            name="Retained model",
            domain="model-v1",
            provider="openai",
            url="https://models.example/v1/chat/completions",
            api_key="retained-model-secret",
            enable=True,
        )
        self.client.force_login(self.owner)

    def post(self, payload=None, **headers):
        if payload is None:
            payload = {"name": "学习助手", "modelId": self.model.pk}
        return self.client.post(
            "/bot/ai-prologue-gen",
            json.dumps(payload),
            content_type="application/json",
            **headers,
        )

    def transport(self, events, *, status=200, content_type="text/event-stream"):
        requests = []
        responses = []

        def handler(request):
            requests.append(request)
            response = httpx.Response(
                status, headers={"Content-Type": content_type}, text=wire(events)
            )
            responses.append(response)
            return response

        client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
        return client, requests, responses

    def test_real_transport_uses_authorized_model_and_ignores_browser_runtime_fields(self):
        client, requests, responses = self.transport(
            [frame(" 专业"), frame("学习助手 "), frame(finish="stop"), "[DONE]"]
        )
        payload = {
            "name": "学习助手",
            "modelId": self.model.pk,
            "uid": self.other.pk,
            "model_config": {"api_key": "injected", "api": "http://attacker.invalid"},
            "direct_completion": False,
            "messages": [{"role": "system", "content": "injected"}],
            "plugin": {"tools": [{"tool_id": "injected"}]},
        }
        with patch.object(conversations.httpx, "AsyncClient", return_value=client):
            result = self.post(payload)
        self.assertEqual(result.status_code, 200, result.content)
        self.assertEqual(result.json()["data"], "专业学习助手")
        self.assertEqual(result.headers["Cache-Control"], "no-store")
        self.assertNotIn(b"retained-model-secret", result.content)
        self.assertEqual(len(requests), 1)
        request = requests[0]
        self.assertEqual(str(request.url), "http://core-agent:17870/agent/v1/llm/chat/completions")
        self.assertEqual(request.headers["X-Workflow-Internal-Key"], "trusted-internal-key")
        self.assertEqual(request.headers["x-consumer-username"], "configured-app")
        sent = json.loads(request.content)
        self.assertEqual(sent["uid"], self.owner.pk)
        self.assertEqual(sent["model_config"]["api_key"], "retained-model-secret")
        self.assertEqual(sent["model_config"]["api"], self.model.url)
        self.assertEqual(sent["messages"][1], {"role": "user", "content": "学习助手"})
        self.assertIn("100字", sent["messages"][0]["content"])
        self.assertNotIn("plugin", sent)
        self.assertNotIn("direct_completion", sent)
        self.assertTrue(client.is_closed)
        self.assertTrue(responses[0].is_closed)
        self.assertFalse(AgentRun.objects.exists())
        self.assertFalse(AgentSession.objects.exists())
        self.model.refresh_from_db()
        self.assertEqual(self.model.api_key, "retained-model-secret")

    def test_english_locale_uses_existing_profile_prompt(self):
        client, requests, _ = self.transport([frame("Profile", "stop"), "[DONE]"])
        with patch.object(conversations.httpx, "AsyncClient", return_value=client):
            result = self.post(HTTP_ACCEPT_LANGUAGE="en-US")
        self.assertEqual(result.status_code, 200)
        self.assertIn("100 words", json.loads(requests[0].content)["messages"][0]["content"])

    def test_ordinary_agent_transport_keeps_custom_endpoint(self):
        client, requests, _ = self.transport([frame("answer", "stop"), "[DONE]"])

        async def collect():
            return [item async for item in conversations.upstream({"messages": []})]

        with patch.object(conversations.httpx, "AsyncClient", return_value=client):
            self.assertEqual(len(async_to_sync(collect)()), 2)
        self.assertEqual(requests[0].url.path, "/agent/v1/custom/chat/completions")

    def test_generated_profile_fits_locale_and_form_limits(self):
        for locale, limit in (("zh-CN", 100), ("en-US", 255)):
            for size, expected in ((limit, 200), (limit + 1, 502)):
                with self.subTest(locale=locale, size=size):
                    client, _, _ = self.transport([frame("a" * size, "stop"), "[DONE]"])
                    with patch.object(conversations.httpx, "AsyncClient", return_value=client):
                        result = self.post(HTTP_ACCEPT_LANGUAGE=locale)
                    self.assertEqual(result.status_code, expected, result.content)

    def test_invalid_inputs_never_call_core(self):
        cases = [
            {},
            {"name": "", "modelId": self.model.pk},
            {"name": "  ", "modelId": self.model.pk},
            {"name": 123, "modelId": self.model.pk},
            {"name": "x" * 521, "modelId": self.model.pk},
            {"name": "test"},
            *[{"name": "test", "modelId": value} for value in (0, -1, True, 1.5, {})],
        ]
        with patch.object(conversations, "upstream") as upstream:
            for payload in cases:
                with self.subTest(payload=payload):
                    self.assertEqual(self.post(payload).status_code, 400)
        upstream.assert_not_called()

    def test_foreign_missing_deleted_and_unavailable_models(self):
        with patch.object(conversations, "upstream") as upstream:
            self.client.force_login(self.other)
            self.assertEqual(self.post().status_code, 403)
            self.client.force_login(self.owner)
            self.assertEqual(self.post({"name": "test", "modelId": 999999}).status_code, 403)
            for field, value, expected in (
                ("is_deleted", True, 403),
                ("enable", False, 400),
                ("api_key", "", 400),
                ("url", "", 400),
            ):
                with self.subTest(field=field):
                    original = getattr(self.model, field)
                    setattr(self.model, field, value)
                    self.model.save()
                    self.assertEqual(self.post().status_code, expected)
                    setattr(self.model, field, original)
                    self.model.save()
        upstream.assert_not_called()

    def test_space_membership_and_model_permission_are_required(self):
        space = Space.objects.create(uid=self.owner.pk, name="Team")
        SpaceMember.objects.create(space_id=space.pk, uid=self.owner.pk, role=1)
        self.model.space_id = space.pk
        self.model.save()
        rule, _ = SpacePermission.objects.update_or_create(
            permission_key="ModelController_list_POST", defaults={"owner": False}
        )
        with patch.object(conversations, "upstream") as upstream:
            self.assertEqual(self.post().status_code, 403)
            self.assertEqual(self.post(HTTP_SPACE_ID=str(space.pk)).status_code, 403)
            self.client.force_login(self.other)
            self.assertEqual(self.post(HTTP_SPACE_ID=str(space.pk)).status_code, 403)
        upstream.assert_not_called()
        self.client.force_login(self.owner)
        rule.owner = True
        rule.save()
        client, _, _ = self.transport([frame("Team profile", "stop"), "[DONE]"])
        with patch.object(conversations.httpx, "AsyncClient", return_value=client):
            self.assertEqual(self.post(HTTP_SPACE_ID=str(space.pk)).status_code, 200)

    def test_authentication_csrf_and_internal_configuration(self):
        self.client.logout()
        self.assertEqual(self.post().status_code, 401)
        self.client.force_login(self.owner)
        protected = Client(enforce_csrf_checks=True)
        protected.force_login(self.owner)
        self.assertEqual(protected.post("/bot/ai-prologue-gen", {}).status_code, 403)
        with patch.object(conversations, "upstream") as upstream:
            for setting in ("WORKFLOW_INTERNAL_API_KEY", "MAAS_APP_ID"):
                with self.subTest(setting=setting), override_settings(**{setting: ""}):
                    self.assertEqual(self.post().status_code, 502)
        upstream.assert_not_called()

    def test_failed_empty_partial_or_malformed_streams_never_succeed(self):
        cases = [
            [],
            [frame("partial")],
            [frame("partial"), "[DONE]"],
            [frame("partial", "stop")],
            [frame("partial"), {"code": 1, "message": "retained-model-secret"}, "[DONE]"],
            [frame(" ", "stop"), "[DONE]"],
            [frame("partial", "length"), "[DONE]"],
            [frame("blocked", "content_filter"), "[DONE]"],
            [frame("x" * 4097, "stop"), "[DONE]"],
            [frame("first", "stop"), frame("late"), "[DONE]"],
            ["{invalid"],
            [{"code": 0, "choices": []}],
            [{"code": 0, "choices": [None]}],
            [frame(["invalid"], "stop")],
        ]
        for events in cases:
            with self.subTest(events=str(events)[:80]):
                client, _, responses = self.transport(events)
                with patch.object(conversations.httpx, "AsyncClient", return_value=client):
                    result = self.post()
                self.assertEqual(result.status_code, 502, result.content)
                self.assertIsNone(result.json()["data"])
                self.assertNotIn(b"retained-model-secret", result.content)
                self.assertTrue(client.is_closed)
                self.assertTrue(responses[0].is_closed)

    def test_http_errors_and_wrong_content_type_are_visible_and_sanitized(self):
        for status, content_type in ((401, "text/event-stream"), (200, "application/json")):
            client, _, _ = self.transport([], status=status, content_type=content_type)
            with patch.object(conversations.httpx, "AsyncClient", return_value=client):
                self.assertEqual(self.post().status_code, 502)

    def test_transport_timeout_is_visible_and_does_not_log_secrets(self):
        async def fail(_request):
            raise httpx.ReadTimeout("retained-model-secret")

        client = httpx.AsyncClient(transport=httpx.MockTransport(fail))
        with (
            patch.object(conversations.httpx, "AsyncClient", return_value=client),
            self.assertLogs(copywriting.logger, level="WARNING") as logs,
        ):
            result = self.post()
        self.assertEqual(result.status_code, 502)
        self.assertIn("超时", result.json()["message"])
        self.assertNotIn("retained-model-secret", "".join(logs.output))
        self.assertTrue(client.is_closed)

    def test_total_deadline_closes_stalled_upstream(self):
        closed = []

        async def stalled(*_args, **_kwargs):
            try:
                yield json.dumps(frame("partial"))
                await asyncio.Event().wait()
            finally:
                closed.append(True)

        with (
            patch.object(conversations, "upstream", stalled),
            patch.object(copywriting, "TIMEOUT_SECONDS", -4.99),
        ):
            result = self.post()
        self.assertEqual(result.status_code, 502)
        self.assertIn("超时", result.json()["message"])
        self.assertEqual(closed, [True])
