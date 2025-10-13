package com.iflytek.astron.console.hub.data.impl;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.iflytek.astron.console.commons.entity.space.AgentShareRecord;
import com.iflytek.astron.console.commons.mapper.AgentShareRecordMapper;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ShareDataServiceImplTest {

    @Mock
    private AgentShareRecordMapper shareRecordMapper;

    @InjectMocks
    private ShareDataServiceImpl shareDataService;

    private static final String TEST_UID = "test-uid-123";
    private static final Long TEST_BASE_ID = 100L;
    private static final String TEST_SHARE_KEY = "share-key-abc123";
    private static final int TEST_SHARE_TYPE = 0;

    private AgentShareRecord testRecord;

    @BeforeAll
    static void initMybatisPlus() {
        MybatisConfiguration configuration = new MybatisConfiguration();
        MapperBuilderAssistant assistant = new MapperBuilderAssistant(configuration, "");

        TableInfoHelper.initTableInfo(assistant, AgentShareRecord.class);
    }

    @BeforeEach
    void setUp() {
        testRecord = new AgentShareRecord();
        testRecord.setId(1L);
        testRecord.setUid(TEST_UID);
        testRecord.setBaseId(TEST_BASE_ID);
        testRecord.setShareKey(TEST_SHARE_KEY);
        testRecord.setShareType(TEST_SHARE_TYPE);
        testRecord.setIsAct(1);
        testRecord.setCreateTime(LocalDateTime.now());
        testRecord.setUpdateTime(LocalDateTime.now());
    }

    // ========== findActiveShareRecord Method Tests ==========

    @Test
    void testFindActiveShareRecord_Success() {
        when(shareRecordMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(testRecord);

        AgentShareRecord result = shareDataService.findActiveShareRecord(TEST_UID, TEST_SHARE_TYPE, TEST_BASE_ID);

        assertNotNull(result);
        assertEquals(TEST_UID, result.getUid());
        assertEquals(TEST_SHARE_TYPE, result.getShareType());
        assertEquals(TEST_BASE_ID, result.getBaseId());
        assertEquals(1, result.getIsAct());
        verify(shareRecordMapper).selectOne(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindActiveShareRecord_NotFound_ReturnsNull() {
        when(shareRecordMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);

        AgentShareRecord result = shareDataService.findActiveShareRecord(TEST_UID, TEST_SHARE_TYPE, TEST_BASE_ID);

        assertNull(result);
        verify(shareRecordMapper).selectOne(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindActiveShareRecord_DifferentShareType() {
        int shareType = 1;
        AgentShareRecord record = new AgentShareRecord();
        record.setId(2L);
        record.setUid(TEST_UID);
        record.setBaseId(TEST_BASE_ID);
        record.setShareType(shareType);
        record.setIsAct(1);

        when(shareRecordMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(record);

        AgentShareRecord result = shareDataService.findActiveShareRecord(TEST_UID, shareType, TEST_BASE_ID);

        assertNotNull(result);
        assertEquals(shareType, result.getShareType());
        verify(shareRecordMapper).selectOne(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindActiveShareRecord_OnlyReturnsActiveRecords() {
        // The method should only find records where isAct = 1
        when(shareRecordMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(testRecord);

        AgentShareRecord result = shareDataService.findActiveShareRecord(TEST_UID, TEST_SHARE_TYPE, TEST_BASE_ID);

        assertNotNull(result);
        assertEquals(1, result.getIsAct());
        verify(shareRecordMapper).selectOne(any(LambdaQueryWrapper.class));
    }

    // ========== createShareRecord Method Tests ==========

    @Test
    void testCreateShareRecord_Success() {
        when(shareRecordMapper.insert(any(AgentShareRecord.class))).thenReturn(1);

        AgentShareRecord result = shareDataService.createShareRecord(TEST_UID, TEST_BASE_ID, TEST_SHARE_KEY, TEST_SHARE_TYPE);

        assertNotNull(result);
        assertEquals(TEST_UID, result.getUid());
        assertEquals(TEST_BASE_ID, result.getBaseId());
        assertEquals(TEST_SHARE_KEY, result.getShareKey());
        assertEquals(TEST_SHARE_TYPE, result.getShareType());
        assertEquals(1, result.getIsAct());
        verify(shareRecordMapper).insert(any(AgentShareRecord.class));
    }

    @Test
    void testCreateShareRecord_SetsIsActTo1() {
        when(shareRecordMapper.insert(any(AgentShareRecord.class))).thenReturn(1);

        AgentShareRecord result = shareDataService.createShareRecord(TEST_UID, TEST_BASE_ID, TEST_SHARE_KEY, TEST_SHARE_TYPE);

        assertEquals(1, result.getIsAct());
        verify(shareRecordMapper).insert(any(AgentShareRecord.class));
    }

    @Test
    void testCreateShareRecord_WithDifferentShareType() {
        int shareType = 1;
        when(shareRecordMapper.insert(any(AgentShareRecord.class))).thenReturn(1);

        AgentShareRecord result = shareDataService.createShareRecord(TEST_UID, TEST_BASE_ID, TEST_SHARE_KEY, shareType);

        assertNotNull(result);
        assertEquals(shareType, result.getShareType());
        verify(shareRecordMapper).insert(any(AgentShareRecord.class));
    }

    @Test
    void testCreateShareRecord_VerifyAllFieldsSet() {
        when(shareRecordMapper.insert(any(AgentShareRecord.class))).thenAnswer(invocation -> {
            AgentShareRecord record = invocation.getArgument(0);
            assertEquals(TEST_UID, record.getUid());
            assertEquals(TEST_BASE_ID, record.getBaseId());
            assertEquals(TEST_SHARE_KEY, record.getShareKey());
            assertEquals(TEST_SHARE_TYPE, record.getShareType());
            assertEquals(1, record.getIsAct());
            return 1;
        });

        shareDataService.createShareRecord(TEST_UID, TEST_BASE_ID, TEST_SHARE_KEY, TEST_SHARE_TYPE);

        verify(shareRecordMapper).insert(any(AgentShareRecord.class));
    }

    // ========== findByShareKey Method Tests ==========

    @Test
    void testFindByShareKey_Success() {
        when(shareRecordMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(testRecord);

        AgentShareRecord result = shareDataService.findByShareKey(TEST_SHARE_KEY);

        assertNotNull(result);
        assertEquals(TEST_SHARE_KEY, result.getShareKey());
        assertEquals(1, result.getIsAct());
        verify(shareRecordMapper).selectOne(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindByShareKey_NotFound_ReturnsNull() {
        String nonExistentKey = "non-existent-key";
        when(shareRecordMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);

        AgentShareRecord result = shareDataService.findByShareKey(nonExistentKey);

        assertNull(result);
        verify(shareRecordMapper).selectOne(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindByShareKey_OnlyReturnsActiveRecords() {
        // The method should only find records where isAct = 1
        when(shareRecordMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(testRecord);

        AgentShareRecord result = shareDataService.findByShareKey(TEST_SHARE_KEY);

        assertNotNull(result);
        assertEquals(1, result.getIsAct());
        verify(shareRecordMapper).selectOne(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindByShareKey_EmptyString() {
        String emptyKey = "";
        when(shareRecordMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);

        AgentShareRecord result = shareDataService.findByShareKey(emptyKey);

        assertNull(result);
        verify(shareRecordMapper).selectOne(any(LambdaQueryWrapper.class));
    }

    @Test
    void testFindByShareKey_NullKey() {
        when(shareRecordMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);

        AgentShareRecord result = shareDataService.findByShareKey(null);

        assertNull(result);
        verify(shareRecordMapper).selectOne(any(LambdaQueryWrapper.class));
    }

    // ========== Integration Scenario Tests ==========

    @Test
    void testCreateAndFindFlow_Success() {
        // First create a record
        when(shareRecordMapper.insert(any(AgentShareRecord.class))).thenReturn(1);
        AgentShareRecord created = shareDataService.createShareRecord(TEST_UID, TEST_BASE_ID, TEST_SHARE_KEY, TEST_SHARE_TYPE);

        // Then find it by share key
        when(shareRecordMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(created);
        AgentShareRecord found = shareDataService.findByShareKey(TEST_SHARE_KEY);

        assertNotNull(found);
        assertEquals(created.getShareKey(), found.getShareKey());
        assertEquals(created.getUid(), found.getUid());
    }

    @Test
    void testFindActiveShareRecord_WithAllParameters() {
        String uid = "user-1";
        int shareType = 0;
        Long baseId = 999L;

        AgentShareRecord record = new AgentShareRecord();
        record.setId(5L);
        record.setUid(uid);
        record.setShareType(shareType);
        record.setBaseId(baseId);
        record.setIsAct(1);

        when(shareRecordMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(record);

        AgentShareRecord result = shareDataService.findActiveShareRecord(uid, shareType, baseId);

        assertNotNull(result);
        assertEquals(uid, result.getUid());
        assertEquals(shareType, result.getShareType());
        assertEquals(baseId, result.getBaseId());
        verify(shareRecordMapper).selectOne(any(LambdaQueryWrapper.class));
    }
}
