"""Default IP access retains authentication, CSRF and transport boundaries."""

import io
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

from django.conf import settings
from django.core.cache import cache
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import Client, SimpleTestCase, TestCase, override_settings

from astron_console.accounts.deployment import public_origin
from astron_console.accounts.models import User, UserProfile

PASSWORD = "River-Notebook-Deployment-729!"


@override_settings(
    ALLOWED_HOSTS=["*"],
    CONSOLE_AUTO_ALLOWED_HOSTS=True,
    CONSOLE_AUTO_COOKIE_SECURE=True,
    SESSION_COOKIE_SECURE=False,
    CSRF_COOKIE_SECURE=False,
    CONSOLE_PUBLIC_ORIGIN="",
    CSRF_TRUSTED_ORIGINS=[],
    CONSOLE_TRUSTED_PROXIES=[],
)
class AutomaticDeploymentTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(username="ip-user", password=PASSWORD)
        UserProfile.objects.create(uid=self.user.pk, username=self.user.username)

    def login(self, host, *, secure=False, origin=None, **headers):
        client = Client(enforce_csrf_checks=True, HTTP_HOST=host)
        token_response = client.get("/auth/csrf", secure=secure, **headers)
        token = token_response.json()["data"]["csrfToken"]
        response = client.post(
            "/auth/login",
            {"username": self.user.username, "password": PASSWORD},
            content_type="application/json",
            secure=secure,
            HTTP_X_CSRFTOKEN=token,
            HTTP_ORIGIN=origin or ("https://" if secure else "http://") + host,
            **headers,
        )
        return client, token_response, response

    def test_actual_ip_port_and_ipv6_login_without_environment_overrides(self):
        for host in ["192.0.2.15:18888", "192.168.10.25", "[2001:db8::15]:18888", "localhost:3000"]:
            with self.subTest(host=host):
                client, _, response = self.login(host)
                self.assertEqual(response.status_code, 200, response.content)
                self.assertFalse(response.cookies[settings.SESSION_COOKIE_NAME]["secure"])
                self.assertEqual(client.get("/user-info/me").json()["data"]["uid"], self.user.pk)
                self.assertEqual(public_origin(response.wsgi_request), "http://" + host)
                # Origin and token are both needed for an authenticated state change.
                result = client.post("/auth/logout", {}, content_type="application/json")
                self.assertEqual(result.status_code, 403)

    def test_foreign_origin_is_rejected_even_with_valid_csrf_token(self):
        for origin in ["http://evil.example", "http://192.0.2.15", "http://192.0.2.16:18888"]:
            _, _, response = self.login("192.0.2.15:18888", origin=origin)
            self.assertEqual(response.status_code, 403)

    def test_automatic_hosts_reject_dns_names_and_malformed_authorities(self):
        for host in [
            "evil.example",
            "localhost.evil.example",
            "192.0.2.1@evil.example",
            "bad host",
            "localhost:80@evil",
        ]:
            self.assertEqual(Client().get("/health", HTTP_HOST=host).status_code, 400, host)

    def test_explicit_host_policy_stays_restrictive(self):
        with override_settings(CONSOLE_AUTO_ALLOWED_HOSTS=False, ALLOWED_HOSTS=["app.example"]):
            self.assertEqual(Client().get("/health", HTTP_HOST="app.example").status_code, 200)
            self.assertEqual(Client().get("/health", HTTP_HOST="192.0.2.15").status_code, 400)

    def test_https_sets_secure_cookies_and_requires_matching_origin(self):
        _, token, response = self.login("192.0.2.15:18888", secure=True)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(token.cookies[settings.CSRF_COOKIE_NAME]["secure"])
        self.assertTrue(response.cookies[settings.SESSION_COOKIE_NAME]["secure"])
        self.assertEqual(public_origin(response.wsgi_request), "https://192.0.2.15:18888")
        _, _, rejected = self.login(
            "192.0.2.15:18888", secure=True, origin="http://192.0.2.15:18888"
        )
        self.assertEqual(rejected.status_code, 403)

    def test_forwarded_scheme_only_trusted_from_configured_proxy(self):
        headers = {"HTTP_X_FORWARDED_PROTO": "https", "REMOTE_ADDR": "192.0.2.2"}
        _, token, response = self.login("192.0.2.15:18888", **headers)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertFalse(token.cookies[settings.CSRF_COOKIE_NAME]["secure"])
        self.assertEqual(public_origin(response.wsgi_request), "http://192.0.2.15:18888")
        with override_settings(CONSOLE_TRUSTED_PROXIES=["192.0.2.2/32"]):
            _, token, response = self.login(
                "192.0.2.15:18888", origin="https://192.0.2.15:18888", **headers
            )
            self.assertEqual(response.status_code, 200, response.content)
            self.assertTrue(token.cookies[settings.CSRF_COOKIE_NAME]["secure"])
            self.assertTrue(response.cookies[settings.SESSION_COOKIE_NAME]["secure"])

    def test_explicit_secure_cookie_and_origin_are_respected(self):
        with override_settings(
            CONSOLE_AUTO_COOKIE_SECURE=False,
            SESSION_COOKIE_SECURE=True,
            CSRF_COOKIE_SECURE=True,
            CONSOLE_PUBLIC_ORIGIN="https://public.example",
        ):
            _, token, response = self.login("192.0.2.15:18888")
            self.assertEqual(response.status_code, 200)
            self.assertTrue(token.cookies[settings.CSRF_COOKIE_NAME]["secure"])
            self.assertTrue(response.cookies[settings.SESSION_COOKIE_NAME]["secure"])
            self.assertEqual(public_origin(response.wsgi_request), "https://public.example")

    def test_offline_reset_uses_relative_path_or_explicit_origin(self):
        output = io.StringIO()
        call_command("issue_password_reset", uid=self.user.pk, stdout=output)
        self.assertTrue(output.getvalue().splitlines()[-1].startswith("/reset-password#"))
        output = io.StringIO()
        call_command(
            "issue_password_reset",
            uid=self.user.pk,
            origin="http://192.0.2.15:18888",
            stdout=output,
        )
        self.assertTrue(
            output.getvalue().splitlines()[-1].startswith("http://192.0.2.15:18888/reset-password#")
        )
        for origin in [
            "https://evil.example/path",
            "https://user:password@evil.example",
            "//evil.example",
        ]:
            with self.assertRaises(CommandError):
                call_command(
                    "issue_password_reset", uid=self.user.pk, origin=origin, stdout=io.StringIO()
                )


class DefaultSettingsTests(SimpleTestCase):
    def test_imported_signing_key_preserves_sessions_and_reset_tokens(self):
        key = "  existing-deployment-signing-key-" * 3 + "  "
        environment = {
            name: value for name, value in os.environ.items() if not name.startswith("CONSOLE_")
        }
        environment.update(
            DJANGO_SETTINGS_MODULE="astron_console.settings",
            CONSOLE_SECRET_KEY=key,
            CONSOLE_DATABASE_ENGINE="sqlite",
            CONSOLE_SQLITE_PATH=":memory:",
        )
        setup = """
import django, json, os
django.setup()
from django.core import signing
from django.contrib.auth.tokens import default_token_generator
from astron_console.accounts.models import User
user = User(id='isolated-upgrade-test', username='upgrade', password='unchanged-hash')
"""
        before = subprocess.run(
            [
                sys.executable,
                "-c",
                setup
                + """
print(json.dumps({'session': signing.dumps({'uid': user.pk}),
                  'auth_hash': user.get_session_auth_hash(),
                  'reset': default_token_generator.make_token(user)}))
""",
            ],
            cwd=settings.BASE_DIR,
            env=environment,
            capture_output=True,
            text=True,
            timeout=30,
        )
        self.assertEqual(before.returncode, 0, before.stderr)
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "secret-key"
            path.write_text(key + "\n")
            environment.pop("CONSOLE_SECRET_KEY")
            environment.update(CONSOLE_SECRET_KEY_FILE=str(path), PRIOR_STATE=before.stdout)
            after = subprocess.run(
                [
                    sys.executable,
                    "-c",
                    setup
                    + """
prior = json.loads(os.environ['PRIOR_STATE'])
assert signing.loads(prior['session']) == {'uid': user.pk}
assert user.get_session_auth_hash() == prior['auth_hash']
assert default_token_generator.check_token(user, prior['reset'])
""",
                ],
                cwd=settings.BASE_DIR,
                env=environment,
                capture_output=True,
                text=True,
                timeout=30,
            )
            self.assertEqual(after.returncode, 0, after.stderr)

    def test_actual_production_settings_default_to_ip_access_and_automatic_cookies(self):
        environment = {
            key: value for key, value in os.environ.items() if not key.startswith("CONSOLE_")
        }
        environment.update(
            DJANGO_SETTINGS_MODULE="astron_console.settings",
            CONSOLE_SECRET_KEY="isolated-deployment-settings-key-" * 3,
            CONSOLE_DATABASE_ENGINE="sqlite",
            CONSOLE_SQLITE_PATH=":memory:",
        )
        result = subprocess.run(
            [
                sys.executable,
                "-c",
                """
import django, json
from django.conf import settings
from django.test import Client
django.setup()
assert settings.CONSOLE_AUTO_COOKIE_SECURE
assert settings.CONSOLE_AUTO_ALLOWED_HOSTS
assert settings.CONSOLE_PUBLIC_ORIGIN == ''
assert settings.CSRF_TRUSTED_ORIGINS == []
hosts = ['192.0.2.15:18888', '[2001:db8::1]:80', 'console-hub:8080', 'evil.example']
print(json.dumps([Client().get('/health', HTTP_HOST=h).status_code for h in hosts]))
""",
            ],
            cwd=settings.BASE_DIR,
            env=environment,
            capture_output=True,
            text=True,
            timeout=30,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout), [200, 200, 200, 400])
