package com.iflytek.astron.console.hub.service.agentmemory;

import com.iflytek.astron.console.commons.entity.agentmemory.AgentMemoryConfig;
import com.iflytek.astron.console.hub.dto.agentmemory.AgentMemoryConfigDto;
import com.iflytek.astron.console.hub.dto.agentmemory.AgentMemoryItemDto;
import com.iflytek.astron.console.hub.dto.agentmemory.SaveAgentMemoryConfigRequest;

import java.util.List;
import java.util.Optional;

public interface AgentMemoryService {

    AgentMemoryConfigDto getConfig(String uid, Long spaceId, Integer botId);

    AgentMemoryConfigDto saveConfig(String uid, Long spaceId, SaveAgentMemoryConfigRequest request);

    Optional<AgentMemoryConfig> getRuntimeConfig(String uid, Long spaceId, Integer botId);

    List<AgentMemoryItemDto> listMemories(String uid, Long spaceId, Integer botId);

    void deleteMemory(String uid, Long spaceId, Integer botId, String memoryId);

    void clearMemories(String uid, Long spaceId, Integer botId);
}
