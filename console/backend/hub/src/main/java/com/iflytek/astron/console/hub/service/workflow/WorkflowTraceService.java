package com.iflytek.astron.console.hub.service.workflow;

import com.iflytek.astron.console.hub.dto.workflow.WorkflowTraceExecutionQueryRequestDto;
import com.iflytek.astron.console.toolkit.entity.core.workflowtrace.WorkflowTraceExecutionDetailDto;
import com.iflytek.astron.console.toolkit.entity.core.workflowtrace.WorkflowTraceExecutionPageDto;
import org.springframework.http.HttpHeaders;

public interface WorkflowTraceService {
    WorkflowTraceExecutionPageDto queryExecutions(
            String flowId,
            WorkflowTraceExecutionQueryRequestDto requestDto,
            Long spaceId,
            HttpHeaders headers);

    WorkflowTraceExecutionDetailDto getExecutionDetail(
            String flowId,
            String sid,
            String appId,
            Long spaceId,
            HttpHeaders headers);
}
