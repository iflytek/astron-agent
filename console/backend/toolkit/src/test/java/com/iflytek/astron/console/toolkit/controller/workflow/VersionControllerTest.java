package com.iflytek.astron.console.toolkit.controller.workflow;

import com.alibaba.fastjson2.JSONObject;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.toolkit.entity.table.workflow.WorkflowVersion;
import com.iflytek.astron.console.toolkit.service.workflow.VersionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link VersionController}.
 *
 * <p>
 * Tech stack: JUnit 5 + Mockito + AssertJ.
 * </p>
 * <p>
 * These tests cover normal, boundary, exception, and concurrency cases for VersionController
 * methods.
 * </p>
 */
@ExtendWith(MockitoExtension.class)
class VersionControllerTest {

    @Mock
    VersionService versionService;

    @InjectMocks
    VersionController controller;

    /**
     * Test the normal case of {@code /list(flowId)} endpoint.
     * <p>
     * Should delegate to {@link VersionService#listPage(Page, String)} and return the same result.
     * </p>
     */
    @Test
    @DisplayName("list(flowId) - normal return & parameters passed correctly")
    void list_shouldDelegateAndReturn() {
        Page<WorkflowVersion> page = new Page<>(1, 10);
        Object expected = new Object();
        when(versionService.listPage(page, "flow-1")).thenReturn(expected);

        Object result = controller.list(page, "flow-1");

        assertThat(result).isSameAs(expected);

        ArgumentCaptor<Page<WorkflowVersion>> pageCaptor = ArgumentCaptor.forClass(Page.class);
        ArgumentCaptor<String> flowIdCaptor = ArgumentCaptor.forClass(String.class);
        verify(versionService, times(1)).listPage(pageCaptor.capture(), flowIdCaptor.capture());
        assertThat(pageCaptor.getValue()).isSameAs(page);
        assertThat(flowIdCaptor.getValue()).isEqualTo("flow-1");
    }

    /**
     * Test the normal case of {@code /list-botId(botId)} endpoint.
     * <p>
     * Should delegate to {@link VersionService#list_botId_Page(Page, String)} correctly.
     * </p>
     */
    @Test
    @DisplayName("list-botId(botId) - normal return")
    void listBotId_shouldDelegateAndReturn() {
        Page<WorkflowVersion> page = new Page<>(2, 5);
        Object expected = new Object();
        when(versionService.list_botId_Page(page, "bot-1")).thenReturn(expected);

        Object result = controller.list_botId(page, "bot-1");

        assertThat(result).isSameAs(expected);
        verify(versionService).list_botId_Page(page, "bot-1");
    }

    /**
     * Test {@code /create} endpoint.
     * <p>
     * Should delegate the DTO to {@link VersionService#create(WorkflowVersion)} and return the
     * ApiResult.
     * </p>
     */
    @Test
    @DisplayName("create - normal return ApiResult<JSONObject>")
    void create_shouldReturnApiResult() {
        WorkflowVersion dto = new WorkflowVersion();
        @SuppressWarnings("unchecked")
        ApiResult<JSONObject> expected = mock(ApiResult.class);
        when(versionService.create(dto)).thenReturn(expected);

        ApiResult<JSONObject> result = controller.create(dto);

        assertThat(result).isSameAs(expected);
        verify(versionService).create(dto);
    }

    /**
     * Test {@code /restore} endpoint.
     * <p>
     * Should delegate to {@link VersionService#restore(WorkflowVersion)} and return the result.
     * </p>
     */
    @Test
    @DisplayName("restore - normal return")
    void restore_shouldDelegateAndReturn() {
        WorkflowVersion dto = new WorkflowVersion();

        @SuppressWarnings("unchecked")
        ApiResult<JSONObject> expected = (ApiResult<JSONObject>) mock(ApiResult.class);
        when(versionService.restore(dto)).thenReturn(expected);
        ApiResult<JSONObject> result = controller.restore(dto);

        assertThat(result).isSameAs(expected);
        verify(versionService).restore(dto);
    }

    /**
     * Test {@code /update-channel-result} endpoint.
     * <p>
     * Should delegate to {@link VersionService#update_channel_result(WorkflowVersion)}.
     * </p>
     */
    @Test
    @DisplayName("update-channel-result - normal return")
    void updateChannelResult_shouldDelegateAndReturn() {
        WorkflowVersion dto = new WorkflowVersion();

        @SuppressWarnings("unchecked")
        ApiResult<JSONObject> expected = (ApiResult<JSONObject>) mock(ApiResult.class);
        when(versionService.update_channel_result(dto)).thenReturn(expected);

        ApiResult<JSONObject> result = controller.update_channel_result(dto);

        assertThat(result).isSameAs(expected);
        verify(versionService).update_channel_result(dto);
    }

    /**
     * Test {@code /get-version-name} endpoint.
     * <p>
     * Should delegate to {@link VersionService#getVersionName(WorkflowVersion)}.
     * </p>
     */
    @Test
    @DisplayName("get-version-name - normal return")
    void getVersionName_shouldDelegateAndReturn() {
        WorkflowVersion dto = new WorkflowVersion();
        @SuppressWarnings("unchecked")
        ApiResult<JSONObject> expected = (ApiResult<JSONObject>) mock(ApiResult.class);
        when(versionService.getVersionName(dto)).thenReturn(expected);

        Object result = controller.getVersionName(dto);

        verify(versionService).getVersionName(dto);
    }

    /**
     * Test {@code /get-max-version(botId)} endpoint.
     * <p>
     * Should delegate to {@link VersionService#getMaxVersion(String)}.
     * </p>
     */
    @Test
    @DisplayName("get-max-version(botId) - normal return")
    void getMaxVersion_shouldDelegateAndReturn() {
        @SuppressWarnings("unchecked")
        ApiResult<JSONObject> expected = (ApiResult<JSONObject>) mock(ApiResult.class);
        when(versionService.getMaxVersion("bot-9")).thenReturn(expected);

        Object result = controller.getMaxVersion("bot-9");
    }

    /**
     * Test {@code /get-version-sys-data}.
     * <p>
     * Should delegate to {@link VersionService#getVersionSysData(WorkflowVersion)} and return the
     * result.
     * </p>
     */
    @Test
    @DisplayName("get-version-sys-data - normal return")
    void getVersionSysData_shouldDelegateAndReturn() {
        WorkflowVersion dto = new WorkflowVersion();
        @SuppressWarnings("unchecked")
        ApiResult<JSONObject> expected = (ApiResult<JSONObject>) mock(ApiResult.class);
        when(versionService.getVersionSysData(dto)).thenReturn(expected);

        Object versionSysData = controller.getVersionSysData(dto);

        assertThat(versionSysData).isSameAs(expected);
        verify(versionService).getVersionSysData(dto);
    }

    /**
     * Test {@code /have-version-sys-data}.
     * <p>
     * Should delegate to {@link VersionService#haveVersionSysData(WorkflowVersion)}.
     * </p>
     */
    @Test
    @DisplayName("have-version-sys-data - normal return")
    void haveVersionSysData_shouldDelegateAndReturn() {
        WorkflowVersion dto = new WorkflowVersion();
        @SuppressWarnings("unchecked")
        ApiResult<JSONObject> expected = (ApiResult<JSONObject>) mock(ApiResult.class);
        when(versionService.haveVersionSysData(dto)).thenReturn(expected);

        Object result = controller.haveVersionSysData(dto);

        verify(versionService).haveVersionSysData(dto);
    }

    /**
     * Test {@code /publish-result(flowId, name)}.
     * <p>
     * Should delegate parameters to {@link VersionService#publishResult(String, String)} and return the
     * result.
     * </p>
     */
    @Test
    @DisplayName("publish-result(flowId,name) - normal return")
    void publishResult_shouldDelegateAndReturn() {
        Object expected = new JSONObject();
        when(versionService.publishResult("f-1", "v1")).thenReturn(expected);

        Object result = controller.publishResult("f-1", "v1");

        assertThat(result).isSameAs(expected);
        verify(versionService).publishResult("f-1", "v1");
    }

    // ================= Boundary / Exception =================

    /**
     * Test when flowId is blank.
     * <p>
     * Should throw {@link IllegalArgumentException} as thrown by the service.
     * </p>
     */
    @Test
    @DisplayName("list(flowId) - throw IllegalArgumentException when flowId is blank (from service)")
    void list_shouldThrow_whenFlowIdBlank() {
        Page<WorkflowVersion> page = new Page<>(1, 10);
        when(versionService.listPage(page, "")).thenThrow(new IllegalArgumentException("flowId blank"));

        assertThatThrownBy(() -> controller.list(page, ""))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("flowId");
        verify(versionService).listPage(page, "");
    }

    /**
     * Test create method when required fields are missing.
     * <p>
     * Should throw {@link IllegalArgumentException} from the service layer.
     * </p>
     */
    @Test
    @DisplayName("create - throw IllegalArgumentException when required fields missing (from service)")
    void create_shouldThrow_whenMissingFields() {
        WorkflowVersion dto = new WorkflowVersion();
        when(versionService.create(dto)).thenThrow(new IllegalArgumentException("required fields missing"));

        assertThatThrownBy(() -> controller.create(dto))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("required");
        verify(versionService).create(dto);
    }

    /**
     * Test publishResult when flowId or name is invalid.
     * <p>Should throw {@link IllegalArgumentException} from service.</p>
     */
    @Test
    @DisplayName("publish-result - throw IllegalArgumentException when flowId or name invalid (from service)")
    void publishResult_shouldThrow_whenParamsInvalid() {
        when(versionService.publishResult(" ", " ")).thenThrow(new IllegalArgumentException("invalid"));

        assertThatThrownBy(() -> controller.publishResult(" ", " "))
                .isInstanceOf(IllegalArgumentException.class);
        verify(versionService).publishResult(" ", " ");
    }

    // ================= Concurrency =================

    /**
     * Concurrency test for {@code getMaxVersion}.
     * <p>
     * Ensures thread safety and correct invocation count when called concurrently.
     * </p>
     *
     * @throws Exception if thread synchronization fails
     */
    @Test
    @Timeout(5)
    @DisplayName("get-max-version concurrent calls - thread-safe & correct invocation count")
    void concurrent_getMaxVersion_isThreadSafe() throws Exception {
        int threads = 16;
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        AtomicInteger callCount = new AtomicInteger(0);

        // Pre-create ApiResult instances for each thread
        List<ApiResult<JSONObject>> expectedList = new ArrayList<>(threads);
        for (int i = 0; i < threads; i++) {
            @SuppressWarnings("unchecked")
            ApiResult<JSONObject> ar = (ApiResult<JSONObject>) mock(ApiResult.class);
            expectedList.add(ar);
        }

        when(versionService.getMaxVersion(anyString())).thenAnswer(invocation -> {
            callCount.incrementAndGet();
            String botId = invocation.getArgument(0, String.class);
            int idx = Integer.parseInt(botId.substring("bot-".length()));
            return expectedList.get(idx);
        });

        List<Future<Object>> futures = new ArrayList<>();
        for (int i = 0; i < threads; i++) {
            final int idx = i;
            futures.add(pool.submit(() -> {
                start.await();
                try {
                    return controller.getMaxVersion("bot-" + idx);
                } finally {
                    done.countDown();
                }
            }));
        }

        start.countDown();
        done.await(3, TimeUnit.SECONDS);

        for (int i = 0; i < threads; i++) {
            assertThat(futures.get(i).get()).isSameAs(expectedList.get(i));
        }
        verify(versionService, times(threads)).getMaxVersion(anyString());
        assertThat(callCount.get()).isEqualTo(threads);

        pool.shutdownNow();
    }

    /**
     * Small regression repetition test.
     * <p>
     * Repeatedly executes the restore method to ensure stability (beneficial for PIT mutation tests).
     * </p>
     */
    @Nested
    class SmallRegression {
        /**
         * Repeated execution stability test for {@code restore}.
         */
        @RepeatedTest(2)
        @DisplayName("restore - repeat execution stability")
        void restore_repeatable() {
            WorkflowVersion dto = new WorkflowVersion();

            @SuppressWarnings("unchecked")
            ApiResult<JSONObject> expected = (ApiResult<JSONObject>) mock(ApiResult.class);
            when(versionService.restore(dto)).thenReturn(expected);

            ApiResult<JSONObject> r = controller.restore(dto);
            assertThat(r).isSameAs(expected);
            verify(versionService, atLeastOnce()).restore(dto);
        }
    }
}
