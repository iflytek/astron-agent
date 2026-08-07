package com.iflytek.astron.console.toolkit.controller.common;

import com.iflytek.astron.console.toolkit.service.model.LLMService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link LLMController}.
 * <p>
 * Covers delegation logic, exception propagation, null-safety, and concurrency scenarios for all
 * endpoints exposed by LLMController.
 * </p>
 * <p>
 * Tech stack: JUnit 5 + Mockito + AssertJ.
 * </p>
 */
@ExtendWith(MockitoExtension.class)
class LLMControllerTest {

    @Mock
    LLMService llmService;

    @InjectMocks
    LLMController controller;

    // ========== /llm/auth-list ==========

    /**
     * Test normal case for {@code /llm/auth-list}.
     * <p>
     * Should delegate {@code request}, {@code appId}, {@code scene}, and {@code nodeType} to the
     * service layer and return the same result.
     * </p>
     *
     * @throws Exception if an unexpected error occurs during test execution
     */
    @Test
    @DisplayName("getLlmAuthList - normal: should delegate request/appId/scene/nodeType to service and return result")
    void getLlmAuthList_shouldDelegateAndReturn() throws Exception {
        HttpServletRequest req = mock(HttpServletRequest.class);
        Object expected = new Object();
        when(llmService.getLlmAuthList(req, "app-1", "sceneA", "NODE_X")).thenReturn(expected);

        Object ret = controller.getLlmAuthList(req, "app-1", "sceneA", "NODE_X");

        assertThat(ret).isSameAs(expected);

        ArgumentCaptor<HttpServletRequest> reqCap = ArgumentCaptor.forClass(HttpServletRequest.class);
        ArgumentCaptor<String> appCap = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> sceneCap = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> nodeCap = ArgumentCaptor.forClass(String.class);

        verify(llmService, times(1)).getLlmAuthList(reqCap.capture(), appCap.capture(), sceneCap.capture(), nodeCap.capture());
        assertThat(reqCap.getValue()).isSameAs(req);
        assertThat(appCap.getValue()).isEqualTo("app-1");
        assertThat(sceneCap.getValue()).isEqualTo("sceneA");
        assertThat(nodeCap.getValue()).isEqualTo("NODE_X");
    }

    /**
     * Test boundary case where optional parameters {@code scene} and {@code nodeType} are null.
     * <p>
     * Should still delegate correctly to the service layer without throwing errors.
     * </p>
     *
     * @throws Exception if any unexpected exception occurs
     */
    @Test
    @DisplayName("getLlmAuthList - boundary: should allow scene/nodeType to be null")
    void getLlmAuthList_shouldAllowNullOptionalParams() throws Exception {
        HttpServletRequest req = mock(HttpServletRequest.class);
        Object expected = new Object();
        when(llmService.getLlmAuthList(req, "app-2", null, null)).thenReturn(expected);

        Object ret = controller.getLlmAuthList(req, "app-2", null, null);

        assertThat(ret).isSameAs(expected);
        verify(llmService).getLlmAuthList(req, "app-2", null, null);
    }

    /**
     * Test when the service wraps an {@link InterruptedException} inside a {@link RuntimeException}.
     * <p>
     * The controller should propagate the wrapped exception as-is.
     * </p>
     *
     * @throws Exception if unexpected error occurs
     */
    @Test
    @DisplayName("getLlmAuthList - simulated interruption: wrapped InterruptedException should propagate as RuntimeException")
    void getLlmAuthList_shouldPropagateWrappedInterrupted() throws Exception {
        HttpServletRequest req = mock(HttpServletRequest.class);

        // Can't directly throw InterruptedException; wrap it inside RuntimeException
        doAnswer(inv -> {
            throw new RuntimeException(new InterruptedException("interrupted"));
        }).when(llmService).getLlmAuthList(eq(req), eq("app-3"), eq("s"), eq("n"));

        assertThatThrownBy(() -> controller.getLlmAuthList(req, "app-3", "s", "n"))
                .isInstanceOf(RuntimeException.class)
                .hasRootCauseInstanceOf(InterruptedException.class)
                .hasRootCauseMessage("interrupted");

        verify(llmService).getLlmAuthList(req, "app-3", "s", "n");
    }

    /**
     * Test runtime exception propagation.
     * <p>
     * Any unchecked exception thrown by the service should bubble up directly.
     * </p>
     *
     * @throws Exception none expected, the test asserts the thrown exception
     */
    @Test
    @DisplayName("getLlmAuthList - runtime exception: should propagate as-is")
    void getLlmAuthList_shouldPropagateRuntimeException() throws Exception {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(llmService.getLlmAuthList(any(), anyString(), any(), any()))
                .thenThrow(new IllegalStateException("runtime boom"));

        assertThatThrownBy(() -> controller.getLlmAuthList(req, "app-4", "s", "n"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("boom");
    }

    // ========== /llm/inter1 ==========

    /**
     * Test normal case for {@code /llm/inter1}.
     * <p>
     * Should delegate {@code request}, {@code id}, and {@code llmSource} to service and return its
     * result.
     * </p>
     */
    @Test
    @DisplayName("inter1 - normal: should delegate request/id/llmSource to service and return result")
    void inter1_shouldDelegateAndReturn() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        Object expected = new Object();
        when(llmService.getModelServerInfo(req, 11L, 2)).thenReturn(expected);

        Object ret = controller.inter1(req, 11L, 2);

        assertThat(ret).isSameAs(expected);

        ArgumentCaptor<Long> idCap = ArgumentCaptor.forClass(Long.class);
        ArgumentCaptor<Integer> srcCap = ArgumentCaptor.forClass(Integer.class);
        verify(llmService).getModelServerInfo(eq(req), idCap.capture(), srcCap.capture());
        assertThat(idCap.getValue()).isEqualTo(11L);
        assertThat(srcCap.getValue()).isEqualTo(2);
    }

    /**
     * Test boundary case allowing {@code null} values for {@code id} and {@code llmSource}.
     * <p>
     * Controller should still delegate these parameters directly without validation errors.
     * </p>
     */
    @Test
    @DisplayName("inter1 - boundary: should allow null values (delegation layer only)")
    void inter1_shouldAllowNulls() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        Object expected = new Object();
        when(llmService.getModelServerInfo(req, null, null)).thenReturn(expected);

        Object ret = controller.inter1(req, null, null);

        assertThat(ret).isSameAs(expected);
        verify(llmService).getModelServerInfo(req, null, null);
    }

    // ========== /llm/self-model-config ==========

    /**
     * Test normal case for {@code /llm/self-model-config}.
     * <p>
     * Should delegate {@code id} and {@code llmSource} to the service layer and return the same result.
     * </p>
     */
    @Test
    @DisplayName("selfModelConfig - normal: should delegate id/llmSource to service and return result")
    void selfModelConfig_shouldDelegateAndReturn() {
        Object expected = new Object();
        when(llmService.selfModelConfig(7L, 9)).thenReturn(expected);

        Object ret = controller.selfModelConfig(7L, 9);

        assertThat(ret).isSameAs(expected);
        verify(llmService).selfModelConfig(7L, 9);
    }

    /**
     * Test exception propagation for {@code /llm/self-model-config}.
     * <p>Should rethrow any exception thrown by service.</p>
     */
    @Test
    @DisplayName("selfModelConfig - exception: should propagate exception thrown by service")
    void selfModelConfig_shouldPropagateException() {
        when(llmService.selfModelConfig(anyLong(), anyInt()))
                .thenThrow(new RuntimeException("cfg err"));

        assertThatThrownBy(() -> controller.selfModelConfig(1L, 1))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("cfg");
    }

    // ========== /llm/flow-use-list ==========

    /**
     * Test normal case for {@code /llm/flow-use-list}.
     * <p>
     * Should delegate {@code flowId} to the service and return result.
     * </p>
     */
    @Test
    @DisplayName("flowUseList - normal: should delegate flowId and return result")
    void flowUseList_shouldDelegateAndReturn() {
        Object expected = new Object();
        when(llmService.getFlowUseList("f-1")).thenReturn(expected);

        Object ret = controller.flowUseList("f-1");

        assertThat(ret).isSameAs(expected);
        verify(llmService).getFlowUseList("f-1");
    }

    /**
     * Test boundary case where {@code flowId} is {@code null}.
     * <p>
     * Should still delegate call without throwing exceptions.
     * </p>
     */
    @Test
    @DisplayName("flowUseList - boundary: should allow null flowId")
    void flowUseList_shouldAllowNull() {
        Object expected = new Object();
        when(llmService.getFlowUseList(null)).thenReturn(expected);

        Object ret = controller.flowUseList(null);

        assertThat(ret).isSameAs(expected);
        verify(llmService).getFlowUseList(null);
    }

    // ========== Concurrency scenario (flowUseList is suitable for concurrency) ==========

    /**
     * Concurrency test for {@code /llm/flow-use-list}.
     * <p>
     * Ensures thread-safety and correctness when accessed by multiple threads concurrently.
     * </p>
     *
     * @throws Exception if any async task fails during execution
     */
    @Test
    @Timeout(5)
    @DisplayName("flowUseList - concurrency: multiple threads should return stable and consistent results")
    void flowUseList_concurrent_isStable() throws Exception {
        int threads = 16;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        AtomicInteger calls = new AtomicInteger(0);

        when(llmService.getFlowUseList(anyString())).thenAnswer(inv -> {
            calls.incrementAndGet();
            String flowId = inv.getArgument(0, String.class);
            return "RET-" + flowId; // Return value based on input for assertion
        });

        List<Future<Object>> futures = new ArrayList<>();
        for (int i = 0; i < threads; i++) {
            final int idx = i;
            futures.add(CompletableFuture.supplyAsync(() -> {
                try {
                    start.await();
                    return controller.flowUseList("flow-" + idx);
                } catch (InterruptedException e) {
                    throw new RuntimeException(e);
                } finally {
                    done.countDown();
                }
            }, pool));
        }

        start.countDown();
        done.await(3, TimeUnit.SECONDS);

        for (int i = 0; i < threads; i++) {
            assertThat(futures.get(i).get()).isEqualTo("RET-flow-" + i);
        }
        verify(llmService, times(threads)).getFlowUseList(anyString());
        assertThat(calls.get()).isEqualTo(threads);

        pool.shutdownNow();
    }
}
