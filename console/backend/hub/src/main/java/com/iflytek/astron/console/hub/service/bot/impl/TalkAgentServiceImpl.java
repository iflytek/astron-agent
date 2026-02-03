package com.iflytek.astron.console.hub.service.bot.impl;

import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.dto.bot.BotInfoDto;
import com.iflytek.astron.console.commons.dto.bot.TalkAgentHistoryDto;
import com.iflytek.astron.console.commons.dto.bot.TalkAgentUpgradeDto;
import com.iflytek.astron.console.commons.entity.bot.ChatBotBase;
import com.iflytek.astron.console.commons.entity.chat.ChatList;
import com.iflytek.astron.console.commons.entity.chat.ChatReqRecords;
import com.iflytek.astron.console.commons.entity.chat.ChatRespRecords;
import com.iflytek.astron.console.commons.entity.chat.ChatTreeIndex;
import com.iflytek.astron.console.commons.enums.bot.BotVersionEnum;
import com.iflytek.astron.console.commons.service.bot.BotService;
import com.iflytek.astron.console.commons.service.data.ChatDataService;
import com.iflytek.astron.console.commons.service.data.ChatListDataService;
import com.iflytek.astron.console.commons.util.AuthStringUtil;
import com.iflytek.astron.console.commons.util.MaasUtil;
import com.iflytek.astron.console.hub.service.bot.TalkAgentService;
import com.iflytek.astron.console.hub.service.workflow.BotChainService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RedissonClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Service
@Slf4j
public class TalkAgentServiceImpl implements TalkAgentService {
    @Value("${spark.virtual-man-apiKey}")
    private String apiKey;
    @Value("${spark.virtual-man-apiSecret}")
    private String apiSecret;

    @Autowired
    private ChatListDataService chatListDataService;

    @Autowired
    private ChatDataService chatDataService;

    @Autowired
    private BotService botService;

    @Autowired
    private BotChainService botChainService;

    @Autowired
    private RedissonClient redissonClient;
    private static final String SIGNATURE_URL = "wss://avatar.cn-huadong-1.xf-yun.com/v1/interact";

    @Override
    public String getSignature() {
        return AuthStringUtil.assembleRequestUrl(SIGNATURE_URL, "GET", apiKey, apiSecret);
    }

    @Override
    public ResponseEnum saveHistory(String uid, TalkAgentHistoryDto talkAgentHistoryDto) {
        Long chatId = talkAgentHistoryDto.getChatId();
        Integer clientType = talkAgentHistoryDto.getClientType();
        String req = talkAgentHistoryDto.getReq();
        String resp = talkAgentHistoryDto.getResp();
        String sid = talkAgentHistoryDto.getSid();

        if (chatId == null) {
            return ResponseEnum.CHAT_REQ_ERROR;
        }
        // get latest chatId
        List<ChatTreeIndex> chatTreeIndexList = chatListDataService.findChatTreeIndexByChatIdOrderById(chatId);
        if (chatTreeIndexList.isEmpty()) {
            log.warn("chatTreeList is empty, chatId:{}, sid:{}", chatId, sid);
            return ResponseEnum.CHAT_REQ_ERROR;
        }
        Long lastChatId = chatTreeIndexList.getFirst().getChildChatId();
        // check chatId available
        ChatList chatList = chatListDataService.findByUidAndChatId(uid, lastChatId);
        if (chatList == null) {
            log.warn("Chat window is unavailable or illegal access,uid: {}, chatId: {}", uid, chatId);
            return ResponseEnum.CHAT_REQ_NOT_BELONG_ERROR;
        }
        // record request
        chatId = lastChatId;
        ChatReqRecords chatReqRecords = new ChatReqRecords();
        chatReqRecords.setChatId(chatId);
        chatReqRecords.setUid(uid);
        chatReqRecords.setMessage(req);
        chatReqRecords.setClientType(clientType);
        chatReqRecords.setCreateTime(LocalDateTime.now());
        chatReqRecords.setUpdateTime(LocalDateTime.now());
        chatReqRecords.setNewContext(1);
        chatReqRecords = chatDataService.createRequest(chatReqRecords);
        Long reqId = chatReqRecords.getId();
        // record response
        ChatRespRecords chatRespRecords = new ChatRespRecords();
        chatRespRecords.setChatId(chatId);
        chatRespRecords.setUid(uid);
        chatRespRecords.setMessage(resp);
        chatRespRecords.setCreateTime(LocalDateTime.now());
        chatRespRecords.setUpdateTime(LocalDateTime.now());
        chatRespRecords.setSid(sid);
        chatDataService.createResponse(chatRespRecords);

        return ResponseEnum.SUCCESS;


    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public BotInfoDto upgradeWorkflow(Integer sourceId, String uid, Long spaceId, HttpServletRequest request, TalkAgentUpgradeDto talkAgentUpgradeDto) {
        ChatBotBase base = botService.upgradeCopyBot(uid, sourceId, spaceId, BotVersionEnum.TALK.getVersion());
        log.info("upgrade bot : new bot : {}", base);
        Long targetId = Long.valueOf(base.getId());
        // Create an event to be consumed at /maasCopySynchronize
        redissonClient.getBucket(MaasUtil.generatePrefix(uid, sourceId)).set(String.valueOf(sourceId));
        redissonClient.getBucket(MaasUtil.generatePrefix(uid, sourceId)).expire(Duration.ofSeconds(60));
        // Synchronize Xingchen MAAS
        Long maasId = botChainService.cloneWorkFlow(uid, Long.valueOf(sourceId), targetId, request, spaceId,
                BotVersionEnum.TALK.getVersion(), talkAgentUpgradeDto.getTalkAgentConfig());
        BotInfoDto botInfoDto = new BotInfoDto();
        botInfoDto.setBotId(Math.toIntExact(targetId));
        botInfoDto.setMaasId(maasId);
        return botInfoDto;
    }
}
