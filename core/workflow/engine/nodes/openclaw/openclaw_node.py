from typing import Any

from pydantic import Field, model_validator

from workflow.engine.entities.variable_pool import VariablePool
from workflow.engine.nodes.mcp.mcp_node import MCPNode
from workflow.extensions.otlp.trace.span import Span


class OpenClawNode(MCPNode):
    """
    OpenClaw skill execution node.

    The node reuses the existing MCP gateway and adds ChatClaw/OpenClaw runtime
    metadata to the tool arguments so the canvas can configure skills visually.
    """

    toolName: str = Field(default="run_skill", description="OpenClaw MCP tool name")
    skillName: str = Field(default="", description="OpenClaw skill name")
    executionMode: str = Field(
        default="chatclaw", description="OpenClaw execution mode"
    )
    preCondition: str = Field(default="", description="Pre-run condition or prompt")
    postCondition: str = Field(default="", description="Post-run condition or prompt")
    tuningParams: dict[str, Any] = Field(
        default_factory=dict, description="Visual fine-tuning parameters"
    )
    optionalInputIdentifiers: list[str] = Field(
        default_factory=lambda: ["context"],
        description="OpenClaw inputs that may be omitted when unresolved",
    )

    @model_validator(mode="after")
    def validate_openclaw_fields(self) -> "OpenClawNode":
        """Validate OpenClaw-specific field constraints."""
        super().validate_fields()
        if not self.skillName:
            raise ValueError("skillName cannot be empty")
        if not self.executionMode:
            raise ValueError("executionMode cannot be empty")
        return self

    def _optional_input_names(self) -> set[str]:
        return {str(item) for item in self.optionalInputIdentifiers}

    @staticmethod
    def _is_empty_optional_value(value: Any) -> bool:
        return value in ("", None, {}, [])

    async def collect_inputs(
        self,
        variable_pool: VariablePool,
        span: Span,
    ) -> dict[str, Any]:
        """Resolve inputs while allowing configured optional args to be absent."""
        inputs: dict[str, Any] = {}
        optional_inputs = self._optional_input_names()
        for identifier in self.input_identifier:
            try:
                value = variable_pool.get_variable(
                    node_id=self.node_id, key_name=identifier, span=span
                )
            except Exception as err:
                if identifier in optional_inputs:
                    await span.add_info_events_async(
                        {
                            "openclaw_optional_input_skipped": {
                                "input": identifier,
                                "reason": str(err),
                            }
                        }
                    )
                    continue
                raise
            if identifier in optional_inputs and self._is_empty_optional_value(value):
                continue
            inputs[identifier] = value
        return inputs

    def build_tool_args(self, inputs: dict[str, Any]) -> dict[str, Any]:
        """Merge workflow inputs with OpenClaw skill execution metadata."""
        tool_args = {
            **inputs,
            "skill_name": self.skillName,
            "execution_mode": self.executionMode,
        }
        if self.preCondition:
            tool_args["pre_condition"] = self.preCondition
        if self.postCondition:
            tool_args["post_condition"] = self.postCondition
        if self.tuningParams:
            tuning_params = {
                key: value
                for key, value in self.tuningParams.items()
                if value is not None and value != ""
            }
            if tuning_params:
                tool_args["tuning_params"] = tuning_params
        return tool_args
