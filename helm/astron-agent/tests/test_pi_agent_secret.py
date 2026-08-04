from __future__ import annotations

import os
import subprocess
import unittest
from pathlib import Path


class PiAgentHelmSecretTest(unittest.TestCase):
    def setUp(self) -> None:
        self.chart_dir = Path(__file__).resolve().parents[1]
        self.helm = os.environ.get("HELM_BIN", "helm")

    def render(
        self,
        secret: str | None = None,
        values: list[str] | None = None,
    ) -> subprocess.CompletedProcess[str]:
        command = [self.helm, "template", "test", str(self.chart_dir)]
        if secret is not None:
            command.extend(
                ["--set-string", f"corePiAgent.internalSecret={secret}"]
            )
        for value in values or []:
            command.extend(["--set", value])
        return subprocess.run(
            command,
            check=False,
            capture_output=True,
            text=True,
        )

    def test_chart_requires_operator_provided_internal_secret(self) -> None:
        result = self.render()

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("corePiAgent.internalSecret is required", result.stderr)

    def test_chart_rejects_the_published_placeholder(self) -> None:
        result = self.render("change-me-in-production")

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("must not use the published placeholder", result.stderr)

    def test_chart_renders_one_secret_for_both_services(self) -> None:
        secret = "operator-generated-5f7d90ad35de4a0e8abfe241d4f46f10"
        result = self.render(secret)

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn(f'internal-secret: "{secret}"', result.stdout)
        self.assertGreaterEqual(
            result.stdout.count("name: PI_AGENT_INTERNAL_SECRET"), 2
        )
        self.assertGreaterEqual(result.stdout.count("key: internal-secret"), 2)

    def test_chart_omits_pi_secret_reference_when_pi_runtime_is_disabled(self) -> None:
        result = self.render(values=["corePiAgent.enabled=false"])

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("name: astron-agent-core-agent", result.stdout)
        self.assertNotIn("astron-agent-core-pi-agent-secret", result.stdout)
        self.assertNotIn("name: PI_AGENT_INTERNAL_SECRET", result.stdout)


if __name__ == "__main__":
    unittest.main()
