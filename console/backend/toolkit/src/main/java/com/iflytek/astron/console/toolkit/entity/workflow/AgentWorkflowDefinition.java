package com.iflytek.astron.console.toolkit.entity.workflow;

import lombok.Builder;
import lombok.Data;

/** Agent-callable definition resolved from a workflow the bot has imported. */
@Data
@Builder
public class AgentWorkflowDefinition {
    /** Business flow id used by the core workflow engine. */
    private String flowId;
    /** Workflow display name, used in tool-call traces. */
    private String name;
    /** Unique Spring AI function name, e.g. workflow_xxx. */
    private String functionName;
    private String description;
    /** JSON schema built from the workflow start-node input parameters. */
    private String inputSchema;
}
