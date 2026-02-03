import json
from typing import AsyncIterator

# Use unified common package import module
from common.otlp.log_trace.node_trace_log import NodeTraceLog
from common.otlp.trace.span import Span
from pydantic import Field

from agent.api.schemas.agent_response import AgentResponse
from agent.domain.models.base import BaseLLMModel
from agent.engine.nodes.base import RunnerBase, Scratchpad
from agent.engine.nodes.cot_process.cot_process_prompt import (
    COT_PROCESS_LAST_USER_STEP_TEMPLATE,
    COT_PROCESS_SYSTEM_TEMPLATE,
    COT_PROCESS_USER_STEP_TEMPLATE,
    COT_PROCESS_USER_TEMPLATE,
)


class CotProcessRunner(RunnerBase):
    model: BaseLLMModel
    chat_history: list
    instruct: str = Field(default="")
    knowledge: str = Field(default="")
    question: str = Field(default="")

    async def run(
        self,
        scratchpad: Scratchpad,
        span: Span,
        node_trace_log: NodeTraceLog,
    ) -> AsyncIterator[AgentResponse]:
        """使用cot过程进行思考回答"""

        with span.start("RunCotProcessAgent") as sp:

            system_prompt = (
                COT_PROCESS_SYSTEM_TEMPLATE.replace("{now}", self.cur_time())
                .replace("{instruct}", self.instruct)
                .replace("{knowledge}", self.knowledge)
            )
            reasoning_process = []

            for i, step in enumerate(scratchpad.steps, start=1):
                if step.finished_cot:
                    step_template = COT_PROCESS_LAST_USER_STEP_TEMPLATE.replace(
                        "{no}", str(i)
                    ).replace("{think}", step.thought)
                else:
                    action_input_text = json.dumps(
                        step.action_input, ensure_ascii=False
                    )
                    action_output_text = json.dumps(
                        step.action_output, ensure_ascii=False
                    )
                    step_template = (
                        COT_PROCESS_USER_STEP_TEMPLATE.replace("{no}", str(i))
                        .replace("{think}", step.thought)
                        .replace("{action}", step.action)
                        .replace("{action_input}", action_input_text)
                        .replace("{action_output}", action_output_text)
                    )
                reasoning_process.append(step_template)

            process_text = "\n".join(reasoning_process)
            user_prompt = (
                COT_PROCESS_USER_TEMPLATE.replace("{reasoning_process}", process_text)
                .replace("{chat_history}", await self.create_history_prompt())
                .replace("{question}", self.question)
            )

            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]

            async for chunk in self.model_general_stream(messages, sp, node_trace_log):
                yield chunk
