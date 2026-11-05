from __future__ import annotations

import json
import mimetypes
import os
import posixpath
import shlex
import uuid
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

import aiohttp
from common.otlp.trace.span import Span
from loguru import logger
from openai import BaseModel
from pydantic import Field

from agent.service.plugin.base import PluginResponse
from agent.service.plugin.skill_resource_security import (
    MAX_SKILL_RESOURCE_BYTES,
    MAX_SKILL_RESOURCE_COUNT,
    MAX_SKILL_RESOURCE_TOTAL_BYTES,
    SKILL_RESOURCE_ERROR,
    download_skill_resource,
    validate_skill_resource_url,
)

SCRIPT_SANDBOX_UNCONFIGURED_MESSAGE = (
    "当前环境未配置脚本沙箱，暂不支持直接执行 Skill 脚本。"
    "你可以向用户说明需要管理员在资源管理中配置脚本沙箱后才能运行。"
)
ARTIFACT_UPLOAD_TOKEN_ENV = "SKILL_SANDBOX_ARTIFACT_UPLOAD_TOKEN"
ARTIFACT_UPLOAD_TOKEN_FILE_ENV = "SKILL_SANDBOX_ARTIFACT_UPLOAD_TOKEN_FILE"
ARTIFACT_UPLOAD_URL_ENV = "SKILL_SANDBOX_ARTIFACT_UPLOAD_URL"
MIN_ARTIFACT_UPLOAD_TOKEN_LENGTH = 32
ARTIFACT_UPLOAD_CREDENTIAL_ERROR = "Artifact upload credential is missing or invalid"
ARTIFACT_UPLOAD_CONFIG_ERROR = "Artifact upload configuration is unavailable"
ARTIFACT_UPLOAD_PATH = "/workflow/artifacts/internal-upload"
MAX_ARTIFACT_FILE_SIZE_BYTES = 20 * 1024 * 1024
MAX_ARTIFACT_FILES_PER_RUN = 20
MAX_ARTIFACT_TOTAL_SIZE_BYTES = 100 * 1024 * 1024
ARTIFACT_FILE_SIZE_INVALID_ERROR = "artifact_file_size_invalid"
ARTIFACT_FILE_SIZE_LIMIT_ERROR = "artifact_file_size_limit_exceeded"
ARTIFACT_TOTAL_SIZE_LIMIT_ERROR = "artifact_total_size_limit_exceeded"
ARTIFACT_UPLOAD_FAILED_ERROR = "artifact_upload_failed"
RUNTIME_CONFIG_URL_ENV = "SKILL_SANDBOX_RUNTIME_CONFIG_URL"
RUNTIME_CREDENTIAL_TOKEN_ENV = "SKILL_SANDBOX_RUNTIME_CREDENTIAL_TOKEN"
RUNTIME_CREDENTIAL_TOKEN_FILE_ENV = "SKILL_SANDBOX_RUNTIME_CREDENTIAL_TOKEN_FILE"
RUNTIME_CREDENTIAL_HEADER = "X-Skill-Sandbox-Runtime-Credential-Token"
MIN_RUNTIME_CREDENTIAL_TOKEN_LENGTH = 32
RUNTIME_CONFIG_PATH = "/skill-sandbox/internal-runtime-config"
SANDBOX_RUNTIME_CONFIG_ERROR = "Sandbox runtime configuration is unavailable"
SANDBOX_INITIALIZATION_ERROR = "Sandbox initialization failed"
RUNTIME_CONFIG_REQUEST_TIMEOUT_SECONDS = 10
MAX_SANDBOX_TIMEOUT_SECONDS = 600
MAX_ARTIFACT_RELATIVE_PATH_BYTES = 4096
MAX_ARTIFACT_SCAN_OUTPUT_BYTES = (
    MAX_ARTIFACT_FILES_PER_RUN + 1
) * MAX_ARTIFACT_RELATIVE_PATH_BYTES * 6 + 4096
ARTIFACT_SNAPSHOT_OUTPUT_BYTES = 1024
ARTIFACT_SNAPSHOT_ROOT = "/root/.astron-artifact-snapshots"
ARTIFACT_SNAPSHOT_ERROR = "artifact_snapshot_failed"
MAX_SANDBOX_COMMAND_OUTPUT_BYTES = 1024 * 1024
SANDBOX_OUTPUT_TRUNCATED_MARKER = "\n...[output truncated]"

_ARTIFACT_SCAN_HELPER = r"""
import json
import os
import sys

root = sys.argv[1]
limit = int(sys.argv[2])
excluded = set(json.loads(sys.argv[3]))
max_path_bytes = int(sys.argv[4])
found = []
files_seen = 0

def walk(directory, relative_dir, depth):
    global files_seen
    if files_seen >= limit:
        return
    try:
        entries = os.scandir(directory)
    except OSError:
        return
    with entries:
        for entry in entries:
            if files_seen >= limit:
                return
            relative = entry.name if not relative_dir else relative_dir + "/" + entry.name
            if len(relative.encode("utf-8", "surrogateescape")) > max_path_bytes:
                continue
            try:
                if entry.is_dir(follow_symlinks=False):
                    if not entry.name.startswith(".") and depth < 5:
                        walk(entry.path, relative, depth + 1)
                elif entry.is_file(follow_symlinks=False):
                    files_seen += 1
                    if not entry.name.startswith(".") and relative not in excluded:
                        size = entry.stat(follow_symlinks=False).st_size
                        found.append({"path": relative, "size": size})
            except OSError:
                continue

walk(root, "", 1)
print(json.dumps(found, ensure_ascii=True, separators=(",", ":")))
""".strip()

_ARTIFACT_SNAPSHOT_HELPER = r"""
import json
import os
import stat
import sys

source = sys.argv[1]
destination = sys.argv[2]
max_bytes = int(sys.argv[3])
source_fd = None
destination_fd = None
try:
    os.makedirs(os.path.dirname(destination), mode=0o700, exist_ok=True)
    os.chmod(os.path.dirname(destination), 0o700)
    source_flags = os.O_RDONLY | getattr(os, "O_CLOEXEC", 0) | getattr(os, "O_NONBLOCK", 0)
    source_flags |= getattr(os, "O_NOFOLLOW", 0)
    source_fd = os.open(source, source_flags)
    if not stat.S_ISREG(os.fstat(source_fd).st_mode):
        raise OSError
    destination_flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_CLOEXEC", 0)
    destination_flags |= getattr(os, "O_NOFOLLOW", 0)
    destination_fd = os.open(destination, destination_flags, 0o600)
    copied = 0
    while copied < max_bytes + 1:
        chunk = os.read(source_fd, min(65536, max_bytes + 1 - copied))
        if not chunk:
            break
        view = memoryview(chunk)
        while view:
            written = os.write(destination_fd, view)
            view = view[written:]
        copied += len(chunk)
    print(json.dumps({"size": copied}, separators=(",", ":")))
except Exception:
    try:
        if destination_fd is not None:
            os.close(destination_fd)
            destination_fd = None
        os.unlink(destination)
    except OSError:
        pass
    print('{"error":"snapshot_failed"}')
finally:
    if source_fd is not None:
        os.close(source_fd)
    if destination_fd is not None:
        os.close(destination_fd)
""".strip()


def _load_artifact_upload_token() -> str:
    token = (os.getenv(ARTIFACT_UPLOAD_TOKEN_ENV) or "").strip()
    if not token:
        token_file = (os.getenv(ARTIFACT_UPLOAD_TOKEN_FILE_ENV) or "").strip()
        if token_file:
            try:
                token = Path(token_file).read_text(encoding="utf-8").strip()
            except (OSError, UnicodeError) as exc:
                raise RuntimeError(ARTIFACT_UPLOAD_CREDENTIAL_ERROR) from exc
    if len(token) < MIN_ARTIFACT_UPLOAD_TOKEN_LENGTH or "\r" in token or "\n" in token:
        raise RuntimeError(ARTIFACT_UPLOAD_CREDENTIAL_ERROR)
    return token


def _load_artifact_upload_url() -> str:
    artifact_upload_url = (os.getenv(ARTIFACT_UPLOAD_URL_ENV) or "").strip()
    try:
        parsed = urlsplit(artifact_upload_url)
        if (
            not artifact_upload_url
            or len(artifact_upload_url) > 2048
            or any(char in artifact_upload_url for char in ("\r", "\n", "\t"))
            or parsed.scheme not in {"http", "https"}
            or not parsed.hostname
            or parsed.username is not None
            or parsed.password is not None
            or parsed.path != ARTIFACT_UPLOAD_PATH
            or bool(parsed.query)
            or bool(parsed.fragment)
        ):
            raise ValueError
        parsed.port
    except (TypeError, ValueError):
        raise RuntimeError(ARTIFACT_UPLOAD_CONFIG_ERROR) from None
    return artifact_upload_url


def _load_runtime_config_url() -> str:
    runtime_config_url = (os.getenv(RUNTIME_CONFIG_URL_ENV) or "").strip()
    try:
        parsed = urlsplit(runtime_config_url)
        if (
            not runtime_config_url
            or len(runtime_config_url) > 2048
            or any(char in runtime_config_url for char in ("\r", "\n", "\t"))
            or parsed.scheme not in {"http", "https"}
            or not parsed.hostname
            or parsed.username is not None
            or parsed.password is not None
            or parsed.path != RUNTIME_CONFIG_PATH
            or bool(parsed.query)
            or bool(parsed.fragment)
        ):
            raise ValueError
        parsed.port
    except (TypeError, ValueError):
        raise RuntimeError(SANDBOX_RUNTIME_CONFIG_ERROR) from None
    return runtime_config_url


def _load_runtime_credential_token() -> str:
    token = (os.getenv(RUNTIME_CREDENTIAL_TOKEN_ENV) or "").strip()
    if not token:
        token_file = (os.getenv(RUNTIME_CREDENTIAL_TOKEN_FILE_ENV) or "").strip()
        if token_file:
            try:
                token = Path(token_file).read_text(encoding="utf-8").strip()
            except (OSError, UnicodeError):
                raise RuntimeError(SANDBOX_RUNTIME_CONFIG_ERROR) from None
    if (
        len(token) < MIN_RUNTIME_CREDENTIAL_TOKEN_LENGTH
        or "\r" in token
        or "\n" in token
    ):
        raise RuntimeError(SANDBOX_RUNTIME_CONFIG_ERROR)
    return token


def _runtime_config_query(config: "SkillSandboxConfig") -> dict[str, str]:
    uid = str(config.uid or "").strip()
    if not uid:
        raise RuntimeError(SANDBOX_RUNTIME_CONFIG_ERROR)
    query = {"uid": uid}
    workflow_id = str(config.workflow_id or "").strip()
    if workflow_id:
        query["flowId"] = workflow_id
    if config.agent_id:
        query["agentId"] = config.agent_id
    space_id = str(config.space_id or "").strip()
    if space_id:
        query["spaceId"] = space_id
    return query


async def _fetch_e2b_runtime_config(
    config: "SkillSandboxConfig",
) -> tuple[str, int, bool]:
    try:
        runtime_config_url = _load_runtime_config_url()
        credential_token = _load_runtime_credential_token()
        timeout = aiohttp.ClientTimeout(total=RUNTIME_CONFIG_REQUEST_TIMEOUT_SECONDS)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(
                runtime_config_url,
                headers={RUNTIME_CREDENTIAL_HEADER: credential_token},
                params=_runtime_config_query(config),
                allow_redirects=False,
            ) as response:
                if not 200 <= response.status < 300:
                    raise ValueError
                response.raise_for_status()
                payload = await response.json(content_type=None)
        code = payload.get("code") if isinstance(payload, dict) else None
        if isinstance(code, bool) or not isinstance(code, int) or code != 0:
            raise ValueError
        data = payload.get("data") if isinstance(payload, dict) else None
        provider = data.get("provider") if isinstance(data, dict) else None
        api_key = data.get("apiKey") if isinstance(data, dict) else None
        timeout_seconds = data.get("timeoutSeconds") if isinstance(data, dict) else None
        allow_internet_access = (
            data.get("allowInternetAccess") if isinstance(data, dict) else None
        )
        if not isinstance(provider, str) or provider.strip().lower() != "e2b":
            raise ValueError
        if not isinstance(api_key, str) or not api_key.strip():
            raise ValueError
        if (
            isinstance(timeout_seconds, bool)
            or not isinstance(timeout_seconds, int)
            or not 1 <= timeout_seconds <= MAX_SANDBOX_TIMEOUT_SECONDS
        ):
            raise ValueError
        if not isinstance(allow_internet_access, bool):
            raise ValueError
        return api_key.strip(), timeout_seconds, allow_internet_access
    except Exception:
        raise RuntimeError(SANDBOX_RUNTIME_CONFIG_ERROR) from None


class _ArtifactReadLimitExceeded(Exception):
    pass


def _bounded_helper_command(script: str, args: list[str], output_limit: int) -> str:
    command = " ".join(
        ["python3", "-c", shlex.quote(script), *(shlex.quote(arg) for arg in args)]
    )
    return (
        "PATH=/usr/local/bin:/usr/bin:/bin "
        f"{command} 2>/dev/null | /usr/bin/head -c {output_limit}"
    )


async def _scan_artifact_candidates(
    sandbox: Any,
    output_dir: str,
    excluded_paths: set[str],
    timeout_seconds: int,
) -> list[dict[str, Any]]:
    command = _bounded_helper_command(
        _ARTIFACT_SCAN_HELPER,
        [
            output_dir,
            str(MAX_ARTIFACT_FILES_PER_RUN + 1),
            json.dumps(sorted(excluded_paths), ensure_ascii=True),
            str(MAX_ARTIFACT_RELATIVE_PATH_BYTES),
        ],
        MAX_ARTIFACT_SCAN_OUTPUT_BYTES,
    )
    result = await sandbox.commands.run(
        command,
        timeout=timeout_seconds,
        user="root",
    )
    if int(getattr(result, "exit_code", 0) or 0) != 0:
        raise RuntimeError(ARTIFACT_SNAPSHOT_ERROR)
    stdout = str(getattr(result, "stdout", "") or "")
    if len(stdout.encode("utf-8", "surrogateescape")) > MAX_ARTIFACT_SCAN_OUTPUT_BYTES:
        raise RuntimeError(ARTIFACT_SNAPSHOT_ERROR)
    try:
        payload = json.loads(stdout)
    except (TypeError, ValueError):
        raise RuntimeError(ARTIFACT_SNAPSHOT_ERROR) from None
    if not isinstance(payload, list) or len(payload) > MAX_ARTIFACT_FILES_PER_RUN + 1:
        raise RuntimeError(ARTIFACT_SNAPSHOT_ERROR)
    return [item for item in payload if isinstance(item, dict)]


async def _read_bounded_snapshot(
    sandbox: Any,
    file_path: str,
    max_bytes: int,
    timeout_seconds: int,
) -> tuple[bytes, bool]:
    snapshot_path = f"{ARTIFACT_SNAPSHOT_ROOT}/{uuid.uuid4().hex}"
    command = _bounded_helper_command(
        _ARTIFACT_SNAPSHOT_HELPER,
        [file_path, snapshot_path, str(max_bytes)],
        ARTIFACT_SNAPSHOT_OUTPUT_BYTES,
    )
    try:
        result = await sandbox.commands.run(
            command,
            timeout=timeout_seconds,
            user="root",
        )
        if int(getattr(result, "exit_code", 0) or 0) != 0:
            raise RuntimeError(ARTIFACT_SNAPSHOT_ERROR)
        try:
            payload = json.loads(str(getattr(result, "stdout", "") or ""))
        except (TypeError, ValueError):
            raise RuntimeError(ARTIFACT_SNAPSHOT_ERROR) from None
        snapshot_size = payload.get("size") if isinstance(payload, dict) else None
        if (
            isinstance(snapshot_size, bool)
            or not isinstance(snapshot_size, int)
            or snapshot_size < 0
            or snapshot_size > max_bytes + 1
        ):
            raise RuntimeError(ARTIFACT_SNAPSHOT_ERROR)
        file_bytes = await sandbox.files.read(
            snapshot_path,
            format="bytes",
            user="root",
        )
        if not isinstance(file_bytes, (bytes, bytearray, memoryview)):
            raise RuntimeError(ARTIFACT_SNAPSHOT_ERROR)
        if len(file_bytes) != snapshot_size or len(file_bytes) > max_bytes + 1:
            raise RuntimeError(ARTIFACT_SNAPSHOT_ERROR)
        bounded = bytes(file_bytes[:max_bytes])
        return bounded, len(file_bytes) > max_bytes
    finally:
        try:
            await sandbox.files.remove(snapshot_path, user="root")
        except Exception:
            pass


async def _snapshot_artifact_bytes(
    sandbox: Any,
    file_path: str,
    max_bytes: int,
    timeout_seconds: int,
) -> bytes:
    file_bytes, truncated = await _read_bounded_snapshot(
        sandbox,
        file_path,
        max_bytes,
        timeout_seconds,
    )
    if truncated:
        raise _ArtifactReadLimitExceeded
    return file_bytes


def _decode_bounded_output(value: bytes, truncated: bool) -> str:
    output = value.decode("utf-8", errors="replace")
    return output + SANDBOX_OUTPUT_TRUNCATED_MARKER if truncated else output


async def _run_command_with_bounded_output(
    sandbox: Any,
    command: str,
    cwd: str,
    timeout_seconds: int,
) -> tuple[int, str, str]:
    output_id = uuid.uuid4().hex
    stdout_path = f"/tmp/.astron-command-{output_id}.stdout"
    stderr_path = f"/tmp/.astron-command-{output_id}.stderr"
    wrapped_command = (
        f"/bin/sh -c {shlex.quote(command)} "
        f"> {shlex.quote(stdout_path)} 2> {shlex.quote(stderr_path)}"
    )
    try:
        result = await sandbox.commands.run(
            wrapped_command,
            cwd=cwd,
            timeout=timeout_seconds,
        )
        stdout_bytes, stdout_truncated = await _read_bounded_snapshot(
            sandbox,
            stdout_path,
            MAX_SANDBOX_COMMAND_OUTPUT_BYTES,
            min(max(timeout_seconds, 1), 60),
        )
        stderr_bytes, stderr_truncated = await _read_bounded_snapshot(
            sandbox,
            stderr_path,
            MAX_SANDBOX_COMMAND_OUTPUT_BYTES,
            min(max(timeout_seconds, 1), 60),
        )
        return (
            int(getattr(result, "exit_code", 0) or 0),
            _decode_bounded_output(stdout_bytes, stdout_truncated),
            _decode_bounded_output(stderr_bytes, stderr_truncated),
        )
    finally:
        for output_path in (stdout_path, stderr_path):
            try:
                await sandbox.files.remove(output_path, user="root")
            except Exception:
                pass


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
                    "command_bytes": len(command.encode("utf-8")),
                    "configured": self._is_configured(),
                }
            )
            if not self._is_configured():
                return self._unsupported_response()

            if not command:
                return PluginResponse(
                    code=40024,
                    result={
                        "skill_id": self.skill_id,
                        "configured": True,
                        "error": "command_required",
                    },
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
            return PluginResponse(
                code=0 if result.get("exit_code") == 0 else 40024, result=result
            )

    def _is_configured(self) -> bool:
        return self.sandbox_config is not None and self.sandbox_config.enabled

    def _unsupported_response(self) -> PluginResponse:
        return PluginResponse(
            code=40024,
            result={
                "skill_id": self.skill_id,
                "configured": False,
                "message": SCRIPT_SANDBOX_UNCONFIGURED_MESSAGE,
            },
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
    enabled: bool = False
    console: bool = False
    root_id: str = ""
    artifact_uid: str = ""
    agent_id: str = ""
    session_id: str = ""
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

        (
            api_key,
            execution_timeout,
            allow_internet_access,
        ) = await _fetch_e2b_runtime_config(self.config)
        try:
            sandbox = await AsyncSandbox.create(
                api_key=api_key,
                timeout=execution_timeout,
                allow_internet_access=allow_internet_access,
                metadata={"skill_id": request.skill_id},
            )
        except Exception:
            raise RuntimeError(SANDBOX_INITIALIZATION_ERROR) from None
        finally:
            api_key = ""
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
            exit_code, stdout, stderr = await _run_command_with_bounded_output(
                sandbox,
                cmd,
                cwd=self._join_workspace(workspace, request.working_dir),
                timeout_seconds=execution_timeout,
            )
            return {
                "sandbox_provider": "e2b",
                "configured": True,
                "command": request.command,
                "working_dir": request.working_dir,
                "exit_code": exit_code,
                "stdout": stdout,
                "stderr": stderr,
                "artifacts": await self._collect_artifacts(
                    sandbox,
                    workspace,
                    self._join_workspace(workspace, request.output_dir),
                    request,
                    execution_timeout,
                ),
            }
        finally:
            await sandbox.kill()

    async def _stage_resources(
        self, sandbox: Any, workspace: str, resources: list[Any]
    ) -> None:
        staged: list[tuple[str, str, int]] = []
        declared_total = 0
        if len(resources) > MAX_SKILL_RESOURCE_COUNT:
            raise RuntimeError(SKILL_RESOURCE_ERROR)
        for resource in resources:
            path = self._safe_resource_path(getattr(resource, "path", ""))
            download_url = str(getattr(resource, "download_url", "") or "")
            try:
                declared_size = int(getattr(resource, "file_size", 0) or 0)
                trusted_url = validate_skill_resource_url(download_url)
            except (TypeError, ValueError, RuntimeError):
                raise RuntimeError(SKILL_RESOURCE_ERROR) from None
            if (
                not path
                or declared_size < 0
                or declared_size > MAX_SKILL_RESOURCE_BYTES
                or declared_total + declared_size > MAX_SKILL_RESOURCE_TOTAL_BYTES
            ):
                raise RuntimeError(SKILL_RESOURCE_ERROR)
            declared_total += declared_size
            staged.append((path, trusted_url, declared_size))

        actual_total = 0
        async with aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30)
        ) as session:
            for path, download_url, _declared_size in staged:
                remaining = MAX_SKILL_RESOURCE_TOTAL_BYTES - actual_total
                if remaining < 1:
                    raise RuntimeError(SKILL_RESOURCE_ERROR)
                value = await download_skill_resource(
                    session,
                    download_url,
                    min(MAX_SKILL_RESOURCE_BYTES, remaining),
                )
                actual_total += len(value)
                await sandbox.files.write(f"{workspace}/{path}", value)

    async def _collect_artifacts(  # noqa: C901
        self,
        sandbox: Any,
        workspace: str,
        output_dir: str,
        request: SandboxExecutionRequest,
        execution_timeout: int | None = None,
    ) -> list[dict[str, Any]]:
        if not await sandbox.files.exists(output_dir):
            return []
        scan_timeout = min(max(execution_timeout or 60, 1), 60)
        resource_paths = {
            self._safe_resource_path(getattr(resource, "path", ""))
            for resource in request.resources
        }
        try:
            scan_items = await _scan_artifact_candidates(
                sandbox,
                output_dir,
                resource_paths,
                scan_timeout,
            )
        except RuntimeError:
            logger.warning(
                "Skill sandbox artifact scan failed: skill_id={}",
                request.skill_id,
            )
            return []
        artifacts: list[dict[str, Any]] = []
        uploader = ArtifactUploader(self.config, request.skill_id)
        candidates = 0
        total_artifact_bytes = 0
        for item in scan_items:
            relative_path = item.get("path")
            raw_size = item.get("size")
            if not isinstance(relative_path, str):
                continue
            if self._should_skip_artifact(relative_path, resource_paths):
                continue
            candidates += 1
            if candidates > MAX_ARTIFACT_FILES_PER_RUN:
                logger.warning(
                    "Skill sandbox artifact count limit reached: skill_id={}, limit={}",
                    request.skill_id,
                    MAX_ARTIFACT_FILES_PER_RUN,
                )
                break
            file_name = posixpath.basename(relative_path)
            file_path = f"{output_dir.rstrip('/')}/{relative_path}"
            file_size = self._safe_int(raw_size)
            artifact: dict[str, Any] = {
                "file_name": file_name,
                "file_size": file_size if file_size is not None else 0,
            }
            if file_size is None:
                artifact["upload_error"] = ARTIFACT_FILE_SIZE_INVALID_ERROR
                artifacts.append(artifact)
                continue
            if file_size > MAX_ARTIFACT_FILE_SIZE_BYTES:
                artifact["upload_error"] = ARTIFACT_FILE_SIZE_LIMIT_ERROR
                artifacts.append(artifact)
                continue
            total_before_file = total_artifact_bytes
            if total_before_file + file_size > MAX_ARTIFACT_TOTAL_SIZE_BYTES:
                artifact["upload_error"] = ARTIFACT_TOTAL_SIZE_LIMIT_ERROR
                artifacts.append(artifact)
                continue
            total_artifact_bytes = total_before_file + file_size
            if uploader.is_configured() and file_name:
                try:
                    remaining_total_bytes = (
                        MAX_ARTIFACT_TOTAL_SIZE_BYTES - total_before_file
                    )
                    stream_limit = min(
                        MAX_ARTIFACT_FILE_SIZE_BYTES, remaining_total_bytes
                    )
                    file_bytes = await _snapshot_artifact_bytes(
                        sandbox,
                        file_path,
                        stream_limit,
                        scan_timeout,
                    )
                    total_artifact_bytes += max(len(file_bytes) - file_size, 0)
                    artifact["file_size"] = max(file_size, len(file_bytes))
                    artifact.update(
                        await uploader.upload(
                            file_name=file_name,
                            file_bytes=file_bytes,
                            content_type=self._guess_content_type(file_name),
                        )
                    )
                except _ArtifactReadLimitExceeded:
                    total_artifact_bytes = min(
                        MAX_ARTIFACT_TOTAL_SIZE_BYTES,
                        total_before_file + stream_limit,
                    )
                    artifact["file_size"] = max(file_size, stream_limit + 1)
                    artifact["upload_error"] = (
                        ARTIFACT_TOTAL_SIZE_LIMIT_ERROR
                        if remaining_total_bytes < MAX_ARTIFACT_FILE_SIZE_BYTES
                        else ARTIFACT_FILE_SIZE_LIMIT_ERROR
                    )
                except Exception as exc:
                    logger.warning(
                        "Skill sandbox artifact upload failed: skill_id={}, file_name={}, error_type={}",
                        request.skill_id,
                        file_name,
                        type(exc).__name__,
                    )
                    artifact["upload_error"] = ARTIFACT_UPLOAD_FAILED_ERROR
            if not uploader.is_configured():
                artifact["upload_error"] = ARTIFACT_UPLOAD_CONFIG_ERROR
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

    def _safe_int(self, value: Any) -> int | None:
        if isinstance(value, bool):
            return None
        try:
            parsed = int(value)
        except (TypeError, ValueError):
            return None
        return parsed if parsed >= 0 else None

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
        if not (self.config.workflow_id or self.config.agent_id) or not self.config.uid:
            return False
        try:
            _load_artifact_upload_url()
        except RuntimeError:
            return False
        return True

    def _workflow_target(self, url: str, form: aiohttp.FormData) -> str:
        if not self.config.console:
            return url
        if not all(
            (
                self.config.root_id,
                self.config.run_id,
                self.config.node_id,
                self.config.artifact_uid,
            )
        ):
            raise RuntimeError(SANDBOX_RUNTIME_CONFIG_ERROR)
        form.add_field("rootId", self.config.root_id)
        return (
            urlsplit(url)._replace(path="/workflow/artifacts/console-upload").geturl()
        )

    async def upload(
        self, file_name: str, file_bytes: bytes, content_type: str
    ) -> dict[str, Any]:
        artifact_upload_url = _load_artifact_upload_url()
        artifact_upload_token = _load_artifact_upload_token()
        form = aiohttp.FormData()
        if self.config.agent_id and not self.config.workflow_id:
            parsed = urlsplit(artifact_upload_url)
            artifact_upload_url = parsed._replace(
                path="/agents/artifacts/internal-upload"
            ).geturl()
            form.add_field("agentId", self.config.agent_id)
            if self.config.session_id:
                form.add_field("sessionId", self.config.session_id)
        else:
            artifact_upload_url = self._workflow_target(artifact_upload_url, form)
            form.add_field("flowId", self.config.workflow_id)
        form.add_field("uid", self.config.artifact_uid or self.config.uid)
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
        headers = {
            "X-Skill-Sandbox-Artifact-Token": artifact_upload_token,
        }
        timeout = aiohttp.ClientTimeout(total=60)
        try:
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(
                    artifact_upload_url,
                    data=form,
                    headers=headers,
                    allow_redirects=False,
                ) as response:
                    if not 200 <= response.status < 300:
                        raise ValueError
                    response.raise_for_status()
                    payload = await response.json(content_type=None)
            code = payload.get("code") if isinstance(payload, dict) else None
            data = payload.get("data") if isinstance(payload, dict) else None
            if (
                isinstance(code, bool)
                or not isinstance(code, int)
                or code != 0
                or not isinstance(data, dict)
            ):
                raise ValueError
            return data
        except Exception:
            raise RuntimeError(ARTIFACT_UPLOAD_FAILED_ERROR) from None
