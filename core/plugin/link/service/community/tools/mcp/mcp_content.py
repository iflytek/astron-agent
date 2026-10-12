"""Convert MCP ``CallToolResult`` objects into the public response schema.

Every content block is forwarded with its full protocol shape. Size limits
are applied explicitly: anything withheld is reported in ``truncation``
instead of being dropped silently.
"""

import json
import os
from dataclasses import dataclass
from typing import Any, Literal

from plugin.link.api.schemas.community.tools.mcp.mcp_tools_schema import (
    MCPCallToolData,
    MCPContent,
    MCPResultTruncation,
)
from pydantic import TypeAdapter

MAX_BLOCKS_ENV = "MCP_TOOL_RESULT_MAX_BLOCKS"
MAX_BYTES_ENV = "MCP_TOOL_RESULT_MAX_BYTES"
DEFAULT_MAX_BLOCKS = 128
DEFAULT_MAX_BYTES = 4 * 1024 * 1024

LimitReason = Literal["max_blocks", "max_bytes"]

_CONTENT_ADAPTER: TypeAdapter[Any] = TypeAdapter(
    MCPCallToolData.model_fields["content"].annotation
)


class ResultLimitError(ValueError):
    """The configured byte limit cannot hold an explicit result status."""


@dataclass(frozen=True)
class ResultLimits:
    """Limits for the complete serialized response data, excluding its envelope."""

    max_blocks: int
    max_bytes: int

    @classmethod
    def from_env(cls) -> "ResultLimits":
        return cls(
            max_blocks=_positive_int_env(MAX_BLOCKS_ENV, DEFAULT_MAX_BLOCKS),
            max_bytes=_positive_int_env(MAX_BYTES_ENV, DEFAULT_MAX_BYTES),
        )


def _positive_int_env(name: str, default: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        value = int(raw)
    except ValueError:
        return default
    return value if value > 0 else default


def _json_size(value: Any) -> int:
    encoded = json.dumps(
        value, ensure_ascii=False, separators=(",", ":"), allow_nan=False
    )
    return len(encoded.encode("utf-8"))


def _with_legacy_fields(block: dict[str, Any]) -> dict[str, Any]:
    if block.get("type") == "image" and block.get("mimeType"):
        block.setdefault("mineType", block["mimeType"])
    return block


def _dump_result(result: Any) -> dict[str, Any]:
    if hasattr(result, "model_dump"):
        dumped = result.model_dump(mode="json", by_alias=True, exclude_none=True)
    else:
        dumped = dict(result)
    return dumped if isinstance(dumped, dict) else {}


def _take_value(value: Any, budget: int) -> tuple[Any, int, bool]:
    if value is None:
        return None, budget, False
    size = _json_size(value)
    if size > budget:
        return None, budget, True
    return value, budget - size, False


def _take_blocks(
    raw_blocks: list[Any], budget: int, limits: ResultLimits
) -> tuple[list[MCPContent], int, LimitReason | None]:
    kept: list[MCPContent] = []
    for raw_block in raw_blocks:
        if len(kept) >= limits.max_blocks:
            return kept, budget, "max_blocks"
        block = _CONTENT_ADAPTER.validate_python(
            [_with_legacy_fields(dict(raw_block))]
        )[0]
        # Count the public shape, including compatibility and unsupported fields.
        size = _json_size(_dump_result(block))
        if size > budget:
            return kept, budget, "max_bytes"
        budget -= size
        kept.append(block)
    return kept, budget, None


def _fit_serialized_result(
    data: MCPCallToolData, truncation: MCPResultTruncation, limits: ResultLimits
) -> MCPCallToolData:
    # Match the route's JSON encoding, including aliases, UTF-8, containers and
    # the truncation object itself. Low-priority metadata is discarded first.
    if _json_size(_dump_result(data)) <= limits.max_bytes:
        return data
    data.truncation = truncation
    truncation.reason = "max_bytes"
    if data.meta is not None:
        data.meta = None
        truncation.metaOmitted = True
    while data.content and _json_size(_dump_result(data)) > limits.max_bytes:
        data.content.pop()
        truncation.returnedBlockCount = len(data.content)
    if _json_size(_dump_result(data)) > limits.max_bytes:
        truncation.structuredContentOmitted |= data.structuredContent is not None
        data.structuredContent = None
    if _json_size(_dump_result(data)) > limits.max_bytes:
        raise ResultLimitError(
            "MCP tool result byte limit cannot hold truncation metadata"
        )
    return data


def build_call_tool_data(
    result: Any, limits: ResultLimits | None = None
) -> MCPCallToolData:
    """Bound the final UTF-8 JSON data, including truncation and public fields.

    Keep authoritative ``structuredContent`` first, then content blocks in
    order, then top-level ``_meta``. If even the omission status cannot fit,
    fail explicitly rather than return an oversized successful result.
    """
    limits = limits or ResultLimits.from_env()
    raw = _dump_result(result)
    raw_blocks = list(raw.get("content") or [])
    structured, budget, structured_omitted = _take_value(
        raw.get("structuredContent"), limits.max_bytes
    )
    content, budget, reason = _take_blocks(raw_blocks, budget, limits)
    meta, _, meta_omitted = _take_value(raw.get("_meta"), budget)
    truncation = MCPResultTruncation(
        reason=reason or "max_bytes",
        maxBlocks=limits.max_blocks,
        maxBytes=limits.max_bytes,
        originalBlockCount=len(raw_blocks),
        returnedBlockCount=len(content),
        structuredContentOmitted=structured_omitted,
        metaOmitted=meta_omitted,
    )
    data = MCPCallToolData(
        isError=bool(raw.get("isError")),
        content=content,
        structuredContent=structured,
        _meta=meta,
        truncation=truncation if reason or structured_omitted or meta_omitted else None,
    )
    return _fit_serialized_result(data, truncation, limits)
