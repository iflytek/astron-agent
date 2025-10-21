package com.iflytek.astron.console.hub.service.chat.impl;

import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.dto.llm.SparkChatRequest;
import com.iflytek.astron.console.commons.entity.bot.ChatBotBase;
import com.iflytek.astron.console.commons.entity.bot.ChatBotMarket;
import com.iflytek.astron.console.commons.dto.bot.ChatBotReqDto;
import com.iflytek.astron.console.commons.entity.chat.ChatList;
import com.iflytek.astron.console.commons.dto.chat.ChatListCreateResponse;
import com.iflytek.astron.console.commons.entity.chat.ChatReqRecords;
import com.iflytek.astron.console.commons.enums.ShelfStatusEnum;
import com.iflytek.astron.console.commons.enums.bot.BotTypeEnum;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.commons.service.bot.BotService;
import com.iflytek.astron.console.commons.service.bot.ChatBotDataService;
import com.iflytek.astron.console.commons.service.data.ChatDataService;
import com.iflytek.astron.console.commons.service.data.ChatHistoryService;
import com.iflytek.astron.console.commons.service.data.ChatListDataService;
import com.iflytek.astron.console.commons.service.workflow.WorkflowBotChatService;
import com.iflytek.astron.console.hub.data.ReqKnowledgeRecordsDataService;
import com.iflytek.astron.console.hub.service.PromptChatService;
import com.iflytek.astron.console.hub.service.SparkChatService;
import com.iflytek.astron.console.hub.service.chat.ChatListService;
import com.iflytek.astron.console.hub.service.knowledge.KnowledgeService;
import com.iflytek.astron.console.toolkit.entity.vo.CategoryTreeVO;
import com.iflytek.astron.console.toolkit.entity.vo.LLMInfoVo;
import com.iflytek.astron.console.toolkit.service.model.ModelService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BotChatServiceImplUnitTest {

    @Mock
    private ChatBotDataService chatBotDataService;
    @Mock
    private ChatDataService chatDataService;
    @Mock
    private SparkChatService sparkChatService;
    @Mock
    private ChatHistoryService chatHistoryService;
    @Mock
    private WorkflowBotChatService workflowBotChatService;
    @Mock
    private KnowledgeService knowledgeService;
    @Mock
    private ChatListDataService chatListDataService;
    @Mock
    private ChatListService chatListService;
    @Mock
    private BotService botService;
    @Mock
    private ModelService modelService;
    @Mock
    private PromptChatService promptChatService;
    @Mock
    private ReqKnowledgeRecordsDataService reqKnowledgeRecordsDataService;
    @Mock
    private com.iflytek.astron.console.hub.util.BotPermissionUtil botPermissionUtil;

    @InjectMocks
    private BotChatServiceImpl botChatService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(botChatService, "maxInputTokens", 8000);
    }

    @Test
    void testChatMessageBot_WorkflowBot_Success() {
        // Given
        ChatBotReqDto chatBotReqDto = createChatBotReqDto();
        SseEmitter sseEmitter = new SseEmitter();
        String sseId = "test-sse-id";
        String workflowOperation = "test-operation";
        String workflowVersion = "v1";

        ChatBotMarket chatBotMarket = createChatBotMarket();
        chatBotMarket.setVersion(BotTypeEnum.WORKFLOW_BOT.getType());

        when(chatBotDataService.findMarketBotByBotId(anyInt())).thenReturn(chatBotMarket);
        doNothing().when(workflowBotChatService).chatWorkflowBot(any(), any(), any(), any(), any());

        // When
        botChatService.chatMessageBot(chatBotReqDto, sseEmitter, sseId, workflowOperation, workflowVersion);

        // Then
        verify(workflowBotChatService).chatWorkflowBot(eq(chatBotReqDto), eq(sseEmitter), eq(sseId), eq(workflowOperation), eq(workflowVersion));
        verify(sparkChatService, never()).chatStream(any(), any(), any(), any(), anyBoolean(), anyBoolean());
        verify(promptChatService, never()).chatStream(any(), any(), any(), any(), anyBoolean(), anyBoolean());
    }

    @Test
    void testChatMessageBot_SparkChat_Success() {
        // Given
        ChatBotReqDto chatBotReqDto = createChatBotReqDto();
        SseEmitter sseEmitter = new SseEmitter();
        String sseId = "test-sse-id";

        ChatBotMarket chatBotMarket = createChatBotMarket();
        chatBotMarket.setModelId(null);
        chatBotMarket.setVersion(1);
        chatBotMarket.setSupportDocument(0); // Disable knowledge base support for this test

        ChatReqRecords createdRecord = createChatReqRecords();
        List<String> knowledgeList = Arrays.asList("knowledge1", "knowledge2");
        List<SparkChatRequest.MessageDto> historyMessages = new ArrayList<>();
        // Add current ask message that will be removed by the code
        SparkChatRequest.MessageDto currentAskMessage = new SparkChatRequest.MessageDto();
        currentAskMessage.setRole("user");
        currentAskMessage.setContent("test question");
        historyMessages.add(currentAskMessage);

        when(chatBotDataService.findMarketBotByBotId(anyInt())).thenReturn(chatBotMarket);
        when(chatDataService.createRequest(any())).thenReturn(createdRecord);
        lenient().when(knowledgeService.getChuncksByBotId(anyInt(), anyString(), anyInt())).thenReturn(knowledgeList);
        when(chatHistoryService.getSystemBotHistory(anyString(), anyLong(), anyBoolean())).thenReturn(historyMessages);
        lenient().when(reqKnowledgeRecordsDataService.create(any())).thenReturn(null);
        doNothing().when(sparkChatService).chatStream(any(), any(), any(), any(), anyBoolean(), anyBoolean());

        // When
        botChatService.chatMessageBot(chatBotReqDto, sseEmitter, sseId, null, null);

        // Then
        verify(chatDataService).createRequest(any(ChatReqRecords.class));
        verify(sparkChatService).chatStream(any(SparkChatRequest.class), eq(sseEmitter), eq(sseId), any(), eq(false), eq(false));
    }

    @Test
    void testChatMessageBot_PromptChat_Success() {
        // Given
        ChatBotReqDto chatBotReqDto = createChatBotReqDto();
        SseEmitter sseEmitter = new SseEmitter();
        String sseId = "test-sse-id";

        ChatBotMarket chatBotMarket = createChatBotMarket();
        chatBotMarket.setModelId(1L);
        chatBotMarket.setVersion(1);

        ChatReqRecords createdRecord = createChatReqRecords();
        List<String> knowledgeList = Arrays.asList("knowledge1", "knowledge2");
        List<SparkChatRequest.MessageDto> historyMessages = new ArrayList<>();
        // Add current ask message that will be removed by the code
        SparkChatRequest.MessageDto currentAskMessage = new SparkChatRequest.MessageDto();
        currentAskMessage.setRole("user");
        currentAskMessage.setContent("test question");
        historyMessages.add(currentAskMessage);
        LLMInfoVo llmInfoVo = createLLMInfoVo();

        when(chatBotDataService.findMarketBotByBotId(anyInt())).thenReturn(chatBotMarket);
        when(chatDataService.createRequest(any())).thenReturn(createdRecord);
        lenient().when(knowledgeService.getChuncksByBotId(anyInt(), anyString(), anyInt())).thenReturn(knowledgeList);
        lenient().when(chatHistoryService.getSystemBotHistory(anyString(), anyLong(), anyBoolean())).thenReturn(historyMessages);
        when(modelService.getDetail(anyInt(), anyLong(), any())).thenReturn(new ApiResult<>(0, "success", llmInfoVo, 1L));
        lenient().when(reqKnowledgeRecordsDataService.create(any())).thenReturn(null);
        doNothing().when(promptChatService).chatStream(any(), any(), any(), any(), anyBoolean(), anyBoolean());

        // When
        botChatService.chatMessageBot(chatBotReqDto, sseEmitter, sseId, null, null);

        // Then
        verify(modelService).getDetail(eq(0), eq(1L), isNull());
        verify(promptChatService).chatStream(any(JSONObject.class), eq(sseEmitter), eq(sseId), any(), eq(false), eq(false));
    }

    @Test
    void testChatMessageBot_ModelNotFound() {
        // Given
        ChatBotReqDto chatBotReqDto = createChatBotReqDto();
        SseEmitter sseEmitter = new SseEmitter();
        String sseId = "test-sse-id";

        ChatBotMarket chatBotMarket = createChatBotMarket();
        chatBotMarket.setModelId(1L);
        chatBotMarket.setVersion(1);

        ChatReqRecords createdRecord = createChatReqRecords();
        List<String> knowledgeList = Arrays.asList("knowledge1", "knowledge2");
        List<SparkChatRequest.MessageDto> historyMessages = new ArrayList<>();

        when(chatBotDataService.findMarketBotByBotId(anyInt())).thenReturn(chatBotMarket);
        when(chatDataService.createRequest(any())).thenReturn(createdRecord);
        lenient().when(knowledgeService.getChuncksByBotId(anyInt(), anyString(), anyInt())).thenReturn(knowledgeList);
        lenient().when(chatHistoryService.getSystemBotHistory(anyString(), anyLong(), anyBoolean())).thenReturn(historyMessages);
        when(modelService.getDetail(anyInt(), anyLong(), any())).thenReturn(new ApiResult<>(0, "success", null, 1L));
        lenient().when(reqKnowledgeRecordsDataService.create(any())).thenReturn(null);

        // When
        botChatService.chatMessageBot(chatBotReqDto, sseEmitter, sseId, null, null);

        // Then
        verify(modelService).getDetail(eq(0), eq(1L), isNull());
        verify(promptChatService, never()).chatStream(any(), any(), any(), any(), anyBoolean(), anyBoolean());
    }

    @Test
    void testChatMessageBot_BotNotOnShelf() {
        // Given
        ChatBotReqDto chatBotReqDto = createChatBotReqDto();
        SseEmitter sseEmitter = new SseEmitter();
        String sseId = "test-sse-id";

        ChatBotBase chatBotBase = createChatBotBase();
        ChatReqRecords createdRecord = createChatReqRecords();
        List<String> knowledgeList = Arrays.asList("knowledge1", "knowledge2");
        List<SparkChatRequest.MessageDto> historyMessages = new ArrayList<>();
        // Add current ask message that will be removed by the code
        SparkChatRequest.MessageDto currentAskMessage = new SparkChatRequest.MessageDto();
        currentAskMessage.setRole("user");
        currentAskMessage.setContent("test question");
        historyMessages.add(currentAskMessage);

        when(chatBotDataService.findMarketBotByBotId(anyInt())).thenReturn(null);
        when(chatBotDataService.findById(anyInt())).thenReturn(Optional.of(chatBotBase));
        when(chatDataService.createRequest(any())).thenReturn(createdRecord);
        lenient().when(knowledgeService.getChuncksByBotId(anyInt(), anyString(), anyInt())).thenReturn(knowledgeList);
        lenient().when(chatHistoryService.getSystemBotHistory(anyString(), anyLong(), anyBoolean())).thenReturn(historyMessages);
        lenient().when(reqKnowledgeRecordsDataService.create(any())).thenReturn(null);
        doNothing().when(sparkChatService).chatStream(any(), any(), any(), any(), anyBoolean(), anyBoolean());

        // When
        botChatService.chatMessageBot(chatBotReqDto, sseEmitter, sseId, null, null);

        // Then
        verify(chatBotDataService).findMarketBotByBotId(eq(chatBotReqDto.getBotId()));
        verify(chatBotDataService).findById(eq(chatBotReqDto.getBotId()));
        verify(sparkChatService).chatStream(any(SparkChatRequest.class), eq(sseEmitter), eq(sseId), any(), eq(false), eq(false));
    }

    @Test
    void testChatMessageBot_BotNotExists() {
        // Given
        ChatBotReqDto chatBotReqDto = createChatBotReqDto();
        SseEmitter sseEmitter = new SseEmitter();
        String sseId = "test-sse-id";

        when(chatBotDataService.findMarketBotByBotId(anyInt())).thenReturn(null);
        lenient().when(chatBotDataService.findById(anyInt())).thenReturn(Optional.empty());

        // When & Then
        assertDoesNotThrow(() -> botChatService.chatMessageBot(chatBotReqDto, sseEmitter, sseId, null, null));
    }

    @Test
    void testReAnswerMessageBot_Success() {
        // Given
        Long requestId = 1L;
        Integer botId = 1;
        SseEmitter sseEmitter = new SseEmitter();
        String sseId = "test-sse-id";

        ChatReqRecords chatReqRecords = createChatReqRecords();
        ChatBotMarket chatBotMarket = createChatBotMarket();
        chatBotMarket.setModelId(null);
        List<SparkChatRequest.MessageDto> historyMessages = new ArrayList<>();
        // Add current ask message and previous Q&A that will be removed by the code (edit mode)
        SparkChatRequest.MessageDto prevQuestion = new SparkChatRequest.MessageDto();
        prevQuestion.setRole("user");
        prevQuestion.setContent("previous question");
        historyMessages.add(prevQuestion);
        SparkChatRequest.MessageDto prevAnswer = new SparkChatRequest.MessageDto();
        prevAnswer.setRole("assistant");
        prevAnswer.setContent("previous answer");
        historyMessages.add(prevAnswer);
        SparkChatRequest.MessageDto currentAskMessage = new SparkChatRequest.MessageDto();
        currentAskMessage.setRole("user");
        currentAskMessage.setContent("test question");
        historyMessages.add(currentAskMessage);

        when(chatDataService.findRequestById(requestId)).thenReturn(chatReqRecords);
        when(chatBotDataService.findMarketBotByBotId(botId)).thenReturn(chatBotMarket);
        lenient().when(chatHistoryService.getSystemBotHistory(anyString(), anyLong(), anyBoolean())).thenReturn(historyMessages);
        lenient().when(knowledgeService.getChuncksByBotId(anyInt(), anyString(), anyInt())).thenReturn(Arrays.asList("knowledge"));
        lenient().when(reqKnowledgeRecordsDataService.create(any())).thenReturn(null);
        doNothing().when(sparkChatService).chatStream(any(), any(), any(), any(), anyBoolean(), anyBoolean());

        // When
        botChatService.reAnswerMessageBot(requestId, botId, sseEmitter, sseId);

        // Then
        verify(chatDataService).findRequestById(requestId);
        verify(sparkChatService).chatStream(any(SparkChatRequest.class), eq(sseEmitter), eq(sseId), eq(chatReqRecords), eq(true), eq(false));
    }

    @Test
    void testDebugChatMessageBot_WithNullModelId() {
        // Given
        String text = "test message";
        String prompt = "test prompt";
        List<String> messages = Arrays.asList("message1", "message2");
        String uid = "test-uid";
        String openedTool = "ifly_search";
        String model = "x1";
        Long modelId = null;
        List<String> maasDatasetList = Arrays.asList("dataset1");
        SseEmitter sseEmitter = new SseEmitter();
        String sseId = "test-sse-id";

        when(knowledgeService.getChuncks(any(), anyString(), anyInt(), anyBoolean())).thenReturn(Arrays.asList("knowledge"));
        doNothing().when(sparkChatService).chatStream(any(), any(), any(), any(), anyBoolean(), anyBoolean());

        // When
        botChatService.debugChatMessageBot(text, prompt, messages, uid, openedTool, model, modelId, maasDatasetList, sseEmitter, sseId);

        // Then
        verify(sparkChatService).chatStream(any(SparkChatRequest.class), eq(sseEmitter), eq(sseId), isNull(), eq(false), eq(true));
        verify(promptChatService, never()).chatStream(any(), any(), any(), any(), anyBoolean(), anyBoolean());
    }

    @Test
    void testDebugChatMessageBot_WithModelId() {
        // Given
        String text = "test message";
        String prompt = "test prompt";
        List<String> messages = Arrays.asList("message1", "message2");
        String uid = "test-uid";
        String openedTool = "ifly_search";
        String model = "test-model";
        Long modelId = 1L;
        List<String> maasDatasetList = Arrays.asList("dataset1");
        SseEmitter sseEmitter = new SseEmitter();
        String sseId = "test-sse-id";

        LLMInfoVo llmInfoVo = createLLMInfoVo();
        llmInfoVo.setLlmId(100L); // 设置llmId以便checkModelBase能够正常工作
        llmInfoVo.setServiceId("test-service-id"); // 设置serviceId
        when(modelService.getDetail(anyInt(), anyLong(), any())).thenReturn(new ApiResult<>(0, "success", llmInfoVo, 1L));
        when(modelService.checkModelBase(anyLong(), anyString(), anyString(), anyString(), any())).thenReturn(true);
        when(knowledgeService.getChuncks(any(), anyString(), anyInt(), anyBoolean())).thenReturn(Arrays.asList("knowledge"));
        doNothing().when(promptChatService).chatStream(any(JSONObject.class), any(SseEmitter.class), anyString(), any(), anyBoolean(), anyBoolean());

        // When & Then - mock SpaceInfoUtil静态方法
        try (var mockedSpaceInfoUtil = mockStatic(com.iflytek.astron.console.commons.util.space.SpaceInfoUtil.class)) {
            mockedSpaceInfoUtil.when(com.iflytek.astron.console.commons.util.space.SpaceInfoUtil::getSpaceId).thenReturn(1L);

            botChatService.debugChatMessageBot(text, prompt, messages, uid, openedTool, model, modelId, maasDatasetList, sseEmitter, sseId);

            verify(modelService).getDetail(eq(0), eq(modelId), isNull());
            verify(promptChatService).chatStream(any(JSONObject.class), eq(sseEmitter), eq(sseId), isNull(), eq(false), eq(true));
            verify(sparkChatService, never()).chatStream(any(), any(), any(), any(), anyBoolean(), anyBoolean());
        }
    }

    @Test
    void testClear_EmptyChat() {
        // Given
        Long chatId = 1L;
        String uid = "test-uid";
        Integer botId = 1;
        ChatBotBase botBase = createChatBotBase();

        ChatList chatList = new ChatList();
        chatList.setBotId(botId);
        chatList.setTitle("Test Chat");
        chatList.setCreateTime(LocalDateTime.now());

        when(chatListDataService.findByUidAndChatId(uid, chatId)).thenReturn(chatList);
        when(chatDataService.countMessagesByChatId(chatId)).thenReturn(0L);

        // When
        ChatListCreateResponse response = botChatService.clear(chatId, uid, botId, botBase);

        // Then
        assertNotNull(response);
        assertEquals(chatId, response.getId());
        assertEquals("Test Chat", response.getTitle());
        assertEquals(botId, response.getBotId());
        verify(chatListService, never()).logicDeleteChatList(anyLong(), anyString());
        verify(chatListService, never()).createRestartChat(anyString(), anyString(), anyInt());
    }

    @Test
    void testClear_WithChatHistory() {
        // Given
        Long chatId = 1L;
        String uid = "test-uid";
        Integer botId = 1;
        ChatBotBase botBase = createChatBotBase();
        botBase.setUid("different-uid");

        ChatList chatList = new ChatList();
        chatList.setBotId(botId);
        chatList.setTitle("Test Chat");
        chatList.setCreateTime(LocalDateTime.now());

        ChatListCreateResponse newChatResponse = new ChatListCreateResponse();
        newChatResponse.setId(2L);
        newChatResponse.setTitle("New Chat");

        when(chatListDataService.findByUidAndChatId(uid, chatId)).thenReturn(chatList);
        when(chatDataService.countMessagesByChatId(chatId)).thenReturn(5L);
        when(chatListService.logicDeleteChatList(chatId, uid)).thenReturn(true);
        when(chatListService.createRestartChat(uid, "", botId)).thenReturn(newChatResponse);
        doNothing().when(botService).addV2Bot(uid, botId);

        // When
        ChatListCreateResponse response = botChatService.clear(chatId, uid, botId, botBase);

        // Then
        assertNotNull(response);
        assertEquals(2L, response.getId());
        verify(chatListService).logicDeleteChatList(chatId, uid);
        verify(chatListService).createRestartChat(uid, "", botId);
        verify(botService).addV2Bot(uid, botId);
    }

    @Test
    void testClear_ChatNotFound() {
        // Given
        Long chatId = 1L;
        String uid = "test-uid";
        Integer botId = 1;
        ChatBotBase botBase = createChatBotBase();

        when(chatListDataService.findByUidAndChatId(uid, chatId)).thenReturn(null);

        // When
        ChatListCreateResponse response = botChatService.clear(chatId, uid, botId, botBase);

        // Then
        assertNotNull(response);
        assertNull(response.getId());
        verify(chatListService, never()).logicDeleteChatList(anyLong(), anyString());
    }

    @Test
    void testClear_BotIdMismatch() {
        // Given
        Long chatId = 1L;
        String uid = "test-uid";
        Integer botId = 1;
        ChatBotBase botBase = createChatBotBase();

        ChatList chatList = new ChatList();
        chatList.setBotId(2); // Different botId

        when(chatListDataService.findByUidAndChatId(uid, chatId)).thenReturn(chatList);

        // When
        ChatListCreateResponse response = botChatService.clear(chatId, uid, botId, botBase);

        // Then
        assertNotNull(response);
        assertNull(response.getId());
        verify(chatListService, never()).logicDeleteChatList(anyLong(), anyString());
    }

    // Helper methods to create test objects
    private ChatBotReqDto createChatBotReqDto() {
        ChatBotReqDto dto = new ChatBotReqDto();
        dto.setUid("test-uid");
        dto.setChatId(1L);
        dto.setAsk("test question");
        dto.setBotId(1);
        dto.setEdit(false);
        return dto;
    }

    private ChatBotMarket createChatBotMarket() {
        ChatBotMarket market = new ChatBotMarket();
        market.setBotId(1);
        market.setBotStatus(ShelfStatusEnum.ON_SHELF.getCode());
        market.setPrompt("test prompt");
        market.setSupportContext(1);
        market.setModel("x1"); // Use Spark model to trigger sparkChatService
        market.setOpenedTool("ifly_search");
        market.setVersion(1);
        market.setModelId(null);
        market.setSupportDocument(0);
        return market;
    }

    private ChatBotBase createChatBotBase() {
        return ChatBotBase.builder()
                .id(1)
                .uid("test-uid")
                .botName("Test Bot")
                .prompt("test prompt")
                .supportContext(1)
                .model("x1") // Use Spark model to trigger sparkChatService
                .openedTool("ifly_search")
                .version(1)
                .modelId(null)
                .supportDocument(0)
                .build();
    }

    private ChatReqRecords createChatReqRecords() {
        ChatReqRecords record = new ChatReqRecords();
        record.setId(1L);
        record.setChatId(1L);
        record.setUid("test-uid");
        record.setMessage("test question");
        record.setClientType(0);
        record.setCreateTime(LocalDateTime.now());
        record.setUpdateTime(LocalDateTime.now());
        record.setNewContext(1);
        return record;
    }

    private LLMInfoVo createLLMInfoVo() {
        LLMInfoVo llmInfoVo = new LLMInfoVo();
        llmInfoVo.setId(1L);
        llmInfoVo.setName("test-model");
        llmInfoVo.setUrl("http://test.com");
        llmInfoVo.setApiKey("test-api-key");
        llmInfoVo.setDomain("test-domain");
        llmInfoVo.setConfig("[]");

        List<CategoryTreeVO> categoryTree = new ArrayList<>();
        CategoryTreeVO contextLengthTag = new CategoryTreeVO();
        contextLengthTag.setKey("contextLengthTag");
        contextLengthTag.setName("32k");
        categoryTree.add(contextLengthTag);

        llmInfoVo.setCategoryTree(categoryTree);
        return llmInfoVo;
    }
}
