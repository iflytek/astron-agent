package com.iflytek.astron.console.hub.service.knowledge;

import java.util.List;

/**
 * @author yingpeng Knowledge base related functions
 */
public interface KnowledgeService {

    List<String> getChuncksByBotId(Integer botId, String ask, Integer topN);

    List<String> getChuncks(List<String> maasDatasetList, String text, Integer topN, boolean isBelongLoginUser);
}
