"""Exercise Console against Core's actual DTOs and management/response functions.

HTTP uses MockTransport. Storage, telemetry, ID generation and OpenAPI validation
are isolated; request DTO conversion, version processing and response bodies run
unchanged from Core source, without importing its service startup dependencies.
"""

import ast
import asyncio
import base64
import importlib.util
import json
import re
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, Mock, patch

import httpx
from django.test import TestCase, override_settings

from astron_console.accounts.models import User, UserProfile
from astron_console.resources import clients, tools
from astron_console.resources.models import Tool, ToolHistory

from .test_resources import SCHEMA

CORE = Path(__file__).resolve().parents[5] / "core/plugin/link"


def load_module(relative):
    path = CORE / relative
    spec = importlib.util.spec_from_file_location(path.stem, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def load_functions(relative, names, namespace):
    path = CORE / relative
    tree = ast.parse(path.read_text())
    functions = [
        node
        for node in tree.body
        if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef) and node.name in names
    ]
    assert {node.name for node in functions} == set(names)
    module = ast.Module(
        body=[
            ast.ImportFrom(module="__future__", names=[ast.alias(name="annotations")], level=0),
            *functions,
        ],
        type_ignores=[],
    )
    exec(compile(ast.fix_missing_locations(module), str(path), "exec"), namespace)


@override_settings(RESOURCE_APP_ID="retained-app", RESOURCE_TOOL_URL="http://core-link:8000")
class ToolCoreContractTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.management = load_module("api/schemas/community/tools/http/management_schema.py")
        cls.execution = load_module("api/schemas/community/tools/http/execution_schema.py")
        cls.errors = load_module("utils/errors/code.py")
        cls.http_client = httpx.Client
        constants = ast.parse((CORE / "consts/const.py").read_text())
        cls.defaults = {
            node.targets[0].id: ast.literal_eval(node.value)
            for node in constants.body
            if isinstance(node, ast.Assign)
            and isinstance(node.targets[0], ast.Name)
            and node.targets[0].id in {"DEF_VER", "DEF_DEL"}
        }

    def setUp(self):
        self.user = User.objects.create_user(id="retained-uid", username="tool-owner")
        UserProfile.objects.create(uid=self.user.pk, username=self.user.username)
        self.client.force_login(self.user)
        self.records = []
        self.requests = []
        self.responses = []
        self.crud = Mock()
        self.crud.add_tools.side_effect = lambda rows: self.records.extend(
            {**row, "open_api_schema": row["schema"]} for row in rows
        )
        self.crud.add_tool_version.side_effect = self.records.extend
        self.crud.get_tools.side_effect = lambda tools, **kwargs: [
            SimpleNamespace(dict=lambda row=row: row)
            for wanted in tools
            for row in self.records
            if (wanted["tool_id"], wanted["version"]) == (row["tool_id"], row["version"])
        ]
        self.crud.delete_tools.side_effect = lambda tools: self.records.clear()
        context = Mock(sid="contract-sid", app_id="retained-app", uid=self.user.pk)
        span = MagicMock()
        span.start.return_value.__enter__.return_value = context
        self.core = {
            "json": json,
            "re": re,
            "os": SimpleNamespace(getenv=lambda name, default=None: default),
            "const": SimpleNamespace(
                **self.defaults, DEFAULT_APPID_KEY="DEFAULT_APPID", OTLP_ENABLE_KEY="OTLP_ENABLE"
            ),
            "ErrCode": self.errors.ErrCode,
            "ToolManagerResponse": self.management.ToolManagerResponse,
            "ToolDebugResponse": self.execution.ToolDebugResponse,
            "ToolDebugResponseHeader": self.execution.ToolDebugResponseHeader,
            "Query": lambda **kwargs: None,
            "new_uid": lambda: self.user.pk,
            "gen_id": lambda: 0x1234,
            "Span": lambda **kwargs: span,
            "NodeTraceLog": lambda **kwargs: Mock(),
            "setup_span_and_trace_mgmt": lambda *args: (span, Mock()),
            "setup_logging_and_metrics_mgmt": Mock(),
            "validate_openapi_schema": lambda tool, span: (
                base64.b64decode(tool["openapi_schema"]).decode(),
                None,
            ),
            "api_validate": lambda *args: None,
            "get_create_tool_schema": Mock(),
            "get_update_tool_schema": Mock(),
            "ToolCrudOperation": lambda engine: self.crud,
            "get_db_engine": Mock(),
            "logger": Mock(),
            "OTelStatus": Mock(),
            "StatusCode": Mock(),
            "SparkLinkBaseException": type("FixtureCoreError", (Exception,), {}),
        }
        load_functions(
            "service/community/tools/http/management_server.py",
            (
                "extract_management_params",
                "validate_tool_ids",
                "process_tools_for_creation",
                "process_tools_for_update",
                "create_version",
                "update_version",
                "read_version",
                "delete_version",
                "handle_success_response_mgmt",
                "handle_error_response_mgmt",
                "handle_validation_error_mgmt",
            ),
            self.core,
        )
        load_functions(
            "service/community/tools/http/execution_server.py",
            ("handle_debug_success_response",),
            self.core,
        )
        self.context = context
        transport = httpx.MockTransport(self.handle)
        patcher = patch(
            "astron_console.resources.clients.httpx.Client",
            side_effect=lambda **kwargs: self.http_client(transport=transport, **kwargs),
        )
        patcher.start()
        self.addCleanup(patcher.stop)

    def handle(self, request):
        payload = json.loads(request.content) if request.content else None
        self.requests.append((request.method, request.url, payload))
        if request.url.path.endswith("/tool_debug"):
            self.execution.ToolDebugRequest.model_validate(payload)
            result = asyncio.run(
                self.core["handle_debug_success_response"](
                    '{"ok":true}', self.context, None, None, "tool@1234", "third-party"
                )
            )
        elif request.method in {"POST", "PUT"}:
            dto = (
                self.management.ToolCreateRequest
                if request.method == "POST"
                else self.management.ToolUpdateRequest
            )
            function = "create_version" if request.method == "POST" else "update_version"
            result = self.core[function](dto.model_validate(payload))
        else:
            query = request.url.params
            function = "read_version" if request.method == "GET" else "delete_version"
            result = self.core[function](
                app_id=query["app_id"],
                tool_ids=query.get_list("tool_ids"),
                versions=query.get_list("versions") or None,
            )
        body = result.model_dump()
        self.responses.append(body)
        return httpx.Response(200, json=body)

    def write(self, method, path, **changes):
        return getattr(self.client, method)(
            path,
            json.dumps({"name": "Lookup", "description": "Original", "schema": SCHEMA, **changes}),
            content_type="application/json",
        )

    def test_create_edit_read_versions_debug_and_delete_use_distinct_core_contracts(self):
        created = self.write("post", "/resources/tools", version="V9.0")
        self.assertEqual(created.status_code, 200, created.content)
        old = Tool.objects.get(pk=created.json()["data"]["id"])
        self.assertEqual((old.tool_id, old.version), ("tool@1234", "V1.0"))
        self.assertNotIn("version", self.requests[0][2]["payload"]["tools"][0])
        self.assertEqual(self.responses[0]["data"]["tools"][0]["version"], "V1.0")
        edited = self.write("put", f"/resources/tools/{old.pk}", description="Edited")
        self.assertEqual(edited.status_code, 200, edited.content)
        latest = Tool.objects.get(pk=edited.json()["data"]["id"])
        self.assertEqual(self.responses[1]["data"], {"result": "Success"})
        self.assertEqual((latest.tool_id, latest.version), (old.tool_id, "V2.0"))
        self.assertNotEqual(latest.pk, old.pk)
        old.refresh_from_db()
        self.assertEqual(
            (old.description, old.version, old.user_id), ("Original", "V1.0", self.user.pk)
        )
        self.assertEqual(latest.user_id, old.user_id)
        self.assertEqual(latest.app_id, old.app_id)
        self.assertEqual(latest.space_id, old.space_id)
        detail = self.client.get(f"/resources/tools/{latest.pk}")
        self.assertEqual(detail.json()["data"]["description"], "Edited")
        versions = self.client.get(f"/resources/tools/{latest.pk}/versions").json()["data"]
        self.assertEqual([row["version"] for row in versions], ["V2.0", "V1.0"])
        remote = clients.call(
            "RESOURCE_TOOL_URL",
            "GET",
            "/api/v1/tools/versions",
            params={
                "app_id": old.app_id,
                "tool_ids": [old.tool_id, old.tool_id],
                "versions": ["V1.0", "V2.0"],
            },
        )
        self.assertEqual([row["description"] for row in remote["tools"]], ["Original", "Edited"])
        self.assertEqual([json.loads(row["schema"]) for row in remote["tools"]], [SCHEMA, SCHEMA])
        debug = self.write("post", f"/resources/tools/{latest.pk}/debug")
        self.assertEqual(debug.status_code, 200, debug.content)
        self.assertEqual(debug.json()["data"], {"text": {"text": '{"ok":true}'}})
        self.assertEqual(self.requests[-1][2]["server"], latest.end_point)
        removed = self.client.delete(f"/resources/tools/{latest.pk}")
        self.assertEqual(removed.status_code, 200, removed.content)
        self.assertEqual(self.responses[-1]["data"], {"result": "Success"})
        self.assertNotIn("versions", self.requests[-1][1].params)
        self.assertEqual(self.crud.delete_tools.call_args.args[0][0]["version"], "")
        self.assertFalse(Tool.objects.filter(deleted=False).exists())

    def test_core_update_error_does_not_change_retained_local_version(self):
        created = self.write("post", "/resources/tools")
        old = Tool.objects.get(pk=created.json()["data"]["id"])
        self.crud.add_tool_version.side_effect = RuntimeError("Version already exists!")
        edited = self.write("put", f"/resources/tools/{old.pk}", description="Rejected")
        self.assertEqual(edited.status_code, 502, edited.content)
        old.refresh_from_db()
        self.assertEqual((old.description, old.version), ("Original", "V1.0"))
        self.assertEqual(Tool.objects.count(), 1)
        self.assertEqual(len(self.records), 1)

    def test_core_create_dto_does_not_accept_a_caller_selected_version(self):
        info = self.management.CreateInfo.model_validate({"name": "Lookup", "version": "V9.0"})
        self.assertNotIn("version", info.model_dump(exclude_none=True))

    def test_debug_preserves_body_presence_after_authorization(self):
        row = Tool.objects.create(
            user_id=self.user.pk,
            name="Lookup",
            tool_id="tool@1234",
            deleted=False,
            schema=json.dumps(SCHEMA),
            end_point="https://example.com/lookup",
            method="get",
        )
        for request_body in ({}, {"body": {}}, {"body": {"query": "agent", "limit": 10}}):
            with (
                self.subTest(request_body=request_body),
                patch(
                    "astron_console.resources.tools.require_resource_access",
                    wraps=tools.require_resource_access,
                ) as authorize,
                patch(
                    "astron_console.resources.tools.schema_auth", wraps=tools.schema_auth
                ) as credentials,
                patch("astron_console.resources.clients.call", wraps=clients.call) as link,
            ):
                order = Mock()
                order.attach_mock(authorize, "authorize")
                order.attach_mock(credentials, "credentials")
                order.attach_mock(link, "link")
                response = self.client.post(
                    f"/resources/tools/{row.pk}/debug",
                    request_body,
                    content_type="application/json",
                )
                self.assertEqual(response.status_code, 200, response.content)
                self.assertEqual(
                    [call[0] for call in order.mock_calls], ["authorize", "credentials", "link"]
                )
                method, url, outbound = self.requests[-1]
                self.assertEqual((method, url.path), ("POST", "/api/v1/tools/tool_debug"))
                self.assertEqual(outbound["method"], "GET")
                self.assertEqual(outbound["server"], row.end_point)
                self.assertEqual("body" in outbound, "body" in request_body)
                if "body" in request_body:
                    self.assertEqual(outbound["body"], request_body["body"])
                self.assertEqual(
                    self.execution.ToolDebugRequest.model_validate(outbound).body,
                    request_body.get("body"),
                )
        self.assertEqual(
            ToolHistory.objects.filter(tool_id=row.tool_id, uid=self.user.pk).count(), 3
        )

    def test_debug_denial_precedes_body_validation_credentials_and_link_call(self):
        other = User.objects.create_user(id="foreign-uid", username="foreign-owner")
        row = Tool.objects.create(
            user_id=other.pk,
            name="Private",
            tool_id="private-tool",
            deleted=False,
            schema=json.dumps(SCHEMA),
            end_point="https://example.com/private",
            method="get",
        )
        with (
            patch(
                "astron_console.resources.tools.schema_auth", wraps=tools.schema_auth
            ) as credentials,
            patch("astron_console.resources.clients.call", wraps=clients.call) as link,
        ):
            response = self.client.post(
                f"/resources/tools/{row.pk}/debug",
                {"body": "invalid-object"},
                content_type="application/json",
            )
        self.assertEqual(response.status_code, 403, response.content)
        credentials.assert_not_called()
        link.assert_not_called()
        self.assertEqual(self.requests, [])
        self.assertFalse(ToolHistory.objects.exists())
