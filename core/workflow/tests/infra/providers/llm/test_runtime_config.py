"""Model broker authorization, rotation and transient credential binding."""

from typing import Any
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from workflow.engine.entities.variable_pool import ParamKey, VariablePool
from workflow.engine.nodes.llm.spark_llm_node import SparkLLMNode
from workflow.exception.e import CustomException
from workflow.infra.providers.llm.runtime_config import resolve_model_config


@pytest.fixture
def broker(monkeypatch: pytest.MonkeyPatch) -> dict[str, Any]:
    monkeypatch.setenv(
        "MODEL_RUNTIME_CONFIG_URL", "http://console/model/internal-runtime-config"
    )
    monkeypatch.setenv("WORKFLOW_INTERNAL_API_KEY", "s" * 32)
    return {
        "modelId": 42,
        "provider": "openai",
        "api": "http://model/v1",
        "domain": "chat",
        "apiKey": "current-key",
    }


def mock_broker(response: httpx.Response) -> Any:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.params == httpx.QueryParams(
            {"flowId": "group", "modelId": "42"}
        )
        assert request.headers["X-Workflow-Internal-Key"] == "s" * 32
        return response

    client = httpx.AsyncClient(
        transport=httpx.MockTransport(handler), follow_redirects=False
    )
    return patch(
        "workflow.infra.providers.llm.runtime_config.httpx.AsyncClient",
        return_value=client,
    )


@pytest.mark.asyncio
async def test_broker_reads_current_credentials_each_time(
    broker: dict[str, Any]
) -> None:
    for key in ("current-key", "rotated-key"):
        broker["apiKey"] = key
        with mock_broker(httpx.Response(200, json={"code": 0, "data": broker})):
            config = await resolve_model_config("group", "42")
        assert config["apiKey"] == key


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "status,payload",
    [
        (403, {"message": "secret-provider-response"}),
        (302, {"message": "secret-provider-response"}),
        (200, {"code": 1, "message": "secret-provider-response"}),
        (
            200,
            {
                "code": 0,
                "data": {
                    "modelId": "unauthorized",
                    "apiKey": "secret-provider-response",
                },
            },
        ),
    ],
)
async def test_broker_failures_are_closed_and_redacted(
    broker: dict[str, Any], status: int, payload: dict[str, Any]
) -> None:
    with mock_broker(httpx.Response(status, json=payload)):
        with pytest.raises(CustomException) as caught:
            await resolve_model_config("group", "42")
    assert "secret-provider-response" not in str(caught.value)


@pytest.mark.asyncio
async def test_missing_scope_never_calls_broker(broker: dict[str, Any]) -> None:
    with patch(
        "workflow.infra.providers.llm.runtime_config.httpx.AsyncClient"
    ) as client:
        with pytest.raises(CustomException):
            await resolve_model_config("", "42")
        client.assert_not_called()


@pytest.mark.asyncio
async def test_llm_uses_fresh_authorized_config_only_in_client(
    broker: dict[str, Any]
) -> None:
    node = SparkLLMNode(
        node_id="spark-llm::1",
        node_type="spark-llm",
        alias_name="Model",
        input_identifier=[],
        output_identifier=[],
        appId="app",
        domain="stale",
        modelId=42,
        apiKey="untrusted-key",
        url="http://untrusted",
        source="google",
    )
    pool = VariablePool(protocol=[])
    pool.system_params.set(ParamKey.FlowId, "version-id").set(
        ParamKey.ModelFlowId, "group"
    )
    with patch(
        "workflow.engine.nodes.base_node.resolve_model_config",
        new_callable=AsyncMock,
        return_value=broker,
    ) as resolve:
        client = await node._get_runtime_chat_ai(pool)
    resolve.assert_awaited_once_with("group", "42")
    assert client.api_key == "current-key"
    assert client.model_url == "http://model/v1"
    assert client.model_name == "chat"
    assert client.provider == "openai"
    assert node.apiKey == "untrusted-key"
    assert "apiKey" not in node.model_dump()
    assert "current-key" not in repr(node)
    assert "current-key" not in repr(pool)
