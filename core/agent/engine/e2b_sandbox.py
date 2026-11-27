"""E2B implementation of the Deep Agents Agent sandbox."""

from __future__ import annotations

import asyncio
import json
import shlex
import uuid

from deepagents.backends import StateBackend
from deepagents.backends.protocol import (
    FILE_NOT_FOUND,
    PERMISSION_DENIED,
    DeleteResult,
    EditResult,
    ExecuteResponse,
    FileDownloadResponse,
    FileUploadResponse,
    GlobResult,
    GrepResult,
    LsResult,
    ReadResult,
    SandboxBackendProtocol,
    WriteResult,
)
from deepagents.backends.sandbox import BaseSandbox
from e2b import AsyncSandbox, FileNotFoundException
from loguru import logger

from agent.service.plugin.skill_sandbox import (
    MAX_SANDBOX_COMMAND_OUTPUT_BYTES,
    MAX_SANDBOX_TIMEOUT_SECONDS,
    SANDBOX_INITIALIZATION_ERROR,
    SANDBOX_OUTPUT_TRUNCATED_MARKER,
    ArtifactBudget,
    E2BSandboxProvider,
    SandboxExecutionRequest,
    _fetch_e2b_runtime_config,
    _fetch_runtime_policy,
    _run_command_with_bounded_output,
    e2b_runtime_config,
)
from agent.service.sandbox import AgentSandboxConfig

SANDBOX_WORKSPACE = "/home/user/workspace"
SANDBOX_OUTPUT_DIRECTORY = f"{SANDBOX_WORKSPACE}/output"
# Deep Agents' file helpers JSON-escape up to 500 KiB of text.
FILE_HELPER_STDOUT_LIMIT = 4 * 1024 * 1024


class E2BAgentSandbox(StateBackend, SandboxBackendProtocol):
    """Keep graph state locally and delegate native execute calls to E2B."""

    def __init__(
        self,
        files: dict[str, bytes],
        artifact_owners: dict[str, str],
        config: AgentSandboxConfig,
    ) -> None:
        super().__init__()
        if not config.enabled:
            raise ValueError("Agent sandbox execution must be enabled")
        self._id = uuid.uuid4().hex
        self._files = files
        self._config = config
        self._artifacts = ArtifactBudget(artifact_owners)
        self._default_skill_id = next(iter(artifact_owners.values()), None)
        self._sandbox: AsyncSandbox | None = None
        self._browsable = False
        self._timeout = 0
        self._lock = asyncio.Lock()
        self.file_backend = E2BFiles(self)
        self.workspace_backend = E2BWorkspaceFiles(self)

    @property
    def id(self) -> str:
        return self._id

    async def _get_sandbox(self) -> AsyncSandbox:
        if self._sandbox is not None:
            return self._sandbox
        metadata = {}
        if self._config.console:
            policy = await _fetch_runtime_policy(self._config)
            api_key, timeout, allow_internet = e2b_runtime_config(policy)
            metadata = policy.get("workspaceMetadata", {})
        else:
            api_key, timeout, allow_internet = await _fetch_e2b_runtime_config(
                self._config
            )
        try:
            sandbox = await AsyncSandbox.create(
                api_key=api_key,
                # Keep the workspace across model decisions. The configured
                # timeout still bounds each command. Browsable instances expire in E2B.
                timeout=MAX_SANDBOX_TIMEOUT_SECONDS,
                allow_internet_access=allow_internet,
                metadata=metadata or None,
            )
            self._sandbox = sandbox
            self._timeout = timeout
            if self._files:
                await sandbox.files.write_files(
                    [
                        {"path": path, "data": content}
                        for path, content in self._files.items()
                    ],
                    user="root",
                )
            await sandbox.files.make_dir(SANDBOX_OUTPUT_DIRECTORY, user="user")
            self._browsable = bool(metadata)
        except asyncio.CancelledError:
            await self._close_sandbox()
            raise
        except Exception as exc:
            logger.warning(
                "E2B Agent sandbox initialization failed: error_type={}",
                type(exc).__name__,
            )
            await self._close_sandbox()
            raise RuntimeError(SANDBOX_INITIALIZATION_ERROR) from None
        return sandbox

    async def aexecute(
        self, command: str, *, timeout: int | None = None
    ) -> ExecuteResponse:
        return await self._execute(command, timeout, collect_artifacts=True)

    async def _execute(
        self, command: str, timeout: int | None, *, collect_artifacts: bool
    ) -> ExecuteResponse:
        async with self._lock:
            sandbox = await self._get_sandbox()
            command_timeout = min(timeout or self._timeout, self._timeout)
            try:
                exit_code, stdout, stderr = await _run_command_with_bounded_output(
                    sandbox,
                    f"/bin/bash -c {shlex.quote(command)}",
                    SANDBOX_WORKSPACE,
                    command_timeout,
                    stdout_limit=(
                        MAX_SANDBOX_COMMAND_OUTPUT_BYTES
                        if collect_artifacts
                        else FILE_HELPER_STDOUT_LIMIT
                    ),
                )
            except asyncio.CancelledError:
                await self._close_sandbox()
                raise
            except Exception as exc:
                logger.warning(
                    "E2B Agent sandbox command failed: error_type={}",
                    type(exc).__name__,
                )
                await self._close_sandbox()
                raise RuntimeError("Agent sandbox command failed") from None

            result_metadata = (
                await self._collect_artifacts(sandbox, command)
                if collect_artifacts
                else ""
            )

        output = "\n".join(part for part in (result_metadata, stdout, stderr) if part)
        return ExecuteResponse(
            output=output,
            exit_code=exit_code,
            truncated=any(
                part.endswith(SANDBOX_OUTPUT_TRUNCATED_MARKER)
                for part in (stdout, stderr)
            ),
        )

    async def _collect_artifacts(self, sandbox: AsyncSandbox, command: str) -> str:
        if self._default_skill_id is None:
            return ""
        try:
            artifacts = await E2BSandboxProvider(self._config)._collect_artifacts(
                sandbox,
                SANDBOX_WORKSPACE,
                SANDBOX_OUTPUT_DIRECTORY,
                SandboxExecutionRequest(
                    skill_id=self._default_skill_id, command=command
                ),
                self._timeout,
                budget=self._artifacts,
            )
        except Exception as exc:
            logger.warning(
                "Skill sandbox artifact collection failed: error_type={}",
                type(exc).__name__,
            )
            return "Artifact collection failed."
        return (
            "Artifacts: " + json.dumps(artifacts, ensure_ascii=False)
            if artifacts
            else ""
        )

    async def aclose(self) -> None:
        async with self._lock:
            if self._browsable:
                self._sandbox = None
                return
            await self._close_sandbox()

    async def _close_sandbox(self) -> None:
        sandbox, self._sandbox = self._sandbox, None
        self._browsable = False
        if sandbox is None:
            return
        try:
            await sandbox.kill()
        except Exception as exc:
            logger.warning(
                "Skill sandbox cleanup failed: error_type={}", type(exc).__name__
            )


class FileResponseTruncated(Exception):
    """The transport clipped a structured file operation."""


class E2BFiles(BaseSandbox):
    """Use the framework's file primitives on the same E2B session as execute."""

    def __init__(self, sandbox: E2BAgentSandbox) -> None:
        self.sandbox = sandbox

    @property
    def id(self) -> str:
        return self.sandbox.id

    def execute(self, command: str, *, timeout: int | None = None) -> ExecuteResponse:
        raise NotImplementedError("Use the asynchronous E2B backend")

    async def aexecute(
        self, command: str, *, timeout: int | None = None
    ) -> ExecuteResponse:
        result = await self.sandbox._execute(command, timeout, collect_artifacts=False)
        if result.truncated:
            raise FileResponseTruncated(
                "Sandbox file response exceeded the output limit"
            )
        return result

    async def agrep(
        self,
        pattern: str,
        path: str | None = None,
        glob: str | None = None,
        *,
        max_count: int | None = None,
    ) -> GrepResult:
        try:
            return await super().agrep(pattern, path, glob, max_count=max_count)
        except FileResponseTruncated:
            return GrepResult(
                error="Sandbox grep output exceeded the limit. Narrow the path or pattern."
            )

    def upload_files(self, files: list[tuple[str, bytes]]) -> list[FileUploadResponse]:
        raise NotImplementedError("Use the asynchronous E2B backend")

    async def aupload_files(
        self, files: list[tuple[str, bytes]]
    ) -> list[FileUploadResponse]:
        results = []
        async with self.sandbox._lock:
            session = await self.sandbox._get_sandbox()
            for path, content in files:
                try:
                    await session.files.write(path, content, user="user")
                    results.append(FileUploadResponse(path=path))
                except Exception:
                    results.append(
                        FileUploadResponse(path=path, error=PERMISSION_DENIED)
                    )
        return results

    def download_files(self, paths: list[str]) -> list[FileDownloadResponse]:
        raise NotImplementedError("Use the asynchronous E2B backend")

    async def adownload_files(self, paths: list[str]) -> list[FileDownloadResponse]:
        results = []
        async with self.sandbox._lock:
            session = await self.sandbox._get_sandbox()
            for path in paths:
                try:
                    data = await session.files.read(path, format="bytes", user="user")
                    results.append(FileDownloadResponse(path=path, content=bytes(data)))
                except FileNotFoundException:
                    results.append(
                        FileDownloadResponse(path=path, error=FILE_NOT_FOUND)
                    )
                except Exception:
                    results.append(
                        FileDownloadResponse(path=path, error=PERMISSION_DENIED)
                    )
        return results

    async def adelete(self, file_path: str) -> DeleteResult:
        async with self.sandbox._lock:
            session = await self.sandbox._get_sandbox()
            try:
                await session.files.remove(file_path, user="user")
            except FileNotFoundException:
                return DeleteResult(error="Sandbox file not found")
        return DeleteResult(path=file_path)


def _workspace_path(path: str) -> str:
    if path.rstrip("/") == SANDBOX_WORKSPACE or path.startswith(
        SANDBOX_WORKSPACE + "/"
    ):
        return path
    return SANDBOX_WORKSPACE + "/" + path.lstrip("/")


class E2BWorkspaceFiles(E2BFiles):
    """Map normal tool paths into the shell's working directory."""

    async def als(self, path: str) -> LsResult:
        return await self.sandbox.file_backend.als(_workspace_path(path))

    async def aread(
        self, file_path: str, offset: int = 0, limit: int = 2000
    ) -> ReadResult:
        return await self.sandbox.file_backend.aread(
            _workspace_path(file_path), offset, limit
        )

    async def awrite(self, file_path: str, content: str) -> WriteResult:
        return await self.sandbox.file_backend.awrite(
            _workspace_path(file_path), content
        )

    async def aedit(
        self,
        file_path: str,
        old_string: str,
        new_string: str,
        replace_all: bool = False,
    ) -> EditResult:
        return await self.sandbox.file_backend.aedit(
            _workspace_path(file_path), old_string, new_string, replace_all
        )

    async def aglob(self, pattern: str, path: str | None = None) -> GlobResult:
        return await self.sandbox.file_backend.aglob(
            pattern, _workspace_path(path or "/")
        )

    async def agrep(
        self,
        pattern: str,
        path: str | None = None,
        glob: str | None = None,
        *,
        max_count: int | None = None,
    ) -> GrepResult:
        return await self.sandbox.file_backend.agrep(
            pattern, _workspace_path(path or "/"), glob, max_count=max_count
        )

    async def aupload_files(
        self, files: list[tuple[str, bytes]]
    ) -> list[FileUploadResponse]:
        result = await self.sandbox.file_backend.aupload_files(
            [(_workspace_path(path), body) for path, body in files]
        )
        return [
            FileUploadResponse(path=path, error=item.error)
            for (path, _), item in zip(files, result, strict=True)
        ]

    async def adownload_files(self, paths: list[str]) -> list[FileDownloadResponse]:
        result = await self.sandbox.file_backend.adownload_files(
            [_workspace_path(path) for path in paths]
        )
        return [
            FileDownloadResponse(path=path, content=item.content, error=item.error)
            for path, item in zip(paths, result, strict=True)
        ]

    async def adelete(self, file_path: str) -> DeleteResult:
        return await self.sandbox.file_backend.adelete(_workspace_path(file_path))
