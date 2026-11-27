import asyncio
import json
from unittest.mock import patch
from uuid import uuid4

from asgiref.sync import async_to_sync, sync_to_async
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import RequestFactory, TransactionTestCase, override_settings
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


def knowledge_chunk(response):
    # Faithful wire shape of WorkflowAgentRunner._handle_knowledge_metadata:
    # metadata_list is JSON inside delta.tool_calls.function.response. The
    # top-level schema field remains empty when core serializes this chunk.
    return {
        "id": "",
        "object": "chat.completion.chunk",
        "code": 0,
        "knowledge_metadata": [],
        "choices": [
            {
                "index": 0,
                "delta": {
                    "role": "assistant",
                    "tool_calls": [
                        {
                            "index": 0,
                            "type": "knowledge",
                            "reason": "",
                            "function": {
                                "name": "knowledge",
                                "arguments": '{"query": "hello"}',
                                "response": response,
                            },
                        }
                    ],
                },
                "finish_reason": None,
            }
        ],
    }


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

    @override_settings(WORKFLOW_INTERNAL_API_KEY="a" * 36)
    def test_steering_receipt_order_history_and_atomic_close(self):
        run = self.new_run()
        run.steering = {"closed": False, "messages": []}
        run.save(update_fields=["steering"])
        url = f"/agents/{self.agent.pk}/sessions/{self.session.pk}/runs/{run.pk}/steering"
        internal = f"/agents/internal/runs/{run.pk}/steering"
        input_data = {"id": str(uuid4()), "message": "缩短答案"}
        headers = {"HTTP_X_WORKFLOW_INTERNAL_KEY": "a" * 36}
        self.assertEqual(self.post(url, input_data).json()["data"], input_data)
        self.assertEqual(self.post(url, input_data).json()["data"], input_data)
        self.assertEqual(self.post(internal, {"after": 0, "final": True}).status_code, 403)
        self.assertEqual(
            self.client.post(
                internal, {"after": 0, "final": True}, "application/json", **headers
            ).json()["data"]["messages"],
            [input_data],
        )
        self.assertEqual(
            self.client.post(
                internal, {"after": 1, "final": True}, "application/json", **headers
            ).json()["data"]["messages"],
            [],
        )
        self.assertEqual(self.post(url, {"id": str(uuid4()), "message": "late"}).status_code, 409)
        self.assertEqual(self.post(url, input_data).json()["data"], input_data)
        output, _ = self.collect(
            run,
            [
                {"choices": [{"delta": {"tool_calls": [{"id": "tool"}], "content": "old"}}]},
                {"steering_input_ids": [input_data["id"]]},
                {"choices": [{"delta": {"content": "new"}, "finish_reason": "stop"}]},
                "[DONE]",
            ],
        )
        self.assertLess(
            next(i for i, event in enumerate(output) if "event: tool" in event),
            next(i for i, event in enumerate(output) if "event: steering" in event),
        )
        run.refresh_from_db()
        self.assertEqual(run.answer, "new")
        self.assertEqual(run.events[-1]["data"], {**input_data, "previousAnswer": "old"})
        self.assertEqual(conversations.run_data(run)["pendingSteering"], [])
        self.assertEqual(conversations.history_for(self.session)[0]["content"], "hello\n\n缩短答案")

    def test_steering_rejects_other_sessions_and_preserves_unreceived_input_after_stop(self):
        run = self.new_run()
        run.steering = {"closed": False, "messages": []}
        run.save(update_fields=["steering"])
        url = f"/agents/{self.agent.pk}/sessions/{self.session.pk}/runs/{run.pk}/steering"
        other_session = AgentSession.objects.create(agent_id=self.agent.pk, uid=self.owner.pk)
        wrong_url = url.replace(self.session.pk, other_session.pk)
        input_data = {"id": str(uuid4()), "message": "Use the latest results"}
        self.assertEqual(self.post(wrong_url, input_data).status_code, 404)
        self.client.force_login(self.other)
        self.assertEqual(self.post(url, input_data).status_code, 403)
        self.client.force_login(self.owner)
        self.assertEqual(self.post(url, input_data).status_code, 200)
        self.post(f"/agents/{self.agent.pk}/runs/{run.pk}/stop", {})
        self.assertEqual(self.post(url, {"id": str(uuid4()), "message": "late"}).status_code, 409)
        self.collect(run, ["[DONE]"])
        run.refresh_from_db()
        self.assertEqual(run.status, "cancelled")
        self.assertEqual(conversations.run_data(run)["pendingSteering"], [input_data])

    def test_stop_at_upstream_termination_keeps_received_steering_in_next_turn(self):
        for send_done in (True, False):
            with self.subTest(send_done=send_done):
                run = self.new_run()
                received = {"id": str(uuid4()), "message": "Use the latest results"}
                pending = {"id": str(uuid4()), "message": "Unreceived input"}
                run.steering = {"closed": False, "messages": [received, pending]}
                run.save(update_fields=["steering"])

                async def upstream(payload, run=run, received=received, send_done=send_done):
                    yield json.dumps({"steering_input_ids": [received["id"]]})
                    yield json.dumps(
                        {"choices": [{"delta": {"content": "partial"}, "finish_reason": "stop"}]}
                    )
                    await AgentRun.objects.filter(pk=run.pk).aupdate(cancel_requested=True)
                    if send_done:
                        yield "[DONE]"

                async def collect(run=run):
                    return [
                        event
                        async for event in conversations.stream_run(
                            run, {}, self.agent, self.scope, use_memory=False
                        )
                    ]

                with patch.object(conversations, "upstream", upstream):
                    events = async_to_sync(collect)()
                self.assertIn('"status": "cancelled"', events[-1])
                self.assertFalse(any("event: error" in event for event in events))
                run.refresh_from_db()
                self.assertEqual(run.status, "cancelled")
                self.assertEqual(conversations.run_data(run)["pendingSteering"], [pending])
                request = RequestFactory().post("/")
                request.user = self.owner
                request.payload = {"message": "Continue"}
                next_run, payload, _, _ = conversations.prepare(
                    request, self.agent.pk, self.session.pk
                )
                self.assertEqual(len(payload["messages"]), 1)
                self.assertTrue(
                    payload["messages"][0]["content"].endswith("Use the latest results\n\nContinue")
                )
                self.assertNotIn("Unreceived input", payload["messages"][0]["content"])
                next_run.delete()

    def test_regeneration_history_retains_only_steering_not_already_replayed(self):
        original = AgentRun.objects.create(
            session=self.session, question="Write the report", answer="Draft", status="completed"
        )
        input_data = {"id": str(uuid4()), "message": "Use metric units"}
        retry = AgentRun.objects.create(
            session=self.session,
            question=original.question,
            status="failed",
            regenerate_id=original.pk,
            events=[{"type": "steering", "data": input_data}],
        )
        request = RequestFactory().post("/")
        request.user = self.owner
        for target in (original, retry):
            request.payload = {"regenerateId": target.pk}
            run, payload, _, _ = conversations.prepare(request, self.agent.pk, self.session.pk)
            self.assertEqual(payload["messages"][-1]["content"].count(input_data["message"]), 1)
            run.answer = "New draft"
            conversations.checkpoint(run, final="completed")
            history = conversations.history_for(self.session)
            self.assertEqual(
                sum(message["content"].count(input_data["message"]) for message in history), 1
            )

    def test_completion_tool_and_knowledge_are_saved(self):
        run = self.new_run()
        references = [
            {
                "source_id": "original-document-id",
                "chunk": [
                    {"chunk_context": "操作说明.pdf\nMCP支持自定义URL。"},
                    {"chunk_context": "操作说明.pdf\nSkill可访问授权文件。"},
                ],
            },
            {"source_id": "second-document", "chunk": [{"chunk_context": "补充说明\n真实片段"}]},
        ]
        output, remembered = self.collect(
            run,
            [
                {"choices": [{"delta": {"content": "partial", "reasoning_content": "reason"}}]},
                {
                    "choices": [{"delta": {"tool_calls": [{"id": "tool", "result": "result"}]}}],
                },
                knowledge_chunk(json.dumps({"metadata_list": references}, ensure_ascii=False)),
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
        citation = {"type": "knowledge", "data": {"references": references}}
        self.assertIn(citation, run.events)
        live = [
            json.loads(event.split("data: ", 1)[1])
            for event in output
            if event.startswith("event: knowledge\n")
        ]
        self.assertEqual(live, [citation["data"]])
        self.assertEqual(
            [e for e in run.events if e["type"] == "tool"],
            [{"type": "tool", "data": {"id": "tool", "result": "result"}}],
        )
        history = self.client.get(f"/agents/{self.agent.pk}/sessions/{self.session.pk}/messages")
        self.assertEqual(history.status_code, 200)
        self.assertEqual(history.json()["data"][0]["events"], run.events)
        self.assertIn('"status": "completed"', output[-1])

    def test_invalid_knowledge_response_fails_and_preserves_partial_history(self):
        malformed = [
            "{invalid-json",
            json.dumps({"metadata_list": None}),
            json.dumps({"metadata_list": {"source_id": "doc"}}),
            json.dumps({"metadata_list": [{"source_id": "doc", "chunk": []}]}),
            json.dumps({"metadata_list": [{"source_id": "doc", "chunk": [{}]}]}),
            json.dumps({"metadata_list": [{"source_id": "doc", "chunk": [{"chunk_context": 3}]}]}),
        ]
        for response in malformed:
            with self.subTest(response=response):
                run = self.new_run()
                output, remembered = self.collect(
                    run,
                    [
                        {"choices": [{"delta": {"content": "partial"}}]},
                        knowledge_chunk(response),
                        {
                            "choices": [
                                {"delta": {"content": "not consumed"}, "finish_reason": "stop"}
                            ]
                        },
                        "[DONE]",
                    ],
                )
                run.refresh_from_db()
                self.assertEqual((run.status, run.answer, remembered), ("failed", "partial", 0))
                self.assertEqual(run.error_code, "knowledge_reference_invalid")
                error = {
                    "type": "error",
                    "data": {
                        "code": "knowledge_reference_invalid",
                        "message": "知识引用解析失败，已保存收到的部分内容",
                    },
                }
                self.assertEqual(run.events, [error])
                self.assertFalse(any(event.startswith("event: knowledge\n") for event in output))
                self.assertIn(conversations.sse("error", error["data"]), output)
                self.assertIn('"status": "failed"', output[-1])
                history = self.client.get(
                    f"/agents/{self.agent.pk}/sessions/{self.session.pk}/messages"
                ).json()["data"]
                saved = next(item for item in history if item["id"] == run.pk)
                self.assertEqual((saved["events"], saved["answer"]), ([error], "partial"))

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

    def test_draft_and_old_release_keep_history_and_files_without_personality(self):
        from astron_console.agents.definitions import definition
        from astron_console.agents.models import AgentVersion, Personality

        Agent.objects.filter(pk=self.agent.pk).update(support_context=0, support_upload=0)
        Personality.objects.create(bot_id=self.agent.pk, personality="retired persona")
        self.agent.refresh_from_db()
        with patch("astron_console.agents.files.storage.put"):
            response = self.client.post(
                f"/agents/{self.agent.pk}/files",
                {"file": SimpleUploadedFile("facts.txt", b"always available")},
            )
        self.assertEqual(response.status_code, 200, response.content)
        file_id = response.json()["data"]["id"]
        stored = {
            **definition(self.agent),
            "supportContext": False,
            "supportUpload": False,
            "personality": {"enabled": True, "personality": "retired persona"},
        }
        version = AgentVersion.objects.create(
            agent_id=self.agent.pk, definition=stored, created_by=self.owner.pk
        )
        for version_id in (None, version.pk):
            session = AgentSession.objects.create(agent_id=self.agent.pk, uid=self.owner.pk)
            AgentRun.objects.create(
                session=session, question="first turn", answer="previous answer", status="completed"
            )
            request = RequestFactory().post("/")
            request.user = self.owner
            request.payload = {"message": "next turn", "files": [file_id]}
            if version_id:
                request.payload["versionId"] = version_id
            run, payload, _, _ = conversations.prepare(request, self.agent.pk, session.pk)
            self.assertEqual(payload["messages"][1]["content"], "previous answer")
            self.assertIn("always available", payload["messages"][-1]["content"])
            self.assertNotIn("retired persona", str(payload["instruction"]))
            self.assertTrue(run.definition["supportContext"])
            self.assertTrue(run.definition["supportUpload"])
            self.assertNotIn("personality", run.definition)
        version.refresh_from_db()
        self.assertEqual(version.definition, stored)

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

    @override_settings(AGENT_TIMEOUT_SECONDS=20)
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
            # Keep the production interval: database checkpoints every two seconds
            # must not postpone a transport heartbeat due after ten seconds.
            self.assertEqual(await asyncio.wait_for(anext(stream), 12), ": keepalive\n\n")
            self.assertGreaterEqual(saved.call_count, 4)
            await sync_to_async(AgentRun.objects.filter(pk=run.pk).update)(cancel_requested=True)
            self.assertIn('"status": "cancelled"', await asyncio.wait_for(anext(stream), 1))
            await stream.aclose()

        with (
            patch.object(conversations, "upstream", silent),
            patch.object(conversations, "checkpoint", wraps=conversations.checkpoint) as saved,
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
