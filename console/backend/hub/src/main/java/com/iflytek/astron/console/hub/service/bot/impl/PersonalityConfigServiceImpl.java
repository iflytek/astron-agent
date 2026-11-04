package com.iflytek.astron.console.hub.service.bot.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.iflytek.astron.console.commons.dto.bot.PersonalityConfigDto;
import com.iflytek.astron.console.hub.entity.personality.PersonalityConfig;
import com.iflytek.astron.console.hub.enums.ConfigTypeEnum;
import com.iflytek.astron.console.hub.mapper.personality.PersonalityConfigMapper;
import com.iflytek.astron.console.hub.service.bot.PersonalityConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/** Configuration copying only; prompt Agent editing and execution belong to Python Console. */
@Service
@RequiredArgsConstructor
public class PersonalityConfigServiceImpl implements PersonalityConfigService {

    private final PersonalityConfigMapper personalityConfigMapper;

    private void insertOrUpdate(PersonalityConfigDto personalityConfigDto, Long botId, ConfigTypeEnum configType) {
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
}
