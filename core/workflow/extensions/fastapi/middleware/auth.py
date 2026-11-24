import hashlib
import hmac
import json
import os
import secrets
import time
from typing import Annotated, Any

import httpx
from common.utils.hmac_auth import HMACAuth
from fastapi import HTTPException, Request, Security, status
from fastapi.security import APIKeyHeader
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum
from workflow.extensions.fastapi.base import (
    AUTH_OPEN_API_PATHS,
    CHAT_OPEN_API_PATHS,
    JSONResponseBase,
)
from workflow.extensions.otlp.trace.span import Span
from workflow.utils.credentials import (
    MAX_CREDENTIAL_FILE_BYTES,
    TENANT_INTERNAL_API_KEY_HEADER,
    credential_from_env_or_file,
)

WORKFLOW_INTERNAL_API_KEY_ENV = "WORKFLOW_INTERNAL_API_KEY"
WORKFLOW_INTERNAL_API_KEY_FILE_ENV = "WORKFLOW_INTERNAL_API_KEY_FILE"
WORKFLOW_INTERNAL_API_KEY_HEADER = "X-Workflow-Internal-Key"
WORKFLOW_INTERNAL_API_KEY_PLACEHOLDER = "CHANGE_ME_WORKFLOW_INTERNAL_API_KEY"
WORKFLOW_INTERNAL_API_KEY_MIN_LENGTH = 32
WORKFLOW_INTERNAL_API_KEY_MAX_FILE_BYTES = MAX_CREDENTIAL_FILE_BYTES
WORKFLOW_GATEWAY_TIMESTAMP_HEADER = "X-Workflow-Gateway-Timestamp"
WORKFLOW_GATEWAY_SIGNATURE_HEADER = "X-Workflow-Gateway-Signature"
WORKFLOW_GATEWAY_SIGNATURE_MAX_AGE_SECONDS = 60
APP_MANAGE_CREDENTIAL_MIN_LENGTH = 32
APP_MANAGE_CREDENTIAL_MAX_LENGTH = 50
PUBLISHED_LEGACY_TENANT_API_KEY = "7b709739e8da44536127a333c7603a83"
PUBLISHED_LEGACY_TENANT_API_SECRET = "NjhmY2NmM2NkZDE4MDFlNmM5ZjcyZjMy"

_workflow_internal_api_key_header = APIKeyHeader(
    name=WORKFLOW_INTERNAL_API_KEY_HEADER,
    auto_error=False,
)


def _replace_trusted_identity_headers(request: Request, app_id: str) -> None:
    """Expose one verified identity downstream and discard the internal secret."""
    excluded_headers = {
        b"x-consumer-username",
        WORKFLOW_INTERNAL_API_KEY_HEADER.lower().encode("ascii"),
        WORKFLOW_GATEWAY_TIMESTAMP_HEADER.lower().encode("ascii"),
        WORKFLOW_GATEWAY_SIGNATURE_HEADER.lower().encode("ascii"),
    }
    headers = [
        (name, value)
        for name, value in request.scope["headers"]
        if name.lower() not in excluded_headers
    ]
    headers.append((b"x-consumer-username", app_id.encode()))
    # Starlette may already have cached a Headers view backed by this exact list.
    request.scope["headers"][:] = headers


def _valid_gateway_identity_signature(request: Request, app_id: str) -> bool:
    """Validate the short-lived identity assertion returned to a public gateway."""
    if request.url.path not in CHAT_OPEN_API_PATHS:
        return False
    internal_api_key = _optional_workflow_internal_api_key()
    timestamp = request.headers.get(WORKFLOW_GATEWAY_TIMESTAMP_HEADER, "")
    supplied_signature = request.headers.get(WORKFLOW_GATEWAY_SIGNATURE_HEADER, "")
    if not internal_api_key or not timestamp or not supplied_signature:
        return False
    try:
        issued_at = int(timestamp)
    except ValueError:
        return False
    if abs(int(time.time()) - issued_at) > WORKFLOW_GATEWAY_SIGNATURE_MAX_AGE_SECONDS:
        return False
    payload = (
        f"{request.method.upper()}\n{request.url.path}\n{app_id}\n{timestamp}"
    ).encode("utf-8")
    expected_signature = hmac.new(
        internal_api_key.encode("utf-8"), payload, hashlib.sha256
    ).hexdigest()
    return secrets.compare_digest(supplied_signature, expected_signature)


def _optional_workflow_internal_api_key() -> str:
    return credential_from_env_or_file(
        WORKFLOW_INTERNAL_API_KEY_ENV,
        WORKFLOW_INTERNAL_API_KEY_FILE_ENV,
        min_length=WORKFLOW_INTERNAL_API_KEY_MIN_LENGTH,
        placeholders=(WORKFLOW_INTERNAL_API_KEY_PLACEHOLDER,),
    )


def _configured_workflow_internal_api_key() -> str:
    api_key = _optional_workflow_internal_api_key()
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Workflow internal API authentication is not configured",
        )
    return api_key


async def require_workflow_internal_api_key(
    supplied_api_key: Annotated[
        str | None, Security(_workflow_internal_api_key_header)
    ],
) -> None:
    """Authenticate trusted service-to-service workflow debug requests."""
    expected_api_key = _configured_workflow_internal_api_key()
    if not supplied_api_key or not secrets.compare_digest(
        supplied_api_key, expected_api_key
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid workflow internal API credentials",
        )


class AuthMiddleware(BaseHTTPMiddleware):
    """
    Authentication middleware
    """

    def __init__(self, app: ASGIApp):
        """
        Initialize the authentication middleware

        :param app: The ASGI application
        """
        super().__init__(app)
        self.need_auth_paths = CHAT_OPEN_API_PATHS + AUTH_OPEN_API_PATHS
        self.api_key = credential_from_env_or_file(
            "APP_MANAGE_PLAT_KEY",
            "APP_MANAGE_PLAT_KEY_FILE",
            min_length=APP_MANAGE_CREDENTIAL_MIN_LENGTH,
            max_length=APP_MANAGE_CREDENTIAL_MAX_LENGTH,
            placeholders=(PUBLISHED_LEGACY_TENANT_API_KEY,),
        )
        self.api_secret = credential_from_env_or_file(
            "APP_MANAGE_PLAT_SECRET",
            "APP_MANAGE_PLAT_SECRET_FILE",
            min_length=APP_MANAGE_CREDENTIAL_MIN_LENGTH,
            max_length=APP_MANAGE_CREDENTIAL_MAX_LENGTH,
            placeholders=(PUBLISHED_LEGACY_TENANT_API_SECRET,),
        )

    async def dispatch(self, request: Request, call_next: Any) -> Any:
        """
        Dispatch the request, if the path is in the exclude paths, skip the authentication.
        A caller-provided consumer identity is trusted only when accompanied by the
        deployment's internal workflow credential. Otherwise, verify the complete
        bearer key/secret pair with the tenant service and replace any untrusted
        identity header with the verified application ID.
        if the app source detail is not found, return the error response,
        otherwise, add the authentication information to the request state,
        and call the next function.

        :param request: The request object
        :param call_next: The next function to call
        :return: The response object
        """
        # Check if the path is in the exclude paths
        if request.url.path not in self.need_auth_paths:
            return await call_next(request)

        # A consumer identity is authoritative only for authenticated internal peers.
        x_consumer_username = request.headers.get("x-consumer-username")
        supplied_internal_key = request.headers.get(WORKFLOW_INTERNAL_API_KEY_HEADER)
        expected_internal_key = _optional_workflow_internal_api_key()
        trusted_internal_identity = bool(
            x_consumer_username
            and supplied_internal_key
            and expected_internal_key
            and secrets.compare_digest(supplied_internal_key, expected_internal_key)
        )
        trusted_gateway_identity = bool(
            x_consumer_username
            and _valid_gateway_identity_signature(request, x_consumer_username)
        )
        if trusted_internal_identity or trusted_gateway_identity:
            _replace_trusted_identity_headers(request, x_consumer_username)
            return await call_next(request)

        span = Span()
        with span.start() as span_ctx:

            authorization = request.headers.get("authorization")
            if not authorization:
                return JSONResponseBase.generate_error_response(
                    request.url.path, "authorization header is required", span_ctx.sid
                )

            try:
                x_consumer_username = await self._get_app_source_detail_with_api_key(
                    authorization, span_ctx
                )
            except CustomException as e:
                span_ctx.record_exception(e)
                return JSONResponseBase.generate_error_response(
                    request.url.path, e.message, span_ctx.sid, e.code
                )
            except Exception as e:
                span_ctx.record_exception(e)
                return JSONResponseBase.generate_error_response(
                    request.url.path,
                    CodeEnum.APP_GET_WITH_REMOTE_FAILED_ERROR.msg,
                    span_ctx.sid,
                    CodeEnum.APP_GET_WITH_REMOTE_FAILED_ERROR.code,
                )

            # Replace every caller-supplied identity with the verified value. Keeping
            # both headers would let framework header ordering decide which identity
            # downstream code observes.
            _replace_trusted_identity_headers(request, x_consumer_username)

        return await call_next(request)

    def _gen_app_auth_header(self, url: str) -> dict[str, str]:
        """
        Generate authentication headers for the application management platform.

        :param url: The request URL for which to generate authentication headers
        :return: Dictionary containing authentication headers,
                empty dict if credentials are missing
        """

        # Return empty dict if credentials are not configured
        if not self.api_key or not self.api_secret:
            return {}

        headers = HMACAuth.build_auth_header(
            request_url=url,
            api_key=self.api_key,
            api_secret=self.api_secret,
        )
        headers[TENANT_INTERNAL_API_KEY_HEADER] = self.api_secret
        return headers

    async def _get_app_source_detail_with_api_key(
        self, authorization: str, span: Span
    ) -> str:
        """
        Get the app source detail with api key

        :param authorization: The authorization header
        :param span: The span object
        :return: The app source detail
        """

        try:
            scheme, credential = authorization.split(" ", 1)
            api_key, api_secret = credential.strip().split(":", 1)
        except ValueError as exc:
            raise CustomException(
                CodeEnum.PARAM_ERROR,
                err_msg="authorization header is invalid",
            ) from exc
        if scheme.lower() != "bearer" or not api_key or not api_secret:
            raise CustomException(
                CodeEnum.PARAM_ERROR,
                err_msg="authorization header is invalid",
            )

        # Tenant is authoritative on every request so revocation is effective
        # as soon as the updated application or key state is committed.
        base_url = os.getenv("APP_MANAGE_PLAT_BASE_URL", "").rstrip("/")
        url = f"{base_url}/v2/app/key/verify"
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                url,
                json={"api_key": api_key, "api_secret": api_secret},
                headers=self._gen_app_auth_header(url),
            )
        await span.add_info_event_async(
            "Application management platform credential verification completed"
        )
        if resp.status_code != 200:
            raise CustomException(
                CodeEnum.APP_GET_WITH_REMOTE_FAILED_ERROR, cause_error=resp.text
            )
        """
        Response body:
            {
                "sid": "app00d00001@dx18c38bf54957a04802",
                "code": 0,
                "message": "success",
                "data": {
                    "appid": "007d72a3",
                    "name": "11212311313131",
                    "source": "78263c167bab",
                    "desc": "12121"
                }
            }
        """
        code = resp.json().get("code")
        if code != 0:
            raise CustomException(
                CodeEnum.APP_GET_WITH_REMOTE_FAILED_ERROR,
                cause_error=json.dumps(resp.json(), ensure_ascii=False),
            )

        app_id = resp.json().get("data", {}).get("appid")
        if not app_id:
            raise CustomException(
                CodeEnum.APP_GET_WITH_REMOTE_FAILED_ERROR,
                err_msg="appid is null",
                cause_error=json.dumps(resp.json(), ensure_ascii=False),
            )
        return app_id
