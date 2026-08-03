import re
from collections.abc import Sequence
from typing import Any

from agent.api.schemas.llm_message import LLMMessage
from agent.service.plugin.base import BasePlugin


def normalize_tool_name(name: str) -> str:
    normalized = re.sub(r"[^A-Za-z0-9_]+", "_", name.strip()).strip("_") or "tool"
    if not re.match(r"^[A-Za-z_]", normalized):
        return f"tool_{normalized}"
    return normalized


def build_tool_contracts(
    plugins: Sequence[BasePlugin],
) -> tuple[list[dict[str, Any]], dict[str, BasePlugin]]:
    counts: dict[str, int] = {}
    contracts: list[dict[str, Any]] = []
    plugin_by_runtime_name: dict[str, BasePlugin] = {}
    for plugin in plugins:
        base_name = normalize_tool_name(plugin.name)
        count = counts.get(base_name, 0) + 1
        counts[base_name] = count
        runtime_name = base_name if count == 1 else f"{base_name}__{count}"
        contracts.append(
            {
                "name": plugin.name,
                "description": plugin.description,
                "parameters": plugin.parameters,
                "toolType": plugin.typ,
            }
        )
        plugin_by_runtime_name[runtime_name] = plugin
    return contracts, plugin_by_runtime_name


def build_system_prompt(instruct: str, knowledge: str) -> str:
    parts = [part for part in [instruct.strip()] if part]
    if knowledge.strip():
        parts.append(f"Reference context:\n{knowledge.strip()}")
    return "\n\n".join(parts)


def history_payload(chat_history: Sequence[LLMMessage]) -> list[dict[str, str]]:
    return [
        {"role": message.role, "content": message.content}
        for message in chat_history
        if message.role in {"user", "assistant"}
    ]
