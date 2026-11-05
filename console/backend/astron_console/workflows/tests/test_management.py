import importlib
import json
from datetime import UTC, datetime, timedelta

from django.apps import apps
from django.core.exceptions import ValidationError
from django.db import connection
from django.test import TransactionTestCase, override_settings
from django.urls import include, path
from django.utils import timezone

from astron_console.accounts.models import User, UserProfile
from astron_console.resources.models import ConfigInfo, Model
from astron_console.spaces.permissions import ResourceScope
from astron_console.workflows.automation import claim_due, claim_pending, enqueue, next_fire
from astron_console.workflows.management_views import create_workflow
from astron_console.workflows.models import (
    AutomationRun,
    AutomationTask,
    Workflow,
    WorkflowTemplate,
    WorkflowVersion,
)
from astron_console.workflows.protocol import normalize_graph, starter_graph, to_protocol
from astron_console.workflows.templates import export_yaml, parse_yaml

urlpatterns = [path("", include("astron_console.workflows.management_urls"))]


@override_settings(ROOT_URLCONF=__name__)
class ManagementTests(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create_user(id="retained-uid", username="owner")
        UserProfile.objects.create(uid=self.user.pk, username="owner")
        self.other = User.objects.create_user(id="other-uid", username="other")
        UserProfile.objects.create(uid=self.other.pk, username="other")
        self.client.force_login(self.user)
        self.scope = ResourceScope(self.user.pk, None, None)
        self.workflow = create_workflow(self.scope, {"name": "workflow"})

    def write(self, method, url, payload):
        return getattr(self.client, method)(
            url, json.dumps(payload), content_type="application/json"
        )

    def test_crud_versions_restore_keep_identity_and_old_snapshot(self):
        result = self.client.get(f"/workflow?id={self.workflow.pk}")
        self.assertEqual(result.status_code, 200, result.content)
        self.assertEqual(result.json()["data"]["uid"], "retained-uid")
        created = self.write("post", "/workflow/version", {"flowId": self.workflow.flow_id})
        self.assertEqual(created.status_code, 200, created.content)
        version = WorkflowVersion.objects.get(pk=created.json()["data"]["id"])
        old = version.data
        graph = json.loads(self.workflow.data)
        graph["nodes"][0]["data"]["label"] = "new"
        self.assertEqual(
            self.write("put", "/workflow", {"id": self.workflow.pk, "data": graph}).status_code, 200
        )
        self.assertEqual(
            self.write("post", "/workflow/version/restore", {"id": version.pk}).status_code, 200
        )
        self.workflow.refresh_from_db()
        self.assertEqual(json.loads(self.workflow.data), json.loads(old))
        version.data = "{}"
        with self.assertRaises(ValidationError):
            version.save()
        self.client.delete(f"/workflow?id={self.workflow.pk}")
        self.assertTrue(Workflow.objects.get(pk=self.workflow.pk).deleted)
        self.assertEqual(WorkflowVersion.objects.get(pk=version.pk).data, old)

    def test_other_owner_cannot_read_clone_restore_export_or_import_identity(self):
        version = WorkflowVersion.objects.create(
            flow_id=self.workflow.flow_id, version_num="v1", data=self.workflow.data
        )
        self.client.force_login(self.other)
        for url in [
            f"/workflow?id={self.workflow.pk}",
            f"/workflow/clone?id={self.workflow.pk}",
            f"/workflow/export/{self.workflow.pk}",
        ]:
            self.assertEqual(self.client.get(url).status_code, 403, url)
        self.assertEqual(
            self.write("post", "/workflow/version/restore", {"id": version.pk}).status_code, 403
        )
        result = self.write(
            "post", "/workflow", {"name": "new", "uid": self.user.pk, "spaceId": 999}
        )
        self.assertEqual(result.status_code, 200, result.content)
        self.assertEqual(result.json()["data"]["uid"], self.other.pk)
        self.assertIsNone(result.json()["data"]["spaceId"])

    def test_legacy_null_fields_clone_and_canvas_picker_pagination(self):
        self.workflow.edge_type = None
        self.workflow.avatar_icon = None
        self.workflow.save()
        result = self.client.get(f"/workflow/clone?id={self.workflow.pk}")
        self.assertEqual(result.status_code, 200, result.content)
        self.workflow.published_data = self.workflow.data
        self.workflow.save()
        result = self.client.get("/workflow/list?current=1&pageSize=999&status=1")
        self.assertEqual(result.status_code, 200, result.content)
        self.assertEqual([r["id"] for r in result.json()["data"]["pageData"]], [self.workflow.pk])
        result = self.client.get(
            f"/workflow/list?pageSize=999&status=1&flowId={self.workflow.flow_id}"
        )
        self.assertEqual(result.json()["data"]["pageData"], [])

    def test_plain_start_output_does_not_become_a_file_parameter(self):
        protocol = to_protocol(starter_graph(), self.workflow, self.scope)
        output = protocol["data"]["nodes"][0]["data"]["outputs"][0]
        self.assertNotIn("fileType", output)

    def test_export_omits_runtime_secrets_and_yaml_rejects_aliases_and_objects(self):
        graph = json.loads(self.workflow.data)
        graph["nodes"][0]["data"]["nodeParam"] = {
            "apiKey": "secret",
            "console_context": {"uid": "forged"},
        }
        self.workflow.data = json.dumps(graph)
        self.workflow.save()
        result = export_yaml(self.workflow)
        self.assertNotIn("secret", result)
        self.assertNotIn("forged", result)
        self.assertEqual(parse_yaml(result)["flowMeta"]["name"], "workflow")
        with self.assertRaises(ValidationError):
            parse_yaml("flowMeta: &x {name: hi}\nflowData: *x")
        with self.assertRaises(ValidationError):
            parse_yaml("!!python/object/apply:os.system ['echo unsafe']")
        self.workflow.refresh_from_db()
        self.assertIn("secret", self.workflow.data)

    def test_templates_snapshot_and_scope(self):
        exported = self.write(
            "post", "/workflow/bot/exportTemplate", {"workflowId": self.workflow.pk}
        )
        self.assertEqual(exported.status_code, 200, exported.content)
        tid = exported.json()["data"]["id"]
        self.assertIsInstance(tid, str)
        large_id = 2083099577214906371
        WorkflowTemplate.objects.filter(pk=tid).update(id=large_id)
        listed = self.client.post(
            "/workflow/bot/templateList", "{}", content_type="application/json"
        )
        tid = listed.json()["data"][0]["templateId"]
        self.assertEqual(tid, str(large_id))
        self.workflow.deleted = True
        self.workflow.save()
        cloned = self.write("post", "/workflow/bot/createFromTemplate", {"templateId": tid})
        self.assertEqual(cloned.status_code, 200, cloned.content)
        self.assertNotEqual(cloned.json()["data"]["id"], self.workflow.pk)
        self.client.force_login(self.other)
        self.assertEqual(
            self.write("post", "/workflow/bot/createFromTemplate", {"templateId": tid}).status_code,
            403,
        )

    def test_graph_mapping_retains_branch_retry_and_variable_shapes(self):
        graph = starter_graph()
        graph["edges"][0]["sourceHandle"] = "branch_one_of::yes"
        graph["nodes"][1]["data"]["retryConfig"] = {"customOutput": '{"output":"fallback"}'}
        protocol = to_protocol(graph, self.workflow, self.scope)
        self.assertEqual(
            protocol["data"]["edges"][0]["sourceHandle"], "intent_chain|branch_one_of::yes"
        )
        self.assertEqual(
            protocol["data"]["nodes"][1]["data"]["retryConfig"]["customOutput"],
            {"output": "fallback"},
        )
        self.assertEqual(
            protocol["data"]["nodes"][1]["data"]["inputs"][0]["schema"]["value"]["content"][
                "nodeId"
            ],
            graph["nodes"][0]["id"],
        )
        graph["edges"][0]["target"] = "not-present"
        with self.assertRaises(ValidationError):
            normalize_graph(graph)

    def test_model_node_authorizes_actual_caller(self):
        model = Model.objects.create(
            uid=self.other.pk,
            name="secret",
            url="https://model.example/v1",
            api_key="secret",
            domain="model",
            provider="openai",
            enable=True,
        )
        graph = starter_graph()
        graph["nodes"][1]["id"] = "spark-llm::model"
        graph["nodes"][1]["data"]["nodeParam"] = {"modelId": model.pk}
        graph["edges"][0]["target"] = "spark-llm::model"
        from django.core.exceptions import PermissionDenied

        with self.assertRaises(PermissionDenied):
            to_protocol(graph, self.workflow, self.scope)

    def test_cron_seconds_timezone_and_durable_nonoverlapping_claim(self):
        base = datetime(2026, 11, 5, 0, 0, tzinfo=UTC)
        self.assertEqual(
            next_fire("0 30 9 * * ?", "Asia/Shanghai", base).isoformat(),
            "2026-11-05T09:30:00+08:00",
        )
        task = AutomationTask.objects.create(
            task_name="scheduled",
            uid=self.user.pk,
            flow_id=self.workflow.flow_id,
            version="v1",
            cron_expression="0 * * * * ?",
            timezone="Asia/Shanghai",
            next_fire_time=timezone.now() - timedelta(minutes=1),
            input_params='{"query":"old"}',
        )
        self.assertEqual(claim_due(), 1)
        self.assertEqual(claim_due(), 0)
        record = AutomationRun.objects.get(task_id=task.pk)
        self.assertEqual(record.version, "v1")
        task.version = "v2"
        task.save()
        self.assertEqual(AutomationRun.objects.get(pk=record.pk).version, "v1")
        with self.assertRaises(ValidationError):
            enqueue(task, "MANUAL", timezone.now())
        self.assertEqual(claim_pending(), record.pk)
        self.assertIsNone(claim_pending())

    def test_adoption_preserves_unknown_columns_and_old_graph(self):
        migration = importlib.import_module("astron_console.workflows.migrations.0001_initial")
        with connection.cursor() as cursor:
            cursor.execute("ALTER TABLE workflow ADD COLUMN retained_external TEXT")
            cursor.execute(
                "UPDATE workflow SET retained_external = %s WHERE id = %s",
                ["untouched", self.workflow.pk],
            )
        try:
            with connection.schema_editor() as editor:
                migration.adopt_workflows(apps, editor)
                migration.adopt_workflows(apps, editor)
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT retained_external, data, uid FROM workflow WHERE id = %s",
                    [self.workflow.pk],
                )
                value = cursor.fetchone()
            self.assertEqual(value, ("untouched", self.workflow.data, self.user.pk))
        finally:
            with connection.cursor() as cursor:
                cursor.execute("ALTER TABLE workflow DROP COLUMN retained_external")

    def test_node_defaults_do_not_overwrite_customized_or_disabled(self):
        migration = importlib.import_module(
            "astron_console.workflows.migrations.0002_node_defaults"
        )
        ConfigInfo.objects.filter(category="WORKFLOW_NODE_TEMPLATE").delete()
        row = ConfigInfo.objects.create(
            category="WORKFLOW_NODE_TEMPLATE",
            code="1,2",
            name="custom",
            value='{"idType":"agent","mine":true}',
            is_valid=0,
        )
        with connection.schema_editor() as editor:
            migration.defaults(apps, editor)
            migration.defaults(apps, editor)
        row.refresh_from_db()
        self.assertEqual(row.value, '{"idType":"agent","mine":true}')
        self.assertEqual(row.is_valid, 0)
        self.assertEqual(
            sum(
                json.loads(x.value).get("idType") == "agent"
                for x in ConfigInfo.objects.filter(category="WORKFLOW_NODE_TEMPLATE")
            ),
            1,
        )

    def test_mcp_read_save_preserves_hidden_old_binding_and_explicit_clear(self):
        graph = json.loads(self.workflow.data)
        graph["nodes"][0]["data"]["nodeParam"]["plugin"] = {
            "mcpServerUrls": ["https://mcp.example?token=secret"]
        }
        self.workflow.data = json.dumps(graph)
        self.workflow.save()
        response = self.client.get(f"/workflow?id={self.workflow.pk}")
        self.assertNotIn(b"token=secret", response.content)
        public = json.loads(response.json()["data"]["data"])
        self.assertEqual(public["nodes"][0]["data"]["nodeParam"]["plugin"]["configuredMcpCount"], 1)
        self.assertEqual(
            self.write("put", "/workflow", {"id": self.workflow.pk, "data": public}).status_code,
            200,
        )
        self.workflow.refresh_from_db()
        self.assertIn("token=secret", self.workflow.data)
        public["nodes"][0]["data"]["nodeParam"]["plugin"]["mcpServerIds"] = []
        self.write("put", "/workflow", {"id": self.workflow.pk, "data": public})
        self.workflow.refresh_from_db()
        self.assertNotIn("token=secret", self.workflow.data)

    def test_protocol_cannot_spoof_execution_identity(self):
        graph = starter_graph()
        graph["nodes"][0]["data"]["nodeParam"] = {
            "uid": "other-uid",
            "appId": "other-app",
            "executionUid": "other-uid",
            "executionSpaceId": 888,
        }
        params = to_protocol(graph, self.workflow, self.scope)["data"]["nodes"][0]["data"][
            "nodeParam"
        ]
        self.assertEqual(params["uid"], self.user.pk)
        self.assertEqual(params["appId"], self.workflow.app_id)
        self.assertEqual(params["executionUid"], self.user.pk)
        self.assertIsNone(params["executionSpaceId"])

    def test_inputs_are_selected_from_task_version(self):
        WorkflowVersion.objects.create(
            flow_id=self.workflow.flow_id, version_num="v1", data=self.workflow.data
        )
        graph = json.loads(self.workflow.data)
        graph["nodes"][0]["data"]["outputs"][0]["name"] = "draft_only"
        self.workflow.data = json.dumps(graph)
        self.workflow.save()
        response = self.client.get(
            "/workflow/get-inputs-info", {"flowId": self.workflow.flow_id, "version": "v1"}
        )
        self.assertEqual(response.json()["data"][0]["name"], "AGENT_USER_INPUT")
        self.assertEqual(
            self.client.get(
                "/workflow/get-inputs-info", {"flowId": self.workflow.flow_id, "version": "missing"}
            ).status_code,
            404,
        )
