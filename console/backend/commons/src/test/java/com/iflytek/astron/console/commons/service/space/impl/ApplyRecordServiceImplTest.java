package com.iflytek.astron.console.commons.service.space.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.iflytek.astron.console.commons.dto.space.ApplyRecordParam;
import com.iflytek.astron.console.commons.dto.space.ApplyRecordVO;
import com.iflytek.astron.console.commons.entity.space.ApplyRecord;
import com.iflytek.astron.console.commons.mapper.space.ApplyRecordMapper;
import com.iflytek.astron.console.commons.util.space.SpaceInfoUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for ApplyRecordServiceImpl
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ApplyRecordServiceImpl Test Cases")
class ApplyRecordServiceImplTest {

    @Mock
    private ApplyRecordMapper applyRecordMapper;

    @InjectMocks
    private ApplyRecordServiceImpl applyRecordService;

    private ApplyRecordParam applyRecordParam;
    private ApplyRecord applyRecord;
    private ApplyRecordVO applyRecordVO;
    private Page<ApplyRecordVO> mockVOPage;

    @BeforeEach
    void setUp() {
        // Set the baseMapper field using reflection
        ReflectionTestUtils.setField(applyRecordService, "baseMapper", applyRecordMapper);

        // Initialize test data
        applyRecordParam = new ApplyRecordParam();
        applyRecordParam.setPageNum(1);
        applyRecordParam.setPageSize(10);
        applyRecordParam.setNickname("testUser");
        applyRecordParam.setStatus(1);

        applyRecord = new ApplyRecord();
        applyRecord.setId(1L);
        applyRecord.setApplyUid("test-uid-123");
        applyRecord.setSpaceId(100L);
        applyRecord.setStatus(ApplyRecord.Status.APPLYING.getCode());

        applyRecordVO = new ApplyRecordVO();
        applyRecordVO.setId(1L);
        applyRecordVO.setApplyNickname("testUser");

        mockVOPage = new Page<>();
        mockVOPage.setRecords(java.util.Arrays.asList(applyRecordVO));
        mockVOPage.setTotal(1L);
        mockVOPage.setCurrent(1L);
        mockVOPage.setSize(10L);
    }

    @Test
    @DisplayName("Test page method with valid space ID")
    void testPage_WithValidSpaceId_ShouldReturnPagedResults() {
        // Given
        Long spaceId = 100L;

        try (MockedStatic<SpaceInfoUtil> mockedStatic = mockStatic(SpaceInfoUtil.class)) {
            mockedStatic.when(SpaceInfoUtil::getSpaceId).thenReturn(spaceId);
            when(applyRecordMapper.selectVOPageByParam(any(Page.class), eq(spaceId),
                    isNull(), eq("testUser"), eq(1))).thenReturn(mockVOPage);

            // When
            Page<ApplyRecordVO> result = applyRecordService.page(applyRecordParam);

            // Then
            assertNotNull(result);
            assertEquals(1L, result.getTotal());
            assertEquals(1, result.getRecords().size());
            assertEquals("testUser", result.getRecords().get(0).getApplyNickname());

            verify(applyRecordMapper).selectVOPageByParam(any(Page.class), eq(spaceId),
                    isNull(), eq("testUser"), eq(1));
        }
    }

    @Test
    @DisplayName("Test page method with null space ID should return empty page")
    void testPage_WithNullSpaceId_ShouldReturnEmptyPage() {
        // Given
        try (MockedStatic<SpaceInfoUtil> mockedStatic = mockStatic(SpaceInfoUtil.class)) {
            mockedStatic.when(SpaceInfoUtil::getSpaceId).thenReturn(null);

            // When
            Page<ApplyRecordVO> result = applyRecordService.page(applyRecordParam);

            // Then
            assertNotNull(result);
            assertEquals(1L, result.getCurrent());
            assertEquals(10L, result.getSize());
            assertTrue(result.getRecords().isEmpty());

            verifyNoInteractions(applyRecordMapper);
        }
    }

    @Test
    @DisplayName("Test page method with null nickname parameter")
    void testPage_WithNullNickname_ShouldCallMapperWithNullNickname() {
        // Given
        Long spaceId = 100L;
        applyRecordParam.setNickname(null);

        try (MockedStatic<SpaceInfoUtil> mockedStatic = mockStatic(SpaceInfoUtil.class)) {
            mockedStatic.when(SpaceInfoUtil::getSpaceId).thenReturn(spaceId);
            when(applyRecordMapper.selectVOPageByParam(any(Page.class), eq(spaceId),
                    isNull(), isNull(), eq(1))).thenReturn(mockVOPage);

            // When
            Page<ApplyRecordVO> result = applyRecordService.page(applyRecordParam);

            // Then
            assertNotNull(result);
            verify(applyRecordMapper).selectVOPageByParam(any(Page.class), eq(spaceId),
                    isNull(), isNull(), eq(1));
        }
    }

    @Test
    @DisplayName("Test getByUidAndSpaceId method should return correct record")
    void testGetByUidAndSpaceId_ShouldReturnCorrectRecord() {
        // Given
        String uid = "test-uid-123";
        Long spaceId = 100L;

        when(applyRecordMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(applyRecord);

        // When
        ApplyRecord result = applyRecordService.getByUidAndSpaceId(uid, spaceId);

        // Then
        assertNotNull(result);
        assertEquals(uid, result.getApplyUid());
        assertEquals(spaceId, result.getSpaceId());
        assertEquals(ApplyRecord.Status.APPLYING.getCode(), result.getStatus());

        verify(applyRecordMapper).selectOne(any(LambdaQueryWrapper.class));
    }

    @Test
    @DisplayName("Test getByUidAndSpaceId method with non-existing record should return null")
    void testGetByUidAndSpaceId_WithNonExistingRecord_ShouldReturnNull() {
        // Given
        String uid = "non-existing-uid";
        Long spaceId = 100L;

        when(applyRecordMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);

        // When
        ApplyRecord result = applyRecordService.getByUidAndSpaceId(uid, spaceId);

        // Then
        assertNull(result);
        verify(applyRecordMapper).selectOne(any(LambdaQueryWrapper.class));
    }

    @Test
    @DisplayName("Test getById method should return correct record")
    void testGetById_ShouldReturnCorrectRecord() {
        // Given
        Long id = 1L;

        when(applyRecordMapper.selectById(id)).thenReturn(applyRecord);

        // When
        ApplyRecord result = applyRecordService.getById(id);

        // Then
        assertNotNull(result);
        assertEquals(id, result.getId());
        verify(applyRecordMapper).selectById(id);
    }

    @Test
    @DisplayName("Test getById method with non-existing ID should return null")
    void testGetById_WithNonExistingId_ShouldReturnNull() {
        // Given
        Long id = 999L;

        when(applyRecordMapper.selectById(id)).thenReturn(null);

        // When
        ApplyRecord result = applyRecordService.getById(id);

        // Then
        assertNull(result);
        verify(applyRecordMapper).selectById(id);
    }

    @Test
    @DisplayName("Test updateById method should return true when update succeeds")
    void testUpdateById_WhenUpdateSucceeds_ShouldReturnTrue() {
        // Given
        applyRecord.setStatus(ApplyRecord.Status.APPROVED.getCode());

        when(applyRecordMapper.updateById(any(ApplyRecord.class))).thenReturn(1);

        // When
        boolean result = applyRecordService.updateById(applyRecord);

        // Then
        assertTrue(result);
        verify(applyRecordMapper).updateById(any(ApplyRecord.class));
    }

    @Test
    @DisplayName("Test updateById method should return false when update fails")
    void testUpdateById_WhenUpdateFails_ShouldReturnFalse() {
        // Given
        when(applyRecordMapper.updateById(any(ApplyRecord.class))).thenReturn(0);

        // When
        boolean result = applyRecordService.updateById(applyRecord);

        // Then
        assertFalse(result);
        verify(applyRecordMapper).updateById(any(ApplyRecord.class));
    }

    @Test
    @DisplayName("Test updateById method with null entity should handle gracefully")
    void testUpdateById_WithNullEntity_ShouldHandleGracefully() {
        // Given
        when(applyRecordMapper.updateById((ApplyRecord) null)).thenReturn(0);

        // When
        boolean result = applyRecordService.updateById(null);

        // Then
        assertFalse(result);
        verify(applyRecordMapper).updateById((ApplyRecord) null);
    }

    @Test
    @DisplayName("Test save method should return true when save succeeds")
    void testSave_WhenSaveSucceeds_ShouldReturnTrue() {
        // Given
        ApplyRecord newRecord = new ApplyRecord();
        newRecord.setApplyUid("new-uid-456");
        newRecord.setSpaceId(200L);
        newRecord.setStatus(ApplyRecord.Status.APPLYING.getCode());

        when(applyRecordMapper.insert(any(ApplyRecord.class))).thenReturn(1);

        // When
        boolean result = applyRecordService.save(newRecord);

        // Then
        assertTrue(result);
        verify(applyRecordMapper).insert(any(ApplyRecord.class));
    }

    @Test
    @DisplayName("Test save method should return false when save fails")
    void testSave_WhenSaveFails_ShouldReturnFalse() {
        // Given
        ApplyRecord newRecord = new ApplyRecord();

        when(applyRecordMapper.insert(any(ApplyRecord.class))).thenReturn(0);

        // When
        boolean result = applyRecordService.save(newRecord);

        // Then
        assertFalse(result);
        verify(applyRecordMapper).insert(any(ApplyRecord.class));
    }

    @Test
    @DisplayName("Test save method with null entity should handle gracefully")
    void testSave_WithNullEntity_ShouldHandleGracefully() {
        // Given
        when(applyRecordMapper.insert((ApplyRecord) null)).thenReturn(0);

        // When
        boolean result = applyRecordService.save(null);

        // Then
        assertFalse(result);
        verify(applyRecordMapper).insert((ApplyRecord) null);
    }

    @Test
    @DisplayName("Test page method with different page parameters")
    void testPage_WithDifferentPageParameters_ShouldSetCorrectPageInfo() {
        // Given
        Long spaceId = 100L;
        applyRecordParam.setPageNum(2);
        applyRecordParam.setPageSize(20);

        try (MockedStatic<SpaceInfoUtil> mockedStatic = mockStatic(SpaceInfoUtil.class)) {
            mockedStatic.when(SpaceInfoUtil::getSpaceId).thenReturn(spaceId);

            Page<ApplyRecordVO> expectedPage = new Page<>();
            expectedPage.setCurrent(2L);
            expectedPage.setSize(20L);

            when(applyRecordMapper.selectVOPageByParam(any(Page.class), eq(spaceId),
                    isNull(), eq("testUser"), eq(1))).thenReturn(expectedPage);

            // When
            Page<ApplyRecordVO> result = applyRecordService.page(applyRecordParam);

            // Then
            assertNotNull(result);
            assertEquals(2L, result.getCurrent());
            assertEquals(20L, result.getSize());
        }
    }
}
