package com.iflytek.astron.console.hub.controller.bot;

import com.iflytek.astron.console.commons.dto.bot.BotCreateForm;
import com.iflytek.astron.console.commons.entity.bot.UserLangChainInfo;
import com.iflytek.astron.console.commons.service.bot.BotService;
import com.iflytek.astron.console.commons.service.bot.ChatBotDataService;
import com.iflytek.astron.console.commons.service.data.UserLangChainDataService;
import com.iflytek.astron.console.commons.util.MaasUtil;
import com.iflytek.astron.console.commons.util.RequestContextUtil;
import com.iflytek.astron.console.commons.util.space.SpaceInfoUtil;
import com.iflytek.astron.console.hub.service.bot.BotTransactionalService;
import com.iflytek.astron.console.hub.util.BotPermissionUtil;
import com.iflytek.astron.console.toolkit.entity.vo.LLMInfoVo;
import com.iflytek.astron.console.toolkit.service.model.ModelService;
import com.iflytek.astron.console.toolkit.service.workflow.WorkflowService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.redisson.api.RedissonClient;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BotControllerTest {

    @Mock
    private BotPermissionUtil botPermissionUtil;
    @Mock
    private BotService botService;
    @Mock
    private ChatBotDataService chatBotDataService;
    @Mock
    private MaasUtil maasUtil;
    @Mock
    private UserLangChainDataService userLangChainDataService;
    @Mock
    private RedissonClient redissonClient;
    @Mock
    private BotTransactionalService botTransactionalService;
    @Mock
    private WorkflowService workflowService;
    @Mock
    private ModelService modelService;

    @InjectMocks
    private BotController controller;

    @Test
    void createBotUsesAuthorizedRuntimeModelDetailForWorkflowSync() {
        BotCreateForm bot = new BotCreateForm();
        bot.setBotId(7);
        bot.setModelId(12L);
        HttpServletRequest request = mock(HttpServletRequest.class);
        LLMInfoVo runtimeModel = new LLMInfoVo();
        runtimeModel.setApiKey("sk-plaintext");
        UserLangChainInfo chainInfo = new UserLangChainInfo();
        chainInfo.setFlowId("flow-1");

        when(botService.updateWorkflowBot("u1", bot, request, 42L)).thenReturn(true);
        when(modelService.getRuntimeModelDetail(12L, "u1", 42L)).thenReturn(runtimeModel);
        when(userLangChainDataService.findOneByBotId(7)).thenReturn(chainInfo);

        try (MockedStatic<RequestContextUtil> requestContext = mockStatic(RequestContextUtil.class);
                MockedStatic<SpaceInfoUtil> spaceInfo = mockStatic(SpaceInfoUtil.class)) {
            requestContext.when(RequestContextUtil::getUID).thenReturn("u1");
            spaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(42L);

            controller.createBot(request, bot);
        }

        verify(modelService).getRuntimeModelDetail(12L, "u1", 42L);
        verify(workflowService).syncWorkflowModelConfig("flow-1", runtimeModel);
    }
}
