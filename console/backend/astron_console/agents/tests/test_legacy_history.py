import importlib
import json

from django.apps import apps
from django.db import connection
from django.test import TransactionTestCase

from astron_console.agents.models import Agent, AgentFile, AgentRun, AgentSession

migration = importlib.import_module("astron_console.agents.migrations.0003_legacy_history")


class LegacyHistoryTests(TransactionTestCase):
    tables = {
        "chat_list": (
            "id INTEGER, uid TEXT, bot_id INTEGER, title TEXT, is_delete INTEGER, "
            "create_time TEXT, update_time TEXT"
        ),
        "chat_req_records": "id INTEGER, uid TEXT, chat_id INTEGER, message TEXT, create_time TEXT",
        "chat_resp_records": (
            "id INTEGER, uid TEXT, chat_id INTEGER, req_id INTEGER, message TEXT, "
            "answer_type INTEGER, create_time TEXT, update_time TEXT"
        ),
        "chat_reason_records": (
            "id INTEGER, uid TEXT, chat_id INTEGER, req_id INTEGER, content TEXT, create_time TEXT"
        ),
        "chat_reanwser_records": (
            "id INTEGER, uid TEXT, chat_id INTEGER, req_id INTEGER, ask TEXT, "
            "answer TEXT, answer_type INTEGER, ask_time TEXT, answer_time TEXT, "
            "create_time TEXT"
        ),
        "chat_file_req": (
            "id INTEGER, uid TEXT, chat_id INTEGER, req_id INTEGER, file_id TEXT, deleted INTEGER"
        ),
        "chat_file_user": (
            "id INTEGER, uid TEXT, file_id TEXT, file_name TEXT, file_size INTEGER, "
            "file_url TEXT, deleted INTEGER"
        ),
        "agent_debug_session": (
            "id TEXT, bot_id INTEGER, uid TEXT, space_id INTEGER, title TEXT, "
            "is_delete INTEGER, create_time TEXT"
        ),
        "agent_debug_message": (
            "id INTEGER, session_id TEXT, message_index INTEGER, message_json TEXT, "
            "create_time TEXT"
        ),
    }

    def setUp(self):
        self.agent = Agent.objects.create(uid="retained-owner", bot_name="Agent", space_id=5)
        self.workflow = Agent.objects.create(uid="retained-owner", bot_name="Workflow", version=3)
        self.created_tables = []
        for table, columns in self.tables.items():
            with connection.cursor() as cursor:
                cursor.execute(f"CREATE TABLE {table} ({columns})")
            self.created_tables.append(table)
        self.addCleanup(self.drop_tables)

    def drop_tables(self):
        with connection.cursor() as cursor:
            for table in self.created_tables:
                cursor.execute(f"DROP TABLE IF EXISTS {table}")

    def insert(self, table, **values):
        with connection.cursor() as cursor:
            columns = ",".join(values)
            markers = ",".join(["%s"] * len(values))
            cursor.execute(
                f"INSERT INTO {table} ({columns}) VALUES ({markers})", list(values.values())
            )

    def run_import(self):
        with connection.schema_editor() as editor:
            migration.import_history(apps, editor)

    def chat(self, id=10, **extra):
        self.insert(
            "chat_list",
            id=id,
            uid="retained-user",
            bot_id=self.agent.pk,
            title="Old conversation",
            is_delete=0,
            create_time="2020-01-01 00:00:00",
            **extra,
        )

    def test_chat_import_preserves_scope_text_retries_deleted_flags_and_unknown_status(self):
        self.chat()
        self.insert("chat_list", id=11, uid="retained-user", bot_id=self.agent.pk, is_delete=1)
        self.insert(
            "chat_req_records",
            id=100,
            chat_id=10,
            uid="retained-user",
            message="question",
            create_time="2020-01-01 00:00:01",
        )
        self.insert(
            "chat_req_records",
            id=101,
            chat_id=10,
            uid="retained-user",
            message="unfinished",
            create_time="2020-01-01 00:00:10",
        )
        self.insert(
            "chat_reanwser_records",
            id=90,
            chat_id=10,
            req_id=100,
            uid="retained-user",
            ask="question",
            answer="first partial",
            answer_type=3,
            create_time="2020-01-01 00:00:02",
        )
        self.insert(
            "chat_resp_records",
            id=200,
            chat_id=10,
            req_id=100,
            uid="retained-user",
            message="retained answer",
            answer_type=2,
            create_time="2020-01-01 00:00:03",
        )
        self.insert(
            "chat_reason_records",
            id=300,
            chat_id=10,
            req_id=100,
            uid="retained-user",
            content="retained reasoning",
        )
        self.run_import()
        self.assertEqual(AgentSession.objects.count(), 2)
        self.assertEqual(AgentSession.objects.filter(deleted=True).count(), 1)
        session = AgentSession.objects.get(deleted=False)
        self.assertEqual(
            (session.uid, session.space_id, session.agent_id, session.kind),
            ("retained-user", 5, self.agent.pk, "chat"),
        )
        runs = list(AgentRun.objects.order_by("create_time"))
        self.assertEqual(len(runs), 3)
        partial, latest, unanswered = runs
        self.assertEqual(partial.status, "cancelled")
        self.assertEqual(latest.regenerate_id, partial.pk)
        self.assertEqual(latest.answer, "retained answer")
        self.assertEqual(latest.reasoning, "retained reasoning")
        self.assertEqual(latest.status, "interrupted")
        self.assertEqual(latest.error_code, "legacy_status_unknown")
        self.assertEqual(unanswered.question, "unfinished")
        self.assertEqual(unanswered.answer, "")
        self.assertFalse(AgentRun.objects.filter(status="completed").exists())
        self.assertFalse(AgentRun.objects.exclude(finished_at=None).exists())

    def test_debug_real_frontend_user_bot_payload_preserved_without_sid_completion_guess(self):
        self.insert(
            "agent_debug_session",
            id="original-debug-id",
            bot_id=self.agent.pk,
            uid="retained-user",
            space_id=5,
            title="debug",
            is_delete=1,
            create_time="2020-01-01 00:00:00",
        )
        values = [
            {
                "reqType": "USER",
                "message": "one",
                "chatFileList": [
                    {
                        "fileId": "remote-file",
                        "fileName": "old.pdf",
                        "fileSize": 12,
                        "fileUrl": "https://example.com?secret=key",
                    }
                ],
            },
            {
                "reqType": "BOT",
                "message": "partial",
                "reasoning": "thought",
                "sid": "set-on-stop-too",
                "tools": ["lookup"],
            },
            {"reqType": "USER", "message": "still waiting"},
        ]
        for index, value in enumerate(values):
            self.insert(
                "agent_debug_message",
                id=index + 1,
                session_id="original-debug-id",
                message_index=index,
                message_json=json.dumps(value),
                create_time=f"2020-01-01 00:00:0{index}",
            )
        self.run_import()
        session = AgentSession.objects.get()
        self.assertEqual((session.kind, session.space_id, session.deleted), ("debug", 5, True))
        runs = list(AgentRun.objects.order_by("create_time"))
        self.assertEqual(
            [(r.question, r.answer) for r in runs], [("one", "partial"), ("still waiting", "")]
        )
        self.assertEqual(runs[0].reasoning, "thought")
        self.assertEqual(runs[0].status, "interrupted")
        self.assertEqual(runs[0].files[0]["name"], "old.pdf")
        self.assertFalse(runs[0].files[0]["available"])
        self.assertNotIn("secret", json.dumps(runs[0].files))
        self.assertTrue(any(e["type"] == "tool" for e in runs[0].events))

    def test_import_is_idempotent_never_updates_original_or_existing_imported_rows(self):
        self.chat()
        self.insert("chat_req_records", id=100, chat_id=10, uid="retained-user", message="original")
        self.run_import()
        run = AgentRun.objects.get()
        original_id = run.pk
        run.answer = "local annotation"
        run.save(update_fields=["answer"])
        self.run_import()
        self.assertEqual(AgentRun.objects.count(), 1)
        self.assertEqual(AgentRun.objects.get(pk=original_id).answer, "local annotation")
        with connection.cursor() as cursor:
            cursor.execute("SELECT uid,message FROM chat_req_records")
            self.assertEqual(cursor.fetchall(), [("retained-user", "original")])

    def test_files_are_display_only_and_foreign_history_and_workflow_are_excluded(self):
        self.chat()
        self.insert("chat_list", id=20, uid="retained-user", bot_id=self.workflow.pk)
        self.insert(
            "chat_req_records", id=100, chat_id=10, uid="retained-user", message="file question"
        )
        self.insert(
            "chat_req_records", id=101, chat_id=10, uid="other-user", message="foreign question"
        )
        self.insert(
            "chat_resp_records",
            id=200,
            chat_id=10,
            req_id=100,
            uid="other-user",
            message="foreign answer",
        )
        self.insert(
            "chat_file_req",
            id=1,
            uid="retained-user",
            chat_id=10,
            req_id=100,
            file_id="file-original",
        )
        self.insert(
            "chat_file_user",
            id=2,
            uid="retained-user",
            file_id="file-original",
            file_name="old.txt",
            file_size=42,
            file_url="http://private-server/secret",
        )
        self.run_import()
        self.assertEqual(AgentSession.objects.count(), 1)
        self.assertEqual(AgentRun.objects.count(), 1)
        run = AgentRun.objects.get()
        self.assertEqual(run.answer, "")
        self.assertEqual(run.files[0]["name"], "old.txt")
        self.assertEqual(run.files[0]["size"], 42)
        self.assertNotIn("http", json.dumps(run.files))
        self.assertEqual(AgentFile.objects.count(), 0)

    def test_missing_optional_legacy_tables_are_skipped_and_bad_debug_json_is_not_success(self):
        self.insert(
            "agent_debug_session", id="debug", bot_id=self.agent.pk, uid="retained-user", space_id=5
        )
        self.insert(
            "agent_debug_message", id=1, session_id="debug", message_index=0, message_json="broken"
        )
        with connection.cursor() as cursor:
            cursor.execute("DROP TABLE chat_resp_records")
            cursor.execute("DROP TABLE chat_list")
        self.run_import()
        run = AgentRun.objects.get()
        self.assertEqual(run.status, "interrupted")
        self.assertEqual(run.events[0]["data"]["source"], "agent_debug_message_unreadable")
