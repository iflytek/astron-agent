"""Read built-in tool facts from the running AI Tools service's OpenAPI API."""

import os
from typing import Any

import httpx
from loguru import logger
from plugin.link.api.schemas.community.tools.http.management_schema import (
    ToolManagerResponse,
)
from plugin.link.utils.errors.code import ErrCode
from referencing import Registry, Resource
from referencing.jsonschema import DRAFT202012


def _inline_local_refs(document: dict[str, Any]) -> dict[str, Any]:
    """Resolve local references with the official JSON Schema reference resolver.

    Runtime HTTP parameter projection needs inline schemas. External and recursive
    references are rejected, rather than fetched or silently weakened.
    """
    resolver = (
        Registry()
        .with_resource("", Resource(contents=document, specification=DRAFT202012))
        .resolver()
    )

    def visit(value: Any, seen: frozenset[str] = frozenset()) -> Any:
        if isinstance(value, list):
            return [visit(item, seen) for item in value]
        if not isinstance(value, dict):
            return value
        if "$ref" in value:
            ref = value["$ref"]
            if not isinstance(ref, str) or not ref.startswith("#/") or ref in seen:
                raise ValueError(
                    "Built-in schema requires a nonrecursive local reference"
                )
            target = resolver.lookup(ref).contents
            return visit(
                {**target, **{k: v for k, v in value.items() if k != "$ref"}},
                seen | {ref},
            )
        return {key: visit(item, seen) for key, item in value.items()}

    return visit(document)


def catalog_from_service(
    payload: dict[str, Any], base_url: str
) -> list[dict[str, Any]]:
    document = _inline_local_refs(payload["openapi"])
    tools = []
    for entry in payload["tools"]:
        path = entry["path"]
        operation = document["paths"][path]["post"]
        if operation.get("deprecated") or "public_cn" not in operation.get("tags", []):
            continue
        tools.append(
            {
                "id": entry["id"],
                "name": entry["name"],
                "description": entry["description"],
                "version": "V1.0",
                "configured": payload["configured"] is True,
                "available": payload["configured"] is True,
                "health": "unknown",
                "configurationHint": payload["configurationHint"],
                "openapi_schema": {
                    "openapi": document["openapi"],
                    "info": {
                        "title": entry["name"],
                        "version": "1.0.0",
                        "x-astron-response-envelope": "aitools-v1",
                    },
                    "servers": [{"url": base_url}],
                    "paths": {path: {"post": operation}},
                },
            }
        )
    return tools


async def builtin_catalog() -> ToolManagerResponse:
    base_url = os.getenv("AITOOLS_BASE_URL", "http://core-aitools:18668").rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=False) as client:
            response = await client.get(f"{base_url}/aitools/v1/catalog")
            response.raise_for_status()
            tools = catalog_from_service(response.json(), base_url)
        logger.info("Built-in tool discovery completed; tools={}", len(tools))
        return ToolManagerResponse(
            code=0, message="success", sid="", data={"tools": tools}
        )
    except Exception as exc:
        logger.warning("Built-in tool discovery failed; type={}", type(exc).__name__)
        return ToolManagerResponse(
            code=ErrCode.COMMON_ERR.code,
            message="内置工具服务暂时不可达，请稍后重试",
            sid="",
            data={"tools": []},
        )
