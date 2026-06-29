package com.iflytek.astron.console.hub.service.agentmemory.runtime;

import com.iflytek.astron.console.commons.dto.llm.SparkChatRequest;
import com.iflytek.astron.console.commons.entity.agentmemory.AgentMemoryConfig;
import com.iflytek.astron.console.hub.service.agentmemory.AgentMemoryService;
import com.iflytek.astron.console.hub.service.agentmemory.provider.AgentMemoryProvider;
import com.iflytek.astron.console.hub.service.agentmemory.provider.AgentMemoryProviderFactory;
import com.iflytek.astron.console.hub.service.agentmemory.provider.AgentMemorySearchResult;
import com.iflytek.astron.console.hub.service.agentmemory.provider.AgentMemoryTurn;
import com.iflytek.astron.console.hub.service.chat.springai.AgentChatTask;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AgentMemoryRuntimeServiceImplTest {

    @Mock
    private AgentMemoryService agentMemoryService;

    @Mock
    private AgentMemorySecretService secretService;

    @Mock
    private AgentMemoryProviderFactory providerFactory;

    @Mock
    private AgentMemoryProvider provider;

    @Test
    void enrichMessagesInjectsMemoriesIntoSystemMessageWhenEnabled() {
        AgentMemoryRuntimeServiceImpl runtime = new AgentMemoryRuntimeServiceImpl(
                agentMemoryService, secretService, providerFactory);
        AgentMemoryConfig config = enabledConfig();
        when(agentMemoryService.getRuntimeConfig("u1", 3L, 7)).thenReturn(Optional.of(config));
        when(secretService.decryptApiKey("cipher")).thenReturn("plain-key");
        when(providerFactory.getProvider("MEM0")).thenReturn(Optional.of(provider));
        when(provider.search(any(), eq("我喜欢什么风格?"), eq(4), eq(0.4))).thenReturn(List.of(
                new AgentMemorySearchResult("m1", "用户喜欢简洁、直接的回答", 0.91, Map.of("source", "test"))));

        List<SparkChatRequest.MessageDto> enriched = runtime.enrichMessages(task(false));

        assertEquals("system", enriched.getFirst().getRole());
        assertTrue(enriched.getFirst().getContent().contains("长期记忆"));
        assertTrue(enriched.getFirst().getContent().contains("用户喜欢简洁、直接的回答"));
        assertEquals("user", enriched.getLast().getRole());
        assertEquals("我喜欢什么风格?", enriched.getLast().getContent());
    }

    @Test
    void enrichMessagesSkipsProviderWhenConfigIsDisabled() {
        AgentMemoryRuntimeServiceImpl runtime = new AgentMemoryRuntimeServiceImpl(
                agentMemoryService, secretService, providerFactory);
        AgentMemoryConfig disabled = enabledConfig();
        disabled.setEnabled(0);
        when(agentMemoryService.getRuntimeConfig("u1", 3L, 7)).thenReturn(Optional.of(disabled));

        List<SparkChatRequest.MessageDto> enriched = runtime.enrichMessages(task(false));

        assertEquals("系统提示", enriched.getFirst().getContent());
        verify(providerFactory, never()).getProvider(any());
    }

    @Test
    void writeTurnAddsCompletedConversationToProvider() {
        AgentMemoryRuntimeServiceImpl runtime = new AgentMemoryRuntimeServiceImpl(
                agentMemoryService, secretService, providerFactory);
        AgentMemoryConfig config = enabledConfig();
        when(agentMemoryService.getRuntimeConfig("u1", 3L, 7)).thenReturn(Optional.of(config));
        when(secretService.decryptApiKey("cipher")).thenReturn("plain-key");
        when(providerFactory.getProvider("MEM0")).thenReturn(Optional.of(provider));

        runtime.writeTurn(task(false), "你喜欢简洁、直接的回答。");

        ArgumentCaptor<AgentMemoryTurn> captor = ArgumentCaptor.forClass(AgentMemoryTurn.class);
        verify(provider).addTurn(any(), captor.capture());
        AgentMemoryTurn turn = captor.getValue();
        assertEquals("我喜欢什么风格?", turn.userText());
        assertEquals("你喜欢简洁、直接的回答。", turn.assistantText());
        assertEquals("debug-session-1", turn.runId());
        assertEquals("debug", turn.source());
    }

    @Test
    void writeTurnSkipsReAnswerTurnsToAvoidDuplicateMemories() {
        AgentMemoryRuntimeServiceImpl runtime = new AgentMemoryRuntimeServiceImpl(
                agentMemoryService, secretService, providerFactory);

        runtime.writeTurn(task(true), "重新生成的回答");

        verify(agentMemoryService, never()).getRuntimeConfig(any(), any(), any());
        verify(provider, never()).addTurn(any(), any());
    }

    private AgentMemoryConfig enabledConfig() {
        AgentMemoryConfig config = new AgentMemoryConfig();
        config.setBotId(7);
        config.setUid("u1");
        config.setSpaceId(3L);
        config.setProvider("MEM0");
        config.setEnabled(1);
        config.setAutoSearch(1);
        config.setApiKeyCiphertext("cipher");
        config.setSearchTopK(4);
        config.setMinScore(0.4);
        return config;
    }

    private AgentChatTask task(boolean edit) {
        SparkChatRequest.MessageDto system = new SparkChatRequest.MessageDto();
        system.setRole("system");
        system.setContent("系统提示");
        SparkChatRequest.MessageDto user = new SparkChatRequest.MessageDto();
        user.setRole("user");
        user.setContent("我喜欢什么风格?");
        return AgentChatTask.builder()
                .userId("u1")
                .spaceId(3L)
                .botId(7)
                .debugSessionId("debug-session-1")
                .rawUserText("我喜欢什么风格?")
                .messages(List.of(system, user))
                .edit(edit)
                .debug(true)
                .build();
    }
}
