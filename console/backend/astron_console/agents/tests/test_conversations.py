import asyncio
import json
from unittest.mock import patch

from asgiref.sync import async_to_sync, sync_to_async
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TransactionTestCase, override_settings
from django.urls import include, path

from astron_console.accounts.models import User, UserProfile
from astron_console.agents import conversations
from astron_console.agents.conversation_models import AgentFile, AgentRun, AgentSession
from astron_console.agents.definitions import READ
from astron_console.agents.models import Agent
from astron_console.resources.models import Model
from astron_console.spaces.models import Space, SpaceMember, SpacePermission
from astron_console.spaces.permissions import ResourceScope

urlpatterns = [path("", include("astron_console.agents.urls"))]


@override_settings(ROOT_URLCONF=__name__, AGENT_TIMEOUT_SECONDS=10)
class ConversationTests(TransactionTestCase):
    def setUp(self):
        self.owner = User.objects.create_user(id="old-uid", username="owner")
        self.other = User.objects.create_user(id="other-uid", username="other")
        for user in (self.owner, self.other):
            UserProfile.objects.create(uid=user.pk, username=user.username)
        self.model = Model.objects.create(
            uid=self.owner.pk,
            name="reference",
            provider="openai",
            url="https://model.invalid/v1",
            api_key="must-not-persist",
            enable=True,
        )
        self.agent = Agent.objects.create(
            uid=self.owner.pk,
            bot_name="Agent",
            model_id=self.model.pk,
            support_upload=1,
            support_context=1,
        )
        self.scope = ResourceScope(self.owner.pk, None, None)
        self.session = AgentSession.objects.create(agent_id=self.agent.pk, uid=self.owner.pk)
        self.client.force_login(self.owner)

    def post(self, url, payload):
        return self.client.post(url, json.dumps(payload), content_type="application/json")

    def new_run(self):
        run = AgentRun.objects.create(session=self.session, question="hello")
        self.session.active_run_id = run.pk
        self.session.save()
        return run

    def collect(self, run, events):
        async def fake_upstream(payload):
            for event in events:
                yield json.dumps(event) if isinstance(event, dict) else event

        async def collect():
            return [
                event
                async for event in conversations.stream_run(
                    run, {"instruction": {}}, self.agent, self.scope
                )
            ]

        with (
            patch.object(conversations, "upstream", fake_upstream),
            patch("astron_console.agents.memory.search", return_value=[]),
            patch("astron_console.agents.memory.remember") as remember,
        ):
            output = async_to_sync(collect)()
            return output, remember.call_count

    def test_completion_tool_and_knowledge_are_saved(self):
        run = self.new_run()
        output, remembered = self.collect(
            run,
            [
                {"choices": [{"delta": {"content": "partial", "reasoning_content": "reason"}}]},
                {
                    "choices": [{"delta": {"tool_calls": [{"id": "tool", "result": "result"}]}}],
                    "knowledge_metadata": [{"title": "source"}],
                },
                {"choices": [{"delta": {"content": " answer"}, "finish_reason": "stop"}]},
                "[DONE]",
            ],
        )
        run.refresh_from_db()
        self.session.refresh_from_db()
        self.assertEqual(
            (run.status, run.answer, run.reasoning, run.error_code),
            ("completed", "partial answer", "reason", ""),
        )
        self.assertIsNone(self.session.active_run_id)
        self.assertEqual(remembered, 1)
        self.assertEqual({e["type"] for e in run.events}, {"tool", "knowledge"})
        self.assertIn('"status": "completed"', output[-1])

    def test_error_or_disconnect_never_completes_or_remembers(self):
        for tail, status in [
            ([], "interrupted"),
            ([{"code": 40303, "message": "secret"}, "[DONE]"], "failed"),
        ]:
            with self.subTest(status=status):
                run = self.new_run()
                output, remembered = self.collect(
                    run, [{"choices": [{"delta": {"content": "partial"}}]}] + tail
                )
                run.refresh_from_db()
                self.assertEqual((run.status, run.answer, remembered), (status, "partial", 0))
                self.assertTrue(any("event: error" in e for e in output))
                self.assertNotIn("secret", "".join(output))

    def test_stop_cancels_upstream_and_persists_partial(self):
        run = self.new_run()
        closed = []

        async def fake_upstream(payload):
            try:
                yield json.dumps({"choices": [{"delta": {"content": "partial"}}]})
                await asyncio.Event().wait()
            finally:
                closed.append(True)

        async def collect():
            stream = conversations.stream_run(run, {"instruction": {}}, self.agent, self.scope)
            await anext(stream)
            await anext(stream)
            pending = asyncio.create_task(anext(stream))
            await asyncio.sleep(0.05)
            await sync_to_async(AgentRun.objects.filter(pk=run.pk).update)(cancel_requested=True)
            end = await asyncio.wait_for(pending, timeout=2)
            await stream.aclose()
            return end

        with (
            patch.object(conversations, "upstream", fake_upstream),
            patch("astron_console.agents.memory.search", return_value=[]),
        ):
            output = async_to_sync(collect)()
        run.refresh_from_db()
        self.assertEqual((run.status, run.answer), ("cancelled", "partial"))
        self.assertEqual(closed, [True])
        self.assertIn('"status": "cancelled"', output)

    def test_disconnect_after_first_event_releases_run(self):
        run = self.new_run()

        async def disconnect():
            stream = conversations.stream_run(run, {}, self.agent, self.scope)
            await anext(stream)
            await stream.aclose()

        async_to_sync(disconnect)()
        run.refresh_from_db()
        self.session.refresh_from_db()
        self.assertEqual(run.status, "interrupted")
        self.assertEqual(run.error_code, "client_disconnected")
        self.assertEqual(run.events[-1]["data"]["code"], "client_disconnected")
        self.assertIsNone(self.session.active_run_id)

    def test_retry_excludes_its_question_and_future_turns(self):
        first = AgentRun.objects.create(
            session=self.session, question="first", answer="original", status="completed"
        )
        AgentRun.objects.create(
            session=self.session, question="second", answer="future", status="completed"
        )
        retry = AgentRun.objects.create(
            session=self.session,
            question="first",
            answer="retry",
            status="completed",
            regenerate_id=first.pk,
        )
        AgentRun.objects.create(
            session=self.session, question="first", status="failed", regenerate_id=retry.pk
        )
        self.assertEqual(conversations.history_for(self.session, retry), [])
        self.assertEqual(
            [x["content"] for x in conversations.history_for(self.session)],
            ["first", "retry", "second", "future"],
        )

    def test_session_user_and_space_isolation(self):
        space = Space.objects.create(uid=self.owner.pk, name="team")
        for uid in (self.owner.pk, self.other.pk):
            SpaceMember.objects.create(space_id=space.pk, uid=uid, role=3)
        SpacePermission.objects.update_or_create(permission_key=READ, defaults={"member": True})
        self.agent.space_id = space.pk
        self.agent.save()
        self.session.space_id = space.pk
        self.session.save()
        url = f"/agents/{self.agent.pk}/sessions/{self.session.pk}/messages"
        self.assertEqual(self.client.get(url).status_code, 403)
        self.client.force_login(self.other)
        self.assertEqual(self.client.get(url, HTTP_SPACE_ID=str(space.pk)).status_code, 404)
        run = self.new_run()
        self.assertEqual(
            self.client.post(
                f"/agents/{self.agent.pk}/runs/{run.pk}/stop", {}, HTTP_SPACE_ID=str(space.pk)
            ).status_code,
            404,
        )

    def test_input_text_history_and_file_scope(self):
        with patch("astron_console.agents.files.storage.put"):
            response = self.client.post(
                f"/agents/{self.agent.pk}/files",
                {"file": SimpleUploadedFile("facts.txt", b"actual text")},
            )
        self.assertEqual(response.status_code, 200, response.content)
        file = AgentFile.objects.get(pk=response.json()["data"]["id"])
        self.assertEqual(file.text, "actual text")
        AgentRun.objects.create(
            session=self.session,
            question="read",
            answer="done",
            status="completed",
            files=[response.json()["data"]],
        )
        self.assertIn("actual text", conversations.history_for(self.session)[0]["content"])
        self.client.force_login(self.other)
        self.assertEqual(
            self.client.get(f"/agents/{self.agent.pk}/files/{file.pk}").status_code, 403
        )

    def test_prepare_rejects_spoofed_config_and_other_user_file(self):
        url = f"/agents/{self.agent.pk}/sessions/{self.session.pk}/stream"
        self.assertEqual(
            self.post(
                url, {"message": "question", "model_config": {"api_key": "spoof"}}
            ).status_code,
            400,
        )
        file = AgentFile.objects.create(
            agent_id=self.agent.pk,
            uid=self.other.pk,
            name="secret",
            size=1,
            object_key="private",
            bucket="bucket",
            text="private",
        )
        self.assertEqual(
            self.post(url, {"message": "question", "files": [file.pk]}).status_code, 400
        )
        self.assertFalse(AgentRun.objects.exists())

    @override_settings(WORKFLOW_INTERNAL_API_KEY="internal-test-key")
    def test_published_resolver_rechecks_identity_and_has_no_credentials(self):
        from astron_console.agents.definitions import definition
        from astron_console.agents.models import AgentState, AgentVersion

        version = AgentVersion.objects.create(
            agent_id=self.agent.pk, definition=definition(self.agent), created_by=self.owner.pk
        )
        AgentState.objects.create(agent_id=self.agent.pk, published_version_id=version.pk)
        query = {"uid": self.owner.pk, "agentId": self.agent.pk}
        url = "/agents/internal/resolve"
        self.assertEqual(self.client.get(url, query).status_code, 403)
        response = self.client.get(url, query, HTTP_X_WORKFLOW_INTERNAL_KEY="internal-test-key")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["data"]["versionId"], version.pk)
        self.assertEqual(response["Cache-Control"], "no-store")
        self.assertNotIn(b"must-not-persist", response.content)
        query["uid"] = self.other.pk
        self.assertEqual(
            self.client.get(
                url, query, HTTP_X_WORKFLOW_INTERNAL_KEY="internal-test-key"
            ).status_code,
            403,
        )
        query["uid"] = self.owner.pk
        UserProfile.objects.filter(uid=self.owner.pk).update(account_status=0)
        self.assertEqual(
            self.client.get(
                url, query, HTTP_X_WORKFLOW_INTERNAL_KEY="internal-test-key"
            ).status_code,
            403,
        )

    @override_settings(
        SKILL_SANDBOX_ARTIFACT_UPLOAD_TOKEN="artifact-test-key",
        SKILL_SANDBOX_ARTIFACT_ALLOWED_EXTENSIONS={"txt"},
    )
    def test_artifact_requires_running_owned_run_and_selected_skill(self):
        run = self.new_run()
        run.definition = {"skills": [9]}
        run.save()
        values = {
            "agentId": str(self.agent.pk),
            "uid": self.owner.pk,
            "runId": run.pk,
            "skillId": "9",
        }
        url = "/agents/artifacts/internal-upload"
        self.assertEqual(self.client.post(url, values).status_code, 403)
        with patch("astron_console.agents.files.storage.put"):
            response = self.client.post(
                url,
                {**values, "uid": self.other.pk, "file": SimpleUploadedFile("out.txt", b"result")},
                HTTP_X_SKILL_SANDBOX_ARTIFACT_TOKEN="artifact-test-key",
            )
            self.assertEqual(response.status_code, 403)
            response = self.client.post(
                url,
                {**values, "file": SimpleUploadedFile("out.txt", b"result")},
                HTTP_X_SKILL_SANDBOX_ARTIFACT_TOKEN="artifact-test-key",
            )
            self.assertEqual(response.status_code, 200, response.content)
            AgentRun.objects.filter(pk=run.pk).update(cancel_requested=True)
            response = self.client.post(
                url,
                {**values, "file": SimpleUploadedFile("out.txt", b"result")},
                HTTP_X_SKILL_SANDBOX_ARTIFACT_TOKEN="artifact-test-key",
            )
            self.assertEqual(response.status_code, 403)
        self.assertEqual(AgentFile.objects.filter(run_id=run.pk).count(), 1)

    def test_agent_deletion_cancels_active_run_without_deleting_history(self):
        run = self.new_run()
        self.assertEqual(self.client.delete(f"/agents/{self.agent.pk}").status_code, 200)
        run.refresh_from_db()
        self.assertTrue(run.cancel_requested)
        self.assertTrue(AgentSession.objects.filter(pk=self.session.pk).exists())

    def test_silent_upstream_stays_live_without_fabricating_output(self):
        run = self.new_run()
        closed = []

        async def silent(payload):
            try:
                await asyncio.Event().wait()
                yield "unreachable"
            finally:
                closed.append(True)

        async def check():
            stream = conversations.stream_run(run, {}, self.agent, self.scope)
            await anext(stream)
            self.assertEqual(await asyncio.wait_for(anext(stream), 1), ": keepalive\n\n")
            await sync_to_async(AgentRun.objects.filter(pk=run.pk).update)(cancel_requested=True)
            self.assertIn('"status": "cancelled"', await asyncio.wait_for(anext(stream), 1))
            await stream.aclose()

        with (
            patch.object(conversations, "upstream", silent),
            patch.object(conversations, "KEEPALIVE_SECONDS", 0.01),
            patch("astron_console.agents.memory.search", return_value=[]),
        ):
            async_to_sync(check)()
        run.refresh_from_db()
        self.assertEqual((run.status, run.answer, run.events), ("cancelled", "", []))
        self.assertEqual(closed, [True])

    def test_explicit_stop_followed_by_disconnect_is_cancelled(self):
        run = self.new_run()

        async def disconnect():
            stream = conversations.stream_run(run, {}, self.agent, self.scope)
            await anext(stream)
            await sync_to_async(AgentRun.objects.filter(pk=run.pk).update)(cancel_requested=True)
            await stream.aclose()

        async_to_sync(disconnect)()
        run.refresh_from_db()
        self.assertEqual((run.status, run.error_code), ("cancelled", "cancelled"))
