from __future__ import annotations

import json
import mimetypes
import posixpath
from typing import Any

import aiohttp
from common.otlp.trace.span import Span
from loguru import logger
from openai import BaseModel
from pydantic import Field

from agent.service.plugin.base import PluginResponse

SCRIPT_SANDBOX_UNCONFIGURED_MESSAGE = (
    "当前环境未配置脚本沙箱，暂不支持直接执行 Skill 脚本。"
    "你可以向用户说明需要管理员在资源管理中配置脚本沙箱后才能运行。"
)


class SkillSandboxRunner(BaseModel):
    skill_id: str
    resources: list[Any] = Field(default_factory=list)
    sandbox_config: "SkillSandboxConfig | None" = None

    async def run(self, action_input: dict[str, Any], span: Span) -> PluginResponse:
        with span.start(f"RunSkill-{self.skill_id}") as sp:
            command = str(action_input.get("command") or "").strip()
            working_dir = "."
            output_dir = "."
            sp.add_info_events(
                {
                    "skill_id": self.skill_id,
                    "command": command,
                    "configured": self._is_configured(),
                }
            )
            if not self._is_configured():
                return self._unsupported_response()

            if not command:
                return PluginResponse(
                    result={
                        "skill_id": self.skill_id,
                        "configured": True,
                        "error": "command_required",
                    }
                )

            request = SandboxExecutionRequest(
                skill_id=self.skill_id,
                command=command,
                stdin=action_input.get("stdin"),
                working_dir=working_dir,
                output_dir=output_dir,
                resources=self.resources,
            )
            provider = E2BSandboxProvider(self.sandbox_config)
            result = await provider.execute(request)
            stdout = str(result.get("stdout") or "")
            try:
                result["result_json"] = json.loads(stdout) if stdout else None
            except json.JSONDecodeError:
                result["result_json"] = None
            result["skill_id"] = self.skill_id
            return PluginResponse(result=result)

    def _is_configured(self) -> bool:
        return (
            self.sandbox_config is not None
            and self.sandbox_config.enabled
            and self.sandbox_config.provider == "e2b"
            and bool(self.sandbox_config.api_key)
        )

    def _unsupported_response(self) -> PluginResponse:
        return PluginResponse(
            result={
                "skill_id": self.skill_id,
                "configured": False,
                "message": SCRIPT_SANDBOX_UNCONFIGURED_MESSAGE,
            }
        )

    def _normalize_relative_path(self, value: Any, default: str) -> str:
        path = str(value or default).strip().replace("\\", "/")
        if not path or path == ".":
            return "."
        normalized = posixpath.normpath(path)
        if (
            normalized.startswith("/")
            or normalized == ".."
            or normalized.startswith("../")
        ):
            raise ValueError("Path must stay inside the Skill workspace")
        return normalized


class SkillSandboxConfig(BaseModel):
    provider: str = "e2b"
    enabled: bool = False
    api_key: str = ""
    timeout_seconds: int = 60
    allow_internet_access: bool = False
    artifact_upload_url: str = ""
    artifact_upload_token: str = ""
    workflow_id: str = ""
    run_id: str = ""
    node_id: str = ""
    uid: str = ""
    space_id: str = ""


class SandboxExecutionRequest(BaseModel):
    skill_id: str
    command: str
    stdin: Any = None
    working_dir: str = "."
    output_dir: str = "output"
    resources: list[Any] = Field(default_factory=list)


class E2BSandboxProvider:
    def __init__(self, config: SkillSandboxConfig | None) -> None:
        self.config = config or SkillSandboxConfig()

    async def execute(self, request: SandboxExecutionRequest) -> dict[str, Any]:
        from e2b import AsyncSandbox

        sandbox = await AsyncSandbox.create(
            api_key=self.config.api_key,
            timeout=self.config.timeout_seconds,
            allow_internet_access=self.config.allow_internet_access,
            metadata={"skill_id": request.skill_id},
        )
        try:
            workspace = "/home/user/skill"
            await self._stage_resources(sandbox, workspace, request.resources)
            cmd = request.command
            if request.stdin is not None:
                stdin_path = f"{workspace}/.astron_stdin.json"
                await sandbox.files.write(
                    stdin_path, json.dumps(request.stdin, ensure_ascii=False)
                )
                cmd = f"{cmd} < .astron_stdin.json"
            result = await sandbox.commands.run(
                cmd,
                cwd=self._join_workspace(workspace, request.working_dir),
                timeout=self.config.timeout_seconds,
            )
            return {
                "sandbox_provider": "e2b",
                "configured": True,
                "command": request.command,
                "working_dir": request.working_dir,
                "exit_code": getattr(result, "exit_code", 0),
                "stdout": getattr(result, "stdout", ""),
                "stderr": getattr(result, "stderr", ""),
                "artifacts": await self._collect_artifacts(
                    sandbox,
                    workspace,
                    self._join_workspace(workspace, request.output_dir),
                    request,
                ),
            }
        finally:
            await sandbox.kill()

    async def _stage_resources(
        self, sandbox: Any, workspace: str, resources: list[Any]
    ) -> None:
        async with aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30)
        ) as session:
            for resource in resources:
                path = self._safe_resource_path(getattr(resource, "path", ""))
                download_url = str(getattr(resource, "download_url", "") or "")
                if not path or not download_url:
                    continue
                async with session.get(download_url) as response:
                    response.raise_for_status()
                    await sandbox.files.write(
                        f"{workspace}/{path}", await response.read()
                    )

    async def _collect_artifacts(  # noqa: C901
        self,
        sandbox: Any,
        workspace: str,
        output_dir: str,
        request: SandboxExecutionRequest,
    ) -> list[dict[str, Any]]:
        if not await sandbox.files.exists(output_dir):
            return []
        scan_result = await sandbox.commands.run(
            "find . -maxdepth 5 -type f -printf '%P\\t%s\\n'",
            cwd=output_dir,
            timeout=min(max(self.config.timeout_seconds, 1), 60),
        )
        if int(getattr(scan_result, "exit_code", 0) or 0) != 0:
            logger.warning(
                "Skill sandbox artifact scan failed: skill_id={}, stderr={}",
                request.skill_id,
                getattr(scan_result, "stderr", ""),
            )
            return []
        artifacts: list[dict[str, Any]] = []
        uploader = ArtifactUploader(self.config, request.skill_id)
        resource_paths = {
            self._safe_resource_path(getattr(resource, "path", ""))
            for resource in request.resources
        }
        candidates = 0
        for line in str(getattr(scan_result, "stdout", "") or "").splitlines():
            if "\t" not in line:
                continue
            relative_path, raw_size = line.rsplit("\t", 1)
            if self._should_skip_artifact(relative_path, resource_paths):
                continue
            candidates += 1
            file_name = posixpath.basename(relative_path)
            file_path = f"{output_dir.rstrip('/')}/{relative_path}"
            try:
                file_size = int(raw_size)
            except ValueError:
                file_size = 0
            artifact: dict[str, Any] = {
                "file_name": file_name,
                "file_size": file_size,
            }
            if uploader.is_configured() and file_name:
                try:
                    file_bytes = await sandbox.files.read(file_path, format="bytes")
                    artifact.update(
                        await uploader.upload(
                            file_name=file_name,
                            file_bytes=file_bytes,
                            content_type=self._guess_content_type(file_name),
                        )
                    )
                except Exception as exc:
                    logger.warning(
                        "Skill sandbox artifact upload failed: skill_id={}, file_name={}, error={}",
                        request.skill_id,
                        file_name,
                        exc,
                    )
                    artifact["upload_error"] = str(exc)
            artifacts.append(artifact)
        logger.info(
            "Skill sandbox artifact scan finished: skill_id={}, upload_configured={}, candidates={}, artifacts={}",
            request.skill_id,
            uploader.is_configured(),
            candidates,
            len(artifacts),
        )
        return artifacts

    def _guess_content_type(self, file_name: str) -> str:
        return mimetypes.guess_type(file_name)[0] or "application/octet-stream"

    def _should_skip_artifact(
        self, relative_path: str, resource_paths: set[str]
    ) -> bool:
        normalized = self._safe_resource_path(relative_path)
        if not normalized:
            return True
        if any(part.startswith(".") for part in normalized.split("/")):
            return True
        return normalized in resource_paths

    def _join_workspace(self, workspace: str, path: str) -> str:
        if path == ".":
            return workspace
        return f"{workspace}/{self._safe_resource_path(path)}"

    def _safe_resource_path(self, path: str) -> str:
        normalized = posixpath.normpath(str(path or "").strip().replace("\\", "/"))
        if (
            not normalized
            or normalized == "."
            or normalized.startswith("/")
            or normalized == ".."
            or normalized.startswith("../")
        ):
            return ""
        return normalized


class ArtifactUploader:
    def __init__(self, config: SkillSandboxConfig, skill_id: str) -> None:
        self.config = config
        self.skill_id = skill_id

    def is_configured(self) -> bool:
        return bool(
            self.config.artifact_upload_url
            and self.config.workflow_id
            and self.config.uid
        )

    async def upload(
        self, file_name: str, file_bytes: bytes, content_type: str
    ) -> dict[str, Any]:
        form = aiohttp.FormData()
        form.add_field("flowId", self.config.workflow_id)
        form.add_field("uid", self.config.uid)
        if self.config.space_id:
            form.add_field("spaceId", self.config.space_id)
        if self.config.run_id:
            form.add_field("runId", self.config.run_id)
        if self.config.node_id:
            form.add_field("nodeId", self.config.node_id)
        form.add_field("skillId", self.skill_id)
        form.add_field(
            "file",
            file_bytes,
            filename=file_name,
            content_type=content_type,
        )
        headers = {}
        if self.config.artifact_upload_token:
            headers["X-Skill-Sandbox-Artifact-Token"] = (
                self.config.artifact_upload_token
            )
        timeout = aiohttp.ClientTimeout(total=60)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(
                self.config.artifact_upload_url, data=form, headers=headers
            ) as response:
                response.raise_for_status()
                payload = await response.json(content_type=None)
        data = payload.get("data") if isinstance(payload, dict) else None
        if not isinstance(data, dict):
            return {"artifact_upload_response": payload}
        return data
