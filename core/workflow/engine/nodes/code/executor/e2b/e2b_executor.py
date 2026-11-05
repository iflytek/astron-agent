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
from loguru import logger

from workflow.engine.nodes.code.executor.base_executor import BaseExecutor
from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum
from workflow.extensions.otlp.trace.span import Span

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


def _runtime_config_query(sandbox_config: dict[str, Any]) -> dict[str, str]:
    uid = str(sandbox_config.get("uid") or "").strip()
    if not uid:
        raise RuntimeError(SANDBOX_RUNTIME_CONFIG_ERROR)
    query = {"uid": uid}
    workflow_id = str(sandbox_config.get("workflow_id") or "").strip()
    if workflow_id:
        query["flowId"] = workflow_id
    space_id = str(sandbox_config.get("space_id") or "").strip()
    if space_id:
        query["spaceId"] = space_id
    return query


async def _fetch_e2b_runtime_config(
    sandbox_config: dict[str, Any],
) -> tuple[str, int, bool]:
    try:
        runtime_config_url = _load_runtime_config_url()
        credential_token = _load_runtime_credential_token()
        timeout = aiohttp.ClientTimeout(total=RUNTIME_CONFIG_REQUEST_TIMEOUT_SECONDS)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(
                runtime_config_url,
                headers={RUNTIME_CREDENTIAL_HEADER: credential_token},
                params=_runtime_config_query(sandbox_config),
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


def _require_sandbox_config(language: str, value: Any) -> dict[str, Any]:
    if language != "python":
        raise CustomException(
            err_code=CodeEnum.CODE_EXECUTION_ERROR,
            err_msg=f"Unsupported E2B code language: {language}",
        )
    if not isinstance(value, dict):
        raise CustomException(
            err_code=CodeEnum.CODE_EXECUTION_ERROR,
            err_msg=SANDBOX_RUNTIME_CONFIG_ERROR,
        )
    return value


async def _create_e2b_sandbox(sandbox_config: dict[str, Any]) -> tuple[Any, int]:
    from e2b import AsyncSandbox

    try:
        api_key, execution_timeout, allow_internet_access = (
            await _fetch_e2b_runtime_config(sandbox_config)
        )
    except RuntimeError:
        raise CustomException(
            err_code=CodeEnum.CODE_EXECUTION_ERROR,
            err_msg=SANDBOX_RUNTIME_CONFIG_ERROR,
        ) from None
    try:
        sandbox = await AsyncSandbox.create(
            api_key=api_key,
            timeout=execution_timeout,
            allow_internet_access=allow_internet_access,
            metadata={
                "workflow_id": str(sandbox_config.get("workflow_id") or ""),
                "node_id": str(sandbox_config.get("node_id") or ""),
            },
        )
    except Exception:
        raise CustomException(
            err_code=CodeEnum.CODE_EXECUTION_ERROR,
            err_msg=SANDBOX_INITIALIZATION_ERROR,
        ) from None
    finally:
        api_key = ""
    return sandbox, execution_timeout


async def _kill_sandbox(sandbox: Any) -> None:
    try:
        await sandbox.kill()
    except Exception as exc:
        logger.warning("E2B sandbox cleanup failed: error={}", exc)


class E2BExecutor(BaseExecutor):
    async def execute(
        self, language: str, code: str, timeout: int, span: Span, **kwargs: Any
    ) -> str:
        sandbox_config = _require_sandbox_config(language, kwargs.get("sandbox") or {})
        sandbox, execution_timeout = await _create_e2b_sandbox(sandbox_config)
        workspace = "/home/user/code"
        main_path = f"{workspace}/main.py"
        try:
            return await self._execute_in_sandbox(
                sandbox,
                workspace,
                main_path,
                code,
                execution_timeout,
                sandbox_config,
                span,
            )
        except CustomException:
            raise
        except Exception as err:
            raise CustomException(
                err_code=CodeEnum.CODE_EXECUTION_ERROR, cause_error=err
            ) from err
        finally:
            await _kill_sandbox(sandbox)

    async def _execute_in_sandbox(
        self,
        sandbox: Any,
        workspace: str,
        main_path: str,
        code: str,
        execution_timeout: int,
        sandbox_config: dict[str, Any],
        span: Span,
    ) -> str:
        await sandbox.files.write(main_path, code)
        exit_code, stdout, stderr = await _run_command_with_bounded_output(
            sandbox,
            f"python {shlex.quote(main_path)}",
            cwd=workspace,
            timeout_seconds=execution_timeout,
        )
        await span.add_info_events_async(
            {
                "e2b_code_execute_result": json.dumps(
                    {"exit_code": exit_code, "stdout": stdout, "stderr": stderr},
                    ensure_ascii=False,
                )
            }
        )
        artifacts = await self._collect_artifacts(
            sandbox=sandbox,
            workspace=workspace,
            sandbox_config=sandbox_config,
            execution_timeout=execution_timeout,
        )
        if artifacts:
            await span.add_info_events_async(
                {"e2b_code_artifacts": json.dumps(artifacts, ensure_ascii=False)}
            )
        if exit_code != 0:
            raise CustomException(
                err_code=CodeEnum.CODE_EXECUTION_ERROR,
                err_msg=stderr or stdout or f"E2B command exited with {exit_code}",
            )
        return stdout[:-1] if stdout.endswith("\n") else stdout

    async def _collect_artifacts(
        self,
        sandbox: Any,
        workspace: str,
        sandbox_config: dict[str, Any],
        execution_timeout: int | None = None,
    ) -> list[dict[str, Any]]:
        if not await sandbox.files.exists(workspace):
            return []
        scan_timeout = min(max(execution_timeout or 10, 1), 60)
        try:
            scan_items = await _scan_artifact_candidates(
                sandbox,
                workspace,
                {"main.py"},
                scan_timeout,
            )
        except RuntimeError:
            logger.warning("E2B code artifact scan failed")
            return []

        uploader = CodeArtifactUploader(sandbox_config)
        artifacts: list[dict[str, Any]] = []
        candidates = 0
        total_artifact_bytes = 0
        for item in scan_items:
            candidate = self._artifact_candidate(item, workspace)
            if candidate is None:
                continue
            candidates += 1
            if candidates > MAX_ARTIFACT_FILES_PER_RUN:
                logger.warning(
                    "E2B code artifact count limit reached: limit={}",
                    MAX_ARTIFACT_FILES_PER_RUN,
                )
                break
            artifact, file_path, file_size = candidate
            total_before_file = total_artifact_bytes
            limit_error = self._artifact_limit_error(file_size, total_before_file)
            if limit_error is not None:
                artifact["upload_error"] = limit_error
                artifacts.append(artifact)
                continue
            assert file_size is not None
            total_artifact_bytes = total_before_file + file_size
            if uploader.is_configured() and artifact["file_name"]:
                total_artifact_bytes = await self._upload_artifact(
                    sandbox,
                    uploader,
                    artifact,
                    file_path,
                    file_size,
                    total_before_file,
                    scan_timeout,
                )
            artifacts.append(artifact)
        return artifacts

    def _artifact_candidate(
        self, item: dict[str, Any], workspace: str
    ) -> tuple[dict[str, Any], str, int | None] | None:
        relative_path = item.get("path")
        if not isinstance(relative_path, str) or self._should_skip_artifact(
            relative_path
        ):
            return None
        safe_path = self._safe_path(relative_path)
        file_size = self._safe_int(item.get("size"))
        artifact: dict[str, Any] = {
            "file_name": posixpath.basename(relative_path),
            "file_size": file_size if file_size is not None else 0,
        }
        return artifact, f"{workspace}/{safe_path}", file_size

    @staticmethod
    def _artifact_limit_error(file_size: int | None, total_bytes: int) -> str | None:
        if file_size is None:
            return ARTIFACT_FILE_SIZE_INVALID_ERROR
        if file_size > MAX_ARTIFACT_FILE_SIZE_BYTES:
            return ARTIFACT_FILE_SIZE_LIMIT_ERROR
        if total_bytes + file_size > MAX_ARTIFACT_TOTAL_SIZE_BYTES:
            return ARTIFACT_TOTAL_SIZE_LIMIT_ERROR
        return None

    async def _upload_artifact(
        self,
        sandbox: Any,
        uploader: CodeArtifactUploader,
        artifact: dict[str, Any],
        file_path: str,
        file_size: int,
        total_before_file: int,
        scan_timeout: int,
    ) -> int:
        remaining_total_bytes = MAX_ARTIFACT_TOTAL_SIZE_BYTES - total_before_file
        stream_limit = min(MAX_ARTIFACT_FILE_SIZE_BYTES, remaining_total_bytes)
        try:
            file_bytes = await _snapshot_artifact_bytes(
                sandbox, file_path, stream_limit, scan_timeout
            )
            artifact["file_size"] = max(file_size, len(file_bytes))
            artifact.update(
                await uploader.upload(
                    file_name=artifact["file_name"],
                    file_bytes=file_bytes,
                    content_type=self._guess_content_type(artifact["file_name"]),
                )
            )
            return total_before_file + max(file_size, len(file_bytes))
        except _ArtifactReadLimitExceeded:
            artifact["file_size"] = max(file_size, stream_limit + 1)
            artifact["upload_error"] = (
                ARTIFACT_TOTAL_SIZE_LIMIT_ERROR
                if remaining_total_bytes < MAX_ARTIFACT_FILE_SIZE_BYTES
                else ARTIFACT_FILE_SIZE_LIMIT_ERROR
            )
            return min(MAX_ARTIFACT_TOTAL_SIZE_BYTES, total_before_file + stream_limit)
        except Exception as exc:
            logger.warning(
                "E2B code artifact upload failed: file_name={}, error_type={}",
                artifact["file_name"],
                type(exc).__name__,
            )
            artifact["upload_error"] = ARTIFACT_UPLOAD_FAILED_ERROR
            return total_before_file + file_size

    def _should_skip_artifact(self, relative_path: str) -> bool:
        normalized = self._safe_path(relative_path)
        if not normalized or normalized == "main.py":
            return True
        parts = normalized.split("/")
        if any(part.startswith(".") for part in parts):
            return True
        if "__pycache__" in parts:
            return True
        return normalized.endswith((".pyc", ".pyo"))

    def _safe_path(self, path: str) -> str:
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

    def _safe_int(self, value: Any) -> int | None:
        if isinstance(value, bool):
            return None
        try:
            parsed = int(value)
        except (TypeError, ValueError):
            return None
        return parsed if parsed >= 0 else None

    def _guess_content_type(self, file_name: str) -> str:
        return mimetypes.guess_type(file_name)[0] or "application/octet-stream"


class CodeArtifactUploader:
    def __init__(self, sandbox_config: dict[str, Any]) -> None:
        self.sandbox_config = sandbox_config

    def _console_identity(self) -> dict[str, Any] | None:
        if not self.sandbox_config.get("console"):
            return None
        context = self.sandbox_config.get("artifact_context")
        if (
            not isinstance(context, dict)
            or any(
                not isinstance(context.get(key), str) or not context[key]
                for key in ("root_id", "uid")
            )
            or any(
                not self.sandbox_config.get(key)
                for key in ("run_id", "node_id", "workflow_id")
            )
        ):
            raise RuntimeError(SANDBOX_RUNTIME_CONFIG_ERROR)
        return context

    def is_configured(self) -> bool:
        self._console_identity()
        if not self.sandbox_config.get("workflow_id") or not self.sandbox_config.get(
            "uid"
        ):
            return False
        try:
            _load_artifact_upload_url()
        except RuntimeError:
            return False
        return True

    async def upload(
        self, file_name: str, file_bytes: bytes, content_type: str
    ) -> dict[str, Any]:
        artifact_upload_url = _load_artifact_upload_url()
        artifact_upload_token = _load_artifact_upload_token()
        context = self._console_identity()
        form = aiohttp.FormData()
        if context is not None:
            artifact_upload_url = (
                urlsplit(artifact_upload_url)
                ._replace(path="/workflow/artifacts/console-upload")
                .geturl()
            )
            form.add_field("rootId", context["root_id"])
        form.add_field("flowId", str(self.sandbox_config.get("workflow_id") or ""))
        form.add_field(
            "uid",
            context["uid"] if context else str(self.sandbox_config.get("uid") or ""),
        )
        if self.sandbox_config.get("space_id"):
            form.add_field("spaceId", str(self.sandbox_config["space_id"]))
        if self.sandbox_config.get("run_id"):
            form.add_field("runId", str(self.sandbox_config["run_id"]))
        if self.sandbox_config.get("node_id"):
            form.add_field("nodeId", str(self.sandbox_config["node_id"]))
        form.add_field("source", "code_sandbox")
        form.add_field(
            "file", file_bytes, filename=file_name, content_type=content_type
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
