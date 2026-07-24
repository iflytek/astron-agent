package com.iflytek.astron.console.hub.service.chat.impl;

import com.iflytek.astron.console.commons.dto.llm.SparkChatRequest;
import com.iflytek.astron.console.commons.entity.bot.ChatBotBase;
import com.iflytek.astron.console.commons.entity.bot.ChatBotMarket;
import com.iflytek.astron.console.commons.entity.bot.UserLangChainInfo;
import com.iflytek.astron.console.commons.dto.bot.ChatBotReqDto;
import com.iflytek.astron.console.commons.dto.bot.DebugChatBotReqDto;
import com.iflytek.astron.console.commons.entity.chat.ChatList;
import com.iflytek.astron.console.commons.dto.chat.ChatListCreateResponse;
import com.iflytek.astron.console.commons.entity.chat.ChatReqRecords;
import com.iflytek.astron.console.commons.enums.ShelfStatusEnum;
import com.iflytek.astron.console.commons.enums.bot.BotTypeEnum;
import com.iflytek.astron.console.commons.service.bot.BotService;
import com.iflytek.astron.console.commons.service.bot.ChatBotDataService;
import com.iflytek.astron.console.commons.service.data.ChatDataService;
import com.iflytek.astron.console.commons.service.data.ChatHistoryService;
import com.iflytek.astron.console.commons.service.data.ChatListDataService;
import com.iflytek.astron.console.commons.service.data.UserLangChainDataService;
import com.iflytek.astron.console.commons.service.workflow.WorkflowBotChatService;
import com.iflytek.astron.console.commons.util.space.SpaceInfoUtil;
import com.iflytek.astron.console.hub.data.ReqKnowledgeRecordsDataService;
import com.iflytek.astron.console.hub.service.agentmemory.runtime.AgentMemoryRuntimeService;
import com.iflytek.astron.console.hub.service.chat.ChatListService;
import com.iflytek.astron.console.hub.service.chat.springai.AgentChatTask;
import com.iflytek.astron.console.hub.service.chat.springai.SpringAiAgentChatService;
import com.iflytek.astron.console.hub.service.knowledge.KnowledgeService;
import com.iflytek.astron.console.toolkit.entity.vo.CategoryTreeVO;
import com.iflytek.astron.console.toolkit.entity.vo.LLMInfoVo;
import com.iflytek.astron.console.toolkit.service.model.ModelService;
import com.iflytek.astron.console.toolkit.service.workflow.WorkflowService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
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
    private SpringAiAgentChatService springAiAgentChatService;
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
    private WorkflowService workflowService;
    @Mock
    private UserLangChainDataService userLangChainDataService;
    @Mock
    private ReqKnowledgeRecordsDataService reqKnowledgeRecordsDataService;
    @Mock
    private com.iflytek.astron.console.hub.util.BotPermissionUtil botPermissionUtil;
    @Mock
    private com.iflytek.astron.console.hub.service.bot.PersonalityConfigService personalityConfigService;
    @Mock
    private AgentMemoryRuntimeService agentMemoryRuntimeService;

    @InjectMocks
    private BotChatServiceImpl botChatService;

    private MockedStatic<SpaceInfoUtil> spaceInfoUtil;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(botChatService, "maxInputTokens", 8000);
        spaceInfoUtil = mockStatic(SpaceInfoUtil.class);
        spaceInfoUtil.when(SpaceInfoUtil::getSpaceId).thenReturn(1L);
        lenient().when(agentMemoryRuntimeService.enrichMessages(any(AgentChatTask.class)))
                .thenAnswer(invocation -> invocation.<AgentChatTask>getArgument(0).getMessages());
    }

    @AfterEach
    void tearDown() {
        spaceInfoUtil.close();
    }

    @Test
    void testChatMessageBot_WorkflowBot_RoutesToWorkflowService() {
        ChatBotReqDto chatBotReqDto = createChatBotReqDto();
        SseEmitter sseEmitter = new SseEmitter();

        ChatBotMarket chatBotMarket = createChatBotMarket();
        chatBotMarket.setVersion(BotTypeEnum.WORKFLOW_BOT.getType());
        UserLangChainInfo userLangChainInfo = new UserLangChainInfo();
        userLangChainInfo.setFlowId("test-flow-id");

        when(chatBotDataService.findMarketBotByBotId(anyInt())).thenReturn(chatBotMarket);
        when(userLangChainDataService.findOneByBotId(anyInt())).thenReturn(userLangChainInfo);
        when(workflowService.refreshWorkflowRuntimeProtocol("test-flow-id")).thenReturn(true);

        botChatService.chatMessageBot(chatBotReqDto, sseEmitter, "sse", "op", "v1");

        verify(workflowBotChatService).chatWorkflowBot(eq(chatBotReqDto), eq(sseEmitter), eq("sse"), eq("op"), eq("v1"));
        verify(springAiAgentChatService, never()).chat(any(), any(), any());
    }

    @Test
    void testChatMessageBot_SparkModel_BuildsSparkTask() {
        ChatBotReqDto chatBotReqDto = createChatBotReqDto();
        SseEmitter sseEmitter = new SseEmitter();

        ChatBotMarket chatBotMarket = createChatBotMarket();
        chatBotMarket.setModelId(null);
        chatBotMarket.setVersion(1);
        chatBotMarket.setSupportDocument(0);

        when(chatBotDataService.findMarketBotByBotId(anyInt())).thenReturn(chatBotMarket);
        when(chatDataService.createRequest(any())).thenReturn(createChatReqRecords());
        when(chatHistoryService.getSystemBotHistory(anyString(), anyLong(), anyBoolean())).thenReturn(historyMessages());

        botChatService.chatMessageBot(chatBotReqDto, sseEmitter, "sse", null, null);

        AgentChatTask task = captureTask();
        assertNull(task.getLlmInfoVo());
        assertEquals("x1", task.getSparkModelName());
        assertEquals(1L, task.getSpaceId());
        assertFalse(task.isEdit());
        assertFalse(task.isDebug());
        assertNotNull(task.getChatReqRecords());
    }

    @Test
    void testChatMessageBot_CustomModel_BuildsCustomTask() {
        ChatBotReqDto chatBotReqDto = createChatBotReqDto();
        SseEmitter sseEmitter = new SseEmitter();

        ChatBotMarket chatBotMarket = createChatBotMarket();
        chatBotMarket.setModelId(1L);
        chatBotMarket.setVersion(1);
        chatBotMarket.setSupportDocument(0);

        LLMInfoVo llmInfoVo = createLLMInfoVo();
        when(chatBotDataService.findMarketBotByBotId(anyInt())).thenReturn(chatBotMarket);
        when(chatDataService.createRequest(any())).thenReturn(createChatReqRecords());
        when(chatHistoryService.getSystemBotHistory(anyString(), anyLong(), anyBoolean())).thenReturn(historyMessages());
        when(modelService.getRuntimeModelDetail(1L, "test-uid", 1L)).thenReturn(llmInfoVo);

        botChatService.chatMessageBot(chatBotReqDto, sseEmitter, "sse", null, null);

        AgentChatTask task = captureTask();
        assertNotNull(task.getLlmInfoVo());
        assertNull(task.getSparkModelName());
        assertFalse(task.isDebug());
    }

    @Test
    void testChatMessageBot_BaseBot_PassesSavedMcpServerUrls() {
        ChatBotReqDto chatBotReqDto = createChatBotReqDto();
        SseEmitter sseEmitter = new SseEmitter();

        ChatBotBase chatBotBase = createChatBotBase();
        chatBotBase.setModelId(1L);
        chatBotBase.setModel("test-model");
        chatBotBase.setOpenedTool("");
        chatBotBase.setMcpServerUrls("[\"https://mcp.example.com/sse\"]");

        when(chatBotDataService.findMarketBotByBotId(anyInt())).thenReturn(null);
        when(chatBotDataService.findById(anyInt())).thenReturn(Optional.of(chatBotBase));
        when(chatDataService.createRequest(any())).thenReturn(createChatReqRecords());
        when(chatHistoryService.getSystemBotHistory(anyString(), anyLong(), anyBoolean())).thenReturn(historyMessages());
        when(modelService.getRuntimeModelDetail(1L, "test-uid", 1L)).thenReturn(createLLMInfoVo());

        botChatService.chatMessageBot(chatBotReqDto, sseEmitter, "sse", null, null);

        AgentChatTask task = captureTask();
        assertEquals("[\"https://mcp.example.com/sse\"]", task.getMcpServerUrls());
    }

    @Test
    void testChatMessageBot_BotNotExists_DoesNotThrow() {
        ChatBotReqDto chatBotReqDto = createChatBotReqDto();
        SseEmitter sseEmitter = new SseEmitter();

        when(chatBotDataService.findMarketBotByBotId(anyInt())).thenReturn(null);
        lenient().when(chatBotDataService.findById(anyInt())).thenReturn(Optional.empty());

        assertDoesNotThrow(() -> botChatService.chatMessageBot(chatBotReqDto, sseEmitter, "sse", null, null));
        verify(springAiAgentChatService, never()).chat(any(), any(), any());
    }

    @Test
    void testReAnswerMessageBot_BuildsEditTask() {
        SseEmitter sseEmitter = new SseEmitter();

        ChatReqRecords chatReqRecords = createChatReqRecords();
        ChatBotMarket chatBotMarket = createChatBotMarket();
        chatBotMarket.setModelId(null);

        when(chatDataService.findRequestById(1L)).thenReturn(chatReqRecords);
        when(chatBotDataService.findMarketBotByBotId(1)).thenReturn(chatBotMarket);
        when(chatHistoryService.getSystemBotHistory(anyString(), anyLong(), anyBoolean())).thenReturn(historyMessages());

        botChatService.reAnswerMessageBot(1L, 1, sseEmitter, "sse");

        AgentChatTask task = captureTask();
        assertTrue(task.isEdit());
        assertFalse(task.isDebug());
        assertEquals("x1", task.getSparkModelName());
    }

    @Test
    void testDebugChatMessageBot_NullModelId_BuildsDebugSparkTask() {
        DebugChatBotReqDto request = new DebugChatBotReqDto();
        request.setText("test message");
        request.setPrompt("test prompt");
        request.setMessages(Arrays.asList("message1", "message2"));
        request.setUid("test-uid");
        request.setSpaceId(42L);
        request.setOpenedTool("web_search");
        request.setModel("x1");
        request.setModelId(null);
        request.setMaasDatasetList(Arrays.asList("dataset1"));
        request.setPersonalityConfig(null);

        SseEmitter sseEmitter = new SseEmitter();

        when(personalityConfigService.getChatPrompt(isNull(), eq("test prompt"))).thenReturn("test prompt");
        when(knowledgeService.getChuncks(any(), anyString(), anyInt(), anyBoolean())).thenReturn(Arrays.asList("knowledge"));

        botChatService.debugChatMessageBot(request, sseEmitter, "sse");

        AgentChatTask task = captureTask();
        assertTrue(task.isDebug());
        assertNull(task.getChatReqRecords());
        assertNull(task.getLlmInfoVo());
        assertEquals("x1", task.getSparkModelName());
    }

    @Test
    void testDebugChatMessageBot_WithModelId_ChecksModelAndBuildsCustomTask() {
        DebugChatBotReqDto request = new DebugChatBotReqDto();
        request.setText("test message");
        request.setPrompt("test prompt");
        request.setMessages(Arrays.asList("message1", "message2"));
        request.setUid("test-uid");
        request.setSpaceId(42L);
        request.setOpenedTool("web_search");
        request.setModel("test-model");
        request.setModelId(1L);
        request.setMaasDatasetList(Arrays.asList("dataset1"));
        request.setPersonalityConfig(null);

        SseEmitter sseEmitter = new SseEmitter();

        LLMInfoVo llmInfoVo = createLLMInfoVo();
        llmInfoVo.setLlmId(100L);
        llmInfoVo.setServiceId("test-service-id");
        when(personalityConfigService.getChatPrompt(isNull(), eq("test prompt"))).thenReturn("test prompt");
        when(modelService.getRuntimeModelDetail(1L, "test-uid", 42L)).thenReturn(llmInfoVo);
        when(modelService.checkModelBase(anyLong(), anyString(), anyString(), anyString(), any())).thenReturn(true);
        when(knowledgeService.getChuncks(any(), anyString(), anyInt(), anyBoolean())).thenReturn(Arrays.asList("knowledge"));

        botChatService.debugChatMessageBot(request, sseEmitter, "sse");

        verify(modelService).getRuntimeModelDetail(1L, "test-uid", 42L);
        verify(modelService).checkModelBase(anyLong(), anyString(), anyString(), eq("test-uid"), eq(42L));
        AgentChatTask task = captureTask();
        assertTrue(task.isDebug());
        assertNotNull(task.getLlmInfoVo());
        assertEquals(42L, task.getSpaceId());
    }

    @Test
    void testClear_EmptyChat() {
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

        ChatListCreateResponse response = botChatService.clear(chatId, uid, botId, botBase);

        assertNotNull(response);
        assertEquals(chatId, response.getId());
        assertEquals("Test Chat", response.getTitle());
        assertEquals(botId, response.getBotId());
        verify(chatListService, never()).logicDeleteChatList(anyLong(), anyString());
        verify(chatListService, never()).createRestartChat(anyString(), anyString(), anyInt());
    }

    @Test
    void testClear_WithChatHistory() {
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

        ChatListCreateResponse response = botChatService.clear(chatId, uid, botId, botBase);

        assertNotNull(response);
        assertEquals(2L, response.getId());
        verify(chatListService).logicDeleteChatList(chatId, uid);
        verify(chatListService).createRestartChat(uid, "", botId);
        verify(botService).addV2Bot(uid, botId);
    }

    @Test
    void testClear_ChatNotFound() {
        Long chatId = 1L;
        String uid = "test-uid";
        Integer botId = 1;
        ChatBotBase botBase = createChatBotBase();

        when(chatListDataService.findByUidAndChatId(uid, chatId)).thenReturn(null);

        ChatListCreateResponse response = botChatService.clear(chatId, uid, botId, botBase);

        assertNotNull(response);
        assertNull(response.getId());
        verify(chatListService, never()).logicDeleteChatList(anyLong(), anyString());
    }

    @Test
    void testClear_BotIdMismatch() {
        Long chatId = 1L;
        String uid = "test-uid";
        Integer botId = 1;
        ChatBotBase botBase = createChatBotBase();

        ChatList chatList = new ChatList();
        chatList.setBotId(2);

        when(chatListDataService.findByUidAndChatId(uid, chatId)).thenReturn(chatList);

        ChatListCreateResponse response = botChatService.clear(chatId, uid, botId, botBase);

        assertNotNull(response);
        assertNull(response.getId());
        verify(chatListService, never()).logicDeleteChatList(anyLong(), anyString());
    }

    private AgentChatTask captureTask() {
        ArgumentCaptor<AgentChatTask> captor = ArgumentCaptor.forClass(AgentChatTask.class);
        verify(springAiAgentChatService).chat(captor.capture(), any(SseEmitter.class), anyString());
        return captor.getValue();
    }

    /**
     * History always includes the current ask (and a prior Q&A) — mirrors ChatHistoryService output.
     */
    private List<SparkChatRequest.MessageDto> historyMessages() {
        List<SparkChatRequest.MessageDto> list = new ArrayList<>();
        String[][] roleContents = {{"user", "previous question"}, {"assistant", "previous answer"}, {"user", "test question"}};
        for (String[] rc : roleContents) {
            SparkChatRequest.MessageDto message = new SparkChatRequest.MessageDto();
            message.setRole(rc[0]);
            message.setContent(rc[1]);
            list.add(message);
        }
        return list;
    }

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
        market.setModel("x1");
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
                .model("x1")
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
        llmInfoVo.setProvider("openai");
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
