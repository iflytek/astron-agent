package com.iflytek.astron.console.hub.controller.workflow;

import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.commons.util.space.SpaceInfoUtil;
import com.iflytek.astron.console.hub.dto.workflow.WorkflowTraceExecutionQueryRequestDto;
import com.iflytek.astron.console.hub.service.workflow.WorkflowTraceService;
import com.iflytek.astron.console.toolkit.entity.core.workflowtrace.WorkflowTraceExecutionDetailDto;
import com.iflytek.astron.console.toolkit.entity.core.workflowtrace.WorkflowTraceExecutionPageDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/publish/workflows")
@RequiredArgsConstructor
@Validated
@Tag(name = "Workflow Trace", description = "Workflow trace panel APIs")
public class WorkflowTraceController {

    private final WorkflowTraceService workflowTraceService;

    @GetMapping("/{flowId}/trace/executions")
    @Operation(summary = "Get workflow trace executions", description = "Retrieve workflow execution traces with pagination")
    public ApiResult<WorkflowTraceExecutionPageDto> queryExecutions(
            @Parameter(description = "Workflow flowId", required = true)
            @PathVariable String flowId,
            @Valid @ModelAttribute WorkflowTraceExecutionQueryRequestDto requestDto,
            @RequestHeader HttpHeaders headers) {
        Long spaceId = SpaceInfoUtil.getSpaceId();
        WorkflowTraceExecutionPageDto result = workflowTraceService.queryExecutions(flowId, requestDto, spaceId, headers);
        return ApiResult.success(result);
    }

    @GetMapping("/{flowId}/trace/executions/{sid}")
    @Operation(summary = "Get workflow trace execution detail", description = "Retrieve detail for a single workflow execution trace")
    public ApiResult<WorkflowTraceExecutionDetailDto> getExecutionDetail(
            @Parameter(description = "Workflow flowId", required = true)
            @PathVariable String flowId,
            @Parameter(description = "Execution sid", required = true)
            @PathVariable String sid,
            @RequestParam(required = false) String appId,
            @RequestHeader HttpHeaders headers) {
        Long spaceId = SpaceInfoUtil.getSpaceId();
        WorkflowTraceExecutionDetailDto result = workflowTraceService.getExecutionDetail(flowId, sid, appId, spaceId, headers);
        return ApiResult.success(result);
    }
}
