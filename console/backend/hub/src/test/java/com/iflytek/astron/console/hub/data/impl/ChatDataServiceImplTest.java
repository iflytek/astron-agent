package com.iflytek.astron.console.hub.data.impl;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.iflytek.astron.console.commons.dto.chat.ChatFileReq;
import com.iflytek.astron.console.commons.dto.chat.ChatReqModelDto;
import com.iflytek.astron.console.commons.dto.chat.ChatRespModelDto;
import com.iflytek.astron.console.commons.entity.bot.BotChatFileParam;
import com.iflytek.astron.console.commons.entity.chat.*;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.mapper.chat.ChatListMapper;
import com.iflytek.astron.console.commons.mapper.chat.ChatTreeIndexMapper;
import com.iflytek.astron.console.hub.mapper.*;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.junit.jupiter.api.BeforeAll;
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
class ChatDataServiceImplTest {

    @Mock
    private ChatListMapper chatListMapper;

    @Mock
    private ChatReqRecordsMapper chatReqRecordsMapper;

    @Mock
    private ChatRespRecordsMapper chatRespRecordsMapper;

    @Mock
    private ChatReqModelMapper chatReqModelMapper;

    @Mock
    private ChatRespModelMapper chatRespModelMapper;

    @Mock
    private ChatReasonRecordsMapper chatReasonRecordsMapper;

    @Mock
    private ChatTraceSourceMapper chatTraceSourceMapper;

    @Mock
    private ChatFileReqMapper chatFileReqMapper;

    @Mock
    private ChatFileUserMapper chatFileUserMapper;

    @Mock
    private ChatTreeIndexMapper chatTreeIndexMapper;

    @Mock
    private BotChatFileParamMapper botChatFileParamMapper;

    @InjectMocks
    private ChatDataServiceImpl chatDataService;

    private static final String TEST_UID = "test-uid";
    private static final Long TEST_CHAT_ID = 1L;
    private static final Long TEST_REQ_ID = 100L;
    private static final String TEST_FILE_ID = "file-123";

    private ChatReqRecords testReqRecord;
    private ChatRespRecords testRespRecord;
    private ChatList testChatList;

    @BeforeAll
    static void initMybatisPlus() {
        MybatisConfiguration configuration = new MybatisConfiguration();
        MapperBuilderAssistant assistant = new MapperBuilderAssistant(configuration, "");

        TableInfoHelper.initTableInfo(assistant, ChatList.class);
        TableInfoHelper.initTableInfo(assistant, ChatReqRecords.class);
        TableInfoHelper.initTableInfo(assistant, ChatRespRecords.class);
        TableInfoHelper.initTableInfo(assistant, ChatReqModel.class);
        TableInfoHelper.initTableInfo(assistant, ChatRespModel.class);
        TableInfoHelper.initTableInfo(assistant, ChatReasonRecords.class);
        TableInfoHelper.initTableInfo(assistant, ChatTraceSource.class);
        TableInfoHelper.initTableInfo(assistant, ChatFileReq.class);
        TableInfoHelper.initTableInfo(assistant, ChatFileUser.class);
        TableInfoHelper.initTableInfo(assistant, ChatTreeIndex.class);
        TableInfoHelper.initTableInfo(assistant, BotChatFileParam.class);
    }

    @BeforeEach
    void setUp() {
        testChatList = new ChatList();
        testChatList.setId(TEST_CHAT_ID);
        testChatList.setUid(TEST_UID);
        testChatList.setEnable(1);
        testChatList.setIsDelete(0);
        testChatList.setUpdateTime(LocalDateTime.now());

        testReqRecord = new ChatReqRecords();
        testReqRecord.setId(TEST_REQ_ID);
        testReqRecord.setChatId(TEST_CHAT_ID);
        testReqRecord.setUid(TEST_UID);
        testReqRecord.setMessage("Test question");
        testReqRecord.setNewContext(1);
        testReqRecord.setCreateTime(LocalDateTime.now());

        testRespRecord = new ChatRespRecords();
        testRespRecord.setId(200L);
        testRespRecord.setChatId(TEST_CHAT_ID);
        testRespRecord.setReqId(TEST_REQ_ID);
        testRespRecord.setUid(TEST_UID);
        testRespRecord.setMessage("Test answer");
        testRespRecord.setCreateTime(LocalDateTime.now());
    }

    // ========== Query Method Tests ==========

    @Test
    void testFindRequestsByChatIdAndUid_Success() {
        List<ChatReqRecords> expectedRecords = Arrays.asList(testReqRecord);
        when(chatReqRecordsMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(expectedRecords);

        List<ChatReqRecords> result = chatDataService.findRequestsByChatIdAndUid(TEST_CHAT_ID, TEST_UID);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(TEST_REQ_ID, result.get(0).getId());
        verify(chatReqRecordsMapper).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindRequestsByChatIdAndTimeRange_Success() {
        LocalDateTime startTime = LocalDateTime.now().minusDays(1);
        LocalDateTime endTime = LocalDateTime.now();
        List<ChatReqRecords> expectedRecords = Arrays.asList(testReqRecord);

        when(chatReqRecordsMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(expectedRecords);

        List<ChatReqRecords> result = chatDataService.findRequestsByChatIdAndTimeRange(TEST_CHAT_ID, startTime, endTime);

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(chatReqRecordsMapper).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindResponsesByReqId_Success() {
        List<ChatRespRecords> expectedRecords = Arrays.asList(testRespRecord);
        when(chatRespRecordsMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(expectedRecords);

        List<ChatRespRecords> result = chatDataService.findResponsesByReqId(TEST_REQ_ID);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(TEST_REQ_ID, result.get(0).getReqId());
        verify(chatRespRecordsMapper).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindResponsesByChatId_Success() {
        List<ChatRespRecords> expectedRecords = Arrays.asList(testRespRecord);
        when(chatRespRecordsMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(expectedRecords);

        List<ChatRespRecords> result = chatDataService.findResponsesByChatId(TEST_CHAT_ID);

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(chatRespRecordsMapper).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindRequestById_Success() {
        when(chatReqRecordsMapper.selectById(TEST_REQ_ID)).thenReturn(testReqRecord);

        ChatReqRecords result = chatDataService.findRequestById(TEST_REQ_ID);

        assertNotNull(result);
        assertEquals(TEST_REQ_ID, result.getId());
        verify(chatReqRecordsMapper).selectById(TEST_REQ_ID);
    }

    @Test
    void testFindResponseByUidAndChatIdAndReqId_Success() {
        when(chatRespRecordsMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(testRespRecord);

        ChatRespRecords result = chatDataService.findResponseByUidAndChatIdAndReqId(TEST_UID, TEST_CHAT_ID, TEST_REQ_ID);

        assertNotNull(result);
        assertEquals(TEST_REQ_ID, result.getReqId());
        verify(chatRespRecordsMapper).selectOne(any(LambdaQueryWrapper.class));
    }

    // ========== Create Method Tests ==========

    @Test
    void testCreateRequest_Success() {
        ChatTreeIndex treeIndex = ChatTreeIndex.builder()
                .rootChatId(TEST_CHAT_ID)
                .childChatId(TEST_CHAT_ID)
                .build();

        when(chatListMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(testChatList);
        when(chatReqRecordsMapper.insert(any(ChatReqRecords.class))).thenReturn(1);
        when(chatListMapper.update(isNull(), any(LambdaUpdateWrapper.class))).thenReturn(1);
        when(chatTreeIndexMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(Arrays.asList(treeIndex));

        ChatReqRecords result = chatDataService.createRequest(testReqRecord);

        assertNotNull(result);
        verify(chatReqRecordsMapper).insert(testReqRecord);
        verify(chatListMapper, atLeastOnce()).update(isNull(), any(LambdaUpdateWrapper.class));
    }

    @Test
    void testCreateRequest_ChatDisabled_ThrowsException() {
        testChatList.setEnable(0);
        when(chatListMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(testChatList);

        assertThrows(BusinessException.class, () -> {
            chatDataService.createRequest(testReqRecord);
        });

        verify(chatReqRecordsMapper, never()).insert(any(ChatReqRecords.class));
    }

    @Test
    void testCreateResponse_Success() {
        when(chatRespRecordsMapper.insert(any(ChatRespRecords.class))).thenReturn(1);

        ChatRespRecords result = chatDataService.createResponse(testRespRecord);

        assertNotNull(result);
        verify(chatRespRecordsMapper).insert(testRespRecord);
    }

    @Test
    void testCreateReasonRecord_Success() {
        ChatReasonRecords reasonRecord = new ChatReasonRecords();
        reasonRecord.setUid(TEST_UID);
        reasonRecord.setChatId(TEST_CHAT_ID);
        reasonRecord.setReqId(TEST_REQ_ID);

        when(chatReasonRecordsMapper.insert(any(ChatReasonRecords.class))).thenReturn(1);

        ChatReasonRecords result = chatDataService.createReasonRecord(reasonRecord);

        assertNotNull(result);
        verify(chatReasonRecordsMapper).insert(reasonRecord);
    }

    @Test
    void testCreateTraceSource_Success() {
        ChatTraceSource traceSource = new ChatTraceSource();
        traceSource.setUid(TEST_UID);
        traceSource.setChatId(TEST_CHAT_ID);
        traceSource.setReqId(TEST_REQ_ID);

        when(chatTraceSourceMapper.insert(any(ChatTraceSource.class))).thenReturn(1);

        ChatTraceSource result = chatDataService.createTraceSource(traceSource);

        assertNotNull(result);
        verify(chatTraceSourceMapper).insert(traceSource);
    }

    @Test
    void testCreateChatReqModel_Success() {
        ChatReqModel reqModel = new ChatReqModel();
        reqModel.setUid(TEST_UID);
        reqModel.setChatId(TEST_CHAT_ID);

        when(chatReqModelMapper.insert(any(ChatReqModel.class))).thenReturn(1);

        ChatReqModel result = chatDataService.createChatReqModel(reqModel);

        assertNotNull(result);
        verify(chatReqModelMapper).insert(reqModel);
    }

    @Test
    void testCreateChatFileUser_Success() {
        ChatFileUser fileUser = ChatFileUser.builder()
                .uid(TEST_UID)
                .fileId(TEST_FILE_ID)
                .build();

        when(chatFileUserMapper.insert(any(ChatFileUser.class))).thenReturn(1);

        ChatFileUser result = chatDataService.createChatFileUser(fileUser);

        assertNotNull(result);
        verify(chatFileUserMapper).insert(fileUser);
    }

    @Test
    void testCreateChatFileReq_Success() {
        ChatFileReq fileReq = ChatFileReq.builder()
                .chatId(TEST_CHAT_ID)
                .fileId(TEST_FILE_ID)
                .build();

        when(chatFileReqMapper.insert(any(ChatFileReq.class))).thenReturn(1);

        ChatFileReq result = chatDataService.createChatFileReq(fileReq);

        assertNotNull(result);
        verify(chatFileReqMapper).insert(fileReq);
    }

    @Test
    void testCreateBotChatFileParam_Success() {
        BotChatFileParam fileParam = new BotChatFileParam();
        fileParam.setChatId(TEST_CHAT_ID);

        when(botChatFileParamMapper.insert(any(BotChatFileParam.class))).thenReturn(1);

        BotChatFileParam result = chatDataService.createBotChatFileParam(fileParam);

        assertNotNull(result);
        verify(botChatFileParamMapper).insert(fileParam);
    }

    // ========== Update Method Tests ==========

    @Test
    void testUpdateByUidAndChatIdAndReqId_Success() {
        when(chatRespRecordsMapper.update(any(ChatRespRecords.class), any(LambdaUpdateWrapper.class))).thenReturn(1);

        Integer result = chatDataService.updateByUidAndChatIdAndReqId(testRespRecord);

        assertEquals(1, result);
        verify(chatRespRecordsMapper).update(any(ChatRespRecords.class), any(LambdaUpdateWrapper.class));
    }

    @Test
    void testUpdateReasonByUidAndChatIdAndReqId_Success() {
        ChatReasonRecords reasonRecord = new ChatReasonRecords();
        reasonRecord.setUid(TEST_UID);
        reasonRecord.setChatId(TEST_CHAT_ID);
        reasonRecord.setReqId(TEST_REQ_ID);

        when(chatReasonRecordsMapper.update(any(ChatReasonRecords.class), any(LambdaUpdateWrapper.class))).thenReturn(1);

        Integer result = chatDataService.updateReasonByUidAndChatIdAndReqId(reasonRecord);

        assertEquals(1, result);
        verify(chatReasonRecordsMapper).update(any(ChatReasonRecords.class), any(LambdaUpdateWrapper.class));
    }

    @Test
    void testUpdateTraceSourceByUidAndChatIdAndReqId_Success() {
        ChatTraceSource traceSource = new ChatTraceSource();
        traceSource.setUid(TEST_UID);
        traceSource.setChatId(TEST_CHAT_ID);
        traceSource.setReqId(TEST_REQ_ID);

        when(chatTraceSourceMapper.update(any(ChatTraceSource.class), any(LambdaUpdateWrapper.class))).thenReturn(1);

        Integer result = chatDataService.updateTraceSourceByUidAndChatIdAndReqId(traceSource);

        assertEquals(1, result);
        verify(chatTraceSourceMapper).update(any(ChatTraceSource.class), any(LambdaUpdateWrapper.class));
    }

    @Test
    void testUpdateNewContextByUidAndChatId_Success() {
        when(chatReqRecordsMapper.update(isNull(), any(LambdaUpdateWrapper.class))).thenReturn(1);

        Integer result = chatDataService.updateNewContextByUidAndChatId(TEST_UID, TEST_CHAT_ID);

        assertEquals(1, result);
        verify(chatReqRecordsMapper).update(isNull(), any(LambdaUpdateWrapper.class));
    }

    @Test
    void testUpdateBotChatFileParam_Success() {
        BotChatFileParam fileParam = new BotChatFileParam();
        fileParam.setId(1L);
        fileParam.setChatId(TEST_CHAT_ID);

        when(botChatFileParamMapper.updateById(any(BotChatFileParam.class))).thenReturn(1);

        BotChatFileParam result = chatDataService.updateBotChatFileParam(fileParam);

        assertNotNull(result);
        verify(botChatFileParamMapper).updateById(fileParam);
    }

    @Test
    void testSetFileId_Success() {
        Long chatFileUserId = 1L;
        ChatFileUser fileUser = ChatFileUser.builder()
                .id(chatFileUserId)
                .uid(TEST_UID)
                .build();

        when(chatFileUserMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(fileUser);
        when(chatFileUserMapper.updateById(any(ChatFileUser.class))).thenReturn(1);

        ChatFileUser result = chatDataService.setFileId(chatFileUserId, TEST_FILE_ID);

        assertNotNull(result);
        assertEquals(TEST_FILE_ID, result.getFileId());
        verify(chatFileUserMapper).updateById(any(ChatFileUser.class));
    }

    @Test
    void testSetFileId_FileUserNotFound_ReturnsNull() {
        Long chatFileUserId = 1L;
        when(chatFileUserMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);

        ChatFileUser result = chatDataService.setFileId(chatFileUserId, TEST_FILE_ID);

        assertNull(result);
        verify(chatFileUserMapper, never()).updateById(any(ChatFileUser.class));
    }

    @Test
    void testSetProcessed_Success() {
        Long chatFileUserId = 1L;
        ChatFileUser fileUser = ChatFileUser.builder()
                .id(chatFileUserId)
                .build();

        when(chatFileUserMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(fileUser);
        when(chatFileUserMapper.updateById(any(ChatFileUser.class))).thenReturn(1);

        chatDataService.setProcessed(chatFileUserId);

        verify(chatFileUserMapper).selectOne(any(LambdaQueryWrapper.class));
        verify(chatFileUserMapper).updateById(any(ChatFileUser.class));
    }

    // ========== Statistics Method Tests ==========

    @Test
    void testCountChatsByUid_Success() {
        when(chatListMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(5L);

        long result = chatDataService.countChatsByUid(TEST_UID);

        assertEquals(5L, result);
        verify(chatListMapper).selectCount(any(LambdaQueryWrapper.class));
    }

    @Test
    void testCountMessagesByChatId_Success() {
        when(chatReqRecordsMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(10L);

        long result = chatDataService.countMessagesByChatId(TEST_CHAT_ID);

        assertEquals(10L, result);
        verify(chatReqRecordsMapper).selectCount(any(LambdaQueryWrapper.class));
    }

    @Test
    void testGetFileUserCount_Success() {
        when(chatFileUserMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(3L);

        Integer result = chatDataService.getFileUserCount(TEST_UID);

        assertEquals(3, result);
        verify(chatFileUserMapper).selectCount(any(LambdaQueryWrapper.class));
    }

    @Test
    void testGetFileUserCount_NullCount_ReturnsZero() {
        when(chatFileUserMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(null);

        Integer result = chatDataService.getFileUserCount(TEST_UID);

        assertEquals(0, result);
        verify(chatFileUserMapper).selectCount(any(LambdaQueryWrapper.class));
    }

    // ========== Query List Method Tests ==========

    @Test
    void testFindRecentChatsByUid_Success() {
        List<ChatList> expectedChats = Arrays.asList(testChatList);
        when(chatListMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(expectedChats);

        List<ChatList> result = chatDataService.findRecentChatsByUid(TEST_UID, 10);

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(chatListMapper).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindTraceSourcesByChatId_Success() {
        ChatTraceSource traceSource = new ChatTraceSource();
        traceSource.setChatId(TEST_CHAT_ID);
        List<ChatTraceSource> expectedSources = Arrays.asList(traceSource);

        when(chatTraceSourceMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(expectedSources);

        List<ChatTraceSource> result = chatDataService.findTraceSourcesByChatId(TEST_CHAT_ID);

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(chatTraceSourceMapper).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    void testGetReasonRecordsByChatId_Success() {
        ChatReasonRecords reasonRecord = new ChatReasonRecords();
        reasonRecord.setChatId(TEST_CHAT_ID);
        List<ChatReasonRecords> expectedRecords = Arrays.asList(reasonRecord);

        when(chatReasonRecordsMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(expectedRecords);

        List<ChatReasonRecords> result = chatDataService.getReasonRecordsByChatId(TEST_CHAT_ID);

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(chatReasonRecordsMapper).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    void testGetFileList_Success() {
        ChatFileReq fileReq = ChatFileReq.builder()
                .chatId(TEST_CHAT_ID)
                .uid(TEST_UID)
                .build();
        List<ChatFileReq> expectedFiles = Arrays.asList(fileReq);

        when(chatFileReqMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(expectedFiles);

        List<ChatFileReq> result = chatDataService.getFileList(TEST_UID, TEST_CHAT_ID);

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(chatFileReqMapper).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindBotChatFileParamsByChatIdAndIsDelete_Success() {
        BotChatFileParam fileParam = new BotChatFileParam();
        fileParam.setChatId(TEST_CHAT_ID);
        fileParam.setIsDelete(0);
        List<BotChatFileParam> expectedParams = Arrays.asList(fileParam);

        when(botChatFileParamMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(expectedParams);

        List<BotChatFileParam> result = chatDataService.findBotChatFileParamsByChatIdAndIsDelete(TEST_CHAT_ID, 0);

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(botChatFileParamMapper).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindAllBotChatFileParamByChatIdAndNameAndIsDelete_Success() {
        String name = "test.pdf";
        BotChatFileParam fileParam = new BotChatFileParam();
        fileParam.setChatId(TEST_CHAT_ID);
        fileParam.setName(name);
        List<BotChatFileParam> expectedParams = Arrays.asList(fileParam);

        when(botChatFileParamMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(expectedParams);

        List<BotChatFileParam> result = chatDataService.findAllBotChatFileParamByChatIdAndNameAndIsDelete(TEST_CHAT_ID, name, 0);

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(botChatFileParamMapper).selectList(any(LambdaQueryWrapper.class));
    }

    // ========== Complex Business Logic Tests ==========

    @Test
    void testGetReqModelBotHistoryByChatId_Success() {
        ChatReqRecords reqRecord = new ChatReqRecords();
        reqRecord.setId(TEST_REQ_ID);
        reqRecord.setUid(TEST_UID);
        reqRecord.setChatId(TEST_CHAT_ID);
        reqRecord.setNewContext(1);

        ChatReqModel reqModel = new ChatReqModel();
        reqModel.setChatReqId(TEST_REQ_ID);
        reqModel.setUrl("http://example.com/image.jpg");
        reqModel.setType(1);
        reqModel.setNeedHis(1);

        when(chatReqRecordsMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(Arrays.asList(reqRecord));
        when(chatReqModelMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(Arrays.asList(reqModel));

        List<ChatReqModelDto> result = chatDataService.getReqModelBotHistoryByChatId(TEST_UID, TEST_CHAT_ID);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(reqModel.getUrl(), result.get(0).getUrl());
        verify(chatReqRecordsMapper).selectList(any(LambdaQueryWrapper.class));
        verify(chatReqModelMapper).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    void testGetReqModelBotHistoryByChatId_EmptyReqIds_ReturnsEmptyList() {
        when(chatReqRecordsMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(new ArrayList<>());

        List<ChatReqModelDto> result = chatDataService.getReqModelBotHistoryByChatId(TEST_UID, TEST_CHAT_ID);

        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(chatReqModelMapper, never()).selectList(any());
    }

    @Test
    void testGetChatRespModelBotHistoryByChatId_Success() {
        ChatRespRecords respRecord = new ChatRespRecords();
        respRecord.setId(200L);
        respRecord.setReqId(TEST_REQ_ID);
        respRecord.setUid(TEST_UID);
        respRecord.setChatId(TEST_CHAT_ID);

        ChatRespModel respModel = new ChatRespModel();
        respModel.setReqId(TEST_REQ_ID);
        respModel.setUrl("http://example.com/response.jpg");
        respModel.setType("image");
        respModel.setNeedHis(1);

        when(chatRespRecordsMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(Arrays.asList(respRecord));
        when(chatRespModelMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(Arrays.asList(respModel));

        List<ChatRespModelDto> result = chatDataService.getChatRespModelBotHistoryByChatId(TEST_UID, TEST_CHAT_ID, Arrays.asList(TEST_REQ_ID));

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(respModel.getUrl(), result.get(0).getUrl());
        verify(chatRespRecordsMapper).selectList(any(LambdaQueryWrapper.class));
        verify(chatRespModelMapper).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    void testGetChatRespModelBotHistoryByChatId_EmptyRecords_ReturnsNull() {
        when(chatRespRecordsMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(new ArrayList<>());

        List<ChatRespModelDto> result = chatDataService.getChatRespModelBotHistoryByChatId(TEST_UID, TEST_CHAT_ID, Arrays.asList(TEST_REQ_ID));

        assertNull(result);
        verify(chatRespModelMapper, never()).selectList(any());
    }

    @Test
    void testGetReqModelWithImgByChatId_Success() {
        ChatReqModel reqModel = new ChatReqModel();
        reqModel.setId(1);
        reqModel.setUrl("http://example.com/image.jpg");
        reqModel.setCreateTime(LocalDateTime.now());

        when(chatReqModelMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(Arrays.asList(reqModel));

        List<ChatReqModelDto> result = chatDataService.getReqModelWithImgByChatId(TEST_UID, TEST_CHAT_ID);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(reqModel.getUrl(), result.get(0).getUrl());
        verify(chatReqModelMapper).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    void testGetByFileIdAll_Success() {
        ChatFileUser fileUser = ChatFileUser.builder()
                .fileId(TEST_FILE_ID)
                .uid(TEST_UID)
                .build();

        when(chatFileUserMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(Arrays.asList(fileUser));

        ChatFileUser result = chatDataService.getByFileIdAll(TEST_FILE_ID, TEST_UID);

        assertNotNull(result);
        assertEquals(TEST_FILE_ID, result.getFileId());
        verify(chatFileUserMapper).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    void testGetByFileIdAll_NotFound_ReturnsNull() {
        when(chatFileUserMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(new ArrayList<>());

        ChatFileUser result = chatDataService.getByFileIdAll(TEST_FILE_ID, TEST_UID);

        assertNull(result);
        verify(chatFileUserMapper).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    void testGetByFileId_Success() {
        ChatFileUser fileUser = ChatFileUser.builder()
                .fileId(TEST_FILE_ID)
                .uid(TEST_UID)
                .build();

        when(chatFileUserMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(fileUser);

        ChatFileUser result = chatDataService.getByFileId(TEST_FILE_ID, TEST_UID);

        assertNotNull(result);
        assertEquals(TEST_FILE_ID, result.getFileId());
        verify(chatFileUserMapper).selectOne(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindChatFileUserByIdAndUid_Success() {
        Long linkId = 1L;
        ChatFileUser fileUser = ChatFileUser.builder()
                .id(linkId)
                .uid(TEST_UID)
                .build();

        when(chatFileUserMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(fileUser);

        ChatFileUser result = chatDataService.findChatFileUserByIdAndUid(linkId, TEST_UID);

        assertNotNull(result);
        assertEquals(linkId, result.getId());
        verify(chatFileUserMapper).selectOne(any(LambdaQueryWrapper.class));
    }

    @Test
    void testUpdateFileReqId_WithExistingChatFileReqs() {
        Long leftId = 50L;
        ChatFileReq existingReq = ChatFileReq.builder()
                .fileId(TEST_FILE_ID)
                .businessType(1)
                .build();

        when(chatFileReqMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(Arrays.asList(existingReq));
        when(chatFileReqMapper.insert(any(ChatFileReq.class))).thenReturn(1);

        chatDataService.updateFileReqId(TEST_CHAT_ID, TEST_UID, null, TEST_REQ_ID, false, leftId);

        verify(chatFileReqMapper).selectList(any(LambdaQueryWrapper.class));
        verify(chatFileReqMapper).insert(any(ChatFileReq.class));
    }

    @Test
    void testUpdateFileReqId_WithFileIds() {
        Long leftId = 50L;
        List<String> fileIds = Arrays.asList(TEST_FILE_ID);

        when(chatFileReqMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(new ArrayList<>());
        when(chatFileReqMapper.update(any(ChatFileReq.class), any(LambdaQueryWrapper.class))).thenReturn(1);

        chatDataService.updateFileReqId(TEST_CHAT_ID, TEST_UID, fileIds, TEST_REQ_ID, false, leftId);

        verify(chatFileReqMapper).selectList(any(LambdaQueryWrapper.class));
        verify(chatFileReqMapper).update(any(ChatFileReq.class), any(LambdaQueryWrapper.class));
    }

    @Test
    void testDeleteChatFileReq_Success() {
        when(chatFileReqMapper.update(any(ChatFileReq.class), any(LambdaQueryWrapper.class))).thenReturn(1);

        chatDataService.deleteChatFileReq(TEST_FILE_ID, TEST_CHAT_ID, TEST_UID);

        verify(chatFileReqMapper).update(any(ChatFileReq.class), any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindReasonByUidAndChatIdAndReqId_Success() {
        ChatReasonRecords reasonRecord = new ChatReasonRecords();
        reasonRecord.setUid(TEST_UID);
        reasonRecord.setChatId(TEST_CHAT_ID);
        reasonRecord.setReqId(TEST_REQ_ID);

        when(chatReasonRecordsMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(reasonRecord);

        ChatReasonRecords result = chatDataService.findReasonByUidAndChatIdAndReqId(TEST_UID, TEST_CHAT_ID, TEST_REQ_ID);

        assertNotNull(result);
        assertEquals(TEST_REQ_ID, result.getReqId());
        verify(chatReasonRecordsMapper).selectOne(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindTraceSourceByUidAndChatIdAndReqId_Success() {
        ChatTraceSource traceSource = new ChatTraceSource();
        traceSource.setUid(TEST_UID);
        traceSource.setChatId(TEST_CHAT_ID);
        traceSource.setReqId(TEST_REQ_ID);

        when(chatTraceSourceMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(traceSource);

        ChatTraceSource result = chatDataService.findTraceSourceByUidAndChatIdAndReqId(TEST_UID, TEST_CHAT_ID, TEST_REQ_ID);

        assertNotNull(result);
        assertEquals(TEST_REQ_ID, result.getReqId());
        verify(chatTraceSourceMapper).selectOne(any(LambdaQueryWrapper.class));
    }
}
