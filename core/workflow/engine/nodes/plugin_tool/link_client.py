import json
import time
from base64 import b64encode
from typing import Any, Dict, List, Tuple

import aiohttp
from jsonschema import Draft202012Validator
from referencing import Registry
from workflow.exception.e import CustomException
from workflow.exception.errors.code_convert import CodeConvert
from workflow.exception.errors.err_code import CodeEnum
from workflow.extensions.otlp.trace.span import Span

_MISSING = object()
_HTTP_METHODS = {"get", "post", "put", "delete", "patch", "head", "options", "trace"}
_CREDENTIAL_HEADERS = {"authorization", "proxy-authorization", "x-api-key", "api-key"}


def _value(schema: dict, name: str, inputs: dict, business: dict) -> Any:
    if schema.get("readOnly"):
        return _MISSING
    default = schema.get(
        "x-value", schema.get("const", schema.get("default", _MISSING))
    )
    if schema.get("format") == "password" or "x-value" in schema or "const" in schema:
        return default
    if "x-display" in schema:
        return inputs.get(name, default) if schema["x-display"] else default
    if schema.get("x-from", 0) == 2:
        return default
    return (business if schema.get("x-from", 0) == 1 else inputs).get(name, default)


def _assemble(schema: dict, inputs: dict, business: dict) -> dict:
    result = {}
    for name, detail in schema.get("properties", {}).items():
        value = _value(detail, name, inputs, business)
        if value is _MISSING:
            continue
        if isinstance(value, dict) and "properties" in detail:
            value = _assemble(detail, value, business.get(name, {}))
        elif isinstance(value, list) and "properties" in detail.get("items", {}):
            value = [_assemble(detail["items"], item, {}) for item in value]
        result[name] = value
    for name, value in inputs.items():
        if (
            name not in schema.get("properties", {})
            and schema.get("additionalProperties", True) is not False
        ):
            result[name] = value
    return result


def _validation_schema(schema: Any) -> Any:
    if isinstance(schema, list):
        return [_validation_schema(item) for item in schema]
    if not isinstance(schema, dict):
        return schema
    normalized = {key: _validation_schema(value) for key, value in schema.items()}
    if normalized.get("nullable") and isinstance(normalized.get("type"), str):
        normalized["type"] = [normalized["type"], "null"]
    for bound in ("Minimum", "Maximum"):
        exclusive = "exclusive" + bound
        if isinstance(normalized.get(exclusive), bool):
            enabled = normalized.pop(exclusive)
            if enabled:
                normalized[exclusive] = normalized.pop(bound.lower())
    if "properties" in normalized:
        normalized["properties"] = {
            name: detail
            for name, detail in normalized["properties"].items()
            if not detail.get("readOnly")
        }
        normalized["required"] = [
            name
            for name in normalized.get("required", [])
            if name in normalized["properties"]
        ]
    return normalized


def _validate(schema: dict, value: Any) -> None:
    # Explicit registry disallows remote $ref fetching from user schemas.
    Draft202012Validator(_validation_schema(schema), registry=Registry()).validate(
        value
    )


class Tool:
    """
    Represents a plugin tool that can be executed through the Link system.

    This class encapsulates a single tool operation with its schema, parameters,
    and execution capabilities. It handles parameter assembly and HTTP communication
    with external tool services.
    """

    def __init__(
        self,
        app_id: str,
        tool_id: str,
        operation_id: str,
        method_schema: dict,
        parameters: dict,
        get_url: str,
        run_url: str,
        version: str,
    ):
        """
        Initialize a Tool instance.

        :param app_id: Application identifier
        :param tool_id: Unique tool identifier
        :param operation_id: Specific operation identifier within the tool
        :param method_schema: OpenAPI schema for the tool method
        :param parameters: Tool parameter definitions
        :param get_url: URL for retrieving tool schema information
        :param run_url: URL for executing tool operations
        :param version: Tool version
        """
        self.app_id = app_id
        self.tool_id = tool_id
        self.operation_id = operation_id
        self.method_schema = method_schema
        self.parameters = parameters
        self.get_url = get_url
        self.run_url = run_url
        self.version = version

    def assemble_parameters(
        self, action_input: dict, business_input: dict
    ) -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
        """
        Assemble HTTP parameters from action and business inputs.

        This method processes the tool's parameter schema and extracts values
        from action_input and business_input to build header, query, and path
        parameters for the HTTP request.

        :param action_input: Action-specific input parameters
        :param business_input: Business-specific input parameters
        :return: Tuple containing (header_params, query_params, path_params)
        """
        header: Dict[str, Any] = {}
        query: Dict[str, Any] = {}
        path: Dict[str, Any] = {}
        parameters_schema = self.method_schema.get("parameters", [])
        # Process each parameter based on its location (header, query, path)
        for parameter in parameters_schema:
            if parameter["in"] == "header":
                self.update_params(header, parameter, action_input, business_input)
            elif parameter["in"] == "query":
                self.update_params(query, parameter, action_input, business_input)
            elif parameter["in"] == "path":
                self.update_params(path, parameter, action_input, business_input)
        return header, query, path

    @staticmethod
    def update_params(
        params: dict, header_parameter: dict, action_input: dict, business_input: dict
    ) -> None:
        """
        Update parameter dictionary with values from appropriate input source.

        This method determines the source of parameter values based on the x-from
        configuration and updates the parameter dictionary accordingly.

        :param params: Parameter dictionary to update
        :param header_parameter: Parameter schema definition
        :param action_input: Action-specific input parameters
        :param business_input: Business-specific input parameters
        """
        schema = dict(header_parameter.get("schema", {}))
        schema.update(
            {
                key: header_parameter[key]
                for key in ("x-value", "x-from", "x-display")
                if key in header_parameter
            }
        )
        name = header_parameter.get("name", "unknown_field")
        if (
            header_parameter.get("in") == "header"
            and name.lower() in _CREDENTIAL_HEADERS
        ):
            schema["x-display"] = False
        value = _value(schema, name, action_input, business_input)
        if value is _MISSING:
            if header_parameter.get("required"):
                raise ValueError("Missing required OpenAPI parameter")
            return
        _validate(schema, value)
        params[name] = value

    def assemble_body(
        self, body_schema: dict, action_input: dict, business_input: dict
    ) -> Dict[str, Any]:
        """
        Assemble request body from schema and input parameters.

        This method recursively processes the body schema to build the request
        body structure, handling nested objects and parameter value resolution.

        :param body_schema: OpenAPI schema for request body
        :param action_input: Action-specific input parameters
        :param business_input: Business-specific input parameters
        :return: Assembled request body dictionary
        """
        result = _assemble(body_schema, action_input, business_input)
        _validate(body_schema, result)
        return result

    @staticmethod
    def dumps(payload: dict | None) -> str:
        """
        Encode payload as base64-encoded JSON string.

        This method converts a dictionary payload to a base64-encoded JSON string
        for transmission through the Link system.

        :param payload: Dictionary payload to encode
        :return: Base64-encoded JSON string or original payload if empty
        """
        if payload is not None:
            return b64encode(json.dumps(payload, ensure_ascii=True).encode()).decode()
        return ""

    async def run(
        self, action_input: dict, business_input: dict, span: Span, **kwargs: Any
    ) -> Dict[str, Any]:
        """
        Execute the tool operation through the Link system.

        This method assembles the request parameters, makes an HTTP call to the
        Link system, and processes the response. It handles parameter encoding,
        request construction, and response parsing.

        :param action_input: Action-specific input parameters
        :param business_input: Business-specific input parameters
        :param span: Tracing span for monitoring execution
        :param kwargs: Additional keyword arguments
        :return: Parsed response data from the tool execution
        :raises CustomException: When tool execution fails or connection errors occur
        """

        with span.start("run_link_tool") as link_tool_span:
            await link_tool_span.add_info_events_async(
                {"tool_id": self.tool_id, "version": self.version}
            )

            start_time = time.time() * 1000
            # Extract request body schema from OpenAPI method schema
            body_schema = (
                self.method_schema.get("requestBody", {})
                .get("content", {})
                .get("application/json", {})
                .get("schema", {})
            )
            await link_tool_span.add_info_events_async(
                {"plugin_node_link_get_cost_time": f"{time.time() * 1000 - start_time}"}
            )

            # Assemble HTTP parameters and request body
            _header, _query, _path = self.assemble_parameters(
                action_input, business_input
            )
            parameter_names = {
                item["name"] for item in self.method_schema.get("parameters", [])
            }
            body_inputs = {
                name: value
                for name, value in action_input.items()
                if name not in parameter_names
            }
            _body = None
            if body_schema:
                assembled = _assemble(body_schema, body_inputs, business_input)
                validator = Draft202012Validator(
                    _validation_schema(body_schema), registry=Registry()
                )
                errors = list(validator.iter_errors(assembled))
                optional_absent = (
                    not self.method_schema.get("requestBody", {}).get("required")
                    and not body_inputs
                )
                missing_required = errors and all(
                    error.validator == "required" for error in errors
                )
                if not optional_absent or (assembled and not missing_required):
                    validator.validate(assembled)
                    _body = assembled

            # Construct Link system request payload
            run_link_payload: Dict[str, Any] = {
                "header": {},
                "parameter": {},
                "payload": {"message": {}},
            }
            run_link_payload["header"]["app_id"] = self.app_id
            run_link_payload["parameter"]["tool_id"] = self.tool_id
            run_link_payload["parameter"]["operation_id"] = self.operation_id
            run_link_payload["parameter"]["version"] = self.version

            run_link_payload["payload"]["message"] = {
                name: self.dumps(value)
                for name, value in {
                    "header": _header,
                    "query": _query,
                    "path": _path,
                    "body": _body,
                }.items()
                if value or (name == "body" and value is not None)
            }

            # Execute HTTP request to Link system

            try:
                # Make asynchronous HTTP request to Link system
                async with aiohttp.ClientSession() as session:
                    start_time = time.time() * 1000
                    async with session.post(
                        self.run_url,
                        json=run_link_payload,
                        timeout=aiohttp.ClientTimeout(total=90),
                    ) as response:
                        link_response = await response.json()
                        # Log response timing and content
                        await link_tool_span.add_info_events_async(
                            {
                                "plugin_node_link_post_cost_time": f"{time.time() * 1000 - start_time}"
                            }
                        )

            except aiohttp.ClientConnectionError as e:
                # Handle transport failures raised by the aiohttp client
                raise CustomException(
                    CodeEnum.SPARK_LINK_CONNECTION_ERROR,
                    err_msg="Tool request failed, connection error",
                    cause_error="Tool request failed, connection error",
                ) from e
            except Exception as e:
                # Handle other exceptions
                raise e

            await link_tool_span.add_info_events_async(
                {"link_code": link_response.get("header", {}).get("code")}
            )

            # Process response and handle errors
            code = link_response["header"]["code"]
            message = link_response["header"]["message"]

            if code != 0:
                # Handle tool execution errors
                raise CustomException(
                    err_code=CodeConvert.sparkLinkCode(code),
                    err_msg=message,
                    cause_error=json.dumps(link_response, ensure_ascii=False),
                )
            else:
                # Extract and parse successful response
                tool_response_text = link_response["payload"]["text"]["text"]
                return json.loads(tool_response_text)


class Link:
    """
    Link system client for managing and executing plugin tools.

    This class handles communication with the Link system to retrieve tool schemas
    and manage tool execution. It parses OpenAPI schemas and creates Tool instances
    for each available operation.
    """

    const_headers = {"Content-Type": "application/json"}

    def __init__(
        self,
        app_id: str,
        tool_ids: list[str],
        get_url: str,
        run_url: str,
        version: str = "V1.0",
    ):
        """
        Initialize Link client instance.

        :param app_id: Application identifier
        :param tool_ids: List of tool identifiers to manage
        :param get_url: URL for retrieving tool schema information
        :param run_url: URL for executing tool operations
        :param version: Tool version (default: "V1.0")
        """
        self.app_id = app_id
        self.tool_ids = tool_ids
        self.get_url = get_url
        self.run_url = run_url
        self.version = version
        self.open_api_schema_list: List[Dict[str, Any]] = []
        self.tools: List[Tool] = []

    async def load_tools(self) -> None:
        self.open_api_schema_list = await self.tool_schema_list()
        self.parse_react_schema_list()

    async def tool_schema_list(self) -> List[Dict[str, Any]]:
        """
        Query tool schema list from Spark Link subsystem.

        This method makes an HTTP request to retrieve the OpenAPI schemas
        for the specified tools from the Link system.

        :return: List of tool schema dictionaries
        """
        params = {
            "tool_ids": self.tool_ids,
            "versions": [self.version],
            "app_id": self.app_id,
        }

        async with aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30)
        ) as session:
            async with session.get(
                self.get_url, headers=self.const_headers, params=params
            ) as response:
                response.raise_for_status()
                response_json = await response.json()
        code = response_json.get("code", 0)
        if code != 0:
            raise CustomException(
                err_code=CodeConvert.sparkLinkCode(code),
                err_msg=response_json.get("message", ""),
                cause_error=json.dumps(response_json, ensure_ascii=False),
            )
        tools = response_json.get("data", {}).get("tools", [])
        actual = {(row.get("id"), row.get("version")) for row in tools}
        if not {(tool_id, self.version) for tool_id in self.tool_ids}.issubset(actual):
            raise CustomException(
                CodeEnum.SPARK_LINK_TOOL_NOT_EXIST_ERROR,
                err_msg="Tool version is unavailable",
            )
        return tools

    def parse_react_schema_list(self) -> None:
        """
        Parse OpenAPI schemas and generate Tool instances for ReAct framework.

        This method processes the retrieved OpenAPI schemas to create Tool instances
        for each available operation. It handles both query parameters and request
        body parameters, merging them into a unified parameter structure.
        """
        for tool_schema in self.open_api_schema_list:
            tool_id = tool_schema.get("id")
            if tool_id is None:
                raise CustomException(
                    CodeEnum.SPARK_LINK_TOOL_NOT_EXIST_ERROR,
                    err_msg="Tool ID is empty",
                    cause_error=json.dumps(tool_schema, ensure_ascii=False),
                )
            tool_schema = json.loads(tool_schema.get("schema", "{}"))
            # Process each path and method in the OpenAPI schema
            for path, path_schema in tool_schema.get("paths", {}).items():
                for method, method_schema in path_schema.items():
                    if method not in _HTTP_METHODS:
                        continue
                    action_name = method_schema.get("operationId", "")
                    inherited = {
                        (p["in"], p["name"]): p
                        for p in path_schema.get("parameters", [])
                    }
                    inherited.update(
                        {
                            (p["in"], p["name"]): p
                            for p in method_schema.get("parameters", [])
                        }
                    )
                    method_schema = {
                        **method_schema,
                        "parameters": list(inherited.values()),
                    }
                    # Create Tool execution instance
                    tool = Tool(
                        app_id=self.app_id,
                        tool_id=tool_id,
                        operation_id=action_name,
                        method_schema=method_schema,
                        parameters={},
                        get_url=self.get_url,
                        run_url=self.run_url,
                        version=self.version,
                    )
                    self.tools.append(tool)
