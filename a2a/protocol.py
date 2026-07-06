from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional
from enum import Enum


class A2AMessageType(str, Enum):
    AGENT_CARD = "agent_card"
    TASK_STATE = "task_state"
    TASK_QUERY = "task_query"
    TASK_CANCEL = "task_cancel"
    ERROR = "error"


@dataclass
class A2AMessage:
    type: A2AMessageType
    source: str
    target: str
    data: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_json(self) -> str:
        return json.dumps(asdict(self))

    @classmethod
    def from_json(cls, json_str: str) -> A2AMessage:
        data = json.loads(json_str)
        return cls(
            type=A2AMessageType(data["type"]),
            source=data["source"],
            target=data["target"],
            data=data.get("data", {}),
            metadata=data.get("metadata", {})
        )


class A2AError(Exception):
    def __init__(self, message: str, code: int = 400):
        self.message = message
        self.code = code
        super().__init__(self.message)

    def to_message(self, source: str, target: str) -> A2AMessage:
        return A2AMessage(
            type=A2AMessageType.ERROR,
            source=source,
            target=target,
            data={"error": self.message, "code": self.code}
        )
