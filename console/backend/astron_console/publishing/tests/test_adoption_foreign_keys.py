"""Upgrade an existing approval table, including interrupted non-atomic DDL."""

import importlib
from unittest.mock import patch

from django.db import connection
from django.db.migrations.loader import MigrationLoader
from django.test import TransactionTestCase


class RetainedApprovalForeignKeyTests(TransactionTestCase):
    def setUp(self):
        self.migration = importlib.import_module(
            "astron_console.publishing.migrations.0001_initial"
        )
        self.historical = (
            MigrationLoader(connection).project_state([("publishing", "0001_initial")]).apps
        )
        self.approval = self.historical.get_model("publishing", "Approval")
        self.candidate = self.historical.get_model("publishing", "PublicationCandidate")
        self.approval.objects.create(
            id=9001,
            resource_id="retained-bot",
            resource_name="retained name",
            publish_type="MARKET",
            target_hash="retained-hash",
            requester_uid="original-uid",
            request_reason="original approval reason",
            publish_snapshot='{"original":"snapshot"}',
        )
        with connection.schema_editor(atomic=False) as editor:
            editor.remove_field(self.approval, self.approval._meta.get_field("candidate"))
            editor.remove_field(self.approval, self.approval._meta.get_field("review_comment"))
        with connection.cursor() as cursor:
            cursor.execute("ALTER TABLE publish_approval ADD COLUMN vendor_extension VARCHAR(64)")
            cursor.execute(
                "UPDATE publish_approval SET vendor_extension = 'retained' WHERE id=9001"
            )
        self.addCleanup(self.restore_schema)

    def restore_schema(self):
        # Keep the shared test schema usable even when an assertion fails mid-upgrade.
        with connection.schema_editor(atomic=False) as editor:
            self.migration.adopt_publications(self.historical, editor)
        with connection.cursor() as cursor:
            cursor.execute("ALTER TABLE publish_approval DROP COLUMN vendor_extension")

    def columns(self):
        with connection.cursor() as cursor:
            return {
                item.name
                for item in connection.introspection.get_table_description(
                    cursor, "publish_approval"
                )
            }

    def verify_restored(self):
        row = self.approval.objects.get(pk=9001)
        self.assertEqual(row.requester_uid, "original-uid")
        self.assertEqual(row.request_reason, "original approval reason")
        self.assertEqual(row.publish_snapshot, '{"original":"snapshot"}')
        self.assertEqual(row.approval_status, "PENDING")
        self.assertIsNone(row.candidate_id)
        with connection.cursor() as cursor:
            cursor.execute("SELECT vendor_extension FROM publish_approval WHERE id=9001")
            self.assertEqual(cursor.fetchone()[0], "retained")
            constraints = connection.introspection.get_constraints(cursor, "publish_approval")
        self.assertTrue(
            any(
                item.get("foreign_key") == ("console_publication_candidate", "id")
                and item["columns"] == ["candidate_id"]
                for item in constraints.values()
            )
        )
        candidate = self.candidate.objects.create(
            bot_id=1,
            resource_kind="agent",
            resource_id="1",
            version_id=1,
            definition={"prompt": "frozen"},
            owner_uid="original-uid",
            created_by="original-uid",
        )
        self.approval.objects.filter(pk=9001).update(candidate_id=candidate.pk)
        self.assertEqual(self.approval.objects.get(pk=9001).candidate.owner_uid, "original-uid")
        with connection.schema_editor(atomic=False) as editor:
            self.migration.adopt_publications(self.historical, editor)
        self.assertEqual(self.approval.objects.get(pk=9001).candidate_id, candidate.pk)
        self.assertEqual(self.approval.objects.count(), 1)

    def test_retained_table_missing_candidate_adds_resolved_historical_fk(self):
        self.assertNotIn("candidate_id", self.columns())
        with connection.schema_editor(atomic=False) as editor:
            original_add = editor.add_field

            def checked_add(model, field):
                if field.name == "candidate":
                    self.assertIs(field.remote_field.model, self.candidate)
                    self.assertIs(field.related_model._meta.apps, self.historical)
                original_add(model, field)

            with patch.object(editor, "add_field", side_effect=checked_add):
                self.migration.adopt_publications(self.historical, editor)
        self.verify_restored()

    def test_partial_non_atomic_ddl_before_fk_can_resume(self):
        with connection.schema_editor(atomic=False) as editor:
            original_add = editor.add_field

            def interrupted_add(model, field):
                if field.name == "candidate":
                    raise RuntimeError("simulated DDL interruption")
                original_add(model, field)

            with patch.object(editor, "add_field", side_effect=interrupted_add):
                with self.assertRaisesMessage(RuntimeError, "simulated DDL interruption"):
                    self.migration.adopt_publications(self.historical, editor)
        self.assertIn("review_comment", self.columns())
        self.assertNotIn("candidate_id", self.columns())
        with connection.schema_editor(atomic=False) as editor:
            self.migration.adopt_publications(self.historical, editor)
        self.verify_restored()

    def test_partial_non_atomic_ddl_after_fk_does_not_duplicate_or_drop_it(self):
        with connection.schema_editor(atomic=False) as editor:
            original_add = editor.add_field

            def interrupted_add(model, field):
                original_add(model, field)
                if field.name == "candidate":
                    raise RuntimeError("simulated interruption after FK DDL")

            with patch.object(editor, "add_field", side_effect=interrupted_add):
                with self.assertRaisesMessage(RuntimeError, "simulated interruption after FK DDL"):
                    self.migration.adopt_publications(self.historical, editor)
        self.assertIn("candidate_id", self.columns())
        with connection.schema_editor(atomic=False) as editor:
            self.migration.adopt_publications(self.historical, editor)
        self.verify_restored()

    def test_created_table_survives_failed_editor_exit_and_deferred_metadata_is_restored(self):
        publication = self.historical.get_model("publishing", "Publication")
        with connection.schema_editor(atomic=False) as editor:
            editor.delete_model(publication)
        # The exception must cross the schema editor context: its deferred SQL
        # must NOT execute, exactly as in the failed MySQL upgrade.
        with self.assertRaisesMessage(RuntimeError, "failure after create_model"):
            with connection.schema_editor(atomic=False) as editor:
                original_add = editor.add_field

                def interrupted_add(model, field):
                    if field.name == "candidate":
                        raise RuntimeError("failure after create_model")
                    original_add(model, field)

                with patch.object(editor, "add_field", side_effect=interrupted_add):
                    self.migration.adopt_publications(self.historical, editor)
        with connection.cursor() as cursor:
            before = connection.introspection.get_constraints(cursor, publication._meta.db_table)
            self.assertFalse(
                any(item.get("index") and item["columns"] == ["bot_id"] for item in before.values())
            )
            if connection.vendor == "mysql":
                self.assertFalse(any(item.get("foreign_key") for item in before.values()))
            cursor.execute(
                "ALTER TABLE console_publication ADD COLUMN vendor_extension VARCHAR(64)"
            )
        self.addCleanup(self.remove_publication_extension)
        candidate = self.candidate.objects.create(
            bot_id=99,
            resource_kind="agent",
            resource_id="99",
            version_id=1,
            definition={},
            owner_uid="retained-owner",
            created_by="retained-owner",
        )
        row = publication.objects.create(bot_id=99, channel="MARKET", candidate_id=candidate.pk)
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE console_publication SET vendor_extension = 'retained' WHERE id=%s", [row.pk]
            )
        for _ in range(2):
            with connection.schema_editor(atomic=False) as editor:
                self.migration.adopt_publications(self.historical, editor)
        with connection.cursor() as cursor:
            after = connection.introspection.get_constraints(cursor, publication._meta.db_table)
            cursor.execute(
                "SELECT vendor_extension, candidate_id FROM console_publication WHERE id=%s",
                [row.pk],
            )
            self.assertEqual(cursor.fetchone(), ("retained", candidate.pk))
        self.assertEqual(
            sum(
                item.get("foreign_key") == ("console_publication_candidate", "id")
                and item["columns"] == ["candidate_id"]
                for item in after.values()
            ),
            1,
        )
        self.assertEqual(
            sum(
                bool(item.get("unique")) and item["columns"] == ["bot_id", "channel", "target_id"]
                for item in after.values()
            ),
            1,
        )
        for column in ("bot_id", "candidate_id"):
            self.assertTrue(
                any(item.get("index") and item["columns"] == [column] for item in after.values())
            )
        self.assertEqual(publication.objects.count(), 1)

    def remove_publication_extension(self):
        with connection.cursor() as cursor:
            cursor.execute("ALTER TABLE console_publication DROP COLUMN vendor_extension")
