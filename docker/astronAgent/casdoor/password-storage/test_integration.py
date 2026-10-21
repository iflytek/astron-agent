"""Run only against disposable local Docker containers, never an existing server."""

import copy
import http.cookiejar
import json
import os
import pathlib
import subprocess
import tempfile
import unittest
from unittest import mock
import urllib.request
import uuid

import bcrypt
import pymysql

from passwords import (
    HASHER,
    MigrationError,
    migrate,
    read_rows,
    verify_storage,
    wait_for_casdoor,
)

ROOT = pathlib.Path(__file__).resolve().parents[2]
BASE_URL = "http://127.0.0.1:18007"


class CasdoorIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="casdoor-password-test-")
        work = pathlib.Path(cls.temp.name)
        # Only the test exposes private Casdoor/MySQL listeners, on loopback.
        override = work / "compose.json"
        override.write_text(
            json.dumps(
                {
                    "services": {
                        "casdoor": {"ports": ["127.0.0.1:18007:8000"]},
                        "casdoor-mysql": {"ports": ["127.0.0.1:13367:3306"]},
                    }
                }
            ),
            encoding="utf-8",
        )
        cls.command = [
            "docker",
            "compose",
            "--project-name",
            "casdoor-password-storage-test",
            "-f",
            str(ROOT / "docker-compose-auth.yml"),
            "-f",
            str(override),
        ]
        cls.env = dict(
            os.environ,
            CASDOOR_BIND_ADDRESS="127.0.0.1",
            CASDOOR_PORT="18008",
            CASDOOR_MYSQL_PASSWORD="fixture-custom-db-password",
        )
        cls.compose("up", "-d", "casdoor")
        wait_for_casdoor(BASE_URL, timeout=180)
        cls.db = pymysql.connect(
            host="127.0.0.1",
            port=13367,
            user="casdoor",
            password=cls.env["CASDOOR_MYSQL_PASSWORD"],
            database="casdoor",
            autocommit=False,
            cursorclass=pymysql.cursors.DictCursor,
        )

    @classmethod
    def compose(cls, *args, check=True):
        return subprocess.run(cls.command + list(args), env=cls.env, check=check)

    @classmethod
    def tearDownClass(cls):
        cls.db.close()
        cls.compose("down", "--volumes", "--remove-orphans", check=False)
        cls.temp.cleanup()

    def request(self, endpoint, payload, opener=None, base_url=BASE_URL):
        client = opener or urllib.request.build_opener()
        req = urllib.request.Request(
            base_url + endpoint,
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with client.open(req, timeout=30) as response:
            return json.load(response)

    def login(
        self,
        username,
        password,
        organization="built-in",
        application="app-built-in",
        opener=None,
    ):
        return self.request(
            "/api/login",
            {
                "application": application,
                "organization": organization,
                "username": username,
                "password": password,
                "type": "login",
            },
            opener,
        )

    def snapshot(self):
        self.db.rollback()
        orgs, users = read_rows(self.db)
        self.db.rollback()
        return copy.deepcopy((orgs, users))

    def insert_legacy(self, name, password, kind):
        # Seed a historical database row; authentication is always tested through
        # the real Casdoor API, not a reimplementation of its login logic.
        with self.db.cursor() as cur:
            cur.execute("SELECT * FROM user WHERE owner='built-in' AND name='admin'")
            row = cur.fetchone()
            row.update(
                name=name,
                id=str(uuid.uuid4()),
                password=password,
                password_type=kind,
                is_admin=False,
                display_name=name,
            )
            fields = list(row)
            columns = ",".join("`" + key + "`" for key in fields)
            placeholders = ",".join(["%s"] * len(fields))
            cur.execute(
                f"INSERT INTO user ({columns}) VALUES ({placeholders})",
                tuple(row[key] for key in fields),
            )
        self.db.commit()

    def test_real_initialization_migration_login_and_restart(self):
        orgs, users = self.snapshot()
        with self.assertRaises(MigrationError):
            verify_storage(orgs, users)
        # Deployment does not run the optional password migration or verifier.
        # The regular gateway can start without a locally built helper image.
        result = self.compose("up", "-d", "casdoor-gateway", check=False)
        self.assertEqual(result.returncode, 0)
        wait_for_casdoor("http://127.0.0.1:18008/")
        self.assertEqual(self.snapshot(), (orgs, users))

        admin = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
        )
        self.assertEqual(self.login("admin", "123", opener=admin)["status"], "ok")
        # Exercise upstream AddUser against the new Argon2id organization policy.
        response = self.request(
            "/api/add-user",
            {
                "owner": "example-org",
                "name": "fresh-user",
                "displayName": "Fresh User",
                "password": "new-password-123",
                "passwordType": "plain",
                "type": "normal-user",
            },
            admin,
        )
        self.assertEqual(response["status"], "ok")
        fresh = next(u for u in self.snapshot()[1] if u["name"] == "fresh-user")
        self.assertEqual(fresh["password_type"], "argon2id")
        self.assertTrue(HASHER.verify(fresh["password"], "new-password-123"))

        credentials = {"legacy-explicit": "legacy-pass", "legacy-empty": "x" * 100}
        self.insert_legacy("legacy-explicit", credentials["legacy-explicit"], "plain")
        self.insert_legacy("legacy-empty", credentials["legacy-empty"], "")
        existing_hash = bcrypt.hashpw(
            b"bcrypt-password", bcrypt.gensalt(rounds=10)
        ).decode()
        self.insert_legacy("legacy-bcrypt", existing_hash, "bcrypt")
        self.compose("stop", "casdoor-gateway", "casdoor")
        before = self.snapshot()
        preview = migrate(self.db)
        self.assertFalse(preview["applied"])
        self.assertEqual(self.snapshot(), before)

        # An invalid row aborts before any partial policy/password migration.
        self.insert_legacy("invalid-metadata", "$argon2id$not-plaintext", "plain")
        invalid_before = self.snapshot()
        with self.assertRaises(MigrationError):
            migrate(self.db, apply=True)
        self.assertEqual(self.snapshot(), invalid_before)
        with self.db.cursor() as cur:
            cur.execute(
                "DELETE FROM user WHERE owner='built-in' AND name='invalid-metadata'"
            )
        self.db.commit()

        with mock.patch.object(
            self.db, "commit", side_effect=RuntimeError("injected commit failure")
        ):
            with self.assertRaises(RuntimeError):
                migrate(self.db, apply=True)
        self.assertEqual(self.snapshot(), before)

        with self.db.cursor() as cur:
            cur.execute("SELECT owner, name, id FROM user ORDER BY owner, name")
            original_ids = cur.fetchall()
        self.db.rollback()
        result = migrate(self.db, apply=True)
        self.assertTrue(result["applied"])
        after = self.snapshot()
        verify_storage(*after)
        self.assertEqual(
            next(u for u in after[1] if u["name"] == "legacy-bcrypt")["password"],
            existing_hash,
        )
        self.assertEqual(migrate(self.db, apply=True)["account_updates"], 0)
        self.assertEqual(self.snapshot(), after)
        with self.db.cursor() as cur:
            cur.execute("SELECT owner, name, id FROM user ORDER BY owner, name")
            self.assertEqual(cur.fetchall(), original_ids)
        self.db.rollback()

        self.compose("up", "-d", "casdoor")
        wait_for_casdoor(BASE_URL)
        self.assertEqual(self.login("admin", "123")["status"], "ok")
        for username, password in credentials.items():
            self.assertEqual(self.login(username, password)["status"], "ok")
            self.assertEqual(
                self.login(username, password + "wrong")["status"], "error"
            )
        self.assertEqual(self.login("legacy-bcrypt", "bcrypt-password")["status"], "ok")
        self.assertEqual(
            self.login("fresh-user", "new-password-123", "example-org", "example-app")[
                "status"
            ],
            "ok",
        )
        self.compose("up", "-d", "--force-recreate", "casdoor-gateway")
        wait_for_casdoor("http://127.0.0.1:18008/")
        # Verify the gateway forwards to the real identity service (not merely a
        # listening nginx returning 502), without imposing its default 1 MiB cap.
        public_login = self.request(
            "/api/login",
            {
                "application": "app-built-in",
                "organization": "built-in",
                "username": "admin",
                "password": "123",
                "type": "login",
                "ignoredTransportFixture": "x" * (1024 * 1024 + 1),
            },
            base_url="http://127.0.0.1:18008",
        )
        self.assertEqual(public_login["status"], "ok")
        verify_storage(*self.snapshot())


if __name__ == "__main__":
    unittest.main()
