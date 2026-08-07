"""
Async HTTP client for AiTools.

This module provides a HTTP client for AiTools.
"""

from contextlib import asynccontextmanager
from typing import Any, AsyncIterator, Optional

import aiohttp
from common.utils.hmac_auth import HMACAuth
from loguru import logger as log
from plugin.aitools.api.schemas.types import (
    BaseResponse,
    ErrorResponse,
    SuccessResponse,
)
from plugin.aitools.common.clients.adapters import (
    InstrumentedClient,
    NoOpSpanAdapter,
    SpanLike,
)
from plugin.aitools.common.clients.hooks import HttpSpanHooks
from plugin.aitools.common.exceptions.error.code_enums import CodeEnums
from plugin.aitools.common.exceptions.exceptions import HTTPClientException
from plugin.aitools.const.const import (
    AIOHTTP_CLIENT_CONNECT_TIMEOUT_KEY,
    AIOHTTP_CLIENT_ENABLE_CLEANUP_CLOSED_CONNECTOR_KEY,
    AIOHTTP_CLIENT_LIMIT_CONNECTOR_KEY,
    AIOHTTP_CLIENT_LIMIT_PER_HOST_CONNECTOR_KEY,
    AIOHTTP_CLIENT_READ_TIMEOUT_KEY,
    AIOHTTP_CLIENT_TOTAL_TIMEOUT_KEY,
    AIOHTTP_CLIENT_TRUST_ENV_KEY,
    AIOHTTP_CLIENT_TTL_DNS_CACHE_CONNECTOR_KEY,
)
from plugin.aitools.utils.env_utils import (
    safe_get_bool_env,
    safe_get_float_env,
    safe_get_int_env,
)

_aiohttp_session: Optional[aiohttp.ClientSession] = None


async def get_aiohttp_session() -> aiohttp.ClientSession:
    """
    Get or create global aiohttp ClientSession.
    One session per process (worker).
    """
    global _aiohttp_session

    if _aiohttp_session is None or _aiohttp_session.closed:
        timeout = aiohttp.ClientTimeout(
            total=safe_get_float_env(
                AIOHTTP_CLIENT_TOTAL_TIMEOUT_KEY, 300.0
            ),  # total request timeout
            connect=safe_get_float_env(
                AIOHTTP_CLIENT_CONNECT_TIMEOUT_KEY, 10.0
            ),  # connection timeout
            sock_read=safe_get_float_env(
                AIOHTTP_CLIENT_READ_TIMEOUT_KEY, 60.0
            ),  # read timeout
        )

        connector = aiohttp.TCPConnector(
            limit=safe_get_int_env(
                AIOHTTP_CLIENT_LIMIT_CONNECTOR_KEY, 200
            ),  # max total connections
            limit_per_host=safe_get_int_env(
                AIOHTTP_CLIENT_LIMIT_PER_HOST_CONNECTOR_KEY, 50
            ),  # max per host
            ttl_dns_cache=safe_get_int_env(
                AIOHTTP_CLIENT_TTL_DNS_CACHE_CONNECTOR_KEY, 300
            ),
            enable_cleanup_closed=safe_get_bool_env(
                AIOHTTP_CLIENT_ENABLE_CLEANUP_CLOSED_CONNECTOR_KEY, True
            ),
        )

        _aiohttp_session = aiohttp.ClientSession(
            timeout=timeout,
            connector=connector,
            trust_env=safe_get_bool_env(
                AIOHTTP_CLIENT_TRUST_ENV_KEY, True
            ),  # respect proxy env
        )

        log.info("aiohttp ClientSession initialized")

    return _aiohttp_session


async def close_aiohttp_session() -> None:
    """
    Close global aiohttp session.
    Should be called on application shutdown.
    """
    global _aiohttp_session

    if _aiohttp_session and not _aiohttp_session.closed:
        await _aiohttp_session.close()
        log.info("aiohttp ClientSession closed")

    _aiohttp_session = None


async def reset_aiohttp_session() -> None:
    """
    Reset the global aiohttp session.
    Closes existing session and creates a new one on next get_aiohttp_session call.
    """
    await close_aiohttp_session()
    await get_aiohttp_session()


class HttpClient(InstrumentedClient):
    """Async http client"""

    span_name = "AIO HTTP Client"
    span_hooks = HttpSpanHooks()

    def __init__(
        self,
        method: str,
        url: str,
        span: Optional[SpanLike] = None,
        **kwargs: Any,
    ) -> None:
        self.method = method
        self.url = url
        self.kwargs = kwargs
        self.parent_span = span or NoOpSpanAdapter()

        self.response: Optional[BaseResponse] = None

    def _auth(self) -> None:
        """Build WebSocket URL"""
        try:
            if "auth" in self.kwargs and self.kwargs["auth"] == "ASE":

                method = self.kwargs.get("method", "GET")
                api_key = self.kwargs.get("api_key", "")
                api_secret = self.kwargs.get("api_secret", "")
                new_url = HMACAuth.build_auth_request_url(
                    self.url, method, api_key, api_secret
                )

                if new_url is None:
                    self.response = ErrorResponse.from_enum(
                        CodeEnums.HTTPClientAuthError, extra_message="ASE 鉴权失败"
                    )
                    raise HTTPClientException.from_error_code(
                        CodeEnums.HTTPClientAuthError, extra_message="ASE 鉴权失败"
                    )

                self.url = new_url
        except Exception:
            raise

    @asynccontextmanager
    async def start(self) -> AsyncIterator["HttpClient"]:
        """Start aiohttp client"""
        yield self

    @asynccontextmanager
    async def request(self) -> AsyncIterator[BaseResponse]:
        """Send async request and return standardized response"""
        try:
            self._auth()
            session = await get_aiohttp_session()

            async with session.request(self.method, self.url, **self.kwargs) as resp:

                if resp.status >= 400:
                    body = await resp.text()
                    self.response = ErrorResponse.from_enum(
                        CodeEnums.HTTPClientError,
                        extra_message=f"status={resp.status}, body={body}",
                    )
                    raise HTTPClientException.from_error_code(
                        CodeEnums.HTTPClientError,
                        extra_message=f"status={resp.status}, body={body}",
                    )

                resp.raise_for_status()
                self.response = await self._build_response(resp)
                yield self.response

        except HTTPClientException as e:
            raise e

        except Exception as e:
            self.response = ErrorResponse.from_enum(
                CodeEnums.HTTPClientError, extra_message=str(e)
            )
            raise HTTPClientException.from_error_code(
                CodeEnums.HTTPClientError, extra_message=str(e)
            )

    async def _build_response(self, resp: aiohttp.ClientResponse) -> BaseResponse:
        """Build standardized response from aiohttp response"""
        try:
            json_data = await resp.json()
            return SuccessResponse(data={"content": json_data})
        except Exception:
            return SuccessResponse(data={"content": resp})
