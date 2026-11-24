import asyncio
import json
import os
from typing import Any, Dict, List, Tuple
from uuid import uuid4

import aiohttp
from aiohttp import ClientResponse, ClientTimeout
from common.otlp.trace.langfuse import (
    AGENT_TRACE_AUDIENCE,
    inject_trusted_langfuse_context,
    redact_trusted_trace_headers,
)
from pydantic import PrivateAttr

from workflow.consts.engine.chat_status import ChatStatus
from workflow.engine.callbacks.openai_types_sse import GenerateUsage
from workflow.engine.entities.msg_or_end_dep_info import MsgOrEndDepInfo
from workflow.engine.entities.variable_pool import ParamKey, VariablePool
from workflow.engine.nodes.base_node import BaseNode
from workflow.engine.nodes.entities.node_run_result import (
    NodeRunResult,
    WorkflowNodeExecutionStatus,
)
from workflow.engine.nodes.util.frame_processor import extract_tool_calls_content
from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum
from workflow.extensions.otlp.log_trace.node_log import NodeLog
from workflow.extensions.otlp.trace.span import Span
from workflow.infra import console_runtime
from workflow.utils.credentials import credential_from_env_or_file
from workflow.utils.trace_sanitization import serialize_trace_payload

WORKFLOW_INTERNAL_API_KEY_HEADER = "X-Workflow-Internal-Key"
WORKFLOW_INTERNAL_API_KEY_PLACEHOLDER = "CHANGE_ME_WORKFLOW_INTERNAL_API_KEY"


def _redact_agent_request_headers(headers: dict[str, str]) -> dict[str, str]:
    """Remove deployment credentials and signed trace context from telemetry."""
    trace_safe_headers = redact_trusted_trace_headers(headers)
    return {
        key: value
        for key, value in trace_safe_headers.items()
        if key.lower() != WORKFLOW_INTERNAL_API_KEY_HEADER.lower()
    }


def _agent_frame(line: bytes) -> dict | None:
    line_str = line.decode("utf-8").strip()
    if not line_str.startswith("data:"):
        return None
    data = line_str.removeprefix("data:").strip()
    if data == "[DONE]":
        return None
    return json.loads(data)


class AgentNode(BaseNode):
    """Invoke an existing Agent through Console's fixed, authorized release."""

    appId: str
    agentId: str | int | None = None
    stream: bool = True
    _runtime_domain: str = PrivateAttr(default="")

    def _build_agent_request_headers(self) -> dict[str, str]:
        """Build an authenticated request for the deployment-internal Agent API."""
        internal_api_key = credential_from_env_or_file(
            "WORKFLOW_INTERNAL_API_KEY",
            "WORKFLOW_INTERNAL_API_KEY_FILE",
            min_length=32,
            placeholders=(WORKFLOW_INTERNAL_API_KEY_PLACEHOLDER,),
        )
        if not internal_api_key:
            raise CustomException(
                err_code=CodeEnum.AGENT_NODE_EXECUTION_ERROR,
                err_msg="Workflow internal API authentication is not configured",
            )
        headers = {
            "Content-Type": "application/json",
            "x-consumer-username": self.appId,
            WORKFLOW_INTERNAL_API_KEY_HEADER: internal_api_key,
        }
        headers.update(
            inject_trusted_langfuse_context(
                method="POST",
                audience=AGENT_TRACE_AUDIENCE,
                tenant_id=self.appId,
            )
        )
        return headers

    async def _call_agent(
        self,
        inputs: dict,
        variable_pool: VariablePool,
        msg_or_end_node_deps: Dict[str, MsgOrEndDepInfo],
        span: Span,
        event_log_node_trace: NodeLog | None = None,
    ) -> Tuple[list, list, dict]:
        """Call external agent service with prepared inputs.

        :param inputs: Input data for the agent
        :param variable_pool: Variable pool for data storage
        :param msg_or_end_node_deps: Message or end node dependencies
        :param span: Tracing span for monitoring
        :param event_log_node_trace: Event logging for node execution
        :return: Tuple of (content_list, reasoning_content_list, token_usage)
        """
        query = inputs.get("query", inputs.get("input"))
        if query is None:
            query = json.dumps(inputs, ensure_ascii=False)
        messages = [{"role": "user", "content": str(query)}]

        # Construct request headers
        headers = self._build_agent_request_headers()

        req_body = await self._generate_agent_request(messages, variable_pool, span)
        self._runtime_domain = req_body.get("model_config", {}).get("domain", "")
        logged_headers = _redact_agent_request_headers(headers)
        sanitized_req_body = serialize_trace_payload(req_body)
        await span.add_info_event_async(f"req header: {logged_headers}")
        await span.add_info_event_async(f"req body: {sanitized_req_body}")

        if event_log_node_trace:
            event_log_node_trace.append_config_data(
                {
                    "url": f"{os.getenv('AGENT_BASE_URL')}/agent/v1/custom/chat/completions",
                    "req_headers": logged_headers,
                    "req_body": sanitized_req_body,
                }
            )

        try:
            interval_timeout = (
                self.retry_config.timeout
                if self.retry_config.should_retry
                else self._private_config.timeout
            )

            timeout_config = ClientTimeout(
                total=30 * 60, sock_connect=30, sock_read=interval_timeout
            )

            async with aiohttp.ClientSession(
                timeout=timeout_config, read_bufsize=1024 * 1024  # 1MB high_water
            ) as session:
                async with session.post(
                    url=f"{os.getenv('AGENT_BASE_URL')}/agent/v1/custom/chat/completions",
                    headers=headers,
                    json=req_body,
                ) as response:
                    response.raise_for_status()
                    content_list, reasoning_content_list, token_usage = (
                        await self._process_stream_response(
                            response, variable_pool, msg_or_end_node_deps, span
                        )
                    )
        except asyncio.TimeoutError as e:
            raise CustomException(
                err_code=CodeEnum.AGENT_NODE_EXECUTION_ERROR,
                err_msg=f"Agent node response timeout ({interval_timeout}s)",
            ) from e

        except CustomException as err:
            raise err
        except Exception as e:
            raise e

        return content_list, reasoning_content_list, token_usage

    async def _process_stream_response(
        self,
        response: ClientResponse,
        variable_pool: VariablePool,
        msg_or_end_node_deps: Dict[str, MsgOrEndDepInfo],
        span: Span,
    ) -> Tuple[list, list, dict]:
        """Process streaming response from agent service.

        :param response: HTTP response from agent service
        :param variable_pool: Variable pool for data storage
        :param msg_or_end_node_deps: Message or end node dependencies
        :param span: Tracing span for monitoring
        :return: Tuple of (content_list, reasoning_content_list, token_usage)
        """

        content_list = []
        reasoning_content_list = []
        token_usage = {}
        completed = False
        async for line in response.content:
            msg = _agent_frame(line)
            if msg is None:
                continue

            if msg.get("code", 0) != 0:
                raise CustomException(
                    err_code=CodeEnum.AGENT_NODE_EXECUTION_ERROR,
                    err_msg=msg.get("message", ""),
                    cause_error=json.dumps(msg, ensure_ascii=False),
                )

            choices = msg.get("choices", [{}])
            if len(choices) == 0:
                continue

            content = choices[0].get("delta", {}).get("content", "")
            reasoning_content = choices[0].get("delta", {}).get("reasoning_content", "")
            tool_calls = choices[0].get("delta", {}).get("tool_calls", [])
            if content:
                content_list.append(content)
            if reasoning_content:
                reasoning_content_list.append(reasoning_content)
            if tool_calls:
                tool_calls_optimize = extract_tool_calls_content(tool_calls)
                reasoning_content_list.append(tool_calls_optimize)

            finish_reason = choices[0].get("finish_reason")
            # Put frame content into msg_or_end_node_deps for streaming
            await self.put_stream_content(
                self.node_id,
                variable_pool,
                msg_or_end_node_deps,
                self._runtime_domain,
                msg,
            )
            if finish_reason == ChatStatus.FINISH_REASON.value:
                completed = True
                token_usage = msg.get("usage", {})
                token_usage = token_usage if token_usage else {}
                break
        if not completed:
            raise CustomException(
                CodeEnum.AGENT_NODE_EXECUTION_ERROR,
                err_msg="Agent stream ended without completion",
            )
        return content_list, reasoning_content_list, token_usage

    async def _generate_agent_request(
        self, messages: List[Dict], variable_pool: VariablePool, span: Span
    ) -> dict:
        if not self.agentId:
            raise CustomException(
                CodeEnum.AGENT_NODE_EXECUTION_ERROR,
                err_msg="请选择已有 Agent；节点内联配置已停用",
            )
        context = variable_pool.system_params.get(ParamKey.ConsoleContext, default={})
        if not context:
            raise CustomException(
                CodeEnum.AGENT_NODE_EXECUTION_ERROR,
                err_msg="Agent references require a Console run",
            )
        console_runtime.validate_context(context)
        return await console_runtime.request(
            "agent-runtime",
            {
                "runId": context["run_id"],
                "nodeId": self.node_id,
                "query": messages[-1]["content"],
                "invocationId": str(uuid4()),
            },
        )

    async def async_execute(
        self,
        variable_pool: VariablePool,
        span: Span,
        event_log_node_trace: NodeLog | None = None,
        **kwargs: Any,
    ) -> NodeRunResult:
        """Execute agent node asynchronously.

        :param variable_pool: Variable pool for data storage
        :param span: Tracing span for monitoring
        :param event_log_node_trace: Event logging for node execution
        :param kwargs: Additional keyword arguments
        :return: Node execution result
        """
        try:
            msg_or_end_node_deps = kwargs.get("msg_or_end_node_deps", {})
            inputs = {}
            for input_key in self.input_identifier:
                input_value = variable_pool.get_variable(
                    node_id=self.node_id, key_name=input_key, span=span
                )
                inputs.update({input_key: input_value})

            content_list, reasoning_content_list, token_usage = await self._call_agent(
                inputs,
                variable_pool,
                msg_or_end_node_deps,
                span,
                event_log_node_trace=event_log_node_trace,
            )

            outputs = {}
            for output_key in self.output_identifier:
                if output_key == "REASONING_CONTENT":
                    outputs.update({output_key: "".join(reasoning_content_list)})
                else:
                    outputs.update({output_key: "".join(content_list)})

            return NodeRunResult(
                node_id=self.node_id,
                alias_name=self.alias_name,
                node_type=self.node_type,
                process_data={},
                status=WorkflowNodeExecutionStatus.SUCCEEDED,
                inputs=inputs,
                outputs=outputs,
                token_cost=GenerateUsage(
                    completion_tokens=token_usage.get("completion_tokens", 0),
                    prompt_tokens=token_usage.get("prompt_tokens", 0),
                    total_tokens=token_usage.get("total_tokens", 0),
                ),
            )
        except CustomException as err:
            return NodeRunResult(
                node_id=self.node_id,
                alias_name=self.alias_name,
                node_type=self.node_type,
                status=WorkflowNodeExecutionStatus.FAILED,
                error=err,
            )
        except Exception as err:
            span.record_exception(err)
            return NodeRunResult(
                node_id=self.node_id,
                alias_name=self.alias_name,
                node_type=self.node_type,
                status=WorkflowNodeExecutionStatus.FAILED,
                error=CustomException(
                    CodeEnum.AGENT_NODE_EXECUTION_ERROR,
                    cause_error=err,
                ),
            )
