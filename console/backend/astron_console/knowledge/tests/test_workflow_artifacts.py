from unittest.mock import patch
from urllib.parse import quote

from django.test import Client, TestCase, override_settings

from astron_console.accounts.models import User, UserProfile
from astron_console.knowledge.models import Artifact
from astron_console.spaces.models import Enterprise, EnterpriseMember, Space, SpaceMember
from astron_console.workflows.models import Workflow


@override_settings(SKILL_SANDBOX_ARTIFACT_BUCKET="workflow-private")
class WorkflowArtifactDownloadTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(id="artifact-owner", username="artifact-owner")
        self.other = User.objects.create_user(id="artifact-other", username="artifact-other")
        for user in (self.owner, self.other):
            UserProfile.objects.create(uid=user.pk, username=user.username)
        self.client.force_login(self.owner)
        self.workflow = Workflow.objects.create(
            uid=self.owner.pk, app_id="app", flow_id="artifact-flow", name="Files", data="{}"
        )
        self.artifact = Artifact.objects.create(
            uid=self.owner.pk,
            workflow_id=self.workflow.pk,
            file_name="验收结果.txt",
            object_key=f"workflow/artifacts/{self.workflow.pk}/private-object/result.txt",
            bucket_name="workflow-private",
            file_size=14,
            content_type="text/plain; charset=utf-8",
        )
        self.path = f"/workflow/artifacts/{self.artifact.pk}"

    def download_path(self, **headers):
        response = self.client.get(self.path + "/download", **headers)
        self.assertEqual(response.status_code, 200, response.content)
        return response.json()["data"]["downloadUrl"].removeprefix("/console-api")

    @patch("astron_console.knowledge.storage.download")
    @patch("astron_console.knowledge.storage.read", return_value=b"private result")
    def test_owner_lists_follows_same_origin_url_and_downloads_attachment(self, read, presign):
        listing = self.client.get(f"/workflow/{self.workflow.pk}/artifacts")
        self.assertEqual(listing.status_code, 200, listing.content)
        self.assertEqual([row["id"] for row in listing.json()["data"]], [self.artifact.pk])
        response = self.client.get(self.path + "/download")
        data = response.json()["data"]
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(data["downloadUrl"], "/console-api" + self.path + "/content")
        self.assertTrue({"id", "fileName", "contentType", "fileSize"} <= data.keys())
        self.assertFalse({"objectKey", "bucketName", "uid", "spaceId", "deleted"} & data.keys())
        with self.assertLogs("astron_console.knowledge.files", level="INFO") as logs:
            content = self.client.get(data["downloadUrl"].removeprefix("/console-api"))
        self.assertEqual(content.status_code, 200)
        self.assertEqual(b"".join(content.streaming_content), b"private result")
        self.assertEqual(content["Content-Type"], self.artifact.content_type)
        self.assertEqual(content["Content-Length"], "14")
        self.assertEqual(
            content["Content-Disposition"],
            "attachment; filename*=utf-8''" + quote(self.artifact.file_name),
        )
        self.assertEqual(content["Cache-Control"], "private, no-store")
        self.assertEqual(content["X-Content-Type-Options"], "nosniff")
        self.assertNotIn("Location", content.headers)
        self.assertNotIn(self.artifact.object_key, str(content.headers) + str(logs.output))
        read.assert_called_once_with(self.artifact.object_key, "workflow-private")
        presign.assert_not_called()

    @patch("astron_console.knowledge.storage.remove")
    @patch("astron_console.knowledge.storage.read")
    def test_other_user_and_logged_out_user_cannot_download_or_delete(self, read, remove):
        self.client.force_login(self.other)
        for path in (self.path, self.path + "/download", self.path + "/content"):
            self.assertEqual(self.client.get(path).status_code, 404)
            self.assertEqual(Client().get(path).status_code, 401)
        self.assertEqual(self.client.delete(self.path).status_code, 404)
        self.assertEqual(Client().delete(self.path).status_code, 401)
        read.assert_not_called()
        remove.assert_not_called()

    @patch("astron_console.knowledge.storage.read", return_value=b"space content")
    def test_space_navigation_rechecks_scope_and_membership_without_headers(self, read):
        space = Space.objects.create(uid=self.owner.pk, name="artifact space")
        member = SpaceMember.objects.create(uid=self.owner.pk, space_id=space.pk, role=1)
        other_space = Space.objects.create(uid=self.owner.pk, name="other space")
        SpaceMember.objects.create(uid=self.owner.pk, space_id=other_space.pk, role=1)
        self.workflow.space_id = space.pk
        self.workflow.save()
        self.artifact.space_id = space.pk
        self.artifact.save()
        headers = {"HTTP_SPACE_ID": str(space.pk)}
        listing = self.client.get(f"/workflow/{self.workflow.pk}/artifacts", **headers)
        self.assertEqual(listing.status_code, 200, listing.content)
        self.assertEqual([row["id"] for row in listing.json()["data"]], [self.artifact.pk])
        path = self.download_path(**headers)
        self.assertEqual(path, self.path + f"/content?spaceId={space.pk}")
        content = self.client.get(path)
        self.assertEqual(content.status_code, 200)
        self.assertEqual(b"".join(content.streaming_content), b"space content")
        read.assert_called_once_with(self.artifact.object_key, "workflow-private")
        read.reset_mock()
        for url, request_headers, expected in (
            (self.path + "/content", {}, 404),
            (self.path + f"/content?spaceId={other_space.pk}", {}, 404),
            (path, {"HTTP_SPACE_ID": str(other_space.pk)}, 403),
            (self.path + "/content?spaceId=broken", {}, 400),
        ):
            with self.subTest(url=url, headers=request_headers):
                self.assertEqual(self.client.get(url, **request_headers).status_code, expected)
        self.client.force_login(self.other)
        self.assertEqual(self.client.get(path).status_code, 403)
        self.client.force_login(self.owner)
        space.deleted = 1
        space.save()
        self.assertEqual(self.client.get(path).status_code, 404)
        space.deleted = 0
        space.save()
        member.delete()
        self.assertEqual(self.client.get(path).status_code, 403)
        self.assertEqual(self.client.get(self.path + "/download", **headers).status_code, 403)
        read.assert_not_called()

    @patch("astron_console.knowledge.storage.read", return_value=b"team content")
    def test_team_scope_conflicts_and_revoked_membership_cannot_use_link(self, read):
        team = Enterprise.objects.create(uid=self.owner.pk, name="artifact team")
        team_member = EnterpriseMember.objects.create(
            uid=self.owner.pk, enterprise_id=team.pk, role=1
        )
        other_team = Enterprise.objects.create(uid=self.owner.pk, name="other team")
        EnterpriseMember.objects.create(uid=self.owner.pk, enterprise_id=other_team.pk, role=1)
        space = Space.objects.create(uid=self.owner.pk, name="team space", enterprise_id=team.pk)
        SpaceMember.objects.create(uid=self.owner.pk, space_id=space.pk, role=1)
        Workflow.objects.filter(pk=self.workflow.pk).update(space_id=space.pk)
        Artifact.objects.filter(pk=self.artifact.pk).update(space_id=space.pk)
        path = self.download_path(HTTP_SPACE_ID=str(space.pk), HTTP_ENTERPRISE_ID=str(team.pk))
        response = self.client.get(path)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(b"".join(response.streaming_content), b"team content")
        read.reset_mock()
        self.assertEqual(
            self.client.get(path, HTTP_ENTERPRISE_ID=str(other_team.pk)).status_code, 403
        )
        for invalid in ("", "0", "-1", "1.5", "9223372036854775808", "broken"):
            with self.subTest(spaceId=invalid):
                self.assertEqual(
                    self.client.get(self.path + "/content", {"spaceId": invalid}).status_code,
                    400,
                )
        team_member.delete()
        self.assertEqual(self.client.get(path).status_code, 403)
        read.assert_not_called()

    @patch("astron_console.knowledge.storage.read", return_value=b"member content")
    @patch("astron_console.knowledge.storage.remove")
    def test_space_member_download_and_delete_permissions_are_preserved(self, remove, read):
        space = Space.objects.create(uid=self.owner.pk, name="shared artifact space")
        SpaceMember.objects.create(uid=self.other.pk, space_id=space.pk, role=3)
        Workflow.objects.filter(pk=self.workflow.pk).update(space_id=space.pk)
        Artifact.objects.filter(pk=self.artifact.pk).update(space_id=space.pk)
        self.client.force_login(self.other)
        headers = {"HTTP_SPACE_ID": str(space.pk)}
        path = self.download_path(**headers)
        response = self.client.get(path)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(b"".join(response.streaming_content), b"member content")
        read.assert_called_once_with(self.artifact.object_key, "workflow-private")
        self.assertEqual(self.client.delete(self.path).status_code, 404)
        remove.assert_not_called()
        self.assertEqual(self.client.delete(self.path, **headers).status_code, 200)
        self.artifact.refresh_from_db()
        self.assertTrue(self.artifact.deleted)
        self.assertEqual(self.artifact.uid, self.owner.pk)
        remove.assert_called_once()

    @patch("astron_console.knowledge.storage.read")
    def test_workflow_authorization_and_deletion_are_rechecked_after_link_creation(self, read):
        path = self.download_path()
        self.workflow.uid = self.other.pk
        self.workflow.save()
        self.assertEqual(self.client.get(path).status_code, 403)
        self.assertEqual(self.client.get(self.path + "/download").status_code, 403)
        self.workflow.uid = self.owner.pk
        self.workflow.deleted = True
        self.workflow.save()
        self.assertEqual(self.client.get(path).status_code, 404)
        self.workflow.deleted = False
        self.workflow.save()
        self.artifact.deleted = True
        self.artifact.save()
        self.assertEqual(self.client.get(path).status_code, 404)
        self.assertEqual(self.client.get(self.path + "/download").status_code, 404)
        read.assert_not_called()

    @patch("astron_console.knowledge.storage.read")
    @patch("astron_console.knowledge.storage.remove")
    def test_invalid_bucket_and_object_paths_fail_before_storage(self, remove, read):
        for key, bucket in (
            (self.artifact.object_key, "another-private-bucket"),
            ("workflow/artifacts/999/other.txt", "workflow-private"),
            (f"workflow/artifacts/{self.workflow.pk}/../private", "workflow-private"),
            (f"workflow/artifacts/{self.workflow.pk}//private", "workflow-private"),
            (f"workflow/artifacts/{self.workflow.pk}/nested\\private", "workflow-private"),
            (None, "workflow-private"),
        ):
            with self.subTest(key=key, bucket=bucket):
                Artifact.objects.filter(pk=self.artifact.pk).update(
                    object_key=key, bucket_name=bucket
                )
                self.assertEqual(self.client.get(self.path + "/download").status_code, 404)
                self.assertEqual(self.client.get(self.path + "/content").status_code, 404)
                self.assertEqual(self.client.delete(self.path).status_code, 404)
        read.assert_not_called()
        remove.assert_not_called()

    @override_settings(OSS_BUCKET_CONSOLE="retained-console-bucket")
    @patch("astron_console.knowledge.storage.read", return_value=b"legacy")
    def test_legacy_bucket_fallback_is_preserved(self, read):
        self.artifact.bucket_name = None
        self.artifact.save()
        response = self.client.get(self.download_path())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(b"".join(response.streaming_content), b"legacy")
        read.assert_called_once_with(self.artifact.object_key, "retained-console-bucket")

    @patch("astron_console.knowledge.storage.read")
    @patch("astron_console.knowledge.storage.remove")
    def test_content_is_get_only_and_original_delete_remains_authorized(self, remove, read):
        path = self.download_path()
        for method in ("post", "put", "patch", "delete", "head"):
            with self.subTest(method=method):
                response = getattr(self.client, method)(path)
                self.assertEqual(response.status_code, 405)
                self.assertEqual(response["Allow"], "GET")
        self.artifact.refresh_from_db()
        self.assertFalse(self.artifact.deleted)
        remove.assert_not_called()
        read.assert_not_called()
        response = self.client.delete(self.path)
        self.assertEqual(response.status_code, 200, response.content)
        remove.assert_called_once_with(self.artifact.object_key, "workflow-private")
        self.artifact.refresh_from_db()
        self.assertTrue(self.artifact.deleted)
        self.assertIsNone(self.artifact.object_key)
        self.assertEqual(self.client.get(path).status_code, 404)

    @patch("astron_console.knowledge.storage.client")
    def test_storage_failure_uses_existing_error_contract_and_hides_details(self, sdk):
        sdk.return_value.get_object.side_effect = OSError(
            "http://minio-internal.invalid/?key=private-secret-marker"
        )
        response = self.client.get(self.download_path())
        self.assertEqual(response.status_code, 502)
        self.assertEqual(response.json(), {"code": 502, "message": "文件读取失败", "data": None})
        self.assertNotIn(b"minio-internal", response.content)
        self.assertNotIn(b"private-secret-marker", response.content)
        self.assertNotIn("Location", response.headers)
