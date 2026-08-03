from __future__ import annotations

import json
import os
import subprocess
import unittest
from pathlib import Path


class TraceComposeTest(unittest.TestCase):
    def test_default_compose_renders_a_lightweight_workflow_trace_pipeline(self) -> None:
        compose_dir = Path(__file__).resolve().parents[1]
        environment = os.environ.copy()
        environment["KAFKA_ENABLE"] = ""
        result = subprocess.run(
            [
                "docker",
                "compose",
                "--project-directory",
                str(compose_dir),
                "-f",
                str(compose_dir / "docker-compose.yaml"),
                "config",
                "--format",
                "json",
            ],
            check=True,
            capture_output=True,
            text=True,
            env=environment,
        )
        services = json.loads(result.stdout)["services"]

        self.assertIn("elasticsearch", services)
        self.assertNotIn("kafka", services)
        self.assertNotIn("logstash", services)

        workflow = services["core-workflow"]
        self.assertEqual(workflow["environment"]["KAFKA_ENABLE"], "0")
        self.assertEqual(
            workflow["environment"]["WORKFLOW_TRACE_ES_URL"],
            "http://elasticsearch:9200",
        )
        self.assertNotIn("kafka", workflow["depends_on"])
        self.assertNotIn("logstash", workflow["depends_on"])
        self.assertEqual(
            workflow["depends_on"]["elasticsearch"]["condition"],
            "service_healthy",
        )

        hub = services["console-hub"]
        self.assertEqual(
            hub["environment"]["WORKFLOW_TRACE_ES_URL"],
            "http://elasticsearch:9200",
        )
        self.assertEqual(
            hub["environment"]["WORKFLOW_TRACE_ES_INDEX"],
            "spark-agent-builder-*",
        )
        self.assertEqual(
            hub["depends_on"]["elasticsearch"]["condition"], "service_healthy"
        )

    def test_kafka_trace_profile_remains_available(self) -> None:
        compose_dir = Path(__file__).resolve().parents[1]
        result = subprocess.run(
            [
                "docker",
                "compose",
                "--project-directory",
                str(compose_dir),
                "-f",
                str(compose_dir / "docker-compose.yaml"),
                "--profile",
                "trace-kafka",
                "config",
                "--format",
                "json",
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        services = json.loads(result.stdout)["services"]
        self.assertEqual(services["kafka"]["profiles"], ["trace-kafka"])
        self.assertEqual(services["logstash"]["profiles"], ["trace-kafka"])

        logstash = services["logstash"]
        self.assertEqual(
            logstash["depends_on"]["kafka"]["condition"], "service_healthy"
        )
        self.assertEqual(
            logstash["depends_on"]["elasticsearch"]["condition"],
            "service_healthy",
        )


if __name__ == "__main__":
    unittest.main()
