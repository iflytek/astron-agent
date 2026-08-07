import asyncio
import json
import os
from typing import Any

import httpx
from common.utils.hmac_auth import HMACAuth
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum
from workflow.extensions.fastapi.base import (
    AUTH_OPEN_API_PATHS,
    CHAT_OPEN_API_PATHS,
    JSONResponseBase,
)
from workflow.extensions.middleware.getters import get_cache_service
from workflow.extensions.otlp.trace.span import Span


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
        self.api_key = os.getenv("APP_MANAGE_PLAT_KEY", "")
        self.api_secret = os.getenv("APP_MANAGE_PLAT_SECRET", "")

    async def dispatch(self, request: Request, call_next: Any) -> Any:
        """
        Dispatch the request, if the path is in the exclude paths, skip the authentication,
        if the x-consumer-username header is present, skip the authentication,
        otherwise, get the authentication header, and get the app source detail with api key,
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

        # Get the authentication header
        x_consumer_username = request.headers.get("x-consumer-username")
        if x_consumer_username:
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

            # Add the authentication information to the request state
            headers = list(request.scope["headers"])
            headers.append((b"x-consumer-username", x_consumer_username.encode()))
            request.scope["headers"] = headers

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

        return HMACAuth.build_auth_header(
            request_url=url,
            api_key=self.api_key,
            api_secret=self.api_secret,
        )

    async def _get_app_source_detail_with_api_key(
        self, authorization: str, span: Span
    ) -> str:
        """
        Get the app source detail with api key

        :param authorization: The authorization header
        :param span: The span object
        :return: The app source detail
        """

        url = f"{os.getenv('APP_MANAGE_PLAT_BASE_URL')}/v2/app/key/api_key"

        api_key = authorization.split(" ")[1].split(":")[0]
        if not api_key:
            raise CustomException(
                CodeEnum.PARAM_ERROR,
                err_msg="authorization header is invalid",
            )

        app_id = await asyncio.to_thread(self._get_app_id_with_cache, api_key)
        if app_id:
            return app_id

        url = f"{url}/{api_key}"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=self._gen_app_auth_header(url))
        await span.add_info_event_async(
            f"Application management platform response: {resp.text}"
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
        await asyncio.to_thread(self._set_app_id_with_cache, api_key, app_id)
        return app_id

    def _get_app_id_with_cache(self, api_key: str) -> str:
        """
        Get the app id with cache

        :param api_key: The api key
        :return: The app id
        """
        cache_service = get_cache_service()
        app_id: str = cache_service[f"workflow:app:api_key:{api_key}"]
        return app_id

    def _set_app_id_with_cache(self, api_key: str, app_id: str) -> None:
        """
        Set the app id with cache

        :param api_key: The api key
        :param app_id: The app id
        """
        cache_service = get_cache_service()
        cache_service[f"workflow:app:api_key:{api_key}"] = app_id
