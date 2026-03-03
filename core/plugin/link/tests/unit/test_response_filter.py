from pathlib import Path
from typing import Any, Dict
import json

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
        "properties": {
            "name": {"type": "string"},
        },
    }
    open_api_schema = _build_openapi_schema(response_schema)

    result = get_response_schema(open_api_schema)

    assert result == response_schema


def test_build_need_be_poped_list_for_hidden_nodes() -> None:
    response_schema = {
        "type": "object",
        "properties": {
            "secret": {"type": "string", "x-display": False},
            "orders": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "internal": {"type": "string", "x-display": False},
                    },
                },
            },
            "tags": {
                "type": "array",
                "items": {"type": "string", "x-display": False},
            },
        },
    }

    need_be_poped_list = get_need_be_poped_list(response_schema)

    assert "$.secret" in need_be_poped_list
    assert "$.orders[*].internal" in need_be_poped_list
    assert "$.tags[*]" in need_be_poped_list


def test_filter_hides_array_when_array_field_hidden() -> None:
    response_schema = {
        "type": "object",
        "properties": {
            "users": {
                "type": "array",
                "x-display": False,
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                    },
                },
            }
        },
    }
    open_api_schema = _build_openapi_schema(response_schema)
    payload = {"users": [{"name": "a"}, {"name": "b"}]}

    result = filter_response_by_x_display(payload, open_api_schema)

    assert result == {}


def test_filter_keeps_array_name_and_sets_empty_list_when_items_hidden() -> None:
    response_schema = {
        "type": "object",
        "properties": {
            "users": {
                "type": "array",
                "items": {
                    "type": "object",
                    "x-display": False,
                    "properties": {
                        "name": {"type": "string"},
                    },
                },
            },
            "tags": {
                "type": "array",
                "items": {"type": "string", "x-display": False},
            },
        },
    }
    open_api_schema = _build_openapi_schema(response_schema)
    payload = {
        "users": [{"name": "a"}, {"name": "b"}],
        "tags": ["x", "y"],
    }

    result = filter_response_by_x_display(payload, open_api_schema)

    assert result == {"users": [], "tags": []}


def test_filter_hides_object_when_object_field_hidden() -> None:
    response_schema = {
        "type": "object",
        "properties": {
            "profile": {
                "type": "object",
                "x-display": False,
                "properties": {
                    "name": {"type": "string"},
                },
            }
        },
    }
    open_api_schema = _build_openapi_schema(response_schema)
    payload = {"profile": {"name": "alice"}}

    result = filter_response_by_x_display(payload, open_api_schema)

    assert result == {}


def test_filter_keeps_object_name_and_empties_when_all_children_hidden() -> None:
    response_schema = {
        "type": "object",
        "properties": {
            "profile": {
                "type": "object",
                "properties": {
                    "id": {"type": "string", "x-display": False},
                    "email": {"type": "string", "x-display": False},
                },
            }
        },
    }
    open_api_schema = _build_openapi_schema(response_schema)
    payload = {"profile": {"id": "1", "email": "a@b.com"}}

    result = filter_response_by_x_display(payload, open_api_schema)

    assert result == {"profile": {}}


def test_should_ignore_validation_error_when_missing_required_is_hidden() -> None:
    response_schema = {
        "type": "object",
        "properties": {
            "profile": {
                "type": "object",
                "properties": {
                    "secret": {
                        "type": "string",
                        "x-display": False,
                    }
                },
                "required": ["secret"],
            }
        },
    }
    payload = {"profile": {}}

    err = list(Draft7Validator(response_schema).iter_errors(payload))[0]

    assert should_ignore_validation_error_by_x_display(err, response_schema) is True


def test_should_not_ignore_validation_error_when_missing_required_is_visible() -> None:
    response_schema = {
        "type": "object",
        "properties": {
            "profile": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                },
                "required": ["name"],
            }
        },
    }
    payload = {"profile": {}}

    err = list(Draft7Validator(response_schema).iter_errors(payload))[0]

    assert should_ignore_validation_error_by_x_display(err, response_schema) is False


def test_filter_real_weather_schema_hides_message_and_keeps_data() -> None:
    response_schema = {
        "type": "object",
        "properties": {
            "code": {"type": "integer", "x-display": True},
            "data": {
                "type": "object",
                "x-display": True,
                "properties": {
                    "update_time": {"type": "string", "x-display": True},
                    "data": {
                        "type": "array",
                        "x-display": True,
                        "items": {
                            "type": "object",
                            "properties": {},
                            "required": [],
                        },
                    },
                    "city": {"type": "string", "x-display": True},
                    "cityid": {"type": "string", "x-display": True},
                },
            },
            "message": {"type": "string", "x-display": False},
            "sid": {"type": "string", "x-display": True},
        },
    }
    open_api_schema = _build_openapi_schema(response_schema)
    payload = {
        "code": 0,
        "message": "success",
        "sid": "s-1",
        "data": {
            "update_time": "2026-03-03 11:00:00",
            "city": "合肥市",
            "cityid": "340100",
            "data": [{"temp": "10"}, {"temp": "11", "weather": "晴"}],
        },
    }

    result = filter_response_by_x_display(payload, open_api_schema)

    assert "message" not in result
    assert result["code"] == 0
    assert result["sid"] == "s-1"
    assert result["data"]["city"] == "合肥市"
    assert result["data"]["data"] == [{"temp": "10"}, {"temp": "11", "weather": "晴"}]


def test_need_be_poped_list_real_weather_schema_contains_message_path() -> None:
    response_schema = {
        "type": "object",
        "properties": {
            "code": {"type": "integer", "x-display": True},
            "data": {
                "type": "object",
                "x-display": True,
                "properties": {
                    "update_time": {"type": "string", "x-display": True},
                    "data": {
                        "type": "array",
                        "x-display": True,
                        "items": {
                            "type": "object",
                            "properties": {},
                            "required": [],
                        },
                    },
                    "city": {"type": "string", "x-display": True},
                    "cityid": {"type": "string", "x-display": True},
                },
            },
            "message": {"type": "string", "x-display": False},
            "sid": {"type": "string", "x-display": True},
        },
    }

    need_be_poped_list = get_need_be_poped_list(response_schema)

    assert "$.message" in need_be_poped_list
    assert "$.data" not in need_be_poped_list


def test_filter_real_schema_file_message_hidden() -> None:
    schema_file = Path(__file__).resolve().parents[1] / "example" / "schema"
    open_api_schema = json.loads(schema_file.read_text(encoding="utf-8"))

    payload = {
        "code": 0,
        "message": "success",
        "sid": "sid-001",
        "data": {
            "update_time": "2026-03-03 10:00:00",
            "city": "合肥市",
            "cityid": "340100",
            "data": [{"tempLow": "3℃"}],
        },
    }

    result = filter_response_by_x_display(payload, open_api_schema)

    assert "message" not in result
    assert result["code"] == 0
    assert result["sid"] == "sid-001"
    assert result["data"]["city"] == "合肥市"


def test_filter_parent_hidden_takes_precedence_over_children() -> None:
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
    open_api_schema = _build_openapi_schema(response_schema)
    payload = {
        "profile": {"name": "alice", "secret": "internal"},
        "visible": "ok",
    }

    result = filter_response_by_x_display(payload, open_api_schema)

    assert "profile" not in result
    assert result["visible"] == "ok"


def test_filter_infers_object_and_array_type_when_type_missing() -> None:
    response_schema = {
        "properties": {
            "meta": {
                "properties": {
                    "trace": {"type": "string", "x-display": False},
                    "version": {"type": "string"},
                }
            },
            "items": {
                "items": {
                    "properties": {
                        "name": {"type": "string"},
                        "debug": {"type": "string", "x-display": False},
                    }
                }
            },
        }
    }
    open_api_schema = _build_openapi_schema(response_schema)
    payload = {
        "meta": {"trace": "trace-id", "version": "v1"},
        "items": [
            {"name": "a", "debug": "x"},
            {"name": "b", "debug": "y"},
        ],
    }

    result = filter_response_by_x_display(payload, open_api_schema)

    assert result == {
        "meta": {"version": "v1"},
        "items": [{"name": "a"}, {"name": "b"}],
    }


def test_should_ignore_validation_error_for_hidden_required_in_array_items() -> None:
    response_schema = {
        "type": "object",
        "properties": {
            "users": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "secret": {"type": "string", "x-display": False},
                    },
                    "required": ["secret"],
                },
            }
        },
    }
    payload = {"users": [{}]}

    err = list(Draft7Validator(response_schema).iter_errors(payload))[0]

    assert should_ignore_validation_error_by_x_display(err, response_schema) is True


def test_should_not_ignore_validation_error_for_visible_required_in_array_items() -> None:
    response_schema = {
        "type": "object",
        "properties": {
            "users": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string", "x-display": True},
                    },
                    "required": ["name"],
                },
            }
        },
    }
    payload = {"users": [{}]}

    err = list(Draft7Validator(response_schema).iter_errors(payload))[0]

    assert should_ignore_validation_error_by_x_display(err, response_schema) is False


def test_filter_real_schema_removes_hidden_fields_and_keeps_visible_fields() -> None:
    schema_file = Path(__file__).resolve().parents[1] / "example" / "schema"
    open_api_schema = json.loads(schema_file.read_text(encoding="utf-8"))

    payload = {
        "code": 0,
        "sid": "sid-002",
        "data": {
            "update_time": "2026-03-03 10:00:00",
            "city": "合肥市",
            "cityid": "340100",
            "data": [{"tempLow": "3℃"}],
        },
    }

    result = filter_response_by_x_display(payload, open_api_schema)

    assert result == {
        "code": 0,
        "sid": "sid-002",
        "data": {
            "update_time": "2026-03-03 10:00:00",
            "city": "合肥市",
            "cityid": "340100",
        },
    }
