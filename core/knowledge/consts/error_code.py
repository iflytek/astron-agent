# -*- coding: utf-8 -*-
"""
Error code enumeration module.

This module defines various error codes and error messages used in the system.
"""

# pylint: disable=invalid-name
from enum import Enum


class CodeEnum(Enum):
    """
    System error code enumeration class.

    Defines error codes and corresponding error messages for various business scenarios.
    """

    ParameterCheckException = (10001, "Parameter check exception")
    MissingParameter = (10002, "Missing parameter")
    ParameterInvalid = (10003, "Parameter invalid")
    UnexpectedErr = (10004, "Unexpected recv user message invalid")

    FileSplitFailed = (10016, "File splitting failed")
    ChunkSaveFailed = (10017, "Chunk save failed")
    ChunkUpdateFailed = (10018, "Chunk update failed")
    ChunkDeleteFailed = (10019, "Chunk delete failed")
    ChunkQueryFailed = (10020, "Chunk query failed")

    GetFileContentFailed = (10024, "File content retrieval failed")
    FileStorageError = (10025, "File storage failed")
    CBG_RAGError = (10026, "Xinghuo knowledge base request failed")
    AIUI_RAGError = (10027, "AIUI knowledge base request failed")
    DESK_RAGError = (10028, "DESK knowledge base request failed")
    RAGFLOW_RAGError = (10029, "RAGFlow knowledge base request failed")

    ThirdPartyServiceFailed = (11111, "Third Party Service Failed")
    ServiceException = (14999, "Service Exception")

    @property
    def code(self) -> int:
        """Get status code"""
        return self.value[0]

    @property
    def msg(self) -> str:
        """Get status code message"""
        return self.value[1]
