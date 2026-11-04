"""Exercise schema adoption through Django's non-transactional DDL guard."""

from copy import deepcopy
from importlib import import_module
from unittest.mock import patch

from django.db import connection
from django.db.migrations.state import ProjectState
from django.test import TransactionTestCase


class DefinitionMigrationTransactionTests(TransactionTestCase):
    def test_agent_adoption_on_non_transactional_ddl_backend(self):
        self.adopt("agents", "0001_definitions")

    def test_knowledge_dependency_on_non_transactional_ddl_backend(self):
        self.adopt("knowledge", "0001_initial")

    def adopt(self, app_label, migration_name):
        migration = deepcopy(
            import_module(f"astron_console.{app_label}.migrations.{migration_name}").Migration(
                migration_name, app_label
            )
        )
        for operation in migration.operations[0].state_operations:
            operation.options["db_table"] = "probe_" + operation.options["db_table"]
        initial = ProjectState()
        target = migration.mutate_state(initial)
        models = [m for m in target.apps.get_app_config(app_label).get_models() if m._meta.managed]
        try:
            # SQLite normally allows DDL in transactions and masks this MySQL failure.
            # Keep real SQL execution while enforcing the same SchemaEditor guard as MySQL.
            with patch.object(connection.features, "can_rollback_ddl", False):
                with connection.schema_editor(atomic=False) as editor:
                    migration.apply(initial, editor)
            tables = set(connection.introspection.table_names())
            self.assertTrue(all(model._meta.db_table in tables for model in models))
        finally:
            with connection.schema_editor(atomic=False) as editor:
                tables = set(connection.introspection.table_names())
                for model in reversed(models):
                    if model._meta.db_table in tables:
                        editor.delete_model(model)
