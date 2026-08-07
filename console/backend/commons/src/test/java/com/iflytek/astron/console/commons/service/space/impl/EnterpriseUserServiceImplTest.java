package com.iflytek.astron.console.commons.service.space.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.iflytek.astron.console.commons.data.UserInfoDataService;
import com.iflytek.astron.console.commons.dto.space.EnterpriseUserParam;
import com.iflytek.astron.console.commons.dto.space.EnterpriseUserVO;
import com.iflytek.astron.console.commons.entity.space.EnterpriseUser;
import com.iflytek.astron.console.commons.entity.user.UserInfo;
import com.iflytek.astron.console.commons.enums.space.EnterpriseRoleEnum;
import com.iflytek.astron.console.commons.mapper.space.EnterpriseUserMapper;
import com.iflytek.astron.console.commons.util.space.EnterpriseInfoUtil;
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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for EnterpriseUserServiceImpl
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("EnterpriseUserServiceImpl Test Cases")
class EnterpriseUserServiceImplTest {

    @Mock
    private EnterpriseUserMapper enterpriseUserMapper;

    @Mock
    private UserInfoDataService userInfoDataService;

    @InjectMocks
    private EnterpriseUserServiceImpl enterpriseUserService;

    private EnterpriseUser mockEnterpriseUser;
    private UserInfo mockUserInfo;
    private EnterpriseUserParam mockParam;
    private EnterpriseUserVO mockEnterpriseUserVO;
    private List<EnterpriseUser> mockEnterpriseUserList;
    private Page<EnterpriseUserVO> mockVOPage;

    @BeforeEach
    void setUp() {
        // Set the baseMapper field using reflection to enable MyBatis-Plus operations
        ReflectionTestUtils.setField(enterpriseUserService, "baseMapper", enterpriseUserMapper);

        // Initialize test data
        mockEnterpriseUser = EnterpriseUser.builder()
                .id(1L)
                .enterpriseId(100L)
                .uid("test-uid")
                .nickname("Test User")
                .role(EnterpriseRoleEnum.OFFICER.getCode())
                .createTime(LocalDateTime.now())
                .updateTime(LocalDateTime.now())
                .build();

        mockUserInfo = new UserInfo();
        mockUserInfo.setUid("test-uid");
        mockUserInfo.setUsername("testuser");
        mockUserInfo.setNickname("Test User");

        mockParam = new EnterpriseUserParam();
        mockParam.setPageNum(1);
        mockParam.setPageSize(10);
        mockParam.setNickname("Test");
        mockParam.setRole(EnterpriseRoleEnum.OFFICER.getCode());

        mockEnterpriseUserVO = new EnterpriseUserVO();
        mockEnterpriseUserVO.setId(1L);
        mockEnterpriseUserVO.setUid("test-uid");
        mockEnterpriseUserVO.setNickname("Test User");
        mockEnterpriseUserVO.setUsername("testuser");
        mockEnterpriseUserVO.setRole(EnterpriseRoleEnum.OFFICER.getCode());

        mockEnterpriseUserList = Arrays.asList(
                mockEnterpriseUser,
                EnterpriseUser.builder()
                        .id(2L)
                        .enterpriseId(100L)
                        .uid("test-uid-2")
                        .nickname("Test User 2")
                        .role(EnterpriseRoleEnum.GOVERNOR.getCode())
                        .createTime(LocalDateTime.now())
                        .updateTime(LocalDateTime.now())
                        .build());

        mockVOPage = new Page<>();
        mockVOPage.setRecords(Arrays.asList(mockEnterpriseUserVO));
        mockVOPage.setTotal(1L);
        mockVOPage.setCurrent(1L);
        mockVOPage.setSize(10L);
    }

    @Test
    @DisplayName("Should return enterprise user when valid enterprise ID and UID are provided")
    void getEnterpriseUserByUid_WithValidParameters_ShouldReturnEnterpriseUser() {
        // Given
        Long enterpriseId = 100L;
        String uid = "test-uid";

        when(enterpriseUserMapper.selectByUidAndEnterpriseId(uid, enterpriseId)).thenReturn(mockEnterpriseUser);

        // When
        EnterpriseUser result = enterpriseUserService.getEnterpriseUserByUid(enterpriseId, uid);

        // Then
        assertNotNull(result);
        assertEquals(mockEnterpriseUser.getId(), result.getId());
        assertEquals(mockEnterpriseUser.getEnterpriseId(), result.getEnterpriseId());
        assertEquals(mockEnterpriseUser.getUid(), result.getUid());
        assertEquals(mockEnterpriseUser.getNickname(), result.getNickname());
        assertEquals(mockEnterpriseUser.getRole(), result.getRole());
        verify(enterpriseUserMapper).selectByUidAndEnterpriseId(uid, enterpriseId);
    }

    @Test
    @DisplayName("Should return null when enterprise user does not exist")
    void getEnterpriseUserByUid_WithNonExistentUser_ShouldReturnNull() {
        // Given
        Long enterpriseId = 100L;
        String uid = "non-existent-uid";

        when(enterpriseUserMapper.selectByUidAndEnterpriseId(uid, enterpriseId)).thenReturn(null);

        // When
        EnterpriseUser result = enterpriseUserService.getEnterpriseUserByUid(enterpriseId, uid);

        // Then
        assertNull(result);
        verify(enterpriseUserMapper).selectByUidAndEnterpriseId(uid, enterpriseId);
    }

    @Test
    @DisplayName("Should handle null parameters gracefully in getEnterpriseUserByUid")
    void getEnterpriseUserByUid_WithNullParameters_ShouldHandleGracefully() {
        // Given
        when(enterpriseUserMapper.selectByUidAndEnterpriseId(null, null)).thenReturn(null);

        // When
        EnterpriseUser result = enterpriseUserService.getEnterpriseUserByUid(null, null);

        // Then
        assertNull(result);
        verify(enterpriseUserMapper).selectByUidAndEnterpriseId(null, null);
    }

    @Test
    @DisplayName("Should return correct count for enterprise ID and UIDs")
    void countByEnterpriseIdAndUids_WithValidParameters_ShouldReturnCorrectCount() {
        // Given
        Long enterpriseId = 100L;
        List<String> uids = Arrays.asList("uid1", "uid2", "uid3");
        Long expectedCount = 2L;

        when(enterpriseUserMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(expectedCount);

        // When
        Long result = enterpriseUserService.countByEnterpriseIdAndUids(enterpriseId, uids);

        // Then
        assertEquals(expectedCount, result);
        verify(enterpriseUserMapper).selectCount(any(LambdaQueryWrapper.class));
    }

    @Test
    @DisplayName("Should return 0 when no users match enterprise ID and UIDs")
    void countByEnterpriseIdAndUids_WithNoMatches_ShouldReturnZero() {
        // Given
        Long enterpriseId = 100L;
        List<String> uids = Arrays.asList("non-existent-uid1", "non-existent-uid2");

        when(enterpriseUserMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(0L);

        // When
        Long result = enterpriseUserService.countByEnterpriseIdAndUids(enterpriseId, uids);

        // Then
        assertEquals(0L, result);
        verify(enterpriseUserMapper).selectCount(any(LambdaQueryWrapper.class));
    }

    @Test
    @DisplayName("Should handle empty UIDs list gracefully")
    void countByEnterpriseIdAndUids_WithEmptyUidsList_ShouldHandleGracefully() {
        // Given
        Long enterpriseId = 100L;
        List<String> emptyUids = Collections.emptyList();

        when(enterpriseUserMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(0L);

        // When
        Long result = enterpriseUserService.countByEnterpriseIdAndUids(enterpriseId, emptyUids);

        // Then
        assertEquals(0L, result);
        verify(enterpriseUserMapper).selectCount(any(LambdaQueryWrapper.class));
    }

    @Test
    @DisplayName("Should return list of enterprise users for valid enterprise ID")
    void listByEnterpriseId_WithValidEnterpriseId_ShouldReturnUserList() {
        // Given
        Long enterpriseId = 100L;

        when(enterpriseUserMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(mockEnterpriseUserList);

        // When
        List<EnterpriseUser> result = enterpriseUserService.listByEnterpriseId(enterpriseId);

        // Then
        assertNotNull(result);
        assertEquals(2, result.size());
        assertEquals(mockEnterpriseUserList, result);
        verify(enterpriseUserMapper).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    @DisplayName("Should return empty list when no users exist for enterprise")
    void listByEnterpriseId_WithNoUsers_ShouldReturnEmptyList() {
        // Given
        Long enterpriseId = 999L;

        when(enterpriseUserMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(Collections.emptyList());

        // When
        List<EnterpriseUser> result = enterpriseUserService.listByEnterpriseId(enterpriseId);

        // Then
        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(enterpriseUserMapper).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    @DisplayName("Should add new enterprise user successfully when user does not exist")
    void addEnterpriseUser_WithNewUser_ShouldAddSuccessfully() {
        // Given
        Long enterpriseId = 100L;
        String uid = "new-uid";
        EnterpriseRoleEnum role = EnterpriseRoleEnum.STAFF;

        when(enterpriseUserMapper.selectByUidAndEnterpriseId(uid, enterpriseId)).thenReturn(null);
        when(userInfoDataService.findByUid(uid)).thenReturn(Optional.of(mockUserInfo));
        when(enterpriseUserMapper.insert(any(EnterpriseUser.class))).thenReturn(1);

        // When
        boolean result = enterpriseUserService.addEnterpriseUser(enterpriseId, uid, role);

        // Then
        assertTrue(result);
        verify(enterpriseUserMapper).selectByUidAndEnterpriseId(uid, enterpriseId);
        verify(userInfoDataService).findByUid(uid);
        verify(enterpriseUserMapper).insert(any(EnterpriseUser.class));
    }

    @Test
    @DisplayName("Should return true when user already exists in enterprise")
    void addEnterpriseUser_WithExistingUser_ShouldReturnTrue() {
        // Given
        Long enterpriseId = 100L;
        String uid = "existing-uid";
        EnterpriseRoleEnum role = EnterpriseRoleEnum.STAFF;

        when(enterpriseUserMapper.selectByUidAndEnterpriseId(uid, enterpriseId)).thenReturn(mockEnterpriseUser);

        // When
        boolean result = enterpriseUserService.addEnterpriseUser(enterpriseId, uid, role);

        // Then
        assertTrue(result);
        verify(enterpriseUserMapper).selectByUidAndEnterpriseId(uid, enterpriseId);
        verify(userInfoDataService, never()).findByUid(anyString());
        verify(enterpriseUserMapper, never()).insert(any(EnterpriseUser.class));
    }

    @Test
    @DisplayName("Should throw exception when user info does not exist")
    void addEnterpriseUser_WithNonExistentUserInfo_ShouldThrowException() {
        // Given
        Long enterpriseId = 100L;
        String uid = "non-existent-uid";
        EnterpriseRoleEnum role = EnterpriseRoleEnum.STAFF;

        when(enterpriseUserMapper.selectByUidAndEnterpriseId(uid, enterpriseId)).thenReturn(null);
        when(userInfoDataService.findByUid(uid)).thenReturn(Optional.empty());

        // When & Then
        assertThrows(NoSuchElementException.class, () -> {
            enterpriseUserService.addEnterpriseUser(enterpriseId, uid, role);
        });

        verify(enterpriseUserMapper).selectByUidAndEnterpriseId(uid, enterpriseId);
        verify(userInfoDataService).findByUid(uid);
        verify(enterpriseUserMapper, never()).insert(any(EnterpriseUser.class));
    }

    @Test
    @DisplayName("Should verify correct enterprise user creation with builder pattern")
    void addEnterpriseUser_WithValidData_ShouldCreateCorrectEnterpriseUser() {
        // Given
        Long enterpriseId = 100L;
        String uid = "new-uid";
        EnterpriseRoleEnum role = EnterpriseRoleEnum.GOVERNOR;

        when(enterpriseUserMapper.selectByUidAndEnterpriseId(uid, enterpriseId)).thenReturn(null);
        when(userInfoDataService.findByUid(uid)).thenReturn(Optional.of(mockUserInfo));
        when(enterpriseUserMapper.insert(any(EnterpriseUser.class))).thenReturn(1);

        // When
        boolean result = enterpriseUserService.addEnterpriseUser(enterpriseId, uid, role);

        // Then
        assertTrue(result);

        ArgumentCaptor<EnterpriseUser> userCaptor = ArgumentCaptor.forClass(EnterpriseUser.class);
        verify(enterpriseUserMapper).insert(userCaptor.capture());

        EnterpriseUser capturedUser = userCaptor.getValue();
        assertEquals(enterpriseId, capturedUser.getEnterpriseId());
        assertEquals(uid, capturedUser.getUid());
        assertEquals(mockUserInfo.getNickname(), capturedUser.getNickname());
        assertEquals(role.getCode(), capturedUser.getRole());
    }

    @Test
    @DisplayName("Should return users with specific role for enterprise")
    void listByRole_WithValidRoleAndEnterpriseId_ShouldReturnFilteredUsers() {
        // Given
        Long enterpriseId = 100L;
        EnterpriseRoleEnum role = EnterpriseRoleEnum.OFFICER;
        List<EnterpriseUser> filteredUsers = Arrays.asList(mockEnterpriseUser);

        when(enterpriseUserMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(filteredUsers);

        // When
        List<EnterpriseUser> result = enterpriseUserService.listByRole(enterpriseId, role);

        // Then
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(filteredUsers, result);
        verify(enterpriseUserMapper).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    @DisplayName("Should return empty list when no users have specified role")
    void listByRole_WithNoUsersForRole_ShouldReturnEmptyList() {
        // Given
        Long enterpriseId = 100L;
        EnterpriseRoleEnum role = EnterpriseRoleEnum.STAFF;

        when(enterpriseUserMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(Collections.emptyList());

        // When
        List<EnterpriseUser> result = enterpriseUserService.listByRole(enterpriseId, role);

        // Then
        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(enterpriseUserMapper).selectList(any(LambdaQueryWrapper.class));
    }

    @Test
    @DisplayName("Should return correct count for enterprise users")
    void countByEnterpriseId_WithValidEnterpriseId_ShouldReturnCorrectCount() {
        // Given
        Long enterpriseId = 100L;
        Long expectedCount = 5L;

        when(enterpriseUserMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(expectedCount);

        // When
        Long result = enterpriseUserService.countByEnterpriseId(enterpriseId);

        // Then
        assertEquals(expectedCount, result);
        verify(enterpriseUserMapper).selectCount(any(LambdaQueryWrapper.class));
    }

    @Test
    @DisplayName("Should return 0 when no users exist for enterprise")
    void countByEnterpriseId_WithNoUsers_ShouldReturnZero() {
        // Given
        Long enterpriseId = 999L;

        when(enterpriseUserMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(0L);

        // When
        Long result = enterpriseUserService.countByEnterpriseId(enterpriseId);

        // Then
        assertEquals(0L, result);
        verify(enterpriseUserMapper).selectCount(any(LambdaQueryWrapper.class));
    }

    @Test
    @DisplayName("Should return paged results with user details for valid enterprise")
    void page_WithValidEnterpriseId_ShouldReturnPagedResults() {
        // Given
        Long enterpriseId = 100L;

        try (MockedStatic<EnterpriseInfoUtil> mockedStatic = mockStatic(EnterpriseInfoUtil.class)) {
            mockedStatic.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(enterpriseId);
            when(enterpriseUserMapper.selectVOPageByParam(any(Page.class), eq(enterpriseId),
                    eq("Test"), eq(EnterpriseRoleEnum.OFFICER.getCode()))).thenReturn(mockVOPage);
            when(userInfoDataService.findByUid("test-uid")).thenReturn(Optional.of(mockUserInfo));

            // When
            Page<EnterpriseUserVO> result = enterpriseUserService.page(mockParam);

            // Then
            assertNotNull(result);
            assertEquals(1L, result.getTotal());
            assertEquals(1, result.getRecords().size());

            EnterpriseUserVO vo = result.getRecords().get(0);
            assertEquals("testuser", vo.getUsername());
            assertEquals("Test User", vo.getNickname());

            verify(enterpriseUserMapper).selectVOPageByParam(any(Page.class), eq(enterpriseId),
                    eq("Test"), eq(EnterpriseRoleEnum.OFFICER.getCode()));
            verify(userInfoDataService).findByUid("test-uid");
        }
    }

    @Test
    @DisplayName("Should return empty page when enterprise ID is null")
    void page_WithNullEnterpriseId_ShouldReturnEmptyPage() {
        // Given
        try (MockedStatic<EnterpriseInfoUtil> mockedStatic = mockStatic(EnterpriseInfoUtil.class)) {
            mockedStatic.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(null);

            // When
            Page<EnterpriseUserVO> result = enterpriseUserService.page(mockParam);

            // Then
            assertNotNull(result);
            assertEquals(1L, result.getCurrent());
            assertEquals(10L, result.getSize());
            assertTrue(result.getRecords().isEmpty());

            verify(enterpriseUserMapper, never()).selectVOPageByParam(any(), any(), any(), any());
        }
    }

    @Test
    @DisplayName("Should handle page method with null parameters gracefully")
    void page_WithNullParameters_ShouldHandleGracefully() {
        // Given
        Long enterpriseId = 100L;
        EnterpriseUserParam nullParam = new EnterpriseUserParam();
        nullParam.setPageNum(1);
        nullParam.setPageSize(10);
        nullParam.setNickname(null);
        nullParam.setRole(null);

        try (MockedStatic<EnterpriseInfoUtil> mockedStatic = mockStatic(EnterpriseInfoUtil.class)) {
            mockedStatic.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(enterpriseId);
            when(enterpriseUserMapper.selectVOPageByParam(any(Page.class), eq(enterpriseId),
                    isNull(), isNull())).thenReturn(mockVOPage);
            when(userInfoDataService.findByUid("test-uid")).thenReturn(Optional.of(mockUserInfo));

            // When
            Page<EnterpriseUserVO> result = enterpriseUserService.page(nullParam);

            // Then
            assertNotNull(result);
            assertEquals(1L, result.getTotal());
            verify(enterpriseUserMapper).selectVOPageByParam(any(Page.class), eq(enterpriseId), isNull(), isNull());
        }
    }

    @Test
    @DisplayName("Should handle user info not found gracefully in page method")
    void page_WithUserInfoNotFound_ShouldThrowException() {
        // Given
        Long enterpriseId = 100L;

        try (MockedStatic<EnterpriseInfoUtil> mockedStatic = mockStatic(EnterpriseInfoUtil.class)) {
            mockedStatic.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(enterpriseId);
            when(enterpriseUserMapper.selectVOPageByParam(any(Page.class), eq(enterpriseId),
                    eq("Test"), eq(EnterpriseRoleEnum.OFFICER.getCode()))).thenReturn(mockVOPage);
            when(userInfoDataService.findByUid("test-uid")).thenReturn(Optional.empty());

            // When & Then
            assertThrows(NoSuchElementException.class, () -> {
                enterpriseUserService.page(mockParam);
            });
        }
    }

    @Test
    @DisplayName("Should remove enterprise user by ID successfully")
    void removeById_WithValidEntity_ShouldReturnTrue() {
        // Given
        when(enterpriseUserMapper.deleteById(any())).thenReturn(1);

        // When
        boolean result = enterpriseUserService.removeById(mockEnterpriseUser);

        // Then
        assertTrue(result);
        verify(enterpriseUserMapper).deleteById(any());
    }

    @Test
    @DisplayName("Should return false when remove by ID fails")
    void removeById_WhenRemoveFails_ShouldReturnFalse() {
        // Given
        when(enterpriseUserMapper.deleteById(any())).thenReturn(0);

        // When
        boolean result = enterpriseUserService.removeById(mockEnterpriseUser);

        // Then
        assertFalse(result);
        verify(enterpriseUserMapper).deleteById(any());
    }

    @Test
    @DisplayName("Should update enterprise user by ID successfully")
    void updateById_WithValidEntity_ShouldReturnTrue() {
        // Given
        when(enterpriseUserMapper.updateById(any(EnterpriseUser.class))).thenReturn(1);

        // When
        boolean result = enterpriseUserService.updateById(mockEnterpriseUser);

        // Then
        assertTrue(result);
        verify(enterpriseUserMapper).updateById(any(EnterpriseUser.class));
    }

    @Test
    @DisplayName("Should return false when update by ID fails")
    void updateById_WhenUpdateFails_ShouldReturnFalse() {
        // Given
        when(enterpriseUserMapper.updateById(any(EnterpriseUser.class))).thenReturn(0);

        // When
        boolean result = enterpriseUserService.updateById(mockEnterpriseUser);

        // Then
        assertFalse(result);
        verify(enterpriseUserMapper).updateById(any(EnterpriseUser.class));
    }

    @Test
    @DisplayName("Should handle null entity in removeById gracefully")
    void removeById_WithNullEntity_ShouldHandleGracefully() {
        // Given
        when(enterpriseUserMapper.deleteById(null)).thenReturn(0);

        // When
        boolean result = enterpriseUserService.removeById(null);

        // Then
        assertFalse(result);
        verify(enterpriseUserMapper).deleteById(null);
    }

    @Test
    @DisplayName("Should handle null entity in updateById gracefully")
    void updateById_WithNullEntity_ShouldHandleGracefully() {
        // Given
        when(enterpriseUserMapper.updateById((EnterpriseUser) null)).thenReturn(0);

        // When
        boolean result = enterpriseUserService.updateById(null);

        // Then
        assertFalse(result);
        verify(enterpriseUserMapper).updateById((EnterpriseUser) null);
    }

    @Test
    @DisplayName("Should verify service implements interface correctly")
    void verifyServiceImplementsInterfaceCorrectly() {
        // Given & When & Then
        assertTrue(enterpriseUserService instanceof com.iflytek.astron.console.commons.service.space.EnterpriseUserService,
                "Service should implement EnterpriseUserService interface");

        assertTrue(enterpriseUserService instanceof com.baomidou.mybatisplus.extension.service.impl.ServiceImpl,
                "Service should extend MyBatis-Plus ServiceImpl");
    }

    @Test
    @DisplayName("Should verify all interface methods are implemented")
    void verifyAllInterfaceMethodsAreImplemented() {
        // Test that all methods from the interface are properly implemented
        assertDoesNotThrow(() -> {
            // Verify getEnterpriseUserByUid method
            java.lang.reflect.Method method = enterpriseUserService.getClass()
                    .getMethod("getEnterpriseUserByUid", Long.class, String.class);
            assertNotNull(method);
            assertEquals(EnterpriseUser.class, method.getReturnType());

            // Verify countByEnterpriseIdAndUids method
            method = enterpriseUserService.getClass()
                    .getMethod("countByEnterpriseIdAndUids", Long.class, List.class);
            assertNotNull(method);
            assertEquals(Long.class, method.getReturnType());

            // Verify listByEnterpriseId method
            method = enterpriseUserService.getClass()
                    .getMethod("listByEnterpriseId", Long.class);
            assertNotNull(method);
            assertEquals(List.class, method.getReturnType());

            // Verify addEnterpriseUser method
            method = enterpriseUserService.getClass()
                    .getMethod("addEnterpriseUser", Long.class, String.class, EnterpriseRoleEnum.class);
            assertNotNull(method);
            assertEquals(boolean.class, method.getReturnType());

            // Verify listByRole method
            method = enterpriseUserService.getClass()
                    .getMethod("listByRole", Long.class, EnterpriseRoleEnum.class);
            assertNotNull(method);
            assertEquals(List.class, method.getReturnType());

            // Verify countByEnterpriseId method
            method = enterpriseUserService.getClass()
                    .getMethod("countByEnterpriseId", Long.class);
            assertNotNull(method);
            assertEquals(Long.class, method.getReturnType());

            // Verify page method
            method = enterpriseUserService.getClass()
                    .getMethod("page", EnterpriseUserParam.class);
            assertNotNull(method);
            assertEquals(Page.class, method.getReturnType());
        });
    }

    @Test
    @DisplayName("Should test various roles with addEnterpriseUser method")
    void addEnterpriseUser_WithDifferentRoles_ShouldHandleCorrectly() {
        // Test with different enterprise roles
        EnterpriseRoleEnum[] roles = {
                EnterpriseRoleEnum.OFFICER,
                EnterpriseRoleEnum.GOVERNOR,
                EnterpriseRoleEnum.STAFF
        };

        Long enterpriseId = 100L;
        String uid = "role-test-uid";

        when(enterpriseUserMapper.selectByUidAndEnterpriseId(uid, enterpriseId)).thenReturn(null);
        when(userInfoDataService.findByUid(uid)).thenReturn(Optional.of(mockUserInfo));
        when(enterpriseUserMapper.insert(any(EnterpriseUser.class))).thenReturn(1);

        for (EnterpriseRoleEnum role : roles) {
            // When
            boolean result = enterpriseUserService.addEnterpriseUser(enterpriseId, uid, role);

            // Then
            assertTrue(result, "Should successfully add user with role: " + role.name());
        }

        // Verify all role insertions were attempted
        verify(enterpriseUserMapper, times(roles.length)).insert(any(EnterpriseUser.class));
    }

    @Test
    @DisplayName("Should handle large lists in countByEnterpriseIdAndUids")
    void countByEnterpriseIdAndUids_WithLargeUidList_ShouldHandleCorrectly() {
        // Given
        Long enterpriseId = 100L;
        List<String> largeUidList = new ArrayList<>();
        for (int i = 0; i < 1000; i++) {
            largeUidList.add("uid-" + i);
        }

        when(enterpriseUserMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(500L);

        // When
        Long result = enterpriseUserService.countByEnterpriseIdAndUids(enterpriseId, largeUidList);

        // Then
        assertEquals(500L, result);
        verify(enterpriseUserMapper).selectCount(any(LambdaQueryWrapper.class));
    }

    @Test
    @DisplayName("Should test page method with different page sizes")
    void page_WithDifferentPageSizes_ShouldHandleCorrectly() {
        // Given
        Long enterpriseId = 100L;
        int[] pageSizes = {5, 10, 20, 50, 100};

        try (MockedStatic<EnterpriseInfoUtil> mockedStatic = mockStatic(EnterpriseInfoUtil.class)) {
            mockedStatic.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(enterpriseId);

            for (int pageSize : pageSizes) {
                EnterpriseUserParam testParam = new EnterpriseUserParam();
                testParam.setPageNum(1);
                testParam.setPageSize(pageSize);

                Page<EnterpriseUserVO> testPage = new Page<>();
                testPage.setSize(pageSize);
                testPage.setCurrent(1);
                testPage.setRecords(Collections.emptyList());

                when(enterpriseUserMapper.selectVOPageByParam(any(Page.class), eq(enterpriseId),
                        isNull(), isNull())).thenReturn(testPage);

                // When
                Page<EnterpriseUserVO> result = enterpriseUserService.page(testParam);

                // Then
                assertEquals(pageSize, result.getSize(), "Page size should match for size: " + pageSize);
            }
        }
    }
}
