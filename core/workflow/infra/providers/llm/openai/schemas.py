"""
Pydantic schemas for OpenAI message structures.
"""

from pydantic import BaseModel


class OpenAiMessage(BaseModel):
    """
    Schema for OpenAI message format.

    :param role: The role of the message sender (e.g., 'user', 'assistant', 'system')
    :param content: The actual message content
    :param content_type: The type of content, defaults to 'text'
    """

    role: str
    content: str
    content_type: str = "text"
