"""Deep Agents shell execution over the request's authorized Skill files."""

from __future__ import annotations

import asyncio
import json
import shlex
import uuid

from deepagents.backends import StateBackend
from deepagents.backends.protocol import ExecuteResponse, SandboxBackendProtocol
from e2b import AsyncSandbox
from loguru import logger

from agent.service.plugin.skill_sandbox import (
    MAX_SANDBOX_TIMEOUT_SECONDS,
    SANDBOX_INITIALIZATION_ERROR,
    SANDBOX_OUTPUT_TRUNCATED_MARKER,
    ArtifactBudget,
    E2BSandboxProvider,
    SandboxExecutionRequest,
    SkillSandboxConfig,
    _fetch_e2b_runtime_config,
    _run_command_with_bounded_output,
)

SKILL_WORKSPACE = "/home/user/workspace"
SKILL_OUTPUT_DIRECTORY = f"{SKILL_WORKSPACE}/output"


class NativeSkillSandbox(StateBackend, SandboxBackendProtocol):
    """Keep graph state locally and delegate native execute calls to E2B."""

    def __init__(
        self,
        files: dict[str, bytes],
        skill_ids: dict[str, str],
        config: SkillSandboxConfig,
    ) -> None:
        super().__init__()
        if not config.enabled or not skill_ids:
            raise ValueError(
                "Skill sandbox requires enabled execution and authorized skills"
            )
        self._id = uuid.uuid4().hex
        self._files = files
        self._config = config
        self._artifacts = ArtifactBudget(skill_ids)
        self._default_skill_id = next(iter(skill_ids.values()))
        self._sandbox: AsyncSandbox | None = None
        self._timeout = 0
        self._lock = asyncio.Lock()

    @property
    def id(self) -> str:
        return self._id

    async def _get_sandbox(self) -> AsyncSandbox:
        if self._sandbox is not None:
            return self._sandbox
        api_key, timeout, allow_internet = await _fetch_e2b_runtime_config(self._config)
        try:
            sandbox = await AsyncSandbox.create(
                api_key=api_key,
                # Keep the workspace across model decisions. The configured
                # timeout still bounds each command and graph cleanup kills the VM.
                timeout=MAX_SANDBOX_TIMEOUT_SECONDS,
                allow_internet_access=allow_internet,
            )
            self._sandbox = sandbox
            self._timeout = timeout
            await sandbox.files.write_files(
                [
                    {"path": path, "data": content}
                    for path, content in self._files.items()
                ],
                user="root",
            )
            await sandbox.files.make_dir(SKILL_OUTPUT_DIRECTORY, user="user")
        except asyncio.CancelledError:
            await self._close_sandbox()
            raise
        except Exception as exc:
            logger.warning(
                "Skill sandbox initialization failed: error_type={}", type(exc).__name__
            )
            await self._close_sandbox()
            raise RuntimeError(SANDBOX_INITIALIZATION_ERROR) from None
        return sandbox

    async def aexecute(
        self, command: str, *, timeout: int | None = None
    ) -> ExecuteResponse:
        async with self._lock:
            sandbox = await self._get_sandbox()
            command_timeout = min(timeout or self._timeout, self._timeout)
            try:
                exit_code, stdout, stderr = await _run_command_with_bounded_output(
                    sandbox,
                    f"/bin/bash -c {shlex.quote(command)}",
                    SKILL_WORKSPACE,
                    command_timeout,
                )
            except asyncio.CancelledError:
                await self._close_sandbox()
                raise
            except Exception as exc:
                logger.warning(
                    "Skill sandbox command failed: error_type={}", type(exc).__name__
                )
                await self._close_sandbox()
                raise RuntimeError("Skill sandbox command failed") from None

            result_metadata = await self._collect_artifacts(sandbox, command)

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
        try:
            artifacts = await E2BSandboxProvider(self._config)._collect_artifacts(
                sandbox,
                SKILL_WORKSPACE,
                SKILL_OUTPUT_DIRECTORY,
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
            await self._close_sandbox()

    async def _close_sandbox(self) -> None:
        sandbox, self._sandbox = self._sandbox, None
        if sandbox is None:
            return
        try:
            await sandbox.kill()
        except Exception as exc:
            logger.warning(
                "Skill sandbox cleanup failed: error_type={}", type(exc).__name__
            )
