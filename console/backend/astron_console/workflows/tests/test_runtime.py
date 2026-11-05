import json
from unittest.mock import patch

from asgiref.sync import async_to_sync
from django.core.exceptions import PermissionDenied, ValidationError
from django.test import TransactionTestCase, override_settings
from django.urls import include, path

from astron_console.accounts.models import User, UserProfile
from astron_console.agents.models import Agent, AgentState, AgentVersion
from astron_console.resources.models import McpConfig, Model, Tool
from astron_console.spaces.models import Space, SpaceMember, SpacePermission
from astron_console.spaces.permissions import ResourceScope
from astron_console.workflows.execution_context import (
    cancel_root,
    control_state,
    runtime_identity,
)
from astron_console.workflows.lifecycle import claim_run, prepare_run, stream_run
from astron_console.workflows.models import (
    ExecutionContext,
    PromptTemplate,
    Workflow,
    WorkflowRun,
    WorkflowVersion,
)
from astron_console.workflows.protocol import starter_graph

urlpatterns = [path("", include("astron_console.workflows.urls"))]


@override_settings(ROOT_URLCONF=__name__, WORKFLOW_INTERNAL_API_KEY="test-internal-key")
class RuntimeTests(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create_user(id="retained-uid", username="owner")
        UserProfile.objects.create(uid=self.user.pk, username="owner")
        self.scope = ResourceScope(self.user.pk, None, None)
        self.client.force_login(self.user)
        self.model = Model.objects.create(
            uid=self.user.pk,
            name="model",
            provider="openai",
            url="https://example.com/v1",
            api_key="secret",
            enable=True,
        )
        self.agent = Agent.objects.create(
            uid=self.user.pk, bot_name="agent", model_id=self.model.pk
        )
        self.version = AgentVersion.objects.create(
            agent_id=self.agent.pk,
            created_by=self.user.pk,
            definition={"modelId": self.model.pk, "prompt": "v1"},
        )
        self.state = AgentState.objects.create(
            agent_id=self.agent.pk, published_version_id=self.version.pk
        )
        self.graph = starter_graph()
        self.graph["nodes"].insert(
            1,
            {
                "id": "agent::one",
                "data": {"nodeParam": {"agentId": self.agent.pk}, "inputs": [], "outputs": []},
            },
        )
        self.workflow = Workflow.objects.create(
            uid=self.user.pk,
            app_id="app",
            flow_id="flow-1",
            name="flow",
            data=json.dumps(self.graph),
        )

    def post(self, url, payload, internal=False):
        headers = {"HTTP_X_WORKFLOW_INTERNAL_KEY": "test-internal-key"} if internal else {}
        return self.client.post(
            url, json.dumps(payload), content_type="application/json", **headers
        )

    def test_versions_fixed_for_retry_resume_and_new_run_updates(self):
        first = prepare_run(self.scope, self.workflow, {"question": "hello"})
        self.assertEqual(first.resolved_agents["agent::one"]["versionId"], self.version.pk)
        second_version = AgentVersion.objects.create(
            agent_id=self.agent.pk,
            created_by=self.user.pk,
            definition={"modelId": self.model.pk, "prompt": "v2"},
        )
        self.state.published_version_id = second_version.pk
        self.state.save()
        first.status = "paused"
        first.save()
        claim_run(first, resume=True)
        config = self.post(
            "/workflow/internal/agent-runtime",
            {"runId": first.pk, "nodeId": "agent::one", "query": "hello"},
            internal=True,
        )
        self.assertEqual(config.status_code, 200, config.content)
        self.assertEqual(config.json()["data"]["instruction"]["answer"], "v1")
        first.status = "failed"
        first.save()
        retried = prepare_run(self.scope, self.workflow, {}, retry_of=first)
        self.assertEqual(retried.resolved_agents, first.resolved_agents)
        new = prepare_run(self.scope, self.workflow, {})
        self.assertEqual(new.resolved_agents["agent::one"]["versionId"], second_version.pk)

    def test_canvas_catalog_uses_scoped_models_and_never_exposes_credentials(self):
        Model.objects.create(uid="another-owner", name="private", enable=True)
        result = self.client.get("/workflow/models?nodeType=agent")
        self.assertEqual(result.status_code, 200, result.content)
        items = result.json()["data"]["workflow"][0]["modelList"]
        self.assertEqual([r["id"] for r in items], [self.model.pk])
        self.assertNotIn(b"secret", result.content)
        self.assertNotIn(b"example.com", result.content)
        PromptTemplate.objects.create(uid="another-owner", name="private", prompt="{}")
        PromptTemplate.objects.create(
            uid="-1", name="shared", prompt='{"userQuery":"{{question}}"}'
        )
        result = self.client.get("/workflow/agent-node/prompt-template?pageSize=999")
        self.assertEqual(result.status_code, 200, result.content)
        self.assertEqual(result.json()["data"]["pageData"][0]["inputs"], [{"name": "question"}])
        self.assertEqual(result.json()["data"]["totalCount"], 1)

    def test_retry_does_not_resolve_new_invalid_draft_dependencies(self):
        original = prepare_run(self.scope, self.workflow, {})
        original.status = "failed"
        original.save(update_fields=["status"])
        invalid = starter_graph()
        invalid["nodes"].append(
            {"id": "agent::unconfigured", "data": {"nodeParam": {"modelId": 999999}}}
        )
        self.workflow.data = json.dumps(invalid)
        self.workflow.save()
        retried = prepare_run(self.scope, self.workflow, {}, retry_of=original)
        self.assertEqual(retried.graph, original.graph)
        self.assertEqual(retried.resolved_agents, original.resolved_agents)
        with self.assertRaises(PermissionDenied):
            prepare_run(self.scope, self.workflow, {})

    def test_history_filters_draft_version_and_single_node_runs(self):
        version = WorkflowVersion.objects.create(
            flow_id=self.workflow.flow_id, version_num="v1", data=self.workflow.data
        )
        draft = prepare_run(self.scope, self.workflow, {})
        fixed = prepare_run(self.scope, self.workflow, {}, version_id=version.pk, graph=self.graph)
        prepare_run(self.scope, self.workflow, {}, kind="node-debug")
        result = self.client.get("/workflow/dialog/list", {"workflowId": self.workflow.pk})
        self.assertEqual([r["runId"] for r in result.json()["data"]], [draft.pk])
        result = self.client.get(
            "/workflow/dialog/list", {"workflowId": self.workflow.pk, "version": "v1"}
        )
        self.assertEqual([r["runId"] for r in result.json()["data"]], [fixed.pk])

    def test_history_displays_each_saved_answer_once(self):
        run = prepare_run(self.scope, self.workflow, {})
        run.output = "one actual answer"
        run.status = "completed"
        run.save(update_fields=["output", "status"])
        response = self.client.get("/workflow/dialog/list", {"workflowId": self.workflow.pk})
        answer = json.loads(response.json()["data"][0]["answer"])
        self.assertEqual(answer["messageContent"] + answer["content"], run.output)

    def test_runtime_rechecks_deleted_agent_and_resource(self):
        run = prepare_run(self.scope, self.workflow, {})
        claim_run(run)
        self.model.enable = False
        self.model.save()
        response = self.post(
            "/workflow/internal/agent-runtime",
            {"runId": run.pk, "nodeId": "agent::one", "query": "x"},
            internal=True,
        )
        self.assertEqual(response.status_code, 400)
        self.agent.is_delete = 1
        self.agent.save()
        response = self.post(
            "/workflow/internal/agent-runtime",
            {"runId": run.pk, "nodeId": "agent::one", "query": "x"},
            internal=True,
        )
        self.assertEqual(response.status_code, 404)

    def test_node_history_isolated_and_memory_uses_original_identity(self):
        run = prepare_run(self.scope, self.workflow, {})
        claim_run(run)
        with patch(
            "astron_console.workflows.internal.memory.search",
            return_value=[{"memory": "likes tea"}],
        ) as search:
            response = self.post(
                "/workflow/internal/agent-runtime",
                {"runId": run.pk, "nodeId": "agent::one", "query": "node-input"},
                internal=True,
            )
        data = response.json()["data"]
        self.assertEqual(data["uid"], "retained-uid")
        self.assertEqual(data["messages"], [{"role": "user", "content": "node-input"}])
        self.assertIn("likes tea", data["instruction"]["answer"])
        self.assertEqual(search.call_args.args[1].pk, self.agent.pk)
        self.assertNotIn("secret", json.dumps(run.graph))
        self.assertEqual(
            self.post(
                "/workflow/internal/agent-runtime", {"runId": run.pk, "nodeId": "agent::one"}
            ).status_code,
            403,
        )

    def test_foreign_user_cannot_cancel_or_read_run(self):
        run = prepare_run(self.scope, self.workflow, {})
        other = User.objects.create_user(id="other", username="other")
        UserProfile.objects.create(uid=other.pk, username="other")
        self.client.force_login(other)
        self.assertEqual(self.post(f"/workflow/runs/{run.pk}/stop", {}).status_code, 404)
        self.assertEqual(self.client.get(f"/workflow/runs/{run.pk}").status_code, 404)

    def test_double_resume_rejected_and_cancel_includes_paused_children(self):
        run = prepare_run(self.scope, self.workflow, {})
        run.status = "paused"
        run.save()
        claim_run(run, resume=True)
        with self.assertRaises(ValidationError):
            claim_run(run, resume=True)
        child = WorkflowRun.objects.create(
            workflow_id=self.workflow.pk,
            uid=self.user.pk,
            context_id=run.context_id,
            parent_run_id=run.pk,
            status="paused",
        )
        cancel_root(run.context_id)
        child.refresh_from_db()
        self.assertEqual(child.status, "cancelled")
        self.assertTrue(control_state(run.pk, run.context_id)["cancelled"])

    def test_loop_refused_and_root_budget_shared(self):
        self.version.definition["workflows"] = [self.workflow.pk]
        AgentVersion.objects.filter(pk=self.version.pk).update(definition=self.version.definition)
        run = prepare_run(self.scope, self.workflow, {})
        claim_run(run)
        context = {"run_id": run.pk, "root_id": run.context_id, "node_id": "agent::one"}
        response = self.post(
            "/workflow/internal/tool-schema",
            {"context": context, "flowId": self.workflow.flow_id},
            internal=True,
        )
        self.assertEqual(response.status_code, 400)
        ExecutionContext.objects.filter(pk=run.context_id).update(remaining_budget=0)
        response = self.post(
            "/workflow/internal/agent-runtime",
            {"runId": run.pk, "nodeId": "agent::one", "query": "x"},
            internal=True,
        )
        self.assertEqual(response.status_code, 400)
        with self.assertRaises(PermissionDenied):
            runtime_identity({"run_id": "forged", "root_id": run.context_id})

    def test_core_terminal_not_node_stop_and_disconnect_preserves_partial(self):
        async def complete(*args):
            yield json.dumps(
                {
                    "code": 0,
                    "workflow_step": {"node": {"id": "agent::one"}},
                    "choices": [{"delta": {"content": "partial"}, "finish_reason": None}],
                }
            )
            yield json.dumps(
                {
                    "code": 0,
                    "workflow_step": {"node": {"id": "flow_obj"}},
                    "choices": [{"delta": {}, "finish_reason": "stop"}],
                }
            )
            yield "[DONE]"

        async def disconnected(*args):
            yield json.dumps(
                {
                    "code": 0,
                    "workflow_step": {"node": {"id": "agent::one"}},
                    "choices": [{"delta": {"content": "partial"}, "finish_reason": None}],
                }
            )

        async def consume(run):
            return [chunk async for chunk in stream_run(run)]

        with patch("astron_console.workflows.lifecycle.upstream", complete):
            run = prepare_run(self.scope, self.workflow, {})
            async_to_sync(consume)(run)
        run.refresh_from_db()
        self.assertEqual(run.status, "completed")
        with (
            patch("astron_console.workflows.lifecycle.upstream", disconnected),
            patch("astron_console.workflows.lifecycle.cancel_core"),
        ):
            run = prepare_run(self.scope, self.workflow, {})
            async_to_sync(consume)(run)
        run.refresh_from_db()
        self.assertEqual(run.status, "interrupted")
        self.assertEqual(run.output, "partial")

    def test_nested_workflow_started_later_reuses_root_agent_snapshot(self):
        child_agent = Agent.objects.create(
            uid=self.user.pk, bot_name="child", model_id=self.model.pk
        )
        child_version = AgentVersion.objects.create(
            agent_id=child_agent.pk,
            created_by=self.user.pk,
            definition={"modelId": self.model.pk, "prompt": "child-v1"},
        )
        child_state = AgentState.objects.create(
            agent_id=child_agent.pk, published_version_id=child_version.pk
        )
        child_graph = starter_graph()
        child_graph["nodes"].insert(
            1,
            {
                "id": "agent::child",
                "data": {"nodeParam": {"agentId": child_agent.pk}, "inputs": [], "outputs": []},
            },
        )
        child_flow = Workflow.objects.create(
            uid=self.user.pk,
            app_id="app",
            flow_id="child-flow",
            name="child",
            data=json.dumps(child_graph),
        )
        AgentVersion.objects.filter(pk=self.version.pk).update(
            definition={"modelId": self.model.pk, "workflows": [child_flow.pk]}
        )
        parent = prepare_run(self.scope, self.workflow, {})
        claim_run(parent)
        child_v2 = AgentVersion.objects.create(
            agent_id=child_agent.pk,
            created_by=self.user.pk,
            definition={"modelId": self.model.pk, "prompt": "child-v2"},
        )
        child_state.published_version_id = child_v2.pk
        child_state.save()
        child_flow.data = json.dumps(
            {
                "nodes": [{"id": "agent::invalid", "data": {"nodeParam": {"modelId": 999999}}}],
                "edges": [],
            }
        )
        child_flow.save(update_fields=["data"])
        context = {"run_id": parent.pk, "root_id": parent.context_id, "node_id": "agent::one"}
        root, scope, _, chain, _ = runtime_identity(context)
        child = prepare_run(
            scope,
            child_flow,
            {},
            parent_context=(root.pk, parent.pk, chain),
            invocation_id="tool-1",
        )
        self.assertEqual(child.resolved_agents["agent::child"]["versionId"], child_version.pk)
        with self.assertRaises(ValidationError):
            prepare_run(
                scope,
                child_flow,
                {},
                parent_context=(root.pk, parent.pk, chain),
                invocation_id="tool-1",
            )
        self.assertEqual(WorkflowRun.objects.filter(parent_run_id=parent.pk).count(), 1)

    def test_closing_after_terminal_frame_keeps_success(self):
        async def completed(*args):
            yield json.dumps(
                {
                    "code": 0,
                    "workflow_step": {"node": {"id": "flow_obj"}},
                    "choices": [{"delta": {"content": "done"}, "finish_reason": "stop"}],
                }
            )

        async def stop_reading(run):
            stream = stream_run(run)
            await anext(stream)
            await anext(stream)
            await stream.aclose()

        run = prepare_run(self.scope, self.workflow, {})
        with patch("astron_console.workflows.lifecycle.upstream", completed):
            async_to_sync(stop_reading)(run)
        run.refresh_from_db()
        self.assertEqual(run.status, "completed")
        self.assertEqual(run.output, "done")

    def test_deleted_workflow_cancels_active_root_and_history_clear_retains_run(self):
        run = prepare_run(self.scope, self.workflow, {})
        claim_run(run)
        self.assertEqual(
            self.client.get(
                "/workflow/dialog/clear", {"workflowId": self.workflow.pk, "type": 1}
            ).status_code,
            405,
        )
        response = self.post("/workflow/dialog/clear", {"workflowId": self.workflow.pk, "type": 1})
        self.assertEqual(response.status_code, 200, response.content)
        history = self.client.get("/workflow/dialog/list", {"workflowId": self.workflow.pk})
        self.assertEqual(history.json()["data"], [])
        self.assertTrue(WorkflowRun.objects.filter(pk=run.pk).exists())
        self.workflow.deleted = True
        self.workflow.save()
        self.assertTrue(control_state(run.pk, run.context_id)["cancelled"])
        run.refresh_from_db()
        self.assertEqual(run.status, "cancelled")

    def test_code_idea_uses_temporary_code_inputs_and_reports_actual_tokens(self):
        import httpx

        node = {
            "id": "ifly-code::one",
            "data": {
                "nodeParam": {"code": "old code"},
                "inputs": [
                    {
                        "name": "value",
                        "schema": {
                            "type": "string",
                            "value": {
                                "type": "ref",
                                "content": {"nodeId": "missing", "name": "value"},
                            },
                        },
                    }
                ],
                "outputs": [{"name": "result", "schema": {"type": "string"}}],
            },
        }
        self.graph["nodes"].append(node)
        # An unrelated invalid inline Agent must not prevent a selected code test.
        self.graph["nodes"].append({"id": "agent::invalid", "data": {"nodeParam": {}}})
        self.workflow.data = json.dumps(self.graph)
        self.workflow.save()
        captured = []

        def core(request):
            captured.append(json.loads(request.content))
            return httpx.Response(
                200,
                json={
                    "code": 0,
                    "data": {
                        "node_id": node["id"],
                        "output": "{}",
                        "raw_output": '{"result":"new input"}',
                        "token_cost": {
                            "prompt_tokens": 2,
                            "completion_tokens": 3,
                            "total_tokens": 5,
                        },
                    },
                },
            )

        client = httpx.AsyncClient(transport=httpx.MockTransport(core))
        with patch("httpx.AsyncClient", return_value=client):
            response = self.post(
                "/workflow/code/run",
                {
                    "flow_id": self.workflow.flow_id,
                    "node_id": node["id"],
                    "code": "new code",
                    "variables": [{"name": "new_argument", "content": "new input"}],
                },
            )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["data"]["code"], 0)
        self.assertEqual(response.json()["data"]["data"], {"result": "new input"})
        self.assertEqual(captured[0]["chat"]["parameters"]["new_argument"], "new input")
        nodes = captured[0]["protocol"]["data"]["nodes"]
        self.assertEqual(len(nodes), 1)
        self.assertEqual(nodes[0]["data"]["inputs"][0]["name"], "new_argument")
        self.assertEqual(nodes[0]["data"]["outputs"], [])
        self.assertEqual(nodes[0]["data"]["nodeParam"]["code"], "new code")
        self.workflow.refresh_from_db()
        self.assertEqual(
            json.loads(self.workflow.data)["nodes"][-2]["data"]["nodeParam"]["code"], "old code"
        )
        statistics = self.client.get("/workflow/statistics", {"flowId": self.workflow.flow_id})
        self.assertEqual(statistics.json()["data"]["totalTokens"], 5)

    def test_mcp_canvas_debug_cannot_bypass_resource_execution_permission(self):
        space = Space.objects.create(name="Scoped", uid=self.user.pk)
        SpaceMember.objects.create(space_id=space.pk, uid=self.user.pk, role=1)
        for key in ["WorkflowController_list_GET", "ToolBoxController_getDetail_GET"]:
            SpacePermission.objects.update_or_create(permission_key=key, defaults={"owner": True})
        SpacePermission.objects.update_or_create(
            permission_key="ToolBoxController_debugToolV2_POST", defaults={"owner": False}
        )
        row = McpConfig.objects.create(
            uid=self.user.pk,
            space_id=space.pk,
            name="mcp",
            mcp_id="server",
            sort_link="https://example.com/secret",
        )
        with patch("astron_console.workflows.catalog.clients.call") as upstream:
            response = self.client.post(
                "/workflow/debug-server-tool",
                json.dumps({"mcpServerId": str(row.pk), "toolName": "write", "toolArgs": {}}),
                content_type="application/json",
                HTTP_SPACE_ID=str(space.pk),
            )
        self.assertEqual(response.status_code, 403, response.content)
        upstream.assert_not_called()

    def test_new_openapi_tool_projects_required_inputs_and_outputs_without_legacy_schema(self):
        schema = {
            "openapi": "3.0.0",
            "servers": [{"url": "https://example.com"}],
            "paths": {
                "/echo": {
                    "post": {
                        "operationId": "echo",
                        "requestBody": {
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "required": ["message"],
                                        "properties": {"message": {"type": "string", "x-from": 1}},
                                    }
                                }
                            }
                        },
                        "responses": {
                            "200": {
                                "content": {
                                    "application/json": {
                                        "schema": {
                                            "type": "object",
                                            "properties": {"answer": {"type": "string"}},
                                        }
                                    }
                                }
                            }
                        },
                    }
                }
            },
        }
        row = Tool.objects.create(
            user_id=self.user.pk,
            name="echo",
            tool_id="echo-id",
            version="V1",
            operation_id="echo",
            schema=json.dumps(schema),
            web_schema=None,
        )
        Tool.objects.create(user_id=self.user.pk, name="draft", tool_id="draft-id", status=0)
        response = self.client.get("/workflow/tools")
        self.assertEqual(response.status_code, 200, response.content)
        items = response.json()["data"]["pageData"]
        self.assertEqual([item["id"] for item in items], [str(row.pk)])
        projection = json.loads(items[0]["webSchema"])
        self.assertEqual(projection["toolRequestInput"][0]["name"], "message")
        self.assertTrue(projection["toolRequestInput"][0]["required"])
        self.assertEqual(projection["toolRequestInput"][0]["from"], 1)
        self.assertEqual(projection["toolRequestOutput"][0]["name"], "answer")
        self.assertIsInstance(items[0]["authInfo"], str)
