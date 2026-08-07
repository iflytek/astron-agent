package com.iflytek.astron.console.hub.service.bot.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.iflytek.astron.console.commons.util.I18nUtil;
import com.iflytek.astron.console.hub.entity.PronunciationPersonConfig;
import com.iflytek.astron.console.hub.enums.TtsTypeEnum;
import com.iflytek.astron.console.hub.mapper.PronunciationPersonConfigMapper;
import com.iflytek.astron.console.hub.service.bot.VoiceService;
import com.iflytek.astron.console.toolkit.entity.platform.PlatformAccountConfigDto;
import com.iflytek.astron.console.toolkit.service.platform.PlatformAccountService;
import com.iflytek.astron.console.toolkit.tool.http.HttpAuthTool;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * @author bowang
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class VoiceServiceImpl implements VoiceService {

    private static final String TTS_API_URL = "wss://cbm01.cn-huabei-1.xf-yun.com/v1/private/mcd9m97e6";

    private final PronunciationPersonConfigMapper pronunciationPersonConfigMapper;
    private final PlatformAccountService platformAccountService;

    @Override
    public Map<String, String> getTtsSign() {
        PlatformAccountConfigDto.IflytekOpenPlatformConfig config =
                platformAccountService.requireIflytekOpenPlatform();
        Map<String, String> resultMap = new HashMap<>();
        String url = HttpAuthTool.assembleRequestUrl(
                TTS_API_URL, config.getPlatformApiKey(), config.getPlatformApiSecret());
        resultMap.put("appId", config.getPlatformAppId());
        resultMap.put("url", url);
        resultMap.put("type", TtsTypeEnum.ORIGINAL.name());
        return resultMap;
    }

    @Override
    @Cacheable(value = "pronunciationPersonCache", key = "#root.methodName", cacheManager = "cacheManager5min")
    public List<PronunciationPersonConfig> getPronunciationPerson() {
        LambdaQueryWrapper<PronunciationPersonConfig> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(PronunciationPersonConfig::getSpeakerType, PronunciationPersonConfig.SpeakerTypeEnum.NORMAL);
        queryWrapper.eq(PronunciationPersonConfig::getDeleted, 0);
        queryWrapper.orderByAsc(PronunciationPersonConfig::getSort);
        List<PronunciationPersonConfig> configList = pronunciationPersonConfigMapper.selectList(queryWrapper);
        // Convert name field from key to internationalized value
        for (PronunciationPersonConfig config : configList) {
            if (config.getName() != null) {
                config.setName(I18nUtil.getMessage(config.getName()));
            }
        }
        return configList;
    }
}
