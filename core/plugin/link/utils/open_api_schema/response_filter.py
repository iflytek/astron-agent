from typing import Any, Optional

from jsonschema.exceptions import SchemaError, ValidationError
from jsonschema.validators import validator_for
from plugin.link.utils.open_api_schema.schema_parser import OpenapiSchemaParser


class ResponseSchemaFilter:
    HIDDEN_LEAF = "__hidden_leaf__"
    ARRAY_WILDCARD = "*"
    REMOVED = object()

    @classmethod
    def extract_response_json_schema(
        cls, method_schema: dict[str, Any]
    ) -> dict[str, Any]:
        """Extract response JSON schema from OpenAPI method schema."""
        return OpenapiSchemaParser.extract_response_json_schema(method_schema)

    @classmethod
    def collect_hidden_json_paths(
        cls,
        schema: dict[str, Any] | Any,
        current_path: Optional[list[str]] = None,
    ) -> list[list[str]]:
        """Collect json paths where `x-display` is explicitly set to false."""
        if not isinstance(schema, dict):
            return []

        if current_path is None:
            current_path = []

        hidden_paths: list[list[str]] = []
        x_display = schema.get("x-display")
        if x_display is False and current_path:
            hidden_paths.append(current_path.copy())

        schema_properties = schema.get("properties", {})
        if isinstance(schema_properties, dict):
            for property_name, property_schema in schema_properties.items():
                if isinstance(property_schema, dict):
                    hidden_paths.extend(
                        cls.collect_hidden_json_paths(
                            property_schema,
                            current_path + [property_name],
                        )
                    )

        schema_items = schema.get("items")
        if isinstance(schema_items, dict):
            hidden_paths.extend(
                cls.collect_hidden_json_paths(
                    schema_items, current_path + [cls.ARRAY_WILDCARD]
                )
            )

        return hidden_paths

    @classmethod
    def build_hidden_path_tree(cls, hidden_paths: list[list[str]]) -> dict[str, Any]:
        """Build a trie for hidden paths to support single-pass pruning."""
        tree: dict[str, Any] = {}

        for path_segments in hidden_paths:
            node: dict[str, Any] = tree
            for segment in path_segments:
                child_node = node.get(segment)
                if not isinstance(child_node, dict):
                    child_node = {}
                    node[segment] = child_node
                node = child_node
            node[cls.HIDDEN_LEAF] = True

        return tree

    @classmethod
    def prune_payload_by_path_tree(
        cls,
        payload: Any,
        path_tree: dict[str, Any] | Any,
    ) -> Any:
        """Prune payload by hidden-path trie in one recursive traversal.

        This function does not mutate the input payload object.
        """
        if not isinstance(path_tree, dict):
            return payload

        if cls._is_hidden_leaf_node(path_tree):
            return cls.REMOVED

        if isinstance(payload, dict):
            return cls._prune_dict_payload(payload, path_tree)

        if isinstance(payload, list):
            return cls._prune_list_payload(payload, path_tree)

        return payload

    @classmethod
    def _is_hidden_leaf_node(cls, path_tree: dict[str, Any]) -> bool:
        return bool(path_tree.get(cls.HIDDEN_LEAF))

    @classmethod
    def _prune_dict_payload(
        cls,
        payload: dict[str, Any],
        path_tree: dict[str, Any],
    ) -> dict[str, Any]:
        filtered_payload: dict[str, Any] = {}

        for field_name, field_value in payload.items():
            field_tree = path_tree.get(field_name)
            if not isinstance(field_tree, dict):
                filtered_payload[field_name] = field_value
                continue

            pruned_value = cls.prune_payload_by_path_tree(field_value, field_tree)
            if pruned_value is cls.REMOVED:
                continue
            filtered_payload[field_name] = pruned_value

        return filtered_payload

    @classmethod
    def _prune_list_payload(
        cls,
        payload: list[Any],
        path_tree: dict[str, Any],
    ) -> list[Any]:
        item_tree = path_tree.get(cls.ARRAY_WILDCARD)
        if not isinstance(item_tree, dict):
            return list(payload)

        kept_items: list[Any] = []
        for item in payload:
            pruned_item = cls.prune_payload_by_path_tree(item, item_tree)
            if pruned_item is cls.REMOVED:
                continue
            kept_items.append(pruned_item)

        return kept_items

    @classmethod
    def pop_hidden_fields(cls, payload: Any, hidden_paths: list[list[str]]) -> Any:
        """Prune payload with hidden fields removed (without mutating input)."""
        if not hidden_paths:
            return payload

        path_tree = cls.build_hidden_path_tree(hidden_paths)
        filtered = cls.prune_payload_by_path_tree(payload, path_tree)
        return {} if filtered is cls.REMOVED else filtered

    @staticmethod
    def validate_response(payload: Any, response_schema: dict[str, Any]) -> bool:
        """Validate payload against response schema with schema-aware validator."""
        if not isinstance(response_schema, dict) or not response_schema:
            return True

        try:
            validator_cls = validator_for(response_schema)
            validator_cls.check_schema(response_schema)
            validator = validator_cls(response_schema)
            validator.validate(payload)
            return True
        except (ValidationError, SchemaError):
            return False

    @classmethod
    def filter_payload_by_schema(
        cls,
        payload: Any,
        response_schema: dict[str, Any],
    ) -> Any:
        """Filter payload by OpenAPI schema `x-display` settings."""
        if not response_schema:
            return payload

        hidden_json_paths = cls.collect_hidden_json_paths(response_schema)
        if not hidden_json_paths:
            return payload

        return cls.pop_hidden_fields(payload, hidden_json_paths)
