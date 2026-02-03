from abc import ABC, abstractmethod
from typing import Any

from workflow.extensions.otlp.trace.span import Span


class BaseExecutor(ABC):
    """
    Abstract base class for code executors.

    Defines the interface that all code execution implementations must follow,
    providing a consistent API for executing code in different environments.
    """

    @abstractmethod
    async def execute(
        self, language: str, code: str, timeout: int, span: Span, **kwargs: Any
    ) -> str:
        """
        Execute code in the specified language with given parameters.

        :param language: Programming language for code execution (currently only python supported)
        :param code: Code string to be executed
        :param timeout: Maximum execution time in seconds
        :param span: Tracing span for logging execution details
        :param kwargs: Additional keyword arguments for execution context
        :return: Execution result as string
        """
        raise NotImplementedError


class CodeExecutorFactory:
    """
    Factory class for creating code executors.

    Provides a centralized way to instantiate different types of code executors
    based on configuration or runtime requirements.
    """

    @staticmethod
    def create_executor(executor: str) -> BaseExecutor:
        """
        Create a code executor instance based on the specified type.

        :param executor: Executor type identifier ("local", "langchain", or "ifly")
        :return: Configured executor instance
        :raises Exception: If the specified executor type is not supported
        """
        if executor == "local":
            # Local execution using RestrictedPython for security
            from workflow.engine.nodes.code.executor.local.local_executor import (
                LocalExecutor,
            )

            return LocalExecutor()
        elif executor == "langchain":
            # Langchain sandbox execution environment
            from workflow.engine.nodes.code.executor.langchain.langchain_executor import (
                LangchainExecutor,
            )

            return LangchainExecutor()
        elif executor == "ifly":
            # IFly remote execution service
            from workflow.engine.nodes.code.executor.ifly.ifly_executor import (
                IFlyExecutor,
            )

            return IFlyExecutor()
        elif executor == "ifly-v2":
            from workflow.engine.nodes.code.executor.ifly.ifly_executor_v2 import (
                IFlyExecutorV2,
            )

            return IFlyExecutorV2()
        else:
            raise Exception(f"Unsupported executor type: {executor}")
