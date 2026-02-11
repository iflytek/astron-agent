package com.iflytek.astron.console.hub.service.bot.impl;

import com.alibaba.fastjson2.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.hub.dto.PageResponse;
import com.iflytek.astron.console.commons.dto.bot.PersonalityConfigDto;
import com.iflytek.astron.console.hub.entity.personality.PersonalityCategory;
import com.iflytek.astron.console.hub.entity.personality.PersonalityConfig;
import com.iflytek.astron.console.hub.enums.ConfigTypeEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.hub.entity.personality.PersonalityRole;
import com.iflytek.astron.console.hub.enums.PersonalitySceneTypeEnum;
import com.iflytek.astron.console.hub.mapper.personality.PersonalityCategoryMapper;
import com.iflytek.astron.console.hub.mapper.personality.PersonalityConfigMapper;
import com.iflytek.astron.console.commons.util.I18nUtil;
import com.iflytek.astron.console.hub.mapper.personality.PersonalityRoleMapper;
import com.iflytek.astron.console.hub.service.bot.PersonalityConfigService;
import com.iflytek.astron.console.hub.util.BotAIServiceClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.cache.annotation.Cacheable;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PersonalityConfigServiceImpl implements PersonalityConfigService {

    private final PersonalityConfigMapper personalityConfigMapper;

    private final PersonalityCategoryMapper personalityCategoryMapper;

    private final PersonalityRoleMapper personalityRoleMapper;

    private final BotAIServiceClient aiServiceClient;


    @Override
    public String aiGeneratedPersonality(String botName, String category, String info, String prompt) {
        if (StringUtils.isBlank(botName) || StringUtils.isBlank(category) || StringUtils.isBlank(info)
                || StringUtils.isBlank(prompt)) {
            throw new BusinessException(ResponseEnum.PERSONALITY_AI_GENERATE_PARAM_EMPTY);
        }
        String answer;
        try {
            String format = smartFormat(I18nUtil.getMessage("personality.ai.generated"), botName, category, info, prompt);
            answer = aiServiceClient.generateText(format, "4.0Ultra", 60);
        } catch (Exception e) {
            log.error("aiGeneratedPersonality error, botName: {}, category: {}, info: {}, prompt: {}", botName, category, info, prompt, e);
            throw new BusinessException(ResponseEnum.PERSONALITY_AI_GENERATE_ERROR);
        }
        if (StringUtils.isBlank(answer)) {
            throw new BusinessException(ResponseEnum.PERSONALITY_AI_GENERATE_ERROR);
        }
        return answer;
    }

    @Override
    public String aiPolishing(String botName, String category, String info, String prompt, String personality) {
        if (StringUtils.isBlank(botName) || StringUtils.isBlank(category) || StringUtils.isBlank(info)
                || StringUtils.isBlank(prompt)) {
            throw new BusinessException(ResponseEnum.PERSONALITY_AI_GENERATE_PARAM_EMPTY);
        }
        String answer;
        try {
            String format = smartFormat(I18nUtil.getMessage("personality.ai.polishing"), botName, category, info, prompt, personality);
            answer = aiServiceClient.generateText(format, "4.0Ultra", 60);
        } catch (Exception e) {
            log.error("aiPolishing error, botName: {}, category: {}, info: {}, prompt: {}, personality: {}", botName, category, info, prompt, personality, e);
            throw new BusinessException(ResponseEnum.PERSONALITY_AI_GENERATE_ERROR);
        }
        if (StringUtils.isBlank(answer)) {
            throw new BusinessException(ResponseEnum.PERSONALITY_AI_GENERATE_ERROR);
        }
        return answer;
    }

    @Override
    public String getChatPrompt(Long botId, String originalPrompt, ConfigTypeEnum configType) {
        PersonalityConfig personalityConfig = personalityConfigMapper.selectOne(new LambdaQueryWrapper<PersonalityConfig>()
                .eq(PersonalityConfig::getBotId, botId)
                .eq(PersonalityConfig::getConfigType, configType.getValue())
                .eq(PersonalityConfig::getDeleted, 0)
                .eq(PersonalityConfig::getEnabled, 1));
        if (personalityConfig == null) {
            return originalPrompt;
        }
        return getChatPrompt(personalityConfig, originalPrompt);
    }

    @Override
    public String getChatPrompt(String personalityConfig, String originalPrompt) {
        if (StringUtils.isBlank(personalityConfig)) {
            return originalPrompt;
        }
        PersonalityConfig config;
        try {
            config = JSONObject.parseObject(personalityConfig, PersonalityConfig.class);
        } catch (Exception e) {
            log.error("parse personality config error, config: {}", personalityConfig, e);
            return originalPrompt;
        }
        return getChatPrompt(config, originalPrompt);
    }

    @Override
    public void setDisabledByBotId(Long botId) {
        personalityConfigMapper.setDisabledByBotIdAndConfigType(botId, ConfigTypeEnum.DEBUG.getValue());
    }

    @Override
    public boolean checkPersonalityConfig(PersonalityConfigDto personalityConfigDto) {
        if (personalityConfigDto == null
                || StringUtils.isBlank(personalityConfigDto.getPersonality())
                || personalityConfigDto.getPersonality().length() > 1000) {
            return true;
        }

        if (personalityConfigDto.getSceneType() != null) {
            return PersonalitySceneTypeEnum.getByCode(personalityConfigDto.getSceneType()) == null
                    || StringUtils.isBlank(personalityConfigDto.getSceneInfo()) || personalityConfigDto.getSceneInfo().length() > 1000;
        } else {
            // scene type is null, scene info must be null
            return StringUtils.isNotBlank(personalityConfigDto.getSceneInfo());
        }
    }

    @Override
    public void insertOrUpdate(PersonalityConfigDto personalityConfigDto, Long botId, ConfigTypeEnum configType) {
        PersonalityConfig existingConfig = personalityConfigMapper.selectOne(
                new LambdaQueryWrapper<PersonalityConfig>()
                        .eq(PersonalityConfig::getBotId, botId)
                        .eq(PersonalityConfig::getConfigType, configType.getValue())
                        .eq(PersonalityConfig::getDeleted, 0));

        LocalDateTime now = LocalDateTime.now();

        if (existingConfig != null) {
            // Update existing record
            existingConfig.setPersonality(personalityConfigDto.getPersonality());
            existingConfig.setSceneType(personalityConfigDto.getSceneType());
            existingConfig.setSceneInfo(personalityConfigDto.getSceneInfo());
            existingConfig.setEnabled(1);
            existingConfig.setUpdateTime(now);
            personalityConfigMapper.updateById(existingConfig);
        } else {
            // Insert new record
            PersonalityConfig newConfig = new PersonalityConfig();
            newConfig.setBotId(botId);
            newConfig.setConfigType(configType.getValue());
            newConfig.setPersonality(personalityConfigDto.getPersonality());
            newConfig.setSceneType(personalityConfigDto.getSceneType());
            newConfig.setSceneInfo(personalityConfigDto.getSceneInfo());
            newConfig.setEnabled(1);
            newConfig.setCreateTime(now);
            newConfig.setUpdateTime(now);
            personalityConfigMapper.insert(newConfig);
        }
    }

    @Override
    public PersonalityConfigDto getPersonalConfig(Long botId) {
        PersonalityConfig config = personalityConfigMapper.selectOne(
                new LambdaQueryWrapper<PersonalityConfig>()
                        .eq(PersonalityConfig::getBotId, botId)
                        .eq(PersonalityConfig::getEnabled, 1)
                        .eq(PersonalityConfig::getConfigType, ConfigTypeEnum.DEBUG.getValue())
                        .eq(PersonalityConfig::getDeleted, 0));
        if (config == null) {
            return null;
        }
        PersonalityConfigDto dto = new PersonalityConfigDto();
        dto.setPersonality(config.getPersonality());
        dto.setSceneType(config.getSceneType());
        dto.setSceneInfo(config.getSceneInfo());
        return dto;
    }

    @Override
    @Cacheable(value = "personalityCache", key = "#root.methodName", cacheManager = "cacheManager5min")
    public List<PersonalityCategory> getPersonalityCategories() {
        return personalityCategoryMapper.selectList(new LambdaQueryWrapper<PersonalityCategory>()
                .orderByAsc(PersonalityCategory::getSort)
                .eq(PersonalityCategory::getDeleted, 0));
    }

    @Override
    public PageResponse<PersonalityRole> getPersonalityRoles(Long categoryId, int pageNum, int pageSize) {
        Page<PersonalityRole> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<PersonalityRole> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(PersonalityRole::getDeleted, 0)
                .orderByAsc(PersonalityRole::getSort);
        if (categoryId != 1) {
            queryWrapper.eq(PersonalityRole::getCategoryId, categoryId);
        }
        Page<PersonalityRole> result = personalityRoleMapper.selectPage(page, queryWrapper);
        return PageResponse.of((int) result.getCurrent(), (int) result.getSize(), result.getTotal(), result.getRecords());
    }

    @Override
    public void copyPersonalityConfig(Integer sourceBotId, Integer targetBotId) {
        PersonalityConfig config = personalityConfigMapper.selectOne(
                new LambdaQueryWrapper<PersonalityConfig>()
                        .eq(PersonalityConfig::getBotId, sourceBotId)
                        .eq(PersonalityConfig::getConfigType, ConfigTypeEnum.DEBUG.getValue())
                        .eq(PersonalityConfig::getEnabled, 1)
                        .eq(PersonalityConfig::getDeleted, 0));
        if (config == null) {
            return;
        }
        insertOrUpdate(new PersonalityConfigDto() {
            {
                setPersonality(config.getPersonality());
                setSceneType(config.getSceneType());
                setSceneInfo(config.getSceneInfo());
            }
        }, targetBotId.longValue(), ConfigTypeEnum.DEBUG);
    }

    public String getChatPrompt(PersonalityConfig personalityConfig, String originalPrompt) {
        if (personalityConfig == null) {
            return originalPrompt;
        }
        return smartFormat(I18nUtil.getMessage("personality.prompt"), personalityConfig.getPersonality(), personalityConfig.getSceneInfo(),
                originalPrompt);
    }

    private String smartFormat(String template, Object... args) {
        String result = template;
        for (Object arg : args) {
            if (result.contains("%s")) {
                if (arg == null) {
                    // If the parameter is null, remove the corresponding "%s" and any preceding commas or spaces
                    result = result.replaceFirst("\\s*,?\\s*%s", "");
                } else {
                    result = result.replaceFirst("%s", arg.toString());
                }
            }
        }
        return result;
    }
}
