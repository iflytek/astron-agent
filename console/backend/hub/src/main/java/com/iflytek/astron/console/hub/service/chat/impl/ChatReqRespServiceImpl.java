package com.iflytek.astron.console.hub.service.chat.impl;

import com.iflytek.astron.console.commons.service.data.ChatDataService;
import com.iflytek.astron.console.hub.service.chat.ChatReqRespService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * @author mingsuiyongheng
 */
@Service
@Slf4j
public class ChatReqRespServiceImpl implements ChatReqRespService {

    @Autowired
    private ChatDataService chatDataService;

    /**
     * Update bot chat context
     *
     * @param chatId Chat ID
     * @param uid User ID
     * @param botId Bot ID
     */
    @Override
    public void updateBotChatContext(Long chatId, String uid, Integer botId) {
        chatDataService.updateNewContextByUidAndChatId(uid, chatId);
    }
}
