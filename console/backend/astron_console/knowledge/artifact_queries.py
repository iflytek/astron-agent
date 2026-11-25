"""Private/public artifact boundaries across retained and new MySQL tables."""

from functools import lru_cache

from django.db import connections
from django.db.models import Exists, OuterRef
from django.db.models.functions import Collate


@lru_cache(maxsize=32)
def column_collation(alias, database_name, table, column):
    # A deployment keeps its adopted schema stable for the worker lifetime. Cache
    # metadata, never rows or authorization decisions; include database for tests.
    connection = connections[alias]
    # Django introspection reports None when a column inherits its table's
    # collation, so it cannot supply the actual comparison rules required here.
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT COLLATION_NAME FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = %s",
            [database_name, table, column],
        )
        row = cursor.fetchone()
    if not row or not row[0]:
        raise RuntimeError(f"Cannot resolve artifact comparison collation for {table}.{column}")
    return row[0]


def matching_reference(query, field_name, outer_field):
    """Convert only the RHS to the indexed target's own comparison rules."""
    expression = OuterRef(outer_field)
    connection = connections[query.db]
    if connection.vendor == "mysql":
        field = query.model._meta.get_field(field_name)
        collation = column_collation(
            query.db, connection.settings_dict["NAME"], query.model._meta.db_table, field.column
        )
        if collation:
            expression = Collate(expression, collation)
    return expression


def workflow_runs_for_artifact(artifacts):
    from astron_console.workflows.models import WorkflowRun

    runs = WorkflowRun.objects.using(artifacts.db)
    return runs.filter(id=matching_reference(runs, "id", "run_id"))


def artifacts_for_root(artifacts, root_id):
    runs = workflow_runs_for_artifact(artifacts).filter(context_id=root_id)
    return artifacts.filter(Exists(runs))


def exclude_public_artifacts(artifacts):
    from astron_console.publishing.models import PublicRunGrant

    runs = workflow_runs_for_artifact(artifacts)
    grants = PublicRunGrant.objects.using(artifacts.db)
    grants = grants.filter(root_id=matching_reference(grants, "root_id", "context_id"))
    return artifacts.filter(~Exists(runs.filter(Exists(grants))))
