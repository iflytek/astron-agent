package com.iflytek.astron.console.hub.entity.maas;

import lombok.Data;

@Data
public class WorkflowSkillExportRequest {
    private Long botId;
    private Long workflowId;
    private String workflowName;
    private String workflowDescription;
}
