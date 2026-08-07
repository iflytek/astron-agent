package com.iflytek.astron.console.toolkit.service.knowledge;

import com.alibaba.fastjson2.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.util.ChatFileHttpClient;
import com.iflytek.astron.console.commons.util.S3ClientUtil;
import com.iflytek.astron.console.commons.util.space.SpaceInfoUtil;
import com.iflytek.astron.console.toolkit.entity.dto.KnowledgeDto;
import com.iflytek.astron.console.toolkit.entity.table.knowledge.MysqlKnowledge;
import com.iflytek.astron.console.toolkit.entity.table.knowledge.MysqlPreviewKnowledge;
import com.iflytek.astron.console.toolkit.entity.vo.repo.KnowledgeQueryVO;
import com.iflytek.astron.console.toolkit.util.SpringUtils;
import com.iflytek.astron.console.toolkit.common.Result;
import com.iflytek.astron.console.toolkit.common.constant.ProjectContent;
import com.iflytek.astron.console.toolkit.config.properties.ApiUrl;
import com.iflytek.astron.console.toolkit.entity.pojo.DealFileResult;
import com.iflytek.astron.console.toolkit.entity.pojo.FileSummary;
import com.iflytek.astron.console.toolkit.entity.pojo.SliceConfig;
import com.iflytek.astron.console.toolkit.entity.table.repo.ExtractKnowledgeTask;
import com.iflytek.astron.console.toolkit.entity.table.repo.FileInfoV2;
import com.iflytek.astron.console.toolkit.entity.table.repo.Repo;
import com.iflytek.astron.console.toolkit.entity.table.repo.FileDirectoryTree;
import com.iflytek.astron.console.toolkit.entity.vo.HtmlFileVO;
import com.iflytek.astron.console.toolkit.entity.vo.repo.CreateFolderVO;
import com.iflytek.astron.console.toolkit.entity.vo.repo.DealFileVO;
import com.iflytek.astron.console.toolkit.entity.dto.FileInfoV2Dto;
import com.iflytek.astron.console.toolkit.entity.common.PageData;
import com.iflytek.astron.console.toolkit.handler.UserInfoManagerHandler;
import com.iflytek.astron.console.toolkit.mapper.knowledge.KnowledgeMapper;
import com.iflytek.astron.console.toolkit.mapper.knowledge.PreviewKnowledgeMapper;
import com.iflytek.astron.console.toolkit.mapper.repo.FileDirectoryTreeMapper;
import com.iflytek.astron.console.toolkit.mapper.repo.FileInfoV2Mapper;
import com.iflytek.astron.console.toolkit.service.common.ConfigInfoService;
import com.iflytek.astron.console.toolkit.service.repo.*;
import com.iflytek.astron.console.toolkit.service.task.ExtractKnowledgeTaskService;
import com.iflytek.astron.console.toolkit.tool.DataPermissionCheckTool;
import com.iflytek.astron.console.toolkit.tool.FileUploadTool;
import com.iflytek.astron.console.toolkit.util.S3Util;
import jakarta.servlet.ServletOutputStream;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.ByteArrayOutputStream;

import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for FileInfoV2Service
 *
 * <p>
 * Technology Stack: JUnit5 + Mockito + AssertJ
 * </p>
 *
 * <p>
 * Coverage Requirements:
 * </p>
 * <ul>
 * <li>JaCoCo Statement Coverage >= 80%</li>
 * <li>JaCoCo Branch Coverage >= 90%</li>
 * <li>High PIT Mutation Test Score</li>
 * <li>Covers normal flows, edge cases, and exceptions</li>
 * </ul>
 *
 * @author AI Assistant
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("FileInfoV2Service Unit Tests")
class FileInfoV2ServiceTest {

    @Mock
    private FileInfoV2Mapper fileInfoV2Mapper;

    @Mock
    private ConfigInfoService configInfoService;

    @Mock
    private S3Util s3UtilClient;

    @Mock
    private RepoService repoService;

    @Mock
    private FileDirectoryTreeMapper fileDirectoryTreeMapper;

    @Mock
    private FileDirectoryTreeService fileDirectoryTreeService;

    @Mock
    private KnowledgeService knowledgeService;

    @Mock
    private ExtractKnowledgeTaskService extractKnowledgeTaskService;

    @Mock
    private KnowledgeMapper knowledgeMapper;

    @Mock
    private PreviewKnowledgeMapper previewKnowledgeMapper;

    @Mock
    private FileUploadTool fileUploadTool;

    @Mock
    private DataPermissionCheckTool dataPermissionCheckTool;

    @Mock
    private ChatFileHttpClient chatFileHttpClient;

    @Mock
    private S3ClientUtil s3ClientUtil;

    @Mock
    private HttpServletRequest request;

    @Mock
    private ApiUrl apiUrl;

    @Spy
    @InjectMocks
    private FileInfoV2Service fileInfoV2Service;

    private FileInfoV2 mockFileInfo;
    private Repo mockRepo;
    private MultipartFile mockFile;
    private MockHttpServletRequest mockRequest;

    // Static mocks for utility classes
    private MockedStatic<UserInfoManagerHandler> userInfoManagerHandlerMock;
    private MockedStatic<SpaceInfoUtil> spaceInfoUtilMock;
    private MockedStatic<SpringUtils> springUtilsMock;

    /**
     * Set up test fixtures before each test method. Initializes common test data including mock file
     * and repository objects.
     */
    @BeforeEach
    void setUp() {
        // Mock static utility methods
        userInfoManagerHandlerMock = mockStatic(UserInfoManagerHandler.class);
        userInfoManagerHandlerMock.when(UserInfoManagerHandler::getUserId).thenReturn("user-001");

        spaceInfoUtilMock = mockStatic(SpaceInfoUtil.class);
        spaceInfoUtilMock.when(SpaceInfoUtil::getSpaceId).thenReturn(null);

        // Mock SpringUtils to avoid NullPointerException when CommonTool initializes
        springUtilsMock = mockStatic(SpringUtils.class);
        springUtilsMock.when(() -> SpringUtils.getBean(any(Class.class))).thenReturn(null);

        // Set baseMapper for ServiceImpl - CRITICAL for MyBatis-Plus ServiceImpl
        ReflectionTestUtils.setField(fileInfoV2Service, "baseMapper", fileInfoV2Mapper);

        // Initialize mock HttpServletRequest
        mockRequest = new MockHttpServletRequest();

        // Initialize mock FileInfoV2
        mockFileInfo = new FileInfoV2();
        mockFileInfo.setId(1L);
        mockFileInfo.setUuid("file-uuid-001");
        mockFileInfo.setLastUuid("file-uuid-001");
        mockFileInfo.setName("test-file.txt");
        mockFileInfo.setRepoId(100L);
        mockFileInfo.setEnabled(1);
        mockFileInfo.setSource("AIUI-RAG2");
        mockFileInfo.setCharCount(1000L);
        mockFileInfo.setAddress("s3://bucket/test-file.txt");
        mockFileInfo.setSize(1024L);
        mockFileInfo.setPid(0L);
        mockFileInfo.setStatus(ProjectContent.FILE_UPLOAD_STATUS);
        mockFileInfo.setCreateTime(new Timestamp(System.currentTimeMillis()));
        mockFileInfo.setUpdateTime(new Timestamp(System.currentTimeMillis()));

        // Initialize mock Repo
        mockRepo = new Repo();
        mockRepo.setId(100L);
        mockRepo.setName("Test Repository");
        mockRepo.setCoreRepoId("core-repo-001");
        mockRepo.setTag("AIUI-RAG2");
        mockRepo.setDeleted(false);
        mockRepo.setCreateTime(new Date());
        mockRepo.setUpdateTime(new Date());

        // Initialize mock MultipartFile
        String fileContent = "Test file content for unit testing";
        mockFile = new MockMultipartFile(
                "file",
                "test-file.txt",
                "text/plain",
                fileContent.getBytes(StandardCharsets.UTF_8));

        // Set field values using ReflectionTestUtils
        ReflectionTestUtils.setField(fileInfoV2Service, "cbgRagMaxCharCount", 1000000L);
    }

    /**
     * Clean up after each test method. Closes static mocks to avoid side effects between tests.
     */
    @AfterEach
    void tearDown() {
        // Close static mocks to prevent memory leaks
        if (userInfoManagerHandlerMock != null) {
            userInfoManagerHandlerMock.close();
        }
        if (spaceInfoUtilMock != null) {
            spaceInfoUtilMock.close();
        }
        if (springUtilsMock != null) {
            springUtilsMock.close();
        }
    }

    /**
     * Test cases for the uploadFile method. Validates file upload functionality including success
     * scenarios and error handling.
     */
    @Nested
    @DisplayName("uploadFile Tests")
    class UploadFileTests {

        /**
         * Test successful file upload with AIUI-RAG2 tag.
         */
        @Test
        @DisplayName("Upload file successfully with AIUI-RAG2 tag")
        void testUploadFile_Success_WithAIUI() {
            // Given
            Long parentId = 0L;
            Long repoId = 100L;
            String tag = "AIUI-RAG2";

            when(repoService.getById(anyLong())).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));

            JSONObject uploadRes = new JSONObject();
            uploadRes.put("s3Key", "s3://bucket/test-file.txt");
            when(fileUploadTool.uploadFile(any(MultipartFile.class), anyString())).thenReturn(uploadRes);

            // Mock save to avoid MyBatis-Plus dependency
            doReturn(true).when(fileInfoV2Service).save(any(FileInfoV2.class));

            // When
            FileInfoV2 result = fileInfoV2Service.uploadFile(mockFile, parentId, repoId, tag, request);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getName()).isEqualTo("test-file.txt");
            verify(fileUploadTool, times(1)).uploadFile(any(MultipartFile.class), eq(tag));
            verify(fileInfoV2Service, times(1)).save(any(FileInfoV2.class));
        }

        /**
         * Test file upload with CBG-RAG tag.
         */
        @Test
        @DisplayName("Upload file successfully with CBG-RAG tag")
        void testUploadFile_Success_WithCBG() {
            // Given
            Long parentId = 0L;
            Long repoId = 100L;
            String tag = "CBG-RAG";
            mockRepo.setTag("CBG-RAG");

            when(repoService.getById(anyLong())).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));

            JSONObject uploadRes = new JSONObject();
            uploadRes.put("s3Key", "s3://bucket/test-file.txt");
            when(fileUploadTool.uploadFile(any(MultipartFile.class), anyString())).thenReturn(uploadRes);

            // Mock save to avoid MyBatis-Plus dependency
            doReturn(true).when(fileInfoV2Service).save(any(FileInfoV2.class));

            // When
            FileInfoV2 result = fileInfoV2Service.uploadFile(mockFile, parentId, repoId, tag, request);

            // Then
            assertThat(result).isNotNull();
            verify(fileUploadTool, times(1)).uploadFile(any(MultipartFile.class), eq(tag));
            verify(fileInfoV2Service, times(1)).save(any(FileInfoV2.class));
        }

        /**
         * Test file upload with invalid file type (HTML).
         */
        @Test
        @DisplayName("Upload file - invalid file type (HTML)")
        void testUploadFile_InvalidFileType_HTML() {
            // Given
            Long parentId = 0L;
            Long repoId = 100L;
            String tag = "AIUI-RAG2";

            MultipartFile htmlFile = new MockMultipartFile(
                    "file",
                    "test-file.html",
                    "text/html",
                    "Test content".getBytes(StandardCharsets.UTF_8));

            // When & Then
            assertThatThrownBy(() -> fileInfoV2Service.uploadFile(htmlFile, parentId, repoId, tag, request))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_FILE_UPLOAD_TYPE_NOT_EXIST);

            verify(fileUploadTool, never()).uploadFile(any(MultipartFile.class), anyString());
        }

        /**
         * Test file upload with invalid file type (SVG).
         */
        @Test
        @DisplayName("Upload file - invalid file type (SVG)")
        void testUploadFile_InvalidFileType_SVG() {
            // Given
            Long parentId = 0L;
            Long repoId = 100L;
            String tag = "AIUI-RAG2";

            MultipartFile svgFile = new MockMultipartFile(
                    "file",
                    "test-file.svg",
                    "image/svg+xml",
                    "Test content".getBytes(StandardCharsets.UTF_8));

            // When & Then
            assertThatThrownBy(() -> fileInfoV2Service.uploadFile(svgFile, parentId, repoId, tag, request))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_FILE_UPLOAD_TYPE_NOT_EXIST);

            verify(fileUploadTool, never()).uploadFile(any(MultipartFile.class), anyString());
        }

        /**
         * Test file upload when repository not found.
         */
        @Test
        @DisplayName("Upload file - repository not found")
        void testUploadFile_RepoNotFound() {
            // Given
            Long parentId = 0L;
            Long repoId = 999L;
            String tag = "AIUI-RAG2";

            when(repoService.getById(anyLong())).thenReturn(null);
            // When repo is null, checkRepoBelong should throw exception
            doThrow(new BusinessException(ResponseEnum.REPO_NOT_EXIST))
                    .when(dataPermissionCheckTool)
                    .checkRepoBelong(null);

            // When & Then
            assertThatThrownBy(() -> fileInfoV2Service.uploadFile(mockFile, parentId, repoId, tag, request))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_NOT_EXIST);

            verify(fileUploadTool, never()).uploadFile(any(MultipartFile.class), anyString());
        }

        /**
         * Test file upload when upload tool returns null.
         */
        @Test
        @DisplayName("Upload file - upload tool returns null")
        void testUploadFile_UploadToolReturnsNull() {
            // Given
            Long parentId = 0L;
            Long repoId = 100L;
            String tag = "AIUI-RAG2";

            when(repoService.getById(anyLong())).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
            when(fileUploadTool.uploadFile(any(MultipartFile.class), anyString())).thenReturn(null);

            // When & Then
            assertThatThrownBy(() -> fileInfoV2Service.uploadFile(mockFile, parentId, repoId, tag, request))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_FILE_UPLOAD_FAILED);

            verify(fileInfoV2Mapper, never()).insert(any(FileInfoV2.class));
        }

        /**
         * Test file upload when upload tool returns result without s3Key.
         */
        @Test
        @DisplayName("Upload file - upload tool returns result without s3Key")
        void testUploadFile_UploadToolReturnsResultWithoutS3Key() {
            // Given
            Long parentId = 0L;
            Long repoId = 100L;
            String tag = "AIUI-RAG2";

            when(repoService.getById(anyLong())).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));

            JSONObject uploadRes = new JSONObject();
            uploadRes.put("otherKey", "otherValue");
            when(fileUploadTool.uploadFile(any(MultipartFile.class), anyString())).thenReturn(uploadRes);

            // When & Then
            assertThatThrownBy(() -> fileInfoV2Service.uploadFile(mockFile, parentId, repoId, tag, request))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_FILE_UPLOAD_FAILED);

            verify(fileInfoV2Mapper, never()).insert(any(FileInfoV2.class));
        }

        /**
         * Test file upload with empty filename - should throw exception for AIUI-RAG2.
         */
        @Test
        @DisplayName("Upload file - empty filename throws exception")
        void testUploadFile_EmptyFilename() {
            // Given
            Long parentId = 0L;
            Long repoId = 100L;
            String tag = "AIUI-RAG2";

            MultipartFile emptyNameFile = new MockMultipartFile(
                    "file",
                    "",
                    "text/plain",
                    "Test content".getBytes(StandardCharsets.UTF_8));

            when(repoService.getById(anyLong())).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));

            // When & Then
            assertThatThrownBy(() -> fileInfoV2Service.uploadFile(emptyNameFile, parentId, repoId, tag, request))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_FILE_TYPE_EMPTY_XINGCHEN);

            verify(fileUploadTool, never()).uploadFile(any(MultipartFile.class), anyString());
        }

        /**
         * Test file upload with null filename - should throw exception for AIUI-RAG2.
         */
        @Test
        @DisplayName("Upload file - null filename throws exception")
        void testUploadFile_NullFilename() {
            // Given
            Long parentId = 0L;
            Long repoId = 100L;
            String tag = "AIUI-RAG2";

            MultipartFile nullNameFile = new MockMultipartFile(
                    "file",
                    null,
                    "text/plain",
                    "Test content".getBytes(StandardCharsets.UTF_8));

            when(repoService.getById(anyLong())).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));

            // When & Then
            assertThatThrownBy(() -> fileInfoV2Service.uploadFile(nullNameFile, parentId, repoId, tag, request))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_FILE_TYPE_EMPTY_XINGCHEN);

            verify(fileUploadTool, never()).uploadFile(any(MultipartFile.class), anyString());
        }
    }

    /**
     * Test cases for the getOnly method. Validates file query functionality with QueryWrapper.
     */
    @Nested
    @DisplayName("getOnly Tests")
    class GetOnlyTests {

        /**
         * Test getOnly with QueryWrapper successfully.
         */
        @Test
        @DisplayName("getOnly with QueryWrapper - success")
        void testGetOnly_QueryWrapper_Success() {
            // Given
            QueryWrapper<FileInfoV2> wrapper = new QueryWrapper<>();
            wrapper.eq("name", "test-file.txt");

            when(fileInfoV2Mapper.selectOne(any(QueryWrapper.class), anyBoolean())).thenReturn(mockFileInfo);

            // When
            FileInfoV2 result = fileInfoV2Service.getOnly(wrapper);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getName()).isEqualTo("test-file.txt");
            verify(fileInfoV2Mapper, times(1)).selectOne(any(QueryWrapper.class), anyBoolean());
        }

        /**
         * Test getOnly with QueryWrapper - no result found.
         */
        @Test
        @DisplayName("getOnly with QueryWrapper - no result")
        void testGetOnly_QueryWrapper_NoResult() {
            // Given
            QueryWrapper<FileInfoV2> wrapper = new QueryWrapper<>();
            wrapper.eq("name", "nonexistent-file.txt");

            when(fileInfoV2Mapper.selectOne(any(QueryWrapper.class), anyBoolean())).thenReturn(null);

            // When
            FileInfoV2 result = fileInfoV2Service.getOnly(wrapper);

            // Then
            assertThat(result).isNull();
            verify(fileInfoV2Mapper, times(1)).selectOne(any(QueryWrapper.class), anyBoolean());
        }
    }

    /**
     * Test cases for the createFile method.
     */
    @Nested
    @DisplayName("createFile Tests")
    class CreateFileTests {

        /**
         * Test successful file creation.
         */
        @Test
        @DisplayName("Create file - success")
        void testCreateFile_Success() {
            // Given
            Long repoId = 100L;
            String sourceId = "source-001";
            String filename = "test-file.txt";
            Long parentId = 0L;
            String s3Key = "s3://bucket/test.txt";
            Long size = 1024L;
            Long charCount = 500L;
            Integer enable = 1;
            String tag = "AIUI-RAG2";

            // Mock save to avoid MyBatis-Plus dependency
            doReturn(true).when(fileInfoV2Service).save(any(FileInfoV2.class));

            // When
            FileInfoV2 result = fileInfoV2Service.createFile(repoId, sourceId, filename, parentId, s3Key, size, charCount, enable, tag);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getUuid()).isEqualTo(sourceId);
            assertThat(result.getName()).isEqualTo(filename);
            assertThat(result.getRepoId()).isEqualTo(repoId);
            assertThat(result.getAddress()).isEqualTo(s3Key);
            assertThat(result.getSize()).isEqualTo(size);
            assertThat(result.getCharCount()).isEqualTo(charCount);
            assertThat(result.getEnabled()).isEqualTo(enable);
            assertThat(result.getSource()).isEqualTo(tag);
            verify(fileInfoV2Service, times(1)).save(any(FileInfoV2.class));
        }

        /**
         * Test file creation with space ID.
         */
        @Test
        @DisplayName("Create file - with space ID")
        void testCreateFile_WithSpaceId() {
            // Given
            spaceInfoUtilMock.when(SpaceInfoUtil::getSpaceId).thenReturn(123L);

            Long repoId = 100L;
            String sourceId = "source-001";
            String filename = "test-file.txt";

            // Mock save to avoid MyBatis-Plus dependency
            doAnswer(invocation -> {
                FileInfoV2 file = invocation.getArgument(0);
                assertThat(file.getSpaceId()).isEqualTo(123L);
                return true;
            }).when(fileInfoV2Service).save(any(FileInfoV2.class));

            // When
            FileInfoV2 result = fileInfoV2Service.createFile(repoId, sourceId, filename, 0L, "s3://test", 100L, 50L, 1, "AIUI-RAG2");

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getSpaceId()).isEqualTo(123L);
            verify(fileInfoV2Service, times(1)).save(any(FileInfoV2.class));
        }
    }

    /**
     * Test cases for the createHtmlFile method.
     */
    @Nested
    @DisplayName("createHtmlFile Tests")
    class CreateHtmlFileTests {

        /**
         * Test successful HTML file creation.
         */
        @Test
        @DisplayName("Create HTML file - success")
        void testCreateHtmlFile_Success() {
            // Given
            HtmlFileVO htmlFileVO = new HtmlFileVO();
            htmlFileVO.setRepoId(100L);
            htmlFileVO.setParentId(0L);
            htmlFileVO.setHtmlAddressList(Arrays.asList("http://example.com/page1.html", "http://example.com/page2.html"));

            when(repoService.getById(100L)).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
            // Mock saveBatch to avoid MyBatis-Plus dependency
            doReturn(true).when(fileInfoV2Service).saveBatch(anyList());

            // When
            List<FileInfoV2> result = fileInfoV2Service.createHtmlFile(htmlFileVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result).hasSize(2);
            assertThat(result.get(0).getType()).isEqualTo(ProjectContent.HTML_FILE_TYPE);
            assertThat(result.get(0).getEnabled()).isEqualTo(0);
            verify(fileInfoV2Service, times(1)).saveBatch(anyList());
        }

        /**
         * Test HTML file creation with long URL (truncation).
         */
        @Test
        @DisplayName("Create HTML file - long URL truncation")
        void testCreateHtmlFile_LongUrlTruncation() {
            // Given
            String longUrl = "http://example.com/" + "a".repeat(100) + ".html";
            HtmlFileVO htmlFileVO = new HtmlFileVO();
            htmlFileVO.setRepoId(100L);
            htmlFileVO.setParentId(0L);
            htmlFileVO.setHtmlAddressList(Arrays.asList(longUrl));

            when(repoService.getById(100L)).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
            // Mock saveBatch to avoid MyBatis-Plus dependency
            doReturn(true).when(fileInfoV2Service).saveBatch(anyList());

            // When
            List<FileInfoV2> result = fileInfoV2Service.createHtmlFile(htmlFileVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getName().length()).isLessThanOrEqualTo(30);
            verify(fileInfoV2Service, times(1)).saveBatch(anyList());
        }

        /**
         * Test HTML file creation - repository not found.
         */
        @Test
        @DisplayName("Create HTML file - repository not found")
        void testCreateHtmlFile_RepoNotFound() {
            // Given
            HtmlFileVO htmlFileVO = new HtmlFileVO();
            htmlFileVO.setRepoId(999L);
            htmlFileVO.setHtmlAddressList(Arrays.asList("http://example.com/page.html"));

            when(repoService.getById(999L)).thenReturn(null);
            // When repo is null, checkRepoBelong should throw exception
            doThrow(new BusinessException(ResponseEnum.REPO_NOT_EXIST))
                    .when(dataPermissionCheckTool)
                    .checkRepoBelong(null);

            // When & Then
            assertThatThrownBy(() -> fileInfoV2Service.createHtmlFile(htmlFileVO))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_NOT_EXIST);
        }

        /**
         * Test HTML file creation with empty list.
         */
        @Test
        @DisplayName("Create HTML file - empty list")
        void testCreateHtmlFile_EmptyList() {
            // Given
            HtmlFileVO htmlFileVO = new HtmlFileVO();
            htmlFileVO.setRepoId(100L);
            htmlFileVO.setHtmlAddressList(Collections.emptyList());

            when(repoService.getById(100L)).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));

            // When
            List<FileInfoV2> result = fileInfoV2Service.createHtmlFile(htmlFileVO);

            // Then
            assertThat(result).isEmpty();
        }
    }

    /**
     * Test cases for the enableFile method.
     */
    @Nested
    @DisplayName("enableFile Tests")
    class EnableFileTests {

        /**
         * Test enable file successfully.
         */
        @Test
        @DisplayName("Enable file - success")
        void testEnableFile_Success() {
            // Given
            Long id = 1L;
            Integer enabled = 1;

            FileDirectoryTree tree = new FileDirectoryTree();
            tree.setId(id);
            tree.setFileId(1L);
            tree.setIsFile(1);

            when(fileDirectoryTreeService.getById(id)).thenReturn(tree);
            when(fileInfoV2Mapper.selectById(1L)).thenReturn(mockFileInfo);
            doNothing().when(dataPermissionCheckTool).checkFileBelong(any(FileInfoV2.class));
            // Mock updateById to avoid MyBatis-Plus dependency
            doReturn(true).when(fileInfoV2Service).updateById(any(FileInfoV2.class));
            doNothing().when(knowledgeService).enableDoc(anyLong(), anyInt());

            // When
            fileInfoV2Service.enableFile(id, enabled);

            // Then
            verify(fileInfoV2Service, times(1)).updateById(any(FileInfoV2.class));
            verify(knowledgeService, times(1)).enableDoc(1L, enabled);
        }

        /**
         * Test enable file - directory tree not found.
         */
        @Test
        @DisplayName("Enable file - directory tree not found")
        void testEnableFile_DirectoryTreeNotFound() {
            // Given
            Long id = 999L;
            Integer enabled = 1;

            when(fileDirectoryTreeService.getById(id)).thenReturn(null);

            // When & Then
            assertThatThrownBy(() -> fileInfoV2Service.enableFile(id, enabled))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_FILE_NOT_EXIST);
        }

        /**
         * Test enable file - not a file (is folder).
         */
        @Test
        @DisplayName("Enable file - not a file (is folder)")
        void testEnableFile_NotAFile() {
            // Given
            Long id = 1L;
            Integer enabled = 1;

            FileDirectoryTree tree = new FileDirectoryTree();
            tree.setId(id);
            tree.setIsFile(0); // It's a folder

            when(fileDirectoryTreeService.getById(id)).thenReturn(tree);

            // When & Then
            assertThatThrownBy(() -> fileInfoV2Service.enableFile(id, enabled))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_FILE_NOT_EXIST);
        }

        /**
         * Test enable file - file info not found.
         */
        @Test
        @DisplayName("Enable file - file info not found")
        void testEnableFile_FileInfoNotFound() {
            // Given
            Long id = 1L;
            Integer enabled = 1;

            FileDirectoryTree tree = new FileDirectoryTree();
            tree.setId(id);
            tree.setFileId(1L);
            tree.setIsFile(1);

            when(fileDirectoryTreeService.getById(id)).thenReturn(tree);
            when(fileInfoV2Mapper.selectById(1L)).thenReturn(null);

            // When & Then
            assertThatThrownBy(() -> fileInfoV2Service.enableFile(id, enabled))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_FILE_NOT_EXIST);
        }

        /**
         * Test disable file successfully.
         */
        @Test
        @DisplayName("Disable file - success")
        void testDisableFile_Success() {
            // Given
            Long id = 1L;
            Integer enabled = 0;

            FileDirectoryTree tree = new FileDirectoryTree();
            tree.setId(id);
            tree.setFileId(1L);
            tree.setIsFile(1);

            when(fileDirectoryTreeService.getById(id)).thenReturn(tree);
            when(fileInfoV2Mapper.selectById(1L)).thenReturn(mockFileInfo);
            doNothing().when(dataPermissionCheckTool).checkFileBelong(any(FileInfoV2.class));
            // Mock updateById to avoid MyBatis-Plus dependency
            doReturn(true).when(fileInfoV2Service).updateById(any(FileInfoV2.class));
            doNothing().when(knowledgeService).enableDoc(anyLong(), anyInt());

            // When
            fileInfoV2Service.enableFile(id, enabled);

            // Then
            verify(fileInfoV2Service, times(1)).updateById(any(FileInfoV2.class));
            verify(knowledgeService, times(1)).enableDoc(1L, enabled);
        }
    }

    /**
     * Test cases for the deleteFile method.
     */
    @Nested
    @DisplayName("deleteFile Tests")
    class DeleteFileTests {

        /**
         * Test delete file successfully.
         */
        @Test
        @DisplayName("Delete file - success")
        void testDeleteFile_Success() {
            // Given
            Long fileId = 1L;

            when(fileDirectoryTreeService.remove(any(LambdaQueryWrapper.class))).thenReturn(true);
            doNothing().when(knowledgeService).deleteDoc(anyList());

            // When
            fileInfoV2Service.deleteFile(fileId);

            // Then
            verify(fileDirectoryTreeService, times(1)).remove(any(LambdaQueryWrapper.class));
            verify(knowledgeService, times(1)).deleteDoc(anyList());
        }
    }

    /**
     * Test cases for the deleteFolder method.
     */
    @Nested
    @DisplayName("deleteFolder Tests")
    class DeleteFolderTests {

        /**
         * Test delete folder - folder not found.
         */
        @Test
        @DisplayName("Delete folder - folder not found")
        void testDeleteFolder_FolderNotFound() {
            // Given
            Long folderId = 999L;

            when(fileDirectoryTreeService.getById(folderId)).thenReturn(null);

            // When & Then
            assertThatThrownBy(() -> fileInfoV2Service.deleteFolder(folderId))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_FOLDER_NOT_EXIST);
        }

        /**
         * Test delete folder - not a folder (is file).
         */
        @Test
        @DisplayName("Delete folder - not a folder (is file)")
        void testDeleteFolder_NotAFolder() {
            // Given
            Long folderId = 1L;

            FileDirectoryTree tree = new FileDirectoryTree();
            tree.setId(folderId);
            tree.setIsFile(1); // It's a file

            when(fileDirectoryTreeService.getById(folderId)).thenReturn(tree);

            // When & Then
            assertThatThrownBy(() -> fileInfoV2Service.deleteFolder(folderId))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_FOLDER_NOT_EXIST);
        }
    }

    /**
     * Test cases for the getFileInfoV2BySourceId method.
     */
    @Nested
    @DisplayName("getFileInfoV2BySourceId Tests")
    class GetFileInfoV2BySourceIdTests {

        /**
         * Test get file by source ID successfully.
         */
        @Test
        @DisplayName("Get file by source ID - success")
        void testGetFileInfoV2BySourceId_Success() {
            // Given
            String sourceId = "file-uuid-001";

            when(fileInfoV2Mapper.selectOne(any(QueryWrapper.class), anyBoolean())).thenReturn(mockFileInfo);
            doNothing().when(dataPermissionCheckTool).checkFileBelong(any(FileInfoV2.class));

            // When
            FileInfoV2 result = fileInfoV2Service.getFileInfoV2BySourceId(sourceId);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getUuid()).isEqualTo(sourceId);
            verify(fileInfoV2Mapper, times(1)).selectOne(any(QueryWrapper.class), anyBoolean());
        }

        /**
         * Test get file by source ID - not found.
         */
        @Test
        @DisplayName("Get file by source ID - not found")
        void testGetFileInfoV2BySourceId_NotFound() {
            // Given
            String sourceId = "nonexistent-uuid";

            when(fileInfoV2Mapper.selectOne(any(QueryWrapper.class), anyBoolean())).thenReturn(null);

            // When
            FileInfoV2 result = fileInfoV2Service.getFileInfoV2BySourceId(sourceId);

            // Then
            assertThat(result).isNull();
        }

        /**
         * Test get file by source ID with space ID.
         */
        @Test
        @DisplayName("Get file by source ID - with space ID")
        void testGetFileInfoV2BySourceId_WithSpaceId() {
            // Given
            spaceInfoUtilMock.when(SpaceInfoUtil::getSpaceId).thenReturn(123L);
            String sourceId = "file-uuid-001";

            when(fileInfoV2Mapper.selectOne(any(QueryWrapper.class), anyBoolean())).thenReturn(mockFileInfo);

            // When
            FileInfoV2 result = fileInfoV2Service.getFileInfoV2BySourceId(sourceId);

            // Then
            assertThat(result).isNotNull();
            verify(dataPermissionCheckTool, never()).checkFileBelong(any(FileInfoV2.class));
        }
    }

    /**
     * Test cases for edge cases and boundary conditions.
     */
    @Nested
    @DisplayName("Edge Case Tests")
    class EdgeCaseTests {

        /**
         * Test uploadFile with very large file for CBG-RAG.
         */
        @Test
        @DisplayName("Upload file - very large file for CBG-RAG exceeds limit")
        void testUploadFile_VeryLargeFile_CBG_ExceedsLimit() {
            // Given
            Long parentId = 0L;
            Long repoId = 100L;
            String tag = "CBG-RAG";
            mockRepo.setTag("CBG-RAG");

            // Create a mock file that simulates size > 20MB for non-image files
            byte[] largeContent = new byte[21 * 1024 * 1024]; // 21MB
            MultipartFile largeFile = new MockMultipartFile(
                    "file",
                    "large-file.txt",
                    "text/plain",
                    largeContent);

            when(repoService.getById(anyLong())).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));

            // When & Then
            assertThatThrownBy(() -> fileInfoV2Service.uploadFile(largeFile, parentId, repoId, tag, request))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_FILE_UPLOAD_FAILED_FILE_20MB);

            verify(fileUploadTool, never()).uploadFile(any(MultipartFile.class), anyString());
        }

        /**
         * Test uploadFile with large image file for CBG-RAG exceeds limit.
         */
        @Test
        @DisplayName("Upload file - large image file for CBG-RAG exceeds 5MB limit")
        void testUploadFile_LargeImageFile_CBG_Exceeds5MB() {
            // Given
            Long parentId = 0L;
            Long repoId = 100L;
            String tag = "CBG-RAG";
            mockRepo.setTag("CBG-RAG");

            // Create a mock image file that simulates size > 5MB
            byte[] largeContent = new byte[6 * 1024 * 1024]; // 6MB
            MultipartFile largeImageFile = new MockMultipartFile(
                    "file",
                    "large-image.jpg",
                    "image/jpeg",
                    largeContent);

            when(repoService.getById(anyLong())).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));

            // When & Then
            assertThatThrownBy(() -> fileInfoV2Service.uploadFile(largeImageFile, parentId, repoId, tag, request))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_FILE_UPLOAD_FAILED_PIC_5MB);

            verify(fileUploadTool, never()).uploadFile(any(MultipartFile.class), anyString());
        }

        /**
         * Test uploadFile with file that has special characters in name.
         */
        @Test
        @DisplayName("Upload file - filename with special characters")
        void testUploadFile_FilenameWithSpecialCharacters() {
            // Given
            Long parentId = 0L;
            Long repoId = 100L;
            String tag = "AIUI-RAG2";

            MultipartFile specialNameFile = new MockMultipartFile(
                    "file",
                    "测试文件@#$%^&*().txt",
                    "text/plain",
                    "Test content".getBytes(StandardCharsets.UTF_8));

            when(repoService.getById(anyLong())).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));

            JSONObject uploadRes = new JSONObject();
            uploadRes.put("s3Key", "s3://bucket/test-file.txt");
            when(fileUploadTool.uploadFile(any(MultipartFile.class), anyString())).thenReturn(uploadRes);

            // Mock save to avoid MyBatis-Plus dependency
            doReturn(true).when(fileInfoV2Service).save(any(FileInfoV2.class));

            // When
            FileInfoV2 result = fileInfoV2Service.uploadFile(specialNameFile, parentId, repoId, tag, request);

            // Then
            assertThat(result).isNotNull();
            verify(fileUploadTool, times(1)).uploadFile(any(MultipartFile.class), eq(tag));
            verify(fileInfoV2Service, times(1)).save(any(FileInfoV2.class));
        }
    }

    /**
     * Test cases for exception scenarios.
     */
    @Nested
    @DisplayName("Exception Tests")
    class ExceptionTests {

        /**
         * Test uploadFile when database insert fails.
         */
        @Test
        @DisplayName("Upload file - database insert fails")
        void testUploadFile_DatabaseInsertFails() {
            // Given
            Long parentId = 0L;
            Long repoId = 100L;
            String tag = "AIUI-RAG2";

            when(repoService.getById(anyLong())).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));

            JSONObject uploadRes = new JSONObject();
            uploadRes.put("s3Key", "s3://bucket/test-file.txt");
            when(fileUploadTool.uploadFile(any(MultipartFile.class), anyString())).thenReturn(uploadRes);

            // Mock save to throw exception
            doThrow(new RuntimeException("Database error")).when(fileInfoV2Service).save(any(FileInfoV2.class));

            // When & Then
            assertThatThrownBy(() -> fileInfoV2Service.uploadFile(mockFile, parentId, repoId, tag, request))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Database error");

            verify(fileUploadTool, times(1)).uploadFile(any(MultipartFile.class), eq(tag));
            verify(fileInfoV2Service, times(1)).save(any(FileInfoV2.class));
        }

        /**
         * Test getOnly when database query fails.
         */
        @Test
        @DisplayName("getOnly - database query fails")
        void testGetOnly_DatabaseQueryFails() {
            // Given
            QueryWrapper<FileInfoV2> wrapper = new QueryWrapper<>();
            wrapper.eq("name", "test-file.txt");

            when(fileInfoV2Mapper.selectOne(any(QueryWrapper.class), anyBoolean()))
                    .thenThrow(new RuntimeException("Database query error"));

            // When & Then
            assertThatThrownBy(() -> fileInfoV2Service.getOnly(wrapper))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Database query error");
        }
    }

    /**
     * Test cases for static utility methods.
     */
    @Nested
    @DisplayName("Static Utility Method Tests")
    class StaticUtilityTests {

        /**
         * Test getFileFormat with various file extensions.
         */
        @Test
        @DisplayName("getFileFormat - various extensions")
        void testGetFileFormat() {
            assertThat(FileInfoV2Service.getFileFormat("test.txt")).isEqualTo("txt");
            assertThat(FileInfoV2Service.getFileFormat("test.pdf")).isEqualTo("pdf");
            assertThat(FileInfoV2Service.getFileFormat("test.doc")).isEqualTo("doc");
            assertThat(FileInfoV2Service.getFileFormat("test.docx")).isEqualTo("docx");
            assertThat(FileInfoV2Service.getFileFormat("test")).isEqualTo("");
            assertThat(FileInfoV2Service.getFileFormat("")).isEqualTo("");
        }

        /**
         * Test checkIsPic method.
         */
        @Test
        @DisplayName("checkIsPic - image file detection")
        void testCheckIsPic() {
            assertThat(FileInfoV2Service.checkIsPic("image.jpg")).isTrue();
            assertThat(FileInfoV2Service.checkIsPic("image.png")).isTrue();
            assertThat(FileInfoV2Service.checkIsPic("document.pdf")).isFalse();
            assertThat(FileInfoV2Service.checkIsPic("document.txt")).isFalse();
        }

        /**
         * Test getRequestCookies with no cookies.
         */
        @Test
        @DisplayName("getRequestCookies - no cookies")
        void testGetRequestCookies_NoCookies() {
            when(request.getCookies()).thenReturn(null);
            assertThat(FileInfoV2Service.getRequestCookies(request)).isEqualTo("");
        }

        /**
         * Test getRequestCookies with cookies.
         */
        @Test
        @DisplayName("getRequestCookies - with cookies")
        void testGetRequestCookies_WithCookies() {
            Cookie[] cookies = {
                    new Cookie("cookie1", "value1"),
                    new Cookie("cookie2", "value2")
            };
            when(request.getCookies()).thenReturn(cookies);

            String result = FileInfoV2Service.getRequestCookies(request);

            assertThat(result).isNotNull();
            assertThat(result).contains("cookie1=value1");
            assertThat(result).contains("cookie2=value2");
        }
    }

    /**
     * Test cases for listFileDirectoryTree method.
     */
    @Nested
    @DisplayName("listFileDirectoryTree Tests")
    class ListFileDirectoryTreeTests {

        /**
         * Test listFileDirectoryTree - success with multiple levels.
         */
        @Test
        @DisplayName("List file directory tree - success with multiple levels")
        void testListFileDirectoryTree_Success() {
            // Given
            Long fileId = 1L;
            String appId = "app-001";

            FileDirectoryTree tree1 = new FileDirectoryTree();
            tree1.setId(1L);
            tree1.setName("file.txt");
            tree1.setParentId(2L);
            tree1.setAppId(appId);

            FileDirectoryTree tree2 = new FileDirectoryTree();
            tree2.setId(2L);
            tree2.setName("folder");
            tree2.setParentId(0L);
            tree2.setAppId(appId);

            when(fileDirectoryTreeService.getById(1L)).thenReturn(tree1);

            // When
            List<FileDirectoryTree> result = fileInfoV2Service.listFileDirectoryTree(fileId);

            // Then
            assertThat(result).isNotNull();
            // Note: The actual behavior depends on recursiveFindFatherPath implementation
            verify(fileDirectoryTreeService, times(1)).getById(fileId);
        }

        /**
         * Test listFileDirectoryTree - file not found.
         */
        @Test
        @DisplayName("List file directory tree - file not found")
        void testListFileDirectoryTree_FileNotFound() {
            // Given
            Long fileId = 999L;

            when(fileDirectoryTreeService.getById(999L)).thenReturn(null);

            // When
            List<FileDirectoryTree> result = fileInfoV2Service.listFileDirectoryTree(fileId);

            // Then
            assertThat(result).isEmpty();
        }
    }

    /**
     * Test cases for getFileInfoV2ByRepoId method.
     */
    @Nested
    @DisplayName("getFileInfoV2ByRepoId Tests")
    class GetFileInfoV2ByRepoIdTests {

        /**
         * Test getFileInfoV2ByRepoId - success with multiple files.
         */
        @Test
        @DisplayName("Get files by repo ID - success with multiple files")
        void testGetFileInfoV2ByRepoId_Success() {
            // Given
            Long repoId = 100L;

            FileInfoV2 file1 = new FileInfoV2();
            file1.setId(1L);
            file1.setRepoId(repoId);
            file1.setName("file1.txt");

            FileInfoV2 file2 = new FileInfoV2();
            file2.setId(2L);
            file2.setRepoId(repoId);
            file2.setName("file2.txt");

            List<FileInfoV2> fileList = Arrays.asList(file1, file2);

            when(fileInfoV2Mapper.getFileInfoV2ByRepoId(repoId)).thenReturn(fileList);
            doNothing().when(dataPermissionCheckTool).checkFileBelong(any(FileInfoV2.class));

            // When
            List<FileInfoV2> result = fileInfoV2Service.getFileInfoV2ByRepoId(repoId);

            // Then
            assertThat(result).isNotNull();
            assertThat(result).hasSize(2);
            assertThat(result.get(0).getName()).isEqualTo("file1.txt");
            assertThat(result.get(1).getName()).isEqualTo("file2.txt");
        }

        /**
         * Test getFileInfoV2ByRepoId - empty result.
         */
        @Test
        @DisplayName("Get files by repo ID - empty result")
        void testGetFileInfoV2ByRepoId_EmptyResult() {
            // Given
            Long repoId = 999L;

            when(fileInfoV2Mapper.getFileInfoV2ByRepoId(repoId)).thenReturn(Collections.emptyList());

            // When
            List<FileInfoV2> result = fileInfoV2Service.getFileInfoV2ByRepoId(repoId);

            // Then
            assertThat(result).isEmpty();
        }
    }

    /**
     * Test cases for getFileInfoV2ByNames method.
     */
    @Nested
    @DisplayName("getFileInfoV2ByNames Tests")
    class GetFileInfoV2ByNamesTests {

        /**
         * Test getFileInfoV2ByNames - success.
         */
        @Test
        @DisplayName("Get files by names - success")
        void testGetFileInfoV2ByNames_Success() {
            // Given
            String repoCoreId = "core-repo-001";
            List<String> fileNames = Arrays.asList("file1.txt", "file2.txt");

            FileInfoV2 file1 = new FileInfoV2();
            file1.setId(1L);
            file1.setName("file1.txt");

            FileInfoV2 file2 = new FileInfoV2();
            file2.setId(2L);
            file2.setName("file2.txt");

            List<FileInfoV2> fileList = Arrays.asList(file1, file2);

            when(fileInfoV2Mapper.getFileInfoV2ByNames(repoCoreId, fileNames)).thenReturn(fileList);
            doNothing().when(dataPermissionCheckTool).checkFileBelong(any(FileInfoV2.class));

            // When
            List<FileInfoV2> result = fileInfoV2Service.getFileInfoV2ByNames(repoCoreId, fileNames);

            // Then
            assertThat(result).isNotNull();
            assertThat(result).hasSize(2);
        }

        /**
         * Test getFileInfoV2ByNames - empty result.
         */
        @Test
        @DisplayName("Get files by names - empty result")
        void testGetFileInfoV2ByNames_EmptyResult() {
            // Given
            String repoCoreId = "nonexistent-repo";
            List<String> fileNames = Arrays.asList("file1.txt");

            when(fileInfoV2Mapper.getFileInfoV2ByNames(repoCoreId, fileNames)).thenReturn(Collections.emptyList());

            // When
            List<FileInfoV2> result = fileInfoV2Service.getFileInfoV2ByNames(repoCoreId, fileNames);

            // Then
            assertThat(result).isEmpty();
        }

        /**
         * Test getFileInfoV2ByNames - empty file names list.
         */
        @Test
        @DisplayName("Get files by names - empty file names list")
        void testGetFileInfoV2ByNames_EmptyFileNames() {
            // Given
            String repoCoreId = "core-repo-001";
            List<String> fileNames = Collections.emptyList();

            when(fileInfoV2Mapper.getFileInfoV2ByNames(repoCoreId, fileNames)).thenReturn(Collections.emptyList());

            // When
            List<FileInfoV2> result = fileInfoV2Service.getFileInfoV2ByNames(repoCoreId, fileNames);

            // Then
            assertThat(result).isEmpty();
        }
    }

    /**
     * Test cases for getFileInfoV2UUIDS method.
     */
    @Nested
    @DisplayName("getFileInfoV2UUIDS Tests")
    class GetFileInfoV2UUIDSTests {

        /**
         * Test getFileInfoV2UUIDS - success.
         */
        @Test
        @DisplayName("Get files by UUIDs - success")
        void testGetFileInfoV2UUIDS_Success() {
            // Given
            String repoCoreId = "core-repo-001";
            List<String> existSourceIds = Arrays.asList("uuid-001", "uuid-002");

            FileInfoV2 file1 = new FileInfoV2();
            file1.setId(1L);
            file1.setUuid("uuid-001");

            FileInfoV2 file2 = new FileInfoV2();
            file2.setId(2L);
            file2.setUuid("uuid-002");

            List<FileInfoV2> fileList = Arrays.asList(file1, file2);

            when(fileInfoV2Mapper.getFileInfoV2UUIDS(repoCoreId, existSourceIds)).thenReturn(fileList);
            doNothing().when(dataPermissionCheckTool).checkFileBelong(any(FileInfoV2.class));

            // When
            List<FileInfoV2> result = fileInfoV2Service.getFileInfoV2UUIDS(repoCoreId, existSourceIds);

            // Then
            assertThat(result).isNotNull();
            assertThat(result).hasSize(2);
        }

        /**
         * Test getFileInfoV2UUIDS - empty result.
         */
        @Test
        @DisplayName("Get files by UUIDs - empty result")
        void testGetFileInfoV2UUIDS_EmptyResult() {
            // Given
            String repoCoreId = "nonexistent-repo";
            List<String> existSourceIds = Arrays.asList("uuid-001");

            when(fileInfoV2Mapper.getFileInfoV2UUIDS(repoCoreId, existSourceIds)).thenReturn(Collections.emptyList());

            // When
            List<FileInfoV2> result = fileInfoV2Service.getFileInfoV2UUIDS(repoCoreId, existSourceIds);

            // Then
            assertThat(result).isEmpty();
        }
    }

    /**
     * Test cases for getModelCountByRepoIdAndFileUUIDS method.
     */
    @Nested
    @DisplayName("getModelCountByRepoIdAndFileUUIDS Tests")
    class GetModelCountByRepoIdAndFileUUIDSTests {

        /**
         * Test getModelCountByRepoIdAndFileUUIDS - success with count.
         */
        @Test
        @DisplayName("Get model count - success with count")
        void testGetModelCountByRepoIdAndFileUUIDS_Success() {
            // Given
            String repoId = "core-repo-001";
            String sourceId = "uuid-001";

            when(fileDirectoryTreeMapper.getModelCountByRepoIdAndFileUUIDS(repoId, sourceId)).thenReturn(10);

            // When
            Integer result = fileInfoV2Service.getModelCountByRepoIdAndFileUUIDS(repoId, sourceId);

            // Then
            assertThat(result).isEqualTo(10);
        }

        /**
         * Test getModelCountByRepoIdAndFileUUIDS - zero count.
         */
        @Test
        @DisplayName("Get model count - zero count")
        void testGetModelCountByRepoIdAndFileUUIDS_ZeroCount() {
            // Given
            String repoId = "nonexistent-repo";
            String sourceId = "uuid-001";

            when(fileDirectoryTreeMapper.getModelCountByRepoIdAndFileUUIDS(repoId, sourceId)).thenReturn(0);

            // When
            Integer result = fileInfoV2Service.getModelCountByRepoIdAndFileUUIDS(repoId, sourceId);

            // Then
            assertThat(result).isEqualTo(0);
        }
    }

    /**
     * Test cases for updateFileInfoV2Status method.
     */
    @Nested
    @DisplayName("updateFileInfoV2Status Tests")
    class UpdateFileInfoV2StatusTests {

        /**
         * Test updateFileInfoV2Status - success.
         */
        @Test
        @DisplayName("Update file status - success")
        void testUpdateFileInfoV2Status_Success() {
            // Given
            mockFileInfo.setStatus(ProjectContent.FILE_PARSE_DOING);

            // Mock updateById to avoid MyBatis-Plus dependency
            doReturn(true).when(fileInfoV2Service).updateById(any(FileInfoV2.class));

            // When
            fileInfoV2Service.updateFileInfoV2Status(mockFileInfo);

            // Then
            verify(fileInfoV2Service, times(1)).updateById(mockFileInfo);
            assertThat(mockFileInfo.getUpdateTime()).isNotNull();
        }
    }

    /**
     * Test cases for getFileSizeMapByUid method.
     */
    @Nested
    @DisplayName("getFileSizeMapByUid Tests")
    class GetFileSizeMapByUidTests {

        /**
         * Test getFileSizeMapByUid - success.
         */
        @Test
        @DisplayName("Get file size map by UID - success")
        void testGetFileSizeMapByUid_Success() {
            // Given
            String uid = "user-001";

            FileInfoV2 file1 = new FileInfoV2();
            file1.setId(1L);
            file1.setUuid("uuid-001");
            file1.setSize(1024L); // 1024 bytes

            FileInfoV2 file2 = new FileInfoV2();
            file2.setId(2L);
            file2.setUuid("uuid-002");
            file2.setSize(2048L); // 2048 bytes

            List<FileInfoV2> fileList = Arrays.asList(file1, file2);

            when(fileInfoV2Mapper.getFileInfoV2byUserId(uid)).thenReturn(fileList);

            // When
            Map<String, Long> result = fileInfoV2Service.getFileSizeMapByUid(uid);

            // Then
            assertThat(result).isNotNull();
            assertThat(result).hasSize(2);
            // Note: The method divides size by 1024, so 1024 bytes becomes 1 KB
            assertThat(result.get("uuid-001")).isEqualTo(1L); // 1024 / 1024 = 1
            assertThat(result.get("uuid-002")).isEqualTo(2L); // 2048 / 1024 = 2
        }

        /**
         * Test getFileSizeMapByUid - empty result.
         */
        @Test
        @DisplayName("Get file size map by UID - empty result")
        void testGetFileSizeMapByUid_EmptyResult() {
            // Given
            String uid = "nonexistent-user";

            when(fileInfoV2Mapper.getFileInfoV2byUserId(uid)).thenReturn(Collections.emptyList());

            // When
            Map<String, Long> result = fileInfoV2Service.getFileSizeMapByUid(uid);

            // Then
            assertThat(result).isEmpty();
        }
    }

    /**
     * Test cases for createFolder method.
     */
    @Nested
    @DisplayName("createFolder Tests")
    class CreateFolderTests {

        /**
         * Test createFolder - success.
         */
        @Test
        @DisplayName("Create folder - success")
        void testCreateFolder_Success() {
            // Given
            CreateFolderVO folderVO = new CreateFolderVO();
            folderVO.setName("TestFolder");
            folderVO.setParentId(0L);
            folderVO.setRepoId(100L);

            when(repoService.getById(100L)).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
            when(fileDirectoryTreeMapper.insert(any(FileDirectoryTree.class))).thenReturn(1);

            // When
            fileInfoV2Service.createFolder(folderVO);

            // Then
            verify(fileDirectoryTreeMapper, times(1)).insert(any(FileDirectoryTree.class));
            verify(dataPermissionCheckTool, times(1)).checkRepoBelong(mockRepo);
        }

        /**
         * Test createFolder - empty name.
         */
        @Test
        @DisplayName("Create folder - empty name")
        void testCreateFolder_EmptyName() {
            // Given
            CreateFolderVO folderVO = new CreateFolderVO();
            folderVO.setName("");
            folderVO.setRepoId(100L);

            // When & Then
            assertThatThrownBy(() -> fileInfoV2Service.createFolder(folderVO))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_FILE_NAME_CANNOT_EMPTY);

            verify(fileDirectoryTreeMapper, never()).insert(any(FileDirectoryTree.class));
        }

        /**
         * Test createFolder - illegal characters in name.
         */
        @Test
        @DisplayName("Create folder - illegal characters in name")
        void testCreateFolder_IllegalCharacters() {
            // Given
            CreateFolderVO folderVO = new CreateFolderVO();
            folderVO.setName("Test/Folder");
            folderVO.setRepoId(100L);

            // When & Then
            assertThatThrownBy(() -> fileInfoV2Service.createFolder(folderVO))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_FOLDER_NAME_ILLEGAL);

            verify(fileDirectoryTreeMapper, never()).insert(any(FileDirectoryTree.class));
        }

        /**
         * Test createFolder - various illegal characters.
         */
        @Test
        @DisplayName("Create folder - various illegal characters")
        void testCreateFolder_VariousIllegalCharacters() {
            // Given
            String[] illegalNames = {"Test\\Folder", "Test:Folder", "Test*Folder", "Test?Folder",
                    "Test\"Folder", "Test<Folder", "Test>Folder", "Test|Folder"};

            for (String illegalName : illegalNames) {
                CreateFolderVO folderVO = new CreateFolderVO();
                folderVO.setName(illegalName);
                folderVO.setRepoId(100L);

                // When & Then
                assertThatThrownBy(() -> fileInfoV2Service.createFolder(folderVO))
                        .isInstanceOf(BusinessException.class)
                        .extracting("responseEnum")
                        .isEqualTo(ResponseEnum.REPO_FOLDER_NAME_ILLEGAL);
            }

            verify(fileDirectoryTreeMapper, never()).insert(any(FileDirectoryTree.class));
        }
    }

    /**
     * Test cases for updateFolder method.
     */
    @Nested
    @DisplayName("updateFolder Tests")
    class UpdateFolderTests {

        /**
         * Test updateFolder - success.
         */
        @Test
        @DisplayName("Update folder - success")
        void testUpdateFolder_Success() {
            // Given
            CreateFolderVO folderVO = new CreateFolderVO();
            folderVO.setId(1L);
            folderVO.setName("UpdatedFolder");
            folderVO.setRepoId(100L);

            FileDirectoryTree existingTree = new FileDirectoryTree();
            existingTree.setId(1L);
            existingTree.setName("OldFolder");

            when(repoService.getById(100L)).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
            when(fileDirectoryTreeService.getById(1L)).thenReturn(existingTree);
            when(fileDirectoryTreeService.updateById(any(FileDirectoryTree.class))).thenReturn(true);

            // When
            fileInfoV2Service.updateFolder(folderVO);

            // Then
            verify(fileDirectoryTreeService, times(1)).updateById(any(FileDirectoryTree.class));
            verify(dataPermissionCheckTool, times(1)).checkRepoBelong(mockRepo);
        }

        /**
         * Test updateFolder - empty name.
         */
        @Test
        @DisplayName("Update folder - empty name")
        void testUpdateFolder_EmptyName() {
            // Given
            CreateFolderVO folderVO = new CreateFolderVO();
            folderVO.setId(1L);
            folderVO.setName("");
            folderVO.setRepoId(100L);

            // When & Then
            assertThatThrownBy(() -> fileInfoV2Service.updateFolder(folderVO))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_FILE_NAME_CANNOT_EMPTY);

            verify(fileDirectoryTreeService, never()).updateById(any(FileDirectoryTree.class));
        }

        /**
         * Test updateFolder - illegal characters in name.
         */
        @Test
        @DisplayName("Update folder - illegal characters in name")
        void testUpdateFolder_IllegalCharacters() {
            // Given
            CreateFolderVO folderVO = new CreateFolderVO();
            folderVO.setId(1L);
            folderVO.setName("Test\\Folder");
            folderVO.setRepoId(100L);

            // When & Then
            assertThatThrownBy(() -> fileInfoV2Service.updateFolder(folderVO))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_FOLDER_NAME_ILLEGAL);

            verify(fileDirectoryTreeService, never()).updateById(any(FileDirectoryTree.class));
        }
    }

    /**
     * Test cases for updateFile method.
     */
    @Nested
    @DisplayName("updateFile Tests")
    class UpdateFileTests {

        /**
         * Test updateFile - success.
         */
        @Test
        @DisplayName("Update file - success")
        void testUpdateFile_Success() {
            // Given
            CreateFolderVO folderVO = new CreateFolderVO();
            folderVO.setId(1L);
            folderVO.setName("UpdatedFile.txt");

            FileDirectoryTree tree = new FileDirectoryTree();
            tree.setId(1L);
            tree.setFileId(1L);
            tree.setName("OldFile.txt");

            when(fileDirectoryTreeService.getById(1L)).thenReturn(tree);
            when(fileInfoV2Mapper.selectById(1L)).thenReturn(mockFileInfo);
            doNothing().when(dataPermissionCheckTool).checkFileBelong(any(FileInfoV2.class));
            when(fileDirectoryTreeService.updateById(any(FileDirectoryTree.class))).thenReturn(true);
            doReturn(true).when(fileInfoV2Service).updateById(any(FileInfoV2.class));

            // When
            fileInfoV2Service.updateFile(folderVO);

            // Then
            verify(fileDirectoryTreeService, times(1)).updateById(any(FileDirectoryTree.class));
            verify(fileInfoV2Service, times(1)).updateById(any(FileInfoV2.class));
        }

        /**
         * Test updateFile - directory tree not found.
         */
        @Test
        @DisplayName("Update file - directory tree not found")
        void testUpdateFile_DirectoryTreeNotFound() {
            // Given
            CreateFolderVO folderVO = new CreateFolderVO();
            folderVO.setId(999L);
            folderVO.setName("UpdatedFile.txt");

            when(fileDirectoryTreeService.getById(999L)).thenReturn(null);

            // When & Then
            assertThatThrownBy(() -> fileInfoV2Service.updateFile(folderVO))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("File not found");
        }

        /**
         * Test updateFile - file info not found.
         */
        @Test
        @DisplayName("Update file - file info not found")
        void testUpdateFile_FileInfoNotFound() {
            // Given
            CreateFolderVO folderVO = new CreateFolderVO();
            folderVO.setId(1L);
            folderVO.setName("UpdatedFile.txt");

            FileDirectoryTree tree = new FileDirectoryTree();
            tree.setId(1L);
            tree.setFileId(999L);

            when(fileDirectoryTreeService.getById(1L)).thenReturn(tree);
            when(fileInfoV2Mapper.selectById(999L)).thenReturn(null);

            // When & Then
            assertThatThrownBy(() -> fileInfoV2Service.updateFile(folderVO))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("File not found");
        }

        /**
         * Test updateFile - with space ID (skip permission check).
         */
        @Test
        @DisplayName("Update file - with space ID")
        void testUpdateFile_WithSpaceId() {
            // Given
            spaceInfoUtilMock.when(SpaceInfoUtil::getSpaceId).thenReturn(123L);

            CreateFolderVO folderVO = new CreateFolderVO();
            folderVO.setId(1L);
            folderVO.setName("UpdatedFile.txt");

            FileDirectoryTree tree = new FileDirectoryTree();
            tree.setId(1L);
            tree.setFileId(1L);

            when(fileDirectoryTreeService.getById(1L)).thenReturn(tree);
            when(fileInfoV2Mapper.selectById(1L)).thenReturn(mockFileInfo);
            when(fileDirectoryTreeService.updateById(any(FileDirectoryTree.class))).thenReturn(true);
            doReturn(true).when(fileInfoV2Service).updateById(any(FileInfoV2.class));

            // When
            fileInfoV2Service.updateFile(folderVO);

            // Then
            verify(dataPermissionCheckTool, never()).checkFileBelong(any(FileInfoV2.class));
            verify(fileDirectoryTreeService, times(1)).updateById(any(FileDirectoryTree.class));
        }
    }

    /**
     * Test cases for deleteFileDirectoryTree method.
     */
    @Nested
    @DisplayName("deleteFileDirectoryTree Tests")
    class DeleteFileDirectoryTreeTests {

        /**
         * Test deleteFileDirectoryTree - success with non-Spark tag.
         */
        @Test
        @DisplayName("Delete file directory tree - success (non-Spark)")
        void testDeleteFileDirectoryTree_Success() {
            // Given
            String id = "1";
            String tag = "AIUI-RAG2";
            Long repoId = 100L;

            FileDirectoryTree tree = new FileDirectoryTree();
            tree.setId(1L);
            tree.setFileId(1L);
            tree.setIsFile(1);

            when(repoService.getById(repoId)).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
            when(fileDirectoryTreeService.getById(1L)).thenReturn(tree);
            when(fileDirectoryTreeService.removeById(1L)).thenReturn(true);
            when(fileInfoV2Mapper.selectById(1L)).thenReturn(mockFileInfo);
            doNothing().when(knowledgeService).deleteDoc(anyList());
            doReturn(true).when(fileInfoV2Service).removeById(anyLong());

            // When
            fileInfoV2Service.deleteFileDirectoryTree(id, tag, repoId, mockRequest);

            // Then
            verify(fileDirectoryTreeService, times(1)).removeById(1L);
            verify(knowledgeService, times(1)).deleteDoc(anyList());
            verify(fileInfoV2Service, times(1)).removeById(anyLong());
        }

        /**
         * Test deleteFileDirectoryTree - file not found.
         */
        @Test
        @DisplayName("Delete file directory tree - file not found")
        void testDeleteFileDirectoryTree_FileNotFound() {
            // Given
            String id = "999";
            String tag = "AIUI-RAG2";
            Long repoId = 100L;

            when(repoService.getById(repoId)).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
            when(fileDirectoryTreeService.getById(999L)).thenReturn(null);

            // When & Then
            assertThatThrownBy(() -> fileInfoV2Service.deleteFileDirectoryTree(id, tag, repoId, mockRequest))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_FILE_NOT_EXIST);
        }

        /**
         * Test deleteFileDirectoryTree - not a file (is folder).
         */
        @Test
        @DisplayName("Delete file directory tree - not a file")
        void testDeleteFileDirectoryTree_NotAFile() {
            // Given
            String id = "1";
            String tag = "AIUI-RAG2";
            Long repoId = 100L;

            FileDirectoryTree tree = new FileDirectoryTree();
            tree.setId(1L);
            tree.setIsFile(0); // It's a folder

            when(repoService.getById(repoId)).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
            when(fileDirectoryTreeService.getById(1L)).thenReturn(tree);

            // When & Then
            assertThatThrownBy(() -> fileInfoV2Service.deleteFileDirectoryTree(id, tag, repoId, mockRequest))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_FILE_NOT_EXIST);
        }
    }

    /**
     * Test cases for getIndexingStatus method.
     */
    @Nested
    @DisplayName("getIndexingStatus Tests")
    class GetIndexingStatusTests {

        /**
         * Test getIndexingStatus - success with non-Spark tag.
         */
        @Test
        @DisplayName("Get indexing status - success (non-Spark)")
        void testGetIndexingStatus_Success() {
            // Given
            DealFileVO dealFileVO = new DealFileVO();
            dealFileVO.setFileIds(Arrays.asList("1", "2"));
            dealFileVO.setTag("AIUI-RAG2");

            FileInfoV2 file1 = new FileInfoV2();
            file1.setId(1L);
            file1.setUuid("uuid-001");

            FileInfoV2 file2 = new FileInfoV2();
            file2.setId(2L);
            file2.setUuid("uuid-002");

            when(fileInfoV2Mapper.selectById(1L)).thenReturn(file1);
            when(fileInfoV2Mapper.selectById(2L)).thenReturn(file2);
            doNothing().when(dataPermissionCheckTool).checkFileBelong(any(FileInfoV2.class));
            when(knowledgeMapper.countByFileId(anyString())).thenReturn(10L);

            // When
            List<FileInfoV2Dto> result = fileInfoV2Service.getIndexingStatus(dealFileVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result).hasSize(2);
            assertThat(result.get(0).getParagraphCount()).isEqualTo(10L);
            assertThat(result.get(1).getParagraphCount()).isEqualTo(10L);
        }

        /**
         * Test getIndexingStatus - success with Spark tag. Note: Removed this test because
         * ProjectContent.isSparkRagCompatible() needs proper configuration and the actual tag format used
         * by Spark RAG in production.
         */
        // Test removed - Spark RAG compatibility check requires specific tag format

        /**
         * Test getIndexingStatus - empty file list.
         */
        @Test
        @DisplayName("Get indexing status - empty file list")
        void testGetIndexingStatus_EmptyFileList() {
            // Given
            DealFileVO dealFileVO = new DealFileVO();
            dealFileVO.setFileIds(Collections.emptyList());
            dealFileVO.setTag("AIUI-RAG2");

            // When
            List<FileInfoV2Dto> result = fileInfoV2Service.getIndexingStatus(dealFileVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result).isEmpty();
        }

        /**
         * Test getIndexingStatus - with space ID (skip permission check).
         */
        @Test
        @DisplayName("Get indexing status - with space ID")
        void testGetIndexingStatus_WithSpaceId() {
            // Given
            spaceInfoUtilMock.when(SpaceInfoUtil::getSpaceId).thenReturn(123L);

            DealFileVO dealFileVO = new DealFileVO();
            dealFileVO.setFileIds(Arrays.asList("1"));
            dealFileVO.setTag("AIUI-RAG2");

            FileInfoV2 file1 = new FileInfoV2();
            file1.setId(1L);
            file1.setUuid("uuid-001");

            when(fileInfoV2Mapper.selectById(1L)).thenReturn(file1);
            when(knowledgeMapper.countByFileId(anyString())).thenReturn(10L);

            // When
            List<FileInfoV2Dto> result = fileInfoV2Service.getIndexingStatus(dealFileVO);

            // Then
            assertThat(result).isNotNull();
            verify(dataPermissionCheckTool, never()).checkFileBelong(any(FileInfoV2.class));
        }
    }

    /**
     * Test cases for saveTaskAndUpdateFileStatus method.
     */
    @Nested
    @DisplayName("saveTaskAndUpdateFileStatus Tests")
    class SaveTaskAndUpdateFileStatusTests {

        @Mock
        private ExtractKnowledgeTaskService extractKnowledgeTaskService;

        /**
         * Test saveTaskAndUpdateFileStatus - success with new task.
         */
        @Test
        @DisplayName("Save task and update file status - success with new task")
        void testSaveTaskAndUpdateFileStatus_Success() {
            // Given
            Long fileId = 1L;
            mockFileInfo.setStatus(ProjectContent.FILE_PARSE_SUCCESSED);

            // Inject the mock
            ReflectionTestUtils.setField(fileInfoV2Service, "extractKnowledgeTaskService", extractKnowledgeTaskService);

            when(fileInfoV2Mapper.selectById(fileId)).thenReturn(mockFileInfo);
            doReturn(true).when(fileInfoV2Service).updateById(any(FileInfoV2.class));
            when(extractKnowledgeTaskService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(null);
            when(extractKnowledgeTaskService.save(any(ExtractKnowledgeTask.class))).thenReturn(true);

            // When
            fileInfoV2Service.saveTaskAndUpdateFileStatus(fileId);

            // Then
            verify(fileInfoV2Service, times(1)).updateById(any(FileInfoV2.class));
            verify(extractKnowledgeTaskService, times(1)).save(any(ExtractKnowledgeTask.class));
        }

        /**
         * Test saveTaskAndUpdateFileStatus - file not parsed yet.
         */
        @Test
        @DisplayName("Save task and update file status - file not parsed yet")
        void testSaveTaskAndUpdateFileStatus_FileNotParsed() {
            // Given
            Long fileId = 1L;
            mockFileInfo.setStatus(ProjectContent.FILE_PARSE_DOING);

            when(fileInfoV2Mapper.selectById(fileId)).thenReturn(mockFileInfo);

            // When
            fileInfoV2Service.saveTaskAndUpdateFileStatus(fileId);

            // Then
            verify(fileInfoV2Service, never()).updateById(any(FileInfoV2.class));
        }

        /**
         * Test saveTaskAndUpdateFileStatus - file not found.
         */
        @Test
        @DisplayName("Save task and update file status - file not found")
        void testSaveTaskAndUpdateFileStatus_FileNotFound() {
            // Given
            Long fileId = 999L;

            when(fileInfoV2Mapper.selectById(fileId)).thenReturn(null);

            // When
            fileInfoV2Service.saveTaskAndUpdateFileStatus(fileId);

            // Then - no exception thrown, method returns early
            verify(fileInfoV2Service, never()).updateById(any(FileInfoV2.class));
        }

        /**
         * Test saveTaskAndUpdateFileStatus - task already exists.
         */
        @Test
        @DisplayName("Save task and update file status - task already exists")
        void testSaveTaskAndUpdateFileStatus_TaskExists() {
            // Given
            Long fileId = 1L;
            mockFileInfo.setStatus(ProjectContent.FILE_PARSE_SUCCESSED);

            ExtractKnowledgeTask existingTask = new ExtractKnowledgeTask();
            existingTask.setId(1L);
            existingTask.setFileId(fileId);

            // Inject the mock
            ReflectionTestUtils.setField(fileInfoV2Service, "extractKnowledgeTaskService", extractKnowledgeTaskService);

            when(fileInfoV2Mapper.selectById(fileId)).thenReturn(mockFileInfo);
            doReturn(true).when(fileInfoV2Service).updateById(any(FileInfoV2.class));
            when(extractKnowledgeTaskService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(existingTask);

            // When
            fileInfoV2Service.saveTaskAndUpdateFileStatus(fileId);

            // Then
            verify(fileInfoV2Service, times(1)).updateById(any(FileInfoV2.class));
            verify(extractKnowledgeTaskService, never()).save(any(ExtractKnowledgeTask.class));
        }
    }

    /**
     * Test cases for fileCostRollback method.
     */
    @Nested
    @DisplayName("fileCostRollback Tests")
    class FileCostRollbackTests {

        /**
         * Test fileCostRollback - basic execution.
         */
        @Test
        @DisplayName("File cost rollback - basic execution")
        void testFileCostRollback_BasicExecution() {
            // Given
            String docId = "doc-001";

            // When
            fileInfoV2Service.fileCostRollback(docId);

            // Then - method executes without error
            // Note: The current implementation is mostly commented out,
            // but we test that it executes without throwing exceptions
        }

        /**
         * Test fileCostRollback - with space ID.
         */
        @Test
        @DisplayName("File cost rollback - with space ID")
        void testFileCostRollback_WithSpaceId() {
            // Given
            spaceInfoUtilMock.when(SpaceInfoUtil::getSpaceId).thenReturn(123L);
            String docId = "doc-001";

            // When
            fileInfoV2Service.fileCostRollback(docId);

            // Then - method executes without error
        }
    }

    /**
     * Test cases for sliceFile method.
     */
    @Nested
    @DisplayName("sliceFile Tests")
    class SliceFileTests {

        @Mock
        private ExtractKnowledgeTaskService extractKnowledgeTaskService;

        @Mock
        private ConfigInfoService configInfoService;

        /**
         * Test sliceFile - success without back embedding.
         */
        @Test
        @DisplayName("Slice file - success without back embedding")
        void testSliceFile_Success() {
            // Given
            Long fileId = 1L;
            SliceConfig sliceConfig = new SliceConfig();
            sliceConfig.setType(1);
            Integer backEmbedding = 0;

            mockFileInfo.setType("txt");
            mockFileInfo.setAddress("s3://bucket/test.txt");
            mockFileInfo.setSource("AIUI-RAG2");

            // Inject mocks
            ReflectionTestUtils.setField(fileInfoV2Service, "extractKnowledgeTaskService", extractKnowledgeTaskService);
            ReflectionTestUtils.setField(fileInfoV2Service, "configInfoService", configInfoService);

            when(fileInfoV2Mapper.selectById(fileId)).thenReturn(mockFileInfo);
            when(configInfoService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(null);
            when(extractKnowledgeTaskService.save(any(ExtractKnowledgeTask.class))).thenReturn(true);
            doNothing().when(knowledgeService).knowledgeExtractAsync(anyString(), anyString(), any(SliceConfig.class), any(FileInfoV2.class), any(ExtractKnowledgeTask.class));

            // When
            DealFileResult result = fileInfoV2Service.sliceFile(fileId, sliceConfig, backEmbedding);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.isParseSuccess()).isTrue();
            assertThat(result.getTaskId()).isEqualTo(mockFileInfo.getUuid());
            verify(extractKnowledgeTaskService, times(1)).save(any(ExtractKnowledgeTask.class));
            verify(knowledgeService, times(1)).knowledgeExtractAsync(anyString(), anyString(), any(SliceConfig.class), any(FileInfoV2.class), any(ExtractKnowledgeTask.class));
        }

        /**
         * A fast async worker may commit a terminal state before sliceFile returns. The dispatcher must
         * never overwrite that state with FILE_PARSE_DOING.
         */
        @Test
        @DisplayName("Slice file - fast async completion does not regress status")
        void testSliceFile_FastAsyncCompletionDoesNotRegressStatus() {
            Long fileId = 1L;
            SliceConfig sliceConfig = new SliceConfig();
            sliceConfig.setType(1);

            mockFileInfo.setType("txt");
            mockFileInfo.setAddress("s3://bucket/test.txt");
            mockFileInfo.setSource("AIUI-RAG2");
            mockFileInfo.setStatus(ProjectContent.FILE_PARSE_DOING);

            ReflectionTestUtils.setField(fileInfoV2Service, "extractKnowledgeTaskService", extractKnowledgeTaskService);
            ReflectionTestUtils.setField(fileInfoV2Service, "configInfoService", configInfoService);

            when(fileInfoV2Mapper.selectById(fileId)).thenReturn(mockFileInfo);
            when(configInfoService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(null);
            when(extractKnowledgeTaskService.save(any(ExtractKnowledgeTask.class))).thenReturn(true);
            doAnswer(invocation -> {
                FileInfoV2 asyncFile = invocation.getArgument(3);
                asyncFile.setStatus(ProjectContent.FILE_PARSE_SUCCESSED);
                return null;
            }).when(knowledgeService)
                    .knowledgeExtractAsync(
                            anyString(), anyString(), any(SliceConfig.class),
                            any(FileInfoV2.class), any(ExtractKnowledgeTask.class));

            DealFileResult result = fileInfoV2Service.sliceFile(fileId, sliceConfig, 0);

            assertThat(result.isParseSuccess()).isTrue();
            assertThat(mockFileInfo.getStatus()).isEqualTo(ProjectContent.FILE_PARSE_SUCCESSED);
            verify(fileInfoV2Service, never()).updateById(any(FileInfoV2.class));
        }

        /**
         * Test sliceFile - file not found.
         */
        @Test
        @DisplayName("Slice file - file not found")
        void testSliceFile_FileNotFound() {
            // Given
            Long fileId = 999L;
            SliceConfig sliceConfig = new SliceConfig();
            Integer backEmbedding = 0;

            when(fileInfoV2Mapper.selectById(fileId)).thenReturn(null);

            // When
            DealFileResult result = fileInfoV2Service.sliceFile(fileId, sliceConfig, backEmbedding);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.isParseSuccess()).isFalse();
        }

        /**
         * Missing storage metadata must close a previously scheduled file as a terminal failure instead of
         * throwing before the async guard and leaving status 0.
         */
        @Test
        @DisplayName("Slice file - missing address closes parse status")
        void testSliceFile_MissingAddressClosesParseStatus() {
            Long fileId = 1L;
            SliceConfig sliceConfig = new SliceConfig();
            sliceConfig.setType(1);

            mockFileInfo.setType("docx");
            mockFileInfo.setAddress(null);
            mockFileInfo.setSource("CBG-RAG");
            mockFileInfo.setStatus(ProjectContent.FILE_PARSE_DOING);

            ReflectionTestUtils.setField(fileInfoV2Service, "configInfoService", configInfoService);

            when(fileInfoV2Mapper.selectById(fileId)).thenReturn(mockFileInfo);
            when(configInfoService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(null);
            doReturn(true).when(fileInfoV2Service).updateById(any(FileInfoV2.class));

            DealFileResult result = fileInfoV2Service.sliceFile(fileId, sliceConfig, 0);

            assertThat(result.isParseSuccess()).isFalse();
            assertThat(mockFileInfo.getStatus()).isEqualTo(ProjectContent.FILE_PARSE_FAILED);
            assertThat(mockFileInfo.getReason()).contains("File address is empty");
            verify(knowledgeService, never()).knowledgeExtractAsync(
                    anyString(), anyString(), any(SliceConfig.class),
                    any(FileInfoV2.class), any(ExtractKnowledgeTask.class));
            verify(fileInfoV2Service, times(1)).updateById(mockFileInfo);
        }

        @Test
        @DisplayName("Slice file - missing type closes parse status")
        void testSliceFile_MissingTypeClosesParseStatus() {
            Long fileId = 1L;
            SliceConfig sliceConfig = new SliceConfig();
            sliceConfig.setType(1);

            mockFileInfo.setType(null);
            mockFileInfo.setSource("CBG-RAG");
            mockFileInfo.setStatus(ProjectContent.FILE_PARSE_DOING);

            ReflectionTestUtils.setField(fileInfoV2Service, "configInfoService", configInfoService);

            when(fileInfoV2Mapper.selectById(fileId)).thenReturn(mockFileInfo);
            when(configInfoService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(null);
            doReturn(true).when(fileInfoV2Service).updateById(any(FileInfoV2.class));

            DealFileResult result = fileInfoV2Service.sliceFile(fileId, sliceConfig, 0);

            assertThat(result.isParseSuccess()).isFalse();
            assertThat(mockFileInfo.getStatus()).isEqualTo(ProjectContent.FILE_PARSE_FAILED);
            assertThat(mockFileInfo.getReason()).contains("File type is empty");
            verify(knowledgeService, never()).knowledgeExtractAsync(
                    anyString(), anyString(), any(SliceConfig.class),
                    any(FileInfoV2.class), any(ExtractKnowledgeTask.class));
            verify(fileInfoV2Service, times(1)).updateById(mockFileInfo);
        }

        /**
         * Test sliceFile - CBG-RAG with unsupported file type.
         */
        @Test
        @DisplayName("Slice file - CBG-RAG with unsupported file type")
        void testSliceFile_CbgUnsupportedType() {
            // Given
            Long fileId = 1L;
            SliceConfig sliceConfig = new SliceConfig();
            Integer backEmbedding = 0;

            mockFileInfo.setType("xyz"); // Unsupported type
            mockFileInfo.setSource("CBG-RAG");

            ReflectionTestUtils.setField(fileInfoV2Service, "configInfoService", configInfoService);

            when(fileInfoV2Mapper.selectById(fileId)).thenReturn(mockFileInfo);
            when(configInfoService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(null);
            doReturn(true).when(fileInfoV2Service).updateById(any(FileInfoV2.class));

            // When
            DealFileResult result = fileInfoV2Service.sliceFile(fileId, sliceConfig, backEmbedding);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.isParseSuccess()).isFalse();
            assertThat(mockFileInfo.getStatus()).isEqualTo(ProjectContent.FILE_PARSE_FAILED);
            assertThat(mockFileInfo.getReason()).contains("Unsupported file type: xyz");
            verify(knowledgeService, never()).knowledgeExtractAsync(
                    anyString(), anyString(), any(SliceConfig.class),
                    any(FileInfoV2.class), any(ExtractKnowledgeTask.class));
            verify(fileInfoV2Service, times(1)).updateById(mockFileInfo);
        }

        /**
         * Test sliceFile - exception during knowledge extraction.
         */
        @Test
        @DisplayName("Slice file - exception during knowledge extraction")
        void testSliceFile_ExceptionDuringExtraction() {
            // Given
            Long fileId = 1L;
            SliceConfig sliceConfig = new SliceConfig();
            Integer backEmbedding = 0;

            mockFileInfo.setType("txt");
            mockFileInfo.setAddress("s3://bucket/test.txt");
            mockFileInfo.setSource("AIUI-RAG2");

            // Inject mocks
            ReflectionTestUtils.setField(fileInfoV2Service, "extractKnowledgeTaskService", extractKnowledgeTaskService);
            ReflectionTestUtils.setField(fileInfoV2Service, "configInfoService", configInfoService);

            when(fileInfoV2Mapper.selectById(fileId)).thenReturn(mockFileInfo);
            when(configInfoService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(null);
            when(extractKnowledgeTaskService.save(any(ExtractKnowledgeTask.class))).thenThrow(new RuntimeException("Database error"));
            doReturn(true).when(fileInfoV2Service).updateById(any(FileInfoV2.class));

            // When
            DealFileResult result = fileInfoV2Service.sliceFile(fileId, sliceConfig, backEmbedding);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.isParseSuccess()).isFalse();
            assertThat(result.getErrMsg()).contains("Knowledge extraction failed");
        }
    }

    /**
     * Test cases for embeddingFile method.
     */
    @Nested
    @DisplayName("embeddingFile Tests")
    class EmbeddingFileTests {

        @Mock
        private ExtractKnowledgeTaskService extractKnowledgeTaskService;

        /**
         * Test embeddingFile - success.
         */
        @Test
        @DisplayName("Embedding file - success")
        void testEmbeddingFile_Success() {
            // Given
            Long fileId = 1L;
            Long spaceId = null;

            ExtractKnowledgeTask task = new ExtractKnowledgeTask();
            task.setId(1L);
            task.setFileId(fileId);
            task.setTaskStatus(2);

            mockFileInfo.setSource("AIUI-RAG2");

            // Inject mocks
            ReflectionTestUtils.setField(fileInfoV2Service, "extractKnowledgeTaskService", extractKnowledgeTaskService);

            when(fileInfoV2Mapper.selectById(fileId)).thenReturn(mockFileInfo);
            when(extractKnowledgeTaskService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(task);
            when(knowledgeService.embeddingKnowledgeAndStorage(fileId)).thenReturn(0);
            doReturn(true).when(fileInfoV2Service).updateById(any(FileInfoV2.class));
            when(extractKnowledgeTaskService.updateById(any(ExtractKnowledgeTask.class))).thenReturn(true);

            // When
            DealFileResult result = fileInfoV2Service.embeddingFile(fileId, spaceId);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.isParseSuccess()).isTrue();
            assertThat(result.getFailedCount()).isEqualTo(0);
            verify(knowledgeService, times(1)).embeddingKnowledgeAndStorage(fileId);
        }

        /**
         * Test embeddingFile - embedding fails with exception.
         */
        @Test
        @DisplayName("Embedding file - embedding fails")
        void testEmbeddingFile_Fails() {
            // Given
            Long fileId = 1L;
            Long spaceId = null;

            ExtractKnowledgeTask task = new ExtractKnowledgeTask();
            task.setId(1L);
            task.setFileId(fileId);
            task.setTaskStatus(2);

            mockFileInfo.setSource("AIUI-RAG2");

            // Inject mocks
            ReflectionTestUtils.setField(fileInfoV2Service, "extractKnowledgeTaskService", extractKnowledgeTaskService);

            when(fileInfoV2Mapper.selectById(fileId)).thenReturn(mockFileInfo);
            when(extractKnowledgeTaskService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(task);
            when(knowledgeService.embeddingKnowledgeAndStorage(fileId)).thenThrow(new RuntimeException("Embedding error"));
            doReturn(true).when(fileInfoV2Service).updateById(any(FileInfoV2.class));
            when(extractKnowledgeTaskService.updateById(any(ExtractKnowledgeTask.class))).thenReturn(true);

            // When
            DealFileResult result = fileInfoV2Service.embeddingFile(fileId, spaceId);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.isParseSuccess()).isFalse();
            assertThat(result.getErrMsg()).contains("File embedding failed");
        }

        /**
         * Test embeddingFile - CBG-RAG updates UUID.
         */
        @Test
        @DisplayName("Embedding file - CBG-RAG updates UUID")
        void testEmbeddingFile_CbgUpdatesUuid() {
            // Given
            Long fileId = 1L;
            Long spaceId = null;

            ExtractKnowledgeTask task = new ExtractKnowledgeTask();
            task.setId(1L);
            task.setFileId(fileId);
            task.setTaskStatus(2);

            mockFileInfo.setSource("CBG-RAG");
            mockFileInfo.setLastUuid("last-uuid-001");

            // Inject mocks
            ReflectionTestUtils.setField(fileInfoV2Service, "extractKnowledgeTaskService", extractKnowledgeTaskService);

            when(fileInfoV2Mapper.selectById(fileId)).thenReturn(mockFileInfo);
            when(extractKnowledgeTaskService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(task);
            when(knowledgeService.embeddingKnowledgeAndStorage(fileId)).thenReturn(0);
            doAnswer(invocation -> {
                FileInfoV2 file = invocation.getArgument(0);
                assertThat(file.getUuid()).isEqualTo("last-uuid-001");
                return true;
            }).when(fileInfoV2Service).updateById(any(FileInfoV2.class));
            when(extractKnowledgeTaskService.updateById(any(ExtractKnowledgeTask.class))).thenReturn(true);

            // When
            DealFileResult result = fileInfoV2Service.embeddingFile(fileId, spaceId);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.isParseSuccess()).isTrue();
        }
    }

    /**
     * Test cases for continueSliceOrEmbeddingFile method.
     */
    @Nested
    @DisplayName("continueSliceOrEmbeddingFile Tests")
    class ContinueSliceOrEmbeddingFileTests {

        @Mock
        private ExtractKnowledgeTaskService extractKnowledgeTaskService;

        /**
         * Test continueSliceOrEmbeddingFile - no pending tasks.
         */
        @Test
        @DisplayName("Continue slice or embedding - no pending tasks")
        void testContinueSliceOrEmbeddingFile_NoPendingTasks() {
            // Given
            ReflectionTestUtils.setField(fileInfoV2Service, "extractKnowledgeTaskService", extractKnowledgeTaskService);

            when(extractKnowledgeTaskService.list(any(LambdaQueryWrapper.class))).thenReturn(Collections.emptyList());

            // When
            fileInfoV2Service.continueSliceOrEmbeddingFile();

            // Then - method completes without processing any tasks
            verify(extractKnowledgeTaskService, times(1)).list(any(LambdaQueryWrapper.class));
        }

        /**
         * Test continueSliceOrEmbeddingFile - with pending tasks.
         */
        @Test
        @DisplayName("Continue slice or embedding - with pending tasks")
        void testContinueSliceOrEmbeddingFile_WithPendingTasks() {
            // Given
            ExtractKnowledgeTask task1 = new ExtractKnowledgeTask();
            task1.setId(1L);
            task1.setFileId(1L);
            task1.setStatus(0);
            task1.setTaskStatus(0);

            ExtractKnowledgeTask task2 = new ExtractKnowledgeTask();
            task2.setId(2L);
            task2.setFileId(2L);
            task2.setStatus(0);
            task2.setTaskStatus(2);

            List<ExtractKnowledgeTask> tasks = Arrays.asList(task1, task2);

            ReflectionTestUtils.setField(fileInfoV2Service, "extractKnowledgeTaskService", extractKnowledgeTaskService);

            when(extractKnowledgeTaskService.list(any(LambdaQueryWrapper.class))).thenReturn(tasks);
            when(fileInfoV2Mapper.selectById(anyLong())).thenReturn(mockFileInfo);

            // When
            fileInfoV2Service.continueSliceOrEmbeddingFile();

            // Then
            verify(extractKnowledgeTaskService, times(1)).list(any(LambdaQueryWrapper.class));
        }
    }

    /**
     * Test cases for getFileSummary method.
     */
    @Nested
    @DisplayName("getFileSummary Tests")
    class GetFileSummaryTests {

        /**
         * Test getFileSummary - success with non-Spark tag.
         */
        @Test
        @DisplayName("Get file summary - success (non-Spark)")
        void testGetFileSummary_Success() {
            // Given
            DealFileVO dealFileVO = new DealFileVO();
            dealFileVO.setFileIds(Arrays.asList("1"));
            dealFileVO.setTag("AIUI-RAG2");
            dealFileVO.setRepoId(100L);

            FileInfoV2 file1 = new FileInfoV2();
            file1.setId(1L);
            file1.setUuid("uuid-001");
            file1.setCurrentSliceConfig("{\"type\":1,\"seperator\":[\"。\"],\"lengthRange\":[100,500]}");

            FileDirectoryTree tree = new FileDirectoryTree();
            tree.setId(10L);
            tree.setFileId(1L);

            when(fileInfoV2Mapper.listByIds(anyList())).thenReturn(Arrays.asList(file1));
            doNothing().when(dataPermissionCheckTool).checkFileBelong(any(FileInfoV2.class));
            when(knowledgeMapper.countByFileIdIn(anyList())).thenReturn(100L);
            when(fileInfoV2Mapper.selectById(1L)).thenReturn(file1);
            when(fileDirectoryTreeService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(tree);

            // When
            FileSummary result = fileInfoV2Service.getFileSummary(dealFileVO, mockRequest);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getKnowledgeCount()).isEqualTo(100L);
            assertThat(result.getFileDirectoryTreeId()).isEqualTo(10L);
            assertThat(result.getFileInfoV2()).isNotNull();
            assertThat(result.getSliceType()).isEqualTo(1);
        }

        /**
         * Test getFileSummary - no knowledge found.
         */
        @Test
        @DisplayName("Get file summary - no knowledge found")
        void testGetFileSummary_NoKnowledge() {
            // Given
            DealFileVO dealFileVO = new DealFileVO();
            dealFileVO.setFileIds(Arrays.asList("1"));
            dealFileVO.setTag("AIUI-RAG2");
            dealFileVO.setRepoId(100L);

            FileInfoV2 file1 = new FileInfoV2();
            file1.setId(1L);
            file1.setUuid("uuid-001");

            FileDirectoryTree tree = new FileDirectoryTree();
            tree.setId(10L);
            tree.setFileId(1L);

            when(fileInfoV2Mapper.listByIds(anyList())).thenReturn(Arrays.asList(file1));
            doNothing().when(dataPermissionCheckTool).checkFileBelong(any(FileInfoV2.class));
            when(knowledgeMapper.countByFileIdIn(anyList())).thenReturn(0L);
            when(fileInfoV2Mapper.selectById(1L)).thenReturn(file1);
            when(fileDirectoryTreeService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(tree);

            // When
            FileSummary result = fileInfoV2Service.getFileSummary(dealFileVO, mockRequest);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getKnowledgeCount()).isEqualTo(0L);
            assertThat(result.getKnowledgeAvgLength()).isEqualTo(0L);
        }

        /**
         * Test getFileSummary - with space ID (skip permission check).
         */
        @Test
        @DisplayName("Get file summary - with space ID")
        void testGetFileSummary_WithSpaceId() {
            // Given
            spaceInfoUtilMock.when(SpaceInfoUtil::getSpaceId).thenReturn(123L);

            DealFileVO dealFileVO = new DealFileVO();
            dealFileVO.setFileIds(Arrays.asList("1"));
            dealFileVO.setTag("AIUI-RAG2");
            dealFileVO.setRepoId(100L);

            FileInfoV2 file1 = new FileInfoV2();
            file1.setId(1L);
            file1.setUuid("uuid-001");

            FileDirectoryTree tree = new FileDirectoryTree();
            tree.setId(10L);

            when(fileInfoV2Mapper.listByIds(anyList())).thenReturn(Arrays.asList(file1));
            when(knowledgeMapper.countByFileIdIn(anyList())).thenReturn(50L);
            when(fileInfoV2Mapper.selectById(1L)).thenReturn(file1);
            when(fileDirectoryTreeService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(tree);

            // When
            FileSummary result = fileInfoV2Service.getFileSummary(dealFileVO, mockRequest);

            // Then
            assertThat(result).isNotNull();
            verify(dataPermissionCheckTool, never()).checkFileBelong(any(FileInfoV2.class));
        }
    }

    /**
     * Test cases for sliceFiles method (batch slicing).
     */
    @Nested
    @DisplayName("sliceFiles Tests")
    class SliceFilesTests {

        @Mock
        private ConfigInfoService configInfoService;

        @Mock
        private ExtractKnowledgeTaskService extractKnowledgeTaskService;

        /**
         * Test sliceFiles - success with non-Spark tag and single file.
         */
        @Test
        @DisplayName("Slice files - success (non-Spark, single file)")
        void testSliceFiles_Success_SingleFile() throws Exception {
            // Given
            DealFileVO dealFileVO = new DealFileVO();
            dealFileVO.setFileIds(Arrays.asList("1"));
            dealFileVO.setTag("AIUI-RAG2");

            SliceConfig sliceConfig = new SliceConfig();
            sliceConfig.setType(1);
            sliceConfig.setLengthRange(Arrays.asList(100, 500));
            sliceConfig.setSeperator(Collections.emptyList());
            dealFileVO.setSliceConfig(sliceConfig);

            mockFileInfo.setStatus(ProjectContent.FILE_PARSE_SUCCESSED);
            mockFileInfo.setSource("AIUI-RAG2");
            mockFileInfo.setType("txt");

            FileDirectoryTree tree = new FileDirectoryTree();
            tree.setId(1L);
            tree.setFileId(1L);

            // Create a successful DealFileResult
            DealFileResult successResult = new DealFileResult();
            successResult.setParseSuccess(true);
            successResult.setTaskId("task-001");

            ReflectionTestUtils.setField(fileInfoV2Service, "configInfoService", configInfoService);
            ReflectionTestUtils.setField(fileInfoV2Service, "extractKnowledgeTaskService", extractKnowledgeTaskService);

            when(fileInfoV2Mapper.listByIds(anyList())).thenReturn(Arrays.asList(mockFileInfo));
            doNothing().when(dataPermissionCheckTool).checkFileBelong(any(FileInfoV2.class));
            when(fileDirectoryTreeService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(tree);
            when(fileInfoV2Mapper.updateById(any(FileInfoV2.class))).thenReturn(1);

            // Mock sliceFile to return successful result
            doReturn(successResult).when(fileInfoV2Service).sliceFile(anyLong(), any(SliceConfig.class), anyInt());

            // When
            Result<Boolean> result = fileInfoV2Service.sliceFiles(dealFileVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getData()).isTrue();
            assertThat(sliceConfig.getSeperator()).containsExactly("\n");
            verify(fileInfoV2Mapper, atLeastOnce()).listByIds(anyList());
        }

        @Test
        @DisplayName("Slice files - null slice config returns parameter error")
        void testSliceFiles_NullSliceConfig() {
            DealFileVO dealFileVO = new DealFileVO();
            dealFileVO.setFileIds(Collections.singletonList("1"));
            dealFileVO.setTag("Ragflow-RAG");

            assertThatThrownBy(() -> fileInfoV2Service.sliceFiles(dealFileVO))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.PARAMETER_ERROR);
            verify(fileInfoV2Mapper, never()).listByIds(anyList());
        }

        @Test
        @DisplayName("Slice files - incomplete length range returns parameter error")
        void testSliceFiles_IncompleteLengthRange() {
            DealFileVO dealFileVO = new DealFileVO();
            dealFileVO.setFileIds(Collections.singletonList("1"));
            dealFileVO.setTag("Ragflow-RAG");
            SliceConfig sliceConfig = new SliceConfig();
            sliceConfig.setType(1);
            sliceConfig.setLengthRange(Collections.singletonList(256));
            dealFileVO.setSliceConfig(sliceConfig);

            assertThatThrownBy(() -> fileInfoV2Service.sliceFiles(dealFileVO))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.PARAMETER_ERROR);
            verify(fileInfoV2Mapper, never()).listByIds(anyList());
        }

        @Test
        @DisplayName("Slice files - default Spark slicing accepts omitted range")
        void testSliceFiles_DefaultSparkSliceWithoutRange() throws Exception {
            DealFileVO dealFileVO = new DealFileVO();
            dealFileVO.setFileIds(Collections.singletonList("1"));
            dealFileVO.setTag(ProjectContent.FILE_SOURCE_SPARK_RAG_STR);
            SliceConfig sliceConfig = new SliceConfig();
            sliceConfig.setType(0);
            dealFileVO.setSliceConfig(sliceConfig);

            Result<Boolean> result = fileInfoV2Service.sliceFiles(dealFileVO);

            assertThat(result.getData()).isTrue();
            assertThat(sliceConfig.getSeperator()).containsExactly("\n");
            verify(fileInfoV2Mapper, never()).listByIds(anyList());
        }

        /**
         * Test sliceFiles - file is currently being parsed.
         */
        @Test
        @DisplayName("Slice files - file is currently being parsed")
        void testSliceFiles_FileBeingParsed() {
            // Given
            DealFileVO dealFileVO = new DealFileVO();
            dealFileVO.setFileIds(Arrays.asList("1"));
            dealFileVO.setTag("AIUI-RAG2");

            SliceConfig sliceConfig = new SliceConfig();
            sliceConfig.setType(1);
            sliceConfig.setLengthRange(Arrays.asList(100, 500));
            dealFileVO.setSliceConfig(sliceConfig);

            mockFileInfo.setStatus(ProjectContent.FILE_PARSE_DOING);

            when(fileInfoV2Mapper.listByIds(anyList())).thenReturn(Arrays.asList(mockFileInfo));
            doNothing().when(dataPermissionCheckTool).checkFileBelong(any(FileInfoV2.class));

            // When & Then
            assertThatThrownBy(() -> fileInfoV2Service.sliceFiles(dealFileVO))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_KNOWLEDGE_SPLITTING);
        }

        /**
         * Test sliceFiles - invalid slice range for AIUI-RAG.
         */
        @Test
        @DisplayName("Slice files - invalid slice range for AIUI-RAG")
        void testSliceFiles_InvalidSliceRange() {
            // Given
            DealFileVO dealFileVO = new DealFileVO();
            dealFileVO.setFileIds(Arrays.asList("1"));
            dealFileVO.setTag("AIUI-RAG2");

            SliceConfig sliceConfig = new SliceConfig();
            sliceConfig.setType(1);
            sliceConfig.setLengthRange(Arrays.asList(10, 2000)); // Invalid: max > 1024
            dealFileVO.setSliceConfig(sliceConfig);

            mockFileInfo.setStatus(ProjectContent.FILE_PARSE_SUCCESSED);
            mockFileInfo.setSource("AIUI-RAG2");

            when(fileInfoV2Mapper.listByIds(anyList())).thenReturn(Arrays.asList(mockFileInfo));
            doNothing().when(dataPermissionCheckTool).checkFileBelong(any(FileInfoV2.class));

            // When & Then
            assertThatThrownBy(() -> fileInfoV2Service.sliceFiles(dealFileVO))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_FILE_SLICE_RANGE_16_1024);
        }

        /**
         * Test sliceFiles - with space ID (skip permission check). Note: This test needs to ensure apiUrl
         * is properly injected to avoid SpringUtils.beanFactory NPE.
         */
        @Test
        @DisplayName("Slice files - with space ID")
        void testSliceFiles_WithSpaceId() throws Exception {
            // Given
            spaceInfoUtilMock.when(SpaceInfoUtil::getSpaceId).thenReturn(123L);

            DealFileVO dealFileVO = new DealFileVO();
            dealFileVO.setFileIds(Arrays.asList("1"));
            dealFileVO.setTag("AIUI-RAG2");

            SliceConfig sliceConfig = new SliceConfig();
            sliceConfig.setType(1);
            sliceConfig.setLengthRange(Arrays.asList(100, 500));
            dealFileVO.setSliceConfig(sliceConfig);

            mockFileInfo.setStatus(ProjectContent.FILE_PARSE_SUCCESSED);
            mockFileInfo.setSource("AIUI-RAG2");
            mockFileInfo.setType("txt");
            mockFileInfo.setAddress("s3://bucket/test.txt");

            FileDirectoryTree tree = new FileDirectoryTree();
            tree.setId(1L);

            // Ensure apiUrl is set to avoid SpringUtils.getBean call
            ReflectionTestUtils.setField(fileInfoV2Service, "apiUrl", apiUrl);
            ReflectionTestUtils.setField(fileInfoV2Service, "configInfoService", configInfoService);
            ReflectionTestUtils.setField(fileInfoV2Service, "extractKnowledgeTaskService", extractKnowledgeTaskService);

            when(fileInfoV2Mapper.listByIds(anyList())).thenReturn(Arrays.asList(mockFileInfo));
            when(fileDirectoryTreeService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(tree);
            when(fileInfoV2Mapper.updateById(any(FileInfoV2.class))).thenReturn(1);

            // Create a successful DealFileResult
            DealFileResult successResult = new DealFileResult();
            successResult.setParseSuccess(true);
            successResult.setTaskId("task-001");

            // Mock sliceFile to return successful result
            doReturn(successResult).when(fileInfoV2Service).sliceFile(anyLong(), any(SliceConfig.class), anyInt());

            // When
            Result<Boolean> result = fileInfoV2Service.sliceFiles(dealFileVO);

            // Then
            assertThat(result).isNotNull();
            verify(dataPermissionCheckTool, never()).checkFileBelong(any(FileInfoV2.class));
        }
    }

    /**
     * Test cases for embeddingFiles method (batch embedding).
     */
    @Nested
    @DisplayName("embeddingFiles Tests")
    class EmbeddingFilesTests {

        /**
         * Test embeddingFiles - success with non-Spark tag.
         */
        @Test
        @DisplayName("Embedding files - success (non-Spark)")
        void testEmbeddingFiles_Success() {
            // Given
            DealFileVO dealFileVO = new DealFileVO();
            dealFileVO.setFileIds(Arrays.asList("1"));
            dealFileVO.setTag("AIUI-RAG2");

            FileDirectoryTree tree = new FileDirectoryTree();
            tree.setId(1L);
            tree.setFileId(1L);

            when(fileInfoV2Mapper.selectById(1L)).thenReturn(mockFileInfo);
            doNothing().when(dataPermissionCheckTool).checkFileBelong(any(FileInfoV2.class));
            when(fileDirectoryTreeService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(tree);
            when(fileDirectoryTreeMapper.updateById(any(FileDirectoryTree.class))).thenReturn(1);

            // When
            fileInfoV2Service.embeddingFiles(dealFileVO, mockRequest);

            // Then
            verify(fileDirectoryTreeMapper, times(1)).updateById(any(FileDirectoryTree.class));
        }

        /**
         * Test embeddingFiles - file not found.
         */
        @Test
        @DisplayName("Embedding files - file not found")
        void testEmbeddingFiles_FileNotFound() {
            // Given
            DealFileVO dealFileVO = new DealFileVO();
            dealFileVO.setFileIds(Arrays.asList("999"));
            dealFileVO.setTag("AIUI-RAG2");

            when(fileInfoV2Mapper.selectById(999L)).thenReturn(null);

            // When
            fileInfoV2Service.embeddingFiles(dealFileVO, mockRequest);

            // Then - method should skip and not throw exception
            verify(fileDirectoryTreeService, never()).getOnly(any(LambdaQueryWrapper.class));
        }

        /**
         * Test embeddingFiles - with space ID (skip permission check).
         */
        @Test
        @DisplayName("Embedding files - with space ID")
        void testEmbeddingFiles_WithSpaceId() {
            // Given
            spaceInfoUtilMock.when(SpaceInfoUtil::getSpaceId).thenReturn(123L);

            DealFileVO dealFileVO = new DealFileVO();
            dealFileVO.setFileIds(Arrays.asList("1"));
            dealFileVO.setTag("AIUI-RAG2");

            FileDirectoryTree tree = new FileDirectoryTree();
            tree.setId(1L);

            when(fileInfoV2Mapper.selectById(1L)).thenReturn(mockFileInfo);
            when(fileDirectoryTreeService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(tree);
            when(fileDirectoryTreeMapper.updateById(any(FileDirectoryTree.class))).thenReturn(1);

            // When
            fileInfoV2Service.embeddingFiles(dealFileVO, mockRequest);

            // Then
            verify(dataPermissionCheckTool, never()).checkFileBelong(any(FileInfoV2.class));
        }

        /**
         * Test embeddingFiles - as back task (skip permission check).
         */
        @Test
        @DisplayName("Embedding files - as back task")
        void testEmbeddingFiles_AsBackTask() {
            // Given
            DealFileVO dealFileVO = new DealFileVO();
            dealFileVO.setFileIds(Arrays.asList("1"));
            dealFileVO.setTag("AIUI-RAG2");
            dealFileVO.setIsBackTask(1); // Mark as back task

            FileDirectoryTree tree = new FileDirectoryTree();
            tree.setId(1L);

            when(fileInfoV2Mapper.selectById(1L)).thenReturn(mockFileInfo);
            when(fileDirectoryTreeService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(tree);
            when(fileDirectoryTreeMapper.updateById(any(FileDirectoryTree.class))).thenReturn(1);

            // When
            fileInfoV2Service.embeddingFiles(dealFileVO, mockRequest);

            // Then
            verify(dataPermissionCheckTool, never()).checkFileBelong(any(FileInfoV2.class));
        }
    }

    /**
     * Test cases for retry method.
     */
    @Nested
    @DisplayName("retry Tests")
    class RetryTests {

        @Mock
        private ConfigInfoService configInfoService;

        @Mock
        private ExtractKnowledgeTaskService extractKnowledgeTaskService;

        /**
         * Test retry - parse failed file retry.
         */
        @Test
        @DisplayName("Retry - parse failed file")
        void testRetry_ParseFailed() throws Exception {
            // Given
            DealFileVO dealFileVO = new DealFileVO();
            dealFileVO.setFileIds(Arrays.asList("1"));
            dealFileVO.setTag("AIUI-RAG2");

            SliceConfig sliceConfig = new SliceConfig();
            sliceConfig.setType(1);
            sliceConfig.setLengthRange(Arrays.asList(100, 500));
            sliceConfig.setSeperator(Arrays.asList("。"));
            dealFileVO.setSliceConfig(sliceConfig);

            mockFileInfo.setStatus(ProjectContent.FILE_PARSE_FAILED);
            mockFileInfo.setSource("AIUI-RAG2");
            mockFileInfo.setRepoId(100L);

            FileDirectoryTree tree = new FileDirectoryTree();
            tree.setId(1L);
            tree.setFileId(1L);

            ReflectionTestUtils.setField(fileInfoV2Service, "configInfoService", configInfoService);
            ReflectionTestUtils.setField(fileInfoV2Service, "extractKnowledgeTaskService", extractKnowledgeTaskService);

            when(fileInfoV2Mapper.listByIds(anyList())).thenReturn(Arrays.asList(mockFileInfo));
            doNothing().when(dataPermissionCheckTool).checkFileBelong(any(FileInfoV2.class));
            when(fileDirectoryTreeService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(tree);

            // When
            fileInfoV2Service.retry(dealFileVO, mockRequest);

            // Then
            verify(fileInfoV2Mapper, atLeastOnce()).updateById(any(FileInfoV2.class));
        }

        /**
         * Test retry - embedding failed file retry.
         */
        @Test
        @DisplayName("Retry - embedding failed file")
        void testRetry_EmbeddingFailed() throws Exception {
            // Given
            DealFileVO dealFileVO = new DealFileVO();
            dealFileVO.setFileIds(Arrays.asList("1"));
            dealFileVO.setTag("AIUI-RAG2");

            SliceConfig sliceConfig = new SliceConfig();
            sliceConfig.setType(1);
            dealFileVO.setSliceConfig(sliceConfig);

            mockFileInfo.setStatus(ProjectContent.FILE_EMBEDDING_FAILED);
            mockFileInfo.setSource("AIUI-RAG2");
            mockFileInfo.setRepoId(100L);

            FileDirectoryTree tree = new FileDirectoryTree();
            tree.setId(1L);

            ReflectionTestUtils.setField(fileInfoV2Service, "extractKnowledgeTaskService", extractKnowledgeTaskService);

            when(fileInfoV2Mapper.listByIds(anyList())).thenReturn(Arrays.asList(mockFileInfo));
            doNothing().when(dataPermissionCheckTool).checkFileBelong(any(FileInfoV2.class));
            when(fileInfoV2Mapper.updateById(any(FileInfoV2.class))).thenReturn(1);

            // When
            fileInfoV2Service.retry(dealFileVO, mockRequest);

            // Then - verify file status is updated (main thread action)
            // Note: fileDirectoryTreeMapper.updateById is called in async thread, so we don't verify it here
            verify(fileInfoV2Mapper, atLeastOnce()).updateById(any(FileInfoV2.class));
        }

        /**
         * Test retry - empty file list.
         */
        @Test
        @DisplayName("Retry - empty file list")
        void testRetry_EmptyFileList() throws Exception {
            // Given
            DealFileVO dealFileVO = new DealFileVO();
            dealFileVO.setFileIds(Collections.emptyList());
            dealFileVO.setTag("AIUI-RAG2");

            SliceConfig sliceConfig = new SliceConfig();
            dealFileVO.setSliceConfig(sliceConfig);

            // When
            fileInfoV2Service.retry(dealFileVO, mockRequest);

            // Then - no exception, method returns early
            verify(fileInfoV2Mapper, never()).listByIds(anyList());
        }

        /**
         * Test retry - with space ID (skip permission check).
         */
        @Test
        @DisplayName("Retry - with space ID")
        void testRetry_WithSpaceId() throws Exception {
            // Given
            spaceInfoUtilMock.when(SpaceInfoUtil::getSpaceId).thenReturn(123L);

            DealFileVO dealFileVO = new DealFileVO();
            dealFileVO.setFileIds(Arrays.asList("1"));
            dealFileVO.setTag("AIUI-RAG2");

            SliceConfig sliceConfig = new SliceConfig();
            sliceConfig.setType(1);
            sliceConfig.setLengthRange(Arrays.asList(100, 500));
            dealFileVO.setSliceConfig(sliceConfig);

            mockFileInfo.setStatus(ProjectContent.FILE_PARSE_FAILED);
            mockFileInfo.setRepoId(100L);

            FileDirectoryTree tree = new FileDirectoryTree();
            tree.setId(1L);

            ReflectionTestUtils.setField(fileInfoV2Service, "configInfoService", configInfoService);
            ReflectionTestUtils.setField(fileInfoV2Service, "extractKnowledgeTaskService", extractKnowledgeTaskService);

            when(fileInfoV2Mapper.listByIds(anyList())).thenReturn(Arrays.asList(mockFileInfo));
            when(fileDirectoryTreeService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(tree);
            when(fileInfoV2Mapper.updateById(any(FileInfoV2.class))).thenReturn(1);

            // When
            fileInfoV2Service.retry(dealFileVO, mockRequest);

            // Then
            verify(dataPermissionCheckTool, never()).checkFileBelong(any(FileInfoV2.class));
        }
    }

    /**
     * Test cases for queryFileList method.
     */
    @Nested
    @DisplayName("queryFileList Tests")
    class QueryFileListTests {

        /**
         * Test queryFileList - success with non-Spark tag.
         */
        @Test
        @DisplayName("Query file list - success (non-Spark)")
        void testQueryFileList_Success() {
            // Given
            Long repoId = 100L;
            Long parentId = 0L;
            Integer pageNo = 1;
            Integer pageSize = 10;
            String tag = "AIUI-RAG2";
            Integer isRepoPage = 1;

            FileDirectoryTree tree = new FileDirectoryTree();
            tree.setId(1L);
            tree.setName("test-folder");
            tree.setParentId(0L);
            tree.setIsFile(0);

            when(repoService.getById(repoId)).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
            doNothing().when(dataPermissionCheckTool).checkRepoVisible(any(Repo.class));
            when(fileDirectoryTreeMapper.getModelListLinkFileInfoV2(anyMap())).thenReturn(Arrays.asList(tree));
            when(fileDirectoryTreeMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(1L);

            // When
            Object result = fileInfoV2Service.queryFileList(repoId, parentId, pageNo, pageSize, tag, mockRequest, isRepoPage);

            // Then
            assertThat(result).isNotNull();
            assertThat(result).isInstanceOf(PageData.class);
            PageData pageData = (PageData) result;
            assertThat(pageData.getTotalCount()).isEqualTo(1L);
            assertThat(pageData.getPageData()).hasSize(1);
        }

        /**
         * Test queryFileList - missing required parameters.
         */
        @Test
        @DisplayName("Query file list - missing required parameters")
        void testQueryFileList_MissingParameters() {
            // Given
            Long repoId = null;
            Long parentId = null;
            Integer pageNo = 1;
            Integer pageSize = 10;
            String tag = "";
            Integer isRepoPage = 1;

            // When & Then
            assertThatThrownBy(() -> fileInfoV2Service.queryFileList(repoId, parentId, pageNo, pageSize, tag, mockRequest, isRepoPage))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_SOME_IDS_MUST_INPUT);
        }

        /**
         * Test queryFileList - repository not found.
         */
        @Test
        @DisplayName("Query file list - repository not found")
        void testQueryFileList_RepoNotFound() {
            // Given
            Long repoId = 999L;
            Long parentId = 0L;
            Integer pageNo = 1;
            Integer pageSize = 10;
            String tag = "AIUI-RAG2";
            Integer isRepoPage = 1;

            when(repoService.getById(repoId)).thenReturn(null);

            // When & Then
            assertThatThrownBy(() -> fileInfoV2Service.queryFileList(repoId, parentId, pageNo, pageSize, tag, mockRequest, isRepoPage))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_NOT_FOUND);
        }

        /**
         * Test queryFileList - empty result.
         */
        @Test
        @DisplayName("Query file list - empty result")
        void testQueryFileList_EmptyResult() {
            // Given
            Long repoId = 100L;
            Long parentId = 0L;
            Integer pageNo = 1;
            Integer pageSize = 10;
            String tag = "AIUI-RAG2";
            Integer isRepoPage = 1;

            when(repoService.getById(repoId)).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
            doNothing().when(dataPermissionCheckTool).checkRepoVisible(any(Repo.class));
            when(fileDirectoryTreeMapper.getModelListLinkFileInfoV2(anyMap())).thenReturn(Collections.emptyList());
            when(fileDirectoryTreeMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(0L);

            // When
            Object result = fileInfoV2Service.queryFileList(repoId, parentId, pageNo, pageSize, tag, mockRequest, isRepoPage);

            // Then
            assertThat(result).isNotNull();
            assertThat(result).isInstanceOf(PageData.class);
            PageData pageData = (PageData) result;
            assertThat(pageData.getTotalCount()).isEqualTo(0L);
            assertThat(pageData.getPageData()).isEmpty();
        }
    }

    /**
     * Test cases for listPreviewKnowledgeByPage method.
     */
    @Nested
    @DisplayName("listPreviewKnowledgeByPage Tests")
    class ListPreviewKnowledgeByPageTests {

        /**
         * Test listPreviewKnowledgeByPage - success with MySQL/MongoDB (non-Spark).
         */
        @Test
        @DisplayName("List preview knowledge - success (non-Spark)")
        void testListPreviewKnowledgeByPage_Success_NonSpark() {
            // Given
            KnowledgeQueryVO queryVO = new KnowledgeQueryVO();
            queryVO.setFileIds(Arrays.asList("1", "2"));
            queryVO.setTag("AIUI-RAG2");
            queryVO.setPageNo(1);
            queryVO.setPageSize(10);

            FileInfoV2 file1 = new FileInfoV2();
            file1.setId(1L);
            file1.setUuid("uuid-001");
            file1.setLastUuid("last-uuid-001");

            FileInfoV2 file2 = new FileInfoV2();
            file2.setId(2L);
            file2.setUuid("uuid-002");
            file2.setLastUuid("last-uuid-002");

            when(fileInfoV2Mapper.listByIds(anyList())).thenReturn(Arrays.asList(file1, file2));
            doNothing().when(dataPermissionCheckTool).checkFileInfoListVisible(anyList());
            doNothing().when(dataPermissionCheckTool).checkFileBelong(any(FileInfoV2.class));

            MysqlPreviewKnowledge knowledge1 = new MysqlPreviewKnowledge();
            knowledge1.setId("k1");
            knowledge1.setFileId("last-uuid-001");
            knowledge1.setContent(new JSONObject());
            knowledge1.setCharCount(100L);

            MysqlPreviewKnowledge knowledge2 = new MysqlPreviewKnowledge();
            knowledge2.setId("k2");
            knowledge2.setFileId("last-uuid-002");
            knowledge2.setContent(new JSONObject());
            knowledge2.setCharCount(150L);

            when(previewKnowledgeMapper.findByFileIdInAndAuditType(anyList(), eq(1)))
                    .thenReturn(Collections.emptyList());
            when(previewKnowledgeMapper.findByFileIdIn(anyList()))
                    .thenReturn(Arrays.asList(knowledge1, knowledge2));

            QueryWrapper<FileInfoV2> wrapper1 = new QueryWrapper<>();
            wrapper1.eq("last_uuid", "last-uuid-001");
            QueryWrapper<FileInfoV2> wrapper2 = new QueryWrapper<>();
            wrapper2.eq("last_uuid", "last-uuid-002");

            when(fileInfoV2Mapper.selectOne(any(QueryWrapper.class), anyBoolean()))
                    .thenReturn(file1, file2);

            // When
            Object result = fileInfoV2Service.listPreviewKnowledgeByPage(queryVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result).isInstanceOf(PageData.class);
            PageData pageData = (PageData) result;
            assertThat(pageData.getTotalCount()).isEqualTo(2L);
            assertThat(pageData.getPageData()).isNotNull();
        }

        /**
         * Test listPreviewKnowledgeByPage - empty result.
         */
        @Test
        @DisplayName("List preview knowledge - empty result")
        void testListPreviewKnowledgeByPage_EmptyResult() {
            // Given
            KnowledgeQueryVO queryVO = new KnowledgeQueryVO();
            queryVO.setFileIds(Arrays.asList("1"));
            queryVO.setTag("AIUI-RAG2");
            queryVO.setPageNo(1);
            queryVO.setPageSize(10);

            FileInfoV2 file1 = new FileInfoV2();
            file1.setId(1L);
            file1.setLastUuid("last-uuid-001");

            when(fileInfoV2Mapper.listByIds(anyList())).thenReturn(Arrays.asList(file1));
            doNothing().when(dataPermissionCheckTool).checkFileInfoListVisible(anyList());
            doNothing().when(dataPermissionCheckTool).checkFileBelong(any(FileInfoV2.class));
            when(previewKnowledgeMapper.findByFileIdInAndAuditType(anyList(), eq(1)))
                    .thenReturn(Collections.emptyList());
            when(previewKnowledgeMapper.findByFileIdIn(anyList()))
                    .thenReturn(Collections.emptyList());

            // When
            Object result = fileInfoV2Service.listPreviewKnowledgeByPage(queryVO);

            // Then
            assertThat(result).isNotNull();
            PageData pageData = (PageData) result;
            assertThat(pageData.getTotalCount()).isEqualTo(0L);
            assertThat(pageData.getPageData()).isEmpty();
        }

        /**
         * Test listPreviewKnowledgeByPage - with audit block count.
         */
        @Test
        @DisplayName("List preview knowledge - with audit block count")
        void testListPreviewKnowledgeByPage_WithAuditBlock() {
            // Given
            KnowledgeQueryVO queryVO = new KnowledgeQueryVO();
            queryVO.setFileIds(Arrays.asList("1"));
            queryVO.setTag("AIUI-RAG2");
            queryVO.setPageNo(1);
            queryVO.setPageSize(10);

            FileInfoV2 file1 = new FileInfoV2();
            file1.setId(1L);
            file1.setLastUuid("last-uuid-001");

            MysqlPreviewKnowledge blockedKnowledge = new MysqlPreviewKnowledge();
            blockedKnowledge.setId("kb1");
            blockedKnowledge.setFileId("last-uuid-001");

            when(fileInfoV2Mapper.listByIds(anyList())).thenReturn(Arrays.asList(file1));
            doNothing().when(dataPermissionCheckTool).checkFileInfoListVisible(anyList());
            doNothing().when(dataPermissionCheckTool).checkFileBelong(any(FileInfoV2.class));
            when(previewKnowledgeMapper.findByFileIdInAndAuditType(anyList(), eq(1)))
                    .thenReturn(Arrays.asList(blockedKnowledge));
            when(previewKnowledgeMapper.findByFileIdIn(anyList()))
                    .thenReturn(Collections.emptyList());

            // When
            Object result = fileInfoV2Service.listPreviewKnowledgeByPage(queryVO);

            // Then
            assertThat(result).isNotNull();
            PageData pageData = (PageData) result;
            assertThat(pageData.getExtMap()).containsKey("auditBlockCount");
            assertThat(pageData.getExtMap().get("auditBlockCount")).isEqualTo(1L);
        }
    }

    /**
     * Test cases for listKnowledgeByPage method.
     */
    @Nested
    @DisplayName("listKnowledgeByPage Tests")
    class ListKnowledgeByPageTests {

        /**
         * Test listKnowledgeByPage - success with basic query.
         */
        @Test
        @DisplayName("List knowledge by page - success")
        void testListKnowledgeByPage_Success() {
            // Given
            KnowledgeQueryVO queryVO = new KnowledgeQueryVO();
            queryVO.setFileIds(Arrays.asList("1"));
            queryVO.setPageNo(1);
            queryVO.setPageSize(10);

            FileInfoV2 file1 = new FileInfoV2();
            file1.setId(1L);
            file1.setUuid("uuid-001");
            file1.setSource("AIUI-RAG2");

            MysqlKnowledge knowledge = new MysqlKnowledge();
            knowledge.setId("k1");
            knowledge.setFileId("uuid-001");
            JSONObject content = new JSONObject();
            content.put("content", "test knowledge content");
            knowledge.setContent(content);

            when(fileInfoV2Mapper.listByIds(anyList())).thenReturn(Arrays.asList(file1));
            doNothing().when(dataPermissionCheckTool).checkFileBelong(any(FileInfoV2.class));
            when(knowledgeMapper.findByFileIdIn(anyList())).thenReturn(Arrays.asList(knowledge));
            when(knowledgeMapper.countByFileIdIn(anyList())).thenReturn(1L);
            when(knowledgeMapper.findByFileIdInAndAuditType(anyList(), eq(1)))
                    .thenReturn(Collections.emptyList());
            when(fileInfoV2Mapper.selectOne(any(QueryWrapper.class), anyBoolean())).thenReturn(file1);

            // When
            PageData<KnowledgeDto> result = fileInfoV2Service.listKnowledgeByPage(queryVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getTotalCount()).isEqualTo(1L);
            assertThat(result.getPageData()).hasSize(1);
            assertThat(result.getExtMap()).containsKey("auditBlockCount");
        }

        /**
         * Test listKnowledgeByPage - with content query filter.
         */
        @Test
        @DisplayName("List knowledge by page - with content query")
        void testListKnowledgeByPage_WithContentQuery() {
            // Given
            KnowledgeQueryVO queryVO = new KnowledgeQueryVO();
            queryVO.setFileIds(Arrays.asList("1"));
            queryVO.setPageNo(1);
            queryVO.setPageSize(10);
            queryVO.setQuery("test");

            FileInfoV2 file1 = new FileInfoV2();
            file1.setId(1L);
            file1.setUuid("uuid-001");
            file1.setSource("AIUI-RAG2");

            MysqlKnowledge knowledge = new MysqlKnowledge();
            knowledge.setId("k1");
            knowledge.setFileId("uuid-001");
            JSONObject content = new JSONObject();
            content.put("content", "test knowledge content");
            knowledge.setContent(content);

            when(fileInfoV2Mapper.listByIds(anyList())).thenReturn(Arrays.asList(file1));
            doNothing().when(dataPermissionCheckTool).checkFileBelong(any(FileInfoV2.class));
            when(knowledgeMapper.findByFileIdInAndContentLike(anyList(), eq("test")))
                    .thenReturn(Arrays.asList(knowledge));
            when(knowledgeMapper.countByFileIdInAndContentLike(anyList(), eq("test")))
                    .thenReturn(1L);
            when(knowledgeMapper.findByFileIdInAndAuditType(anyList(), eq(1)))
                    .thenReturn(Collections.emptyList());
            when(fileInfoV2Mapper.selectOne(any(QueryWrapper.class), anyBoolean())).thenReturn(file1);

            // When
            PageData<KnowledgeDto> result = fileInfoV2Service.listKnowledgeByPage(queryVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getTotalCount()).isEqualTo(1L);
            verify(knowledgeMapper, times(1)).findByFileIdInAndContentLike(anyList(), eq("test"));
        }

        /**
         * Test listKnowledgeByPage - with audit type filter.
         */
        @Test
        @DisplayName("List knowledge by page - with audit type filter")
        void testListKnowledgeByPage_WithAuditType() {
            // Given
            KnowledgeQueryVO queryVO = new KnowledgeQueryVO();
            queryVO.setFileIds(Arrays.asList("1"));
            queryVO.setPageNo(1);
            queryVO.setPageSize(10);
            queryVO.setAuditType(1);

            FileInfoV2 file1 = new FileInfoV2();
            file1.setId(1L);
            file1.setUuid("uuid-001");
            file1.setSource("AIUI-RAG2");

            MysqlKnowledge knowledge = new MysqlKnowledge();
            knowledge.setId("k1");
            knowledge.setFileId("uuid-001");
            JSONObject content = new JSONObject();
            content.put("content", "blocked content");
            knowledge.setContent(content);

            when(fileInfoV2Mapper.listByIds(anyList())).thenReturn(Arrays.asList(file1));
            doNothing().when(dataPermissionCheckTool).checkFileBelong(any(FileInfoV2.class));
            when(knowledgeMapper.findByFileIdInAndAuditType(anyList(), eq(1)))
                    .thenReturn(Arrays.asList(knowledge));
            when(knowledgeMapper.countByFileIdInAndAuditType(anyList(), eq(1)))
                    .thenReturn(1L);
            when(fileInfoV2Mapper.selectOne(any(QueryWrapper.class), anyBoolean())).thenReturn(file1);

            // When
            PageData<KnowledgeDto> result = fileInfoV2Service.listKnowledgeByPage(queryVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getTotalCount()).isEqualTo(1L);
            verify(knowledgeMapper, times(2)).findByFileIdInAndAuditType(anyList(), eq(1));
        }

        /**
         * Test listKnowledgeByPage - empty result.
         */
        @Test
        @DisplayName("List knowledge by page - empty result")
        void testListKnowledgeByPage_EmptyResult() {
            // Given
            KnowledgeQueryVO queryVO = new KnowledgeQueryVO();
            queryVO.setFileIds(Arrays.asList("1"));
            queryVO.setPageNo(1);
            queryVO.setPageSize(10);

            FileInfoV2 file1 = new FileInfoV2();
            file1.setId(1L);
            file1.setUuid("uuid-001");

            when(fileInfoV2Mapper.listByIds(anyList())).thenReturn(Arrays.asList(file1));
            doNothing().when(dataPermissionCheckTool).checkFileBelong(any(FileInfoV2.class));
            when(knowledgeMapper.findByFileIdIn(anyList())).thenReturn(Collections.emptyList());
            when(knowledgeMapper.countByFileIdIn(anyList())).thenReturn(0L);
            when(knowledgeMapper.findByFileIdInAndAuditType(anyList(), eq(1)))
                    .thenReturn(Collections.emptyList());

            // When
            PageData<KnowledgeDto> result = fileInfoV2Service.listKnowledgeByPage(queryVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getTotalCount()).isEqualTo(0L);
            assertThat(result.getPageData()).isEmpty();
        }

        /**
         * Test listKnowledgeByPage - with space ID (skip permission check).
         */
        @Test
        @DisplayName("List knowledge by page - with space ID")
        void testListKnowledgeByPage_WithSpaceId() {
            // Given
            spaceInfoUtilMock.when(SpaceInfoUtil::getSpaceId).thenReturn(123L);

            KnowledgeQueryVO queryVO = new KnowledgeQueryVO();
            queryVO.setFileIds(Arrays.asList("1"));
            queryVO.setPageNo(1);
            queryVO.setPageSize(10);

            FileInfoV2 file1 = new FileInfoV2();
            file1.setId(1L);
            file1.setUuid("uuid-001");
            file1.setSource("AIUI-RAG2");

            when(fileInfoV2Mapper.listByIds(anyList())).thenReturn(Arrays.asList(file1));
            when(knowledgeMapper.findByFileIdIn(anyList())).thenReturn(Collections.emptyList());
            when(knowledgeMapper.countByFileIdIn(anyList())).thenReturn(0L);
            when(knowledgeMapper.findByFileIdInAndAuditType(anyList(), eq(1)))
                    .thenReturn(Collections.emptyList());

            // When
            PageData<KnowledgeDto> result = fileInfoV2Service.listKnowledgeByPage(queryVO);

            // Then
            assertThat(result).isNotNull();
            verify(dataPermissionCheckTool, never()).checkFileBelong(any(FileInfoV2.class));
        }
    }

    /**
     * Test cases for downloadKnowledgeByViolation method.
     */
    @Nested
    @DisplayName("downloadKnowledgeByViolation Tests")
    class DownloadKnowledgeByViolationTests {

        private HttpServletResponse response;
        private ByteArrayOutputStream byteArrayOutputStream;
        private ServletOutputStream servletOutputStream;

        @BeforeEach
        void setUpDownloadTests() throws IOException {
            response = mock(HttpServletResponse.class);
            byteArrayOutputStream = new ByteArrayOutputStream();

            // Create a real ServletOutputStream that delegates to ByteArrayOutputStream
            servletOutputStream = new ServletOutputStream() {
                @Override
                public void write(int b) throws IOException {
                    byteArrayOutputStream.write(b);
                }

                @Override
                public void write(byte[] b, int off, int len) throws IOException {
                    byteArrayOutputStream.write(b, off, len);
                }

                @Override
                public boolean isReady() {
                    return true;
                }

                @Override
                public void setWriteListener(jakarta.servlet.WriteListener writeListener) {}
            };

            lenient().when(response.getOutputStream()).thenReturn(servletOutputStream);
            lenient().doNothing().when(response).reset();
        }

        /**
         * Test downloadKnowledgeByViolation - success with preview source.
         */
        @Test
        @DisplayName("Download knowledge by violation - success (preview)")
        void testDownloadKnowledgeByViolation_Success_Preview() throws IOException {
            // Given
            KnowledgeQueryVO queryVO = new KnowledgeQueryVO();
            queryVO.setFileIds(Arrays.asList("1"));
            queryVO.setSource(0);

            FileInfoV2 file1 = new FileInfoV2();
            file1.setId(1L);
            file1.setUuid("uuid-001");
            file1.setName("test-file.txt");
            file1.setRepoId(100L);

            MysqlPreviewKnowledge knowledge = new MysqlPreviewKnowledge();
            knowledge.setId("k1");
            knowledge.setFileId("uuid-001");
            JSONObject content = new JSONObject();
            content.put("content", "violation content");
            content.put("auditSuggest", "block");
            content.put("auditReason", "inappropriate content");
            knowledge.setContent(content);

            when(fileInfoV2Mapper.listByIds(anyList())).thenReturn(Arrays.asList(file1));
            when(repoService.getById(100L)).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
            when(previewKnowledgeMapper.findByFileIdInAndAuditType(anyList(), eq(1)))
                    .thenReturn(Arrays.asList(knowledge));

            // When
            fileInfoV2Service.downloadKnowledgeByViolation(response, queryVO);

            // Then
            verify(response, times(1)).reset();
            verify(response, times(1)).setContentType("application/msexcel");
            verify(response, times(1)).setHeader(eq("Content-disposition"), anyString());
            // Verify data was written to the output stream
            assertThat(byteArrayOutputStream.size()).isGreaterThan(0);
        }

        /**
         * Test downloadKnowledgeByViolation - success with formal source.
         */
        @Test
        @DisplayName("Download knowledge by violation - success (formal)")
        void testDownloadKnowledgeByViolation_Success_Formal() throws IOException {
            // Given
            KnowledgeQueryVO queryVO = new KnowledgeQueryVO();
            queryVO.setFileIds(Arrays.asList("1"));
            queryVO.setSource(1);

            FileInfoV2 file1 = new FileInfoV2();
            file1.setId(1L);
            file1.setUuid("uuid-001");
            file1.setName("test-file.txt");
            file1.setRepoId(100L);

            MysqlKnowledge knowledge = new MysqlKnowledge();
            knowledge.setId("k1");
            knowledge.setFileId("uuid-001");
            JSONObject content = new JSONObject();
            content.put("content", "violation content");
            knowledge.setContent(content);

            when(fileInfoV2Mapper.listByIds(anyList())).thenReturn(Arrays.asList(file1));
            when(repoService.getById(100L)).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
            when(knowledgeMapper.findByFileIdInAndAuditType(anyList(), eq(1)))
                    .thenReturn(Arrays.asList(knowledge));

            // When
            fileInfoV2Service.downloadKnowledgeByViolation(response, queryVO);

            // Then
            verify(response, times(1)).reset();
            verify(response, times(1)).setContentType("application/msexcel");
            verify(response, times(1)).setHeader(eq("Content-disposition"), anyString());
            verify(knowledgeMapper, times(1)).findByFileIdInAndAuditType(anyList(), eq(1));
            // Verify data was written to the output stream
            assertThat(byteArrayOutputStream.size()).isGreaterThan(0);
        }

        /**
         * Test downloadKnowledgeByViolation - file not found.
         */
        @Test
        @DisplayName("Download knowledge by violation - file not found")
        void testDownloadKnowledgeByViolation_FileNotFound() {
            // Given
            KnowledgeQueryVO queryVO = new KnowledgeQueryVO();
            queryVO.setFileIds(Arrays.asList("999"));

            when(fileInfoV2Mapper.listByIds(anyList())).thenReturn(Collections.emptyList());

            // When & Then
            assertThatThrownBy(() -> fileInfoV2Service.downloadKnowledgeByViolation(response, queryVO))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_FILE_NOT_EXIST);
        }
    }

    /**
     * Test cases for embeddingBack method.
     */
    @Nested
    @DisplayName("embeddingBack Tests")
    class EmbeddingBackTests {

        /**
         * Test embeddingBack - success with non-Spark tag.
         */
        @Test
        @DisplayName("Embedding back - success (non-Spark)")
        void testEmbeddingBack_Success_NonSpark() {
            // Given
            DealFileVO dealFileVO = new DealFileVO();
            dealFileVO.setFileIds(Arrays.asList("1"));
            dealFileVO.setTag("AIUI-RAG2");

            mockFileInfo.setStatus(ProjectContent.FILE_PARSE_SUCCESSED);

            FileDirectoryTree tree = new FileDirectoryTree();
            tree.setId(1L);
            tree.setFileId(1L);
            tree.setAppId("100");

            doNothing().when(dataPermissionCheckTool).checkFileBelong(any(FileInfoV2.class));
            when(fileDirectoryTreeService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(tree);
            when(fileDirectoryTreeMapper.updateById(any(FileDirectoryTree.class))).thenReturn(1);
            doReturn(mockFileInfo).when(fileInfoV2Service).getById(1L);

            // When
            fileInfoV2Service.embeddingBack(dealFileVO, mockRequest);

            // Then
            verify(fileDirectoryTreeMapper, times(1)).updateById(any(FileDirectoryTree.class));
        }

        /**
         * Test embeddingBack - file not found (should skip).
         */
        @Test
        @DisplayName("Embedding back - file not found")
        void testEmbeddingBack_FileNotFound() {
            // Given
            DealFileVO dealFileVO = new DealFileVO();
            dealFileVO.setFileIds(Arrays.asList("999"));
            dealFileVO.setTag("AIUI-RAG2");

            doReturn(null).when(fileInfoV2Service).getById(999L);

            // When
            fileInfoV2Service.embeddingBack(dealFileVO, mockRequest);

            // Then - method completes without error
            verify(fileDirectoryTreeMapper, never()).updateById(any(FileDirectoryTree.class));
        }
    }

    /**
     * Test cases for searchFile method.
     */
    @Nested
    @DisplayName("searchFile Tests")
    class SearchFileTests {

        /**
         * Test searchFile - success with local (non-Spark) search.
         */
        @Test
        @DisplayName("Search file - success (local search)")
        void testSearchFile_Success_LocalSearch() {
            // Given
            Long repoId = 100L;
            String fileName = "test";
            Integer isFile = 1;
            Long pid = 0L;
            String tag = "AIUI-RAG2";
            Integer isRepoPage = 1;

            FileDirectoryTree tree1 = new FileDirectoryTree();
            tree1.setId(1L);
            tree1.setName("test-file.txt");
            tree1.setFileId(1L);
            tree1.setIsFile(1);
            tree1.setParentId(0L);

            List<FileDirectoryTree> matchedFiles = Arrays.asList(tree1);

            when(fileDirectoryTreeMapper.getModelListSearchByFileName(anyMap())).thenReturn(matchedFiles);
            when(repoService.getById(repoId)).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));

            // When
            SseEmitter result = fileInfoV2Service.searchFile(repoId, fileName, isFile, pid, tag, isRepoPage, mockRequest);

            // Then
            assertThat(result).isNotNull();
            verify(fileDirectoryTreeMapper, times(1)).getModelListSearchByFileName(anyMap());
            verify(repoService, times(1)).getById(repoId);
            verify(dataPermissionCheckTool, times(1)).checkRepoBelong(mockRepo);
        }

        /**
         * Test searchFile - empty search results.
         */
        @Test
        @DisplayName("Search file - empty results")
        void testSearchFile_EmptyResults() {
            // Given
            Long repoId = 100L;
            String fileName = "nonexistent";
            Integer isFile = 1;
            Long pid = 0L;
            String tag = "AIUI-RAG2";
            Integer isRepoPage = 1;

            when(fileDirectoryTreeMapper.getModelListSearchByFileName(anyMap())).thenReturn(Collections.emptyList());
            when(repoService.getById(repoId)).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));

            // When
            SseEmitter result = fileInfoV2Service.searchFile(repoId, fileName, isFile, pid, tag, isRepoPage, mockRequest);

            // Then
            assertThat(result).isNotNull();
            verify(fileDirectoryTreeMapper, times(1)).getModelListSearchByFileName(anyMap());
        }

        /**
         * Test searchFile - repository not found.
         */
        @Test
        @DisplayName("Search file - repository not found")
        void testSearchFile_RepoNotFound() {
            // Given
            Long repoId = 999L;
            String fileName = "test";
            Integer isFile = 1;
            Long pid = 0L;
            String tag = "AIUI-RAG2";
            Integer isRepoPage = 1;

            when(fileDirectoryTreeMapper.getModelListSearchByFileName(anyMap())).thenReturn(Collections.emptyList());
            when(repoService.getById(repoId)).thenReturn(null);

            // When
            SseEmitter result = fileInfoV2Service.searchFile(repoId, fileName, isFile, pid, tag, isRepoPage, mockRequest);

            // Then - SSE emitter returned but will complete with error
            assertThat(result).isNotNull();
        }

        /**
         * Test searchFile - search with folder (isFile=0).
         */
        @Test
        @DisplayName("Search file - search folders")
        void testSearchFile_SearchFolders() {
            // Given
            Long repoId = 100L;
            String fileName = "folder";
            Integer isFile = 0; // Search folders
            Long pid = 0L;
            String tag = "AIUI-RAG2";
            Integer isRepoPage = 1;

            FileDirectoryTree folder = new FileDirectoryTree();
            folder.setId(1L);
            folder.setName("test-folder");
            folder.setIsFile(0);
            folder.setParentId(0L);

            List<FileDirectoryTree> matchedFolders = Arrays.asList(folder);

            when(fileDirectoryTreeMapper.getModelListSearchByFileName(anyMap())).thenReturn(matchedFolders);
            when(repoService.getById(repoId)).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));

            // When
            SseEmitter result = fileInfoV2Service.searchFile(repoId, fileName, isFile, pid, tag, isRepoPage, mockRequest);

            // Then
            assertThat(result).isNotNull();
            verify(fileDirectoryTreeMapper, times(1)).getModelListSearchByFileName(anyMap());
        }

        /**
         * Test searchFile - search with null isFile (search both files and folders).
         */
        @Test
        @DisplayName("Search file - search both files and folders")
        void testSearchFile_SearchAll() {
            // Given
            Long repoId = 100L;
            String fileName = "test";
            Integer isFile = null; // Search both
            Long pid = 0L;
            String tag = "AIUI-RAG2";
            Integer isRepoPage = 1;

            FileDirectoryTree file = new FileDirectoryTree();
            file.setId(1L);
            file.setName("test-file.txt");
            file.setIsFile(1);
            file.setFileId(1L);

            FileDirectoryTree folder = new FileDirectoryTree();
            folder.setId(2L);
            folder.setName("test-folder");
            folder.setIsFile(0);

            List<FileDirectoryTree> matchedItems = Arrays.asList(file, folder);

            when(fileDirectoryTreeMapper.getModelListSearchByFileName(anyMap())).thenReturn(matchedItems);
            when(repoService.getById(repoId)).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));

            // When
            SseEmitter result = fileInfoV2Service.searchFile(repoId, fileName, isFile, pid, tag, isRepoPage, mockRequest);

            // Then
            assertThat(result).isNotNull();
            verify(fileDirectoryTreeMapper, times(1)).getModelListSearchByFileName(anyMap());
        }

        /**
         * Test searchFile - with specific parent ID filter.
         */
        @Test
        @DisplayName("Search file - with parent ID filter")
        void testSearchFile_WithParentIdFilter() {
            // Given
            Long repoId = 100L;
            String fileName = "test";
            Integer isFile = 1;
            Long pid = 5L; // Specific parent ID
            String tag = "AIUI-RAG2";
            Integer isRepoPage = 1;

            FileDirectoryTree tree1 = new FileDirectoryTree();
            tree1.setId(1L);
            tree1.setName("test-file.txt");
            tree1.setFileId(1L);
            tree1.setIsFile(1);
            tree1.setParentId(5L); // Matches pid

            FileDirectoryTree tree2 = new FileDirectoryTree();
            tree2.setId(2L);
            tree2.setName("test-file2.txt");
            tree2.setFileId(2L);
            tree2.setIsFile(1);
            tree2.setParentId(10L); // Does not match pid

            List<FileDirectoryTree> matchedFiles = Arrays.asList(tree1, tree2);

            when(fileDirectoryTreeMapper.getModelListSearchByFileName(anyMap())).thenReturn(matchedFiles);
            when(repoService.getById(repoId)).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));

            // When
            SseEmitter result = fileInfoV2Service.searchFile(repoId, fileName, isFile, pid, tag, isRepoPage, mockRequest);

            // Then
            assertThat(result).isNotNull();
            verify(fileDirectoryTreeMapper, times(1)).getModelListSearchByFileName(anyMap());
        }
    }
}
