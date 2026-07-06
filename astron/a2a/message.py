from dataclasses import dataclass, asdict
from typing import Optional
import json

@dataclass
class A2AMessage:
    sender: str
    receiver: str
    content: str
    message_type: str = "text"
    metadata: Optional[dict] = None

    def to_json(self) -> str:
        return json.dumps(asdict(self))

    @classmethod
    def from_json(cls, data: str) -> "A2AMessage":
        return cls(**json.loads(data))
