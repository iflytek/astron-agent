from typing import Any, Dict

from jsonschema import Draft7Validator
from plugin.link.utils.open_api_schema.response_filter import (
    filter_response_by_x_display,
    get_need_be_poped_list,
    get_response_schema,
    should_ignore_validation_error_by_x_display,
)


def _build_openapi_schema(response_schema: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "paths": {
            "/demo": {
                "get": {
                    "responses": {
                        "200": {
                            "content": {
                                "application/json": {
                                    "schema": response_schema,
                                }
                            }
                        }
                    }
                }
            }
        }
    }


def test_get_response_schema_extracts_from_openapi() -> None:
    response_schema = {
        "type": "object",
        "properties": {"name": {"type": "string"}},
    }

    assert (
        get_response_schema(_build_openapi_schema(response_schema)) == response_schema
    )


def test_get_need_be_poped_list_collects_hidden_paths() -> None:
    response_schema = {
        "type": "object",
        "properties": {
            "secret": {"type": "string", "x-display": False},
            "items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {"internal": {"type": "string", "x-display": False}},
                },
            },
        },
    }

    hidden_paths = get_need_be_poped_list(response_schema)

    assert "$.secret" in hidden_paths
    assert "$.items[*].internal" in hidden_paths


def test_filter_parent_hidden_takes_precedence() -> None:
    response_schema = {
        "type": "object",
        "properties": {
            "profile": {
                "type": "object",
                "x-display": False,
                "properties": {
                    "name": {"type": "string", "x-display": True},
                    "secret": {"type": "string", "x-display": False},
                },
            },
            "visible": {"type": "string", "x-display": True},
        },
    }
    payload = {
        "profile": {"name": "alice", "secret": "internal"},
        "visible": "ok",
    }

    result = filter_response_by_x_display(
        payload, _build_openapi_schema(response_schema)
    )

    assert result == {"visible": "ok"}


def test_filter_keeps_empty_object_elements_in_array() -> None:
    response_schema = {
        "type": "object",
        "properties": {
            "users": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string", "x-display": False},
                        "email": {"type": "string", "x-display": False},
                    },
                },
            }
        },
    }
    payload = {
        "users": [
            {"name": "a", "email": "a@x.com"},
            {"name": "b", "email": "b@x.com"},
        ]
    }

    result = filter_response_by_x_display(
        payload, _build_openapi_schema(response_schema)
    )

    assert result == {"users": [{}, {}]}


def test_filter_hides_array_elements_when_items_closed() -> None:
    response_schema = {
        "type": "object",
        "properties": {
            "users": {
                "type": "array",
                "items": {
                    "type": "object",
                    "x-display": False,
                    "properties": {"name": {"type": "string", "x-display": True}},
                },
            }
        },
    }
    payload = {"users": [{"name": "a", "extra": "x"}]}

    result = filter_response_by_x_display(
        payload, _build_openapi_schema(response_schema)
    )

    assert result == {"users": []}


def test_filter_ref_items_closed_hides_all_elements() -> None:
    open_api_schema = {
        "paths": {
            "/demo": {
                "get": {
                    "responses": {
                        "200": {
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "users": {
                                                "type": "array",
                                                "items": {
                                                    "$ref": "#/components/schemas/UserItem"
                                                },
                                            }
                                        },
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "components": {
            "schemas": {
                "UserItem": {
                    "type": "object",
                    "x-display": False,
                    "properties": {"name": {"type": "string", "x-display": True}},
                }
            }
        },
    }
    payload = {"users": [{"name": "a"}, {"name": "b"}]}

    result = filter_response_by_x_display(payload, open_api_schema)

    assert result == {"users": []}


def test_should_ignore_validation_error_when_required_field_hidden() -> None:
    response_schema = {
        "type": "object",
        "properties": {
            "profile": {
                "type": "object",
                "properties": {
                    "secret": {"type": "string", "x-display": False},
                },
                "required": ["secret"],
            }
        },
    }
    payload: Dict[str, Any] = {"profile": {}}

    err = list(Draft7Validator(response_schema).iter_errors(payload))[0]

    assert should_ignore_validation_error_by_x_display(err, response_schema) is True


def test_should_not_ignore_validation_error_when_required_field_visible() -> None:
    response_schema = {
        "type": "object",
        "properties": {
            "profile": {
                "type": "object",
                "properties": {"name": {"type": "string"}},
                "required": ["name"],
            }
        },
    }
    payload: Dict[str, Any] = {"profile": {}}

    err = list(Draft7Validator(response_schema).iter_errors(payload))[0]

    assert should_ignore_validation_error_by_x_display(err, response_schema) is False
