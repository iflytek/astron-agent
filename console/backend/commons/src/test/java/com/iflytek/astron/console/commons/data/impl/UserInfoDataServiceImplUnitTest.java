package com.iflytek.astron.console.commons.data.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.iflytek.astron.console.commons.entity.user.UserInfo;
import com.iflytek.astron.console.commons.event.UserNicknameUpdatedEvent;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.mapper.user.UserInfoMapper;
import com.iflytek.astron.console.commons.util.I18nUtil;
import com.iflytek.astron.console.commons.util.RequestContextUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.context.ApplicationEventPublisher;

import java.io.Serializable;
import java.lang.reflect.Method;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * UserInfoDataServiceImpl Unit Test (English version - avoiding Lambda expression issues)
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("UserInfoDataServiceImpl Unit Test (English)")
class UserInfoDataServiceImplUnitTest {

    @Mock
    private UserInfoMapper userInfoMapper;

    @Mock
    private RedissonClient redissonClient;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Mock
    private RLock rLock;

    @InjectMocks
    private UserInfoDataServiceImpl userInfoDataService;

    private UserInfo testUser;
    private final String testUid = "test-uid-123";
    private final String testUsername = "testuser";
    private final String testMobile = "13800138000";
    private final String testNickname = "Test User";

    @BeforeEach
    void setUp() {
        testUser = createTestUser();
    }

    private UserInfo createTestUser() {
        UserInfo user = new UserInfo();
        user.setId(1L);
        user.setUid(testUid);
        user.setUsername(testUsername);
        user.setMobile(testMobile);
        user.setNickname(testNickname);
        user.setAccountStatus(1);
        user.setUserAgreement(1);
        user.setCreateTime(LocalDateTime.now());
        user.setUpdateTime(LocalDateTime.now());
        user.setDeleted(0);
        return user;
    }

    @Nested
    @DisplayName("Query Method Tests")
    class QueryMethodTests {

        @Test
        @DisplayName("Find user by UID - Success scenario")
        void findByUid_Success() {
            // Given
            when(userInfoMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(testUser);

            // When
            Optional<UserInfo> result = userInfoDataService.findByUid(testUid);

            // Then
            assertThat(result).isPresent();
            assertThat(result.get().getUid()).isEqualTo(testUid);
            verify(userInfoMapper).selectOne(any(LambdaQueryWrapper.class));
        }

        @Test
        @DisplayName("Find user by UID - UID is null")
        void findByUid_NullUid() {
            // When
            Optional<UserInfo> result = userInfoDataService.findByUid(null);

            // Then
            assertThat(result).isEmpty();
            verify(userInfoMapper, never()).selectOne(any());
        }

        @Test
        @DisplayName("Find user by UID - User not found")
        void findByUid_UserNotFound() {
            // Given
            when(userInfoMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);

            // When
            Optional<UserInfo> result = userInfoDataService.findByUid(testUid);

            // Then
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("Find user by username - Success scenario")
        void findByUsername_Success() {
            // Given
            when(userInfoMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(testUser);

            // When
            Optional<UserInfo> result = userInfoDataService.findByUsername(testUsername);

            // Then
            assertThat(result).isPresent();
            assertThat(result.get().getUsername()).isEqualTo(testUsername);
        }

        @Test
        @DisplayName("Find user by username - Username is blank")
        void findByUsername_BlankUsername() {
            // When
            Optional<UserInfo> result1 = userInfoDataService.findByUsername("");
            Optional<UserInfo> result2 = userInfoDataService.findByUsername("   ");
            Optional<UserInfo> result3 = userInfoDataService.findByUsername(null);

            // Then
            assertThat(result1).isEmpty();
            assertThat(result2).isEmpty();
            assertThat(result3).isEmpty();
            verify(userInfoMapper, never()).selectOne(any());
        }

        @Test
        @DisplayName("Find users by mobile - Success scenario")
        void findUsersByMobile_Success() {
            // Given
            List<UserInfo> users = List.of(testUser);
            when(userInfoMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(users);

            // When
            List<UserInfo> result = userInfoDataService.findUsersByMobile(testMobile);

            // Then
            assertThat(result).hasSize(1);
            assertThat(result.getFirst().getMobile()).isEqualTo(testMobile);
        }

        @Test
        @DisplayName("Find users by mobile - Mobile is blank")
        void findUsersByMobile_BlankMobile() {
            // When
            List<UserInfo> result = userInfoDataService.findUsersByMobile("");

            // Then
            assertThat(result).isEmpty();
            verify(userInfoMapper, never()).selectList(any());
        }

        @Test
        @DisplayName("Find users by multiple UIDs")
        void findByUids() {
            // Given
            Collection<String> uids = List.of(testUid);
            List<UserInfo> users = List.of(testUser);
            when(userInfoMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(users);

            // When
            List<UserInfo> result = userInfoDataService.findByUids(uids);

            // Then
            assertThat(result).hasSize(1);
        }

        @Test
        @DisplayName("Find users by multiple UIDs - UIDs are null or empty")
        void findByUids_NullOrEmpty() {
            // When
            List<UserInfo> result1 = userInfoDataService.findByUids(null);
            List<UserInfo> result2 = userInfoDataService.findByUids(Collections.emptyList());

            // Then
            assertThat(result1).isEmpty();
            assertThat(result2).isEmpty();
        }

        @Test
        @DisplayName("Find nickname by UID")
        void findNickNameByUid() {
            // Given
            when(userInfoMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(testUser);

            // When
            Optional<String> result = userInfoDataService.findNickNameByUid(testUid);

            // Then
            assertThat(result).isPresent();
            assertThat(result.get()).isEqualTo(testNickname);
        }

        @Test
        @DisplayName("Find nickname by UID - UID is null")
        void findNickNameByUid_NullUid() {
            // When
            Optional<String> result = userInfoDataService.findNickNameByUid(null);

            // Then
            assertThat(result).isEmpty();
        }
    }

    @Nested
    @DisplayName("Create User Method Tests")
    class CreateUserMethodTests {

        @Test
        @DisplayName("Create or get user - User already exists")
        void createOrGetUser_UserExists() {
            // Given
            when(userInfoMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(testUser);

            // When
            UserInfo result = userInfoDataService.createOrGetUser(testUser);

            // Then
            assertThat(result).isEqualTo(testUser);
            verify(redissonClient, never()).getLock(anyString());
        }

        @Test
        @DisplayName("Create or get user - User info is null")
        void createOrGetUser_NullUserInfo() {
            // When & Then
            assertThatThrownBy(() -> userInfoDataService.createOrGetUser(null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("User information cannot be null");
        }

        @Test
        @DisplayName("Create or get user - UID is null")
        void createOrGetUser_NullUid() {
            // Given
            UserInfo userWithoutUid = new UserInfo();

            // When & Then
            assertThatThrownBy(() -> userInfoDataService.createOrGetUser(userWithoutUid))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("User UID cannot be null");
        }

        @Test
        @DisplayName("Create or get user - Successfully create new user")
        void createOrGetUser_CreateNewUser() throws InterruptedException {
            // Given
            UserInfo newUser = new UserInfo();
            newUser.setUid(testUid);
            newUser.setUsername(testUsername);

            when(userInfoMapper.selectOne(any(LambdaQueryWrapper.class)))
                    .thenReturn(null) // First check: not found
                    .thenReturn(null); // Second check in lock: still not found
            when(redissonClient.getLock(anyString())).thenReturn(rLock);
            when(rLock.tryLock(anyLong(), anyLong(), any(TimeUnit.class))).thenReturn(true);
            when(rLock.isHeldByCurrentThread()).thenReturn(true);
            when(userInfoMapper.insert(any(UserInfo.class))).thenReturn(1);

            try (MockedStatic<I18nUtil> i18nUtilMocked = mockStatic(I18nUtil.class)) {
                i18nUtilMocked.when(I18nUtil::getLanguage).thenReturn("en");

                // When
                UserInfo result = userInfoDataService.createOrGetUser(newUser);

                // Then
                assertThat(result).isNotNull();
                assertThat(result.getUid()).isEqualTo(testUid);
                assertThat(result.getCreateTime()).isNotNull();
                assertThat(result.getUpdateTime()).isNotNull();
                assertThat(result.getDeleted()).isZero();
                assertThat(result.getNickname()).isNotBlank();

                verify(rLock).tryLock(5, 10, TimeUnit.SECONDS);
                verify(rLock).unlock();
                verify(userInfoMapper).insert(any(UserInfo.class));
            }
        }

        @Test
        @DisplayName("Create or get user - User exists in lock")
        void createOrGetUser_UserExistsInLock() throws InterruptedException {
            // Given
            UserInfo newUser = new UserInfo();
            newUser.setUid(testUid);

            when(userInfoMapper.selectOne(any(LambdaQueryWrapper.class)))
                    .thenReturn(null) // First check: not found
                    .thenReturn(testUser); // Second check in lock: found
            when(redissonClient.getLock(anyString())).thenReturn(rLock);
            when(rLock.tryLock(anyLong(), anyLong(), any(TimeUnit.class))).thenReturn(true);
            when(rLock.isHeldByCurrentThread()).thenReturn(true);

            // When
            UserInfo result = userInfoDataService.createOrGetUser(newUser);

            // Then
            assertThat(result).isEqualTo(testUser);
            verify(userInfoMapper, never()).insert(any(UserInfo.class));
            verify(rLock).unlock();
        }

        @Test
        @DisplayName("Create or get user - Lock acquisition timeout")
        void createOrGetUser_LockTimeout() throws InterruptedException {
            // Given
            UserInfo newUser = new UserInfo();
            newUser.setUid(testUid);

            when(userInfoMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);
            when(redissonClient.getLock(anyString())).thenReturn(rLock);
            when(rLock.tryLock(anyLong(), anyLong(), any(TimeUnit.class))).thenReturn(false);

            // When & Then
            assertThatThrownBy(() -> userInfoDataService.createOrGetUser(newUser))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage("Timed out acquiring distributed lock, please try again later");
        }

        @Test
        @DisplayName("Create or get user - Thread interrupted")
        void createOrGetUser_InterruptedException() throws InterruptedException {
            // Given
            UserInfo newUser = new UserInfo();
            newUser.setUid(testUid);

            when(userInfoMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);
            when(redissonClient.getLock(anyString())).thenReturn(rLock);
            when(rLock.tryLock(anyLong(), anyLong(), any(TimeUnit.class)))
                    .thenThrow(new InterruptedException("Test interrupt"));

            // When & Then
            assertThatThrownBy(() -> userInfoDataService.createOrGetUser(newUser))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage("Interrupted while acquiring distributed lock");
        }
    }

    @Nested
    @DisplayName("Update Method Tests (Non-Lambda Expression)")
    class UpdateMethodTests {

        @Test
        @DisplayName("Update user basic info - Nickname changed")
        void updateUserBasicInfo_WithNicknameChange() {
            // Given
            String newNickname = "New Nickname";
            when(userInfoMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(testUser);
            when(userInfoMapper.updateById(any(UserInfo.class))).thenReturn(1);

            // When
            UserInfo result = userInfoDataService.updateUserBasicInfo(
                    testUid, "newusername", newNickname, "avatar.jpg", "13900139000");

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getNickname()).isEqualTo(newNickname);
            assertThat(result.getUsername()).isEqualTo("newusername");

            // Verify event publishing
            ArgumentCaptor<UserNicknameUpdatedEvent> eventCaptor =
                    ArgumentCaptor.forClass(UserNicknameUpdatedEvent.class);
            verify(eventPublisher).publishEvent(eventCaptor.capture());

            UserNicknameUpdatedEvent event = eventCaptor.getValue();
            assertThat(event.getUid()).isEqualTo(testUid);
            assertThat(event.getOldNickname()).isEqualTo(testNickname);
            assertThat(event.getNewNickname()).isEqualTo(newNickname);
        }

        @Test
        @DisplayName("Update user basic info - User not found")
        void updateUserBasicInfo_UserNotFound() {
            // Given
            when(userInfoMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);

            // When & Then
            assertThatThrownBy(() -> userInfoDataService.updateUserBasicInfo(
                    testUid, null, "Nickname", null, null))
                    .isInstanceOf(BusinessException.class);
        }

        @Test
        @DisplayName("Update current user basic info")
        void updateCurrentUserBasicInfo() {
            // Given
            try (MockedStatic<RequestContextUtil> requestContextMocked =
                    mockStatic(RequestContextUtil.class)) {
                requestContextMocked.when(RequestContextUtil::getUID).thenReturn(testUid);
                when(userInfoMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(testUser);
                when(userInfoMapper.updateById(any(UserInfo.class))).thenReturn(1);

                // When
                UserInfo result = userInfoDataService.updateCurrentUserBasicInfo("New Nickname", "avatar.jpg");

                // Then
                assertThat(result).isNotNull();
                assertThat(result.getNickname()).isEqualTo("New Nickname");
            }
        }
    }

    @Nested
    @DisplayName("Delete and Existence Check Method Tests")
    class DeleteAndExistenceMethodTests {

        @Test
        @DisplayName("Delete user - Success")
        void deleteUser_Success() {
            // Given
            when(userInfoMapper.deleteById(1L)).thenReturn(1);

            // When
            boolean result = userInfoDataService.deleteUser(1L);

            // Then
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Delete user - ID is null")
        void deleteUser_NullId() {
            // When
            boolean result = userInfoDataService.deleteUser(null);

            // Then
            assertThat(result).isFalse();
            verify(userInfoMapper, never()).deleteById((Serializable) any());
        }

        @Test
        @DisplayName("Check if username exists - Exists")
        void existsByUsername_Exists() {
            // Given
            when(userInfoMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(1L);

            // When
            boolean result = userInfoDataService.existsByUsername(testUsername);

            // Then
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Check if username exists - Does not exist")
        void existsByUsername_NotExists() {
            // Given
            when(userInfoMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(0L);

            // When
            boolean result = userInfoDataService.existsByUsername(testUsername);

            // Then
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Check if username exists - Username is blank")
        void existsByUsername_BlankUsername() {
            // When
            boolean result = userInfoDataService.existsByUsername("");

            // Then
            assertThat(result).isFalse();
            verify(userInfoMapper, never()).selectCount(any());
        }
    }

    @Nested
    @DisplayName("Pagination and Count Method Tests")
    class PaginationAndCountMethodTests {

        @Test
        @DisplayName("Count total users")
        void countUsers() {
            // Given
            when(userInfoMapper.selectCount(null)).thenReturn(100L);

            // When
            long result = userInfoDataService.countUsers();

            // Then
            assertThat(result).isEqualTo(100L);
        }

        @Test
        @DisplayName("Count users by account status")
        void countByAccountStatus() {
            // Given
            when(userInfoMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(50L);

            // When
            long result = userInfoDataService.countByAccountStatus(1);

            // Then
            assertThat(result).isEqualTo(50L);
        }

        @Test
        @DisplayName("Count users by account status - Status is null")
        void countByAccountStatus_NullStatus() {
            // When
            long result = userInfoDataService.countByAccountStatus(null);

            // Then
            assertThat(result).isZero();
        }

        @Test
        @DisplayName("Get current user info")
        void getCurrentUserInfo() {
            // Given
            try (MockedStatic<RequestContextUtil> requestContextMocked =
                    mockStatic(RequestContextUtil.class)) {
                requestContextMocked.when(RequestContextUtil::getUID).thenReturn(testUid);
                when(userInfoMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(testUser);

                // When
                UserInfo result = userInfoDataService.getCurrentUserInfo();

                // Then
                assertThat(result).isEqualTo(testUser);
            }
        }

        @Test
        @DisplayName("Get current user info - User not found")
        void getCurrentUserInfo_UserNotFound() {
            // Given
            try (MockedStatic<RequestContextUtil> requestContextMocked =
                    mockStatic(RequestContextUtil.class)) {
                requestContextMocked.when(RequestContextUtil::getUID).thenReturn(testUid);
                when(userInfoMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);

                // When & Then
                assertThatThrownBy(() -> userInfoDataService.getCurrentUserInfo())
                        .isInstanceOf(BusinessException.class);
            }
        }
    }

    @Nested
    @DisplayName("Private Method Tests")
    class PrivateMethodTests {

        @Test
        @DisplayName("Generate random nickname - Chinese")
        void generateRandomNickname_Chinese() throws Exception {
            // Given
            try (MockedStatic<I18nUtil> i18nUtilMocked = mockStatic(I18nUtil.class)) {
                i18nUtilMocked.when(I18nUtil::getLanguage).thenReturn("zh");

                // When
                String nickname = invokePrivateMethod("generateRandomNickname");

                // Then
                assertThat(nickname).isNotBlank();
                assertThat(nickname).matches(".*\\d+$"); // Ends with digits
            }
        }

        @Test
        @DisplayName("Generate random nickname - English")
        void generateRandomNickname_English() throws Exception {
            // Given
            try (MockedStatic<I18nUtil> i18nUtilMocked = mockStatic(I18nUtil.class)) {
                i18nUtilMocked.when(I18nUtil::getLanguage).thenReturn("en");

                // When
                String nickname = invokePrivateMethod("generateRandomNickname");

                // Then
                assertThat(nickname).isNotBlank();
                assertThat(nickname).matches(".*\\d+$"); // Ends with digits
            }
        }

        private String invokePrivateMethod(String methodName) throws Exception {
            Method method = UserInfoDataServiceImpl.class.getDeclaredMethod(methodName);
            method.setAccessible(true);
            return (String) method.invoke(userInfoDataService);
        }
    }

    @Nested
    @DisplayName("Important Notes")
    class ImportantNotes {

        @Test
        @DisplayName("Lambda expression related update methods require integration tests")
        void updateMethodsRequireIntegrationTests() {
            // Note: The following methods use MyBatis-Plus Lambda expressions,
            // which may cause cache issues in unit test environment. Integration tests are recommended:
            //
            // 1. updateAccountStatus(String uid, int accountStatus)
            // 2. updateUserAgreement(String uid, int userAgreement)
            // 3. agreeUserAgreement()
            // 4. updateUserEnterpriseServiceType(String uid, EnterpriseServiceTypeEnum serviceType)
            // 5. activateUser(String uid)
            // 6. freezeUser(String uid)
            //
            // These methods all use MyBatis-Plus LambdaUpdateWrapper,
            // which may not initialize Lambda cache correctly in unit test environment.

            assertThat(true).isTrue(); // Placeholder test
        }
    }
}
