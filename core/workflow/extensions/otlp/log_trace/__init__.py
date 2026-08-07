"""
OTLP Log Tracing Module

This module provides comprehensive logging and tracing functionality for workflow execution,
following OpenTelemetry Protocol (OTLP) standards. It includes:

- Base data models for usage statistics and token tracking
- Node-level logging for individual workflow node execution
- Workflow-level logging for complete execution traces
- Performance metrics and timing information
- Data management with automatic large value handling

The module supports both legacy node-based logging and modern function-based logging,
ensuring backward compatibility while providing enhanced tracing capabilities.

Key Components:
- Usage: Token usage statistics tracking
- NodeLog: Individual node execution logging
- WorkflowLog: Complete workflow execution logging
- Status: Execution status information
- Data: Node data container for input/output/config

Usage:
    from workflow.extensions.otlp.log_trace import WorkflowLog, NodeLog, Usage

    # Create workflow log
    workflow_log = WorkflowLog(sid="session_id", sub="workflow")

    # Create node log
    node_log = NodeLog(sid="session_id", func_id="node_1", func_name="llm_node")

    # Add to workflow
    workflow_log.add_node_log([node_log])
"""
