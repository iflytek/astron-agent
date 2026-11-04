import asyncio
import json
import os
import re
import time
from base64 import b64encode
from typing import Any, List, Union

import aiohttp
from common.otlp.trace.span import Span
from jsonschema import Draft202012Validator, SchemaError, ValidationError
from pydantic import BaseModel
from referencing import Registry

from agent.exceptions.plugin_exc import GetToolSchemaExc, PluginExc, RunToolExc
from agent.service.plugin.base import BasePlugin, PluginResponse

# OpenAPI transport stays in core/link; this adapter only projects model arguments.
_MISSING = object()
_HTTP_METHODS = {"get", "post", "put", "delete", "patch", "head", "options", "trace"}
_UNSUPPORTED_SCHEMA = {
    "$ref",
    "$dynamicRef",
    "allOf",
    "anyOf",
    "oneOf",
    "not",
    "if",
    "then",
    "else",
    "dependentSchemas",
    "dependentRequired",
    "patternProperties",
    "prefixItems",
    "unevaluatedProperties",
    "unevaluatedItems",
    "contains",
    "discriminator",
    "$defs",
    "definitions",
    "dependencies",
    "additionalItems",
    "propertyNames",
}
_SCALAR_SCHEMA_KEYS = {
    "type",
    "description",
    "title",
    "enum",
    "const",
    "minLength",
    "maxLength",
    "pattern",
    "format",
    "minimum",
    "maximum",
    "exclusiveMinimum",
    "exclusiveMaximum",
    "multipleOf",
    "minItems",
    "maxItems",
    "uniqueItems",
    "minProperties",
    "maxProperties",
}
_CREDENTIAL_HEADERS = {"authorization", "proxy-authorization", "x-api-key", "api-key"}


def _source(schema: dict[str, Any]) -> str:
    if ("x-display" in schema and not isinstance(schema["x-display"], bool)) or (
        "x-from" in schema and schema["x-from"] not in (0, 1, 2)
    ):
        raise GetToolSchemaExc("Unsupported OpenAPI parameter source")
    if schema.get("format") == "password":
        return "fixed"
    if "x-value" in schema or "const" in schema or schema.get("readOnly"):
        return "fixed"
    if "x-display" in schema:
        return "model" if schema["x-display"] else "fixed"
    return {0: "model", 1: "business", 2: "fixed"}.get(schema.get("x-from", 0), "model")


def _json_schema(schema: dict[str, Any], *, public: bool = False) -> dict[str, Any]:
    """Project inline OpenAPI schemas without copying hidden values into tool metadata."""
    if not isinstance(schema, dict) or _UNSUPPORTED_SCHEMA.intersection(schema):
        raise GetToolSchemaExc("Unsupported OpenAPI request schema")
    if any(isinstance(value, (dict, list)) for value in schema.get("enum", [])):
        raise GetToolSchemaExc("Composite OpenAPI enum values are unsupported")
    result = {key: value for key, value in schema.items() if key in _SCALAR_SCHEMA_KEYS}
    _normalize_openapi_bounds(result, schema)
    if "properties" in schema:
        result.setdefault("type", "object")
        result["properties"], result["required"] = _object_projection(schema, public)
    elif schema.get("required"):
        raise GetToolSchemaExc("Unsupported OpenAPI object without declared properties")
    for key in ("items", "additionalProperties"):
        if key in schema:
            value = schema[key]
            if isinstance(value, dict) and _source(value) != "model":
                raise GetToolSchemaExc(
                    "Fixed dynamic OpenAPI value schemas are unsupported"
                )
            result[key] = (
                _json_schema(value, public=public) if isinstance(value, dict) else value
            )
    try:
        Draft202012Validator.check_schema(result)
    except SchemaError:
        raise GetToolSchemaExc("Invalid OpenAPI request schema") from None
    return result


def _object_projection(
    schema: dict[str, Any], public: bool
) -> tuple[dict[str, Any], list[str]]:
    properties, required = schema["properties"], schema.get("required", [])
    if (
        not isinstance(properties, dict)
        or not isinstance(required, list)
        or not all(isinstance(name, str) for name in required)
        or not set(required).issubset(properties)
    ):
        raise GetToolSchemaExc("Invalid OpenAPI object properties")
    if {"minProperties", "maxProperties", "enum", "const"}.intersection(schema):
        raise GetToolSchemaExc("Unsupported OpenAPI object-wide constraints")
    projected = {}
    for name, detail in properties.items():
        if detail.get("readOnly"):
            continue
        hidden = _source(detail) != "model"
        if hidden and name in required and _value(detail, name, {}, {}) is _MISSING:
            raise GetToolSchemaExc(
                "Required hidden OpenAPI property has no configured value"
            )
        if not (public and hidden):
            projected[name] = _json_schema(detail, public=public)
    return projected, [name for name in required if name in projected]


def _normalize_openapi_bounds(result: dict[str, Any], schema: dict[str, Any]) -> None:
    if schema.get("nullable") and isinstance(result.get("type"), str):
        result["type"] = [result["type"], "null"]
    for bound in ("Minimum", "Maximum"):
        exclusive = "exclusive" + bound
        if isinstance(result.get(exclusive), bool):
            enabled = result.pop(exclusive)
            if enabled:
                inclusive = bound.lower()
                if inclusive not in result:
                    raise GetToolSchemaExc("Invalid OpenAPI exclusive bound")
                result[exclusive] = result.pop(inclusive)


def _parameter_schema(parameter: dict[str, Any]) -> dict[str, Any]:
    location = parameter.get("in")
    if "$ref" in parameter or location not in {"header", "query", "path"}:
        raise GetToolSchemaExc("Unsupported OpenAPI parameter location or reference")
    name = parameter.get("name")
    if (
        not isinstance(name, str)
        or not name
        or not isinstance(parameter.get("schema"), dict)
    ):
        raise GetToolSchemaExc("OpenAPI parameter requires a name and inline schema")
    schema = dict(parameter["schema"])
    for key in ("x-value", "x-from", "x-display"):
        if key in parameter:
            schema[key] = parameter[key]
    default_style = "form" if location == "query" else "simple"
    if (
        parameter.get("style", default_style) != default_style
        or schema.get("type") in ("object", "array")
        or isinstance(schema.get("type"), list)
        or "content" in parameter
        or parameter.get("allowReserved")
    ):
        raise GetToolSchemaExc("Unsupported OpenAPI parameter serialization")
    if location == "header" and name.lower() in _CREDENTIAL_HEADERS:
        schema["x-display"] = False
    if location == "path" and parameter.get("required") is not True:
        raise GetToolSchemaExc("OpenAPI path parameters must be required")
    if parameter.get("description"):
        schema["description"] = parameter["description"]
    normalized = _json_schema(schema)
    if normalized.get("type") not in (None, "string", "integer", "number", "boolean"):
        raise GetToolSchemaExc("Unsupported OpenAPI parameter serialization")
    return schema


def _body_schema(method_schema: dict[str, Any]) -> dict[str, Any]:
    body = method_schema.get("requestBody")
    if body is None:
        return {}
    content = body.get("content", {})
    if "$ref" in body or set(content) != {"application/json"}:
        raise GetToolSchemaExc(
            "Only inline application/json request bodies are supported"
        )
    schema = content["application/json"].get("schema", {})
    if schema.get("type", "object") != "object" or "properties" not in schema:
        raise GetToolSchemaExc("JSON request body must declare object properties")
    _json_schema(schema)
    return schema


def _value(
    schema: dict[str, Any], name: str, inputs: dict[str, Any], business: dict[str, Any]
) -> Any:
    if schema.get("readOnly"):
        return _MISSING
    default = schema.get(
        "x-value", schema.get("const", schema.get("default", _MISSING))
    )
    source = _source(schema)
    if source == "model":
        return inputs.get(name, default)
    if source == "business":
        return business.get(name, default)
    return default


def _assemble_value(
    schema: dict[str, Any], value: Any, business: dict[str, Any]
) -> Any:
    if isinstance(value, dict):
        return _assemble_object(schema, value, business)
    if isinstance(value, list) and isinstance(schema.get("items"), dict):
        return [_assemble_value(schema["items"], item, business) for item in value]
    return value


def _assemble_object(
    schema: dict[str, Any], inputs: dict[str, Any], business: dict[str, Any]
) -> dict[str, Any]:
    properties = schema.get("properties", {})
    result = {}
    for name, detail in properties.items():
        value = _value(detail, name, inputs, business)
        if value is _MISSING:
            continue
        nested_business = business.get(name, {})
        result[name] = _assemble_value(
            detail, value, nested_business if isinstance(nested_business, dict) else {}
        )
    additional = schema.get("additionalProperties", True)
    for name, value in inputs.items():
        if name not in properties and additional is not False:
            result[name] = (
                _assemble_value(additional, value, {})
                if isinstance(additional, dict)
                else value
            )
    return result


def _validate_value(schema: dict[str, Any], value: Any) -> None:
    try:
        Draft202012Validator(_json_schema(schema), registry=Registry()).validate(value)
    except ValidationError:
        raise RunToolExc("Invalid OpenAPI tool arguments") from None


class LinkPluginRunner(BaseModel):
    app_id: str
    uid: str
    tool_id: str
    version: str
    operation_id: str
    method_schema: dict[str, Any]

    def assemble_parameters(
        self, action_input: dict[str, Any], business_input: dict[str, Any]
    ) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
        sections: dict[str, dict[str, Any]] = {"header": {}, "query": {}, "path": {}}
        for parameter in self.method_schema.get("parameters", []):
            schema = _parameter_schema(parameter)
            name = parameter["name"]
            value = _value(schema, name, action_input, business_input)
            if value is _MISSING:
                if parameter.get("required"):
                    raise RunToolExc("Missing required OpenAPI parameter")
                continue
            _validate_value(schema, value)
            sections[parameter["in"]][name] = value
        return sections["header"], sections["query"], sections["path"]

    def assemble_body(
        self,
        body_schema: dict[str, Any],
        action_input: dict[str, Any],
        business_input: dict[str, Any],
    ) -> dict[str, Any] | None:
        if not body_schema:
            return None
        parameter_names = {
            item["name"] for item in self.method_schema.get("parameters", [])
        }
        inputs = {
            key: value
            for key, value in action_input.items()
            if key not in parameter_names
        }
        result = _assemble_object(body_schema, inputs, business_input)
        if (
            not inputs
            and not result
            and not self.method_schema.get("requestBody", {}).get("required")
        ):
            return None
        _validate_value(body_schema, result)
        return result

    @staticmethod
    def dumps(payload: dict[str, Any] | None) -> str:
        if payload is not None:
            return b64encode(json.dumps(payload, ensure_ascii=True).encode()).decode()
        return ""

    async def run(self, action_input: dict[str, Any], span: Span) -> PluginResponse:
        """Call link"""
        with span.start("Run") as sp:
            start_time = int(round(time.time() * 1000))
            body_schema = _body_schema(self.method_schema)
            header, query, path = self.assemble_parameters(action_input, {})
            body = self.assemble_body(body_schema, action_input, {})
            message = {
                name: self.dumps(value)
                for name, value in {
                    "header": header,
                    "query": query,
                    "path": path,
                    "body": body,
                }.items()
                if value or (name == "body" and value is not None)
            }
            run_link_payload = {
                "header": {"app_id": self.app_id, "uid": self.uid},
                "parameter": {
                    "tool_id": self.tool_id,
                    "operation_id": self.operation_id,
                    "version": self.version,
                },
                "payload": {"message": message},
            }
            sp.add_info_events({"tool_id": self.tool_id, "version": self.version})
            # Finished parsing parameters, start calling link
            result: dict[str, Any] = {}
            try:
                run_url = os.getenv("RUN_LINK_URL")
                if not run_url:
                    raise RunToolExc("RUN_LINK_URL is not set")
                timeout = aiohttp.ClientTimeout(
                    total=int(os.getenv("LINK_CALL_TIMEOUT", "90"))
                )
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        run_url,
                        data=json.dumps(run_link_payload),
                        timeout=timeout,
                        headers={"Content-Type": "application/json"},
                    ) as response:
                        response.raise_for_status()
                        if response.status == 200:
                            result = await response.json()
                            sp.add_info_events({"tool-response-received": True})
                        else:
                            sp.add_info_events(
                                attributes={
                                    "link-plugin-run-outputs": (
                                        f"response code is {response.status}"
                                    )
                                }
                            )
                            raise RunToolExc
            except (asyncio.TimeoutError, aiohttp.ClientError, ValueError):
                raise RunToolExc from None

            end_time = int(round(time.time() * 1000))
            plugin_response = PluginResponse(
                code=result.get("header", {}).get("code", -1),
                sid=result.get("header", {}).get("sid", ""),
                start_time=start_time,
                end_time=end_time,
                result=result,
                log=[
                    {
                        "name": self.operation_id,
                        "input": action_input,
                        "output": result,
                    }
                ],
            )

            return plugin_response


class LinkPlugin(BasePlugin):
    tool_id: str


class LinkPluginFactory(BaseModel):
    app_id: str
    uid: str
    tool_ids: List[Union[str, dict[str, Any]]]

    async def gen(self, span: Span) -> list[LinkPlugin]:
        try:
            return await self.parse_react_schema_list(span)
        except PluginExc:
            raise
        except Exception:
            raise GetToolSchemaExc() from None

    async def tool_schema_list(self, span: Span) -> list[dict[str, Any]]:
        """Query protocol list from spark link subsystem"""
        with span.start("ToolSchemaList") as sp:
            if not self.tool_ids:
                return []

            base_url = os.getenv("VERSIONS_LINK_URL") or ""
            url = base_url + "?" + f"app_id={self.app_id}"

            for tool_id in self.tool_ids:
                if isinstance(tool_id, str):
                    url += "&tool_ids=" + tool_id + "&versions=V1.0"
                elif isinstance(tool_id, dict):
                    tl_id = tool_id.get("tool_id", "")
                    tl_version = tool_id.get("version", "")
                    url += "&tool_ids=" + tl_id + "&versions=" + tl_version
            sp.add_info_events({"requested-tool-count": len(self.tool_ids)})
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(url) as response:
                        response.raise_for_status()
                        if response.status == 200:
                            result = await response.json()
                            return self._validated_tool_schemas(result)

                        sp.add_info_events(
                            attributes={
                                "link-plugin-tool-schema-list-outputs": (
                                    f"response code is {response.status}"
                                )
                            }
                        )
                        raise GetToolSchemaExc
            except (aiohttp.ClientError, ValueError, TypeError, AttributeError):
                raise GetToolSchemaExc from None

    def _validated_tool_schemas(self, result: dict[str, Any]) -> list[dict[str, Any]]:
        if result.get("code") != 0:
            raise GetToolSchemaExc
        tools_data = result.get("data", {}).get("tools", [])
        if not isinstance(tools_data, list) or not tools_data:
            raise GetToolSchemaExc
        expected = {
            (
                (item, "V1.0")
                if isinstance(item, str)
                else (item.get("tool_id"), item.get("version"))
            )
            for item in self.tool_ids
        }
        actual = {
            (item.get("id"), item.get("version"))
            for item in tools_data
            if isinstance(item, dict)
        }
        if not expected.issubset(actual):
            raise GetToolSchemaExc
        return tools_data

    @staticmethod
    def parse_request_parameters_schema(
        parameters: list[dict[str, Any]],
    ) -> tuple[dict[str, dict[str, Any]], set[str]]:
        properties: dict[str, dict[str, Any]] = {}
        required: set[str] = set()
        for parameter in parameters:
            schema = _parameter_schema(parameter)
            name = parameter["name"]
            if _source(schema) != "model":
                if (
                    parameter.get("required")
                    and _value(schema, name, {}, {}) is _MISSING
                ):
                    raise GetToolSchemaExc(
                        "Required hidden OpenAPI parameter has no configured value"
                    )
                continue
            if name in properties:
                raise GetToolSchemaExc("Ambiguous OpenAPI parameter names")
            properties[name] = _json_schema(schema, public=True)
            if parameter.get("required"):
                required.add(name)
        return properties, required

    def _create_plugin(
        self, tool_id: str, version: str, method_schema: dict[str, Any]
    ) -> LinkPlugin:
        parameters, required = self.parse_request_parameters_schema(
            method_schema.get("parameters", [])
        )
        body = _body_schema(method_schema)
        public_body = _json_schema(body, public=True)
        body_properties = public_body.get("properties", {})
        parameter_names = {item["name"] for item in method_schema.get("parameters", [])}
        if parameter_names & body.get("properties", {}).keys():
            raise GetToolSchemaExc("Ambiguous OpenAPI body and parameter names")
        # A single flat argument namespace preserves existing Link tools; body objects stay nested.
        properties = {**parameters, **body_properties}
        body_required = public_body.get("required", [])
        if method_schema.get("requestBody", {}).get("required"):
            required.update(body_required)
        model_schema = {
            **public_body,
            "type": "object",
            "properties": properties,
            "required": sorted(required),
        }
        model_schema["additionalProperties"] = False
        if body_required and not method_schema.get("requestBody", {}).get("required"):
            model_schema["dependentRequired"] = {
                name: body_required for name in body_properties
            }
        action_name = method_schema.get("operationId", "")
        if not action_name:
            raise GetToolSchemaExc("OpenAPI operationId is required")
        description = method_schema.get("description", method_schema.get("summary", ""))
        return LinkPlugin(
            tool_id=tool_id,
            name=action_name,
            description=description,
            schema_template=f"tool_name:{action_name}, tool_description:{description}, tool_parameters:{json.dumps(model_schema, ensure_ascii=False)}",
            typ="link",
            run=LinkPluginRunner(
                app_id=self.app_id,
                uid=self.uid,
                tool_id=tool_id,
                version=version,
                operation_id=action_name,
                method_schema=method_schema,
            ).run,
        )

    @staticmethod
    def _operation_schema(
        path: str, path_schema: dict[str, Any], operation: dict[str, Any]
    ) -> dict[str, Any]:
        if "$ref" in path_schema:
            raise GetToolSchemaExc("Referenced OpenAPI paths are unsupported")
        merged = {}
        for items in (
            path_schema.get("parameters", []),
            operation.get("parameters", []),
        ):
            seen = set()
            for parameter in items:
                _parameter_schema(parameter)
                key = (parameter["in"], parameter["name"])
                if key in seen:
                    raise GetToolSchemaExc("Duplicate OpenAPI parameter")
                seen.add(key)
                merged[key] = parameter
        path_names = {name for location, name in merged if location == "path"}
        if set(re.findall(r"\{([^{}]+)\}", path)) != path_names:
            raise GetToolSchemaExc(
                "OpenAPI path parameters do not match the URL template"
            )
        return {**operation, "parameters": list(merged.values())}

    async def parse_react_schema_list(self, span: Span) -> list[LinkPlugin]:
        """Adapt configured OpenAPI operations to the existing Agent tool bridge."""
        with span.start("ParseReactSchemaList") as sp:
            tools: list[LinkPlugin] = []
            for tool_schema in await self.tool_schema_list(sp):
                tool_id, version = tool_schema.get("id"), tool_schema.get("version")
                if tool_id is None or version is None:
                    raise GetToolSchemaExc
                schema = json.loads(tool_schema.get("schema", "{}"))
                before_count = len(tools)
                for path, path_schema in schema.get("paths", {}).items():
                    for method, operation in path_schema.items():
                        if method.lower() not in _HTTP_METHODS:
                            continue
                        method_schema = self._operation_schema(
                            path, path_schema, operation
                        )
                        tools.append(
                            self._create_plugin(tool_id, version, method_schema)
                        )
                if len(tools) == before_count:
                    raise GetToolSchemaExc
            return tools
