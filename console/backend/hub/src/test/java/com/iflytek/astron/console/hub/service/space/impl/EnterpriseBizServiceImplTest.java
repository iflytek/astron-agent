package com.iflytek.astron.console.hub.service.space.impl;

import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.dto.space.EnterpriseAddDTO;
import com.iflytek.astron.console.commons.entity.space.Enterprise;
import com.iflytek.astron.console.commons.entity.space.EnterpriseUser;
import com.iflytek.astron.console.commons.enums.space.EnterpriseRoleEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.mapper.space.EnterpriseMapper;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.commons.service.space.EnterpriseService;
import com.iflytek.astron.console.commons.service.space.EnterpriseUserService;
import com.iflytek.astron.console.commons.util.RequestContextUtil;
import com.iflytek.astron.console.commons.util.space.EnterpriseInfoUtil;
import com.iflytek.astron.console.commons.enums.space.EnterpriseServiceTypeEnum;
import com.iflytek.astron.console.commons.util.space.OrderInfoUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for EnterpriseBizServiceImpl Tests all public methods with comprehensive coverage of
 * success and failure scenarios
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("EnterpriseBizServiceImpl Unit Tests")
class EnterpriseBizServiceImplTest {

    @Mock
    private EnterpriseMapper enterpriseMapper;

    @Mock
    private EnterpriseUserService enterpriseUserService;

    @Mock
    private EnterpriseService enterpriseService;

    @InjectMocks
    private EnterpriseBizServiceImpl enterpriseBizService;

    private static final String TEST_UID = "test-uid-123";
    private static final Long TEST_ENTERPRISE_ID = 1L;
    private static final String TEST_ENTERPRISE_NAME = "Test Enterprise";
    private static final String TEST_AVATAR_URL = "http://example.com/avatar.jpg";
    private static final String TEST_LOGO_URL = "http://example.com/logo.jpg";

    private Enterprise testEnterprise;
    private EnterpriseUser testEnterpriseUser;
    private EnterpriseAddDTO testEnterpriseAddDTO;

    @BeforeEach
    void setUp() {
        // Initialize test data
        testEnterprise = new Enterprise();
        testEnterprise.setId(TEST_ENTERPRISE_ID);
        testEnterprise.setName(TEST_ENTERPRISE_NAME);
        testEnterprise.setUid(TEST_UID);
        testEnterprise.setAvatarUrl(TEST_AVATAR_URL);
        testEnterprise.setLogoUrl(TEST_LOGO_URL);
        testEnterprise.setOrgId(123456L);
        testEnterprise.setServiceType(1);
        testEnterprise.setExpireTime(LocalDateTime.now().plusDays(30));

        testEnterpriseUser = new EnterpriseUser();
        testEnterpriseUser.setEnterpriseId(TEST_ENTERPRISE_ID);
        testEnterpriseUser.setUid(TEST_UID);
        testEnterpriseUser.setRole(EnterpriseRoleEnum.OFFICER.getCode());

        testEnterpriseAddDTO = new EnterpriseAddDTO();
        testEnterpriseAddDTO.setName(TEST_ENTERPRISE_NAME);
        testEnterpriseAddDTO.setAvatarUrl(TEST_AVATAR_URL);
    }

    @Test
    @DisplayName("visitEnterprise - Should successfully visit enterprise when valid enterprise ID and user is member")
    void visitEnterprise_Success_WhenValidEnterpriseIdAndUserIsMember() {
        try (MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {
            // Arrange
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(TEST_UID);
            when(enterpriseService.getEnterpriseById(TEST_ENTERPRISE_ID)).thenReturn(testEnterprise);
            when(enterpriseUserService.getEnterpriseUserByUid(TEST_ENTERPRISE_ID, TEST_UID)).thenReturn(testEnterpriseUser);
            when(enterpriseService.setLastVisitEnterpriseId(TEST_ENTERPRISE_ID)).thenReturn(true);

            // Act
            ApiResult<Boolean> result = enterpriseBizService.visitEnterprise(TEST_ENTERPRISE_ID);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertTrue(result.data());
            verify(enterpriseService).getEnterpriseById(TEST_ENTERPRISE_ID);
            verify(enterpriseUserService).getEnterpriseUserByUid(TEST_ENTERPRISE_ID, TEST_UID);
            verify(enterpriseService).setLastVisitEnterpriseId(TEST_ENTERPRISE_ID);
        }
    }

    @Test
    @DisplayName("visitEnterprise - Should successfully set last visit to null when enterprise ID is null")
    void visitEnterprise_Success_WhenEnterpriseIdIsNull() {
        try (MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {
            // Arrange
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(TEST_UID);
            when(enterpriseService.setLastVisitEnterpriseId(null)).thenReturn(true);

            // Act
            ApiResult<Boolean> result = enterpriseBizService.visitEnterprise(null);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertTrue(result.data());
            verify(enterpriseService).setLastVisitEnterpriseId(null);
            verifyNoInteractions(enterpriseUserService);
        }
    }

    @Test
    @DisplayName("visitEnterprise - Should successfully set last visit to null when enterprise ID is zero or negative")
    void visitEnterprise_Success_WhenEnterpriseIdIsZeroOrNegative() {
        try (MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {
            // Arrange
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(TEST_UID);
            when(enterpriseService.setLastVisitEnterpriseId(null)).thenReturn(true);

            // Act
            ApiResult<Boolean> result1 = enterpriseBizService.visitEnterprise(0L);
            ApiResult<Boolean> result2 = enterpriseBizService.visitEnterprise(-1L);

            // Assert
            assertNotNull(result1);
            assertEquals(ResponseEnum.SUCCESS.getCode(), result1.code());
            assertTrue(result1.data());

            assertNotNull(result2);
            assertEquals(ResponseEnum.SUCCESS.getCode(), result2.code());
            assertTrue(result2.data());

            verify(enterpriseService, times(2)).setLastVisitEnterpriseId(null);
        }
    }

    @Test
    @DisplayName("visitEnterprise - Should return error when enterprise does not exist")
    void visitEnterprise_Error_WhenEnterpriseDoesNotExist() {
        try (MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {
            // Arrange
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(TEST_UID);
            when(enterpriseService.getEnterpriseById(TEST_ENTERPRISE_ID)).thenReturn(null);

            // Act
            ApiResult<Boolean> result = enterpriseBizService.visitEnterprise(TEST_ENTERPRISE_ID);

            // Assert
            assertNotNull(result);
            assertNotEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertEquals(ResponseEnum.ENTERPRISE_NOT_EXISTS.getCode(), result.code());
            verify(enterpriseService).getEnterpriseById(TEST_ENTERPRISE_ID);
            verifyNoInteractions(enterpriseUserService);
        }
    }

    @Test
    @DisplayName("visitEnterprise - Should return error when user is not member of enterprise")
    void visitEnterprise_Error_WhenUserIsNotMember() {
        try (MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {
            // Arrange
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(TEST_UID);
            when(enterpriseService.getEnterpriseById(TEST_ENTERPRISE_ID)).thenReturn(testEnterprise);
            when(enterpriseUserService.getEnterpriseUserByUid(TEST_ENTERPRISE_ID, TEST_UID)).thenReturn(null);

            // Act
            ApiResult<Boolean> result = enterpriseBizService.visitEnterprise(TEST_ENTERPRISE_ID);

            // Assert
            assertNotNull(result);
            assertNotEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertEquals(ResponseEnum.ENTERPRISE_USER_NOT_IN_ENTERPRISE.getCode(), result.code());
            verify(enterpriseService).getEnterpriseById(TEST_ENTERPRISE_ID);
            verify(enterpriseUserService).getEnterpriseUserByUid(TEST_ENTERPRISE_ID, TEST_UID);
        }
    }

    @Test
    @DisplayName("create - Should successfully create enterprise when valid input and user has purchase plan")
    void create_Success_WhenValidInputAndUserHasPurchasePlan() {
        try (MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class);
                MockedStatic<OrderInfoUtil> mockedOrderInfo = mockStatic(OrderInfoUtil.class);
                MockedStatic<IdWorker> mockedIdWorker = mockStatic(IdWorker.class)) {

            // Arrange
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(TEST_UID);

            OrderInfoUtil.EnterpriseResult enterpriseResult = mock(OrderInfoUtil.EnterpriseResult.class);
            when(enterpriseResult.getServiceType()).thenReturn(EnterpriseServiceTypeEnum.ENTERPRISE);
            when(enterpriseResult.getEndTime()).thenReturn(LocalDateTime.now().plusDays(30));

            mockedOrderInfo.when(() -> OrderInfoUtil.getEnterpriseResult(TEST_UID)).thenReturn(enterpriseResult);
            mockedIdWorker.when(IdWorker::getId).thenReturn(123456L);

            when(enterpriseService.checkExistByName(TEST_ENTERPRISE_NAME, null)).thenReturn(false);
            when(enterpriseService.checkExistByUid(TEST_UID)).thenReturn(false);
            when(enterpriseService.save(any(Enterprise.class))).thenReturn(true);
            when(enterpriseUserService.addEnterpriseUser(isNull(), eq(TEST_UID), eq(EnterpriseRoleEnum.OFFICER))).thenReturn(true);

            // Act
            ApiResult<Long> result = enterpriseBizService.create(testEnterpriseAddDTO);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertNull(result.data()); // Enterprise.getId() returns null for new entities
            verify(enterpriseService).checkExistByName(TEST_ENTERPRISE_NAME, null);
            verify(enterpriseService).checkExistByUid(TEST_UID);
            verify(enterpriseService).save(any(Enterprise.class));
            verify(enterpriseUserService).addEnterpriseUser(isNull(), eq(TEST_UID), eq(EnterpriseRoleEnum.OFFICER));
        }
    }

    @Test
    @DisplayName("create - Should return error when user has no purchase plan")
    void create_Error_WhenUserHasNoPurchasePlan() {
        try (MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class);
                MockedStatic<OrderInfoUtil> mockedOrderInfo = mockStatic(OrderInfoUtil.class)) {

            // Arrange
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(TEST_UID);
            mockedOrderInfo.when(() -> OrderInfoUtil.getEnterpriseResult(TEST_UID)).thenReturn(null);

            // Act
            ApiResult<Long> result = enterpriseBizService.create(testEnterpriseAddDTO);

            // Assert
            assertNotNull(result);
            assertNotEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertEquals(ResponseEnum.ENTERPRISE_PLEASE_BUY_PLAN_FIRST.getCode(), result.code());
            verifyNoInteractions(enterpriseService);
        }
    }

    @Test
    @DisplayName("create - Should return error when enterprise name already exists")
    void create_Error_WhenEnterpriseNameExists() {
        try (MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class);
                MockedStatic<OrderInfoUtil> mockedOrderInfo = mockStatic(OrderInfoUtil.class)) {

            // Arrange
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(TEST_UID);

            OrderInfoUtil.EnterpriseResult enterpriseResult = mock(OrderInfoUtil.EnterpriseResult.class);
            mockedOrderInfo.when(() -> OrderInfoUtil.getEnterpriseResult(TEST_UID)).thenReturn(enterpriseResult);

            when(enterpriseService.checkExistByName(TEST_ENTERPRISE_NAME, null)).thenReturn(true);

            // Act
            ApiResult<Long> result = enterpriseBizService.create(testEnterpriseAddDTO);

            // Assert
            assertNotNull(result);
            assertNotEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertEquals(ResponseEnum.ENTERPRISE_NAME_EXISTS.getCode(), result.code());
            verify(enterpriseService).checkExistByName(TEST_ENTERPRISE_NAME, null);
        }
    }

    @Test
    @DisplayName("create - Should return error when user already created enterprise")
    void create_Error_WhenUserAlreadyCreatedEnterprise() {
        try (MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class);
                MockedStatic<OrderInfoUtil> mockedOrderInfo = mockStatic(OrderInfoUtil.class)) {

            // Arrange
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(TEST_UID);

            OrderInfoUtil.EnterpriseResult enterpriseResult = mock(OrderInfoUtil.EnterpriseResult.class);
            mockedOrderInfo.when(() -> OrderInfoUtil.getEnterpriseResult(TEST_UID)).thenReturn(enterpriseResult);

            when(enterpriseService.checkExistByName(TEST_ENTERPRISE_NAME, null)).thenReturn(false);
            when(enterpriseService.checkExistByUid(TEST_UID)).thenReturn(true);

            // Act
            ApiResult<Long> result = enterpriseBizService.create(testEnterpriseAddDTO);

            // Assert
            assertNotNull(result);
            assertNotEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertEquals(ResponseEnum.ENTERPRISE_USER_ALREADY_CREATED_ENTERPRISE.getCode(), result.code());
            verify(enterpriseService).checkExistByName(TEST_ENTERPRISE_NAME, null);
            verify(enterpriseService).checkExistByUid(TEST_UID);
        }
    }

    @Test
    @DisplayName("create - Should return error when enterprise save fails")
    void create_Error_WhenEnterpriseSaveFails() {
        try (MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class);
                MockedStatic<OrderInfoUtil> mockedOrderInfo = mockStatic(OrderInfoUtil.class);
                MockedStatic<IdWorker> mockedIdWorker = mockStatic(IdWorker.class)) {

            // Arrange
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(TEST_UID);

            OrderInfoUtil.EnterpriseResult enterpriseResult = mock(OrderInfoUtil.EnterpriseResult.class);
            when(enterpriseResult.getServiceType()).thenReturn(EnterpriseServiceTypeEnum.ENTERPRISE);
            when(enterpriseResult.getEndTime()).thenReturn(LocalDateTime.now().plusDays(30));

            mockedOrderInfo.when(() -> OrderInfoUtil.getEnterpriseResult(TEST_UID)).thenReturn(enterpriseResult);
            mockedIdWorker.when(IdWorker::getId).thenReturn(123456L);

            when(enterpriseService.checkExistByName(TEST_ENTERPRISE_NAME, null)).thenReturn(false);
            when(enterpriseService.checkExistByUid(TEST_UID)).thenReturn(false);
            when(enterpriseService.save(any(Enterprise.class))).thenReturn(false);

            // Act
            ApiResult<Long> result = enterpriseBizService.create(testEnterpriseAddDTO);

            // Assert
            assertNotNull(result);
            assertNotEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertEquals(ResponseEnum.ENTERPRISE_CREATE_FAILED.getCode(), result.code());
            verify(enterpriseService).save(any(Enterprise.class));
        }
    }

    @Test
    @DisplayName("create - Should throw BusinessException when adding enterprise user fails")
    void create_ThrowsBusinessException_WhenAddingEnterpriseUserFails() {
        try (MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class);
                MockedStatic<OrderInfoUtil> mockedOrderInfo = mockStatic(OrderInfoUtil.class);
                MockedStatic<IdWorker> mockedIdWorker = mockStatic(IdWorker.class)) {

            // Arrange
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(TEST_UID);

            OrderInfoUtil.EnterpriseResult enterpriseResult = mock(OrderInfoUtil.EnterpriseResult.class);
            when(enterpriseResult.getServiceType()).thenReturn(EnterpriseServiceTypeEnum.ENTERPRISE);
            when(enterpriseResult.getEndTime()).thenReturn(LocalDateTime.now().plusDays(30));

            mockedOrderInfo.when(() -> OrderInfoUtil.getEnterpriseResult(TEST_UID)).thenReturn(enterpriseResult);
            mockedIdWorker.when(IdWorker::getId).thenReturn(123456L);

            when(enterpriseService.checkExistByName(TEST_ENTERPRISE_NAME, null)).thenReturn(false);
            when(enterpriseService.checkExistByUid(TEST_UID)).thenReturn(false);
            when(enterpriseService.save(any(Enterprise.class))).thenReturn(true);
            when(enterpriseUserService.addEnterpriseUser(isNull(), eq(TEST_UID), eq(EnterpriseRoleEnum.OFFICER))).thenReturn(false);

            // Act & Assert
            BusinessException exception = assertThrows(BusinessException.class,
                    () -> enterpriseBizService.create(testEnterpriseAddDTO));

            assertEquals(ResponseEnum.INVITE_ADD_TEAM_USER_FAILED, exception.getResponseEnum());
            verify(enterpriseService).save(any(Enterprise.class));
            verify(enterpriseUserService).addEnterpriseUser(isNull(), eq(TEST_UID), eq(EnterpriseRoleEnum.OFFICER));
        }
    }

    @Test
    @DisplayName("updateName - Should successfully update enterprise name when valid input")
    void updateName_Success_WhenValidInput() {
        try (MockedStatic<EnterpriseInfoUtil> mockedEnterpriseInfo = mockStatic(EnterpriseInfoUtil.class)) {
            // Arrange
            String newName = "New Enterprise Name";
            mockedEnterpriseInfo.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);
            when(enterpriseService.checkExistByName(newName, TEST_ENTERPRISE_ID)).thenReturn(false);
            when(enterpriseService.getById(TEST_ENTERPRISE_ID)).thenReturn(testEnterprise);
            when(enterpriseService.updateById(any(Enterprise.class))).thenReturn(true);

            // Act
            ApiResult<String> result = enterpriseBizService.updateName(newName);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            verify(enterpriseService).checkExistByName(newName, TEST_ENTERPRISE_ID);
            verify(enterpriseService).getById(TEST_ENTERPRISE_ID);
            verify(enterpriseService).updateById(any(Enterprise.class));
        }
    }

    @Test
    @DisplayName("updateName - Should return error when name already exists")
    void updateName_Error_WhenNameAlreadyExists() {
        try (MockedStatic<EnterpriseInfoUtil> mockedEnterpriseInfo = mockStatic(EnterpriseInfoUtil.class)) {
            // Arrange
            String newName = "Existing Enterprise Name";
            mockedEnterpriseInfo.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);
            when(enterpriseService.checkExistByName(newName, TEST_ENTERPRISE_ID)).thenReturn(true);

            // Act
            ApiResult<String> result = enterpriseBizService.updateName(newName);

            // Assert
            assertNotNull(result);
            assertNotEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertEquals(ResponseEnum.ENTERPRISE_NAME_EXISTS.getCode(), result.code());
            verify(enterpriseService).checkExistByName(newName, TEST_ENTERPRISE_ID);
            verify(enterpriseService, never()).getById(any());
        }
    }

    @Test
    @DisplayName("updateName - Should return error when enterprise does not exist")
    void updateName_Error_WhenEnterpriseDoesNotExist() {
        try (MockedStatic<EnterpriseInfoUtil> mockedEnterpriseInfo = mockStatic(EnterpriseInfoUtil.class)) {
            // Arrange
            String newName = "New Enterprise Name";
            mockedEnterpriseInfo.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);
            when(enterpriseService.checkExistByName(newName, TEST_ENTERPRISE_ID)).thenReturn(false);
            when(enterpriseService.getById(TEST_ENTERPRISE_ID)).thenReturn(null);

            // Act
            ApiResult<String> result = enterpriseBizService.updateName(newName);

            // Assert
            assertNotNull(result);
            assertNotEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertEquals(ResponseEnum.ENTERPRISE_NOT_EXISTS.getCode(), result.code());
            verify(enterpriseService).checkExistByName(newName, TEST_ENTERPRISE_ID);
            verify(enterpriseService).getById(TEST_ENTERPRISE_ID);
            verify(enterpriseService, never()).updateById(any());
        }
    }

    @Test
    @DisplayName("updateName - Should return error when update fails")
    void updateName_Error_WhenUpdateFails() {
        try (MockedStatic<EnterpriseInfoUtil> mockedEnterpriseInfo = mockStatic(EnterpriseInfoUtil.class)) {
            // Arrange
            String newName = "New Enterprise Name";
            mockedEnterpriseInfo.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);
            when(enterpriseService.checkExistByName(newName, TEST_ENTERPRISE_ID)).thenReturn(false);
            when(enterpriseService.getById(TEST_ENTERPRISE_ID)).thenReturn(testEnterprise);
            when(enterpriseService.updateById(any(Enterprise.class))).thenReturn(false);

            // Act
            ApiResult<String> result = enterpriseBizService.updateName(newName);

            // Assert
            assertNotNull(result);
            assertNotEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertEquals(ResponseEnum.ENTERPRISE_UPDATE_FAILED.getCode(), result.code());
            verify(enterpriseService).updateById(any(Enterprise.class));
        }
    }

    @Test
    @DisplayName("updateLogo - Should successfully update enterprise logo when valid input")
    void updateLogo_Success_WhenValidInput() {
        try (MockedStatic<EnterpriseInfoUtil> mockedEnterpriseInfo = mockStatic(EnterpriseInfoUtil.class)) {
            // Arrange
            String newLogoUrl = "http://example.com/new-logo.jpg";
            mockedEnterpriseInfo.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);
            when(enterpriseService.getById(TEST_ENTERPRISE_ID)).thenReturn(testEnterprise);
            when(enterpriseService.updateById(any(Enterprise.class))).thenReturn(true);

            // Act
            ApiResult<String> result = enterpriseBizService.updateLogo(newLogoUrl);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            verify(enterpriseService).getById(TEST_ENTERPRISE_ID);
            verify(enterpriseService).updateById(any(Enterprise.class));
        }
    }

    @Test
    @DisplayName("updateLogo - Should return error when enterprise does not exist")
    void updateLogo_Error_WhenEnterpriseDoesNotExist() {
        try (MockedStatic<EnterpriseInfoUtil> mockedEnterpriseInfo = mockStatic(EnterpriseInfoUtil.class)) {
            // Arrange
            String newLogoUrl = "http://example.com/new-logo.jpg";
            mockedEnterpriseInfo.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);
            when(enterpriseService.getById(TEST_ENTERPRISE_ID)).thenReturn(null);

            // Act
            ApiResult<String> result = enterpriseBizService.updateLogo(newLogoUrl);

            // Assert
            assertNotNull(result);
            assertNotEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertEquals(ResponseEnum.ENTERPRISE_NOT_EXISTS.getCode(), result.code());
            verify(enterpriseService).getById(TEST_ENTERPRISE_ID);
            verify(enterpriseService, never()).updateById(any());
        }
    }

    @Test
    @DisplayName("updateLogo - Should return error when update fails")
    void updateLogo_Error_WhenUpdateFails() {
        try (MockedStatic<EnterpriseInfoUtil> mockedEnterpriseInfo = mockStatic(EnterpriseInfoUtil.class)) {
            // Arrange
            String newLogoUrl = "http://example.com/new-logo.jpg";
            mockedEnterpriseInfo.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);
            when(enterpriseService.getById(TEST_ENTERPRISE_ID)).thenReturn(testEnterprise);
            when(enterpriseService.updateById(any(Enterprise.class))).thenReturn(false);

            // Act
            ApiResult<String> result = enterpriseBizService.updateLogo(newLogoUrl);

            // Assert
            assertNotNull(result);
            assertNotEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertEquals(ResponseEnum.ENTERPRISE_UPDATE_FAILED.getCode(), result.code());
            verify(enterpriseService).updateById(any(Enterprise.class));
        }
    }

    @Test
    @DisplayName("updateAvatar - Should successfully update enterprise avatar when valid input")
    void updateAvatar_Success_WhenValidInput() {
        try (MockedStatic<EnterpriseInfoUtil> mockedEnterpriseInfo = mockStatic(EnterpriseInfoUtil.class)) {
            // Arrange
            String newAvatarUrl = "http://example.com/new-avatar.jpg";
            mockedEnterpriseInfo.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);
            when(enterpriseService.getById(TEST_ENTERPRISE_ID)).thenReturn(testEnterprise);
            when(enterpriseService.updateById(any(Enterprise.class))).thenReturn(true);

            // Act
            ApiResult<String> result = enterpriseBizService.updateAvatar(newAvatarUrl);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            verify(enterpriseService).getById(TEST_ENTERPRISE_ID);
            verify(enterpriseService).updateById(any(Enterprise.class));
        }
    }

    @Test
    @DisplayName("updateAvatar - Should return error when enterprise does not exist")
    void updateAvatar_Error_WhenEnterpriseDoesNotExist() {
        try (MockedStatic<EnterpriseInfoUtil> mockedEnterpriseInfo = mockStatic(EnterpriseInfoUtil.class)) {
            // Arrange
            String newAvatarUrl = "http://example.com/new-avatar.jpg";
            mockedEnterpriseInfo.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);
            when(enterpriseService.getById(TEST_ENTERPRISE_ID)).thenReturn(null);

            // Act
            ApiResult<String> result = enterpriseBizService.updateAvatar(newAvatarUrl);

            // Assert
            assertNotNull(result);
            assertNotEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertEquals(ResponseEnum.ENTERPRISE_NOT_EXISTS.getCode(), result.code());
            verify(enterpriseService).getById(TEST_ENTERPRISE_ID);
            verify(enterpriseService, never()).updateById(any());
        }
    }

    @Test
    @DisplayName("updateAvatar - Should return error when update fails")
    void updateAvatar_Error_WhenUpdateFails() {
        try (MockedStatic<EnterpriseInfoUtil> mockedEnterpriseInfo = mockStatic(EnterpriseInfoUtil.class)) {
            // Arrange
            String newAvatarUrl = "http://example.com/new-avatar.jpg";
            mockedEnterpriseInfo.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);
            when(enterpriseService.getById(TEST_ENTERPRISE_ID)).thenReturn(testEnterprise);
            when(enterpriseService.updateById(any(Enterprise.class))).thenReturn(false);

            // Act
            ApiResult<String> result = enterpriseBizService.updateAvatar(newAvatarUrl);

            // Assert
            assertNotNull(result);
            assertNotEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            assertEquals(ResponseEnum.ENTERPRISE_UPDATE_FAILED.getCode(), result.code());
            verify(enterpriseService).updateById(any(Enterprise.class));
        }
    }

    @Test
    @DisplayName("updateAvatar - Should handle null avatar URL gracefully")
    void updateAvatar_Success_WhenAvatarUrlIsNull() {
        try (MockedStatic<EnterpriseInfoUtil> mockedEnterpriseInfo = mockStatic(EnterpriseInfoUtil.class)) {
            // Arrange
            mockedEnterpriseInfo.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);
            when(enterpriseService.getById(TEST_ENTERPRISE_ID)).thenReturn(testEnterprise);
            when(enterpriseService.updateById(any(Enterprise.class))).thenReturn(true);

            // Act
            ApiResult<String> result = enterpriseBizService.updateAvatar(null);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            verify(enterpriseService).getById(TEST_ENTERPRISE_ID);
            verify(enterpriseService).updateById(argThat(enterprise -> enterprise.getAvatarUrl() == null));
        }
    }

    @Test
    @DisplayName("updateLogo - Should handle null logo URL gracefully")
    void updateLogo_Success_WhenLogoUrlIsNull() {
        try (MockedStatic<EnterpriseInfoUtil> mockedEnterpriseInfo = mockStatic(EnterpriseInfoUtil.class)) {
            // Arrange
            mockedEnterpriseInfo.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(TEST_ENTERPRISE_ID);
            when(enterpriseService.getById(TEST_ENTERPRISE_ID)).thenReturn(testEnterprise);
            when(enterpriseService.updateById(any(Enterprise.class))).thenReturn(true);

            // Act
            ApiResult<String> result = enterpriseBizService.updateLogo(null);

            // Assert
            assertNotNull(result);
            assertEquals(ResponseEnum.SUCCESS.getCode(), result.code());
            verify(enterpriseService).getById(TEST_ENTERPRISE_ID);
            verify(enterpriseService).updateById(argThat(enterprise -> enterprise.getLogoUrl() == null));
        }
    }
}
