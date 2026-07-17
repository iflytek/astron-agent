package com.iflytek.astron.console.hub.service.bot.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.iflytek.astron.console.hub.entity.CustomSpeaker;
import com.iflytek.astron.console.hub.enums.TtsTypeEnum;
import com.iflytek.astron.console.hub.mapper.CustomSpeakerMapper;
import com.iflytek.astron.console.hub.service.bot.CustomSpeakerService;
import com.iflytek.astron.console.toolkit.entity.platform.PlatformAccountConfigDto;
import com.iflytek.astron.console.toolkit.service.platform.PlatformAccountService;
import com.iflytek.astron.console.toolkit.tool.http.HttpAuthTool;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;


@Service
public class CustomSpeakerServiceImpl extends ServiceImpl<CustomSpeakerMapper, CustomSpeaker> implements CustomSpeakerService {

    private static final String CLONE_API_URL = "wss://cn-huabei-1.xf-yun.com/v1/private/voice_clone";

    @Resource
    private PlatformAccountService platformAccountService;

    @Override
    public List<CustomSpeaker> getTrainSpeaker(Long spaceId, String uid) {
        LambdaQueryWrapper<CustomSpeaker> queryWrapper = Wrappers.lambdaQuery(CustomSpeaker.class)
                .eq(CustomSpeaker::getDeleted, 0)
                .select(CustomSpeaker::getId, CustomSpeaker::getName, CustomSpeaker::getAssetId);
        if (spaceId == null) {
            queryWrapper.eq(CustomSpeaker::getCreateUid, uid);
            queryWrapper.isNull(CustomSpeaker::getSpaceId);
        } else {
            queryWrapper.eq(CustomSpeaker::getSpaceId, spaceId);
        }
        return baseMapper.selectList(queryWrapper);
    }

    @Override
    public void updateTrainSpeaker(Long id, String name, Long spaceId, String uid) {
        LambdaUpdateWrapper<CustomSpeaker> updateWrapper = Wrappers.lambdaUpdate(CustomSpeaker.class)
                .set(CustomSpeaker::getName, name)
                .eq(CustomSpeaker::getId, id)
                .eq(CustomSpeaker::getDeleted, 0);
        if (spaceId == null) {
            updateWrapper.eq(CustomSpeaker::getCreateUid, uid);
            updateWrapper.isNull(CustomSpeaker::getSpaceId);
        } else {
            updateWrapper.eq(CustomSpeaker::getSpaceId, spaceId);
        }
        baseMapper.update(null, updateWrapper);
    }

    @Override
    public void deleteTrainSpeaker(Long id, Long spaceId, String uid) {
        LambdaUpdateWrapper<CustomSpeaker> updateWrapper = Wrappers.lambdaUpdate(CustomSpeaker.class)
                .set(CustomSpeaker::getDeleted, 1)
                .eq(CustomSpeaker::getId, id)
                .eq(CustomSpeaker::getDeleted, 0);
        if (spaceId == null) {
            updateWrapper.eq(CustomSpeaker::getCreateUid, uid);
            updateWrapper.isNull(CustomSpeaker::getSpaceId);
        } else {
            updateWrapper.eq(CustomSpeaker::getSpaceId, spaceId);
        }
        baseMapper.update(null, updateWrapper);
    }

    @Override
    public boolean existsByAssetId(String assetId) {
        if (assetId == null || assetId.trim().isEmpty()) {
            return false;
        }
        LambdaQueryWrapper<CustomSpeaker> queryWrapper = Wrappers.lambdaQuery(CustomSpeaker.class)
                .eq(CustomSpeaker::getAssetId, assetId);
        return baseMapper.selectCount(queryWrapper) > 0;
    }

    @Override
    public Map<String, String> getCloneSign() {
        PlatformAccountConfigDto.IflytekOpenPlatformConfig config =
                platformAccountService.requireIflytekOpenPlatform();
        Map<String, String> resultMap = new HashMap<>();
        String url = HttpAuthTool.assembleRequestUrl(
                CLONE_API_URL, config.getPlatformApiKey(), config.getPlatformApiSecret());
        resultMap.put("appId", config.getPlatformAppId());
        resultMap.put("url", url);
        resultMap.put("type", TtsTypeEnum.CLONE.name());
        return resultMap;
    }
}
