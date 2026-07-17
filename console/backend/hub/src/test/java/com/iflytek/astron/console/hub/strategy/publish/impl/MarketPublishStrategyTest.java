package com.iflytek.astron.console.hub.strategy.publish.impl;

import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.dto.bot.BotPublishQueryResult;
import com.iflytek.astron.console.commons.enums.PublishChannelEnum;
import com.iflytek.astron.console.commons.enums.ShelfStatusEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.mapper.bot.ChatBotBaseMapper;
import com.iflytek.astron.console.commons.mapper.bot.ChatBotMarketMapper;
import com.iflytek.astron.console.hub.service.publish.PublishChannelService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MarketPublishStrategyTest {

    @Mock
    private ChatBotBaseMapper chatBotBaseMapper;
    @Mock
    private ChatBotMarketMapper chatBotMarketMapper;
    @Mock
    private PublishChannelService publishChannelService;
    @Mock
    private ApplicationEventPublisher eventPublisher;

    private MarketPublishStrategy strategy;

    @BeforeEach
    void setUp() {
        strategy = new MarketPublishStrategy(
                chatBotBaseMapper,
                chatBotMarketMapper,
                publishChannelService,
                eventPublisher);
    }

    @Test
    void offlineShouldFailWhenPublishRecordCannotBeUpdated() {
        when(chatBotBaseMapper.checkBotPermission(25, "owner-uid", 1L)).thenReturn(1);
        BotPublishQueryResult queryResult = new BotPublishQueryResult();
        queryResult.setBotStatus(ShelfStatusEnum.ON_SHELF.getCode());
        queryResult.setPublishChannels(PublishChannelEnum.MARKET.getCode());
        when(chatBotMarketMapper.selectBotDetail(25, "owner-uid", 1L)).thenReturn(queryResult);
        when(publishChannelService.updatePublishChannels(
                eq(PublishChannelEnum.MARKET.getCode()),
                eq(PublishChannelEnum.MARKET.getCode()),
                eq(false)))
                .thenReturn("");
        when(chatBotMarketMapper.updatePublishStatus(25, "owner-uid", 1L, ShelfStatusEnum.OFF_SHELF.getCode(), ""))
                .thenReturn(0);

        assertThatThrownBy(() -> strategy.offline(25, null, "owner-uid", 1L))
                .isInstanceOf(BusinessException.class)
                .extracting("responseEnum")
                .isEqualTo(ResponseEnum.BOT_UPDATE_FAILED);
    }
}
