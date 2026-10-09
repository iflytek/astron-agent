package com.iflytek.astron.console.hub.service.chat.runtime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.dto.llm.SparkChatRequest;
import com.iflytek.astron.console.commons.service.ChatRecordModelService;
import com.iflytek.astron.console.hub.service.agentmemory.runtime.AgentMemoryRuntimeService;
import com.iflytek.astron.console.hub.service.chat.springai.AgentChatTask;
import java.util.List;
import okhttp3.OkHttpClient;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class CoreAgentChatServiceTest {

    @Test
    void consoleRequestUsesCoreAgentContractAndKeepsSystemPromptOutOfMessages() {
        CoreAgentChatService service = new CoreAgentChatService(
                new OkHttpClient(),
                mock(ChatRecordModelService.class),
                mock(AgentMemoryRuntimeService.class),
                Runnable::run,
                "http://core-agent/agent/v1/custom/chat/completions",
                "i".repeat(32),
                "platform-app");
        SparkChatRequest.MessageDto system = message("system", "You are concise");
        SparkChatRequest.MessageDto user = message("user", "hello");
        AgentChatTask task = AgentChatTask.builder()
                .userId("user-1")
                .sparkModelName("generalv3.5")
                .messages(List.of(system, user))
                .build();

        JSONObject request = ReflectionTestUtils.invokeMethod(service, "buildRequest", task);

        assertThat(request).isNotNull();
        assertThat(request.getJSONObject("instruction").getString("answer"))
                .isEqualTo("You are concise");
        JSONArray messages = request.getJSONArray("messages");
        assertThat(messages).hasSize(1);
        assertThat(messages.getJSONObject(0).getString("role")).isEqualTo("user");
        assertThat(request.getJSONObject("model_config").getString("api_key"))
                .isEmpty();
        assertThat(request.getJSONObject("meta_data").getString("caller"))
                .isEqualTo("console-hub");
    }

    private SparkChatRequest.MessageDto message(String role, String content) {
        SparkChatRequest.MessageDto result = new SparkChatRequest.MessageDto();
        result.setRole(role);
        result.setContent(content);
        return result;
    }
}
