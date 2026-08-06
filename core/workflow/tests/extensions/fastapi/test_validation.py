"""Validation error redaction regression tests."""

import pytest
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, ValidationError

from workflow.utils.validation import ValidationParse


class _Payload(BaseModel):
    count: int


def test_pydantic_validation_error_omits_sensitive_input() -> None:
    sensitive_value = "SENTINEL_API_KEY_AND_PROMPT"

    with pytest.raises(ValidationError) as exc_info:
        _Payload.model_validate({"count": sensitive_value})

    message = ValidationParse.validation_error(exc_info.value)
    assert "count" in message
    assert "int_parsing" in message
    assert sensitive_value not in message
    assert "Input:" not in message


def test_request_validation_error_omits_input_context_and_url() -> None:
    sensitive_value = "SENTINEL_REQUEST_SECRET"
    context_value = "SENTINEL_VALIDATION_CONTEXT"
    error_url = "https://errors.example/SENTINEL_ERROR_URL"
    error = RequestValidationError(
        [
            {
                "type": "string_type",
                "loc": ("body", "secret"),
                "msg": "Input should be a valid string",
                "input": sensitive_value,
                "ctx": {"expected": context_value},
                "url": error_url,
            }
        ]
    )

    message = ValidationParse.validation_error(error)
    assert "body->secret" in message
    assert "string_type" in message
    assert sensitive_value not in message
    assert context_value not in message
    assert error_url not in message
