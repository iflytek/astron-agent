from dataclasses import dataclass, field, asdict
from typing import Dict, Any, Optional, List
from enum import Enum
import json

class MessageType(Enum):
    AGENT_CARD = "agent_card"
    TASK = "task"
    RESULT = "result"
    ERROR = "error"
    DISCOVERY_REQUEST = "discovery_request"
    DISCOVERY_RESPONSE = "discovery_response"

@dataclass
class A2AMessage:
    type: MessageType
    source: str
    destination: Optional[str] = None
    task_id: Optional[str] = None
    payload: Dict[str, Any] = field(default_factory=dict)

    def to_json(self) -> str:
        data = asdict(self)
        data["type"] = self.type.value
        return json.dumps(data)

    @classmethod
    def from_json(cls, json_str: str) -> "A2AMessage":
        data = json.loads(json_str)
        data["type"] = MessageType(data["type"])
        return cls(**data)

@dataclass
class AgentCard:
    agent_id: str
    name: str
    description: str
    capabilities: List[str] = field(default_factory=list)
    endpoint: str = ""
    version: str = "0.1.0"

@dataclass
class TaskMessage(A2AMessage):
    task_type: str = ""
    parameters: Dict[str, Any] = field(default_factory=dict)

@dataclass
class ResultMessage(A2AMessage):
    success: bool = True
    result: Any = None

@dataclass
class ErrorMessage(A2AMessage):
    error_code: int = 0
    error_message: str = ""

@dataclass
class DiscoveryRequest(A2AMessage):
    query: Optional[str] = None

@dataclass
class DiscoveryResponse(A2AMessage):
    agents: List[AgentCard] = field(default_factory=list)