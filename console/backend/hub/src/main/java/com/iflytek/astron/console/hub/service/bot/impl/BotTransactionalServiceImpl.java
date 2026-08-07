package com.iflytek.astron.console.hub.service.bot.impl;

import com.iflytek.astron.console.commons.entity.bot.ChatBotBase;
import com.iflytek.astron.console.commons.enums.bot.BotVersionEnum;
import com.iflytek.astron.console.commons.service.bot.BotService;
import com.iflytek.astron.console.commons.util.MaasUtil;
import com.iflytek.astron.console.hub.service.bot.BotTransactionalService;
import com.iflytek.astron.console.hub.service.bot.PersonalityConfigService;
import com.iflytek.astron.console.hub.service.workflow.BotChainService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.redisson.api.RedissonClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;

/**
 * @author mingsuiyongheng
 */
@Service
@Slf4j
public class BotTransactionalServiceImpl implements BotTransactionalService {

    @Autowired
    private BotService botService;

    @Autowired
    private BotChainService botChainService;

    @Autowired
    private RedissonClient redissonClient;

    @Autowired
    private PersonalityConfigService personalityConfigService;

    /**
     * Copy bot
     *
     * @param uid User ID
     * @param botId Bot ID
     * @param request HTTP request object
     * @param spaceId Space ID
     */
    @Transactional(rollbackFor = Exception.class)
    @Override
    public void copyBot(String uid, Integer botId, HttpServletRequest request, Long spaceId) {
        ChatBotBase base = botService.copyBot(uid, botId, spaceId);
        log.info("copy bot : new bot : {}", base);
        personalityConfigService.copyPersonalityConfig(botId, base.getId());
        // The botId of the new assistant is the target id
        Long targetId = Long.valueOf(base.getId());
        if (BotVersionEnum.isBaseBot(base.getVersion())) {
            botChainService.copyBot(uid, Long.valueOf(botId), targetId, spaceId);
        } else if (BotVersionEnum.isWorkflow(base.getVersion())) {
            // Create an event to be consumed at /maasCopySynchronize
            redissonClient.getBucket(MaasUtil.generatePrefix(uid, botId)).set(String.valueOf(botId));
            redissonClient.getBucket(MaasUtil.generatePrefix(uid, botId)).expire(Duration.ofSeconds(60));
            // Synchronize Xingchen MAAS
            botChainService.cloneWorkFlow(uid, Long.valueOf(botId), targetId, request, spaceId, BotVersionEnum.WORKFLOW.getVersion(), null);
        } else if (BotVersionEnum.isTalkAgent(base.getVersion())) {
            // Create an event to be consumed at /maasCopySynchronize
            redissonClient.getBucket(MaasUtil.generatePrefix(uid, botId)).set(String.valueOf(botId));
            redissonClient.getBucket(MaasUtil.generatePrefix(uid, botId)).expire(Duration.ofSeconds(60));
            // Synchronize Xingchen MAAS
            botChainService.cloneWorkFlow(uid, Long.valueOf(botId), targetId, request, spaceId, BotVersionEnum.TALK.getVersion(), null);
        }
    }
}
