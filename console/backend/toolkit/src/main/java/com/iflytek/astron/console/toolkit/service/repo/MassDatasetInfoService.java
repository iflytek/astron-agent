package com.iflytek.astron.console.toolkit.service.repo;

import cn.hutool.core.collection.CollUtil;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.iflytek.astron.console.commons.entity.bot.ChatBotBase;
import com.iflytek.astron.console.commons.entity.bot.DatasetInfo;
import com.iflytek.astron.console.commons.entity.dataset.BotDatasetMaas;
import com.iflytek.astron.console.commons.mapper.bot.ChatBotBaseMapper;
import com.iflytek.astron.console.commons.mapper.dataset.BotDatasetMaasMapper;
import com.iflytek.astron.console.toolkit.entity.dto.RepoDto;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Slf4j
@Service
public class MassDatasetInfoService {

    @Resource
    private BotDatasetMaasMapper botDatasetMaasMapper;

    @Resource
    private RepoService repoService;

    @Resource
    private ChatBotBaseMapper chatBotBaseMapper;

    public List<DatasetInfo> getDatasetMaasByBot(String uid, Integer botId, HttpServletRequest request) {
        List<DatasetInfo> infoList = new ArrayList<>();
        List<BotDatasetMaas> botDatasetList = botDatasetMaasMapper.selectList(Wrappers.lambdaQuery(BotDatasetMaas.class)
                .eq(BotDatasetMaas::getBotId, botId)
                .eq(BotDatasetMaas::getIsAct, 1));
        if (Objects.isNull(botDatasetList) || botDatasetList.isEmpty()) {
            return infoList;
        }

        // Set<Long> infoIdSet = botDatasetList.stream()
        // .map(BotDatasetMaas::getDatasetId)
        // .collect(Collectors.toSet());

        botDatasetList.forEach(e -> {
            RepoDto detail = repoService.getDetail(e.getDatasetId(), "", request);
            DatasetInfo datasetInfo = new DatasetInfo();
            datasetInfo.setId(e.getDatasetId());
            datasetInfo.setType(1);
            datasetInfo.setName(detail.getName());
            infoList.add(datasetInfo);
        });
        return infoList;
    }

    @Transactional(propagation = Propagation.REQUIRED)
    public void botAssociateDataset(String uid, Integer botId, List<Long> datasetList, Integer supportDocument) {
        if (CollUtil.isEmpty(datasetList)) {
            return;
        }
        List<BotDatasetMaas> botDatasetList = new ArrayList<>();
        for (Long datasetInfoId : datasetList) {
            String dataUid = String.valueOf(datasetInfoId);
            BotDatasetMaas botDataset = new BotDatasetMaas();
            botDataset.setUid(uid);
            botDataset.setBotId(Long.valueOf(botId));
            botDataset.setDatasetId(datasetInfoId);
            botDataset.setDatasetIndex(dataUid);
            botDataset.setIsAct(1);
            botDataset.setCreateTime(LocalDateTime.now());
            botDataset.setUpdateTime(LocalDateTime.now());
            botDatasetList.add(botDataset);
        }
        // Batch insert (one by one to ensure compatibility)
        for (BotDatasetMaas item : botDatasetList) {
            botDatasetMaasMapper.insert(item);
        }

        UpdateWrapper<ChatBotBase> wrapper = new UpdateWrapper<>();
        wrapper.eq("id", botId);
        wrapper.set("support_document", supportDocument);
        chatBotBaseMapper.update(null, wrapper);
    }

    /**
     * First invalidate old MAAS dataset associations, then associate new dataset list
     */
    @Transactional(propagation = Propagation.REQUIRED)
    public void updateDatasetByBot(String uid, Integer botId, List<Long> datasetList, Integer supportDocument) {
        // 1) Invalidate old associations
        UpdateWrapper<BotDatasetMaas> wrapper = new UpdateWrapper<>();
        wrapper.eq("bot_id", botId);
        wrapper.set("is_act", 0);
        wrapper.set("update_time", LocalDateTime.now());
        botDatasetMaasMapper.update(null, wrapper);

        // 2) Re-establish associations
        botAssociateDataset(uid, botId, datasetList, supportDocument);
    }
}
