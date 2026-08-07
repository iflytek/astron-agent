package com.iflytek.astron.console.hub.dto.workflow;

import lombok.Data;

/**
 * Workflow release request DTO
 */
@Data
public class WorkflowReleaseRequestDto {

    /**
     * Bot ID
     */
    private String botId;

    /**
     * Workflow ID
     */
    private String flowId;

    /**
     * Publish channel: 1-Market, 2-API, 3-MCP
     */
    private Integer publishChannel;

    /**
     * Publish result: Success/Failed/Under review
     */
    private String publishResult;

    /**
     * Description information
     */
    private String description;

    /**
     * Version name
     */
    private String name;

    /**
     * Version number (timestamp format)
     */
    private String versionNum;

    // Manual setter for versionNum in case Lombok doesn't generate it
    public void setVersionNum(String versionNum) {
        this.versionNum = versionNum;
    }

    public String getVersionNum() {
        return versionNum;
    }
}
