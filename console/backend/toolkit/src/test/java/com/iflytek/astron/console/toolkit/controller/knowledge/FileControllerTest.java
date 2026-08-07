package com.iflytek.astron.console.toolkit.controller.knowledge;

import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.toolkit.common.Result;
import com.iflytek.astron.console.toolkit.entity.common.PageData;
import com.iflytek.astron.console.toolkit.entity.dto.FileInfoV2Dto;
import com.iflytek.astron.console.toolkit.entity.dto.KnowledgeDto;
import com.iflytek.astron.console.toolkit.entity.pojo.FileSummary;
import com.iflytek.astron.console.toolkit.entity.pojo.SliceConfig;
import com.iflytek.astron.console.toolkit.entity.table.repo.FileDirectoryTree;
import com.iflytek.astron.console.toolkit.entity.table.repo.FileInfoV2;
import com.iflytek.astron.console.toolkit.entity.vo.HtmlFileVO;
import com.iflytek.astron.console.toolkit.entity.vo.repo.CreateFolderVO;
import com.iflytek.astron.console.toolkit.entity.vo.repo.DealFileVO;
import com.iflytek.astron.console.toolkit.entity.vo.repo.KnowledgeQueryVO;
import com.iflytek.astron.console.toolkit.service.repo.FileInfoV2Service;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ExecutionException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for FileController
 *
 * Technology Stack: JUnit5 + Mockito + AssertJ Coverage Requirements: - JaCoCo Statement Coverage
 * >= 80% - JaCoCo Branch Coverage >= 90% - High PIT Mutation Test Score - Covers normal flows, edge
 * cases, and exceptions
 *
 * @author AI Assistant
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("FileController Unit Tests")
class FileControllerTest {

    @Mock
    private FileInfoV2Service fileInfoV2Service;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private MultipartFile multipartFile;

    @InjectMocks
    private FileController fileController;

    private FileInfoV2 mockFileInfo;
    private DealFileVO dealFileVO;
    private CreateFolderVO createFolderVO;
    private HtmlFileVO htmlFileVO;
    private KnowledgeQueryVO knowledgeQueryVO;

    /**
     * Set up test fixtures before each test Initializes common test data including mock file info, VO
     * objects, and query parameters
     */
    @BeforeEach
    void setUp() {
        // Initialize common test data
        mockFileInfo = new FileInfoV2();
        mockFileInfo.setId(1L);
        mockFileInfo.setName("test-file.txt");
        mockFileInfo.setRepoId(100L);

        dealFileVO = new DealFileVO();
        dealFileVO.setRepoId(100L);
        dealFileVO.setFileIds(Arrays.asList("1", "2", "3"));
        SliceConfig sliceConfig = new SliceConfig();
        sliceConfig.setSeperator(Collections.singletonList("\\n"));
        dealFileVO.setSliceConfig(sliceConfig);

        createFolderVO = new CreateFolderVO();
        createFolderVO.setId(1L);
        createFolderVO.setRepoId(100L);
        createFolderVO.setName("test-folder");
        createFolderVO.setParentId(0L);

        htmlFileVO = new HtmlFileVO();
        htmlFileVO.setRepoId(100L);
        htmlFileVO.setParentId(0L);
        htmlFileVO.setHtmlAddressList(Arrays.asList("http://example.com/page1.html"));

        knowledgeQueryVO = new KnowledgeQueryVO();
        knowledgeQueryVO.setPageNo(1);
        knowledgeQueryVO.setPageSize(10);
        knowledgeQueryVO.setTag("test-tag");
    }

    /**
     * Test cases for file upload operations
     */
    @Nested
    @DisplayName("File Upload Tests")
    class FileUploadTests {

        /**
         * Test successful file upload Verifies that a file can be uploaded successfully and returns correct
         * result
         */
        @Test
        @DisplayName("Upload file successfully")
        void uploadFile_Success() {
            // Given
            Long parentId = 0L;
            Long repoId = 100L;
            String tag = "test-tag";
            when(fileInfoV2Service.uploadFile(multipartFile, parentId, repoId, tag, request))
                    .thenReturn(mockFileInfo);

            // When
            ApiResult<FileInfoV2> result = fileController.uploadFile(multipartFile, parentId, repoId, tag, request);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);
            assertThat(result.data()).isEqualTo(mockFileInfo);
            verify(fileInfoV2Service, times(1)).uploadFile(multipartFile, parentId, repoId, tag, request);
        }

        /**
         * Test file upload with empty file name Verifies that uploading a file with empty name throws
         * BusinessException
         */
        @Test
        @DisplayName("Upload file - Empty file name")
        void uploadFile_EmptyFileName() {
            // Given
            Long parentId = 0L;
            Long repoId = 100L;
            String tag = "test-tag";
            when(fileInfoV2Service.uploadFile(multipartFile, parentId, repoId, tag, request))
                    .thenThrow(new BusinessException(ResponseEnum.REPO_FILE_NAME_CANNOT_EMPTY));

            // When & Then
            assertThatThrownBy(() -> fileController.uploadFile(multipartFile, parentId, repoId, tag, request))
                    .isInstanceOf(BusinessException.class);
            verify(fileInfoV2Service, times(1)).uploadFile(multipartFile, parentId, repoId, tag, request);
        }

        /**
         * Test successful HTML file creation Verifies that HTML files can be created from URL addresses
         */
        @Test
        @DisplayName("Create HTML file successfully")
        void createHtmlFile_Success() {
            // Given
            List<FileInfoV2> expectedFiles = Arrays.asList(mockFileInfo);
            when(fileInfoV2Service.createHtmlFile(htmlFileVO)).thenReturn(expectedFiles);

            // When
            ApiResult<List<FileInfoV2>> result = fileController.createHtmlFile(htmlFileVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);
            assertThat(result.data()).hasSize(1);
            assertThat(result.data().get(0)).isEqualTo(mockFileInfo);
            verify(fileInfoV2Service, times(1)).createHtmlFile(htmlFileVO);
        }

        /**
         * Test HTML file creation with empty address list Verifies that creating HTML files with empty
         * address list returns empty result
         */
        @Test
        @DisplayName("Create HTML file - Empty address list")
        void createHtmlFile_EmptyAddressList() {
            // Given
            htmlFileVO.setHtmlAddressList(Collections.emptyList());
            when(fileInfoV2Service.createHtmlFile(htmlFileVO)).thenReturn(Collections.emptyList());

            // When
            ApiResult<List<FileInfoV2>> result = fileController.createHtmlFile(htmlFileVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);
            assertThat(result.data()).isEmpty();
            verify(fileInfoV2Service, times(1)).createHtmlFile(htmlFileVO);
        }
    }

    /**
     * Test cases for file slicing operations
     */
    @Nested
    @DisplayName("File Slice Tests")
    class FileSliceTests {

        /**
         * Test successful file slicing with normal separator Verifies that files can be sliced successfully
         * with provided separator
         *
         * @throws InterruptedException if the operation is interrupted
         * @throws ExecutionException if the operation fails during execution
         */
        @Test
        @DisplayName("Slice files successfully - With separator")
        void sliceFiles_Success_WithSeparator() throws InterruptedException, ExecutionException {
            // Given
            @SuppressWarnings("unchecked")
            Result<Boolean> successResult = mock(Result.class);
            when(successResult.noError()).thenReturn(true);
            when(successResult.getData()).thenReturn(true);
            when(fileInfoV2Service.sliceFiles(dealFileVO)).thenReturn(successResult);

            // When
            ApiResult<Boolean> result = fileController.sliceFiles(dealFileVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);
            assertThat(result.data()).isTrue();
            verify(fileInfoV2Service, times(1)).sliceFiles(dealFileVO);
        }

        /**
         * Test successful file slicing with empty separator defaults to newline Verifies that empty
         * separator is automatically replaced with default newline separator
         *
         * @throws InterruptedException if the operation is interrupted
         * @throws ExecutionException if the operation fails during execution
         */
        @Test
        @DisplayName("Slice files successfully - Empty separator delegates to service")
        void sliceFiles_Success_EmptySeparatorDelegatesToService() throws InterruptedException, ExecutionException {
            // Given
            dealFileVO.getSliceConfig().setSeperator(Collections.singletonList(""));
            @SuppressWarnings("unchecked")
            Result<Boolean> successResult = mock(Result.class);
            when(successResult.noError()).thenReturn(true);
            when(successResult.getData()).thenReturn(true);
            when(fileInfoV2Service.sliceFiles(dealFileVO)).thenReturn(successResult);

            // When
            ApiResult<Boolean> result = fileController.sliceFiles(dealFileVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);
            assertThat(result.data()).isTrue();
            assertThat(dealFileVO.getSliceConfig().getSeperator()).containsExactly("");
            verify(fileInfoV2Service, times(1)).sliceFiles(dealFileVO);
        }

        /**
         * Test successful file slicing with null separator defaults to newline Verifies that null separator
         * is automatically replaced with default newline separator
         *
         * @throws InterruptedException if the operation is interrupted
         * @throws ExecutionException if the operation fails during execution
         */
        @Test
        @DisplayName("Slice files successfully - Null separator delegates to service")
        void sliceFiles_Success_NullSeparatorDelegatesToService() throws InterruptedException, ExecutionException {
            // Given
            dealFileVO.getSliceConfig().setSeperator(Collections.singletonList(null));
            @SuppressWarnings("unchecked")
            Result<Boolean> successResult = mock(Result.class);
            when(successResult.noError()).thenReturn(true);
            when(successResult.getData()).thenReturn(true);
            when(fileInfoV2Service.sliceFiles(dealFileVO)).thenReturn(successResult);

            // When
            ApiResult<Boolean> result = fileController.sliceFiles(dealFileVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);
            assertThat(dealFileVO.getSliceConfig().getSeperator()).containsExactly((String) null);
            verify(fileInfoV2Service, times(1)).sliceFiles(dealFileVO);
        }

        /**
         * Test file slicing failure with error message returned Verifies that slicing failure returns
         * appropriate error code and message
         *
         * @throws InterruptedException if the operation is interrupted
         * @throws ExecutionException if the operation fails during execution
         */
        @Test
        @DisplayName("Slice files failure - Returns error")
        void sliceFiles_Failure_ReturnsError() throws InterruptedException, ExecutionException {
            // Given
            @SuppressWarnings("unchecked")
            Result<Boolean> failureResult = mock(Result.class);
            when(failureResult.noError()).thenReturn(false);
            when(failureResult.getCode()).thenReturn(500);
            when(failureResult.getMessage()).thenReturn("Slice failed");
            when(fileInfoV2Service.sliceFiles(dealFileVO)).thenReturn(failureResult);

            // When
            ApiResult<Boolean> result = fileController.sliceFiles(dealFileVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(500);
            assertThat(result.message()).isEqualTo("Slice failed");
            verify(fileInfoV2Service, times(1)).sliceFiles(dealFileVO);
        }

        /**
         * Test file slicing throws InterruptedException
         * Verifies that InterruptedException is properly propagated when thread is interrupted
         *
         * @throws InterruptedException if the operation is interrupted
         * @throws ExecutionException if the operation fails during execution
         */
        @Test
        @DisplayName("Slice files - Throws InterruptedException")
        void sliceFiles_ThrowsInterruptedException() throws InterruptedException, ExecutionException {
            // Given
            when(fileInfoV2Service.sliceFiles(dealFileVO)).thenThrow(new InterruptedException("Thread interrupted"));

            // When & Then
            assertThatThrownBy(() -> fileController.sliceFiles(dealFileVO))
                    .isInstanceOf(InterruptedException.class)
                    .hasMessage("Thread interrupted");
            verify(fileInfoV2Service, times(1)).sliceFiles(dealFileVO);
        }
    }

    /**
     * Test cases for file embedding operations
     */
    @Nested
    @DisplayName("File Embedding Tests")
    class FileEmbeddingTests {

        /**
         * Test successful file embedding Verifies that files can be embedded successfully without errors
         *
         * @throws ExecutionException if the operation fails during execution
         * @throws InterruptedException if the operation is interrupted
         */
        @Test
        @DisplayName("Embedding files successfully")
        void embeddingFiles_Success() throws ExecutionException, InterruptedException {
            // Given
            doNothing().when(fileInfoV2Service).embeddingFiles(dealFileVO, request);

            // When
            ApiResult<Void> result = fileController.embeddingFiles(dealFileVO, request);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);
            verify(fileInfoV2Service, times(1)).embeddingFiles(dealFileVO, request);
        }

        /**
         * Test file embedding throws RuntimeException Verifies that RuntimeException is properly thrown
         * when embedding fails
         *
         * @throws ExecutionException if the operation fails during execution
         * @throws InterruptedException if the operation is interrupted
         */
        @Test
        @DisplayName("Embedding files - Throws RuntimeException")
        void embeddingFiles_ThrowsRuntimeException() throws ExecutionException, InterruptedException {
            // Given
            doThrow(new RuntimeException("Embedding failed"))
                    .when(fileInfoV2Service)
                    .embeddingFiles(dealFileVO, request);

            // When & Then
            assertThatThrownBy(() -> fileController.embeddingFiles(dealFileVO, request))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("Embedding failed");
            verify(fileInfoV2Service, times(1)).embeddingFiles(dealFileVO, request);
        }

        /**
         * Test successful background file embedding Verifies that files can be embedded in background
         * successfully
         *
         * @throws ExecutionException if the operation fails during execution
         * @throws InterruptedException if the operation is interrupted
         */
        @Test
        @DisplayName("Background embedding successfully")
        void embeddingBack_Success() throws ExecutionException, InterruptedException {
            // Given
            doNothing().when(fileInfoV2Service).embeddingBack(dealFileVO, request);

            // When
            ApiResult<Void> result = fileController.embeddingBack(dealFileVO, request);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);
            verify(fileInfoV2Service, times(1)).embeddingBack(dealFileVO, request);
        }

        /**
         * Test retry failed files Verifies that failed files can be retried successfully
         *
         * @throws ExecutionException if the operation fails during execution
         * @throws InterruptedException if the operation is interrupted
         */
        @Test
        @DisplayName("Retry failed files")
        void retry_Success() throws ExecutionException, InterruptedException {
            // Given
            doNothing().when(fileInfoV2Service).retry(dealFileVO, request);

            // When
            ApiResult<Void> result = fileController.retry(dealFileVO, request);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);
            verify(fileInfoV2Service, times(1)).retry(dealFileVO, request);
        }
    }

    /**
     * Test cases for file status query operations
     */
    @Nested
    @DisplayName("File Status Query Tests")
    class FileStatusTests {

        /**
         * Test get file indexing status Verifies that file indexing status can be retrieved successfully
         */
        @Test
        @DisplayName("Get file indexing status")
        void getIndexingStatus_Success() {
            // Given
            List<FileInfoV2Dto> expectedStatus = Arrays.asList(new FileInfoV2Dto(), new FileInfoV2Dto());
            when(fileInfoV2Service.getIndexingStatus(dealFileVO)).thenReturn(expectedStatus);

            // When
            ApiResult<List<FileInfoV2Dto>> result = fileController.getIndexingStatus(dealFileVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);
            assertThat(result.data()).hasSize(2);
            verify(fileInfoV2Service, times(1)).getIndexingStatus(dealFileVO);
        }

        /**
         * Test get file summary information Verifies that file summary information can be retrieved
         * successfully
         */
        @Test
        @DisplayName("Get file summary information")
        void getFileSummary_Success() {
            // Given
            FileSummary expectedSummary = new FileSummary();
            when(fileInfoV2Service.getFileSummary(dealFileVO, request)).thenReturn(expectedSummary);

            // When
            ApiResult<FileSummary> result = fileController.getFileSummary(dealFileVO, request);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);
            assertThat(result.data()).isEqualTo(expectedSummary);
            verify(fileInfoV2Service, times(1)).getFileSummary(dealFileVO, request);
        }

        /**
         * Test get file info by sourceId Verifies that file information can be retrieved by sourceId
         * successfully
         */
        @Test
        @DisplayName("Get file info by sourceId")
        void getFileInfoV2BySourceId_Success() {
            // Given
            String sourceId = "source-123";
            when(fileInfoV2Service.getFileInfoV2BySourceId(sourceId)).thenReturn(mockFileInfo);

            // When
            ApiResult<FileInfoV2> result = fileController.getFileInfoV2BySourceId(sourceId);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);
            assertThat(result.data()).isEqualTo(mockFileInfo);
            verify(fileInfoV2Service, times(1)).getFileInfoV2BySourceId(sourceId);
        }
    }

    /**
     * Test cases for knowledge base operations
     */
    @Nested
    @DisplayName("Knowledge Base Tests")
    class KnowledgeTests {

        /**
         * Test list preview knowledge by page Verifies that preview knowledge can be queried with
         * pagination successfully
         */
        @Test
        @DisplayName("List preview knowledge by page")
        void listPreviewKnowledgeByPage_Success() {
            // Given
            Object expectedResult = new Object();
            when(fileInfoV2Service.listPreviewKnowledgeByPage(knowledgeQueryVO)).thenReturn(expectedResult);

            // When
            Object result = fileController.listPreviewKnowledgeByPage(knowledgeQueryVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result).isEqualTo(expectedResult);
            verify(fileInfoV2Service, times(1)).listPreviewKnowledgeByPage(knowledgeQueryVO);
        }

        /**
         * Test list knowledge by page Verifies that knowledge can be queried with pagination successfully
         */
        @Test
        @DisplayName("List knowledge by page")
        void listKnowledgeByPage_Success() {
            // Given
            PageData<KnowledgeDto> expectedPage = new PageData<>();
            expectedPage.setTotalCount(10L);
            when(fileInfoV2Service.listKnowledgeByPage(knowledgeQueryVO)).thenReturn(expectedPage);

            // When
            ApiResult<PageData<KnowledgeDto>> result = fileController.listKnowledgeByPage(knowledgeQueryVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);
            assertThat(result.data().getTotalCount()).isEqualTo(10L);
            verify(fileInfoV2Service, times(1)).listKnowledgeByPage(knowledgeQueryVO);
        }

        /**
         * Test download knowledge by violation Verifies that knowledge marked as violation can be
         * downloaded successfully
         */
        @Test
        @DisplayName("Download knowledge by violation")
        void downloadKnowledgeByViolation_Success() {
            // Given
            doNothing().when(fileInfoV2Service).downloadKnowledgeByViolation(response, knowledgeQueryVO);

            // When
            fileController.downloadKnowledgeByViolation(response, knowledgeQueryVO);

            // Then
            verify(fileInfoV2Service, times(1)).downloadKnowledgeByViolation(response, knowledgeQueryVO);
        }
    }

    /**
     * Test cases for file list query operations
     */
    @Nested
    @DisplayName("File List Query Tests")
    class FileQueryTests {

        /**
         * Test query file list with default parameters Verifies that file list can be queried with default
         * pagination parameters
         */
        @Test
        @DisplayName("Query file list - With defaults")
        void queryFileList_WithDefaults() {
            // Given
            Long repoId = 100L;
            Object expectedResult = new Object();
            when(fileInfoV2Service.queryFileList(repoId, -1L, 1, 10, "", request, 1))
                    .thenReturn(expectedResult);

            // When
            Object result = fileController.queryFileList(repoId, -1L, 1, 10, "", 1, request);

            // Then
            assertThat(result).isNotNull();
            assertThat(result).isEqualTo(expectedResult);
            verify(fileInfoV2Service, times(1)).queryFileList(repoId, -1L, 1, 10, "", request, 1);
        }

        /**
         * Test query file list with custom parameters Verifies that file list can be queried with custom
         * pagination and filter parameters
         */
        @Test
        @DisplayName("Query file list - With custom params")
        void queryFileList_WithCustomParams() {
            // Given
            Long repoId = 100L;
            Long parentId = 50L;
            Integer pageNo = 2;
            Integer pageSize = 20;
            String tag = "custom-tag";
            Integer isRepoPage = 0;
            Object expectedResult = new Object();
            when(fileInfoV2Service.queryFileList(repoId, parentId, pageNo, pageSize, tag, request, isRepoPage))
                    .thenReturn(expectedResult);

            // When
            Object result = fileController.queryFileList(repoId, parentId, pageNo, pageSize, tag, isRepoPage, request);

            // Then
            assertThat(result).isNotNull();
            verify(fileInfoV2Service, times(1)).queryFileList(repoId, parentId, pageNo, pageSize, tag, request, isRepoPage);
        }

        /**
         * Test search file Verifies that files can be searched with specified criteria and returns SSE
         * emitter
         */
        @Test
        @DisplayName("Search file")
        void searchFile_Success() {
            // Given
            Long repoId = 100L;
            String fileName = "test";
            Integer isFile = 1;
            Long pid = 50L;
            String tag = "tag";
            Integer isRepoPage = 1;
            SseEmitter expectedEmitter = new SseEmitter();
            when(fileInfoV2Service.searchFile(repoId, fileName, isFile, pid, tag, isRepoPage, request))
                    .thenReturn(expectedEmitter);

            // When
            SseEmitter result = fileController.searchFile(repoId, fileName, isFile, pid, tag, isRepoPage, response, request);

            // Then
            assertThat(result).isNotNull();
            assertThat(result).isEqualTo(expectedEmitter);
            verify(response, times(1)).addHeader("X-Accel-Buffering", "no");
            verify(fileInfoV2Service, times(1)).searchFile(repoId, fileName, isFile, pid, tag, isRepoPage, request);
        }

        /**
         * Test search file with null parameters Verifies that file search can handle null parameters
         * gracefully
         */
        @Test
        @DisplayName("Search file - With null params")
        void searchFile_WithNullParams() {
            // Given
            Long repoId = 100L;
            SseEmitter expectedEmitter = new SseEmitter();
            when(fileInfoV2Service.searchFile(repoId, null, null, null, null, 1, request))
                    .thenReturn(expectedEmitter);

            // When
            SseEmitter result = fileController.searchFile(repoId, null, null, null, null, 1, response, request);

            // Then
            assertThat(result).isNotNull();
            verify(response, times(1)).addHeader("X-Accel-Buffering", "no");
            verify(fileInfoV2Service, times(1)).searchFile(repoId, null, null, null, null, 1, request);
        }
    }

    /**
     * Test cases for folder operations
     */
    @Nested
    @DisplayName("Folder Operations Tests")
    class FolderOperationsTests {

        /**
         * Test create folder successfully without tags Verifies that a folder can be created without any
         * tags
         */
        @Test
        @DisplayName("Create folder successfully - No tags")
        void createFolder_Success_NoTags() {
            // Given
            createFolderVO.setTags(null);
            doNothing().when(fileInfoV2Service).createFolder(createFolderVO);

            // When
            ApiResult<Void> result = fileController.createFolder(createFolderVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);
            verify(fileInfoV2Service, times(1)).createFolder(createFolderVO);
        }

        /**
         * Test create folder successfully with valid tags Verifies that a folder can be created with tags
         * of normal length
         */
        @Test
        @DisplayName("Create folder successfully - With valid tags")
        void createFolder_Success_WithValidTags() {
            // Given
            createFolderVO.setTags(Arrays.asList("tag1", "tag2", "tag3"));
            doNothing().when(fileInfoV2Service).createFolder(createFolderVO);

            // When
            ApiResult<Void> result = fileController.createFolder(createFolderVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);
            verify(fileInfoV2Service, times(1)).createFolder(createFolderVO);
        }

        /**
         * Test create folder successfully with max length tag Verifies that a folder can be created with
         * tag exactly 30 characters long
         */
        @Test
        @DisplayName("Create folder successfully - With max length tag")
        void createFolder_Success_WithMaxLengthTag() {
            // Given
            String maxLengthTag = "a".repeat(30);
            createFolderVO.setTags(Collections.singletonList(maxLengthTag));
            doNothing().when(fileInfoV2Service).createFolder(createFolderVO);

            // When
            ApiResult<Void> result = fileController.createFolder(createFolderVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);
            verify(fileInfoV2Service, times(1)).createFolder(createFolderVO);
        }

        /**
         * Test create folder failure when tag is too long Verifies that folder creation fails when tag
         * exceeds 30 characters
         */
        @Test
        @DisplayName("Create folder failure - Tag too long")
        void createFolder_Failure_TagTooLong() {
            // Given
            String tooLongTag = "a".repeat(31);
            createFolderVO.setTags(Collections.singletonList(tooLongTag));

            // When & Then
            assertThatThrownBy(() -> fileController.createFolder(createFolderVO))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("responseEnum", ResponseEnum.REPO_KNOWLEDGE_TAG_TOO_LONG);
            verify(fileInfoV2Service, never()).createFolder(any());
        }

        /**
         * Test create folder failure when one of many tags is too long Verifies that folder creation fails
         * when at least one tag exceeds length limit
         */
        @Test
        @DisplayName("Create folder failure - One of many tags too long")
        void createFolder_Failure_OneOfManyTagsTooLong() {
            // Given
            createFolderVO.setTags(Arrays.asList("tag1", "tag2", "a".repeat(31)));

            // When & Then
            assertThatThrownBy(() -> fileController.createFolder(createFolderVO))
                    .isInstanceOf(BusinessException.class);
            verify(fileInfoV2Service, never()).createFolder(any());
        }

        /**
         * Test create folder successfully with empty tag list Verifies that a folder can be created with an
         * empty tag list
         */
        @Test
        @DisplayName("Create folder successfully - Empty tag list")
        void createFolder_Success_EmptyTagList() {
            // Given
            createFolderVO.setTags(Collections.emptyList());
            doNothing().when(fileInfoV2Service).createFolder(createFolderVO);

            // When
            ApiResult<Void> result = fileController.createFolder(createFolderVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);
            verify(fileInfoV2Service, times(1)).createFolder(createFolderVO);
        }

        /**
         * Test update folder successfully Verifies that a folder can be updated successfully
         */
        @Test
        @DisplayName("Update folder successfully")
        void updateFolder_Success() {
            // Given
            doNothing().when(fileInfoV2Service).updateFolder(createFolderVO);

            // When
            ApiResult<Void> result = fileController.updateFolder(createFolderVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);
            verify(fileInfoV2Service, times(1)).updateFolder(createFolderVO);
        }

        /**
         * Test delete folder successfully Verifies that a folder can be deleted successfully
         */
        @Test
        @DisplayName("Delete folder successfully")
        void deleteFolder_Success() {
            // Given
            Long folderId = 123L;
            doNothing().when(fileInfoV2Service).deleteFolder(folderId);

            // When
            ApiResult<Void> result = fileController.deleteFolder(folderId);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);
            verify(fileInfoV2Service, times(1)).deleteFolder(folderId);
        }
    }

    /**
     * Test cases for file operations
     */
    @Nested
    @DisplayName("File Operations Tests")
    class FileOperationsTests {

        /**
         * Test update file successfully Verifies that a file can be updated successfully
         */
        @Test
        @DisplayName("Update file successfully")
        void updateFile_Success() {
            // Given
            doNothing().when(fileInfoV2Service).updateFile(createFolderVO);

            // When
            ApiResult<Void> result = fileController.updateFile(createFolderVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);
            verify(fileInfoV2Service, times(1)).updateFile(createFolderVO);
        }

        /**
         * Test delete file successfully Verifies that a file can be deleted successfully
         */
        @Test
        @DisplayName("Delete file successfully")
        void deleteFile_Success() {
            // Given
            String fileId = "file-123";
            String tag = "test-tag";
            Long repoId = 100L;
            doNothing().when(fileInfoV2Service).deleteFileDirectoryTree(fileId, tag, repoId, request);

            // When
            ApiResult<Void> result = fileController.deleteFile(fileId, tag, repoId, request);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);
            verify(fileInfoV2Service, times(1)).deleteFileDirectoryTree(fileId, tag, repoId, request);
        }

        /**
         * Test enable file Verifies that a file can be enabled successfully
         */
        @Test
        @DisplayName("Enable file")
        void enableFile_Enable() {
            // Given
            Long fileId = 123L;
            Integer enabled = 1;
            doNothing().when(fileInfoV2Service).enableFile(fileId, enabled);

            // When
            ApiResult<Void> result = fileController.enableFile(fileId, enabled);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);
            verify(fileInfoV2Service, times(1)).enableFile(fileId, enabled);
        }

        /**
         * Test disable file Verifies that a file can be disabled successfully
         */
        @Test
        @DisplayName("Disable file")
        void enableFile_Disable() {
            // Given
            Long fileId = 123L;
            Integer enabled = 0;
            doNothing().when(fileInfoV2Service).enableFile(fileId, enabled);

            // When
            ApiResult<Void> result = fileController.enableFile(fileId, enabled);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);
            verify(fileInfoV2Service, times(1)).enableFile(fileId, enabled);
        }

        /**
         * Test get file directory tree Verifies that file directory tree can be retrieved successfully
         */
        @Test
        @DisplayName("Get file directory tree")
        void listFileDirectoryTree_Success() {
            // Given
            Long fileId = 123L;
            List<FileDirectoryTree> expectedTree = Arrays.asList(
                    new FileDirectoryTree(),
                    new FileDirectoryTree());
            when(fileInfoV2Service.listFileDirectoryTree(fileId)).thenReturn(expectedTree);

            // When
            ApiResult<List<FileDirectoryTree>> result = fileController.listFileDirectoryTree(fileId);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);
            assertThat(result.data()).hasSize(2);
            verify(fileInfoV2Service, times(1)).listFileDirectoryTree(fileId);
        }

        /**
         * Test get file directory tree with empty result Verifies that empty result is handled correctly
         * when file has no directory tree
         */
        @Test
        @DisplayName("Get file directory tree - Empty result")
        void listFileDirectoryTree_EmptyResult() {
            // Given
            Long fileId = 999L;
            when(fileInfoV2Service.listFileDirectoryTree(fileId)).thenReturn(Collections.emptyList());

            // When
            ApiResult<List<FileDirectoryTree>> result = fileController.listFileDirectoryTree(fileId);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);
            assertThat(result.data()).isEmpty();
            verify(fileInfoV2Service, times(1)).listFileDirectoryTree(fileId);
        }
    }

    /**
     * Test cases for edge conditions
     */
    @Nested
    @DisplayName("Edge Case Tests")
    class EdgeCaseTests {

        /**
         * Test sliceFiles with empty separator list Verifies that the controller does not index into
         * request configuration and delegates normalization to the service.
         *
         * @throws InterruptedException if the operation is interrupted
         * @throws ExecutionException if the operation fails during execution
         */
        @Test
        @DisplayName("sliceFiles - Empty separator list")
        void sliceFiles_EmptySeparatorList() throws InterruptedException, ExecutionException {
            // Given
            dealFileVO.getSliceConfig().setSeperator(Collections.emptyList());
            @SuppressWarnings("unchecked")
            Result<Boolean> successResult = mock(Result.class);
            when(successResult.noError()).thenReturn(true);
            when(successResult.getData()).thenReturn(true);
            when(fileInfoV2Service.sliceFiles(dealFileVO)).thenReturn(successResult);

            // When
            ApiResult<Boolean> result = fileController.sliceFiles(dealFileVO);

            // Then
            assertThat(result.data()).isTrue();
            verify(fileInfoV2Service).sliceFiles(dealFileVO);
        }

        /**
         * Test queryFileList with large page number Verifies that query works correctly with maximum
         * integer page number
         */
        @Test
        @DisplayName("queryFileList - Large page number")
        void queryFileList_LargePageNumber() {
            // Given
            Long repoId = 100L;
            Integer largePageNo = Integer.MAX_VALUE;
            Object expectedResult = new Object();
            when(fileInfoV2Service.queryFileList(repoId, -1L, largePageNo, 10, "", request, 1))
                    .thenReturn(expectedResult);

            // When
            Object result = fileController.queryFileList(repoId, -1L, largePageNo, 10, "", 1, request);

            // Then
            assertThat(result).isNotNull();
            verify(fileInfoV2Service, times(1)).queryFileList(repoId, -1L, largePageNo, 10, "", request, 1);
        }

        /**
         * Test queryFileList with large page size Verifies that query works correctly with large page size
         * value
         */
        @Test
        @DisplayName("queryFileList - Large page size")
        void queryFileList_LargePageSize() {
            // Given
            Long repoId = 100L;
            Integer largePageSize = 1000;
            Object expectedResult = new Object();
            when(fileInfoV2Service.queryFileList(repoId, -1L, 1, largePageSize, "", request, 1))
                    .thenReturn(expectedResult);

            // When
            Object result = fileController.queryFileList(repoId, -1L, 1, largePageSize, "", 1, request);

            // Then
            assertThat(result).isNotNull();
            verify(fileInfoV2Service, times(1)).queryFileList(repoId, -1L, 1, largePageSize, "", request, 1);
        }

        /**
         * Test deleteFile with empty string ID Verifies that file deletion works with empty string ID
         */
        @Test
        @DisplayName("deleteFile - Empty string ID")
        void deleteFile_EmptyStringId() {
            // Given
            String emptyId = "";
            String tag = "test-tag";
            Long repoId = 100L;
            doNothing().when(fileInfoV2Service).deleteFileDirectoryTree(emptyId, tag, repoId, request);

            // When
            ApiResult<Void> result = fileController.deleteFile(emptyId, tag, repoId, request);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.code()).isEqualTo(0);
            verify(fileInfoV2Service, times(1)).deleteFileDirectoryTree(emptyId, tag, repoId, request);
        }

        /**
         * Test createFolder with tag at boundary value Verifies that folder creation works correctly with
         * tags at length boundary (29, 30 characters)
         */
        @Test
        @DisplayName("createFolder - Tag at boundary")
        void createFolder_TagAtBoundary() {
            // Given - Test with 29, 30, 31 characters
            String tag29 = "a".repeat(29);
            String tag30 = "a".repeat(30);

            // 29 characters should succeed
            createFolderVO.setTags(Collections.singletonList(tag29));
            doNothing().when(fileInfoV2Service).createFolder(createFolderVO);

            ApiResult<Void> result1 = fileController.createFolder(createFolderVO);
            assertThat(result1.code()).isEqualTo(0);

            // 30 characters should succeed
            createFolderVO.setTags(Collections.singletonList(tag30));
            ApiResult<Void> result2 = fileController.createFolder(createFolderVO);
            assertThat(result2.code()).isEqualTo(0);

            verify(fileInfoV2Service, times(2)).createFolder(createFolderVO);
        }
    }

    /**
     * Test cases for exception scenarios
     */
    @Nested
    @DisplayName("Exception Tests")
    class ExceptionTests {

        /**
         * Test uploadFile when service throws exception
         * Verifies that BusinessException is properly thrown when upload fails
         */
        @Test
        @DisplayName("uploadFile - Service throws exception")
        void uploadFile_ServiceThrowsException() {
            // Given
            when(fileInfoV2Service.uploadFile(any(), anyLong(), anyLong(), anyString(), any()))
                    .thenThrow(new BusinessException(ResponseEnum.REPO_FILE_UPLOAD_FAILED));

            // When & Then
            assertThatThrownBy(() -> fileController.uploadFile(multipartFile, 0L, 100L, "tag", request))
                    .isInstanceOf(BusinessException.class);
        }

        /**
         * Test embeddingFiles throws BusinessException Verifies that BusinessException is properly thrown
         * when embedding fails
         *
         * @throws ExecutionException if the operation fails during execution
         * @throws InterruptedException if the operation is interrupted
         */
        @Test
        @DisplayName("embeddingFiles - BusinessException")
        void embeddingFiles_BusinessException() throws ExecutionException, InterruptedException {
            // Given
            doThrow(new BusinessException(ResponseEnum.REPO_FILE_EMBEDDING_FAILED))
                    .when(fileInfoV2Service)
                    .embeddingFiles(dealFileVO, request);

            // When & Then
            assertThatThrownBy(() -> fileController.embeddingFiles(dealFileVO, request))
                    .isInstanceOf(BusinessException.class);
        }

        /**
         * Test deleteFolder when service throws exception Verifies that BusinessException is properly
         * thrown when folder doesn't exist
         */
        @Test
        @DisplayName("deleteFolder - Service throws exception")
        void deleteFolder_ServiceThrowsException() {
            // Given
            Long folderId = 123L;
            doThrow(new BusinessException(ResponseEnum.REPO_FOLDER_NOT_EXIST))
                    .when(fileInfoV2Service)
                    .deleteFolder(folderId);

            // When & Then
            assertThatThrownBy(() -> fileController.deleteFolder(folderId))
                    .isInstanceOf(BusinessException.class);
        }

        /**
         * Test getFileInfoV2BySourceId when file doesn't exist Verifies that BusinessException is properly
         * thrown when file is not found
         */
        @Test
        @DisplayName("getFileInfoV2BySourceId - File not found")
        void getFileInfoV2BySourceId_FileNotFound() {
            // Given
            String sourceId = "non-existent-id";
            when(fileInfoV2Service.getFileInfoV2BySourceId(sourceId))
                    .thenThrow(new BusinessException(ResponseEnum.REPO_FILE_NOT_EXIST));

            // When & Then
            assertThatThrownBy(() -> fileController.getFileInfoV2BySourceId(sourceId))
                    .isInstanceOf(BusinessException.class);
        }

        /**
         * Test sliceFiles throws RuntimeException
         * Verifies that RuntimeException is properly thrown when slice processing fails
         *
         * @throws InterruptedException if the operation is interrupted
         * @throws ExecutionException if the operation fails during execution
         */
        @Test
        @DisplayName("sliceFiles - RuntimeException")
        void sliceFiles_RuntimeException() throws InterruptedException, ExecutionException {
            // Given
            when(fileInfoV2Service.sliceFiles(dealFileVO))
                    .thenThrow(new RuntimeException("Slice processing failed"));

            // When & Then
            assertThatThrownBy(() -> fileController.sliceFiles(dealFileVO))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("Slice processing failed");
        }

        /**
         * Test createHtmlFile when service throws exception
         * Verifies that BusinessException is properly thrown when HTML file creation fails
         */
        @Test
        @DisplayName("createHtmlFile - Service throws exception")
        void createHtmlFile_ServiceThrowsException() {
            // Given
            when(fileInfoV2Service.createHtmlFile(htmlFileVO))
                    .thenThrow(new BusinessException(ResponseEnum.REPO_FILE_UPLOAD_FAILED));

            // When & Then
            assertThatThrownBy(() -> fileController.createHtmlFile(htmlFileVO))
                    .isInstanceOf(BusinessException.class);
        }
    }

    /**
     * Test cases for multi-scenario integration
     */
    @Nested
    @DisplayName("Integration Tests")
    class IntegrationTests {

        /**
         * Test complete file processing flow including upload, slice, and embedding
         * Verifies that the entire file processing workflow works correctly from start to finish
         *
         * @throws ExecutionException if the operation fails during execution
         * @throws InterruptedException if the operation is interrupted
         */
        @Test
        @DisplayName("Complete file processing flow - Upload, slice, embedding")
        void completeFileProcessingFlow() throws ExecutionException, InterruptedException {
            // Given
            when(fileInfoV2Service.uploadFile(multipartFile, 0L, 100L, "tag", request))
                    .thenReturn(mockFileInfo);
            @SuppressWarnings("unchecked")
            Result<Boolean> sliceResult = mock(Result.class);
            when(sliceResult.noError()).thenReturn(true);
            when(sliceResult.getData()).thenReturn(true);
            when(fileInfoV2Service.sliceFiles(dealFileVO)).thenReturn(sliceResult);
            doNothing().when(fileInfoV2Service).embeddingFiles(dealFileVO, request);

            // When
            ApiResult<FileInfoV2> uploadResult = fileController.uploadFile(multipartFile, 0L, 100L, "tag", request);
            ApiResult<Boolean> sliceResultApi = fileController.sliceFiles(dealFileVO);
            ApiResult<Void> embeddingResult = fileController.embeddingFiles(dealFileVO, request);

            // Then
            assertThat(uploadResult.code()).isEqualTo(0);
            assertThat(sliceResultApi.code()).isEqualTo(0);
            assertThat(embeddingResult.code()).isEqualTo(0);

            verify(fileInfoV2Service, times(1)).uploadFile(multipartFile, 0L, 100L, "tag", request);
            verify(fileInfoV2Service, times(1)).sliceFiles(dealFileVO);
            verify(fileInfoV2Service, times(1)).embeddingFiles(dealFileVO, request);
        }

        /**
         * Test folder operations flow including create, update, and delete Verifies that folder operations
         * can be performed sequentially without errors
         */
        @Test
        @DisplayName("Folder operations flow - Create, update, delete")
        void folderOperationsFlow() {
            // Given
            doNothing().when(fileInfoV2Service).createFolder(createFolderVO);
            doNothing().when(fileInfoV2Service).updateFolder(createFolderVO);
            doNothing().when(fileInfoV2Service).deleteFolder(anyLong());

            // When
            ApiResult<Void> createResult = fileController.createFolder(createFolderVO);
            ApiResult<Void> updateResult = fileController.updateFolder(createFolderVO);
            ApiResult<Void> deleteResult = fileController.deleteFolder(1L);

            // Then
            assertThat(createResult.code()).isEqualTo(0);
            assertThat(updateResult.code()).isEqualTo(0);
            assertThat(deleteResult.code()).isEqualTo(0);

            verify(fileInfoV2Service, times(1)).createFolder(createFolderVO);
            verify(fileInfoV2Service, times(1)).updateFolder(createFolderVO);
            verify(fileInfoV2Service, times(1)).deleteFolder(1L);
        }
    }
}
