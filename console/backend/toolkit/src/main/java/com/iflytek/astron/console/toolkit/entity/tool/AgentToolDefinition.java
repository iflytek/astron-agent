package com.iflytek.astron.console.toolkit.entity.tool;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Resolved tool-square plugin ready to be exposed to a standalone agent as a single callable
 * function. Built by {@code AgentToolRuntimeService} from a {@code ToolBox} record and consumed by
 * the Spring AI tool-callback layer in the hub module.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentToolDefinition {

    /** Tool-square tool id, e.g. {@code tool@xxx}. */
    private String toolId;

    /** OpenAPI operationId, sent to the link runtime as {@code parameter.operation_id}. */
    private String operationId;

    /** Tool version (e.g. {@code V1.0}); sent so core-link resolves the matching stored schema. */
    private String version;

    /** Tool owner uid, sent as {@code header.uid} (matching the tool-debug run path). */
    private String uid;

    /** Sanitized, unique, model-facing function name (matches {@code ^[A-Za-z0-9_-]{1,64}$}). */
    private String functionName;

    /** Human-readable description shown to the model. */
    private String description;

    /** JSON-schema string describing the model-visible parameters. */
    private String inputSchema;

    /** Original webSchema {@code toolRequestInput} items, retained for request assembly. */
    private List<WebSchemaItem> inputs;
}
