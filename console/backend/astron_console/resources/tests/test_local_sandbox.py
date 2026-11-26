import base64
import hashlib
from datetime import timedelta
from unittest.mock import patch

from django.test import Client, TestCase, override_settings
from django.utils import timezone

from astron_console.accounts.models import User, UserProfile
from astron_console.agents.models import Agent, AgentRun, AgentSession
from astron_console.resources.local_sandbox import purge_deleted_resources
from astron_console.resources.models import SandboxConfig
from astron_console.spaces.models import Space, SpaceMember, SpacePermission
from astron_console.workflows.models import Workflow
from astron_console.workflows.runtime_models import ExecutionContext, WorkflowRun

RUNTIME = "/skill-sandbox/internal-runtime-config"
TOKEN_HEADER = {"HTTP_X_SKILL_SANDBOX_RUNTIME_CREDENTIAL_TOKEN": "console-test-token"}


@override_settings(
    LOCAL_SANDBOX_URL="http://sandbox:8090",
    SKILL_SANDBOX_RUNTIME_CREDENTIAL_TOKEN="console-test-token",
)
class LocalSandboxTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(id="local-owner", username="local-owner")
        self.other = User.objects.create_user(id="local-other", username="local-other")
        for user in (self.owner, self.other):
            UserProfile.objects.create(uid=user.pk, username=user.username)
        self.client.force_login(self.owner)
        self.agent = Agent.objects.create(uid=self.owner.pk, bot_name="Agent")
        self.workflow = Workflow.objects.create(
            uid=self.owner.pk, app_id="app", flow_id="flow-key", name="Workflow", data="{}"
        )
        self.scope = "user-" + hashlib.sha256(self.owner.pk.encode()).hexdigest()

    def test_local_probe_does_not_change_active_cloud_config(self):
        row = SandboxConfig.objects.create(
            uid=self.owner.pk, enabled=True, api_key="cloud-key", allow_internet_access=True
        )
        with patch(
            "astron_console.resources.sandbox.request_runner", return_value={"status": "ok"}
        ) as runner:
            result = self.client.post(
                "/skill-sandbox/test", {"provider": "docker"}, content_type="application/json"
            )
        self.assertEqual(result.status_code, 200, result.content)
        self.assertTrue(result.json()["data"]["localAvailable"])
        self.assertEqual(result.json()["data"]["lastTestStatus"], "success")
        runner.assert_called_once_with("probe")
        row.refresh_from_db()
        self.assertEqual(row.provider, "e2b")
        self.assertIsNone(row.last_test_status)
        saved = self.client.put(
            "/skill-sandbox/config",
            {"provider": "docker", "enabled": True, "apiKey": "", "allowInternetAccess": True},
            content_type="application/json",
        )
        self.assertEqual(saved.status_code, 200, saved.content)
        self.assertFalse(saved.json()["data"]["allowInternetAccess"])
        self.assertTrue(saved.json()["data"]["e2bAllowInternetAccess"])
        row.refresh_from_db()
        self.assertEqual(row.provider, "docker")
        self.assertEqual(row.api_key, "cloud-key")
        self.assertTrue(row.allow_internet_access)
        self.assertNotIn(b"cloud-key", saved.content)
        cloud = self.client.put(
            "/skill-sandbox/config",
            {"provider": "e2b", "enabled": True, "apiKeyMasked": True},
            content_type="application/json",
        )
        self.assertEqual(cloud.status_code, 200, cloud.content)
        self.assertTrue(cloud.json()["data"]["allowInternetAccess"])

    @patch("e2b.Sandbox.create")
    def test_e2b_probe_keeps_saved_docker_provider(self, create):
        row = SandboxConfig.objects.create(uid=self.owner.pk, enabled=True, provider="docker")
        result = self.client.post(
            "/skill-sandbox/test",
            {"provider": "e2b", "enabled": True, "apiKey": "test-key"},
            content_type="application/json",
        )
        self.assertEqual(result.status_code, 200)
        create.assert_called_once_with(api_key="test-key", timeout=60, allow_internet_access=False)
        row.refresh_from_db()
        self.assertTrue(row.enabled)
        self.assertEqual(row.provider, "docker")
        self.assertFalse(row.api_key)

    @patch("astron_console.resources.local_sandbox.request_runner")
    def test_file_routes_use_resource_identity_and_require_authorization(self, runner):
        config = SandboxConfig.objects.create(uid=self.owner.pk, enabled=True, provider="docker")
        runner.return_value = {"entries": [], "truncated": False}
        agent_url = f"/agents/{self.agent.pk}/sandbox-files"
        workflow_url = f"/workflow/{self.workflow.pk}/sandbox-files"
        response = self.client.get(agent_url)
        self.assertEqual(response.json()["data"]["directory"], self.agent.sandbox_directory)
        runner.assert_called_once_with(
            "list-tree", kind="agent", scope=self.scope, resourceId=str(self.agent.pk), after=None
        )
        runner.reset_mock()
        runner.return_value = {"entries": [], "truncated": True, "nextCursor": "results/report"}
        response = self.client.get(workflow_url, {"after": "results/other"})
        self.assertEqual(response.json()["data"]["nextCursor"], "results/report")
        runner.assert_called_once_with(
            "list-tree",
            kind="workflow",
            scope=self.scope,
            resourceId=f"~{self.workflow.pk}",
            after="results/other",
        )
        runner.reset_mock()
        config.provider = "e2b"
        config.save(update_fields=["provider"])
        listing = self.client.get(workflow_url).json()["data"]
        self.assertEqual(listing["provider"], "e2b")
        self.assertIsNone(listing["directory"])
        self.assertEqual(listing["entries"], [])
        self.assertEqual(
            self.client.get(workflow_url + "/download", {"path": "results/report"}).status_code,
            404,
        )
        config.enabled = False
        config.save(update_fields=["enabled"])
        self.assertIsNone(self.client.get(workflow_url).json()["data"]["provider"])
        for path in ("../results", "/results", "results/../../other", "dir//file"):
            self.assertEqual(self.client.get(workflow_url, {"path": path}).status_code, 400)
        self.assertEqual(Client().get(agent_url).status_code, 401)
        self.client.force_login(self.other)
        self.assertEqual(self.client.get(agent_url).status_code, 403)
        self.assertEqual(
            self.client.get(workflow_url + "/download", {"path": "x"}).status_code, 403
        )
        runner.assert_not_called()

    @patch("astron_console.resources.local_sandbox.request_runner")
    def test_switch_during_runner_request_discards_docker_response(self, runner):
        url = f"/agents/{self.agent.pk}/sandbox-files"
        config = SandboxConfig.objects.create(uid=self.owner.pk, enabled=True, provider="docker")

        def switch_to_e2b(*args, **kwargs):
            SandboxConfig.objects.filter(pk=config.pk).update(provider="e2b")
            return {"entries": [{"path": "docker.txt"}], "truncated": False}

        runner.side_effect = switch_to_e2b
        self.assertEqual(self.client.get(url).json()["data"]["entries"], [])
        SandboxConfig.objects.filter(pk=config.pk).update(provider="docker")
        download = self.client.get(url + "/download", {"path": "docker.txt"})
        self.assertEqual(download.status_code, 404)

    @patch("astron_console.resources.local_sandbox.request_runner")
    def test_single_file_deletion_uses_saved_directory_and_active_provider(self, runner):
        config = SandboxConfig.objects.create(uid=self.owner.pk, enabled=True, provider="docker")
        runner.return_value = {}
        for kind, resource, prefix in (
            ("agent", self.agent, "agents"),
            ("workflow", self.workflow, "workflow"),
        ):
            url = f"/{prefix}/{resource.pk}/sandbox-files/file"
            for path in (None, "", "/output/report.md", "../report.md", "output/../report.md"):
                result = self.client.delete(url, {"path": path}, content_type="application/json")
                self.assertEqual(result.status_code, 400)
            runner.assert_not_called()
            result = self.client.delete(
                url,
                {"path": "output/报告.md", "scope": "space-7", "resourceId": "other"},
                content_type="application/json",
            )
            self.assertEqual(result.json()["data"], {"deleted": True})
            runner.assert_called_once_with(
                "delete",
                kind=kind,
                scope=self.scope,
                resourceId=resource.sandbox_directory.rsplit("/", 1)[1],
                path="output/报告.md",
            )
            runner.reset_mock()
        config.provider = "e2b"
        config.save(update_fields=["provider"])
        result = self.client.delete(
            url, {"path": "output/报告.md"}, content_type="application/json"
        )
        self.assertEqual(result.status_code, 400)
        runner.assert_not_called()

    @patch("astron_console.resources.local_sandbox.request_runner")
    def test_read_only_team_member_cannot_delete_files(self, runner):
        space = Space.objects.create(uid=self.owner.pk, name="Sandbox team")
        SpaceMember.objects.create(space_id=space.pk, uid=self.other.pk, role=3)
        agent = Agent.objects.create(uid=self.owner.pk, space_id=space.pk)
        workflow = Workflow.objects.create(uid=self.owner.pk, space_id=space.pk, name="Test")
        SandboxConfig.objects.create(
            uid=self.owner.pk, space_id=space.pk, enabled=True, provider="docker"
        )
        self.client.force_login(self.other)
        runner.return_value = {"entries": [], "truncated": False}
        for url, read, write in (
            (
                f"/agents/{agent.pk}/sandbox-files",
                "MyBotController_getBotDetail_POST",
                "BotCreateController_updateBot_POST",
            ),
            (
                f"/workflow/{workflow.pk}/sandbox-files",
                "WorkflowController_detail_GET",
                "WorkflowController_update_PUT",
            ),
        ):
            SpacePermission.objects.update_or_create(permission_key=read, defaults={"member": True})
            SpacePermission.objects.update_or_create(
                permission_key=write, defaults={"member": False}
            )
            headers = {"HTTP_SPACE_ID": str(space.pk)}
            listing = self.client.get(url, **headers)
            self.assertFalse(listing.json()["data"]["canDelete"])
            runner.reset_mock()
            denied = self.client.delete(
                url + "/file", {"path": "report.md"}, content_type="application/json", **headers
            )
            self.assertEqual(denied.status_code, 403)
            runner.assert_not_called()

    @patch("astron_console.resources.local_sandbox.request_runner")
    def test_workflow_file_routes_accept_existing_numeric_flow_identifier(self, runner):
        SandboxConfig.objects.create(uid=self.owner.pk, enabled=True, provider="docker")
        self.workflow.flow_id = "123456789012345678"
        self.workflow.save(update_fields=["flow_id"])
        url = f"/workflow/{self.workflow.flow_id}/sandbox-files"
        runner.return_value = {"entries": [], "truncated": False}
        self.assertEqual(
            self.client.get(url).json()["data"]["directory"], self.workflow.sandbox_directory
        )
        runner.return_value = {"content": "dGVzdA=="}
        downloaded = self.client.get(url + "/download", {"path": "report.md"})
        self.assertEqual(b"".join(downloaded.streaming_content), b"test")
        runner.return_value = {}
        deleted = self.client.delete(
            url + "/file", {"path": "report.md"}, content_type="application/json"
        )
        self.assertEqual(deleted.status_code, 200)
        runner.assert_called_with(
            "delete",
            kind="workflow",
            scope=self.scope,
            resourceId=f"~{self.workflow.pk}",
            path="report.md",
        )

    @patch("astron_console.resources.local_sandbox.request_runner")
    def test_team_download_uses_space_and_returns_attachment(self, runner):
        space = Space.objects.create(uid=self.owner.pk, name="local")
        SpaceMember.objects.create(uid=self.other.pk, space_id=space.pk, role=3)
        SpacePermission.objects.update_or_create(
            permission_key="WorkflowController_detail_GET", defaults={"member": True}
        )
        self.workflow = Workflow.objects.create(
            uid=self.owner.pk, space_id=space.pk, app_id="app", flow_id="team-flow", name="Team"
        )
        SandboxConfig.objects.create(
            uid=self.owner.pk, space_id=space.pk, enabled=True, provider="docker"
        )
        runner.return_value = {"content": base64.b64encode(b"\x00\x01").decode()}
        self.client.force_login(self.other)
        result = self.client.get(
            f"/workflow/{self.workflow.pk}/sandbox-files/download",
            {"path": "results/报告.bin", "kind": "agent", "resourceId": "foreign"},
            HTTP_SPACE_ID=str(space.pk),
        )
        self.assertEqual(result.status_code, 200)
        runner.assert_called_once_with(
            "read",
            kind="workflow",
            scope=f"space-{space.pk}",
            resourceId=f"~{self.workflow.pk}",
            path="results/报告.bin",
        )
        self.assertEqual(b"".join(result.streaming_content), b"\x00\x01")
        self.assertEqual(result["Content-Length"], "2")
        self.assertTrue(result["Content-Disposition"].startswith("attachment;"))
        self.assertEqual(result["Cache-Control"], "private, no-store")
        self.assertEqual(result["X-Content-Type-Options"], "nosniff")

    @patch("astron_console.resources.local_sandbox.request_runner")
    def test_deletion_retries_cleanup_independently_of_selected_sandbox(self, runner):
        from astron_console.resources.common import UpstreamError

        SandboxConfig.objects.create(uid=self.owner.pk, enabled=True, provider="e2b")
        self.assertEqual(self.client.delete(f"/agents/{self.agent.pk}").status_code, 200)
        self.assertEqual(self.client.delete(f"/workflow?id={self.workflow.pk}").status_code, 200)
        runner.side_effect = UpstreamError("busy")
        purge_deleted_resources()
        self.agent.refresh_from_db()
        self.workflow.refresh_from_db()
        self.assertTrue(self.agent.sandbox_cleanup_pending)
        self.assertTrue(self.workflow.sandbox_cleanup_pending)
        runner.reset_mock(side_effect=True)
        purge_deleted_resources()
        self.assertEqual([call.args for call in runner.call_args_list], [("purge",), ("purge",)])
        self.assertEqual(
            [call.kwargs["resourceId"] for call in runner.call_args_list],
            [str(self.agent.pk), f"~{self.workflow.pk}"],
        )
        self.agent.refresh_from_db()
        self.workflow.refresh_from_db()
        self.assertFalse(self.agent.sandbox_cleanup_pending)
        self.assertFalse(self.workflow.sandbox_cleanup_pending)

    def test_runtime_distinguishes_referenced_agent_from_its_workflow(self):
        SandboxConfig.objects.create(uid=self.owner.pk, enabled=True, provider="docker")
        root = ExecutionContext.objects.create(
            uid=self.owner.pk, deadline=timezone.now() + timedelta(minutes=1)
        )
        agent_node, code_node = "agent::node", "ifly-code::node"
        run = WorkflowRun.objects.create(
            uid=self.owner.pk,
            workflow_id=self.workflow.pk,
            context_id=root.pk,
            status="running",
            graph={"nodes": [{"id": agent_node}, {"id": code_node}], "edges": []},
            resolved_agents={agent_node: {"agentId": self.agent.pk}},
        )
        context = {
            "uid": self.owner.pk,
            "flowId": self.workflow.flow_id,
            "rootId": root.pk,
            "runId": run.pk,
        }
        for node_id, purpose, agent_id, expected in (
            (agent_node, "agent", self.agent.pk, str(self.agent.pk)),
            (code_node, "workflow", "", f"~{self.workflow.pk}"),
        ):
            with self.subTest(purpose=purpose):
                response = self.client.get(
                    RUNTIME,
                    {**context, "nodeId": node_id, "purpose": purpose, "agentId": agent_id},
                    **TOKEN_HEADER,
                )
                self.assertEqual(response.status_code, 200, response.content)
                self.assertEqual(
                    response.json()["data"],
                    {
                        "provider": "docker",
                        "timeoutSeconds": 60,
                        "allowInternetAccess": False,
                        "sandboxScope": self.scope,
                        "sandboxResourceId": expected,
                        "sandboxDirectory": f"/workspace/{purpose}s/{self.scope}/{expected}",
                    },
                )
        for fields in (
            {"nodeId": agent_node},
            {"nodeId": code_node, "agentId": self.agent.pk},
            {"nodeId": code_node, "purpose": "agent"},
        ):
            self.assertEqual(
                self.client.get(RUNTIME, {**context, **fields}, **TOKEN_HEADER).status_code, 403
            )
        with (
            patch(
                "astron_console.publishing.runtime_authorization.grant_for_root",
                return_value=object(),
            ),
            patch("astron_console.publishing.runtime_authorization.check_grant"),
        ):
            result = self.client.get(RUNTIME, {**context, "nodeId": code_node}, **TOKEN_HEADER)
        self.assertEqual(result.status_code, 403)

    def test_standalone_runtime_requires_root_agent_binding(self):
        SandboxConfig.objects.create(uid=self.owner.pk, enabled=True, provider="docker")
        session = AgentSession.objects.create(
            uid=self.owner.pk, agent_id=self.agent.pk, kind="chat"
        )
        run = AgentRun.objects.create(session=session, status="running")
        root = ExecutionContext.objects.create(
            uid=self.owner.pk,
            agent_run_id=run.pk,
            agent_id=self.agent.pk,
            deadline=timezone.now() + timedelta(minutes=1),
        )
        fields = {
            "uid": self.owner.pk,
            "agentId": self.agent.pk,
            "rootId": root.pk,
            "runId": run.pk,
        }
        response = self.client.get(RUNTIME, fields, **TOKEN_HEADER)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["data"]["sandboxResourceId"], str(self.agent.pk))
        root.agent_id += 1
        root.save(update_fields=["agent_id"])
        self.assertEqual(self.client.get(RUNTIME, fields, **TOKEN_HEADER).status_code, 403)
