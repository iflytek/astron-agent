"""Exercise schema adoption through Django's non-transactional DDL guard."""

from copy import deepcopy
from importlib import import_module
from unittest.mock import patch

from django.db import connection
from django.db.migrations.state import ProjectState
from django.test import TransactionTestCase


class DefinitionMigrationTransactionTests(TransactionTestCase):
    def test_adoption_creates_tables_on_non_transactional_ddl_backend(self):
        migration = deepcopy(
            import_module("astron_console.agents.migrations.0001_definitions").Migration(
                "0001_definitions", "agents"
            )
        )
        for operation in migration.operations[0].state_operations:
            operation.options["db_table"] = "probe_" + operation.options["db_table"]
        initial = ProjectState()
        target = migration.mutate_state(initial)
        models = list(target.apps.get_app_config("agents").get_models())
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
