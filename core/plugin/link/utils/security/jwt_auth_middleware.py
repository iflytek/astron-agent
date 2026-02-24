"""Optional JWT authentication middleware for inbound API requests.

Middleware is disabled by default and can be enabled through environment
variables to preserve backward compatibility.
"""

import asyncio
import os
from typing import Any, Dict, List

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from loguru import logger
from plugin.link.consts import const
from plugin.link.utils.auth.jwt_validator import (
    JwtValidationConfig,
    JwtValidationError,
    validate_jwt_token,
)
from plugin.link.utils.errors.code import ErrCode


def _is_enabled() -> bool:
    """Return True only when JWT_AUTH_ENABLE is explicitly enabled."""
    return os.getenv(const.JWT_AUTH_ENABLE_KEY, "0").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def _parse_csv_env(env_name: str, default_value: str = "") -> List[str]:
    """Parse comma-separated environment variable into cleaned list."""
    raw = os.getenv(env_name, default_value)
    return [item.strip() for item in raw.split(",") if item.strip()]


def _build_validation_config() -> JwtValidationConfig:
    """Build JWT validation config from environment variables."""
    algorithms = tuple(_parse_csv_env(const.JWT_ALGORITHMS_KEY, "RS256") or ["RS256"])
    return JwtValidationConfig(
        issuer=os.getenv(const.JWT_ISSUER_KEY, ""),
        audience=os.getenv(const.JWT_AUDIENCE_KEY, ""),
        algorithms=algorithms,
        jwks_url=os.getenv(const.JWT_JWKS_URL_KEY, ""),
        shared_secret=os.getenv(const.JWT_SHARED_SECRET_KEY, ""),
    )


def _is_excluded_path(path: str, excludes: List[str]) -> bool:
    """Check whether request path should bypass JWT validation."""
    for excluded in excludes:
        if path == excluded or path.startswith(excluded.rstrip("/") + "/"):
            return True
    return False


def _extract_bearer_token(request: Request, header_name: str) -> str:
    """Extract bearer token from configured authorization header."""
    header_value = request.headers.get(header_name, "")
    if not header_value:
        return ""

    if " " not in header_value:
        return ""

    scheme, token = header_value.split(" ", 1)
    if scheme.lower() != "bearer":
        return ""

    return token.strip()


def _unauthorized_response(detail: str) -> JSONResponse:
    """Build standardized unauthorized response body."""
    payload: Dict[str, Any] = {
        "header": {
            "code": ErrCode.JWT_VALIDATE_ERR.code,
            "message": detail,
            "sid": "",
        },
        "payload": {},
    }
    return JSONResponse(status_code=401, content=payload)


def register_jwt_auth_middleware(app: FastAPI) -> None:
    """Register JWT auth middleware when feature switch is enabled."""
    if not _is_enabled():
        return

    excluded_paths = _parse_csv_env(
        const.JWT_AUTH_EXCLUDE_PATHS_KEY,
        "/docs,/redoc,/openapi.json",
    )
    auth_header_name = os.getenv(const.JWT_AUTH_HEADER_KEY, "Authorization")
    validation_config = _build_validation_config()

    @app.middleware("http")
    async def jwt_auth_middleware(request: Request, call_next: Any) -> Any:
        if _is_excluded_path(request.url.path, excluded_paths):
            return await call_next(request)

        token = _extract_bearer_token(request, auth_header_name)
        if not token:
            return _unauthorized_response("Missing or invalid bearer token")

        try:
            request.state.jwt_payload = await asyncio.to_thread(
                validate_jwt_token, token, validation_config
            )
        except JwtValidationError:
            return _unauthorized_response(ErrCode.JWT_VALIDATE_ERR.msg)
        except Exception as exc:
            logger.exception(
                "Unexpected JWT validation exception, path={}, error_type={}",
                request.url.path,
                type(exc).__name__,
            )
            return _unauthorized_response(ErrCode.JWT_VALIDATE_ERR.msg)

        return await call_next(request)
