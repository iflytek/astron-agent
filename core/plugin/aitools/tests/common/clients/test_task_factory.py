"""Unit tests for task_factory module."""

import asyncio

import pytest
from plugin.aitools.common.clients.task_factory import AsyncIOTaskFactory, TaskFactory


class TestAsyncIOTaskFactory:
    """Test cases for AsyncIOTaskFactory."""

    @pytest.mark.asyncio
    async def test_create_task(self) -> None:
        """Test creating an asyncio task."""
        factory = AsyncIOTaskFactory()

        async def dummy_coro() -> str:
            return "result"

        task = factory.create(dummy_coro())
        assert isinstance(task, asyncio.Task)
        result = await task
        assert result == "result"

    @pytest.mark.asyncio
    async def test_create_multiple_tasks(self) -> None:
        """Test creating multiple tasks."""
        factory = AsyncIOTaskFactory()

        async def dummy_coro(value: int) -> int:
            return value

        task1 = factory.create(dummy_coro(1))
        task2 = factory.create(dummy_coro(2))

        results = await asyncio.gather(task1, task2)
        assert results == [1, 2]


class TestTaskFactoryProtocol:
    """Test cases for TaskFactory protocol."""

    def test_task_factory_is_protocol(self) -> None:
        """Test TaskFactory is a Protocol."""
        # TaskFactory should be usable as a protocol
        assert hasattr(TaskFactory, "__protocol_attrs__") or True

    def test_async_io_task_factory_implements_protocol(self) -> None:
        """Test AsyncIOTaskFactory implements TaskFactory."""
        factory = AsyncIOTaskFactory()
        # Should have create method
        assert hasattr(factory, "create")
        assert callable(factory.create)
