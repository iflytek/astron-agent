from copy import deepcopy
from typing import Any, Dict, List, Literal, Optional, Tuple

from pydantic import BaseModel
from jsonpath_ng import parse as parse_json_path



class ResponseSchemaFilter:
    REMOVED = object()

    @classmethod
    def extract_response_json_schema(
        cls, openapi_schema: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Extract response JSON schema from OpenAPI method schema."""
        if not isinstance(openapi_schema, dict):
            return {}

        paths = openapi_schema.get("paths", {})
        response_schema: Dict[str, Any] = {}
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

    @classmethod
    def _infer_schema_type(cls, schema: Dict[str, Any]) -> Optional[str]:
        node_type = schema.get("type")
        if isinstance(node_type, str):
            return node_type

        if "properties" in schema:
            return "object"
        if "items" in schema:
            return "array"
        return None

    @classmethod
    def _extract_items_schema(cls, schema: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        items = schema.get("items")
        if isinstance(items, dict):
            return items
        if isinstance(items, list) and items and isinstance(items[0], dict):
            return items[0]
        return None

    @classmethod
    def _empty_value_for_schema(cls, schema: Dict[str, Any]) -> Any:
        node_type = cls._infer_schema_type(schema)
        if node_type == "object":
            return {}
        if node_type == "array":
            return []
        return None

    @classmethod
    def _all_object_children_hidden(cls, schema: Dict[str, Any]) -> bool:
        schema_properties = schema.get("properties")
        if not isinstance(schema_properties, dict) or not schema_properties:
            return False

        for _, property_schema in schema_properties.items():
            if not isinstance(property_schema, dict):
                return False
            if property_schema.get("x-display") is not False:
                return False
        return True


class FilterDirective(BaseModel):
    json_path: str
    action: Literal["remove", "empty", "empty_items"]
    empty_value: Any = None


def get_response_schema(openapi_schema: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Get response schema from tool's OpenAPI schema."""
    try:
        from plugin.link.service.community.tools.http.execution_server import (
            get_response_schema as execution_server_get_response_schema,
        )

        return execution_server_get_response_schema(openapi_schema)
    except Exception:
        return ResponseSchemaFilter.extract_response_json_schema(openapi_schema or {})


def _join_json_path(parent_path: str, token: str) -> str:
    if token == "[*]":
        return f"{parent_path}[*]"
    if parent_path == "$":
        return f"$.{token}"
    return f"{parent_path}.{token}"


def _infer_schema_type(schema: Dict[str, Any]) -> Optional[str]:
    return ResponseSchemaFilter._infer_schema_type(schema)


def _extract_items_schema(schema: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    return ResponseSchemaFilter._extract_items_schema(schema)


def _empty_value_for_schema(schema: Dict[str, Any]) -> Any:
    return ResponseSchemaFilter._empty_value_for_schema(schema)


def _all_object_children_hidden(schema: Dict[str, Any]) -> bool:
    return ResponseSchemaFilter._all_object_children_hidden(schema)


def _build_filter_directives_recursively(
    schema: Dict[str, Any],
    current_path: str,
    directives: List[FilterDirective],
    need_be_poped_list: List[str],
) -> None:
    if not isinstance(schema, dict):
        return

    node_type = _infer_schema_type(schema)

    if schema.get("x-display") is False:
        directives.append(FilterDirective(json_path=current_path, action="remove"))
        need_be_poped_list.append(current_path)
        return

    if node_type == "object":
        schema_properties = schema.get("properties")
        if not isinstance(schema_properties, dict):
            return

        if _all_object_children_hidden(schema):
            for property_name, property_schema in schema_properties.items():
                if not isinstance(property_schema, dict):
                    continue
                _build_filter_directives_recursively(
                    property_schema,
                    _join_json_path(current_path, property_name),
                    directives,
                    need_be_poped_list,
                )
            directives.append(
                FilterDirective(
                    json_path=current_path,
                    action="empty",
                    empty_value={},
                )
            )
            return

        for property_name, property_schema in schema_properties.items():
            if not isinstance(property_schema, dict):
                continue
            _build_filter_directives_recursively(
                property_schema,
                _join_json_path(current_path, property_name),
                directives,
                need_be_poped_list,
            )
        return

    if node_type == "array":
        item_schema = _extract_items_schema(schema)
        if not isinstance(item_schema, dict):
            return

        if item_schema.get("x-display") is False:
            directives.append(
                FilterDirective(
                    json_path=current_path,
                    action="empty",
                    empty_value=[],
                )
            )
            need_be_poped_list.append(_join_json_path(current_path, "[*]"))
            return

        _build_filter_directives_recursively(
            item_schema,
            _join_json_path(current_path, "[*]"),
            directives,
            need_be_poped_list,
        )


def build_filter_directives(
    response_schema: Dict[str, Any],
) -> Tuple[List[FilterDirective], List[str]]:
    directives: List[FilterDirective] = []
    need_be_poped_list: List[str] = []
    if not response_schema:
        return directives, need_be_poped_list

    _build_filter_directives_recursively(
        response_schema,
        "$",
        directives,
        need_be_poped_list,
    )
    return directives, need_be_poped_list


def get_need_be_poped_list(response_schema: Dict[str, Any]) -> List[str]:
    _, need_be_poped_list = build_filter_directives(response_schema)
    return need_be_poped_list


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


def _token_path_to_json_path(token_path: List[str]) -> str:
    current_path = "$"
    for token in token_path:
        current_path = _join_json_path(current_path, token)
    return current_path


def _path_is_same_or_descendant(target_path: str, ancestor_path: str) -> bool:
    if target_path == ancestor_path:
        return True
    return target_path.startswith(f"{ancestor_path}.") or target_path.startswith(
        f"{ancestor_path}["
    )


def _schema_node_is_x_display_false(schema_node: Any, token_path: List[str]) -> bool:
    if not isinstance(schema_node, dict):
        return False

    target_path = _token_path_to_json_path(token_path)
    hidden_paths = get_need_be_poped_list(schema_node)
    for hidden_path in hidden_paths:
        if _path_is_same_or_descendant(target_path, hidden_path):
            return True
    return False


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


def _json_path_depth(path: str) -> int:
    return path.count(".") + path.count("[")


def _json_path_to_tokens(json_path: str) -> List[str]:
    if json_path == "$":
        return []

    tokens: List[str] = []
    cursor = 1
    while cursor < len(json_path):
        if json_path[cursor] == ".":
            cursor += 1
            start = cursor
            while cursor < len(json_path) and json_path[cursor] not in ".[":
                cursor += 1
            if start < cursor:
                tokens.append(json_path[start:cursor])
            continue

        if json_path.startswith("[*]", cursor):
            tokens.append("[*]")
            cursor += 3
            continue

        cursor += 1

    return tokens


def _collect_runtime_path_targets(
    current: Any,
    tokens: List[str],
    index: int,
    parent: Any,
    parent_key: Any,
    targets: List[Tuple[Any, Any, Any]],
) -> None:
    if index >= len(tokens):
        targets.append((parent, parent_key, current))
        return

    token = tokens[index]
    if token == "[*]":
        if isinstance(current, list):
            for item_index, item in enumerate(current):
                _collect_runtime_path_targets(
                    item,
                    tokens,
                    index + 1,
                    current,
                    item_index,
                    targets,
                )
        return

    if isinstance(current, dict):
        if token in current:
            _collect_runtime_path_targets(
                current[token],
                tokens,
                index + 1,
                current,
                token,
                targets,
            )
        return

    if isinstance(current, list):
        matched_any = False
        for item in current:
            if isinstance(item, dict) and token in item:
                matched_any = True
                _collect_runtime_path_targets(
                    item[token],
                    tokens,
                    index + 1,
                    item,
                    token,
                    targets,
                )
        if not matched_any:
            _collect_runtime_path_targets(
                current,
                tokens,
                index + 1,
                parent,
                parent_key,
                targets,
            )


def _targets_from_jsonpath_matches(matches: List[Any]) -> List[Tuple[Any, Any, Any]]:
    targets: List[Tuple[Any, Any, Any]] = []
    for match in matches:
        parent_context = match.context
        if parent_context is None:
            targets.append((None, None, match.value))
            continue

        parent = parent_context.value
        fields = getattr(match.path, "fields", None)
        if isinstance(fields, tuple):
            fields = list(fields)
        if isinstance(fields, list):
            for field in fields:
                targets.append((parent, field, match.value))
            continue

        index = getattr(match.path, "index", None)
        if isinstance(index, int):
            targets.append((parent, index, match.value))

    return targets


def _dedupe_targets(
    targets: List[Tuple[Any, Any, Any]],
) -> List[Tuple[Any, Any, Any]]:
    deduped: List[Tuple[Any, Any, Any]] = []
    seen: set[Tuple[int, str]] = set()
    for parent, key, value in targets:
        parent_id = id(parent) if parent is not None else -1
        marker = (parent_id, repr(key))
        if marker in seen:
            continue
        seen.add(marker)
        deduped.append((parent, key, value))
    return deduped


def _find_path_targets(payload: Any, json_path: str) -> List[Tuple[Any, Any, Any]]:
    if json_path == "$":
        return [(None, None, payload)]

    targets: List[Tuple[Any, Any, Any]] = []

    try:
        matches = parse_json_path(json_path).find(payload)
        targets.extend(_targets_from_jsonpath_matches(matches))
    except Exception:
        pass

    runtime_targets: List[Tuple[Any, Any, Any]] = []
    _collect_runtime_path_targets(
        payload,
        _json_path_to_tokens(json_path),
        0,
        None,
        None,
        runtime_targets,
    )
    targets.extend(runtime_targets)

    return _dedupe_targets(targets)


def _assign_match_value(match: Any, value: Any) -> None:
    parent_context = match.context
    if parent_context is None:
        return

    parent = parent_context.value
    if isinstance(parent, dict):
        fields = getattr(match.path, "fields", None)
        if isinstance(fields, tuple):
            fields = list(fields)
        if isinstance(fields, list):
            for field in fields:
                parent[field] = value
        return

    if isinstance(parent, list):
        index = getattr(match.path, "index", None)
        if isinstance(index, int) and 0 <= index < len(parent):
            parent[index] = value


def _apply_remove_action(payload: Any, json_path: str) -> Any:
    if json_path == "$":
        return {}

    targets = _find_path_targets(payload, json_path)

    list_removals: Dict[int, Tuple[List[Any], List[int]]] = {}
    for parent, key, _ in targets:
        if isinstance(parent, dict) and isinstance(key, str):
            parent.pop(key, None)
            continue
        if isinstance(parent, list) and isinstance(key, int):
            bucket = list_removals.get(id(parent))
            if bucket is None:
                bucket = (parent, [])
                list_removals[id(parent)] = bucket
            bucket[1].append(key)

    for parent, indexes in list_removals.values():
        for index in sorted(set(indexes), reverse=True):
            if 0 <= index < len(parent):
                parent.pop(index)
    return payload


def _apply_empty_action(payload: Any, json_path: str, empty_value: Any) -> Any:
    if json_path == "$":
        return deepcopy(empty_value)

    targets = _find_path_targets(payload, json_path)
    for parent, key, _ in targets:
        if isinstance(parent, dict) and isinstance(key, str):
            parent[key] = deepcopy(empty_value)
            continue
        if isinstance(parent, list) and isinstance(key, int) and 0 <= key < len(parent):
            parent[key] = deepcopy(empty_value)
    return payload


def _apply_empty_items_action(payload: Any, json_path: str, empty_value: Any) -> Any:
    if json_path == "$" and isinstance(payload, list):
        return [deepcopy(empty_value) for _ in payload]

    targets = _find_path_targets(payload, json_path)
    for _, _, target in targets:
        if isinstance(target, list):
            for index in range(len(target)):
                target[index] = deepcopy(empty_value)
    return payload


def _apply_filter_directives(payload: Any, directives: List[FilterDirective]) -> Any:
    ordered_directives = sorted(
        directives,
        key=lambda directive: (_json_path_depth(directive.json_path), directive.action),
        reverse=True,
    )

    result = deepcopy(payload)
    for directive in ordered_directives:
        if directive.action == "remove":
            result = _apply_remove_action(result, directive.json_path)
            continue
        if directive.action == "empty":
            result = _apply_empty_action(
                result, directive.json_path, directive.empty_value
            )
            continue
        if directive.action == "empty_items":
            result = _apply_empty_items_action(
                result, directive.json_path, directive.empty_value
            )



    return result


def filter_response_by_x_display(result_json: Any, open_api_schema: Dict[str, Any]) -> Any:
    """Filter response payload by x-display settings in response schema."""
    response_schema = get_response_schema(open_api_schema)
    if not response_schema:
        return result_json

    directives, _ = build_filter_directives(response_schema)
    return _apply_filter_directives(result_json, directives)
