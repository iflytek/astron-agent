"""
Data schemas and models for iFlytek Spark LLM provider.

This module defines the data structures used for communication with the Spark API,
including message formats, function definitions, and response models.
"""

from typing import Any, Dict

from pydantic import BaseModel


class SparkAiMessage(BaseModel):
    """
    Message structure for Spark AI conversations.

    :param role: The role of the message sender (e.g., 'user', 'assistant')
    :param content: The actual message content
    :param content_type: Type of content, defaults to 'text'
    """

    role: str
    content: str
    content_type: str = "text"


class Function:
    """
    Function definition for Spark function calling.

    This class represents a function that can be called by the Spark LLM,
    including its parameters, name, and description.
    """

    def __init__(
        self,
        parameters: object,
        name: str = "extractor_parameter",
        description: str = "Extract corresponding parameters based on user's question",
    ):
        """
        Initialize a function definition.

        :param parameters: Function parameters schema
        :param name: Function name, defaults to 'extractor_parameter'
        :param description: Function description, defaults to parameter extraction description
        """
        self.name = name
        self.description = description
        self.parameters = parameters

    def dict(self) -> Dict[str, Any]:
        """
        Convert function definition to dictionary format.

        :return: Dictionary representation of the function
        """
        return {
            "name": self.name,
            "description": self.description,
            "parameters": self.parameters,
        }


class StreamOutputMsg(BaseModel):
    """
    Stream output message structure for real-time responses.

    :param domain: The domain or model being used
    :param llm_response: The LLM response data
    :param exception_occurred: Flag indicating if an exception occurred during processing
    """

    domain: str
    llm_response: dict
    exception_occurred: bool = False
