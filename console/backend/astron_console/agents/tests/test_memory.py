import base64
import json
from contextlib import contextmanager
from unittest.mock import Mock, patch

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from django.test import TransactionTestCase, override_settings
from django.urls import include, path

from astron_console.accounts.models import User, UserProfile
from astron_console.agents import memory
from astron_console.agents.models import Agent, MemoryConfig
from astron_console.resources.common import UpstreamError
from astron_console.resources.models import ConfigInfo
from astron_console.spaces.models import Space, SpaceMember, SpacePermission
from astron_console.spaces.permissions import ResourceScope

urlpatterns = [path("", include("astron_console.agents.definition_urls"))]


@override_settings(ROOT_URLCONF=__name__)
class MemoryTests(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create_user(id="original-user", username="owner")
        UserProfile.objects.create(uid=self.user.pk, username=self.user.username)
        self.client.force_login(self.user)
        self.agent = Agent.objects.create(uid=self.user.pk, bot_name="memory")
        self.scope = ResourceScope(self.user.pk, None, None)
        self.config = MemoryConfig.objects.create(
            bot_id=self.agent.pk, uid=self.user.pk, enabled=1, api_key_ciphertext="old"
        )
        self.remote = Mock()

        @contextmanager
        def fake_client(row):
            yield self.remote

        self.patcher = patch.object(memory, "client_for", fake_client)
        self.patcher.start()
        self.addCleanup(self.patcher.stop)

    def test_original_rsa_ciphertext_and_config_preserved(self):
        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        encoded = base64.b64encode(
            key.private_bytes(
                serialization.Encoding.DER,
                serialization.PrivateFormat.PKCS8,
                serialization.NoEncryption(),
            )
        ).decode()
        ConfigInfo.objects.create(
            category="MODEL_SECRET_KEY", code="private_key", value=encoded, is_valid=1
        )
        # Mirrors the old Java chunked RSA/ECB/PKCS1Padding format.
        original = "retained-secret" * 30
        data = original.encode()
        cipher = base64.b64encode(
            b"".join(
                key.public_key().encrypt(data[i : i + 245], padding.PKCS1v15())
                for i in range(0, len(data), 245)
            )
        ).decode()
        self.assertEqual(memory.decrypt(cipher), original)
        self.config.api_key_ciphertext = cipher
        self.config.save()
        response = self.client.put(
            f"/agents/{self.agent.pk}/memory/config",
            json.dumps({"enabled": False}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.config.refresh_from_db()
        self.assertEqual(self.config.api_key_ciphertext, cipher)
        self.assertNotIn(cipher.encode(), response.content)
        self.assertNotIn(original.encode(), response.content)

    def test_scoped_list_and_delete_cannot_cross_space(self):
        self.remote.get_all.return_value = {
            "results": [
                {"id": "old-personal", "memory": "old", "metadata": {}},
                {"id": "new-personal", "memory": "new", "metadata": {"space_id": 0}},
                {"id": "other-space", "memory": "secret", "metadata": {"space_id": 5}},
                {"id": "other-user", "memory": "secret", "user_id": "someone", "metadata": {}},
            ],
            "next": None,
        }
        response = self.client.get(f"/agents/{self.agent.pk}/memory/items")
        self.assertEqual(
            [x["id"] for x in response.json()["data"]], ["old-personal", "new-personal"]
        )
        response = self.client.delete(f"/agents/{self.agent.pk}/memory/items?memoryId=other-space")
        self.assertEqual(response.status_code, 404)
        self.remote.delete.assert_not_called()
        response = self.client.delete(f"/agents/{self.agent.pk}/memory/items")
        self.assertEqual(response.json()["data"]["deleted"], 2)
        self.assertEqual(
            [x.args[0] for x in self.remote.delete.call_args_list], ["old-personal", "new-personal"]
        )
        self.remote.get_all.assert_called_with(
            filters={"AND": [{"user_id": "original-user"}, {"app_id": f"bot-{self.agent.pk}"}]},
            page=1,
            page_size=100,
        )

    def test_personal_config_never_used_for_space_agent(self):
        space = Space.objects.create(uid=self.user.pk, name="space")
        SpaceMember.objects.create(uid=self.user.pk, space_id=space.pk, role=1)
        SpacePermission.objects.update_or_create(
            permission_key="MyBotController_getBotDetail_POST", defaults={"owner": True}
        )
        self.agent.space_id = space.pk
        self.agent.save()
        scoped = ResourceScope(self.user.pk, space.pk, None)
        self.assertIsNone(memory.config_for(scoped, self.agent))
        self.assertEqual(memory.search(scoped, self.agent, "question"), [])
        self.remote.search.assert_not_called()
        self.config.refresh_from_db()
        self.assertEqual(self.config.space_id, 0)

    def test_releases_share_stable_memory_namespace_and_explicit_add_is_accepted(self):
        self.remote.search.return_value = {
            "results": [{"id": "old", "memory": "preference", "metadata": {}}]
        }
        self.assertEqual(memory.search(self.scope, self.agent, "hello")[0]["memory"], "preference")
        memory.remember(self.scope, self.agent, "tea please", "Tea it is", "run-1")
        kwargs = self.remote.add.call_args.kwargs
        self.assertEqual(kwargs["app_id"], f"bot-{self.agent.pk}")
        self.assertEqual(kwargs["metadata"]["space_id"], 0)
        self.assertNotIn("version", kwargs)
        self.remote.add.return_value = {"event_id": "pending"}
        response = self.client.post(
            f"/agents/{self.agent.pk}/memory/items",
            json.dumps({"memory": "I like tea"}),
            content_type="application/json",
        )
        self.assertEqual(response.json()["data"], {"accepted": True, "eventId": "pending"})
        self.assertFalse(self.remote.add.call_args.kwargs["infer"])

    def test_v3_pagination_filters_every_page_before_scoped_clear(self):
        self.assertEqual(self.config.space_id, 0)
        self.assertEqual(memory.config_for(self.scope, self.agent).pk, self.config.pk)
        self.remote.get_all.side_effect = [
            {
                "count": 3,
                "results": [{"id": "old", "memory": "kept", "metadata": {}}],
                "next": "https://api.mem0.ai/v3/memories/?page=2&page_size=100",
            },
            {
                "count": 3,
                "results": [
                    {"id": "own", "memory": "kept", "metadata": {"space_id": "0"}},
                    {"id": "team", "memory": "not ours", "metadata": {"space_id": 7}},
                ],
                "next": None,
            },
        ]
        response = self.client.delete(f"/agents/{self.agent.pk}/memory/items")
        self.assertEqual(response.json()["data"]["deleted"], 2)
        self.assertEqual(
            [call.args[0] for call in self.remote.delete.call_args_list], ["old", "own"]
        )
        self.assertEqual(
            [call.kwargs["page"] for call in self.remote.get_all.call_args_list], [1, 2]
        )
        for call in self.remote.get_all.call_args_list:
            self.assertEqual(call.kwargs["filters"], memory.filters(self.scope, self.agent))
        self.remote.delete_all.assert_not_called()

    def test_invalid_memory_response_or_incomplete_pagination_does_not_delete(self):
        self.remote.get_all.side_effect = [
            {"results": [{"id": "old", "metadata": {}}], "next": "page2"},
            {"results": [], "next": "page3"},
        ]
        response = self.client.delete(f"/agents/{self.agent.pk}/memory/items")
        self.assertEqual(response.status_code, 502)
        self.remote.delete.assert_not_called()
        for payload in [None, {"error": "failure"}, {"results": "invalid"}]:
            with self.assertRaises(UpstreamError):
                memory.results(payload)
        self.assertEqual(memory.results([{"id": "legacy"}]), [{"id": "legacy"}])

    def test_missing_original_rsa_key_fails_without_creating_replacement(self):
        with self.assertRaises(UpstreamError):
            memory.decrypt(self.config.api_key_ciphertext)
        with self.assertRaises(UpstreamError):
            memory.encrypt("replacement")
        self.assertFalse(ConfigInfo.objects.filter(category="MODEL_SECRET_KEY").exists())
        self.config.refresh_from_db()
        self.assertEqual(self.config.api_key_ciphertext, "old")
