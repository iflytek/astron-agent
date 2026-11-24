import json
from unittest.mock import patch

from django.core.exceptions import PermissionDenied, ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

from astron_console.accounts.models import User, UserProfile
from astron_console.agents.resource_resolution import resolve_resources, snapshot_references
from astron_console.knowledge import storage
from astron_console.knowledge.clients import ResourceServiceError
from astron_console.knowledge.models import SkillFile
from astron_console.knowledge.skill_packages import MAX_SKILL_FILE_BYTES, MAX_SKILL_RESOURCES
from astron_console.resources.models import Model
from astron_console.spaces.permissions import ResourceScope


class SkillPackageTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(id="skill-owner", username="skill-owner")
        UserProfile.objects.create(uid=self.user.pk, username=self.user.username)
        self.client.force_login(self.user)
        self.scope = ResourceScope(self.user.pk, None, None)
        self.model = Model.objects.create(
            uid=self.user.pk, domain="test", url="https://models.example", api_key="test"
        )
        self.objects = {}
        for method, implementation in (
            ("put", self.put_object),
            ("remove", self.remove_object),
            ("read", self.objects.__getitem__),
            ("download", lambda key, **kwargs: key),
        ):
            patched = patch.object(storage, method, side_effect=implementation)
            patched.start()
            self.addCleanup(patched.stop)

    def put_object(self, key, stream, size, content_type):
        self.objects[key] = stream.read()

    def remove_object(self, key):
        self.objects.pop(key, None)

    def upload_directory(self, files):
        return self.client.post(
            "/skill-file/upload-directory",
            {
                "files": [SimpleUploadedFile(path.split("/")[-1], data) for path, data in files],
                "pathsJson": json.dumps([path for path, _ in files]),
            },
        )

    def runtime_skills(self, skills):
        return resolve_resources(self.scope, {"modelId": self.model.pk, "skills": skills})[
            "plugin"
        ]["skills"]

    def test_preview_and_execution_use_same_package_boundaries(self):
        upload = self.upload_directory(
            [
                ("outer/SKILL.md", b"legacy outer"),
                ("outer/references/guide.md", b"public for outer"),
                ("outer/inner/SKILL.md", b"legacy inner"),
                ("outer/inner/scripts/run.py", b"print(1)"),
                ("SKILL.md", b"standalone skill"),
                ("outside.txt", b"not in standalone package"),
            ]
        )
        self.assertEqual(upload.status_code, 200, upload.content)
        preview = {
            item["folderName"]: item
            for item in self.client.get("/skill-file/importable").json()["data"]
        }
        for name, paths in (
            ("outer", ["references/guide.md"]),
            ("inner", ["scripts/run.py"]),
            ("", []),
        ):
            item = preview[name]
            self.assertEqual([resource["path"] for resource in item["resources"]], paths)
            runtime = self.runtime_skills([item["id"]])[0]
            self.assertEqual([resource["path"] for resource in runtime["resources"]], paths)

    def test_invalid_batch_has_no_side_effects(self):
        upload = self.upload_directory(
            [("demo/SKILL.md", b"first file"), ("demo/notes.bin", b"unsupported type")]
        )
        self.assertEqual(upload.status_code, 400, upload.content)
        self.assertFalse(SkillFile.objects.exists())
        storage.put.assert_not_called()

    def test_storage_failure_rolls_back_rows_and_objects_then_allows_retry(self):
        def fail_after_put(key, stream, size, content_type):
            self.put_object(key, stream, size, content_type)
            if key.endswith("/notes.md"):
                raise ResourceServiceError("failed after saving")

        batch = [("demo/SKILL.md", b"first"), ("demo/notes.md", b"second")]
        storage.put.side_effect = fail_after_put
        upload = self.upload_directory(batch)
        self.assertEqual(upload.status_code, 502, upload.content)
        self.assertFalse(SkillFile.objects.exists())
        self.assertFalse(self.objects)
        self.assertEqual(storage.remove.call_count, 2)

        storage.put.side_effect = self.put_object
        retry = self.upload_directory(batch)
        self.assertEqual(retry.status_code, 200, retry.content)
        self.assertEqual(SkillFile.objects.count(), 3)
        self.assertEqual(len(self.objects), 2)

    def test_second_upload_checks_existing_attachment_count_and_rolls_back(self):
        first_batch = [("demo/SKILL.md", b"entry")]
        first_batch.extend(
            (f"demo/note-{index}.md", b"note") for index in range(MAX_SKILL_RESOURCES - 1)
        )
        first = self.upload_directory(first_batch)
        self.assertEqual(first.status_code, 200, first.content)
        original_objects = dict(self.objects)

        error = self.upload_directory(
            [("demo/new/first.md", b"first"), ("demo/new/second.md", b"second")]
        )
        self.assertEqual(error.status_code, 400, error.content)
        self.assertIn("附件不能超过100个", error.json()["message"])
        self.assertFalse(
            SkillFile.objects.filter(name__in=["new", "first.md", "second.md"]).exists()
        )
        self.assertEqual(original_objects, self.objects)

        retry = self.upload_directory([("demo/new/first.md", b"first")])
        self.assertEqual(retry.status_code, 200, retry.content)
        skill = SkillFile.objects.get(name="SKILL.md")
        self.assertEqual(len(self.runtime_skills([skill.pk])[0]["resources"]), MAX_SKILL_RESOURCES)

    def test_file_mutations_check_total_size_and_allow_legacy_repair(self):
        upload = self.upload_directory(
            [("demo/SKILL.md", b"entry"), ("demo/change.md", b"x")]
            + [(f"demo/large-{index}.md", b"file") for index in range(4)]
        )
        self.assertEqual(upload.status_code, 200, upload.content)
        SkillFile.objects.filter(name__startswith="large-").update(file_size=MAX_SKILL_FILE_BYTES)
        SkillFile.objects.filter(name="large-0.md").update(file_size=MAX_SKILL_FILE_BYTES - 1)
        attachment = SkillFile.objects.get(name="change.md")
        original_objects = dict(self.objects)

        edit = self.client.put(
            "/skill-file/content",
            {"id": attachment.pk, "content": "add a byte"},
            content_type="application/json",
        )
        self.assertEqual(edit.status_code, 400, edit.content)
        self.assertIn("总大小不能超过20MB", edit.json()["message"])
        attachment.refresh_from_db()
        self.assertEqual(attachment.file_size, 1)
        self.assertEqual(self.objects, original_objects)
        create = self.client.post(
            "/skill-file/file",
            {"parentId": attachment.parent_id, "name": "extra.md", "content": "extra"},
            content_type="application/json",
        )
        self.assertEqual(create.status_code, 400, create.content)
        self.assertFalse(SkillFile.objects.filter(name="extra.md").exists())
        self.assertEqual(self.objects, original_objects)

        SkillFile.objects.filter(pk=attachment.pk).update(file_size=3)
        unrelated = self.upload_directory([("other/SKILL.md", b"new")])
        self.assertEqual(unrelated.status_code, 200, unrelated.content)
        for content in ("12", "1"):
            reduce = self.client.put(
                "/skill-file/content",
                {"id": attachment.pk, "content": content},
                content_type="application/json",
            )
            self.assertEqual(reduce.status_code, 200, reduce.content)
        skill = SkillFile.objects.get(name="SKILL.md", parent_id=attachment.parent_id)
        self.assertEqual(len(self.runtime_skills([skill.pk])[0]["resources"]), 5)

    def test_move_and_rename_check_package_boundary_changes(self):
        upload = self.upload_directory(
            [("demo/SKILL.md", b"entry"), ("demo/extra/new.md", b"inside")]
            + [(f"demo/large-{index}.md", b"file") for index in range(4)]
        )
        self.assertEqual(upload.status_code, 200, upload.content)
        extra = SkillFile.objects.get(name="extra")
        nested = self.client.post(
            "/skill-file/file",
            {"parentId": extra.pk, "name": "SKILL.md", "content": "separate package"},
            content_type="application/json",
        )
        self.assertEqual(nested.status_code, 200, nested.content)
        nested_id = nested.json()["data"]["id"]
        SkillFile.objects.filter(name__startswith="large-").update(file_size=MAX_SKILL_FILE_BYTES)

        rename = self.client.put(
            "/skill-file/rename",
            {"id": nested_id, "name": "draft.md"},
            content_type="application/json",
        )
        self.assertEqual(rename.status_code, 400, rename.content)
        self.assertEqual(SkillFile.objects.get(pk=nested_id).name, "SKILL.md")
        script = SkillFile.objects.get(name="new.md")
        move = self.client.put(
            "/skill-file/move",
            {"id": script.pk, "targetParentId": extra.parent_id},
            content_type="application/json",
        )
        self.assertEqual(move.status_code, 400, move.content)
        self.assertEqual(SkillFile.objects.get(pk=script.pk).parent_id, extra.pk)

    def test_snapshot_resolves_latest_content_and_deduplicates_legacy_references(self):
        response = self.upload_directory([("demo/SKILL.md", b"old")])
        skill_id = response.json()["data"]["uploadedNodes"][0]["id"]
        legacy = [skill_id, {"skillId": str(skill_id)}, {"fileId": skill_id}]
        definition = {"modelId": self.model.pk, "skills": legacy}
        snapshot = snapshot_references(self.scope, definition)
        self.assertEqual(snapshot["skills"], [skill_id])
        initial = self.runtime_skills(legacy)
        self.assertEqual(len(initial), 1)
        old_key = initial[0]["download_url"]
        self.assertEqual(self.objects[old_key], b"old")

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.put(
                "/skill-file/content",
                {"id": skill_id, "content": "new"},
                content_type="application/json",
            )
        self.assertEqual(response.status_code, 200, response.content)
        latest = self.runtime_skills(snapshot["skills"])[0]
        self.assertNotEqual(latest["download_url"], old_key)
        self.assertEqual(self.objects[latest["download_url"]], b"new")
        self.assertNotIn(old_key, self.objects)

    def test_scope_and_limits_apply_to_latest_runtime_package(self):
        foreign_skill = SkillFile.objects.create(
            uid="another-user", name="SKILL.md", entry_type="file", object_key="foreign"
        )
        with self.assertRaises(PermissionDenied):
            self.runtime_skills([foreign_skill.pk])
        response = self.upload_directory([("demo/SKILL.md", b"a" * (1024 * 1024 + 1))])
        self.assertEqual(response.status_code, 200, response.content)
        skill_id = response.json()["data"]["uploadedNodes"][0]["id"]
        self.assertEqual(self.runtime_skills([skill_id])[0]["skill_id"], str(skill_id))

        SkillFile.objects.filter(pk=skill_id).update(file_size=MAX_SKILL_FILE_BYTES + 1)
        with self.assertRaisesMessage(ValidationError, "不能超过5MB"):
            self.runtime_skills([skill_id])
        response = self.client.get("/skill-file/content", {"id": skill_id})
        self.assertEqual(response.status_code, 400, response.content)

    def test_rename_maintains_entry_metadata(self):
        response = self.upload_directory(
            [("draft.md", b'---\r\nname: "demo"\r\ndescription: "Demo skill"\r\n---\r\nText')]
        )
        row_id = response.json()["data"]["uploadedNodes"][0]["id"]
        response = self.client.put(
            "/skill-file/rename",
            {"id": row_id, "name": "SKILL.md"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["data"]["skillName"], "demo")
        self.assertEqual(response.json()["data"]["skillDescription"], "Demo skill")
