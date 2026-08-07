"""
Constants and enumerations for Knowledge Pro node configuration.

This module defines the enumeration types used for configuring RAG (Retrieval-Augmented Generation)
types and repository types in the Knowledge Pro node.
"""

from enum import Enum


class RagTypeEnum(Enum):
    """
    Enumeration for RAG (Retrieval-Augmented Generation) types.

    Defines the different modes of retrieval and generation used in knowledge base operations.
    """

    AGENTIC_RAG = 1  # Agent-based RAG with deep search capabilities
    LONG_RAG = 2  # Long context RAG for extended document processing

    @staticmethod
    def getitem(item: int) -> str:
        """
        Get the string representation of a RAG type enum value.

        :param item: The integer value of the RAG type enum
        :return: The corresponding string representation
        :raises ValueError: If the provided item value is not valid
        """
        v_map = {
            RagTypeEnum.AGENTIC_RAG.value: "DeepSearch",
            # RagTypeEnum.AGENTIC_RAG.value: "R2RAG",  # Alternative implementation (commented)
            RagTypeEnum.LONG_RAG.value: "LongRAG",
        }
        if item not in v_map:
            raise ValueError(f"Invalid RagTypeEnum value: {item}")
        return v_map[item]


class RepoTypeEnum(Enum):
    """
    Enumeration for repository types in knowledge base operations.

    Defines the different types of knowledge repositories that can be used
    for document retrieval and processing.
    """

    AIUI_RAG2 = 1  # AIUI RAG version 2 repository
    CBG_RAG = 2  # CBG (Content-Based Generation) RAG repository

    @staticmethod
    def getitem(item: int) -> str:
        """
        Get the string representation of a repository type enum value.

        :param item: The integer value of the repository type enum
        :return: The corresponding string representation
        :raises ValueError: If the provided item value is not valid
        """
        v_map = {
            RepoTypeEnum.AIUI_RAG2.value: "AIUI-RAG2",
            RepoTypeEnum.CBG_RAG.value: "CBG-RAG",
        }
        if item not in v_map:
            raise ValueError(f"Invalid RepoTypeEnum value: {item}")
        return v_map[item]
