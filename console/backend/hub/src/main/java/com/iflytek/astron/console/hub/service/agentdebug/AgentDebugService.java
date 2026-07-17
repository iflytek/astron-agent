package com.iflytek.astron.console.hub.service.agentdebug;

import com.iflytek.astron.console.hub.dto.agentdebug.AgentDebugSessionDto;
import com.iflytek.astron.console.hub.dto.agentdebug.CreateAgentDebugSessionRequest;
import java.util.List;
import java.util.Map;

public interface AgentDebugService {

    default List<AgentDebugSessionDto> listSessions(String uid, Integer botId) {
        return listSessions(uid, null, botId);
    }

    List<AgentDebugSessionDto> listSessions(String uid, Long spaceId, Integer botId);

    default AgentDebugSessionDto createSession(String uid, CreateAgentDebugSessionRequest request) {
        return createSession(uid, null, request);
    }

    AgentDebugSessionDto createSession(String uid, Long spaceId, CreateAgentDebugSessionRequest request);

    default List<Map<String, Object>> getMessages(String uid, String sessionId) {
        return getMessages(uid, null, sessionId);
    }

    List<Map<String, Object>> getMessages(String uid, Long spaceId, String sessionId);

    default void saveMessages(String uid, String sessionId, List<Map<String, Object>> messages) {
        saveMessages(uid, null, sessionId, messages);
    }

    void saveMessages(String uid, Long spaceId, String sessionId, List<Map<String, Object>> messages);

    default void deleteSession(String uid, String sessionId) {
        deleteSession(uid, null, sessionId);
    }

    void deleteSession(String uid, Long spaceId, String sessionId);

    default void clearSessions(String uid, Integer botId) {
        clearSessions(uid, null, botId);
    }

    void clearSessions(String uid, Long spaceId, Integer botId);
}
