import base64
import hashlib
import json
from datetime import timedelta
from unittest.mock import patch

from asgiref.sync import async_to_sync
from django.test import TestCase, override_settings
from django.utils import timezone

from astron_console.accounts.models import User, UserProfile
from astron_console.resources.common import UpstreamError
from astron_console.resources.models import SandboxConfig, Tool
from astron_console.workflows.models import Workflow
from astron_console.workflows.runtime_models import ExecutionContext, WorkflowRun
from astron_console.workflows.sandbox_media import archive_node_files

MEDIA_SCOPE = "https://media.example"
AITOOLS_ORIGIN = "http://aitools:18668"
MEDIA_UUID = "51338078-b93d-4ab1-80bb-ab20d07d113a"
NODE_ID = "plugin::media"
ARCHIVE_URL = "/workflow/internal/archive-media"


@override_settings(
    LOCAL_SANDBOX_URL="http://sandbox:8090",
    SKILL_SANDBOX_RUNTIME_CREDENTIAL_TOKEN="console-test-token",
    WORKFLOW_INTERNAL_API_KEY="workflow-console-test-token",
    OSS_REMOTE_ENDPOINT=MEDIA_SCOPE,
    WORKFLOW_MEDIA_BUCKET="media",
    AITOOLS_BASE_URL=AITOOLS_ORIGIN,
)
class SandboxMediaTests(TestCase):
    def setUp(self):
        owner = User.objects.create_user(id="media-owner", username="media-owner")
        UserProfile.objects.create(uid=owner.pk, username=owner.username)
        self.workflow = Workflow.objects.create(
            uid=owner.pk, app_id="app", flow_id="media-flow", name="Media", data="{}"
        )
        self.config = SandboxConfig.objects.create(uid=owner.pk, enabled=True, provider="docker")
        root = ExecutionContext.objects.create(
            uid=owner.pk, deadline=timezone.now() + timedelta(minutes=1)
        )
        self.tool = Tool.objects.create(
            user_id=owner.pk,
            tool_id="media-tool",
            version="V1.0",
            tool_tag="builtin:aitools.image_generate",
            operation_id="textToImage",
            method="post",
            end_point=f"{AITOOLS_ORIGIN}/aitools/v1/image_generate",
            status=1,
        )
        self.run = WorkflowRun.objects.create(
            uid=owner.pk,
            workflow_id=self.workflow.pk,
            context_id=root.pk,
            status="running",
            graph={
                "nodes": [
                    {
                        "id": NODE_ID,
                        "data": {
                            "nodeParam": {
                                "pluginId": str(self.tool.pk),
                                "version": self.tool.version,
                                "operationId": self.tool.operation_id,
                            }
                        },
                    }
                ],
                "edges": [],
            },
        )
        self.scope = "user-" + hashlib.sha256(owner.pk.encode()).hexdigest()

    @patch("astron_console.workflows.sandbox_media.request_runner")
    @patch("astron_console.workflows.sandbox_media.storage.read", return_value=b"generated media")
    def test_copies_built_in_image_and_audio_by_object_key(self, read, runner):
        for tag, operation, field, suffix in (
            ("image_generate", "textToImage", "image_url", ".jpg"),
            ("smarttts", "textToSpeech", "voice_url", ".MP3"),
        ):
            with self.subTest(tag=tag):
                self.tool.tool_tag = "builtin:aitools." + tag
                self.tool.end_point = f"{AITOOLS_ORIGIN}/aitools/v1/{tag}"
                self.tool.operation_id = operation
                self.tool.save(update_fields=["tool_tag", "end_point", "operation_id"])
                self.run.graph["nodes"][0]["data"]["nodeParam"]["operationId"] = operation
                key = MEDIA_UUID + suffix
                async_to_sync(archive_node_files)(
                    self.run,
                    NODE_ID,
                    json.dumps({"code": 0, "data": {field: f"{MEDIA_SCOPE}/media/{key}"}}),
                )
                read.assert_called_once_with(key, "media", limit=20 * 1024 * 1024)
                runner.assert_called_once_with(
                    "write",
                    kind="workflow",
                    scope=self.scope,
                    resourceId=self.workflow.flow_id,
                    files=[
                        {
                            "path": "output/" + key,
                            "content": base64.b64encode(b"generated media").decode(),
                        }
                    ],
                )
                read.reset_mock()
                runner.reset_mock()

    @patch("astron_console.workflows.sandbox_media.request_runner")
    @patch("astron_console.workflows.sandbox_media.storage.read")
    def test_skips_untrusted_urls_tools_and_public_runs(self, read, runner):
        key = MEDIA_UUID + ".jpg"
        valid = {"code": 0, "data": {"image_url": f"{MEDIA_SCOPE}/media/{key}"}}
        for url in (
            f"https://elsewhere.example/media/{key}",
            f"{MEDIA_SCOPE}/other-bucket/{key}",
            f"{MEDIA_SCOPE}/media/nested/{key}",
            f"{MEDIA_SCOPE}/media/{key}?alias=1",
        ):
            async_to_sync(archive_node_files)(self.run, NODE_ID, {"data": {"image_url": url}})
        async_to_sync(archive_node_files)(self.run, "plugin::other", valid)
        async_to_sync(archive_node_files)(self.run, NODE_ID, {**valid, "code": 17})
        with patch("astron_console.workflows.sandbox_media.grant_for_root", return_value=object()):
            async_to_sync(archive_node_files)(self.run, NODE_ID, valid)
        self.tool.end_point = "https://elsewhere.example/aitools/v1/image_generate"
        self.tool.save(update_fields=["end_point"])
        async_to_sync(archive_node_files)(self.run, NODE_ID, valid)
        self.tool.end_point = f"{AITOOLS_ORIGIN}/aitools/v1/image_generate"
        self.tool.save(update_fields=["end_point"])
        WorkflowRun.objects.filter(pk=self.run.pk).update(cancel_requested=True)
        async_to_sync(archive_node_files)(self.run, NODE_ID, valid)
        WorkflowRun.objects.filter(pk=self.run.pk).update(cancel_requested=False)
        self.config.enabled = False
        self.config.save(update_fields=["enabled"])
        async_to_sync(archive_node_files)(self.run, NODE_ID, valid)
        read.assert_not_called()
        runner.assert_not_called()

    @patch("astron_console.workflows.sandbox_media.request_runner")
    @patch("astron_console.workflows.sandbox_media.storage.read", return_value=b"image")
    def test_internal_callback_revalidates_run_and_media_before_copying(self, read, runner):
        key = MEDIA_UUID + ".jpg"
        payload = {
            "runId": self.run.pk,
            "rootId": self.run.context_id,
            "nodeId": NODE_ID,
            "outputs": {"data": {"image_url": f"{MEDIA_SCOPE}/media/{key}"}},
        }
        headers = {"HTTP_X_WORKFLOW_INTERNAL_KEY": "workflow-console-test-token"}
        self.assertEqual(
            self.client.post(ARCHIVE_URL, payload, content_type="application/json").status_code, 403
        )
        with self.subTest("root mismatch"):
            result = self.client.post(
                ARCHIVE_URL,
                {**payload, "rootId": "another-root"},
                content_type="application/json",
                **headers,
            )
            self.assertEqual(result.json()["data"], {})
        with self.subTest("node mismatch"):
            result = self.client.post(
                ARCHIVE_URL,
                {**payload, "nodeId": "plugin::foreign"},
                content_type="application/json",
                **headers,
            )
            self.assertEqual(result.json()["data"], {})
        read.assert_not_called()
        runner.assert_not_called()

        runner.side_effect = UpstreamError("unavailable")
        response = self.client.post(
            ARCHIVE_URL, payload, content_type="application/json", **headers
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"], {})
        read.assert_called_once_with(key, "media", limit=20 * 1024 * 1024)
        runner.assert_called_once()
