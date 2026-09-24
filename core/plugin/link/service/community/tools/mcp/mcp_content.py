"""Convert MCP ``CallToolResult`` objects into the public response schema.

Every content block is forwarded with its full protocol shape. Size limits
are applied explicitly: anything withheld is reported in ``truncation``
instead of being dropped silently.
"""

import json
import os
from dataclasses import dataclass
from typing import Any

from plugin.link.api.schemas.community.tools.mcp.mcp_tools_schema import (
    MCPCallToolData,
    MCPContentBlock,
    MCPResultTruncation,
)
from pydantic import TypeAdapter

MAX_BLOCKS_ENV = "MCP_TOOL_RESULT_MAX_BLOCKS"
MAX_BYTES_ENV = "MCP_TOOL_RESULT_MAX_BYTES"
DEFAULT_MAX_BLOCKS = 128
DEFAULT_MAX_BYTES = 4 * 1024 * 1024

_CONTENT_ADAPTER: TypeAdapter[Any] = TypeAdapter(
    MCPCallToolData.model_fields["content"].annotation
)


@dataclass(frozen=True)
class ResultLimits:
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
    encoded = json.dumps(value, ensure_ascii=False, separators=(",", ":"), default=str)
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


def build_call_tool_data(
    result: Any, limits: ResultLimits | None = None
) -> MCPCallToolData:
    """Build the public tool result, bounded by ``limits``.

    ``structuredContent`` is budgeted first because it is the authoritative
    machine-readable result; content blocks follow in order until the block
    count or byte budget is exhausted.
    """
    limits = limits or ResultLimits.from_env()
    raw = _dump_result(result)
    raw_blocks = list(raw.get("content") or [])
    budget = limits.max_bytes

    structured = raw.get("structuredContent")
    structured_omitted = False
    if structured is not None:
        size = _json_size(structured)
        if size > budget:
            structured, structured_omitted = None, True
        else:
            budget -= size

    kept: list[dict[str, Any]] = []
    reason: str | None = "max_bytes" if structured_omitted else None
    for raw_block in raw_blocks:
        if len(kept) >= limits.max_blocks:
            reason = "max_blocks"
            break
        size = _json_size(raw_block)
        if size > budget:
            reason = "max_bytes"
            break
        budget -= size
        kept.append(_with_legacy_fields(dict(raw_block)))

    truncation = None
    if reason is not None:
        truncation = MCPResultTruncation(
            reason=reason,
            maxBlocks=limits.max_blocks,
            maxBytes=limits.max_bytes,
            originalBlockCount=len(raw_blocks),
            returnedBlockCount=len(kept),
            structuredContentOmitted=structured_omitted,
        )

    content: list[MCPContentBlock] = _CONTENT_ADAPTER.validate_python(kept)
    return MCPCallToolData(
        isError=bool(raw.get("isError")),
        content=content,
        structuredContent=structured,
        meta=raw.get("_meta"),
        truncation=truncation,
    )
