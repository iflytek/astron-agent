from unittest.mock import patch

from django.core.exceptions import PermissionDenied
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import include, path

from astron_console.accounts.models import User, UserProfile
from astron_console.agents.models import Agent, AgentFile
from astron_console.publishing import public_runtime, services
from astron_console.publishing.models import Publication, ShareRecord
from astron_console.publishing.public_files import authorize_inputs
from astron_console.resources.models import Model
from astron_console.spaces.permissions import ResourceScope

urlpatterns = [
    path("", include("astron_console.publishing.urls")),
    path("", include("astron_console.agents.urls")),
    path("", include("astron_console.knowledge.urls")),
]


@override_settings(ROOT_URLCONF=__name__, SKILL_SANDBOX_ARTIFACT_UPLOAD_TOKEN="token" * 10)
class PublicFileTests(TestCase):
    def setUp(self):
        self.publisher = User.objects.create_user(id="publisher", username="publisher")
        self.caller = User.objects.create_user(id="caller", username="caller")
        self.other = User.objects.create_user(id="other", username="other")
        for user in [self.publisher, self.caller, self.other]:
            UserProfile.objects.create(uid=user.pk, username=user.username)
        model = Model.objects.create(
            uid="publisher",
            name="model",
            domain="model",
            provider="openai",
            url="https://model.invalid",
            api_key="secret",
        )
        self.bot = Agent.objects.create(
            uid="publisher", bot_name="published", model_id=model.pk, support_upload=1
        )
        self.scope = ResourceScope("publisher", None, None)
        result = services.submit(self.scope, self.bot.pk, "MARKET")
        self.publication = Publication.objects.get(pk=result["publicationId"])
        self.client.force_login(self.caller)

    @patch("astron_console.knowledge.storage.put")
    def test_caller_input_survives_republish_but_never_transfers_ownership(self, put):
        response = self.client.post(
            f"/published/{self.bot.pk}/files",
            {"file": SimpleUploadedFile("data.txt", b"user private content")},
        )
        self.assertEqual(response.status_code, 200, response.content)
        file_id = response.json()["data"]["fileId"]
        row = AgentFile.objects.get(pk=file_id)
        self.assertEqual(row.uid, "caller")
        services.submit(self.scope, self.bot.pk, "MARKET")
        self.publication.refresh_from_db()
        self.assertEqual(
            authorize_inputs(self.publication, "caller", None, [file_id])[0].text,
            "user private content",
        )
        with self.assertRaises(PermissionDenied):
            authorize_inputs(self.publication, "publisher", None, [file_id])
        self.client.force_login(self.publisher)
        self.assertEqual(
            self.client.get(
                response.json()["data"]["downloadUrl"].removeprefix("/console-api")
            ).status_code,
            403,
        )
        self.client.force_login(self.caller)
        with patch("astron_console.knowledge.storage.read", return_value=b"user private content"):
            self.assertEqual(
                self.client.get(f"/published/{self.bot.pk}/files/{file_id}").status_code, 200
            )

    @patch("astron_console.knowledge.storage.put")
    def test_public_skill_artifact_belongs_to_caller_and_revocation_blocks_download(self, put):
        share = ShareRecord.objects.create(uid="publisher", base_id=self.bot.pk, share_key="share")
        run, grant, _ = public_runtime.prepare_public(
            self.publication, "caller", {"message": "create file"}, share_id=share.pk
        )
        run.definition["skills"] = [55]
        run.save()
        values = {
            "file": SimpleUploadedFile("result.txt", b"private result"),
            "uid": "caller",
            "spaceId": "",
            "agentId": str(self.bot.pk),
            "sessionId": run.session_id,
            "runId": run.pk,
            "skillId": "55",
        }
        response = self.client.post(
            "/agents/artifacts/internal-upload",
            values,
            HTTP_X_SKILL_SANDBOX_ARTIFACT_TOKEN="token" * 10,
        )
        self.assertEqual(response.status_code, 200, response.content)
        row = AgentFile.objects.get(pk=response.json()["data"]["artifactId"])
        self.assertEqual(row.uid, "caller")
        path = response.json()["data"]["downloadUrl"].removeprefix("/console-api")
        with patch("astron_console.knowledge.storage.read", return_value=b"private result"):
            self.assertEqual(self.client.get(path).status_code, 200)
        self.client.force_login(self.publisher)
        self.assertEqual(self.client.get(path).status_code, 403)
        self.client.force_login(self.caller)
        ShareRecord.objects.filter(pk=share.pk).update(is_act=0)
        self.assertEqual(self.client.get(path).status_code, 403)

    @patch("astron_console.publishing.services.validate_graph")
    @patch("astron_console.knowledge.storage.put")
    def test_workflow_public_artifact_is_hidden_from_publisher_management(self, put, validate):
        import json

        from astron_console.knowledge.models import Artifact
        from astron_console.workflows.management_views import create_workflow

        workflow = create_workflow(self.scope, {"name": "workflow"})
        graph = json.loads(workflow.data)
        code_id = "ifly-code::test"
        graph["nodes"].append(
            {
                "id": code_id,
                "data": {
                    "label": "code",
                    "nodeParam": {"code": "def main(): return {}"},
                    "inputs": [],
                    "outputs": [],
                },
            }
        )
        workflow.data = json.dumps(graph)
        workflow.save()
        bot = services.bind_workflow(self.scope, workflow.flow_id)
        publication = Publication.objects.get(
            pk=services.submit(self.scope, bot.pk, "MARKET")["publicationId"]
        )
        run, _, _ = public_runtime.prepare_public(
            publication, "caller", {"inputs": {"AGENT_USER_INPUT": "file"}}
        )
        response = self.client.post(
            "/workflow/artifacts/internal-upload",
            {
                "file": SimpleUploadedFile("output.txt", b"private output"),
                "uid": "caller",
                "spaceId": "",
                "workflowId": workflow.pk,
                "flowId": workflow.flow_id,
                "runId": run.pk,
                "nodeId": code_id,
                "source": "code_sandbox",
            },
            HTTP_X_SKILL_SANDBOX_ARTIFACT_TOKEN="token" * 10,
        )
        self.assertEqual(response.status_code, 200, response.content)
        row = Artifact.objects.get(pk=response.json()["data"]["id"])
        self.assertEqual(row.uid, "caller")
        self.client.force_login(self.publisher)
        self.assertEqual(self.client.get(f"/workflow/artifacts/{row.pk}").status_code, 404)
        self.assertEqual(
            self.client.get(f"/published/workflow-artifacts/{row.pk}").status_code, 403
        )
        self.client.force_login(self.caller)
        with patch("astron_console.knowledge.storage.read", return_value=b"private output"):
            self.assertEqual(
                self.client.get(f"/published/workflow-artifacts/{row.pk}").status_code, 200
            )

    @patch("astron_console.publishing.services.validate_graph")
    def test_management_hides_public_root_and_children_but_keeps_legacy_artifacts(self, validate):
        from astron_console.knowledge.artifact_queries import exclude_public_artifacts
        from astron_console.knowledge.models import Artifact
        from astron_console.workflows.management_views import create_workflow
        from astron_console.workflows.models import WorkflowRun

        workflow = create_workflow(self.scope, {"name": "workflow"})
        bot = services.bind_workflow(self.scope, workflow.pk)
        publication = Publication.objects.get(
            pk=services.submit(self.scope, bot.pk, "MARKET")["publicationId"]
        )
        run, _, _ = public_runtime.prepare_public(publication, self.publisher.pk, {"inputs": {}})
        child = WorkflowRun.objects.create(
            workflow_id=workflow.pk,
            uid=self.publisher.pk,
            context_id=run.context_id,
            parent_run_id=run.pk,
        )
        private = WorkflowRun.objects.create(
            workflow_id=workflow.pk, uid=self.publisher.pk, context_id="management"
        )
        rows = [
            Artifact.objects.create(
                workflow_id=workflow.pk,
                run_id=run_id,
                uid=self.publisher.pk,
                file_name=name,
            )
            for run_id, name in [
                (run.pk, "public-root"),
                (child.pk, "public-child"),
                (private.pk, "management"),
                (None, "legacy-null"),
                ("unknown-old-run", "legacy-unknown"),
            ]
        ]
        with self.assertNumQueries(1):
            self.assertEqual(
                set(exclude_public_artifacts(Artifact.objects.all()).values_list("pk", flat=True)),
                {row.pk for row in rows[2:]},
            )
        self.client.force_login(self.publisher)
        response = self.client.get(f"/workflow/{workflow.pk}/artifacts")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            {item["id"] for item in response.json()["data"]}, {row.pk for row in rows[2:]}
        )
        for row in rows[:2]:
            self.assertEqual(self.client.get(f"/workflow/artifacts/{row.pk}").status_code, 404)
            self.assertEqual(self.client.delete(f"/workflow/artifacts/{row.pk}").status_code, 404)
