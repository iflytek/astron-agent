package com.iflytek.astron.console.hub.service.agentmemory.provider;

import java.util.Map;

public record AgentMemoryTurn(
        String userText,
        String assistantText,
        String runId,
        String source,
        Map<String, Object> metadata) {
}
