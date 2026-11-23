from unittest.mock import patch

from django.core.exceptions import PermissionDenied
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import include, path

from astron_console.accounts.models import User, UserProfile
from astron_console.agents.models import Agent, AgentFile, AgentVersion
from astron_console.publishing import public_runtime, services
from astron_console.publishing.models import Publication, PublicationCandidate, ShareRecord
from astron_console.publishing.public_files import (
    WORKFLOW_FILE_KEY_PREFIX,
    WORKFLOW_FILE_MAX_BYTES,
    authorize_inputs,
    workflow_input_bucket,
)
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

    @patch("astron_console.publishing.services.validate_graph")
    @patch("astron_console.knowledge.storage.client")
    @patch("astron_console.knowledge.storage.put")
    def test_workflow_input_upload_binds_caller_version_and_start_field(self, put, sdk, validate):
        import json

        from astron_console.workflows.lifecycle import core_payload
        from astron_console.workflows.management_views import create_workflow

        workflow = create_workflow(self.scope, {"name": "workflow input"})
        graph = json.loads(workflow.data)
        outputs = graph["nodes"][0]["data"]["outputs"]
        for name, kind in [("document", "string"), ("documents", "array-string")]:
            outputs.append(
                {
                    "name": name,
                    "fileType": "file",
                    "allowedFileType": ["txt"],
                    "schema": {"type": kind},
                }
            )
        workflow.data = json.dumps(graph)
        workflow.save()
        bot = services.bind_workflow(self.scope, workflow.flow_id)
        publication = Publication.objects.get(
            pk=services.submit(self.scope, bot.pk, "MARKET")["publicationId"]
        )
        upload_path = f"/published/{bot.pk}/workflow-files"

        def upload(field, filename, content=b"test contents"):
            return self.client.post(
                upload_path,
                {
                    "file": SimpleUploadedFile(filename, content),
                    "field": field,
                },
            )

        self.assertEqual(upload("AGENT_USER_INPUT", "file.txt").status_code, 400)
        self.assertEqual(upload("document", "file.pdf").status_code, 400)
        oversized = upload("document", "file.txt", b"x" * (WORKFLOW_FILE_MAX_BYTES + 1))
        self.assertEqual(oversized.status_code, 400)
        put.assert_not_called()
        sdk.return_value.bucket_exists.return_value = False
        sdk.return_value.get_bucket_lifecycle.return_value = None
        text_response = upload("document", "file.txt")
        self.assertEqual(text_response.status_code, 200, text_response.content)
        bucket = workflow_input_bucket()
        sdk.return_value.make_bucket.assert_called_once_with(bucket)
        lifecycle_bucket, configuration = sdk.return_value.set_bucket_lifecycle.call_args.args
        self.assertEqual(lifecycle_bucket, bucket)
        self.assertEqual(configuration.rules[0].rule_filter.prefix, WORKFLOW_FILE_KEY_PREFIX)
        self.assertEqual(configuration.rules[0].expiration.days, 2)
        sdk.return_value.bucket_exists.return_value = True
        sdk.return_value.get_bucket_lifecycle.return_value = configuration
        files_response = upload("documents", "files.txt")
        self.assertEqual(files_response.status_code, 200, files_response.content)
        self.assertEqual(put.call_count, 2)
        self.assertEqual(sdk.return_value.set_bucket_lifecycle.call_count, 1)
        for call in put.call_args_list:
            self.assertEqual(call.args[4], bucket)
        sdk.return_value.set_bucket_policy.assert_not_called()
        references = [r.json()["data"]["reference"] for r in (text_response, files_response)]
        for response in (text_response, files_response):
            self.assertNotContains(response, "http")

        inputs = {
            "AGENT_USER_INPUT": "hello",
            "document": references[0],
            "documents": references[1:],
        }
        for caller, fields in (
            (self.other.pk, inputs),
            (self.caller.pk, {**inputs, "documents": references[:1]}),
            (self.caller.pk, {**inputs, "document": references[0] + "x"}),
            (self.caller.pk, {**inputs, "AGENT_USER_INPUT": references[0]}),
        ):
            with self.assertRaises(PermissionDenied):
                public_runtime.prepare_public(publication, caller, {"inputs": fields})

        run, _, _ = public_runtime.prepare_public(publication, self.caller.pk, {"inputs": inputs})
        urls = [
            f"http://minio:9000/{bucket}/{call.args[0]}?X-Amz-Signature=temporary"
            for call in put.call_args_list
        ]
        sdk.return_value.presigned_get_object.side_effect = urls
        self.assertEqual(
            core_payload(run)["chat"]["parameters"],
            {
                "AGENT_USER_INPUT": "hello",
                "document": urls[0],
                "documents": urls[1:],
            },
        )
        run.refresh_from_db()
        self.assertEqual(run.inputs, inputs)
        for call in sdk.return_value.presigned_get_object.call_args_list:
            self.assertEqual(call.args[0], bucket)
        history = self.client.get(f"/published/{bot.pk}/history")
        self.assertNotContains(history, references[0])
        self.assertEqual(history.json()["data"][0]["question"]["document"], "[已上传文件]")

        services.submit(self.scope, bot.pk, "MARKET")
        publication.refresh_from_db()
        with self.assertRaises(PermissionDenied):
            public_runtime.prepare_public(publication, self.caller.pk, {"inputs": inputs})

    @patch("astron_console.knowledge.storage.put")
    def test_caller_input_survives_republish_but_never_transfers_ownership(self, put):
        # Simulate a retained immutable snapshot created before uploads became standard.
        stored = {**self.publication.candidate.definition, "supportUpload": False}
        AgentVersion.objects.filter(pk=self.publication.candidate.version_id).update(
            definition={key: value for key, value in stored.items() if key != "executionSnapshots"}
        )
        PublicationCandidate.objects.filter(pk=self.publication.candidate_id).update(
            definition=stored
        )
        self.publication.refresh_from_db()
        self.assertTrue(public_runtime.public_data(self.publication)["supportUpload"])
        response = self.client.post(
            f"/published/{self.bot.pk}/files",
            {"file": SimpleUploadedFile("data.txt", b"user private content")},
        )
        self.assertEqual(response.status_code, 200, response.content)
        file_id = response.json()["data"]["fileId"]
        row = AgentFile.objects.get(pk=file_id)
        self.assertEqual(row.uid, "caller")
        self.assertEqual(authorize_inputs(self.publication, "caller", None, [file_id]), [row])
        self.publication.candidate.refresh_from_db()
        self.assertEqual(self.publication.candidate.definition, stored)
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
            "/workflow/artifacts/console-upload",
            {
                "file": SimpleUploadedFile("output.txt", b"private output"),
                "uid": "caller",
                "spaceId": "",
                "workflowId": workflow.pk,
                "flowId": workflow.flow_id,
                "runId": run.pk,
                "rootId": run.context_id,
                "nodeId": code_id,
                "source": "code_sandbox",
            },
            HTTP_X_SKILL_SANDBOX_ARTIFACT_TOKEN="token" * 10,
        )
        self.assertEqual(response.status_code, 200, response.content)
        row = Artifact.objects.get(pk=response.json()["data"]["id"])
        self.assertEqual(row.uid, "caller")
        self.assertEqual(
            response.json()["data"]["downloadUrl"],
            f"/console-api/published/workflow-artifacts/{row.pk}",
        )
        self.client.force_login(self.publisher)
        self.assertEqual(self.client.get(f"/workflow/artifacts/{row.pk}").status_code, 404)
        self.assertEqual(
            self.client.get(f"/published/workflow-artifacts/{row.pk}").status_code, 403
        )
        self.client.force_login(self.caller)
        with patch("astron_console.knowledge.storage.read", return_value=b"private output") as read:
            for suffix in ("/download", "/content"):
                self.assertEqual(
                    self.client.get(f"/workflow/artifacts/{row.pk}{suffix}").status_code, 404
                )
            read.assert_not_called()
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
            self.assertEqual(
                self.client.get(f"/workflow/artifacts/{row.pk}/download").status_code, 404
            )
            with patch("astron_console.knowledge.storage.read") as read:
                self.assertEqual(
                    self.client.get(f"/workflow/artifacts/{row.pk}/content").status_code, 404
                )
                read.assert_not_called()
            self.assertEqual(self.client.delete(f"/workflow/artifacts/{row.pk}").status_code, 404)

    @patch("astron_console.publishing.services.validate_graph")
    @patch("astron_console.knowledge.storage.put")
    def test_modern_artifact_callback_cannot_forge_or_downgrade_execution(self, put, validate):
        import json

        from astron_console.knowledge.models import Artifact
        from astron_console.workflows.lifecycle import claim_run, core_payload, prepare_run
        from astron_console.workflows.management_views import create_workflow
        from astron_console.workflows.models import WorkflowRun

        workflow = create_workflow(self.scope, {"name": "artifact identities"})
        graph = json.loads(workflow.data)
        node_id = "ifly-code::artifact"
        graph["nodes"].append(
            {
                "id": node_id,
                "data": {
                    "nodeParam": {
                        "code": "def main(): return {}",
                        "sandbox": {
                            "enabled": True,
                            "uid": "forged",
                            "spaceId": "999",
                            "runId": "trace-sid",
                            "nodeId": "forged",
                            "workflowId": "forged",
                            "console": False,
                        },
                    }
                },
            }
        )
        workflow.data = json.dumps(graph)
        workflow.save()
        bot = services.bind_workflow(self.scope, workflow.pk)
        publication = Publication.objects.get(
            pk=services.submit(self.scope, bot.pk, "MARKET")["publicationId"]
        )
        run, grant, _ = public_runtime.prepare_public(publication, "caller", {"inputs": {}})
        payload = core_payload(run)
        sandbox = next(n for n in payload["protocol"]["data"]["nodes"] if n["id"] == node_id)[
            "data"
        ]["nodeParam"]["sandbox"]
        self.assertEqual(
            sandbox,
            {
                "enabled": True,
                "console": True,
                "uid": "publisher",
                "spaceId": "",
                "workflowId": workflow.flow_id,
            },
        )
        self.assertEqual(payload["chat"]["uid"], "caller")
        self.assertEqual(
            payload["chat"]["ext"]["console_context"], {"run_id": run.pk, "root_id": run.context_id}
        )
        values = {
            "uid": "caller",
            "spaceId": "",
            "flowId": workflow.flow_id,
            "runId": run.pk,
            "rootId": run.context_id,
            "nodeId": node_id,
            "source": "code_sandbox",
        }

        def upload(values, path="/workflow/artifacts/console-upload"):
            return self.client.post(
                path,
                {**values, "file": SimpleUploadedFile("output.txt", b"private")},
                HTTP_X_SKILL_SANDBOX_ARTIFACT_TOKEN="token" * 10,
            )

        for key in ("runId", "rootId", "nodeId", "flowId", "uid"):
            for value in ("", "forged"):
                with self.subTest(key=key, value=value):
                    response = upload({**values, key: value})
                    self.assertEqual(response.status_code, 403, response.content)
        self.assertEqual(upload({**values, "uid": "publisher"}).status_code, 403)
        self.assertEqual(upload({**values, "spaceId": "99"}).status_code, 403)
        self.assertEqual(upload(values, "/workflow/artifacts/internal-upload").status_code, 403)
        put.assert_not_called()
        self.assertFalse(Artifact.objects.exists())
        response = upload(values)
        self.assertEqual(response.status_code, 200, response.content)
        artifact = Artifact.objects.get()
        self.assertEqual((artifact.uid, artifact.run_id), ("caller", run.pk))

        child_workflow = create_workflow(self.scope, {"name": "artifact child", "data": graph})
        child = WorkflowRun.objects.create(
            workflow_id=child_workflow.pk,
            uid="publisher",
            context_id=run.context_id,
            parent_run_id=run.pk,
            graph=graph,
            status="running",
        )
        response = upload({**values, "runId": child.pk, "flowId": child_workflow.flow_id})
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(Artifact.objects.get(run_id=child.pk).uid, "caller")

        private = prepare_run(self.scope, workflow, {})
        claim_run(private)
        response = upload(
            {**values, "runId": private.pk, "rootId": private.context_id, "uid": "publisher"}
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(Artifact.objects.get(run_id=private.pk).uid, "publisher")
        run.status = "completed"
        run.save(update_fields=["status"])
        self.assertEqual(upload(values).status_code, 403)
        publication.active = False
        publication.save(update_fields=["active"])
        self.assertEqual(
            upload({**values, "runId": child.pk, "flowId": child_workflow.flow_id}).status_code, 404
        )

        # True legacy callbacks have no durable Console run or root; their old
        # service-token/owner contract still works even before dialog creation.
        legacy = {**values, "runId": "legacy-inflight-sid", "uid": "publisher"}
        legacy.pop("rootId")
        response = upload(legacy, "/workflow/artifacts/internal-upload")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(Artifact.objects.get(run_id="legacy-inflight-sid").uid, "publisher")
