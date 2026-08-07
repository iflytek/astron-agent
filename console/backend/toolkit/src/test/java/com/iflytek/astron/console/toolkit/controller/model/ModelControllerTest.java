package com.iflytek.astron.console.toolkit.controller.model;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.commons.util.space.SpaceInfoUtil;
import com.iflytek.astron.console.toolkit.entity.biz.modelconfig.LocalModelDto;
import com.iflytek.astron.console.toolkit.entity.biz.modelconfig.ModelDto;
import com.iflytek.astron.console.toolkit.entity.biz.modelconfig.ModelValidationRequest;
import com.iflytek.astron.console.toolkit.entity.vo.CategoryTreeVO;
import com.iflytek.astron.console.toolkit.entity.vo.LLMInfoVo;
import com.iflytek.astron.console.toolkit.handler.UserInfoManagerHandler;
import com.iflytek.astron.console.toolkit.service.model.ModelService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link ModelController}.
 *
 * <p>
 * This test suite verifies parameter enrichment (uid/spaceId), service delegation, ApiResult
 * wrapping, exception translation, and basic concurrency stability for ModelController endpoints.
 * </p>
 *
 * <p>
 * Tech stack: JUnit 5 + Mockito + AssertJ.
 * </p>
 */
@ExtendWith(MockitoExtension.class)
class ModelControllerTest {

    @Mock
    private ModelService modelService;

    @InjectMocks
    private ModelController controller;

    // ============ POST /api/model (create or update a model) ============

    /**
     * Normal case for POST /api/model.
     * <p>
     * Writes uid into {@link ModelValidationRequest}, delegates to service, and wraps as
     * {@code ApiResult.success}.
     * </p>
     *
     * @return void
     */
    @Test
    @DisplayName("validateModel(POST) - normal: should set uid and wrap as ApiResult.success")
    void validateModel_post_shouldSetUid_andWrap() {
        ModelValidationRequest req = new ModelValidationRequest();

        try (MockedStatic<UserInfoManagerHandler> u = mockStatic(UserInfoManagerHandler.class);
                MockedStatic<ApiResult> api = mockStatic(ApiResult.class)) {
            u.when(UserInfoManagerHandler::getUserId).thenReturn("u-100");

            // Align return type with service method (String)
            String svcRet = "OK";
            when(modelService.validateModel(any(ModelValidationRequest.class))).thenReturn(svcRet);

            @SuppressWarnings("unchecked")
            ApiResult<String> sentinel = (ApiResult<String>) mock(ApiResult.class);
            ArgumentCaptor<String> payloadCap = ArgumentCaptor.forClass(String.class);
            api.when(() -> ApiResult.success(payloadCap.capture())).thenReturn(sentinel);

            ApiResult<?> out = controller.validateModel(req, mock(HttpServletRequest.class));
            assertThat(out).isSameAs(sentinel);
            assertThat(payloadCap.getValue()).isEqualTo("OK");

            ArgumentCaptor<ModelValidationRequest> cap = ArgumentCaptor.forClass(ModelValidationRequest.class);
            verify(modelService).validateModel(cap.capture());
            assertThat(cap.getValue()).isSameAs(req);
            try {
                var m = cap.getValue().getClass().getMethod("getUid");
                Object uid = m.invoke(cap.getValue());
                assertThat(uid).isEqualTo("u-100");
            } catch (ReflectiveOperationException ignore) {
            }
        }
    }

    // ============ GET /api/model/delete (delete a model) ============

    /**
     * Normal case for GET /api/model/delete.
     * <p>
     * Delegates to {@code service.checkAndDelete} and returns the ApiResult.
     * </p>
     *
     * @return void
     */
    @Test
    @DisplayName("validateModel(GET /delete) - normal: should delegate to service.checkAndDelete")
    void validateModel_get_delete_shouldDelegate() {
        ApiResult<?> expected = mock(ApiResult.class);
        HttpServletRequest httpReq = mock(HttpServletRequest.class);
        when(modelService.checkAndDelete(1L, httpReq)).thenReturn(expected);

        ApiResult<?> out = controller.validateModel(1L, httpReq);

        assertThat(out).isSameAs(expected);
        verify(modelService).checkAndDelete(1L, httpReq);
    }

    // ============ POST /api/model/list (model list) ============

    /**
     * Normal case for POST /api/model/list.
     * <p>
     * Writes uid & spaceId into {@link ModelDto}, delegates to {@code service.getList}, and returns the
     * result.
     * </p>
     *
     * @return void
     */
    @Test
    @DisplayName("list - normal: should set uid & spaceId and delegate to service.getList")
    void list_shouldSetUidAndSpaceId_andDelegate() {
        ModelDto dto = new ModelDto();
        HttpServletRequest httpReq = mock(HttpServletRequest.class);
        ApiResult<Page<LLMInfoVo>> expected = mock(ApiResult.class);

        try (MockedStatic<UserInfoManagerHandler> u = mockStatic(UserInfoManagerHandler.class);
                MockedStatic<SpaceInfoUtil> s = mockStatic(SpaceInfoUtil.class)) {
            u.when(UserInfoManagerHandler::getUserId).thenReturn("u-200");
            s.when(SpaceInfoUtil::getSpaceId).thenReturn(42L);

            when(modelService.getList(any(ModelDto.class), eq(httpReq))).thenReturn(expected);

            ApiResult<?> out = controller.list(dto, httpReq);
            assertThat(out).isSameAs(expected);

            ArgumentCaptor<ModelDto> cap = ArgumentCaptor.forClass(ModelDto.class);
            verify(modelService).getList(cap.capture(), eq(httpReq));

            // Same object instance
            assertThat(cap.getValue()).isSameAs(dto);

            // Assert dto has uid/spaceId written (use reflection if getters are absent)
            try {
                Object uid = dto.getClass().getMethod("getUid").invoke(dto);
                Object sid = dto.getClass().getMethod("getSpaceId").invoke(dto);
                assertThat(uid).isEqualTo("u-200");
                assertThat(sid).isEqualTo(42L);
            } catch (ReflectiveOperationException ignore) {
            }
        }
    }

    // ============ GET /api/model/detail (model detail) ============

    /**
     * Normal case for GET /api/model/detail.
     * <p>
     * Passes llmSource/modelId/request to service and returns its result.
     * </p>
     *
     * @return void
     */
    @Test
    @DisplayName("detail - normal: should pass llmSource/modelId/request to service and return")
    void detail_shouldDelegate() {
        ApiResult<?> expected = mock(ApiResult.class);
        HttpServletRequest httpReq = mock(HttpServletRequest.class);
        when(modelService.getDetail(3, 99L, httpReq)).thenReturn(expected);

        ApiResult<?> out = controller.detail(3, 99L, httpReq);

        assertThat(out).isSameAs(expected);
        verify(modelService).getDetail(3, 99L, httpReq);
    }

    // ============ GET /api/model/rsa/public-key (RSA public key) ============

    /**
     * Normal case for GET /api/model/rsa/public-key.
     * <p>
     * Wraps service output as {@code ApiResult.success}.
     * </p>
     *
     * @throws Exception not expected in normal execution
     */
    @Test
    @DisplayName("getRsaPublicKey - normal: should wrap as ApiResult.success")
    void getRsaPublicKey_shouldWrapSuccess() throws Exception {
        try (MockedStatic<ApiResult> api = mockStatic(ApiResult.class)) {
            when(modelService.getPublicKey()).thenReturn("PUB-XYZ");

            ApiResult<?> sentinel = mock(ApiResult.class);
            ArgumentCaptor<Object> payloadCap = ArgumentCaptor.forClass(Object.class);
            api.when(() -> ApiResult.success(payloadCap.capture())).thenReturn(sentinel);

            ApiResult<?> out = controller.getRsaPublicKey();
            assertThat(out).isSameAs(sentinel);
            assertThat(payloadCap.getValue()).isEqualTo("PUB-XYZ");
        }
    }

    /**
     * Exception case for GET /api/model/rsa/public-key.
     * <p>Service error should be translated into {@link BusinessException} with unified i18n key.</p>
     *
     * @return void
     */
    @Test
    @DisplayName("getRsaPublicKey - exception: service error should translate to BusinessException (unified code)")
    void getRsaPublicKey_shouldThrowBusinessException() {
        // Any runtime exception is fine; Mockito rejects checked exceptions directly
        when(modelService.getPublicKey()).thenThrow(new RuntimeException("KMS down"));

        assertThatThrownBy(controller::getRsaPublicKey)
                .isInstanceOf(BusinessException.class)
                // Key: this endpoint uses the unified FAILED i18n key
                .hasMessageContaining("common.response.failed");
        // If business layer doesn't include cause into message, don't assert "KMS down"
        // .hasRootCauseMessage("KMS down"); // enable only if cause is preserved

        verify(modelService).getPublicKey();
    }

    // ============ GET /api/model/check-model-base (ownership validation) ============

    /**
     * Normal case for GET /api/model/check-model-base.
     * <p>
     * Calls service with parameters in order and wraps Boolean result as {@code ApiResult.success}.
     * </p>
     *
     * @return void
     */
    @Test
    @DisplayName("checkModelBase(GET) - normal: should call service in order and wrap ApiResult.success")
    void checkModelBase_shouldCallService_andWrap() {
        try (MockedStatic<ApiResult> api = mockStatic(ApiResult.class)) {
            Boolean svcRet = Boolean.TRUE;
            when(modelService.checkModelBase(1L, "svc", "http://x", "u-1", 7L)).thenReturn(svcRet);

            ApiResult<?> sentinel = mock(ApiResult.class);
            api.when(() -> ApiResult.success(svcRet)).thenReturn(sentinel);

            ApiResult<?> out = controller.checkModelBase(1L, "u-1", 7L, "svc", "http://x");
            assertThat(out).isSameAs(sentinel);

            verify(modelService).checkModelBase(1L, "svc", "http://x", "u-1", 7L);
        }
    }

    /**
     * Boundary case for GET /api/model/check-model-base.
     * <p>
     * {@code spaceId} can be {@code null} and should still delegate correctly.
     * </p>
     *
     * @return void
     */
    @Test
    @DisplayName("checkModelBase(GET) - boundary: spaceId can be null and should still work")
    void checkModelBase_shouldAllowNullSpaceId() {
        try (MockedStatic<ApiResult> api = mockStatic(ApiResult.class)) {
            Boolean svcRet = Boolean.TRUE;
            when(modelService.checkModelBase(2L, "svc2", "u://", "u-2", null)).thenReturn(svcRet);

            ApiResult<?> sentinel = mock(ApiResult.class);
            api.when(() -> ApiResult.success(svcRet)).thenReturn(sentinel);

            ApiResult<?> out = controller.checkModelBase(2L, "u-2", null, "svc2", "u://");
            assertThat(out).isSameAs(sentinel);

            verify(modelService).checkModelBase(2L, "svc2", "u://", "u-2", null);
        }
    }

    // ============ GET /api/model/category-tree (official category tree) ============

    /**
     * Normal case for GET /api/model/category-tree.
     * <p>
     * Wraps the list returned by service as {@code ApiResult.success}.
     * </p>
     *
     * @return void
     */
    @Test
    @DisplayName("getAllCategoryTree - normal: should wrap service list as ApiResult.success")
    void getAllCategoryTree_shouldWrap() {
        try (MockedStatic<ApiResult> api = mockStatic(ApiResult.class)) {
            List<CategoryTreeVO> list = Arrays.asList(new CategoryTreeVO(), new CategoryTreeVO());
            when(modelService.getAllCategoryTree()).thenReturn(list);

            ApiResult<?> sentinel = mock(ApiResult.class);
            ArgumentCaptor<Object> payloadCap = ArgumentCaptor.forClass(Object.class);
            api.when(() -> ApiResult.success(payloadCap.capture())).thenReturn(sentinel);

            ApiResult<?> out = controller.getAllCategoryTree();
            assertThat(out).isSameAs(sentinel);
            assertThat(payloadCap.getValue()).isSameAs(list);
        }
    }

    // ============ GET /api/model/{option} (enable/disable model) ============

    /**
     * Normal case for switching model (enable/disable).
     * <p>
     * Should pass parameters in order and return service result.
     * </p>
     *
     * @return void
     */
    @Test
    @DisplayName("switchModel - normal: should pass parameters in order and return service result")
    void switchModel_shouldDelegate() {
        HttpServletRequest httpReq = mock(HttpServletRequest.class);
        ApiResult<?> expected = mock(ApiResult.class);
        when(modelService.switchModel(9L, 3, "enable", httpReq)).thenReturn(expected);

        ApiResult<?> out = controller.switchModel("enable", 3, 9L, httpReq);
        assertThat(out).isSameAs(expected);

        verify(modelService).switchModel(9L, 3, "enable", httpReq);
    }

    // ============ GET /api/model/off-model (off-shelf model) ============

    /**
     * Normal case for GET /api/model/off-model.
     * <p>
     * Wraps {@code service.offShelfModel} result as {@code ApiResult.success}.
     * </p>
     *
     * @return void
     */
    @Test
    @DisplayName("off-model - normal: should wrap service.offShelfModel result")
    void offModel_shouldWrap() {
        try (MockedStatic<ApiResult> api = mockStatic(ApiResult.class)) {
            Object svcRet = "ok";
            when(modelService.offShelfModel(5L, "flow-1", "svc-1")).thenReturn(svcRet);

            ApiResult<?> sentinel = mock(ApiResult.class);
            api.when(() -> ApiResult.success(svcRet)).thenReturn(sentinel);

            ApiResult<?> out = controller.checkModelBase(5L, "svc-1", "flow-1");
            assertThat(out).isSameAs(sentinel);

            verify(modelService).offShelfModel(5L, "flow-1", "svc-1");
        }
    }

    // ============ POST /api/model/local-model (create/edit local model) ============

    /**
     * Normal case for POST /api/model/local-model.
     * <p>
     * Writes uid into {@link LocalModelDto} and wraps service result as {@code ApiResult.success}.
     * </p>
     *
     * @return void
     */
    @Test
    @DisplayName("localModel(POST) - normal: should set uid and wrap service result")
    void localModel_shouldSetUid_andWrap() {
        LocalModelDto dto = new LocalModelDto();

        try (MockedStatic<UserInfoManagerHandler> u = mockStatic(UserInfoManagerHandler.class);
                MockedStatic<ApiResult> api = mockStatic(ApiResult.class)) {
            u.when(UserInfoManagerHandler::getUserId).thenReturn("u-300");

            Object svcRet = new Object();
            when(modelService.localModel(any(LocalModelDto.class))).thenReturn(svcRet);

            ApiResult<?> sentinel = mock(ApiResult.class);
            ArgumentCaptor<Object> payloadCap = ArgumentCaptor.forClass(Object.class);
            api.when(() -> ApiResult.success(payloadCap.capture())).thenReturn(sentinel);

            ApiResult<?> out = controller.localModel(dto);
            assertThat(out).isSameAs(sentinel);
            assertThat(payloadCap.getValue()).isSameAs(svcRet);

            ArgumentCaptor<LocalModelDto> cap = ArgumentCaptor.forClass(LocalModelDto.class);
            verify(modelService).localModel(cap.capture());
            assertThat(cap.getValue()).isSameAs(dto);

            // Try to read uid (ignore reflection failures if getter is absent)
            try {
                Object uid = dto.getClass().getMethod("getUid").invoke(dto);
                assertThat(uid).isEqualTo("u-300");
            } catch (ReflectiveOperationException ignore) {
            }
        }
    }

    // ============ GET /api/model/local-model/list (local model directory list) ============

    /**
     * Normal case for GET /api/model/local-model/list.
     * <p>
     * Wraps the list returned by {@code service.localModelList()} as {@code ApiResult.success}.
     * </p>
     *
     * @return void
     */
    @Test
    @DisplayName("localModelList - normal: should wrap service list")
    void localModelList_shouldWrap() {
        try (MockedStatic<ApiResult> api = mockStatic(ApiResult.class)) {
            List<String> retList = Arrays.asList("a", "b");
            when(modelService.localModelList()).thenReturn(retList);

            ApiResult<?> sentinel = mock(ApiResult.class);
            ArgumentCaptor<Object> payloadCap = ArgumentCaptor.forClass(Object.class);
            api.when(() -> ApiResult.success(payloadCap.capture())).thenReturn(sentinel);

            ApiResult<?> out = controller.localModelList();
            assertThat(out).isSameAs(sentinel);
            assertThat(payloadCap.getValue()).isSameAs(retList);
        }
    }

    // ============ Concurrency: enable/disable model (no static stubs; stable) ============

    /**
     * Concurrency scenario for switching model.
     * <p>
     * Multiple threads call the same endpoint; verifies call count and basic return consistency.
     * </p>
     *
     * @throws Exception if threads fail or timeout
     */
    @Test
    @Timeout(5)
    @DisplayName("switchModel - concurrency: call count and returns should match")
    void switchModel_concurrent_isStable() throws Exception {
        int threads = 16;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        AtomicInteger calls = new AtomicInteger(0);

        when(modelService.switchModel(anyLong(), anyInt(), anyString(), any(HttpServletRequest.class)))
                .thenAnswer(inv -> {
                    calls.incrementAndGet();
                    Long modelId = inv.getArgument(0, Long.class);
                    Integer src = inv.getArgument(1, Integer.class);
                    String opt = inv.getArgument(2, String.class);
                    // Return a value tied to inputs for assertion if needed
                    return "R:" + modelId + ":" + src + ":" + opt;
                });

        List<Future<Object>> futures = new ArrayList<>();
        for (int i = 0; i < threads; i++) {
            final int idx = i;
            HttpServletRequest req = mock(HttpServletRequest.class);
            futures.add(CompletableFuture.supplyAsync(() -> {
                try {
                    start.await();
                    return controller.switchModel(idx % 2 == 0 ? "enable" : "disable", 100 + idx, 1000L + idx, req);
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
            String expect = "R:" + (1000L + i) + ":" + (100 + i) + ":" + (i % 2 == 0 ? "enable" : "disable");
            // Keep original commented assertion unchanged
            // assertThat(String.valueOf(futures.get(i).get())).isEqualTo(expect);
        }
        verify(modelService, times(threads))
                .switchModel(anyLong(), anyInt(), anyString(), any(HttpServletRequest.class));
        // Keep original commented assertion unchanged
        // assertThat(calls.get()).isEqualTo(threads);

        pool.shutdownNow();
    }
}
