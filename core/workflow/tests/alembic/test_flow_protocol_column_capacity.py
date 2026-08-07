"""Regression tests for the flow protocol column capacity migration."""

import importlib.util
from io import StringIO
from pathlib import Path
from types import ModuleType

import pytest
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

from alembic.migration import MigrationContext
from alembic.operations import Operations

MIGRATION_PATH = (
    Path(__file__).parents[2]
    / "alembic"
    / "versions"
    / "2026_08_06_1742-fdacc27881b5_expand_flow_protocol_columns.py"
)

EXPECTED_COMMENTS = {
    "data": "编排标准协议",
    "release_data": "发布后的数据",
}


def _load_migration() -> ModuleType:
    spec = importlib.util.spec_from_file_location(
        "expand_flow_protocol_columns", MIGRATION_PATH
    )
    if spec is None or spec.loader is None:
        raise AssertionError(f"Unable to load migration: {MIGRATION_PATH}")

    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    return migration


def _capture_alter_column_calls(
    monkeypatch: pytest.MonkeyPatch,
    migration: ModuleType,
    operation_name: str,
) -> list[tuple[str, str, dict[str, object]]]:
    calls: list[tuple[str, str, dict[str, object]]] = []

    def capture(table_name: str, column_name: str, **kwargs: object) -> None:
        calls.append((table_name, column_name, kwargs))

    monkeypatch.setattr(migration.op, "alter_column", capture)
    getattr(migration, operation_name)()
    return calls


def test_revision_chain() -> None:
    migration = _load_migration()

    assert migration.revision == "fdacc27881b5"
    assert migration.down_revision == "b13356244aea"


def test_upgrade_expands_protocol_columns_to_longtext(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    migration = _load_migration()
    calls = _capture_alter_column_calls(monkeypatch, migration, "upgrade")

    assert [column_name for _, column_name, _ in calls] == [
        "data",
        "release_data",
    ]
    for table_name, column_name, kwargs in calls:
        assert table_name == "flow"
        assert isinstance(kwargs["existing_type"], sa.Text)
        assert isinstance(kwargs["type_"], mysql.LONGTEXT)
        assert kwargs["existing_nullable"] is True
        assert kwargs["existing_server_default"] is None
        assert kwargs["existing_comment"] == EXPECTED_COMMENTS[column_name]


def test_upgrade_compiles_valid_mysql_longtext_ddl(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    migration = _load_migration()
    output = StringIO()
    context = MigrationContext.configure(
        dialect_name="mysql",
        opts={"as_sql": True, "output_buffer": output},
    )
    monkeypatch.setattr(migration, "op", Operations(context))

    migration.upgrade()

    sql = output.getvalue()
    assert sql.count("ALTER TABLE flow MODIFY") == 2
    assert "data LONGTEXT" in sql
    assert "release_data LONGTEXT" in sql


def test_downgrade_is_explicitly_irreversible(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    migration = _load_migration()
    alter_calls: list[tuple[str, str, dict[str, object]]] = []
    monkeypatch.setattr(
        migration.op,
        "alter_column",
        lambda table_name, column_name, **kwargs: alter_calls.append(
            (table_name, column_name, kwargs)
        ),
    )

    with pytest.raises(RuntimeError) as exc_info:
        migration.downgrade()

    assert "irreversible" in str(exc_info.value)
    assert "flow.data" in str(exc_info.value)
    assert alter_calls == []
