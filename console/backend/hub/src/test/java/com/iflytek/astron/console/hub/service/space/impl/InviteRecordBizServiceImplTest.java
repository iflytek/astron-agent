package com.iflytek.astron.console.hub.service.space.impl;

import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.data.UserInfoDataService;
import com.iflytek.astron.console.commons.dto.space.BatchChatUserVO;
import com.iflytek.astron.console.commons.dto.space.ChatUserVO;
import com.iflytek.astron.console.commons.dto.space.InviteRecordAddDTO;
import com.iflytek.astron.console.commons.dto.space.InviteRecordVO;
import com.iflytek.astron.console.commons.dto.space.UserLimitVO;
import com.iflytek.astron.console.commons.entity.space.Enterprise;
import com.iflytek.astron.console.commons.entity.space.InviteRecord;
import com.iflytek.astron.console.commons.entity.space.Space;
import com.iflytek.astron.console.commons.entity.space.SpaceUser;
import com.iflytek.astron.console.commons.entity.user.UserInfo;
import com.iflytek.astron.console.commons.enums.space.*;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.commons.service.space.*;
import com.iflytek.astron.console.commons.util.RequestContextUtil;
import com.iflytek.astron.console.commons.util.S3ClientUtil;
import com.iflytek.astron.console.commons.util.space.EnterpriseInfoUtil;
import com.iflytek.astron.console.commons.util.space.SpaceInfoUtil;
import com.iflytek.astron.console.hub.properties.InviteMessageTempProperties;
import com.iflytek.astron.console.hub.properties.SpaceLimitProperties;
import com.iflytek.astron.console.hub.service.notification.NotificationService;
import com.iflytek.astron.console.hub.service.space.EnterpriseUserBizService;
import com.iflytek.astron.console.hub.util.AESUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for InviteRecordBizServiceImpl Tests all public methods with comprehensive coverage of
 * success and failure scenarios
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("InviteRecordBizServiceImpl Unit Tests")
class InviteRecordBizServiceImplTest {

    @Mock
    private SpaceUserService spaceUserService;
    @Mock
    private EnterpriseUserService enterpriseUserService;
    @Mock
    private SpaceService spaceService;
    @Mock
    private EnterpriseService enterpriseService;
    @Mock
    private InviteMessageTempProperties tempProperties;
    @Mock
    private SpaceLimitProperties spaceLimitProperties;
    @Mock
    private InviteRecordService inviteRecordService;
    @Mock
    private EnterpriseUserBizService enterpriseUserBizService;
    @Mock
    private S3ClientUtil s3ClientUtil;
    @Mock
    private NotificationService notificationService;
    @Mock
    private UserInfoDataService userInfoDataService;

    @InjectMocks
    private InviteRecordBizServiceImpl inviteRecordBizService;

    private static final String TEST_UID = "test-uid-123";
    private static final Long TEST_SPACE_ID = 100L;
    private static final Long TEST_ENTERPRISE_ID = 1L;
    private static final Long TEST_INVITE_ID = 10L;
    private static final String TEST_MOBILE = "13800138000";
    private static final String TEST_USERNAME = "testuser";

    private Space testSpace;
    private Enterprise testEnterprise;
    private InviteRecord testInviteRecord;
    private InviteRecordAddDTO testInviteDto;
    private UserInfo testUserInfo;
    private SpaceLimitProperties.SpaceLimit spaceLimit;

    @BeforeEach
    void setUp() {
        // Initialize test space
        testSpace = new Space();
        testSpace.setId(TEST_SPACE_ID);
        testSpace.setName("Test Space");
        testSpace.setUid(TEST_UID);
        testSpace.setType(SpaceTypeEnum.FREE.getCode());
        testSpace.setEnterpriseId(null);

        // Initialize test enterprise
        testEnterprise = new Enterprise();
        testEnterprise.setId(TEST_ENTERPRISE_ID);
        testEnterprise.setName("Test Enterprise");
        testEnterprise.setUid(TEST_UID);
        testEnterprise.setServiceType(EnterpriseServiceTypeEnum.ENTERPRISE.getCode());

        // Initialize test invite record
        testInviteRecord = new InviteRecord();
        testInviteRecord.setId(TEST_INVITE_ID);
        testInviteRecord.setType(InviteRecordTypeEnum.SPACE.getCode());
        testInviteRecord.setSpaceId(TEST_SPACE_ID);
        testInviteRecord.setEnterpriseId(null);
        testInviteRecord.setInviteeUid(TEST_UID);
        testInviteRecord.setInviterUid("inviter-uid");
        testInviteRecord.setRole(InviteRecordRoleEnum.MEMBER.getCode());
        testInviteRecord.setStatus(InviteRecordStatusEnum.INIT.getCode());
        testInviteRecord.setExpireTime(LocalDateTime.now().plusDays(7));
        testInviteRecord.setInviteeNickname("Test User");

        // Initialize test invite DTO
        testInviteDto = new InviteRecordAddDTO();
        testInviteDto.setUid(TEST_UID);
        testInviteDto.setRole(InviteRecordRoleEnum.MEMBER.getCode());

        // Initialize test user info
        testUserInfo = new UserInfo();
        testUserInfo.setUid(TEST_UID);
        testUserInfo.setNickname("Test User");
        testUserInfo.setAvatar("avatar-url");
        testUserInfo.setMobile(TEST_MOBILE);
        testUserInfo.setUsername(TEST_USERNAME);

        // Initialize space limit
        spaceLimit = new SpaceLimitProperties.SpaceLimit();
        spaceLimit.setUserCount(10);
    }

    // ==================== spaceInvite() method tests ====================

    @Test
    @DisplayName("spaceInvite - Should successfully invite users to free space")
    void spaceInvite_Success_WhenInvitingToFreeSpace() {
        try (MockedStatic<SpaceInfoUtil> mockedSpaceInfo = mockStatic(SpaceInfoUtil.class);
                MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {

            // Arrange
            List<InviteRecordAddDTO> dtos = Arrays.asList(testInviteDto);
            mockedSpaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn("inviter-uid");

            when(spaceService.getSpaceById(TEST_SPACE_ID)).thenReturn(testSpace);
            when(spaceUserService.countFreeSpaceUser(TEST_UID)).thenReturn(5L);
            when(inviteRecordService.countJoiningByUid(TEST_UID, SpaceTypeEnum.FREE)).thenReturn(2L);
            when(spaceLimitProperties.getFree()).thenReturn(spaceLimit);
            when(spaceUserService.countSpaceUserByUids(TEST_SPACE_ID, Arrays.asList(TEST_UID))).thenReturn(0L);
            when(inviteRecordService.countBySpaceIdAndUids(TEST_SPACE_ID, Arrays.asList(TEST_UID))).thenReturn(0L);
            when(userInfoDataService.findByUid(TEST_UID)).thenReturn(Optional.of(testUserInfo));
            when(userInfoDataService.findByUid("inviter-uid")).thenReturn(Optional.of(testUserInfo));
            when(inviteRecordService.saveBatch(any())).thenAnswer(invocation -> {
                List<InviteRecord> records = invocation.getArgument(0);
                for (int i = 0; i < records.size(); i++) {
                    records.get(i).setId((long) (i + 1));
                }
                return true;
            });
            when(tempProperties.getSpaceTitle()).thenReturn("Space Invitation");
            when(tempProperties.getSpaceContent()).thenReturn("You are invited to %s space %s. Link: %s");
            when(tempProperties.getUrl()).thenReturn("http://test.com/invite?code=");

            // Act
            ApiResult<String> result = inviteRecordBizService.spaceInvite(dtos);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            verify(inviteRecordService).saveBatch(any());
            verify(notificationService).sendNotification(any());
        }
    }

    @Test
    @DisplayName("spaceInvite - Should return error when space is full")
    void spaceInvite_Error_WhenSpaceIsFull() {
        try (MockedStatic<SpaceInfoUtil> mockedSpaceInfo = mockStatic(SpaceInfoUtil.class)) {
            // Arrange
            List<InviteRecordAddDTO> dtos = Arrays.asList(testInviteDto);
            mockedSpaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);

            when(spaceService.getSpaceById(TEST_SPACE_ID)).thenReturn(testSpace);
            when(spaceUserService.countFreeSpaceUser(TEST_UID)).thenReturn(8L);
            when(inviteRecordService.countJoiningByUid(TEST_UID, SpaceTypeEnum.FREE)).thenReturn(2L);
            when(spaceLimitProperties.getFree()).thenReturn(spaceLimit);

            // Act
            ApiResult<String> result = inviteRecordBizService.spaceInvite(dtos);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.INVITE_SPACE_USER_FULL.getCode(), result.code());
            verify(inviteRecordService, never()).saveBatch(any());
        }
    }

    @Test
    @DisplayName("spaceInvite - Should return error when user already in space")
    void spaceInvite_Error_WhenUserAlreadyInSpace() {
        try (MockedStatic<SpaceInfoUtil> mockedSpaceInfo = mockStatic(SpaceInfoUtil.class)) {
            // Arrange
            List<InviteRecordAddDTO> dtos = Arrays.asList(testInviteDto);
            mockedSpaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);

            when(spaceService.getSpaceById(TEST_SPACE_ID)).thenReturn(testSpace);
            when(spaceUserService.countFreeSpaceUser(TEST_UID)).thenReturn(5L);
            when(inviteRecordService.countJoiningByUid(TEST_UID, SpaceTypeEnum.FREE)).thenReturn(2L);
            when(spaceLimitProperties.getFree()).thenReturn(spaceLimit);
            when(spaceUserService.countSpaceUserByUids(TEST_SPACE_ID, Arrays.asList(TEST_UID))).thenReturn(1L);

            // Act
            ApiResult<String> result = inviteRecordBizService.spaceInvite(dtos);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.INVITE_USER_ALREADY_SPACE_MEMBER.getCode(), result.code());
        }
    }

    @Test
    @DisplayName("spaceInvite - Should return error when user already invited")
    void spaceInvite_Error_WhenUserAlreadyInvited() {
        try (MockedStatic<SpaceInfoUtil> mockedSpaceInfo = mockStatic(SpaceInfoUtil.class)) {
            // Arrange
            List<InviteRecordAddDTO> dtos = Arrays.asList(testInviteDto);
            mockedSpaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);

            when(spaceService.getSpaceById(TEST_SPACE_ID)).thenReturn(testSpace);
            when(spaceUserService.countFreeSpaceUser(TEST_UID)).thenReturn(5L);
            when(inviteRecordService.countJoiningByUid(TEST_UID, SpaceTypeEnum.FREE)).thenReturn(2L);
            when(spaceLimitProperties.getFree()).thenReturn(spaceLimit);
            when(spaceUserService.countSpaceUserByUids(TEST_SPACE_ID, Arrays.asList(TEST_UID))).thenReturn(0L);
            when(inviteRecordService.countBySpaceIdAndUids(TEST_SPACE_ID, Arrays.asList(TEST_UID))).thenReturn(1L);

            // Act
            ApiResult<String> result = inviteRecordBizService.spaceInvite(dtos);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.INVITE_USER_ALREADY_INVITED.getCode(), result.code());
        }
    }

    // ==================== enterpriseInvite() method tests ====================

    @Test
    @DisplayName("enterpriseInvite - Should successfully invite users to enterprise")
    void enterpriseInvite_Success_WhenInvitingToEnterprise() {
        try (MockedStatic<EnterpriseInfoUtil> mockedEnterpriseInfo = mockStatic(EnterpriseInfoUtil.class);
                MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {

            // Arrange
            List<InviteRecordAddDTO> dtos = Arrays.asList(testInviteDto);
            mockedEnterpriseInfo.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn("inviter-uid");

            when(enterpriseService.getEnterpriseById(TEST_ENTERPRISE_ID)).thenReturn(testEnterprise);
            when(spaceLimitProperties.getEnterprise()).thenReturn(spaceLimit);
            when(enterpriseUserService.countByEnterpriseIdAndUids(TEST_ENTERPRISE_ID, Arrays.asList(TEST_UID))).thenReturn(0L);
            when(enterpriseUserService.countByEnterpriseId(TEST_ENTERPRISE_ID)).thenReturn(5L);
            when(inviteRecordService.countJoiningByEnterpriseId(TEST_ENTERPRISE_ID)).thenReturn(2L);
            when(inviteRecordService.countByEnterpriseIdAndUids(TEST_ENTERPRISE_ID, Arrays.asList(TEST_UID))).thenReturn(0L);
            when(userInfoDataService.findByUid(TEST_UID)).thenReturn(Optional.of(testUserInfo));
            when(userInfoDataService.findByUid("inviter-uid")).thenReturn(Optional.of(testUserInfo));
            when(inviteRecordService.saveBatch(any())).thenAnswer(invocation -> {
                List<InviteRecord> records = invocation.getArgument(0);
                for (int i = 0; i < records.size(); i++) {
                    records.get(i).setId((long) (i + 1));
                }
                return true;
            });
            when(tempProperties.getEnterpriseTitle()).thenReturn("Enterprise Invitation");
            when(tempProperties.getEnterpriseContent()).thenReturn("You are invited to %s enterprise %s. Link: %s");
            when(tempProperties.getUrl()).thenReturn("http://test.com/invite?code=");

            // Act
            ApiResult<String> result = inviteRecordBizService.enterpriseInvite(dtos);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            verify(inviteRecordService).saveBatch(any());
            verify(notificationService).sendNotification(any());
        }
    }

    @Test
    @DisplayName("enterpriseInvite - Should return error when enterprise is full")
    void enterpriseInvite_Error_WhenEnterpriseIsFull() {
        try (MockedStatic<EnterpriseInfoUtil> mockedEnterpriseInfo = mockStatic(EnterpriseInfoUtil.class)) {
            // Arrange
            List<InviteRecordAddDTO> dtos = Arrays.asList(testInviteDto);
            mockedEnterpriseInfo.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);

            when(enterpriseService.getEnterpriseById(TEST_ENTERPRISE_ID)).thenReturn(testEnterprise);
            when(spaceLimitProperties.getEnterprise()).thenReturn(spaceLimit);
            when(enterpriseUserService.countByEnterpriseId(TEST_ENTERPRISE_ID)).thenReturn(8L);
            when(inviteRecordService.countJoiningByEnterpriseId(TEST_ENTERPRISE_ID)).thenReturn(2L);

            // Act
            ApiResult<String> result = inviteRecordBizService.enterpriseInvite(dtos);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.INVITE_ENTERPRISE_USER_FULL.getCode(), result.code());
        }
    }

    @Test
    @DisplayName("enterpriseInvite - Should return error when user already in enterprise")
    void enterpriseInvite_Error_WhenUserAlreadyInEnterprise() {
        try (MockedStatic<EnterpriseInfoUtil> mockedEnterpriseInfo = mockStatic(EnterpriseInfoUtil.class)) {
            // Arrange
            List<InviteRecordAddDTO> dtos = Arrays.asList(testInviteDto);
            mockedEnterpriseInfo.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);

            when(enterpriseService.getEnterpriseById(TEST_ENTERPRISE_ID)).thenReturn(testEnterprise);
            when(spaceLimitProperties.getEnterprise()).thenReturn(spaceLimit);
            when(enterpriseUserService.countByEnterpriseIdAndUids(TEST_ENTERPRISE_ID, Arrays.asList(TEST_UID))).thenReturn(1L);
            when(enterpriseUserService.countByEnterpriseId(TEST_ENTERPRISE_ID)).thenReturn(5L);
            when(inviteRecordService.countJoiningByEnterpriseId(TEST_ENTERPRISE_ID)).thenReturn(2L);

            // Act
            ApiResult<String> result = inviteRecordBizService.enterpriseInvite(dtos);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.INVITE_USER_ALREADY_TEAM_MEMBER.getCode(), result.code());
        }
    }

    // ==================== acceptInvite() method tests ====================

    @Test
    @DisplayName("acceptInvite - Should successfully accept space invitation")
    void acceptInvite_Success_WhenAcceptingSpaceInvitation() {
        try (MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {
            // Arrange
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(TEST_UID);

            when(inviteRecordService.getById(TEST_INVITE_ID)).thenReturn(testInviteRecord);
            when(inviteRecordService.updateById(testInviteRecord)).thenReturn(true);
            when(spaceUserService.addSpaceUser(TEST_SPACE_ID, TEST_UID, SpaceRoleEnum.MEMBER)).thenReturn(true);
            when(spaceService.getSpaceById(TEST_SPACE_ID)).thenReturn(testSpace);

            // Act
            ApiResult<String> result = inviteRecordBizService.acceptInvite(TEST_INVITE_ID);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertEquals(InviteRecordStatusEnum.ACCEPT.getCode(), testInviteRecord.getStatus());
            verify(spaceUserService).addSpaceUser(TEST_SPACE_ID, TEST_UID, SpaceRoleEnum.MEMBER);
        }
    }

    @Test
    @DisplayName("acceptInvite - Should successfully accept enterprise invitation")
    void acceptInvite_Success_WhenAcceptingEnterpriseInvitation() {
        try (MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {
            // Arrange
            testInviteRecord.setType(InviteRecordTypeEnum.ENTERPRISE.getCode());
            testInviteRecord.setEnterpriseId(TEST_ENTERPRISE_ID);
            testInviteRecord.setSpaceId(null);
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(TEST_UID);

            when(inviteRecordService.getById(TEST_INVITE_ID)).thenReturn(testInviteRecord);
            when(inviteRecordService.updateById(testInviteRecord)).thenReturn(true);
            when(enterpriseUserService.addEnterpriseUser(TEST_ENTERPRISE_ID, TEST_UID, EnterpriseRoleEnum.STAFF)).thenReturn(true);

            // Act
            ApiResult<String> result = inviteRecordBizService.acceptInvite(TEST_INVITE_ID);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            verify(enterpriseUserService).addEnterpriseUser(TEST_ENTERPRISE_ID, TEST_UID, EnterpriseRoleEnum.STAFF);
        }
    }

    @Test
    @DisplayName("acceptInvite - Should return error when invite record not found")
    void acceptInvite_Error_WhenInviteRecordNotFound() {
        // Arrange
        when(inviteRecordService.getById(TEST_INVITE_ID)).thenReturn(null);

        // Act
        ApiResult<String> result = inviteRecordBizService.acceptInvite(TEST_INVITE_ID);

        // Assert
        assertNotNull(result);
        assertEquals(ResponseEnum.INVITE_RECORD_NOT_FOUND.getCode(), result.code());
    }

    @Test
    @DisplayName("acceptInvite - Should return error when current user is not invitee")
    void acceptInvite_Error_WhenCurrentUserIsNotInvitee() {
        try (MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {
            // Arrange
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn("other-uid");
            when(inviteRecordService.getById(TEST_INVITE_ID)).thenReturn(testInviteRecord);

            // Act
            ApiResult<String> result = inviteRecordBizService.acceptInvite(TEST_INVITE_ID);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.INVITE_CURRENT_USER_NOT_INVITEE.getCode(), result.code());
        }
    }

    @Test
    @DisplayName("acceptInvite - Should return error when invitation already accepted")
    void acceptInvite_Error_WhenInvitationAlreadyAccepted() {
        try (MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {
            // Arrange
            testInviteRecord.setStatus(InviteRecordStatusEnum.ACCEPT.getCode());
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(TEST_UID);
            when(inviteRecordService.getById(TEST_INVITE_ID)).thenReturn(testInviteRecord);

            // Act
            ApiResult<String> result = inviteRecordBizService.acceptInvite(TEST_INVITE_ID);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.INVITE_ALREADY_ACCEPTED.getCode(), result.code());
        }
    }

    @Test
    @DisplayName("acceptInvite - Should return error when invitation expired")
    void acceptInvite_Error_WhenInvitationExpired() {
        try (MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {
            // Arrange
            testInviteRecord.setExpireTime(LocalDateTime.now().minusDays(1));
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(TEST_UID);
            when(inviteRecordService.getById(TEST_INVITE_ID)).thenReturn(testInviteRecord);

            // Act
            ApiResult<String> result = inviteRecordBizService.acceptInvite(TEST_INVITE_ID);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.INVITE_ALREADY_EXPIRED.getCode(), result.code());
        }
    }

    // ==================== refuseInvite() method tests ====================

    @Test
    @DisplayName("refuseInvite - Should successfully refuse invitation")
    void refuseInvite_Success_WhenRefusingInvitation() {
        try (MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {
            // Arrange
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(TEST_UID);
            when(inviteRecordService.getById(TEST_INVITE_ID)).thenReturn(testInviteRecord);
            when(inviteRecordService.updateById(testInviteRecord)).thenReturn(true);

            // Act
            ApiResult<String> result = inviteRecordBizService.refuseInvite(TEST_INVITE_ID);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertEquals(InviteRecordStatusEnum.REFUSE.getCode(), testInviteRecord.getStatus());
        }
    }

    @Test
    @DisplayName("refuseInvite - Should return error when update fails")
    void refuseInvite_Error_WhenUpdateFails() {
        try (MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {
            // Arrange
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(TEST_UID);
            when(inviteRecordService.getById(TEST_INVITE_ID)).thenReturn(testInviteRecord);
            when(inviteRecordService.updateById(testInviteRecord)).thenReturn(false);

            // Act
            ApiResult<String> result = inviteRecordBizService.refuseInvite(TEST_INVITE_ID);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.OPERATION_FAILED.getCode(), result.code());
        }
    }

    // ==================== revokeEnterpriseInvite() method tests ====================

    @Test
    @DisplayName("revokeEnterpriseInvite - Should successfully revoke enterprise invitation")
    void revokeEnterpriseInvite_Success_WhenRevokingEnterpriseInvitation() {
        try (MockedStatic<EnterpriseInfoUtil> mockedEnterpriseInfo = mockStatic(EnterpriseInfoUtil.class)) {
            // Arrange
            testInviteRecord.setType(InviteRecordTypeEnum.ENTERPRISE.getCode());
            testInviteRecord.setEnterpriseId(TEST_ENTERPRISE_ID);
            mockedEnterpriseInfo.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);

            when(inviteRecordService.getById(TEST_INVITE_ID)).thenReturn(testInviteRecord);
            when(inviteRecordService.updateById(testInviteRecord)).thenReturn(true);

            // Act
            ApiResult<String> result = inviteRecordBizService.revokeEnterpriseInvite(TEST_INVITE_ID);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertEquals(InviteRecordStatusEnum.WITHDRAW.getCode(), testInviteRecord.getStatus());
        }
    }

    @Test
    @DisplayName("revokeEnterpriseInvite - Should return error when enterprise inconsistent")
    void revokeEnterpriseInvite_Error_WhenEnterpriseInconsistent() {
        try (MockedStatic<EnterpriseInfoUtil> mockedEnterpriseInfo = mockStatic(EnterpriseInfoUtil.class)) {
            // Arrange
            testInviteRecord.setEnterpriseId(999L);
            mockedEnterpriseInfo.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);
            when(inviteRecordService.getById(TEST_INVITE_ID)).thenReturn(testInviteRecord);

            // Act
            ApiResult<String> result = inviteRecordBizService.revokeEnterpriseInvite(TEST_INVITE_ID);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.INVITE_ENTERPRISE_INCONSISTENT.getCode(), result.code());
        }
    }

    @Test
    @DisplayName("revokeEnterpriseInvite - Should return error when status not supported")
    void revokeEnterpriseInvite_Error_WhenStatusNotSupported() {
        try (MockedStatic<EnterpriseInfoUtil> mockedEnterpriseInfo = mockStatic(EnterpriseInfoUtil.class)) {
            // Arrange
            testInviteRecord.setEnterpriseId(TEST_ENTERPRISE_ID);
            testInviteRecord.setStatus(InviteRecordStatusEnum.ACCEPT.getCode());
            mockedEnterpriseInfo.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);
            when(inviteRecordService.getById(TEST_INVITE_ID)).thenReturn(testInviteRecord);

            // Act
            ApiResult<String> result = inviteRecordBizService.revokeEnterpriseInvite(TEST_INVITE_ID);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.INVITE_STATUS_NOT_SUPPORTED.getCode(), result.code());
        }
    }

    // ==================== revokeSpaceInvite() method tests ====================

    @Test
    @DisplayName("revokeSpaceInvite - Should successfully revoke space invitation")
    void revokeSpaceInvite_Success_WhenRevokingSpaceInvitation() {
        try (MockedStatic<SpaceInfoUtil> mockedSpaceInfo = mockStatic(SpaceInfoUtil.class)) {
            // Arrange
            mockedSpaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);
            when(inviteRecordService.getById(TEST_INVITE_ID)).thenReturn(testInviteRecord);
            when(inviteRecordService.updateById(testInviteRecord)).thenReturn(true);

            // Act
            ApiResult<String> result = inviteRecordBizService.revokeSpaceInvite(TEST_INVITE_ID);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertEquals(InviteRecordStatusEnum.WITHDRAW.getCode(), testInviteRecord.getStatus());
        }
    }

    @Test
    @DisplayName("revokeSpaceInvite - Should return error when space inconsistent")
    void revokeSpaceInvite_Error_WhenSpaceInconsistent() {
        try (MockedStatic<SpaceInfoUtil> mockedSpaceInfo = mockStatic(SpaceInfoUtil.class)) {
            // Arrange
            testInviteRecord.setSpaceId(999L);
            mockedSpaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);
            when(inviteRecordService.getById(TEST_INVITE_ID)).thenReturn(testInviteRecord);

            // Act
            ApiResult<String> result = inviteRecordBizService.revokeSpaceInvite(TEST_INVITE_ID);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SPACE_APPLICATION_CURRENT_SPACE_INCONSISTENT.getCode(), result.code());
        }
    }

    // ==================== getRecordByParam() method tests ====================

    @Test
    @DisplayName("getRecordByParam - Should successfully get invitation record for space invitation")
    void getRecordByParam_Success_WhenGettingSpaceInvitationRecord() {
        try (MockedStatic<AESUtil> mockedAES = mockStatic(AESUtil.class)) {
            // Arrange
            String encryptedParam = "encrypted-param";
            InviteRecordVO inviteRecordVO = new InviteRecordVO();
            inviteRecordVO.setId(TEST_INVITE_ID);
            inviteRecordVO.setType(InviteRecordTypeEnum.SPACE.getCode());
            inviteRecordVO.setSpaceId(TEST_SPACE_ID);
            inviteRecordVO.setInviterUid("inviter-uid");
            inviteRecordVO.setInviteeUid(TEST_UID);

            SpaceUser spaceOwner = new SpaceUser();
            spaceOwner.setUid("owner-uid");

            mockedAES.when(() -> AESUtil.decrypt(eq(encryptedParam), any())).thenReturn(TEST_INVITE_ID.toString());
            when(inviteRecordService.selectVOById(TEST_INVITE_ID)).thenReturn(inviteRecordVO);
            when(userInfoDataService.findByUid("inviter-uid")).thenReturn(Optional.of(testUserInfo));
            when(spaceUserService.getSpaceOwner(TEST_SPACE_ID)).thenReturn(spaceOwner);
            when(userInfoDataService.findByUid("owner-uid")).thenReturn(Optional.of(testUserInfo));
            when(spaceService.getSpaceById(TEST_SPACE_ID)).thenReturn(testSpace);
            when(spaceUserService.getSpaceUserByUid(TEST_SPACE_ID, TEST_UID)).thenReturn(null);

            // Act
            InviteRecordVO result = inviteRecordBizService.getRecordByParam(encryptedParam);

            // Assert
            assertNotNull(result);
            assertEquals(TEST_INVITE_ID, result.getId());
            assertEquals(testUserInfo.getNickname(), result.getInviterName());
            assertEquals(testSpace.getName(), result.getSpaceName());
            assertFalse(result.getIsBelong());
        }
    }

    @Test
    @DisplayName("getRecordByParam - Should throw exception when parameter cannot be decrypted")
    void getRecordByParam_ThrowsException_WhenParameterCannotBeDecrypted() {
        try (MockedStatic<AESUtil> mockedAES = mockStatic(AESUtil.class)) {
            // Arrange
            String encryptedParam = "invalid-param";
            mockedAES.when(() -> AESUtil.decrypt(eq(encryptedParam), any())).thenThrow(new RuntimeException());

            // Act & Assert
            BusinessException exception = assertThrows(BusinessException.class,
                    () -> inviteRecordBizService.getRecordByParam(encryptedParam));
            assertEquals(ResponseEnum.INVITE_PARAMETER_EXCEPTION, exception.getResponseEnum());
        }
    }

    @Test
    @DisplayName("getRecordByParam - Should throw exception when record not found")
    void getRecordByParam_ThrowsException_WhenRecordNotFound() {
        try (MockedStatic<AESUtil> mockedAES = mockStatic(AESUtil.class)) {
            // Arrange
            String encryptedParam = "encrypted-param";
            mockedAES.when(() -> AESUtil.decrypt(eq(encryptedParam), any())).thenReturn(TEST_INVITE_ID.toString());
            when(inviteRecordService.selectVOById(TEST_INVITE_ID)).thenReturn(null);

            // Act & Assert
            BusinessException exception = assertThrows(BusinessException.class,
                    () -> inviteRecordBizService.getRecordByParam(encryptedParam));
            assertEquals(ResponseEnum.INVITE_RECORD_NOT_FOUND, exception.getResponseEnum());
        }
    }

    // ==================== searchUser() method tests ====================

    @Test
    @DisplayName("searchUser - Should successfully search users by mobile for space")
    void searchUser_Success_WhenSearchingUsersByMobileForSpace() {
        try (MockedStatic<SpaceInfoUtil> mockedSpaceInfo = mockStatic(SpaceInfoUtil.class)) {
            // Arrange
            mockedSpaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);

            List<UserInfo> userInfos = Arrays.asList(testUserInfo);
            List<SpaceUser> spaceUsers = new ArrayList<>();

            when(userInfoDataService.findUsersByMobile(TEST_MOBILE)).thenReturn(userInfos);
            when(spaceUserService.getAllSpaceUsers(TEST_SPACE_ID)).thenReturn(spaceUsers);
            when(inviteRecordService.getInvitingUids(InviteRecordTypeEnum.SPACE)).thenReturn(Collections.emptySet());

            // Act
            List<ChatUserVO> result = inviteRecordBizService.searchUser(TEST_MOBILE, InviteRecordTypeEnum.SPACE);

            // Assert
            assertNotNull(result);
            assertEquals(1, result.size());
            ChatUserVO chatUser = result.get(0);
            assertEquals(TEST_UID, chatUser.getUid());
            assertEquals(TEST_MOBILE, chatUser.getMobile());
            assertEquals(0, chatUser.getStatus()); // Not joined, not inviting
        }
    }

    @Test
    @DisplayName("searchUser - Should return empty list when no users found")
    void searchUser_Success_WhenNoUsersFound() {
        // Arrange
        when(userInfoDataService.findUsersByMobile(TEST_MOBILE)).thenReturn(Collections.emptyList());

        // Act
        List<ChatUserVO> result = inviteRecordBizService.searchUser(TEST_MOBILE, InviteRecordTypeEnum.SPACE);

        // Assert
        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    // ==================== searchUsername() method tests ====================

    @Test
    @DisplayName("searchUsername - Should successfully search users by username")
    void searchUsername_Success_WhenSearchingUsersByUsername() {
        try (MockedStatic<SpaceInfoUtil> mockedSpaceInfo = mockStatic(SpaceInfoUtil.class)) {
            // Arrange
            mockedSpaceInfo.when(SpaceInfoUtil::getSpaceId).thenReturn(TEST_SPACE_ID);

            List<UserInfo> userInfos = Arrays.asList(testUserInfo);
            List<SpaceUser> spaceUsers = new ArrayList<>();

            when(userInfoDataService.findUsersByUsername(TEST_USERNAME)).thenReturn(userInfos);
            when(spaceUserService.getAllSpaceUsers(TEST_SPACE_ID)).thenReturn(spaceUsers);
            when(inviteRecordService.getInvitingUids(InviteRecordTypeEnum.SPACE)).thenReturn(Collections.emptySet());

            // Act
            List<ChatUserVO> result = inviteRecordBizService.searchUsername(TEST_USERNAME, InviteRecordTypeEnum.SPACE);

            // Assert
            assertNotNull(result);
            assertEquals(1, result.size());
            assertEquals(TEST_UID, result.get(0).getUid());
        }
    }

    // ==================== searchUserBatch() method tests ====================

    @Test
    @DisplayName("searchUserBatch - Should successfully process batch user search")
    void searchUserBatch_Success_WhenProcessingBatchUserSearch() throws IOException {
        try (MockedStatic<EnterpriseInfoUtil> mockedEnterpriseInfo = mockStatic(EnterpriseInfoUtil.class)) {
            // Arrange
            MultipartFile mockFile = mock(MultipartFile.class);
            String excelContent = "mobile\n13800138000\n13800138001";
            InputStream inputStream = new ByteArrayInputStream(excelContent.getBytes());

            UserLimitVO userLimit = new UserLimitVO();
            userLimit.setRemain(100);

            mockedEnterpriseInfo.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);
            when(mockFile.getInputStream()).thenReturn(inputStream);
            when(enterpriseUserBizService.getUserLimit(TEST_ENTERPRISE_ID)).thenReturn(userLimit);
            when(userInfoDataService.findUsersByMobiles(any())).thenReturn(Arrays.asList(testUserInfo));
            when(enterpriseUserService.listByEnterpriseId(TEST_ENTERPRISE_ID)).thenReturn(Collections.emptyList());
            when(inviteRecordService.getInvitingUids(InviteRecordTypeEnum.ENTERPRISE)).thenReturn(Collections.emptySet());
            when(s3ClientUtil.uploadObject(anyString(), anyString(), any(InputStream.class))).thenReturn("http://s3.amazonaws.com/result.xlsx");

            // Act
            ApiResult<BatchChatUserVO> result = inviteRecordBizService.searchUserBatch(mockFile);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertNotNull(result.data());
            assertNotNull(result.data().getResultUrl());
        }
    }

    @Test
    @DisplayName("searchUserBatch - Should return error when no phone numbers in file")
    void searchUserBatch_Error_WhenNoPhoneNumbersInFile() throws IOException {
        // Arrange
        MultipartFile mockFile = mock(MultipartFile.class);
        String excelContent = "mobile\n";
        InputStream inputStream = new ByteArrayInputStream(excelContent.getBytes());

        when(mockFile.getInputStream()).thenReturn(inputStream);

        // Act
        ApiResult<BatchChatUserVO> result = inviteRecordBizService.searchUserBatch(mockFile);

        // Assert
        assertNotNull(result);
        assertEquals(ResponseEnum.INVITE_PLEASE_UPLOAD_PHONE_NUMBERS.getCode(), result.code());
    }

    @Test
    @DisplayName("searchUserBatch - Should return error when file read fails")
    void searchUserBatch_Error_WhenFileReadFails() throws IOException {
        // Arrange
        MultipartFile mockFile = mock(MultipartFile.class);
        when(mockFile.getInputStream()).thenThrow(new IOException("File read error"));

        // Act
        ApiResult<BatchChatUserVO> result = inviteRecordBizService.searchUserBatch(mockFile);

        // Assert
        assertNotNull(result);
        assertEquals(ResponseEnum.INVITE_READ_UPLOAD_FILE_FAILED.getCode(), result.code());
    }

    // ==================== searchUsernameBatch() method tests ====================

    @Test
    @DisplayName("searchUsernameBatch - Should successfully process batch username search")
    void searchUsernameBatch_Success_WhenProcessingBatchUsernameSearch() throws IOException {
        try (MockedStatic<EnterpriseInfoUtil> mockedEnterpriseInfo = mockStatic(EnterpriseInfoUtil.class)) {
            // Arrange
            MultipartFile mockFile = mock(MultipartFile.class);
            String excelContent = "username\ntestuser1\ntestuser2";
            InputStream inputStream = new ByteArrayInputStream(excelContent.getBytes());

            UserLimitVO userLimit = new UserLimitVO();
            userLimit.setRemain(100);

            mockedEnterpriseInfo.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);
            when(mockFile.getInputStream()).thenReturn(inputStream);
            when(enterpriseUserBizService.getUserLimit(TEST_ENTERPRISE_ID)).thenReturn(userLimit);
            when(userInfoDataService.findUsersByUsernames(any())).thenReturn(Arrays.asList(testUserInfo));
            when(enterpriseUserService.listByEnterpriseId(TEST_ENTERPRISE_ID)).thenReturn(Collections.emptyList());
            when(inviteRecordService.getInvitingUids(InviteRecordTypeEnum.ENTERPRISE)).thenReturn(Collections.emptySet());
            when(s3ClientUtil.uploadObject(anyString(), anyString(), any(InputStream.class))).thenReturn("http://s3.amazonaws.com/result.xlsx");

            // Act
            ApiResult<BatchChatUserVO> result = inviteRecordBizService.searchUsernameBatch(mockFile);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertNotNull(result.data());
        }
    }

    @Test
    @DisplayName("searchUsernameBatch - Should return error when no usernames in file")
    void searchUsernameBatch_Error_WhenNoUsernamesInFile() throws IOException {
        // Arrange
        MultipartFile mockFile = mock(MultipartFile.class);
        String excelContent = "username\n";
        InputStream inputStream = new ByteArrayInputStream(excelContent.getBytes());

        when(mockFile.getInputStream()).thenReturn(inputStream);

        // Act
        ApiResult<BatchChatUserVO> result = inviteRecordBizService.searchUsernameBatch(mockFile);

        // Assert
        assertNotNull(result);
        assertEquals(ResponseEnum.INVITE_PLEASE_UPLOAD_USERNAMES.getCode(), result.code());
    }
}
