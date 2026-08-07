package com.iflytek.astron.console.commons.service.space.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.iflytek.astron.console.commons.data.UserInfoDataService;
import com.iflytek.astron.console.commons.dto.space.EnterpriseSpaceCountVO;
import com.iflytek.astron.console.commons.dto.space.SpaceVO;
import com.iflytek.astron.console.commons.entity.space.Space;
import com.iflytek.astron.console.commons.entity.space.SpaceUser;
import com.iflytek.astron.console.commons.entity.user.UserInfo;
import com.iflytek.astron.console.commons.enums.space.SpaceRoleEnum;
import com.iflytek.astron.console.commons.enums.space.SpaceTypeEnum;
import com.iflytek.astron.console.commons.mapper.space.SpaceMapper;
import com.iflytek.astron.console.commons.service.space.EnterpriseService;
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
import org.redisson.api.RBucket;
import org.redisson.api.RedissonClient;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.InvocationTargetException;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for SpaceServiceImpl
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("SpaceServiceImpl Test Cases")
class SpaceServiceImplTest {

    @Mock
    private SpaceMapper spaceMapper;

    @Mock
    private SpaceUserService spaceUserService;

    @Mock
    private UserInfoDataService userInfoDataService;

    @Mock
    private RedissonClient redissonClient;

    @Mock
    private EnterpriseService enterpriseService;

    @Mock
    private RBucket<Object> rBucket;

    @InjectMocks
    private SpaceServiceImpl spaceService;

    private Space mockSpace;
    private SpaceVO mockSpaceVO;
    private SpaceUser mockSpaceUser;
    private UserInfo mockUserInfo;
    private List<SpaceVO> mockSpaceVOList;
    private List<SpaceUser> mockSpaceUserList;
    private EnterpriseSpaceCountVO mockCountVO;

    @BeforeEach
    void setUp() {
        // Set the baseMapper field using reflection to enable MyBatis-Plus operations
        ReflectionTestUtils.setField(spaceService, "baseMapper", spaceMapper);

        // Initialize test data
        mockSpace = createMockSpace(1L, "Test Space", "test-uid", 100L, SpaceTypeEnum.FREE.getCode());

        mockSpaceVO = createMockSpaceVO(1L, "Test Space", "test-uid", 100L, SpaceTypeEnum.FREE.getCode());

        mockSpaceUser = createMockSpaceUser(1L, 1L, "test-uid", "Test User", SpaceRoleEnum.OWNER.getCode());

        mockUserInfo = new UserInfo();
        mockUserInfo.setUid("test-uid");
        mockUserInfo.setNickname("Test User");
        mockUserInfo.setUsername("testuser");

        mockSpaceVOList = Arrays.asList(
                mockSpaceVO,
                createMockSpaceVO(2L, "Test Space 2", "test-uid-2", 100L, SpaceTypeEnum.PRO.getCode()));

        mockSpaceUserList = Arrays.asList(
                mockSpaceUser,
                createMockSpaceUser(2L, 1L, "test-uid-2", "Test User 2", SpaceRoleEnum.MEMBER.getCode()));

        mockCountVO = new EnterpriseSpaceCountVO();
        mockCountVO.setTotal(10L);
        mockCountVO.setJoined(5L);
    }

    /**
     * Helper method to create mock Space objects
     */
    private Space createMockSpace(Long id, String name, String uid, Long enterpriseId, Integer type) {
        Space space = new Space();
        space.setId(id);
        space.setName(name);
        space.setUid(uid);
        space.setEnterpriseId(enterpriseId);
        space.setType(type);
        space.setCreateTime(LocalDateTime.now());
        space.setUpdateTime(LocalDateTime.now());
        return space;
    }

    /**
     * Helper method to create mock SpaceVO objects
     */
    private SpaceVO createMockSpaceVO(Long id, String name, String uid, Long enterpriseId, Integer type) {
        SpaceVO spaceVO = new SpaceVO();
        spaceVO.setId(id);
        spaceVO.setName(name);
        spaceVO.setUid(uid);
        spaceVO.setEnterpriseId(enterpriseId);
        spaceVO.setLastVisitTime(LocalDateTime.now());
        spaceVO.setMemberCount(2);
        spaceVO.setOwnerName("Test Owner");
        return spaceVO;
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
    @DisplayName("Should return recent visit list successfully")
    void recentVisitList_ShouldReturnSpaceVOList() {
        // Given
        String uid = "test-uid";
        Long enterpriseId = 100L;

        try (MockedStatic<RequestContextUtil> requestMockedStatic = mockStatic(RequestContextUtil.class);
                MockedStatic<EnterpriseInfoUtil> enterpriseMockedStatic = mockStatic(EnterpriseInfoUtil.class)) {

            requestMockedStatic.when(RequestContextUtil::getUID).thenReturn(uid);
            enterpriseMockedStatic.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(enterpriseId);
            when(spaceMapper.recentVisitList(uid, enterpriseId)).thenReturn(mockSpaceVOList);

            // When
            List<SpaceVO> result = spaceService.recentVisitList();

            // Then
            assertNotNull(result);
            assertEquals(2, result.size());
            verify(spaceMapper).recentVisitList(uid, enterpriseId);
        }
    }

    @Test
    @DisplayName("Should return personal list with extra info")
    void personalList_WithValidName_ShouldReturnSpaceVOListWithExtraInfo() {
        // Given
        String uid = "test-uid";
        Long enterpriseId = 100L;
        String name = "Test";
        List<Long> spaceIds = Arrays.asList(1L, 2L);

        try (MockedStatic<RequestContextUtil> requestMockedStatic = mockStatic(RequestContextUtil.class);
                MockedStatic<EnterpriseInfoUtil> enterpriseMockedStatic = mockStatic(EnterpriseInfoUtil.class)) {

            requestMockedStatic.when(RequestContextUtil::getUID).thenReturn(uid);
            enterpriseMockedStatic.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(enterpriseId);
            when(spaceMapper.joinList(uid, enterpriseId, name)).thenReturn(mockSpaceVOList);
            when(spaceUserService.getAllSpaceUsers(spaceIds)).thenReturn(mockSpaceUserList);
            when(userInfoDataService.findByUid("test-uid")).thenReturn(Optional.of(mockUserInfo));

            // When
            List<SpaceVO> result = spaceService.personalList(name);

            // Then
            assertNotNull(result);
            assertEquals(2, result.size());
            assertEquals(2, result.get(0).getMemberCount());
            assertEquals("Test User", result.get(0).getOwnerName());
            verify(spaceMapper).joinList(uid, enterpriseId, name);
            verify(spaceUserService).getAllSpaceUsers(spaceIds);
        }
    }

    @Test
    @DisplayName("Should return personal self list successfully")
    void personalSelfList_WithValidName_ShouldReturnSpaceVOList() {
        // Given
        String uid = "test-uid";
        Long enterpriseId = 100L;
        String name = "Test";
        List<Long> spaceIds = Arrays.asList(1L, 2L);

        try (MockedStatic<RequestContextUtil> requestMockedStatic = mockStatic(RequestContextUtil.class);
                MockedStatic<EnterpriseInfoUtil> enterpriseMockedStatic = mockStatic(EnterpriseInfoUtil.class)) {

            requestMockedStatic.when(RequestContextUtil::getUID).thenReturn(uid);
            enterpriseMockedStatic.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(enterpriseId);
            when(spaceMapper.selfList(uid, SpaceRoleEnum.OWNER.getCode(), enterpriseId, name)).thenReturn(mockSpaceVOList);
            when(spaceUserService.getAllSpaceUsers(spaceIds)).thenReturn(mockSpaceUserList);
            when(userInfoDataService.findByUid("test-uid")).thenReturn(Optional.of(mockUserInfo));

            // When
            List<SpaceVO> result = spaceService.personalSelfList(name);

            // Then
            assertNotNull(result);
            assertEquals(2, result.size());
            verify(spaceMapper).selfList(uid, SpaceRoleEnum.OWNER.getCode(), enterpriseId, name);
        }
    }

    @Test
    @DisplayName("Should return corporate join list successfully")
    void corporateJoinList_WithValidName_ShouldReturnSpaceVOList() {
        // Given
        String uid = "test-uid";
        Long enterpriseId = 100L;
        String name = "Test";

        try (MockedStatic<RequestContextUtil> requestMockedStatic = mockStatic(RequestContextUtil.class);
                MockedStatic<EnterpriseInfoUtil> enterpriseMockedStatic = mockStatic(EnterpriseInfoUtil.class)) {

            requestMockedStatic.when(RequestContextUtil::getUID).thenReturn(uid);
            enterpriseMockedStatic.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(enterpriseId);
            when(spaceMapper.joinList(uid, enterpriseId, name)).thenReturn(mockSpaceVOList);
            when(spaceUserService.getAllSpaceUsers(anyList())).thenReturn(mockSpaceUserList);
            when(userInfoDataService.findByUid("test-uid")).thenReturn(Optional.of(mockUserInfo));

            // When
            List<SpaceVO> result = spaceService.corporateJoinList(name);

            // Then
            assertNotNull(result);
            assertEquals(2, result.size());
            verify(spaceMapper).joinList(uid, enterpriseId, name);
        }
    }

    @Test
    @DisplayName("Should return corporate list successfully")
    void corporateList_WithValidName_ShouldReturnSpaceVOList() {
        // Given
        String uid = "test-uid";
        Long enterpriseId = 100L;
        String name = "Test";

        try (MockedStatic<RequestContextUtil> requestMockedStatic = mockStatic(RequestContextUtil.class);
                MockedStatic<EnterpriseInfoUtil> enterpriseMockedStatic = mockStatic(EnterpriseInfoUtil.class)) {

            requestMockedStatic.when(RequestContextUtil::getUID).thenReturn(uid);
            enterpriseMockedStatic.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(enterpriseId);
            when(spaceMapper.corporateList(uid, enterpriseId, name)).thenReturn(mockSpaceVOList);
            when(spaceUserService.getAllSpaceUsers(anyList())).thenReturn(mockSpaceUserList);
            when(userInfoDataService.findByUid("test-uid")).thenReturn(Optional.of(mockUserInfo));

            // When
            List<SpaceVO> result = spaceService.corporateList(name);

            // Then
            assertNotNull(result);
            assertEquals(2, result.size());
            verify(spaceMapper).corporateList(uid, enterpriseId, name);
        }
    }

    @Test
    @DisplayName("Should return corporate count successfully")
    void corporateCount_ShouldReturnEnterpriseSpaceCountVO() {
        // Given
        String uid = "test-uid";
        Long enterpriseId = 100L;

        try (MockedStatic<RequestContextUtil> requestMockedStatic = mockStatic(RequestContextUtil.class);
                MockedStatic<EnterpriseInfoUtil> enterpriseMockedStatic = mockStatic(EnterpriseInfoUtil.class)) {

            requestMockedStatic.when(RequestContextUtil::getUID).thenReturn(uid);
            enterpriseMockedStatic.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(enterpriseId);
            when(spaceMapper.corporateCount(uid, enterpriseId)).thenReturn(mockCountVO);

            // When
            EnterpriseSpaceCountVO result = spaceService.corporateCount();

            // Then
            assertNotNull(result);
            assertEquals(10L, result.getTotal());
            assertEquals(5L, result.getJoined());
            verify(spaceMapper).corporateCount(uid, enterpriseId);
        }
    }

    @Test
    @DisplayName("Should return space VO with member info successfully")
    void getSpaceVO_WithValidSpaceId_ShouldReturnSpaceVOWithMemberInfo() {
        // Given
        String uid = "test-uid";
        Long spaceId = 1L;

        try (MockedStatic<RequestContextUtil> requestMockedStatic = mockStatic(RequestContextUtil.class);
                MockedStatic<SpaceInfoUtil> spaceMockedStatic = mockStatic(SpaceInfoUtil.class)) {

            requestMockedStatic.when(RequestContextUtil::getUID).thenReturn(uid);
            spaceMockedStatic.when(SpaceInfoUtil::getSpaceId).thenReturn(spaceId);
            when(spaceMapper.getByUidAndId(uid, spaceId)).thenReturn(mockSpaceVO);
            when(spaceUserService.getAllSpaceUsers(spaceId)).thenReturn(mockSpaceUserList);
            when(userInfoDataService.findByUid("test-uid")).thenReturn(Optional.of(mockUserInfo));

            // When
            SpaceVO result = spaceService.getSpaceVO();

            // Then
            assertNotNull(result);
            assertEquals(2, result.getMemberCount());
            assertEquals("Test User", result.getOwnerName());
            verify(spaceMapper).getByUidAndId(uid, spaceId);
            verify(spaceUserService).getAllSpaceUsers(spaceId);
        }
    }

    @Test
    @DisplayName("Should return null when space VO does not exist")
    void getSpaceVO_WithNonExistentSpace_ShouldReturnNull() {
        // Given
        String uid = "test-uid";
        Long spaceId = 999L;

        try (MockedStatic<RequestContextUtil> requestMockedStatic = mockStatic(RequestContextUtil.class);
                MockedStatic<SpaceInfoUtil> spaceMockedStatic = mockStatic(SpaceInfoUtil.class)) {

            requestMockedStatic.when(RequestContextUtil::getUID).thenReturn(uid);
            spaceMockedStatic.when(SpaceInfoUtil::getSpaceId).thenReturn(spaceId);
            when(spaceMapper.getByUidAndId(uid, spaceId)).thenReturn(null);

            // When
            SpaceVO result = spaceService.getSpaceVO();

            // Then
            assertNull(result);
            verify(spaceMapper).getByUidAndId(uid, spaceId);
            verify(spaceUserService, never()).getAllSpaceUsers(anyLong());
        }
    }

    @Test
    @DisplayName("Should set last visit personal space time successfully")
    void setLastVisitPersonalSpaceTime_ShouldSetTimestampInRedis() {
        // Given
        String uid = "test-uid";
        String redisKey = "USER_LAST_VISIT_PERSONAL_SPACE_TIME:" + uid;

        try (MockedStatic<RequestContextUtil> requestMockedStatic = mockStatic(RequestContextUtil.class)) {
            requestMockedStatic.when(RequestContextUtil::getUID).thenReturn(uid);
            when(redissonClient.getBucket(redisKey)).thenReturn(rBucket);

            // When
            spaceService.setLastVisitPersonalSpaceTime();

            // Then
            verify(redissonClient).getBucket(redisKey);
            verify(rBucket).set(anyString());
        }
    }

    @Test
    @DisplayName("Should get last visit space successfully")
    void getLastVisitSpace_WithValidData_ShouldReturnSpaceVO() {
        // Given
        String uid = "test-uid";
        Long enterpriseId = 100L;

        try (MockedStatic<RequestContextUtil> requestMockedStatic = mockStatic(RequestContextUtil.class);
                MockedStatic<EnterpriseInfoUtil> enterpriseMockedStatic = mockStatic(EnterpriseInfoUtil.class)) {

            requestMockedStatic.when(RequestContextUtil::getUID).thenReturn(uid);
            enterpriseMockedStatic.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(enterpriseId);
            when(spaceMapper.recentVisitList(uid, enterpriseId)).thenReturn(mockSpaceVOList);
            when(redissonClient.getBucket(anyString())).thenReturn(rBucket);
            when(rBucket.get()).thenReturn("1234567890");
            when(spaceMapper.getByUidAndId(uid, 1L)).thenReturn(mockSpaceVO);

            // When
            SpaceVO result = spaceService.getLastVisitSpace();

            // Then
            assertNotNull(result);
            verify(spaceMapper).recentVisitList(uid, enterpriseId);
        }
    }

    @Test
    @DisplayName("Should return space VO with enterprise ID when no recent visits and enterprise ID exists")
    void getLastVisitSpace_WithNoRecentVisitsButEnterpriseExists_ShouldReturnSpaceVOWithEnterpriseId() {
        // Given
        String uid = "test-uid";
        Long enterpriseId = 100L;

        try (MockedStatic<RequestContextUtil> requestMockedStatic = mockStatic(RequestContextUtil.class);
                MockedStatic<EnterpriseInfoUtil> enterpriseMockedStatic = mockStatic(EnterpriseInfoUtil.class)) {

            requestMockedStatic.when(RequestContextUtil::getUID).thenReturn(uid);
            enterpriseMockedStatic.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(enterpriseId);
            when(spaceMapper.recentVisitList(uid, enterpriseId)).thenReturn(Collections.emptyList());

            // When
            SpaceVO result = spaceService.getLastVisitSpace();

            // Then
            assertNotNull(result);
            assertEquals(enterpriseId, result.getEnterpriseId());
            verify(spaceMapper).recentVisitList(uid, enterpriseId);
        }
    }

    @Test
    @DisplayName("Should get last visit enterprise ID when no enterprise ID provided")
    void getLastVisitSpace_WithNoEnterpriseId_ShouldGetLastVisitEnterpriseId() {
        // Given
        String uid = "test-uid";
        Long lastVisitEnterpriseId = 200L;

        try (MockedStatic<RequestContextUtil> requestMockedStatic = mockStatic(RequestContextUtil.class);
                MockedStatic<EnterpriseInfoUtil> enterpriseMockedStatic = mockStatic(EnterpriseInfoUtil.class)) {

            requestMockedStatic.when(RequestContextUtil::getUID).thenReturn(uid);
            enterpriseMockedStatic.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(null);
            when(enterpriseService.getLastVisitEnterpriseId()).thenReturn(lastVisitEnterpriseId);
            when(spaceMapper.recentVisitList(uid, lastVisitEnterpriseId)).thenReturn(mockSpaceVOList);
            when(redissonClient.getBucket(anyString())).thenReturn(rBucket);
            when(rBucket.get()).thenReturn("1234567890");
            when(spaceMapper.getByUidAndId(uid, 1L)).thenReturn(mockSpaceVO);

            // When
            SpaceVO result = spaceService.getLastVisitSpace();

            // Then
            assertNotNull(result);
            verify(enterpriseService).getLastVisitEnterpriseId();
            verify(spaceMapper).recentVisitList(uid, lastVisitEnterpriseId);
        }
    }

    @Test
    @DisplayName("Should count spaces by enterprise ID correctly")
    void countByEnterpriseId_WithValidEnterpriseId_ShouldReturnCorrectCount() {
        // Given
        Long enterpriseId = 100L;
        Long expectedCount = 5L;

        when(spaceMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(expectedCount);

        // When
        Long result = spaceService.countByEnterpriseId(enterpriseId);

        // Then
        assertEquals(expectedCount, result);
        verify(spaceMapper).selectCount(any(LambdaQueryWrapper.class));
    }

    @Test
    @DisplayName("Should count spaces by UID correctly")
    void countByUid_WithValidUid_ShouldReturnCorrectCount() {
        // Given
        String uid = "test-uid";
        Long expectedCount = 3L;

        when(spaceMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(expectedCount);

        // When
        Long result = spaceService.countByUid(uid);

        // Then
        assertEquals(expectedCount, result);
        verify(spaceMapper).selectCount(any(LambdaQueryWrapper.class));
    }

    @Test
    @DisplayName("Should get space by ID successfully")
    void getSpaceById_WithValidId_ShouldReturnSpace() {
        // Given
        Long spaceId = 1L;

        when(spaceMapper.selectById(spaceId)).thenReturn(mockSpace);

        // When
        Space result = spaceService.getSpaceById(spaceId);

        // Then
        assertNotNull(result);
        assertEquals(mockSpace.getId(), result.getId());
        assertEquals(mockSpace.getName(), result.getName());
        verify(spaceMapper).selectById(spaceId);
    }

    @Test
    @DisplayName("Should return null when space by ID does not exist")
    void getSpaceById_WithNonExistentId_ShouldReturnNull() {
        // Given
        Long spaceId = 999L;

        when(spaceMapper.selectById(spaceId)).thenReturn(null);

        // When
        Space result = spaceService.getSpaceById(spaceId);

        // Then
        assertNull(result);
        verify(spaceMapper).selectById(spaceId);
    }

    @Test
    @DisplayName("Should list spaces by enterprise ID and UID")
    void listByEnterpriseIdAndUid_WithValidParameters_ShouldReturnSpaceVOList() {
        // Given
        Long enterpriseId = 100L;
        String uid = "test-uid";

        when(spaceMapper.joinList(uid, enterpriseId, null)).thenReturn(mockSpaceVOList);

        // When
        List<SpaceVO> result = spaceService.listByEnterpriseIdAndUid(enterpriseId, uid);

        // Then
        assertNotNull(result);
        assertEquals(2, result.size());
        verify(spaceMapper).joinList(uid, enterpriseId, null);
    }

    @Test
    @DisplayName("Should check existence by name for enterprise space")
    void checkExistByName_WithEnterpriseSpace_ShouldReturnTrue() {
        // Given
        String name = "Test Space";
        Long id = 1L;
        Long enterpriseId = 100L;

        try (MockedStatic<EnterpriseInfoUtil> enterpriseMockedStatic = mockStatic(EnterpriseInfoUtil.class)) {
            enterpriseMockedStatic.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(enterpriseId);
            when(spaceMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(1L);

            // When
            boolean result = spaceService.checkExistByName(name, id);

            // Then
            assertTrue(result);
            verify(spaceMapper).selectCount(any(LambdaQueryWrapper.class));
        }
    }

    @Test
    @DisplayName("Should check existence by name for personal space")
    void checkExistByName_WithPersonalSpace_ShouldReturnTrue() {
        // Given
        String name = "Test Space";
        Long id = 1L;
        String uid = "test-uid";

        try (MockedStatic<EnterpriseInfoUtil> enterpriseMockedStatic = mockStatic(EnterpriseInfoUtil.class);
                MockedStatic<RequestContextUtil> requestMockedStatic = mockStatic(RequestContextUtil.class)) {

            enterpriseMockedStatic.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(null);
            requestMockedStatic.when(RequestContextUtil::getUID).thenReturn(uid);
            when(spaceMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(1L);

            // When
            boolean result = spaceService.checkExistByName(name, id);

            // Then
            assertTrue(result);
            verify(spaceMapper).selectCount(any(LambdaQueryWrapper.class));
        }
    }

    @Test
    @DisplayName("Should return false when name does not exist")
    void checkExistByName_WithNonExistentName_ShouldReturnFalse() {
        // Given
        String name = "Non Existent Space";
        Long id = 1L;
        Long enterpriseId = 100L;

        try (MockedStatic<EnterpriseInfoUtil> enterpriseMockedStatic = mockStatic(EnterpriseInfoUtil.class)) {
            enterpriseMockedStatic.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(enterpriseId);
            when(spaceMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(0L);

            // When
            boolean result = spaceService.checkExistByName(name, id);

            // Then
            assertFalse(result);
            verify(spaceMapper).selectCount(any(LambdaQueryWrapper.class));
        }
    }

    @Test
    @DisplayName("Should get space type successfully")
    void getSpaceType_WithValidSpaceId_ShouldReturnSpaceType() {
        // Given
        Long spaceId = 1L;

        when(spaceMapper.selectById(spaceId)).thenReturn(mockSpace);

        // When
        SpaceTypeEnum result = spaceService.getSpaceType(spaceId);

        // Then
        assertEquals(SpaceTypeEnum.FREE, result);
        verify(spaceMapper).selectById(spaceId);
    }

    @Test
    @DisplayName("Should return FREE when space ID is null")
    void getSpaceType_WithNullSpaceId_ShouldReturnFree() {
        // Given & When
        SpaceTypeEnum result = spaceService.getSpaceType(null);

        // Then
        assertEquals(SpaceTypeEnum.FREE, result);
        verify(spaceMapper, never()).selectById(any());
    }

    @Test
    @DisplayName("Should return null when space does not exist")
    void getSpaceType_WithNonExistentSpace_ShouldReturnNull() {
        // Given
        Long spaceId = 999L;

        when(spaceMapper.selectById(spaceId)).thenReturn(null);

        // When
        SpaceTypeEnum result = spaceService.getSpaceType(spaceId);

        // Then
        assertNull(result);
        verify(spaceMapper).selectById(spaceId);
    }

    @Test
    @DisplayName("Should save space successfully")
    void save_WithValidSpace_ShouldReturnTrue() {
        // Given
        when(spaceMapper.insert(any(Space.class))).thenReturn(1);

        // When
        boolean result = spaceService.save(mockSpace);

        // Then
        assertTrue(result);
        verify(spaceMapper).insert(any(Space.class));
    }

    @Test
    @DisplayName("Should get space by ID successfully through service method")
    void getById_WithValidId_ShouldReturnSpace() {
        // Given
        Long spaceId = 1L;

        when(spaceMapper.selectById(spaceId)).thenReturn(mockSpace);

        // When
        Space result = spaceService.getById(spaceId);

        // Then
        assertNotNull(result);
        assertEquals(mockSpace, result);
        verify(spaceMapper).selectById(spaceId);
    }

    @Test
    @DisplayName("Should remove space by ID successfully")
    void removeById_WithValidId_ShouldReturnTrue() {
        // Given
        Long spaceId = 1L;

        when(spaceMapper.deleteById(spaceId)).thenReturn(1);

        // When
        boolean result = spaceService.removeById(spaceId);

        // Then
        assertTrue(result);
        verify(spaceMapper).deleteById(spaceId);
    }

    @Test
    @DisplayName("Should update space by ID successfully")
    void updateById_WithValidSpace_ShouldReturnTrue() {
        // Given
        when(spaceMapper.updateById(any(Space.class))).thenReturn(1);

        // When
        boolean result = spaceService.updateById(mockSpace);

        // Then
        assertTrue(result);
        verify(spaceMapper).updateById(any(Space.class));
    }

    @Test
    @DisplayName("Should handle empty space VO list in setSpaceVOExtraInfo")
    void setSpaceVOExtraInfo_WithEmptyList_ShouldHandleGracefully() {
        // Given
        List<SpaceVO> emptyList = Collections.emptyList();

        // Use reflection to call private method
        assertDoesNotThrow(() -> {
            java.lang.reflect.Method method = spaceService.getClass()
                    .getDeclaredMethod("setSpaceVOExtraInfo", List.class);
            method.setAccessible(true);
            method.invoke(spaceService, emptyList);
        });

        // Verify no service calls were made
        verify(spaceUserService, never()).getAllSpaceUsers(anyList());
    }

    @Test
    @DisplayName("Should handle null user info in setSpaceVOExtraInfo")
    void setSpaceVOExtraInfo_WithNullUserInfo_ShouldHandleGracefully() {
        // Given
        List<Long> spaceIds = Arrays.asList(1L, 2L); // Match the actual space IDs in mockSpaceVOList

        when(spaceUserService.getAllSpaceUsers(spaceIds)).thenReturn(mockSpaceUserList);
        when(userInfoDataService.findByUid("test-uid")).thenReturn(Optional.empty());

        // When & Then
        assertThrows(InvocationTargetException.class, () -> {
            java.lang.reflect.Method method = spaceService.getClass()
                    .getDeclaredMethod("setSpaceVOExtraInfo", List.class);
            method.setAccessible(true);
            method.invoke(spaceService, mockSpaceVOList);
        });
    }

    @Test
    @DisplayName("Should verify service implements interface correctly")
    void verifyServiceImplementsInterfaceCorrectly() {
        // Given & When & Then
        assertTrue(spaceService instanceof com.iflytek.astron.console.commons.service.space.SpaceService,
                "Service should implement SpaceService interface");

        assertTrue(spaceService instanceof com.baomidou.mybatisplus.extension.service.impl.ServiceImpl,
                "Service should extend MyBatis-Plus ServiceImpl");
    }

    @Test
    @DisplayName("Should verify all interface methods are implemented")
    void verifyAllInterfaceMethodsAreImplemented() {
        // Test that all methods from the interface are properly implemented
        assertDoesNotThrow(() -> {
            // Verify key interface methods exist
            java.lang.reflect.Method method = spaceService.getClass()
                    .getMethod("recentVisitList");
            assertNotNull(method);
            assertEquals(List.class, method.getReturnType());

            method = spaceService.getClass()
                    .getMethod("personalList", String.class);
            assertNotNull(method);
            assertEquals(List.class, method.getReturnType());

            method = spaceService.getClass()
                    .getMethod("getSpaceType", Long.class);
            assertNotNull(method);
            assertEquals(SpaceTypeEnum.class, method.getReturnType());

            method = spaceService.getClass()
                    .getMethod("checkExistByName", String.class, Long.class);
            assertNotNull(method);
            assertEquals(boolean.class, method.getReturnType());
        });
    }

    @Test
    @DisplayName("Should handle Redis operations gracefully")
    void testRedisOperations_ShouldHandleGracefully() {
        // Given
        String uid = "test-uid";
        String redisKey = "USER_LAST_VISIT_PERSONAL_SPACE_TIME:" + uid;

        try (MockedStatic<RequestContextUtil> requestMockedStatic = mockStatic(RequestContextUtil.class)) {
            requestMockedStatic.when(RequestContextUtil::getUID).thenReturn(uid);
            when(redissonClient.getBucket(redisKey)).thenReturn(rBucket);

            // When
            spaceService.setLastVisitPersonalSpaceTime();

            // Then
            verify(redissonClient).getBucket(redisKey);
            verify(rBucket).set(anyString());
        }
    }

    @Test
    @DisplayName("Should handle different space types correctly")
    void getSpaceType_WithDifferentTypes_ShouldReturnCorrectTypes() {
        // Test with PRO space
        Space proSpace = createMockSpace(2L, "Pro Space", "test-uid", 100L, SpaceTypeEnum.PRO.getCode());
        when(spaceMapper.selectById(2L)).thenReturn(proSpace);

        SpaceTypeEnum result = spaceService.getSpaceType(2L);
        assertEquals(SpaceTypeEnum.PRO, result);

        // Test with FREE space
        when(spaceMapper.selectById(1L)).thenReturn(mockSpace);
        result = spaceService.getSpaceType(1L);
        assertEquals(SpaceTypeEnum.FREE, result);
    }

    @Test
    @DisplayName("Should handle large collections efficiently")
    void personalList_WithLargeCollections_ShouldHandleEfficiently() {
        // Given
        String uid = "test-uid";
        Long enterpriseId = 100L;
        String name = "Test";

        // Create large lists
        List<SpaceVO> largeSpaceVOList = new ArrayList<>();
        List<SpaceUser> largeSpaceUserList = new ArrayList<>();
        List<Long> largeSpaceIds = new ArrayList<>();

        for (int i = 0; i < 100; i++) {
            largeSpaceVOList.add(createMockSpaceVO((long) i, "Space " + i, "uid-" + i, enterpriseId, SpaceTypeEnum.FREE.getCode()));
            largeSpaceUserList.add(createMockSpaceUser((long) i, (long) i, "uid-" + i, "User " + i, SpaceRoleEnum.OWNER.getCode()));
            largeSpaceIds.add((long) i);
        }

        try (MockedStatic<RequestContextUtil> requestMockedStatic = mockStatic(RequestContextUtil.class);
                MockedStatic<EnterpriseInfoUtil> enterpriseMockedStatic = mockStatic(EnterpriseInfoUtil.class)) {

            requestMockedStatic.when(RequestContextUtil::getUID).thenReturn(uid);
            enterpriseMockedStatic.when(EnterpriseInfoUtil::getEnterpriseId).thenReturn(enterpriseId);
            when(spaceMapper.joinList(uid, enterpriseId, name)).thenReturn(largeSpaceVOList);
            when(spaceUserService.getAllSpaceUsers(largeSpaceIds)).thenReturn(largeSpaceUserList);
            when(userInfoDataService.findByUid(anyString())).thenReturn(Optional.of(mockUserInfo));

            // When
            List<SpaceVO> result = spaceService.personalList(name);

            // Then
            assertNotNull(result);
            assertEquals(100, result.size());
            verify(spaceMapper).joinList(uid, enterpriseId, name);
            verify(spaceUserService).getAllSpaceUsers(largeSpaceIds);
        }
    }
}
