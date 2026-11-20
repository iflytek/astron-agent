"""Regressions across resource management, published references and selectors."""

import json
from unittest.mock import patch

from django.core.exceptions import PermissionDenied
from django.test import TestCase, override_settings

from astron_console.accounts.models import User, UserProfile
from astron_console.agents.models import Agent, AgentState, AgentVersion
from astron_console.agents.resource_resolution import (
    resolve_resources,
    snapshot_references,
    tool_query,
)
from astron_console.resources.common import UpstreamError
from astron_console.resources.models import McpConfig, Model, Tool, ToolFavorite
from astron_console.spaces.models import Space, SpaceMember, SpacePermission
from astron_console.spaces.permissions import ResourceScope
from astron_console.workflows.models import Workflow, WorkflowVersion

SCHEMA = {
    "openapi": "3.1.0",
    "info": {"title": "Built-in", "version": "1"},
    "servers": [{"url": "http://core-aitools:18668"}],
    "paths": {"/aitools/v1/ocr": {"post": {"operationId": "ocr", "responses": {}}}},
}


@override_settings(RESOURCE_APP_ID="test-app")
class ToolMcpLifecycleTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(id="tool-owner", username="tool-owner")
        UserProfile.objects.create(uid=self.user.pk, username=self.user.username)
        self.client.force_login(self.user)
        self.scope = ResourceScope(self.user.pk, None, None)
        self.model = Model.objects.create(
            uid=self.user.pk,
            name="test",
            domain="test",
            enable=True,
            api_key="runtime-secret",
            url="https://example.com/v1/chat/completions",
        )

    def write(self, method, url, payload, **headers):
        return getattr(self.client, method)(
            url, json.dumps(payload), content_type="application/json", **headers
        )

    def mcp(self, **kwargs):
        return McpConfig.objects.create(
            uid=self.user.pk,
            name="MCP",
            sort_link="https://example.com/mcp?token=secret",
            mcp_id="stable-connection",
            **kwargs,
        )

    def test_mcp_edit_keeps_identity_and_masked_parameters_without_registration(self):
        row = self.mcp(parameters='{"apiKey":"secret"}', server_id="old-registry-id")
        with patch(
            "astron_console.resources.clients.call",
            return_value={
                "servers": [{"server_status": 0, "tools": []}],
            },
        ) as remote:
            for payload in (
                {"name": "Renamed"},
                {"name": "Again", "parameters": {"apiKey": "******"}},
            ):
                result = self.write("put", f"/resources/mcp/{row.pk}", payload)
                self.assertEqual(result.status_code, 200, result.content)
                self.assertNotIn(b"token=secret", result.content)
            self.assertEqual(remote.call_count, 2)
            self.assertTrue(
                all(call.args[2] == "/api/v1/mcp/tool_list" for call in remote.call_args_list)
            )
        row.refresh_from_db()
        self.assertEqual(row.mcp_id, "stable-connection")
        self.assertEqual(row.server_id, "old-registry-id")
        self.assertEqual(json.loads(row.parameters), {"apiKey": "secret"})
        self.assertEqual(McpConfig.objects.count(), 1)

    def test_mcp_failed_update_preserves_previous_connection(self):
        row = self.mcp()
        with patch(
            "astron_console.resources.clients.call",
            return_value={
                "servers": [{"server_status": 500, "tools": []}],
            },
        ):
            response = self.write(
                "put",
                f"/resources/mcp/{row.pk}",
                {
                    "name": "Rejected",
                    "serverUrl": "https://new.example.com/mcp",
                },
            )
        self.assertEqual(response.status_code, 400)
        row.refresh_from_db()
        self.assertEqual(row.name, "MCP")
        self.assertIn("example.com/mcp?", row.sort_link)

    def test_public_mcp_url_is_visible_and_editable_after_save(self):
        row = self.mcp()
        row.sort_link = "https://mcp.deepwiki.com/mcp"
        row.save()
        with patch(
            "astron_console.resources.clients.call",
            return_value={"servers": [{"server_status": 0, "tools": []}]},
        ) as remote:
            detail = self.client.get(f"/resources/mcp/{row.pk}").json()["data"]
            self.assertEqual(detail["serverUrl"], row.sort_link)
            self.assertFalse(detail["serverUrlMasked"])
            for url in (detail["serverUrl"], "https://another.example/sse"):
                response = self.write(
                    "put", f"/resources/mcp/{row.pk}", {"name": "Edited", "serverUrl": url}
                )
                self.assertEqual(response.status_code, 200, response.content)
                self.assertEqual(response.json()["data"]["serverUrl"], url)
                self.assertEqual(remote.call_args.kwargs["payload"]["mcp_server_urls"], [url])
        row.refresh_from_db()
        self.assertEqual(row.sort_link, "https://another.example/sse")

    def test_masked_mcp_url_roundtrip_preserves_credentials(self):
        for url, expected in (
            ("https://example.com/mcp?token=private-value", "https://example.com/mcp?******"),
            ("https://example.com/private-bearer", "https://example.com/******"),
            (
                "https://example.com/short/private-token?api-key=secret",
                "https://example.com/******?******",
            ),
        ):
            with self.subTest(url=url):
                row = self.mcp()
                row.sort_link = url
                row.save()
                with patch(
                    "astron_console.resources.clients.call",
                    return_value={"servers": [{"server_status": 0, "tools": []}]},
                ) as remote:
                    response = self.client.get(f"/resources/mcp/{row.pk}")
                    detail = response.json()["data"]
                    self.assertEqual(detail["serverUrl"], expected)
                    self.assertTrue(detail["serverUrlMasked"])
                    for secret in ("private-value", "private-bearer", "private-token", "secret"):
                        self.assertNotIn(secret.encode(), response.content)
                    result = self.write(
                        "put",
                        f"/resources/mcp/{row.pk}",
                        {"name": "Renamed", "serverUrl": detail["serverUrl"]},
                    )
                    self.assertEqual(result.status_code, 200, result.content)
                    self.assertEqual(remote.call_args.kwargs["payload"]["mcp_server_urls"], [url])
                row.refresh_from_db()
                self.assertEqual(row.sort_link, url)

    def test_partially_changed_masked_url_requires_complete_replacement(self):
        row = self.mcp()
        with patch("astron_console.resources.clients.call") as remote:
            result = self.write(
                "put",
                f"/resources/mcp/{row.pk}",
                {"name": "Edited", "serverUrl": "https://new.example.com/mcp?******"},
            )
        self.assertEqual(result.status_code, 400, result.content)
        remote.assert_not_called()
        row.refresh_from_db()
        self.assertEqual(row.name, "MCP")
        self.assertEqual(row.sort_link, "https://example.com/mcp?token=secret")

    def test_mcp_delete_guards_agent_and_workflow_drafts_and_published_references(self):
        for source in (
            "agent-draft",
            "agent-version",
            "workflow-draft",
            "workflow-version",
            "legacy-url",
        ):
            with self.subTest(source=source):
                row = self.mcp()
                agent = Agent.objects.create(uid=self.user.pk)
                workflow = Workflow.objects.create(
                    uid=self.user.pk,
                    app_id="app",
                    flow_id=source,
                    name=source,
                    data="{}",
                )
                graph = {"nodes": [{"data": {"nodeParam": {"mcpServerId": row.mcp_id}}}]}
                if source == "agent-draft":
                    AgentState.objects.create(agent_id=agent.pk, config={"mcpServerIds": [row.pk]})
                elif source == "agent-version":
                    AgentVersion.objects.create(
                        agent_id=agent.pk,
                        definition={"mcpServerIds": [row.mcp_id]},
                        created_by=self.user.pk,
                    )
                elif source == "workflow-draft":
                    workflow.data = json.dumps(graph)
                    workflow.save()
                elif source == "workflow-version":
                    WorkflowVersion.objects.create(
                        flow_id=workflow.flow_id, version_num="v1", data=json.dumps(graph)
                    )
                else:
                    agent.mcp_server_urls = json.dumps([row.sort_link])
                    agent.save()
                response = self.client.delete(f"/resources/mcp/{row.pk}")
                self.assertEqual(response.status_code, 400, response.content)
                row.refresh_from_db()
                self.assertFalse(row.is_deleted)
                # Keep each subcase's references independent.
                agent.delete()
                workflow.delete()
                AgentVersion.objects.all().delete()
                WorkflowVersion.objects.all().delete()
                row.delete()

    def test_failed_mcp_is_visible_and_does_not_hide_other_canvas_resources(self):
        bad = self.mcp()
        good = McpConfig.objects.create(
            uid=self.user.pk, name="Good", sort_link="https://good.example/mcp"
        )
        tool = {
            "name": "lookup",
            "inputSchema": {"type": "object", "properties": {"id": {"type": "integer"}}},
        }

        def remote(*args, **kwargs):
            if kwargs["payload"]["mcp_server_urls"] == [bad.sort_link]:
                raise UpstreamError("offline")
            return {
                "servers": [
                    {"server_status": 500, "server_url": bad.sort_link, "tools": []},
                    {"server_status": 0, "server_url": good.sort_link, "tools": [tool]},
                ]
            }

        with patch("astron_console.resources.clients.call", side_effect=remote) as upstream:
            detail = self.client.get(f"/resources/mcp/{bad.pk}")
            self.assertEqual(detail.status_code, 200)
            self.assertEqual(detail.json()["data"]["connectionStatus"], "error")
            response = self.client.get("/workflow/get-mcp-server-list-locally")
            self.assertEqual(upstream.call_count, 2)
            self.assertEqual(
                upstream.call_args.kwargs["payload"]["mcp_server_urls"],
                [bad.sort_link, good.sort_link],
            )
        self.assertEqual(response.status_code, 200, response.content)
        rows = response.json()["data"]
        self.assertEqual([row["connectionStatus"] for row in rows], ["error", "connected"])
        self.assertEqual(rows[1]["tools"], [tool])
        self.assertNotIn(b"good.example", response.content)
        self.assertNotIn(b"token=secret", response.content)

    def test_unconfigured_mcp_does_not_poison_batch_discovery(self):
        missing = McpConfig.objects.create(uid=self.user.pk, name="Missing")
        good = self.mcp()
        with patch(
            "astron_console.resources.clients.call",
            return_value={
                "servers": [
                    {
                        "server_url": good.sort_link,
                        "server_status": 0,
                        "tools": [],
                    }
                ]
            },
        ) as upstream:
            response = self.client.get("/workflow/get-mcp-server-list-locally")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(upstream.call_args.kwargs["payload"]["mcp_server_urls"], [good.sort_link])
        statuses = {row["id"]: row["connectionStatus"] for row in response.json()["data"]}
        self.assertEqual(statuses, {str(missing.pk): "error", str(good.pk): "connected"})

    def test_agent_honors_explicit_tool_version_and_rejects_missing_version_and_draft(self):
        old = Tool.objects.create(user_id=self.user.pk, tool_id="family", version="V1", name="Old")
        Tool.objects.create(user_id=self.user.pk, tool_id="family", version="V2", name="New")
        draft = Tool.objects.create(user_id=self.user.pk, tool_id="draft", version="V1", status=0)
        definition = {"modelId": self.model.pk, "tools": [{"toolId": "family", "version": "V1"}]}
        self.assertEqual(
            resolve_resources(self.scope, definition)["plugin"]["tools"],
            [{"tool_id": "family", "version": "V1"}],
        )
        self.assertEqual(snapshot_references(self.scope, definition)["tools"], [old.pk])
        self.assertNotIn(draft.pk, tool_query(self.scope).values_list("pk", flat=True))
        for reference in ({"toolId": "family", "version": "V9"}, draft.pk):
            with self.subTest(reference=reference), self.assertRaises(PermissionDenied):
                resolve_resources(self.scope, {**definition, "tools": [reference]})

    def test_builtin_catalog_installs_server_schema_as_scoped_version(self):
        entry = {
            "id": "ocr",
            "name": "OCR",
            "description": "Read images",
            "openapi_schema": SCHEMA,
            "available": False,
            "configured": False,
            "health": "unknown",
            "configurationHint": "配置平台凭据",
        }
        calls = []

        def remote(setting, method, path, **kwargs):
            calls.append((method, path, kwargs))
            if path.endswith("builtin_catalog"):
                return {"tools": [entry]}
            return {"tools": [{"id": "space-owned-ocr", "version": "V1.0"}]}

        with patch("astron_console.resources.clients.call", side_effect=remote):
            catalog = self.client.get("/resources/tools/catalog").json()["data"]
            self.assertFalse(catalog[0]["available"])
            self.assertFalse(catalog[0]["installed"])
            result = self.write(
                "post", "/resources/tools/catalog/ocr/install", {"schema": {"forged": True}}
            )
            self.assertEqual(result.status_code, 200, result.content)
            second = self.write("post", "/resources/tools/catalog/ocr/install", {})
            self.assertEqual(second.json()["data"]["id"], result.json()["data"]["id"])
            self.assertTrue(
                self.client.get("/resources/tools/catalog").json()["data"][0]["installed"]
            )
        row = Tool.objects.get()
        self.assertEqual(
            (row.user_id, row.space_id, row.tool_tag, row.status),
            (self.user.pk, None, "builtin:ocr", 1),
        )
        self.assertEqual(json.loads(row.schema), SCHEMA)
        self.assertEqual(sum(path == "/api/v1/tools/versions" for _, path, _ in calls), 1)

    def test_catalog_failure_is_an_error_and_foreign_install_is_not_reused(self):
        with patch("astron_console.resources.clients.call", side_effect=UpstreamError("offline")):
            self.assertEqual(self.client.get("/resources/tools/catalog").status_code, 502)
        foreign = Tool.objects.create(user_id="other", tool_tag="builtin:ocr", name="Foreign")
        with patch("astron_console.resources.clients.call", return_value={"tools": []}):
            result = self.write("post", "/resources/tools/catalog/ocr/install", {})
        self.assertEqual(result.status_code, 404)
        self.assertEqual(Tool.objects.count(), 1)
        self.assertEqual(Tool.objects.get().pk, foreign.pk)

    def test_favorite_state_uses_tool_family_and_current_user(self):
        row = Tool.objects.create(user_id=self.user.pk, tool_id="family", version="V1")
        ToolFavorite.objects.create(
            user_id=self.user.pk, tool_id=row.pk, plugin_tool_id=row.tool_id
        )
        response = self.client.get("/resources/tools")
        self.assertTrue(response.json()["data"]["records"][0]["favorite"])

    def test_builtin_install_is_separate_in_each_authorized_space(self):
        space = Space.objects.create(name="team", uid=self.user.pk)
        SpaceMember.objects.create(space_id=space.pk, uid=self.user.pk, role=1)
        SpacePermission.objects.update_or_create(
            permission_key="ToolBoxController_createTool_POST", defaults={"owner": True}
        )
        Tool.objects.create(
            user_id=self.user.pk, tool_tag="builtin:ocr", tool_id="personal", version="V1"
        )
        with patch(
            "astron_console.resources.clients.call",
            side_effect=[
                {
                    "tools": [
                        {
                            "id": "ocr",
                            "name": "OCR",
                            "description": "Read",
                            "openapi_schema": SCHEMA,
                        }
                    ]
                },
                {"tools": [{"id": "team-owned", "version": "V1.0"}]},
            ],
        ):
            result = self.write(
                "post", "/resources/tools/catalog/ocr/install", {}, HTTP_SPACE_ID=str(space.pk)
            )
        self.assertEqual(result.status_code, 200, result.content)
        self.assertEqual(Tool.objects.get(tool_id="team-owned").space_id, space.pk)
