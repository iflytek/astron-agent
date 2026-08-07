package com.iflytek.astron.console.hub.service.chat.impl;

import com.iflytek.astron.console.commons.dto.bot.BotModelDto;
import com.iflytek.astron.console.commons.dto.bot.BotInfoDto;
import com.iflytek.astron.console.commons.dto.chat.ChatBotListDto;
import com.iflytek.astron.console.commons.dto.chat.ChatListCreateResponse;
import com.iflytek.astron.console.commons.dto.chat.ChatListResponseDto;
import com.iflytek.astron.console.commons.entity.chat.*;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.commons.service.bot.BotService;
import com.iflytek.astron.console.commons.service.data.ChatDataService;
import com.iflytek.astron.console.commons.service.data.ChatListDataService;
import com.iflytek.astron.console.toolkit.entity.vo.LLMInfoVo;
import com.iflytek.astron.console.toolkit.service.model.ModelService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatListServiceImplTest {

    @InjectMocks
    private ChatListServiceImpl chatListService;

    @Mock
    private ChatListDataService chatListDataService;

    @Mock
    private ChatDataService chatDataService;

    @Mock
    private BotService botService;

    @Mock
    private ModelService modelService;

    @Mock
    private HttpServletRequest httpServletRequest;

    private String uid;
    private Integer botId;
    private Long chatId;
    private String chatListName;
    private ChatList chatList;
    private List<ChatReqRecords> chatReqRecords;
    private List<ChatBotListDto> botChatList;

    @BeforeEach
    void setUp() {
        uid = "test-user-123";
        botId = 1;
        chatId = 100L;
        chatListName = "Test Chat";

        chatList = new ChatList();
        chatList.setId(chatId);
        chatList.setTitle(chatListName);
        chatList.setUid(uid);
        chatList.setBotId(botId);
        chatList.setEnable(1);
        chatList.setIsDelete(0);
        chatList.setSticky(0);
        chatList.setCreateTime(LocalDateTime.now());
        chatList.setUpdateTime(LocalDateTime.now());

        chatReqRecords = new ArrayList<>();
        ChatReqRecords record = new ChatReqRecords();
        record.setId(1L);
        record.setChatId(chatId);
        record.setUid(uid);
        chatReqRecords.add(record);

        botChatList = new ArrayList<>();
        ChatBotListDto botListDto = new ChatBotListDto();
        botListDto.setId(chatId);
        botListDto.setBotTitle("Test Bot");
        botListDto.setSticky(0);
        botListDto.setUpdateTime(LocalDateTime.now());
        botChatList.add(botListDto);

        // Common mock setups
        setupCommonMocks();
    }

    private void setupCommonMocks() {
        // Mock for model service with ApiResult wrapper
        lenient().when(modelService.getDetail(anyInt(), anyLong(), any(HttpServletRequest.class)))
                .thenReturn(ApiResult.success(createDefaultLLMInfoVo()));
    }

    private LLMInfoVo createDefaultLLMInfoVo() {
        LLMInfoVo llmInfoVo = new LLMInfoVo();
        llmInfoVo.setId(1L);
        llmInfoVo.setDomain("test-domain");
        llmInfoVo.setIcon("test-icon");
        llmInfoVo.setName("Test Model");
        return llmInfoVo;
    }

    @Test
    void testCreateChatListForRestart_WithEmptyExistingChat_ShouldReuseExistingChat() {
        // Given
        when(chatListDataService.findByUidAndChatId(uid, chatId)).thenReturn(chatList);
        when(chatDataService.findRequestsByChatIdAndUid(chatId, uid)).thenReturn(Collections.emptyList());

        // When
        ChatListCreateResponse result = chatListService.createChatListForRestart(uid, chatListName, botId, chatId);

        // Then
        assertNotNull(result);
        assertEquals(chatId, result.getId());
        assertEquals(chatListName, result.getTitle());
        assertEquals(botId, result.getBotId());
    }

    @Test
    void testCreateChatListForRestart_WithExistingRequests_ShouldCreateNewChat() {
        // Given
        when(chatListDataService.findByUidAndChatId(uid, chatId)).thenReturn(chatList);
        when(chatDataService.findRequestsByChatIdAndUid(chatId, uid)).thenReturn(chatReqRecords);

        // When
        ChatListCreateResponse result = chatListService.createChatListForRestart(uid, chatListName, botId, chatId);

        // Then
        assertNotNull(result);
        assertNotEquals(chatId, result.getId());
        assertEquals(botId, result.getBotId());
        verify(chatListDataService).createChat(any(ChatList.class));
    }

    @Test
    void testCreateChatListForRestart_WithNullChatListName_ShouldUseDefaultName() {
        // Given
        when(chatListDataService.findByUidAndChatId(uid, chatId)).thenReturn(null);

        // When
        ChatListCreateResponse result = chatListService.createChatListForRestart(uid, null, botId, chatId);

        // Then
        assertNotNull(result);
        assertEquals("New Chat Window", result.getTitle());
        verify(chatListDataService).createChat(any(ChatList.class));
    }

    @Test
    void testCreateChatListForRestart_WithLongChatListName_ShouldTruncateName() {
        // Given
        String longName = "This is a very long chat list name that exceeds the maximum length";
        when(chatListDataService.findByUidAndChatId(uid, chatId)).thenReturn(null);

        // When
        ChatListCreateResponse result = chatListService.createChatListForRestart(uid, longName, botId, chatId);

        // Then
        assertNotNull(result);
        assertTrue(result.getTitle().length() <= 16);
        verify(chatListDataService).createChat(any(ChatList.class));
    }

    @Test
    void testAllChatList_WithValidBotChatList_ShouldReturnSortedList() {
        // Given
        ChatBotListDto dto1 = new ChatBotListDto();
        dto1.setId(1L);
        dto1.setBotTitle("Bot 1");
        dto1.setSticky(0);
        dto1.setUpdateTime(LocalDateTime.now().minusHours(1));

        ChatBotListDto dto2 = new ChatBotListDto();
        dto2.setId(2L);
        dto2.setBotTitle("Bot 2");
        dto2.setSticky(1);
        dto2.setUpdateTime(LocalDateTime.now());

        List<ChatBotListDto> mockBotList = Arrays.asList(dto1, dto2);
        when(chatListDataService.getBotChatList(uid)).thenReturn(mockBotList);

        // When
        List<ChatListResponseDto> result = chatListService.allChatList(uid, "type");

        // Then
        assertNotNull(result);
        assertEquals(2, result.size());
        // Verify sorting: sticky items first
        assertEquals(1, result.getFirst().getSticky().intValue());
        assertEquals("Bot 2", result.getFirst().getBotName());
    }

    @Test
    void testAllChatList_WithEmptyBotChatList_ShouldReturnEmptyList() {
        // Given
        when(chatListDataService.getBotChatList(uid)).thenReturn(Collections.emptyList());

        // When
        List<ChatListResponseDto> result = chatListService.allChatList(uid, "type");

        // Then
        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    void testGetBotChatList_ShouldDelegateToDataService() {
        // Given
        when(chatListDataService.getBotChatList(uid)).thenReturn(botChatList);

        // When
        List<ChatBotListDto> result = chatListService.getBotChatList(uid);

        // Then
        assertNotNull(result);
        assertEquals(botChatList, result);
        verify(chatListDataService).getBotChatList(uid);
    }

    @Test
    void testCreateChatList_WithExistingDeletedChat_ShouldReactivateChat() {
        // Given
        chatList.setIsDelete(1);
        when(chatListDataService.findLatestEnabledChatByUserAndBot(uid, botId)).thenReturn(chatList);
        when(chatListDataService.getListByRootChatId(chatList.getId(), uid)).thenReturn(Collections.emptyList());

        // When
        ChatListCreateResponse result = chatListService.createChatList(uid, chatListName, botId);

        // Then
        assertNotNull(result);
        assertEquals(chatList.getId(), result.getId());
        // Verified existing chat handling
        verify(chatListDataService).reactivateChat(chatList.getId());
    }

    @Test
    void testCreateChatList_WithExistingDeletedChatWithChildren_ShouldReactivateBatch() {
        // Given
        chatList.setIsDelete(1);
        List<ChatTreeIndex> indexList = Arrays.asList(
                createChatTreeIndex(1L),
                createChatTreeIndex(2L));
        when(chatListDataService.findLatestEnabledChatByUserAndBot(uid, botId)).thenReturn(chatList);
        when(chatListDataService.getListByRootChatId(chatList.getId(), uid)).thenReturn(indexList);

        // When
        ChatListCreateResponse result = chatListService.createChatList(uid, chatListName, botId);

        // Then
        assertNotNull(result);
        assertEquals(chatList.getId(), result.getId());
        // Verified existing chat handling
        verify(chatListDataService).reactivateChatBatch(Arrays.asList(1L, 2L));
    }

    @Test
    void testCreateChatList_WithActiveExistingChat_ShouldReturnExistingChat() {
        // Given
        chatList.setIsDelete(0);
        when(chatListDataService.findLatestEnabledChatByUserAndBot(uid, botId)).thenReturn(chatList);

        // When
        ChatListCreateResponse result = chatListService.createChatList(uid, chatListName, botId);

        // Then
        assertNotNull(result);
        assertEquals(chatList.getId(), result.getId());
        // Verified existing chat handling
        verify(chatListDataService, never()).createChat(any(ChatList.class));
    }

    @Test
    void testCreateChatList_WithEmptyExistingChat_ShouldReuseExistingChat() {
        // Given
        chatList.setIsDelete(0);
        chatList.setEnabledPluginIds(null);
        chatList.setFileId(null);
        when(chatListDataService.findLatestEnabledChatByUserAndBot(uid, botId)).thenReturn(chatList);
        lenient().when(chatDataService.findRequestsByChatIdAndUid(chatList.getId(), uid)).thenReturn(Collections.emptyList());

        // When
        ChatListCreateResponse result = chatListService.createChatList(uid, chatListName, botId);

        // Then
        assertNotNull(result);
        assertEquals(chatList.getId(), result.getId());
        // Verified existing chat handling
        verify(chatListDataService, never()).createChat(any(ChatList.class));
    }

    @Test
    void testCreateChatList_WithNonEmptyExistingChat_ShouldCreateNewChat() {
        // Given - Build test data for existing chat with requests scenario
        ChatList existingChatWithRequests = new ChatList();
        existingChatWithRequests.setId(200L);
        existingChatWithRequests.setTitle("Existing Chat with Messages");
        existingChatWithRequests.setUid(uid);
        existingChatWithRequests.setBotId(botId);
        existingChatWithRequests.setEnable(1);
        existingChatWithRequests.setIsDelete(null); // Not explicitly deleted (to avoid early return)
        existingChatWithRequests.setEnabledPluginIds(null); // No plugins enabled
        existingChatWithRequests.setFileId(null); // No file attached
        existingChatWithRequests.setCreateTime(LocalDateTime.now().minusHours(2));
        existingChatWithRequests.setUpdateTime(LocalDateTime.now().minusMinutes(30));

        // Build existing chat requests - this makes the chat "non-empty"
        List<ChatReqRecords> existingRequests = new ArrayList<>();
        ChatReqRecords req1 = new ChatReqRecords();
        req1.setId(10L);
        req1.setChatId(existingChatWithRequests.getId());
        req1.setUid(uid);
        req1.setMessage("Previous question 1");
        req1.setCreateTime(LocalDateTime.now().minusHours(1));
        existingRequests.add(req1);

        ChatReqRecords req2 = new ChatReqRecords();
        req2.setId(11L);
        req2.setChatId(existingChatWithRequests.getId());
        req2.setUid(uid);
        req2.setMessage("Previous question 2");
        req2.setCreateTime(LocalDateTime.now().minusMinutes(45));
        existingRequests.add(req2);

        when(chatListDataService.findLatestEnabledChatByUserAndBot(uid, botId)).thenReturn(existingChatWithRequests);
        when(chatDataService.findRequestsByChatIdAndUid(existingChatWithRequests.getId(), uid)).thenReturn(existingRequests);

        // When
        ChatListCreateResponse result = chatListService.createChatList(uid, chatListName, botId);

        // Then
        assertNotNull(result);
        // Should create new chat because existing chat has messages
        verify(chatListDataService).createChat(any(ChatList.class));
        verify(chatListDataService).addRootTree(isNull(), eq(uid)); // ID is null before database save
        // Should not reuse existing chat
        assertNotEquals(existingChatWithRequests.getId(), result.getId());
    }

    @Test
    void testCreateChatList_WithNullExistingChat_ShouldCreateNewChat() {
        // Given
        when(chatListDataService.findLatestEnabledChatByUserAndBot(uid, botId)).thenReturn(null);
        // Mock createChat to simulate database behavior that sets the ID
        doAnswer(invocation -> {
            ChatList chatList = invocation.getArgument(0);
            chatList.setId(100L); // Simulate database setting the ID
            return null;
        }).when(chatListDataService).createChat(any(ChatList.class));

        // When
        ChatListCreateResponse result = chatListService.createChatList(uid, chatListName, botId);

        // Then
        assertNotNull(result);
        // Verified new chat creation
        verify(chatListDataService).createChat(any(ChatList.class));
        verify(chatListDataService).addRootTree(eq(100L), eq(uid));
    }

    @Test
    void testLogicDeleteChatList_WithValidChatList_ShouldDeleteSuccessfully() {
        // Given
        when(chatListDataService.findByUidAndChatId(uid, chatId)).thenReturn(chatList);
        when(chatListDataService.getAllListByChildChatId(chatId, uid)).thenReturn(Collections.emptyList());
        when(chatListDataService.deleteById(chatId)).thenReturn(1);

        // When
        boolean result = chatListService.logicDeleteChatList(chatId, uid);

        // Then
        assertTrue(result);
        verify(chatListDataService).deactivateChatBotList(uid, botId);
        verify(chatListDataService).deleteById(chatId);
    }

    @Test
    void testLogicDeleteChatList_WithChildChats_ShouldDeleteBatch() {
        // Given
        List<ChatTreeIndex> childChats = Arrays.asList(
                createChatTreeIndex(1L),
                createChatTreeIndex(2L));
        when(chatListDataService.findByUidAndChatId(uid, chatId)).thenReturn(chatList);
        when(chatListDataService.getAllListByChildChatId(chatId, uid)).thenReturn(childChats);
        when(chatListDataService.deleteBatchIds(Arrays.asList(1L, 2L))).thenReturn(2);

        // When
        boolean result = chatListService.logicDeleteChatList(chatId, uid);

        // Then
        assertTrue(result);
        verify(chatListDataService).deactivateChatBotList(uid, botId);
        verify(chatListDataService).deleteBatchIds(Arrays.asList(1L, 2L));
        verify(chatListDataService, never()).deleteById(chatId);
    }

    @Test
    void testLogicDeleteChatList_WithNullChatList_ShouldReturnFalse() {
        // Given
        when(chatListDataService.findByUidAndChatId(uid, chatId)).thenReturn(null);

        // When
        boolean result = chatListService.logicDeleteChatList(chatId, uid);

        // Then
        assertFalse(result);
        verify(chatListDataService, never()).deactivateChatBotList(any(), anyInt());
        verify(chatListDataService, never()).deleteById(any());
    }

    @Test
    void testGetBotInfo_WithValidBotId_ShouldReturnBotInfoWithModel() {
        // Given
        ChatList botChat = new ChatList();
        botChat.setId(chatId);

        BotInfoDto botInfoDto = new BotInfoDto();
        botInfoDto.setModelId(1L);
        botInfoDto.setModel("test-model");

        when(chatListDataService.getBotChat(uid, Long.valueOf(botId))).thenReturn(botChat);
        when(botService.getBotInfo(httpServletRequest, botId, chatId, "v1")).thenReturn(botInfoDto);

        // When
        BotInfoDto result = chatListService.getBotInfo(httpServletRequest, uid, botId, "v1");

        // Then
        assertNotNull(result);
        assertEquals(botInfoDto, result);
        assertNotNull(result.getBotModelDto());
        assertEquals("test-domain", result.getBotModelDto().getModelDomain());
        assertEquals("test-icon", result.getBotModelDto().getModelIcon());
        assertEquals("Test Model", result.getBotModelDto().getModelName());
        assertTrue(result.getBotModelDto().getIsCustom());
    }

    @Test
    void testGetBotInfo_WithNullChatList_ShouldReturnNull() {
        // Given
        when(chatListDataService.getBotChat(uid, Long.valueOf(botId))).thenReturn(null);

        // When
        BotInfoDto result = chatListService.getBotInfo(httpServletRequest, uid, botId, "v1");

        // Then
        assertNull(result);
        verify(botService, never()).getBotInfo(any(), anyInt(), any(), any());
    }

    @Test
    void testGetBotModelDto_WithDefaultModel_ShouldReturnDefaultModelDto() {
        // Given
        String model = "general";

        // When
        BotModelDto result = chatListService.getBotModelDto(httpServletRequest, null, model);

        // Then
        assertNotNull(result);
        // For default model with null modelId, getBotModelDto returns empty BotModelDto
        assertNull(result.getModelDomain());
        assertTrue(result.getIsCustom());
    }

    @Test
    void testGetBotModelDto_WithCustomModel_ShouldReturnCustomModelDto() {
        // Given
        Long modelId = 1L;
        LLMInfoVo customLLMInfoVo = new LLMInfoVo();
        customLLMInfoVo.setId(modelId);
        customLLMInfoVo.setDomain("custom-domain");
        customLLMInfoVo.setIcon("custom-icon");
        customLLMInfoVo.setName("Custom Model");

        when(modelService.getDetail(0, modelId, httpServletRequest)).thenReturn(ApiResult.success(customLLMInfoVo));

        // When
        BotModelDto result = chatListService.getBotModelDto(httpServletRequest, modelId, null);

        // Then
        assertNotNull(result);
        assertEquals("custom-domain", result.getModelDomain());
        assertEquals("custom-icon", result.getModelIcon());
        assertEquals("Custom Model", result.getModelName());
        assertEquals(modelId, result.getModelId());
        assertTrue(result.getIsCustom());
    }

    @Test
    void testCreateRestartChat_WithValidInput_ShouldCreateNewChat() {
        // Given
        // Mock createChat to simulate database behavior that sets the ID
        doAnswer(invocation -> {
            ChatList chatList = invocation.getArgument(0);
            chatList.setId(200L); // Simulate database setting the ID
            return null;
        }).when(chatListDataService).createChat(any(ChatList.class));

        // When
        ChatListCreateResponse result = chatListService.createRestartChat(uid, chatListName, botId);

        // Then
        assertNotNull(result);
        assertEquals(chatListName, result.getTitle());
        assertEquals(botId, result.getBotId());
        // Verified new chat creation
        verify(chatListDataService).createChat(any(ChatList.class));
        verify(chatListDataService).addRootTree(eq(200L), eq(uid));
    }

    @Test
    void testCreateRestartChat_WithNullChatListName_ShouldUseDefaultName() {
        // When
        ChatListCreateResponse result = chatListService.createRestartChat(uid, null, botId);

        // Then
        assertNotNull(result);
        assertEquals("New Chat Window", result.getTitle());
        verify(chatListDataService).createChat(any(ChatList.class));
    }

    @Test
    void testCreateRestartChat_WithLongChatListName_ShouldTruncateName() {
        // Given
        String longName = "This is a very long chat list name that exceeds the maximum length";

        // When
        ChatListCreateResponse result = chatListService.createRestartChat(uid, longName, botId);

        // Then
        assertNotNull(result);
        assertTrue(result.getTitle().length() <= 16);
        verify(chatListDataService).createChat(any(ChatList.class));
    }

    // Helper method to create ChatTreeIndex
    private ChatTreeIndex createChatTreeIndex(Long childChatId) {
        return ChatTreeIndex.builder()
                .childChatId(childChatId)
                .rootChatId(chatId)
                .parentChatId(chatId)
                .uid(uid)
                .createTime(LocalDateTime.now())
                .updateTime(LocalDateTime.now())
                .build();
    }
}
