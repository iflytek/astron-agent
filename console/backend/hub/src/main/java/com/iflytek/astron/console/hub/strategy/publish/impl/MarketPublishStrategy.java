package com.iflytek.astron.console.hub.strategy.publish.impl;

import com.iflytek.astron.console.commons.enums.bot.ReleaseTypeEnum;
import com.iflytek.astron.console.commons.enums.PublishChannelEnum;
import com.iflytek.astron.console.commons.enums.ShelfStatusEnum;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.commons.mapper.bot.ChatBotMarketMapper;
import com.iflytek.astron.console.commons.mapper.bot.ChatBotBaseMapper;
import com.iflytek.astron.console.commons.dto.bot.BotPublishQueryResult;
import com.iflytek.astron.console.commons.entity.bot.ChatBotBase;
import com.iflytek.astron.console.commons.entity.bot.ChatBotMarket;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.hub.service.publish.PublishChannelService;
import com.iflytek.astron.console.hub.strategy.publish.PublishStrategy;
import com.iflytek.astron.console.hub.event.BotPublishStatusChangedEvent;
import com.alibaba.fastjson2.JSON;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Market publish strategy implementation Handles bot publishing to market channel using
 * event-driven architecture
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MarketPublishStrategy implements PublishStrategy {

    private final ChatBotBaseMapper chatBotBaseMapper;
    private final ChatBotMarketMapper chatBotMarketMapper;
    private final PublishChannelService publishChannelService;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ApiResult<Object> publish(Integer botId, Object publishData, String currentUid, Long spaceId) {
        log.info("Publishing bot to market: botId={}, currentUid={}, spaceId={}", botId, currentUid, spaceId);

        try {
            // 1. Validate bot permission
            int hasPermission = chatBotBaseMapper.checkBotPermission(botId, currentUid, spaceId);
            if (hasPermission == 0) {
                throw new BusinessException(ResponseEnum.BOT_NOT_EXISTS);
            }

            // 2. Query current publish status
            BotPublishQueryResult queryResult = chatBotMarketMapper.selectBotDetail(botId, currentUid, spaceId);
            Integer currentStatus = queryResult != null ? queryResult.getBotStatus() : null;
            String currentChannels = queryResult != null ? queryResult.getPublishChannels() : null;

            // 3. Calculate new status and channels
            Integer effectiveStatus = currentStatus != null ? currentStatus : ShelfStatusEnum.OFF_SHELF.getCode();

            // Allow re-publishing even if already on shelf
            if (ShelfStatusEnum.isOnShelf(effectiveStatus)) {
                log.info("Bot already published, performing re-publish operation: botId={}", botId);
            }

            if (!ShelfStatusEnum.isOffShelf(effectiveStatus) && !ShelfStatusEnum.isOnShelf(effectiveStatus)) {
                throw new BusinessException(ResponseEnum.BOT_STATUS_NOT_ALLOW_PUBLISH);
            }

            Integer newStatus = ShelfStatusEnum.ON_SHELF.getCode();
            String newChannels = publishChannelService.updatePublishChannels(
                    currentChannels, PublishChannelEnum.MARKET.getCode(), true);

            // 4. Parse market-specific publish data
            if (publishData != null) {
                log.debug("Market publish data: {}", JSON.toJSONString(publishData));
                // TODO: Parse market-specific data like category, tags, visibility settings
            }

            // 5. Handle market data synchronization directly
            boolean isFirstPublish = currentStatus == null;
            handleBotMarketSync(botId, currentUid, spaceId, newStatus, newChannels, isFirstPublish);

            // 6. Publish event to trigger bot-type-specific operations (workflow version creation, etc.)
            eventPublisher.publishEvent(new BotPublishStatusChangedEvent(
                    this, botId, currentUid, spaceId, "PUBLISH",
                    currentStatus, newStatus, newChannels));

            log.info("Market publish completed successfully: botId={}", botId);
            return ApiResult.success(null);

        } catch (Exception e) {
            log.error("Market publish failed: botId={}, error={}", botId, e.getMessage(), e);
            throw e;
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ApiResult<Object> offline(Integer botId, Object publishData, String currentUid, Long spaceId) {
        log.info("Offlining bot from market: botId={}, currentUid={}, spaceId={}", botId, currentUid, spaceId);

        try {
            // 1. Validate bot permission
            int hasPermission = chatBotBaseMapper.checkBotPermission(botId, currentUid, spaceId);
            if (hasPermission == 0) {
                throw new BusinessException(ResponseEnum.BOT_NOT_EXISTS);
            }

            // 2. Query current publish status
            BotPublishQueryResult queryResult = chatBotMarketMapper.selectBotDetail(botId, currentUid, spaceId);
            Integer currentStatus = queryResult != null ? queryResult.getBotStatus() : null;
            String currentChannels = queryResult != null ? queryResult.getPublishChannels() : null;

            // 3. Validate offline conditions
            if (currentStatus == null || !ShelfStatusEnum.isOnShelf(currentStatus)) {
                throw new BusinessException(ResponseEnum.BOT_STATUS_NOT_ALLOW_OFFLINE);
            }

            Integer newStatus = ShelfStatusEnum.OFF_SHELF.getCode();
            String newChannels = publishChannelService.updatePublishChannels(
                    currentChannels, PublishChannelEnum.MARKET.getCode(), false);

            // 4. Handle market data synchronization directly (offline operation)
            handleBotMarketOffline(botId, currentUid, spaceId, newStatus, newChannels);

            // 5. Publish event to trigger bot-type-specific operations if needed
            eventPublisher.publishEvent(new BotPublishStatusChangedEvent(
                    this, botId, currentUid, spaceId, "OFFLINE",
                    currentStatus, newStatus, newChannels));

            log.info("Market offline completed successfully: botId={}", botId);
            return ApiResult.success(null);

        } catch (Exception e) {
            log.error("Market offline failed: botId={}, error={}", botId, e.getMessage(), e);
            throw e;
        }
    }

    @Override
    public String getPublishType() {
        return ReleaseTypeEnum.MARKET.name();
    }

    /**
     * Handle bot market data synchronization Common logic for both instructional and workflow bots
     */
    public void handleBotMarketSync(Integer botId, String uid, Long spaceId,
            Integer newStatus, String newChannels, boolean isFirstPublish) {
        log.info("Syncing bot data to market table: botId={}, uid={}, isFirstPublish={}",
                botId, uid, isFirstPublish);

        if (isFirstPublish) {
            // First time publishing - insert new market record
            insertBotMarketRecord(botId, uid, spaceId, newStatus, newChannels);
        } else {
            // Re-publishing - sync all data from chat_bot_base to chat_bot_market
            syncBotDataToMarket(botId, uid, spaceId, newStatus, newChannels);
        }
    }

    /**
     * Insert bot market record (used for first time publishing) Sync complete data from chat_bot_base
     * to chat_bot_market
     */
    private void insertBotMarketRecord(Integer botId, String uid, Long spaceId, Integer status, String channels) {
        // First query bot basic information
        ChatBotBase botBase = chatBotBaseMapper.selectById(botId);
        if (botBase == null) {
            throw new BusinessException(ResponseEnum.BOT_NOT_EXISTS);
        }

        // Create market record with complete data sync
        ChatBotMarket marketRecord = new ChatBotMarket();

        // Basic information
        marketRecord.setBotId(botId);
        marketRecord.setUid(uid);
        marketRecord.setBotName(botBase.getBotName());
        marketRecord.setBotDesc(botBase.getBotDesc());
        marketRecord.setAvatar(botBase.getAvatar());
        marketRecord.setBotType(botBase.getBotType());

        // Core configuration
        marketRecord.setPrompt(botBase.getPrompt());
        marketRecord.setPrologue(botBase.getPrologue());
        marketRecord.setVersion(botBase.getVersion());

        // Background images
        marketRecord.setPcBackground(botBase.getPcBackground());
        marketRecord.setAppBackground(botBase.getAppBackground());
        marketRecord.setBackgroundColor(botBase.getBackgroundColor());

        // Functional configuration
        marketRecord.setSupportContext(botBase.getSupportContext());
        marketRecord.setSupportDocument(botBase.getSupportDocument());

        // Model configuration
        marketRecord.setModel(botBase.getModel());
        marketRecord.setModelId(botBase.getModelId());
        marketRecord.setOpenedTool(botBase.getOpenedTool());

        // Market-specific fields with defaults
        marketRecord.setShowIndex(0);
        marketRecord.setShowOthers(0);
        marketRecord.setHotNum(0);
        marketRecord.setShowWeight(0);

        // Status and channel management
        marketRecord.setBotStatus(status);
        marketRecord.setPublishChannels(channels);
        marketRecord.setIsDelete(0);
        marketRecord.setCreateTime(LocalDateTime.now());
        marketRecord.setUpdateTime(LocalDateTime.now());

        // Insert record
        int insertCount = chatBotMarketMapper.insert(marketRecord);
        if (insertCount == 0) {
            throw new BusinessException(ResponseEnum.BOT_UPDATE_FAILED);
        }

        log.info("Created bot market record: botId={}, version={}, status={}, channels={}",
                botId, botBase.getVersion(), status, channels);
    }

    /**
     * Sync bot data from chat_bot_base to chat_bot_market (for existing records) When re-publishing,
     * sync all latest data to ensure consistency
     */
    private void syncBotDataToMarket(Integer botId, String uid, Long spaceId, Integer newStatus, String newChannels) {
        // Query latest bot data
        ChatBotBase botBase = chatBotBaseMapper.selectById(botId);
        if (botBase == null) {
            throw new BusinessException(ResponseEnum.BOT_NOT_EXISTS);
        }

        // Build update wrapper to sync all data fields
        com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper<ChatBotMarket> updateWrapper =
                new com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper<>();

        updateWrapper.eq("bot_id", botId);

        // In shared space mode, publish records belong to the space bot instead of the current operator.
        // Re-publish should therefore update the existing market record regardless of who triggers it.
        if (spaceId == null) {
            updateWrapper.eq("uid", uid);
        }

        // Sync all data fields from chat_bot_base to ensure data consistency
        updateWrapper.set("bot_name", botBase.getBotName())
                .set("bot_desc", botBase.getBotDesc())
                .set("avatar", botBase.getAvatar())
                .set("bot_type", botBase.getBotType())
                .set("prompt", botBase.getPrompt())
                .set("prologue", botBase.getPrologue())
                .set("version", botBase.getVersion())
                .set("pc_background", botBase.getPcBackground())
                .set("app_background", botBase.getAppBackground())
                .set("support_context", botBase.getSupportContext())
                .set("bot_status", newStatus)
                .set("publish_channels", newChannels)
                .set("update_time", LocalDateTime.now());

        int updateCount = chatBotMarketMapper.update(null, updateWrapper);
        if (updateCount == 0) {
            throw new BusinessException(ResponseEnum.BOT_UPDATE_FAILED);
        }

        log.info("Synced bot data to market: botId={}, version={}, status={}, channels={}",
                botId, botBase.getVersion(), newStatus, newChannels);
    }

    /**
     * Handle bot market offline operation Only update status and channels for offline operation
     */
    private void handleBotMarketOffline(Integer botId, String uid, Long spaceId, Integer newStatus, String newChannels) {
        log.info("Handling bot market offline: botId={}, uid={}, status={}, channels={}",
                botId, uid, newStatus, newChannels);

        // Only update status and channels for offline operation
        int updateCount = chatBotMarketMapper.updatePublishStatus(botId, uid, spaceId, newStatus, newChannels);
        if (updateCount == 0) {
            log.error("Bot offline update failed, record not found: botId={}, uid={}, spaceId={}",
                    botId, uid, spaceId);
            throw new BusinessException(ResponseEnum.BOT_UPDATE_FAILED);
        }
        log.info("Bot offline update successful: botId={}, status={}, channels={}",
                botId, newStatus, newChannels);
    }
}
