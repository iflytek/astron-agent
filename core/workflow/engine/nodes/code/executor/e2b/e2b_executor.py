from __future__ import annotations

import json
import mimetypes
import posixpath
from typing import Any

import aiohttp
from loguru import logger

from workflow.engine.nodes.code.executor.base_executor import BaseExecutor
from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum
from workflow.extensions.otlp.trace.span import Span


class E2BExecutor(BaseExecutor):
    async def execute(
        self, language: str, code: str, timeout: int, span: Span, **kwargs: Any
    ) -> str:
        if language != "python":
            raise CustomException(
                err_code=CodeEnum.CODE_EXECUTION_ERROR,
                err_msg=f"Unsupported E2B code language: {language}",
            )
        sandbox_config = kwargs.get("sandbox") or {}
        if not sandbox_config.get("api_key"):
            raise CustomException(
                err_code=CodeEnum.CODE_EXECUTION_ERROR,
                err_msg="E2B sandbox API key is not configured",
            )

        from e2b import AsyncSandbox

        execution_timeout = int(sandbox_config.get("timeout_seconds") or timeout or 10)
        sandbox = await AsyncSandbox.create(
            api_key=sandbox_config["api_key"],
            timeout=execution_timeout,
            allow_internet_access=bool(
                sandbox_config.get("allow_internet_access", False)
            ),
            metadata={
                "workflow_id": str(sandbox_config.get("workflow_id") or ""),
                "node_id": str(sandbox_config.get("node_id") or ""),
            },
        )
        workspace = "/home/user/code"
        main_path = f"{workspace}/main.py"
        try:
            await sandbox.files.write(main_path, code)
            result = await sandbox.commands.run(
                f"python {main_path}",
                cwd=workspace,
                timeout=execution_timeout,
            )
            stdout = str(getattr(result, "stdout", "") or "")
            stderr = str(getattr(result, "stderr", "") or "")
            exit_code = int(getattr(result, "exit_code", 0) or 0)
            await span.add_info_events_async(
                {
                    "e2b_code_execute_result": json.dumps(
                        {
                            "exit_code": exit_code,
                            "stdout": stdout,
                            "stderr": stderr,
                        },
                        ensure_ascii=False,
                    )
                }
            )
            artifacts = await self._collect_artifacts(
                sandbox=sandbox,
                workspace=workspace,
                sandbox_config=sandbox_config,
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
        except CustomException:
            raise
        except Exception as err:
            raise CustomException(
                err_code=CodeEnum.CODE_EXECUTION_ERROR, cause_error=err
            ) from err
        finally:
            await sandbox.kill()

    async def _collect_artifacts(
        self, sandbox: Any, workspace: str, sandbox_config: dict[str, Any]
    ) -> list[dict[str, Any]]:
        if not await sandbox.files.exists(workspace):
            return []
        scan_result = await sandbox.commands.run(
            "find . -maxdepth 5 -type f -printf '%P\\t%s\\n'",
            cwd=workspace,
            timeout=min(max(int(sandbox_config.get("timeout_seconds") or 10), 1), 60),
        )
        if int(getattr(scan_result, "exit_code", 0) or 0) != 0:
            logger.warning(
                "E2B code artifact scan failed: stderr={}",
                getattr(scan_result, "stderr", ""),
            )
            return []

        uploader = CodeArtifactUploader(sandbox_config)
        artifacts: list[dict[str, Any]] = []
        for line in str(getattr(scan_result, "stdout", "") or "").splitlines():
            if "\t" not in line:
                continue
            relative_path, raw_size = line.rsplit("\t", 1)
            if self._should_skip_artifact(relative_path):
                continue
            file_name = posixpath.basename(relative_path)
            file_path = f"{workspace}/{self._safe_path(relative_path)}"
            artifact: dict[str, Any] = {
                "file_name": file_name,
                "file_size": self._safe_int(raw_size),
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
                        "E2B code artifact upload failed: file_name={}, error={}",
                        file_name,
                        exc,
                    )
                    artifact["upload_error"] = str(exc)
            artifacts.append(artifact)
        return artifacts

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

    def _safe_int(self, value: str) -> int:
        try:
            return int(value)
        except ValueError:
            return 0

    def _guess_content_type(self, file_name: str) -> str:
        return mimetypes.guess_type(file_name)[0] or "application/octet-stream"


class CodeArtifactUploader:
    def __init__(self, sandbox_config: dict[str, Any]) -> None:
        self.sandbox_config = sandbox_config

    def is_configured(self) -> bool:
        return bool(
            self.sandbox_config.get("artifact_upload_url")
            and self.sandbox_config.get("workflow_id")
            and self.sandbox_config.get("uid")
        )

    async def upload(
        self, file_name: str, file_bytes: bytes, content_type: str
    ) -> dict[str, Any]:
        form = aiohttp.FormData()
        form.add_field("flowId", str(self.sandbox_config.get("workflow_id") or ""))
        form.add_field("uid", str(self.sandbox_config.get("uid") or ""))
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
        headers = {}
        if self.sandbox_config.get("artifact_upload_token"):
            headers["X-Skill-Sandbox-Artifact-Token"] = str(
                self.sandbox_config["artifact_upload_token"]
            )
        timeout = aiohttp.ClientTimeout(total=60)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(
                str(self.sandbox_config["artifact_upload_url"]),
                data=form,
                headers=headers,
            ) as response:
                response.raise_for_status()
                payload = await response.json(content_type=None)
        data = payload.get("data") if isinstance(payload, dict) else None
        if not isinstance(data, dict):
            return {"artifact_upload_response": payload}
        return data
