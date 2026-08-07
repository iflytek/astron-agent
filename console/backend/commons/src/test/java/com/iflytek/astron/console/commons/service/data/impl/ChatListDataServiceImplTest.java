package com.iflytek.astron.console.commons.service.data.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.iflytek.astron.console.commons.entity.bot.ChatBotBase;
import com.iflytek.astron.console.commons.dto.chat.ChatBotListDto;
import com.iflytek.astron.console.commons.entity.chat.ChatList;
import com.iflytek.astron.console.commons.entity.chat.ChatTreeIndex;
import com.iflytek.astron.console.commons.mapper.bot.ChatBotListMapper;
import com.iflytek.astron.console.commons.mapper.chat.ChatListMapper;
import com.iflytek.astron.console.commons.mapper.chat.ChatTreeIndexMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatListDataServiceImplTest {

    @Mock
    private ChatListMapper chatListMapper;

    @Mock
    private ChatTreeIndexMapper chatTreeIndexMapper;

    @Mock
    private ChatBotListMapper chatBotListMapper;

    @InjectMocks
    private ChatListDataServiceImpl chatListDataService;

    private String uid;
    private Long chatId;
    private Integer botId;
    private ChatList mockChatList;
    private ChatTreeIndex mockChatTreeIndex;
    private ChatBotBase mockChatBotBase;

    @BeforeEach
    void setUp() {
        uid = "testUser";
        chatId = 123L;
        botId = 456;

        mockChatList = new ChatList();
        mockChatList.setId(chatId);
        mockChatList.setUid(uid);
        mockChatList.setBotId(botId);
        mockChatList.setEnable(1);
        mockChatList.setIsDelete(0);
        mockChatList.setUpdateTime(LocalDateTime.now());

        mockChatTreeIndex = ChatTreeIndex.builder()
                .id(1L)
                .rootChatId(chatId)
                .parentChatId(0L)
                .childChatId(chatId)
                .uid(uid)
                .build();

        mockChatBotBase = new ChatBotBase();
        mockChatBotBase.setId(botId);
        mockChatBotBase.setUid(uid);
        mockChatBotBase.setBotName("Test Bot");
        mockChatBotBase.setAvatar("avatar.jpg");
        mockChatBotBase.setBotType(1);
        mockChatBotBase.setBotDesc("Test Bot Description");
    }

    @Test
    void testFindByUidAndChatId_Success() {
        // Given
        when(chatListMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(mockChatList);

        // When
        ChatList result = chatListDataService.findByUidAndChatId(uid, chatId);

        // Then
        assertNotNull(result);
        assertEquals(chatId, result.getId());
        assertEquals(uid, result.getUid());
        verify(chatListMapper).selectOne(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindByUidAndChatId_UidNull() {
        // When
        ChatList result = chatListDataService.findByUidAndChatId(null, chatId);

        // Then
        assertNull(result);
        verify(chatListMapper, never()).selectOne(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindByUidAndChatId_ChatIdNull() {
        // When
        ChatList result = chatListDataService.findByUidAndChatId(uid, null);

        // Then
        assertNull(result);
        verify(chatListMapper, never()).selectOne(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindChatTreeIndexByChatIdOrderById_Success() {
        // Given
        List<ChatTreeIndex> mockList = List.of(mockChatTreeIndex);
        when(chatTreeIndexMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(mockList);

        // When
        List<ChatTreeIndex> result = chatListDataService.findChatTreeIndexByChatIdOrderById(chatId);

        // Then
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(mockChatTreeIndex, result.get(0));
        verify(chatTreeIndexMapper).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    void testCreateChat_Success() {
        // Given
        when(chatListMapper.insert(mockChatList)).thenReturn(1);

        // When
        ChatList result = chatListDataService.createChat(mockChatList);

        // Then
        assertNotNull(result);
        assertEquals(mockChatList, result);
        verify(chatListMapper).insert(mockChatList);
    }

    @Test
    void testCreateChatTreeIndex_Success() {
        // Given
        when(chatTreeIndexMapper.insert(mockChatTreeIndex)).thenReturn(1);

        // When
        ChatTreeIndex result = chatListDataService.createChatTreeIndex(mockChatTreeIndex);

        // Then
        assertNotNull(result);
        assertEquals(mockChatTreeIndex, result);
        verify(chatTreeIndexMapper).insert(mockChatTreeIndex);
    }

    @Test
    void testGetListByRootChatId_Success() {
        // Given
        List<ChatTreeIndex> mockList = List.of(mockChatTreeIndex);
        when(chatTreeIndexMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(mockList);

        // When
        List<ChatTreeIndex> result = chatListDataService.getListByRootChatId(chatId, uid);

        // Then
        assertNotNull(result);
        assertEquals(1, result.size());
        verify(chatTreeIndexMapper).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    void testGetBotChatList_Success() {
        // Given
        List<ChatBotListDto> mockDtoList = List.of(new ChatBotListDto());
        when(chatListMapper.getBotChatList(uid)).thenReturn(mockDtoList);

        // When
        List<ChatBotListDto> result = chatListDataService.getBotChatList(uid);

        // Then
        assertNotNull(result);
        assertEquals(1, result.size());
        verify(chatListMapper).getBotChatList(uid);
    }

    @Test
    void testFindLatestEnabledChatByUserAndBot_Success() {
        // Given
        when(chatListMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(mockChatList);

        // When
        ChatList result = chatListDataService.findLatestEnabledChatByUserAndBot(uid, botId);

        // Then
        assertNotNull(result);
        assertEquals(mockChatList, result);
        verify(chatListMapper).selectOne(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindLatestEnabledChatByUserAndBot_UidNull() {
        // When
        ChatList result = chatListDataService.findLatestEnabledChatByUserAndBot(null, botId);

        // Then
        assertNull(result);
        verify(chatListMapper, never()).selectOne(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindLatestEnabledChatByUserAndBot_BotIdNull() {
        // When
        ChatList result = chatListDataService.findLatestEnabledChatByUserAndBot(uid, null);

        // Then
        assertNull(result);
        verify(chatListMapper, never()).selectOne(any(LambdaQueryWrapper.class));
    }

    @Test
    void testReactivateChat_Success() {
        // Given
        when(chatListMapper.updateById(any(ChatList.class))).thenReturn(1);

        // When
        int result = chatListDataService.reactivateChat(chatId);

        // Then
        assertEquals(1, result);

        ArgumentCaptor<ChatList> captor = ArgumentCaptor.forClass(ChatList.class);
        verify(chatListMapper).updateById(captor.capture());

        ChatList captured = captor.getValue();
        assertEquals(chatId, captured.getId());
        assertEquals(Integer.valueOf(0), captured.getIsDelete());
    }

    @Test
    void testReactivateChat_IdNull() {
        // When
        int result = chatListDataService.reactivateChat(null);

        // Then
        assertEquals(0, result);
        verify(chatListMapper, never()).updateById(any(ChatList.class));
    }

    @Test
    void testReactivateChatBatch_Success() {
        // Given
        List<Long> chatIdList = List.of(1L, 2L, 3L);
        when(chatListMapper.update(any(ChatList.class), any(LambdaQueryWrapper.class))).thenReturn(3);

        // When
        int result = chatListDataService.reactivateChatBatch(chatIdList);

        // Then
        assertEquals(3, result);
        verify(chatListMapper).update(any(ChatList.class), any(LambdaQueryWrapper.class));
    }

    @Test
    void testReactivateChatBatch_EmptyList() {
        // When
        int result = chatListDataService.reactivateChatBatch(Collections.emptyList());

        // Then
        assertEquals(0, result);
        verify(chatListMapper, never()).update(any(ChatList.class), any(LambdaQueryWrapper.class));
    }

    @Test
    void testReactivateChatBatch_NullList() {
        // When
        int result = chatListDataService.reactivateChatBatch(null);

        // Then
        assertEquals(0, result);
        verify(chatListMapper, never()).update(any(ChatList.class), any(LambdaQueryWrapper.class));
    }

    @Test
    void testAddRootTree_ExistingChild() {
        // Given
        List<ChatTreeIndex> existingList = List.of(mockChatTreeIndex);
        when(chatTreeIndexMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(existingList);

        // When
        long result = chatListDataService.addRootTree(chatId, uid);

        // Then
        assertEquals(chatId, result);
        verify(chatTreeIndexMapper).selectList(any(LambdaQueryWrapper.class));
        verify(chatTreeIndexMapper, never()).insert(any(ChatTreeIndex.class));
    }

    @Test
    void testAddRootTree_NewChild() {
        // Given
        when(chatTreeIndexMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(Collections.emptyList());
        when(chatTreeIndexMapper.insert(any(ChatTreeIndex.class))).thenReturn(1);

        // When
        long result = chatListDataService.addRootTree(chatId, uid);

        // Then
        assertEquals(chatId, result);

        ArgumentCaptor<ChatTreeIndex> captor = ArgumentCaptor.forClass(ChatTreeIndex.class);
        verify(chatTreeIndexMapper).insert(captor.capture());

        ChatTreeIndex captured = captor.getValue();
        assertEquals(chatId, captured.getRootChatId());
        assertEquals(Long.valueOf(0L), captured.getParentChatId());
        assertEquals(chatId, captured.getChildChatId());
        assertEquals(uid, captured.getUid());
    }

    @Test
    void testDeactivateChatBotList_Success() {
        // Given
        when(chatBotListMapper.update(isNull(), any(UpdateWrapper.class))).thenReturn(1);

        // When
        int result = chatListDataService.deactivateChatBotList(uid, botId);

        // Then
        assertEquals(1, result);
        verify(chatBotListMapper).update(isNull(), any(UpdateWrapper.class));
    }

    @Test
    void testDeactivateChatBotList_UidNull() {
        // When
        int result = chatListDataService.deactivateChatBotList(null, botId);

        // Then
        assertEquals(0, result);
        verify(chatBotListMapper, never()).update(any(), any(UpdateWrapper.class));
    }

    @Test
    void testDeactivateChatBotList_BotIdNull() {
        // When
        int result = chatListDataService.deactivateChatBotList(uid, null);

        // Then
        assertEquals(0, result);
        verify(chatBotListMapper, never()).update(any(), any(UpdateWrapper.class));
    }

    @Test
    void testGetAllListByChildChatId_Success() {
        // Given
        when(chatTreeIndexMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(mockChatTreeIndex);

        List<ChatTreeIndex> mockList = List.of(mockChatTreeIndex);
        when(chatTreeIndexMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(mockList);

        // When
        List<ChatTreeIndex> result = chatListDataService.getAllListByChildChatId(chatId, uid);

        // Then
        assertNotNull(result);
        assertEquals(1, result.size());
        verify(chatTreeIndexMapper).selectOne(any(LambdaQueryWrapper.class));
        verify(chatTreeIndexMapper).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    void testGetAllListByChildChatId_ChildChatIdNull() {
        // When
        List<ChatTreeIndex> result = chatListDataService.getAllListByChildChatId(null, uid);

        // Then
        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(chatTreeIndexMapper, never()).selectOne(any(LambdaQueryWrapper.class));
    }

    @Test
    void testGetAllListByChildChatId_UidNull() {
        // When
        List<ChatTreeIndex> result = chatListDataService.getAllListByChildChatId(chatId, null);

        // Then
        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(chatTreeIndexMapper, never()).selectOne(any(LambdaQueryWrapper.class));
    }

    @Test
    void testGetAllListByChildChatId_ChildNotFound() {
        // Given
        when(chatTreeIndexMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);

        // When
        List<ChatTreeIndex> result = chatListDataService.getAllListByChildChatId(chatId, uid);

        // Then
        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(chatTreeIndexMapper).selectOne(any(LambdaQueryWrapper.class));
        verify(chatTreeIndexMapper, never()).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    void testDeleteById_Success() {
        // Given
        when(chatListMapper.updateById(any(ChatList.class))).thenReturn(1);

        // When
        int result = chatListDataService.deleteById(chatId);

        // Then
        assertEquals(1, result);

        ArgumentCaptor<ChatList> captor = ArgumentCaptor.forClass(ChatList.class);
        verify(chatListMapper).updateById(captor.capture());

        ChatList captured = captor.getValue();
        assertEquals(chatId, captured.getId());
        assertEquals(Integer.valueOf(1), captured.getIsDelete());
        assertNotNull(captured.getUpdateTime());
    }

    @Test
    void testDeleteById_IdNull() {
        // When
        int result = chatListDataService.deleteById(null);

        // Then
        assertEquals(0, result);
        verify(chatListMapper, never()).updateById(any(ChatList.class));
    }

    @Test
    void testDeleteBatchIds_Success() {
        // Given
        List<Long> idList = List.of(1L, 2L, 3L);
        when(chatListMapper.update(any(ChatList.class), any(LambdaQueryWrapper.class))).thenReturn(3);

        // When
        int result = chatListDataService.deleteBatchIds(idList);

        // Then
        assertEquals(3, result);

        ArgumentCaptor<ChatList> captor = ArgumentCaptor.forClass(ChatList.class);
        verify(chatListMapper).update(captor.capture(), any(LambdaQueryWrapper.class));

        ChatList captured = captor.getValue();
        assertEquals(Integer.valueOf(1), captured.getIsDelete());
        assertNotNull(captured.getUpdateTime());
    }

    @Test
    void testDeleteBatchIds_EmptyList() {
        // When
        int result = chatListDataService.deleteBatchIds(Collections.emptyList());

        // Then
        assertEquals(0, result);
        verify(chatListMapper, never()).update(any(ChatList.class), any(LambdaQueryWrapper.class));
    }

    @Test
    void testDeleteBatchIds_NullList() {
        // When
        int result = chatListDataService.deleteBatchIds(null);

        // Then
        assertEquals(0, result);
        verify(chatListMapper, never()).update(any(ChatList.class), any(LambdaQueryWrapper.class));
    }

    @Test
    void testGetBotChat_Success() {
        // Given
        when(chatListMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(mockChatList);

        // When
        ChatList result = chatListDataService.getBotChat(uid, Long.valueOf(botId));

        // Then
        assertNotNull(result);
        assertEquals(mockChatList, result);
        verify(chatListMapper).selectOne(any(LambdaQueryWrapper.class));
    }

    @Test
    void testInsertChatBotList_Success() {
        // Given
        doNothing().when(chatBotListMapper).baseBotInsert(mockChatBotBase);

        // When
        ChatBotBase result = chatListDataService.insertChatBotList(mockChatBotBase);

        // Then
        assertNotNull(result);
        assertEquals(mockChatBotBase, result);
        verify(chatBotListMapper).baseBotInsert(mockChatBotBase);
    }

    @Test
    void testUpdateChatBotList_Success() {
        // Given
        when(chatBotListMapper.update(isNull(), any(UpdateWrapper.class))).thenReturn(1);

        // When
        ChatBotBase result = chatListDataService.updateChatBotList(mockChatBotBase);

        // Then
        assertNotNull(result);
        assertEquals(mockChatBotBase, result);
        verify(chatBotListMapper).update(isNull(), any(UpdateWrapper.class));
    }
}
