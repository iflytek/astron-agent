from enum import Enum


class NodeType(Enum):
    """
    Enumeration of all supported node types in the workflow system.
    """

    START = "node-start"
    END = "node-end"
    LLM = "spark-llm"
    KNOWLEDGE_BASE = "knowledge-base"
    KNOWLEDGE_PRO = "knowledge-pro-base"
    IF_ELSE = "if-else"
    CODE = "ifly-code"
    DECISION_MAKING = "decision-making"
    ITERATION = "iteration"
    ITERATION_START = "iteration-node-start"
    ITERATION_END = "iteration-node-end"
    PARAMETER_EXTRACTOR = "extractor-parameter"
    TEXT_JOINER = "text-joiner"
    FLOW = "flow"
    MESSAGE = "message"
    AGENT = "agent"
    PLUGIN = "plugin"
    QUESTION_ANSWER = "question-answer"
    DATABASE = "database"
    RPA = "rpa"
    MCP = "mcp"

    @classmethod
    def value_of(cls, value: str) -> "NodeType":
        """
        Get NodeType enum from string value.

        :param value: Node type string value
        :return: Corresponding NodeType enum
        :raises ValueError: If the value is not a valid node type
        """
        for node_type in cls:
            if node_type.value == value:
                return node_type
        raise ValueError(f"invalid node type value {value}")


class SystemVariable(Enum):
    """
    Enumeration of system variables available in the workflow.
    """

    QUERY = "query"
    FILES = "files"
    CONVERSATION_ID = "conversation_id"
    USER_ID = "user_id"

    @classmethod
    def value_of(cls, value: str) -> "SystemVariable":
        """
        Get SystemVariable enum from string value.

        :param value: System variable string value
        :return: Corresponding SystemVariable enum
        :raises ValueError: If the value is not a valid system variable
        """
        for system_variable in cls:
            if system_variable.value == value:
                return system_variable
        raise ValueError(f"invalid system variable value {value}")


class NodeRunMetadataKey(Enum):
    """
    Enumeration of metadata keys for node execution tracking.
    """

    TOTAL_TOKENS = "total_tokens"
    TOTAL_PRICE = "total_price"
    CURRENCY = "currency"
    TOOL_INFO = "tool_info"
    ITERATION_ID = "iteration_id"
    ITERATION_INDEX = "iteration_index"


# Node types that continue execution on error without streaming
CONTINUE_ON_ERROR_NOT_STREAM_NODE_TYPE = [
    NodeType.DATABASE.value,
    NodeType.PLUGIN.value,
    NodeType.CODE.value,
    NodeType.DECISION_MAKING.value,
    NodeType.KNOWLEDGE_BASE.value,
    NodeType.PARAMETER_EXTRACTOR.value,
    NodeType.MCP.value,
    NodeType.RPA.value,
]

# Node types that continue execution on error with streaming
CONTINUE_ON_ERROR_STREAM_NODE_TYPE = [
    NodeType.LLM.value,
    NodeType.AGENT.value,
    NodeType.KNOWLEDGE_PRO.value,
    NodeType.FLOW.value,
]
