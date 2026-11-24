"""Run Console SQL through the repository's real Core UID rewrite/merge functions.

Service startup, catalog/validation policy and response serialization are isolated. SQLGlot,
Core's rewrite and duplicate-parameter rejection execute from their original source.
"""

import ast
import asyncio
import datetime
import json
import re
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

import sqlglot
from django.core.exceptions import ValidationError
from django.test import TestCase, override_settings
from sqlalchemy import (
    BigInteger,
    Column,
    MetaData,
    String,
    Table,
    bindparam,
    delete,
    insert,
    select,
    text,
    update,
)
from sqlalchemy.engine import BindTyping

from astron_console.knowledge import databases
from astron_console.knowledge.models import Database, DatabaseField, DatabaseTable


class DatabaseCoreContractTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        source_path = (
            Path(__file__).resolve().parents[5] / "core/memory/database/api/v1/exec_dml.py"
        )
        tree = ast.parse(source_path.read_text())
        # Importing the whole service starts unrelated FastAPI, telemetry and DB
        # dependencies. Load its unchanged function bodies, not a copied rewrite.
        functions = [
            node
            for node in tree.body
            if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef) and not node.decorator_list
        ]
        module = ast.Module(
            body=[
                ast.ImportFrom(module="__future__", names=[ast.alias(name="annotations")], level=0),
                *functions,
            ],
            type_ignores=[],
        )
        cls.core = {
            "datetime": datetime,
            "re": re,
            "exp": sqlglot.exp,
            "parse_one": sqlglot.parse_one,
            "get_id": lambda: 1981998123456789012,
            "INSERT_EXTRA_COLUMNS": ["id", "uid", "create_time", "update_time"],
            "logger": Mock(),
            "CodeEnum": SimpleNamespace(DMLNotAllowed=SimpleNamespace(code=25050)),
            "format_response": lambda **fields: fields,
        }
        exec(compile(ast.fix_missing_locations(module), str(source_path), "exec"), cls.core)
        # These tests exercise the SQL transport contract, not schema/catalog policy.
        cls.core["_validate_dml_legality"] = AsyncMock(return_value=None)
        cls.core["_get_table_column_types"] = AsyncMock(return_value={})

    def setUp(self):
        self.schema = Table(
            "notes",
            MetaData(),
            Column("id", BigInteger),
            Column("uid", String),
            Column("note", String),
            Column("param_0", String),
            Column("param_1", String),
        )

    def process(self, compiled, engine, space_id=None):
        self.core["get_adapter"] = lambda: SimpleNamespace(
            get_sqlglot_dialect=lambda: "postgres" if engine == "postgresql" else "mysql"
        )
        return asyncio.run(
            self.core["_process_dml_statements"](
                [str(compiled)],
                "console-app",
                "retained-user-uid",
                SimpleNamespace(sid="contract", add_error_event=Mock(), add_info_event=Mock()),
                None,
                "test_schema",
                space_id=space_id,
                sql_params=compiled.params,
            )
        )

    def test_original_pagination_conflicts_with_real_core_uid_parameters(self):
        for engine in ("postgresql", "mysql"):
            with self.subTest(engine=engine), override_settings(SPARK_DB_TYPE=engine):
                transport = databases.dialect()
                transport.bind_typing = BindTyping.NONE
                original = select(self.schema).limit(10).offset(0).compile(dialect=transport)
                results, error = self.process(original, engine)
                self.assertIsNone(results)
                self.assertEqual(error["code"], 25050)
                self.assertEqual(
                    error["message"], "DML parameter names conflict with generated parameters"
                )

    def test_all_dml_binds_survive_core_rewrite_without_uid_collisions(self):
        snowflake = 1981998123456789011
        business_text = "quoted ' value :param_0; DROP TABLE notes"
        statements = {
            "page": select(self.schema).limit(10).offset(20),
            "export": select(self.schema)
            .where(self.schema.c.id.in_([snowflake, 2]))
            .limit(1000)
            .offset(1000),
            "copy": select(self.schema).limit(500).offset(500),
            "insert": insert(self.schema).values(param_0=business_text, param_1="kept"),
            "update": update(self.schema)
            .where(self.schema.c.id == snowflake)
            .values(param_0=business_text, param_1="kept"),
            "delete": delete(self.schema).where(self.schema.c.id.in_([snowflake, 2])),
            "explicit_names": select(self.schema).where(
                self.schema.c.note == bindparam("param_0", business_text),
                self.schema.c.param_1 == bindparam("param_1", "kept"),
            ),
            "empty_in": delete(self.schema).where(self.schema.c.id.in_([])),
        }
        for engine in ("postgresql", "mysql"):
            for space_id in (None, "retained-space"):
                for operation, statement in statements.items():
                    with (
                        self.subTest(engine=engine, space=space_id, operation=operation),
                        override_settings(SPARK_DB_TYPE=engine),
                    ):
                        compiled = databases.compile_dml(statement)
                        self.assertTrue(
                            all(name.startswith("console_value_") for name in compiled.params)
                        )
                        self.assertNotIn("POSTCOMPILE", str(compiled))
                        self.assertNotIn(business_text, str(compiled))
                        self.assertNotIn(str(snowflake), str(compiled))
                        results, error = self.process(compiled, engine, space_id)
                        self.assertIsNone(error)
                        rewritten = results[0]
                        # Core merges rather than replacing any Console values.
                        for name, value in compiled.params.items():
                            self.assertEqual(rewritten["params"][name], value)
                        reparsed = text(rewritten["rewrite_dml"]).bindparams(**rewritten["params"])
                        self.assertEqual(reparsed.compile().params, rewritten["params"])
                        if not space_id or operation == "insert":
                            self.assertIn(
                                "console-app:retained-user-uid", rewritten["params"].values()
                            )
                        if not space_id and operation != "insert":
                            self.assertIn("retained-user-uid", rewritten["params"].values())
                        if operation in ("export", "delete", "update"):
                            self.assertIn(snowflake, rewritten["params"].values())
                        if operation in ("insert", "update", "explicit_names"):
                            self.assertIn(business_text, rewritten["params"].values())

    def test_compile_keeps_original_statement_and_bound_values(self):
        statement = select(self.schema).where(self.schema.c.id.in_([1, 2])).limit(10).offset(20)
        original = str(statement)
        for engine in ("postgresql", "mysql"):
            with self.subTest(engine=engine), override_settings(SPARK_DB_TYPE=engine):
                compiled = databases.compile_dml(statement)
                self.assertEqual(sorted(compiled.params.values()), [1, 2, 10, 20])
                self.assertEqual(str(statement), original)
                self.assertNotIn("::", str(compiled))

    def test_time_rows_remain_json_strings_and_keep_text_cast_through_core(self):
        db = Database.objects.create(
            name="dates", uid="retained-user-uid", db_id=733, app_id="console-app"
        )
        row = DatabaseTable.objects.create(db_id=db.pk, name="notes")
        for name, field_type in (
            ("moment", "Time"),
            ("blank", "Time"),
            ("note", "String"),
            ("amount", "Integer"),
            ("enabled", "Boolean"),
        ):
            DatabaseField.objects.create(tb_id=row.pk, name=name, type=field_type)
        request = SimpleNamespace(
            user=SimpleNamespace(pk="retained-user-uid", is_authenticated=True), headers={}
        )
        moment = "2026-11-03T12:00:00"
        for engine in ("postgresql", "mysql"):
            for value in (moment, datetime.datetime(2026, 11, 3, 12), None):
                for operation in (1, 2):
                    with (
                        self.subTest(engine=engine, value=value, operation=operation),
                        override_settings(SPARK_DB_TYPE=engine),
                    ):
                        sent = []

                        def transport(action, payload, *, engine=engine, sent=sent):
                            self.assertEqual(action, "exec_dml")
                            # Exercise the actual row conversion and JSON wire boundary.
                            wire = json.loads(json.dumps(payload))
                            sent.append(wire)
                            compiled = text(wire["dml"]).bindparams(**wire["params"]).compile()
                            results, error = self.process(compiled, engine)
                            self.assertIsNone(error)
                            rewritten = results[0]
                            ast = sqlglot.parse_one(
                                rewritten["rewrite_dml"],
                                dialect="postgres" if engine == "postgresql" else "mysql",
                            )
                            casts = [
                                node
                                for node in ast.find_all(sqlglot.exp.Cast)
                                if isinstance(node.this, sqlglot.exp.Cast)
                            ]
                            self.assertEqual(len(casts), 2)
                            for outer in casts:
                                inner = outer.this
                                self.assertIsInstance(inner.this, sqlglot.exp.Placeholder)
                                self.assertIn(
                                    inner.args["to"].this,
                                    {
                                        sqlglot.exp.DataType.Type.VARCHAR,
                                        sqlglot.exp.DataType.Type.CHAR,
                                    },
                                )
                                self.assertIn(
                                    outer.args["to"].this,
                                    {
                                        sqlglot.exp.DataType.Type.TIMESTAMP,
                                        sqlglot.exp.DataType.Type.DATETIME,
                                    },
                                )
                                self.assertTrue(inner.this.this.startswith("console_value_"))
                                self.assertIn(wire["params"][inner.this.this], (moment, None))
                            self.assertEqual(
                                text(rewritten["rewrite_dml"])
                                .bindparams(**rewritten["params"])
                                .compile()
                                .params,
                                rewritten["params"],
                            )
                            self.assertIn(
                                "console-app:retained-user-uid", rewritten["params"].values()
                            )
                            self.assertNotIn(moment, rewritten["rewrite_dml"])
                            return {"exec_success": []}

                        with patch(
                            "astron_console.knowledge.databases.clients.database", transport
                        ):
                            databases.operate_rows(
                                request,
                                row,
                                db,
                                [
                                    {
                                        "operateType": operation,
                                        "tableData": {
                                            "id": "1981998123456789011",
                                            "moment": value,
                                            "blank": None,
                                            "note": "plain text",
                                            "amount": 42,
                                            "enabled": True,
                                        },
                                    }
                                ],
                                1,
                            )
                        self.assertEqual(len(sent), 1)
                        values = list(sent[0]["params"].values())
                        self.assertEqual(values.count(None), 2 if value is None else 1)
                        if value is not None:
                            self.assertIn(moment, values)
                        self.assertIn("plain text", values)
                        self.assertIn(42, values)
                        self.assertIn(True, values)

    def test_invalid_time_is_still_rejected_before_transport(self):
        field = SimpleNamespace(type="Time", name="moment", is_required=False, default_value=None)
        with self.assertRaises(ValidationError):
            databases.convert("not-a-time", field)
