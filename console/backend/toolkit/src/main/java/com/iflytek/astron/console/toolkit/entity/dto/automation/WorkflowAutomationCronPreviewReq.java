package com.iflytek.astron.console.toolkit.entity.dto.automation;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class WorkflowAutomationCronPreviewReq {
    @NotBlank(message = "cronExpression cannot be blank")
    private String cronExpression;
    private String timezone;
}
