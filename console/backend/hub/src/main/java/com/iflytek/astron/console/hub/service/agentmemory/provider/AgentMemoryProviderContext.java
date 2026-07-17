package com.iflytek.astron.console.hub.service.agentmemory.provider;

import java.util.Map;

public record AgentMemoryProviderContext(
        String apiKey,
        String userId,
        Integer botId,
        Long spaceId,
        String agentId,
        Map<String, Object> metadata) {
}
