"""HTTP request processing module for tool execution.

This module provides HTTP request execution functionality with various
authentication methods and security validations.
"""

import json
import re
from typing import Any, Dict, Optional, Tuple
from urllib.parse import quote

import aiohttp
from plugin.link.exceptions.sparklink_exceptions import CallThirdApiException
from plugin.link.infra.tool_exector.http_auth import (
    assemble_ws_auth_url,
    public_query_url,
)
from plugin.link.infra.tool_exector.ssrf_guard import (
    OutboundPolicy,
    OutboundPolicyError,
    create_socket_factory,
    ensure_same_origin,
)
from plugin.link.utils.errors.code import ErrCode

_PATH_PARAMETER_PATTERN = re.compile(r"\{([^{}]+)\}")


class HttpRun:
    """HTTP request executor with authentication and security validation.

    Handles various authentication methods including MD5 and HMAC,
    validates against blacklists, and executes HTTP requests safely.

    Instance Attributes Organization:

    Request Configuration:
        - server: Target server URL
        - method: HTTP method (GET, POST, etc.)
        - path: Request path components
        - query: Query parameters dictionary
        - header: HTTP headers dictionary
        - body: Request body data

    Authentication State:
        - _is_authorization_md5: Boolean flag for MD5 auth detection
        - _is_auth_hmac: Boolean flag for HMAC auth detection
        - auth_con_js: HMAC authentication configuration object

    Security Validation:
        - _is_official: Informational flag used only for response classification
        - _outbound_policy: Connection-bound destination policy

    All attributes serve specific roles in HTTP request processing,
    authentication handling, and security validation workflows.
    """

    def __init__(
        self,
        server: str,
        method: str,
        path: Dict[str, str],
        query: Optional[Dict[str, str]],
        header: Optional[Dict[str, str]],
        body: Optional[Dict[str, Any]],
        open_api_schema: Optional[Dict[str, Any]] = None,
    ) -> None:
        self.server = server
        self.method = method
        self.path = path
        self.query = query
        self.header = header
        self.body = body
        try:
            self._is_authorization_md5 = HttpRun.is_authorization_md5(open_api_schema)
        except Exception:
            self._is_authorization_md5 = False
        try:
            self._is_auth_hmac, self.auth_con_js = HttpRun.is_authorization_hmac(
                self.header
            )
        except Exception:
            self._is_auth_hmac = False
            self.auth_con_js = object
        try:
            self._is_official = HttpRun.is_official(open_api_schema)
        except Exception:
            self._is_official = False
        # Invalid security configuration must fail closed instead of silently disabling checks.
        self._outbound_policy = OutboundPolicy.from_environment()

    def _validate_destination(self, url: str) -> None:
        """Validate the final URL before constructing an outbound connection.

        Raises:
            CallThirdApiException: When the destination violates egress policy
        """
        try:
            self._outbound_policy.validate_url(url)
        except OutboundPolicyError as exc:
            raise CallThirdApiException(
                code=ErrCode.SERVER_VALIDATE_ERR.code,
                err_pre=ErrCode.SERVER_VALIDATE_ERR.msg,
                err=str(exc),
            ) from exc

    def _build_url(self) -> str:
        """Build request URL with authentication and query parameters.

        Returns:
            str: Complete URL for the request
        """
        url = self.server

        # Substitute OpenAPI path parameters as individual path segments. urljoin is unsafe here:
        # an absolute value, a scheme-relative value, or a dot segment can replace/escape the
        # persisted endpoint path.
        for name, value in self.path.items():
            placeholder = "{" + str(name) + "}"
            if placeholder not in url:
                raise OutboundPolicyError(
                    f"Tool path parameter has no matching placeholder: {name}"
                )
            raw_value = str(value)
            if (
                raw_value in {".", ".."}
                or "/" in raw_value
                or "\\" in raw_value
                or any(ord(character) < 0x20 for character in raw_value)
            ):
                raise OutboundPolicyError("Tool path parameter is unsafe")
            url = url.replace(placeholder, quote(raw_value, safe=""))

        if _PATH_PARAMETER_PATTERN.search(url):
            raise OutboundPolicyError("Tool URL has unresolved path parameters")

        # Authentication method selection and URL construction
        if self._is_authorization_md5:
            url = public_query_url(url)
            if self.query:
                url = url + "&" + "&".join([f"{k}={v}" for k, v in self.query.items()])
        elif self._is_auth_hmac:
            url, headers = assemble_ws_auth_url(
                url, self.method, self.auth_con_js, self.body
            )
            self.header = headers
        else:
            if self.query:
                url = url + "?" + "&".join([f"{k}={v}" for k, v in self.query.items()])

        # Authentication helpers may add query data, but must not replace the endpoint origin.
        ensure_same_origin(self.server, url)
        return url

    def _get_error_codes(self) -> Tuple[int, str]:
        """Get appropriate error codes based on API type.

        Returns:
            tuple: (error_code, error_message_prefix)
        """
        if self._is_official:
            return (
                ErrCode.OFFICIAL_API_REQUEST_FAILED_ERR.code,
                ErrCode.OFFICIAL_API_REQUEST_FAILED_ERR.msg,
            )
        return (
            ErrCode.THIRD_API_REQUEST_FAILED_ERR.code,
            ErrCode.THIRD_API_REQUEST_FAILED_ERR.msg,
        )

    async def _execute_request(self, url: str, span_context: Any) -> Tuple[str, int]:
        """Execute the HTTP request.

        Args:
            url: Request URL
            span_context: Tracing span context

        Returns:
            tuple: (response_text, status_code)
        """
        try:
            if self.header:
                self.header.pop("@type")
        except Exception:
            pass

        if not self._is_authorization_md5 and not self._is_auth_hmac:
            # Preserve percent escapes introduced by safe path-parameter substitution.
            encoded_url = quote(url, safe="/:?=&%")
            span_context.add_info_event(f"raw_url: {url}, encoded_url: {encoded_url}")
            url = encoded_url

        span_context.add_info_event(
            f"url: {url}, header: {self.header}, " f"body: {self.body}"
        )

        kwargs: Dict[str, Any] = {
            "headers": self.header if self.header else None,
            "json": self.body if self.body else None,
        }

        self._validate_destination(url)
        socket_factory = create_socket_factory(
            self._outbound_policy,
            url,
        )
        connector = aiohttp.TCPConnector(
            use_dns_cache=False,
            socket_factory=socket_factory,
        )
        async with aiohttp.ClientSession(
            connector=connector,
            trust_env=False,
        ) as session:
            async with session.request(
                self.method, url, allow_redirects=False, **kwargs
            ) as response:
                response_text = await response.text()
                status_code = response.status

        span_context.add_info_event(f"{status_code}")
        span_context.add_info_event(f"{response_text}")

        return response_text, status_code

    async def do_call(self, span: Any) -> str:
        """Execute the HTTP request with proper authentication and validation.

        Args:
            span: Tracing span for request monitoring

        Returns:
            str: Response text from the HTTP request

        Raises:
            CallThirdApiException: When request fails or server is blacklisted
        """
        try:
            url = self._build_url()
        except OutboundPolicyError as err:
            raise CallThirdApiException(
                code=ErrCode.SERVER_VALIDATE_ERR.code,
                err_pre=ErrCode.SERVER_VALIDATE_ERR.msg,
                err=str(err),
            ) from err
        self._validate_destination(url)

        with span.start(func_name="http_run") as span_context:
            try:
                third_result, status_code = await self._execute_request(
                    url, span_context
                )
            except CallThirdApiException:
                raise
            except OutboundPolicyError as err:
                span.add_error_event(str(err))
                raise CallThirdApiException(
                    code=ErrCode.SERVER_VALIDATE_ERR.code,
                    err_pre=ErrCode.SERVER_VALIDATE_ERR.msg,
                    err=str(err),
                ) from err
            except Exception as err:
                span.add_error_event(str(err))
                code_return, err_pre_return = self._get_error_codes()
                raise CallThirdApiException(
                    code=code_return, err_pre=err_pre_return, err=str(err)
                ) from err

        if status_code != 200:
            err_reason = (
                f"Request error code: {status_code}, error message {third_result}"
            )
            code_return, err_pre_return = self._get_error_codes()
            raise CallThirdApiException(
                code=code_return, err_pre=err_pre_return, err=err_reason
            )

        return third_result

    @staticmethod
    def is_authorization_md5(open_api_schema: Optional[Dict[str, Any]]) -> bool:
        """Check if the API uses MD5 authorization.

        Args:
            open_api_schema: OpenAPI schema definition

        Returns:
            bool: True if MD5 authorization is used
        """
        if open_api_schema:
            paths = open_api_schema.get("paths", {})
            for _, get_dict in paths.items():
                parameters = get_dict["get"]["parameters"]
                for para in parameters:
                    if (
                        para["in"] == "header"
                        and para["name"] == "Authorization"
                        and para["schema"]["default"] == "MD5"
                    ):
                        return True
        return False

    @staticmethod
    def is_authorization_hmac(header: Optional[Dict[str, str]]) -> Tuple[bool, Any]:
        """Check if the request uses HMAC authorization.

        Args:
            header: Request headers dictionary

        Returns:
            tuple: (is_hmac, auth_config) - boolean and config object
        """
        if header:
            authorization = header.get("Authorization")
            if authorization and len(authorization) != 0:
                try:
                    ix = authorization.index(":")
                    auth_prefix = authorization[:ix]
                    if auth_prefix == "HMAC":
                        auth_con = authorization[ix + 1 :].strip()
                        try:
                            auth_con_js = json.loads(auth_con)
                            return True, auth_con_js
                        except json.JSONDecodeError:
                            # Handle malformed JSON gracefully
                            return False, object
                except ValueError:
                    # Handle missing colon gracefully
                    return False, object

        return False, object

    @staticmethod
    def is_official(open_api_schema: Optional[Dict[str, Any]]) -> bool:
        """Check if the API is marked as official.

        Args:
            open_api_schema: OpenAPI schema definition

        Returns:
            bool: True if API is official
        """
        if open_api_schema:
            info = open_api_schema.get("info", {})
            if info.get("x-is-official"):
                return True

        return False
