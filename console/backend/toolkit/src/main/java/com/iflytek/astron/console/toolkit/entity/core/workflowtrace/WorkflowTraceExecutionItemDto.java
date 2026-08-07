package com.iflytek.astron.console.toolkit.entity.core.workflowtrace;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Data;

@Data
public class WorkflowTraceExecutionItemDto {
    private String sid;

    @JsonAlias("flow_id")
    private String flowId;

    @JsonAlias("flow_name")
    private String flowName;

    @JsonAlias("start_time")
    private Long startTime;

    @JsonAlias("end_time")
    private Long endTime;

    private Integer duration = 0;

    private String status;

    private WorkflowTraceUsageDto usage = new WorkflowTraceUsageDto();
}
