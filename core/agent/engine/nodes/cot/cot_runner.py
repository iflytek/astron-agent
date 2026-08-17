import json
import re
import time
from contextlib import aclosing
from typing import Any, AsyncGenerator, Match, Union

from common.otlp.log_trace.base import Usage

# Use unified common package import module
from common.otlp.log_trace.node_log import Data, NodeLog
from common.otlp.log_trace.node_trace_log import NodeTraceLog
from common.otlp.trace.langfuse import (
    LangfuseConfig,
    langfuse_enabled,
    langfuse_observation_attributes,
)
from common.otlp.trace.span import Span
from loguru import logger
from opentelemetry.trace import Span as OtelSpan
from opentelemetry.trace import Status, StatusCode
from pydantic import Field

from agent.api.schemas.agent_response import AgentResponse, CotStep
from agent.api.schemas.llm_message import LLMMessage, LLMMessages
from agent.domain.models.base import BaseLLMModel
from agent.engine.nodes.base import (
    RunnerBase,
    Scratchpad,
    llm_generation_attributes,
    llm_provider_name,
)
from agent.engine.nodes.cot.cot_prompt import (
    COT_SYSTEM_NO_R1_MORE_TEMPLATE,
    COT_SYSTEM_R1_MORE_TEMPLATE,
    COT_SYSTEM_TEMPLATE,
    COT_USER_TEMPLATE,
)
from agent.engine.nodes.cot_process.cot_process_runner import CotProcessRunner
from agent.exceptions import cot_exc
from agent.service.plugin.base import BasePlugin, PluginResponse
from agent.service.plugin.link import LinkPlugin
from agent.service.plugin.mcp import McpPlugin
from agent.service.plugin.workflow import WorkflowPlugin

default_cot_step = CotStep(empty=True)

FORMAT_CORRECTION_PROMPT = """

上一次输出格式无法解析。请仅重新输出当前步骤，并严格采用以下两种格式之一：
Thought: <当前思考>
Action: <一个可访问工具名>
Action Input: <单行合法 JSON>
或
Thought: <当前思考>
Final Answer: <最终回答>
不要省略上述英文标识字段，也不要用 Markdown 包裹标识字段。
"""


def _protocol_marker(label: str) -> re.Pattern[str]:
    """Match common provider variations without matching prose mid-line."""
    return re.compile(
        rf"(?<![\w\"'])[ \t]*(?:(?:[-*]|\d+[.)])[ \t]+)?(?:\*\*)?{label}"
        rf"(?:\*\*)?[ \t]*[:：](?:\*\*)?[ \t]*",
        re.IGNORECASE | re.MULTILINE,
    )


PROTOCOL_MARKERS = {
    "thought": _protocol_marker(r"thought"),
    "action": _protocol_marker(r"action"),
    "action_input": _protocol_marker(r"action[ \t_-]+input"),
    "observation": _protocol_marker(r"observation"),
    "final_answer": _protocol_marker(r"final[ \t_-]+answer"),
}


def _mark_plugin_span_failed(
    span: OtelSpan, code: int, operation: str = "Plugin"
) -> None:
    """Represent a non-exception plugin failure consistently in OTel/Langfuse."""

    if not langfuse_enabled():
        return
    message = f"{operation} execution failed (code={code})"
    span.set_status(Status(StatusCode.ERROR))
    span.set_attributes(
        {
            "astron.agent.plugin.code": code,
            "langfuse.observation.level": "ERROR",
            "langfuse.observation.status_message": message,
        }
    )


class CotRunner(RunnerBase):
    model: BaseLLMModel
    scratchpad: Scratchpad = Field(default_factory=Scratchpad)
    # plugins: list[BasePlugin]
    plugins: list[Union[BasePlugin, McpPlugin, LinkPlugin, WorkflowPlugin]]
    instruct: str = Field(default="")
    knowledge: str = Field(default="")
    question: str = Field(default="")
    process_runner: CotProcessRunner
    max_loop: int = Field(default=30)

    async def create_system_prompt(self) -> str:
        system_prompt = COT_SYSTEM_TEMPLATE.replace("{now}", self.cur_time())
        system_prompt = system_prompt.replace("{instruct}", self.instruct or "无")
        system_prompt = system_prompt.replace("{knowledge}", self.knowledge or "无")
        system_prompt = system_prompt.replace(
            "{tools}", "\n".join([tool.schema_template for tool in self.plugins])
        )
        system_prompt = system_prompt.replace(
            "{tool_names}", ",".join([tool.name for tool in self.plugins])
        )
        system_prompt = system_prompt.replace(
            "{r1_more}",
            (
                COT_SYSTEM_R1_MORE_TEMPLATE
                if self.model.name == "xdeepseekr1"
                else COT_SYSTEM_NO_R1_MORE_TEMPLATE
            ),
        )
        return system_prompt

    async def create_user_prompt(self) -> str:
        user_prompt = COT_USER_TEMPLATE.replace(
            "{chat_history}", await self.create_history_prompt()
        )
        user_prompt = user_prompt.replace("{question}", self.question)
        return user_prompt

    async def _parse_action_input(self, action_input_raw: str) -> dict[str, Any]:
        """解析并验证 action_input JSON 格式"""
        normalized_input = action_input_raw.strip()
        normalized_input = re.sub(
            r"^```(?:json)?\s*", "", normalized_input, flags=re.IGNORECASE
        )
        normalized_input = re.sub(r"\s*```$", "", normalized_input)
        try:
            return json.loads(normalized_input)
        except json.decoder.JSONDecodeError:
            raise cot_exc.CotFormatIncorrectExc(
                f"无效的插件参数JSON格式: {action_input_raw}"
            )

    @staticmethod
    def _find_marker(step_content: str, marker: str) -> Match[str] | None:
        return PROTOCOL_MARKERS[marker].search(step_content)

    def _has_complete_action(self, step_content: str) -> bool:
        action = self._find_marker(step_content, "action")
        action_input = self._find_marker(step_content, "action_input")
        return bool(action and action_input and action.end() <= action_input.start())

    def _extract_final_answer(self, step_content: str) -> str | None:
        marker = self._find_marker(step_content, "final_answer")
        if marker is None:
            return None
        return step_content[marker.end() :]

    def _marker_presence(self, step_content: str) -> dict[str, bool]:
        return {
            marker: self._find_marker(step_content, marker) is not None
            for marker in PROTOCOL_MARKERS
        }

    async def _parse_action_and_input(
        self, step_content: str
    ) -> tuple[str, str, dict[str, Any]]:
        """解析 action、action_input 和 thought"""
        action_marker = self._find_marker(step_content, "action")
        action_input_marker = self._find_marker(step_content, "action_input")
        if (
            action_marker is None
            or action_input_marker is None
            or action_marker.end() > action_input_marker.start()
        ):
            raise cot_exc.CotFormatIncorrectExc("无效的推理格式，Action字段不完整")

        thought = ""
        thought_marker = self._find_marker(step_content, "thought")
        if thought_marker is not None and thought_marker.end() <= action_marker.start():
            thought = step_content[thought_marker.end() : action_marker.start()].strip()

        action = step_content[action_marker.end() : action_input_marker.start()].strip()
        action = action.strip("`*_")

        if not await self.is_valid_plugin(action):
            raise cot_exc.CotFormatIncorrectExc(f"无效的插件名称'{action}'")

        action_input_end = len(step_content)
        observation_marker = self._find_marker(step_content, "observation")
        if (
            observation_marker is not None
            and observation_marker.start() >= action_input_marker.end()
        ):
            action_input_end = observation_marker.start()
        action_input_raw = step_content[
            action_input_marker.end() : action_input_end
        ].strip()
        action_input = await self._parse_action_input(action_input_raw)
        return thought, action, action_input

    async def parse_cot_step(
        self, step_content: str, allow_plain_final_answer: bool = False
    ) -> CotStep:
        final_answer_marker = self._find_marker(step_content, "final_answer")
        if final_answer_marker is not None:
            thought = ""
            thought_marker = self._find_marker(step_content, "thought")
            if (
                thought_marker is not None
                and thought_marker.end() <= final_answer_marker.start()
            ):
                thought = step_content[
                    thought_marker.end() : final_answer_marker.start()
                ].strip()
            return CotStep(thought=thought, finished_cot=True)

        if self._has_complete_action(step_content):
            thought, action, action_input = await self._parse_action_and_input(
                step_content
            )
            return CotStep(thought=thought, action=action, action_input=action_input)

        normalized_content = step_content.strip()
        if (
            allow_plain_final_answer
            and normalized_content
            and not any(self._marker_presence(normalized_content).values())
        ):
            logger.warning(
                "Recovering unmarked final answer after {} completed tool steps; "
                "model={}, content_length={}",
                len(self.scratchpad.steps),
                self.model.name,
                len(normalized_content),
            )
            return CotStep(thought=normalized_content, finished_cot=True)

        # 其他情况都视为无效格式
        raise cot_exc.CotFormatIncorrectExc("无效的推理格式，缺少必要的标识字段")

    # Keep the streaming protocol transitions together as one state machine.
    async def read_response(  # noqa: C901
        self,
        messages: LLMMessages,
        first_loop: bool,
        span: Span,
        node_trace_log: NodeTraceLog,
        allow_plain_final_answer: bool = False,
    ) -> AsyncGenerator[AgentResponse, None]:

        model_messages = messages.list()
        with span.start(
            "MakingStep",
            attributes=llm_generation_attributes(
                self.model,
                input_value=model_messages,
            ),
        ) as sp:
            generation_span = sp.get_otlp_span()

            thinks = ""
            answers = ""

            step_content = ""
            final_answer = False
            step_content_complete = False

            # node赋值
            node_id = ""
            node_sid = span.sid
            node_node_id = span.sid
            node_type = "LLM"
            node_name = "ReadResponse"
            node_start_time = int(round(time.time() * 1000))
            node_running_status = True
            node_data_input = {
                "read_response_input": json.dumps(model_messages, ensure_ascii=False)
            }
            node_data_output: dict[str, Any] = {}
            node_data_config: dict[str, Any] = {}
            node_data_usage = Usage()

            model_stream = self.model.stream(model_messages, True, sp)
            try:
                async with aclosing(model_stream):
                    async for chunk in model_stream:
                        if chunk.usage:
                            usage_data = chunk.usage.model_dump()
                            node_data_usage.completion_tokens += usage_data.get(
                                "completion_tokens", 0
                            )
                            node_data_usage.prompt_tokens += usage_data.get(
                                "prompt_tokens", 0
                            )
                            node_data_usage.total_tokens += usage_data.get(
                                "total_tokens", 0
                            )

                        if not chunk.choices:
                            continue

                        if step_content_complete:
                            continue

                        delta = chunk.choices[0].delta.dict()
                        reasoning_content = delta.get("reasoning_content", "") or ""
                        content: str = delta.get("content", "") or ""
                        thinks += reasoning_content
                        answers += content

                        if final_answer and content:
                            yield AgentResponse(
                                typ="content", content=content, model=self.model.name
                            )
                            continue

                        if reasoning_content:
                            yield AgentResponse(
                                typ="reasoning_content",
                                content=reasoning_content,
                                model=self.model.name,
                            )

                        if not content:
                            continue

                        step_content += content
                        extracted_final_answer = self._extract_final_answer(
                            step_content
                        )
                        if extracted_final_answer is not None:
                            yield AgentResponse(
                                typ="content",
                                content=extracted_final_answer,
                                model=self.model.name,
                            )
                            final_answer = True
                            continue

                        if self._find_marker(step_content, "observation") is not None:
                            step_content_complete = True
            finally:
                generation_span.set_attributes(
                    llm_generation_attributes(
                        self.model,
                        input_value=model_messages,
                        output_value={
                            "reasoning_content": thinks,
                            "content": answers,
                        },
                        usage=node_data_usage,
                    )
                )

            node_end_time = int(round(time.time() * 1000))
            data_llm_output = answers
            node_trace_log.trace.append(
                NodeLog(
                    id=node_id,
                    sid=node_sid,
                    node_id=node_node_id,
                    node_name=node_name,
                    node_type=node_type,
                    start_time=node_start_time,
                    end_time=node_end_time,
                    duration=node_end_time - node_start_time,
                    running_status=node_running_status,
                    llm_output=data_llm_output,
                    data=Data(
                        input=node_data_input if node_data_input else {},
                        output=node_data_output if node_data_output else {},
                        config=node_data_config if node_data_config else {},
                        usage=node_data_usage,
                    ),
                )
            )

            sp.add_info_events({"step-think": thinks})
            sp.add_info_events({"step-content": answers})

            if not final_answer:
                # 解析 step_content
                protocol_content = step_content
                reasoning_action_complete = self._has_complete_action(thinks)
                content_action_complete = self._has_complete_action(step_content)
                reasoning_final_answer = self._extract_final_answer(thinks)

                if reasoning_action_complete and not content_action_complete:
                    protocol_content = thinks
                    logger.warning(
                        "Using reasoning_content as CoT action protocol; model={}, "
                        "content_length={}, reasoning_length={}, completed_steps={}",
                        self.model.name,
                        len(step_content),
                        len(thinks),
                        len(self.scratchpad.steps),
                    )

                if (
                    not content_action_complete
                    and reasoning_final_answer is not None
                    and step_content.strip()
                ):
                    yield AgentResponse(
                        typ="content",
                        content=step_content,
                        model=self.model.name,
                    )
                    return

                if (
                    not content_action_complete
                    and not reasoning_action_complete
                    and allow_plain_final_answer
                    and step_content.strip()
                    and not any(self._marker_presence(step_content).values())
                ):
                    logger.warning(
                        "Recovering unmarked final answer; model={}, "
                        "content_length={}, completed_steps={}",
                        self.model.name,
                        len(step_content.strip()),
                        len(self.scratchpad.steps),
                    )
                    yield AgentResponse(
                        typ="content",
                        content=step_content,
                        model=self.model.name,
                    )
                    return

                if (
                    not step_content.strip()
                    and reasoning_final_answer is not None
                    and reasoning_final_answer.strip()
                ):
                    logger.warning(
                        "Using final answer from reasoning_content because content is "
                        "empty; model={}, reasoning_length={}, completed_steps={}",
                        self.model.name,
                        len(thinks),
                        len(self.scratchpad.steps),
                    )
                    yield AgentResponse(
                        typ="content",
                        content=reasoning_final_answer,
                        model=self.model.name,
                    )
                    return

                try:
                    cot_step = await self.parse_cot_step(
                        protocol_content,
                        allow_plain_final_answer=allow_plain_final_answer,
                    )
                except cot_exc.CotExc:
                    logger.warning(
                        "CoT response format validation failed; model={}, "
                        "content_length={}, reasoning_length={}, completed_steps={}, "
                        "markers={}",
                        self.model.name,
                        len(protocol_content),
                        len(thinks),
                        len(self.scratchpad.steps),
                        self._marker_presence(protocol_content),
                    )
                    raise
                yield AgentResponse(
                    typ="cot_step",
                    content=cot_step,
                    model=self.model.name,
                )

    async def _process_agent_responses(
        self,
        msgs: LLMMessages,
        first_loop: bool,
        span: Span,
        node_trace_log: NodeTraceLog,
        allow_plain_final_answer: bool = False,
    ) -> AsyncGenerator[tuple[AgentResponse | None, CotStep, bool], None]:
        """处理 agent 响应，yield (agent_response, cot_step, yield_answer)"""
        cot_step: CotStep = default_cot_step
        yield_answer = False

        response_stream = self.read_response(
            msgs,
            first_loop,
            span,
            node_trace_log,
            allow_plain_final_answer=allow_plain_final_answer,
        )
        async with aclosing(response_stream):
            async for agent_response in response_stream:
                if agent_response.typ in ["reasoning_content", "log"]:
                    yield agent_response, cot_step, yield_answer
                elif agent_response.typ == "content":
                    yield_answer = True
                    yield agent_response, cot_step, yield_answer
                elif agent_response.typ == "cot_step":
                    cot_step = agent_response.content
                    yield None, cot_step, yield_answer

    async def _handle_cot_step(
        self, cot_step: CotStep, span: Span
    ) -> AsyncGenerator[AgentResponse, None]:
        """处理 cot_step，执行插件并返回响应"""
        if cot_step.finished_cot:
            return

        if cot_step.empty:
            raise cot_exc.CotFormatIncorrectExc()

        plugin = await self.get_plugin(cot_step)
        cot_step.plugin = plugin

        if plugin and plugin.typ == "workflow":  # type: ignore[union-attr]
            response_stream = self.run_workflow_plugin(plugin, cot_step, span)
            async with aclosing(response_stream):
                async for agent_response in response_stream:
                    yield agent_response
        elif plugin:
            cot_step.tool_type = "tool"
            plugin_response = await self.run_plugin(cot_step, span)
            cot_step.plugin.run_result = plugin_response  # type: ignore[union-attr]
            cot_step.action_output = plugin_response.result
            yield AgentResponse(typ="cot_step", content=cot_step, model=self.model.name)

    async def run(
        self, span: Span, node_trace_log: NodeTraceLog
    ) -> AsyncGenerator[AgentResponse, None]:
        """cot run"""

        agent_input = {"question": self.question}
        agent_metadata = {
            "model": self.model.name,
            "provider": llm_provider_name(self.model),
        }
        capture_config = LangfuseConfig.from_env()
        with span.start(
            "RunCotAgent",
            attributes=langfuse_observation_attributes(
                "agent",
                input_value=agent_input,
                metadata=agent_metadata,
            ),
        ) as sp:
            agent_span = sp.get_otlp_span()
            agent_output: list[dict[str, str]] = []
            captured_length = 0
            response_stream = self._run_agent_loop(sp, node_trace_log)
            try:
                async with aclosing(response_stream):
                    async for agent_response in response_stream:
                        if (
                            capture_config.is_effectively_enabled
                            and capture_config.capture_input_output
                            and agent_response.typ in {"content", "reasoning_content"}
                        ):
                            content = str(agent_response.content)
                            remaining = (
                                capture_config.max_attribute_length - captured_length
                            )
                            if remaining > 0:
                                captured = content[:remaining]
                                agent_output.append(
                                    {
                                        "type": agent_response.typ,
                                        "content": captured,
                                    }
                                )
                                captured_length += len(captured)
                        yield agent_response
            finally:
                agent_span.set_attributes(
                    langfuse_observation_attributes(
                        "agent",
                        input_value=agent_input,
                        output_value=agent_output,
                        metadata=agent_metadata,
                    )
                )

    # Keep the retry, tool-execution, and completion transitions together.
    async def _run_agent_loop(  # noqa: C901
        self, span: Span, node_trace_log: NodeTraceLog
    ) -> AsyncGenerator[AgentResponse, None]:
        system_prompt = await self.create_system_prompt()
        user_prompt_template = await self.create_user_prompt()

        loop_count = 0
        format_retry_used = False
        format_correction = ""
        while self.max_loop > loop_count:
            loop_count += 1
            user_prompt = user_prompt_template.replace(
                "{scratchpad}", await self.scratchpad.template()
            )
            user_prompt += format_correction

            msgs = LLMMessages(
                messages=[
                    LLMMessage(role="system", content=system_prompt),
                    LLMMessage(role="user", content=user_prompt),
                ]
            )

            cot_step = default_cot_step
            yield_answer = False
            try:
                response_stream = self._process_agent_responses(
                    msgs,
                    loop_count == 1,
                    span,
                    node_trace_log,
                    allow_plain_final_answer=bool(self.scratchpad.steps)
                    or format_retry_used,
                )
                async with aclosing(response_stream):
                    async for (
                        agent_response,
                        step,
                        answer_flag,
                    ) in response_stream:
                        if agent_response is not None:
                            yield agent_response
                        cot_step = step
                        yield_answer = answer_flag
            except cot_exc.CotExc:
                if format_retry_used:
                    raise
                format_retry_used = True
                format_correction = FORMAT_CORRECTION_PROMPT
                loop_count -= 1
                logger.warning(
                    "Retrying CoT step once with format correction; "
                    "model={}, completed_steps={}",
                    self.model.name,
                    len(self.scratchpad.steps),
                )
                continue

            format_retry_used = False
            format_correction = ""

            if yield_answer:
                return

            if cot_step.finished_cot:
                self.scratchpad.steps.append(cot_step)
                response_stream = self.process_runner.run(
                    self.scratchpad, span, node_trace_log
                )
                async with aclosing(response_stream):
                    async for agent_response in response_stream:
                        yield agent_response
                return

            response_stream = self._handle_cot_step(cot_step, span)
            async with aclosing(response_stream):
                async for agent_response in response_stream:
                    yield agent_response

            if not cot_step.action_output:
                return

            self.scratchpad.steps.append(cot_step)

        response_stream = self.process_runner.run(self.scratchpad, span, node_trace_log)
        async with aclosing(response_stream):
            async for agent_response in response_stream:
                yield agent_response

    async def run_plugin(self, cot_step: CotStep, span: Span) -> PluginResponse:

        plugin_metadata = {"plugin_name": cot_step.action}
        tool_attributes = langfuse_observation_attributes(
            "tool",
            input_value=cot_step.action_input,
            metadata=plugin_metadata,
        )
        if tool_attributes:
            tool_attributes["gen_ai.tool.name"] = cot_step.action
        with span.start("RunPlugin", attributes=tool_attributes) as sp:
            tool_span = sp.get_otlp_span()
            plugin_response: PluginResponse | None = None
            try:
                for plugin in self.plugins:

                    if plugin.name.strip() == cot_step.action.strip():
                        plugin_metadata["plugin_type"] = plugin.typ
                        sp.add_info_events({"plugin-type": plugin.typ})
                        plugin_response = await plugin.run(cot_step.action_input, sp)
                        break

                else:
                    plugin_metadata["plugin_type"] = "not_found"
                    default_result = {
                        "code": 400,
                        "message": f"{cot_step.action} 找不到",
                        "data": None,
                    }

                    plugin_response = PluginResponse(
                        code=400,
                        result=default_result,
                        log=[
                            {
                                "name": cot_step.action,
                                "input": cot_step.action_input,
                                "output": default_result,
                                "detail": "not found plugin",
                            }
                        ],
                    )

                sp.add_info_events({"plugin-result": plugin_response.model_dump_json()})

                return plugin_response
            finally:
                final_attributes = langfuse_observation_attributes(
                    "tool",
                    input_value=cot_step.action_input,
                    output_value=(
                        plugin_response.result if plugin_response is not None else None
                    ),
                    metadata=plugin_metadata,
                )
                if final_attributes:
                    final_attributes["gen_ai.tool.name"] = cot_step.action
                tool_span.set_attributes(final_attributes)
                if plugin_response is not None and plugin_response.code != 0:
                    _mark_plugin_span_failed(tool_span, plugin_response.code)

    async def run_workflow_plugin(
        self, plugin: BasePlugin, cot_step: CotStep, span: Span
    ) -> AsyncGenerator[AgentResponse, None]:

        workflow_metadata = {
            "handoff_type": "agent_to_workflow",
            "plugin_name": plugin.name,
            "workflow_id": str(getattr(plugin, "flow_id", "")),
        }
        chain_attributes = langfuse_observation_attributes(
            "chain",
            input_value=cot_step.action_input,
            metadata=workflow_metadata,
        )
        if chain_attributes:
            chain_attributes["gen_ai.operation.name"] = "execute_tool"
            chain_attributes["gen_ai.tool.name"] = plugin.name
        capture_config = LangfuseConfig.from_env()
        with span.start("RunWorkflowPlugin", attributes=chain_attributes) as sp:
            workflow_span = sp.get_otlp_span()
            workflow_output: Any = None
            try:
                cot_step.tool_type = "workflow"

                sp.add_info_events({"plugin-type": "workflow"})
                first_frame = True
                plugin_stream = plugin.run(action_input=cot_step.action_input, span=sp)
                async with aclosing(plugin_stream):
                    async for plugin_response in plugin_stream:
                        if (
                            capture_config.is_effectively_enabled
                            and capture_config.capture_input_output
                        ):
                            workflow_output = plugin_response.result
                        is_failure = plugin_response.code != 0
                        if is_failure:
                            cot_step.action_output = plugin_response.result
                            _mark_plugin_span_failed(
                                workflow_span,
                                plugin_response.code,
                                operation="Workflow plugin",
                            )
                        if first_frame:
                            first_frame = False
                            cot_step.plugin.run_result = plugin_response
                            cot_step.action_output = plugin_response.result
                            yield AgentResponse(
                                typ="cot_step",
                                content=cot_step,
                                model=self.model.name,
                            )
                        sp.add_info_events(
                            {"flow-chunk": plugin_response.model_dump_json()}
                        )

                        if is_failure:
                            return
                        # yield AgentResponse(typ="log", content=plugin_response.log, model=self.model.name)
                        if plugin_response.result.get("reasoning_content"):
                            yield AgentResponse(
                                typ="reasoning_content",
                                content=plugin_response.result["reasoning_content"],
                                model=self.model.name,
                            )
                        if plugin_response.result.get("content"):
                            yield AgentResponse(
                                typ="content",
                                content=plugin_response.result["content"],
                                model=self.model.name,
                            )
            finally:
                final_attributes = langfuse_observation_attributes(
                    "chain",
                    input_value=cot_step.action_input,
                    output_value=workflow_output,
                    metadata=workflow_metadata,
                )
                if final_attributes:
                    final_attributes["gen_ai.operation.name"] = "execute_tool"
                    final_attributes["gen_ai.tool.name"] = plugin.name
                workflow_span.set_attributes(final_attributes)

    async def is_valid_plugin(self, plugin_name: str) -> bool:
        for plugin in self.plugins:
            if plugin.name.strip() == plugin_name.strip():
                return True
        return False

    async def get_plugin(self, co_step: CotStep) -> BasePlugin | None:
        for plugin in self.plugins:
            if plugin.name.strip() == co_step.action.strip():
                return plugin
        return None
