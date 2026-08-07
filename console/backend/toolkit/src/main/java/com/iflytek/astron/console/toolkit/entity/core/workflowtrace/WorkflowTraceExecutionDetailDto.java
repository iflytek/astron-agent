package com.iflytek.astron.console.toolkit.entity.core.workflowtrace;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class WorkflowTraceExecutionDetailDto {
    private WorkflowTraceExecutionItemDto execution = new WorkflowTraceExecutionItemDto();
    private List<WorkflowTraceNodeDto> nodes = new ArrayList<>();
}
