package com.iflytek.astron.console.hub.service.agentdebug.impl;

import com.alibaba.fastjson2.JSON;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.entity.agentdebug.AgentDebugMessage;
import com.iflytek.astron.console.commons.entity.agentdebug.AgentDebugSession;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.mapper.agentdebug.AgentDebugMessageMapper;
import com.iflytek.astron.console.commons.mapper.agentdebug.AgentDebugSessionMapper;
import com.iflytek.astron.console.commons.mapper.bot.ChatBotBaseMapper;
import com.iflytek.astron.console.hub.dto.agentdebug.AgentDebugSessionDto;
import com.iflytek.astron.console.hub.dto.agentdebug.CreateAgentDebugSessionRequest;
import com.iflytek.astron.console.hub.service.agentdebug.AgentDebugService;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AgentDebugServiceImpl implements AgentDebugService {

    private static final String DEFAULT_TITLE = "全新对话";
    private static final int MAX_TITLE_LENGTH = 30;
    private static final int MAX_SESSION_SIZE = 50;

    private final AgentDebugSessionMapper sessionMapper;
    private final AgentDebugMessageMapper messageMapper;
    private final ChatBotBaseMapper chatBotBaseMapper;

    @Override
    public List<AgentDebugSessionDto> listSessions(String uid, Long spaceId, Integer botId) {
        validateUser(uid);
        checkBotPermission(uid, spaceId, botId);
        LambdaQueryWrapper<AgentDebugSession> query = Wrappers.lambdaQuery(AgentDebugSession.class)
                .eq(AgentDebugSession::getBotId, botId)
                .eq(AgentDebugSession::getUid, uid)
                .eq(AgentDebugSession::getIsDelete, 0)
                .orderByDesc(AgentDebugSession::getUpdateTime)
                .last("LIMIT " + MAX_SESSION_SIZE);
        addSpaceCondition(query, spaceId);
        return sessionMapper.selectList(query)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    public AgentDebugSessionDto createSession(String uid, Long spaceId, CreateAgentDebugSessionRequest request) {
        validateUser(uid);
        if (request == null || request.getBotId() == null) {
            throw new BusinessException(ResponseEnum.PARAMETER_ERROR);
        }
        checkBotPermission(uid, spaceId, request.getBotId());

        LocalDateTime now = LocalDateTime.now();
        AgentDebugSession session = new AgentDebugSession();
        session.setId(UUID.randomUUID().toString().replace("-", ""));
        session.setBotId(request.getBotId());
        session.setUid(uid);
        session.setSpaceId(spaceId);
        session.setTitle(normalizeTitle(request.getTitle(), DEFAULT_TITLE));
        session.setMessageCount(0);
        session.setIsDelete(0);
        session.setCreateTime(now);
        session.setUpdateTime(now);
        sessionMapper.insert(session);
        return toDto(session);
    }

    @Override
    public List<Map<String, Object>> getMessages(String uid, Long spaceId, String sessionId) {
        validateUser(uid);
        findAccessibleSession(uid, spaceId, sessionId);
        return messageMapper.selectList(Wrappers.lambdaQuery(AgentDebugMessage.class)
                .eq(AgentDebugMessage::getSessionId, sessionId)
                .orderByAsc(AgentDebugMessage::getMessageIndex))
                .stream()
                .map(this::parseMessage)
                .toList();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void saveMessages(String uid, Long spaceId, String sessionId, List<Map<String, Object>> messages) {
        validateUser(uid);
        AgentDebugSession existing = findAccessibleSession(uid, spaceId, sessionId);
        List<Map<String, Object>> safeMessages = messages == null ? Collections.emptyList() : messages;
        LocalDateTime now = LocalDateTime.now();

        messageMapper.delete(Wrappers.lambdaQuery(AgentDebugMessage.class)
                .eq(AgentDebugMessage::getSessionId, sessionId));
        for (int index = 0; index < safeMessages.size(); index++) {
            AgentDebugMessage message = new AgentDebugMessage();
            message.setSessionId(sessionId);
            message.setMessageIndex(index);
            message.setMessageJson(JSON.toJSONString(safeMessages.get(index)));
            message.setCreateTime(now);
            message.setUpdateTime(now);
            messageMapper.insert(message);
        }

        AgentDebugSession update = new AgentDebugSession();
        update.setId(existing.getId());
        update.setTitle(deriveTitle(safeMessages, existing.getTitle()));
        update.setMessageCount(safeMessages.size());
        update.setUpdateTime(now);
        sessionMapper.updateById(update);
    }

    @Override
    public void deleteSession(String uid, Long spaceId, String sessionId) {
        validateUser(uid);
        AgentDebugSession existing = findAccessibleSession(uid, spaceId, sessionId);
        AgentDebugSession update = new AgentDebugSession();
        update.setId(existing.getId());
        update.setIsDelete(1);
        update.setUpdateTime(LocalDateTime.now());
        sessionMapper.updateById(update);
    }

    @Override
    public void clearSessions(String uid, Long spaceId, Integer botId) {
        validateUser(uid);
        checkBotPermission(uid, spaceId, botId);
        AgentDebugSession update = new AgentDebugSession();
        update.setIsDelete(1);
        update.setUpdateTime(LocalDateTime.now());
        LambdaUpdateWrapper<AgentDebugSession> updateWrapper = Wrappers.lambdaUpdate(AgentDebugSession.class)
                .eq(AgentDebugSession::getBotId, botId)
                .eq(AgentDebugSession::getUid, uid)
                .eq(AgentDebugSession::getIsDelete, 0);
        addSpaceCondition(updateWrapper, spaceId);
        sessionMapper.update(update, updateWrapper);
    }

    private void validateUser(String uid) {
        if (StringUtils.isBlank(uid)) {
            throw new BusinessException(ResponseEnum.UNAUTHORIZED);
        }
    }

    private void checkBotPermission(String uid, Long spaceId, Integer botId) {
        if (botId == null || chatBotBaseMapper.checkBotPermission(botId, uid, spaceId) <= 0) {
            throw new BusinessException(ResponseEnum.INSUFFICIENT_PERMISSIONS);
        }
    }

    private AgentDebugSession findAccessibleSession(String uid, Long spaceId, String sessionId) {
        AgentDebugSession session = findSession(uid, sessionId);
        if (!isSameSpace(session.getSpaceId(), spaceId)) {
            throw new BusinessException(ResponseEnum.DATA_NOT_FOUND);
        }
        checkBotPermission(uid, spaceId, session.getBotId());
        return session;
    }

    private boolean isSameSpace(Long sessionSpaceId, Long currentSpaceId) {
        if (sessionSpaceId == null || currentSpaceId == null) {
            return sessionSpaceId == null && currentSpaceId == null;
        }
        return sessionSpaceId.equals(currentSpaceId);
    }

    private void addSpaceCondition(LambdaQueryWrapper<AgentDebugSession> queryWrapper, Long spaceId) {
        if (spaceId == null) {
            queryWrapper.isNull(AgentDebugSession::getSpaceId);
        } else {
            queryWrapper.eq(AgentDebugSession::getSpaceId, spaceId);
        }
    }

    private void addSpaceCondition(LambdaUpdateWrapper<AgentDebugSession> updateWrapper, Long spaceId) {
        if (spaceId == null) {
            updateWrapper.isNull(AgentDebugSession::getSpaceId);
        } else {
            updateWrapper.eq(AgentDebugSession::getSpaceId, spaceId);
        }
    }

    private AgentDebugSession findSession(String uid, String sessionId) {
        if (StringUtils.isBlank(sessionId)) {
            throw new BusinessException(ResponseEnum.PARAMETER_ERROR);
        }
        AgentDebugSession session = sessionMapper.selectOne(Wrappers.lambdaQuery(AgentDebugSession.class)
                .eq(AgentDebugSession::getId, sessionId)
                .eq(AgentDebugSession::getUid, uid)
                .eq(AgentDebugSession::getIsDelete, 0)
                .last("LIMIT 1"));
        if (session == null) {
            throw new BusinessException(ResponseEnum.DATA_NOT_FOUND);
        }
        return session;
    }

    private AgentDebugSessionDto toDto(AgentDebugSession session) {
        AgentDebugSessionDto dto = new AgentDebugSessionDto();
        dto.setId(session.getId());
        dto.setBotId(session.getBotId());
        dto.setTitle(session.getTitle());
        dto.setCreatedAt(session.getCreateTime());
        dto.setUpdatedAt(session.getUpdateTime());
        dto.setMessageCount(session.getMessageCount() == null ? 0 : session.getMessageCount());
        return dto;
    }

    private String deriveTitle(List<Map<String, Object>> messages, String fallback) {
        for (Map<String, Object> message : messages) {
            if ("USER".equalsIgnoreCase(String.valueOf(message.get("reqType")))) {
                Object rawTitle = message.get("message");
                if (rawTitle == null) {
                    rawTitle = message.get("content");
                }
                String title = normalizeTitle(rawTitle == null ? null : rawTitle.toString(), null);
                if (StringUtils.isNotBlank(title)) {
                    return title;
                }
            }
        }
        return normalizeTitle(fallback, DEFAULT_TITLE);
    }

    private String normalizeTitle(String title, String fallback) {
        String normalized = StringUtils.normalizeSpace(title);
        if (StringUtils.isBlank(normalized)) {
            normalized = fallback;
        }
        if (StringUtils.isBlank(normalized)) {
            return null;
        }
        return normalized.substring(0, Math.min(normalized.length(), MAX_TITLE_LENGTH));
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseMessage(AgentDebugMessage message) {
        if (StringUtils.isBlank(message.getMessageJson())) {
            return new LinkedHashMap<>();
        }
        return JSON.parseObject(message.getMessageJson(), LinkedHashMap.class);
    }
}
