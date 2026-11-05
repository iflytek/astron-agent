import json
from unittest.mock import patch

from asgiref.sync import async_to_sync
from django.core.exceptions import PermissionDenied, ValidationError
from django.test import TransactionTestCase, override_settings
from django.urls import include, path

from astron_console.accounts.models import User, UserProfile
from astron_console.agents.models import Agent, AgentState, AgentVersion
from astron_console.resources.models import Model
from astron_console.spaces.permissions import ResourceScope
from astron_console.workflows.execution_context import (
    cancel_root,
    control_state,
    runtime_identity,
)
from astron_console.workflows.lifecycle import claim_run, prepare_run, stream_run
from astron_console.workflows.models import ExecutionContext, Workflow, WorkflowRun
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
