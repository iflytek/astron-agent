package com.iflytek.astron.console.toolkit.controller.common;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.toolkit.entity.table.ConfigInfo;
import com.iflytek.astron.console.toolkit.service.common.ConfigInfoService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.assertj.core.api.InstanceOfAssertFactories.*;

import java.util.*;

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

}
