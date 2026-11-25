"""Internal, authenticated test call for a configured Tavily Search tool."""

from typing import Any

from fastapi import APIRouter, Depends
from jsonschema import Draft202012Validator
from pydantic import BaseModel, Field, SecretStr

from agent.infra.workflow_internal_auth import require_workflow_internal_api_key
from agent.service.plugin.web_search import SEARCH_SCHEMA, _run_tavily

web_search_router = APIRouter(dependencies=[Depends(require_workflow_internal_api_key)])
search_validator = Draft202012Validator(SEARCH_SCHEMA)


class TavilySearchRequest(BaseModel):
    api_key: SecretStr = Field(repr=False, exclude=True)
    arguments: dict[str, Any]


@web_search_router.post("/tools/tavily/search")  # type: ignore[misc]
async def debug_tavily_search(request: TavilySearchRequest) -> dict[str, Any]:
    if not search_validator.is_valid(request.arguments):
        return {"code": 0, "data": {"code": 40024, "message": "搜索参数无效"}}
    result = await _run_tavily(request.arguments, request.api_key.get_secret_value())
    return {
        "code": 0,
        "data": {
            "code": result.code,
            "message": result.result.get("error", ""),
            "data": result.result,
        },
    }
