"""Exercise the repository Makefile with isolated projects and failing tool stubs."""

import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
MAKE = shutil.which("make")
STUB = r"""
import json
import os
from pathlib import Path
import sys

tool = Path(sys.argv[0]).name
args = sys.argv[1:]
project = str(Path.cwd().relative_to(os.environ["FIXTURE_ROOT"]))
with open(os.environ["TOOL_LOG"], "a") as output:
    output.write(json.dumps({"tool": tool, "args": args, "project": project}) + "\n")
prefix = json.loads(os.environ.get("FAIL_ARGS", "[]"))
if (tool == os.environ.get("FAIL_TOOL")
        and args[:len(prefix)] == prefix
        and project == os.environ.get("FAIL_PROJECT", project)):
    sys.exit(29)
if tool == "child-make" and args[-1] == os.environ.get("FAIL_TARGET"):
    sys.exit(31)
if tool == "go":
    if args[:2] == ["env", "GOPATH"]:
        print(os.environ["FIXTURE_ROOT"])
    elif args[:1] == ["list"]:
        print("example.test/tenant")
    elif args[:1] == ["build"]:
        if args != ["build", "-o", "bin/server", "."]:
            sys.exit("build must use the root main package and retain bin/server")
        Path("bin/server").write_text("stub binary")
"""


@unittest.skipUnless(MAKE, "GNU Make is required")
class FailurePropagationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        shutil.copy2(REPO / "Makefile", self.root / "Makefile")
        shutil.copytree(
            REPO / "makefiles",
            self.root / "makefiles",
            ignore=shutil.ignore_patterns("tests", "__pycache__"),
        )
        self.tools = self.root / "tools"
        self.tools.mkdir()
        for name in (
            "go",
            "goimports",
            "gocyclo",
            "staticcheck",
            "golangci-lint",
            "curl",
            "uv",
            "npm",
            "npx",
            "python-stub",
            "child-make",
        ):
            tool = self.tools / name
            tool.write_text(f"#!{sys.executable}\n" + STUB)
            tool.chmod(0o755)
        for name in ("first", "middle", "last", "console/backend"):
            directory = self.root / name
            directory.mkdir(parents=True)
            (directory / "tests").mkdir()
            (directory / "source.py").write_text("value = 1\n")
            (directory / "uv.lock").touch()
            (directory / "package.json").write_text(
                json.dumps(
                    {
                        "scripts": {"test:unit": "unused", "build": "unused"},
                    }
                )
            )
        self.log = self.root / "tools.jsonl"

    def run_target(self, target, *, variables=None, failure=None):
        self.log.write_text("")
        env = {
            **os.environ,
            "PATH": str(self.tools) + os.pathsep + os.environ["PATH"],
            "FIXTURE_ROOT": str(self.root),
            "TOOL_LOG": str(self.log),
            "NO_COLOR": "1",
            "TERM": "dumb",
        }
        for key in (
            "MAKEFLAGS",
            "MFLAGS",
            "MAKELEVEL",
            "FAIL_TOOL",
            "FAIL_ARGS",
            "FAIL_PROJECT",
            "FAIL_TARGET",
        ):
            env.pop(key, None)
        env.update(failure or {})
        settings = {
            "LOCALCI_CONFIG": "",
            "ACTIVE_PROJECTS": "go python typescript",
            "GO_DIRS": "first middle last",
            "PYTHON_DIRS": "first middle last",
            "TS_DIRS": "first middle last",
            "GOMODULES": "fixture",
            "GOFILES": "",
            "PYTHON_FILES": "",
            "TS_FILES": "",
            "PYTHON": str(self.tools / "python-stub"),
            **(variables or {}),
        }
        result = subprocess.run(
            [
                MAKE,
                "--no-print-directory",
                "-f",
                "Makefile",
                target,
                *(f"{key}={value}" for key, value in settings.items()),
            ],
            cwd=self.root,
            env=env,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=90,
            check=False,
        )
        calls = [json.loads(line) for line in self.log.read_text().splitlines()]
        return result, calls

    def assert_tool_failure(self, target, tool, args, project, variables=None):
        result, calls = self.run_target(
            target,
            variables=variables,
            failure={
                "FAIL_TOOL": tool,
                "FAIL_ARGS": json.dumps(args),
                "FAIL_PROJECT": project,
            },
        )
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertTrue(calls, result.stdout)
        self.assertEqual(calls[-1]["tool"], tool, calls)
        self.assertEqual(calls[-1]["project"], project, calls)
        self.assertEqual(calls[-1]["args"][: len(args)], args, calls)
        self.assertNotIn("last", {call["project"] for call in calls})
        self.assertNotIn("completed", result.stdout)
        self.assertNotIn("All Python projects passed", result.stdout)
        self.assertNotIn(f"Built: {project}", result.stdout)
        self.assertNotIn(f"Dependencies installed with uv: {project}", result.stdout)

    def test_go_checks_install_pipeline_analysis_and_build_fail_fast(self):
        stages = (
            ("check-go", "go", ["install"]),
            ("check-go", "go", ["env"]),
            ("check-go", "curl", []),
            ("check-go", "goimports", []),
            ("check-go", "go", ["vet"]),
            ("check-go", "gocyclo", []),
            ("check-go", "go", ["list"]),
            ("check-go", "staticcheck", []),
            ("check-go", "golangci-lint", []),
            ("test-go", "go", ["test"]),
            ("build-go", "go", ["build"]),
        )
        for target, tool, args in stages:
            for project in ("first", "middle"):
                with self.subTest(target=target, tool=tool, args=args, project=project):
                    self.assert_tool_failure(target, tool, args, project)

    def test_typescript_install_formatter_type_lint_test_and_build_fail_fast(self):
        stages = (
            ("check-typescript", "npm", ["ci"]),
            ("check-typescript", "npx", ["prettier"]),
            ("check-typescript", "npx", ["tsc"]),
            ("check-typescript", "npx", ["eslint"]),
            ("test-typescript", "npm", ["run", "test:unit"]),
            ("build-typescript", "npm", ["ci"]),
            ("build-typescript", "npm", ["run", "build"]),
        )
        for target, tool, args in stages:
            for project in ("first", "middle"):
                with self.subTest(target=target, args=args, project=project):
                    self.assert_tool_failure(target, tool, args, project)

    def test_python_quality_tests_and_dependency_build_fail_fast(self):
        stages = [
            ("check-python", "python-stub", ["-m", module])
            for module in ("pip", "flake8", "isort", "black", "mypy", "pylint")
        ] + [
            ("test-python", "uv", ["sync"]),
            ("test-python", "uv", ["run"]),
            ("build-python", "uv", ["sync"]),
        ]
        for target, tool, args in stages:
            for project in ("first", "middle"):
                with self.subTest(target=target, args=args, project=project):
                    self.assert_tool_failure(target, tool, args, project)
        for project in ("first", "middle"):
            (self.root / project / "uv.lock").unlink()
            (self.root / project / "requirements.txt").touch()
        for target, module in (("build-python", "pip"), ("test-python", "pytest")):
            for project in ("first", "middle"):
                with self.subTest(target=target, module=module, project=project):
                    self.assert_tool_failure(
                        target, "python-stub", ["-m", module], project
                    )

    def test_console_locked_sync_lint_migrations_and_coverage_fail_fast(self):
        variables = {"PYTHON_DIRS": "console/backend last"}
        stages = (
            ("check-python", ["sync", "--locked"]),
            ("check-python", ["run", "ruff", "check"]),
            ("check-python", ["run", "ruff", "format"]),
            ("check-python", ["run", "python", "manage.py", "makemigrations"]),
            ("test-python", ["sync", "--locked"]),
            ("test-python", ["run", "coverage", "run"]),
            ("test-python", ["run", "coverage", "report"]),
            ("build-python", ["sync", "--locked"]),
        )
        for target, args in stages:
            with self.subTest(target=target, args=args):
                self.assert_tool_failure(
                    target, "uv", args, "console/backend", variables
                )

    def test_language_targets_finish_all_projects_on_success(self):
        for language in ("go", "python", "typescript"):
            for action in ("check", "test", "build"):
                with self.subTest(language=language, action=action):
                    result, calls = self.run_target(f"{action}-{language}")
                    self.assertEqual(result.returncode, 0, result.stdout)
                    self.assertEqual(
                        {call["project"] for call in calls}, {"first", "middle", "last"}
                    )
        for project in ("first", "middle", "last"):
            self.assertEqual(
                (self.root / project / "bin/server").read_text(), "stub binary"
            )

    def test_missing_project_fails_without_running_later_projects(self):
        for language, variable in (
            ("go", "GO_DIRS"),
            ("python", "PYTHON_DIRS"),
            ("typescript", "TS_DIRS"),
        ):
            for action in ("check", "test", "build", "check-comments"):
                with self.subTest(language=language, action=action):
                    result, calls = self.run_target(
                        f"{action}-{language}",
                        variables={variable: "missing last"},
                    )
                    self.assertNotEqual(result.returncode, 0, result.stdout)
                    self.assertNotIn("last", {call["project"] for call in calls})
                    self.assertNotIn("completed", result.stdout)

    def test_missing_typescript_package_or_required_script_fails(self):
        package = self.root / "first/package.json"
        for content in (None, {}):
            if content is None:
                package.unlink()
            else:
                package.write_text(json.dumps(content))
            for target in ("test-typescript", "build-typescript"):
                with self.subTest(target=target, content=content):
                    result, calls = self.run_target(target)
                    self.assertNotEqual(result.returncode, 0, result.stdout)
                    self.assertNotIn("middle", {call["project"] for call in calls})
                    self.assertNotIn("completed", result.stdout)

    def test_smart_project_and_comment_loops_propagate_child_failure(self):
        for target, stages in (
            (
                "check",
                [
                    "check-go",
                    "check-python",
                    "check-typescript",
                    "check-comments-go",
                    "check-comments-python",
                    "check-comments-typescript",
                ],
            ),
            ("test", ["test-go", "test-python", "test-typescript"]),
            ("build", ["build-go", "build-python", "build-typescript"]),
            (
                "check-comments",
                [
                    "check-comments-go",
                    "check-comments-python",
                    "check-comments-typescript",
                ],
            ),
            ("ci", ["smart_check", "smart_test", "smart_build"]),
        ):
            variables = {"MAKE": str(self.tools / "child-make")}
            if target == "check-comments":
                variables["LOCALCI_CONFIG"] = "makefiles/localci.toml"
            for failed in stages:
                with self.subTest(target=target, failed=failed):
                    result, calls = self.run_target(
                        target,
                        variables=variables,
                        failure={"FAIL_TARGET": failed},
                    )
                    self.assertNotEqual(result.returncode, 0, result.stdout)
                    self.assertEqual(
                        [
                            call["args"][-1]
                            for call in calls
                            if call["tool"] == "child-make"
                        ],
                        stages[: stages.index(failed) + 1],
                    )
                    self.assertNotIn("complete:", result.stdout)
                    self.assertNotIn("CI pipeline complete", result.stdout)
            result, calls = self.run_target(target, variables=variables)
            self.assertEqual(result.returncode, 0, result.stdout)
            self.assertEqual(
                [call["args"][-1] for call in calls if call["tool"] == "child-make"],
                stages,
            )

    def test_actual_ci_recursion_reaches_build_and_propagates_tool_failure(self):
        for failure in (
            {},
            {"FAIL_TOOL": "go", "FAIL_ARGS": '["build"]', "FAIL_PROJECT": "middle"},
        ):
            result, calls = self.run_target("ci", failure=failure)
            if failure:
                self.assertNotEqual(result.returncode, 0, result.stdout)
                self.assertEqual(calls[-1]["args"][0], "build")
                self.assertEqual(calls[-1]["project"], "middle")
                self.assertNotIn("CI pipeline complete", result.stdout)
            else:
                self.assertEqual(result.returncode, 0, result.stdout)
                self.assertIn("CI pipeline complete", result.stdout)
                self.assertTrue(
                    any(
                        call["tool"] == "npm" and call["args"] == ["run", "build"]
                        for call in calls
                    )
                )
                self.assertTrue(
                    any(
                        call["tool"] == "uv" and call["args"] == ["sync"]
                        for call in calls
                    )
                )


if __name__ == "__main__":
    unittest.main()
