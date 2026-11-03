"""Shared model node behavior after removing provider-specific execution paths."""

from unittest.mock import AsyncMock, Mock, patch

import pytest

from workflow.domain.entities.chat import ContentTypeEnum, HistoryItem, RoleEnum
from workflow.engine.entities.history import History
from workflow.engine.nodes.decision.decision_node import DecisionNode
from workflow.engine.nodes.params_extractor.pe_node import ParamsExtractorNode
from workflow.infra.providers.llm.schemas import ChatMessage


def node_options() -> dict:
    return {
        "input_identifier": ["question"],
        "output_identifier": ["answer"],
        "domain": "configured-model",
        "appId": "app-id",
        "source": "openai",
    }


@pytest.mark.asyncio
async def test_legacy_history_is_preserved_in_model_messages() -> None:
    node = DecisionNode(**node_options())
    span = Mock(add_info_events_async=AsyncMock())
    processed = await node._process_history(
        "follow-up",
        span,
        history=[
            ChatMessage(role="user", content="first"),
            ChatMessage(role="assistant", content="reply"),
        ],
        system_input="instructions",
    )

    messages = await node._assemble_messages(span, processed)

    assert messages == [
        {"role": "system", "content": "instructions"},
        {"role": "user", "content": "first"},
        {"role": "assistant", "content": "reply"},
        {"role": "user", "content": "follow-up"},
    ]


@pytest.mark.asyncio
async def test_v2_history_keeps_media_for_model_adapter() -> None:
    node = DecisionNode(**node_options())
    span = Mock(add_info_events_async=AsyncMock())
    history = History(
        origin_history=[
            HistoryItem(
                role=RoleEnum.user,
                content="https://media.example/image.png",
                content_type=ContentTypeEnum.image,
            ),
            HistoryItem(role=RoleEnum.user, content="describe"),
            HistoryItem(role=RoleEnum.assistant, content="a landscape"),
        ]
    )
    processed = await node._process_history("more detail", span, history_v2=history)

    messages = await node._assemble_messages(span, processed, history)

    assert messages[0]["content_type"] == "image"
    assert messages[0]["content"] == "https://media.example/image.png"
    assert [m["content"] for m in messages[1:]] == [
        "describe",
        "a landscape",
        "more detail",
    ]
    assert "content_type" not in messages[1]


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "mode,method", [(0, "async_execute_normal"), (1, "async_execute_prompt")]
)
async def test_decision_uses_provider_independent_classification(
    mode: int, method: str
) -> None:
    node = DecisionNode(**node_options(), reasonMode=mode)
    with patch.object(DecisionNode, method, new_callable=AsyncMock) as execute:
        result = await node.async_execute(Mock(), Mock())
    assert result is execute.return_value
    execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_parameter_extraction_uses_provider_independent_prompt() -> None:
    node = ParamsExtractorNode(**node_options())
    with patch.object(
        ParamsExtractorNode, "async_execute_prompt", new_callable=AsyncMock
    ) as execute:
        result = await node.async_execute(Mock(), Mock())
    assert result is execute.return_value
    execute.assert_awaited_once()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "mode,response",
    [
        (0, '{"destination":"support","next_inputs":"help"}'),
        (1, '{"category_name":"support"}'),
    ],
)
async def test_decision_routes_real_prompt_result(mode: int, response: str) -> None:
    node = DecisionNode(
        **node_options(),
        reasonMode=mode,
        intentChains=[
            {
                "id": "intent-one-of::support",
                "name": "support",
                "description": "Support requests",
                "intentType": 2,
            },
            {
                "id": "intent-one-of::default",
                "name": "default",
                "description": "Other requests",
                "intentType": 1,
            },
        ]
    )
    variables = Mock()
    variables.get_variable.return_value = "Please help"
    span = Mock(add_info_events_async=AsyncMock(), add_info_event_async=AsyncMock())
    with patch.object(
        DecisionNode,
        "_chat_with_llm",
        new_callable=AsyncMock,
        return_value=({"total_tokens": 5}, response, "", []),
    ) as chat:
        result = await node.async_execute(variables, span)

    chat.assert_awaited_once()
    assert result.outputs == {"answer": "support"}
    assert result.edge_source_handle == "intent-one-of::support"
    assert result.token_cost.total_tokens == 5
    span.record_exception.assert_not_called()


@pytest.mark.asyncio
async def test_extractor_parses_real_prompt_result_and_validates_output() -> None:
    node = ParamsExtractorNode(
        **node_options(),
        node_id="extractor::test",
        extractor_params=[
            {"name": "answer", "schema": {"type": "string"}, "required": True},
        ]
    )
    variables = Mock()
    variables.get_variable.return_value = "The answer is blue"
    variables.validate_template = {"type": "object", "properties": {}}
    variables.output_variable_mapping = {
        "extractor::test-answer": {"schema": {"type": "string"}, "required": True}
    }
    span = Mock(add_info_events_async=AsyncMock())
    with patch.object(
        ParamsExtractorNode,
        "_chat_with_llm",
        new_callable=AsyncMock,
        return_value=({"total_tokens": 4}, '{"answer":"blue"}', "", []),
    ) as chat:
        result = await node.async_execute(variables, span)

    chat.assert_awaited_once()
    assert result.outputs == {"answer": "blue"}
    assert result.token_cost.total_tokens == 4
    span.record_exception.assert_not_called()


@pytest.mark.asyncio
async def test_direct_knowledge_search_does_not_load_model_secrets(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from workflow.configs import workflow_config
    from workflow.engine.nodes.entities.node_run_result import (
        WorkflowNodeExecutionStatus,
    )
    from workflow.engine.nodes.knowledge.knowledge_node import (
        KnowledgeClient,
        KnowledgeNode,
    )

    monkeypatch.setenv("KNOWLEDGE_BASE_URL", "http://knowledge")
    monkeypatch.setattr(
        workflow_config.knowledge_node_llm_config, "api_key", "deployment-secret"
    )
    node = KnowledgeNode(**node_options(), node_id="knowledge-base::1")
    variables = Mock()
    variables.get_variable.return_value = "search"
    variables.system_params.get.return_value = "flow"
    with patch.object(
        KnowledgeClient, "top_k", new_callable=AsyncMock, return_value='{"results": []}'
    ), patch(
        "workflow.engine.nodes.base_node.resolve_model_config", new_callable=AsyncMock
    ) as broker:
        result = await node.execute(variables, Mock())
    assert result.status == WorkflowNodeExecutionStatus.SUCCEEDED
    assert result.outputs == {"answer": []}
    assert node.apiKey == ""
    assert node.domain == "configured-model"
    broker.assert_not_called()


@pytest.mark.asyncio
async def test_adaptive_knowledge_uses_transient_deployment_helper_model(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from workflow.configs import workflow_config
    from workflow.engine.entities.variable_pool import ParamKey, VariablePool
    from workflow.engine.nodes.knowledge.knowledge_node import KnowledgeNode

    config = workflow_config.knowledge_node_llm_config
    monkeypatch.setattr(config, "api_key", "helper-key")
    monkeypatch.setattr(config, "base_url", "http://helper/v1")
    monkeypatch.setattr(config, "model", "helper-model")
    monkeypatch.setattr(config, "temperature", 0.2)
    node = KnowledgeNode(**node_options(), search_mode="adaptive")
    variables = VariablePool(protocol=[])
    variables.system_params.set(ParamKey.Uid, "user")
    with patch(
        "workflow.engine.nodes.base_node.resolve_model_config", new_callable=AsyncMock
    ) as broker:
        client = await node._get_runtime_chat_ai(variables)
    assert client.api_key == "helper-key"
    assert client.model_url == "http://helper/v1"
    assert client.model_name == "helper-model"
    assert client.temperature == 0.2
    assert node.apiKey == ""
    assert node.url == ""
    assert node.domain == "configured-model"
    broker.assert_not_called()
