package com.iflytek.astron.console.hub.service.agentmemory.runtime;

import com.iflytek.astron.console.commons.dto.llm.SparkChatRequest;
import com.iflytek.astron.console.hub.service.chat.springai.AgentChatTask;

import java.util.List;

public interface AgentMemoryRuntimeService {

    List<SparkChatRequest.MessageDto> enrichMessages(AgentChatTask task);

    void writeTurn(AgentChatTask task, String assistantAnswer);
}
