package com.iflytek.astron.console.hub.service.chat;

import com.iflytek.astron.console.commons.dto.chat.ChatReqModelDto;
import com.iflytek.astron.console.commons.dto.chat.ChatRespModelDto;

import java.util.List;

public interface ChatHistoryMultiModalService {

    /**
     * Merge document history records
     *
     * @param reqList
     * @param respList
     * @param botId
     * @return
     */
    List<Object> mergeChatHistory(List<ChatReqModelDto> reqList, List<ChatRespModelDto> respList, Integer botId);
}
