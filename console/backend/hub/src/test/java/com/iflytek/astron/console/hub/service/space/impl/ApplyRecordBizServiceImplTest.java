package com.iflytek.astron.console.hub.service.space.impl;

import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.data.UserInfoDataService;
import com.iflytek.astron.console.commons.entity.space.ApplyRecord;
import com.iflytek.astron.console.commons.entity.space.EnterpriseUser;
import com.iflytek.astron.console.commons.entity.space.SpaceUser;
import com.iflytek.astron.console.commons.entity.user.UserInfo;
import com.iflytek.astron.console.commons.enums.space.EnterpriseRoleEnum;
import com.iflytek.astron.console.commons.enums.space.SpaceRoleEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.commons.service.space.ApplyRecordService;
import com.iflytek.astron.console.commons.service.space.EnterpriseUserService;
import com.iflytek.astron.console.commons.service.space.SpaceUserService;
import com.iflytek.astron.console.commons.util.RequestContextUtil;
import com.iflytek.astron.console.commons.util.space.EnterpriseInfoUtil;
import com.iflytek.astron.console.commons.util.space.SpaceInfoUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * ApplyRecordBizServiceImpl unit test class
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Apply Record Business Service Tests")
class ApplyRecordBizServiceImplTest {

    @Mock
    private SpaceUserService spaceUserService;

    @Mock
    private UserInfoDataService userInfoDataService;

    @Mock
    private EnterpriseUserService enterpriseUserService;

    @Mock
    private ApplyRecordService applyRecordService;

    @InjectMocks
    private ApplyRecordBizServiceImpl applyRecordBizService;

    private static final String TEST_UID = "test_uid_123";
    private static final Long TEST_SPACE_ID = 1L;
    private static final Long TEST_ENTERPRISE_ID = 100L;
    private static final Long TEST_APPLY_ID = 200L;
    private static final String TEST_NICKNAME = "Test User";

    private UserInfo testUserInfo;
    private EnterpriseUser testEnterpriseUser;
    private ApplyRecord testApplyRecord;

    @BeforeEach
    void setUp() {
        // Initialize test data
        testUserInfo = new UserInfo();
        testUserInfo.setUid(TEST_UID);
        testUserInfo.setNickname(TEST_NICKNAME);

        testEnterpriseUser = EnterpriseUser.builder()
                .id(1L)
                .enterpriseId(TEST_ENTERPRISE_ID)
                .uid(TEST_UID)
                .nickname(TEST_NICKNAME)
                .role(EnterpriseRoleEnum.STAFF.getCode())
                .createTime(LocalDateTime.now())
                .build();

        testApplyRecord = new ApplyRecord();
        testApplyRecord.setId(TEST_APPLY_ID);
        testApplyRecord.setEnterpriseId(TEST_ENTERPRISE_ID);
        testApplyRecord.setSpaceId(TEST_SPACE_ID);
        testApplyRecord.setApplyUid(TEST_UID);
        testApplyRecord.setApplyNickname(TEST_NICKNAME);
        testApplyRecord.setApplyTime(LocalDateTime.now());
        testApplyRecord.setStatus(ApplyRecord.Status.APPLYING.getCode());
    }

    @Test
    @DisplayName("Apply to join enterprise space - Success (Normal user)")
    void testJoinEnterpriseSpace_Success_NormalUser() {
        // Prepare test data
        try (MockedStatic<RequestContextUtil> requestContextMock = mockStatic(RequestContextUtil.class);
                MockedStatic<EnterpriseInfoUtil> enterpriseInfoMock = mockStatic(EnterpriseInfoUtil.class)) {

            // Mock static methods
            requestContextMock.when(RequestContextUtil::getUID).thenReturn(TEST_UID);
            enterpriseInfoMock.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);

            // Mock service methods
            when(applyRecordService.getByUidAndSpaceId(TEST_UID, TEST_SPACE_ID)).thenReturn(null);
            when(spaceUserService.getSpaceUserByUid(TEST_SPACE_ID, TEST_UID)).thenReturn(null);
            when(enterpriseUserService.getEnterpriseUserByUid(TEST_ENTERPRISE_ID, TEST_UID))
                    .thenReturn(testEnterpriseUser);
            when(userInfoDataService.findByUid(TEST_UID)).thenReturn(Optional.of(testUserInfo));
            when(applyRecordService.save(any(ApplyRecord.class))).thenReturn(true);

            // Execute test
            ApiResult<String> result = applyRecordBizService.joinEnterpriseSpace(TEST_SPACE_ID);

            // Verify results
            assertEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertNull(result.data());

            // Verify method calls
            verify(applyRecordService).getByUidAndSpaceId(TEST_UID, TEST_SPACE_ID);
            verify(spaceUserService).getSpaceUserByUid(TEST_SPACE_ID, TEST_UID);
            verify(enterpriseUserService).getEnterpriseUserByUid(TEST_ENTERPRISE_ID, TEST_UID);
            verify(userInfoDataService).findByUid(TEST_UID);
            verify(applyRecordService).save(any(ApplyRecord.class));
        }
    }

    @Test
    @DisplayName("Apply to join enterprise space - Success (Super admin)")
    void testJoinEnterpriseSpace_Success_SuperAdmin() {
        // Prepare test data - Super admin
        testEnterpriseUser.setRole(EnterpriseRoleEnum.OFFICER.getCode());

        try (MockedStatic<RequestContextUtil> requestContextMock = mockStatic(RequestContextUtil.class);
                MockedStatic<EnterpriseInfoUtil> enterpriseInfoMock = mockStatic(EnterpriseInfoUtil.class)) {

            // Mock static methods
            requestContextMock.when(RequestContextUtil::getUID).thenReturn(TEST_UID);
            enterpriseInfoMock.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);

            // Mock service methods
            when(applyRecordService.getByUidAndSpaceId(TEST_UID, TEST_SPACE_ID)).thenReturn(null);
            when(spaceUserService.getSpaceUserByUid(TEST_SPACE_ID, TEST_UID)).thenReturn(null);
            when(enterpriseUserService.getEnterpriseUserByUid(TEST_ENTERPRISE_ID, TEST_UID))
                    .thenReturn(testEnterpriseUser);
            when(spaceUserService.addSpaceUser(TEST_SPACE_ID, TEST_UID, SpaceRoleEnum.ADMIN))
                    .thenReturn(true);

            // Execute test
            ApiResult<String> result = applyRecordBizService.joinEnterpriseSpace(TEST_SPACE_ID);

            // Verify results
            assertEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertNull(result.data());

            // Verify method calls
            verify(spaceUserService).addSpaceUser(TEST_SPACE_ID, TEST_UID, SpaceRoleEnum.ADMIN);
            verify(applyRecordService, never()).save(any(ApplyRecord.class));
        }
    }

    @Test
    @DisplayName("Apply to join enterprise space - Fail: Not in enterprise")
    void testJoinEnterpriseSpace_Fail_NotInEnterprise() {
        try (MockedStatic<RequestContextUtil> requestContextMock = mockStatic(RequestContextUtil.class);
                MockedStatic<EnterpriseInfoUtil> enterpriseInfoMock = mockStatic(EnterpriseInfoUtil.class)) {

            // Mock static methods
            requestContextMock.when(RequestContextUtil::getUID).thenReturn(TEST_UID);
            enterpriseInfoMock.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(null);

            // Execute test
            ApiResult<String> result = applyRecordBizService.joinEnterpriseSpace(TEST_SPACE_ID);

            // Verify results
            assertFalse(result.code() == ResponseEnum.SUCCESS.getCode());
            assertEquals(ResponseEnum.SPACE_APPLICATION_PLEASE_JOIN_ENTERPRISE_FIRST.getCode(), result.code());
        }
    }

    @Test
    @DisplayName("Apply to join enterprise space - Fail: Duplicate application")
    void testJoinEnterpriseSpace_Fail_DuplicateApplication() {
        try (MockedStatic<RequestContextUtil> requestContextMock = mockStatic(RequestContextUtil.class);
                MockedStatic<EnterpriseInfoUtil> enterpriseInfoMock = mockStatic(EnterpriseInfoUtil.class)) {

            // Mock static methods
            requestContextMock.when(RequestContextUtil::getUID).thenReturn(TEST_UID);
            enterpriseInfoMock.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);

            // Mock service methods - 已存在申请记录
            when(applyRecordService.getByUidAndSpaceId(TEST_UID, TEST_SPACE_ID))
                    .thenReturn(testApplyRecord);

            // Execute test
            ApiResult<String> result = applyRecordBizService.joinEnterpriseSpace(TEST_SPACE_ID);

            // Verify results
            assertFalse(result.code() == ResponseEnum.SUCCESS.getCode());
            assertEquals(ResponseEnum.SPACE_APPLICATION_DUPLICATE_NOT_ALLOWED.getCode(), result.code());
        }
    }

    @Test
    @DisplayName("Apply to join enterprise space - Fail: User already in space")
    void testJoinEnterpriseSpace_Fail_UserAlreadyInSpace() {
        try (MockedStatic<RequestContextUtil> requestContextMock = mockStatic(RequestContextUtil.class);
                MockedStatic<EnterpriseInfoUtil> enterpriseInfoMock = mockStatic(EnterpriseInfoUtil.class)) {

            // Mock static methods
            requestContextMock.when(RequestContextUtil::getUID).thenReturn(TEST_UID);
            enterpriseInfoMock.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);

            // Mock service methods
            when(applyRecordService.getByUidAndSpaceId(TEST_UID, TEST_SPACE_ID)).thenReturn(null);
            SpaceUser existingSpaceUser = new SpaceUser();
            existingSpaceUser.setId(1L);
            when(spaceUserService.getSpaceUserByUid(TEST_SPACE_ID, TEST_UID))
                    .thenReturn(existingSpaceUser); // User already in space

            // Execute test
            ApiResult<String> result = applyRecordBizService.joinEnterpriseSpace(TEST_SPACE_ID);

            // Verify results
            assertFalse(result.code() == ResponseEnum.SUCCESS.getCode());
            assertEquals(ResponseEnum.SPACE_APPLICATION_USER_ALREADY_IN_SPACE.getCode(), result.code());
        }
    }

    @Test
    @DisplayName("Apply to join enterprise space - Fail: Super admin join failed")
    void testJoinEnterpriseSpace_Fail_SuperAdminJoinFailed() {
        // Prepare test data - Super admin
        testEnterpriseUser.setRole(EnterpriseRoleEnum.OFFICER.getCode());

        try (MockedStatic<RequestContextUtil> requestContextMock = mockStatic(RequestContextUtil.class);
                MockedStatic<EnterpriseInfoUtil> enterpriseInfoMock = mockStatic(EnterpriseInfoUtil.class)) {

            // Mock static methods
            requestContextMock.when(RequestContextUtil::getUID).thenReturn(TEST_UID);
            enterpriseInfoMock.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);

            // Mock service methods
            when(applyRecordService.getByUidAndSpaceId(TEST_UID, TEST_SPACE_ID)).thenReturn(null);
            when(spaceUserService.getSpaceUserByUid(TEST_SPACE_ID, TEST_UID)).thenReturn(null);
            when(enterpriseUserService.getEnterpriseUserByUid(TEST_ENTERPRISE_ID, TEST_UID))
                    .thenReturn(testEnterpriseUser);
            when(spaceUserService.addSpaceUser(TEST_SPACE_ID, TEST_UID, SpaceRoleEnum.ADMIN))
                    .thenReturn(false); // Join failed

            // Execute test
            ApiResult<String> result = applyRecordBizService.joinEnterpriseSpace(TEST_SPACE_ID);

            // Verify results
            assertFalse(result.code() == ResponseEnum.SUCCESS.getCode());
            assertEquals(ResponseEnum.SPACE_APPLICATION_JOIN_FAILED.getCode(), result.code());
        }
    }

    @Test
    @DisplayName("Apply to join enterprise space - Fail: Save application failed")
    void testJoinEnterpriseSpace_Fail_SaveApplicationFailed() {
        try (MockedStatic<RequestContextUtil> requestContextMock = mockStatic(RequestContextUtil.class);
                MockedStatic<EnterpriseInfoUtil> enterpriseInfoMock = mockStatic(EnterpriseInfoUtil.class)) {

            // Mock static methods
            requestContextMock.when(RequestContextUtil::getUID).thenReturn(TEST_UID);
            enterpriseInfoMock.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);

            // Mock service methods
            when(applyRecordService.getByUidAndSpaceId(TEST_UID, TEST_SPACE_ID)).thenReturn(null);
            when(spaceUserService.getSpaceUserByUid(TEST_SPACE_ID, TEST_UID)).thenReturn(null);
            when(enterpriseUserService.getEnterpriseUserByUid(TEST_ENTERPRISE_ID, TEST_UID))
                    .thenReturn(testEnterpriseUser);
            when(userInfoDataService.findByUid(TEST_UID)).thenReturn(Optional.of(testUserInfo));
            when(applyRecordService.save(any(ApplyRecord.class))).thenReturn(false); // Save failed

            // Execute test
            ApiResult<String> result = applyRecordBizService.joinEnterpriseSpace(TEST_SPACE_ID);

            // Verify results
            assertFalse(result.code() == ResponseEnum.SUCCESS.getCode());
            assertEquals(ResponseEnum.SPACE_APPLICATION_FAILED.getCode(), result.code());
        }
    }

    @Test
    @DisplayName("Approve join enterprise space - Success")
    void testAgreeEnterpriseSpace_Success() {
        try (MockedStatic<RequestContextUtil> requestContextMock = mockStatic(RequestContextUtil.class);
                MockedStatic<SpaceInfoUtil> spaceInfoMock = mockStatic(SpaceInfoUtil.class)) {

            // Mock static methods
            requestContextMock.when(RequestContextUtil::getUID).thenReturn("admin_uid");
            spaceInfoMock.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);

            // Mock service methods
            when(applyRecordService.getById(TEST_APPLY_ID)).thenReturn(testApplyRecord);
            when(applyRecordService.updateById(any(ApplyRecord.class))).thenReturn(true);
            when(spaceUserService.addSpaceUser(TEST_SPACE_ID, TEST_UID, SpaceRoleEnum.MEMBER))
                    .thenReturn(true);

            // Execute test
            ApiResult<String> result = applyRecordBizService.agreeEnterpriseSpace(TEST_APPLY_ID);

            // Verify results
            assertEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertNull(result.data());

            // Verify application record status update
            verify(applyRecordService).updateById(argThat(record -> record.getStatus().equals(ApplyRecord.Status.APPROVED.getCode()) &&
                    record.getAuditUid().equals("admin_uid") &&
                    record.getAuditTime() != null));

            // Verify add space user
            verify(spaceUserService).addSpaceUser(TEST_SPACE_ID, TEST_UID, SpaceRoleEnum.MEMBER);
        }
    }

    @Test
    @DisplayName("Approve join enterprise space - Fail: Record not found")
    void testAgreeEnterpriseSpace_Fail_RecordNotFound() {
        // Mock service methods
        when(applyRecordService.getById(TEST_APPLY_ID)).thenReturn(null);

        // Execute test
        ApiResult<String> result = applyRecordBizService.agreeEnterpriseSpace(TEST_APPLY_ID);

        // Verify results
        assertFalse(result.code() == ResponseEnum.SUCCESS.getCode());
        assertEquals(ResponseEnum.SPACE_APPLICATION_RECORD_NOT_FOUND.getCode(), result.code());
    }

    @Test
    @DisplayName("Approve join enterprise space - Fail: Space inconsistent")
    void testAgreeEnterpriseSpace_Fail_SpaceInconsistent() {
        try (MockedStatic<SpaceInfoUtil> spaceInfoMock = mockStatic(SpaceInfoUtil.class)) {

            // Mock static methods - 返回不同的空间ID
            spaceInfoMock.when(SpaceInfoUtil::getSpaceId).thenReturn(999L);

            // Mock service methods
            when(applyRecordService.getById(TEST_APPLY_ID)).thenReturn(testApplyRecord);

            // Execute test
            ApiResult<String> result = applyRecordBizService.agreeEnterpriseSpace(TEST_APPLY_ID);

            // Verify results
            assertFalse(result.code() == ResponseEnum.SUCCESS.getCode());
            assertEquals(ResponseEnum.SPACE_APPLICATION_CURRENT_SPACE_INCONSISTENT.getCode(), result.code());
        }
    }

    @Test
    @DisplayName("Approve join enterprise space - Fail: Status incorrect")
    void testAgreeEnterpriseSpace_Fail_StatusIncorrect() {
        try (MockedStatic<SpaceInfoUtil> spaceInfoMock = mockStatic(SpaceInfoUtil.class)) {

            // Mock static methods
            spaceInfoMock.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);

            // Modify application record status to approved
            testApplyRecord.setStatus(ApplyRecord.Status.APPROVED.getCode());

            // Mock service methods
            when(applyRecordService.getById(TEST_APPLY_ID)).thenReturn(testApplyRecord);

            // Execute test
            ApiResult<String> result = applyRecordBizService.agreeEnterpriseSpace(TEST_APPLY_ID);

            // Verify results
            assertFalse(result.code() == ResponseEnum.SUCCESS.getCode());
            assertEquals(ResponseEnum.SPACE_APPLICATION_STATUS_INCORRECT.getCode(), result.code());
        }
    }

    @Test
    @DisplayName("Approve join enterprise space - Fail: Update record failed")
    void testAgreeEnterpriseSpace_Fail_UpdateRecordFailed() {
        try (MockedStatic<RequestContextUtil> requestContextMock = mockStatic(RequestContextUtil.class);
                MockedStatic<SpaceInfoUtil> spaceInfoMock = mockStatic(SpaceInfoUtil.class)) {

            // Mock static methods
            requestContextMock.when(RequestContextUtil::getUID).thenReturn("admin_uid");
            spaceInfoMock.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);

            // Mock service methods
            when(applyRecordService.getById(TEST_APPLY_ID)).thenReturn(testApplyRecord);
            when(applyRecordService.updateById(any(ApplyRecord.class))).thenReturn(false); // Update failed

            // Execute test
            ApiResult<String> result = applyRecordBizService.agreeEnterpriseSpace(TEST_APPLY_ID);

            // Verify results
            assertFalse(result.code() == ResponseEnum.SUCCESS.getCode());
            assertEquals(ResponseEnum.SPACE_APPLICATION_APPROVAL_FAILED.getCode(), result.code());
        }
    }

    @Test
    @DisplayName("Approve join enterprise space - Fail: Add space user failed")
    void testAgreeEnterpriseSpace_Fail_AddSpaceUserFailed() {
        try (MockedStatic<RequestContextUtil> requestContextMock = mockStatic(RequestContextUtil.class);
                MockedStatic<SpaceInfoUtil> spaceInfoMock = mockStatic(SpaceInfoUtil.class)) {

            // Mock static methods
            requestContextMock.when(RequestContextUtil::getUID).thenReturn("admin_uid");
            spaceInfoMock.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);

            // Mock service methods
            when(applyRecordService.getById(TEST_APPLY_ID)).thenReturn(testApplyRecord);
            when(applyRecordService.updateById(any(ApplyRecord.class))).thenReturn(true);
            when(spaceUserService.addSpaceUser(TEST_SPACE_ID, TEST_UID, SpaceRoleEnum.MEMBER))
                    .thenReturn(false); // Add user failed

            // Execute test and verify exception
            BusinessException exception = assertThrows(BusinessException.class, () -> {
                applyRecordBizService.agreeEnterpriseSpace(TEST_APPLY_ID);
            });

            assertEquals(ResponseEnum.SPACE_USER_ADD_FAILED.getCode(), exception.getCode());
        }
    }

    @Test
    @DisplayName("Reject join enterprise space - Success")
    void testRefuseEnterpriseSpace_Success() {
        try (MockedStatic<RequestContextUtil> requestContextMock = mockStatic(RequestContextUtil.class);
                MockedStatic<SpaceInfoUtil> spaceInfoMock = mockStatic(SpaceInfoUtil.class)) {

            // Mock static methods
            requestContextMock.when(RequestContextUtil::getUID).thenReturn("admin_uid");
            spaceInfoMock.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);

            // Mock service methods
            when(applyRecordService.getById(TEST_APPLY_ID)).thenReturn(testApplyRecord);
            when(applyRecordService.updateById(any(ApplyRecord.class))).thenReturn(true);

            // Execute test
            ApiResult<String> result = applyRecordBizService.refuseEnterpriseSpace(TEST_APPLY_ID);

            // Verify results
            assertEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertNull(result.data());

            // Verify application record status update
            verify(applyRecordService).updateById(argThat(record -> record.getStatus().equals(ApplyRecord.Status.REJECTED.getCode()) &&
                    record.getAuditUid().equals("admin_uid") &&
                    record.getAuditTime() != null));
        }
    }

    @Test
    @DisplayName("Reject join enterprise space - Fail: Record not found")
    void testRefuseEnterpriseSpace_Fail_RecordNotFound() {
        // Mock service methods
        when(applyRecordService.getById(TEST_APPLY_ID)).thenReturn(null);

        // Execute test
        ApiResult<String> result = applyRecordBizService.refuseEnterpriseSpace(TEST_APPLY_ID);

        // Verify results
        assertFalse(result.code() == ResponseEnum.SUCCESS.getCode());
        assertEquals(ResponseEnum.SPACE_APPLICATION_RECORD_NOT_FOUND.getCode(), result.code());
    }

    @Test
    @DisplayName("Reject join enterprise space - Fail: Space inconsistent")
    void testRefuseEnterpriseSpace_Fail_SpaceInconsistent() {
        try (MockedStatic<SpaceInfoUtil> spaceInfoMock = mockStatic(SpaceInfoUtil.class)) {

            // Mock static methods - 返回不同的空间ID
            spaceInfoMock.when(SpaceInfoUtil::getSpaceId).thenReturn(999L);

            // Mock service methods
            when(applyRecordService.getById(TEST_APPLY_ID)).thenReturn(testApplyRecord);

            // Execute test
            ApiResult<String> result = applyRecordBizService.refuseEnterpriseSpace(TEST_APPLY_ID);

            // Verify results
            assertFalse(result.code() == ResponseEnum.SUCCESS.getCode());
            assertEquals(ResponseEnum.SPACE_APPLICATION_CURRENT_SPACE_INCONSISTENT.getCode(), result.code());
        }
    }

    @Test
    @DisplayName("Reject join enterprise space - Fail: Status incorrect")
    void testRefuseEnterpriseSpace_Fail_StatusIncorrect() {
        try (MockedStatic<SpaceInfoUtil> spaceInfoMock = mockStatic(SpaceInfoUtil.class)) {

            // Mock static methods
            spaceInfoMock.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);

            // Modify application record status to rejected
            testApplyRecord.setStatus(ApplyRecord.Status.REJECTED.getCode());

            // Mock service methods
            when(applyRecordService.getById(TEST_APPLY_ID)).thenReturn(testApplyRecord);

            // Execute test
            ApiResult<String> result = applyRecordBizService.refuseEnterpriseSpace(TEST_APPLY_ID);

            // Verify results
            assertFalse(result.code() == ResponseEnum.SUCCESS.getCode());
            assertEquals(ResponseEnum.SPACE_APPLICATION_STATUS_INCORRECT.getCode(), result.code());
        }
    }

    @Test
    @DisplayName("Reject join enterprise space - Fail: Update record failed")
    void testRefuseEnterpriseSpace_Fail_UpdateRecordFailed() {
        try (MockedStatic<RequestContextUtil> requestContextMock = mockStatic(RequestContextUtil.class);
                MockedStatic<SpaceInfoUtil> spaceInfoMock = mockStatic(SpaceInfoUtil.class)) {

            // Mock static methods
            requestContextMock.when(RequestContextUtil::getUID).thenReturn("admin_uid");
            spaceInfoMock.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);

            // Mock service methods
            when(applyRecordService.getById(TEST_APPLY_ID)).thenReturn(testApplyRecord);
            when(applyRecordService.updateById(any(ApplyRecord.class))).thenReturn(false); // Update failed

            // Execute test
            ApiResult<String> result = applyRecordBizService.refuseEnterpriseSpace(TEST_APPLY_ID);

            // Verify results
            assertFalse(result.code() == ResponseEnum.SUCCESS.getCode());
            assertEquals(ResponseEnum.SPACE_APPLICATION_APPROVAL_FAILED.getCode(), result.code());
        }
    }
}
