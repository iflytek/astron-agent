"""Protocol-based inputs for one model completion, independent of Agent execution."""

from typing import Any, Literal
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, Field, ValidationInfo, field_validator

from agent.api.schemas.base_inputs import MetaDataInputs


class CompletionModelConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    provider: Literal["openai", "anthropic", "google"]
    domain: str = Field(min_length=1)
    api: str = Field(min_length=1)
    api_key: str = Field(min_length=1, repr=False)

    @field_validator("api")
    @classmethod
    def validate_endpoint(cls, value: str) -> str:
        parsed = urlsplit(value)
        if (
            parsed.scheme not in {"http", "https"}
            or not parsed.hostname
            or parsed.username
            or parsed.password
            or parsed.fragment
            or parsed.query
        ):
            raise ValueError(
                "Model endpoint must be an HTTP(S) URL without credentials"
            )
        return value


class CompletionMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: Literal["system", "user", "assistant"]
    content: str | list[dict[str, Any]]


class CompletionParameters(BaseModel):
    model_config = ConfigDict(extra="forbid")

    temperature: float | None = Field(default=None, ge=0, le=2)
    max_tokens: int | None = Field(default=None, gt=0)
    top_p: float | None = Field(default=None, ge=0, le=1)
    top_k: int | None = Field(default=None, gt=0)
    stop: str | list[str] | None = None
    frequency_penalty: float | None = Field(default=None, ge=-2, le=2)
    presence_penalty: float | None = Field(default=None, ge=-2, le=2)
    seed: int | None = None
    response_format: dict[str, Any] | None = None
    reasoning_effort: str | None = None
    thinking: dict[str, Any] | None = None
    thinking_budget: int | None = Field(default=None, ge=-1)
    include_thoughts: bool | None = None


_COMMON_PARAMETERS = {"temperature", "max_tokens", "top_p", "stop"}
_PROTOCOL_PARAMETERS = {
    "openai": _COMMON_PARAMETERS
    | {
        "frequency_penalty",
        "presence_penalty",
        "seed",
        "response_format",
        "reasoning_effort",
    },
    "anthropic": _COMMON_PARAMETERS | {"top_k", "thinking", "reasoning_effort"},
    "google": _COMMON_PARAMETERS
    | {
        "top_k",
        "seed",
        "frequency_penalty",
        "presence_penalty",
        "thinking_budget",
        "include_thoughts",
        "reasoning_effort",
    },
}


class LLMCompletionInputs(BaseModel):
    model_config = ConfigDict(extra="forbid")

    model_config_inputs: CompletionModelConfig = Field(alias="model_config")
    messages: list[CompletionMessage] = Field(min_length=1)
    parameters: CompletionParameters = Field(default_factory=CompletionParameters)
    timeout: float = Field(default=90, gt=0, le=1800)
    meta_data: MetaDataInputs = Field(default_factory=MetaDataInputs)
    uid: str = Field(default="", max_length=64)
    stream: Literal[True] = True

    @field_validator("parameters")
    @classmethod
    def validate_parameters(
        cls, value: CompletionParameters, info: ValidationInfo
    ) -> CompletionParameters:
        config = info.data.get("model_config_inputs")
        if config is None:
            return value
        allowed = _PROTOCOL_PARAMETERS[config.provider]
        if value.model_dump(exclude_none=True).keys() - allowed:
            raise ValueError(
                "Generation parameter is unsupported by the selected protocol"
            )
        return value
