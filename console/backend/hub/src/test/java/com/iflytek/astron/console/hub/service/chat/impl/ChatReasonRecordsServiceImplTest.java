package com.iflytek.astron.console.hub.service.chat.impl;

import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.dto.chat.ChatRespModelDto;
import com.iflytek.astron.console.commons.entity.chat.ChatReasonRecords;
import com.iflytek.astron.console.commons.entity.chat.ChatTraceSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class ChatReasonRecordsServiceImplTest {

    @InjectMocks
    private ChatReasonRecordsServiceImpl chatReasonRecordsService;

    private List<ChatRespModelDto> respList;
    private List<ChatReasonRecords> reasonRecordsList;
    private List<ChatTraceSource> traceList;

    @BeforeEach
    void setUp() {
        respList = new ArrayList<>();
        reasonRecordsList = new ArrayList<>();
        traceList = new ArrayList<>();

        // Setup test response data
        ChatRespModelDto resp1 = new ChatRespModelDto();
        resp1.setId(1L);
        resp1.setReqId(10L);
        resp1.setMessage("First response");
        resp1.setCreateTime(LocalDateTime.now());
        respList.add(resp1);

        ChatRespModelDto resp2 = new ChatRespModelDto();
        resp2.setId(2L);
        resp2.setReqId(20L);
        resp2.setMessage("Second response");
        resp2.setCreateTime(LocalDateTime.now());
        respList.add(resp2);

        // Setup test reasoning records data
        ChatReasonRecords reason1 = new ChatReasonRecords();
        reason1.setId(1L);
        reason1.setReqId(10L);
        reason1.setContent("This is the reasoning for the first response");
        reason1.setThinkingElapsedSecs(2L);
        reason1.setCreateTime(LocalDateTime.now());
        reasonRecordsList.add(reason1);

        ChatReasonRecords reason2 = new ChatReasonRecords();
        reason2.setId(2L);
        reason2.setReqId(20L);
        reason2.setContent("This is the reasoning for the second response");
        reason2.setThinkingElapsedSecs(3L);
        reason2.setCreateTime(LocalDateTime.now());
        reasonRecordsList.add(reason2);

        // Setup test trace source data
        ChatTraceSource trace1 = new ChatTraceSource();
        trace1.setId(1L);
        trace1.setReqId(10L);
        trace1.setType("knowledge_base");
        traceList.add(trace1);
    }

    @Test
    void testAssembleRespReasoning_WithValidData_ShouldAssembleCorrectly() {
        // When
        chatReasonRecordsService.assembleRespReasoning(respList, reasonRecordsList, traceList);

        // Then
        assertNotNull(respList);
        assertEquals(2, respList.size());

        // Verify first response
        ChatRespModelDto firstResp = respList.getFirst();
        assertEquals("This is the reasoning for the first response", firstResp.getReasoning());
        assertEquals(2L, firstResp.getReasoningElapsedSecs());

        // Verify JSON content structure
        String content1 = firstResp.getContent();
        assertNotNull(content1);
        JSONObject json1 = JSONObject.parseObject(content1);
        assertEquals("This is the reasoning for the first response", json1.getString("text"));
        assertEquals(2, json1.getDouble("thinking_cost"));

        // Verify second response
        ChatRespModelDto secondResp = respList.get(1);
        assertEquals("This is the reasoning for the second response", secondResp.getReasoning());
        assertEquals(3L, secondResp.getReasoningElapsedSecs());

        // Verify JSON content structure
        String content2 = secondResp.getContent();
        assertNotNull(content2);
        JSONObject json2 = JSONObject.parseObject(content2);
        assertEquals("This is the reasoning for the second response", json2.getString("text"));
        assertEquals(3, json2.getDouble("thinking_cost"));
    }

    @Test
    void testAssembleRespReasoning_WithEmptyRespList_ShouldReturnEarly() {
        // Given
        List<ChatRespModelDto> emptyRespList = new ArrayList<>();

        // When
        chatReasonRecordsService.assembleRespReasoning(emptyRespList, reasonRecordsList, traceList);

        // Then
        assertTrue(emptyRespList.isEmpty());
        // No processing should occur
    }

    @Test
    void testAssembleRespReasoning_WithNullRespList_ShouldReturnEarly() {
        // When
        chatReasonRecordsService.assembleRespReasoning(null, reasonRecordsList, traceList);

        // Then
        // Should not throw exception and return early
        assertNotNull(reasonRecordsList);
    }

    @Test
    void testAssembleRespReasoning_WithEmptyReasonRecordsList_ShouldReturnEarly() {
        // Given
        List<ChatReasonRecords> emptyReasonList = new ArrayList<>();

        // When
        chatReasonRecordsService.assembleRespReasoning(respList, emptyReasonList, traceList);

        // Then
        // Original response list should remain unchanged
        assertEquals(2, respList.size());
        assertNull(respList.get(0).getReasoning());
        assertNull(respList.get(1).getReasoning());
    }

    @Test
    void testAssembleRespReasoning_WithNullReasonRecordsList_ShouldReturnEarly() {
        // When
        chatReasonRecordsService.assembleRespReasoning(respList, null, traceList);

        // Then
        // Original response list should remain unchanged
        assertEquals(2, respList.size());
        assertNull(respList.get(0).getReasoning());
        assertNull(respList.get(1).getReasoning());
    }

    @Test
    void testAssembleRespReasoning_WithMismatchedReqIds_ShouldHandleGracefully() {
        // Given - Create reason records with different reqIds
        List<ChatReasonRecords> mismatchedReasonList = new ArrayList<>();
        ChatReasonRecords reason = new ChatReasonRecords();
        reason.setId(1L);
        reason.setReqId(999L); // Different reqId that doesn't match any response
        reason.setContent("Mismatched reasoning");
        reason.setThinkingElapsedSecs(1L);
        mismatchedReasonList.add(reason);

        // When
        chatReasonRecordsService.assembleRespReasoning(respList, mismatchedReasonList, traceList);

        // Then
        // Responses should remain unchanged since no matching reqIds
        assertEquals(2, respList.size());
        assertNull(respList.get(0).getReasoning());
        assertNull(respList.get(1).getReasoning());
        assertNull(respList.get(0).getReasoningElapsedSecs());
        assertNull(respList.get(1).getReasoningElapsedSecs());
    }

    @Test
    void testAssembleRespReasoning_WithPartialMatches_ShouldUpdateMatchingOnly() {
        // Given - Only one matching reason record
        List<ChatReasonRecords> partialReasonList = new ArrayList<>();
        ChatReasonRecords reason = new ChatReasonRecords();
        reason.setId(1L);
        reason.setReqId(10L); // Only matches first response
        reason.setContent("Partial reasoning");
        reason.setThinkingElapsedSecs(1L);
        partialReasonList.add(reason);

        // When
        chatReasonRecordsService.assembleRespReasoning(respList, partialReasonList, traceList);

        // Then
        // Only first response should be updated
        assertEquals("Partial reasoning", respList.get(0).getReasoning());
        assertEquals(1L, respList.get(0).getReasoningElapsedSecs());

        // Second response should remain unchanged
        assertNull(respList.get(1).getReasoning());
        assertNull(respList.get(1).getReasoningElapsedSecs());
    }

    @Test
    void testAssembleRespReasoning_WithEmptyReasonContent_ShouldSetReasoningButNotContent() {
        // Given - Reason record with empty content
        List<ChatReasonRecords> emptyContentReasonList = new ArrayList<>();
        ChatReasonRecords reason = new ChatReasonRecords();
        reason.setId(1L);
        reason.setReqId(10L);
        reason.setContent(""); // Empty content
        reason.setThinkingElapsedSecs(1L);
        emptyContentReasonList.add(reason);

        // When
        chatReasonRecordsService.assembleRespReasoning(respList, emptyContentReasonList, traceList);

        // Then
        // Reasoning should be set to empty string
        assertEquals("", respList.getFirst().getReasoning());
        assertEquals(1L, respList.getFirst().getReasoningElapsedSecs());

        // Content should not be modified since reasoning content is empty
        assertNull(respList.getFirst().getContent());
    }

    @Test
    void testAssembleRespReasoning_WithNullReasonContent_ShouldSetReasoningButNotContent() {
        // Given - Reason record with null content
        List<ChatReasonRecords> nullContentReasonList = new ArrayList<>();
        ChatReasonRecords reason = new ChatReasonRecords();
        reason.setId(1L);
        reason.setReqId(10L);
        reason.setContent(null); // Null content
        reason.setThinkingElapsedSecs(2L);
        nullContentReasonList.add(reason);

        // When
        chatReasonRecordsService.assembleRespReasoning(respList, nullContentReasonList, traceList);

        // Then
        // Reasoning should be set to null
        assertNull(respList.getFirst().getReasoning());
        assertEquals(2L, respList.getFirst().getReasoningElapsedSecs());

        // Content should not be modified since reasoning content is null
        assertNull(respList.getFirst().getContent());
    }

    @Test
    void testAssembleRespReasoning_WithDuplicateReqIds_ShouldUseLatestReplacement() {
        // Given - Multiple reason records with same reqId (should use replacement strategy)
        List<ChatReasonRecords> duplicateReasonList = new ArrayList<>();

        ChatReasonRecords reason1 = new ChatReasonRecords();
        reason1.setId(1L);
        reason1.setReqId(10L);
        reason1.setContent("First reasoning");
        reason1.setThinkingElapsedSecs(1L);
        duplicateReasonList.add(reason1);

        ChatReasonRecords reason2 = new ChatReasonRecords();
        reason2.setId(2L);
        reason2.setReqId(10L); // Same reqId - should replace first one
        reason2.setContent("Second reasoning");
        reason2.setThinkingElapsedSecs(2L);
        duplicateReasonList.add(reason2);

        // When
        chatReasonRecordsService.assembleRespReasoning(respList, duplicateReasonList, traceList);

        // Then
        // Should use the replacement (second) reasoning
        assertEquals("Second reasoning", respList.getFirst().getReasoning());
        assertEquals(2L, respList.getFirst().getReasoningElapsedSecs());

        // Verify JSON content uses replacement values
        String content = respList.getFirst().getContent();
        assertNotNull(content);
        JSONObject json = JSONObject.parseObject(content);
        assertEquals("Second reasoning", json.getString("text"));
        assertEquals(2.0, json.getDouble("thinking_cost"));
    }

    @Test
    void testAssembleRespReasoning_WithZeroThinkingCost_ShouldHandleCorrectly() {
        // Given - Reason record with zero thinking cost
        List<ChatReasonRecords> zeroThinkingReasonList = new ArrayList<>();
        ChatReasonRecords reason = new ChatReasonRecords();
        reason.setId(1L);
        reason.setReqId(10L);
        reason.setContent("Zero cost reasoning");
        reason.setThinkingElapsedSecs(0L);
        zeroThinkingReasonList.add(reason);

        // When
        chatReasonRecordsService.assembleRespReasoning(respList, zeroThinkingReasonList, traceList);

        // Then
        assertEquals("Zero cost reasoning", respList.getFirst().getReasoning());
        assertEquals(0L, respList.getFirst().getReasoningElapsedSecs());

        // Verify JSON content handles zero cost correctly
        String content = respList.getFirst().getContent();
        assertNotNull(content);
        JSONObject json = JSONObject.parseObject(content);
        assertEquals("Zero cost reasoning", json.getString("text"));
        assertEquals(0.0, json.getDouble("thinking_cost"));
    }

    @Test
    void testAssembleRespReasoning_WithSpecialCharactersInContent_ShouldHandleCorrectly() {
        // Given - Reason record with special characters
        List<ChatReasonRecords> specialCharReasonList = new ArrayList<>();
        ChatReasonRecords reason = new ChatReasonRecords();
        reason.setId(1L);
        reason.setReqId(10L);
        reason.setContent("Reasoning with special chars: \"quotes\", {brackets}, [arrays], & symbols!");
        reason.setThinkingElapsedSecs(1L);
        specialCharReasonList.add(reason);

        // When
        chatReasonRecordsService.assembleRespReasoning(respList, specialCharReasonList, traceList);

        // Then
        String expectedContent = "Reasoning with special chars: \"quotes\", {brackets}, [arrays], & symbols!";
        assertEquals(expectedContent, respList.getFirst().getReasoning());
        assertEquals(1L, respList.getFirst().getReasoningElapsedSecs());

        // Verify JSON content properly escapes special characters
        String content = respList.getFirst().getContent();
        assertNotNull(content);
        JSONObject json = JSONObject.parseObject(content);
        assertEquals(expectedContent, json.getString("text"));
        assertEquals(1, json.getDouble("thinking_cost"));
    }
}
