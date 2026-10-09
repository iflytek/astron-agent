import hashlib
import hmac
import json
import re
import secrets
import time
from dataclasses import dataclass
from typing import Annotated, Any

import jwt
from fastapi import Depends, Header, Request, status
from jwt import InvalidTokenError

from agent_runtime.errors import RuntimeApiError
from agent_runtime.settings import Settings, get_settings

GATEWAY_TIMESTAMP_HEADER = "X-Workflow-Gateway-Timestamp"
GATEWAY_SIGNATURE_HEADER = "X-Workflow-Gateway-Signature"
CONSUMER_HEADER = "X-Consumer-Username"

_PUBLIC_PATHS = (
    ("POST", re.compile(r"/openapi/v1/agents/[^/]+/runs")),
    ("GET", re.compile(r"/openapi/v1/runs/[^/]+")),
    ("GET", re.compile(r"/openapi/v1/runs/[^/]+/events")),
    ("POST", re.compile(r"/openapi/v1/runs/[^/]+/(resume|cancel)")),
    ("POST", re.compile(r"/openapi/v1/approvals/[^/]+/decision")),
)


@dataclass(frozen=True)
class ApplicationIdentity:
    app_id: str


@dataclass(frozen=True)
class DelegatedIdentity:
    issuer: str
    subject: str
    app_id: str
    space_id: str
    scopes: frozenset[str]
    token_id: str
    claims: dict[str, Any]


def _is_public_path(method: str, path: str) -> bool:
    return any(
        expected_method == method and pattern.fullmatch(path)
        for expected_method, pattern in _PUBLIC_PATHS
    )


def require_application_identity(
    request: Request,
    x_consumer_username: Annotated[str | None, Header()] = None,
    x_workflow_gateway_timestamp: Annotated[str | None, Header()] = None,
    x_workflow_gateway_signature: Annotated[str | None, Header()] = None,
    settings: Settings = Depends(get_settings),
) -> ApplicationIdentity:
    method = request.method.upper()
    path = request.url.path
    secret = settings.gateway_secret()
    if not _is_public_path(method, path) or not secret or len(secret) < 32:
        raise RuntimeApiError(
            status.HTTP_401_UNAUTHORIZED, "AUTH_INVALID", "Invalid application identity"
        )
    if (
        not x_consumer_username
        or not x_workflow_gateway_timestamp
        or not x_workflow_gateway_signature
    ):
        raise RuntimeApiError(
            status.HTTP_401_UNAUTHORIZED, "AUTH_INVALID", "Missing application identity"
        )
    try:
        issued_at = int(x_workflow_gateway_timestamp)
    except ValueError as exc:
        raise RuntimeApiError(
            status.HTTP_401_UNAUTHORIZED, "AUTH_INVALID", "Invalid application identity"
        ) from exc
    if abs(int(time.time()) - issued_at) > settings.gateway_signature_max_age_seconds:
        raise RuntimeApiError(
            status.HTTP_401_UNAUTHORIZED, "AUTH_INVALID", "Expired application identity"
        )
    payload = f"{method}\n{path}\n{x_consumer_username}\n{issued_at}".encode()
    expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    if not secrets.compare_digest(x_workflow_gateway_signature, expected):
        raise RuntimeApiError(
            status.HTTP_401_UNAUTHORIZED, "AUTH_INVALID", "Invalid application identity"
        )
    return ApplicationIdentity(app_id=x_consumer_username)


class DelegationVerifier:
    def __init__(self, settings: Settings) -> None:
        self._audience = settings.delegation_audience
        try:
            config = json.loads(settings.delegation_issuers_json)
        except json.JSONDecodeError as exc:
            raise RuntimeError("RUNTIME_DELEGATION_ISSUERS_JSON is invalid") from exc
        if not isinstance(config, dict):
            raise RuntimeError("RUNTIME_DELEGATION_ISSUERS_JSON must be an object")
        self._issuers: dict[str, dict[str, Any]] = config

    def verify(
        self,
        token: str,
        *,
        app_id: str,
        space_id: str,
        required_scope: str,
    ) -> DelegatedIdentity:
        try:
            unverified = jwt.decode(
                token,
                options={"verify_signature": False, "verify_exp": False},
            )
            issuer = str(unverified.get("iss", ""))
            issuer_config = self._issuers.get(issuer)
            if not issuer_config:
                raise InvalidTokenError("unknown issuer")
            algorithms = issuer_config.get("algorithms") or []
            keys = issuer_config.get("keys") or {}
            if (
                not isinstance(algorithms, list)
                or not algorithms
                or not isinstance(keys, dict)
            ):
                raise InvalidTokenError("invalid issuer configuration")
            header = jwt.get_unverified_header(token)
            key_id = header.get("kid")
            if key_id is None and len(keys) == 1:
                key_id = next(iter(keys))
            key = keys.get(key_id)
            if not isinstance(key, str) or not key:
                raise InvalidTokenError("unknown signing key")
            claims = jwt.decode(
                token,
                key,
                algorithms=[str(item) for item in algorithms],
                audience=self._audience,
                issuer=issuer,
                options={
                    "require": [
                        "iss",
                        "aud",
                        "sub",
                        "app_id",
                        "space_id",
                        "scope",
                        "iat",
                        "exp",
                        "jti",
                    ]
                },
            )
        except (InvalidTokenError, TypeError, ValueError) as exc:
            raise RuntimeApiError(
                status.HTTP_401_UNAUTHORIZED,
                "DELEGATION_TOKEN_INVALID",
                "Invalid end-user delegation token",
            ) from exc

        if not secrets.compare_digest(
            str(claims.get("app_id", "")), app_id
        ) or not secrets.compare_digest(str(claims.get("space_id", "")), space_id):
            raise RuntimeApiError(
                status.HTTP_403_FORBIDDEN,
                "AGENT_NOT_AUTHORIZED",
                "Delegation token is not valid for this application and space",
            )
        raw_scope = claims.get("scope")
        scopes = (
            {item for item in raw_scope.split(" ") if item}
            if isinstance(raw_scope, str)
            else (
                {str(item) for item in raw_scope}
                if isinstance(raw_scope, list)
                else set()
            )
        )
        if required_scope not in scopes and "agent:*" not in scopes:
            raise RuntimeApiError(
                status.HTTP_403_FORBIDDEN,
                "AGENT_NOT_AUTHORIZED",
                f"Missing delegated scope: {required_scope}",
            )
        return DelegatedIdentity(
            issuer=str(claims["iss"]),
            subject=str(claims["sub"]),
            app_id=str(claims["app_id"]),
            space_id=str(claims["space_id"]),
            scopes=frozenset(scopes),
            token_id=str(claims["jti"]),
            claims=dict(claims),
        )


def require_delegation(
    token: str | None,
    *,
    app_id: str,
    space_id: str,
    required_scope: str,
    settings: Settings,
) -> DelegatedIdentity:
    if not token:
        raise RuntimeApiError(
            status.HTTP_401_UNAUTHORIZED,
            "DELEGATION_TOKEN_INVALID",
            "X-End-User-Token is required",
        )
    return DelegationVerifier(settings).verify(
        token,
        app_id=app_id,
        space_id=space_id,
        required_scope=required_scope,
    )


def require_internal_key(
    x_runtime_internal_key: Annotated[str | None, Header()] = None,
    settings: Settings = Depends(get_settings),
) -> None:
    expected = settings.management_key()
    if (
        not expected
        or len(expected) < 32
        or not x_runtime_internal_key
        or not secrets.compare_digest(expected, x_runtime_internal_key)
    ):
        raise RuntimeApiError(
            status.HTTP_401_UNAUTHORIZED,
            "AUTH_INVALID",
            "Invalid runtime internal credentials",
        )
