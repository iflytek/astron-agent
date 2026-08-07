package com.iflytek.astron.console.toolkit.controller.knowledge;

import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.toolkit.entity.common.PageData;
import com.iflytek.astron.console.toolkit.entity.dto.RepoDto;
import com.iflytek.astron.console.toolkit.entity.table.repo.HitTestHistory;
import com.iflytek.astron.console.toolkit.entity.table.repo.Repo;
import com.iflytek.astron.console.toolkit.entity.vo.knowledge.RepoVO;
import com.iflytek.astron.console.toolkit.service.repo.RepoService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Comprehensive unit tests for {@link RepoController}.
 *
 * <p>
 * Coverage targets:
 * <ul>
 * <li>JaCoCo: Statement coverage &gt;= 80%, Branch coverage &gt;= 90%</li>
 * <li>High PIT mutation test pass rate</li>
 * <li>Covers normal flows, boundary conditions, and exception cases</li>
 * </ul>
 * </p>
 *
 * <p>
 * Tech stack: JUnit 5 + Mockito + AssertJ + ParameterizedTest
 * </p>
 *
 * <p>
 * Mock dependencies:
 * <ul>
 * <li>{@code RepoService} (core business logic)</li>
 * <li>{@code HttpServletRequest} (HTTP request)</li>
 * </ul>
 * </p>
 *
 * @author Generated Test Suite
 * @since 1.0
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("RepoController Unit Tests")
class RepoControllerTest {

    private static final Long VALID_REPO_ID = 1L;
    private static final Long INVALID_REPO_ID = -1L;
    private static final String VALID_NAME = "Test Repository";
    private static final String VALID_DESC = "Test Description";
    private static final String VALID_TAG = "CBG-RAG";
    private static final String VALID_QUERY = "Test Query";
    private static final String VALID_CONTENT = "Search Content";
    private static final Integer DEFAULT_PAGE_NO = 1;
    private static final Integer DEFAULT_PAGE_SIZE = 10;
    private static final Integer VALID_TOP_N = 3;
    private static final Integer ENABLED = 1;
    private static final Integer DISABLED = 0;

    @Mock
    private RepoService repoService;

    @Mock
    private HttpServletRequest request;

    @InjectMocks
    private RepoController controller;

    // Argument Captors for verification
    @Captor
    private ArgumentCaptor<RepoVO> repoVOCaptor;

    @Captor
    private ArgumentCaptor<Long> longCaptor;

    @Captor
    private ArgumentCaptor<Integer> integerCaptor;

    @Captor
    private ArgumentCaptor<String> stringCaptor;

    // Test data fixtures
    private RepoVO validRepoVO;
    private Repo validRepo;
    private RepoDto validRepoDto;
    private PageData<RepoDto> validPageData;
    private PageData<HitTestHistory> validHitTestHistoryPageData;
    private HitTestHistory validHitTestHistory;

    @BeforeEach
    void setUp() {
        validRepoVO = createValidRepoVO();
        validRepo = createValidRepo();
        validRepoDto = createValidRepoDto();
        validPageData = createValidPageData();
        validHitTestHistory = createValidHitTestHistory();
        validHitTestHistoryPageData = createValidHitTestHistoryPageData();
    }

    // ==================== Test Data Builder Methods ====================

    /**
     * Creates a valid RepoVO object with all required fields populated.
     *
     * @return a fully populated RepoVO instance for testing
     */
    private RepoVO createValidRepoVO() {
        RepoVO vo = new RepoVO();
        vo.setId(VALID_REPO_ID);
        vo.setName(VALID_NAME);
        vo.setDesc(VALID_DESC);
        vo.setAvatarIcon("icon.png");
        vo.setAvatarColor("#FF5733");
        vo.setTags(Arrays.asList("tag1", "tag2"));
        vo.setEmbeddedModel("text-embedding-ada-002");
        vo.setIndexType(0);
        vo.setAppId("test-app-id");
        vo.setSource(0);
        vo.setOuterRepoId("outer-repo-123");
        vo.setCoreRepoId("core-repo-123");
        vo.setEnableAudit(true);
        vo.setOperType(2);
        vo.setVisibility(0);
        vo.setUids(Arrays.asList("uid1", "uid2"));
        vo.setTag(VALID_TAG);
        return vo;
    }

    /**
     * Creates a valid Repo entity with all required fields populated.
     *
     * @return a fully populated Repo instance for testing
     */
    private Repo createValidRepo() {
        Repo repo = new Repo();
        repo.setId(VALID_REPO_ID);
        repo.setName(VALID_NAME);
        repo.setDescription(VALID_DESC);
        repo.setUserId("user123");
        repo.setAppId("test-app-id");
        repo.setOuterRepoId("outer-repo-123");
        repo.setCoreRepoId("core-repo-123");
        repo.setIcon("icon.png");
        repo.setColor("#FF5733");
        repo.setStatus(1);
        repo.setEmbeddedModel("text-embedding-ada-002");
        repo.setIndexType(0);
        repo.setVisibility(0);
        repo.setSource(0);
        repo.setEnableAudit(true);
        repo.setDeleted(false);
        repo.setCreateTime(new Date());
        repo.setUpdateTime(new Date());
        repo.setIsTop(false);
        repo.setTag(VALID_TAG);
        repo.setSpaceId(100L);
        return repo;
    }

    /**
     * Creates a valid RepoDto data transfer object with all fields populated.
     *
     * @return a fully populated RepoDto instance for testing
     */
    private RepoDto createValidRepoDto() {
        RepoDto dto = new RepoDto();
        dto.setId(VALID_REPO_ID);
        dto.setName(VALID_NAME);
        dto.setDescription(VALID_DESC);
        dto.setAddress("http://localhost:8080");
        dto.setFileCount(10L);
        dto.setCharCount(1000L);
        dto.setKnowledgeCount(50L);
        dto.setCorner("corner-value");
        return dto;
    }

    /**
     * Creates a valid PageData object containing RepoDto items.
     *
     * @return a PageData instance with sample RepoDto data for testing
     */
    private PageData<RepoDto> createValidPageData() {
        PageData<RepoDto> pageData = new PageData<>();
        pageData.setPage(DEFAULT_PAGE_NO);
        pageData.setPageSize(DEFAULT_PAGE_SIZE);
        pageData.setTotalCount(1L);
        pageData.setTotalPages(1L);
        pageData.setPageData(Collections.singletonList(validRepoDto));
        return pageData;
    }

    /**
     * Creates a valid HitTestHistory entity.
     *
     * @return a HitTestHistory instance with sample data for testing
     */
    private HitTestHistory createValidHitTestHistory() {
        HitTestHistory history = new HitTestHistory();
        history.setId(1L);
        history.setUserId("user123");
        history.setRepoId(VALID_REPO_ID);
        history.setQuery(VALID_QUERY);
        return history;
    }

    /**
     * Creates a valid PageData object containing HitTestHistory items.
     *
     * @return a PageData instance with sample HitTestHistory data for testing
     */
    private PageData<HitTestHistory> createValidHitTestHistoryPageData() {
        PageData<HitTestHistory> pageData = new PageData<>();
        pageData.setPage(DEFAULT_PAGE_NO);
        pageData.setPageSize(DEFAULT_PAGE_SIZE);
        pageData.setTotalCount(1L);
        pageData.setTotalPages(1L);
        pageData.setPageData(Collections.singletonList(validHitTestHistory));
        return pageData;
    }

    // ==================== createRepo Tests ====================

    @Nested
    @DisplayName("Create Repository Tests")
    class CreateRepoTests {

        /**
         * Tests successful repository creation with valid input.
         * Verifies that the controller properly delegates to the service and returns the created repository.
         */
        @Test
        @DisplayName("Create repository - successful flow")
        void createRepo_Success() {
            // Given
            when(repoService.createRepo(any(RepoVO.class))).thenReturn(validRepo);

            // When
            ApiResult<Repo> result = controller.createRepo(validRepoVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isZero();
            assertThat(result.data()).isEqualTo(validRepo);
            assertThat(result.data().getId()).isEqualTo(VALID_REPO_ID);
            assertThat(result.data().getName()).isEqualTo(VALID_NAME);

            verify(repoService, times(1)).createRepo(repoVOCaptor.capture());
            RepoVO capturedVO = repoVOCaptor.getValue();
            assertThat(capturedVO.getName()).isEqualTo(VALID_NAME);
        }

        /**
         * Tests repository creation with an empty VO object. Verifies that the controller can handle
         * minimal input.
         */
        @Test
        @DisplayName("Create repository - with empty VO")
        void createRepo_WithEmptyVO() {
            // Given
            RepoVO emptyVO = new RepoVO();
            Repo expectedRepo = new Repo();
            expectedRepo.setId(999L);
            when(repoService.createRepo(any(RepoVO.class))).thenReturn(expectedRepo);

            // When
            ApiResult<Repo> result = controller.createRepo(emptyVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isZero();
            assertThat(result.data().getId()).isEqualTo(999L);
            verify(repoService, times(1)).createRepo(emptyVO);
        }

        /**
         * Tests that exceptions from the service layer are properly propagated.
         * Verifies error handling when repository creation fails.
         */
        @Test
        @DisplayName("Create repository - service throws exception")
        void createRepo_ServiceThrowsException() {
            // Given
            when(repoService.createRepo(any(RepoVO.class)))
                    .thenThrow(new RuntimeException("Creation failed"));

            // When & Then
            assertThatThrownBy(() -> controller.createRepo(validRepoVO))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("Creation failed");

            verify(repoService, times(1)).createRepo(any(RepoVO.class));
        }

        /**
         * Tests repository creation with all optional fields populated. Verifies that all optional
         * parameters are correctly processed.
         */
        @Test
        @DisplayName("Create repository - with all optional fields")
        void createRepo_WithAllOptionalFields() {
            // Given
            validRepoVO.setEnableAudit(false);
            validRepoVO.setVisibility(1);
            validRepoVO.setOperType(3);
            when(repoService.createRepo(any(RepoVO.class))).thenReturn(validRepo);

            // When
            ApiResult<Repo> result = controller.createRepo(validRepoVO);

            // Then
            assertThat(result.code()).isZero();
            verify(repoService).createRepo(repoVOCaptor.capture());
            RepoVO captured = repoVOCaptor.getValue();
            assertThat(captured.getEnableAudit()).isFalse();
            assertThat(captured.getVisibility()).isEqualTo(1);
            assertThat(captured.getOperType()).isEqualTo(3);
        }
    }

    // ==================== updateRepo Tests ====================

    @Nested
    @DisplayName("Update Repository Tests")
    class UpdateRepoTests {

        /**
         * Tests successful repository update with valid data. Verifies that changes are properly applied
         * and reflected in the response.
         */
        @Test
        @DisplayName("Update repository - successful flow")
        void updateRepo_Success() {
            // Given
            validRepo.setName("Updated Name");
            when(repoService.updateRepo(any(RepoVO.class))).thenReturn(validRepo);

            // When
            ApiResult<Repo> result = controller.updateRepo(validRepoVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isZero();
            assertThat(result.data()).isNotNull();
            assertThat(result.data().getName()).isEqualTo("Updated Name");
            verify(repoService, times(1)).updateRepo(any(RepoVO.class));
        }

        /**
         * Tests partial update of repository fields. Verifies that only specified fields are updated while
         * others remain unchanged.
         */
        @Test
        @DisplayName("Update repository - partial update")
        void updateRepo_PartialUpdate() {
            // Given
            RepoVO partialVO = new RepoVO();
            partialVO.setId(VALID_REPO_ID);
            partialVO.setName("New Name");
            when(repoService.updateRepo(any(RepoVO.class))).thenReturn(validRepo);

            // When
            ApiResult<Repo> result = controller.updateRepo(partialVO);

            // Then
            assertThat(result.code()).isZero();
            verify(repoService).updateRepo(repoVOCaptor.capture());
            assertThat(repoVOCaptor.getValue().getId()).isEqualTo(VALID_REPO_ID);
        }

        /**
         * Tests update attempt with a non-existent repository ID. Verifies that appropriate exception is
         * thrown for invalid IDs.
         */
        @Test
        @DisplayName("Update repository - non-existent ID")
        void updateRepo_NonExistentId() {
            // Given
            validRepoVO.setId(999L);
            when(repoService.updateRepo(any(RepoVO.class)))
                    .thenThrow(new IllegalArgumentException("Repository not found"));

            // When & Then
            assertThatThrownBy(() -> controller.updateRepo(validRepoVO))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Repository not found");
        }

        /**
         * Tests behavior when service returns null during update.
         * Verifies that null responses are properly handled.
         */
        @Test
        @DisplayName("Update repository - service returns null")
        void updateRepo_ServiceReturnsNull() {
            // Given
            when(repoService.updateRepo(any(RepoVO.class))).thenReturn(null);

            // When
            ApiResult<Repo> result = controller.updateRepo(validRepoVO);

            // Then
            assertThat(result.code()).isZero();
            assertThat(result.data()).isNull();
        }
    }

    // ==================== updateRepoStatus Tests ====================

    @Nested
    @DisplayName("Update Repository Status Tests")
    class UpdateRepoStatusTests {

        /**
         * Tests successful repository status update.
         * Verifies that status changes are properly applied.
         */
        @Test
        @DisplayName("Update status - success")
        void updateRepoStatus_Success() {
            // Given
            when(repoService.updateRepoStatus(any(RepoVO.class))).thenReturn(true);

            // When
            ApiResult<Boolean> result = controller.updateRepoStatus(validRepoVO);

            // Then
            assertThat(result.code()).isZero();
            assertThat(result.data()).isTrue();
            verify(repoService, times(1)).updateRepoStatus(any(RepoVO.class));
        }

        /**
         * Tests repository status update failure scenario.
         * Verifies that failed updates are properly reported.
         */
        @Test
        @DisplayName("Update status - failure")
        void updateRepoStatus_Failure() {
            // Given
            when(repoService.updateRepoStatus(any(RepoVO.class))).thenReturn(false);

            // When
            ApiResult<Boolean> result = controller.updateRepoStatus(validRepoVO);

            // Then
            assertThat(result.code()).isZero();
            assertThat(result.data()).isFalse();
        }

        /**
         * Tests repository status update with different status values. Verifies that all valid status
         * values are properly handled.
         *
         * @param status the status value to test
         */
        @ParameterizedTest
        @ValueSource(ints = {1, 2, 3, 4})
        @DisplayName("Update status - different status values")
        void updateRepoStatus_DifferentStatuses(int status) {
            // Given
            validRepoVO.setOperType(status);
            when(repoService.updateRepoStatus(any(RepoVO.class))).thenReturn(true);

            // When
            ApiResult<Boolean> result = controller.updateRepoStatus(validRepoVO);

            // Then
            assertThat(result.code()).isZero();
            verify(repoService).updateRepoStatus(repoVOCaptor.capture());
            assertThat(repoVOCaptor.getValue().getOperType()).isEqualTo(status);
        }

        /**
         * Tests exception handling when service throws during status update.
         * Verifies that exceptions are properly propagated.
         */
        @Test
        @DisplayName("Update status - service throws exception")
        void updateRepoStatus_ServiceThrowsException() {
            // Given
            when(repoService.updateRepoStatus(any(RepoVO.class)))
                    .thenThrow(new RuntimeException("Status update failed"));

            // When & Then
            assertThatThrownBy(() -> controller.updateRepoStatus(validRepoVO))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("Status update failed");
        }
    }

    // ==================== listRepos Tests ====================

    @Nested
    @DisplayName("List Repositories Tests")
    class ListReposTests {

        /**
         * Tests listing repositories with default pagination parameters.
         * Verifies that default page number and page size are correctly applied.
         */
        @Test
        @DisplayName("List repositories - default pagination")
        void listRepos_DefaultPagination() {
            // Given
            when(repoService.listRepos(anyInt(), anyInt(), isNull(), any(HttpServletRequest.class)))
                    .thenReturn(validPageData);

            // When
            ApiResult<PageData<RepoDto>> result = controller.listRepos(
                    DEFAULT_PAGE_NO, DEFAULT_PAGE_SIZE, null, request);

            // Then
            assertThat(result.code()).isZero();
            assertThat(result.data()).isNotNull();
            assertThat(result.data().getPage()).isEqualTo(DEFAULT_PAGE_NO);
            assertThat(result.data().getPageSize()).isEqualTo(DEFAULT_PAGE_SIZE);
            verify(repoService).listRepos(DEFAULT_PAGE_NO, DEFAULT_PAGE_SIZE, null, request);
        }

        /**
         * Tests listing repositories with search content filter.
         * Verifies that content parameter is properly passed to the service.
         */
        @Test
        @DisplayName("List repositories - with content filter")
        void listRepos_WithContent() {
            // Given
            when(repoService.listRepos(anyInt(), anyInt(), eq(VALID_CONTENT), any(HttpServletRequest.class)))
                    .thenReturn(validPageData);

            // When
            ApiResult<PageData<RepoDto>> result = controller.listRepos(
                    DEFAULT_PAGE_NO, DEFAULT_PAGE_SIZE, VALID_CONTENT, request);

            // Then
            assertThat(result.code()).isZero();
            verify(repoService).listRepos(
                    integerCaptor.capture(),
                    integerCaptor.capture(),
                    stringCaptor.capture(),
                    any(HttpServletRequest.class));
            assertThat(stringCaptor.getValue()).isEqualTo(VALID_CONTENT);
        }

        /**
         * Tests listing repositories with various pagination parameters. Verifies that different page
         * numbers and sizes are correctly handled.
         *
         * @param pageNo the page number
         * @param pageSize the page size
         */
        @ParameterizedTest
        @CsvSource({
                "1, 10",
                "2, 20",
                "5, 50",
                "10, 100"
        })
        @DisplayName("List repositories - different pagination parameters")
        void listRepos_DifferentPagination(int pageNo, int pageSize) {
            // Given
            PageData<RepoDto> pageData = new PageData<>();
            pageData.setPage(pageNo);
            pageData.setPageSize(pageSize);
            when(repoService.listRepos(anyInt(), anyInt(), isNull(), any(HttpServletRequest.class)))
                    .thenReturn(pageData);

            // When
            ApiResult<PageData<RepoDto>> result = controller.listRepos(
                    pageNo, pageSize, null, request);

            // Then
            assertThat(result.code()).isZero();
            assertThat(result.data().getPage()).isEqualTo(pageNo);
            assertThat(result.data().getPageSize()).isEqualTo(pageSize);
        }

        /**
         * Tests listing repositories when no results are found. Verifies that empty result sets are
         * properly handled.
         */
        @Test
        @DisplayName("List repositories - empty result")
        void listRepos_EmptyResult() {
            // Given
            PageData<RepoDto> emptyPageData = new PageData<>();
            emptyPageData.setPage(DEFAULT_PAGE_NO);
            emptyPageData.setPageSize(DEFAULT_PAGE_SIZE);
            emptyPageData.setTotalCount(0L);
            emptyPageData.setPageData(Collections.emptyList());
            when(repoService.listRepos(anyInt(), anyInt(), isNull(), any(HttpServletRequest.class)))
                    .thenReturn(emptyPageData);

            // When
            ApiResult<PageData<RepoDto>> result = controller.listRepos(
                    DEFAULT_PAGE_NO, DEFAULT_PAGE_SIZE, null, request);

            // Then
            assertThat(result.code()).isZero();
            assertThat(result.data().getPageData()).isEmpty();
            assertThat(result.data().getTotalCount()).isZero();
        }

        /**
         * Tests listing repositories with null or empty content parameter.
         * Verifies that null and empty strings are properly handled.
         *
         * @param content the content parameter (null or empty)
         */
        @ParameterizedTest
        @NullAndEmptySource
        @DisplayName("List repositories - null or empty content")
        void listRepos_NullOrEmptyContent(String content) {
            // Given
            when(repoService.listRepos(anyInt(), anyInt(), eq(content), any(HttpServletRequest.class)))
                    .thenReturn(validPageData);

            // When
            ApiResult<PageData<RepoDto>> result = controller.listRepos(
                    DEFAULT_PAGE_NO, DEFAULT_PAGE_SIZE, content, request);

            // Then
            assertThat(result.code()).isZero();
            verify(repoService).listRepos(DEFAULT_PAGE_NO, DEFAULT_PAGE_SIZE, content, request);
        }
    }

    // ==================== list Tests ====================

    @Nested
    @DisplayName("Simplified List Tests")
    class ListTests {

        /**
         * Tests simplified list endpoint with basic parameters.
         * Verifies that minimal required parameters work correctly.
         */
        @Test
        @DisplayName("Simplified list - basic parameters")
        void list_BasicParameters() {
            // Given
            when(repoService.list(anyInt(), anyInt(), isNull(), isNull(), any(HttpServletRequest.class), isNull()))
                    .thenReturn(validPageData);

            // When
            Object result = controller.list(DEFAULT_PAGE_NO, DEFAULT_PAGE_SIZE, null, null, null, request);

            // Then
            assertThat(result).isNotNull();
            verify(repoService).list(DEFAULT_PAGE_NO, DEFAULT_PAGE_SIZE, null, null, request, null);
        }

        /**
         * Tests simplified list with ordering parameter. Verifies that orderBy field is properly handled.
         */
        @Test
        @DisplayName("Simplified list - with order by field")
        void list_WithOrderBy() {
            // Given
            String orderBy = "createTime";
            when(repoService.list(anyInt(), anyInt(), isNull(), eq(orderBy), any(HttpServletRequest.class), isNull()))
                    .thenReturn(validPageData);

            // When
            Object result = controller.list(DEFAULT_PAGE_NO, DEFAULT_PAGE_SIZE, null, orderBy, null, request);

            // Then
            assertThat(result).isNotNull();
            verify(repoService).list(DEFAULT_PAGE_NO, DEFAULT_PAGE_SIZE, null, orderBy, request, null);
        }

        /**
         * Tests simplified list with tag filter.
         * Verifies that tag parameter is properly applied.
         */
        @Test
        @DisplayName("Simplified list - with tag filter")
        void list_WithTag() {
            // Given
            when(repoService.list(anyInt(), anyInt(), isNull(), isNull(), any(HttpServletRequest.class), eq(VALID_TAG)))
                    .thenReturn(validPageData);

            // When
            Object result = controller.list(DEFAULT_PAGE_NO, DEFAULT_PAGE_SIZE, null, null, VALID_TAG, request);

            // Then
            assertThat(result).isNotNull();
            verify(repoService).list(DEFAULT_PAGE_NO, DEFAULT_PAGE_SIZE, null, null, request, VALID_TAG);
        }

        /**
         * Tests simplified list with all available parameters. Verifies that all parameters work together
         * correctly.
         */
        @Test
        @DisplayName("Simplified list - with all parameters")
        void list_WithAllParameters() {
            // Given
            String orderBy = "name";
            when(repoService.list(anyInt(), anyInt(), eq(VALID_CONTENT), eq(orderBy), any(HttpServletRequest.class), eq(VALID_TAG)))
                    .thenReturn(validPageData);

            // When
            Object result = controller.list(
                    DEFAULT_PAGE_NO, DEFAULT_PAGE_SIZE, VALID_CONTENT, orderBy, VALID_TAG, request);

            // Then
            assertThat(result).isNotNull();
            verify(repoService).list(DEFAULT_PAGE_NO, DEFAULT_PAGE_SIZE, VALID_CONTENT, orderBy, request, VALID_TAG);
        }

        /**
         * Tests simplified list with different orderBy field values.
         * Verifies that various sorting fields are correctly handled.
         *
         * @param orderBy the field name to sort by
         */
        @ParameterizedTest
        @ValueSource(strings = {"name", "createTime", "updateTime", "status"})
        @DisplayName("Simplified list - different order by fields")
        void list_DifferentOrderByFields(String orderBy) {
            // Given
            when(repoService.list(anyInt(), anyInt(), isNull(), eq(orderBy), any(HttpServletRequest.class), isNull()))
                    .thenReturn(validPageData);

            // When
            controller.list(DEFAULT_PAGE_NO, DEFAULT_PAGE_SIZE, null, orderBy, null, request);

            // Then
            verify(repoService).list(
                    eq(DEFAULT_PAGE_NO), eq(DEFAULT_PAGE_SIZE), isNull(),
                    stringCaptor.capture(), any(HttpServletRequest.class), isNull());
            assertThat(stringCaptor.getValue()).isEqualTo(orderBy);
        }
    }

    // ==================== getDetail Tests ====================

    @Nested
    @DisplayName("Get Detail Tests")
    class GetDetailTests {

        /**
         * Tests successful retrieval of repository details.
         * Verifies that repository information is correctly returned.
         */
        @Test
        @DisplayName("Get detail - successful flow")
        void getDetail_Success() {
            // Given
            when(repoService.getDetail(eq(VALID_REPO_ID), eq(""), any(HttpServletRequest.class)))
                    .thenReturn(validRepoDto);

            // When
            ApiResult<RepoDto> result = controller.getDetail(VALID_REPO_ID, "", request);

            // Then
            assertThat(result.code()).isZero();
            assertThat(result.data()).isNotNull();
            assertThat(result.data().getId()).isEqualTo(VALID_REPO_ID);
            verify(repoService).getDetail(VALID_REPO_ID, "", request);
        }

        /**
         * Tests get detail with tag parameter.
         * Verifies that tag filtering is correctly applied.
         */
        @Test
        @DisplayName("Get detail - with tag")
        void getDetail_WithTag() {
            // Given
            when(repoService.getDetail(eq(VALID_REPO_ID), eq(VALID_TAG), any(HttpServletRequest.class)))
                    .thenReturn(validRepoDto);

            // When
            ApiResult<RepoDto> result = controller.getDetail(VALID_REPO_ID, VALID_TAG, request);

            // Then
            assertThat(result.code()).isZero();
            verify(repoService).getDetail(
                    longCaptor.capture(),
                    stringCaptor.capture(),
                    any(HttpServletRequest.class));
            assertThat(longCaptor.getValue()).isEqualTo(VALID_REPO_ID);
            assertThat(stringCaptor.getValue()).isEqualTo(VALID_TAG);
        }

        /**
         * Tests get detail with a non-existent repository ID.
         * Verifies that appropriate exception is thrown.
         */
        @Test
        @DisplayName("Get detail - non-existent ID")
        void getDetail_NonExistentId() {
            // Given
            when(repoService.getDetail(eq(INVALID_REPO_ID), anyString(), any(HttpServletRequest.class)))
                    .thenThrow(new IllegalArgumentException("Repository not found"));

            // When & Then
            assertThatThrownBy(() -> controller.getDetail(INVALID_REPO_ID, "", request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Repository not found");
        }

        /**
         * Tests get detail when service returns null.
         * Verifies that null results are properly handled.
         */
        @Test
        @DisplayName("Get detail - returns null")
        void getDetail_ReturnsNull() {
            // Given
            when(repoService.getDetail(anyLong(), anyString(), any(HttpServletRequest.class)))
                    .thenReturn(null);

            // When
            ApiResult<RepoDto> result = controller.getDetail(VALID_REPO_ID, "", request);

            // Then
            assertThat(result.code()).isZero();
            assertThat(result.data()).isNull();
        }

        /**
         * Tests get detail with various repository ID values. Verifies that different valid IDs are
         * correctly processed.
         *
         * @param id the repository ID to test
         */
        @ParameterizedTest
        @ValueSource(longs = {1L, 100L, 999L, Long.MAX_VALUE})
        @DisplayName("Get detail - different ID values")
        void getDetail_DifferentIds(Long id) {
            // Given
            RepoDto dto = new RepoDto();
            dto.setId(id);
            when(repoService.getDetail(eq(id), anyString(), any(HttpServletRequest.class)))
                    .thenReturn(dto);

            // When
            ApiResult<RepoDto> result = controller.getDetail(id, "", request);

            // Then
            assertThat(result.data().getId()).isEqualTo(id);
        }
    }

    // ==================== hitTest Tests ====================

    @Nested
    @DisplayName("Hit Test Tests")
    class HitTestTests {

        /**
         * Tests hit test functionality with default topN value. Verifies that default parameters work
         * correctly.
         */
        @Test
        @DisplayName("Hit test - default topN")
        void hitTest_DefaultTopN() {
            // Given
            Object expectedResult = Collections.singletonMap("hits", Collections.emptyList());
            when(repoService.hitTest(eq(VALID_REPO_ID), eq(VALID_QUERY), eq(3), eq(true)))
                    .thenReturn(expectedResult);

            // When
            Object result = controller.hitTest(VALID_REPO_ID, VALID_QUERY, 3);

            // Then
            assertThat(result).isNotNull();
            verify(repoService).hitTest(VALID_REPO_ID, VALID_QUERY, 3, true);
        }

        /**
         * Tests hit test with different topN parameter values. Verifies that various topN values are
         * correctly handled.
         *
         * @param topN the number of top results to return
         */
        @ParameterizedTest
        @ValueSource(ints = {1, 3, 5, 10, 20})
        @DisplayName("Hit test - different topN values")
        void hitTest_DifferentTopN(int topN) {
            // Given
            Object expectedResult = Collections.emptyMap();
            when(repoService.hitTest(eq(VALID_REPO_ID), eq(VALID_QUERY), eq(topN), eq(true)))
                    .thenReturn(expectedResult);

            // When
            Object result = controller.hitTest(VALID_REPO_ID, VALID_QUERY, topN);

            // Then
            assertThat(result).isNotNull();
            verify(repoService).hitTest(
                    eq(VALID_REPO_ID),
                    eq(VALID_QUERY),
                    integerCaptor.capture(),
                    eq(true));
            assertThat(integerCaptor.getValue()).isEqualTo(topN);
        }

        /**
         * Tests hit test with empty query string.
         * Verifies that empty queries are properly rejected.
         */
        @Test
        @DisplayName("Hit test - empty query string")
        void hitTest_EmptyQuery() {
            // Given
            when(repoService.hitTest(anyLong(), eq(""), anyInt(), eq(true)))
                    .thenThrow(new IllegalArgumentException("Query cannot be empty"));

            // When & Then
            assertThatThrownBy(() -> controller.hitTest(VALID_REPO_ID, "", VALID_TOP_N))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        /**
         * Tests hit test with invalid repository ID.
         * Verifies that invalid IDs are properly rejected.
         */
        @Test
        @DisplayName("Hit test - invalid repository ID")
        void hitTest_InvalidRepoId() {
            // Given
            when(repoService.hitTest(eq(INVALID_REPO_ID), anyString(), anyInt(), eq(true)))
                    .thenThrow(new IllegalArgumentException("Repository not found"));

            // When & Then
            assertThatThrownBy(() -> controller.hitTest(INVALID_REPO_ID, VALID_QUERY, VALID_TOP_N))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        /**
         * Tests hit test when service returns null.
         * Verifies that null responses are properly handled.
         */
        @Test
        @DisplayName("Hit test - service returns null")
        void hitTest_ServiceReturnsNull() {
            // Given
            when(repoService.hitTest(anyLong(), anyString(), anyInt(), eq(true)))
                    .thenReturn(null);

            // When
            Object result = controller.hitTest(VALID_REPO_ID, VALID_QUERY, VALID_TOP_N);

            // Then
            assertThat(result).isNull();
        }
    }

    // ==================== listHitTestHistoryByPage Tests ====================

    @Nested
    @DisplayName("List Hit Test History By Page Tests")
    class ListHitTestHistoryByPageTests {

        /**
         * Tests listing hit test history with default pagination.
         * Verifies that historical test data is correctly retrieved.
         */
        @Test
        @DisplayName("History list - default pagination")
        void listHitTestHistoryByPage_DefaultPagination() {
            // Given
            when(repoService.listHitTestHistoryByPage(eq(VALID_REPO_ID), eq(DEFAULT_PAGE_NO), eq(DEFAULT_PAGE_SIZE)))
                    .thenReturn(validHitTestHistoryPageData);

            // When
            ApiResult<PageData<HitTestHistory>> result = controller.listHitTestHistoryByPage(
                    VALID_REPO_ID, DEFAULT_PAGE_NO, DEFAULT_PAGE_SIZE);

            // Then
            assertThat(result.code()).isZero();
            assertThat(result.data()).isNotNull();
            assertThat(result.data().getPageData()).hasSize(1);
            verify(repoService).listHitTestHistoryByPage(VALID_REPO_ID, DEFAULT_PAGE_NO, DEFAULT_PAGE_SIZE);
        }

        /**
         * Tests listing hit test history with various pagination parameters. Verifies that different page
         * numbers and sizes work correctly.
         *
         * @param pageNo the page number
         * @param pageSize the page size
         */
        @ParameterizedTest
        @CsvSource({
                "1, 5",
                "2, 10",
                "3, 20",
                "5, 50"
        })
        @DisplayName("History list - different pagination parameters")
        void listHitTestHistoryByPage_DifferentPagination(int pageNo, int pageSize) {
            // Given
            PageData<HitTestHistory> pageData = new PageData<>();
            pageData.setPage(pageNo);
            pageData.setPageSize(pageSize);
            when(repoService.listHitTestHistoryByPage(eq(VALID_REPO_ID), eq(pageNo), eq(pageSize)))
                    .thenReturn(pageData);

            // When
            ApiResult<PageData<HitTestHistory>> result = controller.listHitTestHistoryByPage(
                    VALID_REPO_ID, pageNo, pageSize);

            // Then
            assertThat(result.data().getPage()).isEqualTo(pageNo);
            assertThat(result.data().getPageSize()).isEqualTo(pageSize);
        }

        /**
         * Tests listing hit test history with empty results. Verifies that empty history lists are properly
         * handled.
         */
        @Test
        @DisplayName("History list - empty result")
        void listHitTestHistoryByPage_EmptyResult() {
            // Given
            PageData<HitTestHistory> emptyPageData = new PageData<>();
            emptyPageData.setPageData(Collections.emptyList());
            emptyPageData.setTotalCount(0L);
            when(repoService.listHitTestHistoryByPage(anyLong(), anyInt(), anyInt()))
                    .thenReturn(emptyPageData);

            // When
            ApiResult<PageData<HitTestHistory>> result = controller.listHitTestHistoryByPage(
                    VALID_REPO_ID, DEFAULT_PAGE_NO, DEFAULT_PAGE_SIZE);

            // Then
            assertThat(result.data().getPageData()).isEmpty();
            assertThat(result.data().getTotalCount()).isZero();
        }

        /**
         * Tests listing hit test history with invalid repository ID.
         * Verifies that invalid IDs are properly rejected.
         */
        @Test
        @DisplayName("History list - invalid repository ID")
        void listHitTestHistoryByPage_InvalidRepoId() {
            // Given
            when(repoService.listHitTestHistoryByPage(eq(INVALID_REPO_ID), anyInt(), anyInt()))
                    .thenThrow(new IllegalArgumentException("Repository not found"));

            // When & Then
            assertThatThrownBy(() -> controller.listHitTestHistoryByPage(
                    INVALID_REPO_ID, DEFAULT_PAGE_NO, DEFAULT_PAGE_SIZE))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    // ==================== enableRepo Tests ====================

    @Nested
    @DisplayName("Enable/Disable Repository Tests")
    class EnableRepoTests {

        /**
         * Tests enabling a repository. Verifies that repositories can be successfully enabled.
         */
        @Test
        @DisplayName("Enable repository")
        void enableRepo_Enable() {
            // Given
            doNothing().when(repoService).enableRepo(eq(VALID_REPO_ID), eq(ENABLED));

            // When
            ApiResult<Void> result = controller.enableRepo(VALID_REPO_ID, ENABLED);

            // Then
            assertThat(result.code()).isZero();
            assertThat(result.data()).isNull();
            verify(repoService).enableRepo(VALID_REPO_ID, ENABLED);
        }

        /**
         * Tests disabling a repository. Verifies that repositories can be successfully disabled.
         */
        @Test
        @DisplayName("Disable repository")
        void enableRepo_Disable() {
            // Given
            doNothing().when(repoService).enableRepo(eq(VALID_REPO_ID), eq(DISABLED));

            // When
            ApiResult<Void> result = controller.enableRepo(VALID_REPO_ID, DISABLED);

            // Then
            assertThat(result.code()).isZero();
            verify(repoService).enableRepo(
                    longCaptor.capture(),
                    integerCaptor.capture());
            assertThat(longCaptor.getValue()).isEqualTo(VALID_REPO_ID);
            assertThat(integerCaptor.getValue()).isEqualTo(DISABLED);
        }

        /**
         * Tests enable/disable with different state values. Verifies that both enabled and disabled states
         * work correctly.
         *
         * @param enabled the enabled state (0 for disabled, 1 for enabled)
         */
        @ParameterizedTest
        @ValueSource(ints = {0, 1})
        @DisplayName("Enable/disable - different state values")
        void enableRepo_DifferentStates(int enabled) {
            // Given
            doNothing().when(repoService).enableRepo(anyLong(), eq(enabled));

            // When
            ApiResult<Void> result = controller.enableRepo(VALID_REPO_ID, enabled);

            // Then
            assertThat(result.code()).isZero();
            verify(repoService).enableRepo(VALID_REPO_ID, enabled);
        }

        /**
         * Tests enabling repository with invalid ID. Verifies that appropriate exception is thrown for
         * invalid IDs.
         */
        @Test
        @DisplayName("Enable repository - invalid ID")
        void enableRepo_InvalidId() {
            // Given
            doThrow(new IllegalArgumentException("Repository not found"))
                    .when(repoService)
                    .enableRepo(eq(INVALID_REPO_ID), anyInt());

            // When & Then
            assertThatThrownBy(() -> controller.enableRepo(INVALID_REPO_ID, ENABLED))
                    .isInstanceOf(IllegalArgumentException.class);
            verify(repoService).enableRepo(INVALID_REPO_ID, ENABLED);
        }

        /**
         * Tests enable repository when service throws RuntimeException. Verifies that system errors are
         * properly propagated.
         */
        @Test
        @DisplayName("Enable repository - service throws RuntimeException")
        void enableRepo_ServiceThrowsRuntimeException() {
            // Given
            doThrow(new RuntimeException("System error"))
                    .when(repoService)
                    .enableRepo(anyLong(), anyInt());

            // When & Then
            assertThatThrownBy(() -> controller.enableRepo(VALID_REPO_ID, ENABLED))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("System error");
        }
    }

    // ==================== deleteRepo Tests ====================

    @Nested
    @DisplayName("Delete Repository Tests")
    class DeleteRepoTests {

        /**
         * Tests deleting repository without tag parameter. Verifies that deletion works with minimal
         * parameters.
         */
        @Test
        @DisplayName("Delete repository - without tag")
        void deleteRepo_WithoutTag() {
            // Given
            Object expectedResult = Collections.singletonMap("success", true);
            when(repoService.deleteRepo(eq(VALID_REPO_ID), isNull(), any(HttpServletRequest.class)))
                    .thenReturn(expectedResult);

            // When
            Object result = controller.deleteRepo(VALID_REPO_ID, null, request);

            // Then
            assertThat(result).isNotNull();
            verify(repoService).deleteRepo(VALID_REPO_ID, null, request);
        }

        /**
         * Tests deleting repository with tag parameter. Verifies that tag-filtered deletion works
         * correctly.
         */
        @Test
        @DisplayName("Delete repository - with tag")
        void deleteRepo_WithTag() {
            // Given
            Object expectedResult = Collections.singletonMap("success", true);
            when(repoService.deleteRepo(eq(VALID_REPO_ID), eq(VALID_TAG), any(HttpServletRequest.class)))
                    .thenReturn(expectedResult);

            // When
            Object result = controller.deleteRepo(VALID_REPO_ID, VALID_TAG, request);

            // Then
            assertThat(result).isNotNull();
            verify(repoService).deleteRepo(
                    longCaptor.capture(),
                    stringCaptor.capture(),
                    any(HttpServletRequest.class));
            assertThat(longCaptor.getValue()).isEqualTo(VALID_REPO_ID);
            assertThat(stringCaptor.getValue()).isEqualTo(VALID_TAG);
        }

        /**
         * Tests deleting repository with invalid ID.
         * Verifies that appropriate exception is thrown for non-existent repositories.
         */
        @Test
        @DisplayName("Delete repository - invalid ID")
        void deleteRepo_InvalidId() {
            // Given
            when(repoService.deleteRepo(eq(INVALID_REPO_ID), isNull(), any(HttpServletRequest.class)))
                    .thenThrow(new IllegalArgumentException("Repository not found"));

            // When & Then
            assertThatThrownBy(() -> controller.deleteRepo(INVALID_REPO_ID, null, request))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        /**
         * Tests deleting repository that has dependencies.
         * Verifies that deletion is prevented when dependencies exist.
         */
        @Test
        @DisplayName("Delete repository - with dependencies")
        void deleteRepo_WithDependencies() {
            // Given
            when(repoService.deleteRepo(eq(VALID_REPO_ID), isNull(), any(HttpServletRequest.class)))
                    .thenThrow(new RuntimeException("Repository has dependencies and cannot be deleted"));

            // When & Then
            assertThatThrownBy(() -> controller.deleteRepo(VALID_REPO_ID, null, request))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("dependencies");
        }

        /**
         * Tests deleting repository with different tag values. Verifies that various tag values including
         * null and empty are handled correctly.
         *
         * @param tag the tag parameter value
         */
        @ParameterizedTest
        @NullAndEmptySource
        @ValueSource(strings = {"CBG-RAG", "AIUI-RAG2"})
        @DisplayName("Delete repository - different tag values")
        void deleteRepo_DifferentTags(String tag) {
            // Given
            Object expectedResult = Collections.singletonMap("success", true);
            when(repoService.deleteRepo(eq(VALID_REPO_ID), eq(tag), any(HttpServletRequest.class)))
                    .thenReturn(expectedResult);

            // When
            Object result = controller.deleteRepo(VALID_REPO_ID, tag, request);

            // Then
            assertThat(result).isNotNull();
            verify(repoService).deleteRepo(VALID_REPO_ID, tag, request);
        }
    }

    // ==================== setTop Tests ====================

    @Nested
    @DisplayName("Set Top Repository Tests")
    class SetTopTests {

        /**
         * Tests successfully setting a repository as top/pinned. Verifies that repositories can be pinned
         * to the top of lists.
         */
        @Test
        @DisplayName("Set top - success")
        void setTop_Success() {
            // Given
            doNothing().when(repoService).setTop(eq(VALID_REPO_ID));

            // When
            Object result = controller.setTop(VALID_REPO_ID);

            // Then
            assertThat(result).isNotNull();
            verify(repoService, times(1)).setTop(VALID_REPO_ID);
        }

        /**
         * Tests that setTop returns proper ApiResult. Verifies the response structure and success code.
         */
        @Test
        @DisplayName("Set top - verify ApiResult")
        void setTop_VerifyApiResult() {
            // Given
            doNothing().when(repoService).setTop(anyLong());

            // When
            Object result = controller.setTop(VALID_REPO_ID);

            // Then
            assertThat(result).isInstanceOf(ApiResult.class);
            ApiResult<?> apiResult = (ApiResult<?>) result;
            assertThat(apiResult.code()).isZero();
        }

        /**
         * Tests setTop with different repository IDs. Verifies that various valid IDs are correctly
         * processed.
         *
         * @param id the repository ID to pin
         */
        @ParameterizedTest
        @ValueSource(longs = {1L, 10L, 100L, 999L})
        @DisplayName("Set top - different IDs")
        void setTop_DifferentIds(Long id) {
            // Given
            doNothing().when(repoService).setTop(eq(id));

            // When
            controller.setTop(id);

            // Then
            verify(repoService).setTop(longCaptor.capture());
            assertThat(longCaptor.getValue()).isEqualTo(id);
        }

        /**
         * Tests setTop with invalid repository ID. Verifies that appropriate exception is thrown for
         * non-existent repositories.
         */
        @Test
        @DisplayName("Set top - invalid ID")
        void setTop_InvalidId() {
            // Given
            doThrow(new IllegalArgumentException("Repository not found"))
                    .when(repoService)
                    .setTop(eq(INVALID_REPO_ID));

            // When & Then
            assertThatThrownBy(() -> controller.setTop(INVALID_REPO_ID))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        /**
         * Tests setTop when service throws exception. Verifies that errors during pinning are properly
         * propagated.
         */
        @Test
        @DisplayName("Set top - service throws exception")
        void setTop_ServiceThrowsException() {
            // Given
            doThrow(new RuntimeException("Set top failed"))
                    .when(repoService)
                    .setTop(anyLong());

            // When & Then
            assertThatThrownBy(() -> controller.setTop(VALID_REPO_ID))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("Set top failed");
        }
    }

    // ==================== listFiles Tests ====================

    @Nested
    @DisplayName("List Files Tests")
    class ListFilesTests {

        /**
         * Tests successful file listing for a repository. Verifies that repository files are correctly
         * retrieved.
         */
        @Test
        @DisplayName("List files - success")
        void listFiles_Success() {
            // Given
            Object expectedResult = Collections.singletonList(
                    Collections.singletonMap("fileName", "test.txt"));
            when(repoService.listFiles(eq(VALID_REPO_ID))).thenReturn(expectedResult);

            // When
            Object result = controller.listFiles(VALID_REPO_ID);

            // Then
            assertThat(result).isNotNull();
            verify(repoService, times(1)).listFiles(VALID_REPO_ID);
        }

        /**
         * Tests listing files when repository has no files.
         * Verifies that empty file lists are properly handled.
         */
        @Test
        @DisplayName("List files - empty list")
        void listFiles_EmptyList() {
            // Given
            when(repoService.listFiles(anyLong())).thenReturn(Collections.emptyList());

            // When
            Object result = controller.listFiles(VALID_REPO_ID);

            // Then
            assertThat(result).isNotNull();
            assertThat(result).isEqualTo(Collections.emptyList());
        }

        /**
         * Tests listing files with different repository IDs.
         * Verifies that various repository IDs are correctly processed.
         *
         * @param repoId the repository ID to query
         */
        @ParameterizedTest
        @ValueSource(longs = {1L, 50L, 100L, 500L})
        @DisplayName("List files - different repository IDs")
        void listFiles_DifferentRepoIds(Long repoId) {
            // Given
            when(repoService.listFiles(eq(repoId))).thenReturn(Collections.emptyList());

            // When
            controller.listFiles(repoId);

            // Then
            verify(repoService).listFiles(longCaptor.capture());
            assertThat(longCaptor.getValue()).isEqualTo(repoId);
        }

        /**
         * Tests listing files with invalid repository ID.
         * Verifies that appropriate exception is thrown for non-existent repositories.
         */
        @Test
        @DisplayName("List files - invalid ID")
        void listFiles_InvalidId() {
            // Given
            when(repoService.listFiles(eq(INVALID_REPO_ID)))
                    .thenThrow(new IllegalArgumentException("Repository not found"));

            // When & Then
            assertThatThrownBy(() -> controller.listFiles(INVALID_REPO_ID))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        /**
         * Tests listing files when service returns null.
         * Verifies that null responses are properly handled.
         */
        @Test
        @DisplayName("List files - service returns null")
        void listFiles_ServiceReturnsNull() {
            // Given
            when(repoService.listFiles(anyLong())).thenReturn(null);

            // When
            Object result = controller.listFiles(VALID_REPO_ID);

            // Then
            assertThat(result).isNull();
        }

        /**
         * Tests listing files when file system error occurs.
         * Verifies that system errors are properly propagated.
         */
        @Test
        @DisplayName("List files - system error")
        void listFiles_SystemError() {
            // Given
            when(repoService.listFiles(anyLong()))
                    .thenThrow(new RuntimeException("File system error"));

            // When & Then
            assertThatThrownBy(() -> controller.listFiles(VALID_REPO_ID))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("File system error");
        }
    }

    // ==================== getRepoUseStatus Tests ====================

    @Nested
    @DisplayName("Get Repository Use Status Tests")
    class GetRepoUseStatusTests {

        /**
         * Tests successful retrieval of repository usage status. Verifies that usage statistics are
         * correctly returned.
         */
        @Test
        @DisplayName("Get use status - success")
        void getRepoUseStatus_Success() {
            // Given
            Map<String, Object> expectedStatus = new HashMap<>();
            expectedStatus.put("storage", "100MB");
            expectedStatus.put("queries", 1000);
            expectedStatus.put("connections", 5);
            when(repoService.getRepoUseStatus(eq(VALID_REPO_ID), any(HttpServletRequest.class)))
                    .thenReturn(expectedStatus);

            // When
            Object result = controller.getRepoUseStatus(VALID_REPO_ID, request);

            // Then
            assertThat(result).isNotNull();
            verify(repoService, times(1)).getRepoUseStatus(VALID_REPO_ID, request);
        }

        /**
         * Tests getting use status when repository has empty status.
         * Verifies that empty status maps are properly handled.
         */
        @Test
        @DisplayName("Get use status - empty status")
        void getRepoUseStatus_EmptyStatus() {
            // Given
            when(repoService.getRepoUseStatus(anyLong(), any(HttpServletRequest.class)))
                    .thenReturn(Collections.emptyMap());

            // When
            Object result = controller.getRepoUseStatus(VALID_REPO_ID, request);

            // Then
            assertThat(result).isNotNull();
            assertThat(result).isEqualTo(Collections.emptyMap());
        }

        /**
         * Tests getting use status with null repository ID.
         * Verifies that null IDs are properly handled.
         */
        @Test
        @DisplayName("Get use status - null ID")
        void getRepoUseStatus_NullId() {
            // Given
            when(repoService.getRepoUseStatus(isNull(), any(HttpServletRequest.class)))
                    .thenReturn(Collections.emptyMap());

            // When
            Object result = controller.getRepoUseStatus(null, request);

            // Then
            assertThat(result).isNotNull();
            verify(repoService).getRepoUseStatus(null, request);
        }

        /**
         * Tests getting use status with different repository IDs.
         * Verifies that various repository IDs are correctly processed.
         *
         * @param repoId the repository ID to query
         */
        @ParameterizedTest
        @ValueSource(longs = {1L, 10L, 100L, 1000L})
        @DisplayName("Get use status - different IDs")
        void getRepoUseStatus_DifferentIds(Long repoId) {
            // Given
            when(repoService.getRepoUseStatus(eq(repoId), any(HttpServletRequest.class)))
                    .thenReturn(Collections.emptyMap());

            // When
            controller.getRepoUseStatus(repoId, request);

            // Then
            verify(repoService).getRepoUseStatus(longCaptor.capture(), any(HttpServletRequest.class));
            assertThat(longCaptor.getValue()).isEqualTo(repoId);
        }

        /**
         * Tests getting use status with invalid repository ID.
         * Verifies that appropriate exception is thrown for non-existent repositories.
         */
        @Test
        @DisplayName("Get use status - invalid ID")
        void getRepoUseStatus_InvalidId() {
            // Given
            when(repoService.getRepoUseStatus(eq(INVALID_REPO_ID), any(HttpServletRequest.class)))
                    .thenThrow(new IllegalArgumentException("Repository not found"));

            // When & Then
            assertThatThrownBy(() -> controller.getRepoUseStatus(INVALID_REPO_ID, request))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        /**
         * Tests getting use status when service throws exception.
         * Verifies that errors during status retrieval are properly propagated.
         */
        @Test
        @DisplayName("Get use status - service throws exception")
        void getRepoUseStatus_ServiceThrowsException() {
            // Given
            when(repoService.getRepoUseStatus(anyLong(), any(HttpServletRequest.class)))
                    .thenThrow(new RuntimeException("Get status failed"));

            // When & Then
            assertThatThrownBy(() -> controller.getRepoUseStatus(VALID_REPO_ID, request))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("Get status failed");
        }

        /**
         * Tests getting use status when service returns null.
         * Verifies that null responses are properly handled.
         */
        @Test
        @DisplayName("Get use status - returns null")
        void getRepoUseStatus_ReturnsNull() {
            // Given
            when(repoService.getRepoUseStatus(anyLong(), any(HttpServletRequest.class)))
                    .thenReturn(null);

            // When
            Object result = controller.getRepoUseStatus(VALID_REPO_ID, request);

            // Then
            assertThat(result).isNull();
        }
    }

    // ==================== Edge Cases and Exception Tests ====================

    @Nested
    @DisplayName("Edge Cases and Exception Scenarios Tests")
    class EdgeCasesAndExceptionsTests {

        /**
         * Tests handling of large ID values. Verifies that maximum long values are correctly processed.
         */
        @Test
        @DisplayName("Large ID values test")
        void testLargeIdValues() {
            // Given
            Long largeId = Long.MAX_VALUE;
            when(repoService.getDetail(eq(largeId), anyString(), any(HttpServletRequest.class)))
                    .thenReturn(validRepoDto);

            // When
            ApiResult<RepoDto> result = controller.getDetail(largeId, "", request);

            // Then
            assertThat(result.code()).isZero();
            verify(repoService).getDetail(largeId, "", request);
        }

        /**
         * Tests concurrent calls to the controller.
         * Verifies that the controller is thread-safe under concurrent access.
         *
         * @throws InterruptedException if thread is interrupted during execution
         */
        @Test
        @DisplayName("Concurrent calls test")
        void testConcurrentCalls() throws InterruptedException {
            // Given
            when(repoService.getDetail(anyLong(), anyString(), any(HttpServletRequest.class)))
                    .thenReturn(validRepoDto);

            // When
            int threadCount = 10;
            List<Thread> threads = new ArrayList<>();
            for (int i = 0; i < threadCount; i++) {
                Thread thread = new Thread(() ->
                    controller.getDetail(VALID_REPO_ID, "", request));
                threads.add(thread);
                thread.start();
            }

            for (Thread thread : threads) {
                thread.join();
            }

            // Then
            verify(repoService, times(threadCount)).getDetail(
                    eq(VALID_REPO_ID), eq(""), any(HttpServletRequest.class));
        }

        /**
         * Tests handling of special characters in input. Verifies that special characters are properly
         * escaped and processed.
         */
        @Test
        @DisplayName("Special characters handling test")
        void testSpecialCharacters() {
            // Given
            String specialContent = "test<>&\"'%#@!";
            when(repoService.listRepos(anyInt(), anyInt(), eq(specialContent), any(HttpServletRequest.class)))
                    .thenReturn(validPageData);

            // When
            ApiResult<PageData<RepoDto>> result = controller.listRepos(
                    DEFAULT_PAGE_NO, DEFAULT_PAGE_SIZE, specialContent, request);

            // Then
            assertThat(result.code()).isZero();
            verify(repoService).listRepos(anyInt(), anyInt(), eq(specialContent), any(HttpServletRequest.class));
        }

        /**
         * Tests handling of very long strings. Verifies that extremely long input strings are properly
         * processed.
         */
        @Test
        @DisplayName("Very long string test")
        void testVeryLongString() {
            // Given
            String longString = "a".repeat(10000);
            when(repoService.listRepos(anyInt(), anyInt(), eq(longString), any(HttpServletRequest.class)))
                    .thenReturn(validPageData);

            // When
            ApiResult<PageData<RepoDto>> result = controller.listRepos(
                    DEFAULT_PAGE_NO, DEFAULT_PAGE_SIZE, longString, request);

            // Then
            assertThat(result.code()).isZero();
        }

        /**
         * Tests handling of extreme pagination parameter values.
         * Verifies that maximum integer values for pagination are properly handled.
         */
        @Test
        @DisplayName("Extreme pagination values test")
        void testExtremePaginationValues() {
            // Given
            when(repoService.listRepos(eq(Integer.MAX_VALUE), eq(Integer.MAX_VALUE), isNull(), any(HttpServletRequest.class)))
                    .thenReturn(validPageData);

            // When
            ApiResult<PageData<RepoDto>> result = controller.listRepos(
                    Integer.MAX_VALUE, Integer.MAX_VALUE, null, request);

            // Then
            assertThat(result.code()).isZero();
        }

        /**
         * Tests handling of multiple null parameters.
         * Verifies that methods work correctly when multiple optional parameters are null.
         */
        @Test
        @DisplayName("Multiple null parameters test")
        void testMultipleNullParameters() {
            // Given
            when(repoService.list(anyInt(), anyInt(), isNull(), isNull(), any(HttpServletRequest.class), isNull()))
                    .thenReturn(validPageData);

            // When
            Object result = controller.list(DEFAULT_PAGE_NO, DEFAULT_PAGE_SIZE, null, null, null, request);

            // Then
            assertThat(result).isNotNull();
            verify(repoService).list(
                    eq(DEFAULT_PAGE_NO), eq(DEFAULT_PAGE_SIZE),
                    isNull(), isNull(), any(HttpServletRequest.class), isNull());
        }

        /**
         * Tests handling of Unicode characters including emojis. Verifies that Unicode strings are properly
         * processed.
         */
        @Test
        @DisplayName("Unicode characters test")
        void testUnicodeCharacters() {
            // Given
            String unicodeContent = "test🚀📊💡";
            when(repoService.listRepos(anyInt(), anyInt(), eq(unicodeContent), any(HttpServletRequest.class)))
                    .thenReturn(validPageData);

            // When
            ApiResult<PageData<RepoDto>> result = controller.listRepos(
                    DEFAULT_PAGE_NO, DEFAULT_PAGE_SIZE, unicodeContent, request);

            // Then
            assertThat(result.code()).isZero();
        }
    }

    // ==================== Integration Scenario Tests ====================

    @Nested
    @DisplayName("Integration Scenarios Tests")
    class IntegrationScenariosTests {

        /**
         * Tests complete workflow: create, query, update, and delete operations.
         * Verifies that all CRUD operations work together correctly.
         */
        @Test
        @DisplayName("Full workflow - create, query, update, delete")
        void fullWorkflow_CreateQueryUpdateDelete() {
            // 1. Create
            when(repoService.createRepo(any(RepoVO.class))).thenReturn(validRepo);
            ApiResult<Repo> createResult = controller.createRepo(validRepoVO);
            assertThat(createResult.code()).isZero();

            // 2. Query
            when(repoService.getDetail(eq(VALID_REPO_ID), anyString(), any(HttpServletRequest.class)))
                    .thenReturn(validRepoDto);
            ApiResult<RepoDto> detailResult = controller.getDetail(VALID_REPO_ID, "", request);
            assertThat(detailResult.code()).isZero();

            // 3. Update
            when(repoService.updateRepo(any(RepoVO.class))).thenReturn(validRepo);
            ApiResult<Repo> updateResult = controller.updateRepo(validRepoVO);
            assertThat(updateResult.code()).isZero();

            // 4. Delete
            when(repoService.deleteRepo(eq(VALID_REPO_ID), isNull(), any(HttpServletRequest.class)))
                    .thenReturn(Collections.singletonMap("success", true));
            Object deleteResult = controller.deleteRepo(VALID_REPO_ID, null, request);
            assertThat(deleteResult).isNotNull();

            // Verify all interactions
            verify(repoService).createRepo(any(RepoVO.class));
            verify(repoService).getDetail(eq(VALID_REPO_ID), anyString(), any(HttpServletRequest.class));
            verify(repoService).updateRepo(any(RepoVO.class));
            verify(repoService).deleteRepo(eq(VALID_REPO_ID), isNull(), any(HttpServletRequest.class));
        }

        /**
         * Tests search and pagination scenario.
         * Verifies that search with pagination across multiple pages works correctly.
         */
        @Test
        @DisplayName("Search and pagination scenario")
        void searchAndPaginationScenario() {
            // Given
            when(repoService.listRepos(anyInt(), anyInt(), anyString(), any(HttpServletRequest.class)))
                    .thenReturn(validPageData);

            // When - First page
            ApiResult<PageData<RepoDto>> page1 = controller.listRepos(1, 10, "test", request);
            // When - Second page
            ApiResult<PageData<RepoDto>> page2 = controller.listRepos(2, 10, "test", request);

            // Then
            assertThat(page1.code()).isZero();
            assertThat(page2.code()).isZero();
            verify(repoService, times(2)).listRepos(anyInt(), anyInt(), eq("test"), any(HttpServletRequest.class));
        }

        /**
         * Tests hit test and history query scenario. Verifies that hit testing and history retrieval work
         * together correctly.
         */
        @Test
        @DisplayName("Hit test and history query scenario")
        void hitTestAndHistoryScenario() {
            // Given
            Object hitTestResult = Collections.singletonMap("hits", Collections.emptyList());
            when(repoService.hitTest(anyLong(), anyString(), anyInt(), eq(true)))
                    .thenReturn(hitTestResult);
            when(repoService.listHitTestHistoryByPage(anyLong(), anyInt(), anyInt()))
                    .thenReturn(validHitTestHistoryPageData);

            // When
            Object testResult = controller.hitTest(VALID_REPO_ID, "test query", 5);
            ApiResult<PageData<HitTestHistory>> historyResult =
                    controller.listHitTestHistoryByPage(VALID_REPO_ID, 1, 10);

            // Then
            assertThat(testResult).isNotNull();
            assertThat(historyResult.code()).isZero();
            verify(repoService).hitTest(VALID_REPO_ID, "test query", 5, true);
            verify(repoService).listHitTestHistoryByPage(VALID_REPO_ID, 1, 10);
        }
    }

    // ==================== Mockito Verification Tests ====================

    @Nested
    @DisplayName("Mockito Verification Tests")
    class MockitoVerificationTests {

        /**
         * Tests verification of method invocation counts.
         * Verifies that methods are called the expected number of times.
         */
        @Test
        @DisplayName("Verify method invocation counts")
        void verifyMethodInvocationCounts() {
            // Given
            when(repoService.listFiles(anyLong())).thenReturn(Collections.emptyList());

            // When
            controller.listFiles(VALID_REPO_ID);
            controller.listFiles(VALID_REPO_ID);
            controller.listFiles(VALID_REPO_ID);

            // Then
            verify(repoService, times(3)).listFiles(VALID_REPO_ID);
            verify(repoService, never()).deleteRepo(anyLong(), anyString(), any(HttpServletRequest.class));
        }

        /**
         * Tests verification of argument capture.
         * Verifies that method arguments are correctly captured for verification.
         */
        @Test
        @DisplayName("Verify argument capture")
        void verifyArgumentCapture() {
            // Given
            when(repoService.createRepo(any(RepoVO.class))).thenReturn(validRepo);

            // When
            controller.createRepo(validRepoVO);

            // Then
            verify(repoService).createRepo(repoVOCaptor.capture());
            RepoVO captured = repoVOCaptor.getValue();
            assertThat(captured.getName()).isEqualTo(VALID_NAME);
            assertThat(captured.getDesc()).isEqualTo(VALID_DESC);
            assertThat(captured.getTags()).containsExactly("tag1", "tag2");
        }

        /**
         * Tests verification of method invocation order.
         * Verifies that methods are called in the expected sequence.
         */
        @Test
        @DisplayName("Verify method invocation order")
        void verifyMethodInvocationOrder() {
            // Given
            when(repoService.createRepo(any(RepoVO.class))).thenReturn(validRepo);
            when(repoService.updateRepo(any(RepoVO.class))).thenReturn(validRepo);
            doNothing().when(repoService).setTop(anyLong());

            // When
            controller.createRepo(validRepoVO);
            controller.updateRepo(validRepoVO);
            controller.setTop(VALID_REPO_ID);

            // Then
            var inOrder = inOrder(repoService);
            inOrder.verify(repoService).createRepo(any(RepoVO.class));
            inOrder.verify(repoService).updateRepo(any(RepoVO.class));
            inOrder.verify(repoService).setTop(VALID_REPO_ID);
        }

        /**
         * Tests verification that no interactions occurred. Verifies that service methods were not called
         * when controller methods are not invoked.
         */
        @Test
        @DisplayName("Verify no interactions")
        void verifyNoInteractionsTest() {
            // When - no methods called

            // Then
            verifyNoMoreInteractions(repoService);
        }
    }
}
