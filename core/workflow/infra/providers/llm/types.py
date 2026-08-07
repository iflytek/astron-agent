from typing import Dict, List, Optional

from pydantic import BaseModel


class SystemUserMsg(BaseModel):
    """
    Data model for system and user message components in LLM conversations.

    This class encapsulates the different types of messages that can be sent
    to a Large Language Model, including system instructions, user messages,
    and processed conversation history.
    """

    system_msg: Optional[Dict] = (
        None  # System-level instructions or context for the LLM
    )
    user_msg: Optional[Dict] = None  # User input message content
    processed_history: List = []  # List of previously processed conversation messages
