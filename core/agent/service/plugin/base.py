from typing import Any, Callable, Optional

from pydantic import BaseModel, Field


class PluginResponse(BaseModel):
    code: int = Field(default=0)
    sid: str = Field(default="")
    start_time: int = Field(default=0)
    end_time: int = Field(default=0)
    result: Any
    log: list = Field(default_factory=list)


class BasePlugin(BaseModel):
    name: str
    description: str
    schema_template: str
    parameters: dict[str, Any] = Field(
        default_factory=lambda: {
            "type": "object",
            "properties": {},
            "required": [],
        }
    )
    typ: str
    run: Callable
    run_result: Optional[PluginResponse] = Field(default=None)
