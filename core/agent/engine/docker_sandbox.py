"""Deep Agents backend for the shared, persistent Docker workspace."""

import base64
import json
import mimetypes
import uuid
from pathlib import PurePosixPath
from typing import Any

from common.utils.local_sandbox import (
    LocalSandbox,
    LocalSandboxError,
    LocalSandboxPolicy,
    sandbox_bytes,
    sandbox_file,
)
from deepagents.backends import StateBackend
from deepagents.backends.protocol import (
    FILE_NOT_FOUND,
    PERMISSION_DENIED,
    DeleteResult,
    EditResult,
    ExecuteResponse,
    FileData,
    FileDownloadResponse,
    FileInfo,
    FileUploadResponse,
    GlobResult,
    GrepResult,
    LsResult,
    ReadResult,
    SandboxBackendProtocol,
    WriteResult,
)
from deepagents.backends.sandbox import BaseSandbox
from deepagents.backends.utils import slice_read_response
from loguru import logger

from agent.service.plugin.skill_sandbox import (
    MAX_ARTIFACT_FILES_PER_RUN,
    MAX_ARTIFACT_TOTAL_SIZE_BYTES,
    MAX_SANDBOX_COMMAND_OUTPUT_BYTES,
    ArtifactUploader,
    _fetch_runtime_policy,
    _load_runtime_credential_token,
)
from agent.service.sandbox import AgentSandboxConfig


class DockerAgentSandbox(StateBackend, SandboxBackendProtocol):
    def __init__(
        self,
        files: dict[str, bytes],
        artifact_owners: dict[str, str],
        config: AgentSandboxConfig,
    ) -> None:
        super().__init__()
        self._id = uuid.uuid4().hex
        self.config = config
        self.skills = [sandbox_file(path, body) for path, body in files.items()]
        self.artifact_owners = artifact_owners
        self.artifact_count = 0
        self.artifact_bytes = 0
        self.file_backend = DockerFiles(self)

    @property
    def id(self) -> str:
        return self._id

    async def runtime(self) -> LocalSandbox:
        if not self.config.console or not self.config.agent_id:
            raise LocalSandboxError("Local sandbox requires an authorized Agent run")
        data = await _fetch_runtime_policy(self.config, docker=True)
        policy = LocalSandboxPolicy.from_response(data, "agent")
        return LocalSandbox("agent", policy, _load_runtime_credential_token())

    async def aexecute(
        self, command: str, *, timeout: int | None = None
    ) -> ExecuteResponse:
        runtime = await self.runtime()
        collect = bool(self.artifact_owners)
        result = await runtime.request(
            "execute",
            command=command,
            timeout=max(
                1, min(timeout or runtime.policy.timeout, runtime.policy.timeout)
            ),
            outputLimit=MAX_SANDBOX_COMMAND_OUTPUT_BYTES,
            files=self.skills,
            **({"collectArtifacts": "output"} if collect else {}),
        )
        artifacts = await self._upload_artifacts(result.get("changedFiles", []))
        timeout_message = (
            "Local sandbox command timed out." if result.get("timedOut") else ""
        )
        output = "\n".join(
            part
            for part in (
                result.get("stdout"),
                result.get("stderr"),
                timeout_message,
                (
                    "Some deliverables were not attached to this run. They are available in the Agent Files panel."
                    if result.get("artifactsTruncated")
                    else ""
                ),
                (
                    "Artifacts: " + json.dumps(artifacts, ensure_ascii=False)
                    if artifacts
                    else ""
                ),
            )
            if part
        )
        return ExecuteResponse(
            output=output,
            exit_code=result["exitCode"],
            truncated=bool(result.get("truncated")),
        )

    async def _upload_artifacts(
        self, changed_files: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        default_skill = next(iter(self.artifact_owners.values()), None)
        if default_skill is None:
            return []
        artifacts = []
        for item in changed_files:
            path = PurePosixPath(item["path"])
            skill_name = path.parts[1] if len(path.parts) > 2 else ""
            skill_id = self.artifact_owners.get(skill_name, default_skill)
            uploader = ArtifactUploader(self.config, skill_id)
            if not uploader.is_configured():
                break
            try:
                content = sandbox_bytes(item)
                if (
                    self.artifact_count >= MAX_ARTIFACT_FILES_PER_RUN
                    or self.artifact_bytes + len(content)
                    > MAX_ARTIFACT_TOTAL_SIZE_BYTES
                ):
                    break
                artifact = await uploader.upload(
                    path.name,
                    content,
                    mimetypes.guess_type(path.name)[0] or "application/octet-stream",
                )
            except RuntimeError as exc:
                logger.warning(
                    "Docker Agent artifact upload failed: {}", type(exc).__name__
                )
                continue
            artifacts.append(artifact)
            self.artifact_count += 1
            self.artifact_bytes += len(content)
        return artifacts


def _relative_path(path: str, runtime: LocalSandbox) -> str:
    directory = runtime.policy.directory("agent")
    if path.rstrip("/") == directory:
        return ""
    if path.startswith(directory + "/"):
        path = path.removeprefix(directory)
    elif path.startswith(("/workspace/", "/home/user/workspace/")):
        raise LocalSandboxError("Use this Agent's sandbox directory", 400)
    value = path.strip("/")
    if "\\" in value or any(
        part in {".", "..", ""} for part in value.split("/") if value
    ):
        raise LocalSandboxError("Invalid sandbox path", 400)
    return value


class DockerFiles(BaseSandbox):
    def __init__(self, sandbox: DockerAgentSandbox) -> None:
        self.sandbox = sandbox

    @property
    def id(self) -> str:
        return self.sandbox.id

    def execute(self, command: str, *, timeout: int | None = None) -> ExecuteResponse:
        raise NotImplementedError("Use the asynchronous Docker backend")

    async def aexecute(
        self, command: str, *, timeout: int | None = None
    ) -> ExecuteResponse:
        runtime = await self.sandbox.runtime()
        result = await runtime.request(
            "execute",
            command=command,
            timeout=max(
                1, min(timeout or runtime.policy.timeout, runtime.policy.timeout)
            ),
            outputLimit=4 * 1024 * 1024,
        )
        return ExecuteResponse(
            output=result["stdout"],
            exit_code=result["exitCode"],
            truncated=result["truncated"],
        )

    async def _path(self, path: str) -> str:
        runtime = await self.sandbox.runtime()
        relative = _relative_path(path, runtime)
        return runtime.policy.directory("agent") + "/" + relative

    async def als(self, path: str) -> LsResult:
        runtime = await self.sandbox.runtime()
        data = await runtime.request("list", path=_relative_path(path, runtime))
        return LsResult(
            entries=[
                FileInfo(
                    path="/" + item["path"],
                    is_dir=item["isDirectory"],
                    size=item["size"],
                    modified_at=item["modifiedAt"],
                )
                for item in data["entries"]
            ]
        )

    async def aread(
        self, file_path: str, offset: int = 0, limit: int = 2000
    ) -> ReadResult:
        (result,) = await self.adownload_files([file_path])
        if result.error or result.content is None:
            return ReadResult(error=f"Could not read '{file_path}': {result.error}")
        try:
            content = result.content.decode("utf-8")
        except UnicodeDecodeError:
            return ReadResult(
                file_data=FileData(
                    content=base64.b64encode(result.content).decode("ascii"),
                    encoding="base64",
                )
            )
        return slice_read_response(
            FileData(content=content, encoding="utf-8"), offset, limit
        )

    async def awrite(self, file_path: str, content: str) -> WriteResult:
        runtime = await self.sandbox.runtime()
        try:
            await runtime.request(
                "write",
                files=[
                    sandbox_file(_relative_path(file_path, runtime), content.encode())
                ],
                createOnly=True,
            )
        except LocalSandboxError as exc:
            return WriteResult(error=str(exc))
        return WriteResult(path=file_path)

    async def aedit(
        self,
        file_path: str,
        old_string: str,
        new_string: str,
        replace_all: bool = False,
    ) -> EditResult:
        if len(old_string.encode()) + len(new_string.encode()) > 32 * 1024:
            return EditResult(error="Edit is too large")
        result = await super().aedit(
            await self._path(file_path), old_string, new_string, replace_all
        )
        if result.path:
            result.path = file_path
        return result

    async def aglob(self, pattern: str, path: str | None = None) -> GlobResult:
        root = await self._path("/")
        result = await super().aglob(pattern, await self._path(path or "/"))
        for item in result.matches or []:
            item["path"] = "/" + item["path"].removeprefix(root)
        return result

    async def agrep(
        self,
        pattern: str,
        path: str | None = None,
        glob: str | None = None,
        *,
        max_count: int | None = None,
    ) -> GrepResult:
        root = await self._path("/")
        result = await super().agrep(
            pattern, await self._path(path or "/"), glob, max_count=max_count
        )
        for item in result.matches or []:
            item["path"] = "/" + item["path"].removeprefix(root)
        return result

    def upload_files(self, files: list[tuple[str, bytes]]) -> list[FileUploadResponse]:
        raise NotImplementedError("Use the asynchronous Docker backend")

    def download_files(self, paths: list[str]) -> list[FileDownloadResponse]:
        raise NotImplementedError("Use the asynchronous Docker backend")

    async def aupload_files(
        self, files: list[tuple[str, bytes]]
    ) -> list[FileUploadResponse]:
        runtime = await self.sandbox.runtime()
        results = []
        for path, body in files:
            try:
                await runtime.request(
                    "write", files=[sandbox_file(_relative_path(path, runtime), body)]
                )
            except LocalSandboxError:
                results.append(FileUploadResponse(path=path, error=PERMISSION_DENIED))
            else:
                results.append(FileUploadResponse(path=path))
        return results

    async def adownload_files(self, paths: list[str]) -> list[FileDownloadResponse]:
        runtime = await self.sandbox.runtime()
        results = []
        for path in paths:
            try:
                item = await runtime.request("read", path=_relative_path(path, runtime))
                results.append(
                    FileDownloadResponse(path=path, content=sandbox_bytes(item))
                )
            except LocalSandboxError as exc:
                error = FILE_NOT_FOUND if exc.status == 404 else PERMISSION_DENIED
                results.append(FileDownloadResponse(path=path, error=error))
        return results

    async def adelete(self, file_path: str) -> DeleteResult:
        runtime = await self.sandbox.runtime()
        try:
            await runtime.request("delete", path=_relative_path(file_path, runtime))
        except LocalSandboxError as exc:
            return DeleteResult(error=str(exc))
        return DeleteResult(path=file_path)
