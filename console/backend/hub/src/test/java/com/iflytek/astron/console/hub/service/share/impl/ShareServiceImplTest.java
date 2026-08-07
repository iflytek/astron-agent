package com.iflytek.astron.console.hub.service.share.impl;

import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.dto.bot.BotDetail;
import com.iflytek.astron.console.commons.entity.space.AgentShareRecord;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.service.bot.ChatBotDataService;
import com.iflytek.astron.console.hub.data.ShareDataService;
import com.iflytek.astron.console.hub.util.Md5Util;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * ShareServiceImpl
 */
@ExtendWith(MockitoExtension.class)
class ShareServiceImplTest {

    @Mock
    private ChatBotDataService chatBotDataService;

    @Mock
    private ShareDataService shareDataService;

    @InjectMocks
    private ShareServiceImpl shareService;

    private Long testRelatedId;
    private String testUid;
    private int testRelatedType;
    private String testShareKey;

    @BeforeEach
    void setUp() {
        testRelatedId = 12345L;
        testUid = "test-uid-123";
        testRelatedType = 1;
        testShareKey = "test-share-key-123";
    }

    @Test
    void getBotStatus_ShouldReturnBotStatus_WhenBotDetailExists() {
        // Given
        BotDetail botDetail = new BotDetail();
        botDetail.setBotStatus(1);
        when(chatBotDataService.getBotDetail(testRelatedId)).thenReturn(botDetail);

        // When
        int result = shareService.getBotStatus(testRelatedId);

        // Then
        assertEquals(1, result);
        verify(chatBotDataService).getBotDetail(testRelatedId);
    }

    @Test
    void getBotStatus_ShouldThrowBusinessException_WhenBotDetailIsNull() {
        // Given
        when(chatBotDataService.getBotDetail(testRelatedId)).thenReturn(null);

        // When & Then
        BusinessException exception = assertThrows(BusinessException.class,
            () -> shareService.getBotStatus(testRelatedId));

        assertEquals(ResponseEnum.BOT_STATUS_INVALID, exception.getResponseEnum());
        verify(chatBotDataService).getBotDetail(testRelatedId);
    }

    @Test
    void getShareKey_ShouldReturnExistingKey_WhenActiveShareRecordExists() {
        // Given
        AgentShareRecord existingRecord = new AgentShareRecord();
        existingRecord.setShareKey(testShareKey);
        when(shareDataService.findActiveShareRecord(testUid, testRelatedType, testRelatedId))
                .thenReturn(existingRecord);

        // When
        String result = shareService.getShareKey(testUid, testRelatedType, testRelatedId);

        // Then
        assertEquals(testShareKey, result);
        verify(shareDataService).findActiveShareRecord(testUid, testRelatedType, testRelatedId);
        verify(shareDataService, never()).createShareRecord(anyString(), anyLong(), anyString(), anyInt());
    }

    @Test
    void getShareKey_ShouldGenerateNewKey_WhenNoActiveShareRecordExists() {
        // Given
        String expectedGeneratedKey = "generated-md5-key";
        when(shareDataService.findActiveShareRecord(testUid, testRelatedType, testRelatedId))
                .thenReturn(null);

        try (MockedStatic<Md5Util> md5UtilMock = mockStatic(Md5Util.class)) {
            // Mock MD5 encryption to return our expected key regardless of input
            md5UtilMock.when(() -> Md5Util.encryption(anyString())).thenReturn(expectedGeneratedKey);

            // When
            String result = shareService.getShareKey(testUid, testRelatedType, testRelatedId);

            // Then
            assertEquals(expectedGeneratedKey, result);
            verify(shareDataService).findActiveShareRecord(testUid, testRelatedType, testRelatedId);
            verify(shareDataService).createShareRecord(testUid, testRelatedId, expectedGeneratedKey, testRelatedType);

            // Verify that MD5 encryption was called with a string containing the expected components
            md5UtilMock.verify(() -> Md5Util.encryption(argThat(input -> input.contains(testRelatedId.toString()) &&
                    input.contains("_salt_") &&
                    input.contains(testUid))));
        }
    }

    @Test
    void getShareByKey_ShouldReturnAgentShareRecord_WhenShareKeyExists() {
        // Given
        AgentShareRecord expectedRecord = new AgentShareRecord();
        expectedRecord.setShareKey(testShareKey);
        expectedRecord.setUid(testUid);
        expectedRecord.setBaseId(testRelatedId);
        when(shareDataService.findByShareKey(testShareKey)).thenReturn(expectedRecord);

        // When
        AgentShareRecord result = shareService.getShareByKey(testShareKey);

        // Then
        assertNotNull(result);
        assertEquals(testShareKey, result.getShareKey());
        assertEquals(testUid, result.getUid());
        assertEquals(testRelatedId, result.getBaseId());
        verify(shareDataService).findByShareKey(testShareKey);
    }

    @Test
    void getShareByKey_ShouldReturnNull_WhenShareKeyDoesNotExist() {
        // Given
        when(shareDataService.findByShareKey(testShareKey)).thenReturn(null);

        // When
        AgentShareRecord result = shareService.getShareByKey(testShareKey);

        // Then
        assertNull(result);
        verify(shareDataService).findByShareKey(testShareKey);
    }

    @Test
    void getShareKey_ShouldGenerateUniqueKeys_WhenCalledMultipleTimes() {
        // Given
        when(shareDataService.findActiveShareRecord(testUid, testRelatedType, testRelatedId))
            .thenReturn(null);

        try (MockedStatic<Md5Util> md5UtilMock = mockStatic(Md5Util.class)) {
            String firstKey = "first-generated-key";
            String secondKey = "second-generated-key";

            md5UtilMock.when(() -> Md5Util.encryption(anyString()))
                .thenReturn(firstKey)
                .thenReturn(secondKey);

            // When
            String firstResult = shareService.getShareKey(testUid, testRelatedType, testRelatedId);
            String secondResult = shareService.getShareKey("different-uid", testRelatedType, testRelatedId);

            // Then
            assertEquals(firstKey, firstResult);
            assertEquals(secondKey, secondResult);

            // Verify MD5 encryption was called twice with different inputs
            md5UtilMock.verify(() -> Md5Util.encryption(anyString()), times(2));
        }
    }

    @Test
    void getShareKey_ShouldPassCorrectParametersToCreateShareRecord() {
        // Given
        when(shareDataService.findActiveShareRecord(testUid, testRelatedType, testRelatedId))
            .thenReturn(null);

        try (MockedStatic<Md5Util> md5UtilMock = mockStatic(Md5Util.class)) {
            String generatedKey = "new-generated-key";
            md5UtilMock.when(() -> Md5Util.encryption(anyString())).thenReturn(generatedKey);

            // When
            shareService.getShareKey(testUid, testRelatedType, testRelatedId);

            // Then
            verify(shareDataService).createShareRecord(
                eq(testUid),
                eq(testRelatedId),
                eq(generatedKey),
                eq(testRelatedType)
            );
        }
    }
}
