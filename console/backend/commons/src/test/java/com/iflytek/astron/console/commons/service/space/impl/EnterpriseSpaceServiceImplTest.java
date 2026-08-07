package com.iflytek.astron.console.commons.service.space.impl;

import com.iflytek.astron.console.commons.entity.space.*;
import com.iflytek.astron.console.commons.enums.space.SpaceTypeEnum;
import com.iflytek.astron.console.commons.service.space.*;
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
 * Unit tests for EnterpriseSpaceServiceImpl
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("EnterpriseSpaceServiceImpl Test Cases")
class EnterpriseSpaceServiceImplTest {

    @Mock
    private SpaceUserService spaceUserService;

    @Mock
    private EnterpriseService enterpriseService;

    @Mock
    private SpaceService spaceService;

    @Mock
    private SpacePermissionService spacePermissionService;

    @Mock
    private EnterprisePermissionService enterprisePermissionService;

    @Mock
    private EnterpriseUserService enterpriseUserService;

    @InjectMocks
    private EnterpriseSpaceServiceImpl enterpriseSpaceService;

    private Space mockSpace;
    private Enterprise mockEnterprise;
    private SpaceUser mockSpaceUser;
    private EnterpriseUser mockEnterpriseUser;
    private SpacePermission mockSpacePermission;
    private EnterprisePermission mockEnterprisePermission;

    @BeforeEach
    void setUp() {
        // Initialize test data
        mockSpace = new Space();
        mockSpace.setId(1L);
        mockSpace.setName("Test Space");
        mockSpace.setDescription("Test Description");
        mockSpace.setUid("space-creator-uid");
        mockSpace.setEnterpriseId(1L);
        mockSpace.setType(SpaceTypeEnum.FREE.getCode());
        mockSpace.setCreateTime(LocalDateTime.now());
        mockSpace.setUpdateTime(LocalDateTime.now());
        mockSpace.setDeleted(0);

        mockEnterprise = new Enterprise();
        mockEnterprise.setId(1L);
        mockEnterprise.setUid("enterprise-owner-uid");
        mockEnterprise.setName("Test Enterprise");
        mockEnterprise.setExpireTime(LocalDateTime.now().plusYears(1));
        mockEnterprise.setCreateTime(LocalDateTime.now());
        mockEnterprise.setUpdateTime(LocalDateTime.now());
        mockEnterprise.setDeleted(0);

        mockSpaceUser = new SpaceUser();
        mockSpaceUser.setId(1L);
        mockSpaceUser.setSpaceId(1L);
        mockSpaceUser.setUid("test-user-uid");
        mockSpaceUser.setRole(1); // Owner role
        mockSpaceUser.setCreateTime(LocalDateTime.now());

        mockEnterpriseUser = new EnterpriseUser();
        mockEnterpriseUser.setId(1L);
        mockEnterpriseUser.setEnterpriseId(1L);
        mockEnterpriseUser.setUid("test-user-uid");
        mockEnterpriseUser.setRole(1); // Super admin role
        mockEnterpriseUser.setCreateTime(LocalDateTime.now());

        mockSpacePermission = new SpacePermission();
        mockSpacePermission.setId(1L);
        mockSpacePermission.setPermissionKey("SPACE_MANAGE");
        mockSpacePermission.setModule("space_management");
        mockSpacePermission.setDescription("Space management permission");

        mockEnterprisePermission = new EnterprisePermission();
        mockEnterprisePermission.setId(1L);
        mockEnterprisePermission.setPermissionKey("ENTERPRISE_MANAGE");
        mockEnterprisePermission.setModule("enterprise_management");
        mockEnterprisePermission.setDescription("Enterprise management permission");
    }

    @Test
    @DisplayName("Should return enterprise owner UID when space belongs to enterprise")
    void getUidByCurrentSpaceId_WithEnterpriseSpace_ShouldReturnEnterpriseOwnerUid() {
        // Given
        Long spaceId = 1L;
        mockSpace.setEnterpriseId(1L);

        when(spaceService.getSpaceById(spaceId)).thenReturn(mockSpace);
        when(enterpriseService.getEnterpriseById(1L)).thenReturn(mockEnterprise);

        // When
        String result = enterpriseSpaceService.getUidByCurrentSpaceId(spaceId);

        // Then
        assertEquals("enterprise-owner-uid", result);
        verify(spaceService).getSpaceById(spaceId);
        verify(enterpriseService).getEnterpriseById(1L);
        verify(spaceUserService, never()).getSpaceOwner(anyLong());
    }

    @Test
    @DisplayName("Should return space owner UID when space is personal")
    void getUidByCurrentSpaceId_WithPersonalSpace_ShouldReturnSpaceOwnerUid() {
        // Given
        Long spaceId = 1L;
        mockSpace.setEnterpriseId(null);
        mockSpaceUser.setUid("space-owner-uid");

        when(spaceService.getSpaceById(spaceId)).thenReturn(mockSpace);
        when(spaceUserService.getSpaceOwner(spaceId)).thenReturn(mockSpaceUser);

        // When
        String result = enterpriseSpaceService.getUidByCurrentSpaceId(spaceId);

        // Then
        assertEquals("space-owner-uid", result);
        verify(spaceService).getSpaceById(spaceId);
        verify(spaceUserService).getSpaceOwner(spaceId);
        verify(enterpriseService, never()).getEnterpriseById(anyLong());
    }

    @Test
    @DisplayName("Should return null when space ID is null")
    void getUidByCurrentSpaceId_WithNullSpaceId_ShouldReturnNull() {
        // Given
        Long spaceId = null;

        // When
        String result = enterpriseSpaceService.getUidByCurrentSpaceId(spaceId);

        // Then
        assertNull(result);
        verify(spaceService, never()).getSpaceById(anyLong());
        verify(enterpriseService, never()).getEnterpriseById(anyLong());
        verify(spaceUserService, never()).getSpaceOwner(anyLong());
    }

    @Test
    @DisplayName("Should return null when space does not exist")
    void getUidByCurrentSpaceId_WithNonExistentSpace_ShouldReturnNull() {
        // Given
        Long spaceId = 999L;

        when(spaceService.getSpaceById(spaceId)).thenReturn(null);

        // When
        String result = enterpriseSpaceService.getUidByCurrentSpaceId(spaceId);

        // Then
        assertNull(result);
        verify(spaceService).getSpaceById(spaceId);
        verify(enterpriseService, never()).getEnterpriseById(anyLong());
        verify(spaceUserService, never()).getSpaceOwner(anyLong());
    }

    @Test
    @DisplayName("Should return null when enterprise does not exist")
    void getUidByCurrentSpaceId_WithNonExistentEnterprise_ShouldReturnNull() {
        // Given
        Long spaceId = 1L;
        mockSpace.setEnterpriseId(999L);

        when(spaceService.getSpaceById(spaceId)).thenReturn(mockSpace);
        when(enterpriseService.getEnterpriseById(999L)).thenReturn(null);

        // When
        String result = enterpriseSpaceService.getUidByCurrentSpaceId(spaceId);

        // Then
        assertNull(result);
        verify(spaceService).getSpaceById(spaceId);
        verify(enterpriseService).getEnterpriseById(999L);
        verify(spaceUserService, never()).getSpaceOwner(anyLong());
    }

    @Test
    @DisplayName("Should return null when space owner does not exist")
    void getUidByCurrentSpaceId_WithNonExistentSpaceOwner_ShouldReturnNull() {
        // Given
        Long spaceId = 1L;
        mockSpace.setEnterpriseId(null);

        when(spaceService.getSpaceById(spaceId)).thenReturn(mockSpace);
        when(spaceUserService.getSpaceOwner(spaceId)).thenReturn(null);

        // When
        String result = enterpriseSpaceService.getUidByCurrentSpaceId(spaceId);

        // Then
        assertNull(result);
        verify(spaceService).getSpaceById(spaceId);
        verify(spaceUserService).getSpaceOwner(spaceId);
    }

    @Test
    @DisplayName("Should return space user when user belongs to space")
    void checkUserBelongSpace_WithValidUser_ShouldReturnSpaceUser() {
        // Given
        Long spaceId = 1L;
        String uid = "test-user-uid";

        when(spaceUserService.getSpaceUserByUid(spaceId, uid)).thenReturn(mockSpaceUser);

        // When
        SpaceUser result = enterpriseSpaceService.checkUserBelongSpace(spaceId, uid);

        // Then
        assertNotNull(result);
        assertEquals(mockSpaceUser, result);
        assertEquals(spaceId, result.getSpaceId());
        assertEquals(uid, result.getUid());
        verify(spaceUserService).getSpaceUserByUid(spaceId, uid);
    }

    @Test
    @DisplayName("Should return null when user does not belong to space")
    void checkUserBelongSpace_WithNonExistentUser_ShouldReturnNull() {
        // Given
        Long spaceId = 1L;
        String uid = "non-existent-uid";

        when(spaceUserService.getSpaceUserByUid(spaceId, uid)).thenReturn(null);

        // When
        SpaceUser result = enterpriseSpaceService.checkUserBelongSpace(spaceId, uid);

        // Then
        assertNull(result);
        verify(spaceUserService).getSpaceUserByUid(spaceId, uid);
    }

    @Test
    @DisplayName("Should clear space user cache without throwing exceptions")
    void clearSpaceUserCache_ShouldExecuteSuccessfully() {
        // Given
        Long spaceId = 1L;
        String uid = "test-user-uid";

        // When & Then
        assertDoesNotThrow(() -> {
            enterpriseSpaceService.clearSpaceUserCache(spaceId, uid);
        });
    }

    @Test
    @DisplayName("Should return enterprise user when user belongs to enterprise")
    void checkUserBelongEnterprise_WithValidUser_ShouldReturnEnterpriseUser() {
        // Given
        Long enterpriseId = 1L;
        String uid = "test-user-uid";

        when(enterpriseUserService.getEnterpriseUserByUid(enterpriseId, uid)).thenReturn(mockEnterpriseUser);

        // When
        EnterpriseUser result = enterpriseSpaceService.checkUserBelongEnterprise(enterpriseId, uid);

        // Then
        assertNotNull(result);
        assertEquals(mockEnterpriseUser, result);
        assertEquals(enterpriseId, result.getEnterpriseId());
        assertEquals(uid, result.getUid());
        verify(enterpriseUserService).getEnterpriseUserByUid(enterpriseId, uid);
    }

    @Test
    @DisplayName("Should return null when user does not belong to enterprise")
    void checkUserBelongEnterprise_WithNonExistentUser_ShouldReturnNull() {
        // Given
        Long enterpriseId = 1L;
        String uid = "non-existent-uid";

        when(enterpriseUserService.getEnterpriseUserByUid(enterpriseId, uid)).thenReturn(null);

        // When
        EnterpriseUser result = enterpriseSpaceService.checkUserBelongEnterprise(enterpriseId, uid);

        // Then
        assertNull(result);
        verify(enterpriseUserService).getEnterpriseUserByUid(enterpriseId, uid);
    }

    @Test
    @DisplayName("Should clear enterprise user cache without throwing exceptions")
    void clearEnterpriseUserCache_ShouldExecuteSuccessfully() {
        // Given
        Long enterpriseId = 1L;
        String uid = "test-user-uid";

        // When & Then
        assertDoesNotThrow(() -> {
            enterpriseSpaceService.clearEnterpriseUserCache(enterpriseId, uid);
        });
    }

    @Test
    @DisplayName("Should return space permission when key exists")
    void getSpacePermissionByKey_WithValidKey_ShouldReturnPermission() {
        // Given
        String key = "SPACE_MANAGE";

        when(spacePermissionService.getSpacePermissionByKey(key)).thenReturn(mockSpacePermission);

        // When
        SpacePermission result = enterpriseSpaceService.getSpacePermissionByKey(key);

        // Then
        assertNotNull(result);
        assertEquals(mockSpacePermission, result);
        assertEquals(key, result.getPermissionKey());
        verify(spacePermissionService).getSpacePermissionByKey(key);
    }

    @Test
    @DisplayName("Should return null when space permission key does not exist")
    void getSpacePermissionByKey_WithNonExistentKey_ShouldReturnNull() {
        // Given
        String key = "NON_EXISTENT_KEY";

        when(spacePermissionService.getSpacePermissionByKey(key)).thenReturn(null);

        // When
        SpacePermission result = enterpriseSpaceService.getSpacePermissionByKey(key);

        // Then
        assertNull(result);
        verify(spacePermissionService).getSpacePermissionByKey(key);
    }

    @Test
    @DisplayName("Should return enterprise permission when key exists")
    void getEnterprisePermissionByKey_WithValidKey_ShouldReturnPermission() {
        // Given
        String key = "ENTERPRISE_MANAGE";

        when(enterprisePermissionService.getEnterprisePermissionByKey(key)).thenReturn(mockEnterprisePermission);

        // When
        EnterprisePermission result = enterpriseSpaceService.getEnterprisePermissionByKey(key);

        // Then
        assertNotNull(result);
        assertEquals(mockEnterprisePermission, result);
        assertEquals(key, result.getPermissionKey());
        verify(enterprisePermissionService).getEnterprisePermissionByKey(key);
    }

    @Test
    @DisplayName("Should return null when enterprise permission key does not exist")
    void getEnterprisePermissionByKey_WithNonExistentKey_ShouldReturnNull() {
        // Given
        String key = "NON_EXISTENT_KEY";

        when(enterprisePermissionService.getEnterprisePermissionByKey(key)).thenReturn(null);

        // When
        EnterprisePermission result = enterpriseSpaceService.getEnterprisePermissionByKey(key);

        // Then
        assertNull(result);
        verify(enterprisePermissionService).getEnterprisePermissionByKey(key);
    }

    @Test
    @DisplayName("Should return false when enterprise is not expired")
    void checkEnterpriseExpired_WithValidEnterprise_ShouldReturnFalse() {
        // Given
        Long enterpriseId = 1L;
        mockEnterprise.setExpireTime(LocalDateTime.now().plusDays(30));

        when(enterpriseService.getEnterpriseById(enterpriseId)).thenReturn(mockEnterprise);

        // When
        boolean result = enterpriseSpaceService.checkEnterpriseExpired(enterpriseId);

        // Then
        assertFalse(result);
        verify(enterpriseService).getEnterpriseById(enterpriseId);
    }

    @Test
    @DisplayName("Should return true when enterprise is expired")
    void checkEnterpriseExpired_WithExpiredEnterprise_ShouldReturnTrue() {
        // Given
        Long enterpriseId = 1L;
        mockEnterprise.setExpireTime(LocalDateTime.now().minusDays(1));

        when(enterpriseService.getEnterpriseById(enterpriseId)).thenReturn(mockEnterprise);

        // When
        boolean result = enterpriseSpaceService.checkEnterpriseExpired(enterpriseId);

        // Then
        assertTrue(result);
        verify(enterpriseService).getEnterpriseById(enterpriseId);
    }

    @Test
    @DisplayName("Should return true when enterprise does not exist")
    void checkEnterpriseExpired_WithNonExistentEnterprise_ShouldReturnTrue() {
        // Given
        Long enterpriseId = 999L;

        when(enterpriseService.getEnterpriseById(enterpriseId)).thenReturn(null);

        // When
        boolean result = enterpriseSpaceService.checkEnterpriseExpired(enterpriseId);

        // Then
        assertTrue(result);
        verify(enterpriseService).getEnterpriseById(enterpriseId);
    }

    @Test
    @DisplayName("Should return true when space does not exist")
    void checkSpaceExpired_WithNonExistentSpace_ShouldReturnTrue() {
        // Given
        Long spaceId = 999L;

        when(spaceService.getSpaceById(spaceId)).thenReturn(null);

        // When
        boolean result = enterpriseSpaceService.checkSpaceExpired(spaceId);

        // Then
        assertTrue(result);
        verify(spaceService).getSpaceById(spaceId);
    }

    @Test
    @DisplayName("Should check enterprise expiration when space belongs to enterprise")
    void checkSpaceExpired_WithEnterpriseSpace_ShouldCheckEnterpriseExpiration() {
        // Given
        Long spaceId = 1L;
        mockSpace.setEnterpriseId(1L);
        mockEnterprise.setExpireTime(LocalDateTime.now().plusDays(30));

        when(spaceService.getSpaceById(spaceId)).thenReturn(mockSpace);
        when(enterpriseService.getEnterpriseById(1L)).thenReturn(mockEnterprise);

        // When
        boolean result = enterpriseSpaceService.checkSpaceExpired(spaceId);

        // Then
        assertFalse(result);
        verify(spaceService).getSpaceById(spaceId);
        verify(enterpriseService).getEnterpriseById(1L);
    }

    @Test
    @DisplayName("Should return false for free personal spaces")
    void checkSpaceExpired_WithFreeSpace_ShouldReturnFalse() {
        // Given
        Long spaceId = 1L;
        mockSpace.setEnterpriseId(null);
        mockSpace.setType(SpaceTypeEnum.FREE.getCode());

        when(spaceService.getSpaceById(spaceId)).thenReturn(mockSpace);

        // When
        boolean result = enterpriseSpaceService.checkSpaceExpired(spaceId);

        // Then
        assertFalse(result);
        verify(spaceService).getSpaceById(spaceId);
    }

    @Test
    @DisplayName("Should check order validity for pro spaces")
    void checkSpaceExpired_WithProSpace_ShouldCheckOrderValidity() {
        // Given
        Long spaceId = 1L;
        mockSpace.setEnterpriseId(null);
        mockSpace.setType(SpaceTypeEnum.PRO.getCode());
        mockSpace.setUid("pro-space-uid");

        when(spaceService.getSpaceById(spaceId)).thenReturn(mockSpace);

        try (MockedStatic<OrderInfoUtil> mockedOrderInfoUtil = mockStatic(OrderInfoUtil.class)) {
            mockedOrderInfoUtil.when(() -> OrderInfoUtil.existValidProOrder("pro-space-uid")).thenReturn(true);

            // When
            boolean result = enterpriseSpaceService.checkSpaceExpired(spaceId);

            // Then
            assertFalse(result);
            verify(spaceService).getSpaceById(spaceId);
            mockedOrderInfoUtil.verify(() -> OrderInfoUtil.existValidProOrder("pro-space-uid"));
        }
    }

    @Test
    @DisplayName("Should return true for pro spaces without valid orders")
    void checkSpaceExpired_WithProSpaceNoValidOrder_ShouldReturnTrue() {
        // Given
        Long spaceId = 1L;
        mockSpace.setEnterpriseId(null);
        mockSpace.setType(SpaceTypeEnum.PRO.getCode());
        mockSpace.setUid("pro-space-uid");

        when(spaceService.getSpaceById(spaceId)).thenReturn(mockSpace);

        try (MockedStatic<OrderInfoUtil> mockedOrderInfoUtil = mockStatic(OrderInfoUtil.class)) {
            mockedOrderInfoUtil.when(() -> OrderInfoUtil.existValidProOrder("pro-space-uid")).thenReturn(false);

            // When
            boolean result = enterpriseSpaceService.checkSpaceExpired(spaceId);

            // Then
            assertTrue(result);
            verify(spaceService).getSpaceById(spaceId);
            mockedOrderInfoUtil.verify(() -> OrderInfoUtil.existValidProOrder("pro-space-uid"));
        }
    }

    @Test
    @DisplayName("Should return false for unknown space types")
    void checkSpaceExpired_WithUnknownSpaceType_ShouldReturnFalse() {
        // Given
        Long spaceId = 1L;
        mockSpace.setEnterpriseId(null);
        mockSpace.setType(999); // Unknown type

        when(spaceService.getSpaceById(spaceId)).thenReturn(mockSpace);

        // When
        boolean result = enterpriseSpaceService.checkSpaceExpired(spaceId);

        // Then
        assertFalse(result);
        verify(spaceService).getSpaceById(spaceId);
    }

    @Test
    @DisplayName("Should verify service implements interface correctly")
    void verifyServiceImplementsInterfaceCorrectly() {
        // Given & When & Then
        assertTrue(enterpriseSpaceService instanceof EnterpriseSpaceService,
                "Service should implement EnterpriseSpaceService interface");
    }

    @Test
    @DisplayName("Should handle null parameters gracefully in various methods")
    void handleNullParametersGracefully() {
        // Test checkUserBelongSpace with null parameters
        when(spaceUserService.getSpaceUserByUid(null, null)).thenReturn(null);
        assertNull(enterpriseSpaceService.checkUserBelongSpace(null, null));

        // Test checkUserBelongEnterprise with null parameters
        when(enterpriseUserService.getEnterpriseUserByUid(null, null)).thenReturn(null);
        assertNull(enterpriseSpaceService.checkUserBelongEnterprise(null, null));

        // Test getSpacePermissionByKey with null key
        when(spacePermissionService.getSpacePermissionByKey(null)).thenReturn(null);
        assertNull(enterpriseSpaceService.getSpacePermissionByKey(null));

        // Test getEnterprisePermissionByKey with null key
        when(enterprisePermissionService.getEnterprisePermissionByKey(null)).thenReturn(null);
        assertNull(enterpriseSpaceService.getEnterprisePermissionByKey(null));
    }

    @Test
    @DisplayName("Should handle empty string parameters correctly")
    void handleEmptyStringParametersCorrectly() {
        // Test with empty string UID
        String emptyUid = "";
        Long spaceId = 1L;

        when(spaceUserService.getSpaceUserByUid(spaceId, emptyUid)).thenReturn(null);

        SpaceUser result = enterpriseSpaceService.checkUserBelongSpace(spaceId, emptyUid);

        assertNull(result);
        verify(spaceUserService).getSpaceUserByUid(spaceId, emptyUid);
    }

    @Test
    @DisplayName("Should handle edge case when enterprise has null expiration time")
    void checkEnterpriseExpired_WithNullExpirationTime_ShouldHandleGracefully() {
        // Given
        Long enterpriseId = 1L;
        mockEnterprise.setExpireTime(null);

        when(enterpriseService.getEnterpriseById(enterpriseId)).thenReturn(mockEnterprise);

        // When & Then
        assertThrows(RuntimeException.class, () -> {
            enterpriseSpaceService.checkEnterpriseExpired(enterpriseId);
        });
    }

    @Test
    @DisplayName("Should verify all cache methods exist and are callable")
    void verifyCacheMethodsExistAndCallable() {
        // Verify clearSpaceUserCache method exists
        assertDoesNotThrow(() -> {
            java.lang.reflect.Method method = enterpriseSpaceService.getClass()
                    .getMethod("clearSpaceUserCache", Long.class, String.class);
            assertNotNull(method, "clearSpaceUserCache method should exist");
            assertEquals(void.class, method.getReturnType(), "clearSpaceUserCache should return void");
        });

        // Verify clearEnterpriseUserCache method exists
        assertDoesNotThrow(() -> {
            java.lang.reflect.Method method = enterpriseSpaceService.getClass()
                    .getMethod("clearEnterpriseUserCache", Long.class, String.class);
            assertNotNull(method, "clearEnterpriseUserCache method should exist");
            assertEquals(void.class, method.getReturnType(), "clearEnterpriseUserCache should return void");
        });
    }

    @Test
    @DisplayName("Should verify all interface methods are implemented")
    void verifyAllInterfaceMethodsAreImplemented() {
        // Test that all methods from the interface are properly implemented
        assertDoesNotThrow(() -> {
            // Verify getUidByCurrentSpaceId method
            java.lang.reflect.Method method = enterpriseSpaceService.getClass()
                    .getMethod("getUidByCurrentSpaceId", Long.class);
            assertNotNull(method);
            assertEquals(String.class, method.getReturnType());

            // Verify checkUserBelongSpace method
            method = enterpriseSpaceService.getClass()
                    .getMethod("checkUserBelongSpace", Long.class, String.class);
            assertNotNull(method);
            assertEquals(SpaceUser.class, method.getReturnType());

            // Verify checkUserBelongEnterprise method
            method = enterpriseSpaceService.getClass()
                    .getMethod("checkUserBelongEnterprise", Long.class, String.class);
            assertNotNull(method);
            assertEquals(EnterpriseUser.class, method.getReturnType());

            // Verify checkEnterpriseExpired method
            method = enterpriseSpaceService.getClass()
                    .getMethod("checkEnterpriseExpired", Long.class);
            assertNotNull(method);
            assertEquals(boolean.class, method.getReturnType());

            // Verify checkSpaceExpired method
            method = enterpriseSpaceService.getClass()
                    .getMethod("checkSpaceExpired", Long.class);
            assertNotNull(method);
            assertEquals(boolean.class, method.getReturnType());
        });
    }
}
