import importlib
import json

from django.apps import apps
from django.core.exceptions import ValidationError
from django.db import connection
from django.test import TransactionTestCase, override_settings
from django.urls import include, path

from astron_console.accounts.models import User, UserProfile
from astron_console.agents.definitions import READ, WRITE, definition, resolve_version
from astron_console.agents.models import Agent, AgentState, AgentVersion, Personality
from astron_console.resources.models import Model
from astron_console.spaces.models import Space, SpaceMember, SpacePermission
from astron_console.spaces.permissions import ResourceScope

urlpatterns = [path("", include("astron_console.agents.definition_urls"))]


@override_settings(ROOT_URLCONF=__name__)
class DefinitionTests(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create_user(id="original-uid", username="owner")
        UserProfile.objects.create(uid=self.user.pk, username=self.user.username)
        self.other = User.objects.create_user(id="other-uid", username="other")
        UserProfile.objects.create(uid=self.other.pk, username=self.other.username)
        self.client.force_login(self.user)
        self.model = Model.objects.create(
            uid=self.user.pk, name="model", domain="model", provider="openai"
        )
        self.agent = Agent.objects.create(uid=self.user.pk, bot_name="old", model_id=self.model.pk)

    def write(self, method, path, data, **kwargs):
        return getattr(self.client, method)(
            path, json.dumps(data), content_type="application/json", **kwargs
        )

    def test_immutable_snapshot_and_draft_independence(self):
        response = self.write("post", f"/agents/{self.agent.pk}/versions", {})
        self.assertEqual(response.status_code, 200, response.content)
        version_id = response.json()["data"]["id"]
        response = self.write(
            "put", f"/agents/{self.agent.pk}/published-version", {"versionId": version_id}
        )
        self.assertEqual(response.status_code, 200, response.content)
        response = self.write("put", f"/agents/{self.agent.pk}", {"botName": "new"})
        self.assertEqual(response.status_code, 200, response.content)
        resolved = resolve_version(ResourceScope(self.user.pk, None, None), self.agent.pk)
        self.assertEqual(resolved["definition"]["botName"], "old")
        row = AgentVersion.objects.get(pk=version_id)
        row.definition = {}
        with self.assertRaises(ValidationError):
            row.save()
        other = Agent.objects.create(uid=self.user.pk, bot_name="other agent")
        response = self.write(
            "put", f"/agents/{other.pk}/published-version", {"versionId": version_id}
        )
        self.assertEqual(response.status_code, 404)
        self.assertIsNone(AgentState.objects.filter(agent_id=other.pk).first())

    def test_unauthorized_resource_update_rolls_back_and_workflows_untouched(self):
        forbidden = Model.objects.create(uid=self.other.pk)
        response = self.write(
            "put", f"/agents/{self.agent.pk}", {"botName": "leak", "modelId": forbidden.pk}
        )
        self.assertEqual(response.status_code, 403, response.content)
        self.agent.refresh_from_db()
        self.assertEqual(self.agent.bot_name, "old")
        workflow = Agent.objects.create(
            uid=self.user.pk, version=3, bot_name="workflow", workflows='[{"id":1}]'
        )
        response = self.write("put", f"/agents/{workflow.pk}", {"botName": "changed"})
        self.assertEqual(response.status_code, 404)
        workflow.refresh_from_db()
        self.assertEqual(workflow.bot_name, "workflow")
        self.assertNotIn(
            workflow.pk, [r["id"] for r in self.client.get("/agents").json()["data"]["records"]]
        )

    def test_identity_and_scope_and_permission_enforced(self):
        self.client.force_login(self.other)
        self.assertEqual(self.client.get(f"/agents/{self.agent.pk}").status_code, 403)
        self.client.force_login(self.user)
        space = Space.objects.create(uid=self.user.pk, name="scope")
        SpaceMember.objects.create(uid=self.user.pk, space_id=space.pk, role=3)
        scoped = Agent.objects.create(uid=self.other.pk, space_id=space.pk, bot_name="shared")
        SpacePermission.objects.update_or_create(permission_key=READ, defaults={"member": True})
        SpacePermission.objects.update_or_create(permission_key=WRITE, defaults={"member": False})
        self.assertEqual(self.client.get(f"/agents/{scoped.pk}").status_code, 403)
        self.assertEqual(
            self.client.get(f"/agents/{scoped.pk}", HTTP_SPACE_ID=str(space.pk)).status_code, 200
        )
        self.assertEqual(
            self.write(
                "put", f"/agents/{scoped.pk}", {"botName": "denied"}, HTTP_SPACE_ID=str(space.pk)
            ).status_code,
            403,
        )
        self.assertEqual(
            self.write("put", f"/agents/{self.agent.pk}", {"uid": self.other.pk}).status_code, 400
        )

    def test_retained_secret_fields_not_returned_and_no_read_side_effects(self):
        self.agent.skills = '[{"fileId": 9,"downloadUrl":"https://example.com?secret=abc"}]'
        self.agent.mcp_server_urls = '["https://example.com?token=secret"]'
        self.agent.tools = '[{"id":8,"apiKey":"secret"}]'
        self.agent.workflows = '[{"id":1,"credentials":"secret"}]'
        self.agent.save()
        response = self.client.get(f"/agents/{self.agent.pk}")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn(b"secret", response.content)
        self.assertEqual(response.json()["data"]["skills"], [9])
        self.assertEqual(response.json()["data"]["configuredMcpCount"], 1)
        self.assertFalse(AgentState.objects.filter(agent_id=self.agent.pk).exists())
        self.agent.refresh_from_db()
        self.assertIn("secret", self.agent.mcp_server_urls)

    def test_personality_favorite_and_soft_delete_preserve_business_rows(self):
        response = self.write(
            "put",
            f"/agents/{self.agent.pk}",
            {
                "personality": {
                    "enabled": True,
                    "personality": "kind",
                    "sceneType": 1,
                    "sceneInfo": "home",
                }
            },
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(definition(self.agent)["personality"]["personality"], "kind")
        self.assertEqual(Personality.objects.get(bot_id=self.agent.pk).config_type, 0)
        self.write("post", f"/agents/{self.agent.pk}/favorite", {"favorite": True})
        self.assertTrue(self.client.get(f"/agents/{self.agent.pk}").json()["data"]["favorite"])
        self.assertEqual(self.write("delete", f"/agents/{self.agent.pk}", {}).status_code, 200)
        self.agent.refresh_from_db()
        self.assertEqual(self.agent.uid, "original-uid")
        self.assertEqual(self.agent.is_delete, 1)
        self.assertTrue(Personality.objects.filter(bot_id=self.agent.pk).exists())

    def test_adoption_repeated_preserves_unknown_columns_and_ids(self):
        migration = importlib.import_module("astron_console.agents.migrations.0001_definitions")
        with connection.cursor() as cursor:
            cursor.execute("ALTER TABLE chat_bot_base ADD COLUMN preserved_external_config TEXT")
            cursor.execute(
                "UPDATE chat_bot_base SET preserved_external_config=%s WHERE id=%s",
                ["retained", self.agent.pk],
            )
        try:
            for _ in range(2):
                with connection.schema_editor() as editor:
                    migration.adopt_definitions(apps, editor)
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT uid,preserved_external_config FROM chat_bot_base WHERE id=%s",
                    [self.agent.pk],
                )
                self.assertEqual(cursor.fetchone(), ("original-uid", "retained"))
        finally:
            with connection.cursor() as cursor:
                cursor.execute("ALTER TABLE chat_bot_base DROP COLUMN preserved_external_config")

    def test_legacy_tool_read_save_keeps_current_authorized_version(self):
        from astron_console.agents.resource_resolution import resolve_resources
        from astron_console.resources.models import Tool

        Tool.objects.create(user_id=self.user.pk, tool_id="tool@retained", version="V1.0")
        latest = Tool.objects.create(user_id=self.user.pk, tool_id="tool@retained", version="V2.0")
        # A later private version from another owner is not a selectable replacement.
        Tool.objects.create(user_id=self.other.pk, tool_id="tool@retained", version="V3.0")
        self.agent.tools = json.dumps([{"toolId": "tool@retained", "name": "existing"}])
        self.agent.save()
        self.model.enable = True
        self.model.api_key = "kept-in-runtime"
        self.model.url = "https://model.invalid/v1"
        self.model.save()
        scope = ResourceScope(self.user.pk, None, None)
        before = resolve_resources(scope, definition(self.agent))["plugin"]["tools"]
        response = self.client.get(f"/agents/{self.agent.pk}")
        self.assertEqual(response.status_code, 200, response.content)
        tools = response.json()["data"]["tools"]
        self.assertEqual(tools, [latest.pk])
        response = self.write(
            "put", f"/agents/{self.agent.pk}", {"botName": "renamed", "tools": tools}
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.agent.refresh_from_db()
        after = resolve_resources(scope, definition(self.agent))["plugin"]["tools"]
        self.assertEqual(before, after)
        self.assertEqual(after, [{"tool_id": "tool@retained", "version": "V2.0"}])

    def test_mcp_explicit_replacement_preserves_stored_legacy_config(self):
        from astron_console.resources.models import McpConfig

        original = '["https://old.invalid/mcp"]'
        self.agent.mcp_server_urls = original
        self.agent.save()
        response = self.write("put", f"/agents/{self.agent.pk}", {"botName": "renamed"})
        self.assertEqual(response.status_code, 200, response.content)
        self.agent.refresh_from_db()
        self.assertEqual(definition(self.agent)["mcpServerUrls"], ["https://old.invalid/mcp"])
        selected = McpConfig.objects.create(
            uid=self.user.pk, name="new", sort_link="https://new.invalid/mcp"
        )
        response = self.write("put", f"/agents/{self.agent.pk}", {"mcpServerIds": [selected.pk]})
        self.assertEqual(response.status_code, 200, response.content)
        self.agent.refresh_from_db()
        config = definition(self.agent)
        self.assertEqual(config["mcpServerIds"], [selected.pk])
        self.assertEqual(config["mcpServerUrls"], [])
        self.assertEqual(self.agent.mcp_server_urls, original)
        response = self.write("put", f"/agents/{self.agent.pk}", {"mcpServerIds": []})
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(definition(self.agent)["mcpServerUrls"], [])
        self.assertEqual(definition(self.agent)["mcpServerIds"], [])
        self.assertEqual(response.json()["data"]["configuredMcpCount"], 0)
