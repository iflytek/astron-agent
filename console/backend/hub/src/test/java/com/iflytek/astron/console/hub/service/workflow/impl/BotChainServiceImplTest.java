package com.iflytek.astron.console.hub.service.workflow.impl;

import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.entity.bot.UserLangChainInfo;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.service.data.UserLangChainDataService;
import com.iflytek.astron.console.commons.util.MaasUtil;
import jakarta.servlet.http.HttpServletRequest;
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
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BotChainServiceImplTest {

    @Mock
    private UserLangChainDataService userLangChainDataService;

    @Mock
    private MaasUtil maasUtil;

    @Mock
    private HttpServletRequest request;

    @InjectMocks
    private BotChainServiceImpl botChainService;

    private UserLangChainInfo mockChainInfo;
    private String uid;
    private Long sourceId;
    private Long targetId;
    private Long spaceId;

    @BeforeEach
    void setUp() {
        uid = "testUser";
        sourceId = 123L;
        targetId = 456L;
        spaceId = 789L;

        mockChainInfo = new UserLangChainInfo();
        mockChainInfo.setId(1L);
        mockChainInfo.setBotId(123);
        mockChainInfo.setFlowId("flow123");
        mockChainInfo.setUid("sourceUser");
        mockChainInfo.setMaasId(999L);
        mockChainInfo.setOpen("{\"nodes\":[{\"id\":\"node:123-456-789\"}]}");
        mockChainInfo.setGcy("gcy:node:123-456-789");
        mockChainInfo.setUpdateTime(LocalDateTime.now().minusDays(1));
    }

    @Test
    void testCopyBot_Success() {
        // Given
        // Store original values before they get modified by replaceNodeId
        String originalOpen = mockChainInfo.getOpen();
        String originalGcy = mockChainInfo.getGcy();

        List<UserLangChainInfo> botList = List.of(mockChainInfo);
        when(userLangChainDataService.findListByBotId(Math.toIntExact(sourceId))).thenReturn(botList);

        // When
        botChainService.copyBot(uid, sourceId, targetId, spaceId);

        // Then
        ArgumentCaptor<UserLangChainInfo> captor = ArgumentCaptor.forClass(UserLangChainInfo.class);
        verify(userLangChainDataService).insertUserLangChainInfo(captor.capture());

        UserLangChainInfo captured = captor.getValue();
        assertNull(captured.getId());
        assertEquals(Math.toIntExact(targetId), captured.getBotId());
        assertNull(captured.getFlowId());
        assertEquals(spaceId, captured.getSpaceId());
        assertNotNull(captured.getUpdateTime());

        // Verify node IDs were replaced (compare with original values)
        assertNotEquals(originalOpen, captured.getOpen());
        assertNotEquals(originalGcy, captured.getGcy());

        // Verify the structure is maintained but original node ID is replaced
        assertTrue(captured.getOpen().contains("\"nodes\":"));
        assertFalse(captured.getOpen().contains("node:123-456-789"));
        assertFalse(captured.getGcy().contains("node:123-456-789"));
    }

    @Test
    void testCopyBot_WithUidWhenSpaceIdIsNull() {
        // Given
        List<UserLangChainInfo> botList = List.of(mockChainInfo);
        when(userLangChainDataService.findListByBotId(Math.toIntExact(sourceId))).thenReturn(botList);

        // When
        botChainService.copyBot(uid, sourceId, targetId, null);

        // Then
        ArgumentCaptor<UserLangChainInfo> captor = ArgumentCaptor.forClass(UserLangChainInfo.class);
        verify(userLangChainDataService).insertUserLangChainInfo(captor.capture());

        UserLangChainInfo captured = captor.getValue();
        assertEquals(uid, captured.getUid());
        assertNull(captured.getSpaceId());
    }

    @Test
    void testCopyBot_SourceAssistantDoesNotExist() {
        // Given
        when(userLangChainDataService.findListByBotId(Math.toIntExact(sourceId))).thenReturn(null);

        // When
        botChainService.copyBot(uid, sourceId, targetId, spaceId);

        // Then
        verify(userLangChainDataService, never()).insertUserLangChainInfo(any());
    }

    @Test
    void testCopyBot_EmptyBotList() {
        // Given
        when(userLangChainDataService.findListByBotId(Math.toIntExact(sourceId))).thenReturn(Collections.emptyList());

        // When
        botChainService.copyBot(uid, sourceId, targetId, spaceId);

        // Then
        verify(userLangChainDataService, never()).insertUserLangChainInfo(any());
    }

    @Test
    void testCloneWorkFlow_Success() {
        // Given
        List<UserLangChainInfo> botList = List.of(mockChainInfo);
        when(userLangChainDataService.findListByBotId(Math.toIntExact(sourceId))).thenReturn(botList);

        JSONObject response = new JSONObject();
        JSONObject data = new JSONObject();
        data.put("id", 111L);
        data.put("flowId", "newFlow123");
        response.put("data", data);
        when(maasUtil.copyWorkFlow(999L, request)).thenReturn(response);

        // When
        botChainService.cloneWorkFlow(uid, sourceId, targetId, request, spaceId);

        // Then
        ArgumentCaptor<UserLangChainInfo> captor = ArgumentCaptor.forClass(UserLangChainInfo.class);
        verify(userLangChainDataService).insertUserLangChainInfo(captor.capture());

        UserLangChainInfo captured = captor.getValue();
        assertEquals(Math.toIntExact(targetId), captured.getBotId());
        assertEquals(111L, captured.getMaasId());
        assertEquals("newFlow123", captured.getFlowId());
        assertEquals(spaceId, captured.getSpaceId());
        assertNotNull(captured.getUpdateTime());
    }

    @Test
    void testCloneWorkFlow_WithUidWhenSpaceIdIsNull() {
        // Given
        List<UserLangChainInfo> botList = List.of(mockChainInfo);
        when(userLangChainDataService.findListByBotId(Math.toIntExact(sourceId))).thenReturn(botList);

        JSONObject response = new JSONObject();
        JSONObject data = new JSONObject();
        data.put("id", 111L);
        data.put("flowId", "newFlow123");
        response.put("data", data);
        when(maasUtil.copyWorkFlow(999L, request)).thenReturn(response);

        // When
        botChainService.cloneWorkFlow(uid, sourceId, targetId, request, null);

        // Then
        ArgumentCaptor<UserLangChainInfo> captor = ArgumentCaptor.forClass(UserLangChainInfo.class);
        verify(userLangChainDataService).insertUserLangChainInfo(captor.capture());

        UserLangChainInfo captured = captor.getValue();
        assertEquals(uid, captured.getUid());
        assertNull(captured.getSpaceId());
    }

    @Test
    void testCloneWorkFlow_SourceAssistantDoesNotExist() {
        // Given
        when(userLangChainDataService.findListByBotId(Math.toIntExact(sourceId))).thenReturn(null);

        // When
        botChainService.cloneWorkFlow(uid, sourceId, targetId, request, spaceId);

        // Then
        verify(maasUtil, never()).copyWorkFlow(anyLong(), any());
        verify(userLangChainDataService, never()).insertUserLangChainInfo(any());
    }

    @Test
    void testCloneWorkFlow_EmptyBotList() {
        // Given
        when(userLangChainDataService.findListByBotId(Math.toIntExact(sourceId))).thenReturn(Collections.emptyList());

        // When
        botChainService.cloneWorkFlow(uid, sourceId, targetId, request, spaceId);

        // Then
        verify(maasUtil, never()).copyWorkFlow(anyLong(), any());
        verify(userLangChainDataService, never()).insertUserLangChainInfo(any());
    }

    @Test
    void testCloneWorkFlow_MaasUtilReturnsNull() {
        // Given
        List<UserLangChainInfo> botList = List.of(mockChainInfo);
        when(userLangChainDataService.findListByBotId(Math.toIntExact(sourceId))).thenReturn(botList);
        when(maasUtil.copyWorkFlow(999L, request)).thenReturn(null);

        // When & Then
        BusinessException exception = assertThrows(BusinessException.class, () -> {
            botChainService.cloneWorkFlow(uid, sourceId, targetId, request, spaceId);
        });

        assertEquals(ResponseEnum.BOT_CHAIN_UPDATE_ERROR, exception.getResponseEnum());
        verify(userLangChainDataService, never()).insertUserLangChainInfo(any());
    }

    @Test
    void testReplaceNodeId() {
        // Given
        UserLangChainInfo chainInfo = new UserLangChainInfo();
        chainInfo.setOpen("{\"nodes\":[{\"id\":\"node:123-456-789\"},{\"id\":\"edge:987-654-321\"}]}");
        chainInfo.setGcy("contains node:123-456-789 and edge:987-654-321");

        String originalOpen = chainInfo.getOpen();
        String originalGcy = chainInfo.getGcy();

        // When
        BotChainServiceImpl.replaceNodeId(chainInfo);

        // Then
        assertNotEquals(originalOpen, chainInfo.getOpen());
        assertNotEquals(originalGcy, chainInfo.getGcy());

        // Verify original node IDs are no longer present
        assertFalse(chainInfo.getOpen().contains("node:123-456-789"));
        assertFalse(chainInfo.getOpen().contains("edge:987-654-321"));
        assertFalse(chainInfo.getGcy().contains("node:123-456-789"));
        assertFalse(chainInfo.getGcy().contains("edge:987-654-321"));

        // Verify structure is preserved
        assertTrue(chainInfo.getOpen().contains("\"nodes\":"));
        assertTrue(chainInfo.getOpen().contains("node:"));
        assertTrue(chainInfo.getOpen().contains("edge:"));
    }

    @Test
    void testGetNewNodeId_WithColon() {
        // Given
        String original = "node:123-456-789";

        // When
        String newNodeId = BotChainServiceImpl.getNewNodeId(original);

        // Then
        assertTrue(newNodeId.startsWith("node:"));
        assertNotEquals(original, newNodeId);

        // Verify it contains a valid UUID after the colon
        String uuidPart = newNodeId.substring(5); // Remove "node:" prefix
        assertDoesNotThrow(() -> UUID.fromString(uuidPart));
    }

    @Test
    void testGetNewNodeId_WithoutColon() {
        // Given
        String original = "nodeWithoutColon";

        // When & Then
        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            BotChainServiceImpl.getNewNodeId(original);
        });

        assertEquals("Assistant backend data does not conform to specifications", exception.getMessage());
    }

    @Test
    void testGetNewNodeId_EmptyString() {
        // Given
        String original = "";

        // When & Then
        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            BotChainServiceImpl.getNewNodeId(original);
        });

        assertEquals("Assistant backend data does not conform to specifications", exception.getMessage());
    }

    @Test
    void testGetNewNodeId_OnlyColon() {
        // Given
        String original = ":";

        // When
        String newNodeId = BotChainServiceImpl.getNewNodeId(original);

        // Then
        assertTrue(newNodeId.startsWith(":"));
        assertNotEquals(original, newNodeId);

        // Verify it contains a valid UUID after the colon
        String uuidPart = newNodeId.substring(1); // Remove ":" prefix
        assertDoesNotThrow(() -> UUID.fromString(uuidPart));
    }

    @Test
    void testCloneWorkFlow_VerifyMaasIdConversion() {
        // Given
        mockChainInfo.setMaasId(12345L);
        List<UserLangChainInfo> botList = List.of(mockChainInfo);
        when(userLangChainDataService.findListByBotId(Math.toIntExact(sourceId))).thenReturn(botList);

        JSONObject response = new JSONObject();
        JSONObject data = new JSONObject();
        data.put("id", 67890L);
        data.put("flowId", "testFlow");
        response.put("data", data);
        when(maasUtil.copyWorkFlow(12345L, request)).thenReturn(response);

        // When
        botChainService.cloneWorkFlow(uid, sourceId, targetId, request, spaceId);

        // Then
        verify(maasUtil).copyWorkFlow(12345L, request);
    }
}
