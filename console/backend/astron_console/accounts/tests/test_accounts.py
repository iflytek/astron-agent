import io
import json
import os
import sqlite3
import subprocess
import sys
import tempfile
from datetime import timedelta
from pathlib import Path
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import Client, SimpleTestCase, TestCase, override_settings
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from astron_console.accounts.models import User, UserProfile

PASSWORD = "Example-River-Notebook-729!"
NEW_PASSWORD = "Changed-River-Notebook-530!"


class AccountTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client(enforce_csrf_checks=True)

    def post(self, url, payload, client=None):
        client = client or self.client
        csrf = client.get("/auth/csrf").json()["data"]["csrfToken"]
        return client.post(url, payload, content_type="application/json", HTTP_X_CSRFTOKEN=csrf)

    def create_user(self, username="alice", uid="legacy-uid-1"):
        user = User.objects.create_user(id=uid, username=username, password=PASSWORD)
        UserProfile.objects.create(uid=uid, username=username, nickname="原昵称")
        return user

    def login(self, client=None):
        return self.post("/auth/login", {"username": "alice", "password": PASSWORD}, client)

    def reset_payload(self, user):
        return {
            "uid": urlsafe_base64_encode(force_bytes(user.pk)),
            "token": default_token_generator.make_token(user),
            "password": NEW_PASSWORD,
            "passwordConfirm": NEW_PASSWORD,
        }

    def test_json_password_values_are_not_coerced_to_strings(self):
        user = self.create_user()
        self.login()
        for value in [123456789012, ["secret-password"], {"secret": True}, "x" * 1025]:
            cache.clear()
            for url, payload in [
                ("/auth/register", {"username": "new-user"}),
                ("/auth/reset-password", self.reset_payload(user)),
                ("/auth/change-password", {"oldPassword": PASSWORD}),
            ]:
                with self.subTest(url=url, value_type=type(value).__name__):
                    result = self.post(
                        url, {**payload, "password": value, "passwordConfirm": value}
                    )
                    self.assertEqual(result.status_code, 400)
        user.refresh_from_db()
        self.assertTrue(user.check_password(PASSWORD))
        self.assertEqual(User.objects.count(), 1)

    def test_rate_limiter_outage_fails_closed(self):
        from redis.exceptions import ConnectionError

        with patch("astron_console.accounts.http.cache.add", side_effect=ConnectionError):
            result = self.post("/auth/login", {"username": "alice", "password": PASSWORD})
        self.assertEqual(result.status_code, 503)
        self.assertEqual(result.json()["code"], 503)

    def test_registration_hashes_password_and_creates_matching_profile(self):
        response = self.post(
            "/auth/register",
            {
                "username": "Alice",
                "password": PASSWORD,
                "passwordConfirm": PASSWORD,
            },
        )
        self.assertEqual(response.status_code, 201, response.content)
        uid = response.json()["data"]["uid"]
        user = User.objects.get(pk=uid)
        self.assertEqual(user.username, "alice")
        self.assertTrue(user.password.startswith("argon2$"))
        self.assertTrue(user.check_password(PASSWORD))
        self.assertFalse(user.is_superuser)
        self.assertTrue(UserProfile.objects.filter(uid=uid).exists())
        self.assertEqual(self.client.get("/user-info/me").json()["data"]["uid"], uid)
        self.assertNotIn("password", response.json()["data"])
        self.assertTrue(response.cookies[settings.SESSION_COOKIE_NAME]["httponly"])

    def test_registration_rejects_privileges_and_duplicate_names(self):
        payload = {"username": "alice", "password": PASSWORD, "passwordConfirm": PASSWORD}
        self.assertEqual(
            self.post("/auth/register", {**payload, "is_superuser": True}).status_code, 400
        )
        self.assertEqual(self.post("/auth/register", payload).status_code, 201)
        self.assertEqual(
            self.post("/auth/register", {**payload, "username": "ALICE"}).status_code, 400
        )
        self.assertEqual(User.objects.count(), 1)

    def test_weak_password_and_mismatch_are_rejected(self):
        for password, confirmation in [("123", "123"), (PASSWORD, "different")]:
            with self.subTest(password=password):
                result = self.post(
                    "/auth/register",
                    {
                        "username": "alice",
                        "password": password,
                        "passwordConfirm": confirmation,
                    },
                )
                self.assertEqual(result.status_code, 400)
        self.assertEqual(User.objects.count(), 0)

    def test_unimported_old_account_blocks_registration(self):
        UserProfile.objects.create(uid="old-owner", username="alice")
        result = self.post(
            "/auth/register",
            {
                "username": "alice",
                "password": PASSWORD,
                "passwordConfirm": PASSWORD,
            },
        )
        self.assertEqual(result.status_code, 503)
        self.assertFalse(User.objects.exists())

    def test_login_logout_and_session_rotation(self):
        self.create_user()
        session = self.client.session
        session["before_login"] = True
        session.save()
        old_session = session.session_key
        self.assertEqual(self.login().status_code, 200)
        self.assertNotEqual(old_session, self.client.session.session_key)
        saved_session = self.client.cookies[settings.SESSION_COOKIE_NAME].value
        self.assertEqual(self.client.get("/user-info/me").status_code, 200)
        self.assertEqual(self.post("/auth/logout", {}).status_code, 200)
        self.client.cookies[settings.SESSION_COOKIE_NAME] = saved_session
        self.assertEqual(self.client.get("/user-info/me").status_code, 401)

    def test_wrong_password_inactive_and_deleted_users_fail(self):
        user = self.create_user()
        self.assertEqual(
            self.post("/auth/login", {"username": "alice", "password": "wrong"}).status_code, 401
        )
        for changes in ({"account_status": 2}, {"account_status": 1, "deleted": 1}):
            UserProfile.objects.filter(uid=user.pk).update(**changes)
            self.assertEqual(self.login().status_code, 401)

    def test_disabling_account_revokes_existing_session(self):
        user = self.create_user()
        self.login()
        UserProfile.objects.filter(uid=user.pk).update(account_status=2)
        self.assertEqual(self.client.get("/user-info/me").status_code, 401)

    def test_csrf_required_on_login_registration_logout_and_reset(self):
        for path in ("login", "register", "logout", "reset-password"):
            with self.subTest(path=path):
                self.assertEqual(
                    self.client.post(
                        f"/auth/{path}", {}, content_type="application/json"
                    ).status_code,
                    403,
                )

    def test_cross_origin_csrf_is_rejected(self):
        self.create_user()
        token = self.client.get("/auth/csrf").json()["data"]["csrfToken"]
        result = self.client.post(
            "/auth/login",
            {"username": "alice", "password": PASSWORD},
            content_type="application/json",
            HTTP_X_CSRFTOKEN=token,
            HTTP_ORIGIN="https://untrusted.example",
        )
        self.assertEqual(result.status_code, 403)

    def test_profile_access_and_owner_fields(self):
        user = self.create_user()
        self.assertEqual(self.client.get("/user-info/me").status_code, 401)
        self.login()
        result = self.post("/user-info/update", {"nickname": "新昵称", "uid": "someone-else"})
        self.assertEqual(result.status_code, 400)
        result = self.post(
            "/user-info/update", {"nickname": "新昵称", "avatar": "https://example.org/avatar.png"}
        )
        self.assertEqual(result.json()["data"]["nickname"], "新昵称")
        self.assertEqual(result.json()["data"]["uid"], user.pk)
        self.assertEqual(
            self.post("/user-info/update", {"avatar": "javascript:alert(1)"}).status_code, 400
        )

    def test_old_uid_import_and_reset_link_single_use(self):
        UserProfile.objects.create(uid="old-uid", username="Alice", nickname="原昵称")
        call_command("import_legacy_users", stdout=io.StringIO())
        user = User.objects.get(pk="old-uid")
        self.assertFalse(user.has_usable_password())
        output = io.StringIO()
        call_command("issue_password_reset", username="Alice", stdout=output)
        self.assertIn("登录用户名：alice", output.getvalue())
        parsed = urlsplit(output.getvalue().strip().splitlines()[-1])
        self.assertFalse(parsed.query)
        fields = {k: v[0] for k, v in parse_qs(parsed.fragment).items()}
        payload = {**fields, "password": PASSWORD, "passwordConfirm": PASSWORD}
        self.assertEqual(self.post("/auth/reset-password", payload).status_code, 200)
        self.assertEqual(self.post("/auth/reset-password", payload).status_code, 400)
        self.assertEqual(self.login().json()["data"]["uid"], "old-uid")
        self.assertEqual(UserProfile.objects.get(uid="old-uid").nickname, "原昵称")

    def test_reset_command_finds_renamed_user_and_rejects_ambiguous_old_names(self):
        user = self.create_user(username="renamed-login")
        UserProfile.objects.filter(uid=user.pk).update(username="Original Name")
        output = io.StringIO()
        call_command("issue_password_reset", username="Original Name", stdout=output)
        self.assertIn("登录用户名：renamed-login", output.getvalue())
        other = self.create_user(username="another-login", uid="another-uid")
        UserProfile.objects.filter(uid=other.pk).update(username="Original Name")
        with self.assertRaisesMessage(CommandError, "--uid"):
            call_command("issue_password_reset", username="Original Name", stdout=io.StringIO())
        call_command("issue_password_reset", uid=user.pk, stdout=io.StringIO())

    def test_expired_reset_and_wrong_uid_are_rejected(self):
        user = self.create_user()
        payload = self.reset_payload(user)
        now = default_token_generator._now()
        with patch.object(default_token_generator, "_now", return_value=now + timedelta(hours=2)):
            self.assertEqual(self.post("/auth/reset-password", payload).status_code, 400)
        payload["uid"] = urlsafe_base64_encode(b"other-user")
        self.assertEqual(self.post("/auth/reset-password", payload).status_code, 400)

    def test_disabled_user_cannot_reset(self):
        user = self.create_user()
        payload = self.reset_payload(user)
        UserProfile.objects.filter(uid=user.pk).update(deleted=1)
        self.assertEqual(self.post("/auth/reset-password", payload).status_code, 400)
        with self.assertRaises(CommandError):
            call_command("issue_password_reset", uid=user.pk, stdout=io.StringIO())

    def test_reset_and_change_password_invalidate_other_sessions(self):
        user = self.create_user()
        other = Client(enforce_csrf_checks=True)
        self.login()
        self.login(other)
        result = self.post(
            "/auth/change-password",
            {
                "oldPassword": PASSWORD,
                "password": NEW_PASSWORD,
                "passwordConfirm": NEW_PASSWORD,
            },
        )
        self.assertEqual(result.status_code, 200)
        self.assertEqual(self.client.get("/user-info/me").status_code, 200)
        self.assertEqual(other.get("/user-info/me").status_code, 401)
        user.refresh_from_db()
        payload = {**self.reset_payload(user), "password": PASSWORD, "passwordConfirm": PASSWORD}
        self.assertEqual(self.post("/auth/reset-password", payload).status_code, 200)
        self.assertEqual(self.client.get("/user-info/me").status_code, 401)

    def test_import_is_idempotent_and_does_not_override_password(self):
        user = self.create_user()
        before = user.password
        call_command("import_legacy_users", stdout=io.StringIO())
        user.refresh_from_db()
        self.assertEqual(user.password, before)

    def test_import_conflicts_fail_atomically_with_mapping_support(self):
        UserProfile.objects.create(uid="uid-a", username="alice")
        UserProfile.objects.create(uid="uid-b", username="ALICE")
        with self.assertRaises(CommandError):
            call_command("import_legacy_users", stdout=io.StringIO())
        self.assertFalse(User.objects.exists())
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "names.json"
            path.write_text(json.dumps({"uid-b": "alice-two"}))
            call_command("import_legacy_users", username_map=str(path), stdout=io.StringIO())
        self.assertEqual(set(User.objects.values_list("id", flat=True)), {"uid-a", "uid-b"})

    def test_rate_limit_cannot_be_bypassed_with_forged_forward_header(self):
        for _ in range(30):
            self.post("/auth/login", {"username": "missing", "password": "wrong"})
        csrf = self.client.get("/auth/csrf").json()["data"]["csrfToken"]
        result = self.client.post(
            "/auth/login",
            {},
            content_type="application/json",
            HTTP_X_CSRFTOKEN=csrf,
            HTTP_X_REAL_IP="8.8.8.8",
        )
        self.assertEqual(result.status_code, 429)

    @override_settings(CONSOLE_TRUSTED_PROXIES=["127.0.0.1/32"])
    def test_trusted_proxy_uses_distinct_real_addresses(self):
        from astron_console.accounts.http import source_address

        request = self.client.request().wsgi_request
        request.META.update(REMOTE_ADDR="127.0.0.1", HTTP_X_REAL_IP="192.0.2.1")
        self.assertEqual(source_address(request), "192.0.2.1")

    def test_bad_json_and_reset_identifiers_are_errors_not_server_errors(self):
        token = self.client.get("/auth/csrf").json()["data"]["csrfToken"]
        self.assertEqual(
            self.client.post(
                "/auth/login", "[]", content_type="application/json", HTTP_X_CSRFTOKEN=token
            ).status_code,
            400,
        )
        for uid in (None, 42, [], "not-valid-base64"):
            with self.subTest(uid=uid):
                self.assertEqual(
                    self.post("/auth/reset-password", {"uid": uid, "token": "bad"}).status_code, 400
                )


class DeploymentConfigurationTests(SimpleTestCase):
    def test_internal_credentials_load_from_compose_files_and_helm_environment(self):
        credentials = {
            "WORKFLOW_INTERNAL_API_KEY": "workflow-fixture-" + "w" * 32,
            "SKILL_SANDBOX_RUNTIME_CREDENTIAL_TOKEN": "runtime-fixture-" + "r" * 32,
            "SKILL_SANDBOX_ARTIFACT_UPLOAD_TOKEN": "artifact-fixture-" + "a" * 32,
        }
        with tempfile.TemporaryDirectory() as directory:
            files = {name: Path(directory) / name.lower() for name in credentials}
            for name, path in files.items():
                path.write_text(credentials[name] + "\n")
            for source in ("file", "environment"):
                with self.subTest(source=source):
                    env = dict(os.environ)
                    for name in credentials:
                        env.pop(name, None)
                        env.pop(name + "_FILE", None)
                    env.update(
                        {
                            "DJANGO_SETTINGS_MODULE": "astron_console.settings",
                            "CONSOLE_DATABASE_ENGINE": "sqlite",
                            "CONSOLE_SQLITE_PATH": ":memory:",
                            "CONSOLE_ALLOWED_HOSTS": "console-hub",
                            "EXPECTED_CREDENTIALS": json.dumps(credentials),
                        }
                    )
                    env.update(
                        {name + "_FILE": str(path) for name, path in files.items()}
                        if source == "file"
                        else credentials
                    )
                    result = subprocess.run(
                        [
                            sys.executable,
                            "-c",
                            """
import django, json, os
django.setup()
from django.conf import settings
from django.db import connection
from django.test import Client
from astron_console.resources.models import Model, WorkflowScope
credentials = json.loads(os.environ['EXPECTED_CREDENTIALS'])
assert all(getattr(settings, name) == value for name, value in credentials.items())
with connection.schema_editor() as editor:
    editor.create_model(Model)
    editor.create_model(WorkflowScope)
WorkflowScope.objects.create(id=7, flow_id='retained-flow', uid='retained-uid')
model = Model.objects.create(uid='retained-uid', provider='openai',
                            url='https://model.example.org/v1', domain='fixture-model',
                            api_key='fixture-model-key')
client = Client(HTTP_HOST='console-hub:8080')
contracts = [
    (client.get, '/model/internal-runtime-config',
     {'flowId': 'retained-flow', 'modelId': model.pk},
     'HTTP_X_WORKFLOW_INTERNAL_KEY', 'WORKFLOW_INTERNAL_API_KEY'),
    (client.get, '/skill-sandbox/internal-runtime-config', {},
     'HTTP_X_SKILL_SANDBOX_RUNTIME_CREDENTIAL_TOKEN', 'SKILL_SANDBOX_RUNTIME_CREDENTIAL_TOKEN'),
    (client.post, '/workflow/artifacts/internal-upload', {},
     'HTTP_X_SKILL_SANDBOX_ARTIFACT_TOKEN', 'SKILL_SANDBOX_ARTIFACT_UPLOAD_TOKEN'),
]
statuses = []
for call, url, data, header, name in contracts:
    rejected = call(url, data, **{header: 'incorrect-token'})
    accepted = call(url, data, **{header: credentials[name]})
    statuses.append([rejected.status_code, accepted.status_code])
    if name == 'WORKFLOW_INTERNAL_API_KEY':
        assert accepted.json()['data']['apiKey'] == 'fixture-model-key'
        assert accepted['Cache-Control'] == 'no-store'
print(json.dumps(statuses))
""",
                        ],
                        cwd=settings.BASE_DIR,
                        env=env,
                        capture_output=True,
                        text=True,
                        timeout=30,
                    )
                    self.assertEqual(result.returncode, 0, result.stderr)
                    # Runtime and upload reach payload validation without UID/file.
                    self.assertEqual(
                        json.loads(result.stdout), [[403, 200], [403, 400], [403, 400]]
                    )
                    for name, path in files.items():
                        self.assertEqual(path.read_bytes(), (credentials[name] + "\n").encode())

    def test_public_and_internal_hosts_reach_business_auth_without_allowing_other_hosts(self):
        # These are the Compose and custom-name Helm forms. Their assembly from
        # user values and caller URLs is checked by the deployment render gates.
        for internal_host in ("console-hub", "custom-release-console-hub"):
            with self.subTest(internal_host=internal_host):
                result = subprocess.run(
                    [
                        sys.executable,
                        "-c",
                        """
import django, json, os
django.setup()
from django.test import Client
client = Client()
host = os.environ['INTERNAL_TEST_HOST'] + ':8080'
requests = [
    client.get('/health', HTTP_HOST='console.example.org'),
    client.get('/skill-sandbox/internal-runtime-config', HTTP_HOST=host),
    client.get('/model/internal-runtime-config', HTTP_HOST=host),
    client.post('/workflow/artifacts/internal-upload', HTTP_HOST=host),
    client.get('/skill-sandbox/internal-runtime-config', HTTP_HOST=host,
               HTTP_X_SKILL_SANDBOX_RUNTIME_CREDENTIAL_TOKEN='host-test-token-12345678901234567'),
    client.get('/health', HTTP_HOST='untrusted.example.org'),
]
print(json.dumps({'statuses': [r.status_code for r in requests],
                  'auth_codes': [r.json()['code'] for r in requests[1:4]],
                  'scope_message': requests[4].json()['message']}))
""",
                    ],
                    cwd=settings.BASE_DIR,
                    env={
                        **os.environ,
                        "DJANGO_SETTINGS_MODULE": "astron_console.settings",
                        "CONSOLE_ALLOWED_HOSTS": f"console.example.org,{internal_host}",
                        "INTERNAL_TEST_HOST": internal_host,
                        "SKILL_SANDBOX_RUNTIME_CREDENTIAL_TOKEN": (
                            "host-test-token-12345678901234567"
                        ),
                    },
                    capture_output=True,
                    text=True,
                    timeout=30,
                )
                self.assertEqual(result.returncode, 0, result.stderr)
                payload = json.loads(result.stdout)
                self.assertEqual(payload["statuses"], [200, 403, 403, 403, 400, 400])
                self.assertEqual(payload["auth_codes"], [403, 403, 403])
                self.assertIn("uid", payload["scope_message"])

    def test_public_hostname_keeps_loopback_healthcheck_and_rejects_unknown_hosts(self):
        result = subprocess.run(
            [
                sys.executable,
                "-c",
                "import django, json; django.setup(); from django.test import Client; "
                "print(json.dumps([Client().get('/health', HTTP_HOST=host).status_code "
                "for host in ['console.example.org', 'localhost:8080', '127.0.0.1:8080', "
                "'untrusted.example.org']]))",
            ],
            cwd=settings.BASE_DIR,
            env={
                **os.environ,
                "DJANGO_SETTINGS_MODULE": "astron_console.settings",
                "CONSOLE_ALLOWED_HOSTS": "console.example.org",
            },
            capture_output=True,
            text=True,
            timeout=30,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout), [200, 200, 200, 400])


class LegacySchemaTests(SimpleTestCase):
    def test_existing_profile_and_resource_tables_survive_migration(self):
        with tempfile.TemporaryDirectory() as directory:
            db = Path(directory) / "legacy.sqlite3"
            connection = sqlite3.connect(db)
            connection.executescript("""
                CREATE TABLE user_info (
                  id INTEGER PRIMARY KEY, uid VARCHAR(128) UNIQUE, username VARCHAR(255),
                  avatar VARCHAR(512), nickname VARCHAR(255), mobile VARCHAR(255),
                  account_status SMALLINT, enterprise_service_type INTEGER,
                  user_agreement SMALLINT, deleted SMALLINT,
                  create_time DATETIME, update_time DATETIME
                );
                INSERT INTO user_info VALUES
                    (7, 'owner-uid', 'old-user', '', '原昵称', '', 1, 0, 1, 0,
                    '2026-01-01 12:00:00', '2026-01-01 12:00:00');
                CREATE TABLE retained_agent (id INTEGER PRIMARY KEY, uid VARCHAR(128), prompt TEXT);
                INSERT INTO retained_agent VALUES (10, 'owner-uid', 'existing prompt');
            """)
            connection.commit()
            before = connection.execute("SELECT * FROM user_info").fetchall()
            env = {
                **os.environ,
                "CONSOLE_SQLITE_PATH": str(db),
                "DJANGO_SETTINGS_MODULE": "astron_console.settings",
            }
            for command in (["migrate", "--noinput"], ["import_legacy_users"]):
                result = subprocess.run(
                    [sys.executable, "manage.py", *command],
                    cwd=settings.BASE_DIR,
                    env=env,
                    capture_output=True,
                    text=True,
                    timeout=60,
                )
                self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(connection.execute("SELECT * FROM user_info").fetchall(), before)
            self.assertEqual(
                connection.execute("SELECT uid, prompt FROM retained_agent").fetchone(),
                ("owner-uid", "existing prompt"),
            )
            self.assertEqual(
                connection.execute("SELECT id FROM console_auth_user").fetchone()[0], "owner-uid"
            )
            connection.close()
