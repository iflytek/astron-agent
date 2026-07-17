package com.iflytek.astron.console.toolkit.entity.dto.automation;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class WorkflowAutomationEnableReq {
    @NotNull(message = "enabled cannot be null")
    private Boolean enabled;
}
