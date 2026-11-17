"""Publication catalog combines resources without mutating workflow identity."""

from unittest.mock import patch

from django.test import TestCase, override_settings

from astron_console.accounts.models import User, UserProfile
from astron_console.agents.models import Agent, AgentVersion
from astron_console.publishing import services
from astron_console.publishing.models import App, Publication, PublicationCandidate, WorkflowBot
from astron_console.publishing.views import projection
from astron_console.spaces.permissions import ResourceScope
from astron_console.workflows.management_views import create_workflow


@override_settings(ROOT_URLCONF="astron_console.publishing.urls")
class CatalogTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(id="publisher", username="publisher")
        UserProfile.objects.create(uid=self.user.pk, username=self.user.username)
        self.client.force_login(self.user)
        self.scope = ResourceScope(self.user.pk, None, None)
        self.agent = Agent.objects.create(
            uid=self.user.pk, bot_name="Agent alpha", version=1, avatar="agent-avatar.svg"
        )
        self.workflow = create_workflow(
            self.scope, {"name": "Workflow beta", "avatarIcon": "workflow-avatar.svg"}
        )

    def test_unbound_workflow_is_listed_without_creating_bot(self):
        before = Agent.objects.count()
        response = self.client.get("/publish/bots", {"includeWorkflows": "true"})
        self.assertEqual(response.status_code, 200, response.content)
        data = response.json()["data"]
        self.assertEqual(data["total"], 2)
        workflow = next(row for row in data["records"] if row["resourceKind"] == "workflow")
        self.assertIsNone(workflow["botId"])
        self.assertEqual(workflow["resourceId"], self.workflow.flow_id)
        self.assertEqual(workflow["avatar"], "workflow-avatar.svg")
        agent = next(row for row in data["records"] if row["resourceKind"] == "agent")
        self.assertEqual(agent["avatar"], "agent-avatar.svg")
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

    @patch("astron_console.publishing.services.validate_graph")
    def test_workflow_publication_freezes_category_and_republish_updates_market(self, validate):
        self.workflow.category = 7
        self.workflow.save()
        bot = services.bind_workflow(self.scope, self.workflow.pk)
        self.assertEqual(bot.bot_type, 1)
        result = services.submit(self.scope, bot.pk, "MARKET")
        publication = Publication.objects.select_related("candidate").get(
            pk=result["publicationId"]
        )
        first_candidate = publication.candidate
        self.assertEqual(first_candidate.definition["workflowCategory"], 7)
        self.assertEqual(first_candidate.definition["botType"], 7)
        self.assertEqual(projection(publication)["botType"], 7)
        self.workflow.category = 8
        self.workflow.save()
        self.assertEqual(projection(publication)["botType"], 7)
        services.submit(self.scope, bot.pk, "MARKET")
        publication.refresh_from_db()
        self.assertEqual(projection(publication)["botType"], 8)
        first_candidate.refresh_from_db()
        self.assertEqual(first_candidate.definition["workflowCategory"], 7)
        for category, expected in [(1, 0), (7, 0), (8, 1)]:
            response = self.client.get(
                "/home-page/agent-square/get-bot-page-by-type", {"type": category}
            )
            self.assertEqual(response.status_code, 200, response.content)
            self.assertEqual(response.json()["data"]["total"], expected)

    def test_legacy_workflow_category_is_unknown_and_agent_category_stays_supported(self):
        legacy_bot = Agent.objects.create(uid=self.user.pk, bot_name="old workflow", version=3)
        legacy_definition = {"botName": "old workflow", "botType": 1}
        legacy_candidate = PublicationCandidate.objects.create(
            bot_id=legacy_bot.pk,
            resource_kind="workflow",
            resource_id=self.workflow.flow_id,
            version_id=1,
            definition=legacy_definition,
            owner_uid=self.user.pk,
            created_by=self.user.pk,
        )
        legacy_publication = Publication.objects.create(
            bot_id=legacy_bot.pk, channel="MARKET", candidate=legacy_candidate
        )
        agent_candidate = PublicationCandidate.objects.create(
            bot_id=self.agent.pk,
            resource_kind="agent",
            resource_id=str(self.agent.pk),
            version_id=2,
            definition={"botName": "agent", "botType": 1},
            owner_uid=self.user.pk,
            created_by=self.user.pk,
        )
        agent_publication = Publication.objects.create(
            bot_id=self.agent.pk, channel="MARKET", candidate=agent_candidate
        )
        self.assertIsNone(projection(legacy_publication)["botType"])
        self.assertEqual(projection(agent_publication)["botType"], 1)
        response = self.client.get("/home-page/agent-square/get-bot-page-by-type", {"type": 1})
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            [row["botId"] for row in response.json()["data"]["records"]], [self.agent.pk]
        )
        legacy_candidate.refresh_from_db()
        self.assertEqual(legacy_candidate.definition, legacy_definition)

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
