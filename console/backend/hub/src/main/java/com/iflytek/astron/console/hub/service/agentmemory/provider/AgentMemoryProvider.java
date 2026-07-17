package com.iflytek.astron.console.hub.service.agentmemory.provider;

import java.util.List;

public interface AgentMemoryProvider {

    String provider();

    List<AgentMemorySearchResult> search(
            AgentMemoryProviderContext context, String query, int topK, double minScore);

    void addTurn(AgentMemoryProviderContext context, AgentMemoryTurn turn);

    List<AgentMemoryItem> list(AgentMemoryProviderContext context, int page, int pageSize);

    void delete(AgentMemoryProviderContext context, String memoryId);

    void clear(AgentMemoryProviderContext context);
}
