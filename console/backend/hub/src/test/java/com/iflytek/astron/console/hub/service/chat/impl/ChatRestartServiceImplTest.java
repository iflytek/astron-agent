package com.iflytek.astron.console.hub.service.chat.impl;

import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.service.data.ChatListDataService;
import com.iflytek.astron.console.commons.dto.chat.ChatListCreateResponse;
import com.iflytek.astron.console.commons.entity.chat.ChatTreeIndex;
import com.iflytek.astron.console.hub.service.chat.ChatListService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatRestartServiceImplTest {

    @Mock
    private ChatListDataService chatListDataService;

    @Mock
    private ChatListService chatListService;

    @InjectMocks
    private ChatRestartServiceImpl chatRestartService;

    private Long rootChatId;
    private String uid;
    private String chatListName;
    private List<ChatTreeIndex> chatTreeIndexList;
    private ChatTreeIndex chatTreeIndex;
    private ChatListCreateResponse chatListCreateResponse;

    @BeforeEach
    void setUp() {
        rootChatId = 100L;
        uid = "test-user-123";
        chatListName = "Test Chat";

        // Setup chat tree index
        chatTreeIndex = ChatTreeIndex.builder()
                .id(1L)
                .rootChatId(100L)
                .parentChatId(50L)
                .childChatId(200L)
                .uid("test-user-123")
                .build();

        chatTreeIndexList = new ArrayList<>();
        chatTreeIndexList.add(chatTreeIndex);

        // Setup chat list create response
        chatListCreateResponse = new ChatListCreateResponse(
                300L,
                "New Chat",
                1,
                LocalDateTime.now(),
                false,
                null,
                1,
                null,
                null);
    }

    @Test
    void testCreateNewTreeIndexByRootChatId_WithValidData_ShouldCreateNewTreeIndex() {
        // Given
        when(chatListDataService.findChatTreeIndexByChatIdOrderById(rootChatId))
                .thenReturn(chatTreeIndexList);
        when(chatListService.createChatListForRestart(uid, chatListName, null, 200L))
                .thenReturn(chatListCreateResponse);

        // When
        ChatListCreateResponse result = chatRestartService.createNewTreeIndexByRootChatId(rootChatId, uid, chatListName);

        // Then
        assertNotNull(result);
        assertEquals(300L, result.getId());
        assertEquals("New Chat", result.getTitle());

        // Verify new tree index was created
        ArgumentCaptor<ChatTreeIndex> treeIndexCaptor = ArgumentCaptor.forClass(ChatTreeIndex.class);
        verify(chatListDataService).createChatTreeIndex(treeIndexCaptor.capture());

        ChatTreeIndex capturedTreeIndex = treeIndexCaptor.getValue();
        assertEquals(100L, capturedTreeIndex.getRootChatId());
        assertEquals(200L, capturedTreeIndex.getParentChatId());
        assertEquals(300L, capturedTreeIndex.getChildChatId());
        assertEquals("test-user-123", capturedTreeIndex.getUid());

        verify(chatListDataService).findChatTreeIndexByChatIdOrderById(rootChatId);
        verify(chatListService).createChatListForRestart(uid, chatListName, null, 200L);
    }

    @Test
    void testCreateNewTreeIndexByRootChatId_WithEmptyTreeList_ShouldThrowBusinessException() {
        // Given
        List<ChatTreeIndex> emptyList = new ArrayList<>();
        when(chatListDataService.findChatTreeIndexByChatIdOrderById(rootChatId))
                .thenReturn(emptyList);

        // When & Then
        BusinessException exception = assertThrows(BusinessException.class, () -> {
            chatRestartService.createNewTreeIndexByRootChatId(rootChatId, uid, chatListName);
        });

        assertEquals(ResponseEnum.CHAT_TREE_ERROR, exception.getResponseEnum());

        verify(chatListDataService).findChatTreeIndexByChatIdOrderById(rootChatId);
        verify(chatListService, never()).createChatListForRestart(any(), any(), any(), anyLong());
        verify(chatListDataService, never()).createChatTreeIndex(any());
    }

    @Test
    void testCreateNewTreeIndexByRootChatId_WithNullTreeList_ShouldThrowBusinessException() {
        // Given
        when(chatListDataService.findChatTreeIndexByChatIdOrderById(rootChatId))
                .thenReturn(null);

        // When & Then
        BusinessException exception = assertThrows(BusinessException.class, () -> {
            chatRestartService.createNewTreeIndexByRootChatId(rootChatId, uid, chatListName);
        });

        assertEquals(ResponseEnum.CHAT_TREE_ERROR, exception.getResponseEnum());

        verify(chatListDataService).findChatTreeIndexByChatIdOrderById(rootChatId);
        verify(chatListService, never()).createChatListForRestart(any(), any(), any(), anyLong());
        verify(chatListDataService, never()).createChatTreeIndex(any());
    }

    @Test
    void testCreateNewTreeIndexByRootChatId_WhenResponseIdEqualsChildChatId_ShouldReturnDirectly() {
        // Given
        ChatListCreateResponse sameIdResponse = new ChatListCreateResponse(
                200L, // Same as childChatId in chatTreeIndex
                "Existing Chat",
                1,
                LocalDateTime.now(),
                true,
                null,
                1,
                null,
                null);

        when(chatListDataService.findChatTreeIndexByChatIdOrderById(rootChatId))
                .thenReturn(chatTreeIndexList);
        when(chatListService.createChatListForRestart(uid, chatListName, null, 200L))
                .thenReturn(sameIdResponse);

        // When
        ChatListCreateResponse result = chatRestartService.createNewTreeIndexByRootChatId(rootChatId, uid, chatListName);

        // Then
        assertNotNull(result);
        assertEquals(200L, result.getId());
        assertEquals("Existing Chat", result.getTitle());

        // Verify no new tree index was created
        verify(chatListDataService, never()).createChatTreeIndex(any());
        verify(chatListDataService).findChatTreeIndexByChatIdOrderById(rootChatId);
        verify(chatListService).createChatListForRestart(uid, chatListName, null, 200L);
    }

    @Test
    void testCreateNewTreeIndexByRootChatId_WithNullRootChatId_ShouldThrowBusinessException() {
        // Given
        Long nullRootChatId = null;
        when(chatListDataService.findChatTreeIndexByChatIdOrderById(nullRootChatId))
                .thenReturn(Collections.emptyList());

        // When & Then
        BusinessException exception = assertThrows(BusinessException.class, () -> {
            chatRestartService.createNewTreeIndexByRootChatId(nullRootChatId, uid, chatListName);
        });

        assertEquals(ResponseEnum.CHAT_TREE_ERROR, exception.getResponseEnum());

        verify(chatListDataService).findChatTreeIndexByChatIdOrderById(nullRootChatId);
        verify(chatListService, never()).createChatListForRestart(any(), any(), any(), anyLong());
        verify(chatListDataService, never()).createChatTreeIndex(any());
    }

    @Test
    void testCreateNewTreeIndexByRootChatId_WithNullUid_ShouldProcessCorrectly() {
        // Given
        String nullUid = null;
        when(chatListDataService.findChatTreeIndexByChatIdOrderById(rootChatId))
                .thenReturn(chatTreeIndexList);
        when(chatListService.createChatListForRestart(nullUid, chatListName, null, 200L))
                .thenReturn(chatListCreateResponse);

        // When
        ChatListCreateResponse result = chatRestartService.createNewTreeIndexByRootChatId(rootChatId, nullUid, chatListName);

        // Then
        assertNotNull(result);

        ArgumentCaptor<ChatTreeIndex> treeIndexCaptor = ArgumentCaptor.forClass(ChatTreeIndex.class);
        verify(chatListDataService).createChatTreeIndex(treeIndexCaptor.capture());

        ChatTreeIndex capturedTreeIndex = treeIndexCaptor.getValue();
        assertNull(capturedTreeIndex.getUid());

        verify(chatListService).createChatListForRestart(nullUid, chatListName, null, 200L);
    }

    @Test
    void testCreateNewTreeIndexByRootChatId_WithNullChatListName_ShouldProcessCorrectly() {
        // Given
        String nullChatListName = null;
        when(chatListDataService.findChatTreeIndexByChatIdOrderById(rootChatId))
                .thenReturn(chatTreeIndexList);
        when(chatListService.createChatListForRestart(uid, nullChatListName, null, 200L))
                .thenReturn(chatListCreateResponse);

        // When
        ChatListCreateResponse result = chatRestartService.createNewTreeIndexByRootChatId(rootChatId, uid, nullChatListName);

        // Then
        assertNotNull(result);
        verify(chatListService).createChatListForRestart(uid, nullChatListName, null, 200L);
    }

    @Test
    void testCreateNewTreeIndexByRootChatId_WithMultipleTreeIndexes_ShouldUseFirst() {
        // Given
        ChatTreeIndex secondTreeIndex = ChatTreeIndex.builder()
                .id(2L)
                .rootChatId(100L)
                .parentChatId(60L)
                .childChatId(210L)
                .uid("test-user-123")
                .build();

        List<ChatTreeIndex> multipleIndexes = new ArrayList<>();
        multipleIndexes.add(chatTreeIndex); // First one
        multipleIndexes.add(secondTreeIndex);

        when(chatListDataService.findChatTreeIndexByChatIdOrderById(rootChatId))
                .thenReturn(multipleIndexes);
        when(chatListService.createChatListForRestart(uid, chatListName, null, 200L)) // Uses first index's childChatId
                .thenReturn(chatListCreateResponse);

        // When
        ChatListCreateResponse result = chatRestartService.createNewTreeIndexByRootChatId(rootChatId, uid, chatListName);

        // Then
        assertNotNull(result);

        ArgumentCaptor<ChatTreeIndex> treeIndexCaptor = ArgumentCaptor.forClass(ChatTreeIndex.class);
        verify(chatListDataService).createChatTreeIndex(treeIndexCaptor.capture());

        ChatTreeIndex capturedTreeIndex = treeIndexCaptor.getValue();
        // Should use first tree index values
        assertEquals(100L, capturedTreeIndex.getRootChatId());
        assertEquals(200L, capturedTreeIndex.getParentChatId()); // childChatId from first index
        assertEquals(300L, capturedTreeIndex.getChildChatId());

        verify(chatListService).createChatListForRestart(uid, chatListName, null, 200L);
    }

    @Test
    void testCreateNewTreeIndexByRootChatId_WhenCreateChatListThrowsException_ShouldPropagateException() {
        // Given
        RuntimeException expectedException = new RuntimeException("Create chat list failed");
        when(chatListDataService.findChatTreeIndexByChatIdOrderById(rootChatId))
                .thenReturn(chatTreeIndexList);
        when(chatListService.createChatListForRestart(uid, chatListName, null, 200L))
                .thenThrow(expectedException);

        // When & Then
        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            chatRestartService.createNewTreeIndexByRootChatId(rootChatId, uid, chatListName);
        });

        assertEquals("Create chat list failed", exception.getMessage());

        verify(chatListDataService).findChatTreeIndexByChatIdOrderById(rootChatId);
        verify(chatListService).createChatListForRestart(uid, chatListName, null, 200L);
        verify(chatListDataService, never()).createChatTreeIndex(any());
    }

    @Test
    void testCreateNewTreeIndexByRootChatId_WhenCreateTreeIndexThrowsException_ShouldPropagateException() {
        // Given
        RuntimeException expectedException = new RuntimeException("Create tree index failed");
        when(chatListDataService.findChatTreeIndexByChatIdOrderById(rootChatId))
                .thenReturn(chatTreeIndexList);
        when(chatListService.createChatListForRestart(uid, chatListName, null, 200L))
                .thenReturn(chatListCreateResponse);
        doThrow(expectedException).when(chatListDataService).createChatTreeIndex(any());

        // When & Then
        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            chatRestartService.createNewTreeIndexByRootChatId(rootChatId, uid, chatListName);
        });

        assertEquals("Create tree index failed", exception.getMessage());

        verify(chatListDataService).findChatTreeIndexByChatIdOrderById(rootChatId);
        verify(chatListService).createChatListForRestart(uid, chatListName, null, 200L);
        verify(chatListDataService).createChatTreeIndex(any());
    }

    @Test
    void testCreateNewTreeIndexByRootChatId_WithZeroIds_ShouldProcessCorrectly() {
        // Given
        ChatTreeIndex zeroIdTreeIndex = ChatTreeIndex.builder()
                .id(1L)
                .rootChatId(0L)
                .parentChatId(0L)
                .childChatId(0L)
                .uid("test-user-123")
                .build();

        List<ChatTreeIndex> zeroIdList = Collections.singletonList(zeroIdTreeIndex);

        ChatListCreateResponse zeroIdResponse = new ChatListCreateResponse(
                0L,
                "Zero Chat",
                1,
                LocalDateTime.now(),
                false,
                null,
                1,
                null,
                null);

        when(chatListDataService.findChatTreeIndexByChatIdOrderById(0L))
                .thenReturn(zeroIdList);
        when(chatListService.createChatListForRestart(uid, chatListName, null, 0L))
                .thenReturn(zeroIdResponse);

        // When
        ChatListCreateResponse result = chatRestartService.createNewTreeIndexByRootChatId(0L, uid, chatListName);

        // Then
        assertNotNull(result);
        assertEquals(0L, result.getId());

        // Should return directly since response ID equals child chat ID
        verify(chatListDataService, never()).createChatTreeIndex(any());
    }

    @Test
    void testCreateNewTreeIndexByRootChatId_WithSpecialCharactersInUid_ShouldProcessCorrectly() {
        // Given
        String specialUid = "test-user-@#$%^&*()_+{}|:<>?[]\\;'\".,/~`!";
        when(chatListDataService.findChatTreeIndexByChatIdOrderById(rootChatId))
                .thenReturn(chatTreeIndexList);
        when(chatListService.createChatListForRestart(specialUid, chatListName, null, 200L))
                .thenReturn(chatListCreateResponse);

        // When
        ChatListCreateResponse result = chatRestartService.createNewTreeIndexByRootChatId(rootChatId, specialUid, chatListName);

        // Then
        assertNotNull(result);

        ArgumentCaptor<ChatTreeIndex> treeIndexCaptor = ArgumentCaptor.forClass(ChatTreeIndex.class);
        verify(chatListDataService).createChatTreeIndex(treeIndexCaptor.capture());

        ChatTreeIndex capturedTreeIndex = treeIndexCaptor.getValue();
        assertEquals(specialUid, capturedTreeIndex.getUid());
    }

    @Test
    void testCreateNewTreeIndexByRootChatId_WithLongChatListName_ShouldProcessCorrectly() {
        // Given
        StringBuilder longNameBuilder = new StringBuilder();
        for (int i = 0; i < 100; i++) {
            longNameBuilder.append("Very Long Chat List Name ");
        }
        String longChatListName = longNameBuilder.toString();

        when(chatListDataService.findChatTreeIndexByChatIdOrderById(rootChatId))
                .thenReturn(chatTreeIndexList);
        when(chatListService.createChatListForRestart(uid, longChatListName, null, 200L))
                .thenReturn(chatListCreateResponse);

        // When
        ChatListCreateResponse result = chatRestartService.createNewTreeIndexByRootChatId(rootChatId, uid, longChatListName);

        // Then
        assertNotNull(result);
        verify(chatListService).createChatListForRestart(uid, longChatListName, null, 200L);
    }
}
