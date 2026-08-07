package com.iflytek.astron.console.hub.service.chat.impl;

import cn.hutool.core.collection.CollectionUtil;
import com.iflytek.astron.console.commons.dto.bot.BotModelDto;
import com.iflytek.astron.console.commons.dto.bot.BotInfoDto;
import com.iflytek.astron.console.commons.dto.chat.ChatListResponseDto;
import com.iflytek.astron.console.commons.entity.chat.ChatTreeIndex;
import com.iflytek.astron.console.commons.enums.bot.DefaultBotModelEnum;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.commons.service.bot.BotService;
import com.iflytek.astron.console.toolkit.entity.vo.LLMInfoVo;
import com.iflytek.astron.console.toolkit.service.model.ModelService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.BeanUtils;
import com.iflytek.astron.console.commons.service.data.ChatDataService;
import com.iflytek.astron.console.commons.service.data.ChatListDataService;
import com.iflytek.astron.console.commons.dto.chat.ChatBotListDto;
import com.iflytek.astron.console.commons.dto.chat.ChatListCreateResponse;
import com.iflytek.astron.console.commons.entity.chat.ChatList;
import com.iflytek.astron.console.commons.entity.chat.ChatReqRecords;
import com.iflytek.astron.console.hub.service.chat.ChatListService;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * @author mingsuiyongheng
 */
@Service
@Slf4j
public class ChatListServiceImpl implements ChatListService {

    @Autowired
    private ChatListDataService chatListDataService;

    @Autowired
    private ChatDataService chatDataService;

    @Autowired
    private BotService botService;

    @Autowired
    private ModelService modelService;

    /**
     * Create chat list for restart process
     *
     * @param uid User ID
     * @param chatListName Chat list name
     * @param botId Bot ID
     * @param chatId Chat ID
     * @return Returns chat list creation response object
     */
    @Override
    public ChatListCreateResponse createChatListForRestart(String uid, String chatListName, Integer botId, long chatId) {
        ChatList latestOne = chatListDataService.findByUidAndChatId(uid, chatId);
        // Query bot list if botId is not null, otherwise query regular list
        if (latestOne != null && latestOne.getId() != null && latestOne.getEnable() == 1
                && StringUtils.isBlank(latestOne.getEnabledPluginIds())
                && StringUtils.isBlank(latestOne.getFileId())) {
            // Condition met, try to use user's existing chat list
            List<ChatReqRecords> listReqs = chatDataService.findRequestsByChatIdAndUid(chatId, uid);

            if (CollectionUtil.isEmpty(listReqs)) {
                // User's latest chat list is empty and can be used directly
                return new ChatListCreateResponse(
                        latestOne.getId(), latestOne.getTitle(), latestOne.getEnable(),
                        latestOne.getCreateTime(), true, latestOne.getFileId(), botId, null, null);
            }
            // Otherwise continue to create a new chat list
        }

        if (Objects.isNull(chatListName) || StringUtils.isBlank(chatListName)) {
            chatListName = "New Chat Window";
        }
        chatListName = chatListName.substring(0, Math.min(chatListName.length(), 16));
        // Create new chat list
        ChatList entity = new ChatList();
        entity.setTitle(chatListName);
        entity.setUid(uid);

        // If latestOne is not null, copy its properties; otherwise use default values
        if (latestOne != null) {
            entity.setBotId(latestOne.getBotId());
            entity.setSticky(latestOne.getSticky());
            entity.setFileId(latestOne.getFileId());
            entity.setEnabledPluginIds(latestOne.getEnabledPluginIds());
            entity.setIsBotweb(latestOne.getIsBotweb());
        } else {
            // Use default values
            entity.setBotId(botId);
            entity.setSticky(0);
            entity.setFileId(null);
            entity.setEnabledPluginIds(null);
            entity.setIsBotweb(0);
        }

        LocalDateTime now = LocalDateTime.now();
        entity.setCreateTime(now);
        entity.setUpdateTime(now);
        entity.setRootFlag(0);

        chatListDataService.createChat(entity);
        return new ChatListCreateResponse(
                entity.getId(), entity.getTitle(), entity.getEnable(),
                entity.getCreateTime(), false, null, botId, null, null);
    }

    /**
     * Get all chats in descending order of the most recent conversation time (can exclude certain types
     * of conversations)
     */
    @Override
    public List<ChatListResponseDto> allChatList(String uid, String type) {
        List<ChatBotListDto> botChatList = getBotChatList(uid);
        List<ChatListResponseDto> chatList = new ArrayList<>();
        if (botChatList.isEmpty()) {
            return chatList;
        }

        // Convert to response DTO
        for (ChatBotListDto botListDto : botChatList) {
            ChatListResponseDto responseDto = new ChatListResponseDto();
            BeanUtils.copyProperties(botListDto, responseDto);
            responseDto.setBotName(botListDto.getBotTitle());
            chatList.add(responseDto);
        }

        // Sort: first by sticky value, then by update time
        chatList.sort((o1, o2) -> {
            LocalDateTime fistUpdateTime = o1.getUpdateTime();
            LocalDateTime secondUpdateTime = o2.getUpdateTime();
            Integer fistSticky = o1.getSticky();
            Integer secondSticky = o2.getSticky();

            // Compare first object and second object, first compare sticky value, then compare modification
            // time if equal
            if (Objects.equals(fistSticky, secondSticky)) {
                return secondUpdateTime.compareTo(fistUpdateTime);
            } else {
                return secondSticky.compareTo(fistSticky);
            }
        });

        return chatList;
    }

    /**
     * Get user's bot chat list based on uid, with a maximum length specified by CHAT_LIST_LENGTH_LIMIT
     */
    @Override
    public List<ChatBotListDto> getBotChatList(String uid) {
        return chatListDataService.getBotChatList(uid);
    }

    /**
     * Create chat list
     */
    @Override
    @Transactional(rollbackFor = Exception.class, propagation = Propagation.REQUIRED)
    public ChatListCreateResponse createChatList(String uid, String chatListName, Integer botId) {
        ChatList latestOne;
        // Query bot list if botId is not null, otherwise query regular list
        latestOne = chatListDataService.findLatestEnabledChatByUserAndBot(uid, botId);
        // Query the user's latest window record for this botId, the window may have been deleted and needs
        // to be re-enabled later.
        if (latestOne != null) {
            // Check if it's deleted, if deleted, change is_delete=1 status to re-enable, because the is_delete
            // condition will also be added during update, causing mybatis-plus methods to not take effect and
            // requiring manual SQL
            // Check enable = 1, only non-banned conversations can be restarted, sensitive conversations need to
            // create a new one when recreated, cannot use previously user-deleted ones to restart
            if (latestOne.getIsDelete() != null && latestOne.getIsDelete() == 1 && latestOne.getEnable() == 1) {
                List<ChatTreeIndex> indexList = chatListDataService.getListByRootChatId(latestOne.getId(), uid);
                List<Long> chatIdList = indexList.stream().map(ChatTreeIndex::getChildChatId).collect(Collectors.toList());
                if (chatIdList.isEmpty()) {
                    chatListDataService.reactivateChat(latestOne.getId());
                } else {
                    chatListDataService.reactivateChatBatch(chatIdList);
                }
                return new ChatListCreateResponse(
                        latestOne.getId(), latestOne.getTitle(), latestOne.getEnable(),
                        latestOne.getCreateTime(), true, latestOne.getFileId(), botId, null, null);
            } else if (latestOne.getIsDelete() != null && latestOne.getIsDelete() == 0 && latestOne.getEnable() == 1) {
                return new ChatListCreateResponse(latestOne.getId(), latestOne.getTitle(), latestOne.getEnable(),
                        latestOne.getCreateTime(), true, latestOne.getFileId(), botId, null, null);
            }
        }
        // Old chat list is in normal enabled state
        if (latestOne != null && latestOne.getId() != null && latestOne.getEnable() == 1
        // Old chat list has no enabled plugins
                && StringUtils.isBlank(latestOne.getEnabledPluginIds())
                // Old chat list has no ChatFile enabled
                && StringUtils.isBlank(latestOne.getFileId())) {
            // Condition met, try to use user's existing chat list
            List<ChatReqRecords> listReqs = chatDataService.findRequestsByChatIdAndUid(latestOne.getId(), uid);

            if (CollectionUtil.isEmpty(listReqs)) {
                // User's latest chat list is empty and can be used directly
                return new ChatListCreateResponse(
                        latestOne.getId(), latestOne.getTitle(), latestOne.getEnable(),
                        latestOne.getCreateTime(), true, latestOne.getFileId(), botId, null, null);
            }
            // Otherwise continue to create a new chat list
        }

        if (Objects.isNull(chatListName) || StringUtils.isBlank(chatListName)) {
            chatListName = "New Chat Window";
        }
        // Create new chat list
        ChatList entity = new ChatList();
        chatListName = chatListName.substring(0, Math.min(chatListName.length(), 16));
        entity.setBotId(botId);
        entity.setTitle(chatListName);
        entity.setUid(uid);
        entity.setBotId(botId);
        LocalDateTime now = LocalDateTime.now();
        entity.setCreateTime(now);
        entity.setUpdateTime(now);
        chatListDataService.createChat(entity);

        // Add root node
        chatListDataService.addRootTree(entity.getId(), uid);

        return new ChatListCreateResponse(
                entity.getId(), entity.getTitle(), entity.getEnable(),
                entity.getCreateTime(), false, null, botId, null, null);
    }

    /**
     * Logically delete user chat list
     */
    @Override
    public boolean logicDeleteChatList(Long chatListId, String uid) {
        return logicDeleteSingleChatList(chatListId, uid);
    }

    /**
     * Get chat information data based on botId
     */
    @Override
    public BotInfoDto getBotInfo(HttpServletRequest request, String uid, Integer botId, String workflowVersion) {
        // 1. Get chatId from chat_list table
        ChatList chatList = chatListDataService.getBotChat(uid, Long.valueOf(botId));
        if (chatList == null) {
            return null;
        }
        // 2. Get bot information based on chatId
        BotInfoDto botInfoDto = botService.getBotInfo(request, botId, chatList.getId(), workflowVersion);

        // Return model information, if modelId is empty, it indicates default model
        if (botInfoDto != null) {
            BotModelDto modelDto = getBotModelDto(request, botInfoDto.getModelId(), botInfoDto.getModel());
            botInfoDto.setBotModelDto(modelDto);
        }
        return botInfoDto;
    }

    /**
     * Get bot model data transfer object
     *
     * @param request HTTP request object
     * @param modelId Model ID, may be null
     * @param model Model name, used when modelId is null
     * @return Returns bot model data transfer object
     */
    @Override
    public BotModelDto getBotModelDto(HttpServletRequest request, Long modelId, String model) {
        BotModelDto modelDto = new BotModelDto();
        if (modelId == null && model != null) {
            DefaultBotModelEnum modelEnum = DefaultBotModelEnum.getByDomain(model);
            if (modelEnum != null) {
                modelDto.setModelDomain(modelEnum.getDomain());
                modelDto.setModelIcon(modelEnum.getIcon());
                modelDto.setModelName(modelEnum.getName());
                modelDto.setIsCustom(false);
            }
        } else {
            // Return custom model
            ApiResult<LLMInfoVo> llmInfoVoObject = modelService.getDetail(0, modelId, request);
            if (llmInfoVoObject != null) {
                LLMInfoVo llmInfoVo = llmInfoVoObject.data();
                if (llmInfoVo != null) {
                    modelDto.setModelDomain(llmInfoVo.getDomain());
                    modelDto.setModelIcon(llmInfoVo.getIcon());
                    modelDto.setModelName(llmInfoVo.getName());
                    modelDto.setModelId(llmInfoVo.getId());
                    modelDto.setIsCustom(true);
                }
            }
        }
        return modelDto;
    }

    /**
     * Clear history button to recreate conversation
     */
    @Override
    public ChatListCreateResponse createRestartChat(String uid, String chatListName, Integer botId) {
        if (Objects.isNull(chatListName) || StringUtils.isBlank(chatListName)) {
            chatListName = "New Chat Window";
        }
        // Create new chat list
        ChatList entity = new ChatList();
        chatListName = chatListName.substring(0, Math.min(chatListName.length(), 16));
        entity.setBotId(botId);
        entity.setTitle(chatListName);
        entity.setUid(uid);
        entity.setBotId(botId);
        LocalDateTime now = LocalDateTime.now();
        entity.setCreateTime(now);
        entity.setUpdateTime(now);
        chatListDataService.createChat(entity);

        // Add root node
        chatListDataService.addRootTree(entity.getId(), uid);

        return new ChatListCreateResponse(
                entity.getId(), entity.getTitle(), entity.getEnable(),
                entity.getCreateTime(), false, null, botId, null, null);
    }

    /**
     * Logically delete single chat list
     *
     * @param chatListId Chat list ID
     * @param uid User ID
     * @return Returns true if deletion is successful, otherwise returns false
     */
    private boolean logicDeleteSingleChatList(Long chatListId, String uid) {
        log.info("***** uid: {} delete single chat window chatId: {}", uid, chatListId);
        ChatList queryEntity = chatListDataService.findByUidAndChatId(uid, chatListId);
        if (queryEntity == null || queryEntity.getId() == null) {
            return false;
        }
        int botId = queryEntity.getBotId();
        chatListDataService.deactivateChatBotList(uid, botId);

        List<Long> chatIds = chatListDataService.getAllListByChildChatId(chatListId, uid).stream().map(ChatTreeIndex::getChildChatId).collect(Collectors.toList());
        if (chatIds.isEmpty()) {
            return chatListDataService.deleteById(chatListId) > 0;
        }
        return chatListDataService.deleteBatchIds(chatIds) > 0;
    }
}
