package com.iflytek.astron.console.commons.service.space.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.iflytek.astron.console.commons.data.UserInfoDataService;
import com.iflytek.astron.console.commons.dto.space.EnterpriseVO;
import com.iflytek.astron.console.commons.entity.space.Enterprise;
import com.iflytek.astron.console.commons.entity.space.EnterpriseUser;
import com.iflytek.astron.console.commons.entity.user.UserInfo;
import com.iflytek.astron.console.commons.enums.space.EnterpriseServiceTypeEnum;
import com.iflytek.astron.console.commons.mapper.space.EnterpriseMapper;
import com.iflytek.astron.console.commons.service.space.EnterpriseUserService;
import com.iflytek.astron.console.commons.util.RequestContextUtil;
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
import org.redisson.api.RBucket;
import org.redisson.api.RedissonClient;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for EnterpriseServiceImpl
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("EnterpriseServiceImpl Test Cases")
class EnterpriseServiceImplTest {

    @Mock
    private EnterpriseMapper enterpriseMapper;

    @Mock
    private UserInfoDataService userInfoDataService;

    @Mock
    private EnterpriseUserService enterpriseUserService;

    @Mock
    private RedissonClient redissonClient;

    @Mock
    private RBucket<Object> rBucket;

    @InjectMocks
    private EnterpriseServiceImpl enterpriseService;

    private Enterprise mockEnterprise;
    private UserInfo mockUserInfo;
    private EnterpriseUser mockEnterpriseUser;
    private EnterpriseVO mockEnterpriseVO;

    @BeforeEach
    void setUp() {
        // Set the baseMapper field using reflection to enable MyBatis-Plus operations
        ReflectionTestUtils.setField(enterpriseService, "baseMapper", enterpriseMapper);

        // Initialize test data
        mockEnterprise = new Enterprise();
        mockEnterprise.setId(1L);
        mockEnterprise.setUid("test-uid");
        mockEnterprise.setName("Test Enterprise");
        mockEnterprise.setLogoUrl("http://test.com/logo.png");
        mockEnterprise.setAvatarUrl("http://test.com/avatar.png");
        mockEnterprise.setOrgId(100L);
        mockEnterprise.setServiceType(1);
        mockEnterprise.setCreateTime(LocalDateTime.now());
        mockEnterprise.setExpireTime(LocalDateTime.now().plusYears(1));
        mockEnterprise.setUpdateTime(LocalDateTime.now());
        mockEnterprise.setDeleted(0);

        mockUserInfo = new UserInfo();
        mockUserInfo.setUid("test-uid");
        mockUserInfo.setNickname("Test User");
        mockUserInfo.setEnterpriseServiceType(EnterpriseServiceTypeEnum.TEAM);

        mockEnterpriseUser = new EnterpriseUser();
        mockEnterpriseUser.setId(1L);
        mockEnterpriseUser.setEnterpriseId(1L);
        mockEnterpriseUser.setUid("test-uid");
        mockEnterpriseUser.setRole(1); // 1 = super admin

        mockEnterpriseVO = new EnterpriseVO();
        mockEnterpriseVO.setId(1L);
        mockEnterpriseVO.setUid("test-uid");
        mockEnterpriseVO.setName("Test Enterprise");
        mockEnterpriseVO.setOfficerName("Test User");
        mockEnterpriseVO.setRole(1); // 1 = super admin
    }

    @Test
    @DisplayName("Should set last visit enterprise ID successfully when enterprise ID is provided")
    void setLastVisitEnterpriseId_WithValidEnterpriseId_ShouldSetSuccessfully() {
        // Given
        Long enterpriseId = 123L;
        String uid = "test-uid";
        String expectedKey = "USER_LAST_VISIT_ENTERPRISE_ID:test-uid";

        when(redissonClient.getBucket(expectedKey)).thenReturn(rBucket);

        try (MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(uid);

            // When
            boolean result = enterpriseService.setLastVisitEnterpriseId(enterpriseId);

            // Then
            assertTrue(result);
            verify(redissonClient).getBucket(expectedKey);
            verify(rBucket).set("123");
            verify(rBucket, never()).delete();
        }
    }

    @Test
    @DisplayName("Should delete last visit enterprise ID when null is provided")
    void setLastVisitEnterpriseId_WithNullEnterpriseId_ShouldDeleteSuccessfully() {
        // Given
        String uid = "test-uid";
        String expectedKey = "USER_LAST_VISIT_ENTERPRISE_ID:test-uid";

        when(redissonClient.getBucket(expectedKey)).thenReturn(rBucket);
        when(rBucket.delete()).thenReturn(true);

        try (MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(uid);

            // When
            boolean result = enterpriseService.setLastVisitEnterpriseId(null);

            // Then
            assertTrue(result);
            verify(redissonClient).getBucket(expectedKey);
            verify(rBucket).delete();
            verify(rBucket, never()).set(anyString());
        }
    }

    @Test
    @DisplayName("Should return false when Redis delete operation fails")
    void setLastVisitEnterpriseId_WithNullEnterpriseId_WhenDeleteFails_ShouldReturnFalse() {
        // Given
        String uid = "test-uid";
        String expectedKey = "USER_LAST_VISIT_ENTERPRISE_ID:test-uid";

        when(redissonClient.getBucket(expectedKey)).thenReturn(rBucket);
        when(rBucket.delete()).thenReturn(false);

        try (MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(uid);

            // When
            boolean result = enterpriseService.setLastVisitEnterpriseId(null);

            // Then
            assertFalse(result);
            verify(rBucket).delete();
        }
    }

    @Test
    @DisplayName("Should get last visit enterprise ID successfully when value exists")
    void getLastVisitEnterpriseId_WithExistingValue_ShouldReturnEnterpriseId() {
        // Given
        String uid = "test-uid";
        String expectedKey = "USER_LAST_VISIT_ENTERPRISE_ID:test-uid";
        Long expectedEnterpriseId = 123L;

        when(redissonClient.getBucket(expectedKey)).thenReturn(rBucket);
        when(rBucket.get()).thenReturn("123");

        try (MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(uid);

            // When
            Long result = enterpriseService.getLastVisitEnterpriseId();

            // Then
            assertEquals(expectedEnterpriseId, result);
            verify(redissonClient).getBucket(expectedKey);
            verify(rBucket).get();
        }
    }

    @Test
    @DisplayName("Should return null when no value exists in Redis")
    void getLastVisitEnterpriseId_WithNoValue_ShouldReturnNull() {
        // Given
        String uid = "test-uid";
        String expectedKey = "USER_LAST_VISIT_ENTERPRISE_ID:test-uid";

        when(redissonClient.getBucket(expectedKey)).thenReturn(rBucket);
        when(rBucket.get()).thenReturn(null);

        try (MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(uid);

            // When
            Long result = enterpriseService.getLastVisitEnterpriseId();

            // Then
            assertNull(result);
        }
    }

    @Test
    @DisplayName("Should return null when Redis value is blank string")
    void getLastVisitEnterpriseId_WithBlankValue_ShouldReturnNull() {
        // Given
        String uid = "test-uid";
        String expectedKey = "USER_LAST_VISIT_ENTERPRISE_ID:test-uid";

        when(redissonClient.getBucket(expectedKey)).thenReturn(rBucket);
        when(rBucket.get()).thenReturn("   ");

        try (MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(uid);

            // When
            Long result = enterpriseService.getLastVisitEnterpriseId();

            // Then
            assertNull(result);
        }
    }

    @Test
    @DisplayName("Should return 0 when user already joined an enterprise team")
    void checkNeedCreateTeam_WithExistingEnterprise_ShouldReturn0() {
        // Given
        try (MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {
            mockedRequestContext.when(RequestContextUtil::getUserInfo).thenReturn(mockUserInfo);

            when(enterpriseMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(mockEnterprise);

            // When
            Integer result = enterpriseService.checkNeedCreateTeam();

            // Then
            assertEquals(0, result);
            verify(enterpriseMapper).selectOne(any(LambdaQueryWrapper.class));
        }
    }

    @Test
    @DisplayName("Should return 0 when user has no enterprise service")
    void checkNeedCreateTeam_WithNoEnterpriseService_ShouldReturn0() {
        // Given
        mockUserInfo.setEnterpriseServiceType(null);

        try (MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {
            mockedRequestContext.when(RequestContextUtil::getUserInfo).thenReturn(mockUserInfo);

            when(enterpriseMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);

            // When
            Integer result = enterpriseService.checkNeedCreateTeam();

            // Then
            assertEquals(0, result);
        }
    }

    @Test
    @DisplayName("Should return enterprise service type code when user needs to create enterprise team")
    void checkNeedCreateTeam_WithEnterpriseService_ShouldReturnServiceTypeCode() {
        // Given
        mockUserInfo.setEnterpriseServiceType(EnterpriseServiceTypeEnum.ENTERPRISE);

        try (MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {
            mockedRequestContext.when(RequestContextUtil::getUserInfo).thenReturn(mockUserInfo);

            when(enterpriseMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);

            // When
            Integer result = enterpriseService.checkNeedCreateTeam();

            // Then
            assertEquals(EnterpriseServiceTypeEnum.ENTERPRISE.getCode(), result);
        }
    }

    @Test
    @DisplayName("Should throw NullPointerException when user info is null")
    void checkNeedCreateTeam_WithNullUserInfo_ShouldThrowNullPointerException() {
        // Given
        try (MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {
            mockedRequestContext.when(RequestContextUtil::getUserInfo).thenReturn(null);

            // When & Then
            assertThrows(NullPointerException.class, () -> {
                enterpriseService.checkNeedCreateTeam();
            });

            // Verify that no database queries are made when userInfo is null
            verify(enterpriseMapper, never()).selectOne(any(LambdaQueryWrapper.class));
        }
    }

    @Test
    @DisplayName("Should update enterprise expire time when enterprise exists")
    void orderChangeNotify_WithExistingEnterprise_ShouldUpdateExpireTime() {
        // Given
        String uid = "test-uid";
        LocalDateTime newEndTime = LocalDateTime.now().plusMonths(6);

        when(enterpriseMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(mockEnterprise);
        when(enterpriseMapper.updateById(any(Enterprise.class))).thenReturn(1);

        // When
        enterpriseService.orderChangeNotify(uid, newEndTime);

        // Then
        ArgumentCaptor<Enterprise> enterpriseCaptor = ArgumentCaptor.forClass(Enterprise.class);
        verify(enterpriseMapper).updateById(enterpriseCaptor.capture());

        Enterprise updatedEnterprise = enterpriseCaptor.getValue();
        assertEquals(newEndTime, updatedEnterprise.getExpireTime());
        assertEquals(mockEnterprise.getId(), updatedEnterprise.getId());
    }

    @Test
    @DisplayName("Should not update when enterprise does not exist")
    void orderChangeNotify_WithNonExistentEnterprise_ShouldNotUpdate() {
        // Given
        String uid = "non-existent-uid";
        LocalDateTime newEndTime = LocalDateTime.now().plusMonths(6);

        when(enterpriseMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);

        // When
        enterpriseService.orderChangeNotify(uid, newEndTime);

        // Then
        verify(enterpriseMapper, never()).updateById(any(Enterprise.class));
    }

    @Test
    @DisplayName("Should throw UnsupportedOperationException for checkCertification")
    void checkCertification_ShouldThrowUnsupportedOperationException() {
        // When & Then
        assertThrows(UnsupportedOperationException.class, () -> {
            enterpriseService.checkCertification();
        });
    }

    @Test
    @DisplayName("Should return enterprise detail successfully")
    void detail_WithValidData_ShouldReturnEnterpriseVO() {
        // Given
        String uid = "test-uid";
        Long enterpriseId = 1L;

        try (MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class);
                MockedStatic<EnterpriseInfoUtil> mockedEnterpriseInfo = mockStatic(EnterpriseInfoUtil.class)) {

            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(uid);
            mockedEnterpriseInfo.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(enterpriseId);

            when(enterpriseMapper.selectById(enterpriseId)).thenReturn(mockEnterprise);
            when(userInfoDataService.findByUid(mockEnterprise.getUid())).thenReturn(Optional.of(mockUserInfo));
            when(enterpriseUserService.getEnterpriseUserByUid(enterpriseId, uid)).thenReturn(mockEnterpriseUser);

            // When
            EnterpriseVO result = enterpriseService.detail();

            // Then
            assertNotNull(result);
            assertEquals(mockEnterprise.getId(), result.getId());
            assertEquals(mockEnterprise.getUid(), result.getUid());
            assertEquals(mockEnterprise.getName(), result.getName());
            assertEquals(mockUserInfo.getNickname(), result.getOfficerName());
            assertEquals(mockEnterpriseUser.getRole(), result.getRole());
        }
    }

    @Test
    @DisplayName("Should return null when enterprise ID is null")
    void detail_WithNullEnterpriseId_ShouldReturnNull() {
        // Given
        try (MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class);
                MockedStatic<EnterpriseInfoUtil> mockedEnterpriseInfo = mockStatic(EnterpriseInfoUtil.class)) {

            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn("test-uid");
            mockedEnterpriseInfo.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(null);

            // When
            EnterpriseVO result = enterpriseService.detail();

            // Then
            assertNull(result);
        }
    }

    @Test
    @DisplayName("Should return null when enterprise does not exist")
    void detail_WithNonExistentEnterprise_ShouldReturnNull() {
        // Given
        String uid = "test-uid";
        Long enterpriseId = 999L;

        try (MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class);
                MockedStatic<EnterpriseInfoUtil> mockedEnterpriseInfo = mockStatic(EnterpriseInfoUtil.class)) {

            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(uid);
            mockedEnterpriseInfo.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(enterpriseId);

            when(enterpriseMapper.selectById(enterpriseId)).thenReturn(null);

            // When
            EnterpriseVO result = enterpriseService.detail();

            // Then
            assertNull(result);
        }
    }

    @Test
    @DisplayName("Should return join list successfully")
    void joinList_ShouldReturnEnterpriseVOList() {
        // Given
        String uid = "test-uid";
        List<EnterpriseVO> expectedList = Arrays.asList(mockEnterpriseVO);

        try (MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(uid);

            when(enterpriseMapper.selectByJoinUid(uid)).thenReturn(expectedList);

            // When
            List<EnterpriseVO> result = enterpriseService.joinList();

            // Then
            assertNotNull(result);
            assertEquals(1, result.size());
            assertEquals(expectedList, result);
            verify(enterpriseMapper).selectByJoinUid(uid);
        }
    }

    @Test
    @DisplayName("Should return true when enterprise exists with same name and different ID")
    void checkExistByName_WithExistingNameAndDifferentId_ShouldReturnTrue() {
        // Given
        String name = "Test Enterprise";
        Long id = 2L;

        when(enterpriseMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(1L);

        // When
        boolean result = enterpriseService.checkExistByName(name, id);

        // Then
        assertTrue(result);
        verify(enterpriseMapper).selectCount(any(LambdaQueryWrapper.class));
    }

    @Test
    @DisplayName("Should return false when no enterprise exists with same name")
    void checkExistByName_WithNonExistingName_ShouldReturnFalse() {
        // Given
        String name = "Non Existing Enterprise";
        Long id = 1L;

        when(enterpriseMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(0L);

        // When
        boolean result = enterpriseService.checkExistByName(name, id);

        // Then
        assertFalse(result);
    }

    @Test
    @DisplayName("Should return true when enterprise exists with same name and null ID")
    void checkExistByName_WithExistingNameAndNullId_ShouldReturnTrue() {
        // Given
        String name = "Test Enterprise";
        Long id = null;

        when(enterpriseMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(1L);

        // When
        boolean result = enterpriseService.checkExistByName(name, id);

        // Then
        assertTrue(result);
    }

    @Test
    @DisplayName("Should return true when enterprise exists with same UID")
    void checkExistByUid_WithExistingUid_ShouldReturnTrue() {
        // Given
        String uid = "existing-uid";

        when(enterpriseMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(1L);

        // When
        boolean result = enterpriseService.checkExistByUid(uid);

        // Then
        assertTrue(result);
        verify(enterpriseMapper).selectCount(any(LambdaQueryWrapper.class));
    }

    @Test
    @DisplayName("Should return false when no enterprise exists with same UID")
    void checkExistByUid_WithNonExistingUid_ShouldReturnFalse() {
        // Given
        String uid = "non-existing-uid";

        when(enterpriseMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(0L);

        // When
        boolean result = enterpriseService.checkExistByUid(uid);

        // Then
        assertFalse(result);
    }

    @Test
    @DisplayName("Should get enterprise by ID successfully")
    void getEnterpriseById_WithValidId_ShouldReturnEnterprise() {
        // Given
        Long id = 1L;

        when(enterpriseMapper.selectById(id)).thenReturn(mockEnterprise);

        // When
        Enterprise result = enterpriseService.getEnterpriseById(id);

        // Then
        assertNotNull(result);
        assertEquals(mockEnterprise, result);
        verify(enterpriseMapper).selectById(id);
    }

    @Test
    @DisplayName("Should return null when enterprise with ID does not exist")
    void getEnterpriseById_WithNonExistentId_ShouldReturnNull() {
        // Given
        Long id = 999L;

        when(enterpriseMapper.selectById(id)).thenReturn(null);

        // When
        Enterprise result = enterpriseService.getEnterpriseById(id);

        // Then
        assertNull(result);
    }

    @Test
    @DisplayName("Should get enterprise by UID successfully")
    void getEnterpriseByUid_WithValidUid_ShouldReturnEnterprise() {
        // Given
        String uid = "test-uid";

        when(enterpriseMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(mockEnterprise);

        // When
        Enterprise result = enterpriseService.getEnterpriseByUid(uid);

        // Then
        assertNotNull(result);
        assertEquals(mockEnterprise, result);
        verify(enterpriseMapper).selectOne(any(LambdaQueryWrapper.class));
    }

    @Test
    @DisplayName("Should return null when enterprise with UID does not exist")
    void getEnterpriseByUid_WithNonExistentUid_ShouldReturnNull() {
        // Given
        String uid = "non-existent-uid";

        when(enterpriseMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);

        // When
        Enterprise result = enterpriseService.getEnterpriseByUid(uid);

        // Then
        assertNull(result);
    }

    @Test
    @DisplayName("Should get UID by enterprise ID successfully")
    void getUidByEnterpriseId_WithValidEnterpriseId_ShouldReturnUid() {
        // Given
        Long enterpriseId = 1L;

        when(enterpriseMapper.selectById(enterpriseId)).thenReturn(mockEnterprise);

        // When
        String result = enterpriseService.getUidByEnterpriseId(enterpriseId);

        // Then
        assertEquals(mockEnterprise.getUid(), result);
    }

    @Test
    @DisplayName("Should test updateExpireTime method exists and is callable")
    void updateExpireTime_WithValidEnterprise_TestMethodExists() {
        // Test that the updateExpireTime method exists and has correct signature
        assertDoesNotThrow(() -> {
            java.lang.reflect.Method method = enterpriseService.getClass()
                    .getMethod("updateExpireTime", Enterprise.class);
            assertNotNull(method, "updateExpireTime method should exist");
            assertEquals(int.class, method.getReturnType(), "updateExpireTime should return int");
        });

        // Verify the service implements the interface correctly
        assertTrue(enterpriseService instanceof com.iflytek.astron.console.commons.service.space.EnterpriseService,
                "Service should implement EnterpriseService interface");
    }

    @Test
    @DisplayName("Should save enterprise successfully")
    void save_WithValidEnterprise_ShouldSaveSuccessfully() {
        // Given
        when(enterpriseMapper.insert(any(Enterprise.class))).thenReturn(1);

        // When
        boolean result = enterpriseService.save(mockEnterprise);

        // Then
        assertTrue(result);
        verify(enterpriseMapper).insert(any(Enterprise.class));
    }

    @Test
    @DisplayName("Should update enterprise by ID successfully")
    void updateById_WithValidEnterprise_ShouldUpdateSuccessfully() {
        // Given
        when(enterpriseMapper.updateById(any(Enterprise.class))).thenReturn(1);

        // When
        boolean result = enterpriseService.updateById(mockEnterprise);

        // Then
        assertTrue(result);
        verify(enterpriseMapper).updateById(any(Enterprise.class));
    }

    @Test
    @DisplayName("Should get enterprise by ID using parent method")
    void getById_WithValidId_ShouldReturnEnterprise() {
        // Given
        Long id = 1L;

        when(enterpriseMapper.selectById(id)).thenReturn(mockEnterprise);

        // When
        Enterprise result = enterpriseService.getById(id);

        // Then
        assertNotNull(result);
        assertEquals(mockEnterprise, result);
        verify(enterpriseMapper).selectById(id);
    }

    @Test
    @DisplayName("Should handle Redis exceptions gracefully in setLastVisitEnterpriseId")
    void setLastVisitEnterpriseId_WithRedisException_ShouldHandleGracefully() {
        // Given
        Long enterpriseId = 123L;
        String uid = "test-uid";
        String expectedKey = "USER_LAST_VISIT_ENTERPRISE_ID:test-uid";

        when(redissonClient.getBucket(expectedKey)).thenThrow(new RuntimeException("Redis connection error"));

        try (MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(uid);

            // When & Then
            assertThrows(RuntimeException.class, () -> {
                enterpriseService.setLastVisitEnterpriseId(enterpriseId);
            });
        }
    }

    @Test
    @DisplayName("Should handle Redis exceptions gracefully in getLastVisitEnterpriseId")
    void getLastVisitEnterpriseId_WithRedisException_ShouldHandleGracefully() {
        // Given
        String uid = "test-uid";
        String expectedKey = "USER_LAST_VISIT_ENTERPRISE_ID:test-uid";

        when(redissonClient.getBucket(expectedKey)).thenThrow(new RuntimeException("Redis connection error"));

        try (MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(uid);

            // When & Then
            assertThrows(RuntimeException.class, () -> {
                enterpriseService.getLastVisitEnterpriseId();
            });
        }
    }

    @Test
    @DisplayName("Should verify service implements interface correctly")
    void verifyServiceImplementsInterfaceCorrectly() {
        // Given & When & Then
        assertTrue(enterpriseService instanceof com.iflytek.astron.console.commons.service.space.EnterpriseService,
                "Service should implement EnterpriseService interface");

        assertTrue(enterpriseService instanceof com.baomidou.mybatisplus.extension.service.impl.ServiceImpl,
                "Service should extend MyBatis-Plus ServiceImpl");
    }

    @Test
    @DisplayName("Should handle null parameters gracefully in various methods")
    void handleNullParametersGracefully() {
        // Test checkExistByName with null name
        when(enterpriseMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(0L);
        assertFalse(enterpriseService.checkExistByName(null, 1L));

        // Test checkExistByUid with null uid
        assertFalse(enterpriseService.checkExistByUid(null));

        // Test getEnterpriseByUid with null uid
        when(enterpriseMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);
        assertNull(enterpriseService.getEnterpriseByUid(null));
    }

    @Test
    @DisplayName("Should handle invalid data formats in Redis operations")
    void handleInvalidDataFormatsInRedis() {
        // Given
        String uid = "test-uid";
        String expectedKey = "USER_LAST_VISIT_ENTERPRISE_ID:test-uid";

        when(redissonClient.getBucket(expectedKey)).thenReturn(rBucket);
        when(rBucket.get()).thenReturn("invalid-number-format");

        try (MockedStatic<RequestContextUtil> mockedRequestContext = mockStatic(RequestContextUtil.class)) {
            mockedRequestContext.when(RequestContextUtil::getUID).thenReturn(uid);

            // When & Then
            assertThrows(NumberFormatException.class, () -> {
                enterpriseService.getLastVisitEnterpriseId();
            });
        }
    }
}
