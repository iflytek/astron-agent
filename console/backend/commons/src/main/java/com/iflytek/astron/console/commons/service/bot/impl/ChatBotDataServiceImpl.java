package com.iflytek.astron.console.commons.service.bot.impl;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.collection.CollectionUtil;
import cn.hutool.core.util.RandomUtil;
import cn.hutool.core.util.StrUtil;
import com.alibaba.fastjson2.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.iflytek.astron.console.commons.dto.bot.BotDetail;
import com.iflytek.astron.console.commons.dto.bot.ChatBotApi;
import com.iflytek.astron.console.commons.dto.bot.PromptBotDetail;
import com.iflytek.astron.console.commons.dto.vcn.CustomV2VCNDTO;
import com.iflytek.astron.console.commons.entity.bot.*;
import com.iflytek.astron.console.commons.entity.chat.ChatList;
import com.iflytek.astron.console.commons.entity.model.McpData;
import com.iflytek.astron.console.commons.enums.bot.BotStatusEnum;
import com.iflytek.astron.console.commons.enums.bot.ReleaseTypeEnum;
import com.iflytek.astron.console.commons.mapper.bot.*;
import com.iflytek.astron.console.commons.mapper.chat.ChatListMapper;
import com.iflytek.astron.console.commons.mapper.vcn.CustomVCNMapper;
import com.iflytek.astron.console.commons.service.bot.BotFavoriteService;
import com.iflytek.astron.console.commons.service.bot.ChatBotDataService;
import com.iflytek.astron.console.commons.service.data.ChatListDataService;
import com.iflytek.astron.console.commons.service.data.IDatasetInfoService;
import com.iflytek.astron.console.commons.service.mcp.McpDataService;
import com.iflytek.astron.console.commons.util.MaasUtil;
import com.iflytek.astron.console.commons.util.space.SpaceInfoUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
public class ChatBotDataServiceImpl implements ChatBotDataService {

    @Autowired
    private ChatBotBaseMapper chatBotBaseMapper;

    @Autowired
    private ChatBotListMapper chatBotListMapper;

    @Autowired
    private ChatBotMarketMapper chatBotMarketMapper;

    @Autowired
    private BotDatasetMapper botDatasetMapper;

    @Autowired
    private MaasUtil maasUtil;

    @Autowired
    private ChatListMapper chatListMapper;

    @Autowired
    private ChatListDataService chatListDataService;

    @Autowired
    private ChatBotPromptStructMapper promptStructMapper;

    @Autowired
    private BotFavoriteService botFavoriteService;

    @Autowired
    private IDatasetInfoService datasetInfoService;

    @Autowired
    private CustomVCNMapper customVCNMapper;

    @Autowired
    private ChatBotApiMapper botApiMapper;

    @Autowired
    private McpDataService mcpDataService;

    public static final String BOT_INPUT_EXAMPLE_SPLIT = "%%split%%";

    @Override
    public Optional<ChatBotBase> findById(Integer botId) {
        ChatBotBase chatBot = chatBotBaseMapper.selectById(botId);
        return Optional.ofNullable(chatBot);
    }

    @Override
    public Optional<ChatBotBase> findByIdAndSpaceId(Integer botId, Long spaceId) {
        LambdaQueryWrapper<ChatBotBase> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ChatBotBase::getId, botId);
        wrapper.eq(ChatBotBase::getSpaceId, spaceId);
        wrapper.eq(ChatBotBase::getIsDelete, 0);
        ChatBotBase chatBot = chatBotBaseMapper.selectOne(wrapper);
        return Optional.ofNullable(chatBot);
    }

    @Override
    public List<ChatBotBase> findByUid(String uid) {
        LambdaQueryWrapper<ChatBotBase> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ChatBotBase::getUid, uid);
        return chatBotBaseMapper.selectList(wrapper);
    }

    @Override
    public List<ChatBotBase> findByUidAndSpaceId(String uid, Long spaceId) {
        LambdaQueryWrapper<ChatBotBase> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ChatBotBase::getUid, uid);
        wrapper.eq(ChatBotBase::getSpaceId, spaceId);
        wrapper.eq(ChatBotBase::getIsDelete, 0);
        return chatBotBaseMapper.selectList(wrapper);
    }

    @Override
    public List<ChatBotBase> findBySpaceId(Long spaceId) {
        LambdaQueryWrapper<ChatBotBase> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ChatBotBase::getSpaceId, spaceId);
        wrapper.eq(ChatBotBase::getIsDelete, 0);
        return chatBotBaseMapper.selectList(wrapper);
    }

    @Override
    public List<ChatBotBase> findByBotType(Integer botType) {
        LambdaQueryWrapper<ChatBotBase> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ChatBotBase::getBotType, botType);
        wrapper.eq(ChatBotBase::getIsDelete, 0);
        return chatBotBaseMapper.selectList(wrapper);
    }

    @Override
    public List<ChatBotBase> findByBotTypeAndSpaceId(Integer botType, Long spaceId) {
        LambdaQueryWrapper<ChatBotBase> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ChatBotBase::getBotType, botType);
        wrapper.eq(ChatBotBase::getSpaceId, spaceId);
        wrapper.eq(ChatBotBase::getIsDelete, 0);
        return chatBotBaseMapper.selectList(wrapper);
    }

    @Override
    public List<ChatBotBase> findActiveBotsBy(String uid) {
        LambdaQueryWrapper<ChatBotBase> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ChatBotBase::getUid, uid);
        wrapper.eq(ChatBotBase::getIsDelete, 0);
        wrapper.orderByDesc(ChatBotBase::getUpdateTime);
        return chatBotBaseMapper.selectList(wrapper);
    }

    @Override
    public List<ChatBotBase> findActiveBotsBy(String uid, Long spaceId) {
        LambdaQueryWrapper<ChatBotBase> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ChatBotBase::getUid, uid);
        wrapper.eq(ChatBotBase::getSpaceId, spaceId);
        wrapper.eq(ChatBotBase::getIsDelete, 0);
        wrapper.orderByDesc(ChatBotBase::getUpdateTime);
        return chatBotBaseMapper.selectList(wrapper);
    }

    @Override
    public ChatBotBase createBot(ChatBotBase chatBotBase) {
        chatBotBaseMapper.insert(chatBotBase);
        return chatBotBase;
    }

    @Override
    public ChatBotBase updateBot(ChatBotBase chatBotBase) {
        // If modelId is null, need to explicitly set it to null in database
        if (chatBotBase.getModelId() == null) {
            LambdaUpdateWrapper<ChatBotBase> updateWrapper = new LambdaUpdateWrapper<>();
            updateWrapper.eq(ChatBotBase::getId, chatBotBase.getId())
                    .set(ChatBotBase::getModelId, null);

            // Update other fields using updateById (it will skip null fields by default)
            chatBotBaseMapper.update(null, updateWrapper);
        }
        // Then update other non-null fields
        chatBotBaseMapper.updateById(chatBotBase);
        return chatBotBase;
    }

    @Override
    public boolean deleteBot(Integer botId) {
        ChatBotBase chatBot = new ChatBotBase();
        chatBot.setId(botId);
        chatBot.setIsDelete(1);
        return chatBotBaseMapper.updateById(chatBot) > 0;
    }

    @Override
    public boolean deleteBot(Integer botId, String uid) {
        boolean baseDeleted = deleteChatBotBase(botId, uid);
        boolean botListDeleted = deleteChatBotList(botId, uid);
        boolean chatListDeleted = deleteChatList(botId, uid);
        boolean marketDeleted = deleteChatBotMarket(botId, uid);

        if (!botListDeleted) {
            log.info("No active chat_bot_list rows updated during bot deletion, botId={}, uid={}", botId, uid);
        }
        if (!chatListDeleted) {
            log.info("No active chat_list rows updated during bot deletion, botId={}, uid={}", botId, uid);
        }
        if (!marketDeleted) {
            log.info("No chat_bot_market rows updated during bot deletion, botId={}, uid={}", botId, uid);
        }

        return baseDeleted;
    }

    private boolean deleteChatBotBase(Integer botId, String uid) {
        LambdaUpdateWrapper<ChatBotBase> updateWrapper = new LambdaUpdateWrapper<>();
        updateWrapper.eq(ChatBotBase::getId, botId)
                .eq(ChatBotBase::getUid, uid)
                .set(ChatBotBase::getIsDelete, 1);
        return chatBotBaseMapper.update(null, updateWrapper) > 0;
    }

    private boolean deleteChatBotList(Integer botId, String uid) {
        LambdaUpdateWrapper<ChatBotList> updateWrapper = new LambdaUpdateWrapper<>();
        updateWrapper.eq(ChatBotList::getRealBotId, botId)
                .eq(ChatBotList::getUid, uid)
                .set(ChatBotList::getIsAct, 0);
        return chatBotListMapper.update(null, updateWrapper) > 0;
    }

    private boolean deleteChatList(Integer botId, String uid) {
        LambdaUpdateWrapper<ChatList> updateWrapper = new LambdaUpdateWrapper<>();
        updateWrapper.eq(ChatList::getBotId, botId)
                .eq(ChatList::getUid, uid)
                .set(ChatList::getIsDelete, 1);
        return chatListMapper.update(null, updateWrapper) > 0;
    }

    private boolean deleteChatBotMarket(Integer botId, String uid) {
        LambdaUpdateWrapper<ChatBotMarket> updateWrapper = new LambdaUpdateWrapper<>();
        updateWrapper.eq(ChatBotMarket::getBotId, botId)
                .eq(ChatBotMarket::getUid, uid)
                .set(ChatBotMarket::getIsDelete, 1);
        return chatBotMarketMapper.update(null, updateWrapper) > 0;
    }


    @Override
    public boolean deleteBot(Integer botId, Long spaceId) {
        LambdaQueryWrapper<ChatBotBase> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ChatBotBase::getId, botId);
        wrapper.eq(ChatBotBase::getSpaceId, spaceId);

        ChatBotBase chatBot = new ChatBotBase();
        chatBot.setIsDelete(1);
        boolean baseDeleted = chatBotBaseMapper.update(chatBot, wrapper) > 0;
        if (baseDeleted) {
            deactivateChatBotListByBotIds(List.of(botId));
            deleteChatListByBotIds(List.of(botId));
            deleteChatBotMarketByBotIds(List.of(botId));
        }
        return baseDeleted;
    }

    @Override
    public boolean deleteBotsByIds(List<Integer> botIds) {
        if (botIds == null || botIds.isEmpty()) {
            return false;
        }

        ChatBotBase chatBot = new ChatBotBase();
        chatBot.setIsDelete(1);

        LambdaQueryWrapper<ChatBotBase> wrapper = new LambdaQueryWrapper<>();
        wrapper.in(ChatBotBase::getId, botIds);

        boolean baseDeleted = chatBotBaseMapper.update(chatBot, wrapper) > 0;
        if (baseDeleted) {
            deactivateChatBotListByBotIds(botIds);
            deleteChatListByBotIds(botIds);
            deleteChatBotMarketByBotIds(botIds);
        }
        return baseDeleted;
    }

    @Override
    public boolean deleteBotsByIds(List<Integer> botIds, Long spaceId) {
        if (botIds == null || botIds.isEmpty()) {
            return false;
        }

        ChatBotBase chatBot = new ChatBotBase();
        chatBot.setIsDelete(1);

        LambdaQueryWrapper<ChatBotBase> wrapper = new LambdaQueryWrapper<>();
        wrapper.in(ChatBotBase::getId, botIds);
        wrapper.eq(ChatBotBase::getSpaceId, spaceId);

        boolean baseDeleted = chatBotBaseMapper.update(chatBot, wrapper) > 0;
        if (baseDeleted) {
            deactivateChatBotListByBotIds(botIds);
            deleteChatListByBotIds(botIds);
            deleteChatBotMarketByBotIds(botIds);
        }
        return baseDeleted;
    }

    @Override
    public long countBotsByUid(String uid) {
        LambdaQueryWrapper<ChatBotBase> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ChatBotBase::getUid, uid);
        wrapper.eq(ChatBotBase::getIsDelete, 0);
        return chatBotBaseMapper.selectCount(wrapper);
    }

    @Override
    public long countBotsByUid(String uid, Long spaceId) {
        LambdaQueryWrapper<ChatBotBase> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ChatBotBase::getUid, uid);
        wrapper.eq(ChatBotBase::getSpaceId, spaceId);
        wrapper.eq(ChatBotBase::getIsDelete, 0);
        return chatBotBaseMapper.selectCount(wrapper);
    }

    @Override
    public List<ChatBotList> findUserBotList(String uid) {
        LambdaQueryWrapper<ChatBotList> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ChatBotList::getUid, uid);
        wrapper.eq(ChatBotList::getIsAct, 1);
        wrapper.orderByDesc(ChatBotList::getUpdateTime);
        return chatBotListMapper.selectList(wrapper);
    }

    @Override
    public ChatBotList addBotToUserList(ChatBotList chatBotList) {
        chatBotListMapper.insert(chatBotList);
        return chatBotList;
    }

    @Override
    public boolean removeBotFromUserList(String uid, Integer marketBotId) {
        LambdaQueryWrapper<ChatBotList> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ChatBotList::getUid, uid);
        wrapper.eq(ChatBotList::getMarketBotId, marketBotId);

        ChatBotList chatBotList = new ChatBotList();
        chatBotList.setIsAct(0);

        return chatBotListMapper.update(chatBotList, wrapper) > 0;
    }

    @Override
    public List<ChatBotMarket> findMarketBots(Integer botStatus, int page, int size) {
        LambdaQueryWrapper<ChatBotMarket> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ChatBotMarket::getIsDelete, 0);
        if (botStatus != null) {
            wrapper.eq(ChatBotMarket::getBotStatus, botStatus);
        }
        wrapper.orderByDesc(ChatBotMarket::getCreateTime);

        Page<ChatBotMarket> pageParam = new Page<>(page, size);
        Page<ChatBotMarket> result = chatBotMarketMapper.selectPage(pageParam, wrapper);
        return result.getRecords();
    }

    @Override
    public List<ChatBotMarket> findMarketBotsByHot(int limit) {
        LambdaQueryWrapper<ChatBotMarket> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ChatBotMarket::getIsDelete, 0);
        wrapper.eq(ChatBotMarket::getBotStatus, 2);
        wrapper.orderByDesc(ChatBotMarket::getHotNum);
        wrapper.last("LIMIT " + limit);
        return chatBotMarketMapper.selectList(wrapper);
    }

    @Override
    public List<ChatBotMarket> searchMarketBots(String keyword, Integer botType) {
        LambdaQueryWrapper<ChatBotMarket> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(ChatBotMarket::getIsDelete, 0);
        wrapper.eq(ChatBotMarket::getBotStatus, 2);

        if (StringUtils.hasText(keyword)) {
            wrapper.and(w -> w.like(ChatBotMarket::getBotName, keyword).or().like(ChatBotMarket::getBotDesc, keyword));
        }

        if (botType != null) {
            wrapper.eq(ChatBotMarket::getBotType, botType);
        }

        wrapper.orderByDesc(ChatBotMarket::getHotNum);
        return chatBotMarketMapper.selectList(wrapper);
    }

    /**
     * Query whether assistant is deleted
     *
     * @param botId
     */
    @Override
    public boolean botIsDeleted(Long botId) {
        if (null == botId) {
            return false;
        }
        ChatBotBase chatBotBase = chatBotBaseMapper.selectOne(Wrappers.lambdaQuery(ChatBotBase.class)
                .eq(ChatBotBase::getId, botId)
                .eq(ChatBotBase::getIsDelete, 1));

        ChatBotMarket chatBotMarket = chatBotMarketMapper.selectOne(Wrappers.lambdaQuery(ChatBotMarket.class)
                .eq(ChatBotMarket::getBotId, botId)
                .eq(ChatBotMarket::getIsDelete, 1));
        return chatBotBase != null || chatBotMarket != null;
    }

    @Override
    public ChatBotMarket findMarketBotByBotId(Integer botId) {
        if (botId == null) {
            return null;
        }

        LambdaQueryWrapper<ChatBotMarket> wrapper = Wrappers.lambdaQuery(ChatBotMarket.class)
                .eq(ChatBotMarket::getBotId, botId)
                .eq(ChatBotMarket::getIsDelete, 0);

        return chatBotMarketMapper.selectOne(wrapper);
    }

    @Override
    public Boolean checkRepeatBotName(String uid, Integer botId, String botName, Long spaceId) {
        // Cannot have the same name as own bot, excluding deleted ones
        QueryWrapper<ChatBotBase> wrapper = new QueryWrapper<>();
        if (spaceId == null) {
            wrapper.eq("uid", uid);
            wrapper.isNull("space_id");
        } else {
            wrapper.eq("space_id", spaceId);
        }
        wrapper.eq("bot_name", botName);
        wrapper.eq("is_delete", 0);
        if (!Objects.isNull(botId)) {
            wrapper.ne("id", botId);
        }
        if (chatBotBaseMapper.exists(wrapper)) {
            // Bot name duplication
            return Boolean.TRUE;
        }
        return Boolean.FALSE;
    }

    @Override
    public void deleteBotForDeleteSpace(String uid, Long spaceId, HttpServletRequest request) {
        if (spaceId == null) {
            log.error("deleteBotForDeleteSpace-failed, spaceId is empty, uid={}", uid);
            return;
        }
        // Query botId based on spaceId
        List<Integer> spaceBotIdList = chatBotBaseMapper.selectList(Wrappers.lambdaQuery(ChatBotBase.class)
                .eq(ChatBotBase::getSpaceId, spaceId)
                .eq(ChatBotBase::getIsDelete, 0)
                .select(ChatBotBase::getId))
                .stream()
                .map(ChatBotBase::getId)
                .toList();
        log.info("deleteBotForDeleteSpace-start to remove assistants, uid={}, spaceId={}, spaceBotIdList={}", uid, spaceId, spaceBotIdList);
        // Remove assistants
        removeBotForDeleteSpace(uid, spaceId, spaceBotIdList);
        log.info("deleteBotForDeleteSpace-start to delete assistants, uid={}, spaceId={}", uid, spaceId);
        // Delete bot
        chatBotBaseMapper.update(Wrappers.lambdaUpdate(ChatBotBase.class)
                .eq(ChatBotBase::getSpaceId, spaceId)
                .eq(ChatBotBase::getIsDelete, 0)
                .set(ChatBotBase::getIsDelete, 1));
        deactivateChatBotListByBotIds(spaceBotIdList);
        deleteChatListByBotIds(spaceBotIdList);
        log.info("deleteBotForDeleteSpace-start to maintain botDataSet, uid={}, spaceId={}", uid, spaceId);
        // Update status of datasets associated with assistant
        LambdaUpdateWrapper<BotDataset> updateWrapper = new LambdaUpdateWrapper<>();
        updateWrapper.in(BotDataset::getBotId, spaceBotIdList)
                .set(BotDataset::getIsAct, 0)
                .set(BotDataset::getUpdateTime, LocalDateTime.now());
        botDatasetMapper.update(null, updateWrapper);
        // If version = 3, sync to engineering institute
        for (Integer botId : spaceBotIdList) {
            maasUtil.deleteSynchronize(botId, spaceId, request);
        }
    }

    private void removeBotForDeleteSpace(String uid, Long spaceId, List<Integer> spaceBotIdList) {
        if (spaceId == null) {
            log.error("removeBotForDeleteSpace-failed, spaceId is null, uid={}", uid);
            return;
        }
        if (spaceBotIdList.isEmpty()) {
            // If empty, it means no maintenance is needed
            return;
        }
        // Take down assistants
        LambdaUpdateWrapper<ChatBotMarket> updateWrapper = new LambdaUpdateWrapper<>();
        updateWrapper.in(ChatBotMarket::getBotId, spaceBotIdList)
                .set(ChatBotMarket::getBotStatus, 0)
                .set(ChatBotMarket::getIsDelete, 1);

        chatBotMarketMapper.update(null, updateWrapper);
    }

    private void deactivateChatBotListByBotIds(List<Integer> botIds) {
        if (CollectionUtil.isEmpty(botIds)) {
            return;
        }
        LambdaUpdateWrapper<ChatBotList> updateWrapper = new LambdaUpdateWrapper<>();
        updateWrapper.in(ChatBotList::getRealBotId, botIds)
                .set(ChatBotList::getIsAct, 0);
        chatBotListMapper.update(null, updateWrapper);
    }

    private void deleteChatListByBotIds(List<Integer> botIds) {
        if (CollectionUtil.isEmpty(botIds)) {
            return;
        }
        LambdaUpdateWrapper<ChatList> updateWrapper = new LambdaUpdateWrapper<>();
        updateWrapper.in(ChatList::getBotId, botIds)
                .set(ChatList::getIsDelete, 1);
        chatListMapper.update(null, updateWrapper);
    }

    private void deleteChatBotMarketByBotIds(List<Integer> botIds) {
        if (CollectionUtil.isEmpty(botIds)) {
            return;
        }
        LambdaUpdateWrapper<ChatBotMarket> updateWrapper = new LambdaUpdateWrapper<>();
        updateWrapper.in(ChatBotMarket::getBotId, botIds)
                .set(ChatBotMarket::getIsDelete, 1);
        chatBotMarketMapper.update(null, updateWrapper);
    }

    @Override
    public ChatBotList findByUidAndBotId(String uid, Integer botId) {
        return chatBotListMapper.selectOne(new LambdaQueryWrapper<>(ChatBotList.class)
                .eq(ChatBotList::getUid, uid)
                .eq(ChatBotList::getRealBotId, botId)
                .orderByDesc(ChatBotList::getCreateTime)
                .last("limit 1"));
    }

    @Override
    public ChatBotList createUserBotList(ChatBotList chatBotList) {
        chatBotListMapper.insert(chatBotList);
        return chatBotList;
    }

    @Override
    public ChatBotBase copyBot(String uid, Integer botId, Long spaceId) {
        // Create new assistant with same name
        BotDetail botDetail = chatBotBaseMapper.botDetail(Math.toIntExact(botId));
        botDetail.setId(null);
        ChatBotBase base = new ChatBotBase();
        BeanUtils.copyProperties(botDetail, base);
        // Set a new assistant name as differentiation
        base.setUid(uid);
        base.setSpaceId(spaceId);
        base.setBotName(base.getBotName() + RandomUtil.randomString(6));
        base.setUpdateTime(LocalDateTime.now());
        base.setCreateTime(LocalDateTime.now());
        log.info("--------------------------------old bot is :{}, new bot is :{}", JSONObject.toJSONString(botDetail), base);
        chatBotBaseMapper.insert(base);
        chatListDataService.insertChatBotList(base);
        return base;
    }

    @Override
    public Boolean takeoffBot(String uid, Long spaceId, TakeoffList takeoffList) {
        int botId = takeoffList.getBotId();
        UpdateWrapper<ChatBotMarket> wrapper = new UpdateWrapper<>();
        wrapper.eq("bot_id", botId);
        if (!chatBotMarketMapper.exists(wrapper)) {
            return Boolean.TRUE;
        }
        // Directly remove assistant from shelf, no need for comprehensive management review
        wrapper.set("bot_status", 0);
        chatBotMarketMapper.update(null, wrapper);
        botFavoriteService.delete(uid, botId);
        return Boolean.TRUE;
    }

    @Override
    public boolean updateBotBasicInfo(Integer botId, String botDesc, String prologue, String inputExamples) {
        LambdaUpdateWrapper<ChatBotBase> wrapper = new LambdaUpdateWrapper<>(ChatBotBase.class);
        wrapper.set(ChatBotBase::getBotDesc, botDesc);
        wrapper.set(ChatBotBase::getPrologue, prologue);
        wrapper.set(ChatBotBase::getInputExample, inputExamples);
        wrapper.eq(ChatBotBase::getId, botId);
        return chatBotBaseMapper.update(null, wrapper) > 0;
    }

    @Override
    public BotDetail getBotDetail(Long botId) {
        return chatBotBaseMapper.botDetail(Math.toIntExact(botId));
    }

    @Override
    public PromptBotDetail getPromptBotDetail(Integer botId, String uid) {
        BotDetail botBase = chatBotBaseMapper.botDetail(botId);

        PromptBotDetail promptBotDetail = new PromptBotDetail();
        BeanUtils.copyProperties(botBase, promptBotDetail);
        Integer supportUpload = botBase.getSupportUpload();
        promptBotDetail.setSupportUploadList(Collections.singletonList(supportUpload));

        List<ChatBotPromptStruct> promptStructList = promptStructMapper.selectList(
                Wrappers.lambdaQuery(ChatBotPromptStruct.class).eq(ChatBotPromptStruct::getBotId, botId));
        if (CollectionUtil.isNotEmpty(promptStructList)) {
            promptBotDetail.setPromptStructList(promptStructList);
        } else {
            promptBotDetail.setPromptStructList(new ArrayList<>());
        }
        if (promptBotDetail.getInputExample() != null) {
            String inputExample = promptBotDetail.getInputExample();
            if (!StrUtil.contains(inputExample, BOT_INPUT_EXAMPLE_SPLIT)) {
                inputExample = inputExample.replace(",", BOT_INPUT_EXAMPLE_SPLIT);
            }
            List<String> inputExampleList = Arrays.asList(inputExample.split(BOT_INPUT_EXAMPLE_SPLIT));
            promptBotDetail.setInputExampleList(inputExampleList);
        } else {
            promptBotDetail.setInputExampleList(new ArrayList<>());
        }

        List<DatasetInfo> datasetInfoList = datasetInfoService.getDatasetByBot(uid, botId);
        promptBotDetail.setDatasetList(datasetInfoList);

        // Convert bot_type to parent_type_key value
        Integer botType = promptBotDetail.getBotType();
        if (botType == null) {
            botType = 0;
        }
        promptBotDetail.setBotType(BotTypeList.getParentTypeKey(botType));
        try {
            LocalDateTime createTime = LocalDateTime.parse(promptBotDetail.getCreateTime().toString().replace(" ", "T"));
            if (createTime.isBefore(LocalDateTime.of(2025, 2, 24, 10, 00))) {
                promptBotDetail.setEditable(false);
            } else {
                promptBotDetail.setEditable(true);
            }
        } catch (Exception e) {
            log.warn("Failed to parse createTime for botId {}, setting editable to true by default", botId, e);
            promptBotDetail.setEditable(true);
        }
        // Get assistant release channels
        promptBotDetail.setReleaseType(getReleaseChannel(uid, botId));
        return promptBotDetail;
    }

    @Override
    public Map<String, Object> getVcnDetail(String vcnCode) {
        CustomV2VCNDTO detail = customVCNMapper.getVcnByCode(vcnCode);
        if (detail == null) {
            return null;
        }
        String uid = detail.getUid();
        if (uid != null) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", detail.getVcnId());
            map.put("name", detail.getName());
            map.put("vcn", vcnCode);
            map.put("mode", uid);
            map.put("imgUrl", detail.getAvatar());
            map.put("audioUrl", detail.getTryVCNUrl());
            return map;
        }

        return BeanUtil.beanToMap(detail);
    }

    @Override
    public List<Integer> getReleaseChannel(String uid, Integer botId) {
        List<Integer> releaseList = new ArrayList<>();
        boolean marketExist = chatBotMarketMapper.exists(Wrappers.lambdaQuery(ChatBotMarket.class)
                .eq(ChatBotMarket::getUid, uid)
                .eq(ChatBotMarket::getBotId, botId)
                .in(ChatBotMarket::getBotStatus, BotStatusEnum.shelves()));
        if (marketExist) {
            releaseList.add(ReleaseTypeEnum.MARKET.getCode());
        }
        boolean apiExist = botApiMapper.exists(Wrappers.lambdaQuery(ChatBotApi.class)
                .eq(ChatBotApi::getUid, uid)
                .eq(ChatBotApi::getBotId, botId)
                .orderByDesc(ChatBotApi::getUpdateTime));
        if (apiExist) {
            releaseList.add(ReleaseTypeEnum.BOT_API.getCode());
        }
        // MCP channel processing
        McpData mcp = mcpDataService.getMcp(botId.longValue());
        if (Objects.nonNull(mcp) && "1".equals(String.valueOf(mcp.getReleased()))) {
            releaseList.add(ReleaseTypeEnum.MCP.getCode());
        }
        return releaseList;
    }

    @Override
    public ChatBotBase findOne(String uid, Long botId) {
        return findOne(uid, botId, SpaceInfoUtil.getSpaceId());
    }

    @Override
    public ChatBotBase findOne(String uid, Long botId, Long spaceId) {
        LambdaQueryWrapper<ChatBotBase> botSearch = Wrappers.lambdaQuery(ChatBotBase.class).eq(ChatBotBase::getId, botId);
        if (spaceId == null) {
            botSearch.eq(ChatBotBase::getUid, uid)
                    .isNull(ChatBotBase::getSpaceId);
        } else {
            botSearch.eq(ChatBotBase::getSpaceId, spaceId);
        }
        return chatBotBaseMapper.selectOne(botSearch);
    }

    @Override
    public void updateChatBotMarket(ChatBotBase chatBotBase) {
        UpdateWrapper<ChatBotMarket> wrapper = new UpdateWrapper<>();
        wrapper.eq("uid", chatBotBase.getUid());
        wrapper.eq("bot_id", chatBotBase.getId());
        wrapper.set("bot_name", chatBotBase.getBotName());
        wrapper.set("avatar", chatBotBase.getAvatar());
        wrapper.set("bot_type", chatBotBase.getBotType());
        wrapper.set("bot_desc", chatBotBase.getBotDesc());
        wrapper.set("pc_background", chatBotBase.getPcBackground());
        wrapper.set("app_background", chatBotBase.getAppBackground());
        wrapper.set("background_color", chatBotBase.getBackgroundColor());
        wrapper.set("prompt", chatBotBase.getPrompt());
        wrapper.set("prologue", chatBotBase.getPrologue());
        wrapper.set("support_context", chatBotBase.getSupportContext());
        wrapper.set("version", chatBotBase.getVersion());
        wrapper.set("model", chatBotBase.getModel());
        wrapper.set("opened_tool", chatBotBase.getOpenedTool());
        wrapper.set("client_hide", chatBotBase.getClientHide());
        wrapper.set("model_id", chatBotBase.getModelId());
        wrapper.set("support_document", chatBotBase.getSupportDocument());
        wrapper.set("update_time", LocalDateTime.now());
        chatBotMarketMapper.update(null, wrapper);
        log.debug("Updated chat bot market uid={}, botId={}", chatBotBase.getUid(), chatBotBase.getId());
    }
}
