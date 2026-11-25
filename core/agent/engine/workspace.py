"""Deep Agents file storage backed by a scoped MinIO object prefix."""

import asyncio
import hashlib
import json
import os
from collections.abc import Iterable
from typing import Any

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from deepagents.backends import CompositeBackend, StoreBackend
from deepagents.backends.protocol import (
    BackendProtocol,
    DeleteResult,
    EditResult,
    ExecuteResponse,
    FileInfo,
    GlobResult,
    GrepResult,
    LsResult,
    SandboxBackendProtocol,
    execute_accepts_timeout,
)
from deepagents.backends.utils import (
    InvalidGlobPatternError,
    compile_grep_include_glob,
    file_data_to_string,
    grep_matches_from_files,
    perform_string_replacement,
    update_file_data,
    validate_path,
)
from langgraph.store.base import BaseStore, GetOp, Item, Op, PutOp, Result

NAMESPACE = ("workspace",)
MAX_OBJECT_BYTES = 8 * 1024 * 1024
MAX_GREP_BYTES = 16 * 1024 * 1024
MAX_GREP_FILES = 100
SANDBOX_ROUTE = "/sandbox/"


def _relative_path(key: str, base: str) -> str:
    return key.rsplit("/", 1)[-1] if key == base else key[len(base) + 1 :]


class MinIOStore(BaseStore):
    """Use object storage for StoreBackend's file records in one workspace."""

    def __init__(self, client: Any, bucket: str, scope: tuple[str, ...]) -> None:
        self.client = client
        self.bucket = bucket
        self.prefix = (
            "agent-workspaces/"
            + hashlib.sha256(json.dumps(scope).encode()).hexdigest()
            + "/"
        )

    def _get(self, path: str) -> Item | None:
        item, _ = self.get_version(path)
        return item

    def get_version(self, path: str) -> tuple[Item | None, str]:
        try:
            response = self.client.get_object(
                Bucket=self.bucket, Key=self.prefix + path
            )
        except ClientError as exc:
            if exc.response["Error"]["Code"] in {"NoSuchKey", "404"}:
                return None, ""
            raise
        with response["Body"] as body:
            raw = body.read(MAX_OBJECT_BYTES + 1)
        if len(raw) > MAX_OBJECT_BYTES:
            raise ValueError("Workspace object exceeds the size limit")
        value = json.loads(raw)
        timestamp = response["LastModified"]
        item = Item(
            value=value,
            key=path,
            namespace=NAMESPACE,
            created_at=timestamp,
            updated_at=timestamp,
        )
        return item, response["ETag"]

    def files(self, path: str) -> Iterable[FileInfo]:
        base = validate_path(path).rstrip("/")
        pages = self.client.get_paginator("list_objects_v2").paginate(
            Bucket=self.bucket, Prefix=self.prefix + (base or "/")
        )
        for page in pages:
            for row in page.get("Contents", []):
                key = row["Key"].removeprefix(self.prefix)
                if key == base or key.startswith(base + "/"):
                    yield FileInfo(
                        path=key,
                        is_dir=False,
                        size=row["Size"],
                        modified_at=row["LastModified"].isoformat(),
                    )

    def _put(self, op: PutOp, *, etag: str | None = None) -> None:
        key = self.prefix + op.key
        if op.value is None:
            self.client.delete_object(Bucket=self.bucket, Key=key)
            return
        body = json.dumps(op.value, ensure_ascii=False).encode()
        if len(body) > MAX_OBJECT_BYTES:
            raise ValueError("Workspace file exceeds the size limit")
        condition = {"IfMatch": etag} if etag is not None else {}
        self.client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=body,
            ContentType="application/json",
            **condition,
        )

    def replace(self, path: str, value: dict[str, Any], etag: str) -> bool:
        try:
            self._put(PutOp(NAMESPACE, path, value), etag=etag)
        except ClientError as exc:
            if exc.response["Error"]["Code"] in {
                "PreconditionFailed",
                "ConditionalRequestConflict",
                "NoSuchKey",
                "404",
                "409",
                "412",
            }:
                return False
            raise
        return True

    def batch(self, ops: Iterable[Op]) -> list[Result]:
        results: list[Result] = []
        for op in ops:
            if isinstance(op, GetOp) and op.namespace == NAMESPACE:
                results.append(self._get(op.key))
            elif isinstance(op, PutOp) and op.namespace == NAMESPACE:
                self._put(op)
                results.append(None)
            else:
                raise ValueError("Unsupported workspace store operation")
        return results

    async def abatch(self, ops: Iterable[Op]) -> list[Result]:
        return await asyncio.to_thread(self.batch, list(ops))


class MinIOWorkspace(StoreBackend):
    """Use object metadata for discovery and bound content searches."""

    def __init__(self, store: MinIOStore) -> None:
        super().__init__(namespace=lambda _: NAMESPACE, store=store)
        self.storage = store

    def edit(
        self,
        file_path: str,
        old_string: str,
        new_string: str,
        replace_all: bool = False,
    ) -> EditResult:
        item, etag = self.storage.get_version(file_path)
        if item is None:
            return EditResult(error=f"Workspace file '{file_path}' not found")
        file_data = self._convert_store_item_to_file_data(item)
        if file_data.get("encoding") == "base64":
            return EditResult(error="Cannot change binary files using text replacement")
        replacement = perform_string_replacement(
            file_data_to_string(file_data), old_string, new_string, replace_all
        )
        if isinstance(replacement, str):
            return EditResult(error=replacement)
        text, count = replacement
        value = self._convert_file_data_to_store_value(
            update_file_data(file_data, text)
        )
        if not self.storage.replace(file_path, value, etag):
            return EditResult(
                error="Workspace file changed during editing. Read it again and retry."
            )
        return EditResult(path=file_path, occurrences=count)

    async def aedit(
        self,
        file_path: str,
        old_string: str,
        new_string: str,
        replace_all: bool = False,
    ) -> EditResult:
        return await asyncio.to_thread(
            self.edit, file_path, old_string, new_string, replace_all
        )

    def ls(self, path: str) -> LsResult:
        prefix = validate_path(path).rstrip("/") + "/"
        entries: dict[str, FileInfo] = {}
        for info in self.storage.files(path):
            key = info["path"]
            if key == prefix[:-1]:
                continue
            name, separator, _ = key[len(prefix) :].partition("/")
            if separator:
                directory = prefix + name + "/"
                entries[directory] = FileInfo(path=directory, is_dir=True)
            else:
                entries[key] = info
        return LsResult(entries=[entries[key] for key in sorted(entries)])

    def glob(self, pattern: str, path: str | None = None) -> GlobResult:
        base = validate_path(path or "/").rstrip("/")
        try:
            matches = compile_grep_include_glob(pattern)
        except InvalidGlobPatternError as exc:
            return GlobResult(error=str(exc))
        files = []
        for info in self.storage.files(path or "/"):
            key = info["path"]
            relative = _relative_path(key, base)
            if matches(relative):
                files.append(info)
        return GlobResult(matches=files)

    def grep(
        self,
        pattern: str,
        path: str | None = None,
        glob: str | None = None,
        *,
        max_count: int | None = None,
    ) -> GrepResult:
        try:
            matcher = compile_grep_include_glob(glob) if glob is not None else None
        except InvalidGlobPatternError as exc:
            return GrepResult(error=str(exc))
        base = validate_path(path or "/").rstrip("/")
        files = {}
        remaining = MAX_GREP_BYTES
        scanned = 0
        truncated = False
        for info in self.storage.files(path or "/"):
            key = info["path"]
            if matcher is not None and not matcher(_relative_path(key, base)):
                continue
            remaining -= info.get("size", 0)
            if remaining < 0 or scanned >= MAX_GREP_FILES:
                truncated = True
                break
            scanned += 1
            if (item := self.storage.get(NAMESPACE, key)) is not None:
                files[item.key] = self._convert_store_item_to_file_data(item)
        result = grep_matches_from_files(
            files, pattern, path, glob, max_count=max_count
        )
        result.truncated |= truncated
        return result

    def delete(self, file_path: str) -> DeleteResult:
        keys = [entry["path"] for entry in self.storage.files(file_path)]
        if not keys:
            return DeleteResult(error="Workspace file not found")
        self.storage.batch(PutOp(NAMESPACE, key, None) for key in keys)
        return DeleteResult(path=file_path)

    async def adelete(self, file_path: str) -> DeleteResult:
        return await asyncio.to_thread(self.delete, file_path)


class ExecutableWorkspace(MinIOWorkspace, SandboxBackendProtocol):
    """Keep normal file operations in MinIO and forward execute to the sandbox."""

    def __init__(self, store: MinIOStore, sandbox: SandboxBackendProtocol) -> None:
        super().__init__(store)
        self.sandbox = sandbox

    @property
    def id(self) -> str:
        return self.sandbox.id

    def execute(self, command: str, *, timeout: int | None = None) -> ExecuteResponse:
        if timeout is not None and execute_accepts_timeout(type(self.sandbox)):
            return self.sandbox.execute(command, timeout=timeout)
        return self.sandbox.execute(command)

    async def aexecute(
        self, command: str, *, timeout: int | None = None
    ) -> ExecuteResponse:
        if timeout is not None and execute_accepts_timeout(type(self.sandbox)):
            return await self.sandbox.aexecute(command, timeout=timeout)
        return await self.sandbox.aexecute(command)


class AgentFilesystem(CompositeBackend):
    """Search the virtual workspace without starting a sandbox implicitly."""

    def __init__(
        self, default: BackendProtocol, routes: dict[str, BackendProtocol]
    ) -> None:
        super().__init__(default, routes)
        self.virtual = CompositeBackend(
            default,
            {
                prefix: backend
                for prefix, backend in routes.items()
                if prefix != SANDBOX_ROUTE
            },
        )

    def _search_backend(self, path: str | None) -> CompositeBackend:
        return self.virtual if path in (None, "/") else self

    def glob(self, pattern: str, path: str | None = None) -> GlobResult:
        return CompositeBackend.glob(self._search_backend(path), pattern, path)

    async def aglob(self, pattern: str, path: str | None = None) -> GlobResult:
        return await CompositeBackend.aglob(self._search_backend(path), pattern, path)

    def grep(
        self,
        pattern: str,
        path: str | None = None,
        glob: str | None = None,
        *,
        max_count: int | None = None,
    ) -> GrepResult:
        return CompositeBackend.grep(
            self._search_backend(path), pattern, path, glob, max_count=max_count
        )

    async def agrep(
        self,
        pattern: str,
        path: str | None = None,
        glob: str | None = None,
        *,
        max_count: int | None = None,
    ) -> GrepResult:
        return await CompositeBackend.agrep(
            self._search_backend(path), pattern, path, glob, max_count=max_count
        )


def workspace_store(scope: tuple[str, ...]) -> MinIOStore | None:
    endpoint = os.getenv("AGENT_WORKSPACE_S3_ENDPOINT")
    if not endpoint or not scope:
        return None
    client = boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=os.environ["AGENT_WORKSPACE_S3_ACCESS_KEY"],
        aws_secret_access_key=os.environ["AGENT_WORKSPACE_S3_SECRET_KEY"],
        region_name="us-east-1",
        config=Config(
            signature_version="s3v4",
            s3={"addressing_style": "path"},
            connect_timeout=5,
            read_timeout=10,
            retries={"total_max_attempts": 2},
        ),
    )
    return MinIOStore(client, os.environ["AGENT_WORKSPACE_S3_BUCKET"], scope)
