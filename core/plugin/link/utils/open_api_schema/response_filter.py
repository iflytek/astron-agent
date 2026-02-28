"""OpenAPI response filtering utilities.

This module provides utilities for extracting response schema from OpenAPI
documents and filtering response payloads based on x-display settings.
"""

from typing import Any, Dict, List, Optional, Tuple

from jsonpath_rw import parse


def get_response_schema(openapi_schema: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Get response schema from tool's OpenAPI schema."""
    # Step 1: extract response JSON schema from the tool's OpenAPI schema.
    # Read responses -> 200 -> application/json -> schema by convention.
    if openapi_schema is None:
        return {}
    paths = openapi_schema.get("paths", {})
    response_schema = {}
    for _, method_dict in paths.items():
        for _, method in method_dict.items():
            response_schema = (
                method.get("responses", {})
                .get("200", {})
                .get("content", {})
                .get("application/json", {})
                .get("schema", {})
            )
    return response_schema


def _parse_required_property_name(message: str) -> Optional[str]:
    if "is a required property" not in message:
        return None
    first_quote = message.find("'")
    if first_quote < 0:
        return None
    second_quote = message.find("'", first_quote + 1)
    if second_quote < 0:
        return None
    return message[first_quote + 1 : second_quote]


def _build_token_path_for_missing_required(
    err_path: List[Any], missing_required: str
) -> List[str]:
    token_path: List[str] = []
    for path_token in err_path:
        if isinstance(path_token, int):
            token_path.append("[*]")
        else:
            token_path.append(str(path_token))
    token_path.append(missing_required)
    return token_path


def _schema_node_is_x_display_false(schema_node: Any, token_path: List[str]) -> bool:
    node: Any = schema_node
    for token in token_path:
        if not isinstance(node, dict):
            return False
        node_type = node.get("type")
        if token == "[*]":
            if node_type != "array":
                return False
            node = node.get("items", {})
            continue
        if node_type != "object":
            return False
        node = node.get("properties", {}).get(token)
        if node is None:
            return False
    return isinstance(node, dict) and node.get("x-display") is False


def should_ignore_validation_error_by_x_display(
    err: Any, response_schema: Dict[str, Any]
) -> bool:
    """Return True when a schema error should be ignored because target field is hidden."""
    missing_required = _parse_required_property_name(getattr(err, "message", ""))
    if not missing_required:
        return False
    token_path = _build_token_path_for_missing_required(
        list(getattr(err, "path", [])), missing_required
    )
    return _schema_node_is_x_display_false(response_schema, token_path)


def _build_json_path(path_tokens: List[str]) -> str:
    """Build json path from path tokens."""
    if not path_tokens:
        return "$"

    json_path = "$"
    for token in path_tokens:
        if token == "[*]":
            json_path += "[*]"
        else:
            json_path += f".{token}"
    return json_path


def _extract_schema_tokens(jsonpath_node: Any) -> List[str]:
    if hasattr(jsonpath_node, "left") and hasattr(jsonpath_node, "right"):
        return _extract_schema_tokens(jsonpath_node.left) + _extract_schema_tokens(
            jsonpath_node.right
        )
    if hasattr(jsonpath_node, "fields"):
        return list(getattr(jsonpath_node, "fields", []))
    if hasattr(jsonpath_node, "index"):
        return [str(getattr(jsonpath_node, "index"))]
    return []


def _schema_path_to_data_path(schema_path: Any) -> str:
    tokens = _extract_schema_tokens(schema_path)
    data_tokens: List[str] = []
    for token in tokens:
        if token == "properties":
            continue
        if token == "items":
            data_tokens.append("[*]")
            continue
        data_tokens.append(token)
    return _build_json_path(data_tokens)


def apply_jsonpath_pruning(
    data: Any,
    delete_paths: List[str],
    empty_paths: Dict[str, str],
) -> Any:
    """Apply delete and replace rules using JSONPath."""
    import copy

    data = copy.deepcopy(data)

    def _apply_matches(matches: List[Any], kind: Optional[str]) -> None:
        for match in matches:
            context = match.context.value
            if isinstance(context, dict):
                if kind is None:
                    context.pop(match.path.fields[0], None)
                else:
                    context[match.path.fields[0]] = {} if kind == "object" else []
            elif isinstance(context, list):
                idx = match.path.index
                if 0 <= idx < len(context):
                    if kind is None:
                        context.pop(idx)
                    else:
                        context[idx] = {} if kind == "object" else []

    for path_expr in delete_paths:
        expr = parse(path_expr)
        _apply_matches(expr.find(data), None)

    for path_expr, kind in empty_paths.items():
        expr = parse(path_expr)
        _apply_matches(expr.find(data), kind)

    return data


def _collect_hidden_paths(schema: Dict[str, Any]) -> Tuple[List[str], Dict[str, str]]:
    """Collect hidden-field paths and container-empty paths using JSONPath."""
    if not isinstance(schema, dict):
        return [], {}

    need_be_poped_list: List[str] = []
    need_be_emptied_map: Dict[str, str] = {}

    json_expr = '$..["x-display"]'
    matches = parse(json_expr).find(schema)

    for match in matches:
        if match.value is not False:
            continue
        schema_path = match.full_path.left if hasattr(match.full_path, "left") else None
        path_str = _schema_path_to_data_path(schema_path) if schema_path else "$"
        need_be_poped_list.append(path_str)

        schema_node = match.context.value
        if isinstance(schema_node, dict):
            value_type = schema_node.get("type", "object")
            if value_type in ("object", "array"):
                need_be_emptied_map[path_str] = value_type

    return need_be_poped_list, need_be_emptied_map


def filter_response_by_x_display(
    result_json: Any, open_api_schema: Dict[str, Any]
) -> Any:
    """Filter response payload by x-display settings in response schema."""
    # Step 1: get response schema.
    response_schema = get_response_schema(open_api_schema)
    if not response_schema:
        return result_json

    # Step 2: collect field paths that should be removed.
    need_be_poped_list, need_be_emptied_map = _collect_hidden_paths(response_schema)

    # Step 3: response validation is done by the caller,
    # e.g. execution_server.py calls validate_response_schema first.
    # This function only filters responses that already passed validation.
    filtered_json = result_json

    # Step 4: apply delete/empty operations using JSONPath.
    filtered_json = apply_jsonpath_pruning(
        filtered_json, need_be_poped_list, need_be_emptied_map
    )

    # Step 5: return the filtered response.
    return filtered_json
