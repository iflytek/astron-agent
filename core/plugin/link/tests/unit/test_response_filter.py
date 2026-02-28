from plugin.link.utils.open_api_schema.response_filter import (
    filter_response_by_x_display,
)


def test_filter_response_removes_hidden_fields() -> None:
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
                                            "visible": {"type": "string"},
                                            "secret": {
                                                "type": "string",
                                                "x-display": False,
                                            },
                                        },
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    payload = {"visible": "ok", "secret": "token"}

    result = filter_response_by_x_display(payload, open_api_schema)

    assert result == {"visible": "ok"}


def test_filter_response_prunes_hidden_fields_in_array_items() -> None:
    open_api_schema = {
        "paths": {
            "/users": {
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
                                                    "type": "object",
                                                    "properties": {
                                                        "name": {"type": "string"},
                                                        "password": {
                                                            "type": "string",
                                                            "x-display": False,
                                                        },
                                                    },
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
        }
    }
    payload = {
        "users": [
            {"name": "alice", "password": "a"},
            {"name": "bob", "password": "b"},
        ]
    }

    result = filter_response_by_x_display(payload, open_api_schema)

    assert result == {"users": [{"name": "alice"}, {"name": "bob"}]}


def test_filter_response_replaces_all_hidden_object_with_empty_object() -> None:
    open_api_schema = {
        "paths": {
            "/profile": {
                "get": {
                    "responses": {
                        "200": {
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "profile": {
                                                "type": "object",
                                                "properties": {
                                                    "id": {
                                                        "type": "string",
                                                        "x-display": False,
                                                    },
                                                    "email": {
                                                        "type": "string",
                                                        "x-display": False,
                                                    },
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
        }
    }
    payload = {"profile": {"id": "u-1", "email": "a@b.com"}}

    result = filter_response_by_x_display(payload, open_api_schema)

    assert result == {"profile": {}}


def test_filter_response_prunes_hidden_fields_in_array_objects() -> None:
    open_api_schema = {
        "paths": {
            "/orders": {
                "get": {
                    "responses": {
                        "200": {
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "orders": {
                                                "type": "array",
                                                "items": {
                                                    "type": "object",
                                                    "properties": {
                                                        "internal_id": {
                                                            "type": "string",
                                                            "x-display": False,
                                                        }
                                                    },
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
        }
    }
    payload = {"orders": [{"internal_id": "a"}, {"internal_id": "b"}]}

    result = filter_response_by_x_display(payload, open_api_schema)

    assert result == {"orders": [{}, {}]}
