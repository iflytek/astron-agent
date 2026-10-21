"""Default authentication deployment must not need a local helper image."""

import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class AuthenticationDeploymentTests(unittest.TestCase):
    def test_all_auth_bundles_start_without_password_helper(self):
        commands = []
        if shutil.which("docker"):
            commands.append(["docker", "compose"])
        if shutil.which("docker-compose"):
            commands.append(["docker-compose"])
        self.assertTrue(
            commands, "Docker Compose is required for deployment regression"
        )
        with tempfile.TemporaryDirectory(prefix="casdoor-compose-") as temporary:
            work = Path(temporary)
            (work / "astronRPA").mkdir()
            for filename in (
                "docker-compose-auth.yml",
                "docker-compose-with-auth.yaml",
                "docker-compose-with-auth-rpa.yaml",
                "docker-compose.yaml",
                ".env.with-rpa",
                "astronRPA/docker-compose.yml",
            ):
                shutil.copyfile(ROOT / filename, work / filename)
            # Use checked-in examples, never a developer's deployment secrets.
            shutil.copyfile(ROOT / ".env.example", work / ".env")
            (work / "astronRPA/.env").write_text("", encoding="utf-8")
            self.check_bundles(commands, work)

    def check_bundles(self, commands, work):
        for filename in (
            "docker-compose-auth.yml",
            "docker-compose-with-auth.yaml",
            "docker-compose-with-auth-rpa.yaml",
        ):
            with self.subTest(compose=filename):
                result = None
                for command in commands:
                    result = subprocess.run(
                        command
                        + [
                            "-f",
                            filename,
                            "--profile",
                            "*",
                            "config",
                            "--format",
                            "json",
                        ],
                        cwd=work,
                        capture_output=True,
                        text=True,
                        timeout=30,
                        check=False,
                    )
                    if result.returncode == 0:
                        break
                self.assertIsNotNone(result)
                self.assertEqual(result.returncode, 0, "Compose render failed")
                services = json.loads(result.stdout)["services"]
                self.assertNotIn("casdoor-password-check", services)
                self.assertNotIn("casdoor-passwords", services)
                self.assertEqual(
                    set(services["casdoor-gateway"]["depends_on"]), {"casdoor"}
                )
                for service in services.values():
                    self.assertNotIn(
                        "astron-agent-casdoor-passwords", service.get("image", "")
                    )
                    build = service.get("build", {})
                    self.assertNotIn("password-storage", str(build))


if __name__ == "__main__":
    unittest.main()
