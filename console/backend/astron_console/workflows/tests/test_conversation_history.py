"""Conversation continuity uses authorized server snapshots, never client messages."""

import json

from django.core.exceptions import ValidationError
from django.test import TestCase

from astron_console.accounts.models import User, UserProfile
from astron_console.spaces.permissions import ResourceScope
from astron_console.workflows.lifecycle import core_payload, prepare_run
from astron_console.workflows.models import Workflow, WorkflowRun
from astron_console.workflows.protocol import starter_graph


class ConversationHistoryTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(id="history-user", username="history-user")
        UserProfile.objects.create(uid=self.user.pk, username="history-user")
        self.scope = ResourceScope(self.user.pk, None, None)
        self.workflow = Workflow.objects.create(
            uid=self.user.pk,
            app_id="app",
            flow_id="history-flow",
            name="history flow",
            data=json.dumps(starter_graph()),
        )

    def complete(self, inputs, output, chat_id=None):
        run = prepare_run(self.scope, self.workflow, inputs, conversation_id=chat_id)
        run.status = "completed"
        run.output = output
        run.save(update_fields=["status", "output"])
        return run

    def test_server_session_and_completed_turns_reach_core_in_order(self):
        first = self.complete({"AGENT_USER_INPUT": "my name is Ada"}, "Hello Ada")
        self.assertEqual(first.chat_id, first.pk)
        self.assertEqual(first.history_messages, [])
        second = self.complete({"AGENT_USER_INPUT": "remember me"}, "Ada", first.chat_id)
        third = prepare_run(
            self.scope,
            self.workflow,
            {"AGENT_USER_INPUT": "who am I"},
            conversation_id=first.chat_id,
        )
        self.assertEqual(
            [m["content"] for m in third.history_messages],
            [
                "my name is Ada",
                "Hello Ada",
                "remember me",
                "Ada",
            ],
        )
        self.assertEqual(core_payload(third)["chat"]["history"], third.history_messages)
        self.assertEqual(second.chat_id, first.chat_id)

    def test_unknown_foreign_or_other_version_session_is_rejected(self):
        first = self.complete({"query": "owner"}, "answer")
        for changes in [
            {"uid": "another-user"},
            {"space_id": 100},
            {"workflow_id": 100},
            {"version_id": 100},
            {"kind": "node-debug"},
            {"parent_run_id": "parent"},
            {"history_hidden": True},
        ]:
            with self.subTest(changes=changes):
                WorkflowRun.objects.filter(pk=first.pk).update(**changes)
                with self.assertRaises(ValidationError):
                    prepare_run(self.scope, self.workflow, {}, conversation_id=first.chat_id)
                WorkflowRun.objects.filter(pk=first.pk).update(
                    uid=self.scope.uid,
                    space_id=None,
                    workflow_id=self.workflow.pk,
                    version_id=None,
                    kind="workflow",
                    parent_run_id=None,
                    history_hidden=False,
                )
        with self.assertRaises(ValidationError):
            prepare_run(self.scope, self.workflow, {}, conversation_id="unknown-session")

    def test_new_conversation_failed_turns_and_retry_snapshot(self):
        first = self.complete({"query": "first"}, "first answer")
        failed = prepare_run(
            self.scope, self.workflow, {"query": "failed"}, conversation_id=first.chat_id
        )
        failed.status = "failed"
        failed.output = "partial answer"
        failed.save(update_fields=["status", "output"])
        self.complete({"query": "later"}, "later answer", first.chat_id)
        retry = prepare_run(self.scope, self.workflow, {}, retry_of=failed)
        self.assertEqual(retry.chat_id, first.chat_id)
        self.assertEqual(retry.history_messages, failed.history_messages)
        self.assertEqual([m["content"] for m in retry.history_messages], ["first", "first answer"])
        fresh = prepare_run(self.scope, self.workflow, {})
        self.assertEqual(fresh.history_messages, [])
        self.assertNotEqual(fresh.chat_id, first.chat_id)

    def test_history_is_bounded_to_latest_twenty_turns(self):
        first = self.complete({"query": "0"}, "answer 0")
        for index in range(1, 22):
            self.complete({"query": str(index)}, f"answer {index}", first.chat_id)
        run = prepare_run(self.scope, self.workflow, {}, conversation_id=first.chat_id)
        self.assertEqual(len(run.history_messages), 40)
        self.assertEqual(run.history_messages[0]["content"], "2")
        self.assertEqual(run.history_messages[-1]["content"], "answer 21")
