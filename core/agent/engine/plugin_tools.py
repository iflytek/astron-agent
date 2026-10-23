"""Bridge platform plugins to official LangChain structured tools."""

import hashlib
import inspect
import json
import re
import time
from contextlib import aclosing
from typing import Any

from common.otlp.trace.langfuse import langfuse_observation_attributes
from common.otlp.trace.span import Span
from jsonschema import Draft202012Validator
from langchain_core.tools import StructuredTool
from langgraph.config import get_stream_writer
from opentelemetry.trace import Status, StatusCode
from referencing import Registry

from agent.api.schemas.agent_response import AgentResponse, ToolExecution
from agent.service.plugin.base import BasePlugin, PluginResponse

# These names belong to the Harness, even when a particular backend omits them.
RESERVED_TOOLS = {
    "ls",
    "read_file",
    "write_file",
    "edit_file",
    "delete",
    "glob",
    "grep",
    "execute",
    "task",
    "write_todos",
}


def plugin_schema(plugin: BasePlugin) -> dict[str, Any]:
    """Read existing metadata; never silently replace invalid schemas with {}."""
    _, marker, raw = plugin.schema_template.rpartition("tool_parameters:")
    if not marker:
        raise ValueError(f"Missing parameter schema for tool {plugin.name}")
    schema = json.loads(raw)
    if schema == {}:
        schema = {"type": "object", "properties": {}}
    if not isinstance(schema, dict) or schema.get("type") != "object":
        raise ValueError(f"Expected object parameter schema for tool {plugin.name}")
    Draft202012Validator.check_schema(schema)
    return schema


def build_plugin_tools(plugins: list[BasePlugin], span: Span) -> list[StructuredTool]:
    names = set(RESERVED_TOOLS)
    original_names: set[str] = set()
    tools = []
    for plugin in plugins:
        if not plugin.name.strip() or plugin.name in original_names:
            raise ValueError("Empty or duplicate plugin name")
        original_names.add(plugin.name)
        alias = plugin.name
        if not re.fullmatch(r"[a-zA-Z0-9_-]{1,64}", alias) or alias in RESERVED_TOOLS:
            alias = "astron_tool_" + hashlib.sha256(alias.encode()).hexdigest()[:24]
        if alias in names:
            raise ValueError("Duplicate plugin tool alias")
        names.add(alias)
        schema = plugin_schema(plugin)
        tools.append(_build_tool(plugin, schema, span, alias))
    return tools


def _build_tool(
    plugin: BasePlugin, schema: dict[str, Any], span: Span, alias: str
) -> StructuredTool:
    # An explicit empty registry forbids automatic network retrieval of $ref.
    validator = Draft202012Validator(schema, registry=Registry())

    async def invoke(**arguments: Any) -> tuple[str, ToolExecution]:
        validator.validate(arguments)
        writer = get_stream_writer()
        workflow = plugin.typ == "workflow"
        metadata = {"plugin_name": plugin.name, "plugin_type": plugin.typ}
        if workflow:
            metadata.update(
                handoff_type="agent_to_workflow",
                workflow_id=str(getattr(plugin, "flow_id", "")),
            )
        kind = "chain" if workflow else "tool"
        started = int(time.time() * 1000)
        attributes = langfuse_observation_attributes(
            kind, input_value=arguments, metadata=metadata
        )
        attributes["gen_ai.tool.name"] = plugin.name
        with span.start(
            "RunWorkflowPlugin" if workflow else "RunPlugin", attributes=attributes
        ) as sp:
            observed = sp.get_otlp_span()
            response: PluginResponse | None = None
            try:
                result = plugin.run(action_input=arguments, span=sp)
                if inspect.isasyncgen(result):
                    content_parts: dict[str, list[str]] = {
                        "content": [],
                        "reasoning_content": [],
                    }
                    async with aclosing(result):
                        async for frame in result:
                            response = frame
                            if frame.code:
                                break
                            _emit_plugin_frame(frame, content_parts, writer)
                    if response is not None and not response.code:
                        response = response.model_copy(
                            update={
                                "result": {
                                    k: "".join(v) for k, v in content_parts.items()
                                }
                            }
                        )
                else:
                    response = await result
                if response is None:
                    raise ValueError("Plugin returned no result")
                step = _tool_execution(plugin, response, arguments, started)
                if response.code:
                    observed.set_status(Status(StatusCode.ERROR))
                    observed.set_attributes(
                        {
                            "astron.agent.plugin.code": response.code,
                            "langfuse.observation.level": "ERROR",
                            "langfuse.observation.status_message": (
                                f"Plugin execution failed (code={response.code})"
                            ),
                        }
                    )
                output = {"code": response.code, "data": response.result}
                return json.dumps(output, ensure_ascii=False), step
            finally:
                observed.set_attributes(
                    langfuse_observation_attributes(
                        kind,
                        input_value=arguments,
                        output_value=response.result if response else None,
                        metadata=metadata,
                    )
                )

    return StructuredTool.from_function(
        coroutine=invoke,
        name=alias,
        description=(
            f"{plugin.name}: {plugin.description}"
            if alias != plugin.name
            else (plugin.description or plugin.name)
        ),
        args_schema=schema,
        response_format="content_and_artifact",
    )


def _emit_plugin_frame(
    frame: PluginResponse, content_parts: dict[str, list[str]], writer: Any
) -> None:
    if not isinstance(frame.result, dict):
        return
    for key, parts in content_parts.items():
        value = frame.result.get(key)
        if isinstance(value, str) and value:
            parts.append(value)
            writer(AgentResponse(typ=key, content=value, model=""))


def _tool_execution(
    plugin: BasePlugin,
    response: PluginResponse,
    arguments: dict[str, Any],
    started: int,
) -> ToolExecution:
    ended = int(time.time() * 1000)
    response.start_time = response.start_time or started
    response.end_time = response.end_time or ended
    # Each invocation gets its own snapshot: concurrent calls of the same
    # plugin must not overwrite the NodeLog's result/timing.
    snapshot = plugin.model_copy(update={"run_result": response})
    public_output = (
        response.result
        if isinstance(response.result, dict)
        else {"result": response.result}
    )
    if response.code:
        public_output = {**public_output, "code": response.code}
    return ToolExecution(
        action=plugin.name,
        action_input=arguments,
        action_output=public_output,
        tool_type="workflow" if plugin.typ == "workflow" else "tool",
        plugin=snapshot,
    )
