import json
import os
from typing import Any

import aiohttp
import httpx
from aiohttp import ClientTimeout
from pydantic import Field, model_validator

from workflow.engine.entities.private_config import PrivateConfig
from workflow.engine.entities.variable_pool import VariablePool
from workflow.engine.nodes.base_node import BaseNode
from workflow.engine.nodes.entities.node_run_result import (
    NodeRunResult,
    WorkflowNodeExecutionStatus,
)
from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum
from workflow.extensions.otlp.log_trace.node_log import NodeLog
from workflow.extensions.otlp.trace.span import Span


class MCPNode(BaseNode):
    """
    MCP (Model Context Protocol) execution node for workflow execution.

    This node enables calling MCP tools from external MCP servers within workflows,
    supporting dynamic tool execution with configurable parameters and server endpoints.
    """

    _private_config = PrivateConfig()
    mcpServerId: str = Field(default="", description="MCP server unique identifier")
    mcpServerUrl: str = Field(default="", description="MCP server endpoint URL")
    toolName: str = Field(..., description="Name of the MCP tool to execute")

    @model_validator(mode="after")
    def validate_fields(self) -> "MCPNode":
        """Validate field constraints."""
        if not self.mcpServerId and not self.mcpServerUrl:
            raise ValueError("mcpServerId and mcpServerUrl cannot both be empty")
        if not self.toolName:
            raise ValueError("toolName cannot be empty")
        return self

    async def execute(
        self,
        variable_pool: VariablePool,
        span: Span,
        event_log_node_trace: NodeLog | None = None,
    ) -> NodeRunResult:
        """
        Execute the MCP tool call operation.

        Retrieves input variables, constructs the MCP tool call request,
        sends it to the MCP server, and returns the results.

        :param variable_pool: Pool containing workflow variables
        :param span: Span object for tracing and logging
        :param event_log_node_trace: Optional node log trace object
        :return: NodeRunResult containing the tool execution results or error information
        """
        inputs, outputs = {}, {}
        try:
            # Get input variables from variable pool using dictionary comprehension
            inputs.update(
                {
                    k: variable_pool.get_variable(
                        node_id=self.node_id, key_name=k, span=span
                    )
                    for k in self.input_identifier
                }
            )
            await span.add_info_events_async(
                {"mcp_input": json.dumps(inputs, ensure_ascii=False)}
            )
            status = WorkflowNodeExecutionStatus.SUCCEEDED

            # Prepare MCP tool call request
            url = f"{os.getenv('MCP_BASE_URL')}/api/v1/mcp/call_tool"
            req_body = {
                "mcp_server_id": self.mcpServerId,
                "mcp_server_url": self.mcpServerUrl,
                "tool_name": self.toolName,
                "tool_args": inputs,
            }
            # Execute MCP tool call
            async with aiohttp.ClientSession(
                timeout=ClientTimeout(total=5 * 60, sock_connect=30)
            ) as session:
                async with session.post(url, json=req_body) as resp:
                    if resp.status != httpx.codes.OK:
                        cause_error = (
                            f"Status code: {resp.status}, "
                            f"Response content: {await resp.text()}"
                        )
                        raise CustomException(
                            err_code=CodeEnum.MCP_REQUEST_ERROR,
                            cause_error=cause_error,
                        )

                    res_json = json.loads(await resp.text())
                    await span.add_info_events_async(
                        {"mcp_response": json.dumps(res_json, ensure_ascii=False)}
                    )

                    # Check for errors in response
                    if res_json.get("code") != 0:
                        msg = f"reason {res_json.get('message')}"
                        span.add_error_event(msg)
                        raise CustomException(
                            err_code=CodeEnum.MCP_REQUEST_ERROR,
                            err_msg=msg,
                            cause_error=msg,
                        )

            if not self.output_identifier:
                msg = "MCP node output identifier is empty"
                span.add_error_event(msg)
                raise CustomException(
                    err_code=CodeEnum.MCP_ERROR,
                    err_msg=msg,
                    cause_error=msg,
                )
            outputs = {self.output_identifier[0]: res_json.get("data", {})}
            return NodeRunResult(
                status=status,
                inputs=inputs,
                outputs=outputs,
                node_id=self.node_id,
                node_type=self.node_type,
                alias_name=self.alias_name,
            )
        except CustomException as err:
            span.add_error_event(str(err))
            span.record_exception(err)
            return NodeRunResult(
                inputs=inputs,
                outputs=outputs,
                node_id=self.node_id,
                alias_name=self.alias_name,
                node_type=self.node_type,
                status=WorkflowNodeExecutionStatus.FAILED,
                error=err,
            )
        except Exception as e:
            span.add_error_event(str(e))
            span.record_exception(e)
            return NodeRunResult(
                status=WorkflowNodeExecutionStatus.FAILED,
                inputs=inputs,
                outputs=outputs,
                error=CustomException(
                    CodeEnum.MCP_ERROR,
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
        Asynchronous execution method.

        Delegates to the main execute method for asynchronous MCP tool execution.

        :param variable_pool: Pool containing workflow variables
        :param span: Span object for tracing and logging
        :param event_log_node_trace: Optional node log trace object
        :param kwargs: Additional keyword arguments
        :return: NodeRunResult containing the tool execution results or error information
        """
        with span.start(
            func_name="async_execute", add_source_function_name=True
        ) as span_context:
            return await self.execute(
                variable_pool,
                span_context,
                event_log_node_trace,
            )
