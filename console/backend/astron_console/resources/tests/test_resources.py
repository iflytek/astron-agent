import json
from unittest.mock import patch

from django.db import connection
from django.test import Client, TransactionTestCase, override_settings

from astron_console.accounts.models import User, UserProfile
from astron_console.resources.common import UpstreamError
from astron_console.resources.models import (
    ConfigInfo,
    McpConfig,
    Model,
    OfficialModel,
    SandboxConfig,
    Tool,
    WorkflowScope,
)
from astron_console.spaces.models import Space, SpaceMember, SpacePermission

SCHEMA = {
    "openapi": "3.0.3",
    "info": {"title": "Lookup", "version": "1"},
    "servers": [{"url": "https://example.com"}],
    "paths": {
        "/lookup": {"get": {"operationId": "lookup", "responses": {"200": {"description": "OK"}}}}
    },
    "components": {
        "securitySchemes": {
            "apiKey": {
                "type": "apiKey",
                "in": "header",
                "name": "X-Key",
                "x-value": "retained-secret",
            }
        }
    },
}


@override_settings(
    RESOURCE_APP_ID="test-app",
    WORKFLOW_INTERNAL_API_KEY="internal-key",
    SKILL_SANDBOX_RUNTIME_CREDENTIAL_TOKEN="sandbox-key",
)
class ResourceTests(TransactionTestCase):
    def setUp(self):
        self.user = User.objects.create_user(id="legacy-owner", username="owner")
        self.other = User.objects.create_user(id="other-owner", username="other")
        for user in [self.user, self.other]:
            UserProfile.objects.create(uid=user.pk, username=user.username)
        self.client.force_login(self.user)
        self.model = Model.objects.create(
            uid=self.user.pk,
            name="Retained model",
            domain="model-v1",
            provider="openai",
            url="https://example.com/v1/chat/completions",
            api_key="retained-secret",
            enable=True,
            type=1,
        )

    def write(self, method, url, payload, **headers):
        return getattr(self.client, method)(
            url, json.dumps(payload), content_type="application/json", **headers
        )

    def test_model_masks_secret_and_preserves_identity(self):
        result = self.client.get("/api/model/detail", {"modelId": self.model.pk})
        self.assertEqual(result.status_code, 200, result.content)
        self.assertEqual(result.json()["data"]["uid"], "legacy-owner")
        self.assertNotIn(b"retained-secret", result.content)

    def test_model_list_filters_before_pagination_and_retains_search(self):
        local = Model.objects.create(
            uid=self.user.pk, name="Retained local", type=2, remark="deployment"
        )
        Model.objects.create(uid=self.user.pk, name="Unmatched", type=1)
        cases = [(0, [local.pk, self.model.pk]), (1, [self.model.pk]), (2, [local.pk])]
        for model_filter, expected in cases:
            with (
                self.subTest(model_filter=model_filter),
                patch(
                    "astron_console.resources.clients.call", return_value={"status": "running"}
                ) as call,
            ):
                found = []
                for current in range(1, len(expected) + 1):
                    result = self.write(
                        "post",
                        "/api/model/list",
                        {
                            "type": 2,
                            "filter": model_filter,
                            "name": "Retained",
                            "page": current,
                            "pageSize": 1,
                        },
                    )
                    self.assertEqual(result.status_code, 200, result.content)
                    data = result.json()["data"]
                    self.assertEqual((data["total"], data["pages"]), (len(expected), len(expected)))
                    found.extend(row["id"] for row in data["records"])
                self.assertEqual(found, expected)
                self.assertEqual(call.call_count, 0 if model_filter == 1 else 1)

    def test_third_party_list_does_not_depend_on_local_model_service(self):
        Model.objects.create(uid=self.user.pk, name="Local", type=2, remark="deployment")
        with patch(
            "astron_console.resources.clients.call", side_effect=UpstreamError("unavailable")
        ) as call:
            result = self.write("post", "/api/model/list", {"type": 2, "filter": 1})
            self.assertEqual(result.status_code, 200, result.content)
            self.assertEqual(
                [row["id"] for row in result.json()["data"]["records"]], [self.model.pk]
            )
            call.assert_not_called()
            for model_filter in (0, 2):
                result = self.write("post", "/api/model/list", {"type": 2, "filter": model_filter})
                self.assertEqual(result.status_code, 502, result.content)

    def test_model_type_filters_preserve_personal_and_space_ownership(self):
        SpacePermission.objects.update_or_create(
            permission_key="ModelController_list_POST", defaults={"owner": True}
        )
        space = Space.objects.create(name="Own space", uid=self.user.pk)
        SpaceMember.objects.create(space_id=space.pk, uid=self.user.pk, role=1)
        foreign_space = Space.objects.create(name="Foreign space", uid=self.other.pk)
        expected = {None: {1: self.model.pk}, space.pk: {}}
        for model_type in (1, 2):
            if model_type == 2:
                expected[None][2] = Model.objects.create(uid=self.user.pk, type=2).pk
            expected[space.pk][model_type] = Model.objects.create(
                uid=self.other.pk, space_id=space.pk, type=model_type
            ).pk
            Model.objects.create(uid=self.other.pk, type=model_type)
            Model.objects.create(uid=self.user.pk, space_id=foreign_space.pk, type=model_type)
            Model.objects.create(uid=self.user.pk, type=model_type, is_deleted=True)
        for scope, types in expected.items():
            headers = {} if scope is None else {"HTTP_SPACE_ID": str(scope)}
            for model_filter in (0, 1, 2):
                with self.subTest(scope=scope, model_filter=model_filter):
                    result = self.write(
                        "post", "/api/model/list", {"type": 2, "filter": model_filter}, **headers
                    )
                    self.assertEqual(result.status_code, 200, result.content)
                    ids = {row["id"] for row in result.json()["data"]["records"]}
                    expected_ids = (
                        set(types.values()) if model_filter == 0 else {types[model_filter]}
                    )
                    self.assertEqual(ids, expected_ids)
        for model_filter in (0, 1, 2):
            result = self.write(
                "post",
                "/api/model/list",
                {"type": 2, "filter": model_filter},
                HTTP_SPACE_ID=str(foreign_space.pk),
            )
            self.assertEqual(result.status_code, 403)

    def test_model_filter_validation_and_official_branch(self):
        for value in (-1, 3, "1", None, True, 1.5, [], {}):
            with self.subTest(value=value):
                result = self.write("post", "/api/model/list", {"type": 2, "filter": value})
                self.assertEqual(result.status_code, 400, result.content)
        result = self.write("post", "/api/model/list", {"type": 2})
        self.assertEqual(result.status_code, 200, result.content)
        self.assertEqual(result.json()["data"]["total"], 1)
        official = OfficialModel.objects.create(name="Official")
        for model_filter in (0, 1, 2):
            result = self.write("post", "/api/model/list", {"type": 1, "filter": model_filter})
            self.assertEqual(result.status_code, 200, result.content)
            self.assertEqual([row["id"] for row in result.json()["data"]["records"]], [official.pk])

    def test_cross_personal_access_denied_before_probe(self):
        self.client.force_login(self.other)
        self.assertEqual(
            self.client.get("/api/model/detail", {"modelId": self.model.pk}).status_code, 403
        )
        with patch("astron_console.resources.clients.probe_model") as probe:
            result = self.write("post", "/api/model", {"id": self.model.pk, "modelName": "stolen"})
        self.assertEqual(result.status_code, 403)
        probe.assert_not_called()

    def test_invalid_or_unauthorized_space_never_falls_back(self):
        self.assertEqual(
            self.client.get(
                "/api/model/detail", {"modelId": self.model.pk}, HTTP_SPACE_ID="bad"
            ).status_code,
            400,
        )
        space = Space.objects.create(name="Private", uid=self.other.pk)
        self.assertEqual(
            self.write("post", "/api/model/list", {}, HTTP_SPACE_ID=str(space.pk)).status_code, 403
        )

    def test_persisted_space_role_rule_is_enforced(self):
        space = Space.objects.create(name="Team", uid=self.user.pk)
        SpaceMember.objects.create(space_id=space.pk, uid=self.user.pk, role=3)
        SpacePermission.objects.update_or_create(
            permission_key="ModelController_validateModel_POST", defaults={"member": False}
        )
        row = Model.objects.create(uid=self.other.pk, space_id=space.pk, name="Shared", enable=True)
        result = self.write("post", "/api/model", {"id": row.pk}, HTTP_SPACE_ID=str(space.pk))
        self.assertEqual(result.status_code, 403)

    def model_payload(self):
        return {
            "id": self.model.pk,
            "modelName": "Changed",
            "domain": "model-v1",
            "description": "desc",
            "endpoint": "https://example.com/v1",
            "apiKey": "********",
            "apiKeyMasked": False,
        }

    def test_model_probe_failure_does_not_save(self):
        with patch(
            "astron_console.resources.clients.probe_model",
            side_effect=UpstreamError("probe failed"),
        ):
            result = self.write("post", "/api/model", self.model_payload())
        self.assertEqual(result.status_code, 502, result.content)
        self.model.refresh_from_db()
        self.assertEqual(self.model.name, "Retained model")

    def test_model_unchanged_key_loaded_server_side(self):
        with patch(
            "astron_console.resources.clients.probe_model",
            return_value="https://example.com/v1/chat/completions",
        ) as probe:
            result = self.write("post", "/api/model", self.model_payload())
        self.assertEqual(result.status_code, 200, result.content)
        self.assertEqual(probe.call_args.args[2], "retained-secret")
        self.model.refresh_from_db()
        self.assertEqual((self.model.uid, self.model.api_key), ("legacy-owner", "retained-secret"))

    def test_model_delete_requires_write_verb(self):
        self.assertEqual(
            self.client.get("/api/model/delete", {"modelId": self.model.pk}).status_code, 405
        )
        self.assertEqual(
            self.client.delete(f"/api/model/delete?modelId={self.model.pk}").status_code, 200
        )
        self.model.refresh_from_db()
        self.assertTrue(self.model.is_deleted)

    def test_internal_brokers_require_credentials(self):
        for url in [
            "/model/internal-runtime-config?flowId=flow&modelId=1",
            "/skill-sandbox/internal-runtime-config?uid=legacy-owner",
        ]:
            result = self.client.get(url)
            self.assertEqual(result.status_code, 403)
            self.assertNotIn(b"retained-secret", result.content)

    def test_missing_workflow_returns_not_found(self):
        result = self.client.get(
            "/model/internal-runtime-config",
            {"flowId": "missing", "modelId": self.model.pk},
            HTTP_X_WORKFLOW_INTERNAL_KEY="internal-key",
        )
        self.assertEqual(result.status_code, 404)

    def test_internal_model_scope_comes_from_database(self):
        created = "workflow" not in connection.introspection.table_names()
        if created:
            with connection.schema_editor() as editor:
                editor.create_model(WorkflowScope)
        try:
            from astron_console.workflows.models import Workflow

            Workflow.objects.create(
                app_id="app",
                name="retained workflow",
                id=500,
                flow_id="flow-500",
                uid=self.other.pk,
                space_id=None,
                deleted=False,
                data="{}",
            )
            headers = {"HTTP_X_WORKFLOW_INTERNAL_KEY": "internal-key"}
            self.assertEqual(
                self.client.get(
                    "/model/internal-runtime-config",
                    {"flowId": "flow-500", "modelId": self.model.pk, "uid": self.user.pk},
                    **headers,
                ).status_code,
                404,
            )
            WorkflowScope.objects.filter(pk=500).update(uid=self.user.pk)
            result = self.client.get(
                "/model/internal-runtime-config",
                {"flowId": "flow-500", "modelId": self.model.pk},
                **headers,
            )
            self.assertEqual(result.status_code, 200, result.content)
            self.assertEqual(result.json()["data"]["apiKey"], "retained-secret")
            self.assertEqual(result.headers["Cache-Control"], "no-store")
        finally:
            if created:
                with connection.schema_editor() as editor:
                    editor.delete_model(WorkflowScope)

    def test_sandbox_secret_requires_explicit_scope(self):
        SandboxConfig.objects.create(uid=self.user.pk, enabled=True, api_key="sandbox-secret")
        result = self.client.get("/skill-sandbox/config")
        self.assertEqual(result.status_code, 200)
        self.assertNotIn(b"sandbox-secret", result.content)
        headers = {"HTTP_X_SKILL_SANDBOX_RUNTIME_CREDENTIAL_TOKEN": "sandbox-key"}
        self.assertEqual(
            self.client.get("/skill-sandbox/internal-runtime-config", {}, **headers).status_code,
            400,
        )
        result = self.client.get(
            "/skill-sandbox/internal-runtime-config", {"uid": self.user.pk}, **headers
        )
        self.assertEqual(result.json()["data"]["apiKey"], "sandbox-secret")
        self.assertEqual(
            self.client.get(
                "/skill-sandbox/internal-runtime-config", {"uid": self.other.pk}, **headers
            ).status_code,
            404,
        )

    def test_sandbox_connection_failure_not_success(self):
        with patch("e2b.Sandbox.create", side_effect=Exception("credential-secret")):
            result = self.write(
                "post",
                "/skill-sandbox/test",
                {"enabled": True, "apiKey": "sandbox-secret", "timeoutSeconds": 60},
            )
        self.assertEqual(result.status_code, 502, result.content)
        self.assertNotIn(b"credential-secret", result.content)
        self.assertEqual(SandboxConfig.objects.get(uid=self.user.pk).last_test_status, "failed")

    def test_platform_is_admin_only(self):
        ConfigInfo.objects.create(
            category="PLATFORM_ACCOUNT",
            code="AI_ABILITY_CHAT",
            value='{"apiKey":"secret"}',
            is_valid=1,
        )
        self.assertEqual(self.client.get("/api/platform-account/ai_ability_chat").status_code, 403)
        self.user.is_superuser = True
        self.user.save()
        self.client.force_login(self.user)
        result = self.client.get("/api/platform-account/ai_ability_chat")
        self.assertEqual(result.status_code, 200)
        self.assertNotIn(b'"secret"', result.content)

    @override_settings(RESOURCE_ADMIN_UID="legacy-owner")
    def test_retained_admin_uid(self):
        self.assertEqual(self.client.get("/api/platform-account/cards").status_code, 200)

    def test_tool_upstream_failure_does_not_create_local_success(self):
        with patch("astron_console.resources.clients.call", side_effect=UpstreamError("offline")):
            result = self.write(
                "post",
                "/resources/tools",
                {"name": "Lookup", "description": "Look up", "schema": SCHEMA},
            )
        self.assertEqual(result.status_code, 502)
        self.assertFalse(Tool.objects.exists())

    def test_tool_registration_and_secret_mask(self):
        with patch(
            "astron_console.resources.clients.call",
            return_value={"tools": [{"id": "remote-id", "version": "V1.0"}]},
        ) as call:
            result = self.write(
                "post",
                "/resources/tools",
                {"name": "Lookup", "description": "Look up", "schema": SCHEMA},
            )
        self.assertEqual(result.status_code, 200, result.content)
        row = Tool.objects.get()
        self.assertEqual((row.tool_id, row.user_id), ("remote-id", self.user.pk))
        self.assertNotIn(b"retained-secret", result.content)
        self.assertEqual(
            call.call_args.args[:3], ("RESOURCE_TOOL_URL", "POST", "/api/v1/tools/versions")
        )

    def test_public_tool_debug_uses_persisted_endpoint(self):
        row = Tool.objects.create(
            user_id=self.other.pk,
            name="Official",
            tool_id="tool",
            is_public=True,
            deleted=0,
            schema=json.dumps(SCHEMA),
            end_point="https://example.com/lookup",
            method="get",
        )
        with patch("astron_console.resources.clients.call", return_value={"text": "ok"}) as call:
            result = self.write(
                "post",
                f"/resources/tools/{row.pk}/debug",
                {"server": "http://evil.local", "schema": {}, "query": {}},
            )
        self.assertEqual(result.status_code, 200, result.content)
        self.assertEqual(call.call_args.kwargs["payload"]["server"], "https://example.com/lookup")
        self.assertEqual(self.client.delete(f"/resources/tools/{row.pk}").status_code, 403)

    def test_mcp_masks_secrets_and_denies_foreign_delete(self):
        row = McpConfig.objects.create(
            uid=self.user.pk,
            name="MCP",
            parameters='{"token":"secret"}',
            sort_link="https://example.com/secret-link",
        )
        result = self.client.get("/resources/mcp")
        self.assertEqual(result.status_code, 200, result.content)
        self.assertNotIn(b"secret", result.content)
        self.client.force_login(self.other)
        self.assertEqual(self.client.delete(f"/resources/mcp/{row.pk}").status_code, 403)

    def test_csrf_enforced(self):
        client = Client(enforce_csrf_checks=True)
        client.force_login(self.user)
        self.assertEqual(
            client.post("/resources/tools", "{}", content_type="application/json").status_code, 403
        )

    def test_draft_versions_do_not_expose_other_users_drafts(self):
        own = Tool.objects.create(user_id=self.user.pk, name="Own", status=0, deleted=0)
        Tool.objects.create(user_id=self.other.pk, name="Private draft", status=0, deleted=0)
        result = self.client.get(f"/resources/tools/{own.pk}/versions")
        self.assertEqual(result.status_code, 200, result.content)
        self.assertEqual([row["id"] for row in result.json()["data"]], [own.pk])

    def test_tool_schema_credentials_update_preserve_remove_and_debug(self):
        schema = json.loads(json.dumps(SCHEMA))
        schema["security"] = [{"apiKey": []}]
        row = Tool.objects.create(
            user_id=self.user.pk,
            name="Old",
            description="Old description",
            tool_id="remote-id",
            version="V1.0",
            schema=json.dumps(schema),
            auth_info=json.dumps(
                {"location": "header", "parameterName": "X-Key", "serviceToken": "stale-token"}
            ),
            end_point="https://example.com/lookup",
            method="get",
            status=1,
            deleted=0,
        )
        original_id = row.pk
        for expected, supplied in [("new-key", "new-key"), ("new-key", "******"), (None, None)]:
            if supplied is None:
                schema.pop("components")
                schema["security"] = []
            else:
                schema["components"]["securitySchemes"]["apiKey"]["x-value"] = supplied
            with patch(
                "astron_console.resources.clients.call",
                return_value={"result": "Success"},
            ):
                result = self.write(
                    "put",
                    f"/resources/tools/{row.pk}",
                    {
                        "name": "Changed",
                        "description": "Changed description",
                        "schema": schema,
                    },
                )
            self.assertEqual(result.status_code, 200, result.content)
            row = Tool.objects.get(pk=result.json()["data"]["id"])
            self.assertEqual(json.loads(row.auth_info).get("serviceToken"), expected)
            with patch("astron_console.resources.clients.call", return_value={}) as call:
                result = self.write("post", f"/resources/tools/{row.pk}/debug", {})
            self.assertEqual(result.status_code, 200, result.content)
            self.assertEqual(call.call_args.kwargs["payload"]["header"].get("X-Key"), expected)
        self.assertEqual(
            json.loads(Tool.objects.get(pk=original_id).auth_info)["serviceToken"], "stale-token"
        )

    def test_retained_auth_info_only_tool_keeps_working_and_is_editable(self):
        schema = json.loads(json.dumps(SCHEMA))
        schema.pop("components")
        row = Tool.objects.create(
            user_id=self.user.pk,
            name="Retained",
            schema=json.dumps(schema),
            auth_info=json.dumps(
                {"location": "HEADER", "parameterName": "X-Key", "serviceToken": "old-key"}
            ),
            end_point="https://example.com/lookup",
            method="get",
            status=1,
            deleted=0,
        )
        result = self.client.get(f"/resources/tools/{row.pk}")
        self.assertEqual(
            result.json()["data"]["schema"]["components"]["securitySchemes"]["X-Key"]["x-value"],
            "******",
        )
        with patch("astron_console.resources.clients.call", return_value={}) as call:
            result = self.write("post", f"/resources/tools/{row.pk}/debug", {})
        self.assertEqual(result.status_code, 200, result.content)
        self.assertEqual(call.call_args.kwargs["payload"]["header"]["X-Key"], "old-key")

    def test_mcp_details_do_not_expose_upstream_bearer_url(self):
        row = McpConfig.objects.create(
            uid=self.user.pk, name="MCP", sort_link="https://example.com/secret-bearer"
        )
        upstream = {"servers": [{"server_status": 0, "server_url": row.sort_link, "tools": []}]}
        with patch("astron_console.resources.clients.call", return_value=upstream):
            result = self.client.get(f"/resources/mcp/{row.pk}")
        self.assertEqual(result.status_code, 200, result.content)
        self.assertNotIn(b"secret-bearer", result.content)


class RetainedResourceMigrationTests(TransactionTestCase):
    def test_missing_columns_are_added_without_losing_unmapped_legacy_data(self):
        from importlib import import_module

        from django.db.migrations.state import ModelState, ProjectState

        state = ProjectState()
        model_state = ModelState.from_model(McpConfig)
        model_state.options["db_table"] = "retained_mcp_adoption_test"
        state.add_model(model_state)
        historical = state.apps
        migration = import_module("astron_console.resources.migrations.0001_initial")
        with connection.cursor() as cursor:
            cursor.execute(
                "CREATE TABLE retained_mcp_adoption_test "
                "(id bigint PRIMARY KEY, uid varchar(128), old_extra text)"
            )
            cursor.execute(
                "INSERT INTO retained_mcp_adoption_test (id, uid, old_extra) VALUES (%s, %s, %s)",
                [812, "retained-uid", "unmapped-business-configuration"],
            )
        try:
            with connection.schema_editor() as editor:
                migration.adopt_resources(historical, editor)
            retained = historical.get_model("resources", "McpConfig")
            row = retained.objects.get(pk=812)
            self.assertEqual(row.uid, "retained-uid")
            self.assertEqual(row.name, "")
            self.assertFalse(row.is_deleted)
            self.assertIsNone(row.space_id)
            row.name = "Saved name"
            row.space_id = 91
            row.save(update_fields=["name", "space_id"])
            with connection.schema_editor() as editor:
                migration.adopt_resources(historical, editor)
            row.refresh_from_db()
            self.assertEqual((row.name, row.space_id), ("Saved name", 91))
            with connection.cursor() as cursor:
                cursor.execute("SELECT old_extra FROM retained_mcp_adoption_test WHERE id = 812")
                self.assertEqual(cursor.fetchone()[0], "unmapped-business-configuration")
        finally:
            with connection.cursor() as cursor:
                cursor.execute("DROP TABLE retained_mcp_adoption_test")

    def test_repeated_adoption_keeps_existing_ids_owners_keys_and_configs(self):
        # Exercise the migration's existing-table branch against rows populated independently.
        from importlib import import_module

        from django.apps import apps
        from django.db.migrations.state import ProjectState

        Model.objects.create(
            id=724,
            uid="old-uid",
            space_id=817,
            name="Old model",
            api_key="old-key",
            config='[{"key":"temperature"}]',
        )
        ConfigInfo.objects.create(
            id=900,
            category="PLATFORM_ACCOUNT",
            code="AI_ABILITY_CHAT",
            value='{"apiKey":"old-platform-key"}',
            is_valid=1,
        )
        Tool.objects.create(
            id=725,
            tool_id="old-core-tool",
            user_id="old-uid",
            space_id=817,
            schema=json.dumps(SCHEMA),
            auth_info='{"serviceToken":"old-token"}',
        )
        before = {
            model._meta.db_table: list(model.objects.values())
            for model in [Model, ConfigInfo, Tool]
        }
        historical = ProjectState.from_apps(apps).apps
        migration = import_module("astron_console.resources.migrations.0001_initial")
        for _ in range(2):
            with connection.schema_editor() as editor:
                migration.adopt_resources(historical, editor)
        after = {
            model._meta.db_table: list(model.objects.values())
            for model in [Model, ConfigInfo, Tool]
        }
        self.assertEqual(after, before)
