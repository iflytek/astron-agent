package com.iflytek.astron.console.hub.service.workflow;

import com.iflytek.astron.console.hub.dto.workflow.WorkflowReleaseResponseDto;

/**
 * Workflow release service interface Handles workflow bot publishing, version management and API
 * synchronization Simplified version: no approval process, direct publishing
 */
public interface WorkflowReleaseService {

    /**
     * Publish workflow bot to specified channel Direct publishing without approval process
     *
     * @param botId Bot ID
     * @param uid User ID
     * @param spaceId Space ID
     * @param publishType Publish type: MARKET, API, MCP
     * @return Publishing result
     */
    WorkflowReleaseResponseDto publishWorkflow(Integer botId, String uid, Long spaceId, String publishType);

}
