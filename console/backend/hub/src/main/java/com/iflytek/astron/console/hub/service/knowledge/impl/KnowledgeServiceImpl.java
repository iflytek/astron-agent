package com.iflytek.astron.console.hub.service.knowledge.impl;

import com.iflytek.astron.console.commons.entity.dataset.BotDatasetMaas;
import com.iflytek.astron.console.commons.service.data.ChatListDataService;
import com.iflytek.astron.console.commons.service.data.DatasetDataService;
import com.iflytek.astron.console.hub.service.knowledge.KnowledgeService;
import com.iflytek.astron.console.toolkit.entity.core.knowledge.ChunkInfo;
import com.iflytek.astron.console.toolkit.service.repo.RepoService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * @author mingsuiyongheng
 */
@Service
@Slf4j
public class KnowledgeServiceImpl implements KnowledgeService {

    @Autowired
    private DatasetDataService datasetDataService;

    @Autowired
    private RepoService repoService;

    @Autowired
    private ChatListDataService chatListDataService;

    /**
     * Get knowledge chunks by botId
     *
     * @param botId Bot ID
     * @param ask Question statement
     * @param topN Number of knowledge chunks to return
     * @return List of strings containing knowledge chunks
     */
    @Override
    public List<String> getChuncksByBotId(Integer botId, String ask, Integer topN) {
        List<String> knowledgeContent = new ArrayList<>();
        List<BotDatasetMaas> datasetList = datasetDataService.findMaasDatasetsByBotIdAndIsAct(botId, 1);
        if (Objects.isNull(datasetList) || datasetList.isEmpty()) {
            log.error("-----Knowledge base error or no associated datasets, botId: {}", botId);
            return knowledgeContent;
        }
        List<String> dataUidList = datasetList.stream().map(BotDatasetMaas::getDatasetIndex).collect(Collectors.toList());
        return getChuncks(dataUidList, ask, topN, false);
    }

    /**
     * Override method: Get text chunks from MAAS datasets
     *
     * @param maasDatasetList MAAS dataset list
     * @param text Text to be processed
     * @param topN Number of most relevant text chunks to return
     * @param isBelongLoginUser Indicates whether the user belongs to the logged-in user
     * @return List of relevant text chunks
     */
    @Override
    public List<String> getChuncks(List<String> maasDatasetList, String text, Integer topN, boolean isBelongLoginUser) {
        List<String> relationChunk = new ArrayList<>();
        if (Objects.isNull(maasDatasetList) || maasDatasetList.isEmpty()) {
            return relationChunk;
        }
        for (String repoId : maasDatasetList) {
            List<ChunkInfo> results = (List<ChunkInfo>) repoService.hitTest(Long.parseLong(repoId), text, topN, isBelongLoginUser);
            results.forEach(item -> {
                relationChunk.add(item.getContent());
            });
        }
        return relationChunk;
    }
}
