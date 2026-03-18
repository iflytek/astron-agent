"""Base plugin definitions for the agent service."""

from typing import Any, Callable, Optional

from pydantic import BaseModel, Field


class PluginResponse(BaseModel):
    """Response from plugin execution."""

    code: int = Field(default=0)
    sid: str = Field(default="")
    start_time: int = Field(default=0)
    end_time: int = Field(default=0)
    result: Any
    log: list = Field(default_factory=list)


class BasePlugin(BaseModel):
    """Base class for all agent plugins."""

    name: str
    description: str
    schema_template: str
    typ: str
    run: Callable
    run_result: Optional[PluginResponse] = Field(default=None)
