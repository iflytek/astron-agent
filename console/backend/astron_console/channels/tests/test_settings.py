"""Exercise the production settings module rather than override_settings fixtures."""

import os
import subprocess
import sys
import tempfile
from pathlib import Path

from django.test import SimpleTestCase


class WechatSettingsTests(SimpleTestCase):
    def test_environment_and_secret_files_load_into_production_configuration(self):
        names = (
            "WECHAT_COMPONENT_APPID",
            "WECHAT_COMPONENT_SECRET",
            "WECHAT_TOKEN",
            "WECHAT_ENCODING_AES_KEY",
            "WECHAT_REDIRECT_URL",
        )
        env = {key: value for key, value in os.environ.items() if not key.startswith("WECHAT_")}
        env.update(
            DJANGO_SETTINGS_MODULE="astron_console.settings",
            CONSOLE_SECRET_KEY="settings-isolated-test-key-" * 4,
            CONSOLE_DATABASE_ENGINE="sqlite",
            CONSOLE_SQLITE_PATH=":memory:",
        )
        code = (
            "import django; django.setup(); "
            "from django.conf import settings; "
            "from astron_console.channels.clients import configuration; "
            f"names={names!r}; "
            "assert all(getattr(settings,n)=='loaded-'+n for n in names); "
            "assert configuration()=={n:'loaded-'+n for n in names[:4]}"
        )
        for name in names:
            env[name] = "loaded-" + name
        result = subprocess.run(
            [sys.executable, "-c", code], env=env, capture_output=True, text=True
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        with tempfile.TemporaryDirectory() as directory:
            for name in names:
                path = Path(directory) / name
                path.write_text("loaded-" + name + "\n")
                env[name] = "ignored-inline-value"
                env[name + "_FILE"] = str(path)
            result = subprocess.run(
                [sys.executable, "-c", code], env=env, capture_output=True, text=True
            )
        self.assertEqual(result.returncode, 0, result.stderr)
