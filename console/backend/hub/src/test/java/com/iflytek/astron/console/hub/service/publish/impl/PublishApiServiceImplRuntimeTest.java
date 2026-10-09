package com.iflytek.astron.console.hub.service.publish.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.dto.bot.ChatBotApi;
import com.iflytek.astron.console.commons.entity.bot.ChatBotBase;
import com.iflytek.astron.console.commons.entity.user.AppMst;
import com.iflytek.astron.console.commons.enums.bot.BotVersionEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.service.bot.ChatBotDataService;
import com.iflytek.astron.console.commons.service.user.AppMstService;
import com.iflytek.astron.console.hub.dto.publish.BotApiInfoDTO;
import com.iflytek.astron.console.hub.dto.publish.CreateBotApiVo;
import com.iflytek.astron.console.hub.service.chat.ChatBotApiService;
import com.iflytek.astron.console.hub.service.publish.AgentRuntimeManagementClient;
import com.iflytek.astron.console.toolkit.entity.vo.LLMInfoVo;
import com.iflytek.astron.console.toolkit.service.model.ModelService;
import com.iflytek.astron.console.toolkit.util.RedisUtil;
import java.time.LocalDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class PublishApiServiceImplRuntimeTest {

    @Mock
    private AppMstService appMstService;
    @Mock
    private RedisUtil redisUtil;
    @Mock
    private ChatBotDataService chatBotDataService;
    @Mock
    private ChatBotApiService chatBotApiService;
    @Mock
    private AgentRuntimeManagementClient runtimeClient;
    @Mock
    private ModelService modelService;

    private PublishApiServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new PublishApiServiceImpl();
        ReflectionTestUtils.setField(service, "appMstService", appMstService);
        ReflectionTestUtils.setField(service, "redisUtil", redisUtil);
        ReflectionTestUtils.setField(service, "chatBotDataService", chatBotDataService);
        ReflectionTestUtils.setField(service, "chatBotApiService", chatBotApiService);
        ReflectionTestUtils.setField(service, "agentRuntimeManagementClient", runtimeClient);
        ReflectionTestUtils.setField(service, "modelService", modelService);
        ReflectionTestUtils.setField(service, "botApiMaasBaseUrl", "https://agent.example");
    }

    @Test
    void baseBotPublishCreatesSecretFreeRuntimeSnapshotAndBinding() {
        ChatBotBase bot = ChatBotBase.builder()
                .id(25)
                .botName("copywriter")
                .version(BotVersionEnum.BASE_BOT.getVersion())
                .modelId(7L)
                .model("spark-pro")
                .prompt("Write concise product copy")
                .updateTime(LocalDateTime.of(2026, 10, 9, 10, 0))
                .build();
        AppMst app = AppMst.builder()
                .appId("app-1")
                .appName("commerce")
                .appKey("public-key")
                .appSecret("private-secret")
                .build();
        CreateBotApiVo request = CreateBotApiVo.builder()
                .botId(25L)
                .appId("app-1")
                .build();
        when(chatBotDataService.findOne("owner", 25L, 100L)).thenReturn(bot);
        when(appMstService.getByAppId("owner", "app-1")).thenReturn(app);
        LLMInfoVo model = new LLMInfoVo();
        model.setDomain("spark-pro");
        model.setUrl("https://models.example/v1/chat/completions");
        model.setProvider("openai");
        model.setApiKey("model-private-secret");
        when(modelService.getRuntimeModelDetail(7L, "owner", 100L)).thenReturn(model);
        when(redisUtil.tryLock(eq("publish_apiowner"), eq(3000L), anyString()))
                .thenReturn(true);
        when(runtimeClient.publish(
                eq("25"),
                eq("100"),
                anyString(),
                eq("chat"),
                org.mockito.ArgumentMatchers.any(JSONObject.class),
                eq("app-1")))
                .thenReturn(new AgentRuntimeManagementClient.RuntimeRelease("release-1", "v1"));

        BotApiInfoDTO result = service.createBotApi(request, null, "owner", 100L);

        ArgumentCaptor<JSONObject> snapshot = ArgumentCaptor.forClass(JSONObject.class);
        verify(runtimeClient)
                .publish(
                        eq("25"),
                        eq("100"),
                        anyString(),
                        eq("chat"),
                        snapshot.capture(),
                        eq("app-1"));
        assertThat(snapshot.getValue().toJSONString()).doesNotContain("api_key", "private-secret");
        assertThat(snapshot.getValue()
                .getJSONObject("agent_request")
                .getJSONObject("model_config")
                .getJSONObject("credential_ref")
                .getLong("model_id"))
                .isEqualTo(7L);
        assertThat(snapshot.getValue()
                .getJSONObject("agent_request")
                .getJSONObject("model_config")
                .getString("domain"))
                .isEqualTo("spark-pro");
        assertThat(result.getServiceUrl())
                .isEqualTo("https://agent.example/openapi/v1/agents/25/runs");
        assertThat(result.getFlowId()).isEqualTo("release-1");

        ArgumentCaptor<ChatBotApi> persisted = ArgumentCaptor.forClass(ChatBotApi.class);
        verify(chatBotApiService).insertOrUpdate(persisted.capture());
        assertThat(persisted.getValue().getAssistantId()).isEqualTo("release-1");
        verify(redisUtil).unlock(eq("publish_apiowner"), anyString());
    }

    @Test
    void localPersistenceFailureDisablesRemoteRuntimeRelease() {
        ChatBotBase bot = ChatBotBase.builder()
                .id(25)
                .botName("copywriter")
                .version(BotVersionEnum.BASE_BOT.getVersion())
                .model("spark-pro")
                .build();
        AppMst app = AppMst.builder()
                .appId("app-1")
                .appName("commerce")
                .appKey("public-key")
                .appSecret("private-secret")
                .build();
        CreateBotApiVo request = CreateBotApiVo.builder()
                .botId(25L)
                .appId("app-1")
                .build();
        when(chatBotDataService.findOne("owner", 25L, 100L)).thenReturn(bot);
        when(appMstService.getByAppId("owner", "app-1")).thenReturn(app);
        when(redisUtil.tryLock(eq("publish_apiowner"), eq(3000L), anyString()))
                .thenReturn(true);
        when(runtimeClient.publish(
                eq("25"),
                eq("100"),
                anyString(),
                eq("chat"),
                org.mockito.ArgumentMatchers.any(JSONObject.class),
                eq("app-1")))
                .thenReturn(new AgentRuntimeManagementClient.RuntimeRelease("release-1", "v1"));
        doThrow(new IllegalStateException("database unavailable"))
                .when(chatBotApiService)
                .insertOrUpdate(any(ChatBotApi.class));

        assertThrows(
                BusinessException.class,
                () -> service.createBotApi(request, null, "owner", 100L));

        verify(runtimeClient).disable("release-1");
        verify(redisUtil).unlock(eq("publish_apiowner"), anyString());
    }
}
