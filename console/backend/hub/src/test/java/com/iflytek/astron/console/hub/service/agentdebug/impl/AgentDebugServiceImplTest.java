package com.iflytek.astron.console.hub.service.agentdebug.impl;

import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.entity.agentdebug.AgentDebugMessage;
import com.iflytek.astron.console.commons.entity.agentdebug.AgentDebugSession;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.mapper.agentdebug.AgentDebugMessageMapper;
import com.iflytek.astron.console.commons.mapper.agentdebug.AgentDebugSessionMapper;
import com.iflytek.astron.console.commons.mapper.bot.ChatBotBaseMapper;
import com.iflytek.astron.console.hub.dto.agentdebug.AgentDebugSessionDto;
import com.iflytek.astron.console.hub.dto.agentdebug.CreateAgentDebugSessionRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AgentDebugServiceImplTest {

    private static final String UID = "test-user";
    private static final int BOT_ID = 7;

    @Mock
    private AgentDebugSessionMapper sessionMapper;

    @Mock
    private AgentDebugMessageMapper messageMapper;

    @Mock
    private ChatBotBaseMapper chatBotBaseMapper;

    @InjectMocks
    private AgentDebugServiceImpl agentDebugService;

    @Test
    void createSession_WithBotPermission_ShouldInsertNewSession() {
        when(chatBotBaseMapper.checkBotPermission(BOT_ID, UID, null)).thenReturn(1);
        when(sessionMapper.insert(any(AgentDebugSession.class))).thenReturn(1);

        CreateAgentDebugSessionRequest request = new CreateAgentDebugSessionRequest();
        request.setBotId(BOT_ID);
        request.setTitle("  ");

        AgentDebugSessionDto result = agentDebugService.createSession(UID, request);

        assertNotNull(result.getId());
        assertEquals(BOT_ID, result.getBotId());
        assertEquals("全新对话", result.getTitle());
        assertEquals(0, result.getMessageCount());

        ArgumentCaptor<AgentDebugSession> captor = ArgumentCaptor.forClass(AgentDebugSession.class);
        verify(sessionMapper).insert(captor.capture());
        AgentDebugSession inserted = captor.getValue();
        assertEquals(result.getId(), inserted.getId());
        assertEquals(UID, inserted.getUid());
        assertEquals(BOT_ID, inserted.getBotId());
        assertEquals("全新对话", inserted.getTitle());
    }

    @Test
    void createSession_WithoutBotPermission_ShouldThrow() {
        when(chatBotBaseMapper.checkBotPermission(BOT_ID, UID, null)).thenReturn(0);

        CreateAgentDebugSessionRequest request = new CreateAgentDebugSessionRequest();
        request.setBotId(BOT_ID);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> agentDebugService.createSession(UID, request));

        assertEquals(ResponseEnum.INSUFFICIENT_PERMISSIONS, exception.getResponseEnum());
        verify(sessionMapper, never()).insert(any(AgentDebugSession.class));
    }

    @Test
    void saveAndLoadMessages_ShouldPreserveMessageOrderAndUpdateTitle() {
        AgentDebugSession session = new AgentDebugSession();
        session.setId("session-1");
        session.setUid(UID);
        session.setBotId(BOT_ID);
        session.setTitle("全新对话");
        when(sessionMapper.selectOne(any())).thenReturn(session);
        when(chatBotBaseMapper.checkBotPermission(BOT_ID, UID, null)).thenReturn(1);
        when(messageMapper.insert(any(AgentDebugMessage.class))).thenReturn(1);

        List<Map<String, Object>> messages = List.of(
                message("USER", "帮我写一篇小红书文案"),
                message("BOT", "好的，我来帮你写。"));

        agentDebugService.saveMessages(UID, "session-1", messages);

        verify(messageMapper).delete(any());
        ArgumentCaptor<AgentDebugMessage> messageCaptor = ArgumentCaptor.forClass(AgentDebugMessage.class);
        verify(messageMapper, times(2)).insert(messageCaptor.capture());
        List<AgentDebugMessage> savedMessages = messageCaptor.getAllValues();
        assertEquals(0, savedMessages.get(0).getMessageIndex());
        assertTrue(savedMessages.get(0).getMessageJson().contains("帮我写一篇小红书文案"));
        assertEquals(1, savedMessages.get(1).getMessageIndex());

        ArgumentCaptor<AgentDebugSession> sessionCaptor = ArgumentCaptor.forClass(AgentDebugSession.class);
        verify(sessionMapper).updateById(sessionCaptor.capture());
        assertEquals("帮我写一篇小红书文案", sessionCaptor.getValue().getTitle());
        assertEquals(2, sessionCaptor.getValue().getMessageCount());

        AgentDebugMessage first = storedMessage(0, "{\"reqType\":\"USER\",\"message\":\"帮我写一篇小红书文案\"}");
        AgentDebugMessage second = storedMessage(1, "{\"reqType\":\"BOT\",\"message\":\"好的，我来帮你写。\"}");
        when(messageMapper.selectList(any())).thenReturn(List.of(first, second));

        List<Map<String, Object>> result = agentDebugService.getMessages(UID, "session-1");

        assertEquals(2, result.size());
        assertEquals("帮我写一篇小红书文案", result.get(0).get("message"));
        assertEquals("好的，我来帮你写。", result.get(1).get("message"));
    }

    @Test
    void getMessages_WithDifferentSpace_ShouldThrowDataNotFound() {
        AgentDebugSession session = new AgentDebugSession();
        session.setId("session-1");
        session.setUid(UID);
        session.setBotId(BOT_ID);
        session.setSpaceId(1L);
        when(sessionMapper.selectOne(any())).thenReturn(session);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> agentDebugService.getMessages(UID, 2L, "session-1"));

        assertEquals(ResponseEnum.DATA_NOT_FOUND, exception.getResponseEnum());
        verify(messageMapper, never()).selectList(any());
    }

    @Test
    void saveMessages_WithoutCurrentBotPermission_ShouldThrow() {
        AgentDebugSession session = new AgentDebugSession();
        session.setId("session-1");
        session.setUid(UID);
        session.setBotId(BOT_ID);
        session.setSpaceId(1L);
        when(sessionMapper.selectOne(any())).thenReturn(session);
        when(chatBotBaseMapper.checkBotPermission(BOT_ID, UID, 1L)).thenReturn(0);

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> agentDebugService.saveMessages(UID, 1L, "session-1", List.of()));

        assertEquals(ResponseEnum.INSUFFICIENT_PERMISSIONS, exception.getResponseEnum());
        verify(messageMapper, never()).delete(any());
    }

    private static Map<String, Object> message(String reqType, String content) {
        Map<String, Object> message = new LinkedHashMap<>();
        message.put("reqType", reqType);
        message.put("message", content);
        return message;
    }

    private static AgentDebugMessage storedMessage(Integer index, String json) {
        AgentDebugMessage message = new AgentDebugMessage();
        message.setSessionId("session-1");
        message.setMessageIndex(index);
        message.setMessageJson(json);
        return message;
    }
}
