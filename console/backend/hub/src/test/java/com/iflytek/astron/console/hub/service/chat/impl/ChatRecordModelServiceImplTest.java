package com.iflytek.astron.console.hub.service.chat.impl;

import com.iflytek.astron.console.commons.service.data.ChatDataService;
import com.iflytek.astron.console.commons.entity.chat.ChatReasonRecords;
import com.iflytek.astron.console.commons.entity.chat.ChatReqRecords;
import com.iflytek.astron.console.commons.entity.chat.ChatRespRecords;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatRecordModelServiceImplTest {

    @InjectMocks
    private ChatRecordModelServiceImpl chatRecordModelService;

    @Mock
    private ChatDataService chatDataService;

    private ChatReqRecords chatReqRecords;
    private StringBuffer thinkingResult;
    private StringBuffer finalResult;
    private StringBuffer sid;

    @BeforeEach
    void setUp() {
        // Setup test chat request records
        chatReqRecords = new ChatReqRecords();
        chatReqRecords.setId(1L);
        chatReqRecords.setUid("test-user-123");
        chatReqRecords.setChatId(100L);
        chatReqRecords.setMessage("Test question");
        chatReqRecords.setCreateTime(LocalDateTime.now());

        // Setup test string buffers
        thinkingResult = new StringBuffer("This is the thinking process for the AI response");
        finalResult = new StringBuffer("This is the final AI response");
        sid = new StringBuffer("session-id-12345");
    }

    @Test
    void testSaveThinkingResult_WithEmptyThinkingResult_ShouldReturnEarly() {
        // Given
        StringBuffer emptyThinkingResult = new StringBuffer("");

        // When
        chatRecordModelService.saveThinkingResult(chatReqRecords, emptyThinkingResult, false);

        // Then
        // Should return early without any database operations
        verifyNoInteractions(chatDataService);
    }

    @Test
    void testSaveThinkingResult_CreateMode_ShouldCreateNewRecord() {
        // Given
        boolean editMode = false;

        // When
        chatRecordModelService.saveThinkingResult(chatReqRecords, thinkingResult, editMode);

        // Then
        ArgumentCaptor<ChatReasonRecords> reasonRecordsCaptor = ArgumentCaptor.forClass(ChatReasonRecords.class);
        verify(chatDataService).createReasonRecord(reasonRecordsCaptor.capture());

        ChatReasonRecords capturedRecord = reasonRecordsCaptor.getValue();
        assertEquals("test-user-123", capturedRecord.getUid());
        assertEquals(100L, capturedRecord.getChatId());
        assertEquals(1L, capturedRecord.getReqId());
        assertEquals("This is the thinking process for the AI response", capturedRecord.getContent());
        assertEquals("spark_reasoning", capturedRecord.getType());
        assertEquals(0L, capturedRecord.getThinkingElapsedSecs());
        assertNotNull(capturedRecord.getCreateTime());
        assertNotNull(capturedRecord.getUpdateTime());
    }

    @Test
    void testSaveThinkingResult_EditModeWithExistingRecord_ShouldUpdateRecord() {
        // Given
        boolean editMode = true;
        ChatReasonRecords existingRecord = new ChatReasonRecords();
        existingRecord.setId(1L);
        existingRecord.setUid("test-user-123");
        existingRecord.setChatId(100L);
        existingRecord.setReqId(1L);
        existingRecord.setContent("Old thinking content");
        existingRecord.setCreateTime(LocalDateTime.now().minusMinutes(5));

        when(chatDataService.findReasonByUidAndChatIdAndReqId("test-user-123", 100L, 1L))
                .thenReturn(existingRecord);

        // When
        chatRecordModelService.saveThinkingResult(chatReqRecords, thinkingResult, editMode);

        // Then
        verify(chatDataService).findReasonByUidAndChatIdAndReqId("test-user-123", 100L, 1L);
        verify(chatDataService).updateReasonByUidAndChatIdAndReqId(existingRecord);

        assertEquals("This is the thinking process for the AI response", existingRecord.getContent());
        assertNotNull(existingRecord.getUpdateTime());
    }

    @Test
    void testSaveThinkingResult_EditModeWithNoExistingRecord_ShouldNotUpdate() {
        // Given
        boolean editMode = true;
        when(chatDataService.findReasonByUidAndChatIdAndReqId("test-user-123", 100L, 1L))
                .thenReturn(null);

        // When
        chatRecordModelService.saveThinkingResult(chatReqRecords, thinkingResult, editMode);

        // Then
        verify(chatDataService).findReasonByUidAndChatIdAndReqId("test-user-123", 100L, 1L);
        verify(chatDataService, never()).updateReasonByUidAndChatIdAndReqId(any());
        verify(chatDataService, never()).createReasonRecord(any());
    }

    @Test
    void testSaveThinkingResult_CreateModeWithLongContent_ShouldCreateWithFullContent() {
        // Given
        StringBuffer longThinkingResult = new StringBuffer();
        for (int i = 0; i < 1000; i++) {
            longThinkingResult.append("This is a very long thinking process content. ");
        }
        boolean editMode = false;

        // When
        chatRecordModelService.saveThinkingResult(chatReqRecords, longThinkingResult, editMode);

        // Then
        ArgumentCaptor<ChatReasonRecords> reasonRecordsCaptor = ArgumentCaptor.forClass(ChatReasonRecords.class);
        verify(chatDataService).createReasonRecord(reasonRecordsCaptor.capture());

        ChatReasonRecords capturedRecord = reasonRecordsCaptor.getValue();
        assertEquals(longThinkingResult.toString(), capturedRecord.getContent());
        assertTrue(capturedRecord.getContent().length() > 40000); // Verify it's actually long
    }

    @Test
    void testSaveChatResponse_CreateMode_ShouldCreateNewResponse() {
        // Given
        boolean editMode = false;
        Integer answerType = 1;

        // When
        chatRecordModelService.saveChatResponse(chatReqRecords, finalResult, sid, editMode, answerType);

        // Then
        ArgumentCaptor<ChatRespRecords> respRecordsCaptor = ArgumentCaptor.forClass(ChatRespRecords.class);
        verify(chatDataService).createResponse(respRecordsCaptor.capture());

        ChatRespRecords capturedRecord = respRecordsCaptor.getValue();
        assertEquals("test-user-123", capturedRecord.getUid());
        assertEquals(100L, capturedRecord.getChatId());
        assertEquals(1L, capturedRecord.getReqId());
        assertEquals("This is the final AI response", capturedRecord.getMessage());
        assertEquals("session-id-12345", capturedRecord.getSid());
        assertEquals(answerType, capturedRecord.getAnswerType());
        assertNotNull(capturedRecord.getCreateTime());
        assertNotNull(capturedRecord.getUpdateTime());

        // Verify date stamp is current date in yyyyMMdd format
        int expectedDateStamp = Integer.parseInt(LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")));
        assertEquals(expectedDateStamp, capturedRecord.getDateStamp());
    }

    @Test
    void testSaveChatResponse_EditModeWithExistingRecord_ShouldUpdateRecord() {
        // Given
        boolean editMode = true;
        Integer answerType = 2;
        ChatRespRecords existingRecord = new ChatRespRecords();
        existingRecord.setId(1L);
        existingRecord.setUid("test-user-123");
        existingRecord.setChatId(100L);
        existingRecord.setReqId(1L);
        existingRecord.setMessage("Old response message");
        existingRecord.setSid("old-session-id");
        existingRecord.setAnswerType(1);
        existingRecord.setCreateTime(LocalDateTime.now().minusMinutes(5));

        when(chatDataService.findResponseByUidAndChatIdAndReqId("test-user-123", 100L, 1L))
                .thenReturn(existingRecord);

        // When
        chatRecordModelService.saveChatResponse(chatReqRecords, finalResult, sid, editMode, answerType);

        // Then
        verify(chatDataService).findResponseByUidAndChatIdAndReqId("test-user-123", 100L, 1L);
        verify(chatDataService).updateByUidAndChatIdAndReqId(existingRecord);

        assertEquals("This is the final AI response", existingRecord.getMessage());
        assertEquals("session-id-12345", existingRecord.getSid());
        assertEquals(answerType, existingRecord.getAnswerType());
        assertNotNull(existingRecord.getUpdateTime());

        // Verify date stamp is updated to current date
        int expectedDateStamp = Integer.parseInt(LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")));
        assertEquals(expectedDateStamp, existingRecord.getDateStamp());
    }

    @Test
    void testSaveChatResponse_EditModeWithNoExistingRecord_ShouldNotUpdate() {
        // Given
        boolean editMode = true;
        Integer answerType = 1;
        when(chatDataService.findResponseByUidAndChatIdAndReqId("test-user-123", 100L, 1L))
                .thenReturn(null);

        // When
        chatRecordModelService.saveChatResponse(chatReqRecords, finalResult, sid, editMode, answerType);

        // Then
        verify(chatDataService).findResponseByUidAndChatIdAndReqId("test-user-123", 100L, 1L);
        verify(chatDataService, never()).updateByUidAndChatIdAndReqId(any());
        verify(chatDataService, never()).createResponse(any());
    }

    @Test
    void testSaveChatResponse_WithNullAnswerType_ShouldCreateWithNullAnswerType() {
        // Given
        boolean editMode = false;
        Integer answerType = null;

        // When
        chatRecordModelService.saveChatResponse(chatReqRecords, finalResult, sid, editMode, answerType);

        // Then
        ArgumentCaptor<ChatRespRecords> respRecordsCaptor = ArgumentCaptor.forClass(ChatRespRecords.class);
        verify(chatDataService).createResponse(respRecordsCaptor.capture());

        ChatRespRecords capturedRecord = respRecordsCaptor.getValue();
        assertNull(capturedRecord.getAnswerType());
    }

    @Test
    void testSaveChatResponse_WithEmptyStringBuffers_ShouldCreateWithEmptyValues() {
        // Given
        boolean editMode = false;
        Integer answerType = 1;
        StringBuffer emptyFinalResult = new StringBuffer("");
        StringBuffer emptySid = new StringBuffer("");

        // When
        chatRecordModelService.saveChatResponse(chatReqRecords, emptyFinalResult, emptySid, editMode, answerType);

        // Then
        ArgumentCaptor<ChatRespRecords> respRecordsCaptor = ArgumentCaptor.forClass(ChatRespRecords.class);
        verify(chatDataService).createResponse(respRecordsCaptor.capture());

        ChatRespRecords capturedRecord = respRecordsCaptor.getValue();
        assertEquals("", capturedRecord.getMessage());
        assertEquals("", capturedRecord.getSid());
    }

    @Test
    void testSaveChatResponse_WithLongContent_ShouldCreateWithFullContent() {
        // Given
        boolean editMode = false;
        Integer answerType = 1;
        StringBuffer longFinalResult = new StringBuffer();
        StringBuffer longSid = new StringBuffer();

        for (int i = 0; i < 500; i++) {
            longFinalResult.append("This is a very long final response content. ");
            longSid.append("very-long-session-id-");
        }

        // When
        chatRecordModelService.saveChatResponse(chatReqRecords, longFinalResult, longSid, editMode, answerType);

        // Then
        ArgumentCaptor<ChatRespRecords> respRecordsCaptor = ArgumentCaptor.forClass(ChatRespRecords.class);
        verify(chatDataService).createResponse(respRecordsCaptor.capture());

        ChatRespRecords capturedRecord = respRecordsCaptor.getValue();
        assertEquals(longFinalResult.toString(), capturedRecord.getMessage());
        assertEquals(longSid.toString(), capturedRecord.getSid());
        assertTrue(capturedRecord.getMessage().length() > 20000); // Verify it's actually long
        assertTrue(capturedRecord.getSid().length() > 10000); // Verify it's actually long
    }

    @Test
    void testSaveChatResponse_WithSpecialCharacters_ShouldCreateWithSpecialCharacters() {
        // Given
        boolean editMode = false;
        Integer answerType = 1;
        StringBuffer specialFinalResult = new StringBuffer("Response with special chars: \"quotes\", {brackets}, [arrays], & symbols! 中文内容 🚀");
        StringBuffer specialSid = new StringBuffer("session-id-with-special-chars-@#$%^&*()");

        // When
        chatRecordModelService.saveChatResponse(chatReqRecords, specialFinalResult, specialSid, editMode, answerType);

        // Then - Verify Chinese content is preserved correctly
        ArgumentCaptor<ChatRespRecords> respRecordsCaptor = ArgumentCaptor.forClass(ChatRespRecords.class);
        verify(chatDataService).createResponse(respRecordsCaptor.capture());

        ChatRespRecords capturedRecord = respRecordsCaptor.getValue();
        assertEquals("Response with special chars: \"quotes\", {brackets}, [arrays], & symbols! 中文内容 🚀", capturedRecord.getMessage());
        assertEquals("session-id-with-special-chars-@#$%^&*()", capturedRecord.getSid());
    }

    @Test
    void testSaveThinkingResult_WithSpecialCharacters_ShouldCreateWithSpecialCharacters() {
        // Given
        boolean editMode = false;
        // Test data with special characters and Chinese thinking content: "中文思考" means "Chinese thinking"
        StringBuffer specialThinkingResult = new StringBuffer("Thinking with special chars: \"quotes\", {brackets}, [arrays], & symbols! 中文思考 🤔");

        // When
        chatRecordModelService.saveThinkingResult(chatReqRecords, specialThinkingResult, editMode);

        // Then - Verify Chinese thinking content is preserved correctly
        ArgumentCaptor<ChatReasonRecords> reasonRecordsCaptor = ArgumentCaptor.forClass(ChatReasonRecords.class);
        verify(chatDataService).createReasonRecord(reasonRecordsCaptor.capture());

        ChatReasonRecords capturedRecord = reasonRecordsCaptor.getValue();
        assertEquals("Thinking with special chars: \"quotes\", {brackets}, [arrays], & symbols! 中文思考 🤔", capturedRecord.getContent());
    }

    @Test
    void testSaveThinkingResult_EditModeMultipleCalls_ShouldUpdateSameRecord() {
        // Given
        boolean editMode = true;
        ChatReasonRecords existingRecord = new ChatReasonRecords();
        existingRecord.setId(1L);
        existingRecord.setUid("test-user-123");
        existingRecord.setChatId(100L);
        existingRecord.setReqId(1L);
        existingRecord.setContent("Initial thinking content");
        existingRecord.setCreateTime(LocalDateTime.now().minusMinutes(5));

        when(chatDataService.findReasonByUidAndChatIdAndReqId("test-user-123", 100L, 1L))
                .thenReturn(existingRecord);

        StringBuffer firstUpdate = new StringBuffer("First update to thinking");
        StringBuffer secondUpdate = new StringBuffer("Second update to thinking");

        // When - First update
        chatRecordModelService.saveThinkingResult(chatReqRecords, firstUpdate, editMode);

        // Then - Verify first update
        verify(chatDataService, times(1)).updateReasonByUidAndChatIdAndReqId(existingRecord);
        assertEquals("First update to thinking", existingRecord.getContent());

        // When - Second update
        chatRecordModelService.saveThinkingResult(chatReqRecords, secondUpdate, editMode);

        // Then - Verify second update
        verify(chatDataService, times(2)).updateReasonByUidAndChatIdAndReqId(existingRecord);
        assertEquals("Second update to thinking", existingRecord.getContent());
    }

    @Test
    void testSaveChatResponse_EditModeMultipleCalls_ShouldUpdateSameRecord() {
        // Given
        boolean editMode = true;
        Integer answerType = 1;
        ChatRespRecords existingRecord = new ChatRespRecords();
        existingRecord.setId(1L);
        existingRecord.setUid("test-user-123");
        existingRecord.setChatId(100L);
        existingRecord.setReqId(1L);
        existingRecord.setMessage("Initial response message");
        existingRecord.setSid("initial-session-id");
        existingRecord.setCreateTime(LocalDateTime.now().minusMinutes(5));

        when(chatDataService.findResponseByUidAndChatIdAndReqId("test-user-123", 100L, 1L))
                .thenReturn(existingRecord);

        StringBuffer firstUpdate = new StringBuffer("First updated response");
        StringBuffer firstSid = new StringBuffer("first-updated-session-id");
        StringBuffer secondUpdate = new StringBuffer("Second updated response");
        StringBuffer secondSid = new StringBuffer("second-updated-session-id");

        // When - First update
        chatRecordModelService.saveChatResponse(chatReqRecords, firstUpdate, firstSid, editMode, answerType);

        // Then - Verify first update
        verify(chatDataService, times(1)).updateByUidAndChatIdAndReqId(existingRecord);
        assertEquals("First updated response", existingRecord.getMessage());
        assertEquals("first-updated-session-id", existingRecord.getSid());

        // When - Second update
        chatRecordModelService.saveChatResponse(chatReqRecords, secondUpdate, secondSid, editMode, answerType);

        // Then - Verify second update
        verify(chatDataService, times(2)).updateByUidAndChatIdAndReqId(existingRecord);
        assertEquals("Second updated response", existingRecord.getMessage());
        assertEquals("second-updated-session-id", existingRecord.getSid());
    }
}
