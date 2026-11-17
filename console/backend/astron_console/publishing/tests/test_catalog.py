"""Publication catalog combines resources without mutating workflow identity."""

from unittest.mock import patch

from django.test import TestCase, override_settings

from astron_console.accounts.models import User, UserProfile
from astron_console.agents.models import Agent, AgentFavorite, AgentVersion
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

    def market_fixture(self, name, kind="agent", definition=None, **publication_fields):
        bot = Agent.objects.create(
            uid=self.user.pk, bot_name=name, version=1 if kind == "agent" else 3
        )
        candidate = PublicationCandidate.objects.create(
            bot_id=bot.pk,
            resource_kind=kind,
            resource_id=str(bot.pk),
            version_id=1,
            definition={"botName": name, **(definition or {})},
            owner_uid=self.user.pk,
            created_by=self.user.pk,
        )
        Publication.objects.create(
            bot_id=bot.pk, candidate=candidate, channel="MARKET", **publication_fields
        )
        return bot

    def market_data(self, payload, method="get"):
        response = getattr(self.client, method)(
            "/home-page/agent-square/get-bot-page-by-type",
            payload,
            **({"content_type": "application/json"} if method == "post" else {}),
        )
        self.assertEqual(response.status_code, 200, response.content)
        return response.json()["data"]

    def test_market_uncategorized_and_legacy_defaults_match_projection(self):
        agent_default = self.market_fixture("legacy Agent")
        agent_null = self.market_fixture("uncategorized Agent", definition={"botType": None})
        agent_classified = self.market_fixture("classified Agent", definition={"botType": 7})
        workflow_legacy = self.market_fixture("legacy workflow", "workflow", {"botType": 7})
        workflow_null = self.market_fixture(
            "uncategorized workflow", "workflow", {"workflowCategory": None}
        )
        workflow_classified = self.market_fixture(
            "classified workflow", "workflow", {"workflowCategory": 7}
        )
        expected = {
            "uncategorized": {agent_null.pk, workflow_legacy.pk, workflow_null.pk},
            1: {agent_default.pk},
            7: {agent_classified.pk, workflow_classified.pk},
        }
        for method in ("get", "post"):
            for category, ids in expected.items():
                with self.subTest(method=method, category=category):
                    data = self.market_data({"type": category}, method)
                    self.assertEqual(data["total"], len(ids))
                    self.assertEqual({row["botId"] for row in data["records"]}, ids)
                    for row in data["records"]:
                        self.assertEqual(
                            row["botType"], None if category == "uncategorized" else category
                        )

    def test_market_filters_intersect_before_pagination_and_remain_user_scoped(self):
        first = self.market_fixture("match first", definition={"botType": 7})
        second = self.market_fixture("match second", "workflow", {"workflowCategory": 7})
        other_user = self.market_fixture("match other-user", definition={"botType": 7})
        wrong_name = self.market_fixture("different name", definition={"botType": 7})
        wrong_category = self.market_fixture("match other category", definition={"botType": 8})
        for bot in (first, second, wrong_name, wrong_category):
            AgentFavorite.objects.create(uid=self.user.pk, bot_id=bot.pk)
        AgentFavorite.objects.create(uid="different-user", bot_id=other_user.pk)
        # Duplicate historical favorite rows must not multiply publications.
        AgentFavorite.objects.create(uid=self.user.pk, bot_id=first.pk)
        for method in ("get", "post"):
            ids = []
            for page in (1, 2):
                data = self.market_data(
                    {"search": "match", "type": 7, "favorite": True, "size": 1, "page": page},
                    method,
                )
                self.assertEqual(data["total"], 2)
                self.assertEqual(data["totalPages"], 2)
                self.assertEqual(len(data["records"]), 1)
                self.assertTrue(data["records"][0]["isFavorite"])
                ids.append(data["records"][0]["botId"])
            self.assertEqual(set(ids), {first.pk, second.pk})
        AgentFavorite.objects.filter(uid=self.user.pk, bot_id=second.pk).delete()
        data = self.market_data({"search": "match", "type": 7, "favorite": "true"})
        self.assertEqual([row["botId"] for row in data["records"]], [first.pk])
        self.assertEqual(
            self.market_data({"search": "match", "type": 7, "favorite": "false"})["total"], 3
        )

    def test_market_favorite_does_not_expose_inactive_deleted_or_other_channels(self):
        visible = self.market_fixture("visible", definition={"botType": None})
        inactive = self.market_fixture("inactive", active=False)
        deleted = self.market_fixture("deleted")
        deleted.is_delete = 1
        deleted.save()
        non_market = self.market_fixture("non-market")
        Publication.objects.filter(bot_id=non_market.pk).update(channel="API")
        for bot in (visible, inactive, deleted, non_market):
            AgentFavorite.objects.create(uid=self.user.pk, bot_id=bot.pk)
        data = self.market_data({"type": "uncategorized", "favorite": "1"})
        self.assertEqual(data["total"], 1)
        self.assertEqual(data["records"][0]["botId"], visible.pk)
        self.assertEqual(self.market_data({"favorite": "true"})["total"], 1)
        self.client.logout()
        for method in ("get", "post"):
            self.assertEqual(self.market_data({"favorite": True}, method)["total"], 0)
            self.assertEqual(self.market_data({"favorite": False}, method)["total"], 1)

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
