package com.iflytek.astron.console.toolkit.service.platform;

import com.alibaba.fastjson2.JSON;
import com.iflytek.astron.console.commons.constant.RedisKeyConstant;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.toolkit.entity.platform.PlatformAccountCardDto;
import com.iflytek.astron.console.toolkit.entity.platform.PlatformAccountConfigDto;
import com.iflytek.astron.console.toolkit.entity.platform.PlatformAccountRuntimeConfigDto;
import com.iflytek.astron.console.toolkit.entity.platform.PlatformAccountType;
import com.iflytek.astron.console.toolkit.entity.table.ConfigInfo;
import com.iflytek.astron.console.toolkit.mapper.ConfigInfoMapper;
import com.iflytek.astron.console.toolkit.util.RedisUtil;
import jakarta.annotation.Resource;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;

@Service
public class PlatformAccountService {

    private static final String CATEGORY = "PLATFORM_ACCOUNT";
    private static final String MASK = "******";

    @Resource
    private ConfigInfoMapper configInfoMapper;

    @Resource
    private RedisUtil redisUtil;

    public List<PlatformAccountCardDto> listCards() {
        return Arrays.stream(PlatformAccountType.values())
                .map(type -> new PlatformAccountCardDto(type, isConfigured(type), getMaskedConfig(type)))
                .toList();
    }

    public PlatformAccountConfigDto getConfig(PlatformAccountType type) {
        String cached = redisUtil.getStr(cacheKey(type));
        if (StringUtils.isNotBlank(cached)) {
            redisUtil.putString(textCacheKey(type), cached);
            return parse(type, cached);
        }
        ConfigInfo configInfo = configInfoMapper.getByCategoryAndCode(CATEGORY, type.getCode());
        if (configInfo == null || StringUtils.isBlank(configInfo.getValue())) {
            return new PlatformAccountConfigDto();
        }
        cacheConfigValue(type, configInfo.getValue());
        return parse(type, configInfo.getValue());
    }

    public PlatformAccountConfigDto getMaskedConfig(PlatformAccountType type) {
        PlatformAccountConfigDto raw = getConfig(type);
        raw.setConfigured(isConfigured(type, raw));
        return mask(type, raw);
    }

    public PlatformAccountConfigDto saveConfig(PlatformAccountType type, PlatformAccountConfigDto request) {
        PlatformAccountConfigDto previous = getConfig(type);
        PlatformAccountConfigDto merged = mergeMaskedSecrets(type, request, previous);
        String value = JSON.toJSONString(extractValue(type, merged));

        ConfigInfo existing = configInfoMapper.getByCategoryAndCode(CATEGORY, type.getCode());
        LocalDateTime now = LocalDateTime.now();
        if (existing == null) {
            ConfigInfo configInfo = new ConfigInfo();
            configInfo.setCategory(CATEGORY);
            configInfo.setCode(type.getCode());
            configInfo.setName(type.getDisplayName());
            configInfo.setValue(value);
            configInfo.setIsValid(1);
            configInfo.setCreateTime(now);
            configInfo.setUpdateTime(now);
            configInfoMapper.insert(configInfo);
        } else {
            existing.setName(type.getDisplayName());
            existing.setValue(value);
            existing.setIsValid(1);
            existing.setUpdateTime(now);
            configInfoMapper.updateById(existing);
        }
        redisUtil.remove(cacheKey(type));
        redisUtil.removeString(textCacheKey(type));
        return getMaskedConfig(type);
    }

    public PlatformAccountRuntimeConfigDto getRuntimeConfig() {
        PlatformAccountConfigDto iflytek = getConfig(PlatformAccountType.IFLYTEK_OPEN_PLATFORM);
        PlatformAccountConfigDto virtualMan = getConfig(PlatformAccountType.VIRTUAL_MAN);
        PlatformAccountConfigDto aiAbility = getConfig(PlatformAccountType.AI_ABILITY_CHAT);
        PlatformAccountConfigDto knowledge = getConfig(PlatformAccountType.KNOWLEDGE_PLATFORM);

        PlatformAccountRuntimeConfigDto dto = new PlatformAccountRuntimeConfigDto();
        PlatformAccountConfigDto.IflytekOpenPlatformConfig platform = iflytek.getIflytekOpenPlatform();
        if (platform != null) {
            dto.setSparkAppId(platform.getPlatformAppId());
        }
        PlatformAccountConfigDto.VirtualManConfig virtualManConfig = virtualMan.getVirtualMan();
        if (virtualManConfig != null) {
            dto.setSparkVirtualManAppId(virtualManConfig.getSparkVirtualManAppId());
        }
        dto.setIflytekOpenPlatformConfigured(isConfigured(PlatformAccountType.IFLYTEK_OPEN_PLATFORM, iflytek));
        dto.setAiAbilityChatConfigured(isConfigured(PlatformAccountType.AI_ABILITY_CHAT, aiAbility));
        dto.setVirtualManConfigured(isConfigured(PlatformAccountType.VIRTUAL_MAN, virtualMan));
        dto.setRagflowConfigured(isRagflowConfigured(knowledge));
        dto.setXinghuoKnowledgeConfigured(isXinghuoConfigured(knowledge));
        return dto;
    }

    public PlatformAccountConfigDto.IflytekOpenPlatformConfig requireIflytekOpenPlatform() {
        PlatformAccountConfigDto config = getConfig(PlatformAccountType.IFLYTEK_OPEN_PLATFORM);
        if (!isConfigured(PlatformAccountType.IFLYTEK_OPEN_PLATFORM, config)) {
            throwNotConfigured(PlatformAccountType.IFLYTEK_OPEN_PLATFORM.getDisplayName());
        }
        return config.getIflytekOpenPlatform();
    }

    public PlatformAccountConfigDto.IflytekOpenPlatformConfig requireXinghuoKnowledgePlatformCredentials() {
        PlatformAccountConfigDto config = getConfig(PlatformAccountType.IFLYTEK_OPEN_PLATFORM);
        PlatformAccountConfigDto.IflytekOpenPlatformConfig item =
                config == null ? null : config.getIflytekOpenPlatform();
        if (item == null || !hasText(item.getPlatformAppId()) || !hasText(item.getPlatformApiSecret())) {
            throwNotConfigured("讯飞开放平台（星火知识库需要 PLATFORM_APP_ID 和 PLATFORM_API_SECRET）");
        }
        return item;
    }

    public PlatformAccountConfigDto.AiAbilityChatConfig requireAiAbilityChat() {
        PlatformAccountConfigDto config = getConfig(PlatformAccountType.AI_ABILITY_CHAT);
        if (!isConfigured(PlatformAccountType.AI_ABILITY_CHAT, config)) {
            throwNotConfigured(PlatformAccountType.AI_ABILITY_CHAT.getDisplayName());
        }
        return config.getAiAbilityChat();
    }

    public PlatformAccountConfigDto.VirtualManConfig requireVirtualMan() {
        PlatformAccountConfigDto config = getConfig(PlatformAccountType.VIRTUAL_MAN);
        if (!isConfigured(PlatformAccountType.VIRTUAL_MAN, config)) {
            throwNotConfigured(PlatformAccountType.VIRTUAL_MAN.getDisplayName());
        }
        return config.getVirtualMan();
    }

    public PlatformAccountConfigDto.RagflowConfig requireRagflow() {
        PlatformAccountConfigDto config = getConfig(PlatformAccountType.KNOWLEDGE_PLATFORM);
        if (!isRagflowConfigured(config)) {
            throwNotConfigured("知识库平台 - RAGFlow");
        }
        return config.getKnowledgePlatform().getRagflow();
    }

    public PlatformAccountConfigDto.XinghuoKnowledgeConfig requireXinghuoKnowledge() {
        PlatformAccountConfigDto config = getConfig(PlatformAccountType.KNOWLEDGE_PLATFORM);
        if (!isXinghuoConfigured(config)) {
            throwNotConfigured("知识库平台 - 星火知识库");
        }
        return config.getKnowledgePlatform().getXinghuo();
    }

    public boolean isConfigured(PlatformAccountType type) {
        return isConfigured(type, getConfig(type));
    }

    public boolean isConfigured(PlatformAccountType type, PlatformAccountConfigDto config) {
        if (config == null) {
            return false;
        }
        return switch (type) {
            case IFLYTEK_OPEN_PLATFORM -> {
                PlatformAccountConfigDto.IflytekOpenPlatformConfig item = config.getIflytekOpenPlatform();
                yield item != null
                        && hasText(item.getPlatformAppId())
                        && hasText(item.getPlatformApiKey())
                        && hasText(item.getPlatformApiSecret())
                        && hasText(item.getSparkApiPassword())
                        && hasText(item.getSparkRtasrApiKey());
            }
            case AI_ABILITY_CHAT -> {
                PlatformAccountConfigDto.AiAbilityChatConfig item = config.getAiAbilityChat();
                yield item != null && hasText(item.getBaseUrl()) && hasText(item.getModel()) && hasText(item.getApiKey());
            }
            case VIRTUAL_MAN -> {
                PlatformAccountConfigDto.VirtualManConfig item = config.getVirtualMan();
                yield item != null
                        && hasText(item.getSparkVirtualManAppId())
                        && hasText(item.getSparkVirtualManApiKey())
                        && hasText(item.getSparkVirtualManApiSecret());
            }
            case KNOWLEDGE_PLATFORM -> isRagflowConfigured(config) || isXinghuoConfigured(config);
        };
    }

    private boolean isRagflowConfigured(PlatformAccountConfigDto config) {
        if (config == null || config.getKnowledgePlatform() == null) {
            return false;
        }
        PlatformAccountConfigDto.RagflowConfig item = config.getKnowledgePlatform().getRagflow();
        return item != null && hasText(item.getBaseUrl()) && hasText(item.getApiToken());
    }

    private boolean isXinghuoConfigured(PlatformAccountConfigDto config) {
        if (config == null || config.getKnowledgePlatform() == null) {
            return false;
        }
        PlatformAccountConfigDto.XinghuoKnowledgeConfig item = config.getKnowledgePlatform().getXinghuo();
        return item != null && hasText(item.getDatasetId());
    }

    private PlatformAccountConfigDto parse(PlatformAccountType type, String value) {
        PlatformAccountConfigDto dto = new PlatformAccountConfigDto();
        switch (type) {
            case IFLYTEK_OPEN_PLATFORM -> dto.setIflytekOpenPlatform(
                    JSON.parseObject(value, PlatformAccountConfigDto.IflytekOpenPlatformConfig.class));
            case AI_ABILITY_CHAT -> dto.setAiAbilityChat(
                    JSON.parseObject(value, PlatformAccountConfigDto.AiAbilityChatConfig.class));
            case VIRTUAL_MAN -> dto.setVirtualMan(
                    JSON.parseObject(value, PlatformAccountConfigDto.VirtualManConfig.class));
            case KNOWLEDGE_PLATFORM -> dto.setKnowledgePlatform(
                    JSON.parseObject(value, PlatformAccountConfigDto.KnowledgePlatformConfig.class));
        }
        return dto;
    }

    private Object extractValue(PlatformAccountType type, PlatformAccountConfigDto dto) {
        return switch (type) {
            case IFLYTEK_OPEN_PLATFORM -> Objects.requireNonNullElseGet(
                    dto.getIflytekOpenPlatform(), PlatformAccountConfigDto.IflytekOpenPlatformConfig::new);
            case AI_ABILITY_CHAT -> Objects.requireNonNullElseGet(
                    dto.getAiAbilityChat(), PlatformAccountConfigDto.AiAbilityChatConfig::new);
            case VIRTUAL_MAN -> Objects.requireNonNullElseGet(
                    dto.getVirtualMan(), PlatformAccountConfigDto.VirtualManConfig::new);
            case KNOWLEDGE_PLATFORM -> Objects.requireNonNullElseGet(
                    dto.getKnowledgePlatform(), PlatformAccountConfigDto.KnowledgePlatformConfig::new);
        };
    }

    private PlatformAccountConfigDto mergeMaskedSecrets(
            PlatformAccountType type, PlatformAccountConfigDto request, PlatformAccountConfigDto previous) {
        PlatformAccountConfigDto merged = request == null ? new PlatformAccountConfigDto() : request;
        switch (type) {
            case IFLYTEK_OPEN_PLATFORM -> mergeIflytekOpenPlatformSecrets(merged, previous);
            case AI_ABILITY_CHAT -> mergeAiAbilityChatSecrets(merged, previous);
            case VIRTUAL_MAN -> mergeVirtualManSecrets(merged, previous);
            case KNOWLEDGE_PLATFORM -> mergeKnowledgePlatformSecrets(merged, previous);
        }
        return merged;
    }

    private void mergeIflytekOpenPlatformSecrets(
            PlatformAccountConfigDto merged, PlatformAccountConfigDto previous) {
        if (merged.getIflytekOpenPlatform() == null) {
            merged.setIflytekOpenPlatform(new PlatformAccountConfigDto.IflytekOpenPlatformConfig());
        }
        PlatformAccountConfigDto.IflytekOpenPlatformConfig current = merged.getIflytekOpenPlatform();
        PlatformAccountConfigDto.IflytekOpenPlatformConfig old =
                previous == null ? null : previous.getIflytekOpenPlatform();
        if (old == null) {
            return;
        }
        current.setPlatformApiKey(keepOldIfMasked(current.getPlatformApiKey(), old.getPlatformApiKey()));
        current.setPlatformApiSecret(keepOldIfMasked(current.getPlatformApiSecret(), old.getPlatformApiSecret()));
        current.setSparkApiPassword(keepOldIfMasked(current.getSparkApiPassword(), old.getSparkApiPassword()));
        current.setSparkRtasrApiKey(keepOldIfMasked(current.getSparkRtasrApiKey(), old.getSparkRtasrApiKey()));
    }

    private void mergeAiAbilityChatSecrets(PlatformAccountConfigDto merged, PlatformAccountConfigDto previous) {
        if (merged.getAiAbilityChat() == null) {
            merged.setAiAbilityChat(new PlatformAccountConfigDto.AiAbilityChatConfig());
        }
        PlatformAccountConfigDto.AiAbilityChatConfig current = merged.getAiAbilityChat();
        PlatformAccountConfigDto.AiAbilityChatConfig old = previous == null ? null : previous.getAiAbilityChat();
        if (old != null) {
            current.setApiKey(keepOldIfMasked(current.getApiKey(), old.getApiKey()));
        }
    }

    private void mergeVirtualManSecrets(PlatformAccountConfigDto merged, PlatformAccountConfigDto previous) {
        if (merged.getVirtualMan() == null) {
            merged.setVirtualMan(new PlatformAccountConfigDto.VirtualManConfig());
        }
        PlatformAccountConfigDto.VirtualManConfig current = merged.getVirtualMan();
        PlatformAccountConfigDto.VirtualManConfig old = previous == null ? null : previous.getVirtualMan();
        if (old == null) {
            return;
        }
        current.setSparkVirtualManApiKey(
                keepOldIfMasked(current.getSparkVirtualManApiKey(), old.getSparkVirtualManApiKey()));
        current.setSparkVirtualManApiSecret(
                keepOldIfMasked(current.getSparkVirtualManApiSecret(), old.getSparkVirtualManApiSecret()));
    }

    private void mergeKnowledgePlatformSecrets(PlatformAccountConfigDto merged, PlatformAccountConfigDto previous) {
        if (merged.getKnowledgePlatform() == null) {
            merged.setKnowledgePlatform(new PlatformAccountConfigDto.KnowledgePlatformConfig());
        }
        PlatformAccountConfigDto.KnowledgePlatformConfig current = merged.getKnowledgePlatform();
        PlatformAccountConfigDto.KnowledgePlatformConfig old = previous == null ? null : previous.getKnowledgePlatform();
        if (current.getRagflow() == null) {
            current.setRagflow(new PlatformAccountConfigDto.RagflowConfig());
        }
        if (current.getXinghuo() == null) {
            current.setXinghuo(new PlatformAccountConfigDto.XinghuoKnowledgeConfig());
        }
        if (old != null && old.getRagflow() != null) {
            current.getRagflow().setApiToken(keepOldIfMasked(current.getRagflow().getApiToken(), old.getRagflow().getApiToken()));
        }
    }

    private PlatformAccountConfigDto mask(PlatformAccountType type, PlatformAccountConfigDto config) {
        PlatformAccountConfigDto masked = JSON.parseObject(JSON.toJSONString(config), PlatformAccountConfigDto.class);
        switch (type) {
            case IFLYTEK_OPEN_PLATFORM -> {
                PlatformAccountConfigDto.IflytekOpenPlatformConfig item = masked.getIflytekOpenPlatform();
                if (item != null) {
                    item.setPlatformApiKey(maskValue(item.getPlatformApiKey()));
                    item.setPlatformApiSecret(maskValue(item.getPlatformApiSecret()));
                    item.setSparkApiPassword(maskValue(item.getSparkApiPassword()));
                    item.setSparkRtasrApiKey(maskValue(item.getSparkRtasrApiKey()));
                }
            }
            case AI_ABILITY_CHAT -> {
                PlatformAccountConfigDto.AiAbilityChatConfig item = masked.getAiAbilityChat();
                if (item != null) {
                    item.setApiKey(maskValue(item.getApiKey()));
                }
            }
            case VIRTUAL_MAN -> {
                PlatformAccountConfigDto.VirtualManConfig item = masked.getVirtualMan();
                if (item != null) {
                    item.setSparkVirtualManApiKey(maskValue(item.getSparkVirtualManApiKey()));
                    item.setSparkVirtualManApiSecret(maskValue(item.getSparkVirtualManApiSecret()));
                }
            }
            case KNOWLEDGE_PLATFORM -> {
                PlatformAccountConfigDto.KnowledgePlatformConfig item = masked.getKnowledgePlatform();
                if (item != null && item.getRagflow() != null) {
                    item.getRagflow().setApiToken(maskValue(item.getRagflow().getApiToken()));
                }
            }
        }
        return masked;
    }

    private String cacheKey(PlatformAccountType type) {
        return RedisKeyConstant.PLATFORM_ACCOUNT_CONFIG_PREFIX + type.getValue();
    }

    private String textCacheKey(PlatformAccountType type) {
        return RedisKeyConstant.PLATFORM_ACCOUNT_CONFIG_TEXT_PREFIX + type.getValue();
    }

    private void cacheConfigValue(PlatformAccountType type, String value) {
        redisUtil.put(cacheKey(type), value);
        redisUtil.putString(textCacheKey(type), value);
    }

    private void throwNotConfigured(String name) {
        throw new BusinessException(ResponseEnum.PLATFORM_ACCOUNT_NOT_CONFIGURED, name);
    }

    private boolean hasText(String value) {
        return StringUtils.isNotBlank(value)
                && !StringUtils.startsWithIgnoreCase(value, "your-")
                && !"xxx".equalsIgnoreCase(value.trim());
    }

    private String keepOldIfMasked(String current, String old) {
        return isMasked(current) ? old : current;
    }

    private boolean isMasked(String value) {
        return StringUtils.isNotBlank(value) && value.startsWith(MASK);
    }

    private String maskValue(String value) {
        if (StringUtils.isBlank(value)) {
            return value;
        }
        String tail = value.length() <= 4 ? "" : value.substring(value.length() - 4);
        return MASK + tail;
    }
}
