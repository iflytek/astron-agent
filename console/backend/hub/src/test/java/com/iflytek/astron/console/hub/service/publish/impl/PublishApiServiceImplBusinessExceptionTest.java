package com.iflytek.astron.console.hub.service.publish.impl;

import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.entity.bot.ChatBotBase;
import com.iflytek.astron.console.commons.entity.bot.UserLangChainInfo;
import com.iflytek.astron.console.commons.entity.user.AppMst;
import com.iflytek.astron.console.commons.enums.bot.BotVersionEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.service.bot.ChatBotDataService;
import com.iflytek.astron.console.commons.service.data.UserLangChainDataService;
import com.iflytek.astron.console.commons.service.user.AppMstService;
import com.iflytek.astron.console.commons.util.MaasUtil;
import com.iflytek.astron.console.hub.dto.publish.CreateBotApiVo;
import com.iflytek.astron.console.hub.service.chat.ChatBotApiService;
import com.iflytek.astron.console.hub.service.publish.ReleaseManageClientService;
import com.iflytek.astron.console.toolkit.util.RedisUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PublishApiServiceImplBusinessExceptionTest {

    @Mock
    private AppMstService appMstService;
    @Mock
    private RedisUtil redisUtil;
    @Mock
    private ChatBotDataService chatBotDataService;
    @Mock
    private ChatBotApiService chatBotApiService;
    @Mock
    private UserLangChainDataService userLangChainDataService;
    @Mock
    private MaasUtil maasUtil;
    @Mock
    private ReleaseManageClientService releaseManageClientService;

    private PublishApiServiceImpl publishApiService;

    @BeforeEach
    void setUp() {
        publishApiService = new PublishApiServiceImpl();
        ReflectionTestUtils.setField(publishApiService, "appMstService", appMstService);
        ReflectionTestUtils.setField(publishApiService, "redisUtil", redisUtil);
        ReflectionTestUtils.setField(publishApiService, "chatBotDataService", chatBotDataService);
        ReflectionTestUtils.setField(publishApiService, "chatBotApiService", chatBotApiService);
        ReflectionTestUtils.setField(publishApiService, "userLangChainDataService", userLangChainDataService);
        ReflectionTestUtils.setField(publishApiService, "maasUtil", maasUtil);
        ReflectionTestUtils.setField(publishApiService, "releaseManageClientService", releaseManageClientService);
    }

    @Test
    void createBotApiShouldPreserveUnresolvedDependencyAndSkipExternalApiCreation() {
        ChatBotBase bot = new ChatBotBase();
        bot.setId(25);
        bot.setVersion(BotVersionEnum.WORKFLOW.getVersion());
        AppMst app = AppMst.builder().appId("app-1").appName("app").build();
        UserLangChainInfo binding = UserLangChainInfo.builder()
                .botId(25)
                .flowId("flow-1")
                .build();
        CreateBotApiVo request = CreateBotApiVo.builder()
                .botId(25L)
                .appId("app-1")
                .build();
        when(chatBotDataService.findOne("requester-uid", 25L, 1L)).thenReturn(bot);
        when(appMstService.getByAppId("requester-uid", "app-1")).thenReturn(app);
        when(redisUtil.tryLock(eq("publish_apirequester-uid"), eq(3000L), anyString()))
                .thenReturn(true);
        when(userLangChainDataService.findListByBotId(25)).thenReturn(List.of(binding));
        when(releaseManageClientService.getVersionNameByBotId(25L, 1L, null))
                .thenReturn("v1.0");
        BusinessException unresolved =
                new BusinessException(ResponseEnum.WORKFLOW_IMPORT_DEPENDENCY_UNRESOLVED);
        org.mockito.Mockito.doThrow(unresolved)
                .when(releaseManageClientService)
                .releaseBotApi(25, "flow-1", "v1.0", "requester-uid", 1L, null);

        assertThatThrownBy(() -> publishApiService.createBotApi(
                request, null, "requester-uid", 1L))
                .isSameAs(unresolved)
                .extracting("code")
                .isEqualTo(ResponseEnum.WORKFLOW_IMPORT_DEPENDENCY_UNRESOLVED.getCode());

        verify(maasUtil, never()).createApi(anyString(), anyString(), anyString());
        verify(chatBotApiService, never()).insertOrUpdate(org.mockito.ArgumentMatchers.any());
        verify(redisUtil).unlock(eq("publish_apirequester-uid"), anyString());
    }
}
