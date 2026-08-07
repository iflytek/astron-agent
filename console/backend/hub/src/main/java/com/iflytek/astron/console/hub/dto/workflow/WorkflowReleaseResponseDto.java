package com.iflytek.astron.console.hub.dto.workflow;

import lombok.Data;

/**
 * Workflow release response DTO
 */
@Data
public class WorkflowReleaseResponseDto {

    /**
     * Workflow version ID
     */
    private Long workflowVersionId;

    /**
     * Workflow version name
     */
    private String workflowVersionName;

    /**
     * Whether the release was successful
     */
    private Boolean success;

    /**
     * Error message
     */
    private String errorMessage;
}
