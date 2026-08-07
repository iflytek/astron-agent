package com.iflytek.astron.console.toolkit.controller.bot;

import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.toolkit.entity.biz.AiCode;
import com.iflytek.astron.console.toolkit.entity.biz.AiGenerate;
import com.iflytek.astron.console.toolkit.service.bot.PromptService;
import com.iflytek.astron.console.toolkit.util.SpringUtils;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link PromptController}.
 * <p>
 * Tech stack: JUnit 5 + Mockito + AssertJ.
 * </p>
 */
@ExtendWith(MockitoExtension.class)
class PromptControllerTest {

    @Mock
    PromptService promptService;

    @InjectMocks
    PromptController controller;

    /**
     * Before each test, inject a mock BeanFactory into SpringUtils via reflection to ensure that Spring
     * bean lookups do not cause NullPointerException.
     *
     * @throws Exception if reflection access fails
     */
    @BeforeEach
    void ensureSpringBeanFactory() throws Exception {
        // Inject a fake BeanFactory into SpringUtils.beanFactory using reflection
        Field f = SpringUtils.class.getDeclaredField("beanFactory");
        f.setAccessible(true);
        Object current = f.get(null);
        if (current == null) {
            ConfigurableListableBeanFactory factory = mock(ConfigurableListableBeanFactory.class);

            // Support getBean(Class<?>)
            lenient().when(factory.getBean(Mockito.<Class<?>>any())).thenAnswer(inv -> {
                Class<?> type = inv.getArgument(0, Class.class);
                return mock(type);
            });

            // Support getBean(String, Class<?>)
            lenient().when(factory.getBean(anyString(), Mockito.<Class<?>>any())).thenAnswer(inv -> {
                Class<?> type = inv.getArgument(1, Class.class);
                return mock(type);
            });

            // Support getBean(String)
            lenient().when(factory.getBean(anyString())).thenReturn(new Object());

            f.set(null, factory);
        }
    }

    /**
     * Test normal case for /prompt/enhance endpoint. Should set SSE header first and delegate
     * parameters (name, prompt) to the service.
     */
    @Test
    @DisplayName("enhance - normal: should set SSE header and delegate parameters correctly")
    void enhance_shouldSetHeader_andDelegateWithParams() {
        JSONObject req = new JSONObject();
        req.put("name", "assistant-A");
        req.put("prompt", "describe me");
        HttpServletResponse resp = mock(HttpServletResponse.class);

        SseEmitter expected = new SseEmitter();
        when(promptService.enhance("assistant-A", "describe me")).thenReturn(expected);

        SseEmitter actual = controller.enhance(req, resp);

        assertThat(actual).isSameAs(expected);

        InOrder inOrder = inOrder(resp, promptService);
        inOrder.verify(resp).addHeader("X-Accel-Buffering", "no");
        inOrder.verify(promptService).enhance("assistant-A", "describe me");
        verifyNoMoreInteractions(promptService);
    }

    /**
     * Test boundary case where JSON is missing required fields. Should pass null values but still set
     * SSE header.
     */
    @Test
    @DisplayName("enhance - boundary: missing JSON keys should pass nulls and still set header")
    void enhance_shouldPassNulls_whenJsonMissingKeys() {
        JSONObject req = new JSONObject();
        HttpServletResponse resp = mock(HttpServletResponse.class);

        SseEmitter expected = new SseEmitter();
        when(promptService.enhance(null, null)).thenReturn(expected);

        SseEmitter actual = controller.enhance(req, resp);

        assertThat(actual).isSameAs(expected);
        verify(resp).addHeader("X-Accel-Buffering", "no");
        verify(promptService).enhance(null, null);
    }

    /**
     * Test error propagation when service throws an exception. The SSE header should still be set
     * before the call.
     */
    @Test
    @DisplayName("enhance - exception: should propagate exception but header set before call")
    void enhance_shouldPropagateException_butHeaderSetBeforeCall() {
        JSONObject req = new JSONObject();
        req.put("name", "x");
        req.put("prompt", "y");
        HttpServletResponse resp = mock(HttpServletResponse.class);

        when(promptService.enhance("x", "y")).thenThrow(new RuntimeException("boom"));

        assertThatThrownBy(() -> controller.enhance(req, resp))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("boom");

        InOrder inOrder = inOrder(resp, promptService);
        inOrder.verify(resp).addHeader("X-Accel-Buffering", "no");
        inOrder.verify(promptService).enhance("x", "y");
    }

    /**
     * Test normal case for /prompt/next-question-advice. Should delegate the question parameter and
     * wrap result in {@link ApiResult}.
     */
    @Test
    @DisplayName("nqa - normal: should delegate question and wrap result into ApiResult")
    void nqa_shouldDelegate_andWrapIntoResult() {
        JSONObject req = new JSONObject();
        req.put("question", "how to write tests?");
        when(promptService.nextQuestionAdvice("how to write tests?")).thenReturn(null);

        Object result = controller.nqa(req);

        assertThat(result).isInstanceOf(ApiResult.class);
        verify(promptService).nextQuestionAdvice("how to write tests?");
    }

    /**
     * Test boundary case for /prompt/next-question-advice when question is missing.
     */
    @Test
    @DisplayName("nqa - boundary: should work even if question field is missing (null)")
    void nqa_shouldWork_whenQuestionMissing() {
        JSONObject req = new JSONObject();
        when(promptService.nextQuestionAdvice(null)).thenReturn(null);

        Object result = controller.nqa(req);

        assertThat(result).isInstanceOf(ApiResult.class);
        verify(promptService).nextQuestionAdvice(null);
    }

    /**
     * Test normal case for /prompt/ai-generate endpoint. Should set SSE header and delegate to service.
     */
    @Test
    @DisplayName("aiGenerate - normal: should set SSE header and delegate request object")
    void aiGenerate_shouldSetHeader_andDelegate() {
        AiGenerate aiGenerate = new AiGenerate();
        HttpServletResponse resp = mock(HttpServletResponse.class);
        SseEmitter expected = new SseEmitter();

        when(promptService.aiGenerate(aiGenerate)).thenReturn(expected);

        SseEmitter actual = controller.aiGenerate(aiGenerate, resp);

        assertThat(actual).isSameAs(expected);
        InOrder inOrder = inOrder(resp, promptService);
        inOrder.verify(resp).addHeader("X-Accel-Buffering", "no");
        inOrder.verify(promptService).aiGenerate(aiGenerate);
    }

    /**
     * Test exception propagation for /prompt/ai-generate endpoint.
     */
    @Test
    @DisplayName("aiGenerate - exception: should propagate exception but header is set")
    void aiGenerate_shouldPropagateException_butHeaderSet() {
        AiGenerate aiGenerate = new AiGenerate();
        HttpServletResponse resp = mock(HttpServletResponse.class);

        when(promptService.aiGenerate(aiGenerate)).thenThrow(new IllegalStateException("quota exceeded"));

        assertThatThrownBy(() -> controller.aiGenerate(aiGenerate, resp))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("quota");

        InOrder inOrder = inOrder(resp, promptService);
        inOrder.verify(resp).addHeader("X-Accel-Buffering", "no");
        inOrder.verify(promptService).aiGenerate(aiGenerate);
    }

    /**
     * Test normal case for /prompt/ai-code endpoint. Should set SSE header and delegate to service.
     */
    @Test
    @DisplayName("aiCode - normal: should set SSE header and delegate request object")
    void aiCode_shouldSetHeader_andDelegate() {
        AiCode aiCode = new AiCode();
        HttpServletResponse resp = mock(HttpServletResponse.class);
        SseEmitter expected = new SseEmitter();

        when(promptService.aiCode(aiCode)).thenReturn(expected);

        SseEmitter actual = controller.aiCode(aiCode, resp);

        assertThat(actual).isSameAs(expected);
        InOrder inOrder = inOrder(resp, promptService);
        inOrder.verify(resp).addHeader("X-Accel-Buffering", "no");
        inOrder.verify(promptService).aiCode(aiCode);
    }

    /**
     * Test exception propagation for /prompt/ai-code endpoint.
     */
    @Test
    @DisplayName("aiCode - exception: should propagate exception but header is set")
    void aiCode_shouldPropagateException_butHeaderSet() {
        AiCode aiCode = new AiCode();
        HttpServletResponse resp = mock(HttpServletResponse.class);

        when(promptService.aiCode(aiCode)).thenThrow(new RuntimeException("boom"));

        assertThatThrownBy(() -> controller.aiCode(aiCode, resp))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("boom");

        InOrder inOrder = inOrder(resp, promptService);
        inOrder.verify(resp).addHeader("X-Accel-Buffering", "no");
        inOrder.verify(promptService).aiCode(aiCode);
    }

    /**
     * Concurrency test for /prompt/enhance endpoint. Ensures thread-safety and that each thread sets
     * header and delegates call.
     *
     * @throws Exception if any future execution fails
     */
    @Test
    @Timeout(5)
    @DisplayName("enhance - concurrent: all threads should set header and delegate safely")
    void enhance_concurrent_isSafe_andDelegated() throws Exception {
        int threads = 16;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        AtomicInteger calls = new AtomicInteger(0);

        when(promptService.enhance(any(), any())).thenAnswer(inv -> {
            calls.incrementAndGet();
            return new SseEmitter();
        });

        List<Future<SseEmitter>> futures = new ArrayList<>();
        List<HttpServletResponse> responses = new ArrayList<>();
        for (int i = 0; i < threads; i++) {
            final int idx = i;
            final HttpServletResponse resp = mock(HttpServletResponse.class);
            responses.add(resp);
            JSONObject req = new JSONObject();
            req.put("name", "n-" + idx);
            req.put("prompt", "p-" + idx);

            futures.add(CompletableFuture.supplyAsync(() -> {
                try {
                    start.await();
                    return controller.enhance(req, resp);
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
            assertThat(futures.get(i).get()).isInstanceOf(SseEmitter.class);
            verify(responses.get(i), times(1))
                    .addHeader("X-Accel-Buffering", "no");
        }
        verify(promptService, times(threads)).enhance(any(), any());
        assertThat(calls.get()).isEqualTo(threads);

        pool.shutdownNow();
    }
}
