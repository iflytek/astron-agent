"""
Node Registry Module

This module provides a centralized registry for all workflow node types and their
corresponding implementation classes. It serves as a factory registry that maps
node type identifiers to their respective node classes for dynamic instantiation.

The registry includes all supported node types in the workflow engine, from basic
nodes like start/end to complex nodes like LLM, decision-making, and iteration nodes.
"""

from workflow.engine.nodes.agent.agent_node import AgentNode
from workflow.engine.nodes.code.code_node import CodeNode
from workflow.engine.nodes.decision.decision_node import DecisionNode
from workflow.engine.nodes.end.end_node import EndNode
from workflow.engine.nodes.flow.flow_node import FlowNode
from workflow.engine.nodes.global_variables.global_variables_node import (
    GlobalVariablesNode,
)
from workflow.engine.nodes.if_else.if_else_node import IFElseNode
from workflow.engine.nodes.iteration.iteration_node import (
    IterationEndNode,
    IterationNode,
    IterationStartNode,
)
from workflow.engine.nodes.knowledge.knowledge_node import KnowledgeNode
from workflow.engine.nodes.knowledge_pro.knowledge_pro_node import KnowledgeProNode
from workflow.engine.nodes.llm.spark_llm_node import SparkLLMNode
from workflow.engine.nodes.mcp.mcp_node import MCPNode
from workflow.engine.nodes.message.message_node import MessageNode
from workflow.engine.nodes.params_extractor.pe_node import ParamsExtractorNode
from workflow.engine.nodes.pgsql.pgsql_node import PGSqlNode
from workflow.engine.nodes.plugin_tool.plugin_node import PluginNode
from workflow.engine.nodes.question_answer.question_answer_node import (
    QuestionAnswerNode,
)
from workflow.engine.nodes.rpa.rpa_node import RPANode
from workflow.engine.nodes.start.start_node import StartNode
from workflow.engine.nodes.text_joiner.text_joiner_node import TextJoinerNode

# TODO: Implement automatic loading mechanism for dynamic node discovery
# Registry mapping node types to their corresponding node classes
# This dictionary serves as a factory registry for creating node instances
tool_classes = {
    "ifly-code": CodeNode,  # Code execution node for running custom code
    "node-start": StartNode,  # Workflow start node that initiates execution
    "node-end": EndNode,  # Workflow end node that terminates execution
    "plugin": PluginNode,  # Plugin tool node for external integrations
    "knowledge-base": KnowledgeNode,  # Knowledge base node for information retrieval
    "knowledge-pro-base": KnowledgeProNode,  # Professional knowledge base node with advanced features
    "extractor-parameter": ParamsExtractorNode,  # Parameter extraction node for data parsing
    "spark-llm": SparkLLMNode,  # Spark LLM node for language model interactions
    "decision-making": DecisionNode,  # Decision making node for conditional logic
    "if-else": IFElseNode,  # Conditional branching node for flow control
    "message": MessageNode,  # Message output node for displaying results
    "iteration": IterationNode,  # Iteration node for loop operations
    "iteration-node-start": IterationStartNode,  # Iteration start node for loop initialization
    "iteration-node-end": IterationEndNode,  # Iteration end node for loop termination
    "text-joiner": TextJoinerNode,  # Text joining node for content concatenation
    "node-variable": GlobalVariablesNode,  # Global variables node for state management
    "flow": FlowNode,  # Sub-flow node for nested workflow execution
    "agent": AgentNode,  # Agent node for autonomous task execution
    "question-answer": QuestionAnswerNode,  # Question-answer node for Q&A processing
    "database": PGSqlNode,  # PostgreSQL database node for data operations
    "rpa": RPANode,
    "mcp": MCPNode,
}
