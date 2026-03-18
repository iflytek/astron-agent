"""Test module for BaseInputs validation and helpers."""

# pylint: disable=missing-function-docstring

from typing import Any

import pytest
from agent.api.schemas.base_inputs import BaseInputs, MetaDataInputs
from agent.api.schemas.llm_message import LLMMessage
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError


class TestBaseInputsValidation:
    """Test BaseInputs validation logic."""

    def test_empty_messages_removed(self) -> None:
        """Empty messages trigger validation error."""
        data = {"uid": "u1", "messages": []}
        with pytest.raises(ValidationError):
            BaseInputs(**data)

    @pytest.mark.parametrize(
        "messages,expected_loc,expected_msg",
        [
            (
                [{"role": "user", "content": ""}],
                ("body", "messages", 0, "content"),
                "'content' cannot be empty",
            ),
            (
                [{"role": "system", "content": "x"}],
                ("body", "messages", 0, "role"),
                "'role' must be user or assistant",
            ),
            (
                [
                    {"role": "assistant", "content": "a"},
                    {"role": "user", "content": "b"},
                ],
                ("body", "messages", 0, "role"),
                "messages role order must alternate between user and assistant",
            ),
            (
                [
                    {"role": "user", "content": "q"},
                    {"role": "assistant", "content": "a"},
                    {"role": "assistant", "content": "a2"},
                ],
                ("body", "messages", 2, "role"),
                "messages role order must alternate between user and assistant",
            ),
            (
                # Starts with user, ends with assistant
                [
                    {"role": "user", "content": "q"},
                    {"role": "assistant", "content": "a"},
                ],
                ("body", "messages"),
                "messages must end with user type content",
            ),
        ],
    )
    def test_invalid_messages_raise_validation_error(
        self,
        messages: list[dict[str, Any]],
        expected_loc: tuple,
        expected_msg: str,
    ) -> None:
        with pytest.raises(RequestValidationError) as exc:
            BaseInputs.model_validate({"uid": "u1", "messages": messages})

        errors = exc.value.errors()
        assert errors
        err = errors[0]
        assert tuple(err["loc"]) == expected_loc
        assert expected_msg in err["msg"]


class TestBaseInputsHelpers:
    """Test BaseInputs helper methods."""

    def make_inputs(self) -> BaseInputs:
        return BaseInputs(
            uid="u1",
            messages=[
                LLMMessage(role="user", content="q1"),
                LLMMessage(role="assistant", content="a1"),
                LLMMessage(role="user", content="q2"),
            ],
            meta_data=MetaDataInputs(),
        )

    def test_get_last_message_content(self) -> None:
        inputs = self.make_inputs()
        assert inputs.get_last_message_content() == "q2"

    def test_get_last_message_content_empty_raises(
        self,
    ) -> None:
        # pylint: disable=import-outside-toplevel
        from agent.exceptions.agent_exc import AgentExc

        inputs = BaseInputs.model_construct(uid="u1", messages=[])
        with pytest.raises(AgentExc):
            _ = inputs.get_last_message_content()

    def test_get_last_message_content_safe(self) -> None:
        inputs = BaseInputs.model_construct(uid="u1", messages=[])
        assert inputs.get_last_message_content_safe("default") == "default"

    def test_get_chat_history(self) -> None:
        inputs = self.make_inputs()
        history = inputs.get_chat_history()
        assert [m.content for m in history] == ["q1", "a1"]

    def test_get_chat_history_single_message(self) -> None:
        inputs = BaseInputs(
            uid="u1",
            messages=[LLMMessage(role="user", content="q1")],
        )
        assert inputs.get_chat_history() == []
