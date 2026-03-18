import json
from typing import Any, Dict
from pydantic import Field

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


class VariableAggregationNode(BaseNode):
    """
    Improved implementation of variable aggregation node.

    Functionality: Iterates through candidate inputs in order and returns the first non-empty value.
    Falls back to configured fallback value or schema default if all inputs are empty.
    """

    fallbackEnabled: bool = Field(default=False)
    fallbackValue: Any = Field(default="")

    @staticmethod
    def _is_empty(value: Any) -> bool:
        """Check if a value is considered empty."""
        return value is None or value == "" or value == [] or value == {}

    @staticmethod
    def _default_value_from_schema(schema: Dict[str, Any]) -> Any:
        """Get default value from schema."""
        if "default" in schema:
            return schema["default"]

        schema_type = schema.get("type")
        type_defaults = {
            "string": "",
            "boolean": False,
            "integer": 0,
            "number": 0.0,
            "array": [],
            "object": {}
        }
        return type_defaults.get(schema_type, None)

    @staticmethod
    def _convert_to_type(value: Any, target_type: str) -> Any:
        """Convert value to target type with basic validation."""
        if target_type == "string":
            return str(value) if value is not None else ""

        if target_type == "boolean":
            if isinstance(value, bool):
                return value
            if isinstance(value, str):
                lower_val = value.lower()
                if lower_val in ("true", "1"):
                    return True
                if lower_val in ("false", "0"):
                    return False

        if target_type == "integer":
            if isinstance(value, (int, float)) and not isinstance(value, bool):
                return int(value)
            if isinstance(value, str):
                return int(value)

        if target_type == "number":
            if isinstance(value, (int, float)) and not isinstance(value, bool):
                return float(value)
            if isinstance(value, str):
                return float(value)

        if target_type == "array":
            if isinstance(value, list):
                return value
            if isinstance(value, str):
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    return parsed

        if target_type == "object":
            if isinstance(value, dict):
                return value
            if isinstance(value, str):
                parsed = json.loads(value)
                if isinstance(parsed, dict):
                    return parsed

        # If conversion fails, return original value
        return value

    @staticmethod
    def _parse_fallback_value(value: Any, schema: Dict[str, Any]) -> Any:
        """Parse and validate fallback value against schema."""
        schema_type = schema.get("type")
        if not schema_type:
            return value

        converted_value = VariableAggregationNode._convert_to_type(value, schema_type)

        # Validate the type after conversion
        type_validators = {
            "string": lambda x: isinstance(x, str),
            "boolean": lambda x: isinstance(x, bool),
            "integer": lambda x: isinstance(x, int) and not isinstance(x, bool),
            "number": lambda x: isinstance(x, (int, float)) and not isinstance(x, bool),
            "array": lambda x: isinstance(x, list),
            "object": lambda x: isinstance(x, dict)
        }

        validator = type_validators.get(schema_type)
        if validator and not validator(converted_value):
            raise CustomException(
                CodeEnum.VARIABLE_NODE_EXECUTION_ERROR,
                err_msg=f"Variable aggregation fallback value type is invalid for {schema_type}",
            )

        return converted_value

    async def async_execute(
        self,
        variable_pool: VariablePool,
        span: Span,
        event_log_node_trace: NodeLog | None = None,
        **kwargs: Any,
    ) -> NodeRunResult:
        try:
            if not self.output_identifier:
                raise CustomException(
                    CodeEnum.ENG_NODE_PROTOCOL_VALIDATE_ERROR,
                    err_msg="Variable aggregation node requires one output",
                )

            output_name = self.output_identifier[0]
            output_schema = variable_pool.get_output_schema(self.node_id, output_name)

            # Get all input values in order
            inputs = {
                input_key: variable_pool.get_variable(
                    node_id=self.node_id,
                    key_name=input_key,
                    span=span,
                )
                for input_key in self.input_identifier
            }

            # Find first non-empty value in input order (the core functionality)
            selected_value = next(
                (value for value in inputs.values() if not self._is_empty(value)),
                None
            )

            # Handle fallback if all inputs are empty
            if self._is_empty(selected_value):
                if self.fallbackEnabled:
                    selected_value = self._parse_fallback_value(self.fallbackValue, output_schema)
                else:
                    selected_value = self._default_value_from_schema(output_schema)

            outputs = {output_name: selected_value}
            variable_pool.do_validate(
                node_id=self.node_id,
                key_name_list=[output_name],
                outputs=outputs,
                span=span,
            )

            return NodeRunResult(
                status=WorkflowNodeExecutionStatus.SUCCEEDED,
                inputs=inputs,
                outputs=outputs,
                raw_output=json.dumps(outputs, ensure_ascii=False),
                node_id=self.node_id,
                alias_name=self.alias_name,
                node_type=self.node_type,
            )
        except CustomException as err:
            span.record_exception(err)
            return NodeRunResult(
                status=WorkflowNodeExecutionStatus.FAILED,
                error=err,
                node_id=self.node_id,
                alias_name=self.alias_name,
                node_type=self.node_type,
            )
        except Exception as err:
            span.record_exception(err)
            return NodeRunResult(
                status=WorkflowNodeExecutionStatus.FAILED,
                error=CustomException(
                    CodeEnum.VARIABLE_NODE_EXECUTION_ERROR,
                    cause_error=err,
                ),
                node_id=self.node_id,
                alias_name=self.alias_name,
                node_type=self.node_type,
            )
