import io
import json
from unittest.mock import patch

from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.http import Http404
from django.test import Client, TestCase, override_settings
from sqlalchemy import insert
from sqlalchemy import text as sql_text

from astron_console.accounts.models import User, UserProfile
from astron_console.agents.models import Agent, AgentState, AgentVersion
from astron_console.knowledge import clients, databases, files, storage
from astron_console.knowledge.models import (
    Artifact,
    Chunk,
    Database,
    DatabaseField,
    DatabaseTable,
    Directory,
    Document,
    ExtractionTask,
    PreviewChunk,
    Repo,
)
from astron_console.resources.models import ConfigInfo
from astron_console.spaces.models import GroupVisibility
from astron_console.workflows.models import Workflow, WorkflowVersion


class ResourceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            id="owner-uid", username="owner", password="Example-Password-521!"
        )
        UserProfile.objects.create(uid=self.user.pk, username="owner")
        self.other = User.objects.create_user(
            id="other-uid", username="other", password="Example-Password-521!"
        )
        UserProfile.objects.create(uid=self.other.pk, username="other")
        self.client.force_login(self.user)
        self.repo = Repo.objects.create(
            name="Existing", user_id=self.user.pk, core_repo_id="core-stable", tag="AIUI-RAG2"
        )

    def post(self, url, data):
        return self.client.post(url, data, content_type="application/json")

    def test_login_required_and_csrf_protected(self):
        self.assertEqual(Client().get("/repo/list-repos").status_code, 401)
        client = Client(enforce_csrf_checks=True)
        client.force_login(self.user)
        self.assertEqual(
            client.post(
                "/repo/create-repo", {"name": "test"}, content_type="application/json"
            ).status_code,
            403,
        )

    def test_old_repo_identity_and_configuration_retained(self):
        self.repo.ragflow_dataset_id = "old-dataset"
        self.repo.outer_repo_id = "outer"
        self.repo.save()
        response = self.post(
            "/repo/update-repo", {"id": self.repo.pk, "name": "Renamed", "desc": "new"}
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.repo.refresh_from_db()
        self.assertEqual(
            (
                self.repo.user_id,
                self.repo.core_repo_id,
                self.repo.outer_repo_id,
                self.repo.ragflow_dataset_id,
            ),
            ("owner-uid", "core-stable", "outer", "old-dataset"),
        )

    def test_repository_badge_is_a_configured_image_url_not_the_rag_tag(self):
        def badge():
            response = self.client.get("/repo/detail", {"id": self.repo.pk})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["data"]["tag"], "AIUI-RAG2")
            return response.json()["data"]["corner"]

        ConfigInfo.objects.filter(category="ICON", code="rag").delete()
        self.assertEqual(badge(), "")
        icon = ConfigInfo.objects.create(
            category="ICON",
            code="rag",
            remarks="AIUI-RAG2",
            is_valid=0,
            name="https://images.example.com/assets/",
            value="rag/stellar.png",
        )
        self.assertEqual(badge(), "")
        icon.is_valid = 1
        icon.save()
        self.assertEqual(badge(), "https://images.example.com/assets/rag/stellar.png")
        icon.value = "https://cdn.example.com/stellar.png"
        icon.save()
        self.assertEqual(badge(), "https://cdn.example.com/stellar.png")
        icon.name = ""
        icon.value = "AIUI-RAG2"
        icon.save()
        self.assertEqual(badge(), "")

        for invalid in ("http://[", "https://[invalid-ipv6]/badge.png"):
            with self.subTest(invalid=invalid):
                icon.value = invalid
                icon.save()
                self.assertEqual(badge(), "")

    def test_personal_resource_and_malformed_scope_rejected(self):
        self.client.force_login(self.other)
        self.assertEqual(self.client.get("/repo/detail", {"id": self.repo.pk}).status_code, 403)
        self.assertEqual(
            self.client.get("/repo/list-repos", HTTP_SPACE_ID="broken").status_code, 400
        )
        self.assertEqual(
            self.post("/repo/update-repo", {"id": self.repo.pk, "name": "attack"}).status_code, 403
        )

    def test_shared_read_does_not_grant_write(self):
        GroupVisibility.objects.create(type=1, relation_id=str(self.repo.pk), user_id=self.other.pk)
        self.client.force_login(self.other)
        self.assertEqual(self.client.get("/repo/detail", {"id": self.repo.pk}).status_code, 200)
        self.assertEqual(self.client.get("/repo/list-repos").json()["data"]["totalCount"], 1)
        self.assertEqual(
            self.post("/repo/update-repo", {"id": self.repo.pk, "name": "attack"}).status_code, 403
        )

    def test_repo_delete_and_use_status_preserve_python_references(self):
        for source in ("draft", "version", "workflow-version"):
            with self.subTest(source=source):
                repo = Repo.objects.create(
                    name=source,
                    user_id=self.user.pk,
                    core_repo_id=f"core-{source}",
                    tag="AIUI-RAG2",
                )
                agent = Agent.objects.create(uid=self.user.pk)
                if source == "draft":
                    AgentState.objects.create(agent_id=agent.pk, config={"repoIds": [repo.pk]})
                elif source == "version":
                    AgentVersion.objects.create(
                        agent_id=agent.pk,
                        definition={"repoIds": [repo.pk]},
                        created_by=self.user.pk,
                    )
                else:
                    workflow = Workflow.objects.create(
                        uid=self.user.pk, app_id="app", flow_id="repo-flow", name="Saved", data="{}"
                    )
                    WorkflowVersion.objects.create(
                        flow_id=workflow.flow_id,
                        version_num="v1",
                        data=json.dumps(
                            {"nodes": [{"data": {"nodeParam": {"repoIds": [repo.pk]}}}]}
                        ),
                    )
                usage = self.client.get("/repo/get-repo-use-status", {"id": repo.pk})
                self.assertEqual(usage.status_code, 200, usage.content)
                self.assertTrue(usage.json()["data"])
                with patch("astron_console.knowledge.views.delete_document") as remove:
                    result = self.client.delete(f"/repo/delete-repo?id={repo.pk}")
                self.assertEqual(result.status_code, 400, result.content)
                remove.assert_not_called()
                repo.refresh_from_db()
                self.assertFalse(repo.deleted)

    @patch(
        "astron_console.knowledge.clients.rag",
        side_effect=clients.ResourceServiceError("资源服务暂时不可用"),
    )
    def test_failed_dataset_creation_does_not_insert_fake_repo(self, _):
        result = self.post("/repo/create-repo", {"name": "new", "tag": "Ragflow-RAG"})
        self.assertEqual(result.status_code, 502)
        self.assertEqual(Repo.objects.count(), 1)

    def test_database_scope_denies_before_remote_write(self):
        db = Database.objects.create(name="old-db", uid=self.other.pk, db_id=733, app_id="old-app")
        with patch("astron_console.knowledge.clients.database") as remote:
            result = self.post("/db/delete", {"id": db.pk})
        self.assertEqual(result.status_code, 403)
        remote.assert_not_called()
        db.refresh_from_db()
        self.assertFalse(db.deleted)

    @patch("astron_console.knowledge.storage.download", return_value="https://files/download")
    @patch("astron_console.knowledge.storage.put")
    def test_upload_checks_parent_and_preserves_scope(self, put, _):
        foreign = Repo.objects.create(user_id=self.other.pk, name="foreign", tag="AIUI-RAG2")
        folder = Directory.objects.create(app_id=str(foreign.pk), name="foreign", parent_id=-1)
        result = self.client.post(
            "/file/upload",
            {
                "file": SimpleUploadedFile("note.txt", b"hello"),
                "repoId": self.repo.pk,
                "parentId": folder.pk,
            },
        )
        self.assertEqual(result.status_code, 403)
        put.assert_not_called()
        result = self.client.post(
            "/file/upload",
            {
                "file": SimpleUploadedFile("note.txt", b"hello"),
                "repoId": self.repo.pk,
                "parentId": -1,
            },
        )
        self.assertEqual(result.status_code, 200, result.content)
        doc = Document.objects.get()
        self.assertEqual(doc.uid, self.user.pk)
        self.assertEqual(doc.repo_id, self.repo.pk)
        self.assertTrue(Directory.objects.filter(file_id=doc.pk, app_id=str(self.repo.pk)).exists())

    @patch("astron_console.knowledge.storage.read", return_value=b"hello")
    @patch("astron_console.knowledge.clients.rag")
    def test_split_embedding_updates_real_provider_identifiers(self, rag, _):
        file = Document.objects.create(
            repo_id=self.repo.pk,
            uid=self.user.pk,
            name="note.txt",
            address="existing-key",
            uuid="original-doc",
            source=self.repo.tag,
            status=-1,
            type="txt",
        )
        rag.return_value = [{"docId": "provider-doc", "chunkId": "preview", "content": "hello"}]
        result = self.post(
            "/file/slice", {"fileIds": [file.pk], "sliceConfig": {"lengthRange": [256, 512]}}
        )
        self.assertEqual(result.status_code, 200, result.content)
        file.refresh_from_db()
        self.assertEqual(file.status, 2)
        self.assertEqual(file.last_uuid, "provider-doc")
        rag.return_value = [{"chunkId": "provider-chunk"}]
        result = self.post("/file/embedding", {"fileIds": [file.pk]})
        self.assertEqual(result.status_code, 200, result.content)
        self.assertEqual(Chunk.objects.get().pk, "provider-chunk")
        stored = json.loads(Chunk.objects.get().content)
        self.assertEqual(
            [stored[key] for key in ("id", "chunkId", "dataIndex")], ["provider-chunk"] * 3
        )
        file.refresh_from_db()
        self.assertEqual((file.status, file.uuid), (5, "provider-doc"))
        self.assertEqual(rag.call_args.args[1], "/chunks/save")

    @patch("astron_console.knowledge.storage.read", return_value=b"hello")
    @patch(
        "astron_console.knowledge.clients.rag", side_effect=clients.ResourceServiceError("不可用")
    )
    def test_split_failure_has_failed_status_not_fake_success(self, *_):
        file = Document.objects.create(
            repo_id=self.repo.pk,
            uid=self.user.pk,
            name="note.txt",
            address="existing-key",
            uuid="original-doc",
            source=self.repo.tag,
            status=-1,
            type="txt",
        )
        self.assertEqual(self.post("/file/slice", {"fileIds": [file.pk]}).status_code, 502)
        file.refresh_from_db()
        self.assertEqual(file.status, 1)
        self.assertFalse(PreviewChunk.objects.exists())
        self.assertEqual(ExtractionTask.objects.get().status, 2)

    def test_get_cannot_delete_database(self):
        db = Database.objects.create(name="db", uid=self.user.pk, db_id=733, app_id="app")
        self.assertEqual(self.client.get("/db/delete", {"id": db.pk}).status_code, 400)
        self.assertTrue(Database.objects.filter(pk=db.pk, deleted=False).exists())

    @patch("astron_console.knowledge.storage.download", return_value="https://files/download")
    @patch("astron_console.knowledge.storage.put")
    def test_skill_files_preserve_content_and_cannot_move_into_descendant(self, *_):
        folder = self.post("/skill-file/folder", {"name": "folder"}).json()["data"]
        child = self.post("/skill-file/folder", {"name": "child", "parentId": folder["id"]}).json()[
            "data"
        ]
        moved = self.client.put(
            "/skill-file/move",
            {"id": folder["id"], "targetParentId": child["id"]},
            content_type="application/json",
        )
        self.assertEqual(moved.status_code, 400)
        self.client.force_login(self.other)
        self.assertEqual(
            self.client.get("/skill-file/content", {"id": folder["id"]}).status_code, 404
        )

    def test_sandbox_upload_denies_missing_token(self):
        result = self.client.post(
            "/workflow/artifacts/internal-upload",
            {"uid": self.user.pk, "flowId": "flow", "file": SimpleUploadedFile("a.txt", b"text")},
        )
        self.assertEqual(result.status_code, 403)

    @override_settings(SKILL_SANDBOX_ARTIFACT_UPLOAD_TOKEN="x" * 40)
    def test_sandbox_upload_unknown_workflow_is_404(self):
        result = self.client.post(
            "/workflow/artifacts/internal-upload",
            {
                "uid": self.user.pk,
                "flowId": "missing",
                "file": SimpleUploadedFile("a.txt", b"text"),
            },
            HTTP_X_SKILL_SANDBOX_ARTIFACT_TOKEN="x" * 40,
        )
        self.assertEqual(result.status_code, 404, result.content)

    def test_legacy_artifact_pointer_preserved_and_escaping_rejected(self):
        artifact = Artifact(
            workflow_id=12, object_key="workflow/artifacts/12/old.txt", bucket_name=None
        )
        self.assertEqual(files.artifact_location(artifact)[1], artifact.object_key)
        artifact.object_key = "workflow/artifacts/12/../private"
        with self.assertRaises(Http404):
            files.artifact_location(artifact)

    def test_database_user_values_remain_bound_parameters(self):
        db = Database.objects.create(name="db", uid=self.user.pk, db_id=733, app_id="app")
        table = DatabaseTable.objects.create(db_id=db.pk, name="notes")
        DatabaseField.objects.create(tb_id=table.pk, name="body", type="String", is_system=False)
        schema = databases.table_schema(table)
        compiled = (
            insert(schema)
            .values(body="x'); DROP TABLE notes; --")
            .compile(dialect=databases.dialect())
        )
        self.assertNotIn("DROP TABLE", str(compiled))
        self.assertIn("DROP TABLE", compiled.params["body"])
        with self.assertRaises(ValidationError):
            databases.identifier("notes; DROP TABLE user_info")

    def test_database_failure_preserves_mapping(self):
        db = Database.objects.create(name="db", uid=self.user.pk, db_id=733, app_id="app")
        with patch(
            "astron_console.knowledge.clients.database",
            side_effect=clients.ResourceServiceError("不可用"),
        ):
            self.assertEqual(self.post("/db/delete", {"id": db.pk}).status_code, 502)
        db.refresh_from_db()
        self.assertFalse(db.deleted)
        self.assertEqual(db.db_id, 733)

    @patch("astron_console.knowledge.storage.client")
    @override_settings(
        OSS_BUCKET_CONSOLE="console-private", SKILL_SANDBOX_ARTIFACT_BUCKET="artifacts-private"
    )
    def test_storage_initialization_preserves_existing_policies(self, client):
        sdk = client.return_value
        sdk.bucket_exists.side_effect = [True, False]
        self.assertEqual(storage.initialize_buckets(), ["artifacts-private"])
        sdk.make_bucket.assert_called_once_with(bucket_name="artifacts-private")
        sdk.set_bucket_policy.assert_not_called()
        sdk.delete_bucket_policy.assert_not_called()
        with override_settings(SKILL_SANDBOX_ARTIFACT_BUCKET="console-private"):
            with self.assertRaises(clients.ResourceServiceError):
                storage.initialize_buckets()

    @patch("astron_console.knowledge.storage.download", return_value="https://storage/signed")
    @patch("astron_console.knowledge.storage.put")
    def test_skill_directory_upload_returns_tree_and_validates_paths(self, put, _):
        response = self.client.post(
            "/skill-file/upload-directory",
            {
                "files": SimpleUploadedFile("SKILL.md", b"hello"),
                "pathsJson": json.dumps(["skill/SKILL.md"]),
            },
        )
        self.assertEqual(response.status_code, 200, response.content)
        tree = response.json()["data"]["tree"]
        self.assertEqual(tree[0]["children"][0]["name"], "SKILL.md")
        response = self.client.post(
            "/skill-file/upload-directory",
            {
                "files": SimpleUploadedFile("bad.md", b"hello"),
                "paths": "[broken",
            },
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(put.call_count, 1)

    @patch("astron_console.knowledge.storage.download", return_value="https://storage/signed")
    @patch("astron_console.knowledge.storage.put")
    def test_image_uses_stable_scoped_authenticated_url(self, put, download):
        from urllib.parse import urlsplit

        response = self.client.post(
            "/image/upload", {"file": SimpleUploadedFile("icon.png", b"\x89PNG\r\n\x1a\ncontent")}
        )
        self.assertEqual(response.status_code, 200, response.content)
        location = response.json()["data"]["downloadLink"]
        self.assertNotIn("signed", location)
        path = urlsplit(location).path.removeprefix("/console-api")
        self.assertEqual(self.client.get(path).status_code, 302)
        self.client.force_login(self.other)
        self.assertEqual(self.client.get(path).status_code, 403)
        self.assertEqual(Client().get(path).status_code, 401)
        download.assert_called_once()
        put.assert_called_once()

    @patch("astron_console.knowledge.clients.rag")
    @patch("astron_console.knowledge.clients.database")
    def test_invalid_metadata_rejected_before_core_write(self, database, rag):
        result = self.post(
            "/repo/create-repo",
            {"name": "bad", "tag": "Ragflow-RAG", "visibility": 1, "uids": ["unknown"]},
        )
        self.assertEqual(result.status_code, 400)
        result = self.post("/db/create", {"name": "bad", "description": "x" * 256})
        self.assertEqual(result.status_code, 400)
        database.assert_not_called()
        rag.assert_not_called()

    @patch("astron_console.knowledge.databases.dml")
    def test_database_export_all_pages_and_selection(self, dml):
        from openpyxl import load_workbook

        db = Database.objects.create(name="db", uid=self.user.pk, db_id=733)
        table = DatabaseTable.objects.create(db_id=db.pk, name="notes")
        dml.side_effect = [[{"id": i} for i in range(1, 1001)], [{"id": 1001}]]
        response = self.post("/db/export-table-data", {"tbId": table.pk, "dataIds": []})
        self.assertEqual(response.status_code, 200, response.content[:100])
        workbook = load_workbook(io.BytesIO(response.content), read_only=True)
        self.assertEqual(len(list(workbook.active.values)), 1002)
        workbook.close()
        dml.reset_mock(side_effect=True)
        dml.return_value = [{"id": 2}]
        response = self.post("/db/export-table-data", {"tbId": table.pk, "dataIds": [2]})
        self.assertEqual(response.status_code, 200)
        statement = dml.call_args.args[2].compile(dialect=databases.dialect())
        self.assertIn([2], statement.params.values())

    @patch("astron_console.knowledge.storage.download", return_value="https://storage/signed")
    def test_summary_and_violation_export_match_frontend_contract(self, _):
        from openpyxl import load_workbook

        file = Document.objects.create(
            repo_id=self.repo.pk,
            uid=self.user.pk,
            name="note.txt",
            uuid="doc",
            last_uuid="preview",
            current_slice_config='{"type":1,"lengthRange":[10,20]}',
        )
        Chunk.objects.create(id="chunk", file_id="doc", char_count="12", dialog_hit_count=2)
        PreviewChunk.objects.create(
            id="review",
            file_id="preview",
            content=json.dumps(
                {"auditSuggest": "review", "knowledge": "=unsafe", "auditDetail": []}
            ),
        )
        PreviewChunk.objects.create(id="pass", file_id="preview", content='{"auditSuggest":"pass"}')
        response = self.post("/file/file-summary", {"fileIds": [file.pk]})
        data = response.json()["data"]
        self.assertEqual(
            (data["knowledgeCount"], data["knowledgeTotalLength"], data["hitCount"]), (1, 12, 2)
        )
        self.assertEqual(data["lengthRange"], [10, 20])
        response = self.post(
            "/file/download-knowledge-by-violation", {"fileIds": [file.pk], "source": 0}
        )
        self.assertEqual(response.status_code, 200)
        workbook = load_workbook(io.BytesIO(response.content), read_only=True)
        rows = list(workbook.active.rows)
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[1][2].value, "=unsafe")
        self.assertEqual(rows[1][2].data_type, "s")
        workbook.close()

    @patch("astron_console.knowledge.clients.httpx.Client")
    def test_snowflake_row_id_roundtrips_to_edit_delete_without_changing_business_numbers(
        self, http
    ):
        identifier = 1981998123456789011
        db = Database.objects.create(name="db", uid=self.user.pk, db_id=733)
        table = DatabaseTable.objects.create(db_id=db.pk, name="notes")
        DatabaseField.objects.create(tb_id=table.pk, name="amount", type="Integer")
        upstream = http.return_value.__enter__.return_value.post
        upstream.return_value.json.side_effect = [
            {"code": 0, "data": {"exec_success": [{"id": identifier, "amount": 42}]}},
            {"code": 0, "data": {"exec_success": [{"count": 1}]}},
            {"code": 0, "data": {"exec_success": []}},
            {"code": 0, "data": {"exec_success": []}},
        ]
        response = self.post("/db/select-table-data", {"tbId": table.pk, "execDev": 1})
        self.assertEqual(response.status_code, 200, response.content)
        record = response.json()["data"]["records"][0]
        self.assertEqual(record, {"id": str(identifier), "amount": 42})
        for operation in (2, 4):
            response = self.post(
                "/db/operate-table-data",
                {
                    "tbId": table.pk,
                    "execDev": 1,
                    "data": [{"operateType": operation, "tableData": record}],
                },
            )
            self.assertEqual(response.status_code, 200, response.content)
            request = upstream.call_args.kwargs["json"]
            self.assertIn(identifier, request["params"].values())
            self.assertNotIn(str(identifier), request["dml"])
        self.assertEqual(upstream.call_count, 4)

    @patch("astron_console.knowledge.clients.httpx.Client")
    def test_selected_export_sends_expanded_bound_parameters_to_core(self, http):
        from openpyxl import load_workbook

        identifier = 1981998123456789011
        db = Database.objects.create(name="db", uid=self.user.pk, db_id=733)
        table = DatabaseTable.objects.create(db_id=db.pk, name="notes")
        upstream = http.return_value.__enter__.return_value.post
        upstream.return_value.json.return_value = {
            "code": 0,
            "data": {"exec_success": [{"id": identifier}]},
        }
        for engine in ("postgresql", "mysql"):
            with self.subTest(engine=engine), override_settings(SPARK_DB_TYPE=engine):
                response = self.post(
                    "/db/export-table-data",
                    {
                        "tbId": table.pk,
                        "execDev": 1,
                        "dataIds": [str(identifier), "2"],
                    },
                )
                self.assertEqual(response.status_code, 200, response.content[:100])
                request = upstream.call_args.kwargs["json"]
                self.assertNotIn("POSTCOMPILE", request["dml"])
                self.assertRegex(request["dml"], r"IN \(:(console_value_\d+)_1, :\1_2\)")
                self.assertIn(identifier, request["params"].values())
                self.assertIn(2, request["params"].values())
                self.assertTrue(
                    all(name.startswith("console_value_") for name in request["params"])
                )
                self.assertNotIn(str(identifier), request["dml"])
                # Core reparses the statement with text(); every transmitted bind must survive.
                parsed = sql_text(request["dml"]).bindparams(**request["params"]).compile()
                self.assertEqual(parsed.params, request["params"])
                workbook = load_workbook(io.BytesIO(response.content), read_only=True)
                self.assertEqual(list(workbook.active.values)[1][0], str(identifier))
                workbook.close()

    @patch("astron_console.knowledge.clients.knowledge_headers", return_value={})
    @patch("astron_console.knowledge.clients.httpx.Client")
    def test_code_zero_partial_chunk_failure_preserves_local_state(self, http, _):
        self.repo.tag = "Ragflow-RAG"
        self.repo.save()
        file = Document.objects.create(
            repo_id=self.repo.pk, uid=self.user.pk, name="note.txt", uuid="doc", enabled=0, status=5
        )
        entry = Directory.objects.create(app_id=str(self.repo.pk), file_id=file.pk, is_file=True)
        chunk = Chunk.objects.create(
            id="chunk", file_id="doc", content='{"content":"old"}', char_count="3", enabled=False
        )
        upstream = http.return_value.__enter__.return_value.post
        upstream.return_value.json.return_value = {
            "code": 0,
            "data": {"failedChunk": {"chunk": "provider rejected"}},
        }
        for url, params in [
            ("/knowledge/update-knowledge", {"id": chunk.pk, "content": "new"}),
            ("/knowledge/create-knowledge", {"fileId": file.pk, "content": "new"}),
            ("/knowledge/enable-knowledge", {"id": chunk.pk, "enabled": 1}),
            ("/file/enable-file", {"id": entry.pk, "enabled": 1}),
        ]:
            with self.subTest(url=url):
                response = self.post(url, params)
                self.assertEqual(response.status_code, 502, response.content)
                chunk.refresh_from_db()
                file.refresh_from_db()
                self.assertEqual(
                    (chunk.content, chunk.char_count, chunk.enabled),
                    ('{"content":"old"}', "3", False),
                )
                self.assertEqual((file.enabled, file.status), (0, 5))
                self.assertEqual(Chunk.objects.count(), 1)
        upstream.return_value.json.return_value = {"code": 0, "data": None}
        response = self.post("/knowledge/update-knowledge", {"id": chunk.pk, "content": "new"})
        self.assertEqual(response.status_code, 200, response.content)
        chunk.refresh_from_db()
        self.assertEqual(json.loads(chunk.content)["content"], "new")

    @patch("astron_console.knowledge.clients.rag", return_value=[{"id": "one-success"}])
    def test_partial_save_list_does_not_enable_file_or_replace_embedded_chunks(self, rag):
        self.repo.tag = "Ragflow-RAG"
        self.repo.save()
        file = Document.objects.create(
            repo_id=self.repo.pk,
            uid=self.user.pk,
            name="note.txt",
            uuid="old-doc",
            last_uuid="preview-doc",
            enabled=0,
            status=2,
        )
        entry = Directory.objects.create(app_id=str(self.repo.pk), file_id=file.pk, is_file=True)
        for index in range(2):
            Chunk.objects.create(
                id=str(index),
                file_id="old-doc",
                content='{"content":"old"}',
                char_count="3",
                enabled=False,
                source=True,
            )
            PreviewChunk.objects.create(
                id="preview-" + str(index),
                file_id="preview-doc",
                content='{"content":"new"}',
                char_count="3",
            )
        response = self.post("/file/enable-file", {"id": entry.pk, "enabled": 1})
        self.assertEqual(response.status_code, 502)
        self.assertFalse(Chunk.objects.filter(enabled=True).exists())
        response = self.post("/file/embedding", {"fileIds": [file.pk]})
        self.assertEqual(response.status_code, 502)
        file.refresh_from_db()
        self.assertEqual((file.status, file.uuid, file.enabled), (4, "old-doc", 0))
        self.assertEqual(Chunk.objects.filter(deleted=False).count(), 2)
        self.assertFalse(Chunk.objects.filter(file_id="preview-doc").exists())

    def test_directory_breadcrumb_uses_directory_identity_including_empty_folder(self):
        root = Directory.objects.create(app_id=str(self.repo.pk), name="parent", parent_id=-1)
        folder = Directory.objects.create(app_id=str(self.repo.pk), name="empty", parent_id=root.pk)
        # A same-numbered foreign Document must not change which namespace is authorized.
        foreign = Repo.objects.create(user_id=self.other.pk, name="foreign", tag="AIUI-RAG2")
        Document.objects.create(id=folder.pk, repo_id=foreign.pk, uid=self.other.pk, name="wrong")
        response = self.client.get(
            "/file/list-file-directory-tree",
            {
                "repoId": self.repo.pk,
                "fileId": folder.pk,
            },
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual([row["id"] for row in response.json()["data"]], [root.pk, folder.pk])
        for root_id in ("", -1, 0):
            response = self.client.get(
                "/file/list-file-directory-tree",
                {
                    "repoId": self.repo.pk,
                    "fileId": root_id,
                },
            )
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["data"], [])
        self.client.force_login(self.other)
        self.assertEqual(
            self.client.get(
                "/file/list-file-directory-tree",
                {
                    "fileId": folder.pk,
                },
            ).status_code,
            403,
        )

    def test_directory_breadcrumb_rejects_foreign_parent_and_cycles(self):
        foreign = Repo.objects.create(user_id=self.other.pk, name="foreign", tag="AIUI-RAG2")
        parent = Directory.objects.create(app_id=str(foreign.pk), name="secret", parent_id=-1)
        folder = Directory.objects.create(
            app_id=str(self.repo.pk), name="folder", parent_id=parent.pk
        )
        response = self.client.get(
            "/file/list-file-directory-tree",
            {
                "repoId": self.repo.pk,
                "fileId": parent.pk,
            },
        )
        self.assertEqual(response.status_code, 403)
        response = self.client.get(
            "/file/list-file-directory-tree",
            {
                "repoId": self.repo.pk,
                "fileId": folder.pk,
            },
        )
        self.assertEqual(response.status_code, 400)
        self.assertNotIn("secret", response.content.decode())
        folder.parent_id = folder.pk
        folder.save()
        self.assertEqual(
            self.client.get(
                "/file/list-file-directory-tree",
                {
                    "repoId": self.repo.pk,
                    "fileId": folder.pk,
                },
            ).status_code,
            400,
        )

    def ragflow_lifecycle(self, remote):
        """Model Core's delete-by-ID and save-with-new-ID contract, including stale-ID failures."""
        sequence = 0

        def invoke(repo, path, payload):
            nonlocal sequence
            if path == "/chunk/delete":
                identifiers = payload.get("chunkIds")
                self.assertTrue(identifiers, "Core rejects empty chunkIds")
                self.assertTrue(set(identifiers) <= set(remote), "Stale remote chunk ID")
                for identifier in identifiers:
                    del remote[identifier]
                return None
            if path == "/chunks/save":
                results = []
                for chunk in payload["chunks"]:
                    self.assertNotIn(chunk["chunkId"], remote, "Already-enabled chunk saved twice")
                    sequence += 1
                    identifier = "provider-new-" + str(sequence)
                    remote[identifier] = chunk["content"]
                    results.append({"id": identifier, "dataIndex": identifier})
                return results
            if path == "/chunk/update":
                chunk = payload["chunks"][0]
                self.assertIn(chunk["chunkId"], remote)
                self.assertEqual(chunk["id"], chunk["chunkId"])
                self.assertEqual(chunk["dataIndex"], chunk["chunkId"])
                remote[chunk["chunkId"]] = chunk["content"]
                return None
            self.fail("Unexpected core operation: " + path)

        return invoke

    @patch("astron_console.knowledge.clients.rag")
    def test_single_chunk_disable_enable_edit_delete_tracks_authoritative_id(self, rag):
        self.repo.tag = "Ragflow-RAG"
        self.repo.save()
        file = Document.objects.create(
            repo_id=self.repo.pk, uid=self.user.pk, uuid="doc", enabled=1
        )
        original = Chunk.objects.create(
            id="old",
            file_id=file.uuid,
            content='{"content":"before","chunkId":"old","dataIndex":"old","id":"old"}',
            enabled=True,
            seq_id=19,
            dialog_hit_count=7,
        )
        remote = {"old": "before"}
        rag.side_effect = self.ragflow_lifecycle(remote)
        response = self.post("/knowledge/enable-knowledge", {"id": "old", "enabled": 0})
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(remote, {})
        response = self.post("/knowledge/enable-knowledge", {"id": "old", "enabled": 1})
        self.assertEqual(response.status_code, 200, response.content)
        identifier = response.json()["data"]["id"]
        self.assertEqual(identifier, "provider-new-1")
        self.assertFalse(Chunk.objects.filter(pk=original.pk).exists())
        self.assertEqual(Chunk.objects.count(), 1)
        current = Chunk.objects.get()
        self.assertEqual((current.seq_id, current.dialog_hit_count), (19, 7))
        stored = json.loads(current.content)
        self.assertEqual([stored[key] for key in ("id", "chunkId", "dataIndex")], [identifier] * 3)
        calls = rag.call_count
        self.assertEqual(
            self.post(
                "/knowledge/enable-knowledge",
                {
                    "id": identifier,
                    "enabled": 1,
                },
            ).status_code,
            200,
        )
        self.assertEqual(rag.call_count, calls)
        self.assertEqual(
            self.post(
                "/knowledge/update-knowledge",
                {
                    "id": identifier,
                    "content": "edited",
                },
            ).status_code,
            200,
        )
        self.assertEqual(remote[identifier], "edited")
        self.assertEqual(
            self.post("/knowledge/delete-knowledge", {"id": identifier}).status_code, 200
        )
        self.assertEqual(remote, {})
        self.assertFalse(Chunk.objects.filter(deleted=False).exists())

    @patch("astron_console.knowledge.clients.rag")
    def test_file_disable_enable_edit_delete_tracks_all_ids_and_skips_disabled(self, rag):
        self.repo.tag = "Ragflow-RAG"
        self.repo.save()
        file = Document.objects.create(
            repo_id=self.repo.pk, uid=self.user.pk, uuid="doc", enabled=1
        )
        entry = Directory.objects.create(app_id=str(self.repo.pk), file_id=file.pk, is_file=True)
        for index, enabled in enumerate((True, False)):
            Chunk.objects.create(
                id="old-" + str(index),
                file_id=file.uuid,
                enabled=enabled,
                content=json.dumps({"content": "body-" + str(index)}),
                seq_id=index + 1,
            )
        remote = {"old-0": "body-0"}
        rag.side_effect = self.ragflow_lifecycle(remote)
        response = self.post("/file/enable-file", {"id": entry.pk, "enabled": 0})
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(rag.call_args.args[2]["chunkIds"], ["old-0"])
        self.assertEqual(
            self.post("/file/enable-file", {"id": entry.pk, "enabled": 0}).status_code, 200
        )
        self.assertEqual(rag.call_count, 1)
        response = self.post("/file/enable-file", {"id": entry.pk, "enabled": 1})
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(Chunk.objects.count(), 2)
        self.assertFalse(Chunk.objects.filter(pk__startswith="old-").exists())
        self.assertEqual(
            list(Chunk.objects.order_by("seq_id").values_list("id", flat=True)),
            ["provider-new-1", "provider-new-2"],
        )
        for chunk in Chunk.objects.all():
            self.assertEqual(
                [json.loads(chunk.content)[key] for key in ("id", "chunkId", "dataIndex")],
                [chunk.pk] * 3,
            )
        calls = rag.call_count
        self.assertEqual(
            self.post("/file/enable-file", {"id": entry.pk, "enabled": 1}).status_code, 200
        )
        self.assertEqual(rag.call_count, calls)
        response = self.post(
            "/knowledge/update-knowledge", {"id": "provider-new-1", "content": "edited"}
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(remote["provider-new-1"], "edited")
        response = self.post("/file/delete-file", {"id": entry.pk})
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            set(rag.call_args.args[2]["chunkIds"]), {"provider-new-1", "provider-new-2"}
        )
        self.assertEqual(remote, {})
        self.assertFalse(Document.objects.filter(pk=file.pk).exists())

    @patch("astron_console.knowledge.clients.rag")
    def test_empty_file_disable_delete_never_calls_delete_with_empty_ids(self, rag):
        file = Document.objects.create(repo_id=self.repo.pk, uid=self.user.pk, uuid="doc", status=5)
        entry = Directory.objects.create(app_id=str(self.repo.pk), file_id=file.pk, is_file=True)
        self.assertEqual(
            self.post("/file/enable-file", {"id": entry.pk, "enabled": 0}).status_code, 200
        )
        self.assertEqual(self.post("/file/delete-file", {"id": entry.pk}).status_code, 200)
        rag.assert_not_called()

    @patch("astron_console.knowledge.clients.rag")
    def test_directory_and_repo_delete_send_only_owned_active_chunk_ids(self, rag):
        for action in ("folder", "repo"):
            with self.subTest(action=action):
                repo = Repo.objects.create(user_id=self.user.pk, name=action, tag="CBG-RAG")
                folder = Directory.objects.create(app_id=str(repo.pk), name="folder", parent_id=-1)
                file = Document.objects.create(
                    repo_id=repo.pk, uid=self.user.pk, uuid=action, enabled=1
                )
                Directory.objects.create(
                    app_id=str(repo.pk), file_id=file.pk, is_file=True, parent_id=folder.pk
                )
                Chunk.objects.create(
                    id=action, file_id=file.uuid, enabled=True, content='{"content":"body"}'
                )
                Chunk.objects.create(id=action + "-disabled", file_id=file.uuid, enabled=False)
                remote = {action: "body"}
                rag.side_effect = self.ragflow_lifecycle(remote)
                response = (
                    self.post("/file/delete-folder", {"id": folder.pk})
                    if action == "folder"
                    else self.post("/repo/delete-repo", {"id": repo.pk})
                )
                self.assertEqual(response.status_code, 200, response.content)
                self.assertEqual(remote, {})
                self.assertEqual(rag.call_args.args[2]["chunkIds"], [action])
                self.assertFalse(Document.objects.filter(pk=file.pk).exists())

    @patch("astron_console.knowledge.clients.knowledge_headers", return_value={})
    @patch("astron_console.knowledge.clients.httpx.Client")
    @patch("astron_console.knowledge.storage.remove")
    def test_code_zero_failed_delete_preserves_metadata_and_objects(self, remove, http, _):
        file = Document.objects.create(
            repo_id=self.repo.pk, uid=self.user.pk, uuid="doc", enabled=1, address="existing-key"
        )
        entry = Directory.objects.create(app_id=str(self.repo.pk), file_id=file.pk, is_file=True)
        chunk = Chunk.objects.create(id="active", file_id=file.uuid, enabled=True)
        upstream = http.return_value.__enter__.return_value.post
        upstream.return_value.json.return_value = {
            "code": 0,
            "data": {"failedChunk": {"active": "failure"}},
        }
        for url, data in [
            ("/file/delete-file", {"id": entry.pk}),
            ("/file/enable-file", {"id": entry.pk, "enabled": 0}),
            ("/knowledge/delete-knowledge", {"id": chunk.pk}),
        ]:
            with self.subTest(url=url):
                response = self.post(url, data)
                self.assertEqual(response.status_code, 502, response.content)
                file.refresh_from_db()
                chunk.refresh_from_db()
                self.assertEqual(file.enabled, 1)
                self.assertTrue(chunk.enabled)
                self.assertFalse(chunk.deleted)
                self.assertEqual(upstream.call_args.kwargs["json"]["chunkIds"], ["active"])
        remove.assert_not_called()

    @patch("astron_console.knowledge.clients.rag")
    def test_created_chunk_and_reenable_collision_preserve_identity(self, rag):
        self.repo.tag = "Ragflow-RAG"
        self.repo.save()
        file = Document.objects.create(
            repo_id=self.repo.pk, uid=self.user.pk, uuid="doc", enabled=0
        )
        rag.return_value = [{"id": "created", "dataIndex": "created"}]
        response = self.post("/knowledge/create-knowledge", {"fileId": file.pk, "content": "body"})
        self.assertEqual(response.status_code, 200, response.content)
        created = Chunk.objects.get(pk="created")
        self.assertTrue(created.enabled)
        self.assertEqual(
            [json.loads(created.content)[key] for key in ("id", "chunkId", "dataIndex")],
            ["created"] * 3,
        )
        disabled = Chunk.objects.create(
            id="disabled", file_id=file.uuid, enabled=False, content='{"content":"old"}'
        )
        response = self.post("/knowledge/enable-knowledge", {"id": disabled.pk, "enabled": 1})
        self.assertEqual(response.status_code, 502)
        disabled.refresh_from_db()
        self.assertFalse(disabled.enabled)
        self.assertEqual(disabled.content, '{"content":"old"}')
        self.assertEqual(Chunk.objects.count(), 2)

    @patch("astron_console.knowledge.clients.knowledge_headers", return_value={})
    @patch("astron_console.knowledge.clients.httpx.Client")
    @patch("astron_console.knowledge.storage.read", return_value=b"source document")
    def test_ragflow_split_to_embedding_preserves_parsed_chunk_identity(self, _, http, headers):
        self.repo.tag = "Ragflow-RAG"
        self.repo.ragflow_dataset_id = "dataset"
        self.repo.save()
        file = Document.objects.create(
            repo_id=self.repo.pk,
            uid=self.user.pk,
            name="note.txt",
            type="txt",
            address="stored-key",
            uuid="local-doc",
            status=-1,
        )
        # RAGFlow split has already persisted this chunk and returns dataIndex, not chunkId.
        parsed = {
            "docId": "provider-doc",
            "dataIndex": "parsed-chunk",
            "content": "parsed text",
            "title": "Title",
            "context": "context",
            "references": {"source": "retained"},
        }
        provider_chunks = {"parsed-chunk": "parsed text"}
        upstream = http.return_value.__enter__.return_value.post
        responses = upstream.return_value

        def core_response():
            path = upstream.call_args.args[0]
            if path.endswith("/document/upload"):
                return {"code": 0, "data": [parsed]}
            self.assertTrue(path.endswith("/chunks/save"))
            body = upstream.call_args.kwargs["json"]
            submitted = body["chunks"][0]
            self.assertEqual(submitted["dataIndex"], parsed["dataIndex"])
            self.assertEqual(submitted["chunkId"], parsed["dataIndex"])
            self.assertEqual(submitted["references"], parsed["references"])
            # Match Core's lookup: an overwritten dataIndex would add a duplicate remote chunk.
            identifier = submitted["dataIndex"]
            if identifier not in provider_chunks:
                provider_chunks[identifier] = submitted["content"]
            return {"code": 0, "data": [{"id": identifier, "dataIndex": identifier}]}

        responses.json.side_effect = core_response
        response = self.post("/file/slice", {"fileIds": [file.pk], "sliceConfig": {}})
        self.assertEqual(response.status_code, 200, response.content)
        preview = PreviewChunk.objects.get()
        self.assertNotEqual(preview.pk, "parsed-chunk")
        self.assertEqual(json.loads(preview.content), parsed)
        response = self.post("/file/embedding", {"fileIds": [file.pk]})
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(provider_chunks, {"parsed-chunk": "parsed text"})
        chunk = Chunk.objects.get()
        self.assertEqual(chunk.pk, "parsed-chunk")
        self.assertEqual(
            [json.loads(chunk.content)[key] for key in ("id", "chunkId", "dataIndex")],
            ["parsed-chunk"] * 3,
        )
        self.assertEqual(upstream.call_count, 2)


class AdoptionTests(TestCase):
    def test_existing_tables_and_object_pointers_survive_migration(self):
        import os
        import sqlite3
        import subprocess
        import sys
        import tempfile
        from pathlib import Path

        from django.conf import settings

        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "retained.sqlite3"
            db = sqlite3.connect(path)
            db.executescript("""
                CREATE TABLE repo (id INTEGER PRIMARY KEY, user_id VARCHAR(128), space_id BIGINT,
                    core_repo_id VARCHAR(50), ragflow_dataset_id VARCHAR(64), name VARCHAR(64));
                INSERT INTO repo VALUES (17,'old-uid',42,'stable-core','stable-dataset','existing');
                CREATE TABLE file_info_v2 (id INTEGER PRIMARY KEY, repo_id BIGINT, uid VARCHAR(255),
                    uuid VARCHAR(64),address VARCHAR(255),space_id BIGINT);
                INSERT INTO file_info_v2 VALUES
                    (31,17,'old-uid','stable-doc','sparkBot/existing/file.txt',42);
                CREATE TABLE db_info (id INTEGER PRIMARY KEY,uid VARCHAR(100),
                    db_id BIGINT,name VARCHAR(100));
                INSERT INTO db_info VALUES (21,'old-uid',193,'existing-db');
                CREATE TABLE retained_agent(id INTEGER PRIMARY KEY,uid VARCHAR(128),
                    configuration TEXT);
                INSERT INTO retained_agent VALUES(12,'old-uid','existing-config');
            """)
            db.commit()
            env = {
                **os.environ,
                "DJANGO_SETTINGS_MODULE": "astron_console.settings",
                "CONSOLE_DATABASE_ENGINE": "sqlite",
                "CONSOLE_SQLITE_PATH": str(path),
                "CONSOLE_SECRET_KEY": "migration-test-key-" * 5,
            }
            for _ in range(2):
                result = subprocess.run(
                    [sys.executable, "manage.py", "migrate", "--noinput"],
                    cwd=settings.BASE_DIR,
                    env=env,
                    capture_output=True,
                    text=True,
                    timeout=60,
                )
                self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(
                db.execute(
                    "SELECT user_id,space_id,core_repo_id,ragflow_dataset_id FROM repo WHERE id=17"
                ).fetchone(),
                ("old-uid", 42, "stable-core", "stable-dataset"),
            )
            self.assertEqual(
                db.execute(
                    "SELECT uid,uuid,address,space_id FROM file_info_v2 WHERE id=31"
                ).fetchone(),
                ("old-uid", "stable-doc", "sparkBot/existing/file.txt", 42),
            )
            self.assertEqual(
                db.execute("SELECT uid,db_id FROM db_info WHERE id=21").fetchone(), ("old-uid", 193)
            )
            self.assertEqual(
                db.execute("SELECT uid,configuration FROM retained_agent").fetchone(),
                ("old-uid", "existing-config"),
            )
            db.close()

    def test_mysql_bit_values_decode_without_rewriting_data(self):
        from astron_console.fields import StoredBooleanField

        field = StoredBooleanField()
        self.assertIs(field.from_db_value(b"\x00", None, None), False)
        self.assertIs(field.from_db_value(b"\x01", None, None), True)
