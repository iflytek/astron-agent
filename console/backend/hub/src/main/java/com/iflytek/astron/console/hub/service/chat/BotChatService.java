package com.iflytek.astron.console.hub.service.chat;

import com.iflytek.astron.console.commons.entity.bot.ChatBotBase;
import com.iflytek.astron.console.commons.dto.bot.ChatBotReqDto;
import com.iflytek.astron.console.commons.dto.bot.DebugChatBotReqDto;
import com.iflytek.astron.console.commons.dto.chat.ChatListCreateResponse;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

public interface BotChatService {

    void chatMessageBot(ChatBotReqDto chatBotReqDto, SseEmitter sseEmitter, String sseId, String workflowOperation, String workflowVersion);

    void reAnswerMessageBot(Long requestId, Integer botId, SseEmitter sseEmitter, String sseId);

    void debugChatMessageBot(DebugChatBotReqDto request, SseEmitter sseEmitter, String sseId);

    ChatListCreateResponse clear(Long chatId, String uid, Integer botId, ChatBotBase botBase);

}
