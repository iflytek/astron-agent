"""
Chat API module for workflow system.

This module provides chat-related API endpoints including debug chat,
node debugging, and open API chat completions.
"""

from workflow.api.v1.chat.a2a import discovery_router as a2a_discovery_router
from workflow.api.v1.chat.a2a import router as a2a_router
from workflow.api.v1.chat.debug import router as sse_debug_chat_router
from workflow.api.v1.chat.node_debug import router as node_debug_router
from workflow.api.v1.chat.open import router as sse_openapi_router

__all__ = [
    "a2a_discovery_router",
    "a2a_router",
    "node_debug_router",
    "sse_debug_chat_router",
    "sse_openapi_router",
]
