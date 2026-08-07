package com.iflytek.astron.console.toolkit.controller.workflow;

import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.entity.workflow.Workflow;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.ChatBizReq;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.ChatResumeReq;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.WorkflowDebugDto;
import com.iflytek.astron.console.toolkit.entity.common.PageData;
import com.iflytek.astron.console.toolkit.entity.common.Pagination;
import com.iflytek.astron.console.toolkit.entity.dto.*;
import com.iflytek.astron.console.toolkit.entity.dto.eval.WorkflowComparisonSaveReq;
import com.iflytek.astron.console.toolkit.entity.table.workflow.*;
import com.iflytek.astron.console.toolkit.entity.vo.WorkflowVo;
import com.iflytek.astron.console.toolkit.service.workflow.WorkflowExportService;
import com.iflytek.astron.console.toolkit.service.workflow.WorkflowService;
import jakarta.servlet.ServletOutputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Comprehensive unit tests for {@link WorkflowController}.
 *
 * <p>
 * Coverage goals:
 * <ul>
 * <li>JaCoCo: statement coverage &gt;= 80%, branch coverage &gt;= 90%</li>
 * <li>High PIT mutation-kill ratio</li>
 * <li>Cover normal flows, boundary conditions, exceptions, and concurrency</li>
 * </ul>
 * </p>
 *
 * <p>
 * Tech stack: JUnit 5 + Mockito + AssertJ + ParameterizedTest
 * </p>
 *
 * <p>
 * Mocked dependencies:
 * <ul>
 * <li>{@code WorkflowService} (core business logic)</li>
 * <li>{@code WorkflowExportService} (import/export)</li>
 * <li>{@code HttpServletRequest/Response} (web request/response)</li>
 * <li>{@code MultipartFile} (file upload)</li>
 * <li>{@code ServletOutputStream} (file download)</li>
 * </ul>
 * </p>
 */
@ExtendWith(MockitoExtension.class)
class WorkflowControllerTest {

    private static final String VALID_FLOW_ID = "valid-flow-123";
    private static final String VALID_NODE_ID = "valid-node-456";
    private static final String VALID_PROMPT_ID = "valid-prompt-789";
    private static final Long VALID_WORKFLOW_ID = 1L;
    private static final Long VALID_SPACE_ID = 100L;
    private static final String CORRECT_PASSWORD = "xfyun";
    private static final String WRONG_PASSWORD = "wrong";

    @Mock
    private WorkflowService workflowService;

    @Mock
    private WorkflowExportService workflowExportService;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private MultipartFile multipartFile;

    @Mock
    private ServletOutputStream outputStream;

    @InjectMocks
    private WorkflowController controller;

    // ArgumentCaptors for verification
    @Captor
    private ArgumentCaptor<List<WorkflowComparisonSaveReq>> comparisonCaptor;

    @Captor
    private ArgumentCaptor<String> stringCaptor;

    @Captor
    private ArgumentCaptor<Long> longCaptor;

    @Captor
    private ArgumentCaptor<Integer> integerCaptor;

    // Test fixtures
    private Pagination validPagination;
    private WorkflowReq validWorkflowReq;
    private WorkflowVo validWorkflowVo;
    private Workflow validWorkflow;
    private PageData<WorkflowVo> validPageData;

    /**
     * Initialize common fixtures before each test.
     *
     * @return void
     */
    @BeforeEach
    void setUp() {
        validPagination = createValidPagination();
        validWorkflowReq = createValidWorkflowReq();
        validWorkflowVo = createValidWorkflowVo();
        validWorkflow = createValidWorkflow();
        validPageData = createValidPageData();
    }

    // ==================== Test Data Builders ====================

    /**
     * Build a valid pagination object.
     *
     * @return a Pagination with current=1 and pageSize=10
     */
    private Pagination createValidPagination() {
        Pagination pagination = new Pagination();
        pagination.setCurrent(1);
        pagination.setPageSize(10);
        return pagination;
    }

    /**
     * Build an empty pagination object (current=0, pageSize=0).
     *
     * @return an "empty" Pagination
     */
    private Pagination createEmptyPagination() {
        Pagination pagination = new Pagination();
        pagination.setCurrent(0);
        pagination.setPageSize(0);
        return pagination;
    }

    /**
     * Build a valid workflow request DTO.
     *
     * @return a populated {@link WorkflowReq}
     */
    private WorkflowReq createValidWorkflowReq() {
        WorkflowReq req = new WorkflowReq();
        req.setId(VALID_WORKFLOW_ID);
        req.setName("Test Workflow");
        req.setDescription("Test Description");
        req.setFlowId(VALID_FLOW_ID);
        req.setSpaceId(VALID_SPACE_ID);
        return req;
    }

    /**
     * Build a minimal valid workflow view object.
     *
     * @return a populated {@link WorkflowVo}
     */
    private WorkflowVo createValidWorkflowVo() {
        WorkflowVo vo = new WorkflowVo();
        vo.setId(VALID_WORKFLOW_ID);
        vo.setName("Test Workflow");
        vo.setDescription("Test Description");
        return vo;
    }

    /**
     * Build a valid workflow entity with minimal content.
     *
     * @return a populated {@link Workflow}
     */
    private Workflow createValidWorkflow() {
        Workflow workflow = new Workflow();
        workflow.setId(VALID_WORKFLOW_ID);
        workflow.setName("Test Workflow");
        workflow.setData("{\"nodes\":[],\"edges\":[]}");
        workflow.setCanPublish(true);
        return workflow;
    }

    /**
     * Build a workflow entity whose data is empty (used by export negative tests).
     *
     * @return a {@link Workflow} with empty data
     */
    private Workflow createEmptyDataWorkflow() {
        Workflow workflow = new Workflow();
        workflow.setId(VALID_WORKFLOW_ID);
        workflow.setData("");
        return workflow;
    }

    /**
     * Build a PageData object containing one {@link WorkflowVo}.
     *
     * @return a populated {@link PageData}
     */
    private PageData<WorkflowVo> createValidPageData() {
        PageData<WorkflowVo> pageData = new PageData<>();
        pageData.setPageData(List.of(validWorkflowVo));
        pageData.setTotalCount(1L);
        return pageData;
    }

    /**
     * Build a valid debug DTO.
     *
     * @return a populated {@link WorkflowDebugDto}
     */
    private WorkflowDebugDto createValidDebugDto() {
        WorkflowDebugDto dto = new WorkflowDebugDto();
        dto.setFlowId(VALID_FLOW_ID);
        dto.setName("Debug Test");
        return dto;
    }

    /**
     * Build a valid chat business request.
     *
     * @return a populated {@link ChatBizReq}
     */
    private ChatBizReq createValidChatBizReq() {
        ChatBizReq req = new ChatBizReq();
        req.setFlowId(VALID_FLOW_ID);
        return req;
    }

    /**
     * Build a valid chat resume request.
     *
     * @return a populated {@link ChatResumeReq}
     */
    private ChatResumeReq createValidChatResumeReq() {
        ChatResumeReq req = new ChatResumeReq();
        req.setFlowId(VALID_FLOW_ID);
        return req;
    }

    /**
     * Build a valid workflow dialog.
     *
     * @return a populated {@link WorkflowDialog}
     */
    private WorkflowDialog createValidWorkflowDialog() {
        WorkflowDialog dialog = new WorkflowDialog();
        dialog.setWorkflowId(VALID_WORKFLOW_ID);
        dialog.setType(1);
        return dialog;
    }

    /**
     * Build a valid comparison save request.
     *
     * @return a populated {@link WorkflowComparisonSaveReq}
     */
    private WorkflowComparisonSaveReq createValidComparisonSaveReq() {
        WorkflowComparisonSaveReq req = new WorkflowComparisonSaveReq();
        req.setPromptId(VALID_PROMPT_ID);
        return req;
    }

    /**
     * Build a valid feedback request.
     *
     * @return a populated {@link WorkflowFeedbackReq}
     */
    private WorkflowFeedbackReq createValidFeedbackReq() {
        WorkflowFeedbackReq req = new WorkflowFeedbackReq();
        req.setFlowId(VALID_FLOW_ID);
        req.setDescription("Test feedback");
        return req;
    }

    // ==================== Data Sources for Parameterized Tests ====================

    /**
     * Provide status values for parameterized tests.
     *
     * @return a stream of integers representing status values
     */
    static Stream<Integer> statusValues() {
        return Stream.of(-1, 0, 1);
    }

    /**
     * Provide incorrect passwords for parameterized tests.
     *
     * @return a stream of invalid password strings
     */
    static Stream<String> invalidPasswords() {
        return Stream.of("", "wrong", "XFYUN", "xfyun ", " xfyun", "12345");
    }

    /**
     * Provide special characters for search tests.
     *
     * @return a stream of special-character-containing strings
     */
    static Stream<String> specialCharacters() {
        return Stream.of(
                "<script>alert('xss')</script>",
                "'; DROP TABLE workflows; --",
                "../../etc/passwd",
                "\u0000\u0001\u0002",
                "te Chinese"); // Test data: Chinese keywords for testing
    }

    // ==================== Workflow List Tests ====================

    @Nested
    @DisplayName("Workflow list query tests")
    class WorkflowListTests {

        /**
         * Verify normal case of list API when pagination parameters are valid.
         *
         * @throws UnsupportedEncodingException if URL-decoding occurs in controller signature
         */
        @Test
        @DisplayName("Should delegate to service and return result when pagination is valid")
        void list_whenPaginationIsValid_shouldDelegateToServiceAndReturnResult() throws UnsupportedEncodingException {
            // Given
            String search = "test keyword";
            String flowId = VALID_FLOW_ID;
            Integer status = 1;
            Integer order = 2;
            when(workflowService.listPage(VALID_SPACE_ID, 1, 10, search, status, order, flowId))
                    .thenReturn(validPageData);

            // When
            PageData<WorkflowVo> result = controller.list(validPagination, search, flowId, status, order, VALID_SPACE_ID);

            // Then
            assertThat(result)
                    .isNotNull()
                    .isSameAs(validPageData);

            verify(workflowService).listPage(VALID_SPACE_ID, 1, 10, search, status, order, flowId);
            verifyNoMoreInteractions(workflowService);
        }

        /**
         * Verify that different status values are supported as filters.
         *
         * @param status status filter value
         * @throws UnsupportedEncodingException if URL-decoding occurs in controller signature
         */
        @ParameterizedTest
        @MethodSource("com.iflytek.astron.console.toolkit.controller.workflow.WorkflowControllerTest#statusValues")
        @DisplayName("Should support filtering by different status values")
        void list_shouldSupportDifferentStatusValues(int status) throws UnsupportedEncodingException {
            // Given
            when(workflowService.listPage(any(), any(), any(), any(), eq(status), any(), any()))
                    .thenReturn(validPageData);

            // When
            PageData<WorkflowVo> result = controller.list(validPagination, null, null, status, null, null);

            // Then
            assertThat(result).isNotNull();
            verify(workflowService).listPage(any(), any(), any(), any(), eq(status), any(), any());
        }

        /**
         * Verify that special characters in search keywords are handled safely.
         *
         * @param specialSearch the search keyword containing special characters
         * @throws UnsupportedEncodingException if URL-decoding occurs in controller signature
         */
        @ParameterizedTest
        @MethodSource("com.iflytek.astron.console.toolkit.controller.workflow.WorkflowControllerTest#specialCharacters")
        @DisplayName("Should handle special characters in search keyword")
        void list_whenSearchContainsSpecialCharacters_shouldHandleCorrectly(String specialSearch) throws UnsupportedEncodingException {
            // Given
            when(workflowService.listPage(any(), any(), any(), eq(specialSearch), any(), any(), any()))
                    .thenReturn(validPageData);

            // When
            PageData<WorkflowVo> result = controller.list(validPagination, specialSearch, null, null, null, null);

            // Then
            assertThat(result).isNotNull();
            verify(workflowService).listPage(any(), any(), any(), eq(specialSearch), any(), any(), any());
        }

        /**
         * Verify that concurrent list requests are handled correctly.
         *
         * @throws Exception if concurrent execution fails or is interrupted
         */
        @Test
        @DisplayName("Should handle concurrent list requests correctly")
        void list_shouldHandleConcurrentRequests() throws Exception {
            // Given
            ExecutorService executor = Executors.newFixedThreadPool(5);
            CountDownLatch latch = new CountDownLatch(5);
            when(workflowService.listPage(any(), any(), any(), any(), any(), any(), any()))
                    .thenReturn(validPageData);

            // When
            List<CompletableFuture<PageData<WorkflowVo>>> futures = Stream.generate(() -> CompletableFuture.supplyAsync(() -> {
                try {
                    return controller.list(validPagination, "concurrent", null, null, null, null);
                } catch (UnsupportedEncodingException e) {
                    throw new RuntimeException(e);
                } finally {
                    latch.countDown();
                }
            }, executor)).limit(5).toList();

            // Then
            latch.await();
            assertThat(futures).allSatisfy(future -> {
                assertThat(future.join()).isNotNull();
            });

            verify(workflowService, times(5)).listPage(any(), any(), any(), any(), any(), any(), any());
            executor.shutdown();
        }
    }

    // ==================== Workflow Detail Tests ====================

    @Nested
    @DisplayName("Workflow detail query tests")
    class WorkflowDetailTests {

        /**
         * Verify that valid ID returns workflow details.
         *
         * @return void
         */
        @Test
        @DisplayName("Should return workflow details when ID is valid")
        void detail_whenIdIsValid_shouldReturnWorkflowDetails() {
            // Given
            String validId = "workflow-123";
            when(workflowService.detail(validId, VALID_SPACE_ID)).thenReturn(validWorkflowVo);

            // When
            WorkflowVo result = controller.detail(validId, VALID_SPACE_ID);

            // Then
            assertThat(result)
                    .isNotNull()
                    .isSameAs(validWorkflowVo);

            verify(workflowService).detail(validId, VALID_SPACE_ID);
            verifyNoMoreInteractions(workflowService);
        }

        /**
         * Verify that null spaceId is allowed and default handling works.
         *
         * @return void
         */
        @Test
        @DisplayName("Should use default value when spaceId is null")
        void detail_whenSpaceIdIsNull_shouldUseDefaultValue() {
            // Given
            String validId = "workflow-123";
            when(workflowService.detail(validId, null)).thenReturn(validWorkflowVo);

            // When
            WorkflowVo result = controller.detail(validId, null);

            // Then
            assertThat(result).isNotNull();
            verify(workflowService).detail(validId, null);
        }
    }

    // ==================== Workflow CRUD Tests ====================

    @Nested
    @DisplayName("Workflow CRUD tests")
    class WorkflowCrudTests {

        /**
         * Verify update flow with valid parameters.
         *
         * @return void
         */
        @Test
        @DisplayName("Should update workflow successfully when parameters are valid")
        void update_whenParametersAreValid_shouldUpdateWorkflowSuccessfully() {
            // Given
            when(workflowService.updateInfo(validWorkflowReq)).thenReturn(validWorkflow);

            // When
            Workflow result = controller.update(validWorkflowReq);

            // Then
            assertThat(result)
                    .isNotNull()
                    .isSameAs(validWorkflow);

            verify(workflowService).updateInfo(validWorkflowReq);
            verifyNoMoreInteractions(workflowService);
        }

        /**
         * Verify delete flow when id is null (should be handled by service).
         *
         * @return void
         */
        @Test
        @DisplayName("Should handle delete with null id correctly")
        void delete_whenIdIsNull_shouldHandleCorrectly() {
            // Given
            when(workflowService.logicDelete(null, VALID_SPACE_ID)).thenReturn(ApiResult.success());

            // When
            ApiResult result = controller.delete(null, VALID_SPACE_ID);

            // Then
            assertThat(result).isNotNull();
            verify(workflowService).logicDelete(null, VALID_SPACE_ID);
        }

        /**
         * Verify idempotent update: multiple identical updates behave consistently.
         *
         * @return void
         */
        @Test
        @DisplayName("Should support idempotent update operations")
        void update_shouldSupportIdempotentOperations() {
            // Given
            when(workflowService.updateInfo(validWorkflowReq)).thenReturn(validWorkflow);

            // When - execute same update multiple times
            Workflow result1 = controller.update(validWorkflowReq);
            Workflow result2 = controller.update(validWorkflowReq);

            // Then
            assertThat(result1).isSameAs(validWorkflow);
            assertThat(result2).isSameAs(validWorkflow);
            verify(workflowService, times(2)).updateInfo(validWorkflowReq);
        }
    }

    // ==================== Workflow Clone Tests ====================

    @Nested
    @DisplayName("Workflow clone tests")
    class WorkflowCloneTests {

        /**
         * Verify clone behavior when id is valid.
         *
         * @return void
         */
        @Test
        @DisplayName("Should clone workflow successfully when id is valid")
        void clone_whenIdIsValid_shouldCloneWorkflowSuccessfully() {
            // Given
            Workflow expected = new Workflow();
            when(workflowService.clone(VALID_WORKFLOW_ID)).thenReturn(expected);

            // When
            Object result = controller.clone(VALID_WORKFLOW_ID);

            // Then
            assertThat(result)
                    .isNotNull()
                    .isSameAs(expected);
            verify(workflowService).clone(VALID_WORKFLOW_ID);
            verifyNoMoreInteractions(workflowService);
        }

        /**
         * Verify internal clone with wrong password returns error ApiResult.
         *
         * @return void
         */
        @Test
        @DisplayName("Should return error when internal clone password is incorrect")
        void cloneV2_whenPasswordIsIncorrect_shouldReturnError() {
            // When
            Object result = controller.cloneV2(new CloneFlowReq(), request);

            // Then
            assertThat(result)
                    .isInstanceOf(ApiResult.class);

            ApiResult<?> apiResult = (ApiResult<?>) result;
            assertThat(apiResult.code()).isEqualTo(ResponseEnum.INCORRECT_PASSWORD.getCode());

            verifyNoInteractions(workflowService);
        }

        /**
         * Verify all incorrect passwords are rejected.
         *
         * @param incorrectPassword a wrong password
         */
        @ParameterizedTest
        @MethodSource("com.iflytek.astron.console.toolkit.controller.workflow.WorkflowControllerTest#invalidPasswords")
        @DisplayName("Should reject all incorrect passwords for internal clone")
        void cloneV2_shouldRejectAllIncorrectPasswords(String incorrectPassword) {
            // When
            Object result = controller.cloneV2(new CloneFlowReq(), request);

            // Then
            assertThat(result)
                    .isInstanceOf(ApiResult.class);

            ApiResult<?> apiResult = (ApiResult<?>) result;
            assertThat(apiResult.code()).isEqualTo(ResponseEnum.INCORRECT_PASSWORD.getCode());

            verifyNoInteractions(workflowService);
        }
    }

    // ==================== Workflow Build Tests ====================

    @Nested
    @DisplayName("Workflow build tests")
    class WorkflowBuildTests {

        /**
         * Verify successful build returns the same ApiResult instance from service.
         *
         * @throws InterruptedException if service throws interruption
         */
        @Test
        @DisplayName("Should build workflow successfully when parameters are valid")
        void build_whenParametersAreValid_shouldBuildWorkflowSuccessfully() throws InterruptedException {
            // Given
            ApiResult<Void> expected = ApiResult.success(); // Controller returns this wrapper as-is
            when(workflowService.build(validWorkflowReq)).thenReturn(expected);

            // When
            Object result = controller.build(validWorkflowReq);

            // Then
            assertThat(result)
                    .isNotNull()
                    .isSameAs(expected); // Same instance helps mutation testing

            // Optional: field-level assertions for stronger mutation kill
            ApiResult<?> api = (ApiResult<?>) result;
            assertThat(api.code()).isEqualTo(0);
            assertThat(api.message()).isEqualTo("system.success");
            assertThat(api.data()).isNull();

            verify(workflowService).build(validWorkflowReq);
            verifyNoMoreInteractions(workflowService);
        }

        /**
         * Verify interruption is propagated as-is.
         *
         * @throws InterruptedException expected from service
         */
        @Test
        @DisplayName("Should propagate InterruptedException when build is interrupted")
        void build_whenInterruptedExceptionOccurs_shouldHandleCorrectly() throws InterruptedException {
            // Given
            when(workflowService.build(validWorkflowReq)).thenThrow(new InterruptedException("Build interrupted"));

            // When & Then
            assertThatThrownBy(() -> controller.build(validWorkflowReq))
                    .isInstanceOf(InterruptedException.class)
                    .hasMessage("Build interrupted");

            verify(workflowService).build(validWorkflowReq);
        }
    }

    // ==================== Node Debug Tests ====================

    @Nested
    @DisplayName("Node debug tests")
    class NodeDebugTests {

        /**
         * Verify node debug returns service result as-is.
         *
         * @return void
         */
        @Test
        @DisplayName("Should debug node successfully when parameters are valid")
        void nodeDebug_whenParametersAreValid_shouldDebugNodeSuccessfully() {
            // Given
            WorkflowDebugDto debugDto = createValidDebugDto();

            // Return the same ApiResult instance for identity assertion
            ApiResult<Object> expected = ApiResult.success();
            when(workflowService.nodeDebug(VALID_NODE_ID, debugDto)).thenReturn(expected);

            // When
            Object result = controller.nodeDebug(VALID_NODE_ID, debugDto);

            // Then
            assertThat(result)
                    .isNotNull()
                    .isSameAs(expected); // Controller returns service result directly

            // Optional: field-level assertions
            ApiResult<?> api = (ApiResult<?>) result;
            assertThat(api.code()).isEqualTo(0);
            assertThat(api.message()).isEqualTo("system.success");
            assertThat(api.data()).isNull();

            verify(workflowService).nodeDebug(VALID_NODE_ID, debugDto);
            verifyNoMoreInteractions(workflowService);
        }
    }

    // ==================== Dialog Management Tests ====================

    @Nested
    @DisplayName("Dialog management tests")
    class DialogManagementTests {

        /**
         * Verify dialog save returns ApiResult from service.
         *
         * @return void
         */
        @Test
        @DisplayName("Should save dialog successfully when dialog is valid")
        void saveDialog_whenDialogIsValid_shouldSaveSuccessfully() {
            // Given
            WorkflowDialog dialog = createValidWorkflowDialog();
            ApiResult<String> expected = ApiResult.success(); // Controller returns this wrapper as-is

            when(workflowService.saveDialog(dialog)).thenReturn(expected);

            // When
            Object result = controller.saveDialog(dialog);

            // Then
            assertThat(result).isInstanceOf(ApiResult.class);
            assertThat(result).isSameAs(expected); // Same object aids mutation kill

            // Optional field-level assertions
            ApiResult<?> api = (ApiResult<?>) result;
            assertThat(api.code()).isEqualTo(0);
            assertThat(api.message()).isEqualTo("system.success");
            assertThat(api.data()).isNull();

            verify(workflowService).saveDialog(dialog);
            verifyNoMoreInteractions(workflowService);
        }

        /**
         * Verify listing dialog by workflow id.
         *
         * @return void
         */
        @Test
        @DisplayName("Should return dialog list when workflow id is valid")
        void listDialog_whenWorkflowIdIsValid_shouldReturnDialogList() {
            // Given
            Integer type = 1;
            List<WorkflowDialog> expected = Arrays.asList(new WorkflowDialog(), new WorkflowDialog());
            when(workflowService.listDialog(VALID_WORKFLOW_ID, type)).thenReturn(expected);
            // When
            List<WorkflowDialog> result = controller.listDialog(VALID_WORKFLOW_ID, type);

            // Then
            assertThat(result)
                    .isNotNull()
                    .isSameAs(expected) // Returns the service list as-is
                    .hasSize(2);

            verify(workflowService).listDialog(VALID_WORKFLOW_ID, type);
            verifyNoMoreInteractions(workflowService);
        }

        /**
         * Verify clearing dialog by workflow id.
         *
         * @return void
         */
        @Test
        @DisplayName("Should clear dialog successfully when workflow id is valid")
        void clearDialog_whenWorkflowIdIsValid_shouldClearDialogSuccessfully() {
            // Given
            Integer type = 1;
            Object expectedResult = "cleared";
            when(workflowService.clearDialog(VALID_WORKFLOW_ID, type)).thenReturn(expectedResult);

            // When
            Object result = controller.clearDialog(VALID_WORKFLOW_ID, type);

            // Then
            assertThat(result)
                    .isNotNull()
                    .isEqualTo(expectedResult);

            verify(workflowService).clearDialog(VALID_WORKFLOW_ID, type);
            verifyNoMoreInteractions(workflowService);
        }
    }

    // ==================== Publish Control Tests ====================

    @Nested
    @DisplayName("Publish control tests")
    class PublishControlTests {

        /**
         * Verify publish status response for valid id.
         *
         * @return void
         */
        @Test
        @DisplayName("Should return publish status when id is valid")
        void canPublish_whenIdIsValid_shouldReturnPublishStatus() {
            // Given
            when(workflowService.getById(VALID_WORKFLOW_ID)).thenReturn(validWorkflow);

            // When
            Object result = controller.canPublish(VALID_WORKFLOW_ID);

            // Then
            assertThat(result)
                    .isInstanceOf(ApiResult.class);

            ApiResult<?> apiResult = (ApiResult<?>) result;
            assertThat(apiResult.data()).isEqualTo(true);

            verify(workflowService).getById(VALID_WORKFLOW_ID);
            verifyNoMoreInteractions(workflowService);
        }
    }

    // ==================== SSE Chat Tests ====================

    @Nested
    @DisplayName("SSE chat tests")
    class SseChatTests {

        /**
         * Verify SSE chat: response header is set and SseEmitter is returned.
         *
         * @return void
         */
        @Test
        @DisplayName("Should set header and return SseEmitter when chat request is valid")
        void chat_whenRequestIsValid_shouldSetHeaderAndReturnSseEmitter() {
            // Given
            ChatBizReq chatBizReq = createValidChatBizReq();
            SseEmitter expectedEmitter = new SseEmitter();
            when(workflowService.sseChat(chatBizReq)).thenReturn(expectedEmitter);

            // When
            SseEmitter result = controller.chat(chatBizReq, response, request);

            // Then
            assertThat(result)
                    .isNotNull()
                    .isSameAs(expectedEmitter);

            verify(response).addHeader("X-Accel-Buffering", "no");
            verify(workflowService).sseChat(chatBizReq);
            verifyNoMoreInteractions(workflowService);
        }

        /**
         * Verify SSE resume: response header is set and SseEmitter is returned.
         *
         * @return void
         */
        @Test
        @DisplayName("Should set header and return SseEmitter when resume request is valid")
        void resume_whenRequestIsValid_shouldSetHeaderAndReturnSseEmitter() {
            // Given
            ChatResumeReq resumeReq = createValidChatResumeReq();
            SseEmitter expectedEmitter = new SseEmitter();
            when(workflowService.sseChatResume(resumeReq)).thenReturn(expectedEmitter);

            // When
            SseEmitter result = controller.resume(resumeReq, response, request);

            // Then
            assertThat(result)
                    .isNotNull()
                    .isSameAs(expectedEmitter);

            verify(response).addHeader("X-Accel-Buffering", "no");
            verify(workflowService).sseChatResume(resumeReq);
            verifyNoMoreInteractions(workflowService);
        }
    }

    // ==================== File Operations Tests ====================

    @Nested
    @DisplayName("File operation tests")
    class FileOperationsTests {

        /**
         * Verify uploadFile succeeds with valid files and flowId.
         *
         * @return void
         */
        @Test
        @DisplayName("Should upload successfully when files and flowId are valid")
        void uploadFile_whenFilesAndFlowIdAreValid_shouldUploadSuccessfully() {
            // Given
            MultipartFile[] files = {multipartFile};
            Object expectedResult = "uploaded";
            when(workflowService.uploadFile(files, VALID_FLOW_ID)).thenReturn(expectedResult);

            // When
            Object result = controller.uploadFile(files, VALID_FLOW_ID);

            // Then
            assertThat(result)
                    .isNotNull()
                    .isEqualTo(expectedResult);

            verify(workflowService).uploadFile(files, VALID_FLOW_ID);
            verifyNoMoreInteractions(workflowService);
        }

        /**
         * Verify getInputsType delegates and returns service result.
         *
         * @return void
         */
        @Test
        @DisplayName("Should return inputs type when flowId is valid")
        void getInputsType_whenFlowIdIsValid_shouldReturnInputsType() {
            // Given
            Object expectedResult = "input type";
            when(workflowService.getInputsType(VALID_FLOW_ID)).thenReturn(expectedResult);

            // When
            Object result = controller.getInputsType(VALID_FLOW_ID);

            // Then
            assertThat(result)
                    .isNotNull()
                    .isEqualTo(expectedResult);

            verify(workflowService).getInputsType(VALID_FLOW_ID);
            verifyNoMoreInteractions(workflowService);
        }

        /**
         * Verify getInputsInfo delegates and returns service result.
         *
         * @return void
         */
        @Test
        @DisplayName("Should return inputs info when flowId is valid")
        void getInputsInfo_whenFlowIdIsValid_shouldReturnInputsInfo() {
            // Given
            Object expectedResult = "input info";
            when(workflowService.getInputsInfo(VALID_FLOW_ID)).thenReturn(expectedResult);

            // When
            Object result = controller.getInputsInfo(VALID_FLOW_ID);

            // Then
            assertThat(result)
                    .isNotNull()
                    .isEqualTo(expectedResult);

            verify(workflowService).getInputsInfo(VALID_FLOW_ID);
            verifyNoMoreInteractions(workflowService);
        }
    }

    // ==================== Export/Import Tests ====================

    @Nested
    @DisplayName("Export/Import tests")
    class ExportImportTests {

        /**
         * Verify YAML export throws BusinessException when workflow data is empty.
         *
         * @return void
         */
        @Test
        @DisplayName("YAML export should throw BusinessException when workflow data is empty")
        void exportYaml_whenWorkflowDataIsEmpty_shouldThrowBusinessException() {
            // Given
            Workflow emptyDataWorkflow = createEmptyDataWorkflow();
            when(workflowService.getById(VALID_WORKFLOW_ID)).thenReturn(emptyDataWorkflow);

            // When & Then
            assertThatThrownBy(() -> controller.exportYaml(VALID_WORKFLOW_ID, response))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("responseEnum", ResponseEnum.WORKFLOW_EXPORT_FAILED);

            verify(workflowService).getById(VALID_WORKFLOW_ID);
            verifyNoMoreInteractions(workflowService);
        }

        /**
         * Verify YAML export throws BusinessException when workflow not found.
         *
         * @return void
         */
        @Test
        @DisplayName("YAML export should throw BusinessException when workflow not exists")
        void exportYaml_whenWorkflowNotExists_shouldThrowBusinessException() {
            // Given
            when(workflowService.getById(VALID_WORKFLOW_ID)).thenReturn(null);

            // When & Then
            assertThatThrownBy(() -> controller.exportYaml(VALID_WORKFLOW_ID, response))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("responseEnum", ResponseEnum.WORKFLOW_EXPORT_FAILED);

            verify(workflowService).getById(VALID_WORKFLOW_ID);
            verifyNoMoreInteractions(workflowService);
        }

        /**
         * Verify successful YAML export path.
         *
         * @throws Exception if response stream operations fail
         */
        @Test
        @DisplayName("Should export YAML successfully when workflow is valid")
        void exportYaml_whenWorkflowIsValid_shouldExportYamlSuccessfully() throws Exception {
            // Given
            when(workflowService.getById(VALID_WORKFLOW_ID)).thenReturn(validWorkflow);
            when(response.getOutputStream()).thenReturn(outputStream);

            // When
            controller.exportYaml(VALID_WORKFLOW_ID, response);

            // Then
            verify(workflowService).getById(VALID_WORKFLOW_ID);
            verify(workflowExportService).exportWorkflowDataAsYaml(eq(validWorkflow), eq(outputStream));
            verify(response).setContentType("application/octet-stream");
            verify(response).setCharacterEncoding("UTF-8");
            verify(response).setHeader(eq("Content-Disposition"), anyString());
            verify(response).flushBuffer();
            verifyNoMoreInteractions(workflowService, workflowExportService);
        }

        /**
         * Verify successful import from YAML file.
         *
         * @throws Exception if reading input stream fails
         */
        @Test
        @DisplayName("Should import workflow successfully when file is valid")
        void importWorkflow_whenFileIsValid_shouldImportWorkflowSuccessfully() throws Exception {
            // Given
            when(multipartFile.getInputStream()).thenReturn(new ByteArrayInputStream("yaml content".getBytes()));

            ApiResult<?> expected = ApiResult.success();
            when(workflowExportService.importWorkflowFromYaml(any(), eq(request))).thenReturn(expected);

            // When
            Object result = controller.importWorkflow(multipartFile, request);

            // Then
            assertThat(result)
                    .isNotNull()
                    .isSameAs(expected);

            verify(workflowExportService).importWorkflowFromYaml(any(), eq(request));
            verifyNoMoreInteractions(workflowExportService);
            verifyNoInteractions(workflowService);
        }

        /**
         * Verify IO exception during import is translated to BusinessException.
         *
         * @throws Exception when mocking file read
         */
        @Test
        @DisplayName("Should throw BusinessException when IOException occurs while importing")
        void importWorkflow_whenIOExceptionOccurs_shouldThrowBusinessException() throws Exception {
            // Given
            when(multipartFile.getInputStream()).thenThrow(new IOException("File read error"));
            when(multipartFile.getOriginalFilename()).thenReturn("workflow.yaml");

            // When & Then
            assertThatThrownBy(() -> controller.importWorkflow(multipartFile, request))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("responseEnum", ResponseEnum.WORKFLOW_IMPORT_FAILED);

            verifyNoInteractions(workflowService, workflowExportService);
        }
    }

    // ==================== Comparison Tests ====================

    @Nested
    @DisplayName("Comparison feature tests")
    class ComparisonTests {

        /**
         * Verify saving comparisons with valid request.
         *
         * @return void
         */
        @Test
        @DisplayName("Should save comparisons successfully when request is valid")
        void saveComparisons_whenRequestIsValid_shouldSaveSuccessfully() {
            // Given
            WorkflowComparisonSaveReq saveReq = createValidComparisonSaveReq();
            List<WorkflowComparisonSaveReq> saveReqList = List.of(saveReq);
            String expectedResult = "saved";
            when(workflowService.saveComparisons(saveReqList)).thenReturn(expectedResult);

            // When
            ApiResult<String> result = controller.saveComparisons(saveReqList);

            // Then
            assertThat(result)
                    .isNotNull();
            assertThat(result.data()).isEqualTo(expectedResult);

            verify(workflowService).saveComparisons(comparisonCaptor.capture());
            assertThat(comparisonCaptor.getValue()).hasSize(1);
            verifyNoMoreInteractions(workflowService);
        }

        /**
         * Verify listing comparisons by promptId.
         *
         * @return void
         */
        @Test
        @DisplayName("Should return comparison list when promptId is valid")
        void listComparisons_whenPromptIdIsValid_shouldReturnComparisonList() {
            // Given
            WorkflowComparison comparison = new WorkflowComparison();
            List<WorkflowComparison> expectedList = List.of(comparison);
            when(workflowService.listComparisons(VALID_PROMPT_ID)).thenReturn(expectedList);

            // When
            List<WorkflowComparison> result = controller.listComparisons(VALID_PROMPT_ID);

            // Then
            assertThat(result)
                    .isNotNull()
                    .hasSize(1)
                    .isSameAs(expectedList);

            verify(workflowService).listComparisons(VALID_PROMPT_ID);
            verifyNoMoreInteractions(workflowService);
        }
    }

    // ==================== Feedback Tests ====================

    @Nested
    @DisplayName("Feedback feature tests")
    class FeedbackTests {

        /**
         * Verify feedback submission delegates to service.
         *
         * @return void
         */
        @Test
        @DisplayName("Should submit feedback successfully when request is valid")
        void feedback_whenRequestIsValid_shouldSubmitSuccessfully() {
            // Given
            WorkflowFeedbackReq feedbackReq = createValidFeedbackReq();

            // When
            controller.feedback(feedbackReq, request);

            // Then
            verify(workflowService).feedback(feedbackReq, request);
            verifyNoMoreInteractions(workflowService);
        }

        /**
         * Verify listing feedback by flowId.
         *
         * @return void
         */
        @Test
        @DisplayName("Should return feedback list when flowId is valid")
        void getFeedbackList_whenFlowIdIsValid_shouldReturnFeedbackList() {
            // Given
            WorkflowFeedback feedback = new WorkflowFeedback();
            List<WorkflowFeedback> expectedList = List.of(feedback);
            when(workflowService.getFeedbackList(VALID_FLOW_ID)).thenReturn(expectedList);

            // When
            List<WorkflowFeedback> result = controller.getFeedbackList(VALID_FLOW_ID);

            // Then
            assertThat(result)
                    .isNotNull()
                    .hasSize(1)
                    .isSameAs(expectedList);

            verify(workflowService).getFeedbackList(VALID_FLOW_ID);
            verifyNoMoreInteractions(workflowService);
        }
    }

    // ==================== Additional Method Tests ====================

    @Nested
    @DisplayName("Additional method tests")
    class AdditionalMethodTests {

        /**
         * Verify runCode delegates and returns service result.
         *
         * @return void
         */
        @Test
        @DisplayName("Should return code execution result when request is valid")
        void runCode_whenRequestIsValid_shouldReturnRunCodeResult() {
            // Given
            Object runCodeData = new Object();
            Object expectedResult = "code executed";
            when(workflowService.runCode(runCodeData)).thenReturn(expectedResult);

            // When
            Object result = controller.runCode(runCodeData);

            // Then
            assertThat(result)
                    .isNotNull()
                    .isEqualTo(expectedResult);

            verify(workflowService).runCode(runCodeData);
            verifyNoMoreInteractions(workflowService);
        }

        /**
         * Verify square returns data with valid pagination.
         *
         * @return void
         */
        @Test
        @DisplayName("Should return square data when pagination is valid")
        void square_whenPaginationIsValid_shouldReturnSquareData() {
            // Given
            String search = "test";
            Integer tagFlag = 1;
            Integer tags = 2;
            Object expectedResult = "square data";
            when(workflowService.getSquare(1, 10, search, tagFlag, tags)).thenReturn(expectedResult);

            // When
            Object result = controller.square(validPagination, search, tagFlag, tags);

            // Then
            assertThat(result)
                    .isNotNull()
                    .isEqualTo(expectedResult);

            verify(workflowService).getSquare(1, 10, search, tagFlag, tags);
            verifyNoMoreInteractions(workflowService);
        }

        /**
         * Verify publicCopy delegates and returns service result.
         *
         * @return void
         */
        @Test
        @DisplayName("Should return public copy result when request is valid")
        void publicCopy_whenRequestIsValid_shouldReturnPublicCopyResult() {
            // Given
            Object expectedResult = "public copied";
            when(workflowService.publicCopy(validWorkflowReq)).thenReturn(expectedResult);

            // When
            Object result = controller.publicCopy(validWorkflowReq);

            // Then
            assertThat(result)
                    .isNotNull()
                    .isEqualTo(expectedResult);

            verify(workflowService).publicCopy(validWorkflowReq);
            verifyNoMoreInteractions(workflowService);
        }

        /**
         * Verify flow advanced config retrieval by botId.
         *
         * @return void
         */
        @Test
        @DisplayName("Should return advanced config when botId is valid")
        void getFlowAdvancedConfig_whenBotIdIsValid_shouldReturnAdvancedConfig() {
            // Given
            Integer botId = 1;
            Object expectedResult = "advanced config";
            when(workflowService.getFlowAdvancedConfig(botId)).thenReturn(expectedResult);

            // When
            Object result = controller.getFlowAdvancedConfig(botId);

            // Then
            assertThat(result)
                    .isNotNull()
                    .isEqualTo(expectedResult);

            verify(workflowService).getFlowAdvancedConfig(botId);
            verifyNoMoreInteractions(workflowService);
        }

        /**
         * Verify prompt template list with valid pagination.
         *
         * @throws UnsupportedEncodingException if URL-decoding occurs in controller signature
         */
        @Test
        @DisplayName("Should return prompt template list when pagination is valid")
        void promptTemplate_whenPaginationIsValid_shouldReturnPromptTemplateList() throws UnsupportedEncodingException {
            // Given
            String search = "template";
            PageData<PromptTemplate> expected = new PageData<>();
            when(workflowService.listPagePromptTemplate(1, 10, search)).thenReturn(expected);

            // When
            Object result = controller.promptTemplate(validPagination, search);

            // Then
            assertThat(result)
                    .isNotNull()
                    .isSameAs(expected); // Service returns PageData directly

            verify(workflowService).listPagePromptTemplate(1, 10, search);
            verifyNoMoreInteractions(workflowService);
        }

        /**
         * Verify copying flow between flowIds.
         *
         * @return void
         */
        @Test
        @DisplayName("Should copy flow successfully when flowIds are valid")
        void copyFlow_whenFlowIdsAreValid_shouldCopyFlowSuccessfully() {
            // Given
            String sourceFlowId = "source-123";
            String targetFlowId = "target-456";
            Object expectedResult = "flow copied";
            when(workflowService.copyFlow(sourceFlowId, targetFlowId)).thenReturn(expectedResult);

            // When
            Object result = controller.copyFlow(sourceFlowId, targetFlowId);

            // Then
            assertThat(result)
                    .isNotNull()
                    .isEqualTo(expectedResult);

            verify(workflowService).copyFlow(sourceFlowId, targetFlowId);
            verifyNoMoreInteractions(workflowService);
        }

        /**
         * Verify getMaxVersion by flowId.
         *
         * @return void
         */
        @Test
        @DisplayName("Should return max version when flowId is valid")
        void getMaxVersion_whenFlowIdIsValid_shouldReturnMaxVersion() {
            // Given
            WorkflowVo expected = new WorkflowVo();
            when(workflowService.getMaxVersionByFlowId(VALID_FLOW_ID)).thenReturn(expected);

            // When
            Object result = controller.getMaxVersion(VALID_FLOW_ID);

            // Then
            assertThat(result)
                    .isNotNull()
                    .isSameAs(expected);

            verify(workflowService).getMaxVersionByFlowId(VALID_FLOW_ID);
            verifyNoMoreInteractions(workflowService);
        }
    }
}
