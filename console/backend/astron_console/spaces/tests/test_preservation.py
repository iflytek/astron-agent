import os
import sqlite3
import subprocess
import sys
import tempfile
from pathlib import Path

from django.conf import settings
from django.test import SimpleTestCase


class ExistingSpaceSchemaTests(SimpleTestCase):
    def test_adoption_keeps_ids_members_custom_permissions_and_shared_records(self):
        with tempfile.TemporaryDirectory() as directory:
            database = Path(directory) / "spaces.sqlite3"
            connection = sqlite3.connect(database)
            connection.executescript("""
                CREATE TABLE agent_space (id INTEGER PRIMARY KEY, name TEXT, uid TEXT,
                    enterprise_id BIGINT, type INTEGER, deleted INTEGER);
                INSERT INTO agent_space VALUES (701, 'kept-space', 'original-uid', 99, 4, 0);
                CREATE TABLE agent_space_user (id INTEGER PRIMARY KEY, space_id BIGINT,
                    uid TEXT, role INTEGER, nickname TEXT);
                INSERT INTO agent_space_user VALUES (71, 701, 'original-uid', 1, 'kept-owner');
                CREATE TABLE agent_space_permission (id INTEGER PRIMARY KEY,
                    module TEXT, point TEXT, description TEXT, permission_key TEXT UNIQUE,
                    owner INTEGER, admin INTEGER, member INTEGER, available_expired INTEGER,
                    create_time DATETIME, update_time DATETIME);
                INSERT INTO agent_space_permission VALUES (800, 'original', '', 'customized',
                    'SpaceController_detail_GET', 1, 0, 0, 1, NULL, NULL);
                CREATE TABLE group_visibility (id INTEGER PRIMARY KEY, uid TEXT, type INTEGER,
                    user_id TEXT, relation_id TEXT, create_time DATETIME, space_id BIGINT);
                INSERT INTO group_visibility VALUES (16,'original-uid',1,'shared-uid','repo-id',
                    '2025-01-01',701);
                CREATE TABLE retained_agent (id INTEGER PRIMARY KEY, uid TEXT, space_id BIGINT,
                    configuration TEXT);
                INSERT INTO retained_agent VALUES (42,'original-uid',701,'unchanged config');
            """)
            connection.commit()
            tables = ("agent_space", "agent_space_user", "group_visibility", "retained_agent")
            before = {
                table: connection.execute(f"SELECT * FROM {table}").fetchall() for table in tables
            }
            policy = connection.execute(
                "SELECT * FROM agent_space_permission WHERE id=800"
            ).fetchone()
            environment = {
                **os.environ,
                "DJANGO_SETTINGS_MODULE": "astron_console.settings",
                "CONSOLE_DATABASE_ENGINE": "sqlite",
                "CONSOLE_SQLITE_PATH": str(database),
                "CONSOLE_SECRET_KEY": "preservation-test-only-" * 4,
            }
            for _ in range(2):
                result = subprocess.run(
                    [sys.executable, "manage.py", "migrate", "spaces", "--noinput"],
                    cwd=settings.BASE_DIR,
                    env=environment,
                    capture_output=True,
                    text=True,
                    timeout=60,
                )
                self.assertEqual(result.returncode, 0, result.stderr)
            for table in tables:
                self.assertEqual(
                    connection.execute(f"SELECT * FROM {table}").fetchall(), before[table]
                )
            self.assertEqual(
                connection.execute("SELECT * FROM agent_space_permission WHERE id=800").fetchone(),
                policy,
            )
            self.assertGreater(
                connection.execute("SELECT COUNT(*) FROM agent_space_permission").fetchone()[0], 1
            )
            connection.close()
