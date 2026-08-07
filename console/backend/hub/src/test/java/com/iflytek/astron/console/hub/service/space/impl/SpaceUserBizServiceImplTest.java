package com.iflytek.astron.console.hub.service.space.impl;

import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.dto.space.UserLimitVO;
import com.iflytek.astron.console.commons.entity.space.Enterprise;
import com.iflytek.astron.console.commons.entity.space.EnterpriseUser;
import com.iflytek.astron.console.commons.entity.space.Space;
import com.iflytek.astron.console.commons.entity.space.SpaceUser;
import com.iflytek.astron.console.commons.enums.space.EnterpriseServiceTypeEnum;
import com.iflytek.astron.console.commons.enums.space.SpaceRoleEnum;
import com.iflytek.astron.console.commons.enums.space.SpaceTypeEnum;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.commons.service.space.*;
import com.iflytek.astron.console.commons.util.RequestContextUtil;
import com.iflytek.astron.console.commons.util.space.OrderInfoUtil;
import com.iflytek.astron.console.commons.util.space.SpaceInfoUtil;
import com.iflytek.astron.console.hub.properties.SpaceLimitProperties;
import com.iflytek.astron.console.hub.service.space.EnterpriseUserBizService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for SpaceUserBizServiceImpl Tests all public methods with comprehensive coverage of
 * success and failure scenarios
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("SpaceUserBizServiceImpl Unit Tests")
class SpaceUserBizServiceImplTest {

    @Mock
    private EnterpriseUserService enterpriseUserService;
    @Mock
    private SpaceService spaceService;
    @Mock
    private SpaceLimitProperties spaceLimitProperties;
    @Mock
    private InviteRecordService inviteRecordService;
    @Mock
    private EnterpriseSpaceService enterpriseSpaceService;
    @Mock
    private SpaceUserService spaceUserService;
    @Mock
    private EnterpriseUserBizService enterpriseUserBizService;
    @Mock
    private EnterpriseService enterpriseService;

    @InjectMocks
    private SpaceUserBizServiceImpl spaceUserBizService;

    private static final String TEST_UID = "test-uid-123";
    private static final String CURRENT_USER_UID = "current-user-uid";
    private static final Long TEST_SPACE_ID = 100L;
    private static final Long TEST_ENTERPRISE_ID = 1L;
    private static final Integer ADMIN_ROLE = SpaceRoleEnum.ADMIN.getCode();
    private static final Integer MEMBER_ROLE = SpaceRoleEnum.MEMBER.getCode();
    private static final Integer OWNER_ROLE = SpaceRoleEnum.OWNER.getCode();

    private Space testSpace;
    private Space enterpriseSpace;
    private Enterprise testEnterprise;
    private SpaceUser testSpaceUser;
    private SpaceUser ownerSpaceUser;
    private EnterpriseUser testEnterpriseUser;
    private SpaceLimitProperties.SpaceLimit spaceLimit;

    @BeforeEach
    void setUp() {
        // Initialize test space (personal space)
        testSpace = new Space();
        testSpace.setId(TEST_SPACE_ID);
        testSpace.setName("Test Space");
        testSpace.setUid(TEST_UID);
        testSpace.setType(SpaceTypeEnum.FREE.getCode());
        testSpace.setEnterpriseId(null);

        // Initialize enterprise space
        enterpriseSpace = new Space();
        enterpriseSpace.setId(TEST_SPACE_ID);
        enterpriseSpace.setName("Enterprise Space");
        enterpriseSpace.setUid(TEST_UID);
        enterpriseSpace.setType(SpaceTypeEnum.ENTERPRISE.getCode());
        enterpriseSpace.setEnterpriseId(TEST_ENTERPRISE_ID);

        // Initialize test enterprise
        testEnterprise = new Enterprise();
        testEnterprise.setId(TEST_ENTERPRISE_ID);
        testEnterprise.setName("Test Enterprise");
        testEnterprise.setServiceType(EnterpriseServiceTypeEnum.ENTERPRISE.getCode());

        // Initialize test space user
        testSpaceUser = new SpaceUser();
        testSpaceUser.setId(1L);
        testSpaceUser.setSpaceId(TEST_SPACE_ID);
        testSpaceUser.setUid(TEST_UID);
        testSpaceUser.setRole(MEMBER_ROLE);

        // Initialize owner space user
        ownerSpaceUser = new SpaceUser();
        ownerSpaceUser.setId(2L);
        ownerSpaceUser.setSpaceId(TEST_SPACE_ID);
        ownerSpaceUser.setUid(CURRENT_USER_UID);
        ownerSpaceUser.setRole(OWNER_ROLE);

        // Initialize test enterprise user
        testEnterpriseUser = new EnterpriseUser();
        testEnterpriseUser.setId(1L);
        testEnterpriseUser.setEnterpriseId(TEST_ENTERPRISE_ID);
        testEnterpriseUser.setUid(TEST_UID);

        // Initialize space limit
        spaceLimit = new SpaceLimitProperties.SpaceLimit();
        spaceLimit.setUserCount(10);
    }

    // ==================== enterpriseAdd() method tests ====================

    @Test
    @DisplayName("enterpriseAdd - Should successfully add enterprise user to space")
    void enterpriseAdd_Success_WhenValidEnterpriseUser() {
        try (MockedStatic<SpaceInfoUtil> mockedSpaceInfo = mockStatic(SpaceInfoUtil.class)) {
            // Arrange
            mockedSpaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);
            when(spaceService.getSpaceById(TEST_SPACE_ID)).thenReturn(enterpriseSpace);
            when(enterpriseUserService.getEnterpriseUserByUid(TEST_ENTERPRISE_ID, TEST_UID)).thenReturn(testEnterpriseUser);
            when(spaceUserService.getSpaceUserByUid(TEST_SPACE_ID, TEST_UID)).thenReturn(null);
            when(spaceUserService.save(any(SpaceUser.class))).thenReturn(true);

            // Act
            ApiResult result = spaceUserBizService.enterpriseAdd(TEST_UID, ADMIN_ROLE);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            verify(spaceUserService).save(any(SpaceUser.class));
        }
    }

    @Test
    @DisplayName("enterpriseAdd - Should return error when role is invalid")
    void enterpriseAdd_Error_WhenRoleIsInvalid() {
        // Act
        ApiResult result = spaceUserBizService.enterpriseAdd(TEST_UID, 999);

        // Assert
        assertNotNull(result);
        assertEquals(ResponseEnum.SPACE_USER_UNSUPPORTED_ROLE_TYPE.getCode(), result.code());
    }

    @Test
    @DisplayName("enterpriseAdd - Should return error when trying to add owner role")
    void enterpriseAdd_Error_WhenTryingToAddOwnerRole() {
        // Act
        ApiResult result = spaceUserBizService.enterpriseAdd(TEST_UID, OWNER_ROLE);

        // Assert
        assertNotNull(result);
        assertEquals(ResponseEnum.SPACE_USER_UNSUPPORTED_ROLE_TYPE.getCode(), result.code());
    }

    @Test
    @DisplayName("enterpriseAdd - Should return error when space does not exist")
    void enterpriseAdd_Error_WhenSpaceDoesNotExist() {
        try (MockedStatic<SpaceInfoUtil> mockedSpaceInfo = mockStatic(SpaceInfoUtil.class)) {
            // Arrange
            mockedSpaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);
            when(spaceService.getSpaceById(TEST_SPACE_ID)).thenReturn(null);

            // Act
            ApiResult result = spaceUserBizService.enterpriseAdd(TEST_UID, ADMIN_ROLE);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SPACE_NOT_EXISTS.getCode(), result.code());
        }
    }

    @Test
    @DisplayName("enterpriseAdd - Should return error when space is not enterprise space")
    void enterpriseAdd_Error_WhenSpaceIsNotEnterpriseSpace() {
        try (MockedStatic<SpaceInfoUtil> mockedSpaceInfo = mockStatic(SpaceInfoUtil.class)) {
            // Arrange
            mockedSpaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);
            when(spaceService.getSpaceById(TEST_SPACE_ID)).thenReturn(testSpace);

            // Act
            ApiResult result = spaceUserBizService.enterpriseAdd(TEST_UID, ADMIN_ROLE);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SPACE_USER_SPACE_NOT_BELONG_TO_ENTERPRISE.getCode(), result.code());
        }
    }

    @Test
    @DisplayName("enterpriseAdd - Should return error when user is not in enterprise")
    void enterpriseAdd_Error_WhenUserIsNotInEnterprise() {
        try (MockedStatic<SpaceInfoUtil> mockedSpaceInfo = mockStatic(SpaceInfoUtil.class)) {
            // Arrange
            mockedSpaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);
            when(spaceService.getSpaceById(TEST_SPACE_ID)).thenReturn(enterpriseSpace);
            when(enterpriseUserService.getEnterpriseUserByUid(TEST_ENTERPRISE_ID, TEST_UID)).thenReturn(null);

            // Act
            ApiResult result = spaceUserBizService.enterpriseAdd(TEST_UID, ADMIN_ROLE);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SPACE_USER_NOT_IN_ENTERPRISE_TEAM.getCode(), result.code());
        }
    }

    @Test
    @DisplayName("enterpriseAdd - Should return error when user already exists in space")
    void enterpriseAdd_Error_WhenUserAlreadyExistsInSpace() {
        try (MockedStatic<SpaceInfoUtil> mockedSpaceInfo = mockStatic(SpaceInfoUtil.class)) {
            // Arrange
            mockedSpaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);
            when(spaceService.getSpaceById(TEST_SPACE_ID)).thenReturn(enterpriseSpace);
            when(enterpriseUserService.getEnterpriseUserByUid(TEST_ENTERPRISE_ID, TEST_UID)).thenReturn(testEnterpriseUser);
            when(spaceUserService.getSpaceUserByUid(TEST_SPACE_ID, TEST_UID)).thenReturn(testSpaceUser);

            // Act
            ApiResult result = spaceUserBizService.enterpriseAdd(TEST_UID, ADMIN_ROLE);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SPACE_USER_ALREADY_EXISTS.getCode(), result.code());
        }
    }

    @Test
    @DisplayName("enterpriseAdd - Should return error when save fails")
    void enterpriseAdd_Error_WhenSaveFails() {
        try (MockedStatic<SpaceInfoUtil> mockedSpaceInfo = mockStatic(SpaceInfoUtil.class)) {
            // Arrange
            mockedSpaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);
            when(spaceService.getSpaceById(TEST_SPACE_ID)).thenReturn(enterpriseSpace);
            when(enterpriseUserService.getEnterpriseUserByUid(TEST_ENTERPRISE_ID, TEST_UID)).thenReturn(testEnterpriseUser);
            when(spaceUserService.getSpaceUserByUid(TEST_SPACE_ID, TEST_UID)).thenReturn(null);
            when(spaceUserService.save(any(SpaceUser.class))).thenReturn(false);

            // Act
            ApiResult result = spaceUserBizService.enterpriseAdd(TEST_UID, ADMIN_ROLE);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SPACE_USER_ADD_FAILED.getCode(), result.code());
        }
    }

    // ==================== remove() method tests ====================

    @Test
    @DisplayName("remove - Should successfully remove space user")
    void remove_Success_WhenValidSpaceUser() {
        try (MockedStatic<SpaceInfoUtil> mockedSpaceInfo = mockStatic(SpaceInfoUtil.class)) {
            // Arrange
            mockedSpaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);
            when(spaceUserService.getSpaceUserByUid(TEST_SPACE_ID, TEST_UID)).thenReturn(testSpaceUser);
            when(spaceUserService.removeById(testSpaceUser)).thenReturn(true);

            // Act
            ApiResult result = spaceUserBizService.remove(TEST_UID);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            verify(spaceUserService).removeById(testSpaceUser);
            verify(enterpriseSpaceService).clearSpaceUserCache(TEST_SPACE_ID, TEST_UID);
        }
    }

    @Test
    @DisplayName("remove - Should return error when space ID is null")
    void remove_Error_WhenSpaceIdIsNull() {
        try (MockedStatic<SpaceInfoUtil> mockedSpaceInfo = mockStatic(SpaceInfoUtil.class)) {
            // Arrange
            mockedSpaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(null);

            // Act
            ApiResult result = spaceUserBizService.remove(TEST_UID);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SPACE_NOT_EXISTS.getCode(), result.code());
        }
    }

    @Test
    @DisplayName("remove - Should return error when space user does not exist")
    void remove_Error_WhenSpaceUserDoesNotExist() {
        try (MockedStatic<SpaceInfoUtil> mockedSpaceInfo = mockStatic(SpaceInfoUtil.class)) {
            // Arrange
            mockedSpaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);
            when(spaceUserService.getSpaceUserByUid(TEST_SPACE_ID, TEST_UID)).thenReturn(null);

            // Act
            ApiResult result = spaceUserBizService.remove(TEST_UID);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SPACE_USER_NOT_EXISTS.getCode(), result.code());
        }
    }

    @Test
    @DisplayName("remove - Should return error when trying to remove owner")
    void remove_Error_WhenTryingToRemoveOwner() {
        try (MockedStatic<SpaceInfoUtil> mockedSpaceInfo = mockStatic(SpaceInfoUtil.class)) {
            // Arrange
            mockedSpaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);
            when(spaceUserService.getSpaceUserByUid(TEST_SPACE_ID, TEST_UID)).thenReturn(ownerSpaceUser);

            // Act
            ApiResult result = spaceUserBizService.remove(TEST_UID);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SPACE_USER_CANNOT_REMOVE_OWNER.getCode(), result.code());
        }
    }

    @Test
    @DisplayName("remove - Should return error when remove fails")
    void remove_Error_WhenRemoveFails() {
        try (MockedStatic<SpaceInfoUtil> mockedSpaceInfo = mockStatic(SpaceInfoUtil.class)) {
            // Arrange
            mockedSpaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);
            when(spaceUserService.getSpaceUserByUid(TEST_SPACE_ID, TEST_UID)).thenReturn(testSpaceUser);
            when(spaceUserService.removeById(testSpaceUser)).thenReturn(false);

            // Act
            ApiResult result = spaceUserBizService.remove(TEST_UID);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SPACE_USER_REMOVE_FAILED.getCode(), result.code());
        }
    }

    // ==================== updateRole() method tests ====================

    @Test
    @DisplayName("updateRole - Should successfully update space user role")
    void updateRole_Success_WhenValidRoleUpdate() {
        try (MockedStatic<SpaceInfoUtil> mockedSpaceInfo = mockStatic(SpaceInfoUtil.class)) {
            // Arrange
            mockedSpaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);
            when(spaceUserService.getSpaceUserByUid(TEST_SPACE_ID, TEST_UID)).thenReturn(testSpaceUser);
            when(spaceUserService.updateById(testSpaceUser)).thenReturn(true);

            // Act
            ApiResult result = spaceUserBizService.updateRole(TEST_UID, ADMIN_ROLE);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertEquals(ADMIN_ROLE, testSpaceUser.getRole());
            verify(spaceUserService).updateById(testSpaceUser);
            verify(enterpriseSpaceService).clearSpaceUserCache(TEST_SPACE_ID, TEST_UID);
        }
    }

    @Test
    @DisplayName("updateRole - Should return error when role is invalid")
    void updateRole_Error_WhenRoleIsInvalid() {
        // Act
        ApiResult result = spaceUserBizService.updateRole(TEST_UID, 999);

        // Assert
        assertNotNull(result);
        assertEquals(ResponseEnum.SPACE_USER_UNSUPPORTED_ROLE_TYPE.getCode(), result.code());
    }

    @Test
    @DisplayName("updateRole - Should return error when trying to set owner role")
    void updateRole_Error_WhenTryingToSetOwnerRole() {
        // Act
        ApiResult result = spaceUserBizService.updateRole(TEST_UID, OWNER_ROLE);

        // Assert
        assertNotNull(result);
        assertEquals(ResponseEnum.SPACE_USER_UNSUPPORTED_ROLE_TYPE.getCode(), result.code());
    }

    @Test
    @DisplayName("updateRole - Should return error when space does not exist")
    void updateRole_Error_WhenSpaceDoesNotExist() {
        try (MockedStatic<SpaceInfoUtil> mockedSpaceInfo = mockStatic(SpaceInfoUtil.class)) {
            // Arrange
            mockedSpaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(null);

            // Act
            ApiResult result = spaceUserBizService.updateRole(TEST_UID, ADMIN_ROLE);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SPACE_NOT_EXISTS.getCode(), result.code());
        }
    }

    @Test
    @DisplayName("updateRole - Should return error when space user does not exist")
    void updateRole_Error_WhenSpaceUserDoesNotExist() {
        try (MockedStatic<SpaceInfoUtil> mockedSpaceInfo = mockStatic(SpaceInfoUtil.class)) {
            // Arrange
            mockedSpaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);
            when(spaceUserService.getSpaceUserByUid(TEST_SPACE_ID, TEST_UID)).thenReturn(null);

            // Act
            ApiResult result = spaceUserBizService.updateRole(TEST_UID, ADMIN_ROLE);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SPACE_USER_NOT_EXISTS.getCode(), result.code());
        }
    }

    @Test
    @DisplayName("updateRole - Should return error when trying to change owner role")
    void updateRole_Error_WhenTryingToChangeOwnerRole() {
        try (MockedStatic<SpaceInfoUtil> mockedSpaceInfo = mockStatic(SpaceInfoUtil.class)) {
            // Arrange
            mockedSpaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);
            when(spaceUserService.getSpaceUserByUid(TEST_SPACE_ID, TEST_UID)).thenReturn(ownerSpaceUser);

            // Act
            ApiResult result = spaceUserBizService.updateRole(TEST_UID, ADMIN_ROLE);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SPACE_USER_OWNER_ROLE_CANNOT_CHANGE.getCode(), result.code());
        }
    }

    @Test
    @DisplayName("updateRole - Should return error when update fails")
    void updateRole_Error_WhenUpdateFails() {
        try (MockedStatic<SpaceInfoUtil> mockedSpaceInfo = mockStatic(SpaceInfoUtil.class)) {
            // Arrange
            mockedSpaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);
            when(spaceUserService.getSpaceUserByUid(TEST_SPACE_ID, TEST_UID)).thenReturn(testSpaceUser);
            when(spaceUserService.updateById(testSpaceUser)).thenReturn(false);

            // Act
            ApiResult result = spaceUserBizService.updateRole(TEST_UID, ADMIN_ROLE);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.ENTERPRISE_UPDATE_FAILED.getCode(), result.code());
        }
    }

    // ==================== quitSpace() method tests ====================

    @Test
    @DisplayName("quitSpace - Should successfully quit space")
    void quitSpace_Success_WhenNonOwnerUser() {
        try (MockedStatic<SpaceInfoUtil> mockedSpaceInfo = mockStatic(SpaceInfoUtil.class);
                MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {

            // Arrange
            mockedSpaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(TEST_UID);
            when(spaceUserService.getSpaceUserByUid(TEST_SPACE_ID, TEST_UID)).thenReturn(testSpaceUser);
            when(spaceUserService.removeById(testSpaceUser)).thenReturn(true);

            // Act
            ApiResult result = spaceUserBizService.quitSpace();

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            verify(spaceUserService).removeById(testSpaceUser);
        }
    }

    @Test
    @DisplayName("quitSpace - Should return error when owner tries to quit")
    void quitSpace_Error_WhenOwnerTriesToQuit() {
        try (MockedStatic<SpaceInfoUtil> mockedSpaceInfo = mockStatic(SpaceInfoUtil.class);
                MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {

            // Arrange
            mockedSpaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(CURRENT_USER_UID);
            when(spaceUserService.getSpaceUserByUid(TEST_SPACE_ID, CURRENT_USER_UID)).thenReturn(ownerSpaceUser);

            // Act
            ApiResult result = spaceUserBizService.quitSpace();

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SPACE_USER_OWNER_CANNOT_LEAVE.getCode(), result.code());
        }
    }

    @Test
    @DisplayName("quitSpace - Should return error when remove fails")
    void quitSpace_Error_WhenRemoveFails() {
        try (MockedStatic<SpaceInfoUtil> mockedSpaceInfo = mockStatic(SpaceInfoUtil.class);
                MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {

            // Arrange
            mockedSpaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(TEST_UID);
            when(spaceUserService.getSpaceUserByUid(TEST_SPACE_ID, TEST_UID)).thenReturn(testSpaceUser);
            when(spaceUserService.removeById(testSpaceUser)).thenReturn(false);

            // Act
            ApiResult result = spaceUserBizService.quitSpace();

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SPACE_USER_REMOVE_FAILED.getCode(), result.code());
        }
    }

    // ==================== transferSpace() method tests ====================

    @Test
    @DisplayName("transferSpace - Should successfully transfer space ownership")
    void transferSpace_Success_WhenValidTransfer() {
        try (MockedStatic<SpaceInfoUtil> mockedSpaceInfo = mockStatic(SpaceInfoUtil.class);
                MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {

            // Arrange
            SpaceUser targetUser = new SpaceUser();
            targetUser.setId(3L);
            targetUser.setSpaceId(TEST_SPACE_ID);
            targetUser.setUid(TEST_UID);
            targetUser.setRole(MEMBER_ROLE);

            mockedSpaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(CURRENT_USER_UID);
            when(spaceService.getSpaceById(TEST_SPACE_ID)).thenReturn(enterpriseSpace);
            when(spaceUserService.getSpaceOwner(TEST_SPACE_ID)).thenReturn(ownerSpaceUser);
            when(spaceUserService.getSpaceUserByUid(TEST_SPACE_ID, TEST_UID)).thenReturn(targetUser);
            when(spaceUserService.updateBatchById(any(List.class))).thenReturn(true);

            // Act
            ApiResult result = spaceUserBizService.transferSpace(TEST_UID);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertEquals(ADMIN_ROLE, ownerSpaceUser.getRole());
            assertEquals(OWNER_ROLE, targetUser.getRole());
            verify(spaceUserService).updateBatchById(eq(Arrays.asList(ownerSpaceUser, targetUser)));
        }
    }

    @Test
    @DisplayName("transferSpace - Should return error when space is personal space")
    void transferSpace_Error_WhenSpaceIsPersonalSpace() {
        try (MockedStatic<SpaceInfoUtil> mockedSpaceInfo = mockStatic(SpaceInfoUtil.class)) {
            // Arrange
            mockedSpaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);
            when(spaceService.getSpaceById(TEST_SPACE_ID)).thenReturn(testSpace);

            // Act
            ApiResult result = spaceUserBizService.transferSpace(TEST_UID);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SPACE_USER_PERSONAL_SPACE_CANNOT_TRANSFER.getCode(), result.code());
        }
    }

    @Test
    @DisplayName("transferSpace - Should return error when non-owner tries to transfer")
    void transferSpace_Error_WhenNonOwnerTriesToTransfer() {
        try (MockedStatic<SpaceInfoUtil> mockedSpaceInfo = mockStatic(SpaceInfoUtil.class);
                MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {

            // Arrange
            mockedSpaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(TEST_UID);
            when(spaceService.getSpaceById(TEST_SPACE_ID)).thenReturn(enterpriseSpace);
            when(spaceUserService.getSpaceOwner(TEST_SPACE_ID)).thenReturn(ownerSpaceUser);

            // Act
            ApiResult result = spaceUserBizService.transferSpace(TEST_UID);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SPACE_USER_NON_OWNER_CANNOT_TRANSFER.getCode(), result.code());
        }
    }

    @Test
    @DisplayName("transferSpace - Should return error when target user is not space member")
    void transferSpace_Error_WhenTargetUserIsNotSpaceMember() {
        try (MockedStatic<SpaceInfoUtil> mockedSpaceInfo = mockStatic(SpaceInfoUtil.class);
                MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {

            // Arrange
            mockedSpaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(CURRENT_USER_UID);
            when(spaceService.getSpaceById(TEST_SPACE_ID)).thenReturn(enterpriseSpace);
            when(spaceUserService.getSpaceOwner(TEST_SPACE_ID)).thenReturn(ownerSpaceUser);
            when(spaceUserService.getSpaceUserByUid(TEST_SPACE_ID, TEST_UID)).thenReturn(null);

            // Act
            ApiResult result = spaceUserBizService.transferSpace(TEST_UID);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SPACE_USER_NOT_MEMBER.getCode(), result.code());
        }
    }

    @Test
    @DisplayName("transferSpace - Should return error when update fails")
    void transferSpace_Error_WhenUpdateFails() {
        try (MockedStatic<SpaceInfoUtil> mockedSpaceInfo = mockStatic(SpaceInfoUtil.class);
                MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {

            // Arrange
            SpaceUser targetUser = new SpaceUser();
            targetUser.setSpaceId(TEST_SPACE_ID);
            targetUser.setUid(TEST_UID);
            targetUser.setRole(MEMBER_ROLE);

            mockedSpaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(CURRENT_USER_UID);
            when(spaceService.getSpaceById(TEST_SPACE_ID)).thenReturn(enterpriseSpace);
            when(spaceUserService.getSpaceOwner(TEST_SPACE_ID)).thenReturn(ownerSpaceUser);
            when(spaceUserService.getSpaceUserByUid(TEST_SPACE_ID, TEST_UID)).thenReturn(targetUser);
            when(spaceUserService.updateBatchById(any(List.class))).thenReturn(false);

            // Act
            ApiResult result = spaceUserBizService.transferSpace(TEST_UID);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SPACE_USER_TRANSFER_FAILED.getCode(), result.code());
        }
    }

    // ==================== getUserLimit() method tests ====================

    @Test
    @DisplayName("getUserLimit - Should return enterprise space user limits")
    void getUserLimit_Success_WhenEnterpriseSpace() {
        try (MockedStatic<SpaceInfoUtil> mockedSpaceInfo = mockStatic(SpaceInfoUtil.class)) {
            // Arrange
            mockedSpaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);
            when(spaceService.getSpaceById(TEST_SPACE_ID)).thenReturn(enterpriseSpace);
            when(enterpriseService.getEnterpriseById(TEST_ENTERPRISE_ID)).thenReturn(testEnterprise);
            when(spaceLimitProperties.getEnterprise()).thenReturn(spaceLimit);
            when(spaceUserService.countBySpaceId(TEST_SPACE_ID)).thenReturn(5L);
            when(inviteRecordService.countJoiningBySpaceId(TEST_SPACE_ID)).thenReturn(2L);

            // Act
            UserLimitVO result = spaceUserBizService.getUserLimit();

            // Assert
            assertNotNull(result);
            assertEquals(10, result.getTotal());
            assertEquals(7, result.getUsed()); // 5 + 2
            assertEquals(3, result.getRemain()); // 10 - 7
        }
    }

    @Test
    @DisplayName("getUserLimit - Should return personal space user limits for free space")
    void getUserLimit_Success_WhenPersonalFreeSpace() {
        try (MockedStatic<SpaceInfoUtil> mockedSpaceInfo = mockStatic(SpaceInfoUtil.class)) {
            // Arrange
            mockedSpaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);
            when(spaceService.getSpaceById(TEST_SPACE_ID)).thenReturn(testSpace);
            when(spaceLimitProperties.getFree()).thenReturn(spaceLimit);
            when(spaceUserService.countFreeSpaceUser(TEST_UID)).thenReturn(3L);
            when(inviteRecordService.countJoiningByUid(TEST_UID, SpaceTypeEnum.FREE)).thenReturn(1L);

            // Act
            UserLimitVO result = spaceUserBizService.getUserLimit();

            // Assert
            assertNotNull(result);
            assertEquals(10, result.getTotal());
            assertEquals(4, result.getUsed()); // 3 + 1
            assertEquals(6, result.getRemain()); // 10 - 4
        }
    }

    @Test
    @DisplayName("getUserLimit - Should return team space user limits")
    void getUserLimit_Success_WhenTeamSpace() {
        try (MockedStatic<SpaceInfoUtil> mockedSpaceInfo = mockStatic(SpaceInfoUtil.class)) {
            // Arrange
            testEnterprise.setServiceType(EnterpriseServiceTypeEnum.TEAM.getCode());
            mockedSpaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);
            when(spaceService.getSpaceById(TEST_SPACE_ID)).thenReturn(enterpriseSpace);
            when(enterpriseService.getEnterpriseById(TEST_ENTERPRISE_ID)).thenReturn(testEnterprise);
            when(spaceLimitProperties.getTeam()).thenReturn(spaceLimit);
            when(spaceUserService.countBySpaceId(TEST_SPACE_ID)).thenReturn(4L);
            when(inviteRecordService.countJoiningBySpaceId(TEST_SPACE_ID)).thenReturn(1L);

            // Act
            UserLimitVO result = spaceUserBizService.getUserLimit();

            // Assert
            assertNotNull(result);
            assertEquals(10, result.getTotal());
            assertEquals(5, result.getUsed()); // 4 + 1
            assertEquals(5, result.getRemain()); // 10 - 5
        }
    }

    // ==================== getUserLimit(String uid) method tests ====================

    @Test
    @DisplayName("getUserLimit(uid) - Should return pro limits when user has valid pro order")
    void getUserLimit_Success_WhenUserHasValidProOrder() {
        try (MockedStatic<OrderInfoUtil> mockedOrderInfo = mockStatic(OrderInfoUtil.class)) {
            // Arrange
            mockedOrderInfo.when(() -> OrderInfoUtil.existValidProOrder(TEST_UID)).thenReturn(true);
            when(spaceLimitProperties.getPro()).thenReturn(spaceLimit);
            when(spaceUserService.countProSpaceUser(TEST_UID)).thenReturn(6L);
            when(inviteRecordService.countJoiningByUid(TEST_UID, SpaceTypeEnum.PRO)).thenReturn(1L);

            // Act
            UserLimitVO result = spaceUserBizService.getUserLimit(TEST_UID);

            // Assert
            assertNotNull(result);
            assertEquals(10, result.getTotal());
            assertEquals(7, result.getUsed()); // 6 + 1
            assertEquals(3, result.getRemain()); // 10 - 7
        }
    }

    @Test
    @DisplayName("getUserLimit(uid) - Should return free limits when user has no valid pro order")
    void getUserLimit_Success_WhenUserHasNoValidProOrder() {
        try (MockedStatic<OrderInfoUtil> mockedOrderInfo = mockStatic(OrderInfoUtil.class)) {
            // Arrange
            mockedOrderInfo.when(() -> OrderInfoUtil.existValidProOrder(TEST_UID)).thenReturn(false);
            when(spaceLimitProperties.getFree()).thenReturn(spaceLimit);
            when(spaceUserService.countFreeSpaceUser(TEST_UID)).thenReturn(4L);
            when(inviteRecordService.countJoiningByUid(TEST_UID, SpaceTypeEnum.FREE)).thenReturn(2L);

            // Act
            UserLimitVO result = spaceUserBizService.getUserLimit(TEST_UID);

            // Assert
            assertNotNull(result);
            assertEquals(10, result.getTotal());
            assertEquals(6, result.getUsed()); // 4 + 2
            assertEquals(4, result.getRemain()); // 10 - 6
        }
    }

    // ==================== getUserLimitVO() method tests ====================

    @Test
    @DisplayName("getUserLimitVO - Should return free space limits")
    void getUserLimitVO_Success_WhenFreeSpaceType() {
        // Arrange
        when(spaceLimitProperties.getFree()).thenReturn(spaceLimit);
        when(spaceUserService.countFreeSpaceUser(TEST_UID)).thenReturn(3L);
        when(inviteRecordService.countJoiningByUid(TEST_UID, SpaceTypeEnum.FREE)).thenReturn(1L);

        // Act
        UserLimitVO result = spaceUserBizService.getUserLimitVO(SpaceTypeEnum.FREE.getCode(), TEST_UID);

        // Assert
        assertNotNull(result);
        assertEquals(10, result.getTotal());
        assertEquals(4, result.getUsed()); // 3 + 1
        assertEquals(6, result.getRemain()); // 10 - 4
    }

    @Test
    @DisplayName("getUserLimitVO - Should return pro space limits")
    void getUserLimitVO_Success_WhenProSpaceType() {
        // Arrange
        when(spaceLimitProperties.getPro()).thenReturn(spaceLimit);
        when(spaceUserService.countProSpaceUser(TEST_UID)).thenReturn(5L);
        when(inviteRecordService.countJoiningByUid(TEST_UID, SpaceTypeEnum.PRO)).thenReturn(2L);

        // Act
        UserLimitVO result = spaceUserBizService.getUserLimitVO(SpaceTypeEnum.PRO.getCode(), TEST_UID);

        // Assert
        assertNotNull(result);
        assertEquals(10, result.getTotal());
        assertEquals(7, result.getUsed()); // 5 + 2
        assertEquals(3, result.getRemain()); // 10 - 7
    }

    @Test
    @DisplayName("getUserLimitVO - Should return pro space limits for non-free type")
    void getUserLimitVO_Success_WhenNonFreeSpaceType() {
        // Arrange
        when(spaceLimitProperties.getPro()).thenReturn(spaceLimit);
        when(spaceUserService.countProSpaceUser(TEST_UID)).thenReturn(2L);
        when(inviteRecordService.countJoiningByUid(TEST_UID, SpaceTypeEnum.PRO)).thenReturn(1L);

        // Act
        UserLimitVO result = spaceUserBizService.getUserLimitVO(SpaceTypeEnum.ENTERPRISE.getCode(), TEST_UID);

        // Assert
        assertNotNull(result);
        assertEquals(10, result.getTotal());
        assertEquals(3, result.getUsed()); // 2 + 1
        assertEquals(7, result.getRemain()); // 10 - 3
    }
}
