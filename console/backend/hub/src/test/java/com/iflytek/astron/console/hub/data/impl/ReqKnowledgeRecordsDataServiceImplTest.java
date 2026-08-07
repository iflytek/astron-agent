package com.iflytek.astron.console.hub.data.impl;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.iflytek.astron.console.hub.entity.ReqKnowledgeRecords;
import com.iflytek.astron.console.hub.mapper.ReqKnowledgeRecordsMapper;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReqKnowledgeRecordsDataServiceImplTest {

    @Mock
    private ReqKnowledgeRecordsMapper reqKnowledgeRecordsMapper;

    @InjectMocks
    private ReqKnowledgeRecordsDataServiceImpl reqKnowledgeRecordsDataService;

    private static final String TEST_UID = "test-uid";
    private static final Long TEST_REQ_ID = 100L;
    private static final Long TEST_CHAT_ID = 1L;

    private ReqKnowledgeRecords testRecord;

    @BeforeAll
    static void initMybatisPlus() {
        MybatisConfiguration configuration = new MybatisConfiguration();
        MapperBuilderAssistant assistant = new MapperBuilderAssistant(configuration, "");

        TableInfoHelper.initTableInfo(assistant, ReqKnowledgeRecords.class);
    }

    @BeforeEach
    void setUp() {
        testRecord = ReqKnowledgeRecords.builder()
                .id(1L)
                .uid(TEST_UID)
                .reqId(TEST_REQ_ID)
                .reqMessage("What is the capital of France?")
                .knowledge("The capital of France is Paris")
                .chatId(TEST_CHAT_ID)
                .createTime(LocalDateTime.now())
                .updateTime(LocalDateTime.now())
                .build();
    }

    // ========== create Method Tests ==========

    @Test
    void testCreate_Success() {
        when(reqKnowledgeRecordsMapper.insert(any(ReqKnowledgeRecords.class))).thenReturn(1);

        ReqKnowledgeRecords result = reqKnowledgeRecordsDataService.create(testRecord);

        assertNotNull(result);
        assertEquals(TEST_UID, result.getUid());
        assertEquals(TEST_REQ_ID, result.getReqId());
        assertEquals("What is the capital of France?", result.getReqMessage());
        verify(reqKnowledgeRecordsMapper).insert(testRecord);
    }

    // ========== findByReqIds Method Tests ==========

    @Test
    void testFindByReqIds_Success_MultipleRecords() {
        Long reqId1 = 100L;
        Long reqId2 = 101L;
        Long reqId3 = 102L;
        List<Long> reqIds = Arrays.asList(reqId1, reqId2, reqId3);

        ReqKnowledgeRecords record1 = ReqKnowledgeRecords.builder()
                .id(1L)
                .reqId(reqId1)
                .knowledge("Knowledge 1")
                .build();

        ReqKnowledgeRecords record2 = ReqKnowledgeRecords.builder()
                .id(2L)
                .reqId(reqId2)
                .knowledge("Knowledge 2")
                .build();

        ReqKnowledgeRecords record3 = ReqKnowledgeRecords.builder()
                .id(3L)
                .reqId(reqId3)
                .knowledge("Knowledge 3")
                .build();

        List<ReqKnowledgeRecords> mockRecords = Arrays.asList(record1, record2, record3);
        when(reqKnowledgeRecordsMapper.selectList(any(QueryWrapper.class))).thenReturn(mockRecords);

        Map<Long, ReqKnowledgeRecords> result = reqKnowledgeRecordsDataService.findByReqIds(reqIds);

        assertNotNull(result);
        assertEquals(3, result.size());
        assertEquals("Knowledge 1", result.get(reqId1).getKnowledge());
        assertEquals("Knowledge 2", result.get(reqId2).getKnowledge());
        assertEquals("Knowledge 3", result.get(reqId3).getKnowledge());
        verify(reqKnowledgeRecordsMapper).selectList(any(QueryWrapper.class));
    }

    @Test
    void testFindByReqIds_Success_SingleRecord() {
        Long reqId = 100L;
        List<Long> reqIds = Collections.singletonList(reqId);

        ReqKnowledgeRecords record = ReqKnowledgeRecords.builder()
                .id(1L)
                .reqId(reqId)
                .knowledge("Knowledge 1")
                .build();

        when(reqKnowledgeRecordsMapper.selectList(any(QueryWrapper.class)))
                .thenReturn(Collections.singletonList(record));

        Map<Long, ReqKnowledgeRecords> result = reqKnowledgeRecordsDataService.findByReqIds(reqIds);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("Knowledge 1", result.get(reqId).getKnowledge());
        verify(reqKnowledgeRecordsMapper).selectList(any(QueryWrapper.class));
    }

    @Test
    void testFindByReqIds_EmptyList_ReturnsEmptyMap() {
        List<Long> emptyReqIds = Collections.emptyList();

        Map<Long, ReqKnowledgeRecords> result = reqKnowledgeRecordsDataService.findByReqIds(emptyReqIds);

        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(reqKnowledgeRecordsMapper, never()).selectList(any(QueryWrapper.class));
    }

    @Test
    void testFindByReqIds_NullList_ReturnsEmptyMap() {
        Map<Long, ReqKnowledgeRecords> result = reqKnowledgeRecordsDataService.findByReqIds(null);

        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(reqKnowledgeRecordsMapper, never()).selectList(any(QueryWrapper.class));
    }

    @Test
    void testFindByReqIds_NoRecordsFound_ReturnsEmptyMap() {
        List<Long> reqIds = Arrays.asList(100L, 101L);
        when(reqKnowledgeRecordsMapper.selectList(any(QueryWrapper.class)))
                .thenReturn(Collections.emptyList());

        Map<Long, ReqKnowledgeRecords> result = reqKnowledgeRecordsDataService.findByReqIds(reqIds);

        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(reqKnowledgeRecordsMapper).selectList(any(QueryWrapper.class));
    }

    @Test
    void testFindByReqIds_PartialMatch() {
        Long reqId1 = 100L;
        Long reqId2 = 101L;
        Long reqId3 = 102L;
        List<Long> reqIds = Arrays.asList(reqId1, reqId2, reqId3);

        // Only return records for reqId1 and reqId2, not reqId3
        ReqKnowledgeRecords record1 = ReqKnowledgeRecords.builder()
                .id(1L)
                .reqId(reqId1)
                .knowledge("Knowledge 1")
                .build();

        ReqKnowledgeRecords record2 = ReqKnowledgeRecords.builder()
                .id(2L)
                .reqId(reqId2)
                .knowledge("Knowledge 2")
                .build();

        List<ReqKnowledgeRecords> mockRecords = Arrays.asList(record1, record2);
        when(reqKnowledgeRecordsMapper.selectList(any(QueryWrapper.class))).thenReturn(mockRecords);

        Map<Long, ReqKnowledgeRecords> result = reqKnowledgeRecordsDataService.findByReqIds(reqIds);

        assertNotNull(result);
        assertEquals(2, result.size());
        assertTrue(result.containsKey(reqId1));
        assertTrue(result.containsKey(reqId2));
        assertFalse(result.containsKey(reqId3));
        verify(reqKnowledgeRecordsMapper).selectList(any(QueryWrapper.class));
    }

    @Test
    void testFindByReqIds_DuplicateReqIds_LastOneWins() {
        Long reqId = 100L;
        List<Long> reqIds = Collections.singletonList(reqId);

        // Simulate two records with the same reqId (shouldn't happen in practice, but testing the behavior)
        ReqKnowledgeRecords record1 = ReqKnowledgeRecords.builder()
                .id(1L)
                .reqId(reqId)
                .knowledge("Knowledge 1")
                .build();

        ReqKnowledgeRecords record2 = ReqKnowledgeRecords.builder()
                .id(2L)
                .reqId(reqId)
                .knowledge("Knowledge 2")
                .build();

        List<ReqKnowledgeRecords> mockRecords = Arrays.asList(record1, record2);
        when(reqKnowledgeRecordsMapper.selectList(any(QueryWrapper.class))).thenReturn(mockRecords);

        Map<Long, ReqKnowledgeRecords> result = reqKnowledgeRecordsDataService.findByReqIds(reqIds);

        assertNotNull(result);
        assertEquals(1, result.size());
        // The last record should overwrite the first one
        assertEquals("Knowledge 2", result.get(reqId).getKnowledge());
        assertEquals(2L, result.get(reqId).getId());
        verify(reqKnowledgeRecordsMapper).selectList(any(QueryWrapper.class));
    }
}
