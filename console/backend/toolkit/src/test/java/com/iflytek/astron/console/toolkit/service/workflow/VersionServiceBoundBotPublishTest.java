package com.iflytek.astron.console.toolkit.service.workflow;

import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.entity.workflow.Workflow;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.toolkit.entity.table.workflow.WorkflowVersion;
import com.iflytek.astron.console.toolkit.mapper.workflow.WorkflowMapper;
import com.iflytek.astron.console.toolkit.mapper.workflow.WorkflowVersionMapper;
import com.iflytek.astron.console.toolkit.tool.DataPermissionCheckTool;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VersionServiceBoundBotPublishTest {

    @Mock
    private WorkflowMapper workflowMapper;
    @Mock
    private WorkflowVersionMapper workflowVersionMapper;
    @Mock
    private DataPermissionCheckTool dataPermissionCheckTool;

    private VersionService versionService;

    @BeforeEach
    void setUp() {
        versionService = new VersionService();
        versionService.workflowMapper = workflowMapper;
        versionService.workflowVersionMapper = workflowVersionMapper;
        versionService.dataPermissionCheckTool = dataPermissionCheckTool;
    }

    @Test
    void getVersionNameForBoundBotPublishShouldNotCheckWorkflowSpaceBelong() {
        when(workflowMapper.selectOne(any())).thenReturn(workflow());
        when(workflowVersionMapper.selectOne(any())).thenReturn(null);

        WorkflowVersion query = new WorkflowVersion();
        query.setFlowId("flow-1");
        ApiResult<JSONObject> result = versionService.getVersionNameForBoundBotPublish(query);

        assertThat(result.code()).isZero();
        assertThat(result.data().getString("workflowVersionName")).isEqualTo("v1.0");
        verify(dataPermissionCheckTool, never()).checkWorkflowBelong(any(Workflow.class), any());
    }

    private Workflow workflow() {
        Workflow workflow = new Workflow();
        workflow.setId(7L);
        workflow.setFlowId("flow-1");
        workflow.setName("workflow");
        workflow.setDescription("description");
        workflow.setData("{}");
        workflow.setSpaceId(99L);
        workflow.setIsPublic(false);
        return workflow;
    }
}
