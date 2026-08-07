import abc
import asyncio
import json
import os
from typing import Any, Dict, cast

import aiohttp
from common.utils.hmac_auth import HMACAuth
from pydantic import Field

from workflow.consts.runtime_env import RuntimeEnv
from workflow.engine.entities.variable_pool import ParamKey, VariablePool
from workflow.engine.nodes.base_node import BaseNode
from workflow.engine.nodes.entities.node_run_result import NodeRunResult
from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum
from workflow.extensions.fastapi.lifespan.http_client import HttpClient
from workflow.extensions.otlp.log_trace.node_log import NodeLog
from workflow.extensions.otlp.trace.span import Span


class MemoryNode(BaseNode):
    """
    Base class for memory service nodes.
    """

    repo_id: str = Field(...)
    project_id: str = Field(default="")
    app_id: str = Field(...)
    uid: str = Field(max_length=64, pattern=r"^[0-9a-zA-Z]+")  # User identifier

    @property
    @abc.abstractmethod
    def api_path(self) -> str:
        """
        API path for the memory service endpoint.
        :return: API path as a string
        """

    @abc.abstractmethod
    def build_payload(self, uid: str, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Build the request payload for the memory service API.
        :param inputs: Input data for the request
        :return: Payload dictionary
        """

    @abc.abstractmethod
    def parse_response(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse the response data from the memory service API.
        :param raw_data: Raw response data from the API
        :return: Parsed output data
        """

    async def _do_request(self, uid: str, inputs: Dict[str, Any], span: Span) -> dict:
        """
        Make an asynchronous HTTP POST request to the memory service API.
        :param inputs: Input data for the request
        :param app_id: Application ID for authentication
        :param span: Tracing span for logging
        :return: Parsed response data from the memory service
        """
        url = f"{os.getenv('MEMORY_BASE_URL')}{self.api_path}"
        if not os.getenv("RUNTIME_ENV", RuntimeEnv.Local.value) in [
            RuntimeEnv.Dev.value,
            RuntimeEnv.Test.value,
        ]:
            url = HMACAuth.build_auth_request_url(
                request_url=url,
                method="POST",
                api_key=os.getenv("MEMORY_AUTH_KEY", ""),
                api_secret=os.getenv("MEMORY_AUTH_SECRET", ""),
            )

        payload = self.build_payload(uid, inputs)
        await span.add_info_event_async(f"Memory API Request Payload: {payload}")

        headers = {
            "Content-Type": "application/json",
            "x-appid": self.app_id,
        }

        session = HttpClient.get_session()
        async with session.post(url, headers=headers, json=payload) as response:
            if response.status != 200:
                text = await response.text()
                await span.add_info_event_async(
                    f"Memory API HTTP error: {response.status}:{text}"
                )
                raise aiohttp.ClientResponseError(
                    request_info=response.request_info,
                    history=response.history,
                    status=response.status,
                    message=f"HTTP Error: {text}",
                )

            raw_data = cast(dict[str, Any], await response.json())
            await span.add_info_event_async(f"Memory API Response Data: {raw_data}")
            if raw_data.get("code") != 0:
                raise CustomException(
                    CodeEnum.MEMORY_NODE_EXECUTION_ERROR,
                    f"Memory API Exception: {raw_data.get('code')}: {raw_data.get('message')}",
                )
            return raw_data

    async def execute(
        self,
        variable_pool: VariablePool,
        span: Span,
    ) -> NodeRunResult:
        """
        Execute the memory node operation.
        :param variable_pool: Variable pool containing input variables
        :param span: Tracing span for logging
        """
        try:
            inputs, outputs = {}, {}
            for identifier in self.input_identifier:
                inputs[identifier] = variable_pool.get_variable(
                    node_id=self.node_id, key_name=identifier, span=span
                )
            await span.add_info_events_async({"memory_input": f"{inputs}"})
            data = await self._do_request(
                uid=variable_pool.system_params.get(ParamKey.Uid, default=""),
                inputs=inputs,
                span=span,
            )

            outputs = await asyncio.to_thread(self.parse_response, data)
            await span.add_info_events_async(
                {"outputs": json.dumps(outputs, ensure_ascii=False)}
            )

            return self.success(inputs=inputs, outputs=outputs)
        except CustomException as e:
            return self.fail(error=e, inputs=inputs, outputs=outputs, span=span)
        except Exception as e:
            return self.fail(
                error=CustomException(
                    CodeEnum.MEMORY_NODE_EXECUTION_ERROR, cause_error=e
                ),
                inputs=inputs,
                outputs=outputs,
                span=span,
            )

    async def async_execute(
        self,
        variable_pool: VariablePool,
        span: Span,
        event_log_node_trace: NodeLog | None = None,
        **kwargs: Any,
    ) -> NodeRunResult:
        """
        Asynchronously execute the memory node operation with tracing.
        :param variable_pool: Variable pool containing input variables
        :param span: Tracing span for logging
        :param event_log_node_trace: Optional node log for event tracing
        :return: NodeRunResult of the execution
        """
        with span.start(
            func_name="async_execute", add_source_function_name=True
        ) as span_context:
            if event_log_node_trace:
                event_log_node_trace.append_config_data(
                    {
                        "repo_id": self.repo_id,
                        "project_id": self.project_id,
                        "app_id": self.app_id,
                    }
                )
            return await self.execute(
                variable_pool,
                span_context,
            )
