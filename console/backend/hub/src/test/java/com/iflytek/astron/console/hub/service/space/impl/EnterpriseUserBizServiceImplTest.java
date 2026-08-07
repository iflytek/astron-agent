package com.iflytek.astron.console.hub.service.space.impl;

import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.dto.space.SpaceVO;
import com.iflytek.astron.console.commons.dto.space.UserLimitVO;
import com.iflytek.astron.console.commons.entity.space.Enterprise;
import com.iflytek.astron.console.commons.entity.space.EnterpriseUser;
import com.iflytek.astron.console.commons.enums.space.EnterpriseRoleEnum;
import com.iflytek.astron.console.commons.enums.space.EnterpriseServiceTypeEnum;
import com.iflytek.astron.console.commons.enums.space.SpaceRoleEnum;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.commons.service.space.*;
import com.iflytek.astron.console.commons.util.RequestContextUtil;
import com.iflytek.astron.console.commons.util.space.EnterpriseInfoUtil;
import com.iflytek.astron.console.hub.properties.SpaceLimitProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for EnterpriseUserBizServiceImpl Tests all public methods with comprehensive coverage
 * of success and failure scenarios
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("EnterpriseUserBizServiceImpl Unit Tests")
class EnterpriseUserBizServiceImplTest {

    @Mock
    private SpaceUserService spaceUserService;

    @Mock
    private SpaceService spaceService;

    @Mock
    private EnterpriseService enterpriseService;

    @Mock
    private SpaceLimitProperties spaceLimitProperties;

    @Mock
    private InviteRecordService inviteRecordService;

    @Mock
    private EnterpriseSpaceService enterpriseSpaceService;

    @Mock
    private EnterpriseUserService enterpriseUserService;

    @InjectMocks
    private EnterpriseUserBizServiceImpl enterpriseUserBizService;

    private static final String TEST_UID = "test-uid-123";
    private static final String CURRENT_USER_UID = "current-user-uid";
    private static final Long TEST_ENTERPRISE_ID = 1L;
    private static final Long TEST_SPACE_ID = 100L;

    private Enterprise testEnterprise;
    private EnterpriseUser testEnterpriseUser;
    private EnterpriseUser officerUser;
    private SpaceVO testSpaceVO;
    private SpaceLimitProperties.SpaceLimit enterpriseLimit;
    private SpaceLimitProperties.SpaceLimit teamLimit;

    @BeforeEach
    void setUp() {
        // Initialize test enterprise
        testEnterprise = new Enterprise();
        testEnterprise.setId(TEST_ENTERPRISE_ID);
        testEnterprise.setServiceType(EnterpriseServiceTypeEnum.ENTERPRISE.getCode());

        // Initialize test enterprise user (regular member)
        testEnterpriseUser = EnterpriseUser.builder()
                .id(1L)
                .enterpriseId(TEST_ENTERPRISE_ID)
                .uid(TEST_UID)
                .role(EnterpriseRoleEnum.STAFF.getCode())
                .createTime(LocalDateTime.now())
                .build();

        // Initialize officer user (super admin)
        officerUser = EnterpriseUser.builder()
                .id(2L)
                .enterpriseId(TEST_ENTERPRISE_ID)
                .uid(CURRENT_USER_UID)
                .role(EnterpriseRoleEnum.OFFICER.getCode())
                .createTime(LocalDateTime.now())
                .build();

        // Initialize test space
        testSpaceVO = new SpaceVO();
        testSpaceVO.setId(TEST_SPACE_ID);
        testSpaceVO.setUserRole(SpaceRoleEnum.OWNER.getCode());

        // Initialize space limits
        enterpriseLimit = new SpaceLimitProperties.SpaceLimit();
        enterpriseLimit.setUserCount(100);

        teamLimit = new SpaceLimitProperties.SpaceLimit();
        teamLimit.setUserCount(50);
    }

    // ==================== remove() method tests ====================

    @Test
    @DisplayName("remove - Should successfully remove regular enterprise user")
    void remove_Success_WhenRemovingRegularUser() {
        try (MockedStatic<EnterpriseInfoUtil> mockedEnterpriseInfo = mockStatic(EnterpriseInfoUtil.class)) {
            // Arrange
            mockedEnterpriseInfo.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);
            when(enterpriseUserService.getEnterpriseUserByUid(TEST_ENTERPRISE_ID, TEST_UID))
                    .thenReturn(testEnterpriseUser);
            when(spaceService.listByEnterpriseIdAndUid(TEST_ENTERPRISE_ID, TEST_UID))
                    .thenReturn(Collections.emptyList());
            when(enterpriseUserService.removeById(testEnterpriseUser)).thenReturn(true);

            // Act
            ApiResult<String> result = enterpriseUserBizService.remove(TEST_UID);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            verify(enterpriseUserService).getEnterpriseUserByUid(TEST_ENTERPRISE_ID, TEST_UID);
            verify(enterpriseUserService).removeById(testEnterpriseUser);
            verify(enterpriseSpaceService).clearEnterpriseUserCache(TEST_ENTERPRISE_ID, TEST_UID);
        }
    }

    @Test
    @DisplayName("remove - Should return error when user not found in enterprise")
    void remove_Error_WhenUserNotInEnterprise() {
        try (MockedStatic<EnterpriseInfoUtil> mockedEnterpriseInfo = mockStatic(EnterpriseInfoUtil.class)) {
            // Arrange
            mockedEnterpriseInfo.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);
            when(enterpriseUserService.getEnterpriseUserByUid(TEST_ENTERPRISE_ID, TEST_UID)).thenReturn(null);

            // Act
            ApiResult<String> result = enterpriseUserBizService.remove(TEST_UID);

            // Assert
            assertNotNull(result);
            assertNotEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertEquals(ResponseEnum.ENTERPRISE_TEAM_USER_NOT_IN_TEAM.getCode(), result.code());
            verify(enterpriseUserService).getEnterpriseUserByUid(TEST_ENTERPRISE_ID, TEST_UID);
            verifyNoMoreInteractions(enterpriseUserService);
        }
    }

    @Test
    @DisplayName("remove - Should return error when trying to remove super admin")
    void remove_Error_WhenTryingToRemoveSuperAdmin() {
        try (MockedStatic<EnterpriseInfoUtil> mockedEnterpriseInfo = mockStatic(EnterpriseInfoUtil.class)) {
            // Arrange
            mockedEnterpriseInfo.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);
            when(enterpriseUserService.getEnterpriseUserByUid(TEST_ENTERPRISE_ID, TEST_UID))
                    .thenReturn(officerUser);

            // Act
            ApiResult<String> result = enterpriseUserBizService.remove(TEST_UID);

            // Assert
            assertNotNull(result);
            assertNotEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertEquals(ResponseEnum.ENTERPRISE_TEAM_SUPER_ADMIN_CANNOT_BE_REMOVED.getCode(), result.code());
            verify(enterpriseUserService).getEnterpriseUserByUid(TEST_ENTERPRISE_ID, TEST_UID);
            verify(enterpriseUserService, never()).removeById(any());
        }
    }

    @Test
    @DisplayName("remove - Should return error when removal fails")
    void remove_Error_WhenRemovalFails() {
        try (MockedStatic<EnterpriseInfoUtil> mockedEnterpriseInfo = mockStatic(EnterpriseInfoUtil.class)) {
            // Arrange
            mockedEnterpriseInfo.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);
            when(enterpriseUserService.getEnterpriseUserByUid(TEST_ENTERPRISE_ID, TEST_UID))
                    .thenReturn(testEnterpriseUser);
            when(spaceService.listByEnterpriseIdAndUid(TEST_ENTERPRISE_ID, TEST_UID))
                    .thenReturn(Collections.emptyList());
            when(enterpriseUserService.removeById(testEnterpriseUser)).thenReturn(false);

            // Act
            ApiResult<String> result = enterpriseUserBizService.remove(TEST_UID);

            // Assert
            assertNotNull(result);
            assertNotEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertEquals(ResponseEnum.ENTERPRISE_TEAM_REMOVE_USER_FAILED.getCode(), result.code());
            verify(enterpriseUserService).removeById(testEnterpriseUser);
        }
    }

    @Test
    @DisplayName("remove - Should handle user with spaces ownership transfer")
    void remove_Success_WhenUserHasSpaces() {
        try (MockedStatic<EnterpriseInfoUtil> mockedEnterpriseInfo = mockStatic(EnterpriseInfoUtil.class)) {
            // Arrange
            List<SpaceVO> userSpaces = Arrays.asList(testSpaceVO);
            mockedEnterpriseInfo.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);
            when(enterpriseUserService.getEnterpriseUserByUid(TEST_ENTERPRISE_ID, TEST_UID))
                    .thenReturn(testEnterpriseUser);
            when(spaceService.listByEnterpriseIdAndUid(TEST_ENTERPRISE_ID, TEST_UID)).thenReturn(userSpaces);
            when(enterpriseService.getUidByEnterpriseId(TEST_ENTERPRISE_ID)).thenReturn("admin-uid");
            when(enterpriseUserService.removeById(testEnterpriseUser)).thenReturn(true);

            // Act
            ApiResult<String> result = enterpriseUserBizService.remove(TEST_UID);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            verify(spaceUserService).addSpaceUser(TEST_SPACE_ID, "admin-uid", SpaceRoleEnum.OWNER);
            verify(spaceUserService).removeByUid(any(Set.class), eq(TEST_UID));
            verify(enterpriseUserService).removeById(testEnterpriseUser);
        }
    }

    // ==================== updateRole() method tests ====================

    @Test
    @DisplayName("updateRole - Should successfully update user role")
    void updateRole_Success_WhenValidRole() {
        try (MockedStatic<EnterpriseInfoUtil> mockedEnterpriseInfo = mockStatic(EnterpriseInfoUtil.class)) {
            // Arrange
            Integer newRole = EnterpriseRoleEnum.GOVERNOR.getCode();
            mockedEnterpriseInfo.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);
            when(enterpriseUserService.getEnterpriseUserByUid(TEST_ENTERPRISE_ID, TEST_UID))
                    .thenReturn(testEnterpriseUser);
            when(enterpriseUserService.updateById(testEnterpriseUser)).thenReturn(true);

            // Act
            ApiResult<String> result = enterpriseUserBizService.updateRole(TEST_UID, newRole);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertEquals(newRole, testEnterpriseUser.getRole());
            verify(enterpriseUserService).updateById(testEnterpriseUser);
        }
    }

    @Test
    @DisplayName("updateRole - Should return error when enterprise ID is null")
    void updateRole_Error_WhenEnterpriseIdIsNull() {
        try (MockedStatic<EnterpriseInfoUtil> mockedEnterpriseInfo = mockStatic(EnterpriseInfoUtil.class)) {
            // Arrange
            mockedEnterpriseInfo.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(null);

            // Act
            ApiResult<String> result = enterpriseUserBizService.updateRole(TEST_UID, EnterpriseRoleEnum.GOVERNOR.getCode());

            // Assert
            assertNotNull(result);
            assertNotEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertEquals(ResponseEnum.SPACE_APPLICATION_PLEASE_JOIN_ENTERPRISE_FIRST.getCode(), result.code());
            verifyNoInteractions(enterpriseUserService);
        }
    }

    @Test
    @DisplayName("updateRole - Should return error when user not in enterprise")
    void updateRole_Error_WhenUserNotInEnterprise() {
        try (MockedStatic<EnterpriseInfoUtil> mockedEnterpriseInfo = mockStatic(EnterpriseInfoUtil.class)) {
            // Arrange
            mockedEnterpriseInfo.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);
            when(enterpriseUserService.getEnterpriseUserByUid(TEST_ENTERPRISE_ID, TEST_UID)).thenReturn(null);

            // Act
            ApiResult<String> result = enterpriseUserBizService.updateRole(TEST_UID, EnterpriseRoleEnum.GOVERNOR.getCode());

            // Assert
            assertNotNull(result);
            assertNotEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertEquals(ResponseEnum.ENTERPRISE_TEAM_USER_NOT_IN_TEAM.getCode(), result.code());
            verify(enterpriseUserService).getEnterpriseUserByUid(TEST_ENTERPRISE_ID, TEST_UID);
        }
    }

    @Test
    @DisplayName("updateRole - Should return error when role is invalid")
    void updateRole_Error_WhenRoleIsInvalid() {
        try (MockedStatic<EnterpriseInfoUtil> mockedEnterpriseInfo = mockStatic(EnterpriseInfoUtil.class)) {
            // Arrange
            Integer invalidRole = 999;
            mockedEnterpriseInfo.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);
            when(enterpriseUserService.getEnterpriseUserByUid(TEST_ENTERPRISE_ID, TEST_UID))
                    .thenReturn(testEnterpriseUser);

            // Act
            ApiResult<String> result = enterpriseUserBizService.updateRole(TEST_UID, invalidRole);

            // Assert
            assertNotNull(result);
            assertNotEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertEquals(ResponseEnum.ENTERPRISE_TEAM_ROLE_TYPE_INCORRECT.getCode(), result.code());
            verify(enterpriseUserService, never()).updateById(any());
        }
    }

    @Test
    @DisplayName("updateRole - Should return error and clear cache when update fails")
    void updateRole_Error_WhenUpdateFails() {
        try (MockedStatic<EnterpriseInfoUtil> mockedEnterpriseInfo = mockStatic(EnterpriseInfoUtil.class)) {
            // Arrange
            Integer newRole = EnterpriseRoleEnum.GOVERNOR.getCode();
            mockedEnterpriseInfo.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);
            when(enterpriseUserService.getEnterpriseUserByUid(TEST_ENTERPRISE_ID, TEST_UID))
                    .thenReturn(testEnterpriseUser);
            when(enterpriseUserService.updateById(testEnterpriseUser)).thenReturn(false);

            // Act
            ApiResult<String> result = enterpriseUserBizService.updateRole(TEST_UID, newRole);

            // Assert
            assertNotNull(result);
            assertNotEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertEquals(ResponseEnum.ENTERPRISE_TEAM_UPDATE_ROLE_FAILED.getCode(), result.code());
            verify(enterpriseSpaceService).clearEnterpriseUserCache(TEST_ENTERPRISE_ID, TEST_UID);
        }
    }

    // ==================== quitEnterprise() method tests ====================

    @Test
    @DisplayName("quitEnterprise - Should successfully quit enterprise for regular user")
    void quitEnterprise_Success_WhenRegularUser() {
        try (MockedStatic<EnterpriseInfoUtil> mockedEnterpriseInfo = mockStatic(EnterpriseInfoUtil.class);
                MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {

            // Arrange
            mockedEnterpriseInfo.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(TEST_UID);
            when(enterpriseUserService.getEnterpriseUserByUid(TEST_ENTERPRISE_ID, TEST_UID))
                    .thenReturn(testEnterpriseUser);
            when(spaceService.listByEnterpriseIdAndUid(TEST_ENTERPRISE_ID, TEST_UID))
                    .thenReturn(Collections.emptyList());
            when(enterpriseUserService.removeById(testEnterpriseUser)).thenReturn(true);

            // Act
            ApiResult<String> result = enterpriseUserBizService.quitEnterprise();

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            verify(enterpriseUserService).removeById(testEnterpriseUser);
        }
    }

    @Test
    @DisplayName("quitEnterprise - Should return error when super admin tries to quit")
    void quitEnterprise_Error_WhenSuperAdminTriesToQuit() {
        try (MockedStatic<EnterpriseInfoUtil> mockedEnterpriseInfo = mockStatic(EnterpriseInfoUtil.class);
                MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {

            // Arrange
            mockedEnterpriseInfo.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(CURRENT_USER_UID);
            when(enterpriseUserService.getEnterpriseUserByUid(TEST_ENTERPRISE_ID, CURRENT_USER_UID))
                    .thenReturn(officerUser);

            // Act
            ApiResult<String> result = enterpriseUserBizService.quitEnterprise();

            // Assert
            assertNotNull(result);
            assertNotEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertEquals(ResponseEnum.ENTERPRISE_TEAM_SUPER_ADMIN_CANNOT_LEAVE_TEAM.getCode(), result.code());
            verify(enterpriseUserService, never()).removeById(any());
        }
    }

    @Test
    @DisplayName("quitEnterprise - Should return error and clear cache when quit fails")
    void quitEnterprise_Error_WhenQuitFails() {
        try (MockedStatic<EnterpriseInfoUtil> mockedEnterpriseInfo = mockStatic(EnterpriseInfoUtil.class);
                MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {

            // Arrange
            mockedEnterpriseInfo.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(TEST_UID);
            when(enterpriseUserService.getEnterpriseUserByUid(TEST_ENTERPRISE_ID, TEST_UID))
                    .thenReturn(testEnterpriseUser);
            when(spaceService.listByEnterpriseIdAndUid(TEST_ENTERPRISE_ID, TEST_UID))
                    .thenReturn(Collections.emptyList());
            when(enterpriseUserService.removeById(testEnterpriseUser)).thenReturn(false);

            // Act
            ApiResult<String> result = enterpriseUserBizService.quitEnterprise();

            // Assert
            assertNotNull(result);
            assertNotEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertEquals(ResponseEnum.ENTERPRISE_TEAM_LEAVE_FAILED.getCode(), result.code());
            verify(enterpriseSpaceService).clearEnterpriseUserCache(TEST_ENTERPRISE_ID, TEST_UID);
        }
    }

    // ==================== getUserLimit() method tests ====================

    @Test
    @DisplayName("getUserLimit - Should return enterprise user limits")
    void getUserLimit_Success_WhenEnterpriseType() {
        // Arrange
        when(enterpriseService.getEnterpriseById(TEST_ENTERPRISE_ID)).thenReturn(testEnterprise);
        when(spaceLimitProperties.getEnterprise()).thenReturn(enterpriseLimit);
        when(enterpriseUserService.countByEnterpriseId(TEST_ENTERPRISE_ID)).thenReturn(20L);
        when(inviteRecordService.countJoiningByEnterpriseId(TEST_ENTERPRISE_ID)).thenReturn(5L);

        // Act
        UserLimitVO result = enterpriseUserBizService.getUserLimit(TEST_ENTERPRISE_ID);

        // Assert
        assertNotNull(result);
        assertEquals(100, result.getTotal());
        assertEquals(25, result.getUsed()); // 20 + 5
        assertEquals(75, result.getRemain()); // 100 - 25
        verify(enterpriseService).getEnterpriseById(TEST_ENTERPRISE_ID);
        verify(spaceLimitProperties).getEnterprise();
    }

    @Test
    @DisplayName("getUserLimit - Should return team user limits")
    void getUserLimit_Success_WhenTeamType() {
        // Arrange
        testEnterprise.setServiceType(EnterpriseServiceTypeEnum.TEAM.getCode());
        when(enterpriseService.getEnterpriseById(TEST_ENTERPRISE_ID)).thenReturn(testEnterprise);
        when(spaceLimitProperties.getTeam()).thenReturn(teamLimit);
        when(enterpriseUserService.countByEnterpriseId(TEST_ENTERPRISE_ID)).thenReturn(15L);
        when(inviteRecordService.countJoiningByEnterpriseId(TEST_ENTERPRISE_ID)).thenReturn(3L);

        // Act
        UserLimitVO result = enterpriseUserBizService.getUserLimit(TEST_ENTERPRISE_ID);

        // Assert
        assertNotNull(result);
        assertEquals(50, result.getTotal());
        assertEquals(18, result.getUsed()); // 15 + 3
        assertEquals(32, result.getRemain()); // 50 - 18
        verify(spaceLimitProperties).getTeam();
    }

    @Test
    @DisplayName("getUserLimit - Should return zero limits for unknown service type")
    void getUserLimit_Success_WhenUnknownServiceType() {
        // Arrange
        testEnterprise.setServiceType(999); // Unknown type
        when(enterpriseService.getEnterpriseById(TEST_ENTERPRISE_ID)).thenReturn(testEnterprise);
        when(enterpriseUserService.countByEnterpriseId(TEST_ENTERPRISE_ID)).thenReturn(10L);
        when(inviteRecordService.countJoiningByEnterpriseId(TEST_ENTERPRISE_ID)).thenReturn(2L);

        // Act
        UserLimitVO result = enterpriseUserBizService.getUserLimit(TEST_ENTERPRISE_ID);

        // Assert
        assertNotNull(result);
        assertEquals(0, result.getTotal());
        assertEquals(12, result.getUsed()); // 10 + 2
        assertEquals(-12, result.getRemain()); // 0 - 12
        verifyNoInteractions(spaceLimitProperties);
    }

    @Test
    @DisplayName("getUserLimit - Should handle zero counts")
    void getUserLimit_Success_WhenZeroCounts() {
        // Arrange
        when(enterpriseService.getEnterpriseById(TEST_ENTERPRISE_ID)).thenReturn(testEnterprise);
        when(spaceLimitProperties.getEnterprise()).thenReturn(enterpriseLimit);
        when(enterpriseUserService.countByEnterpriseId(TEST_ENTERPRISE_ID)).thenReturn(0L);
        when(inviteRecordService.countJoiningByEnterpriseId(TEST_ENTERPRISE_ID)).thenReturn(0L);

        // Act
        UserLimitVO result = enterpriseUserBizService.getUserLimit(TEST_ENTERPRISE_ID);

        // Assert
        assertNotNull(result);
        assertEquals(100, result.getTotal());
        assertEquals(0, result.getUsed());
        assertEquals(100, result.getRemain());
    }
}
