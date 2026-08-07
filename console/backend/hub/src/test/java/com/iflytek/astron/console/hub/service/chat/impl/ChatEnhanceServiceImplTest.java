package com.iflytek.astron.console.hub.service.chat.impl;

import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.service.data.ChatDataService;
import com.iflytek.astron.console.hub.dto.chat.ChatEnhanceChatHistoryListFileVo;
import com.iflytek.astron.console.hub.dto.chat.ChatEnhanceSaveFileVo;
import com.iflytek.astron.console.commons.dto.chat.ChatReqModelDto;
import com.iflytek.astron.console.commons.entity.bot.BotChatFileParam;
import com.iflytek.astron.console.commons.dto.chat.ChatFileReq;
import com.iflytek.astron.console.commons.entity.chat.ChatFileUser;
import com.iflytek.astron.console.hub.enums.ChatFileLimitEnum;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.redisson.api.RAtomicLong;
import org.redisson.api.RBucket;
import org.redisson.api.RedissonClient;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatEnhanceServiceImplTest {

    @Mock
    private ChatDataService chatDataService;

    @Mock
    private RedissonClient redissonClient;

    @Mock
    private RAtomicLong rAtomicLong;

    @Mock
    private RBucket<Object> rBucket;

    @InjectMocks
    private ChatEnhanceServiceImpl chatEnhanceService;

    private String uid;
    private Long chatId;
    private ChatFileReq chatFileReq;
    private ChatFileUser chatFileUser;
    private ChatEnhanceSaveFileVo saveFileVo;
    private List<Object> assembledHistoryList;

    @BeforeEach
    void setUp() {
        uid = "user123";
        chatId = 100L;

        chatFileReq = ChatFileReq.builder()
                .fileId("file123")
                .chatId(chatId)
                .uid(uid)
                .reqId(1L)
                .createTime(LocalDateTime.now())
                .businessType(1)
                .build();

        chatFileUser = ChatFileUser.builder()
                .id(1L)
                .fileId("file123")
                .fileName("test.pdf")
                .fileUrl("http://example.com/test.pdf")
                .filePdfUrl("http://example.com/test-pdf.pdf")
                .fileSize(1024L)
                .fileStatus(1)
                .businessType(1)
                .icon("pdf-icon")
                .collectOriginFrom("upload")
                .build();

        saveFileVo = new ChatEnhanceSaveFileVo();
        saveFileVo.setFileName("test.pdf");
        saveFileVo.setFileUrl("http://example.com/test.pdf");
        saveFileVo.setFileSize(1024L);
        saveFileVo.setBusinessType(1);
        saveFileVo.setChatId(chatId);
        saveFileVo.setFileBusinessKey("business123");
        saveFileVo.setDocumentType(1);
        saveFileVo.setParamName("param1");

        assembledHistoryList = new ArrayList<>();
        JSONObject historyItem = new JSONObject();
        historyItem.put("id", 1L);
        historyItem.put("message", "test message");
        assembledHistoryList.add(historyItem);
    }

    @Test
    void testAddHistoryChatFile_WithValidData_ShouldReturnCompleteMap() {
        // Given
        List<ChatFileReq> chatFileReqList = Arrays.asList(chatFileReq);
        List<ChatReqModelDto> reqModelDtoList = new ArrayList<>();

        when(chatDataService.getFileList(uid, chatId)).thenReturn(chatFileReqList);
        when(chatDataService.getByFileIdAll(chatFileReq.getFileId(), chatFileReq.getUid())).thenReturn(chatFileUser);
        when(chatDataService.getReqModelWithImgByChatId(uid, chatId)).thenReturn(reqModelDtoList);

        // When
        Map<String, Object> result = chatEnhanceService.addHistoryChatFile(assembledHistoryList, uid, chatId);

        // Then
        assertNotNull(result);
        assertTrue(result.containsKey("chatFileListNoReq"));
        assertTrue(result.containsKey("historyList"));
        assertTrue(result.containsKey("businessType"));
        assertTrue(result.containsKey("existChatFileSize"));
        assertTrue(result.containsKey("existChatImage"));

        assertEquals(1, result.get("businessType"));
        assertEquals(1, result.get("existChatFileSize"));
        assertEquals(false, result.get("existChatImage"));

        JSONArray historyList = (JSONArray) result.get("historyList");
        assertNotNull(historyList);
        assertEquals(1, historyList.size());

        JSONObject historyItem = (JSONObject) historyList.get(0);
        assertNotNull(historyItem.get("chatFileList"));

        verify(chatDataService).getFileList(uid, chatId);
        verify(chatDataService).getByFileIdAll(chatFileReq.getFileId(), chatFileReq.getUid());
        verify(chatDataService).getReqModelWithImgByChatId(uid, chatId);
    }

    @Test
    void testAddHistoryChatFile_WithEmptyFileList_ShouldReturnBasicMap() {
        // Given
        List<ChatFileReq> emptyFileList = new ArrayList<>();
        List<ChatReqModelDto> reqModelDtoList = new ArrayList<>();

        when(chatDataService.getFileList(uid, chatId)).thenReturn(emptyFileList);
        when(chatDataService.getReqModelWithImgByChatId(uid, chatId)).thenReturn(reqModelDtoList);

        // When
        Map<String, Object> result = chatEnhanceService.addHistoryChatFile(assembledHistoryList, uid, chatId);

        // Then
        assertNotNull(result);
        assertNull(result.get("businessType"));
        assertEquals(0, result.get("existChatFileSize"));
        assertEquals(false, result.get("existChatImage"));

        @SuppressWarnings("unchecked")
        List<ChatEnhanceChatHistoryListFileVo> chatFileListNoReq = (List<ChatEnhanceChatHistoryListFileVo>) result.get("chatFileListNoReq");
        assertTrue(chatFileListNoReq.isEmpty());
    }

    @Test
    void testAddHistoryChatFile_WithInvalidFileUser_ShouldSkipFile() {
        // Given
        List<ChatFileReq> chatFileReqList = Arrays.asList(chatFileReq);
        List<ChatReqModelDto> reqModelDtoList = new ArrayList<>();

        when(chatDataService.getFileList(uid, chatId)).thenReturn(chatFileReqList);
        when(chatDataService.getByFileIdAll(chatFileReq.getFileId(), chatFileReq.getUid())).thenReturn(null);
        when(chatDataService.getReqModelWithImgByChatId(uid, chatId)).thenReturn(reqModelDtoList);

        // When
        Map<String, Object> result = chatEnhanceService.addHistoryChatFile(assembledHistoryList, uid, chatId);

        // Then
        assertNotNull(result);
        @SuppressWarnings("unchecked")
        List<ChatEnhanceChatHistoryListFileVo> chatFileListNoReq = (List<ChatEnhanceChatHistoryListFileVo>) result.get("chatFileListNoReq");
        assertTrue(chatFileListNoReq.isEmpty());
    }

    @Test
    void testAddHistoryChatFile_WithNoReqIdFile_ShouldAddToChatFileListNoReq() {
        // Given
        chatFileReq.setReqId(null);
        List<ChatFileReq> chatFileReqList = Arrays.asList(chatFileReq);
        List<ChatReqModelDto> reqModelDtoList = new ArrayList<>();

        when(chatDataService.getFileList(uid, chatId)).thenReturn(chatFileReqList);
        when(chatDataService.getByFileIdAll(chatFileReq.getFileId(), chatFileReq.getUid())).thenReturn(chatFileUser);
        when(chatDataService.getReqModelWithImgByChatId(uid, chatId)).thenReturn(reqModelDtoList);

        // When
        Map<String, Object> result = chatEnhanceService.addHistoryChatFile(assembledHistoryList, uid, chatId);

        // Then
        @SuppressWarnings("unchecked")
        List<ChatEnhanceChatHistoryListFileVo> chatFileListNoReq = (List<ChatEnhanceChatHistoryListFileVo>) result.get("chatFileListNoReq");
        assertEquals(1, chatFileListNoReq.size());

        ChatEnhanceChatHistoryListFileVo fileVo = chatFileListNoReq.get(0);
        assertEquals(chatFileUser.getFileName(), fileVo.getFileName());
        assertEquals(chatFileUser.getFileUrl(), fileVo.getFileUrl());
    }

    @Test
    void testAddHistoryChatFile_WithInvalidJsonObject_ShouldCreateErrorJson() {
        // Given
        List<Object> invalidHistoryList = Arrays.asList("invalid json string");
        List<ChatFileReq> emptyFileList = new ArrayList<>();
        List<ChatReqModelDto> reqModelDtoList = new ArrayList<>();

        when(chatDataService.getFileList(uid, chatId)).thenReturn(emptyFileList);
        when(chatDataService.getReqModelWithImgByChatId(uid, chatId)).thenReturn(reqModelDtoList);

        // When
        Map<String, Object> result = chatEnhanceService.addHistoryChatFile(invalidHistoryList, uid, chatId);

        // Then
        JSONArray historyList = (JSONArray) result.get("historyList");
        assertNotNull(historyList);
        assertEquals(1, historyList.size());

        JSONObject errorItem = (JSONObject) historyList.get(0);
        assertTrue(errorItem.containsKey("error"));
        assertEquals("Failed to parse object", errorItem.get("error"));
    }

    @Test
    void testSaveFile_WithValidData_ShouldReturnFileIdMap() {
        // Given
        try (MockedStatic<ChatFileLimitEnum> mockedEnum = mockStatic(ChatFileLimitEnum.class)) {
            ChatFileLimitEnum limitEnum = mock(ChatFileLimitEnum.class);

            mockedEnum.when(() -> ChatFileLimitEnum.checkFileByBusinessType(anyString(), anyInt())).thenReturn(true);
            mockedEnum.when(() -> ChatFileLimitEnum.getByValue(anyInt())).thenReturn(limitEnum);

            when(limitEnum.getMaxSize()).thenReturn(2048L);
            when(limitEnum.getDailyUploadNum()).thenReturn(10);
            when(limitEnum.getRedisPrefix()).thenReturn("upload:");
            when(limitEnum.getValue()).thenReturn(1);
            when(limitEnum.getDisplay()).thenReturn(1);

            when(redissonClient.getAtomicLong(anyString())).thenReturn(rAtomicLong);
            when(rAtomicLong.addAndGet(1L)).thenReturn(1L);
            when(redissonClient.getBucket(anyString())).thenReturn(rBucket);

            ChatFileUser createdFileUser = ChatFileUser.builder()
                    .id(1L)
                    .build();
            when(chatDataService.createChatFileUser(any(ChatFileUser.class))).thenReturn(createdFileUser);
            when(chatDataService.getFileUserCount(uid)).thenReturn(0);
            when(chatDataService.findAllBotChatFileParamByChatIdAndNameAndIsDelete(anyLong(), anyString(), anyInt()))
                    .thenReturn(new ArrayList<>());

            // When
            Map<String, String> result = chatEnhanceService.saveFile(uid, saveFileVo);

            // Then
            assertNotNull(result);
            assertEquals("agent_1", result.get("file_id"));

            verify(chatDataService).createChatFileUser(any(ChatFileUser.class));
            verify(chatDataService).setFileId(1L, "agent_1");
            verify(chatDataService).createChatFileReq(any(ChatFileReq.class));
            verify(chatDataService).setProcessed(1L);
            verify(chatDataService).createBotChatFileParam(any(BotChatFileParam.class));
        }
    }

    @Test
    void testSaveFile_WithInvalidFileType_ShouldThrowBusinessException() {
        // Given
        try (MockedStatic<ChatFileLimitEnum> mockedEnum = mockStatic(ChatFileLimitEnum.class)) {
            mockedEnum.when(() -> ChatFileLimitEnum.checkFileByBusinessType(anyString(), anyInt())).thenReturn(false);

            // When & Then
            BusinessException exception = assertThrows(BusinessException.class, () -> {
                chatEnhanceService.saveFile(uid, saveFileVo);
            });

            assertEquals(ResponseEnum.LONG_CONTENT_WRONG_BUSINESS_TYPE, exception.getResponseEnum());
        }
    }

    @Test
    void testSaveFile_WithFileSizeExceedsLimit_ShouldThrowBusinessException() {
        // Given
        try (MockedStatic<ChatFileLimitEnum> mockedEnum = mockStatic(ChatFileLimitEnum.class)) {
            ChatFileLimitEnum limitEnum = mock(ChatFileLimitEnum.class);

            mockedEnum.when(() -> ChatFileLimitEnum.checkFileByBusinessType(anyString(), anyInt())).thenReturn(true);
            mockedEnum.when(() -> ChatFileLimitEnum.getByValue(anyInt())).thenReturn(limitEnum);

            when(limitEnum.getMaxSize()).thenReturn(512L); // Smaller than file size
            lenient().when(limitEnum.getDailyUploadNum()).thenReturn(10);
            lenient().when(limitEnum.getRedisPrefix()).thenReturn("upload:");

            // When & Then
            BusinessException exception = assertThrows(BusinessException.class, () -> {
                chatEnhanceService.saveFile(uid, saveFileVo);
            });

            assertEquals(ResponseEnum.LONG_CONTENT_FILE_SIZE_OUT_LIMIT, exception.getResponseEnum());
        }
    }

    @Test
    void testSaveFile_WithDailyUploadLimitExceeded_ShouldThrowBusinessException() {
        // Given
        try (MockedStatic<ChatFileLimitEnum> mockedEnum = mockStatic(ChatFileLimitEnum.class)) {
            ChatFileLimitEnum limitEnum = mock(ChatFileLimitEnum.class);

            mockedEnum.when(() -> ChatFileLimitEnum.checkFileByBusinessType(anyString(), anyInt())).thenReturn(true);
            mockedEnum.when(() -> ChatFileLimitEnum.getByValue(anyInt())).thenReturn(limitEnum);

            when(limitEnum.getMaxSize()).thenReturn(2048L);
            when(limitEnum.getDailyUploadNum()).thenReturn(5);
            when(limitEnum.getRedisPrefix()).thenReturn("upload:");

            when(redissonClient.getAtomicLong(anyString())).thenReturn(rAtomicLong);
            when(rAtomicLong.addAndGet(1L)).thenReturn(10L); // Exceeds daily limit

            // When & Then
            BusinessException exception = assertThrows(BusinessException.class, () -> {
                chatEnhanceService.saveFile(uid, saveFileVo);
            });

            assertEquals(ResponseEnum.LONG_CONTENT_FILE_NUM_OUT_LIMIT, exception.getResponseEnum());
            verify(rAtomicLong).addAndGet(-1L); // Should rollback
        }
    }

    @Test
    void testSaveFile_WithBlankFileName_ShouldThrowBusinessException() {
        // Given
        saveFileVo.setFileName("");

        try (MockedStatic<ChatFileLimitEnum> mockedEnum = mockStatic(ChatFileLimitEnum.class)) {
            ChatFileLimitEnum limitEnum = mock(ChatFileLimitEnum.class);

            mockedEnum.when(() -> ChatFileLimitEnum.checkFileByBusinessType(anyString(), anyInt())).thenReturn(true);
            mockedEnum.when(() -> ChatFileLimitEnum.getByValue(anyInt())).thenReturn(limitEnum);

            // When & Then
            BusinessException exception = assertThrows(BusinessException.class, () -> {
                chatEnhanceService.saveFile(uid, saveFileVo);
            });

            assertEquals(ResponseEnum.LONG_CONTENT_MISS_FILE_INFO, exception.getResponseEnum());
        }
    }

    @Test
    void testSaveFile_WithBlankFileUrl_ShouldThrowBusinessException() {
        // Given
        saveFileVo.setFileUrl("");

        try (MockedStatic<ChatFileLimitEnum> mockedEnum = mockStatic(ChatFileLimitEnum.class)) {
            ChatFileLimitEnum limitEnum = mock(ChatFileLimitEnum.class);

            mockedEnum.when(() -> ChatFileLimitEnum.checkFileByBusinessType(anyString(), anyInt())).thenReturn(true);
            mockedEnum.when(() -> ChatFileLimitEnum.getByValue(anyInt())).thenReturn(limitEnum);

            // When & Then
            BusinessException exception = assertThrows(BusinessException.class, () -> {
                chatEnhanceService.saveFile(uid, saveFileVo);
            });

            assertEquals(ResponseEnum.LONG_CONTENT_MISS_FILE_INFO, exception.getResponseEnum());
        }
    }

    @Test
    void testSaveFile_WithExistingBotChatFileParam_ShouldUpdateParam() {
        // Given
        try (MockedStatic<ChatFileLimitEnum> mockedEnum = mockStatic(ChatFileLimitEnum.class)) {
            ChatFileLimitEnum limitEnum = mock(ChatFileLimitEnum.class);

            mockedEnum.when(() -> ChatFileLimitEnum.checkFileByBusinessType(anyString(), anyInt())).thenReturn(true);
            mockedEnum.when(() -> ChatFileLimitEnum.getByValue(anyInt())).thenReturn(limitEnum);

            when(limitEnum.getMaxSize()).thenReturn(2048L);
            when(limitEnum.getDailyUploadNum()).thenReturn(10);
            when(limitEnum.getRedisPrefix()).thenReturn("upload:");
            when(limitEnum.getValue()).thenReturn(1);
            when(limitEnum.getDisplay()).thenReturn(1);

            when(redissonClient.getAtomicLong(anyString())).thenReturn(rAtomicLong);
            when(rAtomicLong.addAndGet(1L)).thenReturn(1L);
            when(redissonClient.getBucket(anyString())).thenReturn(rBucket);

            ChatFileUser createdFileUser = ChatFileUser.builder()
                    .id(1L)
                    .build();
            when(chatDataService.createChatFileUser(any(ChatFileUser.class))).thenReturn(createdFileUser);
            when(chatDataService.getFileUserCount(uid)).thenReturn(0);

            BotChatFileParam existingParam = new BotChatFileParam();
            existingParam.setFileIds(new ArrayList<>(Arrays.asList("existing_file")));
            existingParam.setFileUrls(new ArrayList<>(Arrays.asList("http://existing.com")));

            when(chatDataService.findAllBotChatFileParamByChatIdAndNameAndIsDelete(anyLong(), anyString(), anyInt()))
                    .thenReturn(Arrays.asList(existingParam));

            // When
            Map<String, String> result = chatEnhanceService.saveFile(uid, saveFileVo);

            // Then
            assertNotNull(result);
            assertEquals("agent_1", result.get("file_id"));

            verify(chatDataService).updateBotChatFileParam(existingParam);
            verify(chatDataService, never()).createBotChatFileParam(any(BotChatFileParam.class));

            assertEquals(2, existingParam.getFileIds().size());
            assertEquals(2, existingParam.getFileUrls().size());
            assertTrue(existingParam.getFileIds().contains("agent_1"));
        }
    }

    @Test
    void testFindById_ShouldCallDataService() {
        // Given
        Long linkId = 1L;
        when(chatDataService.findChatFileUserByIdAndUid(linkId, uid)).thenReturn(chatFileUser);

        // When
        ChatFileUser result = chatEnhanceService.findById(linkId, uid);

        // Then
        assertNotNull(result);
        assertEquals(chatFileUser, result);
        verify(chatDataService).findChatFileUserByIdAndUid(linkId, uid);
    }

    @Test
    void testDelete_ShouldCallDataService() {
        // Given
        String fileId = "file123";

        // When
        chatEnhanceService.delete(fileId, chatId, uid);

        // Then
        verify(chatDataService).deleteChatFileReq(fileId, chatId, uid);
    }

    @Test
    void testDocumentHandler_WithNewFile_ShouldCreateFileUserAndProcess() {
        // Given
        try (MockedStatic<ChatFileLimitEnum> mockedEnum = mockStatic(ChatFileLimitEnum.class)) {
            ChatFileLimitEnum limitEnum = mock(ChatFileLimitEnum.class);
            when(limitEnum.getValue()).thenReturn(1);
            when(limitEnum.getDisplay()).thenReturn(1);
            when(limitEnum.getRedisPrefix()).thenReturn("upload:");

            when(redissonClient.getBucket(anyString())).thenReturn(rBucket);

            ChatFileUser createdFileUser = ChatFileUser.builder()
                    .id(1L)
                    .build();
            when(chatDataService.createChatFileUser(any(ChatFileUser.class))).thenReturn(createdFileUser);
            when(chatDataService.getFileUserCount(uid)).thenReturn(0);
            when(chatDataService.findAllBotChatFileParamByChatIdAndNameAndIsDelete(anyLong(), anyString(), anyInt()))
                    .thenReturn(new ArrayList<>());

            // When
            Map<String, String> result = invokeDocumentHandler(null, uid, chatId, "http://test.com/file.pdf",
                    "test.pdf", 1024L, limitEnum, "key123", 1, "param1");

            // Then
            assertNotNull(result);
            assertEquals("agent_1", result.get("file_id"));

            verify(chatDataService).createChatFileUser(any(ChatFileUser.class));
            verify(chatDataService).setFileId(1L, "agent_1");
            verify(chatDataService).createChatFileReq(any(ChatFileReq.class));
            verify(chatDataService).setProcessed(1L);
        }
    }

    @Test
    void testDocumentHandler_WithExistingFileUser_ShouldNotCreateNewFileUser() {
        // Given
        Long existingFileUserId = 5L;
        try (MockedStatic<ChatFileLimitEnum> mockedEnum = mockStatic(ChatFileLimitEnum.class)) {
            ChatFileLimitEnum limitEnum = mock(ChatFileLimitEnum.class);
            when(limitEnum.getValue()).thenReturn(1);
            when(limitEnum.getRedisPrefix()).thenReturn("upload:");

            when(redissonClient.getBucket(anyString())).thenReturn(rBucket);
            when(chatDataService.findAllBotChatFileParamByChatIdAndNameAndIsDelete(anyLong(), anyString(), anyInt()))
                    .thenReturn(new ArrayList<>());

            // When
            Map<String, String> result = invokeDocumentHandler(existingFileUserId, uid, chatId,
                    "http://test.com/file.pdf", "test.pdf", 1024L, limitEnum, "key123", 1, "param1");

            // Then
            assertNotNull(result);
            assertEquals("agent_5", result.get("file_id"));

            verify(chatDataService, never()).createChatFileUser(any(ChatFileUser.class));
            verify(chatDataService).setFileId(existingFileUserId, "agent_5");
        }
    }

    // Helper method to access private documentHandler method using reflection
    private Map<String, String> invokeDocumentHandler(Long chatFileUserId, String uid, Long chatId,
            String fileUrl, String fileName, Long fileSize, ChatFileLimitEnum limitEnum,
            String fileBusinessKey, Integer documentType, String paramName) {
        try {
            var method = ChatEnhanceServiceImpl.class.getDeclaredMethod("documentHandler",
                    Long.class, String.class, Long.class, String.class, String.class, Long.class,
                    ChatFileLimitEnum.class, String.class, Integer.class, String.class);
            method.setAccessible(true);
            @SuppressWarnings("unchecked")
            Map<String, String> result = (Map<String, String>) method.invoke(chatEnhanceService,
                    chatFileUserId, uid, chatId, fileUrl, fileName, fileSize, limitEnum,
                    fileBusinessKey, documentType, paramName);
            return result;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

}
