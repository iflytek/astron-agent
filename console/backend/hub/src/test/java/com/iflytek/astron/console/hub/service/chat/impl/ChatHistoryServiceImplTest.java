package com.iflytek.astron.console.hub.service.chat.impl;

import com.iflytek.astron.console.commons.dto.chat.ChatModelMeta;
import com.iflytek.astron.console.commons.dto.chat.ChatReqModelDto;
import com.iflytek.astron.console.commons.dto.chat.ChatRequestDtoList;
import com.iflytek.astron.console.commons.dto.chat.ChatRespModelDto;
import com.iflytek.astron.console.commons.dto.llm.SparkChatRequest;
import com.iflytek.astron.console.commons.service.data.ChatDataService;
import com.iflytek.astron.console.commons.util.I18nUtil;
import com.iflytek.astron.console.hub.data.ReqKnowledgeRecordsDataService;
import com.iflytek.astron.console.hub.entity.ReqKnowledgeRecords;
import org.apache.logging.log4j.util.Base64Util;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatHistoryServiceImplTest {

    @Mock
    private ChatDataService chatDataService;

    @Mock
    private ReqKnowledgeRecordsDataService reqKnowledgeRecordsDataService;

    @InjectMocks
    private ChatHistoryServiceImpl chatHistoryService;

    private String uid;
    private Long chatId;
    private Boolean supportDocument;
    private List<ChatReqModelDto> reqModelDtos;
    private List<ChatRespModelDto> respModelDtos;
    private Map<Long, ReqKnowledgeRecords> knowledgeRecordsMap;

    @BeforeEach
    void setUp() {
        uid = "user123";
        chatId = 100L;
        supportDocument = true;

        // Setup request DTOs
        ChatReqModelDto req1 = new ChatReqModelDto();
        req1.setId(1L);
        req1.setMessage("First question");
        req1.setCreateTime(LocalDateTime.now().minusMinutes(10));

        ChatReqModelDto req2 = new ChatReqModelDto();
        req2.setId(2L);
        req2.setMessage("Second question");
        req2.setUrl("http://example.com/image.jpg");
        req2.setCreateTime(LocalDateTime.now().minusMinutes(5));

        // getReqModelBotHistoryByChatId returns in DESC order (newest first)
        reqModelDtos = Arrays.asList(req2, req1);

        // Setup response DTOs
        ChatRespModelDto resp1 = new ChatRespModelDto();
        resp1.setId(1L);
        resp1.setReqId(1L);
        resp1.setMessage("First answer");
        resp1.setCreateTime(LocalDateTime.now().minusMinutes(9));

        ChatRespModelDto resp2 = new ChatRespModelDto();
        resp2.setId(2L);
        resp2.setReqId(2L);
        resp2.setMessage("Second answer");
        resp2.setContent("multimodal content");
        resp2.setUrl("http://example.com/response.jpg");
        resp2.setType("image");
        resp2.setDataId("data123");
        resp2.setNeedHis(0);
        resp2.setCreateTime(LocalDateTime.now().minusMinutes(4));

        respModelDtos = Arrays.asList(resp1, resp2);

        // Setup knowledge records
        ReqKnowledgeRecords knowledge1 = ReqKnowledgeRecords.builder()
                .reqId(1L)
                .knowledge("[\"knowledge piece 1\", \"knowledge piece 2\"]")
                .build();

        knowledgeRecordsMap = new HashMap<>();
        knowledgeRecordsMap.put(1L, knowledge1);
    }

    @Test
    void testGetSystemBotHistory_WithValidData_ShouldReturnMessageList() {
        // Given
        List<Long> reqIds = Arrays.asList(2L, 1L); // DESC order (newest first)

        when(chatDataService.getReqModelBotHistoryByChatId(uid, chatId)).thenReturn(reqModelDtos);
        when(chatDataService.getChatRespModelBotHistoryByChatId(uid, chatId, reqIds)).thenReturn(respModelDtos);
        when(reqKnowledgeRecordsDataService.findByReqIds(reqIds)).thenReturn(knowledgeRecordsMap);

        // When
        List<SparkChatRequest.MessageDto> result = chatHistoryService.getSystemBotHistory(uid, chatId, supportDocument);

        // Then
        assertNotNull(result);
        assertEquals(4, result.size()); // 2 user messages + 2 assistant messages

        // Verify first user message (enhanced with knowledge)
        SparkChatRequest.MessageDto firstUserMsg = result.get(0);
        assertEquals("user", firstUserMsg.getRole());
        assertTrue(firstUserMsg.getContent().contains("First question"));
        assertTrue(firstUserMsg.getContent().contains("knowledge piece"));

        // Verify first assistant message
        SparkChatRequest.MessageDto firstAssistantMsg = result.get(1);
        assertEquals("assistant", firstAssistantMsg.getRole());
        assertEquals("First answer", firstAssistantMsg.getContent());

        // Verify second user message (no knowledge enhancement)
        SparkChatRequest.MessageDto secondUserMsg = result.get(2);
        assertEquals("user", secondUserMsg.getRole());
        assertEquals("Second question", secondUserMsg.getContent());

        // Verify second assistant message
        SparkChatRequest.MessageDto secondAssistantMsg = result.get(3);
        assertEquals("assistant", secondAssistantMsg.getRole());
        assertEquals("Second answer", secondAssistantMsg.getContent());

        verify(chatDataService).getReqModelBotHistoryByChatId(uid, chatId);
        verify(chatDataService).getChatRespModelBotHistoryByChatId(uid, chatId, reqIds);
        verify(reqKnowledgeRecordsDataService).findByReqIds(reqIds);
    }

    @Test
    void testGetSystemBotHistory_WithEmptyRequestList_ShouldReturnEmptyList() {
        // Given
        when(chatDataService.getReqModelBotHistoryByChatId(uid, chatId)).thenReturn(new ArrayList<>());

        // When
        List<SparkChatRequest.MessageDto> result = chatHistoryService.getSystemBotHistory(uid, chatId, supportDocument);

        // Then
        assertNotNull(result);
        assertTrue(result.isEmpty());

        verify(chatDataService).getReqModelBotHistoryByChatId(uid, chatId);
        verify(chatDataService, never()).getChatRespModelBotHistoryByChatId(anyString(), anyLong(), anyList());
    }

    @Test
    void testGetSystemBotHistory_WithNullRequestList_ShouldReturnEmptyList() {
        // Given
        when(chatDataService.getReqModelBotHistoryByChatId(uid, chatId)).thenReturn(null);

        // When
        List<SparkChatRequest.MessageDto> result = chatHistoryService.getSystemBotHistory(uid, chatId, supportDocument);

        // Then
        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    void testGetSystemBotHistory_WithMissingResponse_ShouldSkipAssistantMessage() {
        // Given
        List<Long> reqIds = Arrays.asList(2L, 1L); // DESC order (newest first)
        List<ChatRespModelDto> partialResponses = Arrays.asList(respModelDtos.get(0)); // Only first response

        when(chatDataService.getReqModelBotHistoryByChatId(uid, chatId)).thenReturn(reqModelDtos);
        when(chatDataService.getChatRespModelBotHistoryByChatId(uid, chatId, reqIds)).thenReturn(partialResponses);
        when(reqKnowledgeRecordsDataService.findByReqIds(reqIds)).thenReturn(knowledgeRecordsMap);

        // When
        List<SparkChatRequest.MessageDto> result = chatHistoryService.getSystemBotHistory(uid, chatId, supportDocument);

        // Then
        assertNotNull(result);
        assertEquals(3, result.size()); // 2 user messages + 1 assistant message

        // Verify only first response is included
        long assistantMessages = result.stream().filter(msg -> "assistant".equals(msg.getRole())).count();
        assertEquals(1, assistantMessages);
    }

    @Test
    void testGetSystemBotHistory_WithEmptyResponseMessage_ShouldSkipAssistantMessage() {
        // Given
        List<Long> reqIds = Arrays.asList(2L); // First element from reqModelDtos
        List<ChatReqModelDto> singleRequest = Arrays.asList(reqModelDtos.get(0)); // req2

        ChatRespModelDto emptyResponse = new ChatRespModelDto();
        emptyResponse.setReqId(2L); // Match req2
        emptyResponse.setMessage(""); // Empty message

        when(chatDataService.getReqModelBotHistoryByChatId(uid, chatId)).thenReturn(singleRequest);
        when(chatDataService.getChatRespModelBotHistoryByChatId(uid, chatId, reqIds)).thenReturn(Arrays.asList(emptyResponse));
        when(reqKnowledgeRecordsDataService.findByReqIds(reqIds)).thenReturn(knowledgeRecordsMap);

        // When
        List<SparkChatRequest.MessageDto> result = chatHistoryService.getSystemBotHistory(uid, chatId, supportDocument);

        // Then
        assertNotNull(result);
        assertEquals(1, result.size()); // Only user message, no assistant message
        assertEquals("user", result.get(0).getRole());
    }

    @Test
    void testGetHistory_WithValidData_ShouldReturnChatRequestDtoList() {
        // Given
        List<Long> reqIds = Arrays.asList(2L, 1L); // DESC order (newest first)

        when(chatDataService.getChatRespModelBotHistoryByChatId(uid, chatId, reqIds)).thenReturn(respModelDtos);

        // When
        ChatRequestDtoList result = chatHistoryService.getHistory(uid, chatId, reqModelDtos);

        // Then
        assertNotNull(result);
        assertFalse(result.getMessages().isEmpty());
        assertTrue(result.getLength() > 0);

        verify(chatDataService).getChatRespModelBotHistoryByChatId(uid, chatId, reqIds);
    }

    @Test
    void testGetHistory_WithNullReqList_ShouldReturnEmptyList() {
        // When
        ChatRequestDtoList result = chatHistoryService.getHistory(uid, chatId, null);

        // Then
        assertNotNull(result);
        assertTrue(result.getMessages().isEmpty());
        assertNull(result.getLength());
    }

    @Test
    void testGetHistory_WithEmptyReqList_ShouldReturnEmptyList() {
        // When
        ChatRequestDtoList result = chatHistoryService.getHistory(uid, chatId, new ArrayList<>());

        // Then
        assertNotNull(result);
        assertTrue(result.getMessages().isEmpty());
        assertNull(result.getLength());
    }

    @Test
    void testGetHistory_WithMultimodalContent_ShouldHandleCorrectly() {
        // Given
        List<Long> reqIds = Arrays.asList(2L); // First element from reqModelDtos (req2)
        List<ChatReqModelDto> multimodalReq = Arrays.asList(reqModelDtos.get(0)); // req2 has URL and matches resp2
        List<ChatRespModelDto> multimodalResp = Arrays.asList(respModelDtos.get(1)); // resp2 has content and reqId=2L

        when(chatDataService.getChatRespModelBotHistoryByChatId(uid, chatId, reqIds)).thenReturn(multimodalResp);

        // When
        ChatRequestDtoList result = chatHistoryService.getHistory(uid, chatId, multimodalReq);

        // Then
        assertNotNull(result);
        assertFalse(result.getMessages().isEmpty());

        // Should contain multimodal content
        boolean hasMultimodalResponse = result.getMessages()
                .stream()
                .anyMatch(msg -> "assistant".equals(msg.getRole()));
        assertTrue(hasMultimodalResponse);
    }

    @Test
    void testGetHistory_ExceedsMaxLength_ShouldTruncate() {
        // Given
        // Create a long message that exceeds MAX_HISTORY_NUMBERS
        String longMessage = "x".repeat(ChatHistoryServiceImpl.MAX_HISTORY_NUMBERS + 1000);

        ChatReqModelDto longReq = new ChatReqModelDto();
        longReq.setId(1L);
        longReq.setMessage(longMessage);

        ChatRespModelDto longResp = new ChatRespModelDto();
        longResp.setReqId(1L);
        longResp.setMessage(longMessage);

        when(chatDataService.getChatRespModelBotHistoryByChatId(uid, chatId, Arrays.asList(1L)))
                .thenReturn(Arrays.asList(longResp));

        // When
        ChatRequestDtoList result = chatHistoryService.getHistory(uid, chatId, Arrays.asList(longReq));

        // Then
        assertNotNull(result);
        assertNull(result.getLength());
    }

    @Test
    void testUrlToArray_WithValidUrls_ShouldReturnMetaList() {
        // Given
        String urls = "http://example.com/image1.jpg,http://example.com/image2.png";
        String ask = "What do you see in these images?";

        try (MockedStatic<Base64Util> mockedBase64 = mockStatic(Base64Util.class)) {
            mockedBase64.when(() -> Base64Util.encode(anyString())).thenReturn("encodedUrl");

            // When
            List<ChatModelMeta> result = chatHistoryService.urlToArray(urls, ask);

            // Then
            assertNotNull(result);
            assertEquals(3, result.size()); // 2 images + 1 text

            // Verify image metas
            ChatModelMeta imageMeta1 = result.get(0);
            assertEquals("image_url", imageMeta1.getType());
            assertNotNull(imageMeta1.getImage_url());

            ChatModelMeta imageMeta2 = result.get(1);
            assertEquals("image_url", imageMeta2.getType());
            assertNotNull(imageMeta2.getImage_url());

            // Verify text meta (should be last)
            ChatModelMeta textMeta = result.get(2);
            assertEquals("text", textMeta.getType());
            assertEquals(ask, textMeta.getText());
        }
    }

    @Test
    void testUrlToArray_WithEmptyUrl_ShouldReturnOnlyText() {
        // Given
        String ask = "Simple text question";

        // When
        List<ChatModelMeta> result = chatHistoryService.urlToArray("", ask);

        // Then
        assertNotNull(result);
        assertEquals(1, result.size());

        ChatModelMeta textMeta = result.get(0);
        assertEquals("text", textMeta.getType());
        assertEquals(ask, textMeta.getText());
    }

    @Test
    void testUrlToArray_WithNullValues_ShouldHandleGracefully() {
        // When
        List<ChatModelMeta> result = chatHistoryService.urlToArray(null, null);

        // Then
        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    void testUrlToArray_WithInvalidUrls_ShouldSkipNullAndEmpty() {
        // Given
        String urls = "http://valid.com/image.jpg,,null,http://another.com/pic.png";
        String ask = "Test question";

        try (MockedStatic<Base64Util> mockedBase64 = mockStatic(Base64Util.class)) {
            mockedBase64.when(() -> Base64Util.encode(anyString())).thenReturn("encodedUrl");

            // When
            List<ChatModelMeta> result = chatHistoryService.urlToArray(urls, ask);

            // Then
            assertNotNull(result);
            assertEquals(3, result.size()); // 2 valid images + 1 text (skipped empty and null)

            // Should have 2 image_url types and 1 text type
            long imageCount = result.stream().filter(meta -> "image_url".equals(meta.getType())).count();
            long textCount = result.stream().filter(meta -> "text".equals(meta.getType())).count();

            assertEquals(2, imageCount);
            assertEquals(1, textCount);
        }
    }

    @Test
    void testEnhanceAskWithKnowledgeRecord_WithValidKnowledge_ShouldEnhanceContent() {
        try (MockedStatic<I18nUtil> mockedI18nUtil = mockStatic(I18nUtil.class)) {
            // Mock I18n messages
            mockedI18nUtil.when(() -> I18nUtil.getMessage("loose.prefix.prompt"))
                    .thenReturn(
                            "Please use the following document fragments as known information:[]\nPlease answer the question accurately based on the original text above and your knowledge\nWhen answering user questions, please answer in the language the user asked\nIf the above content cannot answer the user information, combine your knowledge to answer the user's question\nAnswer the user's questions concisely and professionally, and do not add fabricated content to the answer.");
            mockedI18nUtil.when(() -> I18nUtil.getMessage("loose.suffix.prompt"))
                    .thenReturn("\nMy next input is: {{}}");

            // Given
            String originalAsk = "What is machine learning?";
            ReqKnowledgeRecords knowledgeRecord = ReqKnowledgeRecords.builder()
                    .reqId(1L)
                    .knowledge("machine learning knowledge")
                    .build();

            // When - Use reflection to access private method
            String result = invokeEnhanceAskWithKnowledgeRecord(originalAsk, knowledgeRecord);

            // Then
            assertNotNull(result);
            assertNotEquals(originalAsk, result);
            assertTrue(result.contains(originalAsk));
            assertTrue(result.contains("machine learning knowledge"));
        }
    }

    @Test
    void testEnhanceAskWithKnowledgeRecord_WithNullKnowledge_ShouldReturnOriginal() {
        // Given
        String originalAsk = "What is machine learning?";

        // When - Use reflection to access private method
        String result = invokeEnhanceAskWithKnowledgeRecord(originalAsk, null);

        // Then
        assertEquals(originalAsk, result);
    }

    @Test
    void testEnhanceAskWithKnowledgeRecord_WithEmptyKnowledge_ShouldReturnOriginal() {
        // Given
        String originalAsk = "What is machine learning?";
        ReqKnowledgeRecords knowledgeRecord = ReqKnowledgeRecords.builder()
                .reqId(1L)
                .knowledge("")
                .build();

        // When - Use reflection to access private method
        String result = invokeEnhanceAskWithKnowledgeRecord(originalAsk, knowledgeRecord);

        // Then
        assertEquals(originalAsk, result);
    }

    @Test
    void testEnhanceAskWithKnowledgeRecord_WithBlankAsk_ShouldReturnOriginal() {
        // Given
        String originalAsk = "";
        ReqKnowledgeRecords knowledgeRecord = ReqKnowledgeRecords.builder()
                .reqId(1L)
                .knowledge("some knowledge")
                .build();

        // When - Use reflection to access private method
        String result = invokeEnhanceAskWithKnowledgeRecord(originalAsk, knowledgeRecord);

        // Then
        assertEquals(originalAsk, result);
    }

    @Test
    void testGetHistory_WithNeedHisFlag2_ShouldAddTextualResponse() {
        // Given
        ChatRespModelDto respWithNeedHis2 = new ChatRespModelDto();
        respWithNeedHis2.setReqId(2L); // Match req2 (first element in reqModelDtos)
        respWithNeedHis2.setMessage("Text response");
        respWithNeedHis2.setContent("multimodal content");
        respWithNeedHis2.setNeedHis(2); // Should add textual response

        List<ChatReqModelDto> singleReq = Arrays.asList(reqModelDtos.get(0)); // req2
        when(chatDataService.getChatRespModelBotHistoryByChatId(uid, chatId, Arrays.asList(2L)))
                .thenReturn(Arrays.asList(respWithNeedHis2));

        // When
        ChatRequestDtoList result = chatHistoryService.getHistory(uid, chatId, singleReq);

        // Then
        assertNotNull(result);
        assertFalse(result.getMessages().isEmpty());

        // Should contain textual assistant response
        boolean hasTextualResponse = result.getMessages()
                .stream()
                .anyMatch(msg -> "assistant".equals(msg.getRole()) &&
                        "Text response".equals(msg.getContent()));
        assertTrue(hasTextualResponse);
    }

    // Helper method to access private method using reflection
    private String invokeEnhanceAskWithKnowledgeRecord(String originalAsk, ReqKnowledgeRecords knowledgeRecord) {
        try {
            var method = ChatHistoryServiceImpl.class.getDeclaredMethod("enhanceAskWithKnowledgeRecord",
                    String.class, ReqKnowledgeRecords.class);
            method.setAccessible(true);
            return (String) method.invoke(chatHistoryService, originalAsk, knowledgeRecord);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
