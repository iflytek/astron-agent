"""
Model provider constants.

This module defines the available model providers for LLM operations
in the workflow system.
"""

from enum import Enum


class ModelProviderEnum(Enum):
    """
    Model provider enumeration.

    Defines the available model providers for large language model operations.
    """

    XINGHUO = "xinghuo"
    OPENAI = "openai"
    DEEPSEEK = "deepseek"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"
    MINIMAX = "minimax"
    ZHIPU = "zhipu"
    QWEN = "qwen"
    MOONSHOT = "moonshot"
    CHATGPT = "chatgpt"
    DOUBAO = "doubao"
