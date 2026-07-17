package com.iflytek.astron.console.hub.service.agentmemory.runtime;

import com.iflytek.astron.console.commons.dto.llm.SparkChatRequest;
import com.iflytek.astron.console.commons.entity.agentmemory.AgentMemoryConfig;
import com.iflytek.astron.console.hub.service.agentmemory.AgentMemoryService;
import com.iflytek.astron.console.hub.service.agentmemory.provider.AgentMemoryProvider;
import com.iflytek.astron.console.hub.service.agentmemory.provider.AgentMemoryProviderContext;
import com.iflytek.astron.console.hub.service.agentmemory.provider.AgentMemoryProviderFactory;
import com.iflytek.astron.console.hub.service.agentmemory.provider.AgentMemorySearchResult;
import com.iflytek.astron.console.hub.service.agentmemory.provider.AgentMemoryTurn;
import com.iflytek.astron.console.hub.service.chat.springai.AgentChatTask;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgentMemoryRuntimeServiceImpl implements AgentMemoryRuntimeService {

    private static final String MEMORY_PROMPT_TITLE = "长期记忆（仅在和当前问题相关时参考）：";
    private static final int MAX_MEMORY_ITEMS = 8;
    private static final int MAX_MEMORY_TEXT_LENGTH = 500;
    private static final int MAX_MEMORY_BLOCK_LENGTH = 2400;
    private static final long NO_SPACE_ID = 0L;

    private final AgentMemoryService agentMemoryService;
    private final AgentMemorySecretService secretService;
    private final AgentMemoryProviderFactory providerFactory;

    @Override
    public List<SparkChatRequest.MessageDto> enrichMessages(AgentChatTask task) {
        if (task == null) {
            return List.of();
        }
        List<SparkChatRequest.MessageDto> originalMessages =
                task.getMessages() == null ? List.of() : task.getMessages();
        try {
            Optional<AgentMemoryConfig> configOptional = getEnabledConfig(task);
            if (configOptional.isEmpty()) {
                return originalMessages;
            }
            AgentMemoryConfig config = configOptional.get();
            if (Integer.valueOf(0).equals(config.getAutoSearch())) {
                return originalMessages;
            }

            AgentMemoryProvider provider = resolveProvider(config).orElse(null);
            if (provider == null) {
                return originalMessages;
            }

            String apiKey = secretService.decryptApiKey(config.getApiKeyCiphertext());
            AgentMemoryProviderContext context = buildContext(config, apiKey);
            List<AgentMemorySearchResult> memories = provider.search(
                    context,
                    task.getRawUserText(),
                    normalizeTopK(config.getSearchTopK()),
                    normalizeMinScore(config.getMinScore()));
            if (memories == null || memories.isEmpty()) {
                return originalMessages;
            }
            return injectMemories(originalMessages, memories);
        } catch (Exception e) {
            log.warn("Agent memory search skipped, botId={}, uid={}, err={}",
                    task.getBotId(), task.getUserId(), e.getMessage());
            return originalMessages;
        }
    }

    @Override
    public void writeTurn(AgentChatTask task, String assistantAnswer) {
        if (task == null || task.isEdit() || StringUtils.isBlank(task.getRawUserText())
                || StringUtils.isBlank(assistantAnswer)) {
            return;
        }
        try {
            Optional<AgentMemoryConfig> configOptional = getEnabledConfig(task);
            if (configOptional.isEmpty()) {
                return;
            }
            AgentMemoryConfig config = configOptional.get();
            AgentMemoryProvider provider = resolveProvider(config).orElse(null);
            if (provider == null) {
                return;
            }

            String apiKey = secretService.decryptApiKey(config.getApiKeyCiphertext());
            AgentMemoryProviderContext context = buildContext(config, apiKey);
            provider.addTurn(context, new AgentMemoryTurn(
                    task.getRawUserText(),
                    assistantAnswer,
                    resolveRunId(task),
                    task.isDebug() ? "debug" : "chat",
                    buildTurnMetadata(task)));
        } catch (Exception e) {
            log.warn("Agent memory write skipped, botId={}, uid={}, err={}",
                    task.getBotId(), task.getUserId(), e.getMessage());
        }
    }

    private Optional<AgentMemoryConfig> getEnabledConfig(AgentChatTask task) {
        if (task == null || StringUtils.isBlank(task.getUserId()) || task.getBotId() == null) {
            return Optional.empty();
        }
        return agentMemoryService.getRuntimeConfig(task.getUserId(), task.getSpaceId(), task.getBotId())
                .filter(config -> Integer.valueOf(1).equals(config.getEnabled()))
                .filter(config -> StringUtils.isNotBlank(config.getApiKeyCiphertext()));
    }

    private Optional<AgentMemoryProvider> resolveProvider(AgentMemoryConfig config) {
        return providerFactory.getProvider(config.getProvider());
    }

    private AgentMemoryProviderContext buildContext(AgentMemoryConfig config, String apiKey) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("bot_id", config.getBotId());
        Long spaceId = toRuntimeSpaceId(config.getSpaceId());
        if (spaceId != null) {
            metadata.put("space_id", spaceId);
        }
        return new AgentMemoryProviderContext(
                apiKey,
                config.getUid(),
                config.getBotId(),
                spaceId,
                agentId(config.getBotId()),
                metadata);
    }

    private Map<String, Object> buildTurnMetadata(AgentChatTask task) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("debug", task.isDebug());
        if (task.getChatId() != null) {
            metadata.put("chat_id", task.getChatId());
        }
        if (task.getDebugSessionId() != null) {
            metadata.put("debug_session_id", task.getDebugSessionId());
        }
        if (task.getChatReqRecords() != null && task.getChatReqRecords().getId() != null) {
            metadata.put("request_id", task.getChatReqRecords().getId());
        }
        return metadata;
    }

    private List<SparkChatRequest.MessageDto> injectMemories(
            List<SparkChatRequest.MessageDto> messages, List<AgentMemorySearchResult> memories) {
        List<SparkChatRequest.MessageDto> enriched = new ArrayList<>();
        String memoryBlock = buildMemoryBlock(memories);
        boolean systemFound = false;
        for (SparkChatRequest.MessageDto message : messages) {
            if (!systemFound && message != null && "system".equalsIgnoreCase(message.getRole())) {
                SparkChatRequest.MessageDto systemCopy = copy(message);
                systemCopy.setContent(StringUtils.defaultString(message.getContent()) + "\n\n" + memoryBlock);
                enriched.add(systemCopy);
                systemFound = true;
            } else {
                enriched.add(message);
            }
        }

        if (systemFound) {
            return enriched;
        }
        SparkChatRequest.MessageDto system = new SparkChatRequest.MessageDto();
        system.setRole("system");
        system.setContent(memoryBlock);
        enriched.addFirst(system);
        return enriched;
    }

    private String buildMemoryBlock(List<AgentMemorySearchResult> memories) {
        StringBuilder builder = new StringBuilder(MEMORY_PROMPT_TITLE);
        int count = 0;
        for (AgentMemorySearchResult memory : memories) {
            if (count >= MAX_MEMORY_ITEMS || builder.length() >= MAX_MEMORY_BLOCK_LENGTH) {
                break;
            }
            String text = StringUtils.normalizeSpace(memory.memory());
            if (StringUtils.isBlank(text)) {
                continue;
            }
            builder.append("\n- ").append(StringUtils.abbreviate(text, MAX_MEMORY_TEXT_LENGTH));
            count++;
        }
        return builder.toString();
    }

    private SparkChatRequest.MessageDto copy(SparkChatRequest.MessageDto source) {
        SparkChatRequest.MessageDto target = new SparkChatRequest.MessageDto();
        if (source != null) {
            target.setRole(source.getRole());
            target.setContent(source.getContent());
        }
        return target;
    }

    private String resolveRunId(AgentChatTask task) {
        if (StringUtils.isNotBlank(task.getDebugSessionId())) {
            return task.getDebugSessionId();
        }
        if (task.getChatId() != null) {
            return String.valueOf(task.getChatId());
        }
        return "bot-" + task.getBotId();
    }

    private int normalizeTopK(Integer topK) {
        int value = topK == null ? 5 : topK;
        return Math.max(1, Math.min(20, value));
    }

    private double normalizeMinScore(Double minScore) {
        double value = minScore == null ? 0.0 : minScore;
        return Math.max(0.0, Math.min(1.0, value));
    }

    private String agentId(Integer botId) {
        return "bot-" + botId;
    }

    private Long toRuntimeSpaceId(Long spaceId) {
        return spaceId == null || NO_SPACE_ID == spaceId ? null : spaceId;
    }
}
