package com.iflytek.astron.console.commons.service.bot;

import java.util.List;

/**
 * @author yun-zhi-ztl
 */
public interface BotDatasetService {
    void deleteByBotId(Integer botId);

    void botAssociateDataset(String uid, Integer botId, List<Long> datasetList, Integer supportDocument);

    void updateDatasetByBot(String uid, Integer botId, List<Long> datasetList, Integer supportDocument);

    boolean checkDatasetBelong(String uid, Long spaceId, List<Long> datasetList);
}
