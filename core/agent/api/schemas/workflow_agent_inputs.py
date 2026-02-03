from typing import Any, Dict, List, Union

from pydantic import BaseModel, Field

from agent.api.schemas.base_inputs import BaseInputs


class CustomCompletionModelConfigInputs(BaseModel):
    domain: str
    api: str
    api_key: str = Field(default="")


class CustomCompletionInstructionInputs(BaseModel):
    reasoning: str = Field(default="")
    answer: str = Field(default="")


class CustomCompletionPluginKnowledgeMatchInputs(BaseModel):
    repo_ids: list[str] = Field(default_factory=list[str])
    doc_ids: list[str] = Field(default_factory=list[str])


class CustomCompletionPluginKnowledgeInputs(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    description: str = Field(..., min_length=0, max_length=1024)
    top_k: int = Field(..., ge=1, le=5)
    match: CustomCompletionPluginKnowledgeMatchInputs = Field(
        default_factory=CustomCompletionPluginKnowledgeMatchInputs
    )
    repo_type: int = Field(..., ge=1, le=3)


class CustomCompletionPluginInputs(BaseModel):
    tools: List[Union[str, Dict[str, Any]]] = Field(default_factory=list)
    mcp_server_ids: list[str] = Field(default_factory=list)
    mcp_server_urls: list[str] = Field(default_factory=list)
    workflow_ids: list[str] = Field(default_factory=list)
    knowledge: list[CustomCompletionPluginKnowledgeInputs] = Field(
        default_factory=list[CustomCompletionPluginKnowledgeInputs]
    )


class CustomCompletionInputs(BaseInputs):
    model_config_inputs: CustomCompletionModelConfigInputs = Field(alias="model_config")
    instruction: CustomCompletionInstructionInputs = Field(
        default_factory=CustomCompletionInstructionInputs
    )
    plugin: CustomCompletionPluginInputs = Field(
        default_factory=CustomCompletionPluginInputs
    )
    max_loop_count: int
