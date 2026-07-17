package com.iflytek.astron.console.hub.service.publish.impl;

import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.enums.bot.ReleaseTypeEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.commons.service.data.UserLangChainDataService;
import com.iflytek.astron.console.toolkit.common.constant.WorkflowConst;
import com.iflytek.astron.console.toolkit.entity.table.workflow.WorkflowVersion;
import com.iflytek.astron.console.toolkit.service.workflow.VersionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.context.request.RequestContextHolder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReleaseManageClientServiceImplTest {

    @Mock
    private UserLangChainDataService userLangChainDataService;
    @Mock
    private VersionService versionService;

    private ReleaseManageClientServiceImpl releaseManageClientService;

    @BeforeEach
    void setUp() {
        releaseManageClientService = new ReleaseManageClientServiceImpl(userLangChainDataService, versionService);
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void apiReleaseShouldUseBoundBotPublishVersionServiceWhenRequestContextIsCleared() {
        when(userLangChainDataService.findFlowIdByBotId(25)).thenReturn("flow-1");
        when(versionService.getVersionNameForBoundBotPublish(any(WorkflowVersion.class)))
                .thenReturn(ApiResult.success(new JSONObject().fluentPut("workflowVersionName", "v1.0")));
        when(versionService.createForBoundBotPublish(any(WorkflowVersion.class)))
                .thenReturn(ApiResult.success(new JSONObject()
                        .fluentPut("workflowVersionId", 18L)
                        .fluentPut("workflowVersionName", "v1.0")));

        String versionName = releaseManageClientService.getVersionNameByBotId(25L, 1L, null);
        releaseManageClientService.releaseBotApi(25, "flow-1", versionName, 1L, null);

        assertThat(versionName).isEqualTo("v1.0");

        ArgumentCaptor<WorkflowVersion> nameCaptor = ArgumentCaptor.forClass(WorkflowVersion.class);
        verify(versionService).getVersionNameForBoundBotPublish(nameCaptor.capture());
        assertThat(nameCaptor.getValue().getFlowId()).isEqualTo("flow-1");

        ArgumentCaptor<WorkflowVersion> createCaptor = ArgumentCaptor.forClass(WorkflowVersion.class);
        verify(versionService).createForBoundBotPublish(createCaptor.capture());
        WorkflowVersion created = createCaptor.getValue();
        assertThat(created.getBotId()).isEqualTo("25");
        assertThat(created.getFlowId()).isEqualTo("flow-1");
        assertThat(created.getName()).isEqualTo("v1.0");
        assertThat(created.getPublishChannel()).isEqualTo(Long.valueOf(ReleaseTypeEnum.BOT_API.getCode()));
        assertThat(created.getPublishResult()).isEqualTo(WorkflowConst.PublishResult.SUCCESS);
    }

    @Test
    void releaseBotApiShouldFailWhenFlowIdDoesNotMatchBotBinding() {
        when(userLangChainDataService.findFlowIdByBotId(25)).thenReturn("flow-actual");

        assertThatThrownBy(() -> releaseManageClientService.releaseBotApi(25, "flow-other", "v1.0", 1L, null))
                .isInstanceOf(BusinessException.class)
                .extracting("responseEnum")
                .isEqualTo(ResponseEnum.WORKFLOW_VERSION_PUBLISH_FAILED);

        verify(versionService, never()).createForBoundBotPublish(any(WorkflowVersion.class));
    }
}
