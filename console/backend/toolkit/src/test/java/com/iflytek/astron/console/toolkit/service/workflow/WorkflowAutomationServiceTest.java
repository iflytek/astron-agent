package com.iflytek.astron.console.toolkit.service.workflow;

import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.entity.workflow.Workflow;
import com.iflytek.astron.console.toolkit.config.properties.ApiUrl;
import com.iflytek.astron.console.toolkit.entity.core.workflow.sse.ChatSysReq;
import com.iflytek.astron.console.toolkit.entity.table.workflow.WorkflowAutomationRun;
import com.iflytek.astron.console.toolkit.entity.table.workflow.WorkflowAutomationTask;
import com.iflytek.astron.console.toolkit.entity.table.workflow.WorkflowVersion;
import com.iflytek.astron.console.toolkit.mapper.workflow.WorkflowAutomationRunMapper;
import com.iflytek.astron.console.toolkit.mapper.workflow.WorkflowAutomationTaskMapper;
import com.iflytek.astron.console.toolkit.mapper.workflow.WorkflowMapper;
import com.iflytek.astron.console.toolkit.mapper.workflow.WorkflowVersionMapper;
import com.iflytek.astron.console.toolkit.service.extra.AppService;
import com.iflytek.astron.console.toolkit.tool.DataPermissionCheckTool;
import com.iflytek.astron.console.toolkit.util.RedisUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Date;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkflowAutomationServiceTest {

    @Mock
    private WorkflowAutomationTaskMapper taskMapper;
    @Mock
    private WorkflowAutomationRunMapper runMapper;
    @Mock
    private WorkflowMapper workflowMapper;
    @Mock
    private WorkflowVersionMapper workflowVersionMapper;
    @Mock
    private DataPermissionCheckTool dataPermissionCheckTool;
    @Mock
    private RedisUtil redisUtil;
    @Mock
    private ApiUrl apiUrl;
    @Mock
    private AppService appService;

    @Spy
    @InjectMocks
    private WorkflowAutomationService service;

    @Test
    void previewReturnsFiveFutureFireTimes() {
        List<String> result = service.preview("0 0 9 * * ?", "Asia/Shanghai");

        assertThat(result).hasSize(5);
        assertThat(result).allSatisfy(time -> assertThat(time).isNotBlank());
    }

    @Test
    void previewRejectsInvalidCron() {
        assertThatThrownBy(() -> service.preview("not a cron", "Asia/Shanghai"))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void runTaskWritesSkippedWhenLockIsBusy() {
        WorkflowAutomationTask task = new WorkflowAutomationTask();
        task.setId(12L);
        task.setFlowId("flow-1");
        task.setUid("u1");
        task.setEnabled(true);
        task.setCronExpression("0 0/5 * * * ?");
        task.setTimezone("Asia/Shanghai");
        task.setInputParams("{}");

        when(redisUtil.tryLock(anyString(), anyLong(), anyString())).thenReturn(false);
        doReturn(true).when(service).updateById(any(WorkflowAutomationTask.class));

        WorkflowAutomationRun run = service.runTask(task, "SCHEDULE", new Date());

        assertThat(run.getStatus()).isEqualTo("SKIPPED");
        assertThat(task.getLastRunStatus()).isEqualTo("SKIPPED");
        assertThat(task.getNextFireTime()).isNotNull();
        ArgumentCaptor<WorkflowAutomationRun> captor = ArgumentCaptor.forClass(WorkflowAutomationRun.class);
        verify(runMapper).insert(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo("SKIPPED");
        verify(redisUtil).tryLock(eq("workflow:automation:task:12:lock"), eq(3600L), anyString());
    }

    @Test
    void publishedVersionAllowsStaleWorkflowStatus() {
        Workflow workflow = new Workflow();
        workflow.setFlowId("flow-1");
        workflow.setStatus(0);
        WorkflowVersion version = new WorkflowVersion();
        version.setName("v1.0");
        when(workflowVersionMapper.selectOne(any())).thenReturn(version);

        Boolean published = ReflectionTestUtils.invokeMethod(service, "isPublished", workflow);

        assertThat(published).isTrue();
    }

    @Test
    void workflowBusinessErrorResponseIsFailed() {
        String response = "{\"code\":20201,\"message\":\"Flow ID not found\"}";

        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(service, "validateWorkflowResponse", response))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void workflowResponseCodeParsesCoreBusinessCode() {
        String response = "{\"code\":20204,\"message\":\"Workflow not published\"}";

        Integer code = ReflectionTestUtils.invokeMethod(service, "workflowResponseCode", response);

        assertThat(code).isEqualTo(20204);
    }

    @Test
    void workflowRequestOmitsBlankVersion() {
        WorkflowAutomationTask task = new WorkflowAutomationTask();
        task.setId(1L);
        task.setFlowId("flow-1");
        task.setUid("u1");
        task.setInputParams("{}");

        ChatSysReq req = ReflectionTestUtils.invokeMethod(service, "buildWorkflowRequest", task, 2L, " ");

        assertThat(req.getVersion()).isNull();
        assertThat(req.getChatId()).isEqualTo("automation-1-2");
    }

    @Test
    void workflowAutomationUsesPublishedChatEndpoint() {
        when(apiUrl.getWorkflow()).thenReturn("http://workflow");

        String url = ReflectionTestUtils.invokeMethod(service, "workflowChatUrl");

        assertThat(url).isEqualTo("http://workflow/workflow/v1/chat/completions");
        assertThat(url).doesNotContain("/debug/");
    }
}
