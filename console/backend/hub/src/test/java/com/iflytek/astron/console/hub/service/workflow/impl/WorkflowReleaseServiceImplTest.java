package com.iflytek.astron.console.hub.service.workflow.impl;

import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.dto.bot.ChatBotApi;
import com.iflytek.astron.console.commons.enums.bot.ReleaseTypeEnum;
import com.iflytek.astron.console.commons.mapper.bot.ChatBotApiMapper;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.commons.service.data.UserLangChainDataService;
import com.iflytek.astron.console.commons.util.MaasUtil;
import com.iflytek.astron.console.hub.dto.workflow.WorkflowReleaseResponseDto;
import com.iflytek.astron.console.toolkit.entity.table.workflow.WorkflowVersion;
import com.iflytek.astron.console.toolkit.mapper.workflow.WorkflowVersionMapper;
import com.iflytek.astron.console.toolkit.service.workflow.VersionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.context.request.RequestContextHolder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkflowReleaseServiceImplTest {

    @Mock
    private UserLangChainDataService userLangChainDataService;
    @Mock
    private WorkflowVersionMapper workflowVersionMapper;
    @Mock
    private ChatBotApiMapper chatBotApiMapper;
    @Mock
    private MaasUtil maasUtil;
    @Mock
    private VersionService versionService;

    private WorkflowReleaseServiceImpl workflowReleaseService;

    @BeforeEach
    void setUp() {
        workflowReleaseService = new WorkflowReleaseServiceImpl(
                userLangChainDataService,
                workflowVersionMapper,
                chatBotApiMapper,
                maasUtil,
                versionService);
        ReflectionTestUtils.setField(workflowReleaseService, "maasAppId", "680ab54f");
    }

    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void publishWorkflowShouldUseBoundBotPublishVersionServiceWhenRequestContextIsCleared() {
        RequestContextHolder.resetRequestAttributes();
        when(userLangChainDataService.findFlowIdByBotId(25)).thenReturn("flow-1");
        when(versionService.getVersionNameForBoundBotPublish(any(WorkflowVersion.class)))
                .thenReturn(ApiResult.success(new JSONObject().fluentPut("workflowVersionName", "v1.0")));
        when(versionService.createForBoundBotPublish(any(WorkflowVersion.class)))
                .thenReturn(ApiResult.success(new JSONObject()
                        .fluentPut("workflowVersionId", 18L)
                        .fluentPut("workflowVersionName", "v1.0")));
        when(versionService.update_channel_result(any(WorkflowVersion.class)))
                .thenReturn(ApiResult.success(new JSONObject()));
        WorkflowVersion storedVersion = new WorkflowVersion();
        storedVersion.setSysData("{\"nodes\":[]}");
        when(workflowVersionMapper.selectOne(any())).thenReturn(storedVersion);

        WorkflowReleaseResponseDto response = workflowReleaseService.publishWorkflow(
                25,
                "requester-uid",
                1L,
                ReleaseTypeEnum.MARKET.name());

        assertThat(response.getSuccess()).isTrue();
        assertThat(response.getWorkflowVersionId()).isEqualTo(18L);
        assertThat(response.getWorkflowVersionName()).isEqualTo("v1.0");
        assertThat(RequestContextHolder.getRequestAttributes()).isNull();

        ArgumentCaptor<WorkflowVersion> versionNameCaptor = ArgumentCaptor.forClass(WorkflowVersion.class);
        verify(versionService).getVersionNameForBoundBotPublish(versionNameCaptor.capture());
        assertThat(versionNameCaptor.getValue().getFlowId()).isEqualTo("flow-1");

        ArgumentCaptor<WorkflowVersion> createCaptor = ArgumentCaptor.forClass(WorkflowVersion.class);
        verify(versionService).createForBoundBotPublish(createCaptor.capture());
        assertThat(createCaptor.getValue().getBotId()).isEqualTo("25");
        assertThat(createCaptor.getValue().getFlowId()).isEqualTo("flow-1");
        assertThat(createCaptor.getValue().getName()).isEqualTo("v1.0");
        verify(maasUtil).createApi(eq("flow-1"), eq("680ab54f"), eq("v1.0"), any(JSONObject.class));
    }

    @Test
    void apiPublishShouldUseBotBoundAppId() {
        when(userLangChainDataService.findFlowIdByBotId(25)).thenReturn("flow-1");
        when(versionService.getVersionNameForBoundBotPublish(any(WorkflowVersion.class)))
                .thenReturn(ApiResult.success(new JSONObject().fluentPut("workflowVersionName", "v1.0")));
        when(versionService.createForBoundBotPublish(any(WorkflowVersion.class)))
                .thenReturn(ApiResult.success(new JSONObject()
                        .fluentPut("workflowVersionId", 18L)
                        .fluentPut("workflowVersionName", "v1.0")));
        when(versionService.update_channel_result(any(WorkflowVersion.class)))
                .thenReturn(ApiResult.success(new JSONObject()));
        WorkflowVersion storedVersion = new WorkflowVersion();
        storedVersion.setSysData("{\"nodes\":[]}");
        when(workflowVersionMapper.selectOne(any())).thenReturn(storedVersion);
        ChatBotApi api = ChatBotApi.builder()
                .appId("bound-app")
                .build();
        when(chatBotApiMapper.selectOne(any())).thenReturn(api);

        WorkflowReleaseResponseDto response = workflowReleaseService.publishWorkflow(
                25,
                "requester-uid",
                1L,
                ReleaseTypeEnum.BOT_API.name());

        assertThat(response.getSuccess()).isTrue();
        ArgumentCaptor<WorkflowVersion> createCaptor = ArgumentCaptor.forClass(WorkflowVersion.class);
        verify(versionService).createForBoundBotPublish(createCaptor.capture());
        assertThat(createCaptor.getValue().getPublishChannel())
                .isEqualTo(Long.valueOf(ReleaseTypeEnum.BOT_API.getCode()));
        verify(maasUtil).createApi(eq("flow-1"), eq("bound-app"), eq("v1.0"), any(JSONObject.class));
    }

    @Test
    void publishWorkflowShouldFailWhenVersionSysDataIsMissing() {
        when(userLangChainDataService.findFlowIdByBotId(25)).thenReturn("flow-1");
        when(versionService.getVersionNameForBoundBotPublish(any(WorkflowVersion.class)))
                .thenReturn(ApiResult.success(new JSONObject().fluentPut("workflowVersionName", "v1.0")));
        when(versionService.createForBoundBotPublish(any(WorkflowVersion.class)))
                .thenReturn(ApiResult.success(new JSONObject()
                        .fluentPut("workflowVersionId", 18L)
                        .fluentPut("workflowVersionName", "v1.0")));
        WorkflowVersion storedVersion = new WorkflowVersion();
        storedVersion.setSysData("{}");
        when(workflowVersionMapper.selectOne(any())).thenReturn(storedVersion);

        WorkflowReleaseResponseDto response = workflowReleaseService.publishWorkflow(
                25,
                "requester-uid",
                1L,
                ReleaseTypeEnum.MARKET.name());

        assertThat(response.getSuccess()).isFalse();
        verify(maasUtil, never()).createApi(any(), any(), any(), any(JSONObject.class));
    }
}
