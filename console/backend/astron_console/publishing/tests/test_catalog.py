"""Publication catalog combines resources without mutating workflow identity."""

from django.test import TestCase, override_settings

from astron_console.accounts.models import User, UserProfile
from astron_console.agents.models import Agent, AgentVersion
from astron_console.publishing.models import App, WorkflowBot
from astron_console.spaces.permissions import ResourceScope
from astron_console.workflows.management_views import create_workflow


@override_settings(ROOT_URLCONF="astron_console.publishing.urls")
class CatalogTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(id="publisher", username="publisher")
        UserProfile.objects.create(uid=self.user.pk, username=self.user.username)
        self.client.force_login(self.user)
        self.scope = ResourceScope(self.user.pk, None, None)
        self.agent = Agent.objects.create(uid=self.user.pk, bot_name="Agent alpha", version=1)
        self.workflow = create_workflow(self.scope, {"name": "Workflow beta"})

    def test_unbound_workflow_is_listed_without_creating_bot(self):
        before = Agent.objects.count()
        response = self.client.get("/publish/bots", {"includeWorkflows": "true"})
        self.assertEqual(response.status_code, 200, response.content)
        data = response.json()["data"]
        self.assertEqual(data["total"], 2)
        workflow = next(row for row in data["records"] if row["resourceKind"] == "workflow")
        self.assertIsNone(workflow["botId"])
        self.assertEqual(workflow["resourceId"], self.workflow.flow_id)
        self.assertEqual(Agent.objects.count(), before)
        self.assertFalse(WorkflowBot.objects.exists())

    def test_search_kind_and_pagination_remain_scoped(self):
        other = create_workflow(self.scope, {"name": "Other"})
        other.uid = "another-user"
        other.save()
        for params, expected in [
            ({"resourceKind": "agent"}, 1),
            ({"resourceKind": "workflow"}, 1),
            ({"search": "beta"}, 1),
            ({"search": "missing"}, 0),
        ]:
            response = self.client.get("/publish/bots", {"includeWorkflows": "true", **params})
            self.assertEqual(response.status_code, 200, response.content)
            self.assertEqual(response.json()["data"]["total"], expected)
        response = self.client.get(
            "/publish/bots", {"includeWorkflows": "true", "size": 1, "page": 2}
        )
        self.assertEqual(len(response.json()["data"]["records"]), 1)

    def test_prepare_only_returns_owned_versions_and_safe_app_identity(self):
        version = AgentVersion.objects.create(
            agent_id=self.agent.pk, definition={}, created_by=self.user.pk
        )
        AgentVersion.objects.create(agent_id=9999, definition={}, created_by="another-user")
        App.objects.create(
            uid=self.user.pk,
            app_id="app-1",
            app_name="Example",
            app_key="private-key",
            app_secret="private-secret",
        )
        response = self.client.get(f"/publish/bots/{self.agent.pk}/prepare", {"type": "API"})
        self.assertEqual(response.status_code, 200, response.content)
        self.assertNotIn("private-key", response.content.decode())
        self.assertNotIn("private-secret", response.content.decode())
        self.assertEqual(response.json()["data"]["versions"]["records"][0]["id"], version.pk)
