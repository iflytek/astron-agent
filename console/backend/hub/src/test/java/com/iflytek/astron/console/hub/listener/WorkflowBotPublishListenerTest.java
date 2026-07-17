package com.iflytek.astron.console.hub.listener;

import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.entity.bot.ChatBotBase;
import com.iflytek.astron.console.commons.enums.bot.BotTypeEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.mapper.bot.ChatBotBaseMapper;
import com.iflytek.astron.console.commons.service.data.UserLangChainDataService;
import com.iflytek.astron.console.hub.dto.workflow.WorkflowReleaseResponseDto;
import com.iflytek.astron.console.hub.event.BotPublishStatusChangedEvent;
import com.iflytek.astron.console.hub.service.workflow.WorkflowReleaseService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkflowBotPublishListenerTest {

    @Mock
    private ChatBotBaseMapper chatBotBaseMapper;
    @Mock
    private UserLangChainDataService userLangChainDataService;
    @Mock
    private WorkflowReleaseService workflowReleaseService;

    private WorkflowBotPublishListener listener;

    @BeforeEach
    void setUp() {
        listener = new WorkflowBotPublishListener(
                chatBotBaseMapper,
                userLangChainDataService,
                workflowReleaseService);
    }

    @Test
    void handleBotPublishStatusChangedShouldFailWhenWorkflowReleaseFails() {
        ChatBotBase botBase = new ChatBotBase();
        botBase.setId(25);
        botBase.setVersion(BotTypeEnum.WORKFLOW_BOT.getType());
        when(chatBotBaseMapper.selectById(25)).thenReturn(botBase);
        when(userLangChainDataService.findFlowIdByBotId(25)).thenReturn("flow-1");
        WorkflowReleaseResponseDto failed = new WorkflowReleaseResponseDto();
        failed.setSuccess(false);
        failed.setErrorMessage("Unable to get version name");
        when(workflowReleaseService.publishWorkflow(25, "requester-uid", 1L, "MARKET")).thenReturn(failed);

        BotPublishStatusChangedEvent event = new BotPublishStatusChangedEvent(
                this,
                25,
                "requester-uid",
                1L,
                "PUBLISH",
                null,
                1,
                "MARKET");

        assertThatThrownBy(() -> listener.handleBotPublishStatusChanged(event))
                .isInstanceOf(BusinessException.class)
                .extracting("responseEnum")
                .isEqualTo(ResponseEnum.WORKFLOW_VERSION_PUBLISH_FAILED);
    }

    @Test
    void handleBotPublishStatusChangedShouldFailWhenWorkflowBotHasNoFlowId() {
        ChatBotBase botBase = new ChatBotBase();
        botBase.setId(25);
        botBase.setVersion(BotTypeEnum.WORKFLOW_BOT.getType());
        when(chatBotBaseMapper.selectById(25)).thenReturn(botBase);
        when(userLangChainDataService.findFlowIdByBotId(25)).thenReturn("");

        BotPublishStatusChangedEvent event = new BotPublishStatusChangedEvent(
                this,
                25,
                "requester-uid",
                1L,
                "PUBLISH",
                null,
                1,
                "MARKET");

        assertThatThrownBy(() -> listener.handleBotPublishStatusChanged(event))
                .isInstanceOf(BusinessException.class)
                .extracting("responseEnum")
                .isEqualTo(ResponseEnum.WORKFLOW_VERSION_PUBLISH_FAILED);
    }
}
