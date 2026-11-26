"""Exercise persistent workspace behavior and file boundary checks."""

import base64
import errno
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import execution


class WorkspaceTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.workspace = self.root / "work"
        self.workspace.mkdir()
        self.skills = self.root / "skills"
        self.skills.mkdir()
        self.subject = ["agents", "space-7", "9"]
        self.job = {
            "operation": "execute",
            "kind": "agent",
            "scope": "space-7",
            "resourceId": "9",
            "path": "",
            "command": None,
            "pythonCode": None,
            "timeout": 3,
            "outputLimit": 4096,
            "collectArtifacts": ".",
            "files": [],
        }
        self.cancel_path = self.root / "cancel"
        previous_cwd = Path.cwd()
        self.addCleanup(os.chdir, previous_cwd)
        workspace_patch = patch.multiple(
            execution, WORKSPACE=self.workspace, SKILLS=self.skills
        )
        workspace_patch.start()
        self.addCleanup(workspace_patch.stop)

    def run_job(self, **fields):
        # Each actual job runs in a fresh container process.
        previous_cwd = Path.cwd()
        try:
            return execution.dispatch({**self.job, **fields}, self.cancel_path)
        finally:
            os.chdir(previous_cwd)

    def test_execution_preserves_workspace_and_returns_only_changed_files(self):
        job = self.run_job(
            command=f'cat "{self.skills}/sample/SKILL.md" > report.txt',
            files=[
                {
                    "path": "/skills/sample/SKILL.md",
                    "content": base64.b64encode(b"one").decode(),
                }
            ],
        )
        self.assertEqual(job["exitCode"], 0)
        self.assertEqual(
            [(f["path"], base64.b64decode(f["content"])) for f in job["changedFiles"]],
            [("report.txt", b"one")],
        )
        self.assertEqual(list(self.skills.iterdir()), [])
        job = self.run_job(pythonCode="print(open('report.txt').read())")
        self.assertEqual(job["stdout"], "one\n")
        self.assertEqual(job["changedFiles"], [])

    def test_legacy_workflow_and_agent_ids_use_separate_directories(self):
        self.run_job(command="printf first > result.txt")
        self.run_job(kind="workflow", command="printf second > result.txt")
        self.assertEqual(
            base64.b64decode(
                self.run_job(operation="read", path="result.txt")["content"]
            ),
            b"first",
        )
        self.assertEqual(
            base64.b64decode(
                self.run_job(operation="read", kind="workflow", path="result.txt")[
                    "content"
                ]
            ),
            b"second",
        )

    def test_workflow_python_imports_from_its_persistent_workspace(self):
        created = self.run_job(
            kind="workflow",
            pythonCode="with open('workspace_module.py', 'w') as body:\n"
            "    body.write('value = 42\\n')",
        )
        self.assertEqual(created["exitCode"], 0)
        imported = self.run_job(
            kind="workflow",
            pythonCode="import workspace_module\nprint(workspace_module.value)",
        )
        self.assertEqual(imported["stdout"], "42\n")
        self.assertEqual(imported["exitCode"], 0)

    def test_agent_creates_output_directory_without_artifact_collection(self):
        result = self.run_job(
            command="printf done > output/report.txt", collectArtifacts=None
        )
        self.assertEqual(result["exitCode"], 0)
        self.assertEqual(
            base64.b64decode(
                self.run_job(operation="read", path="output/report.txt")["content"]
            ),
            b"done",
        )

    def test_list_cursor_pages_across_directories_and_regular_files(self):
        self.run_job(
            kind="workflow", command="mkdir zdir adir; touch a.txt b.txt c.txt"
        )
        with patch.object(execution, "MAX_ENTRIES", 2):
            first = self.run_job(kind="workflow", operation="list")
            second = self.run_job(
                kind="workflow", operation="list", after=first["nextCursor"]
            )
            third = self.run_job(
                kind="workflow", operation="list", after=second["nextCursor"]
            )
            with self.assertRaises(execution.JobError) as exc:
                self.run_job(kind="workflow", operation="list", after="bad")
        self.assertEqual(exc.exception.status, 400)
        self.assertEqual(
            [entry["name"] for entry in first["entries"]], ["adir", "zdir"]
        )
        self.assertEqual(
            [entry["name"] for entry in second["entries"]], ["a.txt", "b.txt"]
        )
        self.assertEqual([entry["name"] for entry in third["entries"]], ["c.txt"])
        self.assertIsNone(third["nextCursor"])
        self.assertFalse(third["truncated"])

    def test_create_only_keeps_existing_file(self):
        self.run_job(
            operation="write",
            files=[{"path": "result.txt", "content": "Zmlyc3Q="}],
            createOnly=True,
        )
        with self.assertRaises(execution.JobError) as exc:
            self.run_job(
                operation="write",
                files=[{"path": "result.txt", "content": "c2Vjb25k"}],
                createOnly=True,
            )
        self.assertEqual(exc.exception.status, 409)
        self.assertEqual(
            base64.b64decode(
                self.run_job(operation="read", path="result.txt")["content"]
            ),
            b"first",
        )

    def test_invalid_paths_symlinks_and_hardlinks_keep_file_reads_scoped(self):
        self.run_job(command="printf first > result.txt")
        outside = self.root / "outside"
        outside.mkdir()
        private = outside / "other.txt"
        private.write_text("outside")
        root = self.workspace.joinpath(*self.subject)
        (root / "shortcut").symlink_to(outside)
        (root / "alias").symlink_to(private)
        os.link(private, root / "linked")
        (root / "folder").mkdir()
        (root / "folder" / "nested.txt").write_text("inside")
        self.assertEqual(
            [row["path"] for row in self.run_job(operation="list")["entries"]],
            ["folder", "output", "result.txt"],
        )
        self.assertEqual(
            [
                row["path"]
                for row in self.run_job(operation="list", path="folder")["entries"]
            ],
            ["folder/nested.txt"],
        )
        for path in (
            "../outside/other.txt",
            "/etc/hosts",
            "outside//other.txt",
            "linked",
        ):
            with self.subTest(path=path), self.assertRaises(execution.JobError):
                self.run_job(operation="read", path=path)
        for path in ("alias", "shortcut/other.txt"):
            with self.subTest(path=path), self.assertRaises(OSError) as exc:
                self.run_job(operation="read", path=path)
            self.assertIn(exc.exception.errno, (errno.ELOOP, errno.ENOTDIR))

    def test_writes_replace_symlinks_without_following_them(self):
        self.run_job(command="true")
        private = self.root / "private.txt"
        private.write_text("outside")
        root = self.workspace.joinpath(*self.subject)
        (root / "result.txt").symlink_to(private)
        self.run_job(
            operation="write", files=[{"path": "result.txt", "content": "aW5zaWRl"}]
        )
        self.assertEqual(private.read_text(), "outside")
        self.assertEqual((root / "result.txt").read_text(), "inside")

    def test_timeout_preserves_files_and_next_command_can_run(self):
        result = self.run_job(
            command="printf 'done' > result.txt; sleep 30",
            timeout=1,
        )
        self.assertTrue(result["timedOut"])
        self.assertEqual(result["exitCode"], 124)
        self.assertEqual(self.run_job(command="cat result.txt")["stdout"], "done")

    def test_output_is_bounded_and_command_exit_code_is_preserved(self):
        job = self.run_job(
            command="printf 12345; printf 67890 >&2; exit 17", outputLimit=3
        )
        self.assertEqual(job["stdout"], "123")
        self.assertEqual(job["stderr"], "678")
        self.assertEqual(job["exitCode"], 17)
        self.assertTrue(job["truncated"])

    def test_cancelled_job_can_be_followed_by_another(self):
        self.cancel_path.touch()
        result = self.run_job(command="sleep 30")
        self.assertEqual(result["exitCode"], 130)
        self.assertFalse(result["timedOut"])
        self.cancel_path.unlink()
        self.assertEqual(self.run_job(command="printf ok")["stdout"], "ok")


if __name__ == "__main__":
    unittest.main()
