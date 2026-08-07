package com.iflytek.astron.console.hub.service.bot.impl;

import com.iflytek.astron.console.commons.entity.bot.ChatBotBase;
import com.iflytek.astron.console.commons.enums.bot.BotVersionEnum;
import com.iflytek.astron.console.commons.service.bot.BotService;
import com.iflytek.astron.console.commons.util.MaasUtil;
import com.iflytek.astron.console.hub.service.workflow.BotChainService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.redisson.api.RBucket;
import org.redisson.api.RedissonClient;

import java.time.Duration;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BotTransactionalServiceImplTest {

    @Mock
    private BotService botService;

    @Mock
    private BotChainService botChainService;

    @Mock
    private RedissonClient redissonClient;

    @Mock
    private HttpServletRequest request;

    @Mock
    private RBucket<String> rBucket;

    @Mock
    private com.iflytek.astron.console.hub.service.bot.PersonalityConfigService personalityConfigService;

    @InjectMocks
    private BotTransactionalServiceImpl botTransactionalService;

    private ChatBotBase chatBotBase;
    private String uid;
    private Integer botId;
    private Long spaceId;

    @BeforeEach
    void setUp() {
        uid = "testUser";
        botId = 123;
        spaceId = 456L;

        chatBotBase = new ChatBotBase();
        chatBotBase.setId(789);
        chatBotBase.setVersion(1);
    }

    @Test
    void testCopyBot_Version1_BaseBot() {
        // Given
        when(botService.copyBot(uid, botId, spaceId)).thenReturn(chatBotBase);
        doNothing().when(personalityConfigService).copyPersonalityConfig(eq(botId), eq(chatBotBase.getId()));

        // When
        botTransactionalService.copyBot(uid, botId, request, spaceId);

        // Then
        verify(botService).copyBot(uid, botId, spaceId);
        verify(personalityConfigService).copyPersonalityConfig(eq(botId), eq(chatBotBase.getId()));
        verify(botChainService).copyBot(uid, Long.valueOf(botId), Long.valueOf(chatBotBase.getId()), spaceId);
        verifyNoInteractions(redissonClient);
    }

    @Test
    void testCopyBot_Version3() {
        // Given
        chatBotBase.setVersion(3);
        String redisKey = "test-prefix";

        when(botService.copyBot(uid, botId, spaceId)).thenReturn(chatBotBase);
        doNothing().when(personalityConfigService).copyPersonalityConfig(eq(botId), eq(chatBotBase.getId()));
        when(redissonClient.<String>getBucket(anyString())).thenReturn(rBucket);

        try (MockedStatic<MaasUtil> maasUtilMock = mockStatic(MaasUtil.class)) {
            maasUtilMock.when(() -> MaasUtil.generatePrefix(uid, botId)).thenReturn(redisKey);

            // When
            botTransactionalService.copyBot(uid, botId, request, spaceId);

            // Then
            verify(botService).copyBot(uid, botId, spaceId);
            verify(personalityConfigService).copyPersonalityConfig(eq(botId), eq(chatBotBase.getId()));
            verify(redissonClient, times(2)).getBucket(redisKey);
            verify(rBucket).set(String.valueOf(botId));
            verify(rBucket).expire(Duration.ofSeconds(60));
            verify(botChainService).cloneWorkFlow(uid, Long.valueOf(botId), Long.valueOf(chatBotBase.getId()), request, spaceId, BotVersionEnum.WORKFLOW.getVersion(), null);
        }
    }

    @Test
    void testCopyBot_Version1_WithPersonalityConfig() {
        // Given
        chatBotBase.setVersion(1);
        when(botService.copyBot(uid, botId, spaceId)).thenReturn(chatBotBase);
        doNothing().when(personalityConfigService).copyPersonalityConfig(eq(botId), eq(chatBotBase.getId()));

        // When
        botTransactionalService.copyBot(uid, botId, request, spaceId);

        // Then
        verify(botService).copyBot(uid, botId, spaceId);
        verify(personalityConfigService).copyPersonalityConfig(eq(botId), eq(chatBotBase.getId()));
        verify(botChainService).copyBot(uid, Long.valueOf(botId), Long.valueOf(chatBotBase.getId()), spaceId);
        verifyNoInteractions(redissonClient);
    }

    @Test
    void testCopyBot_WithNullSpaceId() {
        // Given
        when(botService.copyBot(uid, botId, null)).thenReturn(chatBotBase);
        doNothing().when(personalityConfigService).copyPersonalityConfig(eq(botId), eq(chatBotBase.getId()));

        // When
        botTransactionalService.copyBot(uid, botId, request, null);

        // Then
        verify(botService).copyBot(uid, botId, null);
        verify(personalityConfigService).copyPersonalityConfig(eq(botId), eq(chatBotBase.getId()));
        verify(botChainService).copyBot(uid, Long.valueOf(botId), Long.valueOf(chatBotBase.getId()), null);
    }

    @Test
    void testCopyBot_Version3_RedisOperations() {
        // Given
        chatBotBase.setVersion(3);
        String redisKey = "maas-prefix-key";

        when(botService.copyBot(uid, botId, spaceId)).thenReturn(chatBotBase);
        when(redissonClient.<String>getBucket(anyString())).thenReturn(rBucket);

        try (MockedStatic<MaasUtil> maasUtilMock = mockStatic(MaasUtil.class)) {
            maasUtilMock.when(() -> MaasUtil.generatePrefix(uid, botId)).thenReturn(redisKey);

            // When
            botTransactionalService.copyBot(uid, botId, request, spaceId);

            // Then
            maasUtilMock.verify(() -> MaasUtil.generatePrefix(uid, botId), times(2));
            verify(rBucket).set(String.valueOf(botId));
            verify(rBucket).expire(Duration.ofSeconds(60));
        }
    }

    @Test
    void testCopyBot_BotServiceReturnsBot() {
        // Given
        ChatBotBase expectedBot = new ChatBotBase();
        expectedBot.setId(999);
        expectedBot.setVersion(1);

        when(botService.copyBot(uid, botId, spaceId)).thenReturn(expectedBot);
        doNothing().when(personalityConfigService).copyPersonalityConfig(eq(botId), eq(expectedBot.getId()));

        // When
        botTransactionalService.copyBot(uid, botId, request, spaceId);

        // Then
        verify(botService).copyBot(uid, botId, spaceId);
        verify(personalityConfigService).copyPersonalityConfig(eq(botId), eq(expectedBot.getId()));
        verify(botChainService).copyBot(uid, Long.valueOf(botId), Long.valueOf(expectedBot.getId()), spaceId);
    }
}
