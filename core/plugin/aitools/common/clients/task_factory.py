"""
Task factory protocol

This module defines a protocol for creating asyncio tasks.
Basically, it only use in unit tests to mock the task creation.
"""

import asyncio
from typing import Any, Awaitable, Coroutine, Protocol, TypeVar

T = TypeVar("T")


class TaskFactory(Protocol):
    def create(self, coro: Awaitable) -> asyncio.Task:
        pass


class AsyncIOTaskFactory:
    def create(self, coro: Coroutine[Any, Any, T]) -> asyncio.Task:
        return asyncio.create_task(coro)
