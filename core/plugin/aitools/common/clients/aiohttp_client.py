"""
Async HTTP client for AiTools.

This module provides a HTTP client for AiTools.
"""

from contextlib import asynccontextmanager
from typing import Any, AsyncIterator, Optional

import aiohttp
from common.utils.hmac_auth import HMACAuth
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
from plugin.aitools.common.log.logger import log

TOTAL_TIMEOUT = 300
CONNECT_TIMEOUT = 10
READ_TIMEOUT = 60

LIMIT_CONNECTOR = 200
LIMIT_PER_HOST_CONNECTOR = 50
TTL_DNS_CACHE_CONNECTOR = 300
ENABLE_CLEANUP_CLOSED_CONNECTOR = True

TRUST_ENV = True


_aiohttp_session: Optional[aiohttp.ClientSession] = None


async def get_aiohttp_session() -> aiohttp.ClientSession:
    """
    Get or create global aiohttp ClientSession.
    One session per process (worker).
    """
    global _aiohttp_session

    if _aiohttp_session is None or _aiohttp_session.closed:
        timeout = aiohttp.ClientTimeout(
            total=TOTAL_TIMEOUT,  # total request timeout
            connect=CONNECT_TIMEOUT,
            sock_read=READ_TIMEOUT,
        )

        connector = aiohttp.TCPConnector(
            limit=LIMIT_CONNECTOR,  # max total connections
            limit_per_host=LIMIT_PER_HOST_CONNECTOR,  # max per host
            ttl_dns_cache=TTL_DNS_CACHE_CONNECTOR,
            enable_cleanup_closed=ENABLE_CLEANUP_CLOSED_CONNECTOR,
        )

        _aiohttp_session = aiohttp.ClientSession(
            timeout=timeout,
            connector=connector,
            trust_env=TRUST_ENV,  # respect proxy env
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
