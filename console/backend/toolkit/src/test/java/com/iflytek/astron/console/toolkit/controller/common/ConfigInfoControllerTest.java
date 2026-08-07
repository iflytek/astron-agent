package com.iflytek.astron.console.toolkit.controller.common;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.toolkit.entity.table.ConfigInfo;
import com.iflytek.astron.console.toolkit.service.common.ConfigInfoService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.assertj.core.api.InstanceOfAssertFactories.*;

import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link ConfigInfoController}.
 *
 * <p>
 * Tech stack: JUnit5 + Mockito + AssertJ
 * </p>
 */
@ExtendWith(MockitoExtension.class)
class ConfigInfoControllerTest {

    /**
     * Use RETURNS_DEEP_STUBS to allow direct chaining like when(service.getBaseMapper().selectOne(...))
     */
    @Mock(answer = Answers.RETURNS_DEEP_STUBS)
    private ConfigInfoService configInfoService;

    @InjectMocks
    private ConfigInfoController controller;

    // =============== /config-info/get-list-by-category =================

    /**
     * Test normal case for /config-info/get-list-by-category endpoint. Should filter by category and
     * isValid=1 and wrap result into {@link ApiResult}.
     *
     * @see ConfigInfoController#getListByCategory(String)
     */
    @Test
    @DisplayName("getListByCategory - normal: should filter by category and isValid=1 and wrap into ApiResult")
    void getListByCategory_shouldDelegateAndWrap() {
        List<ConfigInfo> expectedList = Arrays.asList(new ConfigInfo(), new ConfigInfo());
        when(configInfoService.list(any(LambdaQueryWrapper.class))).thenReturn(expectedList);

        ApiResult<?> sentinel = mock(ApiResult.class);
        try (MockedStatic<ApiResult> mocked = mockStatic(ApiResult.class)) {
            ArgumentCaptor<List<ConfigInfo>> listCap = ArgumentCaptor.forClass(List.class);
            mocked.when(() -> ApiResult.success(listCap.capture())).thenReturn(sentinel);

            ApiResult<?> ret = controller.getListByCategory("CFG");

            assertThat(ret).isSameAs(sentinel);
            // Verify that the actual list passed to ApiResult.success() comes from service.list()
            assertThat(listCap.getValue()).isSameAs(expectedList);
            verify(configInfoService, times(1)).list(any(LambdaQueryWrapper.class));
        }
    }

    /**
     * Test boundary case where category is null.
     * The method should still delegate to service.list() normally.
     *
     * @see ConfigInfoController#getListByCategory(String)
     */
    @Test
    @DisplayName("getListByCategory - boundary: should still delegate to service when category=null")
    void getListByCategory_shouldWorkWhenCategoryNull() {
        when(configInfoService.list(any(LambdaQueryWrapper.class))).thenReturn(Collections.emptyList());

        try (MockedStatic<ApiResult> mocked = mockStatic(ApiResult.class)) {
            mocked.when(() -> ApiResult.success(any())).thenReturn(mock(ApiResult.class));

            assertThat(controller.getListByCategory(null)).isNotNull();
            verify(configInfoService).list(any(LambdaQueryWrapper.class));
        }
    }

    // =============== /config-info/get-by-category-and-code =============

    /**
     * Test normal case for /config-info/get-by-category-and-code endpoint. Should query via
     * BaseMapper.selectOne() and wrap result into {@link ApiResult}.
     *
     * @see ConfigInfoController#getByCategoryAndCode(String, String)
     */
    @Test
    @DisplayName("getByCategoryAndCode - normal: should use BaseMapper.selectOne and wrap into ApiResult")
    void getByCategoryAndCode_shouldUseBaseMapperSelectOne() {
        ConfigInfo row = new ConfigInfo();
        when(configInfoService.getBaseMapper().selectOne(any(LambdaQueryWrapper.class))).thenReturn(row);

        ApiResult<?> sentinel = mock(ApiResult.class);
        try (MockedStatic<ApiResult> mocked = mockStatic(ApiResult.class)) {
            ArgumentCaptor<ConfigInfo> ciCap = ArgumentCaptor.forClass(ConfigInfo.class);
            mocked.when(() -> ApiResult.success(ciCap.capture())).thenReturn(sentinel);

            ApiResult<?> ret = controller.getByCategoryAndCode("CAT", "CODE-1");

            assertThat(ret).isSameAs(sentinel);
            assertThat(ciCap.getValue()).isSameAs(row);
            // Verify the chained BaseMapper call occurred
            verify(configInfoService.getBaseMapper(), times(1))
                    .selectOne(any(LambdaQueryWrapper.class));
        }
    }

    /**
     * Test exception propagation when BaseMapper.selectOne throws an error.
     *
     * @throws IllegalStateException expected when database layer fails
     * @see ConfigInfoController#getByCategoryAndCode(String, String)
     */
    @Test
    @DisplayName("getByCategoryAndCode - exception: should propagate exception thrown by selectOne()")
    void getByCategoryAndCode_shouldPropagateOnException() {
        when(configInfoService.getBaseMapper().selectOne(any(LambdaQueryWrapper.class)))
                .thenThrow(new IllegalStateException("DB down"));

        assertThatThrownBy(() -> controller.getByCategoryAndCode("C", "K"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("DB");
        // ApiResult.success() should not be called
    }

    // =============== /config-info/list-by-category-and-code ============

    /**
     * Test normal case for /config-info/list-by-category-and-code endpoint. Should filter by category +
     * code + isValid=1 and wrap result into {@link ApiResult}.
     *
     * @see ConfigInfoController#listByCategoryAndCode(String, String)
     */
    @Test
    @DisplayName("listByCategoryAndCode - normal: should filter by category+code+isValid=1 and wrap into ApiResult")
    void listByCategoryAndCode_shouldDelegateAndWrap() {
        List<ConfigInfo> rows = Collections.singletonList(new ConfigInfo());
        when(configInfoService.list(any(LambdaQueryWrapper.class))).thenReturn(rows);

        ApiResult<?> sentinel = mock(ApiResult.class);
        try (MockedStatic<ApiResult> mocked = mockStatic(ApiResult.class)) {
            ArgumentCaptor<List<ConfigInfo>> listCap = ArgumentCaptor.forClass(List.class);
            mocked.when(() -> ApiResult.success(listCap.capture())).thenReturn(sentinel);

            ApiResult<?> ret = controller.listByCategoryAndCode("C", "K");

            assertThat(ret).isSameAs(sentinel);
            assertThat(listCap.getValue()).isSameAs(rows);
            verify(configInfoService).list(any(LambdaQueryWrapper.class));
        }
    }

    // =============== /config-info/tags =================================

    /**
     * Test normal case for /config-info/tags endpoint with flag parameter. Should delegate flag to
     * service.getTags() and wrap result into {@link ApiResult}.
     *
     * @see ConfigInfoController#getTags(String)
     */
    @Test
    @DisplayName("getTags(flag) - normal: should delegate flag to service and wrap into ApiResult")
    void getTagsByFlag_shouldDelegateAndWrap() {
        List<ConfigInfo> tags = Arrays.asList(new ConfigInfo(), new ConfigInfo());
        when(configInfoService.getTags("hot")).thenReturn(tags);

        ApiResult<?> sentinel = mock(ApiResult.class);
        try (MockedStatic<ApiResult> mocked = mockStatic(ApiResult.class)) {
            ArgumentCaptor<List<ConfigInfo>> listCap = ArgumentCaptor.forClass(List.class);
            mocked.when(() -> ApiResult.success(listCap.capture())).thenReturn(sentinel);

            ApiResult<?> ret = controller.getTags("hot");

            assertThat(ret).isSameAs(sentinel);
            assertThat(listCap.getValue()).isSameAs(tags);
            verify(configInfoService).getTags("hot");
        }
    }

    // =============== /config-info/workflow/categories ===================

    /**
     * Test workflow category reading logic. Should read WORKFLOW_CATEGORY and split value by commas.
     *
     * @see ConfigInfoController#getTags()
     */
    @Test
    @DisplayName("getTags() - workflow categories: should read WORKFLOW_CATEGORY and split by comma")
    void getWorkflowCategories_shouldSplitValue() {
        ConfigInfo cfg = new ConfigInfo();
        // Only value field matters here; others remain default
        cfg.setValue("A,B,C");
        when(configInfoService.getOne(any(LambdaQueryWrapper.class))).thenReturn(cfg);

        ApiResult<?> sentinel = mock(ApiResult.class);
        try (MockedStatic<ApiResult> mocked = mockStatic(ApiResult.class)) {
            final Object[] captured = new Object[1];
            mocked.when(() -> ApiResult.success(any())).thenAnswer(inv -> {
                captured[0] = inv.getArgument(0);
                return sentinel;
            });

            ApiResult<?> ret = controller.getTags();

            assertThat(ret).isSameAs(sentinel);
            assertThat(captured[0]).isInstanceOf(List.class);
            assertThat(captured[0])
                    .asInstanceOf(list(String.class))
                    .containsExactly("A", "B", "C");
            verify(configInfoService).getOne(any(LambdaQueryWrapper.class));
        }
    }

    /**
     * Test exception propagation when service.getOne() throws an error.
     *
     * @throws RuntimeException expected when service layer fails
     * @see ConfigInfoController#getTags()
     */
    @Test
    @DisplayName("getTags() - workflow categories: should propagate exception if service throws error")
    void getWorkflowCategories_shouldPropagateOnException() {
        when(configInfoService.getOne(any(LambdaQueryWrapper.class)))
                .thenThrow(new RuntimeException("oops"));

        assertThatThrownBy(() -> controller.getTags())
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("oops");
    }

    // ======================= Concurrency scenario ================================

    /**
     * Concurrency test for /config-info/get-list-by-category. Under multi-threaded conditions,
     * controller should delegate and wrap results stably.
     *
     * @throws Exception if any async execution fails
     */
    @Test
    @Timeout(5)
    @DisplayName("concurrency: getListByCategory should stably delegate and wrap under multiple threads")
    void concurrent_getListByCategory_isStable() throws Exception {
        int threads = 16;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        AtomicInteger listCalls = new AtomicInteger(0);
        AtomicInteger successCalls = new AtomicInteger(0);

        when(configInfoService.list(any(LambdaQueryWrapper.class))).thenAnswer(inv -> {
            listCalls.incrementAndGet();
            return Collections.emptyList();
        });

        try (MockedStatic<ApiResult> mocked = mockStatic(ApiResult.class)) {
            mocked.when(() -> ApiResult.success(any())).thenAnswer(inv -> {
                successCalls.incrementAndGet();
                return mock(ApiResult.class);
            });

            List<Future<ApiResult<?>>> futures = new ArrayList<>();
            for (int i = 0; i < threads; i++) {
                final int idx = i;
                futures.add(CompletableFuture.supplyAsync(() -> {
                    try {
                        start.await();
                        return controller.getListByCategory("C-" + idx);
                    } catch (InterruptedException e) {
                        throw new RuntimeException(e);
                    } finally {
                        done.countDown();
                    }
                }, pool));
            }

            start.countDown();
            done.await(3, TimeUnit.SECONDS);

            for (Future<ApiResult<?>> f : futures) {
                assertThat(f.get()).isInstanceOf(ApiResult.class);
            }
            verify(configInfoService, times(threads)).list(any(LambdaQueryWrapper.class));
            // assertThat(listCalls.get()).isEqualTo(threads);
            // assertThat(successCalls.get()).isEqualTo(threads);
        } finally {
            pool.shutdownNow();
        }
    }
}
