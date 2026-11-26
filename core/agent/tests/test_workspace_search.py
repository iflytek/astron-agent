"""Exercise the official file and search tool adapters at their boundaries."""

import asyncio
import hashlib
import json
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from io import BytesIO
from threading import Barrier, Lock
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest
from botocore.exceptions import ClientError
from deepagents.backends.protocol import (
    ExecuteResponse,
    GlobResult,
    GrepResult,
    SandboxBackendProtocol,
)
from deepagents.middleware.filesystem import supports_execution
from fastapi.testclient import TestClient

from agent.api.schemas.workflow_agent_inputs import CustomCompletionInputs
from agent.api.v1 import web_search as search_api
from agent.api.v1.workflow_agent import _serialize_workflow_agent_inputs
from agent.engine import sandbox, skill_files
from agent.engine.workspace import AgentFilesystem, MinIOStore, MinIOWorkspace
from agent.main import create_app
from agent.service.plugin import web_search
from agent.service.plugin.base import PluginResponse
from agent.service.sandbox import AgentSandboxConfig


class ObjectStorage:
    def __init__(self) -> None:
        self.objects: dict[str, bytes] = {}
        self.gets = 0
        self.lock = Lock()

    @staticmethod
    def etag(content: bytes) -> str:
        return hashlib.sha256(content).hexdigest()

    def close(self) -> None:
        pass

    def get_object(self, *, Bucket: str, Key: str) -> dict[str, Any]:
        assert "//" not in Key
        self.gets += 1
        if Key not in self.objects:
            raise ClientError({"Error": {"Code": "NoSuchKey"}}, "GetObject")
        return {
            "Body": BytesIO(self.objects[Key]),
            "LastModified": datetime.now(timezone.utc),
            "ETag": self.etag(self.objects[Key]),
        }

    def put_object(
        self,
        *,
        Bucket: str,
        Key: str,
        Body: bytes,
        ContentType: str,
        IfMatch: str | None = None,
    ) -> None:
        assert "//" not in Key
        with self.lock:
            if IfMatch is not None and self.etag(self.objects[Key]) != IfMatch:
                raise ClientError(
                    {"Error": {"Code": "PreconditionFailed"}}, "PutObject"
                )
            self.objects[Key] = Body

    def get_paginator(self, name: str) -> Any:
        return self

    def paginate(self, *, Bucket: str, Prefix: str) -> list[dict[str, Any]]:
        assert "//" not in Prefix
        return [
            {
                "Contents": [
                    {
                        "Key": key,
                        "Size": len(self.objects[key]),
                        "LastModified": datetime.now(timezone.utc),
                    }
                    for key in sorted(self.objects)
                    if key.startswith(Prefix)
                ]
            }
        ]

    def delete_object(self, *, Bucket: str, Key: str) -> None:
        assert "//" not in Key
        del self.objects[Key]


@pytest.mark.asyncio
async def test_overlapping_workspace_edits_report_a_conflict(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    storage = ObjectStorage()
    first = MinIOWorkspace(MinIOStore(storage, "test", ("session",)))
    second = MinIOWorkspace(MinIOStore(storage, "test", ("session",)))
    await first.awrite("/notes.txt", "one\ntwo")
    barrier = Barrier(2, timeout=5)
    original_get = storage.get_object

    def overlapping_get(**kwargs: str) -> dict[str, Any]:
        response = original_get(**kwargs)
        barrier.wait()
        return response

    monkeypatch.setattr(storage, "get_object", overlapping_get)
    edits = await asyncio.gather(
        first.aedit("/notes.txt", "one", "first"),
        second.aedit("/notes.txt", "two", "second"),
    )
    errors = [edit.error for edit in edits if edit.error]
    assert len(errors) == 1 and "changed during editing" in errors[0]


@pytest.mark.asyncio
async def test_workspace_discovery_does_not_fetch_contents_or_search_sandbox() -> None:
    storage = ObjectStorage()
    workspace = MinIOWorkspace(MinIOStore(storage, "test", ("session",)))
    await workspace.awrite("/notes/one.txt", "agent notes")
    storage.gets = 0

    mounted = MagicMock()
    mounted.aglob = AsyncMock(return_value=GlobResult(error="sandbox unavailable"))
    mounted.agrep = AsyncMock(return_value=GrepResult(error="sandbox unavailable"))
    backend = AgentFilesystem(workspace, {"/sandbox/": mounted})
    assert [item["path"] for item in (await backend.als("/notes")).entries or []] == [
        "/notes/one.txt"
    ]
    assert len((await backend.aglob("*.txt")).matches or []) == 1
    assert storage.gets == 0
    assert len((await backend.agrep("notes")).matches or []) == 1
    assert storage.gets == 1
    mounted.aglob.assert_not_awaited()
    mounted.agrep.assert_not_awaited()
    assert (await backend.aglob("*.txt", "/sandbox")).error == "sandbox unavailable"
    mounted.aglob.assert_awaited_once()


@pytest.mark.asyncio
async def test_minio_normalizes_paths_for_all_file_operations() -> None:
    storage = MinIOStore(ObjectStorage(), "test", ("session",))
    backend = AgentFilesystem(MinIOWorkspace(storage), {})
    assert (await backend.awrite("//notes/one.txt", "agent notes")).error is None
    assert (await backend.aread("/notes/one.txt")).error is None
    entries = (await backend.als("//notes")).entries or []
    assert [entry["path"] for entry in entries] == ["/notes/one.txt"]
    matches = (await backend.aglob("*.txt", "//notes")).matches or []
    assert [match["path"] for match in matches] == ["/notes/one.txt"]
    assert (await backend.agrep("notes", "//notes")).matches
    assert (await backend.aedit("//notes/one.txt", "agent", "workspace")).error is None
    assert (await backend.adelete("//notes")).error is None
    assert (await backend.aread("/notes/one.txt")).error


@pytest.mark.asyncio
async def test_sandbox_and_minio_workspace_use_distinct_backends(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Any
) -> None:
    from deepagents.backends import FilesystemBackend

    class TestSandbox(FilesystemBackend, SandboxBackendProtocol):
        @property
        def id(self) -> str:
            return "test"

        async def aexecute(
            self, command: str, *, timeout: int | None = None
        ) -> ExecuteResponse:
            assert command == "create report"
            (tmp_path / "report.txt").write_text("sandbox report")
            return ExecuteResponse(output="created", exit_code=0)

    @asynccontextmanager
    async def open_test(*args: Any) -> AsyncIterator[SandboxBackendProtocol]:
        yield TestSandbox(root_dir=tmp_path, virtual_mode=True)

    storage = ObjectStorage()
    monkeypatch.setattr(
        skill_files, "workspace_store", lambda scope: MinIOStore(storage, "test", scope)
    )
    monkeypatch.setitem(sandbox.SANDBOX_PROVIDERS, "test", open_test)
    config = AgentSandboxConfig(enabled=True, provider="test")

    async with skill_files.agent_backend([], None, ("first",)) as backend:
        assert (await backend.awrite("/note.txt", "persistent note")).error is None

    async with skill_files.agent_backend([], config, ("first",)) as backend:
        assert supports_execution(backend)
        assert (await backend.aread("/note.txt")).error
        assert (await backend.awrite("/note.txt", "sandbox note")).error is None
        assert (tmp_path / "note.txt").read_text() == "sandbox note"
        assert (await backend.aexecute("create report")).exit_code == 0
        report = await backend.aread("/sandbox/report.txt")
        assert report.file_data and report.file_data["content"] == "sandbox report"
        assert (await backend.aread("/report.txt")).file_data
        assert (await backend.awrite("/sandbox/extra.txt", "shell file")).error is None
        assert (tmp_path / "extra.txt").read_text() == "shell file"
        assert (await backend.aedit("/note.txt", "sandbox", "updated")).error is None
        listing = await backend.als("/")
        assert {entry["path"] for entry in listing.entries or []} >= {
            "/sandbox/",
            "/note.txt",
        }
        matches = await backend.aglob("*.txt", "/sandbox/")
        assert {entry["path"] for entry in matches.matches or []} >= {
            "/sandbox/report.txt"
        }

    async with skill_files.agent_backend([], None, ("other",)) as backend:
        assert not supports_execution(backend)
        assert (await backend.aread("/note.txt")).error
    async with skill_files.agent_backend([], None, ("first",)) as backend:
        note = await backend.aread("/note.txt")
        assert note.file_data and note.file_data["content"] == "persistent note"
        assert (await backend.adelete("/note.txt")).error is None


@pytest.mark.asyncio
async def test_tavily_tool_bounds_results_and_uses_the_official_client(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    valid = {
        "title": "Some news",
        "url": "https://example.com/news",
        "content": "News story",
    }
    search = AsyncMock(
        return_value={"results": [valid, valid, {**valid, "url": "javascript:x"}]}
    )
    client = MagicMock()
    client.return_value.__aenter__.return_value.search = search
    monkeypatch.setattr(web_search, "AsyncTavilyClient", client)

    plugin = web_search.tavily_search_plugin("tavily@id", "V1.0", "test-key")
    assert "test-key" not in plugin.schema_template
    result = await plugin.run(
        {"query": "news", "time_range": "day", "max_results": 2.0}, None
    )
    assert result.code == 0 and result.result["results"] == [valid]
    client.assert_called_once_with(api_key="test-key")
    assert search.call_args.kwargs["search_depth"] == "basic"
    assert type(search.call_args.kwargs["max_results"]) is int
    assert search.call_args.kwargs["filter_by_published_date"] is True

    search.side_effect = RuntimeError("private test-key")
    result = await plugin.run({"query": "news"}, None)
    assert result.code and "test-key" not in json.dumps(result.result)

    search.side_effect = web_search.TavilyTimeoutError("private test-key")
    result = await plugin.run({"query": "news"}, None)
    assert result.code and result.result == {"error": "Web search timed out"}


def test_internal_tavily_debug_authenticates_and_validates_before_search(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    internal_key = "internal-key-test-fixture-minimum-length"
    vendor_key = "tvly-fixture-debug"
    monkeypatch.setenv("WORKFLOW_INTERNAL_API_KEY", internal_key)
    search = AsyncMock(return_value=PluginResponse(result={"results": []}))
    monkeypatch.setattr(search_api, "_run_tavily", search)
    client = TestClient(create_app())
    route = "/agent/v1/tools/tavily/search"
    headers = {"X-Workflow-Internal-Key": internal_key}
    payload = {"api_key": vendor_key, "arguments": {"query": "news", "max_results": 11}}
    assert client.post(route, json=payload).status_code == 401
    invalid = client.post(route, json=payload, headers=headers)
    assert invalid.json()["data"]["code"] == 40024
    assert vendor_key not in invalid.text
    malformed = client.post(route, json={"api_key": vendor_key}, headers=headers)
    assert malformed.json()["code"] == 40002 and vendor_key not in malformed.text
    search.assert_not_awaited()

    arguments = {"query": "news", "topic": "news"}
    valid = client.post(
        route, json={**payload, "arguments": arguments}, headers=headers
    )
    assert valid.json()["data"]["data"] == {"results": []}
    search.assert_awaited_once_with(arguments, vendor_key)


def test_tavily_tool_credential_is_excluded_from_trace_serialization() -> None:
    vendor_key = "tvly-fixture-trace"
    inputs = CustomCompletionInputs.model_validate(
        {
            "model_config": {"domain": "test", "api": "https://example.com"},
            "messages": [{"role": "user", "content": "news"}],
            "max_loop_count": 5,
            "plugin": {
                "tavily": [
                    {"tool_id": "tavily@id", "version": "V1.0", "api_key": vendor_key}
                ]
            },
        }
    )
    assert inputs.plugin.tavily[0].api_key.get_secret_value() == vendor_key
    assert vendor_key not in repr(inputs)
    trace = _serialize_workflow_agent_inputs(inputs)
    assert vendor_key not in trace
    assert json.loads(trace)["plugin"]["tavily"] == [
        {"tool_id": "tavily@id", "version": "V1.0"}
    ]
