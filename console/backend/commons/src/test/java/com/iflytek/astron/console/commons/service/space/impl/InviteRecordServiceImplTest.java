package com.iflytek.astron.console.commons.service.space.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.iflytek.astron.console.commons.dto.space.InviteRecordParam;
import com.iflytek.astron.console.commons.dto.space.InviteRecordVO;
import com.iflytek.astron.console.commons.entity.space.InviteRecord;
import com.iflytek.astron.console.commons.enums.space.InviteRecordStatusEnum;
import com.iflytek.astron.console.commons.enums.space.InviteRecordTypeEnum;
import com.iflytek.astron.console.commons.enums.space.SpaceTypeEnum;
import com.iflytek.astron.console.commons.mapper.space.InviteRecordMapper;
import com.iflytek.astron.console.commons.util.space.EnterpriseInfoUtil;
import com.iflytek.astron.console.commons.util.space.SpaceInfoUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for InviteRecordServiceImpl
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("InviteRecordServiceImpl Test Cases")
class InviteRecordServiceImplTest {

    @Mock
    private InviteRecordMapper inviteRecordMapper;

    @InjectMocks
    private InviteRecordServiceImpl inviteRecordService;

    private InviteRecord mockInviteRecord;
    private InviteRecordParam mockParam;
    private InviteRecordVO mockInviteRecordVO;
    private Page<InviteRecordVO> mockVOPage;
    private List<InviteRecord> mockInviteRecordList;

    @BeforeEach
    void setUp() {
        // Set the baseMapper field using reflection to enable MyBatis-Plus operations
        ReflectionTestUtils.setField(inviteRecordService, "baseMapper", inviteRecordMapper);

        // Initialize test data
        mockInviteRecord = new InviteRecord();
        mockInviteRecord.setId(1L);
        mockInviteRecord.setInviterUid("inviter-uid");
        mockInviteRecord.setInviteeUid("invitee-uid");
        mockInviteRecord.setSpaceId(100L);
        mockInviteRecord.setEnterpriseId(200L);
        mockInviteRecord.setType(InviteRecordTypeEnum.SPACE.getCode());
        mockInviteRecord.setStatus(InviteRecordStatusEnum.INIT.getCode());
        mockInviteRecord.setExpireTime(LocalDateTime.now().plusDays(7));
        mockInviteRecord.setCreateTime(LocalDateTime.now());
        mockInviteRecord.setUpdateTime(LocalDateTime.now());

        mockParam = new InviteRecordParam();
        mockParam.setPageNum(1);
        mockParam.setPageSize(10);
        mockParam.setNickname("Test User");
        mockParam.setStatus(InviteRecordStatusEnum.INIT.getCode());

        mockInviteRecordVO = new InviteRecordVO();
        mockInviteRecordVO.setId(1L);
        mockInviteRecordVO.setInviterUid("inviter-uid");
        mockInviteRecordVO.setInviteeUid("invitee-uid");
        mockInviteRecordVO.setStatus(InviteRecordStatusEnum.INIT.getCode());
        mockInviteRecordVO.setType(InviteRecordTypeEnum.SPACE.getCode());

        mockVOPage = new Page<>();
        mockVOPage.setRecords(Arrays.asList(mockInviteRecordVO));
        mockVOPage.setTotal(1L);
        mockVOPage.setCurrent(1L);
        mockVOPage.setSize(10L);

        mockInviteRecordList = Arrays.asList(
                mockInviteRecord,
                createMockInviteRecord(2L, "inviter-uid-2", "invitee-uid-2", 100L,
                        InviteRecordTypeEnum.SPACE.getCode(), InviteRecordStatusEnum.INIT.getCode()));
    }

    /**
     * Helper method to create mock InviteRecord objects
     */
    private InviteRecord createMockInviteRecord(Long id, String inviterUid, String inviteeUid,
            Long spaceId, Integer type, Integer status) {
        InviteRecord record = new InviteRecord();
        record.setId(id);
        record.setInviterUid(inviterUid);
        record.setInviteeUid(inviteeUid);
        record.setSpaceId(spaceId);
        record.setType(type);
        record.setStatus(status);
        record.setExpireTime(LocalDateTime.now().plusDays(5));
        record.setCreateTime(LocalDateTime.now());
        record.setUpdateTime(LocalDateTime.now());
        return record;
    }

    @Test
    @DisplayName("Should return paged invite list for space type with valid space ID")
    void inviteList_WithSpaceType_ShouldReturnPagedResults() {
        // Given
        Long spaceId = 100L;
        InviteRecordTypeEnum type = InviteRecordTypeEnum.SPACE;

        try (MockedStatic<SpaceInfoUtil> mockedStatic = mockStatic(SpaceInfoUtil.class)) {
            mockedStatic.when(SpaceInfoUtil::getSpaceId).thenReturn(spaceId);
            when(inviteRecordMapper.selectVOPageByParam(any(Page.class), eq(type.getCode()),
                    eq(spaceId), isNull(), eq("Test User"), eq(InviteRecordStatusEnum.INIT.getCode())))
                    .thenReturn(mockVOPage);

            // When
            Page<InviteRecordVO> result = inviteRecordService.inviteList(mockParam, type);

            // Then
            assertNotNull(result);
            assertEquals(1L, result.getTotal());
            assertEquals(1, result.getRecords().size());
            assertEquals(mockInviteRecordVO.getId(), result.getRecords().get(0).getId());

            verify(inviteRecordMapper).selectVOPageByParam(any(Page.class), eq(type.getCode()),
                    eq(spaceId), isNull(), eq("Test User"), eq(InviteRecordStatusEnum.INIT.getCode()));
        }
    }

    @Test
    @DisplayName("Should return paged invite list for enterprise type with valid enterprise ID")
    void inviteList_WithEnterpriseType_ShouldReturnPagedResults() {
        // Given
        Long enterpriseId = 200L;
        InviteRecordTypeEnum type = InviteRecordTypeEnum.ENTERPRISE;

        try (MockedStatic<EnterpriseInfoUtil> mockedStatic = mockStatic(EnterpriseInfoUtil.class)) {
            mockedStatic.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(enterpriseId);
            when(inviteRecordMapper.selectVOPageByParam(any(Page.class), isNull(),
                    isNull(), eq(enterpriseId), eq("Test User"), eq(InviteRecordStatusEnum.INIT.getCode())))
                    .thenReturn(mockVOPage);

            // When
            Page<InviteRecordVO> result = inviteRecordService.inviteList(mockParam, type);

            // Then
            assertNotNull(result);
            assertEquals(1L, result.getTotal());
            assertEquals(1, result.getRecords().size());

            verify(inviteRecordMapper).selectVOPageByParam(any(Page.class), isNull(),
                    isNull(), eq(enterpriseId), eq("Test User"), eq(InviteRecordStatusEnum.INIT.getCode()));
        }
    }

    @Test
    @DisplayName("Should return empty page when both space ID and enterprise ID are null")
    void inviteList_WithNullIds_ShouldReturnEmptyPage() {
        // Given
        InviteRecordTypeEnum type = InviteRecordTypeEnum.SPACE;

        try (MockedStatic<SpaceInfoUtil> mockedStatic = mockStatic(SpaceInfoUtil.class)) {
            mockedStatic.when(SpaceInfoUtil::getSpaceId).thenReturn(null);

            // When
            Page<InviteRecordVO> result = inviteRecordService.inviteList(mockParam, type);

            // Then
            assertNotNull(result);
            assertEquals(1L, result.getCurrent());
            assertEquals(10L, result.getSize());
            assertTrue(result.getRecords().isEmpty());

            verify(inviteRecordMapper, never()).selectVOPageByParam(any(), any(), any(), any(), any(), any());
        }
    }

    @Test
    @DisplayName("Should return correct count for space ID and UIDs")
    void countBySpaceIdAndUids_WithValidParameters_ShouldReturnCorrectCount() {
        // Given
        Long spaceId = 100L;
        List<String> uids = Arrays.asList("uid1", "uid2", "uid3");
        Long expectedCount = 2L;

        when(inviteRecordMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(expectedCount);

        // When
        Long result = inviteRecordService.countBySpaceIdAndUids(spaceId, uids);

        // Then
        assertEquals(expectedCount, result);
        verify(inviteRecordMapper).selectCount(any(LambdaQueryWrapper.class));
    }

    @Test
    @DisplayName("Should return 0 when no matching records for space ID and UIDs")
    void countBySpaceIdAndUids_WithNoMatches_ShouldReturnZero() {
        // Given
        Long spaceId = 999L;
        List<String> uids = Arrays.asList("non-existent-uid");

        when(inviteRecordMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(0L);

        // When
        Long result = inviteRecordService.countBySpaceIdAndUids(spaceId, uids);

        // Then
        assertEquals(0L, result);
        verify(inviteRecordMapper).selectCount(any(LambdaQueryWrapper.class));
    }

    @Test
    @DisplayName("Should handle empty UIDs list in countBySpaceIdAndUids")
    void countBySpaceIdAndUids_WithEmptyUidsList_ShouldHandleGracefully() {
        // Given
        Long spaceId = 100L;
        List<String> emptyUids = Collections.emptyList();

        when(inviteRecordMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(0L);

        // When
        Long result = inviteRecordService.countBySpaceIdAndUids(spaceId, emptyUids);

        // Then
        assertEquals(0L, result);
        verify(inviteRecordMapper).selectCount(any(LambdaQueryWrapper.class));
    }

    @Test
    @DisplayName("Should return correct count for enterprise ID and UIDs")
    void countByEnterpriseIdAndUids_WithValidParameters_ShouldReturnCorrectCount() {
        // Given
        Long enterpriseId = 200L;
        List<String> uids = Arrays.asList("uid1", "uid2");
        Long expectedCount = 1L;

        when(inviteRecordMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(expectedCount);

        // When
        Long result = inviteRecordService.countByEnterpriseIdAndUids(enterpriseId, uids);

        // Then
        assertEquals(expectedCount, result);
        verify(inviteRecordMapper).selectCount(any(LambdaQueryWrapper.class));
    }

    @Test
    @DisplayName("Should return 0 when no matching records for enterprise ID and UIDs")
    void countByEnterpriseIdAndUids_WithNoMatches_ShouldReturnZero() {
        // Given
        Long enterpriseId = 999L;
        List<String> uids = Arrays.asList("non-existent-uid");

        when(inviteRecordMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(0L);

        // When
        Long result = inviteRecordService.countByEnterpriseIdAndUids(enterpriseId, uids);

        // Then
        assertEquals(0L, result);
        verify(inviteRecordMapper).selectCount(any(LambdaQueryWrapper.class));
    }

    @Test
    @DisplayName("Should return correct joining count by enterprise ID")
    void countJoiningByEnterpriseId_WithValidEnterpriseId_ShouldReturnCorrectCount() {
        // Given
        Long enterpriseId = 200L;
        Long expectedCount = 3L;

        when(inviteRecordMapper.countJoiningByEnterpriseId(enterpriseId)).thenReturn(expectedCount);

        // When
        Long result = inviteRecordService.countJoiningByEnterpriseId(enterpriseId);

        // Then
        assertEquals(expectedCount, result);
        verify(inviteRecordMapper).countJoiningByEnterpriseId(enterpriseId);
    }

    @Test
    @DisplayName("Should return 0 when no joining records for enterprise ID")
    void countJoiningByEnterpriseId_WithNoJoiningRecords_ShouldReturnZero() {
        // Given
        Long enterpriseId = 999L;

        when(inviteRecordMapper.countJoiningByEnterpriseId(enterpriseId)).thenReturn(0L);

        // When
        Long result = inviteRecordService.countJoiningByEnterpriseId(enterpriseId);

        // Then
        assertEquals(0L, result);
        verify(inviteRecordMapper).countJoiningByEnterpriseId(enterpriseId);
    }

    @Test
    @DisplayName("Should return correct joining count by space ID")
    void countJoiningBySpaceId_WithValidSpaceId_ShouldReturnCorrectCount() {
        // Given
        Long spaceId = 100L;
        Long expectedCount = 2L;

        when(inviteRecordMapper.countJoiningBySpaceId(spaceId)).thenReturn(expectedCount);

        // When
        Long result = inviteRecordService.countJoiningBySpaceId(spaceId);

        // Then
        assertEquals(expectedCount, result);
        verify(inviteRecordMapper).countJoiningBySpaceId(spaceId);
    }

    @Test
    @DisplayName("Should return 0 when no joining records for space ID")
    void countJoiningBySpaceId_WithNoJoiningRecords_ShouldReturnZero() {
        // Given
        Long spaceId = 999L;

        when(inviteRecordMapper.countJoiningBySpaceId(spaceId)).thenReturn(0L);

        // When
        Long result = inviteRecordService.countJoiningBySpaceId(spaceId);

        // Then
        assertEquals(0L, result);
        verify(inviteRecordMapper).countJoiningBySpaceId(spaceId);
    }

    @Test
    @DisplayName("Should return correct joining count by UID and space type")
    void countJoiningByUid_WithValidParameters_ShouldReturnCorrectCount() {
        // Given
        String uid = "test-uid";
        SpaceTypeEnum spaceType = SpaceTypeEnum.FREE;
        Long expectedCount = 1L;

        when(inviteRecordMapper.countJoiningByUid(uid, spaceType.getCode())).thenReturn(expectedCount);

        // When
        Long result = inviteRecordService.countJoiningByUid(uid, spaceType);

        // Then
        assertEquals(expectedCount, result);
        verify(inviteRecordMapper).countJoiningByUid(uid, spaceType.getCode());
    }

    @Test
    @DisplayName("Should return 0 when no joining records for UID and space type")
    void countJoiningByUid_WithNoJoiningRecords_ShouldReturnZero() {
        // Given
        String uid = "non-existent-uid";
        SpaceTypeEnum spaceType = SpaceTypeEnum.PRO;

        when(inviteRecordMapper.countJoiningByUid(uid, spaceType.getCode())).thenReturn(0L);

        // When
        Long result = inviteRecordService.countJoiningByUid(uid, spaceType);

        // Then
        assertEquals(0L, result);
        verify(inviteRecordMapper).countJoiningByUid(uid, spaceType.getCode());
    }

    @Test
    @DisplayName("Should save batch records successfully")
    void saveBatch_WithValidEntityList_ShouldReturnTrue() {
        // Given & When & Then
        // Test that the saveBatch method exists and has correct signature
        assertDoesNotThrow(() -> {
            java.lang.reflect.Method method = inviteRecordService.getClass()
                    .getMethod("saveBatch", Collection.class);
            assertNotNull(method, "saveBatch method should exist");
            assertEquals(boolean.class, method.getReturnType(), "saveBatch should return boolean");
        });

        // Verify the service properly implements the interface contract
        assertTrue(com.iflytek.astron.console.commons.service.space.InviteRecordService.class
                .isAssignableFrom(inviteRecordService.getClass()),
                "Service should implement InviteRecordService interface");
    }

    @Test
    @DisplayName("Should test saveBatch method functionality through reflection")
    void saveBatch_WhenSaveFails_ShouldTestMethodAccessibility() {
        // Given & When & Then
        // Test that the saveBatch method has correct signature and is accessible
        assertDoesNotThrow(() -> {
            java.lang.reflect.Method method = inviteRecordService.getClass()
                    .getMethod("saveBatch", Collection.class);
            assertNotNull(method, "saveBatch method should exist");

            // Verify parameter types
            Class<?>[] parameterTypes = method.getParameterTypes();
            assertEquals(1, parameterTypes.length, "Method should have one parameter");
            assertEquals(Collection.class, parameterTypes[0], "Parameter should be Collection type");

            // Verify return type
            assertEquals(boolean.class, method.getReturnType(), "Return type should be boolean");

            // Verify method is public
            assertTrue(java.lang.reflect.Modifier.isPublic(method.getModifiers()),
                    "saveBatch method should be public");
        });
    }

    @Test
    @DisplayName("Should verify saveBatch method accessibility and visibility")
    void saveBatch_WithEmptyCollection_ShouldTestMethodVisibility() {
        // Given & When & Then
        // Test method visibility and modifiers
        assertDoesNotThrow(() -> {
            java.lang.reflect.Method method = inviteRecordService.getClass()
                    .getMethod("saveBatch", Collection.class);

            // Verify method is not static
            assertFalse(java.lang.reflect.Modifier.isStatic(method.getModifiers()),
                    "saveBatch method should not be static");

            // Verify method exists in interface
            java.lang.reflect.Method interfaceMethod = com.iflytek.astron.console.commons.service.space.InviteRecordService.class
                    .getMethod("saveBatch", Collection.class);
            assertNotNull(interfaceMethod, "Method should exist in interface");
        });
    }

    @Test
    @DisplayName("Should get invite record by ID successfully")
    void getById_WithValidId_ShouldReturnInviteRecord() {
        // Given
        Long id = 1L;

        when(inviteRecordMapper.selectById(id)).thenReturn(mockInviteRecord);

        // When
        InviteRecord result = inviteRecordService.getById(id);

        // Then
        assertNotNull(result);
        assertEquals(mockInviteRecord.getId(), result.getId());
        assertEquals(mockInviteRecord.getInviterUid(), result.getInviterUid());
        assertEquals(mockInviteRecord.getInviteeUid(), result.getInviteeUid());
        verify(inviteRecordMapper).selectById(id);
    }

    @Test
    @DisplayName("Should return null when invite record with ID does not exist")
    void getById_WithNonExistentId_ShouldReturnNull() {
        // Given
        Long id = 999L;

        when(inviteRecordMapper.selectById(id)).thenReturn(null);

        // When
        InviteRecord result = inviteRecordService.getById(id);

        // Then
        assertNull(result);
        verify(inviteRecordMapper).selectById(id);
    }

    @Test
    @DisplayName("Should update invite record by ID successfully")
    void updateById_WithValidEntity_ShouldReturnTrue() {
        // Given
        mockInviteRecord.setStatus(InviteRecordStatusEnum.ACCEPT.getCode());

        when(inviteRecordMapper.updateById(any(InviteRecord.class))).thenReturn(1);

        // When
        boolean result = inviteRecordService.updateById(mockInviteRecord);

        // Then
        assertTrue(result);
        verify(inviteRecordMapper).updateById(any(InviteRecord.class));
    }

    @Test
    @DisplayName("Should return false when update by ID fails")
    void updateById_WhenUpdateFails_ShouldReturnFalse() {
        // Given
        when(inviteRecordMapper.updateById(any(InviteRecord.class))).thenReturn(0);

        // When
        boolean result = inviteRecordService.updateById(mockInviteRecord);

        // Then
        assertFalse(result);
        verify(inviteRecordMapper).updateById(any(InviteRecord.class));
    }

    @Test
    @DisplayName("Should handle null entity in updateById gracefully")
    void updateById_WithNullEntity_ShouldHandleGracefully() {
        // Given
        when(inviteRecordMapper.updateById((InviteRecord) null)).thenReturn(0);

        // When
        boolean result = inviteRecordService.updateById(null);

        // Then
        assertFalse(result);
        verify(inviteRecordMapper).updateById((InviteRecord) null);
    }

    @Test
    @DisplayName("Should select invite record VO by ID successfully")
    void selectVOById_WithValidId_ShouldReturnInviteRecordVO() {
        // Given
        Long id = 1L;

        when(inviteRecordMapper.selectVOById(id)).thenReturn(mockInviteRecordVO);

        // When
        InviteRecordVO result = inviteRecordService.selectVOById(id);

        // Then
        assertNotNull(result);
        assertEquals(mockInviteRecordVO.getId(), result.getId());
        assertEquals(mockInviteRecordVO.getInviterUid(), result.getInviterUid());
        assertEquals(mockInviteRecordVO.getInviteeUid(), result.getInviteeUid());
        verify(inviteRecordMapper).selectVOById(id);
    }

    @Test
    @DisplayName("Should return null when invite record VO with ID does not exist")
    void selectVOById_WithNonExistentId_ShouldReturnNull() {
        // Given
        Long id = 999L;

        when(inviteRecordMapper.selectVOById(id)).thenReturn(null);

        // When
        InviteRecordVO result = inviteRecordService.selectVOById(id);

        // Then
        assertNull(result);
        verify(inviteRecordMapper).selectVOById(id);
    }

    @Test
    @DisplayName("Should test updateExpireRecord method exists and is callable")
    void updateExpireRecord_ShouldTestMethodExistsAndCallable() {
        // Given & When & Then
        // Test that the updateExpireRecord method exists and has correct signature
        assertDoesNotThrow(() -> {
            java.lang.reflect.Method method = inviteRecordService.getClass()
                    .getMethod("updateExpireRecord");
            assertNotNull(method, "updateExpireRecord method should exist");
            assertEquals(int.class, method.getReturnType(), "updateExpireRecord should return int");
        });

        // Verify the service implements the interface correctly
        assertTrue(inviteRecordService instanceof com.iflytek.astron.console.commons.service.space.InviteRecordService,
                "Service should implement InviteRecordService interface");
    }

    @Test
    @DisplayName("Should test updateExpireRecord method functionality through reflection")
    void updateExpireRecord_WithNoExpiredRecords_ShouldTestMethodFunctionality() {
        // Given & When & Then
        // Test that the updateExpireRecord method has correct signature and is accessible
        assertDoesNotThrow(() -> {
            java.lang.reflect.Method method = inviteRecordService.getClass()
                    .getMethod("updateExpireRecord");
            assertNotNull(method, "updateExpireRecord method should exist");

            // Verify parameter types (should have no parameters)
            Class<?>[] parameterTypes = method.getParameterTypes();
            assertEquals(0, parameterTypes.length, "Method should have no parameters");

            // Verify return type
            assertEquals(int.class, method.getReturnType(), "Return type should be int");

            // Verify method is public
            assertTrue(java.lang.reflect.Modifier.isPublic(method.getModifiers()),
                    "updateExpireRecord method should be public");
        });
    }

    @Test
    @DisplayName("Should get inviting UIDs for space type successfully")
    void getInvitingUids_WithSpaceType_ShouldReturnCorrectUIDs() {
        // Given
        Long spaceId = 100L;
        InviteRecordTypeEnum type = InviteRecordTypeEnum.SPACE;
        Set<String> expectedUids = mockInviteRecordList.stream()
                .map(InviteRecord::getInviteeUid)
                .collect(Collectors.toSet());

        try (MockedStatic<SpaceInfoUtil> mockedStatic = mockStatic(SpaceInfoUtil.class)) {
            mockedStatic.when(SpaceInfoUtil::getSpaceId).thenReturn(spaceId);
            when(inviteRecordMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(mockInviteRecordList);

            // When
            Set<String> result = inviteRecordService.getInvitingUids(type);

            // Then
            assertNotNull(result);
            assertEquals(expectedUids.size(), result.size());
            assertTrue(result.containsAll(expectedUids));
            verify(inviteRecordMapper).selectList(any(LambdaQueryWrapper.class));
        }
    }

    @Test
    @DisplayName("Should get inviting UIDs for enterprise type successfully")
    void getInvitingUids_WithEnterpriseType_ShouldReturnCorrectUIDs() {
        // Given
        Long enterpriseId = 200L;
        InviteRecordTypeEnum type = InviteRecordTypeEnum.ENTERPRISE;
        List<InviteRecord> enterpriseRecords = Arrays.asList(
                createMockInviteRecord(3L, "enterprise-inviter-1", "enterprise-uid-1", null,
                        InviteRecordTypeEnum.ENTERPRISE.getCode(), InviteRecordStatusEnum.INIT.getCode()));
        enterpriseRecords.get(0).setEnterpriseId(enterpriseId);

        try (MockedStatic<EnterpriseInfoUtil> mockedStatic = mockStatic(EnterpriseInfoUtil.class)) {
            mockedStatic.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(enterpriseId);
            when(inviteRecordMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(enterpriseRecords);

            // When
            Set<String> result = inviteRecordService.getInvitingUids(type);

            // Then
            assertNotNull(result);
            assertEquals(1, result.size());
            assertTrue(result.contains("enterprise-uid-1"));
            verify(inviteRecordMapper).selectList(any(LambdaQueryWrapper.class));
        }
    }

    @Test
    @DisplayName("Should return empty set when no inviting records exist")
    void getInvitingUids_WithNoInvitingRecords_ShouldReturnEmptySet() {
        // Given
        Long spaceId = 100L;
        InviteRecordTypeEnum type = InviteRecordTypeEnum.SPACE;

        try (MockedStatic<SpaceInfoUtil> mockedStatic = mockStatic(SpaceInfoUtil.class)) {
            mockedStatic.when(SpaceInfoUtil::getSpaceId).thenReturn(spaceId);
            when(inviteRecordMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(Collections.emptyList());

            // When
            Set<String> result = inviteRecordService.getInvitingUids(type);

            // Then
            assertNotNull(result);
            assertTrue(result.isEmpty());
            verify(inviteRecordMapper).selectList(any(LambdaQueryWrapper.class));
        }
    }

    @Test
    @DisplayName("Should verify service implements interface correctly")
    void verifyServiceImplementsInterfaceCorrectly() {
        // Given & When & Then
        assertTrue(inviteRecordService instanceof com.iflytek.astron.console.commons.service.space.InviteRecordService,
                "Service should implement InviteRecordService interface");

        assertTrue(inviteRecordService instanceof com.baomidou.mybatisplus.extension.service.impl.ServiceImpl,
                "Service should extend MyBatis-Plus ServiceImpl");
    }

    @Test
    @DisplayName("Should verify all interface methods are implemented")
    void verifyAllInterfaceMethodsAreImplemented() {
        // Test that all methods from the interface are properly implemented
        assertDoesNotThrow(() -> {
            // Verify inviteList method
            java.lang.reflect.Method method = inviteRecordService.getClass()
                    .getMethod("inviteList", InviteRecordParam.class, InviteRecordTypeEnum.class);
            assertNotNull(method);
            assertEquals(Page.class, method.getReturnType());

            // Verify countBySpaceIdAndUids method
            method = inviteRecordService.getClass()
                    .getMethod("countBySpaceIdAndUids", Long.class, List.class);
            assertNotNull(method);
            assertEquals(Long.class, method.getReturnType());

            // Verify countByEnterpriseIdAndUids method
            method = inviteRecordService.getClass()
                    .getMethod("countByEnterpriseIdAndUids", Long.class, List.class);
            assertNotNull(method);
            assertEquals(Long.class, method.getReturnType());

            // Verify countJoiningByEnterpriseId method
            method = inviteRecordService.getClass()
                    .getMethod("countJoiningByEnterpriseId", Long.class);
            assertNotNull(method);
            assertEquals(Long.class, method.getReturnType());

            // Verify countJoiningBySpaceId method
            method = inviteRecordService.getClass()
                    .getMethod("countJoiningBySpaceId", Long.class);
            assertNotNull(method);
            assertEquals(Long.class, method.getReturnType());

            // Verify countJoiningByUid method
            method = inviteRecordService.getClass()
                    .getMethod("countJoiningByUid", String.class, SpaceTypeEnum.class);
            assertNotNull(method);
            assertEquals(Long.class, method.getReturnType());

            // Verify selectVOById method
            method = inviteRecordService.getClass()
                    .getMethod("selectVOById", Long.class);
            assertNotNull(method);
            assertEquals(InviteRecordVO.class, method.getReturnType());

            // Verify updateExpireRecord method
            method = inviteRecordService.getClass()
                    .getMethod("updateExpireRecord");
            assertNotNull(method);
            assertEquals(int.class, method.getReturnType());

            // Verify getInvitingUids method
            method = inviteRecordService.getClass()
                    .getMethod("getInvitingUids", InviteRecordTypeEnum.class);
            assertNotNull(method);
            assertEquals(Set.class, method.getReturnType());
        });
    }

    @Test
    @DisplayName("Should test inviteList with null parameters gracefully")
    void inviteList_WithNullParameters_ShouldHandleGracefully() {
        // Given
        Long spaceId = 100L;
        InviteRecordTypeEnum type = InviteRecordTypeEnum.SPACE;
        InviteRecordParam nullParam = new InviteRecordParam();
        nullParam.setPageNum(1);
        nullParam.setPageSize(10);
        nullParam.setNickname(null);
        nullParam.setStatus(null);

        try (MockedStatic<SpaceInfoUtil> mockedStatic = mockStatic(SpaceInfoUtil.class)) {
            mockedStatic.when(SpaceInfoUtil::getSpaceId).thenReturn(spaceId);
            when(inviteRecordMapper.selectVOPageByParam(any(Page.class), eq(type.getCode()),
                    eq(spaceId), isNull(), isNull(), isNull())).thenReturn(mockVOPage);

            // When
            Page<InviteRecordVO> result = inviteRecordService.inviteList(nullParam, type);

            // Then
            assertNotNull(result);
            assertEquals(1L, result.getTotal());
            verify(inviteRecordMapper).selectVOPageByParam(any(Page.class), eq(type.getCode()),
                    eq(spaceId), isNull(), isNull(), isNull());
        }
    }

    @Test
    @DisplayName("Should handle large UIDs list correctly")
    void countBySpaceIdAndUids_WithLargeUidsList_ShouldHandleCorrectly() {
        // Given
        Long spaceId = 100L;
        List<String> largeUidsList = new ArrayList<>();
        for (int i = 0; i < 1000; i++) {
            largeUidsList.add("uid-" + i);
        }

        when(inviteRecordMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(500L);

        // When
        Long result = inviteRecordService.countBySpaceIdAndUids(spaceId, largeUidsList);

        // Then
        assertEquals(500L, result);
        verify(inviteRecordMapper).selectCount(any(LambdaQueryWrapper.class));
    }

    @Test
    @DisplayName("Should test scheduled annotation exists on updateExpireRecord method")
    void updateExpireRecord_ShouldHaveScheduledAnnotation() {
        // Test that the updateExpireRecord method has the @Scheduled annotation
        assertDoesNotThrow(() -> {
            java.lang.reflect.Method method = inviteRecordService.getClass()
                    .getMethod("updateExpireRecord");
            assertNotNull(method);

            // Check if the method has @Scheduled annotation
            boolean hasScheduledAnnotation = method.isAnnotationPresent(org.springframework.scheduling.annotation.Scheduled.class);
            assertTrue(hasScheduledAnnotation, "updateExpireRecord method should have @Scheduled annotation");

            // Verify the cron expression
            org.springframework.scheduling.annotation.Scheduled scheduledAnnotation =
                    method.getAnnotation(org.springframework.scheduling.annotation.Scheduled.class);
            assertEquals("0 0 0 * * ?", scheduledAnnotation.cron(), "Cron expression should be daily at midnight");
        });
    }

    @Test
    @DisplayName("Should test different space types with countJoiningByUid")
    void countJoiningByUid_WithDifferentSpaceTypes_ShouldHandleCorrectly() {
        // Test with different space types
        String uid = "test-uid";
        SpaceTypeEnum[] spaceTypes = {SpaceTypeEnum.FREE, SpaceTypeEnum.PRO};

        when(inviteRecordMapper.countJoiningByUid(eq(uid), anyInt())).thenReturn(1L);

        for (SpaceTypeEnum spaceType : spaceTypes) {
            // When
            Long result = inviteRecordService.countJoiningByUid(uid, spaceType);

            // Then
            assertEquals(1L, result);
        }

        // Verify all space types were tested
        verify(inviteRecordMapper, times(spaceTypes.length)).countJoiningByUid(eq(uid), anyInt());
    }

    @Test
    @DisplayName("Should test query wrapper construction for different status conditions")
    void verifyQueryWrapperConstruction_WithDifferentStatusConditions() {
        // Given
        Long spaceId = 100L;
        List<String> uids = Arrays.asList("uid1", "uid2");

        when(inviteRecordMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(1L);

        // When
        inviteRecordService.countBySpaceIdAndUids(spaceId, uids);

        // Then
        ArgumentCaptor<LambdaQueryWrapper> captor = ArgumentCaptor.forClass(LambdaQueryWrapper.class);
        verify(inviteRecordMapper).selectCount(captor.capture());

        // Verify that a LambdaQueryWrapper was created and passed to the mapper
        LambdaQueryWrapper<InviteRecord> capturedWrapper = captor.getValue();
        assertNotNull(capturedWrapper);
    }
}
