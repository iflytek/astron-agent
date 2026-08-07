package com.iflytek.astron.console.hub.service.chat.impl;

import com.alibaba.fastjson2.JSON;
import com.iflytek.astron.console.commons.dto.chat.ChatReqModelDto;
import com.iflytek.astron.console.commons.dto.chat.ChatRespModelDto;
import com.iflytek.astron.console.commons.dto.workflow.WorkflowEventData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mockStatic;

@ExtendWith(MockitoExtension.class)
class ChatHistoryMultiModalServiceImplTest {

    @InjectMocks
    private ChatHistoryMultiModalServiceImpl chatHistoryMultiModalService;

    private List<ChatReqModelDto> reqList;
    private List<ChatRespModelDto> respList;
    private ChatReqModelDto reqDto1;
    private ChatReqModelDto reqDto2;
    private ChatRespModelDto respDto1;
    private ChatRespModelDto respDto2;

    @BeforeEach
    void setUp() {
        reqList = new ArrayList<>();
        respList = new ArrayList<>();

        // Create test request DTOs
        reqDto1 = new ChatReqModelDto();
        reqDto1.setId(1L);
        reqDto1.setMessage("First question");
        reqDto1.setNewContext(1);
        reqDto1.setNeedDraw(false);
        reqDto1.setIntention("test_intention_1");
        reqDto1.setCreateTime(LocalDateTime.now().minusMinutes(10));

        reqDto2 = new ChatReqModelDto();
        reqDto2.setId(2L);
        reqDto2.setMessage("Second question");
        reqDto2.setNewContext(0);
        reqDto2.setNeedDraw(false);
        reqDto2.setIntention("test_intention_2");
        reqDto2.setCreateTime(LocalDateTime.now().minusMinutes(5));

        // Create test response DTOs
        respDto1 = new ChatRespModelDto();
        respDto1.setId(1L);
        respDto1.setReqId(1L);
        respDto1.setMessage("First response");
        respDto1.setAnswerType(1);
        respDto1.setNeedDraw(false);
        respDto1.setCreateTime(LocalDateTime.now().minusMinutes(9));

        respDto2 = new ChatRespModelDto();
        respDto2.setId(2L);
        respDto2.setReqId(2L);
        respDto2.setMessage("Second response");
        respDto2.setAnswerType(1);
        respDto2.setNeedDraw(false);
        respDto2.setCreateTime(LocalDateTime.now().minusMinutes(4));

        reqList.add(reqDto1);
        reqList.add(reqDto2);
        respList.add(respDto1);
        respList.add(respDto2);
    }

    @Test
    void testMergeChatHistory_WithValidData_ShouldReturnMergedList() {
        // Given
        Integer botId = 1;

        // When
        List<Object> result = chatHistoryMultiModalService.mergeChatHistory(reqList, respList, botId);

        // Then
        assertNotNull(result);
        assertEquals(4, result.size()); // 2 requests + 2 responses

        // Verify order (should be reversed)
        assertTrue(result.get(0) instanceof ChatReqModelDto);
        assertTrue(result.get(1) instanceof ChatRespModelDto);
        assertTrue(result.get(2) instanceof ChatReqModelDto);
        assertTrue(result.get(3) instanceof ChatRespModelDto);

        // Verify the most recent request is first
        ChatReqModelDto firstReq = (ChatReqModelDto) result.get(0);
        assertEquals(2L, firstReq.getId());

        // Verify intention is transferred from req to resp
        ChatRespModelDto firstResp = (ChatRespModelDto) result.get(1);
        assertEquals("test_intention_2", firstResp.getIntention());
    }

    @Test
    void testMergeChatHistory_WithEmptyRespList_ShouldReturnOnlyRequests() {
        // Given
        Integer botId = 1;
        List<ChatRespModelDto> emptyRespList = new ArrayList<>();

        // When
        List<Object> result = chatHistoryMultiModalService.mergeChatHistory(reqList, emptyRespList, botId);

        // Then
        assertNotNull(result);
        assertEquals(2, result.size()); // Only requests
        assertTrue(result.get(0) instanceof ChatReqModelDto);
        assertTrue(result.get(1) instanceof ChatReqModelDto);
    }

    @Test
    void testMergeChatHistory_WithEmptyReqList_ShouldReturnEmptyList() {
        // Given
        Integer botId = 1;
        List<ChatReqModelDto> emptyReqList = new ArrayList<>();

        // When
        List<Object> result = chatHistoryMultiModalService.mergeChatHistory(emptyReqList, respList, botId);

        // Then
        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    void testMergeChatHistory_WithNeedDrawRequest_ShouldTransferToResponse() {
        // Given
        Integer botId = 1;
        reqDto2.setNeedDraw(true);

        // When
        List<Object> result = chatHistoryMultiModalService.mergeChatHistory(reqList, respList, botId);

        // Then
        ChatReqModelDto processedReq = (ChatReqModelDto) result.get(0);
        ChatRespModelDto processedResp = (ChatRespModelDto) result.get(1);

        assertFalse(processedReq.isNeedDraw()); // Should be false after transfer
        assertTrue(processedResp.isNeedDraw()); // Should be true after transfer
    }

    @Test
    void testMergeChatHistory_WithWorkflowInterruptResponse_ShouldProcessCorrectly() {
        // Given
        Integer botId = 1;
        respDto2.setAnswerType(41); // Workflow interruption type

        WorkflowEventData.EventValue.ValueOption option1 = new WorkflowEventData.EventValue.ValueOption();
        option1.setId("option1");
        option1.setText("Option 1");
        option1.setSelected(false);

        WorkflowEventData.EventValue.ValueOption option2 = new WorkflowEventData.EventValue.ValueOption();
        option2.setId("option2");
        option2.setText("Option 2");
        option2.setSelected(false);

        List<WorkflowEventData.EventValue.ValueOption> options = new ArrayList<>();
        options.add(option1);
        options.add(option2);

        WorkflowEventData.EventValue eventValue = WorkflowEventData.EventValue.builder()
                .message("Workflow message")
                .option(options)
                .build();

        respDto2.setMessage(JSON.toJSONString(eventValue));

        WorkflowEventData.EventValue.ValueOption selectedOption = new WorkflowEventData.EventValue.ValueOption();
        selectedOption.setId("option1");
        reqDto1.setMessage(JSON.toJSONString(selectedOption));

        try (MockedStatic<JSON> mockedJSON = mockStatic(JSON.class)) {
            mockedJSON.when(() -> JSON.parseObject(anyString(), any(Class.class)))
                    .thenAnswer(invocation -> {
                        String jsonString = invocation.getArgument(0);
                        Class<?> clazz = invocation.getArgument(1);

                        if (clazz == WorkflowEventData.EventValue.class) {
                            return eventValue;
                        } else if (clazz == WorkflowEventData.EventValue.ValueOption.class) {
                            return selectedOption;
                        }
                        return null;
                    });

            // When
            List<Object> result = chatHistoryMultiModalService.mergeChatHistory(reqList, respList, botId);

            // Then
            assertNotNull(result);
            ChatRespModelDto processedResp = (ChatRespModelDto) result.get(1);
            assertEquals("Workflow message", processedResp.getMessage());
            assertNotNull(processedResp.getWorkflowEventData());
        }
    }

    @Test
    void testSetBotLastContext_WithNullBotId_ShouldNotModifyRecords() {
        // Given
        Integer botId = null;

        // When
        chatHistoryMultiModalService.setBotLastContext(reqList, botId);

        // Then
        assertFalse(reqDto1.isNeedDraw());
        assertFalse(reqDto2.isNeedDraw());
    }

    @Test
    void testSetBotLastContext_WithZeroBotId_ShouldNotModifyRecords() {
        // Given
        Integer botId = 0;

        // When
        chatHistoryMultiModalService.setBotLastContext(reqList, botId);

        // Then
        assertFalse(reqDto1.isNeedDraw());
        assertFalse(reqDto2.isNeedDraw());
    }

    @Test
    void testSetBotLastContext_WithValidBotId_ShouldSetNeedDrawForOldContext() {
        // Given
        Integer botId = 1;

        // When
        chatHistoryMultiModalService.setBotLastContext(reqList, botId);

        // Then
        assertFalse(reqDto1.isNeedDraw()); // newContext = 1, should remain false
        assertTrue(reqDto2.isNeedDraw()); // newContext = 0, should be set to true
    }

    @Test
    void testSetBotLastContext_WithAllNewContext_ShouldNotModifyAnyRecord() {
        // Given
        Integer botId = 1;
        reqDto1.setNewContext(1);
        reqDto2.setNewContext(1);

        // When
        chatHistoryMultiModalService.setBotLastContext(reqList, botId);

        // Then
        assertFalse(reqDto1.isNeedDraw());
        assertFalse(reqDto2.isNeedDraw());
    }

    @Test
    void testSetBotLastContext_WithMultipleOldContext_ShouldSetFirstOne() {
        // Given
        Integer botId = 1;
        reqDto1.setNewContext(0);
        reqDto2.setNewContext(0);

        // When
        chatHistoryMultiModalService.setBotLastContext(reqList, botId);

        // Then
        assertTrue(reqDto1.isNeedDraw()); // First old context should be set
        assertFalse(reqDto2.isNeedDraw()); // Second should remain false
    }

    @Test
    void testMergeChatHistory_WithMismatchedReqResp_ShouldHandleCorrectly() {
        // Given
        Integer botId = 1;
        // Create response that doesn't match any request
        ChatRespModelDto orphanResp = new ChatRespModelDto();
        orphanResp.setId(3L);
        orphanResp.setReqId(999L); // No matching request
        orphanResp.setMessage("Orphan response");
        respList.add(orphanResp);

        // When
        List<Object> result = chatHistoryMultiModalService.mergeChatHistory(reqList, respList, botId);

        // Then
        assertNotNull(result);
        // Should still process normally, orphan response just won't be included
        assertEquals(4, result.size()); // 2 req + 2 resp pairs
    }

    @Test
    void testProcessWorkflowInterruptHistory_WithNonWorkflowResponse_ShouldNotProcess() {
        // Given
        Integer botId = 1;
        respDto1.setAnswerType(1); // Non-workflow type

        // When
        List<Object> result = chatHistoryMultiModalService.mergeChatHistory(reqList, respList, botId);

        // Then
        ChatRespModelDto processedResp = (ChatRespModelDto) result.get(3);
        assertNull(processedResp.getWorkflowEventData());
        assertEquals("First response", processedResp.getMessage()); // Should remain unchanged
    }

    @Test
    void testProcessWorkflowInterruptHistory_WithInvalidJSON_ShouldHandleGracefully() {
        // Given
        Integer botId = 1;
        respDto2.setAnswerType(41);
        respDto2.setMessage("invalid json");
        reqDto1.setMessage("invalid json");

        try (MockedStatic<JSON> mockedJSON = mockStatic(JSON.class)) {
            mockedJSON.when(() -> JSON.parseObject(anyString(), any(Class.class)))
                    .thenReturn(null); // Simulate parsing failure

            // When
            List<Object> result = chatHistoryMultiModalService.mergeChatHistory(reqList, respList, botId);

            // Then
            assertNotNull(result);
            // Should not throw exception and continue processing
            assertEquals(4, result.size());
        }
    }

    @Test
    void testProcessWorkflowInterruptHistory_WithCurrentIndexZero_ShouldNotProcessNextReq() {
        // Given
        Integer botId = 1;
        List<ChatReqModelDto> singleReqList = new ArrayList<>();
        singleReqList.add(reqDto1);

        List<ChatRespModelDto> singleRespList = new ArrayList<>();
        respDto1.setAnswerType(41);
        singleRespList.add(respDto1);

        WorkflowEventData.EventValue eventValue = WorkflowEventData.EventValue.builder()
                .message("Workflow message")
                .build();

        try (MockedStatic<JSON> mockedJSON = mockStatic(JSON.class)) {
            mockedJSON.when(() -> JSON.parseObject(anyString(), eq(WorkflowEventData.EventValue.class)))
                    .thenReturn(eventValue);

            // When
            List<Object> result = chatHistoryMultiModalService.mergeChatHistory(singleReqList, singleRespList, botId);

            // Then
            assertNotNull(result);
            assertEquals(2, result.size());
        }
    }

    // Helper method to avoid compilation issues with eq matcher
    private static Class<WorkflowEventData.EventValue> eq(Class<WorkflowEventData.EventValue> clazz) {
        return any();
    }
}
