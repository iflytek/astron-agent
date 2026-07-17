package com.iflytek.astron.console.toolkit.entity.dto.automation;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class WorkflowAutomationTaskReq {
    @NotBlank(message = "taskName cannot be blank")
    private String taskName;
    @NotBlank(message = "flowId cannot be blank")
    private String flowId;
    private String version;
    @NotBlank(message = "cronExpression cannot be blank")
    private String cronExpression;
    private String scheduleType;
    private String timezone;
    private Boolean enabled;
    private String inputParams;
}
