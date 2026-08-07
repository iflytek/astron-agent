import pytest
from pydantic import ValidationError

from workflow.consts.engine.model_provider import ModelProviderEnum
from workflow.engine.nodes.llm.spark_llm_node import SparkLLMNode


def build_anthropic_node(temperature: float) -> SparkLLMNode:
    return SparkLLMNode(
        input_identifier=[],
        output_identifier=["output"],
        domain="test-model",
        appId="test-app",
        source=ModelProviderEnum.ANTHROPIC.value,
        temperature=temperature,
    )


def test_anthropic_compatible_node_accepts_zero_temperature() -> None:
    node = build_anthropic_node(0)

    assert node.temperature == 0


def test_llm_node_rejects_negative_temperature() -> None:
    with pytest.raises(ValidationError):
        build_anthropic_node(-0.1)
