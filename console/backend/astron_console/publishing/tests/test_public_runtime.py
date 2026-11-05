import json
from unittest.mock import patch

from asgiref.sync import async_to_sync
from django.core.exceptions import PermissionDenied
from django.test import TestCase, override_settings
from django.urls import include, path

from astron_console.accounts.models import User, UserProfile
from astron_console.agents.models import Agent, AgentRun, AgentSession
from astron_console.publishing import public_runtime, services
from astron_console.publishing.models import App, Publication, PublicRunGrant, ShareRecord
from astron_console.publishing.runtime_authorization import check_grant, memory_scope
from astron_console.resources.models import Model
from astron_console.spaces.permissions import ResourceScope
from astron_console.workflows.models import ExecutionContext

urlpatterns = [
    path("", include("astron_console.publishing.urls")),
    path("", include("astron_console.agents.urls")),
    path("", include("astron_console.workflows.urls")),
]


@override_settings(ROOT_URLCONF=__name__)
class PublicExecutionTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(id="publisher", username="publisher")
        self.viewer = User.objects.create_user(id="viewer", username="viewer")
        self.stranger = User.objects.create_user(id="stranger", username="stranger")
        for user in [self.owner, self.viewer, self.stranger]:
            UserProfile.objects.create(uid=user.pk, username=user.username)
        model = Model.objects.create(
            uid=self.owner.pk,
            name="model",
            provider="openai",
            domain="model",
            url="https://model.invalid/v1",
            api_key="secret",
            enable=True,
        )
        self.bot = Agent.objects.create(uid=self.owner.pk, bot_name="public", model_id=model.pk)
        self.scope = ResourceScope(self.owner.pk, None, None)
        result = services.submit(self.scope, self.bot.pk, "MARKET")
        self.publication = Publication.objects.get(pk=result["publicationId"])
        self.client.force_login(self.viewer)

    def prepared(self, **kwargs):
        return public_runtime.prepare_public(
            self.publication, self.viewer.pk, {"message": "hello"}, **kwargs
        )

    def test_caller_identity_is_separate_and_owner_memory_unavailable(self):
        run, grant, data = self.prepared()
        payload, _, subject_scope = data
        self.assertEqual(run.session.uid, self.viewer.pk)
        self.assertEqual(payload["uid"], self.viewer.pk)
        self.assertIsNone(subject_scope)
        self.assertEqual(ExecutionContext.objects.get(pk=grant.root_id).uid, self.owner.pk)
        self.assertNotIn("secret", json.dumps(run.definition))
        self.client.force_login(self.owner)
        response = self.client.get(f"/agents/{self.bot.pk}/sessions")
        self.assertEqual(response.json()["data"], [])
        self.client.force_login(self.stranger)
        response = self.client.post(
            f"/published/runs/{run.pk}/stop", "{}", content_type="application/json"
        )
        self.assertEqual(response.status_code, 404)

    def test_session_collision_does_not_share_history(self):
        _, grant, _ = self.prepared()
        with self.assertRaises(PermissionDenied):
            public_runtime.prepare_public(
                self.publication,
                self.viewer.pk,
                {"message": "other space", "sessionId": grant.session_id},
                caller_space_id=999,
            )
        with self.assertRaises(PermissionDenied):
            public_runtime.prepare_public(
                self.publication,
                self.stranger.pk,
                {"message": "steal", "sessionId": grant.session_id},
            )
        self.assertEqual(AgentRun.objects.count(), 1)
        self.assertEqual(AgentSession.objects.count(), 1)

    def test_old_run_is_fixed_and_revocation_stops_authority(self):
        share = ShareRecord.objects.create(uid=self.owner.pk, base_id=self.bot.pk, share_key="key")
        _, grant, _ = self.prepared(share_id=share.pk)
        old_id = grant.candidate_id
        self.bot.prompt = "new draft"
        self.bot.save()
        services.submit(self.scope, self.bot.pk, "MARKET")
        self.assertEqual(check_grant(grant).candidate_id, old_id)
        share.is_act = 0
        share.save()
        with self.assertRaises(PermissionDenied):
            check_grant(grant)

    def test_external_subject_never_maps_console_uid(self):
        app = App.objects.create(
            uid=self.owner.pk, app_name="app", app_id="app", app_key="key", app_secret="secret"
        )
        result = services.submit(self.scope, self.bot.pk, "API", target_id=app.app_id)
        publication = Publication.objects.get(pk=result["publicationId"])
        caller = public_runtime.external_uid("api", app.app_id, self.owner.pk)
        run, grant, _ = public_runtime.prepare_public(
            publication, caller, {"message": "hello"}, kind="api", app_id=app.app_id
        )
        self.assertNotEqual(caller, self.owner.pk)
        self.assertIsNone(memory_scope(ExecutionContext.objects.get(pk=grant.root_id), self.bot))
        self.assertEqual(run.session.uid, caller)
        with patch("astron_console.publishing.tenant.authenticate", return_value=app):
            response = self.client.post(
                "/agent/v1/chat/completions",
                json.dumps({"message": "hello"}),
                content_type="application/json",
            )
        self.assertEqual(response.status_code, 400)

    def test_api_adapter_preserves_real_failure_and_delta(self):
        run, grant, data = self.prepared()

        async def stream(*args, **kwargs):
            yield 'event: delta\ndata: {"content":"answer"}\n\n'
            yield 'event: end\ndata: {"status":"failed"}\n\n'

        async def collect():
            return [part async for part in public_runtime.api_source((run, grant, data))]

        with patch("astron_console.agents.conversations.stream_run", stream):
            output = "".join(async_to_sync(collect)())
        self.assertIn('"content": "answer"', output)
        self.assertIn('"code": 500', output)
        self.assertIn("[DONE]", output)
        self.assertEqual(PublicRunGrant.objects.count(), 1)

    @override_settings(WORKFLOW_INTERNAL_API_KEY="internal-key")
    def test_public_workflow_agent_context_freezes_versions_and_separates_history(self):
        from astron_console.agents.models import AgentState, AgentVersion
        from astron_console.workflows.lifecycle import core_payload
        from astron_console.workflows.models import Workflow
        from astron_console.workflows.protocol import starter_graph

        graph = starter_graph()
        graph["nodes"].insert(
            1,
            {
                "id": "agent::shared",
                "data": {"nodeParam": {"agentId": self.bot.pk}, "inputs": [], "outputs": []},
            },
        )
        workflow = Workflow.objects.create(
            uid=self.owner.pk,
            app_id="internal-app",
            flow_id="public-flow",
            name="shared flow",
            data=json.dumps(graph),
        )
        bot = services.bind_workflow(self.scope, workflow.pk)
        with patch("astron_console.publishing.services.validate_graph"):
            result = services.submit(self.scope, bot.pk, "MARKET")
        publication = Publication.objects.get(pk=result["publicationId"])
        run, grant, _ = public_runtime.prepare_public(publication, self.viewer.pk, {"inputs": {}})
        old_id = run.resolved_agents["agent::shared"]["versionId"]
        newer = AgentVersion.objects.create(
            agent_id=self.bot.pk,
            created_by=self.owner.pk,
            definition={**self.publication.candidate.definition, "prompt": "new"},
        )
        AgentState.objects.filter(agent_id=self.bot.pk).update(published_version_id=newer.pk)
        with patch("astron_console.agents.memory.search") as search:
            response = self.client.post(
                "/workflow/internal/agent-runtime",
                json.dumps({"runId": run.pk, "nodeId": "agent::shared", "query": "hello"}),
                content_type="application/json",
                HTTP_X_WORKFLOW_INTERNAL_KEY="internal-key",
            )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["data"]["uid"], self.viewer.pk)
        search.assert_not_called()
        self.assertEqual(run.resolved_agents["agent::shared"]["versionId"], old_id)
        self.assertEqual(core_payload(run)["chat"]["uid"], self.viewer.pk)
        from astron_console.knowledge.models import Artifact

        own_file = Artifact.objects.create(
            run_id=run.pk, uid=self.viewer.pk, file_name="private.txt"
        )
        Artifact.objects.create(run_id=run.pk, uid=self.stranger.pk, file_name="other.txt")
        Artifact.objects.create(
            run_id=run.pk, uid=self.viewer.pk, space_id=999, file_name="other-space.txt"
        )
        from astron_console.workflows.models import WorkflowRun

        child = WorkflowRun.objects.create(
            workflow_id=workflow.pk,
            uid=self.viewer.pk,
            context_id=run.context_id,
            parent_run_id=run.pk,
        )
        Artifact.objects.create(run_id=child.pk, uid=self.viewer.pk, file_name="child.txt")
        history = self.client.get(f"/published/{bot.pk}/history").json()["data"]
        self.assertEqual(
            {item["name"] for item in history[0]["files"]}, {"private.txt", "child.txt"}
        )
        self.assertEqual(
            history[0]["files"][0]["downloadUrl"],
            f"/console-api/published/workflow-artifacts/{own_file.pk}",
        )
        self.client.force_login(self.owner)
        self.assertEqual(self.client.get(f"/published/{bot.pk}/history").json()["data"], [])
        self.assertEqual(self.client.get(f"/workflow/runs/{run.pk}").status_code, 404)
        self.assertEqual(grant.root_id, run.context_id)

    def test_api_stop_requires_original_app_and_cancels_paused_workflow(self):
        from astron_console.publishing.models import PublicationCandidate
        from astron_console.workflows.management_views import create_workflow
        from astron_console.workflows.models import WorkflowVersion
        from astron_console.workflows.protocol import starter_graph

        workflow = create_workflow(self.scope, {"name": "api paused"})
        bot = services.bind_workflow(self.scope, workflow.pk)
        app = App.objects.create(uid=self.owner.pk, app_id="api-owner", app_name="owner")
        other = App.objects.create(uid=self.owner.pk, app_id="api-other", app_name="other")
        version = WorkflowVersion.objects.create(
            flow_id=workflow.flow_id, data=json.dumps(starter_graph()), version_num="test"
        )
        candidate = PublicationCandidate.objects.create(
            bot_id=bot.pk,
            resource_kind="workflow",
            resource_id=workflow.flow_id,
            version_id=version.pk,
            definition={"graph": starter_graph(), "advancedConfig": {}},
            owner_uid=self.owner.pk,
            created_by=self.owner.pk,
        )
        publication = Publication.objects.create(
            bot_id=bot.pk, candidate=candidate, channel="API", target_id=app.app_id
        )
        run, grant, _ = public_runtime.prepare_public(
            publication, "api:consumer", {"inputs": {}}, kind="api", app_id=app.app_id
        )
        run.status, run.event_id = "paused", "upstream-event"
        run.save(update_fields=["status", "event_id"])
        self.client.logout()
        payload = json.dumps({"event_id": run.event_id})
        with patch("astron_console.publishing.tenant.authenticate", return_value=app):
            for endpoint in ["stop", "resume"]:
                response = self.client.post(
                    f"/workflow/v1/{endpoint}", "{}", content_type="application/json"
                )
                self.assertEqual(response.status_code, 400)
        with patch("astron_console.publishing.tenant.authenticate", return_value=other):
            response = self.client.post(
                "/workflow/v1/stop", payload, content_type="application/json"
            )
        self.assertEqual(response.status_code, 404)
        run.refresh_from_db()
        self.assertEqual(run.status, "paused")
        with patch("astron_console.publishing.tenant.authenticate", return_value=app):
            response = self.client.post(
                "/workflow/v1/stop", payload, content_type="application/json"
            )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["data"]["status"], "cancelled")
        self.assertTrue(ExecutionContext.objects.get(pk=grant.root_id).cancel_requested)
        with patch("astron_console.publishing.tenant.authenticate", side_effect=PermissionDenied):
            response = self.client.post(
                "/workflow/v1/stop", payload, content_type="application/json"
            )
        self.assertEqual(response.status_code, 403)

    def test_api_stop_never_uses_browser_session_as_authority(self):
        run, _, _ = self.prepared()
        response = self.client.post(
            "/workflow/v1/stop", json.dumps({"runId": run.pk}), content_type="application/json"
        )
        self.assertEqual(response.status_code, 403)
        run.refresh_from_db()
        self.assertFalse(run.cancel_requested)

    def test_channel_snapshot_survives_republish_but_not_revocation(self):
        first = services.create_candidate(self.scope, self.bot.pk)
        publication = services.activate(first, "WECHAT", "official-account")
        self.bot.prompt = "new prompt"
        self.bot.save(update_fields=["prompt"])
        latest = services.create_candidate(self.scope, self.bot.pk)
        services.activate(latest, "WECHAT", "official-account")
        frozen = public_runtime.frozen_channel_publication(publication.pk, first.pk)
        self.assertEqual(frozen.candidate_id, first.pk)
        self.assertNotEqual(frozen.candidate.definition["prompt"], "new prompt")
        run, grant, _ = public_runtime.prepare_public(
            frozen, "wechat:consumer", {"message": "queued"}, kind="wechat"
        )
        self.assertEqual(grant.candidate_id, first.pk)
        self.assertEqual(run.version_id, first.version_id)
        Publication.objects.filter(pk=publication.pk).update(active=False)
        with self.assertRaises(PermissionDenied):
            public_runtime.frozen_channel_publication(publication.pk, first.pk)
