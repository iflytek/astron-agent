from __future__ import annotations

from typing import Any, Dict, List, Optional


def _is_x_display_false(schema: Dict[str, Any]) -> bool:
    value = schema.get("x-display")
    if value is False:
        return True
    if isinstance(value, str):
        return value.strip().lower() == "false"
    return False


def extract_response_schema(openapi_schema: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Extract the 200 response JSON schema from a single-endpoint OpenAPI schema."""
    if not isinstance(openapi_schema, dict):
        return {}

    paths = openapi_schema.get("paths")
    if not isinstance(paths, dict) or not paths:
        return {}

    for _, method_dict in paths.items():
        if not isinstance(method_dict, dict):
            continue
        for _, method_schema in method_dict.items():
            if not isinstance(method_schema, dict):
                continue
            response_schema = (
                method_schema.get("responses", {})
                .get("200", {})
                .get("content", {})
                .get("application/json", {})
                .get("schema", {})
            )
            return response_schema if isinstance(response_schema, dict) else {}
    return {}


def get_response_schema(openapi_schema: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Backward-compatible entry for extracting response schema."""
    try:
        from plugin.link.service.community.tools.http.execution_server import (
            get_response_schema as execution_server_get_response_schema,
        )

        return execution_server_get_response_schema(openapi_schema)
    except Exception:
        return extract_response_schema(openapi_schema)


def _infer_schema_type(schema: Dict[str, Any]) -> Optional[str]:
    node_type = schema.get("type")
    if isinstance(node_type, str):
        return node_type
    if isinstance(node_type, list):
        explicit_types = [item for item in node_type if isinstance(item, str)]
        if explicit_types:
            if "object" in explicit_types:
                return "object"
            if "array" in explicit_types:
                return "array"
            return explicit_types[0]
    if isinstance(schema.get("properties"), dict):
        return "object"
    if "items" in schema:
        return "array"
    return None


def _extract_items_schema(schema: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    items = schema.get("items")
    if isinstance(items, dict):
        return items
    if isinstance(items, list) and items and isinstance(items[0], dict):
        return items[0]
    return None


def _resolve_local_ref(
    openapi_schema: Dict[str, Any], ref: str
) -> Optional[Dict[str, Any]]:
    if not isinstance(ref, str) or not ref.startswith("#/"):
        return None

    node: Any = openapi_schema
    for token in ref[2:].split("/"):
        if not isinstance(node, dict):
            return None
        node = node.get(token)

    if not isinstance(node, dict):
        return None
    return node


def _resolve_schema_refs(
    schema: Dict[str, Any],
    openapi_schema: Dict[str, Any],
    seen_refs: Optional[set[str]] = None,
) -> Dict[str, Any]:
    if not isinstance(schema, dict):
        return {}

    if seen_refs is None:
        seen_refs = set()

    schema = _resolve_current_schema_ref(schema, openapi_schema, seen_refs)

    resolved_schema: Dict[str, Any] = dict(schema)

    _resolve_properties_in_place(resolved_schema, openapi_schema, seen_refs)
    _resolve_items_in_place(resolved_schema, openapi_schema, seen_refs)

    return resolved_schema


def _resolve_current_schema_ref(
    schema: Dict[str, Any],
    openapi_schema: Dict[str, Any],
    seen_refs: set[str],
) -> Dict[str, Any]:
    # Resolve local $ref first, then let inline fields override resolved fields.
    # This follows JSON Schema/OpenAPI merge behavior and keeps extension keys.
    ref = schema.get("$ref")
    if not isinstance(ref, str):
        return schema
    if ref in seen_refs:
        return {k: v for k, v in schema.items() if k != "$ref"}

    resolved = _resolve_local_ref(openapi_schema, ref)
    if not isinstance(resolved, dict):
        return schema

    merged = dict(_resolve_schema_refs(resolved, openapi_schema, seen_refs | {ref}))
    for key, value in schema.items():
        if key != "$ref":
            merged[key] = value
    return merged


def _resolve_properties_in_place(
    schema: Dict[str, Any],
    openapi_schema: Dict[str, Any],
    seen_refs: set[str],
) -> None:
    properties = schema.get("properties")
    if not isinstance(properties, dict):
        return

    schema["properties"] = {
        key: (
            _resolve_schema_refs(value, openapi_schema, seen_refs)
            if isinstance(value, dict)
            else value
        )
        for key, value in properties.items()
    }


def _resolve_items_in_place(
    schema: Dict[str, Any],
    openapi_schema: Dict[str, Any],
    seen_refs: set[str],
) -> None:
    items = schema.get("items")
    if isinstance(items, dict):
        schema["items"] = _resolve_schema_refs(items, openapi_schema, seen_refs)
        return
    if isinstance(items, list):
        schema["items"] = [
            (
                _resolve_schema_refs(item, openapi_schema, seen_refs)
                if isinstance(item, dict)
                else item
            )
            for item in items
        ]


def _prepare_response_schema(
    response_schema: Dict[str, Any], openapi_schema: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Normalize response schema before filtering/validation checks."""
    if not isinstance(response_schema, dict) or not response_schema:
        return {}
    if isinstance(openapi_schema, dict):
        return _resolve_schema_refs(response_schema, openapi_schema)
    return response_schema


def _join_path(parent: str, token: str) -> str:
    # Keep a normalized JSONPath-like form used by hidden-path collection
    # and missing-visible-path checks (e.g. $.users[*].name).
    if token == "[*]":
        return f"{parent}[*]"
    if parent == "$":
        return f"$.{token}"
    return f"{parent}.{token}"


def _collect_hidden_paths(
    schema: Dict[str, Any], current_path: str, paths: List[str]
) -> None:
    if not isinstance(schema, dict):
        return

    if _is_x_display_false(schema):
        paths.append(current_path)
        return

    node_type = _infer_schema_type(schema)
    if node_type == "object":
        properties = schema.get("properties")
        if not isinstance(properties, dict):
            return
        for name, prop_schema in properties.items():
            if not isinstance(prop_schema, dict):
                continue
            _collect_hidden_paths(prop_schema, _join_path(current_path, name), paths)
        return

    if node_type == "array":
        items = _extract_items_schema(schema)
        if not isinstance(items, dict):
            return
        if _is_x_display_false(items):
            paths.append(_join_path(current_path, "[*]"))
            return
        _collect_hidden_paths(items, _join_path(current_path, "[*]"), paths)


def get_need_be_poped_list(response_schema: Dict[str, Any]) -> List[str]:
    """Backward-compatible name for hidden paths computed from response schema."""
    if not isinstance(response_schema, dict) or not response_schema:
        return []
    hidden_paths: List[str] = []
    _collect_hidden_paths(response_schema, "$", hidden_paths)
    return hidden_paths


def _filter_value(value: Any, schema: Dict[str, Any]) -> Any:
    if not isinstance(schema, dict):
        return value

    if _is_x_display_false(schema):
        return _Removed

    node_type = _infer_schema_type(schema)

    if node_type == "object":
        return _filter_object_value(value, schema)

    if node_type == "array":
        return _filter_array_value(value, schema)

    return value


def _filter_object_value(value: Any, schema: Dict[str, Any]) -> Any:
    if not isinstance(value, dict):
        return value
    properties = schema.get("properties")
    if not isinstance(properties, dict):
        return value

    filtered: Dict[str, Any] = {}
    for key, val in value.items():
        prop_schema = properties.get(key)
        if not isinstance(prop_schema, dict):
            filtered[key] = val
            continue

        child = _filter_value(val, prop_schema)
        if child is _Removed:
            continue
        filtered[key] = child
    return filtered


def _filter_array_value(value: Any, schema: Dict[str, Any]) -> Any:
    items_schema = _extract_items_schema(schema)
    if not isinstance(items_schema, dict):
        return value
    if _is_x_display_false(items_schema):
        return []
    if not isinstance(value, list):
        return value

    filtered_items: List[Any] = []
    for item in value:
        child = _filter_value(item, items_schema)
        if child is _Removed:
            continue
        # Keep empty dict items by design. When all item fields are hidden,
        # callers may still need positional consistency of array elements.
        filtered_items.append(child)
    return filtered_items


class _RemovedMarker:
    pass


_Removed = _RemovedMarker()


def filter_response_by_x_display(
    result_json: Any, openapi_schema: Optional[Dict[str, Any]]
) -> Any:
    """Filter response payload by x-display settings in response schema."""
    response_schema = _prepare_response_schema(
        get_response_schema(openapi_schema),
        openapi_schema,
    )
    if not response_schema:
        return result_json
    filtered = _filter_value(result_json, response_schema)
    return {} if filtered is _Removed else filtered


def _parse_required_property_name(message: str) -> Optional[str]:
    marker = "is a required property"
    if marker not in message:
        return None
    parts = message.split("'", 2)
    if len(parts) < 3:
        return None
    return parts[1]


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


def _token_path_to_json_path(token_path: List[str]) -> str:
    current_path = "$"
    for token in token_path:
        current_path = _join_path(current_path, token)
    return current_path


def _path_is_same_or_descendant(target_path: str, ancestor_path: str) -> bool:
    if target_path == ancestor_path:
        return True
    return target_path.startswith(f"{ancestor_path}.") or target_path.startswith(
        f"{ancestor_path}["
    )


def _hidden_paths_from_response_schema(
    response_schema: Dict[str, Any], openapi_schema: Optional[Dict[str, Any]] = None
) -> List[str]:
    prepared_schema = _prepare_response_schema(response_schema, openapi_schema)
    if not prepared_schema:
        return []

    hidden_paths: List[str] = []
    _collect_hidden_paths(prepared_schema, "$", hidden_paths)
    return hidden_paths


def should_ignore_validation_error_by_x_display(
    err: Any,
    response_schema: Dict[str, Any],
    openapi_schema: Optional[Dict[str, Any]] = None,
) -> bool:
    """Return True when a schema error should be ignored because target field is hidden."""
    # Only "required property missing" errors are eligible for ignore.
    # Other schema violations should still be reported.
    missing_required = _parse_required_property_name(getattr(err, "message", ""))
    if not missing_required:
        return False

    token_path = _build_token_path_for_missing_required(
        list(getattr(err, "path", [])), missing_required
    )
    target_path = _token_path_to_json_path(token_path)
    hidden_paths = _hidden_paths_from_response_schema(response_schema, openapi_schema)
    for hidden_path in hidden_paths:
        # If the missing field itself (or one of its parents) is hidden,
        # validation noise should not fail the response processing.
        if _path_is_same_or_descendant(target_path, hidden_path):
            return True
    return False
