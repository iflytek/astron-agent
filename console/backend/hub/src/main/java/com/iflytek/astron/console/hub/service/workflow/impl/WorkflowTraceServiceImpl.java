package com.iflytek.astron.console.hub.service.workflow.impl;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.iflytek.astron.console.commons.entity.workflow.Workflow;
import com.iflytek.astron.console.hub.dto.workflow.WorkflowTraceExecutionQueryRequestDto;
import com.iflytek.astron.console.hub.service.workflow.WorkflowTraceService;
import com.iflytek.astron.console.toolkit.entity.core.workflowtrace.WorkflowTraceExecutionDetailDto;
import com.iflytek.astron.console.toolkit.entity.core.workflowtrace.WorkflowTraceExecutionPageDto;
import com.iflytek.astron.console.toolkit.mapper.workflow.WorkflowMapper;
import com.iflytek.astron.console.toolkit.service.workflowtrace.WorkflowTraceClient;
import com.iflytek.astron.console.toolkit.tool.DataPermissionCheckTool;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkflowTraceServiceImpl implements WorkflowTraceService {

    private final WorkflowMapper workflowMapper;
    private final DataPermissionCheckTool dataPermissionCheckTool;
    private final WorkflowTraceClient workflowTraceClient;

    @Override
    public WorkflowTraceExecutionPageDto queryExecutions(
            String flowId,
            WorkflowTraceExecutionQueryRequestDto requestDto,
            Long spaceId,
            HttpHeaders headers) {
        Workflow workflow = getAuthorizedWorkflow(flowId, spaceId);
        log.info("Querying workflow trace executions, flowId={}, workflowId={}, page={}, pageSize={}",
                flowId, workflow.getId(), requestDto.getPage(), requestDto.getPageSize());
        return workflowTraceClient.queryExecutions(
                flowId,
                requestDto.getAppId(),
                requestDto.getChatId(),
                requestDto.getStartTime(),
                requestDto.getEndTime(),
                requestDto.getPage(),
                requestDto.getPageSize(),
                headers);
    }

    @Override
    public WorkflowTraceExecutionDetailDto getExecutionDetail(
            String flowId,
            String sid,
            String appId,
            Long spaceId,
            HttpHeaders headers) {
        Workflow workflow = getAuthorizedWorkflow(flowId, spaceId);
        log.info("Querying workflow trace execution detail, flowId={}, workflowId={}, sid={}",
                flowId, workflow.getId(), sid);
        return workflowTraceClient.getExecutionDetail(
                sid,
                flowId,
                appId,
                headers);
    }

    private Workflow getAuthorizedWorkflow(String flowId, Long spaceId) {
        Workflow workflow = workflowMapper.selectOne(
                Wrappers.<Workflow>lambdaQuery()
                        .eq(Workflow::getFlowId, flowId)
                        .eq(Workflow::getDeleted, false)
                        .last("LIMIT 1"));
        dataPermissionCheckTool.checkWorkflowBelong(workflow, spaceId);
        return workflow;
    }
}
