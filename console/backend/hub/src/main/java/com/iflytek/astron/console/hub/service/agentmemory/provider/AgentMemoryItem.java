package com.iflytek.astron.console.hub.service.agentmemory.provider;

import java.util.Map;

public record AgentMemoryItem(
        String id,
        String memory,
        Double score,
        Map<String, Object> metadata,
        String createdAt,
        String updatedAt) {
}
