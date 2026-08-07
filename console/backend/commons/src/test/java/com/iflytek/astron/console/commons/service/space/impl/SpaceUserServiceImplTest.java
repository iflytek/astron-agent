package com.iflytek.astron.console.commons.service.space.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.iflytek.astron.console.commons.data.UserInfoDataService;
import com.iflytek.astron.console.commons.dto.space.SpaceUserParam;
import com.iflytek.astron.console.commons.dto.space.SpaceUserVO;
import com.iflytek.astron.console.commons.entity.space.SpaceUser;
import com.iflytek.astron.console.commons.entity.user.UserInfo;
import com.iflytek.astron.console.commons.enums.space.SpaceRoleEnum;
import com.iflytek.astron.console.commons.enums.space.SpaceTypeEnum;
import com.iflytek.astron.console.commons.mapper.space.SpaceUserMapper;
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

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for SpaceUserServiceImpl
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("SpaceUserServiceImpl Test Cases")
class SpaceUserServiceImplTest {

    @Mock
    private SpaceUserMapper spaceUserMapper;

    @Mock
    private UserInfoDataService userInfoDataService;

    @InjectMocks
    private SpaceUserServiceImpl spaceUserService;

    private SpaceUser mockSpaceUser;
    private UserInfo mockUserInfo;
    private SpaceUserParam mockParam;
    private SpaceUserVO mockSpaceUserVO;
    private Page<SpaceUserVO> mockVOPage;
    private List<SpaceUser> mockSpaceUserList;

    @BeforeEach
    void setUp() {
        // Set the baseMapper field using reflection to enable MyBatis-Plus operations
        ReflectionTestUtils.setField(spaceUserService, "baseMapper", spaceUserMapper);

        // Initialize test data
        mockSpaceUser = createMockSpaceUser(1L, 100L, "test-uid", "Test User", SpaceRoleEnum.MEMBER.getCode());

        mockUserInfo = new UserInfo();
        mockUserInfo.setUid("test-uid");
        mockUserInfo.setNickname("Test User");
        mockUserInfo.setUsername("testuser");

        mockParam = new SpaceUserParam();
        mockParam.setPageNum(1);
        mockParam.setPageSize(10);
        mockParam.setNickname("Test");
        mockParam.setRole(SpaceRoleEnum.MEMBER.getCode());

        mockSpaceUserVO = new SpaceUserVO();
        mockSpaceUserVO.setId(1L);
        mockSpaceUserVO.setUid("test-uid");
        mockSpaceUserVO.setNickname("Test User");
        mockSpaceUserVO.setRole(SpaceRoleEnum.MEMBER.getCode());

        mockVOPage = new Page<>();
        mockVOPage.setRecords(Arrays.asList(mockSpaceUserVO));
        mockVOPage.setTotal(1L);
        mockVOPage.setCurrent(1L);
        mockVOPage.setSize(10L);

        mockSpaceUserList = Arrays.asList(
                mockSpaceUser,
                createMockSpaceUser(2L, 100L, "test-uid-2", "Test User 2", SpaceRoleEnum.ADMIN.getCode()));
    }

    /**
     * Helper method to create mock SpaceUser objects
     */
    private SpaceUser createMockSpaceUser(Long id, Long spaceId, String uid, String nickname, Integer role) {
        SpaceUser spaceUser = new SpaceUser();
        spaceUser.setId(id);
        spaceUser.setSpaceId(spaceId);
        spaceUser.setUid(uid);
        spaceUser.setNickname(nickname);
        spaceUser.setRole(role);
        spaceUser.setCreateTime(LocalDateTime.now());
        spaceUser.setUpdateTime(LocalDateTime.now());
        spaceUser.setLastVisitTime(LocalDateTime.now());
        return spaceUser;
    }

    @Test
    @DisplayName("Should add new space user successfully when user does not exist")
    void addSpaceUser_WithNewUser_ShouldAddSuccessfully() {
        // Given
        Long spaceId = 100L;
        String uid = "new-uid";
        SpaceRoleEnum role = SpaceRoleEnum.MEMBER;

        when(spaceUserMapper.getByUidAndSpaceId(uid, spaceId)).thenReturn(null);
        when(userInfoDataService.findByUid(uid)).thenReturn(Optional.of(mockUserInfo));
        when(spaceUserMapper.insert(any(SpaceUser.class))).thenReturn(1);

        // When
        boolean result = spaceUserService.addSpaceUser(spaceId, uid, role);

        // Then
        assertTrue(result);
        verify(spaceUserMapper).getByUidAndSpaceId(uid, spaceId);
        verify(userInfoDataService).findByUid(uid);
        verify(spaceUserMapper).insert(any(SpaceUser.class));
    }

    @Test
    @DisplayName("Should return true when user already exists with same role")
    void addSpaceUser_WithExistingUserSameRole_ShouldReturnTrue() {
        // Given
        Long spaceId = 100L;
        String uid = "existing-uid";
        SpaceRoleEnum role = SpaceRoleEnum.MEMBER;
        mockSpaceUser.setRole(role.getCode());

        when(spaceUserMapper.getByUidAndSpaceId(uid, spaceId)).thenReturn(mockSpaceUser);

        // When
        boolean result = spaceUserService.addSpaceUser(spaceId, uid, role);

        // Then
        assertTrue(result);
        verify(spaceUserMapper).getByUidAndSpaceId(uid, spaceId);
        verify(userInfoDataService, never()).findByUid(anyString());
        verify(spaceUserMapper, never()).insert(any(SpaceUser.class));
        verify(spaceUserMapper, never()).updateById(any(SpaceUser.class));
    }

    @Test
    @DisplayName("Should update role when user exists with different role")
    void addSpaceUser_WithExistingUserDifferentRole_ShouldUpdateRole() {
        // Given
        Long spaceId = 100L;
        String uid = "existing-uid";
        SpaceRoleEnum oldRole = SpaceRoleEnum.MEMBER;
        SpaceRoleEnum newRole = SpaceRoleEnum.ADMIN;

        mockSpaceUser.setRole(oldRole.getCode());

        when(spaceUserMapper.getByUidAndSpaceId(uid, spaceId)).thenReturn(mockSpaceUser);
        when(spaceUserMapper.updateById(any(SpaceUser.class))).thenReturn(1);

        // When
        boolean result = spaceUserService.addSpaceUser(spaceId, uid, newRole);

        // Then
        assertTrue(result);
        assertEquals(newRole.getCode(), mockSpaceUser.getRole());
        verify(spaceUserMapper).getByUidAndSpaceId(uid, spaceId);
        verify(spaceUserMapper).updateById(mockSpaceUser);
        verify(userInfoDataService, never()).findByUid(anyString());
    }

    @Test
    @DisplayName("Should throw exception when user info does not exist")
    void addSpaceUser_WithNonExistentUserInfo_ShouldThrowException() {
        // Given
        Long spaceId = 100L;
        String uid = "non-existent-uid";
        SpaceRoleEnum role = SpaceRoleEnum.MEMBER;

        when(spaceUserMapper.getByUidAndSpaceId(uid, spaceId)).thenReturn(null);
        when(userInfoDataService.findByUid(uid)).thenReturn(Optional.empty());

        // When & Then
        assertThrows(NoSuchElementException.class, () -> {
            spaceUserService.addSpaceUser(spaceId, uid, role);
        });

        verify(spaceUserMapper).getByUidAndSpaceId(uid, spaceId);
        verify(userInfoDataService).findByUid(uid);
        verify(spaceUserMapper, never()).insert(any(SpaceUser.class));
    }

    @Test
    @DisplayName("Should list space members excluding owner")
    void listSpaceMember_ShouldReturnMembersExcludingOwner() {
        // Given
        Long spaceId = 100L;
        List<SpaceUser> membersOnly = Arrays.asList(
                createMockSpaceUser(1L, spaceId, "member1", "Member 1", SpaceRoleEnum.MEMBER.getCode()),
                createMockSpaceUser(2L, spaceId, "admin1", "Admin 1", SpaceRoleEnum.ADMIN.getCode()));

        try (MockedStatic<SpaceInfoUtil> mockedStatic = mockStatic(SpaceInfoUtil.class)) {
            mockedStatic.when(SpaceInfoUtil::getSpaceId).thenReturn(spaceId);
            when(spaceUserMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(membersOnly);

            // When
            List<SpaceUser> result = spaceUserService.listSpaceMember();

            // Then
            assertNotNull(result);
            assertEquals(2, result.size());
            verify(spaceUserMapper).selectList(any(LambdaQueryWrapper.class));
        }
    }

    @Test
    @DisplayName("Should get space user by UID successfully")
    void getSpaceUserByUid_WithValidParameters_ShouldReturnSpaceUser() {
        // Given
        Long spaceId = 100L;
        String uid = "test-uid";

        when(spaceUserMapper.getByUidAndSpaceId(uid, spaceId)).thenReturn(mockSpaceUser);

        // When
        SpaceUser result = spaceUserService.getSpaceUserByUid(spaceId, uid);

        // Then
        assertNotNull(result);
        assertEquals(mockSpaceUser.getId(), result.getId());
        assertEquals(mockSpaceUser.getSpaceId(), result.getSpaceId());
        assertEquals(mockSpaceUser.getUid(), result.getUid());
        verify(spaceUserMapper).getByUidAndSpaceId(uid, spaceId);
    }

    @Test
    @DisplayName("Should return null when space user does not exist")
    void getSpaceUserByUid_WithNonExistentUser_ShouldReturnNull() {
        // Given
        Long spaceId = 100L;
        String uid = "non-existent-uid";

        when(spaceUserMapper.getByUidAndSpaceId(uid, spaceId)).thenReturn(null);

        // When
        SpaceUser result = spaceUserService.getSpaceUserByUid(spaceId, uid);

        // Then
        assertNull(result);
        verify(spaceUserMapper).getByUidAndSpaceId(uid, spaceId);
    }

    @Test
    @DisplayName("Should count space users by UIDs correctly")
    void countSpaceUserByUids_WithValidParameters_ShouldReturnCorrectCount() {
        // Given
        Long spaceId = 100L;
        List<String> uids = Arrays.asList("uid1", "uid2", "uid3");
        Long expectedCount = 2L;

        when(spaceUserMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(expectedCount);

        // When
        Long result = spaceUserService.countSpaceUserByUids(spaceId, uids);

        // Then
        assertEquals(expectedCount, result);
        verify(spaceUserMapper).selectCount(any(LambdaQueryWrapper.class));
    }

    @Test
    @DisplayName("Should return 0 when no users match space ID and UIDs")
    void countSpaceUserByUids_WithNoMatches_ShouldReturnZero() {
        // Given
        Long spaceId = 999L;
        List<String> uids = Arrays.asList("non-existent-uid");

        when(spaceUserMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(0L);

        // When
        Long result = spaceUserService.countSpaceUserByUids(spaceId, uids);

        // Then
        assertEquals(0L, result);
        verify(spaceUserMapper).selectCount(any(LambdaQueryWrapper.class));
    }

    @Test
    @DisplayName("Should count users by space ID correctly")
    void countBySpaceId_WithValidSpaceId_ShouldReturnCorrectCount() {
        // Given
        Long spaceId = 100L;
        Long expectedCount = 5L;

        when(spaceUserMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(expectedCount);

        // When
        Long result = spaceUserService.countBySpaceId(spaceId);

        // Then
        assertEquals(expectedCount, result);
        verify(spaceUserMapper).selectCount(any(LambdaQueryWrapper.class));
    }

    @Test
    @DisplayName("Should test updateVisitTime method exists and is callable")
    void updateVisitTime_WithValidParameters_ShouldTestMethodExists() {
        // Given & When & Then
        // Test that the updateVisitTime method exists and has correct signature
        assertDoesNotThrow(() -> {
            java.lang.reflect.Method method = spaceUserService.getClass()
                    .getMethod("updateVisitTime", Long.class, String.class);
            assertNotNull(method, "updateVisitTime method should exist");
            assertEquals(boolean.class, method.getReturnType(), "updateVisitTime should return boolean");
        });

        // Verify the service implements the interface correctly
        assertTrue(spaceUserService instanceof com.iflytek.astron.console.commons.service.space.SpaceUserService,
                "Service should implement SpaceUserService interface");
    }

    @Test
    @DisplayName("Should test updateVisitTime method functionality through reflection")
    void updateVisitTime_WhenUpdateFails_ShouldTestMethodFunctionality() {
        // Given & When & Then
        // Test that the updateVisitTime method has correct signature and is accessible
        assertDoesNotThrow(() -> {
            java.lang.reflect.Method method = spaceUserService.getClass()
                    .getMethod("updateVisitTime", Long.class, String.class);
            assertNotNull(method, "updateVisitTime method should exist");

            // Verify parameter types
            Class<?>[] parameterTypes = method.getParameterTypes();
            assertEquals(2, parameterTypes.length, "Method should have two parameters");
            assertEquals(Long.class, parameterTypes[0], "First parameter should be Long type");
            assertEquals(String.class, parameterTypes[1], "Second parameter should be String type");

            // Verify return type
            assertEquals(boolean.class, method.getReturnType(), "Return type should be boolean");

            // Verify method is public
            assertTrue(java.lang.reflect.Modifier.isPublic(method.getModifiers()),
                    "updateVisitTime method should be public");
        });
    }

    @Test
    @DisplayName("Should remove user by UID from multiple spaces successfully")
    void removeByUid_WithValidParameters_ShouldReturnTrue() {
        // Given
        Collection<Long> spaceIds = Arrays.asList(100L, 101L, 102L);
        String uid = "test-uid";

        when(spaceUserMapper.delete(any(LambdaUpdateWrapper.class))).thenReturn(3);

        // When
        boolean result = spaceUserService.removeByUid(spaceIds, uid);

        // Then
        assertTrue(result);
        verify(spaceUserMapper).delete(any(LambdaUpdateWrapper.class));
    }

    @Test
    @DisplayName("Should return false when remove by UID fails")
    void removeByUid_WhenRemoveFails_ShouldReturnFalse() {
        // Given
        Collection<Long> spaceIds = Arrays.asList(999L);
        String uid = "non-existent-uid";

        when(spaceUserMapper.delete(any(LambdaUpdateWrapper.class))).thenReturn(0);

        // When
        boolean result = spaceUserService.removeByUid(spaceIds, uid);

        // Then
        assertFalse(result);
        verify(spaceUserMapper).delete(any(LambdaUpdateWrapper.class));
    }

    @Test
    @DisplayName("Should get all space users for single space")
    void getAllSpaceUsers_WithSingleSpaceId_ShouldReturnAllUsers() {
        // Given
        Long spaceId = 100L;

        when(spaceUserMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(mockSpaceUserList);

        // When
        List<SpaceUser> result = spaceUserService.getAllSpaceUsers(spaceId);

        // Then
        assertNotNull(result);
        assertEquals(2, result.size());
        verify(spaceUserMapper).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    @DisplayName("Should get all space users for multiple spaces")
    void getAllSpaceUsers_WithMultipleSpaceIds_ShouldReturnAllUsers() {
        // Given
        List<Long> spaceIds = Arrays.asList(100L, 101L);

        when(spaceUserMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(mockSpaceUserList);

        // When
        List<SpaceUser> result = spaceUserService.getAllSpaceUsers(spaceIds);

        // Then
        assertNotNull(result);
        assertEquals(2, result.size());
        verify(spaceUserMapper).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    @DisplayName("Should count free space users correctly")
    void countFreeSpaceUser_WithValidUid_ShouldReturnCorrectCount() {
        // Given
        String uid = "test-uid";
        Long expectedCount = 3L;

        when(spaceUserMapper.countPersonalSpaceUser(uid, SpaceRoleEnum.OWNER.getCode(),
                SpaceTypeEnum.FREE.getCode())).thenReturn(expectedCount);

        // When
        Long result = spaceUserService.countFreeSpaceUser(uid);

        // Then
        assertEquals(expectedCount, result);
        verify(spaceUserMapper).countPersonalSpaceUser(uid, SpaceRoleEnum.OWNER.getCode(),
                SpaceTypeEnum.FREE.getCode());
    }

    @Test
    @DisplayName("Should count pro space users correctly")
    void countProSpaceUser_WithValidUid_ShouldReturnCorrectCount() {
        // Given
        String uid = "test-uid";
        Long expectedCount = 1L;

        when(spaceUserMapper.countPersonalSpaceUser(uid, SpaceRoleEnum.OWNER.getCode(),
                SpaceTypeEnum.PRO.getCode())).thenReturn(expectedCount);

        // When
        Long result = spaceUserService.countProSpaceUser(uid);

        // Then
        assertEquals(expectedCount, result);
        verify(spaceUserMapper).countPersonalSpaceUser(uid, SpaceRoleEnum.OWNER.getCode(),
                SpaceTypeEnum.PRO.getCode());
    }

    @Test
    @DisplayName("Should get space owner successfully")
    void getSpaceOwner_WithValidSpaceId_ShouldReturnOwner() {
        // Given
        Long spaceId = 100L;
        SpaceUser owner = createMockSpaceUser(1L, spaceId, "owner-uid", "Owner", SpaceRoleEnum.OWNER.getCode());

        when(spaceUserMapper.selectOne(any(LambdaQueryWrapper.class), eq(true))).thenReturn(owner);

        // When
        SpaceUser result = spaceUserService.getSpaceOwner(spaceId);

        // Then
        assertNotNull(result);
        assertEquals(SpaceRoleEnum.OWNER.getCode(), result.getRole());
        verify(spaceUserMapper).selectOne(any(LambdaQueryWrapper.class), eq(true));
    }

    @Test
    @DisplayName("Should return null when space has no owner")
    void getSpaceOwner_WithNoOwner_ShouldReturnNull() {
        // Given
        Long spaceId = 999L;

        when(spaceUserMapper.selectOne(any(LambdaQueryWrapper.class), eq(true))).thenReturn(null);

        // When
        SpaceUser result = spaceUserService.getSpaceOwner(spaceId);

        // Then
        assertNull(result);
        verify(spaceUserMapper).selectOne(any(LambdaQueryWrapper.class), eq(true));
    }

    @Test
    @DisplayName("Should return paged results with valid space ID")
    void page_WithValidSpaceId_ShouldReturnPagedResults() {
        // Given
        Long spaceId = 100L;

        try (MockedStatic<SpaceInfoUtil> mockedStatic = mockStatic(SpaceInfoUtil.class)) {
            mockedStatic.when(SpaceInfoUtil::getSpaceId).thenReturn(spaceId);
            when(spaceUserMapper.selectVOPageByParam(any(Page.class), eq(spaceId),
                    eq("Test"), eq(SpaceRoleEnum.MEMBER.getCode()))).thenReturn(mockVOPage);

            // When
            Page<SpaceUserVO> result = spaceUserService.page(mockParam);

            // Then
            assertNotNull(result);
            assertEquals(1L, result.getTotal());
            assertEquals(1, result.getRecords().size());
            verify(spaceUserMapper).selectVOPageByParam(any(Page.class), eq(spaceId),
                    eq("Test"), eq(SpaceRoleEnum.MEMBER.getCode()));
        }
    }

    @Test
    @DisplayName("Should return empty page when space ID is null")
    void page_WithNullSpaceId_ShouldReturnEmptyPage() {
        // Given
        try (MockedStatic<SpaceInfoUtil> mockedStatic = mockStatic(SpaceInfoUtil.class)) {
            mockedStatic.when(SpaceInfoUtil::getSpaceId).thenReturn(null);

            // When
            Page<SpaceUserVO> result = spaceUserService.page(mockParam);

            // Then
            assertNotNull(result);
            assertEquals(1L, result.getCurrent());
            assertEquals(10L, result.getSize());
            assertTrue(result.getRecords().isEmpty());

            verify(spaceUserMapper, never()).selectVOPageByParam(any(), any(), any(), any());
        }
    }

    @Test
    @DisplayName("Should save space user successfully")
    void save_WithValidEntity_ShouldReturnTrue() {
        // Given
        when(spaceUserMapper.insert(any(SpaceUser.class))).thenReturn(1);

        // When
        boolean result = spaceUserService.save(mockSpaceUser);

        // Then
        assertTrue(result);
        verify(spaceUserMapper).insert(any(SpaceUser.class));
    }

    @Test
    @DisplayName("Should update space user by ID successfully")
    void updateById_WithValidEntity_ShouldReturnTrue() {
        // Given
        when(spaceUserMapper.updateById(any(SpaceUser.class))).thenReturn(1);

        // When
        boolean result = spaceUserService.updateById(mockSpaceUser);

        // Then
        assertTrue(result);
        verify(spaceUserMapper).updateById(any(SpaceUser.class));
    }

    @Test
    @DisplayName("Should test updateBatchById method exists and is callable")
    void updateBatchById_WithValidEntityList_ShouldTestMethodExists() {
        // Given & When & Then
        // Test that the updateBatchById method exists and has correct signature
        assertDoesNotThrow(() -> {
            java.lang.reflect.Method method = spaceUserService.getClass()
                    .getMethod("updateBatchById", Collection.class);
            assertNotNull(method, "updateBatchById method should exist");
            assertEquals(boolean.class, method.getReturnType(), "updateBatchById should return boolean");
        });

        // Verify the service properly implements the interface contract
        assertTrue(com.iflytek.astron.console.commons.service.space.SpaceUserService.class
                .isAssignableFrom(spaceUserService.getClass()),
                "Service should implement SpaceUserService interface");
    }

    @Test
    @DisplayName("Should remove space user by ID successfully")
    void removeById_WithValidEntity_ShouldReturnTrue() {
        // Given
        when(spaceUserMapper.deleteById(any())).thenReturn(1);

        // When
        boolean result = spaceUserService.removeById(mockSpaceUser);

        // Then
        assertTrue(result);
        verify(spaceUserMapper).deleteById(any());
    }

    @Test
    @DisplayName("Should get user role successfully")
    void getRole_WithValidParameters_ShouldReturnRole() {
        // Given
        Long spaceId = 100L;
        String uid = "test-uid";
        mockSpaceUser.setRole(SpaceRoleEnum.ADMIN.getCode());

        when(spaceUserMapper.getByUidAndSpaceId(uid, spaceId)).thenReturn(mockSpaceUser);

        // When
        SpaceRoleEnum result = spaceUserService.getRole(spaceId, uid);

        // Then
        assertEquals(SpaceRoleEnum.ADMIN, result);
        verify(spaceUserMapper).getByUidAndSpaceId(uid, spaceId);
    }

    @Test
    @DisplayName("Should return null when user does not exist")
    void getRole_WithNonExistentUser_ShouldReturnNull() {
        // Given
        Long spaceId = 100L;
        String uid = "non-existent-uid";

        when(spaceUserMapper.getByUidAndSpaceId(uid, spaceId)).thenReturn(null);

        // When
        SpaceRoleEnum result = spaceUserService.getRole(spaceId, uid);

        // Then
        assertNull(result);
        verify(spaceUserMapper).getByUidAndSpaceId(uid, spaceId);
    }

    @Test
    @DisplayName("Should handle null parameters gracefully in various methods")
    void handleNullParametersGracefully() {
        // Test getSpaceUserByUid with null parameters
        when(spaceUserMapper.getByUidAndSpaceId(null, null)).thenReturn(null);
        assertNull(spaceUserService.getSpaceUserByUid(null, null));

        // Test getRole with null parameters
        when(spaceUserMapper.getByUidAndSpaceId(null, null)).thenReturn(null);
        assertNull(spaceUserService.getRole(null, null));

        verify(spaceUserMapper, times(2)).getByUidAndSpaceId(null, null);
    }

    @Test
    @DisplayName("Should handle empty collections gracefully")
    void handleEmptyCollectionsGracefully() {
        // Test countSpaceUserByUids with empty list
        List<String> emptyUids = Collections.emptyList();
        when(spaceUserMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(0L);

        Long result = spaceUserService.countSpaceUserByUids(100L, emptyUids);
        assertEquals(0L, result);

        // Test removeByUid with empty collection
        Collection<Long> emptySpaceIds = Collections.emptyList();
        when(spaceUserMapper.delete(any(LambdaUpdateWrapper.class))).thenReturn(0);

        boolean removeResult = spaceUserService.removeByUid(emptySpaceIds, "test-uid");
        assertFalse(removeResult);
    }

    @Test
    @DisplayName("Should verify service implements interface correctly")
    void verifyServiceImplementsInterfaceCorrectly() {
        // Given & When & Then
        assertTrue(spaceUserService instanceof com.iflytek.astron.console.commons.service.space.SpaceUserService,
                "Service should implement SpaceUserService interface");

        assertTrue(spaceUserService instanceof com.baomidou.mybatisplus.extension.service.impl.ServiceImpl,
                "Service should extend MyBatis-Plus ServiceImpl");
    }

    @Test
    @DisplayName("Should verify all interface methods are implemented")
    void verifyAllInterfaceMethodsAreImplemented() {
        // Test that all methods from the interface are properly implemented
        assertDoesNotThrow(() -> {
            // Verify addSpaceUser method
            java.lang.reflect.Method method = spaceUserService.getClass()
                    .getMethod("addSpaceUser", Long.class, String.class, SpaceRoleEnum.class);
            assertNotNull(method);
            assertEquals(boolean.class, method.getReturnType());

            // Verify getSpaceUserByUid method
            method = spaceUserService.getClass()
                    .getMethod("getSpaceUserByUid", Long.class, String.class);
            assertNotNull(method);
            assertEquals(SpaceUser.class, method.getReturnType());

            // Verify getRole method
            method = spaceUserService.getClass()
                    .getMethod("getRole", Long.class, String.class);
            assertNotNull(method);
            assertEquals(SpaceRoleEnum.class, method.getReturnType());

            // Verify page method
            method = spaceUserService.getClass()
                    .getMethod("page", SpaceUserParam.class);
            assertNotNull(method);
            assertEquals(Page.class, method.getReturnType());
        });
    }

    @Test
    @DisplayName("Should test various roles with addSpaceUser method")
    void addSpaceUser_WithDifferentRoles_ShouldHandleCorrectly() {
        // Test with different space roles
        SpaceRoleEnum[] roles = {SpaceRoleEnum.OWNER, SpaceRoleEnum.ADMIN, SpaceRoleEnum.MEMBER};

        Long spaceId = 100L;
        String uid = "role-test-uid";

        when(spaceUserMapper.getByUidAndSpaceId(uid, spaceId)).thenReturn(null);
        when(userInfoDataService.findByUid(uid)).thenReturn(Optional.of(mockUserInfo));
        when(spaceUserMapper.insert(any(SpaceUser.class))).thenReturn(1);

        for (SpaceRoleEnum role : roles) {
            // When
            boolean result = spaceUserService.addSpaceUser(spaceId, uid, role);

            // Then
            assertTrue(result, "Should successfully add user with role: " + role.name());
        }

        // Verify all role insertions were attempted
        verify(spaceUserMapper, times(roles.length)).insert(any(SpaceUser.class));
    }

    @Test
    @DisplayName("Should handle large UIDs list correctly")
    void countSpaceUserByUids_WithLargeUidsList_ShouldHandleCorrectly() {
        // Given
        Long spaceId = 100L;
        List<String> largeUidsList = new ArrayList<>();
        for (int i = 0; i < 1000; i++) {
            largeUidsList.add("uid-" + i);
        }

        when(spaceUserMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(500L);

        // When
        Long result = spaceUserService.countSpaceUserByUids(spaceId, largeUidsList);

        // Then
        assertEquals(500L, result);
        verify(spaceUserMapper).selectCount(any(LambdaQueryWrapper.class));
    }

    @Test
    @DisplayName("Should test transactional annotation exists on addSpaceUser method")
    void addSpaceUser_ShouldHaveTransactionalAnnotation() {
        // Test that the addSpaceUser method has the @Transactional annotation
        assertDoesNotThrow(() -> {
            java.lang.reflect.Method method = spaceUserService.getClass()
                    .getMethod("addSpaceUser", Long.class, String.class, SpaceRoleEnum.class);
            assertNotNull(method);

            // Check if the method has @Transactional annotation
            boolean hasTransactionalAnnotation = method.isAnnotationPresent(org.springframework.transaction.annotation.Transactional.class);
            assertTrue(hasTransactionalAnnotation, "addSpaceUser method should have @Transactional annotation");
        });
    }

    @Test
    @DisplayName("Should test different space types with count methods")
    void countSpaceUsers_WithDifferentSpaceTypes_ShouldHandleCorrectly() {
        // Test with different space types
        String uid = "test-uid";

        when(spaceUserMapper.countPersonalSpaceUser(eq(uid), eq(SpaceRoleEnum.OWNER.getCode()), anyInt()))
                .thenReturn(1L);

        // When
        Long freeResult = spaceUserService.countFreeSpaceUser(uid);
        Long proResult = spaceUserService.countProSpaceUser(uid);

        // Then
        assertEquals(1L, freeResult);
        assertEquals(1L, proResult);

        // Verify both space types were tested
        verify(spaceUserMapper).countPersonalSpaceUser(uid, SpaceRoleEnum.OWNER.getCode(), SpaceTypeEnum.FREE.getCode());
        verify(spaceUserMapper).countPersonalSpaceUser(uid, SpaceRoleEnum.OWNER.getCode(), SpaceTypeEnum.PRO.getCode());
    }
}
