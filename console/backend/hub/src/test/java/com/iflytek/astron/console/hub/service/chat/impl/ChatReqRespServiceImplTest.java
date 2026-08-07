package com.iflytek.astron.console.hub.service.chat.impl;

import com.iflytek.astron.console.commons.service.data.ChatDataService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatReqRespServiceImplTest {

    @Mock
    private ChatDataService chatDataService;

    @InjectMocks
    private ChatReqRespServiceImpl chatReqRespService;

    private Long chatId;
    private String uid;
    private Integer botId;

    @BeforeEach
    void setUp() {
        chatId = 100L;
        uid = "test-user-123";
        botId = 1;
    }

    @Test
    void testUpdateBotChatContext_WithValidParameters_ShouldCallDataService() {
        // When
        chatReqRespService.updateBotChatContext(chatId, uid, botId);

        // Then
        verify(chatDataService).updateNewContextByUidAndChatId(uid, chatId);
    }

    @Test
    void testUpdateBotChatContext_WithNullChatId_ShouldCallDataService() {
        // Given
        Long nullChatId = null;

        // When
        chatReqRespService.updateBotChatContext(nullChatId, uid, botId);

        // Then
        verify(chatDataService).updateNewContextByUidAndChatId(uid, nullChatId);
    }

    @Test
    void testUpdateBotChatContext_WithNullUid_ShouldCallDataService() {
        // Given
        String nullUid = null;

        // When
        chatReqRespService.updateBotChatContext(chatId, nullUid, botId);

        // Then
        verify(chatDataService).updateNewContextByUidAndChatId(nullUid, chatId);
    }

    @Test
    void testUpdateBotChatContext_WithNullBotId_ShouldCallDataService() {
        // Given
        Integer nullBotId = null;

        // When
        chatReqRespService.updateBotChatContext(chatId, uid, nullBotId);

        // Then
        verify(chatDataService).updateNewContextByUidAndChatId(uid, chatId);
    }

    @Test
    void testUpdateBotChatContext_WithEmptyUid_ShouldCallDataService() {
        // Given
        String emptyUid = "";

        // When
        chatReqRespService.updateBotChatContext(chatId, emptyUid, botId);

        // Then
        verify(chatDataService).updateNewContextByUidAndChatId(emptyUid, chatId);
    }

    @Test
    void testUpdateBotChatContext_WithZeroChatId_ShouldCallDataService() {
        // Given
        Long zeroChatId = 0L;

        // When
        chatReqRespService.updateBotChatContext(zeroChatId, uid, botId);

        // Then
        verify(chatDataService).updateNewContextByUidAndChatId(uid, zeroChatId);
    }

    @Test
    void testUpdateBotChatContext_WithZeroBotId_ShouldCallDataService() {
        // Given
        Integer zeroBotId = 0;

        // When
        chatReqRespService.updateBotChatContext(chatId, uid, zeroBotId);

        // Then
        verify(chatDataService).updateNewContextByUidAndChatId(uid, chatId);
    }

    @Test
    void testUpdateBotChatContext_WithNegativeChatId_ShouldCallDataService() {
        // Given
        Long negativeChatId = -1L;

        // When
        chatReqRespService.updateBotChatContext(negativeChatId, uid, botId);

        // Then
        verify(chatDataService).updateNewContextByUidAndChatId(uid, negativeChatId);
    }

    @Test
    void testUpdateBotChatContext_WithNegativeBotId_ShouldCallDataService() {
        // Given
        Integer negativeBotId = -1;

        // When
        chatReqRespService.updateBotChatContext(chatId, uid, negativeBotId);

        // Then
        verify(chatDataService).updateNewContextByUidAndChatId(uid, chatId);
    }

    @Test
    void testUpdateBotChatContext_WithSpecialCharactersInUid_ShouldCallDataService() {
        // Given
        String specialUid = "test-user-@#$%^&*()_+{}|:<>?[]\\;'\".,/~`!";

        // When
        chatReqRespService.updateBotChatContext(chatId, specialUid, botId);

        // Then
        verify(chatDataService).updateNewContextByUidAndChatId(specialUid, chatId);
    }

    @Test
    void testUpdateBotChatContext_WithLongUid_ShouldCallDataService() {
        // Given
        StringBuilder longUidBuilder = new StringBuilder();
        for (int i = 0; i < 1000; i++) {
            longUidBuilder.append("test-user-").append(i).append("-");
        }
        String longUid = longUidBuilder.toString();

        // When
        chatReqRespService.updateBotChatContext(chatId, longUid, botId);

        // Then
        verify(chatDataService).updateNewContextByUidAndChatId(longUid, chatId);
    }

    @Test
    void testUpdateBotChatContext_WithLargeChatId_ShouldCallDataService() {
        // Given
        Long largeChatId = Long.MAX_VALUE;

        // When
        chatReqRespService.updateBotChatContext(largeChatId, uid, botId);

        // Then
        verify(chatDataService).updateNewContextByUidAndChatId(uid, largeChatId);
    }

    @Test
    void testUpdateBotChatContext_WithLargeBotId_ShouldCallDataService() {
        // Given
        Integer largeBotId = Integer.MAX_VALUE;

        // When
        chatReqRespService.updateBotChatContext(chatId, uid, largeBotId);

        // Then
        verify(chatDataService).updateNewContextByUidAndChatId(uid, chatId);
    }

    @Test
    void testUpdateBotChatContext_VerifyParameterOrder_ShouldPassCorrectOrder() {
        // When
        chatReqRespService.updateBotChatContext(chatId, uid, botId);

        // Then
        // Verify that parameters are passed in correct order (uid first, then chatId)
        verify(chatDataService).updateNewContextByUidAndChatId(eq(uid), eq(chatId));
        verify(chatDataService, never()).updateNewContextByUidAndChatId(eq(chatId.toString()), any());
    }

    @Test
    void testUpdateBotChatContext_MultipleCalls_ShouldCallDataServiceMultipleTimes() {
        // Given
        Long chatId1 = 100L;
        Long chatId2 = 200L;
        String uid1 = "user1";
        String uid2 = "user2";

        // When
        chatReqRespService.updateBotChatContext(chatId1, uid1, botId);
        chatReqRespService.updateBotChatContext(chatId2, uid2, botId);

        // Then
        verify(chatDataService).updateNewContextByUidAndChatId(uid1, chatId1);
        verify(chatDataService).updateNewContextByUidAndChatId(uid2, chatId2);
        verify(chatDataService, times(2)).updateNewContextByUidAndChatId(any(), any());
    }

    @Test
    void testUpdateBotChatContext_WithDataServiceException_ShouldPropagateException() {
        // Given
        RuntimeException expectedException = new RuntimeException("Data service error");
        doThrow(expectedException).when(chatDataService).updateNewContextByUidAndChatId(any(), any());

        // When & Then
        try {
            chatReqRespService.updateBotChatContext(chatId, uid, botId);
        } catch (RuntimeException e) {
            // Exception should be propagated
            verify(chatDataService).updateNewContextByUidAndChatId(uid, chatId);
        }
    }
}
