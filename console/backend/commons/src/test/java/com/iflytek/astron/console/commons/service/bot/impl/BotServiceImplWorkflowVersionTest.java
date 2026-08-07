package com.iflytek.astron.console.commons.service.bot.impl;

import com.iflytek.astron.console.commons.dto.bot.BotInfoDto;
import com.iflytek.astron.console.commons.service.data.UserLangChainDataService;
import com.iflytek.astron.console.commons.service.workflow.WorkflowVersionLookupService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BotServiceImplWorkflowVersionTest {

    @Mock
    private UserLangChainDataService userLangChainDataService;
    @Mock
    private WorkflowVersionLookupService workflowVersionLookupService;

    private BotServiceImpl botService;

    @BeforeEach
    void setUp() {
        botService = new BotServiceImpl();
        ReflectionTestUtils.setField(botService, "userLangChainDataService", userLangChainDataService);
        ReflectionTestUtils.setField(botService, "workflowVersionLookupService", workflowVersionLookupService);
    }

    @Test
    void updateWorkflowStatusShouldUseLatestSuccessfulVersionWhenRequestedVersionIsBlank() {
        BotInfoDto botInfo = new BotInfoDto();
        when(userLangChainDataService.findFlowIdByBotId(25)).thenReturn("flow-1");
        when(workflowVersionLookupService.findLatestSuccessfulVersionName(25)).thenReturn(Optional.of("v1.0"));

        ReflectionTestUtils.invokeMethod(
                botService,
                "updateWorkflowStatus",
                botInfo,
                25,
                null);

        assertThat(botInfo.getWorkflowVersion()).isEqualTo("v1.0");
        verify(workflowVersionLookupService, never()).isPublishedVersion("flow-1", null);
    }

    @Test
    void normalizeWorkflowVersionShouldTreatUndefinedAsBlank() {
        String normalized = ReflectionTestUtils.invokeMethod(botService, "normalizeWorkflowVersion", "undefined");

        assertThat(normalized).isNull();
    }
}
