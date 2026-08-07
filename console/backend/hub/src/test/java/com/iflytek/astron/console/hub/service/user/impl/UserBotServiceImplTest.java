package com.iflytek.astron.console.hub.service.user.impl;

import com.iflytek.astron.console.commons.enums.space.SpaceRoleEnum;
import com.iflytek.astron.console.commons.mapper.bot.ChatBotListMapper;
import com.iflytek.astron.console.commons.service.bot.BotFavoriteService;
import com.iflytek.astron.console.commons.service.bot.BotService;
import com.iflytek.astron.console.commons.service.data.UserLangChainDataService;
import com.iflytek.astron.console.commons.service.mcp.McpDataService;
import com.iflytek.astron.console.commons.service.space.SpaceUserService;
import com.iflytek.astron.console.commons.util.RequestContextUtil;
import com.iflytek.astron.console.commons.util.space.SpaceInfoUtil;
import com.iflytek.astron.console.hub.dto.user.MyBotPageDTO;
import com.iflytek.astron.console.hub.dto.user.MyBotParamDTO;
import com.iflytek.astron.console.hub.mapper.ApplicationFormMapper;
import com.iflytek.astron.console.hub.service.chat.ChatBotApiService;
import com.iflytek.astron.console.hub.service.wechat.BotOffiaccountService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.redisson.api.RBucket;
import org.redisson.api.RedissonClient;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserBotServiceImplTest {

    @Mock
    private ChatBotListMapper chatBotListMapper;
    @Mock
    private BotOffiaccountService botOffiaccountService;
    @Mock
    private UserLangChainDataService userLangChainDataService;
    @Mock
    private BotFavoriteService botFavoriteService;
    @Mock
    private ChatBotApiService chatBotApiService;
    @Mock
    private McpDataService mcpDataService;
    @Mock
    private RedissonClient redissonClient;
    @Mock
    private BotService botService;
    @Mock
    private SpaceUserService spaceUserService;
    @Mock
    private ApplicationFormMapper applicationFormMapper;
    @Mock
    private RBucket<String> formCache;

    @Test
    void personalOwnerShouldReceiveOfflineCapabilityForOwnPublishedBot() {
        UserBotServiceImpl service = service();
        mockListQuery("owner-uid");

        try (MockedStatic<RequestContextUtil> requestContext = mockStatic(RequestContextUtil.class);
                MockedStatic<SpaceInfoUtil> spaceInfo = mockStatic(SpaceInfoUtil.class)) {
            requestContext.when(RequestContextUtil::getUID).thenReturn("owner-uid");
            spaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(null);

            MyBotPageDTO result = service.listMyBots(request());

            assertThat(result.getPageData()).hasSize(1);
            assertThat(result.getPageData().get(0).getCanOffline()).isTrue();
        }
    }

    @Test
    void sharedSpaceAdminShouldReceiveOfflineCapability() {
        UserBotServiceImpl service = service();
        mockListQuery("creator-uid");
        when(spaceUserService.getRole(100L, "admin-uid")).thenReturn(SpaceRoleEnum.ADMIN);

        try (MockedStatic<RequestContextUtil> requestContext = mockStatic(RequestContextUtil.class);
                MockedStatic<SpaceInfoUtil> spaceInfo = mockStatic(SpaceInfoUtil.class)) {
            requestContext.when(RequestContextUtil::getUID).thenReturn("admin-uid");
            spaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(100L);

            MyBotPageDTO result = service.listMyBots(request());

            assertThat(result.getPageData()).hasSize(1);
            assertThat(result.getPageData().get(0).getCanOffline()).isTrue();
        }
    }

    @Test
    void sharedSpaceMemberShouldNotReceiveOfflineCapability() {
        UserBotServiceImpl service = service();
        mockListQuery("creator-uid");
        when(spaceUserService.getRole(100L, "member-uid")).thenReturn(SpaceRoleEnum.MEMBER);

        try (MockedStatic<RequestContextUtil> requestContext = mockStatic(RequestContextUtil.class);
                MockedStatic<SpaceInfoUtil> spaceInfo = mockStatic(SpaceInfoUtil.class)) {
            requestContext.when(RequestContextUtil::getUID).thenReturn("member-uid");
            spaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(100L);

            MyBotPageDTO result = service.listMyBots(request());

            assertThat(result.getPageData()).hasSize(1);
            assertThat(result.getPageData().get(0).getCanOffline()).isFalse();
        }
    }

    private UserBotServiceImpl service() {
        UserBotServiceImpl service = new UserBotServiceImpl();
        ReflectionTestUtils.setField(service, "chatBotListMapper", chatBotListMapper);
        ReflectionTestUtils.setField(service, "botOffiaccountService", botOffiaccountService);
        ReflectionTestUtils.setField(service, "userLangChainDataService", userLangChainDataService);
        ReflectionTestUtils.setField(service, "botFavoriteService", botFavoriteService);
        ReflectionTestUtils.setField(service, "chatBotApiService", chatBotApiService);
        ReflectionTestUtils.setField(service, "mcpDataService", mcpDataService);
        ReflectionTestUtils.setField(service, "redissonClient", redissonClient);
        ReflectionTestUtils.setField(service, "botService", botService);
        ReflectionTestUtils.setField(service, "spaceUserService", spaceUserService);
        ReflectionTestUtils.setField(service, "applicationFormMapper", applicationFormMapper);
        return service;
    }

    private void mockListQuery(String botOwnerUid) {
        when(chatBotListMapper.countCheckBotList(any())).thenReturn(1L);
        when(chatBotListMapper.getCheckBotList(any())).thenReturn(new LinkedList<>(Collections.singletonList(bot(botOwnerUid))));
        when(botFavoriteService.list(any())).thenReturn(Collections.emptyList());
        when(botOffiaccountService.getAccountList(any())).thenReturn(Collections.emptyList());
        when(chatBotApiService.getBotApiList(any())).thenReturn(Collections.emptyList());
        when(mcpDataService.getMcpByUid(any())).thenReturn(Collections.emptyList());
        when(userLangChainDataService.findByBotIdSet(anySet())).thenReturn(Collections.emptyList());
        when(redissonClient.<String>getBucket(anyString())).thenReturn(formCache);
        when(formCache.isExists()).thenReturn(false);
        when(applicationFormMapper.selectOne(any())).thenReturn(null);
    }

    private MyBotParamDTO request() {
        MyBotParamDTO request = new MyBotParamDTO();
        request.setPageIndex(1);
        request.setPageSize(10);
        request.setBotStatus(Collections.singletonList(2));
        return request;
    }

    private Map<String, Object> bot(String uid) {
        Map<String, Object> bot = new HashMap<>();
        bot.put("botId", 42);
        bot.put("uid", uid);
        bot.put("marketBotId", 1L);
        bot.put("botName", "Published Bot");
        bot.put("botDesc", "desc");
        bot.put("avatar", "");
        bot.put("prompt", "");
        bot.put("botType", 1);
        bot.put("version", 1);
        bot.put("supportContext", true);
        bot.put("botStatus", 2L);
        bot.put("blockReason", "");
        bot.put("hotNum", 0);
        bot.put("isFavorite", 0);
        bot.put("af", "0");
        bot.put("maasId", 1000L);
        bot.put("createTime", LocalDateTime.now());
        return bot;
    }
}
