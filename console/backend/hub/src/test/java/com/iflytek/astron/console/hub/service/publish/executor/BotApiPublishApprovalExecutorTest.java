package com.iflytek.astron.console.hub.service.publish.executor;

import com.iflytek.astron.console.hub.dto.publish.BotApiInfoDTO;
import com.iflytek.astron.console.hub.dto.publish.CreateBotApiVo;
import com.iflytek.astron.console.hub.entity.PublishApproval;
import com.iflytek.astron.console.hub.enums.publish.PublishApprovalActionEnum;
import com.iflytek.astron.console.hub.enums.publish.PublishApprovalResourceTypeEnum;
import com.iflytek.astron.console.hub.enums.publish.PublishApprovalTypeEnum;
import com.iflytek.astron.console.hub.service.publish.PublishApiService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("BotApiPublishApprovalExecutor")
class BotApiPublishApprovalExecutorTest {

    @Mock
    private PublishApiService publishApiService;

    private BotApiPublishApprovalExecutor executor;

    @BeforeEach
    void setUp() {
        executor = new BotApiPublishApprovalExecutor(publishApiService);
    }

    @Test
    void executeShouldUseApprovalSpaceIdAndRequesterWithoutRequestContext() {
        PublishApproval approval = new PublishApproval();
        approval.setSpaceId(100L);
        approval.setResourceType(PublishApprovalResourceTypeEnum.BOT.name());
        approval.setPublishType(PublishApprovalTypeEnum.API.name());
        approval.setPublishAction(PublishApprovalActionEnum.PUBLISH.name());
        approval.setTargetId("app-1");
        approval.setRequesterUid("member-uid");
        approval.setPublishSnapshot("{\"botId\":42,\"publishData\":{\"appId\":\"app-1\"}}");
        when(publishApiService.createBotApi(
                org.mockito.ArgumentMatchers.any(CreateBotApiVo.class),
                isNull(),
                eq("member-uid"),
                eq(100L)))
                .thenReturn(BotApiInfoDTO.builder().botId(42).appId("app-1").build());

        executor.execute(approval);

        ArgumentCaptor<CreateBotApiVo> captor = ArgumentCaptor.forClass(CreateBotApiVo.class);
        verify(publishApiService).createBotApi(captor.capture(), isNull(), eq("member-uid"), eq(100L));
        assertThat(captor.getValue().getBotId()).isEqualTo(42L);
        assertThat(captor.getValue().getAppId()).isEqualTo("app-1");
    }
}
