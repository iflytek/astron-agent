package com.iflytek.astron.console.hub.service.agentmemory.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.entity.agentmemory.AgentMemoryConfig;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.mapper.agentmemory.AgentMemoryConfigMapper;
import com.iflytek.astron.console.commons.mapper.bot.ChatBotBaseMapper;
import com.iflytek.astron.console.hub.dto.agentmemory.AgentMemoryConfigDto;
import com.iflytek.astron.console.hub.dto.agentmemory.AgentMemoryItemDto;
import com.iflytek.astron.console.hub.dto.agentmemory.SaveAgentMemoryConfigRequest;
import com.iflytek.astron.console.hub.service.agentmemory.AgentMemoryService;
import com.iflytek.astron.console.hub.service.agentmemory.provider.AgentMemoryItem;
import com.iflytek.astron.console.hub.service.agentmemory.provider.AgentMemoryProvider;
import com.iflytek.astron.console.hub.service.agentmemory.provider.AgentMemoryProviderContext;
import com.iflytek.astron.console.hub.service.agentmemory.provider.AgentMemoryProviderFactory;
import com.iflytek.astron.console.hub.service.agentmemory.provider.Mem0MemoryProvider;
import com.iflytek.astron.console.hub.service.agentmemory.runtime.AgentMemorySecretService;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AgentMemoryServiceImpl implements AgentMemoryService {

    private static final int DEFAULT_TOP_K = 5;
    private static final int MIN_TOP_K = 1;
    private static final int MAX_TOP_K = 20;
    private static final double DEFAULT_MIN_SCORE = 0.0;
    private static final long NO_SPACE_ID = 0L;
    private static final long ACTIVE_DELETE_TIME = 0L;

    private final AgentMemoryConfigMapper configMapper;
    private final ChatBotBaseMapper chatBotBaseMapper;
    private final AgentMemorySecretService secretService;
    private final AgentMemoryProviderFactory providerFactory;

    @Override
    public AgentMemoryConfigDto getConfig(String uid, Long spaceId, Integer botId) {
        validateUser(uid);
        checkBotPermission(uid, spaceId, botId);
        return findConfig(uid, spaceId, botId, Mem0MemoryProvider.PROVIDER)
                .map(this::toDto)
                .orElseGet(() -> defaultDto(botId));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public AgentMemoryConfigDto saveConfig(String uid, Long spaceId, SaveAgentMemoryConfigRequest request) {
        validateUser(uid);
        if (request == null || request.getBotId() == null) {
            throw new BusinessException(ResponseEnum.PARAMETER_ERROR);
        }
        checkBotPermission(uid, spaceId, request.getBotId());

        String provider = normalizeProvider(request.getProvider());
        Optional<AgentMemoryConfig> existing = findConfig(uid, spaceId, request.getBotId(), provider);
        LocalDateTime now = LocalDateTime.now();

        String nextApiKeyCiphertext = StringUtils.trimToNull(request.getApiKeyCiphertext());
        if (nextApiKeyCiphertext == null && existing.isPresent()) {
            nextApiKeyCiphertext = existing.get().getApiKeyCiphertext();
        }
        boolean enabled = Boolean.TRUE.equals(request.getEnabled());
        if (enabled && StringUtils.isBlank(nextApiKeyCiphertext)) {
            throw new BusinessException(ResponseEnum.PARAMETER_ERROR);
        }

        AgentMemoryConfig config = existing.orElseGet(AgentMemoryConfig::new);
        config.setBotId(request.getBotId());
        config.setUid(uid);
        config.setSpaceId(toStoredSpaceId(spaceId));
        config.setProvider(provider);
        config.setEnabled(enabled ? 1 : 0);
        config.setAutoSearch(Boolean.FALSE.equals(request.getAutoSearch()) ? 0 : 1);
        config.setApiKeyCiphertext(nextApiKeyCiphertext);
        config.setSearchTopK(normalizeTopK(request.getSearchTopK()));
        config.setMinScore(normalizeMinScore(request.getMinScore()));
        config.setIsDelete(0);
        config.setDeleteTime(ACTIVE_DELETE_TIME);
        config.setUpdateTime(now);

        if (config.getId() == null) {
            config.setCreateTime(now);
            configMapper.insert(config);
        } else {
            configMapper.updateById(config);
        }

        return toDto(config);
    }

    @Override
    public Optional<AgentMemoryConfig> getRuntimeConfig(String uid, Long spaceId, Integer botId) {
        if (StringUtils.isBlank(uid) || botId == null) {
            return Optional.empty();
        }
        return findConfig(uid, spaceId, botId, Mem0MemoryProvider.PROVIDER)
                .filter(config -> Integer.valueOf(1).equals(config.getEnabled()))
                .filter(config -> StringUtils.isNotBlank(config.getApiKeyCiphertext()));
    }

    @Override
    public List<AgentMemoryItemDto> listMemories(String uid, Long spaceId, Integer botId) {
        validateUser(uid);
        checkBotPermission(uid, spaceId, botId);
        AgentMemoryConfig config = findConfig(uid, spaceId, botId, Mem0MemoryProvider.PROVIDER).orElse(null);
        if (config == null || StringUtils.isBlank(config.getApiKeyCiphertext())) {
            return List.of();
        }
        AgentMemoryProvider provider = resolveProvider(config.getProvider());
        return provider.list(buildContext(config), 1, 100)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    public void deleteMemory(String uid, Long spaceId, Integer botId, String memoryId) {
        validateUser(uid);
        checkBotPermission(uid, spaceId, botId);
        AgentMemoryConfig config = findConfig(uid, spaceId, botId, Mem0MemoryProvider.PROVIDER).orElse(null);
        if (config == null || StringUtils.isBlank(config.getApiKeyCiphertext())) {
            return;
        }
        resolveProvider(config.getProvider()).delete(buildContext(config), memoryId);
    }

    @Override
    public void clearMemories(String uid, Long spaceId, Integer botId) {
        validateUser(uid);
        checkBotPermission(uid, spaceId, botId);
        AgentMemoryConfig config = findConfig(uid, spaceId, botId, Mem0MemoryProvider.PROVIDER).orElse(null);
        if (config == null || StringUtils.isBlank(config.getApiKeyCiphertext())) {
            return;
        }
        resolveProvider(config.getProvider()).clear(buildContext(config));
    }

    private Optional<AgentMemoryConfig> findConfig(String uid, Long spaceId, Integer botId, String provider) {
        if (StringUtils.isBlank(uid) || botId == null) {
            return Optional.empty();
        }
        LambdaQueryWrapper<AgentMemoryConfig> query = Wrappers.lambdaQuery(AgentMemoryConfig.class)
                .eq(AgentMemoryConfig::getBotId, botId)
                .eq(AgentMemoryConfig::getUid, uid)
                .eq(AgentMemoryConfig::getProvider, normalizeProvider(provider))
                .eq(AgentMemoryConfig::getIsDelete, 0)
                .eq(AgentMemoryConfig::getDeleteTime, ACTIVE_DELETE_TIME)
                .orderByDesc(AgentMemoryConfig::getUpdateTime)
                .last("LIMIT 1");
        addSpaceCondition(query, spaceId);
        return Optional.ofNullable(configMapper.selectOne(query));
    }

    private AgentMemoryProvider resolveProvider(String provider) {
        return providerFactory.getProvider(provider)
                .orElseThrow(() -> new BusinessException(ResponseEnum.PARAMETER_ERROR));
    }

    private AgentMemoryProviderContext buildContext(AgentMemoryConfig config) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("bot_id", config.getBotId());
        Long spaceId = toRuntimeSpaceId(config.getSpaceId());
        if (spaceId != null) {
            metadata.put("space_id", spaceId);
        }
        return new AgentMemoryProviderContext(
                secretService.decryptApiKey(config.getApiKeyCiphertext()),
                config.getUid(),
                config.getBotId(),
                spaceId,
                agentId(config.getBotId()),
                metadata);
    }

    private AgentMemoryConfigDto toDto(AgentMemoryConfig config) {
        AgentMemoryConfigDto dto = defaultDto(config.getBotId());
        dto.setProvider(normalizeProvider(config.getProvider()));
        dto.setEnabled(Integer.valueOf(1).equals(config.getEnabled()));
        dto.setHasApiKey(StringUtils.isNotBlank(config.getApiKeyCiphertext()));
        dto.setAutoSearch(!Integer.valueOf(0).equals(config.getAutoSearch()));
        dto.setSearchTopK(normalizeTopK(config.getSearchTopK()));
        dto.setMinScore(normalizeMinScore(config.getMinScore()));
        dto.setCreatedAt(config.getCreateTime());
        dto.setUpdatedAt(config.getUpdateTime());
        return dto;
    }

    private AgentMemoryItemDto toDto(AgentMemoryItem item) {
        return new AgentMemoryItemDto(
                item.id(),
                item.memory(),
                item.score(),
                item.metadata(),
                item.createdAt(),
                item.updatedAt());
    }

    private AgentMemoryConfigDto defaultDto(Integer botId) {
        AgentMemoryConfigDto dto = new AgentMemoryConfigDto();
        dto.setBotId(botId);
        dto.setProvider(Mem0MemoryProvider.PROVIDER);
        dto.setEnabled(false);
        dto.setHasApiKey(false);
        dto.setAutoSearch(true);
        dto.setSearchTopK(DEFAULT_TOP_K);
        dto.setMinScore(DEFAULT_MIN_SCORE);
        return dto;
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

    private void addSpaceCondition(LambdaQueryWrapper<AgentMemoryConfig> queryWrapper, Long spaceId) {
        queryWrapper.eq(AgentMemoryConfig::getSpaceId, toStoredSpaceId(spaceId));
    }

    private String normalizeProvider(String provider) {
        String normalized = StringUtils.upperCase(StringUtils.trimToEmpty(provider));
        return StringUtils.isBlank(normalized) ? Mem0MemoryProvider.PROVIDER : normalized;
    }

    private int normalizeTopK(Integer topK) {
        int value = topK == null ? DEFAULT_TOP_K : topK;
        return Math.max(MIN_TOP_K, Math.min(MAX_TOP_K, value));
    }

    private double normalizeMinScore(Double minScore) {
        double value = minScore == null ? DEFAULT_MIN_SCORE : minScore;
        return Math.max(0.0, Math.min(1.0, value));
    }

    private String agentId(Integer botId) {
        return "bot-" + botId;
    }

    private Long toStoredSpaceId(Long spaceId) {
        return spaceId == null ? NO_SPACE_ID : spaceId;
    }

    private Long toRuntimeSpaceId(Long spaceId) {
        return spaceId == null || NO_SPACE_ID == spaceId ? null : spaceId;
    }
}
