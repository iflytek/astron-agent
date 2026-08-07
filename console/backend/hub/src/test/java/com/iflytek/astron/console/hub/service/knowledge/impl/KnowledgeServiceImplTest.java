package com.iflytek.astron.console.hub.service.knowledge.impl;

import com.iflytek.astron.console.commons.entity.dataset.BotDatasetMaas;
import com.iflytek.astron.console.commons.service.data.ChatListDataService;
import com.iflytek.astron.console.commons.service.data.DatasetDataService;
import com.iflytek.astron.console.toolkit.entity.core.knowledge.ChunkInfo;
import com.iflytek.astron.console.toolkit.service.repo.RepoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * KnowledgeServiceImpl unit tests Tests the core business logic of knowledge service
 */
@ExtendWith(MockitoExtension.class)
class KnowledgeServiceImplTest {

    @Mock
    private DatasetDataService datasetDataService;

    @Mock
    private RepoService repoService;

    @Mock
    private ChatListDataService chatListDataService;

    @InjectMocks
    private KnowledgeServiceImpl knowledgeService;

    private Integer testBotId;
    private String testAsk;
    private Integer testTopN;
    private List<String> testMaasDatasetList;
    private String testText;

    @BeforeEach
    void setUp() {
        testBotId = 12345;
        testAsk = "What is artificial intelligence?";
        testTopN = 5;
        testMaasDatasetList = Arrays.asList("123", "456", "789");
        testText = "Test query text";
    }

    @Test
    void getChuncksByBotId_ShouldReturnKnowledgeChunks_WhenDatasetExists() {
        // Given
        List<BotDatasetMaas> datasetList = createTestDatasetList();
        List<String> expectedChunks = Arrays.asList("chunk1", "chunk2", "chunk3");

        when(datasetDataService.findMaasDatasetsByBotIdAndIsAct(testBotId, 1)).thenReturn(datasetList);
        when(repoService.hitTest(anyLong(), eq(testAsk), eq(testTopN), eq(false)))
                .thenReturn(createTestChunkInfoList());

        // When
        List<String> result = knowledgeService.getChuncksByBotId(testBotId, testAsk, testTopN);

        // Then
        assertNotNull(result);
        assertFalse(result.isEmpty());
        verify(datasetDataService).findMaasDatasetsByBotIdAndIsAct(testBotId, 1);
        verify(repoService, times(datasetList.size())).hitTest(anyLong(), eq(testAsk), eq(testTopN), eq(false));
    }

    @Test
    void getChuncksByBotId_ShouldReturnEmptyList_WhenDatasetListIsNull() {
        // Given
        when(datasetDataService.findMaasDatasetsByBotIdAndIsAct(testBotId, 1)).thenReturn(null);

        // When
        List<String> result = knowledgeService.getChuncksByBotId(testBotId, testAsk, testTopN);

        // Then
        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(datasetDataService).findMaasDatasetsByBotIdAndIsAct(testBotId, 1);
        verify(repoService, never()).hitTest(anyLong(), anyString(), anyInt(), anyBoolean());
    }

    @Test
    void getChuncksByBotId_ShouldReturnEmptyList_WhenDatasetListIsEmpty() {
        // Given
        when(datasetDataService.findMaasDatasetsByBotIdAndIsAct(testBotId, 1)).thenReturn(Collections.emptyList());

        // When
        List<String> result = knowledgeService.getChuncksByBotId(testBotId, testAsk, testTopN);

        // Then
        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(datasetDataService).findMaasDatasetsByBotIdAndIsAct(testBotId, 1);
        verify(repoService, never()).hitTest(anyLong(), anyString(), anyInt(), anyBoolean());
    }

    @Test
    void getChuncksByBotId_ShouldPassCorrectParametersToGetChuncks() {
        // Given
        List<BotDatasetMaas> datasetList = createTestDatasetList();
        when(datasetDataService.findMaasDatasetsByBotIdAndIsAct(testBotId, 1)).thenReturn(datasetList);
        when(repoService.hitTest(anyLong(), anyString(), anyInt(), anyBoolean()))
                .thenReturn(createTestChunkInfoList());

        // When
        knowledgeService.getChuncksByBotId(testBotId, testAsk, testTopN);

        // Then
        verify(datasetDataService).findMaasDatasetsByBotIdAndIsAct(testBotId, 1);
        // Verify that getChuncks is called with correct parameters (indirectly through repoService.hitTest)
        verify(repoService, times(datasetList.size())).hitTest(anyLong(), eq(testAsk), eq(testTopN), eq(false));
    }

    @Test
    void getChuncks_ShouldReturnChunks_WhenDatasetListIsValid() {
        // Given
        List<ChunkInfo> chunkInfoList = createTestChunkInfoList();
        when(repoService.hitTest(anyLong(), eq(testText), eq(testTopN), eq(false)))
                .thenReturn(chunkInfoList);

        // When
        List<String> result = knowledgeService.getChuncks(testMaasDatasetList, testText, testTopN, false);

        // Then
        assertNotNull(result);
        assertEquals(testMaasDatasetList.size() * chunkInfoList.size(), result.size());

        // Verify that all chunk contents are included
        for (ChunkInfo chunkInfo : chunkInfoList) {
            assertTrue(result.contains(chunkInfo.getContent()));
        }

        verify(repoService, times(testMaasDatasetList.size())).hitTest(anyLong(), eq(testText), eq(testTopN), eq(false));
    }

    @Test
    void getChuncks_ShouldReturnEmptyList_WhenMaasDatasetListIsNull() {
        // Given
        List<String> nullDatasetList = null;

        // When
        List<String> result = knowledgeService.getChuncks(nullDatasetList, testText, testTopN, false);

        // Then
        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(repoService, never()).hitTest(anyLong(), anyString(), anyInt(), anyBoolean());
    }

    @Test
    void getChuncks_ShouldReturnEmptyList_WhenMaasDatasetListIsEmpty() {
        // Given
        List<String> emptyDatasetList = Collections.emptyList();

        // When
        List<String> result = knowledgeService.getChuncks(emptyDatasetList, testText, testTopN, false);

        // Then
        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(repoService, never()).hitTest(anyLong(), anyString(), anyInt(), anyBoolean());
    }

    @Test
    void getChuncks_ShouldPassCorrectParametersToRepoService() {
        // Given
        String repoId = "12345";
        List<String> singleDatasetList = Collections.singletonList(repoId);
        boolean isBelongLoginUser = true;

        when(repoService.hitTest(anyLong(), anyString(), anyInt(), anyBoolean()))
                .thenReturn(createTestChunkInfoList());

        // When
        knowledgeService.getChuncks(singleDatasetList, testText, testTopN, isBelongLoginUser);

        // Then
        verify(repoService).hitTest(
                eq(Long.parseLong(repoId)),
                eq(testText),
                eq(testTopN),
                eq(isBelongLoginUser));
    }

    @Test
    void getChuncks_ShouldHandleMultipleRepositories() {
        // Given
        List<ChunkInfo> chunkInfoList = createTestChunkInfoList();
        when(repoService.hitTest(anyLong(), eq(testText), eq(testTopN), eq(false)))
                .thenReturn(chunkInfoList);

        // When
        List<String> result = knowledgeService.getChuncks(testMaasDatasetList, testText, testTopN, false);

        // Then
        assertNotNull(result);
        // Should have chunks from all repositories
        assertEquals(testMaasDatasetList.size() * chunkInfoList.size(), result.size());

        // Verify hitTest was called for each repository
        for (String repoId : testMaasDatasetList) {
            verify(repoService).hitTest(eq(Long.parseLong(repoId)), eq(testText), eq(testTopN), eq(false));
        }
    }

    @Test
    void getChuncks_ShouldHandleEmptyChunkResults() {
        // Given
        when(repoService.hitTest(anyLong(), eq(testText), eq(testTopN), eq(false)))
            .thenReturn(Collections.emptyList());

        // When
        List<String> result = knowledgeService.getChuncks(testMaasDatasetList, testText, testTopN, false);

        // Then
        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(repoService, times(testMaasDatasetList.size())).hitTest(anyLong(), eq(testText), eq(testTopN), eq(false));
    }

    @Test
    void getChuncks_ShouldHandleNumberFormatException() {
        // Given
        List<String> invalidDatasetList = Arrays.asList("invalid", "123");

        // When & Then
        assertThrows(NumberFormatException.class, () -> {
            knowledgeService.getChuncks(invalidDatasetList, testText, testTopN, false);
        });
    }

    private List<BotDatasetMaas> createTestDatasetList() {
        List<BotDatasetMaas> datasetList = new ArrayList<>();

        BotDatasetMaas dataset1 = new BotDatasetMaas();
        dataset1.setDatasetIndex("123");
        datasetList.add(dataset1);

        BotDatasetMaas dataset2 = new BotDatasetMaas();
        dataset2.setDatasetIndex("456");
        datasetList.add(dataset2);

        BotDatasetMaas dataset3 = new BotDatasetMaas();
        dataset3.setDatasetIndex("789");
        datasetList.add(dataset3);

        return datasetList;
    }

    private List<ChunkInfo> createTestChunkInfoList() {
        List<ChunkInfo> chunkInfoList = new ArrayList<>();

        ChunkInfo chunk1 = new ChunkInfo();
        chunk1.setContent("This is the first knowledge chunk about AI");
        chunkInfoList.add(chunk1);

        ChunkInfo chunk2 = new ChunkInfo();
        chunk2.setContent("This is the second knowledge chunk about machine learning");
        chunkInfoList.add(chunk2);

        return chunkInfoList;
    }
}
