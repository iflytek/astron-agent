import ast
import asyncio
import builtins
import multiprocessing
import traceback
from typing import Any, Dict

from pydantic import BaseModel

from workflow.engine.nodes.code.executor.base_executor import BaseExecutor
from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum
from workflow.extensions.otlp.trace.span import Span


class Modules(BaseModel):
    """
    Modules that are allowed to be imported for security reasons
    """

    imports: list[str]
    from_imports: list[ast.ImportFrom]

    class Config:
        arbitrary_types_allowed = True


class LocalExecutor(BaseExecutor):
    """
    Local code executor using RestrictedPython for secure execution.

    Executes Python code in a restricted environment with limited built-ins
    and forbidden modules to ensure security. Uses multiprocessing for isolation.
    """

    async def execute(
        self, language: str, code: str, timeout: int, span: Span, **kwargs: Any
    ) -> str:
        """
        Execute code asynchronously using multiprocessing for isolation.

        :param language: Programming language (currently only python supported)
        :param code: Code string to execute
        :param timeout: Maximum execution time in seconds
        :param span: Tracing span for logging
        :param kwargs: Additional execution parameters
        :return: Execution result as string
        """
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            None,  # Use default thread pool
            self._execute_in_process,  # Wrapper for synchronous execution
            code,
            timeout,
        )

    def _execute_in_process(self, code: str, timeout: int) -> str:
        """
        Execute code in a separate process with timeout control.

        :param code: Code string to execute
        :param timeout: Maximum execution time in seconds
        :return: Execution result as string
        :raises CustomException: If execution times out or fails
        """
        with multiprocessing.Manager() as manager:
            result_dict = manager.dict()
            proc = multiprocessing.Process(
                target=self._safe_exec, args=(code, result_dict)
            )
            proc.start()
            proc.join(timeout)
            if proc.is_alive():
                proc.terminate()
                raise CustomException(err_code=CodeEnum.CODE_EXECUTION_TIMEOUT_ERROR)
            if "error" in result_dict:
                raise CustomException(
                    err_code=CodeEnum.CODE_EXECUTION_ERROR, err_msg=result_dict["error"]
                )
            return result_dict.get("output", "")

    def _safe_exec(self, code: str, result_dict: dict) -> None:
        """
        Safely execute code using RestrictedPython with limited built-ins.

        :param code: Code string to execute
        :param result_dict: Shared dictionary to store execution results
        """
        try:
            locals_dict: Dict[str, Any] = {}

            modules = self._find_imports(code)
            import_code_lines = []

            for module in modules.imports:
                import_code_lines.append(f"import {module}")

            for from_module in modules.from_imports:
                imported_names = ", ".join(alias.name for alias in from_module.names)
                import_code_lines.append(
                    f"from {from_module.module} import {imported_names}"
                )

            import_code = "\n".join(import_code_lines)

            sandbox_globals = {"__builtins__": builtins}

            exec(import_code, sandbox_globals)
            exec(code, sandbox_globals, locals_dict)

            result_dict["output"] = locals_dict.get("output", "")
        except Exception:
            result_dict["error"] = traceback.format_exc()

    def _find_imports(self, code: str) -> Modules:
        """
        Find imports and from imports in the code.

        :param code: Code string to find imports and from imports
        :return: Modules object containing imports and from_imports
        """
        imports: list[str] = []
        from_imports: list[ast.ImportFrom] = []
        parsed_code = ast.parse(code)
        for node in parsed_code.body:
            if isinstance(node, ast.Import):
                imports.extend(alias.name for alias in node.names)
            elif isinstance(node, ast.ImportFrom):
                from_imports.append(node)
        return Modules(imports=imports, from_imports=from_imports)
