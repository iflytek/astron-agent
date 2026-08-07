"""
Base data models for OTLP log tracing functionality.

This module provides fundamental data structures used for tracking
model usage statistics and token consumption in workflow execution.
"""

from pydantic import BaseModel


class Usage(BaseModel):
    """
    Model usage statistics for tracking token consumption.

    This class tracks various types of tokens used during model inference,
    including question tokens, prompt tokens, completion tokens, and total tokens.
    """

    question_tokens: int = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
