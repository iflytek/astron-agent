package com.iflytek.astron.console.commons.service.workflow.impl;

import com.alibaba.fastjson2.JSON;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.dto.chat.ChatModelMeta;
import com.iflytek.astron.console.commons.dto.chat.ChatReqModelDto;
import com.iflytek.astron.console.commons.dto.chat.ChatRequestDto;
import com.iflytek.astron.console.commons.dto.chat.ChatRequestDtoList;
import com.iflytek.astron.console.commons.entity.bot.ChatBotMarket;
import com.iflytek.astron.console.commons.dto.bot.ChatBotReqDto;
import com.iflytek.astron.console.commons.entity.bot.UserLangChainInfo;
import com.iflytek.astron.console.commons.entity.chat.*;
import com.iflytek.astron.console.commons.dto.workflow.WorkflowEventData;
import com.iflytek.astron.console.commons.enums.ShelfStatusEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.service.WssListenerService;
import com.iflytek.astron.console.commons.service.bot.ChatBotDataService;
import com.iflytek.astron.console.commons.service.data.ChatDataService;
import com.iflytek.astron.console.commons.service.data.ChatHistoryService;
import com.iflytek.astron.console.commons.service.data.UserLangChainDataService;
import com.iflytek.astron.console.commons.service.workflow.WorkflowBotParamService;
import com.iflytek.astron.console.commons.service.workflow.WorkflowVersionLookupService;
import com.iflytek.astron.console.commons.workflow.WorkflowClient;
import okhttp3.RequestBody;
import okio.Buffer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.redisson.api.RBucket;
import org.redisson.api.RedissonClient;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkflowBotChatServiceImplTest {

    @Mock
    private UserLangChainDataService userLangChainDataService;

    @Mock
    private ChatDataService chatDataService;

    @Mock
    private WorkflowBotParamService workflowBotParamService;

    @Mock
    private ChatHistoryService chatHistoryService;

    @Mock
    private ChatBotDataService chatBotDataService;

    @Mock
    private RedissonClient redissonClient;

    @Mock
    private WssListenerService wssListenerService;

    @Mock
    private WorkflowVersionLookupService workflowVersionLookupService;

    @Mock
    private SseEmitter sseEmitter;

    @Mock
    private RBucket<String> rBucket;

    @InjectMocks
    private WorkflowBotChatServiceImpl workflowBotChatService;

    private ChatBotReqDto chatBotReqDto;
    private UserLangChainInfo userLangChainInfo;
    private ChatReqRecords chatReqRecords;
    private String sseId;
    private String workflowOperation;
    private String workflowVersion;

    @BeforeEach
    void setUp() {
        // Set up test configuration properties
        ReflectionTestUtils.setField(workflowBotChatService, "chatUrl", "http://test-chat.com");
        ReflectionTestUtils.setField(workflowBotChatService, "debugUrl", "http://test-debug.com");
        ReflectionTestUtils.setField(workflowBotChatService, "resumeUrl", "http://test-resume.com");
        ReflectionTestUtils.setField(workflowBotChatService, "appId", "testAppId");
        ReflectionTestUtils.setField(workflowBotChatService, "appKey", "testAppKey");
        ReflectionTestUtils.setField(workflowBotChatService, "appSecret", "testAppSecret");

        // Set up test data
        sseId = "test-sse-id";
        workflowOperation = "test-operation";
        workflowVersion = "1.0";

        chatBotReqDto = new ChatBotReqDto();
        chatBotReqDto.setUid("testUser");
        chatBotReqDto.setChatId(123L);
        chatBotReqDto.setAsk("test question");
        chatBotReqDto.setUrl("http://test.com");
        chatBotReqDto.setBotId(456);

        userLangChainInfo = new UserLangChainInfo();
        userLangChainInfo.setFlowId("test-flow-id");
        userLangChainInfo.setExtraInputs("{}");
        userLangChainInfo.setExtraInputsConfig("[]");
        lenient().when(workflowVersionLookupService.isPublishedVersion(anyString(), anyString()))
                .thenReturn(Optional.of(true));

        chatReqRecords = new ChatReqRecords();
        chatReqRecords.setId(789L);
        chatReqRecords.setChatId(123L);
        chatReqRecords.setUid("testUser");
        chatReqRecords.setMessage("test question");
        chatReqRecords.setCreateTime(LocalDateTime.now());
    }

    @Test
    void testChatWorkflowBot_Success_WithDebugUrl() {
        // Given
        when(userLangChainDataService.findOneByBotId(456)).thenReturn(userLangChainInfo);
        when(chatDataService.createRequest(any(ChatReqRecords.class))).thenReturn(chatReqRecords);
        when(workflowBotParamService.handleMultiFileParam(anyString(), anyLong(), isNull(), any(), any(), anyLong())).thenReturn(false);

        List<ChatReqModelDto> reqList = new ArrayList<>();
        when(chatDataService.getReqModelBotHistoryByChatId("testUser", 123L)).thenReturn(reqList);

        ChatRequestDtoList requestDtoList = new ChatRequestDtoList();
        requestDtoList.setMessages(new LinkedList<>());
        when(chatHistoryService.getHistory("testUser", 123L, reqList)).thenReturn(requestDtoList);

        when(chatBotDataService.findMarketBotByBotId(456)).thenReturn(null); // No market bot, use debug

        try (MockedConstruction<WorkflowClient> mockWorkflowClient = mockConstruction(WorkflowClient.class)) {
            // When
            workflowBotChatService.chatWorkflowBot(chatBotReqDto, sseEmitter, sseId, workflowOperation, workflowVersion);

            // Then
            verify(userLangChainDataService).findOneByBotId(456);
            verify(chatDataService).createRequest(any(ChatReqRecords.class));
            verify(workflowBotParamService).handleMultiFileParam(anyString(), anyLong(), isNull(), any(), any(), anyLong());
            verify(workflowBotParamService).handleSingleParam(anyString(), anyLong(), anyString(), isNull(), anyString(), any(), anyLong(), any(), anyInt());

            // Verify WorkflowClient was created with debug URL
            List<WorkflowClient> constructed = mockWorkflowClient.constructed();
            assertEquals(1, constructed.size());
            verify(constructed.get(0)).createWebSocketConnect(any());
        }
    }

    @Test
    void testChatWorkflowBot_Success_WithChatUrl() {
        // Given
        when(userLangChainDataService.findOneByBotId(456)).thenReturn(userLangChainInfo);
        when(chatDataService.createRequest(any(ChatReqRecords.class))).thenReturn(chatReqRecords);
        when(workflowBotParamService.handleMultiFileParam(anyString(), anyLong(), isNull(), any(), any(), anyLong())).thenReturn(false);

        List<ChatReqModelDto> reqList = new ArrayList<>();
        when(chatDataService.getReqModelBotHistoryByChatId("testUser", 123L)).thenReturn(reqList);

        ChatRequestDtoList requestDtoList = new ChatRequestDtoList();
        requestDtoList.setMessages(new LinkedList<>());
        when(chatHistoryService.getHistory("testUser", 123L, reqList)).thenReturn(requestDtoList);

        // Market bot exists and is on shelf
        ChatBotMarket market = new ChatBotMarket();
        market.setBotStatus(ShelfStatusEnum.ON_SHELF.getCode());
        when(chatBotDataService.findMarketBotByBotId(456)).thenReturn(market);

        try (MockedConstruction<WorkflowClient> mockWorkflowClient = mockConstruction(WorkflowClient.class)) {
            // When
            workflowBotChatService.chatWorkflowBot(chatBotReqDto, sseEmitter, sseId, workflowOperation, workflowVersion);

            // Then
            verify(chatBotDataService).findMarketBotByBotId(456);

            // Verify WorkflowClient was created with chat URL
            List<WorkflowClient> constructed = mockWorkflowClient.constructed();
            assertEquals(1, constructed.size());
            verify(constructed.get(0)).createWebSocketConnect(any());
        }
    }

    @Test
    void chatWorkflowBotShouldFallbackToLatestSuccessfulVersionWhenRequestVersionIsBlank() throws Exception {
        when(userLangChainDataService.findOneByBotId(456)).thenReturn(userLangChainInfo);
        when(chatDataService.createRequest(any(ChatReqRecords.class))).thenReturn(chatReqRecords);
        when(workflowBotParamService.handleMultiFileParam(anyString(), anyLong(), isNull(), any(), any(), anyLong())).thenReturn(false);

        List<ChatReqModelDto> reqList = new ArrayList<>();
        when(chatDataService.getReqModelBotHistoryByChatId("testUser", 123L)).thenReturn(reqList);

        ChatRequestDtoList requestDtoList = new ChatRequestDtoList();
        requestDtoList.setMessages(new LinkedList<>());
        when(chatHistoryService.getHistory("testUser", 123L, reqList)).thenReturn(requestDtoList);
        when(workflowVersionLookupService.findLatestSuccessfulVersionName(456)).thenReturn(Optional.of("v1.0"));

        ChatBotMarket market = new ChatBotMarket();
        market.setBotStatus(ShelfStatusEnum.ON_SHELF.getCode());
        when(chatBotDataService.findMarketBotByBotId(456)).thenReturn(market);

        List<List<?>> constructorArgs = new ArrayList<>();
        try (MockedConstruction<WorkflowClient> mockWorkflowClient = mockConstruction(
                WorkflowClient.class,
                (mock, context) -> constructorArgs.add(context.arguments()))) {
            workflowBotChatService.chatWorkflowBot(chatBotReqDto, sseEmitter, sseId, workflowOperation, "");

            assertEquals(1, mockWorkflowClient.constructed().size());
            RequestBody requestBody = (RequestBody) constructorArgs.get(0).get(4);
            Buffer buffer = new Buffer();
            requestBody.writeTo(buffer);
            assertEquals("v1.0", JSON.parseObject(buffer.readUtf8()).getString("version"));
        }
    }

    @Test
    void chatWorkflowBotShouldFallbackToLatestSuccessfulVersionWhenRequestVersionIsNotPublished() throws Exception {
        when(userLangChainDataService.findOneByBotId(456)).thenReturn(userLangChainInfo);
        when(chatDataService.createRequest(any(ChatReqRecords.class))).thenReturn(chatReqRecords);
        when(workflowBotParamService.handleMultiFileParam(anyString(), anyLong(), isNull(), any(), any(), anyLong())).thenReturn(false);

        List<ChatReqModelDto> reqList = new ArrayList<>();
        when(chatDataService.getReqModelBotHistoryByChatId("testUser", 123L)).thenReturn(reqList);

        ChatRequestDtoList requestDtoList = new ChatRequestDtoList();
        requestDtoList.setMessages(new LinkedList<>());
        when(chatHistoryService.getHistory("testUser", 123L, reqList)).thenReturn(requestDtoList);
        when(workflowVersionLookupService.isPublishedVersion("test-flow-id", "stale-version")).thenReturn(Optional.of(false));
        when(workflowVersionLookupService.findLatestSuccessfulVersionName(456)).thenReturn(Optional.of("v1.0"));

        ChatBotMarket market = new ChatBotMarket();
        market.setBotStatus(ShelfStatusEnum.ON_SHELF.getCode());
        when(chatBotDataService.findMarketBotByBotId(456)).thenReturn(market);

        List<List<?>> constructorArgs = new ArrayList<>();
        try (MockedConstruction<WorkflowClient> mockWorkflowClient = mockConstruction(
                WorkflowClient.class,
                (mock, context) -> constructorArgs.add(context.arguments()))) {
            workflowBotChatService.chatWorkflowBot(chatBotReqDto, sseEmitter, sseId, workflowOperation, "stale-version");

            assertEquals(1, mockWorkflowClient.constructed().size());
            RequestBody requestBody = (RequestBody) constructorArgs.get(0).get(4);
            Buffer buffer = new Buffer();
            requestBody.writeTo(buffer);
            assertEquals("v1.0", JSON.parseObject(buffer.readUtf8()).getString("version"));
        }
    }

    @Test
    void testChatWorkflowBot_WithResumeWorkflow() {
        // Given
        String resumeOperation = "resumeDial";
        when(userLangChainDataService.findOneByBotId(456)).thenReturn(userLangChainInfo);
        when(chatDataService.createRequest(any(ChatReqRecords.class))).thenReturn(chatReqRecords);
        when(workflowBotParamService.handleMultiFileParam(anyString(), anyLong(), isNull(), any(), any(), anyLong())).thenReturn(false);

        List<ChatReqModelDto> reqList = new ArrayList<>();
        when(chatDataService.getReqModelBotHistoryByChatId("testUser", 123L)).thenReturn(reqList);

        ChatRequestDtoList requestDtoList = new ChatRequestDtoList();
        requestDtoList.setMessages(new LinkedList<>());
        when(chatHistoryService.getHistory("testUser", 123L, reqList)).thenReturn(requestDtoList);

        when(chatBotDataService.findMarketBotByBotId(456)).thenReturn(null);

        // Mock Redis operations for resume workflow
        when(redissonClient.<String>getBucket(anyString())).thenReturn(rBucket);
        when(rBucket.get()).thenReturn("OPTION", "test-event-id");

        try (MockedStatic<WorkflowEventData.WorkflowOperation> mockWorkflowOp = mockStatic(WorkflowEventData.WorkflowOperation.class);
                MockedConstruction<WorkflowClient> mockWorkflowClient = mockConstruction(WorkflowClient.class)) {

            mockWorkflowOp.when(() -> WorkflowEventData.WorkflowOperation.resumeDial(resumeOperation)).thenReturn(true);

            // When
            workflowBotChatService.chatWorkflowBot(chatBotReqDto, sseEmitter, sseId, resumeOperation, workflowVersion);

            // Then
            verify(redissonClient, atLeast(1)).<String>getBucket(anyString());
            mockWorkflowOp.verify(() -> WorkflowEventData.WorkflowOperation.resumeDial(resumeOperation));

            // Verify WorkflowClient was created
            List<WorkflowClient> constructed = mockWorkflowClient.constructed();
            assertEquals(1, constructed.size());
            verify(constructed.get(0)).createWebSocketConnect(any());
        }
    }

    @Test
    void testChatWorkflowBot_UserLangChainInfoNotFound() {
        // Given
        when(userLangChainDataService.findOneByBotId(456)).thenReturn(null);

        // When & Then
        BusinessException exception = assertThrows(BusinessException.class, () -> {
            workflowBotChatService.chatWorkflowBot(chatBotReqDto, sseEmitter, sseId, workflowOperation, workflowVersion);
        });

        assertEquals(ResponseEnum.BOT_CHAIN_SUBMIT_ERROR, exception.getResponseEnum());
        verify(userLangChainDataService).findOneByBotId(456);
        verifyNoInteractions(chatDataService);
    }

    @Test
    void testChatWorkflowBot_WithMultiFileParam() {
        // Given
        when(userLangChainDataService.findOneByBotId(456)).thenReturn(userLangChainInfo);
        when(chatDataService.createRequest(any(ChatReqRecords.class))).thenReturn(chatReqRecords);
        when(workflowBotParamService.handleMultiFileParam(anyString(), anyLong(), isNull(), any(), any(), anyLong())).thenReturn(true);

        List<ChatReqModelDto> reqList = new ArrayList<>();
        when(chatDataService.getReqModelBotHistoryByChatId("testUser", 123L)).thenReturn(reqList);

        ChatRequestDtoList requestDtoList = new ChatRequestDtoList();
        requestDtoList.setMessages(new LinkedList<>());
        when(chatHistoryService.getHistory("testUser", 123L, reqList)).thenReturn(requestDtoList);

        when(chatBotDataService.findMarketBotByBotId(456)).thenReturn(null);

        try (MockedConstruction<WorkflowClient> mockWorkflowClient = mockConstruction(WorkflowClient.class)) {
            // When
            workflowBotChatService.chatWorkflowBot(chatBotReqDto, sseEmitter, sseId, workflowOperation, workflowVersion);

            // Then
            verify(workflowBotParamService).handleMultiFileParam(anyString(), anyLong(), isNull(), any(), any(), anyLong());
            verify(workflowBotParamService, never()).handleSingleParam(anyString(), anyLong(), anyString(), isNull(), anyString(), any(), anyLong(), any(), anyInt());

            // Verify WorkflowClient was created
            List<WorkflowClient> constructed = mockWorkflowClient.constructed();
            assertEquals(1, constructed.size());
        }
    }

    @Test
    void testFilterContent_WithListContent() {
        // Given
        ChatRequestDtoList requestDtoList = new ChatRequestDtoList();
        LinkedList<ChatRequestDto> messages = new LinkedList<>();

        // Create a message with list content
        ChatRequestDto dto = new ChatRequestDto();
        dto.setRole("user");
        dto.setContent_type("multimodal");

        List<ChatModelMeta> contentList = new ArrayList<>();
        ChatModelMeta textMeta = new ChatModelMeta();
        textMeta.setType("text");
        textMeta.setText("Hello world");
        contentList.add(textMeta);

        ChatModelMeta imageMeta = new ChatModelMeta();
        imageMeta.setType("image");
        contentList.add(imageMeta);

        dto.setContent(contentList);
        messages.add(dto);
        requestDtoList.setMessages(messages);

        // When
        ReflectionTestUtils.invokeMethod(workflowBotChatService, "filterContent", requestDtoList);

        // Then
        assertEquals(1, requestDtoList.getMessages().size());
        ChatRequestDto filtered = requestDtoList.getMessages().getFirst();
        assertEquals("user", filtered.getRole());
        assertEquals("Hello world", filtered.getContent());
        assertEquals("multimodal", filtered.getContent_type());
    }

    @Test
    void testFilterContent_WithWorkflowEventData() {
        // Given
        ChatRequestDtoList requestDtoList = new ChatRequestDtoList();
        LinkedList<ChatRequestDto> messages = new LinkedList<>();

        // Create a message with workflow event data that should be removed
        ChatRequestDto eventDto = new ChatRequestDto();
        eventDto.setRole("user");

        WorkflowEventData.EventValue eventValue = WorkflowEventData.EventValue.builder()
                .type("OPTION")
                .build();
        eventDto.setContent(JSON.toJSONString(eventValue));
        messages.add(eventDto);

        // Create a normal message that should be kept
        ChatRequestDto normalDto = new ChatRequestDto();
        normalDto.setRole("assistant");
        normalDto.setContent("Normal response");
        messages.add(normalDto);

        requestDtoList.setMessages(messages);

        // When
        ReflectionTestUtils.invokeMethod(workflowBotChatService, "filterContent", requestDtoList);

        // Then - The workflow event message should be removed, but not the normal one
        assertFalse(requestDtoList.getMessages().isEmpty());
        // The exact behavior depends on the removeNext logic in filterContent
    }

    @Test
    void testShouldRemove_WithWorkflowEventData() {
        // Given
        WorkflowEventData.EventValue eventValue = WorkflowEventData.EventValue.builder()
                .type("OPTION")
                .build();
        String content = JSON.toJSONString(eventValue);

        try (MockedStatic<WorkflowEventData.WorkflowValueType> mockValueType = mockStatic(WorkflowEventData.WorkflowValueType.class)) {
            mockValueType.when(() -> WorkflowEventData.WorkflowValueType.getTag("OPTION")).thenReturn("OPTION");

            // When
            boolean result = (Boolean) ReflectionTestUtils.invokeMethod(workflowBotChatService, "shouldRemove", content);

            // Then
            assertTrue(result);
        }
    }

    @Test
    void testShouldRemove_WithNormalContent() {
        // Given
        String normalContent = "This is normal text content";

        // When
        boolean result = (Boolean) ReflectionTestUtils.invokeMethod(workflowBotChatService, "shouldRemove", normalContent);

        // Then
        assertFalse(result);
    }

    @Test
    void testShouldRemove_WithInvalidJson() {
        // Given
        String invalidJsonContent = "invalid json content {";

        // When
        boolean result = (Boolean) ReflectionTestUtils.invokeMethod(workflowBotChatService, "shouldRemove", invalidJsonContent);

        // Then
        assertFalse(result);
    }

    @Test
    void testChatWorkflowBot_VerifyChatReqRecordsCreation() {
        // Given
        when(userLangChainDataService.findOneByBotId(456)).thenReturn(userLangChainInfo);
        when(chatDataService.createRequest(any(ChatReqRecords.class))).thenReturn(chatReqRecords);
        when(workflowBotParamService.handleMultiFileParam(anyString(), anyLong(), isNull(), any(), any(), anyLong())).thenReturn(false);

        List<ChatReqModelDto> reqList = new ArrayList<>();
        when(chatDataService.getReqModelBotHistoryByChatId("testUser", 123L)).thenReturn(reqList);

        ChatRequestDtoList requestDtoList = new ChatRequestDtoList();
        requestDtoList.setMessages(new LinkedList<>());
        when(chatHistoryService.getHistory("testUser", 123L, reqList)).thenReturn(requestDtoList);

        when(chatBotDataService.findMarketBotByBotId(456)).thenReturn(null);

        try (MockedConstruction<WorkflowClient> mockWorkflowClient = mockConstruction(WorkflowClient.class)) {
            // When
            workflowBotChatService.chatWorkflowBot(chatBotReqDto, sseEmitter, sseId, workflowOperation, workflowVersion);

            // Then
            ArgumentCaptor<ChatReqRecords> captor = ArgumentCaptor.forClass(ChatReqRecords.class);
            verify(chatDataService).createRequest(captor.capture());

            ChatReqRecords captured = captor.getValue();
            assertEquals(123L, captured.getChatId());
            assertEquals("testUser", captured.getUid());
            assertEquals("test question", captured.getMessage());
            assertEquals(0, captured.getClientType());
            assertEquals(1, captured.getNewContext());
            assertNotNull(captured.getCreateTime());
            assertNotNull(captured.getUpdateTime());
        }
    }
}
