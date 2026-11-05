from unittest.mock import AsyncMock, MagicMock

import pytest

from workflow.engine.nodes.code import code_node
from workflow.engine.nodes.code.executor import base_executor
from workflow.engine.nodes.entities import node_run_result as node_result
from workflow.exception.e import CustomException
from workflow.exception.errors.err_code import CodeEnum


@pytest.mark.parametrize(
    "source",
    [
        "def main():\n    return {}",
        "def main(   ):\n    return {}",
    ],
)
def test_parser_accepts_zero_parameter_main(source: str) -> None:
    assert code_node._parser_code_parameter(source) == []


def test_parser_preserves_main_parameters() -> None:
    source = "\n".join(
        [
            "def main(name: str, count: int):",
            "    return {'name': name, 'count': count}",
        ]
    )

    assert code_node._parser_code_parameter(source) == ["name", "count"]


def test_parser_rejects_code_without_main() -> None:
    with pytest.raises(CustomException) as exc_info:
        code_node._parser_code_parameter("def helper():\n    return {}")

    assert exc_info.value.code == CodeEnum.CODE_BUILD_ERROR.code


@pytest.mark.asyncio
async def test_code_node_executes_zero_parameter_main(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    executor = AsyncMock()
    executor.execute.return_value = '{"result":"ok"}'
    monkeypatch.setattr(
        base_executor.CodeExecutorFactory,
        "create_executor",
        lambda _executor_type: executor,
    )
    node = code_node.CodeNode(
        codeLanguage="python",
        input_identifier=[],
        output_identifier=["result"],
        code="def main():\n    return {'result': 'ok'}",
        appId="app-1",
        uid="user-1",
        node_id="ifly-code::node-1",
        sandbox={"enabled": True, "uid": "user-1"},
    )
    variable_pool = MagicMock()
    variable_pool.system_params.get.return_value = {}
    variable_pool.get_output_schema.return_value = {"type": "string"}
    span = MagicMock()
    span.add_info_events_async = AsyncMock()
    span.add_info_event_async = AsyncMock()

    result = await node.async_execute(variable_pool, span)

    assert result.status is node_result.WorkflowNodeExecutionStatus.SUCCEEDED
    assert result.inputs == {}
    assert result.outputs == {"result": "ok"}
    variable_pool.get_variable.assert_not_called()
    executor.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_code_node_preserves_isolated_executor_error_code(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    executor = AsyncMock()
    executor.execute.side_effect = CustomException(
        CodeEnum.CODE_EXECUTION_TIMEOUT_ERROR,
        err_msg="Execution timed out after 10 seconds",
    )
    monkeypatch.setenv("CODE_EXEC_TYPE", "langchain")
    monkeypatch.setattr(
        base_executor.CodeExecutorFactory,
        "create_executor",
        lambda _executor_type: executor,
    )
    node = code_node.CodeNode(
        codeLanguage="python",
        input_identifier=[],
        output_identifier=["result"],
        code="def main():\n    return {'result': 'ok'}",
        appId="app-1",
        uid="user-1",
        node_id="ifly-code::node-1",
    )
    variable_pool = MagicMock()
    span = MagicMock()
    span.add_info_events_async = AsyncMock()
    span.add_info_event_async = AsyncMock()

    result = await node.async_execute(variable_pool, span)

    assert result.status is node_result.WorkflowNodeExecutionStatus.FAILED
    assert result.error is not None
    assert result.error.code == CodeEnum.CODE_EXECUTION_TIMEOUT_ERROR.code
    assert "Execution timed out" in result.error.message
