from dataclasses import dataclass, field
from typing import Any, Dict, Optional
from enum import Enum


class A2AStatus(Enum):
    SUCCESS = "success"
    FAILURE = "failure"
    PENDING = "pending"


@dataclass
class A2AMessage:
    """Represents a message exchanged between agents."""
    sender_id: str
    receiver_id: str
    content: Dict[str, Any]
    message_type: str  # e.g., "request", "response", "notification"
    message_id: str = ""
    correlation_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        if not self.message_id:
            import uuid
            self.message_id = str(uuid.uuid4())
