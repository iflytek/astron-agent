"""Load deployed tenant credentials through the real production settings module."""

import os
import subprocess
import sys
import tempfile
from pathlib import Path

import yaml
from django.test import SimpleTestCase


class TenantDeploymentSettingsTests(SimpleTestCase):
    def test_compose_mount_is_consumed_by_console_settings(self):
        repository = Path(__file__).resolve().parents[5]
        compose = yaml.safe_load(
            (repository / "docker/astronAgent/docker-compose.yaml").read_text()
        )
        hub = compose["services"]["console-hub"]
        tenant = compose["services"]["core-tenant"]
        path = tenant["environment"]["TENANT_SECRET_FILE"]
        self.assertEqual(hub["environment"].get("TENANT_SECRET_FILE"), path)
        self.assertIn("tenant_bootstrap_secrets:/app/secrets/tenant:ro", hub["volumes"])
        self.assertIn("tenant_bootstrap_secrets:/app/secrets/tenant:ro", tenant["volumes"])
        self.assertEqual(
            hub["environment"]["TENANT_URL"],
            "${TENANT_URL:-http://core-tenant:${CORE_TENANT_PORT:-5052}}",
        )
        with tempfile.TemporaryDirectory() as directory:
            credential = Path(directory) / "tenant-secret"
            credential.write_text("isolated-existing-tenant-secret\n")
            # Model the named volume's path mapping without touching deployment files.
            environment = {
                key: str(credential) if value == path else value
                for key, value in hub["environment"].items()
                if key in {"TENANT_SECRET_FILE", "TENANT_INTERNAL_API_KEY_FILE"}
            }
            self.load_settings(environment, "http://core-tenant:15052", succeeds=True)
            # A mount alone is insufficient: the original missing-env deployment must fail.
            self.load_settings({}, "http://core-tenant:15052", succeeds=False)
            self.assertEqual(credential.read_text(), "isolated-existing-tenant-secret\n")

    def test_helm_secret_environment_remains_supported(self):
        self.load_settings(
            {"TENANT_SECRET": "isolated-existing-tenant-secret"},
            "http://release-core-tenant:5052",
            succeeds=True,
        )

    def load_settings(self, credentials, endpoint, *, succeeds):
        environment = {
            key: value
            for key, value in os.environ.items()
            if not key.startswith(("TENANT_", "CONSOLE_SECRET_KEY")) and not key.endswith("_FILE")
        }
        environment.update(
            credentials,
            DJANGO_SETTINGS_MODULE="astron_console.settings",
            CONSOLE_SECRET_KEY="isolated-console-settings-key-" * 3,
            CONSOLE_DATABASE_ENGINE="sqlite",
            CONSOLE_SQLITE_PATH=":memory:",
            TENANT_URL=endpoint,
        )
        result = subprocess.run(
            [
                sys.executable,
                "-c",
                "import django; django.setup(); from django.conf import settings; "
                "assert settings.TENANT_INTERNAL_API_KEY == 'isolated-existing-tenant-secret'; "
                f"assert settings.TENANT_URL == {endpoint!r}",
            ],
            cwd=Path(__file__).resolve().parents[3],
            env=environment,
            capture_output=True,
            text=True,
            timeout=30,
        )
        if succeeds:
            self.assertEqual(result.returncode, 0, result.stderr)
        else:
            self.assertNotEqual(result.returncode, 0)
