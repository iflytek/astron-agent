import base64
import hashlib
from datetime import timedelta
from unittest.mock import patch

from django.test import Client, TestCase, override_settings
from django.utils import timezone

from astron_console.accounts.models import User, UserProfile
from astron_console.agents.models import Agent, AgentRun, AgentSession
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

    @patch("astron_console.resources.local_sandbox.request_runner")
    def test_file_routes_use_resource_identity_and_require_authorization(self, runner):
        runner.return_value = {"entries": [], "truncated": False}
        agent_url = f"/agents/{self.agent.pk}/sandbox-files"
        workflow_url = f"/workflow/{self.workflow.pk}/sandbox-files"
        self.assertEqual(self.client.get(agent_url).status_code, 200)
        runner.assert_called_once_with(
            "list", kind="agent", scope=self.scope, resourceId=str(self.agent.pk), path=""
        )
        runner.reset_mock()
        self.assertEqual(self.client.get(workflow_url, {"path": "results"}).status_code, 200)
        runner.assert_called_once_with(
            "list", kind="workflow", scope=self.scope, resourceId="flow-key", path="results"
        )
        runner.reset_mock()
        runner.return_value = {"entries": [], "truncated": True, "nextCursor": "dYXJ0"}
        response = self.client.get(workflow_url, {"path": "results", "after": "dZm9v"})
        self.assertEqual(response.json()["data"]["nextCursor"], "dYXJ0")
        runner.assert_called_once_with(
            "list",
            kind="workflow",
            scope=self.scope,
            resourceId="flow-key",
            path="results",
            after="dZm9v",
        )
        runner.reset_mock()
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
    def test_team_download_uses_space_and_returns_attachment(self, runner):
        space = Space.objects.create(uid=self.owner.pk, name="local")
        SpaceMember.objects.create(uid=self.other.pk, space_id=space.pk, role=3)
        SpacePermission.objects.update_or_create(
            permission_key="WorkflowController_detail_GET", defaults={"member": True}
        )
        Workflow.objects.filter(pk=self.workflow.pk).update(space_id=space.pk)
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
            resourceId="flow-key",
            path="results/报告.bin",
        )
        self.assertEqual(b"".join(result.streaming_content), b"\x00\x01")
        self.assertEqual(result["Content-Length"], "2")
        self.assertTrue(result["Content-Disposition"].startswith("attachment;"))
        self.assertEqual(result["Cache-Control"], "private, no-store")
        self.assertEqual(result["X-Content-Type-Options"], "nosniff")

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
            (code_node, "workflow", "", self.workflow.flow_id),
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
