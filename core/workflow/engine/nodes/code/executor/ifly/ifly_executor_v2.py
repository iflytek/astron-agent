import asyncio
import json
from typing import Any

import httpx

from workflow.configs import workflow_config
from workflow.engine.nodes.code.executor.ifly.ifly_executor import IFlyExecutor
from workflow.exception.e import CustomException, CustomExceptionCD
from workflow.exception.errors.err_code import CodeEnum
from workflow.exception.errors.third_api_code import ThirdApiCodeEnum
from workflow.extensions.otlp.trace.span import Span

# Maximum number of retry attempts for failed requests
MAX_RETRY_TIMES = 5
RETRYABLE_ERROR_CODES = {
    ThirdApiCodeEnum.CODE_EXECUTE_LINUXSERRROR.code,
    ThirdApiCodeEnum.CODE_EXECUTE_NOAVAILABLEINSTANCE.code,
}


class IFlyExecutorV2(IFlyExecutor):
    """
    Code executor using IFly V2 remote execution service.

    Executes Python code on remote IFly V2 infrastructure with automatic retry
    logic and error handling for network-related issues.
    """

    async def execute(
        self, language: str, code: str, timeout: int, span: Span, **kwargs: Any
    ) -> str:
        """
        Execute code using IFly V2 remote execution service with retry logic.

        :param language: Programming language (currently only python supported)
        :param code: Code string to execute
        :param timeout: Maximum execution time in seconds
        :param span: Tracing span for logging
        :param kwargs: Additional execution parameters (app_id, uid)
        :return: Execution result as string
        :raises CustomException: If execution fails or service is unavailable
        """

        # Prepare request parameters
        params = {
            "appid": kwargs.get("app_id", ""),
            "uid": kwargs.get("uid", ""),
        }
        body = {
            "code": code,
            "timeout": timeout * 1000,
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
        for _ in range(1, MAX_RETRY_TIMES + 1):
            status, resp_json = await self._do_request(url, body, params, headers, span)

            if status == httpx.codes.OK:
                await span.add_info_events_async(
                    {
                        "code execute v2 result": json.dumps(
                            resp_json, ensure_ascii=False
                        )
                    }
                )
                runner_result = (
                    resp_json.get("data", {}).get("code_resp", {}).get("stdout", "")
                )
                if isinstance(runner_result, str) and runner_result.endswith("\n"):
                    runner_result = runner_result[:-1]
                return runner_result

            resp_code = resp_json.get("code", 0)
            if resp_code in RETRYABLE_ERROR_CODES:
                await asyncio.sleep(1)
                continue

            self._handle_error_response(resp_json, span)

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

        err_type = resp_json.get("type", "")
        resp_message = resp_json.get("message", "")
        span.add_error_event(f"err_type: {err_type}")
        span.add_error_event(f"response message: {resp_message}")

        if err_type == "exec_code_timeout":
            raise CustomExceptionCD(
                err_code=CodeEnum.CODE_EXECUTION_TIMEOUT_ERROR.code,
                err_msg="Code execution timeout",
            )
        elif err_type == "exec_code_failed":
            raise CustomExceptionCD(
                err_code=CodeEnum.CODE_EXECUTION_ERROR.code,
                err_msg=self._remove_traceback_stdin_line(resp_message),
            )
        else:
            raise CustomExceptionCD(
                err_code=CodeEnum.CODE_EXECUTION_ERROR.code,
                err_msg="Code execution failed",
            )

    def _remove_traceback_stdin_line(self, traceback_str: str) -> str:
        """
        Remove traceback line with V2-specific preprocessing.

        Extends parent method by first extracting error message after
        'exec code error:' prefix before removing stdin traceback line.

        :param traceback_str: String containing traceback information
        :return: String with the specified traceback line removed
        """
        # V2-specific: extract message after "exec code error:" prefix
        parts = traceback_str.split("exec code error:")
        if len(parts) > 1:
            traceback_str = parts[1].strip()
        else:
            traceback_str = parts[0].strip()

        # Reuse parent class method for common traceback cleanup
        return super()._remove_traceback_stdin_line(traceback_str)
