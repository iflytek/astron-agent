package com.iflytek.astron.console.hub.service.workflow;

import com.iflytek.astron.console.commons.dto.bot.TalkAgentConfigDto;
import jakarta.servlet.http.HttpServletRequest;

/**
 * @author minguiyongheng
 */
public interface BotChainService {

    /**
     * Copy assistant 2.0
     */
    void copyBot(String uid, Long sourceId, Long targetId, Long spaceId);

    /**
     * Copy workflow
     *
     * @param uid uid
     * @param spaceId
     * @param version
     * @param talkAgentConfig
     */
    Long cloneWorkFlow(String uid, Long sourceId, Long targetId, HttpServletRequest request, Long spaceId, Integer version, TalkAgentConfigDto talkAgentConfig);
}
