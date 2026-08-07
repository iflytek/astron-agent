package com.iflytek.astron.console.toolkit.entity.core.workflowtrace;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class WorkflowTraceExecutionPageDto {
    private List<WorkflowTraceExecutionItemDto> list = new ArrayList<>();
    private Long total = 0L;
}
