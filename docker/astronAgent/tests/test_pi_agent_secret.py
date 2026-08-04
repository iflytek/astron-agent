from __future__ import annotations

import json
import os
import subprocess
import unittest
from pathlib import Path


class PiAgentComposeSecretTest(unittest.TestCase):
    def setUp(self) -> None:
        self.compose_dir = Path(__file__).resolve().parents[1]
        self.compose_file = self.compose_dir / "docker-compose.yaml"

    def render(self, secret: str | None) -> subprocess.CompletedProcess[str]:
        environment = os.environ.copy()
        environment.pop("PI_AGENT_INTERNAL_SECRET", None)
        if secret is not None:
            environment["PI_AGENT_INTERNAL_SECRET"] = secret
        return subprocess.run(
            [
                "docker",
                "compose",
                "--project-directory",
                str(self.compose_dir),
                "-f",
                str(self.compose_file),
                "config",
                "--format",
                "json",
            ],
            check=False,
            capture_output=True,
            text=True,
            env=environment,
        )

    def test_compose_requires_operator_provided_internal_secret(self) -> None:
        result = self.render(None)

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("PI_AGENT_INTERNAL_SECRET", result.stderr)

    def test_compose_passes_one_operator_secret_to_both_services(self) -> None:
        secret = "operator-generated-5f7d90ad35de4a0e8abfe241d4f46f10"
        result = self.render(secret)

        self.assertEqual(result.returncode, 0, result.stderr)
        services = json.loads(result.stdout)["services"]
        self.assertEqual(
            services["core-pi-agent"]["environment"]["PI_AGENT_INTERNAL_SECRET"],
            secret,
        )
        self.assertEqual(
            services["core-agent"]["environment"]["PI_AGENT_INTERNAL_SECRET"],
            secret,
        )


if __name__ == "__main__":
    unittest.main()
