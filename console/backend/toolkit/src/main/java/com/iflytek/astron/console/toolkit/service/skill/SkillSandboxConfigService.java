package com.iflytek.astron.console.toolkit.service.skill;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.iflytek.astron.console.commons.util.space.SpaceInfoUtil;
import com.iflytek.astron.console.toolkit.entity.dto.skill.SkillSandboxConfigDto;
import com.iflytek.astron.console.toolkit.entity.table.skill.SkillSandboxConfig;
import com.iflytek.astron.console.toolkit.entity.vo.skill.SkillSandboxConfigReq;
import com.iflytek.astron.console.toolkit.handler.UserInfoManagerHandler;
import com.iflytek.astron.console.toolkit.mapper.skill.SkillSandboxConfigMapper;
import java.time.LocalDateTime;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
public class SkillSandboxConfigService
        extends ServiceImpl<SkillSandboxConfigMapper, SkillSandboxConfig> {

    private static final String PROVIDER_E2B = "e2b";
    private static final int DEFAULT_TIMEOUT_SECONDS = 60;

    @Value("${skill.sandbox.artifact-upload-url:http://console-hub:8080/workflow/artifacts/internal-upload}")
    private String artifactUploadUrl;

    @Value("${skill.sandbox.artifact-upload-token:}")
    private String artifactUploadToken;

    public SkillSandboxConfigDto getMaskedConfig() {
        return toDto(getScopedConfig(), false);
    }

    public SkillSandboxConfig getActiveConfig() {
        SkillSandboxConfig config = getScopedConfig();
        if (config == null
                || !Boolean.TRUE.equals(config.getEnabled())
                || StringUtils.isBlank(config.getApiKey())) {
            return null;
        }
        return config;
    }

    @Transactional
    public SkillSandboxConfigDto saveConfig(SkillSandboxConfigReq req) {
        SkillSandboxConfig existing = getScopedConfig();
        LocalDateTime now = LocalDateTime.now();
        SkillSandboxConfig config = existing == null ? new SkillSandboxConfig() : existing;
        if (existing == null) {
            config.setUid(currentUid());
            config.setSpaceId(currentSpaceId());
            config.setDeleted(Boolean.FALSE);
            config.setCreateTime(now);
        }
        config.setProvider(normalizeProvider(req == null ? null : req.getProvider()));
        config.setEnabled(req != null && Boolean.TRUE.equals(req.getEnabled()));
        config.setTimeoutSeconds(normalizeTimeout(req == null ? null : req.getTimeoutSeconds()));
        config.setAllowInternetAccess(req != null && Boolean.TRUE.equals(req.getAllowInternetAccess()));
        if (req != null && !Boolean.TRUE.equals(req.getApiKeyMasked())) {
            config.setApiKey(StringUtils.trimToEmpty(req.getApiKey()));
        }
        config.setUpdateTime(now);
        if (config.getId() == null) {
            save(config);
        } else {
            updateById(config);
        }
        return toDto(config, false);
    }

    @Transactional
    public SkillSandboxConfigDto testConfig(SkillSandboxConfigReq req) {
        SkillSandboxConfigDto dto = saveConfig(req);
        SkillSandboxConfig config = getScopedConfig();
        LocalDateTime now = LocalDateTime.now();
        if (config == null || StringUtils.isBlank(config.getApiKey())) {
            dto.setLastTestStatus("failed");
            dto.setLastTestMessage("E2B API Key is empty");
        } else {
            dto.setLastTestStatus("success");
            dto.setLastTestMessage("Sandbox configuration is saved. Live E2B execution is verified when a Skill script runs.");
        }
        dto.setLastTestTime(now);
        if (config != null) {
            config.setLastTestStatus(dto.getLastTestStatus());
            config.setLastTestMessage(dto.getLastTestMessage());
            config.setLastTestTime(now);
            config.setUpdateTime(now);
            updateById(config);
        }
        return dto;
    }

    public SkillSandboxConfigDto toRuntimeDto() {
        SkillSandboxConfig config = getActiveConfig();
        SkillSandboxConfigDto dto = toDto(config, true);
        if (config != null) {
            dto.setArtifactUploadUrl(StringUtils.trimToEmpty(artifactUploadUrl));
            dto.setArtifactUploadToken(StringUtils.trimToEmpty(artifactUploadToken));
            dto.setSpaceId(currentSpaceId());
        }
        return dto;
    }

    private SkillSandboxConfig getScopedConfig() {
        return getOne(scopeQuery(), false);
    }

    private LambdaQueryWrapper<SkillSandboxConfig> scopeQuery() {
        LambdaQueryWrapper<SkillSandboxConfig> wrapper = Wrappers.lambdaQuery(SkillSandboxConfig.class)
                .eq(SkillSandboxConfig::getDeleted, Boolean.FALSE);
        Long spaceId = currentSpaceId();
        if (spaceId != null) {
            wrapper.eq(SkillSandboxConfig::getSpaceId, spaceId);
        } else {
            wrapper.isNull(SkillSandboxConfig::getSpaceId).eq(SkillSandboxConfig::getUid, currentUid());
        }
        return wrapper.last("limit 1");
    }

    private SkillSandboxConfigDto toDto(SkillSandboxConfig config, boolean includeSecret) {
        SkillSandboxConfigDto dto = new SkillSandboxConfigDto();
        dto.setProvider(PROVIDER_E2B);
        dto.setEnabled(Boolean.FALSE);
        dto.setTimeoutSeconds(DEFAULT_TIMEOUT_SECONDS);
        dto.setAllowInternetAccess(Boolean.FALSE);
        dto.setApiKey("");
        dto.setApiKeyMasked(Boolean.FALSE);
        if (config == null) {
            return dto;
        }
        dto.setProvider(normalizeProvider(config.getProvider()));
        dto.setEnabled(Boolean.TRUE.equals(config.getEnabled()));
        dto.setTimeoutSeconds(normalizeTimeout(config.getTimeoutSeconds()));
        dto.setAllowInternetAccess(Boolean.TRUE.equals(config.getAllowInternetAccess()));
        dto.setApiKey(includeSecret ? StringUtils.defaultString(config.getApiKey()) : maskApiKey(config.getApiKey()));
        dto.setApiKeyMasked(StringUtils.isNotBlank(config.getApiKey()) && !includeSecret);
        dto.setLastTestStatus(config.getLastTestStatus());
        dto.setLastTestMessage(config.getLastTestMessage());
        dto.setLastTestTime(config.getLastTestTime());
        return dto;
    }

    private String maskApiKey(String apiKey) {
        if (StringUtils.isBlank(apiKey)) {
            return "";
        }
        if (apiKey.length() <= 8) {
            return "********";
        }
        return apiKey.substring(0, 4) + "********" + apiKey.substring(apiKey.length() - 4);
    }

    private String normalizeProvider(String provider) {
        return StringUtils.defaultIfBlank(StringUtils.lowerCase(StringUtils.trimToEmpty(provider)), PROVIDER_E2B);
    }

    private int normalizeTimeout(Integer timeoutSeconds) {
        if (timeoutSeconds == null || timeoutSeconds < 1) {
            return DEFAULT_TIMEOUT_SECONDS;
        }
        return Math.min(timeoutSeconds, 600);
    }

    private String currentUid() {
        return UserInfoManagerHandler.getUserId();
    }

    private Long currentSpaceId() {
        return SpaceInfoUtil.getSpaceId();
    }
}
