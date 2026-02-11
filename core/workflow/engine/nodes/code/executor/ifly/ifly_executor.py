import asyncio
import json
from typing import Any

import httpx

from workflow.configs import workflow_config
from workflow.engine.nodes.code.executor.base_executor import BaseExecutor
from workflow.exception.e import CustomException, CustomExceptionCD
from workflow.exception.errors.err_code import CodeEnum
from workflow.exception.errors.third_api_code import ThirdApiCodeEnum
from workflow.extensions.fastapi.lifespan.http_client import HttpClient
from workflow.extensions.otlp.trace.span import Span

# Maximum number of retry attempts for failed requests
MAX_RETRY_TIMES = 5


class IFlyExecutor(BaseExecutor):
    """
    Code executor using IFly remote execution service.

    Executes Python code on remote IFly infrastructure with automatic retry
    logic and error handling for network-related issues.
    """

    async def execute(
        self, language: str, code: str, timeout: int, span: Span, **kwargs: Any
    ) -> str:
        """
        Execute code using IFly remote execution service with retry logic.

        :param language: Programming language (currently only python supported)
        :param code: Code string to execute
        :param timeout: Maximum execution time in seconds
        :param span: Tracing span for logging
        :param kwargs: Additional execution parameters (app_id, uid)
        :return: Execution result as string
        :raises CustomException: If execution fails or service is unavailable
        """

        # Prepare request parameters
        params: dict[str, Any] = {
            "appid": kwargs.get("app_id", ""),
            "uid": kwargs.get("uid", ""),
        }
        body: dict[str, Any] = {
            "code": code,
            "timeout_sec": timeout,
        }
        headers: dict[str, str] = {}
        if (
            workflow_config.code_executor_config.api_key
            and workflow_config.code_executor_config.api_secret
        ):
            headers["Authorization"] = (
                f"Bearer {workflow_config.code_executor_config.api_key}:"
                f"{workflow_config.code_executor_config.api_secret}"
            )

        await span.add_info_events_async(
            {"request_body": json.dumps(body, ensure_ascii=False)}
        )

        try:
            return await self._execute_with_retry(
                workflow_config.code_executor_config.url, body, params, headers, span
            )
        except Exception as err:
            if isinstance(err, (CustomExceptionCD, CustomException)):
                raise err
            else:
                raise CustomException(
                    err_code=CodeEnum.CODE_EXECUTION_ERROR, cause_error=err
                ) from err

    async def _execute_with_retry(
        self, url: str, body: dict, params: dict, headers: dict, span: Span
    ) -> str:
        """
        Execute request with retry logic.

        :param url: Service endpoint URL
        :param body: Request body
        :param params: Query parameters
        :param headers: Request headers
        :param span: Tracing span for logging
        :return: Execution result as string
        """
        for _ in range(MAX_RETRY_TIMES):
            status, resp_json = await self._do_request(url, body, params, headers, span)

            if status == httpx.codes.OK:
                await span.add_info_events_async(
                    {"code execute result": json.dumps(resp_json, ensure_ascii=False)}
                )
                runner_result = resp_json.get("data", {}).get("stdout", "")
                if isinstance(runner_result, str) and runner_result.endswith("\n"):
                    runner_result = runner_result[:-1]
                return runner_result

            if status == httpx.codes.INTERNAL_SERVER_ERROR:
                resp_code = resp_json.get("code", 0)
                # Pod is not ready yet, retry after delay
                if resp_code == ThirdApiCodeEnum.CODE_EXECUTE_POD_NOT_READY_ERROR.code:
                    await asyncio.sleep(1)
                    continue
                self._handle_error_response(resp_json, span)

            raise CustomExceptionCD(
                err_code=CodeEnum.CODE_REQUEST_ERROR.code,
                err_msg=json.dumps(resp_json, ensure_ascii=False),
            )

        raise CustomException(
            err_code=CodeEnum.CODE_REQUEST_ERROR,
            err_msg="Retry attempts exceeded 5 times",
            cause_error="Retry attempts exceeded 5 times",
        )

    def _handle_error_response(self, resp_json: dict, span: Span) -> None:
        """
        Handle error response and raise appropriate exception.

        :param resp_json: Response json dictionary
        :param span: Tracing span for logging
        :raises CustomExceptionCD: Based on error type
        """
        stderr = resp_json.get("data", {}).get("stderr", "")
        resp_message = resp_json.get("message", "")
        span.add_error_event(f"stderr: {stderr}")
        span.add_error_event(f"response message: {resp_message}")

        err_code = (
            CodeEnum.CODE_EXECUTION_TIMEOUT_ERROR.code
            if resp_message.startswith(
                "exec code error::context deadline exceeded::signal: killed"
            )
            else CodeEnum.CODE_EXECUTION_ERROR.code
        )
        raise CustomExceptionCD(
            err_code=err_code,
            err_msg=self._remove_traceback_stdin_line(stderr),
        )

    async def _do_request(
        self,
        url: str,
        body: dict,
        params: dict,
        headers: dict,
        span: Span,
    ) -> tuple[int, dict]:
        """
        Make HTTP request to IFly code execution service.

        :param url: Service endpoint URL
        :param body: Request body containing code and timeout
        :param params: Query parameters (app_id, uid)
        :param headers: Request headers
        :param span: Tracing span for logging
        :return: Tuple of (status_code, resp_json)
        :raises CustomExceptionCD: If request fails with non-retryable error
        """
        try:
            session = HttpClient.get_session()
            async with session.post(
                url, json=body, params=params, headers=headers
            ) as resp:
                resp_text = await resp.text()
                resp_json = json.loads(resp_text)
                if resp.status in (
                    httpx.codes.OK,
                    httpx.codes.INTERNAL_SERVER_ERROR,
                    httpx.codes.SERVICE_UNAVAILABLE,
                ):
                    return resp.status, resp_json
                else:
                    span.add_error_event(f"{resp_text}")
                    raise CustomExceptionCD(
                        err_code=CodeEnum.CODE_REQUEST_ERROR.code,
                        err_msg=resp_text,
                    )
        except Exception as err:
            raise CustomExceptionCD(
                err_code=CodeEnum.CODE_REQUEST_ERROR.code,
                err_msg=str(err),
            ) from err

    def _remove_traceback_stdin_line(self, traceback_str: str) -> str:
        """
        Remove the first occurrence of stdin traceback line from error message.

        Removes lines like 'File "<stdin>", line 15, in <module>\n' from traceback
        strings to provide cleaner error messages to users.

        :param traceback_str: String containing traceback information
        :return: String with the specified traceback line removed
        """
        if "Traceback" in traceback_str:
            start_index = traceback_str.find('File "<stdin>", line')
            if start_index != -1:
                end_index = traceback_str.find("in <module>", start_index)
                if end_index != -1:
                    traceback_str = (
                        traceback_str[:start_index]
                        + traceback_str[end_index + len("in <module>") + 1 :]
                    )
        return traceback_str
