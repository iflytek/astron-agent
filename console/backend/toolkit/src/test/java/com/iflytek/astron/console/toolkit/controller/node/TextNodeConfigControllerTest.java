package com.iflytek.astron.console.toolkit.controller.node;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.iflytek.astron.console.toolkit.entity.table.node.TextNodeConfig;
import com.iflytek.astron.console.toolkit.handler.UserInfoManagerHandler;
import com.iflytek.astron.console.toolkit.mapper.node.TextNodeConfigMapper;
import com.iflytek.astron.console.toolkit.service.node.TextNodeConfigService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link TextNodeConfigController}.
 *
 * <p>
 * Tech stack: JUnit5 + Mockito + AssertJ
 * </p>
 * <ul>
 * <li>Tests cover normal, exceptional, boundary, and concurrent scenarios for save / list / delete
 * / update</li>
 * <li>Static method {@code UserInfoManagerHandler.getUserId()} is mocked using Mockito's
 * {@code mockStatic}</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
class TextNodeConfigControllerTest {

    @Mock
    private TextNodeConfigService textNodeConfigService;

    @Mock
    private TextNodeConfigMapper textNodeConfigMapper;

    @InjectMocks
    private TextNodeConfigController controller;

    /**
     * Test the normal flow of {@code /save}.
     * <p>
     * Should set UID via {@link UserInfoManagerHandler#getUserId()} and delegate the object to
     * {@link TextNodeConfigService#saveInfo(TextNodeConfig)}.
     * </p>
     *
     * @throws Exception no checked exception expected
     */
    @Test
    @DisplayName("save - normal: should set uid and delegate to service.saveInfo")
    void save_shouldSetUidAndDelegate() {
        TextNodeConfig input = new TextNodeConfig();
        HttpServletRequest req = mock(HttpServletRequest.class);

        try (MockedStatic<UserInfoManagerHandler> mocked = mockStatic(UserInfoManagerHandler.class)) {
            mocked.when(UserInfoManagerHandler::getUserId).thenReturn("u-100");

            Object expected = new Object();
            ArgumentCaptor<TextNodeConfig> cfgCap = ArgumentCaptor.forClass(TextNodeConfig.class);
            when(textNodeConfigService.saveInfo(any(TextNodeConfig.class))).thenReturn(expected);

            Object actual = controller.save(input, req);

            assertThat(actual).isSameAs(expected);
            verify(textNodeConfigService).saveInfo(cfgCap.capture());
            TextNodeConfig passed = cfgCap.getValue();
            assertThat(passed.getUid()).isEqualTo("u-100"); // uid has been written
        }
    }

    /**
     * Test that an exception thrown by {@link TextNodeConfigService#saveInfo(TextNodeConfig)} should
     * propagate outward.
     */
    @Test
    @DisplayName("save - exception: service.saveInfo throwing error should propagate outward")
    void save_shouldPropagateException() {
        TextNodeConfig input = new TextNodeConfig();
        HttpServletRequest req = mock(HttpServletRequest.class);

        try (MockedStatic<UserInfoManagerHandler> mocked = mockStatic(UserInfoManagerHandler.class)) {
            mocked.when(UserInfoManagerHandler::getUserId).thenReturn("u-101");

            when(textNodeConfigService.saveInfo(any(TextNodeConfig.class)))
                    .thenThrow(new IllegalArgumentException("bad args"));

            assertThatThrownBy(() -> controller.save(input, req))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("bad");
        }
    }

    /**
     * Test the normal flow of {@code /list}.
     * <p>
     * Should build a query wrapper filtering by [uid, -1], sorted by {@code createTime DESC}, and
     * delegate to service.list.
     * </p>
     */
    @Test
    @DisplayName("list - normal: should filter by [uid, -1], order by createTime desc, and delegate to service.list")
    void list_shouldBuildWrapperAndDelegate() {
        try (MockedStatic<UserInfoManagerHandler> mocked = mockStatic(UserInfoManagerHandler.class)) {
            mocked.when(UserInfoManagerHandler::getUserId).thenReturn("u-200");

            List<TextNodeConfig> expected = new ArrayList<>();
            when(textNodeConfigService.list(any(LambdaQueryWrapper.class))).thenReturn(expected);

            Object actual = controller.list();

            assertThat(actual).isSameAs(expected);
            ArgumentCaptor<LambdaQueryWrapper<TextNodeConfig>> wrapperCap =
                    ArgumentCaptor.forClass(LambdaQueryWrapper.class);
            verify(textNodeConfigService).list(wrapperCap.capture());

            // Sanity check for wrapper construction correctness
            assertThat(wrapperCap.getValue()).isNotNull();
        }
    }

    /**
     * Boundary test: if {@code getUserId()} returns null, should still delegate execution without
     * throwing errors.
     */
    @Test
    @DisplayName("list - boundary: should delegate correctly even if getUserId() returns null")
    void list_shouldWorkWhenUidNull() {
        try (MockedStatic<UserInfoManagerHandler> mocked = mockStatic(UserInfoManagerHandler.class)) {
            mocked.when(UserInfoManagerHandler::getUserId).thenReturn(null);

            when(textNodeConfigService.list(any(LambdaQueryWrapper.class)))
                    .thenReturn(new ArrayList<>());

            Object actual = controller.list();
            assertThat(actual).isInstanceOf(List.class);
            verify(textNodeConfigService, times(1)).list(any(LambdaQueryWrapper.class));
        }
    }

    /**
     * Test the normal flow of {@code /delete}.
     * <p>Should delete via {@link BaseMapper#(LambdaQueryWrapper)} and return the number of affected rows.</p>
     */
    @Test
    @DisplayName("delete - normal: should call BaseMapper.delete and return affected row count")
    void delete_shouldCallBaseMapperDelete() {
        when(textNodeConfigService.getBaseMapper()).thenReturn(textNodeConfigMapper);
        when(textNodeConfigMapper.delete(any(LambdaQueryWrapper.class))).thenReturn(1);

        Object result = controller.delete(123L);

        assertThat(result).isEqualTo(1);
        verify(textNodeConfigService).getBaseMapper();
        verify(textNodeConfigMapper).delete(any(LambdaQueryWrapper.class));
    }

    /**
     * Boundary test: when {@code id == null}, should still construct wrapper and call delete without exception.
     */
    @Test
    @DisplayName("delete - boundary: should still build wrapper and call delete when id is null")
    void delete_shouldAllowNullId() {
        when(textNodeConfigService.getBaseMapper()).thenReturn(textNodeConfigMapper);
        when(textNodeConfigMapper.delete(any(LambdaQueryWrapper.class))).thenReturn(0);

        Object result = controller.delete(null);

        assertThat(result).isEqualTo(0);
        verify(textNodeConfigMapper).delete(any(LambdaQueryWrapper.class));
    }

    /**
     * Test the normal flow of {@code /update}.
     * <p>
     * Should set updateTime and delegate to {@link TextNodeConfigService#(TextNodeConfig)}.
     * </p>
     */
    @Test
    @DisplayName("update - normal: should set updateTime and delegate to service.updateById")
    void update_shouldSetUpdateTimeAndDelegate() {
        TextNodeConfig cfg = new TextNodeConfig();
        assertThat(cfg.getUpdateTime()).isNull();

        when(textNodeConfigService.updateById(any(TextNodeConfig.class))).thenReturn(true);

        Object result = controller.update(cfg);

        assertThat(result).isEqualTo(true);
        ArgumentCaptor<TextNodeConfig> cap = ArgumentCaptor.forClass(TextNodeConfig.class);
        verify(textNodeConfigService).updateById(cap.capture());
        Date setTime = cap.getValue().getUpdateTime();
        assertThat(setTime).isNotNull();
        assertThat(cap.getValue()).isSameAs(cfg);
        assertThat(cfg.getUpdateTime()).isNotNull();
    }

    /**
     * Tests that even if {@code updateById()} throws an exception, {@code updateTime} should still be
     * set before throwing.
     */
    @Test
    @DisplayName("update - exception: should still set updateTime before propagating exception")
    void update_shouldPropagateExceptionButStillSetTime() {
        TextNodeConfig cfg = new TextNodeConfig();
        when(textNodeConfigService.updateById(any(TextNodeConfig.class)))
                .thenThrow(new RuntimeException("DB down"));

        assertThatThrownBy(() -> controller.update(cfg))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("DB");

        assertThat(cfg.getUpdateTime()).isNotNull();
    }

    // ==================== Concurrency Tests ====================

    /**
     * Concurrency test for {@code /update}.
     * <p>
     * Multiple threads updating different objects should all have updateTime set and delegate calls
     * counted correctly.
     * </p>
     *
     * @throws Exception if thread execution fails or times out
     */
    @Test
    @Timeout(5)
    @DisplayName("update - concurrency: multiple threads updating different objects should set updateTime and call service correctly")
    void concurrent_update_isThreadSafe() throws Exception {
        int threads = 16;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        AtomicInteger calls = new AtomicInteger(0);

        when(textNodeConfigService.updateById(any(TextNodeConfig.class))).thenAnswer(inv -> {
            calls.incrementAndGet();
            return true;
        });

        List<TextNodeConfig> cfgs = new ArrayList<>(threads);
        for (int i = 0; i < threads; i++)
            cfgs.add(new TextNodeConfig());

        List<Future<Object>> futures = new ArrayList<>();
        for (int i = 0; i < threads; i++) {
            final int idx = i;
            futures.add(pool.submit(() -> {
                start.await();
                try {
                    return controller.update(cfgs.get(idx));
                } finally {
                    done.countDown();
                }
            }));
        }

        start.countDown();
        done.await(3, TimeUnit.SECONDS);

        for (int i = 0; i < threads; i++) {
            assertThat(futures.get(i).get()).isEqualTo(true);
            assertThat(cfgs.get(i).getUpdateTime()).as("updateTime set for #" + i).isNotNull();
        }
        verify(textNodeConfigService, times(threads)).updateById(any(TextNodeConfig.class));
        assertThat(calls.get()).isEqualTo(threads);
        pool.shutdownNow();
    }

    /**
     * Concurrency test for {@code /list}.
     * <p>
     * Multiple threads calling list() should all delegate to service.list().
     * </p>
     *
     * @throws Exception if threads fail or timeout
     */
    @Test
    @Timeout(5)
    @DisplayName("list - concurrency: multiple threads should delegate to service.list correctly")
    void concurrent_list_isDelegated() throws Exception {
        int threads = 12;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);

        when(textNodeConfigService.list(any(LambdaQueryWrapper.class)))
                .thenReturn(new ArrayList<>());

        List<Future<Object>> futures = new ArrayList<>();
        for (int i = 0; i < threads; i++) {
            futures.add(pool.submit(() -> {
                start.await();
                try {
                    // Important: establish static mock scope inside each thread
                    try (MockedStatic<UserInfoManagerHandler> mocked =
                            mockStatic(UserInfoManagerHandler.class)) {
                        mocked.when(UserInfoManagerHandler::getUserId).thenReturn("u-x");
                        return controller.list();
                    }
                } finally {
                    done.countDown();
                }
            }));
        }

        start.countDown();
        done.await(3, TimeUnit.SECONDS);

        for (int i = 0; i < threads; i++) {
            assertThat(futures.get(i).get()).isInstanceOf(List.class);
        }
        verify(textNodeConfigService, times(threads)).list(any(LambdaQueryWrapper.class));

        pool.shutdownNow();
    }
}
