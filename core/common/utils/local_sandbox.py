"""Internal client shared by the Agent and workflow Docker executors."""

import base64
import binascii
import os
from dataclasses import dataclass
from typing import Any

import aiohttp


class LocalSandboxError(RuntimeError):
    def __init__(self, message: str, status: int = 0) -> None:
        super().__init__(message)
        self.status = status


@dataclass(frozen=True)
class LocalSandboxPolicy:
    scope: str
    resource_id: str
    timeout: int

    def directory(self, kind: str) -> str:
        return f"/workspace/{kind}s/{self.scope}/{self.resource_id}"

    @classmethod
    def from_response(cls, data: dict[str, Any], kind: str) -> "LocalSandboxPolicy":
        scope = data.get("sandboxScope")
        resource_id = data.get("sandboxResourceId")
        timeout = data.get("timeoutSeconds")
        if (
            data.get("provider") != "docker"
            or not isinstance(scope, str)
            or not scope
            or not isinstance(resource_id, str)
            or not resource_id
            or type(timeout) is not int
            or not 1 <= timeout <= 600
            or data.get("allowInternetAccess") is not False
        ):
            raise LocalSandboxError("Invalid local sandbox policy")
        policy = cls(scope, resource_id, timeout)
        if data.get("sandboxDirectory") != policy.directory(kind):
            raise LocalSandboxError("Invalid local sandbox directory")
        return policy


class LocalSandbox:
    def __init__(self, kind: str, policy: LocalSandboxPolicy, token: str) -> None:
        self.kind = kind
        self.policy = policy
        self.token = token
        self.url = os.getenv("LOCAL_SANDBOX_URL", "").rstrip("/")

    async def request(self, operation: str, **params: Any) -> dict[str, Any]:
        if not self.url:
            raise LocalSandboxError("Local sandbox is unavailable")
        body = {
            "operation": operation,
            "kind": self.kind,
            "scope": self.policy.scope,
            "resourceId": self.policy.resource_id,
            **params,
        }
        try:
            timeout = aiohttp.ClientTimeout(
                total=(params.get("timeout") or self.policy.timeout) + 105,
                connect=5,
            )
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(
                    self.url + "/v1/sandbox",
                    headers={"X-Skill-Sandbox-Runtime-Credential-Token": self.token},
                    json=body,
                    allow_redirects=False,
                ) as response:
                    if response.status != 200:
                        message = {
                            404: "Sandbox file not found",
                            410: "Sandbox resource was deleted",
                            409: "Sandbox file already exists. Use edit to modify it.",
                            413: "Sandbox file exceeds the size limit",
                            503: "Local sandbox is busy or unavailable",
                        }.get(response.status, "Local sandbox request failed")
                        raise LocalSandboxError(message, response.status)
                    result = await response.json()
            if not isinstance(result, dict):
                raise ValueError
            return result
        except (aiohttp.ClientError, TimeoutError, ValueError) as exc:
            raise LocalSandboxError("Local sandbox is unavailable") from exc


def sandbox_file(path: str, content: bytes) -> dict[str, str]:
    return {"path": path, "content": base64.b64encode(content).decode("ascii")}


def sandbox_bytes(item: dict[str, Any]) -> bytes:
    try:
        return base64.b64decode(item["content"], validate=True)
    except (KeyError, TypeError, ValueError, binascii.Error) as exc:
        raise LocalSandboxError("Invalid sandbox file data") from exc
