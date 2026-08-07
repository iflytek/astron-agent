package com.iflytek.astron.console.hub.service.wechat.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.iflytek.astron.console.commons.entity.bot.ChatBotBase;
import com.iflytek.astron.console.commons.entity.wechat.BotOffiaccount;
import com.iflytek.astron.console.commons.enums.BotOffiaccountStatusEnum;
import com.iflytek.astron.console.commons.enums.PublishChannelEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.mapper.bot.ChatBotBaseMapper;
import com.iflytek.astron.console.commons.mapper.wechat.BotOffiaccountMapper;
import com.iflytek.astron.console.hub.event.PublishChannelUpdateEvent;
import com.iflytek.astron.console.hub.service.wechat.BotOffiaccountService;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

/**
 * Bot WeChat Official Account binding service implementation
 *
 * @author Omuigix
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BotOffiaccountServiceImpl implements BotOffiaccountService {

    private final BotOffiaccountMapper botOffiaccountMapper;
    private final ChatBotBaseMapper chatBotBaseMapper;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void bind(Integer botId, String appid, String uid) {
        log.info("Starting to bind bot with WeChat official account: botId={}, appid={}, uid={}", botId, appid, uid);

        // 1. Validate bot permission
        ChatBotBase botBase = chatBotBaseMapper.selectById(botId);
        if (botBase == null) {
            throw new BusinessException(ResponseEnum.BOT_NOT_EXISTS);
        }

        int hasPermission = chatBotBaseMapper.checkBotPermission(botId, uid, botBase.getSpaceId());
        if (hasPermission == 0) {
            throw new BusinessException(ResponseEnum.BOT_NOT_EXISTS);
        }

        // 2. Check if AppID is already bound by other bot
        BotOffiaccount existingAppidBind = botOffiaccountMapper.selectOne(
                new LambdaQueryWrapper<BotOffiaccount>()
                        .eq(BotOffiaccount::getAppid, appid)
                        .eq(BotOffiaccount::getStatus, BotOffiaccountStatusEnum.BOUND.getStatus()));
        if (existingAppidBind != null && !Objects.equals(existingAppidBind.getBotId(), botId)) {
            // Unbind the old bot
            existingAppidBind.setStatus(BotOffiaccountStatusEnum.UNBOUND.getStatus());
            existingAppidBind.setUpdateTime(LocalDateTime.now());
            botOffiaccountMapper.updateById(existingAppidBind);
            log.info("WeChat AppID already bound by another bot, unbinding old bot: appid={}, oldBotId={}",
                    appid, existingAppidBind.getBotId());
        }

        // 3. Handle current bot's binding record
        BotOffiaccount currentBotBind = botOffiaccountMapper.selectOne(
                new LambdaQueryWrapper<BotOffiaccount>()
                        .eq(BotOffiaccount::getBotId, botId)
                        .orderByDesc(BotOffiaccount::getUpdateTime)
                        .last("LIMIT 1"));
        if (currentBotBind == null) {
            // Create new binding record
            BotOffiaccount newBind = BotOffiaccount.builder()
                    .uid(uid)
                    .botId(botId)
                    .appid(appid)
                    .status(BotOffiaccountStatusEnum.BOUND.getStatus())
                    .createTime(LocalDateTime.now())
                    .updateTime(LocalDateTime.now())
                    .build();
            botOffiaccountMapper.insert(newBind);
            log.info("Created new WeChat binding record: botId={}, appid={}", botId, appid);
        } else {
            // Update existing record
            currentBotBind.setUid(uid);
            currentBotBind.setAppid(appid);
            currentBotBind.setStatus(BotOffiaccountStatusEnum.BOUND.getStatus());
            currentBotBind.setUpdateTime(LocalDateTime.now());
            botOffiaccountMapper.updateById(currentBotBind);
            log.info("Updated existing WeChat binding record: botId={}, appid={}", botId, appid);
        }

        // 4. Publish channel update event
        eventPublisher.publishEvent(new PublishChannelUpdateEvent(
                this, botId, uid, botBase.getSpaceId(), PublishChannelEnum.WECHAT, true));

        log.info("Bot WeChat official account binding successful: botId={}, appid={}", botId, appid);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void unbind(String appid) {
        log.info("Starting to unbind WeChat official account: appid={}", appid);

        BotOffiaccount botOffiaccount = botOffiaccountMapper.selectOne(
                new LambdaQueryWrapper<BotOffiaccount>()
                        .eq(BotOffiaccount::getAppid, appid)
                        .eq(BotOffiaccount::getStatus, BotOffiaccountStatusEnum.BOUND.getStatus()));
        if (botOffiaccount != null) {
            ChatBotBase botBase = chatBotBaseMapper.selectById(botOffiaccount.getBotId());

            botOffiaccount.setStatus(BotOffiaccountStatusEnum.UNBOUND.getStatus());
            botOffiaccount.setUpdateTime(LocalDateTime.now());
            botOffiaccountMapper.updateById(botOffiaccount);

            eventPublisher.publishEvent(new PublishChannelUpdateEvent(
                    this, botOffiaccount.getBotId(), botOffiaccount.getUid(),
                    botBase != null ? botBase.getSpaceId() : null, PublishChannelEnum.WECHAT, false));

            log.info("WeChat official account unbinding successful: botId={}, appid={}", botOffiaccount.getBotId(), appid);
        } else {
            log.warn("WeChat official account record not found for unbinding: appid={}", appid);
        }
    }

    @Override
    public List<BotOffiaccount> getAccountList(String uid) {
        return botOffiaccountMapper.selectList(
                new LambdaQueryWrapper<BotOffiaccount>()
                        .eq(BotOffiaccount::getUid, uid)
                        .eq(BotOffiaccount::getStatus, BotOffiaccountStatusEnum.BOUND.getStatus())
                        .orderByDesc(BotOffiaccount::getUpdateTime));
    }

    @Override
    public BotOffiaccount getByAppid(String appid) {
        return botOffiaccountMapper.selectOne(
                new LambdaQueryWrapper<BotOffiaccount>()
                        .eq(BotOffiaccount::getAppid, appid)
                        .eq(BotOffiaccount::getStatus, BotOffiaccountStatusEnum.BOUND.getStatus()));
    }

    @Override
    public BotOffiaccount getByBotId(Integer botId) {
        return botOffiaccountMapper.selectOne(
                new LambdaQueryWrapper<BotOffiaccount>()
                        .eq(BotOffiaccount::getBotId, botId)
                        .orderByDesc(BotOffiaccount::getUpdateTime)
                        .last("LIMIT 1"));
    }

}
