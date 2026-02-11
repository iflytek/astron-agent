import json
import os
from typing import Any, Dict

import aiohttp
from aiohttp import ClientTimeout
from pydantic import BaseModel, Field, PrivateAttr

from workflow.engine.entities.private_config import PrivateConfig
from workflow.engine.entities.variable_pool import ParamKey, VariablePool
from workflow.engine.nodes.base_node import BaseNode
from workflow.engine.nodes.entities.node_run_result import (
    NodeRunResult,
    WorkflowNodeExecutionStatus,
)
from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum
from workflow.extensions.otlp.log_trace.node_log import NodeLog
from workflow.extensions.otlp.trace.span import Span


class _StreamResponse(BaseModel):
    """SSE 流式返回的数据"""

    code: int
    message: str
    sid: str = ""
    data: Dict[str, Any] | None = Field(default_factory=dict)


class RPANode(BaseNode):
    _private_config: PrivateConfig = PrivateAttr(
        default_factory=lambda: PrivateConfig(timeout=24 * 60 * 60)
    )
    projectId: str
    header: Dict[str, Any]
    source: str = ""
    version: int | None = None
    rpaParams: Dict[str, Any] = Field(default_factory=dict)

    async def execute(
        self,
        variable_pool: VariablePool,
        span: Span,
        event_log_node_trace: NodeLog | None = None,
    ) -> NodeRunResult:
        try:
            inputs, outputs = {}, {}
            for identifier in self.input_identifier:
                inputs[identifier] = variable_pool.get_variable(
                    node_id=self.node_id, key_name=identifier, span=span
                )
            await span.add_info_events_async({"rpa_input": f"{inputs}"})
            status = WorkflowNodeExecutionStatus.SUCCEEDED
            url = f"{os.getenv('RPA_BASE_URL')}/rpa/v1/exec"
            variable_ext: dict = variable_pool.system_params.get(
                ParamKey.Ext, default={}
            )
            phone_number = variable_ext.get("phone_number", "")
            req_body = {
                "project_id": self.projectId,
                "sid": span.sid,
                "exec_position": self.rpaParams.get("execPosition", "EXECUTOR"),
                "params": inputs,
                **({"version": self.version} if self.version else {}),
                **({"phone_number": phone_number} if phone_number else {}),
            }
            await span.add_info_event_async(f"req_body: {req_body}")

            headers = {
                "Content-Type": "application/json",
                "Authorization": self.header.get("apiKey", ""),
            }

            data: Dict[str, Any] = {}
            if event_log_node_trace:
                event_log_node_trace.append_config_data(
                    {
                        "url": url,
                        "req_body": json.dumps(req_body, ensure_ascii=False),
                    }
                )

            async with aiohttp.ClientSession(
                timeout=ClientTimeout(total=24 * 60 * 60, sock_connect=30)
            ) as session:
                async with session.post(
                    url=url, headers=headers, json=req_body
                ) as response:
                    async for line in response.content:
                        msg = line.decode("utf-8")
                        if not msg.startswith("data:"):
                            continue
                        await span.add_info_event_async(f"recv: {msg}")
                        frame = _StreamResponse.model_validate_json(
                            msg.removeprefix("data:")
                        )
                        if frame.code != 0:
                            raise CustomException(
                                err_code=CodeEnum.RPA_REQUEST_ERROR,
                                err_msg=frame.message,
                            )
                        data = frame.data if frame.data is not None else {}
            outputs.update(
                {
                    output: data.get(output)
                    for output in self.output_identifier
                    if output in data
                }
            )

            return NodeRunResult(
                status=status,
                inputs=inputs,
                outputs=outputs,
                node_id=self.node_id,
                node_type=self.node_type,
                alias_name=self.alias_name,
            )
        except CustomException as e:
            span.record_exception(e)
            return NodeRunResult(
                inputs=inputs,
                outputs=outputs,
                node_id=self.node_id,
                alias_name=self.alias_name,
                node_type=self.node_type,
                status=WorkflowNodeExecutionStatus.FAILED,
                error=e,
            )
        except Exception as e:
            status = WorkflowNodeExecutionStatus.FAILED
            span.record_exception(e)
            return NodeRunResult(
                status=status,
                inputs=inputs,
                outputs=outputs,
                error=CustomException(
                    CodeEnum.RPA_REQUEST_ERROR,
                    cause_error=e,
                ),
                node_id=self.node_id,
                node_type=self.node_type,
                alias_name=self.alias_name,
            )

    async def async_execute(
        self,
        variable_pool: VariablePool,
        span: Span,
        event_log_node_trace: NodeLog | None = None,
        **kwargs: Any,
    ) -> NodeRunResult:
        """
        description: 异步执行
        """
        with span.start(
            func_name="async_execute", add_source_function_name=True
        ) as span_context:
            if event_log_node_trace:
                event_log_node_trace.append_config_data(
                    {
                        "projectId": self.projectId,
                        "header": self.header,
                        "source": self.source,
                        "rpaParams": self.rpaParams,
                    }
                )
            return await self.execute(
                variable_pool,
                span_context,
                event_log_node_trace,
            )
