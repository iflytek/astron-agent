"""Common OpenAPI schema templates and definitions.

This module defines standard JSON schema templates used for validating
OpenAPI specifications and their structure.
"""

open_api_schema_template = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "properties": {
        "openapi": {"type": "string"},
        "servers": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"url": {"type": "string", "minLength": 1}},
                "required": ["url"],
            },
            "minItems": 1,
        },
    },
    "required": ["openapi", "servers"],
}
