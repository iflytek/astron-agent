package com.iflytek.astron.console.commons.service.bot.impl;

import cn.hutool.core.collection.CollUtil;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.iflytek.astron.console.commons.entity.bot.BotDataset;
import com.iflytek.astron.console.commons.entity.bot.ChatBotBase;
import com.iflytek.astron.console.commons.entity.bot.DatasetInfo;
import com.iflytek.astron.console.commons.mapper.bot.BotDatasetMapper;
import com.iflytek.astron.console.commons.mapper.bot.ChatBotBaseMapper;
import com.iflytek.astron.console.commons.mapper.bot.DatasetInfoMapper;
import com.iflytek.astron.console.commons.service.bot.BotDatasetService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * @author yun-zhi-ztl
 */
@Service
@Slf4j
public class BotDatasetServiceImpl implements BotDatasetService {

    @Resource
    private BotDatasetMapper botDatasetMapper;

    @Resource
    private ChatBotBaseMapper chatBotBaseMapper;

    @Resource
    private DatasetInfoMapper datasetInfoMapper;


    @Override
    public void deleteByBotId(Integer botId) {
        botDatasetMapper.update(null, Wrappers.lambdaUpdate(BotDataset.class)
                .eq(BotDataset::getBotId, botId)
                .set(BotDataset::getIsAct, 0)
                .set(BotDataset::getUpdateTime, LocalDateTime.now()));
    }

    @Override
    public boolean checkDatasetBelong(String uid, Long spaceId, List<Long> datasetList) {
        boolean selfDocumentExist = CollUtil.isNotEmpty(datasetList);

        // Personal space dataset validation
        if (spaceId == null) {
            // Personal bots can only use personal datasets
            if (selfDocumentExist) {
                // Validate dataset ownership and status
                List<DatasetInfo> ownedDatasets = datasetInfoMapper.selectList(
                        Wrappers.lambdaQuery(DatasetInfo.class)
                                .in(DatasetInfo::getId, datasetList)
                                .eq(DatasetInfo::getStatus, 2) // Processed status
                                .eq(DatasetInfo::getUid, uid) // Owner user
                );

                if (ownedDatasets.size() != datasetList.size()) {
                    log.error("Dataset ownership validation failed for user: {}, owned: {}, requested: {}",
                            uid, ownedDatasets.size(), datasetList.size());
                    return false;
                }
            }
        } else {
            // Space bots currently do not support personal datasets
            if (selfDocumentExist) {
                log.error("Space bot cannot use personal datasets, uid: {}, spaceId: {}", uid, spaceId);
                return false;
            }
        }

        return true;
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRED)
    public void botAssociateDataset(String uid, Integer botId, List<Long> datasetList, Integer supportDocument) {
        if (CollUtil.isEmpty(datasetList)) {
            return;
        }

        List<BotDataset> botDatasetList = new ArrayList<>();
        for (Long datasetInfoId : datasetList) {
            String dataUid = uid + "_" + datasetInfoId;
            BotDataset botDataset = new BotDataset();
            botDataset.setUid(uid);
            botDataset.setBotId(Long.valueOf(botId));
            botDataset.setDatasetId(datasetInfoId);
            botDataset.setDatasetIndex(dataUid);
            botDataset.setIsAct(1);
            botDataset.setCreateTime(LocalDateTime.now());
            botDataset.setUpdateTime(LocalDateTime.now());
            botDatasetList.add(botDataset);
        }

        // Insert one by one to ensure compatibility
        for (BotDataset item : botDatasetList) {
            botDatasetMapper.insert(item);
        }

        // Synchronously update Bot's document support flag
        UpdateWrapper<ChatBotBase> wrapper = new UpdateWrapper<>();
        wrapper.eq("id", botId);
        wrapper.set("support_document", supportDocument);
        chatBotBaseMapper.update(null, wrapper);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRED)
    public void updateDatasetByBot(String uid, Integer botId, List<Long> datasetList, Integer supportDocument) {
        // 1) First invalidate existing associations
        UpdateWrapper<BotDataset> updateWrapper = new UpdateWrapper<>();
        updateWrapper.eq("bot_id", botId);
        updateWrapper.set("is_act", 0);
        updateWrapper.set("update_time", LocalDateTime.now());
        botDatasetMapper.update(null, updateWrapper);

        // 2) Re-establish associations
        botAssociateDataset(uid, botId, datasetList, supportDocument);
    }
}
