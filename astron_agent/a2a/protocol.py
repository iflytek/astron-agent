import json
from dataclasses import dataclass, asdict
from typing import Any, Dict, Optional, List
from enum import Enum


class MessageType(Enum):
    TASK = "task"
    RESULT = "result"
    ERROR = "error"
    PING = "ping"
    PONG = "pong"


@dataclass
class A2AMessage:
    """Represents an A2A message between agents."""
    sender_id: str
    receiver_id: str
    message_type: MessageType
    payload: Dict[str, Any]
    message_id: str
    correlation_id: Optional[str] = None
    timestamp: Optional[str] = None

    def to_json(self) -> str:
        data = asdict(self)
        data["message_type"] = self.message_type.value
        return json.dumps(data)

    @staticmethod
    def from_json(json_str: str) -> "A2AMessage":
        data = json.loads(json_str)
        data["message_type"] = MessageType(data["message_type"])
        return A2AMessage(**data)


class A2AEndpoints:
    """HTTP endpoints for A2A communication."""
    SEND_MESSAGE = "/a2a/send"
    RECEIVE_MESSAGE = "/a2a/receive"
    REGISTER_AGENT = "/a2a/register"
    DISCOVER_AGENTS = "/a2a/discover"
    HEALTH = "/a2a/health"