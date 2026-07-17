package com.iflytek.astron.console.toolkit.service.knowledge;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.toolkit.common.constant.ProjectContent;
import com.iflytek.astron.console.toolkit.config.properties.BizConfig;
import com.iflytek.astron.console.toolkit.config.properties.ApiUrl;
import com.iflytek.astron.console.toolkit.entity.core.knowledge.*;
import com.iflytek.astron.console.toolkit.entity.mongo.Knowledge;
import com.iflytek.astron.console.toolkit.entity.pojo.DealFileResult;
import com.iflytek.astron.console.toolkit.entity.pojo.SliceConfig;
import com.iflytek.astron.console.toolkit.entity.table.knowledge.MysqlKnowledge;
import com.iflytek.astron.console.toolkit.entity.table.knowledge.MysqlPreviewKnowledge;
import com.iflytek.astron.console.toolkit.entity.table.repo.*;
import com.iflytek.astron.console.toolkit.entity.vo.repo.KnowledgeVO;
import com.iflytek.astron.console.toolkit.handler.KnowledgeV2ServiceCallHandler;
import com.iflytek.astron.console.toolkit.mapper.knowledge.KnowledgeMapper;
import com.iflytek.astron.console.toolkit.mapper.knowledge.PreviewKnowledgeMapper;
import com.iflytek.astron.console.toolkit.mapper.repo.FileInfoV2Mapper;
import com.iflytek.astron.console.toolkit.service.repo.FileInfoV2Service;
import com.iflytek.astron.console.toolkit.service.repo.KnowledgeService;
import com.iflytek.astron.console.toolkit.service.repo.RepoService;
import com.iflytek.astron.console.toolkit.service.task.ExtractKnowledgeTaskService;
import com.iflytek.astron.console.toolkit.tool.DataPermissionCheckTool;
import com.iflytek.astron.console.toolkit.util.S3Util;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for KnowledgeService
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
@DisplayName("KnowledgeService Unit Tests")
class KnowledgeServiceTest {

    @Mock
    private KnowledgeV2ServiceCallHandler knowledgeV2ServiceCallHandler;

    @Mock
    private FileInfoV2Service fileInfoV2Service;

    @Mock
    private FileInfoV2Mapper fileInfoV2Mapper;

    @Mock
    private RepoService repoService;

    @Mock
    private ExtractKnowledgeTaskService extractKnowledgeTaskService;

    @Mock
    private ApiUrl apiUrl;

    @Mock
    private S3Util s3Util;

    @Mock
    private DataPermissionCheckTool dataPermissionCheckTool;

    @Mock
    private KnowledgeMapper knowledgeMapper;

    @Mock
    private PreviewKnowledgeMapper previewKnowledgeMapper;

    @InjectMocks
    private KnowledgeService knowledgeService;

    private KnowledgeVO mockKnowledgeVO;
    private MysqlKnowledge mockMysqlKnowledge;
    private Knowledge mockKnowledge;
    private FileInfoV2 mockFileInfo;
    private Repo mockRepo;
    private ExtractKnowledgeTask mockExtractTask;

    /**
     * Set up test fixtures before each test method. Initializes common test data including mock
     * knowledge and file objects.
     */
    @BeforeEach
    void setUp() {
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
        mockFileInfo.setType("text/plain");
        mockFileInfo.setCreateTime(new Timestamp(System.currentTimeMillis()));
        mockFileInfo.setUpdateTime(new Timestamp(System.currentTimeMillis()));

        // Initialize mock Repo
        mockRepo = new Repo();
        mockRepo.setId(100L);
        mockRepo.setName("Test Repository");
        mockRepo.setCoreRepoId("core-repo-001");
        mockRepo.setRagflowDatasetId("ds-real-id-001");
        mockRepo.setTag("AIUI-RAG2");
        mockRepo.setDeleted(false);
        mockRepo.setEnableAudit(false);
        mockRepo.setCreateTime(new Date());
        mockRepo.setUpdateTime(new Date());

        // Initialize mock KnowledgeVO
        mockKnowledgeVO = new KnowledgeVO();
        mockKnowledgeVO.setFileId(1L);
        mockKnowledgeVO.setContent("Test knowledge content");

        // Initialize mock MysqlKnowledge
        mockMysqlKnowledge = new MysqlKnowledge();
        mockMysqlKnowledge.setId("knowledge-001");
        mockMysqlKnowledge.setFileId("file-uuid-001");
        mockMysqlKnowledge.setEnabled(1);
        mockMysqlKnowledge.setSource(1);
        mockMysqlKnowledge.setCharCount(100L);
        mockMysqlKnowledge.setTestHitCount(0L);
        mockMysqlKnowledge.setDialogHitCount(0L);
        mockMysqlKnowledge.setCreatedAt(LocalDateTime.now());
        mockMysqlKnowledge.setUpdatedAt(LocalDateTime.now());

        JSONObject content = new JSONObject();
        content.put("content", "Test knowledge content");
        content.put("title", "");
        content.put("context", "Test knowledge content");
        mockMysqlKnowledge.setContent(content);

        // Initialize mock Knowledge
        mockKnowledge = new Knowledge();
        mockKnowledge.setId("knowledge-001");
        mockKnowledge.setFileId("file-uuid-001");
        mockKnowledge.setEnabled(1);
        mockKnowledge.setSource(1);
        mockKnowledge.setCharCount(100L);
        mockKnowledge.setTestHitCount(0L);
        mockKnowledge.setDialogHitCount(0L);
        mockKnowledge.setContent(content);
        mockKnowledge.setCreatedAt(LocalDateTime.now());
        mockKnowledge.setUpdatedAt(LocalDateTime.now());

        // Initialize mock ExtractKnowledgeTask
        mockExtractTask = new ExtractKnowledgeTask();
        mockExtractTask.setId(1L);
        mockExtractTask.setTaskId("task-001");
        mockExtractTask.setFileId(1L);
        mockExtractTask.setStatus(0);
        mockExtractTask.setTaskStatus(0);
        mockExtractTask.setCreateTime(new Timestamp(System.currentTimeMillis()));
        mockExtractTask.setUpdateTime(new Timestamp(System.currentTimeMillis()));

        // Setup common mocks
    }

    /**
     * Test cases for the createKnowledge method. Validates knowledge creation functionality including
     * success scenarios and error handling.
     */
    @Nested
    @DisplayName("createKnowledge Tests")
    class CreateKnowledgeTests {

        /**
         * Test successful knowledge creation with AIUI source.
         */
        @Test
        @DisplayName("Create knowledge successfully with AIUI source")
        void testCreateKnowledge_Success_WithAIUI() {
            // Given
            when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
            when(repoService.getById(anyLong())).thenReturn(mockRepo);  // Add mock for preCheck
            when(repoService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
            when(fileInfoV2Mapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(mockFileInfo);

            KnowledgeResponse knowledgeResponse = new KnowledgeResponse();
            knowledgeResponse.setCode(0);
            knowledgeResponse.setMessage("success");
            when(knowledgeV2ServiceCallHandler.saveChunk(any())).thenReturn(knowledgeResponse);

            when(knowledgeMapper.insert(any(MysqlKnowledge.class))).thenAnswer(invocation -> {
                MysqlKnowledge knowledge = invocation.getArgument(0);
                knowledge.setId("knowledge-new-001");
                return 1;
            });

            // When
            Knowledge result = knowledgeService.createKnowledge(mockKnowledgeVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getFileId()).isEqualTo("file-uuid-001");
            assertThat(result.getEnabled()).isEqualTo(1);
            assertThat(result.getSource()).isEqualTo(1);
            verify(knowledgeMapper, times(1)).insert(any(MysqlKnowledge.class));
            verify(knowledgeV2ServiceCallHandler, times(1)).saveChunk(any());
        }

        /**
         * Test successful knowledge creation with CBG source.
         */
        @Test
        @DisplayName("Create knowledge successfully with CBG source")
        void testCreateKnowledge_Success_WithCBG() {
            // Given
            mockRepo.setTag("CBG-RAG");
            mockFileInfo.setSource("CBG-RAG");

            when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
            when(repoService.getById(anyLong())).thenReturn(mockRepo); // Add mock for preCheck
            when(repoService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
            when(fileInfoV2Mapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(mockFileInfo);

            KnowledgeResponse knowledgeResponse = new KnowledgeResponse();
            knowledgeResponse.setCode(0);
            knowledgeResponse.setMessage("success");

            JSONArray dataArray = new JSONArray();
            JSONObject cbgData = new JSONObject();
            cbgData.put("id", "cbg-knowledge-001");
            cbgData.put("dataIndex", "0");
            dataArray.add(cbgData);
            knowledgeResponse.setData(dataArray);

            when(knowledgeV2ServiceCallHandler.saveChunk(any())).thenReturn(knowledgeResponse);
            when(knowledgeMapper.insert(any(MysqlKnowledge.class))).thenReturn(1);

            // When
            Knowledge result = knowledgeService.createKnowledge(mockKnowledgeVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo("cbg-knowledge-001");
            verify(knowledgeMapper, times(1)).insert(any(MysqlKnowledge.class));
        }

        @Test
        @DisplayName("Create knowledge with Ragflow-RAG passes datasetId to saveChunk")
        void testCreateKnowledge_RagflowRAG_PassesDatasetId() {
            BizConfig bizConfig = new BizConfig();
            bizConfig.setCbgRagCompatibleSources(Arrays.asList(
                    ProjectContent.FILE_SOURCE_CBG_RAG_STR,
                    ProjectContent.FILE_SOURCE_RAG_FLOW_RAG_STR));
            new ProjectContent().setBizConfig(bizConfig);
            try {
                mockRepo.setTag(ProjectContent.FILE_SOURCE_RAG_FLOW_RAG_STR);
                mockFileInfo.setSource(ProjectContent.FILE_SOURCE_RAG_FLOW_RAG_STR);

                when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
                when(repoService.getById(anyLong())).thenReturn(mockRepo);
                when(repoService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(mockRepo);
                doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
                when(fileInfoV2Mapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(mockFileInfo);

                KnowledgeResponse knowledgeResponse = new KnowledgeResponse();
                knowledgeResponse.setCode(0);
                knowledgeResponse.setMessage("success");
                JSONArray dataArray = new JSONArray();
                JSONObject cbgData = new JSONObject();
                cbgData.put("id", "ragflow-knowledge-001");
                cbgData.put("dataIndex", "0");
                dataArray.add(cbgData);
                knowledgeResponse.setData(dataArray);

                ArgumentCaptor<KnowledgeRequest> requestCaptor = ArgumentCaptor.forClass(KnowledgeRequest.class);
                when(knowledgeV2ServiceCallHandler.saveChunk(requestCaptor.capture()))
                        .thenReturn(knowledgeResponse);
                when(knowledgeMapper.insert(any(MysqlKnowledge.class))).thenReturn(1);

                Knowledge result = knowledgeService.createKnowledge(mockKnowledgeVO);

                assertThat(result).isNotNull();
                assertThat(requestCaptor.getValue().getGroup()).isEqualTo("core-repo-001");
                assertThat(requestCaptor.getValue().getDatasetId()).isEqualTo("ds-real-id-001");
            } finally {
                new ProjectContent().setBizConfig(null);
            }
        }

        @Test
        @DisplayName("Create knowledge with legacy Ragflow-RAG repo leaves datasetId unset")
        void testCreateKnowledge_RagflowRAG_LegacyNullDatasetId() {
            BizConfig bizConfig = new BizConfig();
            bizConfig.setCbgRagCompatibleSources(Arrays.asList(
                    ProjectContent.FILE_SOURCE_CBG_RAG_STR,
                    ProjectContent.FILE_SOURCE_RAG_FLOW_RAG_STR));
            new ProjectContent().setBizConfig(bizConfig);
            try {
                mockRepo.setTag(ProjectContent.FILE_SOURCE_RAG_FLOW_RAG_STR);
                mockRepo.setRagflowDatasetId(null);
                mockFileInfo.setSource(ProjectContent.FILE_SOURCE_RAG_FLOW_RAG_STR);

                when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
                when(repoService.getById(anyLong())).thenReturn(mockRepo);
                when(repoService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(mockRepo);
                doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
                when(fileInfoV2Mapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(mockFileInfo);

                KnowledgeResponse knowledgeResponse = new KnowledgeResponse();
                knowledgeResponse.setCode(0);
                knowledgeResponse.setMessage("success");
                JSONArray dataArray = new JSONArray();
                JSONObject cbgData = new JSONObject();
                cbgData.put("id", "ragflow-knowledge-001");
                cbgData.put("dataIndex", "0");
                dataArray.add(cbgData);
                knowledgeResponse.setData(dataArray);

                ArgumentCaptor<KnowledgeRequest> requestCaptor = ArgumentCaptor.forClass(KnowledgeRequest.class);
                when(knowledgeV2ServiceCallHandler.saveChunk(requestCaptor.capture()))
                        .thenReturn(knowledgeResponse);
                when(knowledgeMapper.insert(any(MysqlKnowledge.class))).thenReturn(1);

                Knowledge result = knowledgeService.createKnowledge(mockKnowledgeVO);

                assertThat(result).isNotNull();
                assertThat(requestCaptor.getValue().getDatasetId()).isNull();
            } finally {
                new ProjectContent().setBizConfig(null);
            }
        }

        /**
         * Test knowledge creation with audit enabled and pass.
         */
        @Test
        @DisplayName("Create knowledge with audit enabled and pass")
        void testCreateKnowledge_WithAuditPass() {
            // Given
            mockRepo.setEnableAudit(true);

            when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
            when(repoService.getById(anyLong())).thenReturn(mockRepo); // Add mock for preCheck
            when(repoService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
            when(fileInfoV2Mapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(mockFileInfo);

            KnowledgeResponse knowledgeResponse = new KnowledgeResponse();
            knowledgeResponse.setCode(0);
            when(knowledgeV2ServiceCallHandler.saveChunk(any())).thenReturn(knowledgeResponse);
            when(knowledgeMapper.insert(any(MysqlKnowledge.class))).thenReturn(1);

            // When
            Knowledge result = knowledgeService.createKnowledge(mockKnowledgeVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getEnabled()).isEqualTo(1);
            verify(knowledgeMapper, times(1)).insert(any(MysqlKnowledge.class));
        }

        /**
         * Test knowledge creation with audit enabled and fail.
         */
        @Test
        @DisplayName("Create knowledge with audit enabled and fail")
        void testCreateKnowledge_WithAuditFail() {
            // Given
            mockRepo.setEnableAudit(true);
            mockKnowledgeVO.setContent("违规内容");

            when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
            when(repoService.getById(anyLong())).thenReturn(mockRepo); // Add mock for preCheck
            when(repoService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
            when(fileInfoV2Mapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(mockFileInfo);

            // Mock saveChunk response even for audit fail case - it may still be called
            KnowledgeResponse knowledgeResponse = new KnowledgeResponse();
            knowledgeResponse.setCode(0);
            when(knowledgeV2ServiceCallHandler.saveChunk(any())).thenReturn(knowledgeResponse);

            when(knowledgeMapper.insert(any(MysqlKnowledge.class))).thenReturn(1);

            // When
            Knowledge result = knowledgeService.createKnowledge(mockKnowledgeVO);

            // Then
            assertThat(result).isNotNull();
            verify(knowledgeMapper, times(1)).insert(any(MysqlKnowledge.class));
            // Note: saveChunk may or may not be called depending on audit result
        }

        /**
         * Test knowledge creation failure when exception occurs.
         */
        @Test
        @DisplayName("Create knowledge fails when exception occurs")
        void testCreateKnowledge_Failure_Exception() {
            // Given
            when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
            when(repoService.getById(anyLong())).thenReturn(mockRepo);  // Add mock for preCheck
            when(repoService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
            when(fileInfoV2Mapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(mockFileInfo);
            when(knowledgeV2ServiceCallHandler.saveChunk(any()))
                    .thenThrow(new RuntimeException("Save chunk failed"));

            // When & Then
            assertThatThrownBy(() -> knowledgeService.createKnowledge(mockKnowledgeVO))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Save chunk failed");
        }
    }

    /**
     * Test cases for the updateKnowledge method. Validates knowledge update functionality including
     * success scenarios and error handling.
     */
    @Nested
    @DisplayName("updateKnowledge Tests")
    class UpdateKnowledgeTests {

        /**
         * Test successful knowledge update.
         */
        @Test
        @DisplayName("Update knowledge successfully")
        void testUpdateKnowledge_Success() {
            // Given
            mockKnowledgeVO.setId("knowledge-001");
            mockKnowledgeVO.setContent("Updated content");

            when(knowledgeMapper.selectById(anyString())).thenReturn(mockMysqlKnowledge);
            when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
            when(repoService.getById(anyLong())).thenReturn(mockRepo); // Add mock for preCheck
            when(fileInfoV2Service.getOnly(any(QueryWrapper.class))).thenReturn(mockFileInfo); // Mock for updateKnowledge internal call
            when(repoService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));

            KnowledgeResponse knowledgeResponse = new KnowledgeResponse();
            knowledgeResponse.setCode(0);
            when(knowledgeV2ServiceCallHandler.updateChunk(any())).thenReturn(knowledgeResponse);
            when(knowledgeMapper.updateById(any(MysqlKnowledge.class))).thenReturn(1);

            // When
            Knowledge result = knowledgeService.updateKnowledge(mockKnowledgeVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getContent().getString("content")).isEqualTo("Updated content");
            verify(knowledgeMapper, times(1)).updateById(any(MysqlKnowledge.class));
            verify(knowledgeV2ServiceCallHandler, times(1)).updateChunk(any());
        }

        @Test
        @DisplayName("Update knowledge with Ragflow-RAG passes datasetId to updateChunk")
        void testUpdateKnowledge_RagflowRAG_PassesDatasetId() {
            mockRepo.setTag(ProjectContent.FILE_SOURCE_RAG_FLOW_RAG_STR);
            mockFileInfo.setSource(ProjectContent.FILE_SOURCE_RAG_FLOW_RAG_STR);
            mockKnowledgeVO.setId("knowledge-001");
            mockKnowledgeVO.setContent("Updated content");

            when(knowledgeMapper.selectById(anyString())).thenReturn(mockMysqlKnowledge);
            when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
            when(repoService.getById(anyLong())).thenReturn(mockRepo);
            when(fileInfoV2Service.getOnly(any(QueryWrapper.class))).thenReturn(mockFileInfo);
            when(repoService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));

            KnowledgeResponse knowledgeResponse = new KnowledgeResponse();
            knowledgeResponse.setCode(0);
            ArgumentCaptor<KnowledgeRequest> requestCaptor = ArgumentCaptor.forClass(KnowledgeRequest.class);
            when(knowledgeV2ServiceCallHandler.updateChunk(requestCaptor.capture()))
                    .thenReturn(knowledgeResponse);
            when(knowledgeMapper.updateById(any(MysqlKnowledge.class))).thenReturn(1);

            Knowledge result = knowledgeService.updateKnowledge(mockKnowledgeVO);

            assertThat(result).isNotNull();
            assertThat(requestCaptor.getValue().getGroup()).isEqualTo("core-repo-001");
            assertThat(requestCaptor.getValue().getDatasetId()).isEqualTo("ds-real-id-001");
        }

        /**
         * Test update knowledge with same content returns without update.
         */
        @Test
        @DisplayName("Update knowledge with same content returns without update")
        void testUpdateKnowledge_SameContent_NoUpdate() {
            // Given
            mockKnowledgeVO.setId("knowledge-001");
            mockKnowledgeVO.setContent("Test knowledge content");

            when(knowledgeMapper.selectById(anyString())).thenReturn(mockMysqlKnowledge);
            when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
            when(repoService.getById(anyLong())).thenReturn(mockRepo); // Add mock for preCheck

            // When
            Knowledge result = knowledgeService.updateKnowledge(mockKnowledgeVO);

            // Then
            assertThat(result).isNotNull();
            verify(knowledgeMapper, never()).updateById(any(MysqlKnowledge.class));
            verify(knowledgeV2ServiceCallHandler, never()).updateChunk(any());
        }

        /**
         * Test update knowledge fails when knowledge not found.
         */
        @Test
        @DisplayName("Update knowledge fails when knowledge not found")
        void testUpdateKnowledge_Failure_NotFound() {
            // Given
            mockKnowledgeVO.setId("knowledge-001");
            when(knowledgeMapper.selectById(anyString())).thenReturn(null);

            // When & Then
            assertThatThrownBy(() -> knowledgeService.updateKnowledge(mockKnowledgeVO))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("responseEnum", ResponseEnum.REPO_KNOWLEDGE_NOT_EXIST);
        }

        /**
         * Test update knowledge with audit enabled.
         */
        @Test
        @DisplayName("Update knowledge with audit enabled")
        void testUpdateKnowledge_WithAudit() {
            // Given
            mockRepo.setEnableAudit(true);
            mockKnowledgeVO.setId("knowledge-001");
            mockKnowledgeVO.setContent("Updated content with audit");

            when(knowledgeMapper.selectById(anyString())).thenReturn(mockMysqlKnowledge);
            when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
            when(repoService.getById(anyLong())).thenReturn(mockRepo); // Add mock for preCheck
            when(fileInfoV2Service.getOnly(any(QueryWrapper.class))).thenReturn(mockFileInfo); // Mock for updateKnowledge internal call
            when(repoService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));

            // Mock updateChunk response even with audit enabled
            KnowledgeResponse knowledgeResponse = new KnowledgeResponse();
            knowledgeResponse.setCode(0);
            when(knowledgeV2ServiceCallHandler.updateChunk(any())).thenReturn(knowledgeResponse);

            when(knowledgeMapper.updateById(any(MysqlKnowledge.class))).thenReturn(1);

            // When
            Knowledge result = knowledgeService.updateKnowledge(mockKnowledgeVO);

            // Then
            assertThat(result).isNotNull();
            verify(knowledgeMapper, times(1)).updateById(any(MysqlKnowledge.class));
        }
    }

    /**
     * Test cases for the enableKnowledge method. Validates knowledge enable/disable functionality.
     */
    @Nested
    @DisplayName("enableKnowledge Tests")
    class EnableKnowledgeTests {

        /**
         * Test successfully enable knowledge.
         */
        @Test
        @DisplayName("Enable knowledge successfully")
        void testEnableKnowledge_Enable_Success() {
            // Given
            mockMysqlKnowledge.setEnabled(0);
            when(knowledgeMapper.selectById(anyString())).thenReturn(mockMysqlKnowledge);
            when(fileInfoV2Service.getOnly(any(QueryWrapper.class))).thenReturn(mockFileInfo);
            when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
            when(repoService.getById(anyLong())).thenReturn(mockRepo);

            KnowledgeResponse knowledgeResponse = new KnowledgeResponse();
            knowledgeResponse.setCode(0);
            when(knowledgeV2ServiceCallHandler.saveChunk(any())).thenReturn(knowledgeResponse);
            when(knowledgeMapper.updateById(any(MysqlKnowledge.class))).thenReturn(1);

            // When
            String result = knowledgeService.enableKnowledge("knowledge-001", 1);

            // Then
            assertThat(result).isEqualTo("knowledge-001");
            verify(knowledgeMapper, times(1)).updateById(any(MysqlKnowledge.class));
            verify(knowledgeV2ServiceCallHandler, times(1)).saveChunk(any());
        }

        /**
         * Test successfully disable knowledge.
         */
        @Test
        @DisplayName("Disable knowledge successfully")
        void testEnableKnowledge_Disable_Success() {
            // Given
            mockMysqlKnowledge.setEnabled(1);
            when(knowledgeMapper.selectById(anyString())).thenReturn(mockMysqlKnowledge);
            when(fileInfoV2Service.getOnly(any(QueryWrapper.class))).thenReturn(mockFileInfo);
            when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
            when(repoService.getById(anyLong())).thenReturn(mockRepo);

            KnowledgeResponse knowledgeResponse = new KnowledgeResponse();
            knowledgeResponse.setCode(0);
            when(knowledgeV2ServiceCallHandler.deleteDocOrChunk(any())).thenReturn(knowledgeResponse);
            when(knowledgeMapper.updateById(any(MysqlKnowledge.class))).thenReturn(1);

            // When
            String result = knowledgeService.enableKnowledge("knowledge-001", 0);

            // Then
            assertThat(result).isEqualTo("knowledge-001");
            verify(knowledgeMapper, times(1)).updateById(any(MysqlKnowledge.class));
            verify(knowledgeV2ServiceCallHandler, times(1)).deleteDocOrChunk(any());
        }

        /**
         * Test enable knowledge with same status returns without update.
         */
        @Test
        @DisplayName("Enable knowledge with same status returns without update")
        void testEnableKnowledge_SameStatus_NoUpdate() {
            // Given
            mockMysqlKnowledge.setEnabled(1);
            when(knowledgeMapper.selectById(anyString())).thenReturn(mockMysqlKnowledge);

            // When
            String result = knowledgeService.enableKnowledge("knowledge-001", 1);

            // Then
            assertThat(result).isEqualTo("knowledge-001");
            verify(knowledgeMapper, never()).updateById(any(MysqlKnowledge.class));
        }

        /**
         * Test enable knowledge fails when knowledge not found.
         */
        @Test
        @DisplayName("Enable knowledge fails when knowledge not found")
        void testEnableKnowledge_Failure_NotFound() {
            // Given
            when(knowledgeMapper.selectById(anyString())).thenReturn(null);

            // When & Then
            assertThatThrownBy(() -> knowledgeService.enableKnowledge("knowledge-001", 1))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("responseEnum", ResponseEnum.REPO_KNOWLEDGE_NOT_EXIST);
        }

        /**
         * Test enable knowledge fails when file not found.
         */
        @Test
        @DisplayName("Enable knowledge fails when file not found")
        void testEnableKnowledge_Failure_FileNotFound() {
            // Given
            mockMysqlKnowledge.setEnabled(0);
            when(knowledgeMapper.selectById(anyString())).thenReturn(mockMysqlKnowledge);
            when(fileInfoV2Service.getOnly(any(QueryWrapper.class))).thenReturn(null);

            // When & Then
            assertThatThrownBy(() -> knowledgeService.enableKnowledge("knowledge-001", 1))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("responseEnum", ResponseEnum.REPO_FILE_NOT_EXIST);
        }

        /**
         * Test enable knowledge with CBG source - delete then add.
         */
        @Test
        @DisplayName("Enable knowledge with CBG source")
        void testEnableKnowledge_CBG_Enable() {
            // Given
            mockRepo.setTag("CBG-RAG");
            mockFileInfo.setSource("CBG-RAG");
            mockMysqlKnowledge.setEnabled(0);

            when(knowledgeMapper.selectById(anyString())).thenReturn(mockMysqlKnowledge);
            when(fileInfoV2Service.getOnly(any(QueryWrapper.class))).thenReturn(mockFileInfo);
            when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
            when(repoService.getById(anyLong())).thenReturn(mockRepo);

            KnowledgeResponse knowledgeResponse = new KnowledgeResponse();
            knowledgeResponse.setCode(0);
            JSONArray dataArray = new JSONArray();
            JSONObject cbgData = new JSONObject();
            cbgData.put("id", "cbg-knowledge-new-001");
            cbgData.put("dataIndex", "0");
            dataArray.add(cbgData);
            knowledgeResponse.setData(dataArray);

            when(knowledgeV2ServiceCallHandler.saveChunk(any())).thenReturn(knowledgeResponse);
            when(knowledgeMapper.deleteById(anyString())).thenReturn(1);
            when(knowledgeMapper.updateById(any(MysqlKnowledge.class))).thenReturn(1);

            // When
            String result = knowledgeService.enableKnowledge("knowledge-001", 1);

            // Then
            assertThat(result).isNotNull();
            verify(knowledgeMapper, times(1)).deleteById(anyString());
            verify(knowledgeMapper, times(1)).updateById(any(MysqlKnowledge.class));
        }

        /**
         * Test enable knowledge with audit fail should not enable.
         */
        @Test
        @DisplayName("Enable knowledge with audit fail should not enable")
        void testEnableKnowledge_AuditFail_NotEnabled() {
            // Given
            mockMysqlKnowledge.setEnabled(0);
            JSONObject content = mockMysqlKnowledge.getContent();
            content.put("auditSuggest", "block");
            mockMysqlKnowledge.setContent(content);

            when(knowledgeMapper.selectById(anyString())).thenReturn(mockMysqlKnowledge);
            when(fileInfoV2Service.getOnly(any(QueryWrapper.class))).thenReturn(mockFileInfo);
            when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
            when(repoService.getById(anyLong())).thenReturn(mockRepo);

            // When
            String result = knowledgeService.enableKnowledge("knowledge-001", 1);

            // Then
            assertThat(result).isEqualTo("knowledge-001");
            verify(knowledgeMapper, never()).updateById(any(MysqlKnowledge.class));
            verify(knowledgeV2ServiceCallHandler, never()).saveChunk(any());
        }
    }

    /**
     * Test cases for the enableDoc method. Validates document enable/disable functionality.
     */
    @Nested
    @DisplayName("enableDoc Tests")
    class EnableDocTests {

        /**
         * Test successfully enable document with AIUI source.
         */
        @Test
        @DisplayName("Enable document successfully with AIUI source")
        void testEnableDoc_Enable_Success_AIUI() {
            // Given
            mockFileInfo.setSource("AIUI-RAG2");
            when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
            when(fileInfoV2Service.getOnly(any(QueryWrapper.class))).thenReturn(mockFileInfo);
            when(repoService.getById(anyLong())).thenReturn(mockRepo);

            List<MysqlKnowledge> mysqlKnowledges = Arrays.asList(mockMysqlKnowledge);
            when(knowledgeMapper.findByFileIdAndEnabled(anyString(), anyInt())).thenReturn(mysqlKnowledges);

            KnowledgeResponse knowledgeResponse = new KnowledgeResponse();
            knowledgeResponse.setCode(0);
            when(knowledgeV2ServiceCallHandler.saveChunk(any())).thenReturn(knowledgeResponse);
            when(knowledgeMapper.updateEnabledByFileIdAndOldEnabled(anyString(), anyInt(), anyInt())).thenReturn(1);

            // When
            knowledgeService.enableDoc(1L, 1);

            // Then
            verify(knowledgeMapper, times(1)).findByFileIdAndEnabled(anyString(), eq(0));
            verify(knowledgeV2ServiceCallHandler, times(1)).saveChunk(any());
            verify(knowledgeMapper, times(1)).updateEnabledByFileIdAndOldEnabled(anyString(), eq(0), eq(1));
        }

        /**
         * Test successfully disable document with AIUI source.
         */
        @Test
        @DisplayName("Disable document successfully with AIUI source")
        void testEnableDoc_Disable_Success_AIUI() {
            // Given
            mockFileInfo.setSource("AIUI-RAG2");
            when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
            when(fileInfoV2Service.getOnly(any(QueryWrapper.class))).thenReturn(mockFileInfo);
            when(repoService.getById(anyLong())).thenReturn(mockRepo);

            KnowledgeResponse knowledgeResponse = new KnowledgeResponse();
            knowledgeResponse.setCode(0);
            when(knowledgeV2ServiceCallHandler.deleteDocOrChunk(any())).thenReturn(knowledgeResponse);
            when(knowledgeMapper.updateEnabledByFileIdAndOldEnabled(anyString(), anyInt(), anyInt())).thenReturn(1);

            // When
            knowledgeService.enableDoc(1L, 0);

            // Then
            verify(knowledgeV2ServiceCallHandler, times(1)).deleteDocOrChunk(any());
            verify(knowledgeMapper, times(1)).updateEnabledByFileIdAndOldEnabled(anyString(), eq(1), eq(0));
        }

        /**
         * Test enable document with CBG source.
         */
        @Test
        @DisplayName("Enable document with CBG source")
        void testEnableDoc_Enable_CBG() {
            // Given
            mockRepo.setTag("CBG-RAG");
            mockFileInfo.setSource("CBG-RAG");

            when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
            when(fileInfoV2Service.getOnly(any(QueryWrapper.class))).thenReturn(mockFileInfo);
            when(repoService.getById(anyLong())).thenReturn(mockRepo);

            List<MysqlKnowledge> mysqlKnowledges = Arrays.asList(mockMysqlKnowledge);
            when(knowledgeMapper.findByFileIdAndEnabled(anyString(), anyInt())).thenReturn(mysqlKnowledges);
            when(knowledgeMapper.updateEnabledByFileIdAndOldEnabled(anyString(), anyInt(), anyInt())).thenReturn(1);

            // When
            knowledgeService.enableDoc(1L, 1);

            // Then
            verify(knowledgeMapper, times(1)).updateEnabledByFileIdAndOldEnabled(anyString(), eq(0), eq(1));
            // CBG source does not delete knowledge chunks when enabling/disabling doc
            verify(knowledgeV2ServiceCallHandler, never()).saveChunk(any());
        }

        /**
         * Test enable document fails when file not found.
         */
        @Test
        @DisplayName("Enable document fails when file not found")
        void testEnableDoc_Failure_FileNotFound() {
            // Given
            // preCheck will call fileInfoV2Service.getById first, which should return null
            when(fileInfoV2Service.getById(anyLong())).thenReturn(null);

            // When & Then
            assertThatThrownBy(() -> knowledgeService.enableDoc(1L, 1))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("responseEnum", ResponseEnum.REPO_FILE_NOT_EXIST);
        }

        /**
         * Test enable document with partial failures.
         */
        @Test
        @DisplayName("Enable document with partial knowledge failures")
        void testEnableDoc_Enable_PartialFailures() {
            // Given
            mockFileInfo.setSource("AIUI-RAG2");
            when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
            when(fileInfoV2Service.getOnly(any(QueryWrapper.class))).thenReturn(mockFileInfo);
            when(repoService.getById(anyLong())).thenReturn(mockRepo);

            List<MysqlKnowledge> mysqlKnowledges = Arrays.asList(mockMysqlKnowledge);
            when(knowledgeMapper.findByFileIdAndEnabled(anyString(), anyInt())).thenReturn(mysqlKnowledges);

            KnowledgeResponse knowledgeResponse = new KnowledgeResponse();
            knowledgeResponse.setCode(0);
            JSONObject data = new JSONObject();
            JSONObject failedChunk = new JSONObject();
            failedChunk.put("chunkId", "knowledge-001");
            data.put("failedChunk", failedChunk);
            knowledgeResponse.setData(data);

            when(knowledgeV2ServiceCallHandler.saveChunk(any())).thenReturn(knowledgeResponse);
            when(knowledgeMapper.updateById(any(MysqlKnowledge.class))).thenReturn(1);
            when(knowledgeMapper.updateEnabledByFileIdAndOldEnabled(anyString(), anyInt(), anyInt())).thenReturn(1);

            // When
            knowledgeService.enableDoc(1L, 1);

            // Then
            verify(knowledgeMapper, times(1)).updateById(any(MysqlKnowledge.class));
            verify(knowledgeMapper, times(1)).updateEnabledByFileIdAndOldEnabled(anyString(), eq(0), eq(1));
        }
    }

    /**
     * Test cases for the deleteKnowledge method. Validates knowledge deletion functionality.
     */
    @Nested
    @DisplayName("deleteKnowledge Tests")
    class DeleteKnowledgeTests {

        /**
         * Test successfully delete enabled knowledge.
         */
        @Test
        @DisplayName("Delete enabled knowledge successfully")
        void testDeleteKnowledge_Enabled_Success() {
            // Given
            mockMysqlKnowledge.setEnabled(1);
            when(knowledgeMapper.selectById(anyString())).thenReturn(mockMysqlKnowledge);
            when(fileInfoV2Service.getOnly(any(QueryWrapper.class))).thenReturn(mockFileInfo);
            when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
            when(repoService.getById(anyLong())).thenReturn(mockRepo);

            KnowledgeResponse knowledgeResponse = new KnowledgeResponse();
            knowledgeResponse.setCode(0);
            when(knowledgeV2ServiceCallHandler.deleteDocOrChunk(any())).thenReturn(knowledgeResponse);
            when(knowledgeMapper.deleteById(anyString())).thenReturn(1);

            // When
            knowledgeService.deleteKnowledge("knowledge-001");

            // Then
            verify(knowledgeV2ServiceCallHandler, times(1)).deleteDocOrChunk(any());
            verify(knowledgeMapper, times(1)).deleteById("knowledge-001");
        }

        /**
         * Test successfully delete disabled knowledge.
         */
        @Test
        @DisplayName("Delete disabled knowledge successfully")
        void testDeleteKnowledge_Disabled_Success() {
            // Given
            mockMysqlKnowledge.setEnabled(0);
            when(knowledgeMapper.selectById(anyString())).thenReturn(mockMysqlKnowledge);
            when(fileInfoV2Service.getOnly(any(QueryWrapper.class))).thenReturn(mockFileInfo);
            when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
            when(repoService.getById(anyLong())).thenReturn(mockRepo);
            when(knowledgeMapper.deleteById(anyString())).thenReturn(1);

            // When
            knowledgeService.deleteKnowledge("knowledge-001");

            // Then
            verify(knowledgeV2ServiceCallHandler, never()).deleteDocOrChunk(any());
            verify(knowledgeMapper, times(1)).deleteById("knowledge-001");
        }

        /**
         * Test delete knowledge fails when knowledge not found.
         */
        @Test
        @DisplayName("Delete knowledge fails when knowledge not found")
        void testDeleteKnowledge_Failure_NotFound() {
            // Given
            when(knowledgeMapper.selectById(anyString())).thenReturn(null);

            // When & Then
            assertThatThrownBy(() -> knowledgeService.deleteKnowledge("knowledge-001"))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("responseEnum", ResponseEnum.REPO_KNOWLEDGE_NOT_EXIST);
        }

        /**
         * Test delete knowledge fails when file not found.
         */
        @Test
        @DisplayName("Delete knowledge fails when file not found")
        void testDeleteKnowledge_Failure_FileNotFound() {
            // Given
            when(knowledgeMapper.selectById(anyString())).thenReturn(mockMysqlKnowledge);
            when(fileInfoV2Service.getOnly(any(QueryWrapper.class))).thenReturn(null);

            // When & Then
            assertThatThrownBy(() -> knowledgeService.deleteKnowledge("knowledge-001"))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("responseEnum", ResponseEnum.REPO_FILE_NOT_EXIST);
        }
    }

    /**
     * Test cases for the storagePreviewKnowledge method. Validates preview knowledge storage
     * functionality.
     */
    @Nested
    @DisplayName("storagePreviewKnowledge Tests")
    class StoragePreviewKnowledgeTests {

        /**
         * Test successfully storage preview knowledge with AIUI source.
         */
        @Test
        @DisplayName("Storage preview knowledge successfully with AIUI source")
        void testStoragePreviewKnowledge_Success_AIUI() {
            // Given
            String fileId = "file-uuid-001";
            Long id = 1L;

            List<ChunkInfo> chunkInfos = new ArrayList<>();
            ChunkInfo chunkInfo = new ChunkInfo();
            chunkInfo.setContent("Test chunk content");
            chunkInfo.setDocId("file-uuid-001");
            chunkInfos.add(chunkInfo);

            when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
            when(previewKnowledgeMapper.countByFileId(anyString())).thenReturn(0L);
            when(previewKnowledgeMapper.insertBatch(anyList())).thenReturn(1);

            // When
            knowledgeService.storagePreviewKnowledge(fileId, id, chunkInfos);

            // Then
            verify(previewKnowledgeMapper, times(1)).countByFileId(fileId);
            verify(previewKnowledgeMapper, times(1)).insertBatch(anyList());
        }

        /**
         * Test successfully storage preview knowledge with CBG source.
         */
        @Test
        @DisplayName("Storage preview knowledge successfully with CBG source")
        void testStoragePreviewKnowledge_Success_CBG() {
            // Given
            String fileId = "file-uuid-001";
            Long id = 1L;
            mockFileInfo.setSource("CBG-RAG");

            List<ChunkInfo> chunkInfos = new ArrayList<>();
            ChunkInfo chunkInfo = new ChunkInfo();
            chunkInfo.setContent("Test chunk content");
            chunkInfo.setDocId("cbg-doc-id-001");
            chunkInfos.add(chunkInfo);

            when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
            when(previewKnowledgeMapper.countByFileId(anyString())).thenReturn(0L);
            when(previewKnowledgeMapper.insertBatch(anyList())).thenReturn(1);

            // When
            knowledgeService.storagePreviewKnowledge(fileId, id, chunkInfos);

            // Then
            verify(previewKnowledgeMapper, times(1)).countByFileId("cbg-doc-id-001");
            verify(previewKnowledgeMapper, times(1)).insertBatch(anyList());
        }

        /**
         * Test storage preview knowledge with existing chunks - should delete old ones.
         */
        @Test
        @DisplayName("Storage preview knowledge with existing chunks deletes old ones")
        void testStoragePreviewKnowledge_WithExistingChunks() {
            // Given
            String fileId = "file-uuid-001";
            Long id = 1L;

            List<ChunkInfo> chunkInfos = new ArrayList<>();
            ChunkInfo chunkInfo = new ChunkInfo();
            chunkInfo.setContent("Test chunk content");
            chunkInfo.setDocId("file-uuid-001");
            chunkInfos.add(chunkInfo);

            when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
            when(previewKnowledgeMapper.countByFileId(anyString())).thenReturn(5L);
            when(previewKnowledgeMapper.deleteByFileId(anyString())).thenReturn(5);
            when(previewKnowledgeMapper.insertBatch(anyList())).thenReturn(1);

            // When
            knowledgeService.storagePreviewKnowledge(fileId, id, chunkInfos);

            // Then
            verify(previewKnowledgeMapper, times(1)).deleteByFileId(fileId);
            verify(previewKnowledgeMapper, times(1)).insertBatch(anyList());
        }

        /**
         * Test storage preview knowledge with empty list returns early.
         */
        @Test
        @DisplayName("Storage preview knowledge with empty list returns early")
        void testStoragePreviewKnowledge_EmptyList() {
            // Given
            String fileId = "file-uuid-001";
            Long id = 1L;
            List<ChunkInfo> chunkInfos = new ArrayList<>();

            // When
            knowledgeService.storagePreviewKnowledge(fileId, id, chunkInfos);

            // Then
            verify(fileInfoV2Service, never()).getById(anyLong());
            verify(previewKnowledgeMapper, never()).insertBatch(anyList());
        }

        /**
         * Test storage preview knowledge fails when file not found.
         */
        @Test
        @DisplayName("Storage preview knowledge fails when file not found")
        void testStoragePreviewKnowledge_Failure_FileNotFound() {
            // Given
            String fileId = "file-uuid-001";
            Long id = 1L;

            List<ChunkInfo> chunkInfos = new ArrayList<>();
            ChunkInfo chunkInfo = new ChunkInfo();
            chunkInfo.setContent("Test chunk content");
            chunkInfos.add(chunkInfo);

            when(fileInfoV2Service.getById(anyLong())).thenReturn(null);

            // When & Then
            assertThatThrownBy(() -> knowledgeService.storagePreviewKnowledge(fileId, id, chunkInfos))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("responseEnum", ResponseEnum.REPO_FILE_NOT_EXIST);
        }

        /**
         * Test storage preview knowledge with references and images.
         */
        @Test
        @DisplayName("Storage preview knowledge with references and images")
        void testStoragePreviewKnowledge_WithReferences() {
            // Given
            String fileId = "file-uuid-001";
            Long id = 1L;

            List<ChunkInfo> chunkInfos = new ArrayList<>();
            ChunkInfo chunkInfo = new ChunkInfo();
            chunkInfo.setContent("Test chunk content");
            chunkInfo.setDocId("file-uuid-001");

            JSONObject references = new JSONObject();
            JSONObject imageRef = new JSONObject();
            imageRef.put("format", "image");
            imageRef.put("content", "data:image/jpeg;base64,/9j/4AAQSkZJRg==");
            references.put("ref-001", imageRef);
            chunkInfo.setReferences(references);

            chunkInfos.add(chunkInfo);

            when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
            when(previewKnowledgeMapper.countByFileId(anyString())).thenReturn(0L);
            when(previewKnowledgeMapper.insertBatch(anyList())).thenReturn(1);
            when(s3Util.getS3Url(anyString())).thenReturn("https://s3.url/image.jpg");
            doNothing().when(s3Util).putObjectBase64(anyString(), anyString(), anyString());

            // When
            knowledgeService.storagePreviewKnowledge(fileId, id, chunkInfos);

            // Then
            verify(s3Util, times(1)).putObjectBase64(anyString(), anyString(), eq("image/jpeg"));
            verify(previewKnowledgeMapper, times(1)).insertBatch(anyList());
        }
    }

    /**
     * Test cases for the embeddingKnowledgeAndStorage method. Validates knowledge embedding
     * functionality.
     */
    @Nested
    @DisplayName("embeddingKnowledgeAndStorage Tests")
    class EmbeddingKnowledgeAndStorageTests {

        /**
         * Test successfully embed knowledge with AIUI source.
         */
        @Test
        @DisplayName("Embed knowledge successfully with AIUI source")
        void testEmbeddingKnowledgeAndStorage_Success_AIUI() {
            // Given
            Long fileId = 1L;
            when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
            when(repoService.getById(anyLong())).thenReturn(mockRepo);

            List<MysqlPreviewKnowledge> previewList = new ArrayList<>();
            MysqlPreviewKnowledge preview = new MysqlPreviewKnowledge();
            preview.setFileId("file-uuid-001");
            JSONObject content = new JSONObject();
            content.put("content", "Preview content");
            content.put("dataIndex", "0");
            preview.setContent(content);
            preview.setCharCount(100L);
            previewList.add(preview);

            when(previewKnowledgeMapper.findByFileId(anyString())).thenReturn(previewList);
            when(knowledgeMapper.findByFileIdAndSource(anyString(), eq(0))).thenReturn(new ArrayList<>());

            KnowledgeResponse knowledgeResponse = new KnowledgeResponse();
            knowledgeResponse.setCode(0);
            JSONObject data = new JSONObject();
            knowledgeResponse.setData(data);

            when(knowledgeV2ServiceCallHandler.saveChunk(any())).thenReturn(knowledgeResponse);
            when(knowledgeMapper.insert(any(MysqlKnowledge.class))).thenReturn(1);

            // When
            Integer result = knowledgeService.embeddingKnowledgeAndStorage(fileId);

            // Then
            assertThat(result).isEqualTo(0);
            verify(knowledgeMapper, atLeastOnce()).insert(any(MysqlKnowledge.class));
        }

        /**
         * Test embed knowledge with CBG source.
         */
        @Test
        @DisplayName("Embed knowledge with CBG source")
        void testEmbeddingKnowledgeAndStorage_CBG() {
            // Given
            Long fileId = 1L;
            mockRepo.setTag("CBG-RAG");
            mockFileInfo.setSource("CBG-RAG");

            when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
            when(repoService.getById(anyLong())).thenReturn(mockRepo);

            List<MysqlPreviewKnowledge> previewList = new ArrayList<>();
            MysqlPreviewKnowledge preview = new MysqlPreviewKnowledge();
            preview.setFileId("file-uuid-001");
            JSONObject content = new JSONObject();
            content.put("content", "Preview content");
            content.put("dataIndex", "0");
            preview.setContent(content);
            preview.setCharCount(100L);
            previewList.add(preview);

            when(previewKnowledgeMapper.findByFileId(anyString())).thenReturn(previewList);
            when(knowledgeMapper.findByFileIdAndSource(anyString(), eq(0))).thenReturn(new ArrayList<>());

            KnowledgeResponse knowledgeResponse = new KnowledgeResponse();
            knowledgeResponse.setCode(0);
            JSONArray dataArray = new JSONArray();
            JSONObject cbgData = new JSONObject();
            cbgData.put("id", "cbg-knowledge-001");
            cbgData.put("dataIndex", "0");
            dataArray.add(cbgData);
            knowledgeResponse.setData(dataArray);

            when(knowledgeV2ServiceCallHandler.saveChunk(any())).thenReturn(knowledgeResponse);
            when(knowledgeMapper.insert(any(MysqlKnowledge.class))).thenReturn(1);
            when(knowledgeMapper.findByFileIdAndSource(anyString(), eq(1))).thenReturn(new ArrayList<>());

            // When
            Integer result = knowledgeService.embeddingKnowledgeAndStorage(fileId);

            // Then
            assertThat(result).isEqualTo(0);
            verify(knowledgeMapper, atLeastOnce()).insert(any(MysqlKnowledge.class));
        }

        /**
         * Test embed knowledge fails when preview knowledge not found.
         */
        @Test
        @DisplayName("Embed knowledge fails when preview knowledge not found")
        void testEmbeddingKnowledgeAndStorage_Failure_NoPreview() {
            // Given
            Long fileId = 1L;
            when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
            when(repoService.getById(anyLong())).thenReturn(mockRepo);
            when(previewKnowledgeMapper.findByFileId(anyString())).thenReturn(new ArrayList<>());

            // When & Then
            assertThatThrownBy(() -> knowledgeService.embeddingKnowledgeAndStorage(fileId))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("responseEnum", ResponseEnum.REPO_KNOWLEDGE_GET_FAILED);
        }

        /**
         * Test embed knowledge with all failures throws exception.
         */
        @Test
        @DisplayName("Embed knowledge with all failures throws exception")
        void testEmbeddingKnowledgeAndStorage_AllFailed() {
            // Given
            Long fileId = 1L;
            when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
            when(repoService.getById(anyLong())).thenReturn(mockRepo);

            List<MysqlPreviewKnowledge> previewList = new ArrayList<>();
            MysqlPreviewKnowledge preview = new MysqlPreviewKnowledge();
            preview.setFileId("file-uuid-001");
            JSONObject content = new JSONObject();
            content.put("content", "Preview content");
            content.put("dataIndex", "0");
            preview.setContent(content);
            preview.setCharCount(100L);
            previewList.add(preview);

            when(previewKnowledgeMapper.findByFileId(anyString())).thenReturn(previewList);
            when(knowledgeMapper.findByFileIdAndSource(anyString(), eq(0))).thenReturn(new ArrayList<>());

            KnowledgeResponse knowledgeResponse = new KnowledgeResponse();
            knowledgeResponse.setCode(0);
            JSONObject data = new JSONObject();
            JSONObject failedChunk = new JSONObject();
            failedChunk.put("chunkId", "knowledge-001");
            data.put("failedChunk", failedChunk);
            knowledgeResponse.setData(data);

            when(knowledgeV2ServiceCallHandler.saveChunk(any())).thenReturn(knowledgeResponse);

            // When & Then
            assertThatThrownBy(() -> knowledgeService.embeddingKnowledgeAndStorage(fileId))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("responseEnum", ResponseEnum.REPO_KNOWLEDGE_ALL_EMBEDDING_FAILED);
        }
    }

    /**
     * Test cases for the deleteDoc method. Validates document deletion functionality.
     */
    @Nested
    @DisplayName("deleteDoc Tests")
    class DeleteDocTests {

        /**
         * Test successfully delete documents with AIUI source.
         */
        @Test
        @DisplayName("Delete documents successfully with AIUI source")
        void testDeleteDoc_Success_AIUI() {
            // Given
            List<Long> ids = Arrays.asList(1L, 2L);

            FileInfoV2 file1 = new FileInfoV2();
            file1.setId(1L);
            file1.setUuid("file-uuid-001");
            file1.setSource("AIUI-RAG2");

            FileInfoV2 file2 = new FileInfoV2();
            file2.setId(2L);
            file2.setUuid("file-uuid-002");
            file2.setSource("AIUI-RAG2");

            List<FileInfoV2> fileList = Arrays.asList(file1, file2);

            when(fileInfoV2Mapper.listByIds(anyList())).thenReturn(fileList);
            doNothing().when(dataPermissionCheckTool).checkFileBelong(any(FileInfoV2.class));

            List<MysqlKnowledge> knowledgeList = Arrays.asList(mockMysqlKnowledge);
            when(knowledgeMapper.findByFileIdIn(anyList())).thenReturn(knowledgeList);
            when(knowledgeMapper.deleteBatchIds(anyList())).thenReturn(1);

            // Mock fileInfoV2Service.getOnly for deleteKnowledgeDoc internal call
            when(fileInfoV2Service.getOnly(any(QueryWrapper.class)))
                    .thenReturn(file1)
                    .thenReturn(file2);

            KnowledgeResponse knowledgeResponse = new KnowledgeResponse();
            knowledgeResponse.setCode(0);
            when(knowledgeV2ServiceCallHandler.deleteDocOrChunk(any())).thenReturn(knowledgeResponse);

            // When
            knowledgeService.deleteDoc(ids);

            // Then
            verify(knowledgeMapper, times(1)).deleteBatchIds(anyList());
            verify(knowledgeV2ServiceCallHandler, times(2)).deleteDocOrChunk(any());
        }

        /**
         * Test successfully delete documents with CBG source.
         */
        @Test
        @DisplayName("Delete documents successfully with CBG source")
        void testDeleteDoc_Success_CBG() {
            // Given
            List<Long> ids = Arrays.asList(1L);

            FileInfoV2 file1 = new FileInfoV2();
            file1.setId(1L);
            file1.setUuid("file-uuid-001");
            file1.setSource("CBG-RAG");

            List<FileInfoV2> fileList = Arrays.asList(file1);

            when(fileInfoV2Mapper.listByIds(anyList())).thenReturn(fileList);
            doNothing().when(dataPermissionCheckTool).checkFileBelong(any(FileInfoV2.class));

            List<MysqlKnowledge> knowledgeList = Arrays.asList(mockMysqlKnowledge);
            when(knowledgeMapper.findByFileIdIn(anyList())).thenReturn(knowledgeList);
            when(knowledgeMapper.deleteBatchIds(anyList())).thenReturn(1);

            // Mock fileInfoV2Service.getOnly for deleteKnowledgeDoc internal call
            when(fileInfoV2Service.getOnly(any(QueryWrapper.class))).thenReturn(file1);

            KnowledgeResponse knowledgeResponse = new KnowledgeResponse();
            knowledgeResponse.setCode(0);
            when(knowledgeV2ServiceCallHandler.deleteDocOrChunk(any())).thenReturn(knowledgeResponse);

            // When
            knowledgeService.deleteDoc(ids);

            // Then
            verify(knowledgeMapper, times(1)).deleteBatchIds(anyList());
            verify(knowledgeV2ServiceCallHandler, times(1)).deleteDocOrChunk(any());
        }

        /**
         * Test delete documents with empty list returns early.
         */
        @Test
        @DisplayName("Delete documents with empty list returns early")
        void testDeleteDoc_EmptyList() {
            // Given
            List<Long> ids = new ArrayList<>();

            // When
            knowledgeService.deleteDoc(ids);

            // Then
            verify(fileInfoV2Mapper, never()).listByIds(anyList());
        }

        /**
         * Test delete documents with no knowledge.
         */
        @Test
        @DisplayName("Delete documents with no knowledge")
        void testDeleteDoc_NoKnowledge() {
            // Given
            List<Long> ids = Arrays.asList(1L);

            FileInfoV2 file1 = new FileInfoV2();
            file1.setId(1L);
            file1.setUuid("file-uuid-001");
            file1.setSource("AIUI-RAG2");

            List<FileInfoV2> fileList = Arrays.asList(file1);

            when(fileInfoV2Mapper.listByIds(anyList())).thenReturn(fileList);
            doNothing().when(dataPermissionCheckTool).checkFileBelong(any(FileInfoV2.class));
            when(knowledgeMapper.findByFileIdIn(anyList())).thenReturn(new ArrayList<>());

            // Mock fileInfoV2Service.getOnly for deleteKnowledgeDoc internal call
            when(fileInfoV2Service.getOnly(any(QueryWrapper.class))).thenReturn(file1);

            KnowledgeResponse knowledgeResponse = new KnowledgeResponse();
            knowledgeResponse.setCode(0);
            when(knowledgeV2ServiceCallHandler.deleteDocOrChunk(any())).thenReturn(knowledgeResponse);

            // When
            knowledgeService.deleteDoc(ids);

            // Then
            verify(knowledgeMapper, never()).deleteBatchIds(anyList());
            verify(knowledgeV2ServiceCallHandler, times(1)).deleteDocOrChunk(any());
        }
    }

    /**
     * Test cases for the updateTaskAndFileStatus method. Validates task and file status update
     * functionality.
     */
    @Nested
    @DisplayName("updateTaskAndFileStatus Tests")
    class UpdateTaskAndFileStatusTests {

        /**
         * Test successfully update status on success.
         */
        @Test
        @DisplayName("Update status on success")
        void testUpdateTaskAndFileStatus_Success() {
            // Given
            when(fileInfoV2Service.updateById(any(FileInfoV2.class))).thenReturn(true);
            when(extractKnowledgeTaskService.updateById(any(ExtractKnowledgeTask.class))).thenReturn(true);

            // When
            knowledgeService.updateTaskAndFileStatus(mockFileInfo, mockExtractTask, null, true);

            // Then
            assertThat(mockFileInfo.getStatus()).isEqualTo(ProjectContent.FILE_PARSE_SUCCESSED);
            assertThat(mockFileInfo.getReason()).isNull();
            assertThat(mockExtractTask.getStatus()).isEqualTo(1);
            assertThat(mockExtractTask.getTaskStatus()).isEqualTo(1);
            verify(fileInfoV2Service, times(1)).updateById(mockFileInfo);
            verify(extractKnowledgeTaskService, times(1)).updateById(mockExtractTask);
        }

        /**
         * Test successfully update status on failure.
         */
        @Test
        @DisplayName("Update status on failure")
        void testUpdateTaskAndFileStatus_Failure() {
            // Given
            String errMsg = "Parsing failed";
            when(fileInfoV2Service.updateById(any(FileInfoV2.class))).thenReturn(true);
            when(extractKnowledgeTaskService.updateById(any(ExtractKnowledgeTask.class))).thenReturn(true);

            // When
            knowledgeService.updateTaskAndFileStatus(mockFileInfo, mockExtractTask, errMsg, false);

            // Then
            assertThat(mockFileInfo.getStatus()).isEqualTo(ProjectContent.FILE_PARSE_FAILED);
            assertThat(mockFileInfo.getReason()).isEqualTo(errMsg);
            assertThat(mockExtractTask.getStatus()).isEqualTo(2);
            assertThat(mockExtractTask.getReason()).isEqualTo(errMsg);
            assertThat(mockExtractTask.getTaskStatus()).isEqualTo(1);
            verify(fileInfoV2Service, times(1)).updateById(mockFileInfo);
            verify(extractKnowledgeTaskService, times(1)).updateById(mockExtractTask);
        }
    }

    /**
     * Test cases for helper methods. Validates utility and helper method functionality.
     */
    @Nested
    @DisplayName("Helper Methods Tests")
    class HelperMethodsTests {

        /**
         * Test addKnowledge4AIUI with failures.
         */
        @Test
        @DisplayName("addKnowledge4AIUI with failures")
        void testAddKnowledge4AIUI_WithFailures() {
            // Given
            String docId = "doc-001";
            String group = "group-001";
            JSONArray addChunkArray = new JSONArray();
            JSONObject chunk = new JSONObject();
            chunk.put("chunkId", "chunk-001");
            addChunkArray.add(chunk);
            String source = "AIUI-RAG2";

            KnowledgeResponse response = new KnowledgeResponse();
            response.setCode(0);
            JSONObject data = new JSONObject();
            JSONObject failedChunk = new JSONObject();
            failedChunk.put("chunkId", "chunk-001");
            data.put("failedChunk", failedChunk);
            response.setData(data);

            when(knowledgeV2ServiceCallHandler.saveChunk(any())).thenReturn(response);

            // When
            List<String> result = knowledgeService.addKnowledge4AIUI(docId, group, addChunkArray, source);

            // Then
            assertThat(result).hasSize(1);
            assertThat(result).contains("chunk-001");
        }

        /**
         * Test addKnowledge4CBG returns mapping.
         */
        @Test
        @DisplayName("addKnowledge4CBG returns mapping")
        void testAddKnowledge4CBG_ReturnsMapping() {
            // Given
            String docId = "doc-001";
            String group = "group-001";
            JSONArray addChunkArray = new JSONArray();
            JSONObject chunk = new JSONObject();
            chunk.put("chunkId", "chunk-001");
            chunk.put("dataIndex", "0");
            addChunkArray.add(chunk);
            String source = "CBG-RAG";

            KnowledgeResponse response = new KnowledgeResponse();
            response.setCode(0);
            JSONArray dataArray = new JSONArray();
            JSONObject cbgData = new JSONObject();
            cbgData.put("id", "cbg-id-001");
            cbgData.put("dataIndex", "0");
            dataArray.add(cbgData);
            response.setData(dataArray);

            when(knowledgeV2ServiceCallHandler.saveChunk(any())).thenReturn(response);

            // When
            Map<String, String> result = knowledgeService.addKnowledge4CBG(docId, group, addChunkArray, source);

            // Then
            assertThat(result).hasSize(1);
            assertThat(result).containsEntry("0", "cbg-id-001");
        }

        /**
         * Test updateKnowledge with failures.
         */
        @Test
        @DisplayName("updateKnowledge helper with failures")
        void testUpdateKnowledge_Helper_WithFailures() {
            // Given
            String docId = "doc-001";
            String group = "group-001";
            JSONArray updateChunkArray = new JSONArray();
            JSONObject chunk = new JSONObject();
            chunk.put("chunkId", "chunk-001");
            updateChunkArray.add(chunk);

            when(fileInfoV2Service.getOnly(any(QueryWrapper.class))).thenReturn(mockFileInfo);

            KnowledgeResponse response = new KnowledgeResponse();
            response.setCode(0);
            JSONObject data = new JSONObject();
            JSONObject failedChunk = new JSONObject();
            failedChunk.put("chunkId", "chunk-001");
            data.put("failedChunk", failedChunk);
            response.setData(data);

            when(knowledgeV2ServiceCallHandler.updateChunk(any())).thenReturn(response);

            // When
            List<String> result = knowledgeService.updateKnowledge(docId, group, updateChunkArray);

            // Then
            assertThat(result).hasSize(1);
            assertThat(result).contains("chunk-001");
        }

        /**
         * Test deleteKnowledgeChunks successfully.
         */
        @Test
        @DisplayName("deleteKnowledgeChunks successfully")
        void testDeleteKnowledgeChunks_Success() {
            // Given
            String docId = "doc-001";
            JSONArray deleteChunkIds = new JSONArray();
            deleteChunkIds.add("chunk-001");

            when(fileInfoV2Service.getOnly(any(QueryWrapper.class))).thenReturn(mockFileInfo);

            KnowledgeResponse response = new KnowledgeResponse();
            response.setCode(0);
            when(knowledgeV2ServiceCallHandler.deleteDocOrChunk(any())).thenReturn(response);

            // When
            knowledgeService.deleteKnowledgeChunks(docId, deleteChunkIds);

            // Then
            verify(knowledgeV2ServiceCallHandler, times(1)).deleteDocOrChunk(any());
        }

        /**
         * Test deleteKnowledgeDoc successfully with AIUI.
         */
        @Test
        @DisplayName("deleteKnowledgeDoc successfully with AIUI")
        void testDeleteKnowledgeDoc_Success_AIUI() {
            // Given
            JSONArray deleteDocIds = new JSONArray();
            deleteDocIds.add("doc-001");

            mockFileInfo.setSource("AIUI-RAG2");
            when(fileInfoV2Service.getOnly(any(QueryWrapper.class))).thenReturn(mockFileInfo);

            KnowledgeResponse response = new KnowledgeResponse();
            response.setCode(0);
            when(knowledgeV2ServiceCallHandler.deleteDocOrChunk(any())).thenReturn(response);

            // When
            knowledgeService.deleteKnowledgeDoc(deleteDocIds, null);

            // Then
            verify(knowledgeV2ServiceCallHandler, times(1)).deleteDocOrChunk(any());
        }

        /**
         * Test deleteKnowledgeDoc with CBG source and chunk IDs.
         */
        @Test
        @DisplayName("deleteKnowledgeDoc with CBG source and chunk IDs")
        void testDeleteKnowledgeDoc_CBG_WithChunkIds() {
            // Given
            JSONArray deleteDocIds = new JSONArray();
            deleteDocIds.add("doc-001");

            Map<String, List<String>> chunkIdsMap = new HashMap<>();
            chunkIdsMap.put("doc-001", Arrays.asList("chunk-001", "chunk-002"));

            mockFileInfo.setSource("CBG-RAG");
            when(fileInfoV2Service.getOnly(any(QueryWrapper.class))).thenReturn(mockFileInfo);

            KnowledgeResponse response = new KnowledgeResponse();
            response.setCode(0);
            when(knowledgeV2ServiceCallHandler.deleteDocOrChunk(any())).thenReturn(response);

            // When
            knowledgeService.deleteKnowledgeDoc(deleteDocIds, chunkIdsMap);

            // Then
            verify(knowledgeV2ServiceCallHandler, times(1)).deleteDocOrChunk(any());
        }

        /**
         * Test deleteKnowledgeDoc with CBG source without chunk IDs skips deletion.
         */
        @Test
        @DisplayName("deleteKnowledgeDoc with CBG source without chunk IDs skips deletion")
        void testDeleteKnowledgeDoc_CBG_NoChunkIds() {
            // Given
            JSONArray deleteDocIds = new JSONArray();
            deleteDocIds.add("doc-001");

            mockFileInfo.setSource("CBG-RAG");
            when(fileInfoV2Service.getOnly(any(QueryWrapper.class))).thenReturn(mockFileInfo);

            // When
            knowledgeService.deleteKnowledgeDoc(deleteDocIds, null);

            // Then
            verify(knowledgeV2ServiceCallHandler, never()).deleteDocOrChunk(any());
        }
    }

    /**
     * Test cases for async and task-related methods. Validates asynchronous operations and task
     * handling.
     */
    @Nested
    @DisplayName("Async and Task Methods Tests")
    class AsyncAndTaskMethodsTests {

        /**
         * Test downloadKnowLedgeData with failure.
         */
        @Test
        @DisplayName("downloadKnowLedgeData with failure")
        void testDownloadKnowLedgeData_Failure() {
            // Given
            String url = "http://example.com/knowledge.json";
            String errMsg = "Download failed";
            mockExtractTask.setStatus(0);

            when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
            when(extractKnowledgeTaskService.updateById(any(ExtractKnowledgeTask.class))).thenReturn(true);
            when(fileInfoV2Service.updateById(any(FileInfoV2.class))).thenReturn(true);

            // When
            knowledgeService.downloadKnowLedgeData(url, mockExtractTask, false, errMsg);

            // Then
            assertThat(mockExtractTask.getStatus()).isEqualTo(2);
            assertThat(mockExtractTask.getReason()).isEqualTo(errMsg);
            verify(extractKnowledgeTaskService, times(1)).updateById(mockExtractTask);
            verify(fileInfoV2Service, times(1)).updateById(mockFileInfo);
        }

        /**
         * Test downloadKnowLedgeData when file not found.
         */
        @Test
        @DisplayName("downloadKnowLedgeData when file not found")
        void testDownloadKnowLedgeData_FileNotFound() {
            // Given
            String url = "http://example.com/knowledge.json";
            mockExtractTask.setStatus(0);

            when(fileInfoV2Service.getById(anyLong())).thenReturn(null);
            when(extractKnowledgeTaskService.updateById(any(ExtractKnowledgeTask.class))).thenReturn(true);

            // When
            knowledgeService.downloadKnowLedgeData(url, mockExtractTask, true, null);

            // Then
            assertThat(mockExtractTask.getStatus()).isEqualTo(2);
            assertThat(mockExtractTask.getReason()).isEqualTo("No corresponding file found");
            verify(extractKnowledgeTaskService, times(1)).updateById(mockExtractTask);
        }
    }

    /**
     * Test cases for the dealTaskForKnowledgeExtract method. Validates callback handling for knowledge
     * extraction tasks.
     */
    @Nested
    @DisplayName("dealTaskForKnowledgeExtract Tests")
    class DealTaskForKnowledgeExtractTests {

        /**
         * Test successful callback handling.
         */
        @Test
        @DisplayName("Deal task callback successfully")
        void testDealTaskForKnowledgeExtract_Success() {
            // Given
            JSONObject retResult = new JSONObject();
            retResult.put("taskId", "task-001");
            retResult.put("success", true);
            retResult.put("knowledgeUrl", "http://example.com/knowledge.json");

            mockExtractTask.setStatus(0);
            when(extractKnowledgeTaskService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(mockExtractTask);
            when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
            when(repoService.getById(anyLong())).thenReturn(mockRepo);
            when(extractKnowledgeTaskService.updateById(any(ExtractKnowledgeTask.class))).thenReturn(true);
            when(fileInfoV2Service.updateById(any(FileInfoV2.class))).thenReturn(true);

            // When
            knowledgeService.dealTaskForKnowledgeExtract(retResult);

            // Then
            verify(extractKnowledgeTaskService, times(1)).getOnly(any(LambdaQueryWrapper.class));
        }

        /**
         * Test callback handling when task not found.
         */
        @Test
        @DisplayName("Deal task callback when task not found")
        void testDealTaskForKnowledgeExtract_TaskNotFound() {
            // Given
            JSONObject retResult = new JSONObject();
            retResult.put("taskId", "task-not-exist");
            retResult.put("success", true);

            when(extractKnowledgeTaskService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(null);

            // When & Then
            assertThatThrownBy(() -> knowledgeService.dealTaskForKnowledgeExtract(retResult))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("responseEnum", ResponseEnum.REPO_KNOWLEDGE_NO_TASK);
        }

        /**
         * Test callback handling when task already processed.
         */
        @Test
        @DisplayName("Deal task callback when task already processed")
        void testDealTaskForKnowledgeExtract_TaskAlreadyProcessed() {
            // Given
            JSONObject retResult = new JSONObject();
            retResult.put("taskId", "task-001");
            retResult.put("success", true);

            mockExtractTask.setStatus(1); // Already processed
            when(extractKnowledgeTaskService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(mockExtractTask);

            // When & Then
            assertThatThrownBy(() -> knowledgeService.dealTaskForKnowledgeExtract(retResult))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("responseEnum", ResponseEnum.REPO_KNOWLEDGE_NO_TASK);
        }

        /**
         * Test callback handling with failure result.
         */
        @Test
        @DisplayName("Deal task callback with failure")
        void testDealTaskForKnowledgeExtract_Failure() {
            // Given
            JSONObject retResult = new JSONObject();
            retResult.put("taskId", "task-001");
            retResult.put("success", false);
            retResult.put("err", "Extraction failed");
            retResult.put("knowledgeUrl", "http://example.com/knowledge.json");

            mockExtractTask.setStatus(0);
            when(extractKnowledgeTaskService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(mockExtractTask);
            when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
            when(extractKnowledgeTaskService.updateById(any(ExtractKnowledgeTask.class))).thenReturn(true);
            when(fileInfoV2Service.updateById(any(FileInfoV2.class))).thenReturn(true);

            // When
            knowledgeService.dealTaskForKnowledgeExtract(retResult);

            // Then
            verify(extractKnowledgeTaskService, times(1)).getOnly(any(LambdaQueryWrapper.class));
        }
    }

    /**
     * Test cases for the knowledgeExtractAsync method. Validates asynchronous knowledge extraction
     * functionality.
     */
    @Nested
    @DisplayName("knowledgeExtractAsync Tests")
    class KnowledgeExtractAsyncTests {

        private SliceConfig mockSliceConfig;

        @BeforeEach
        void setUp() {
            mockSliceConfig = new SliceConfig();
            mockSliceConfig.setLengthRange(Arrays.asList(300, 800));
            mockSliceConfig.setSeperator(Arrays.asList("\n"));

            // Mirror production wiring so Ragflow-RAG routes through
            // doCbgUploadSplit instead of the literal-only fallback.
            BizConfig bizConfig = new BizConfig();
            bizConfig.setCbgRagCompatibleSources(Arrays.asList("CBG-RAG", "Ragflow-RAG"));
            new ProjectContent().setBizConfig(bizConfig);
        }

        @AfterEach
        void tearDown() {
            new ProjectContent().setBizConfig(null);
        }

        /**
         * Test successful knowledge extraction with AIUI source.
         */
        @Test
        @DisplayName("Extract knowledge successfully with AIUI source")
        void testKnowledgeExtractAsync_Success_AIUI() {
            // Given
            String contentType = "text/plain";
            String url = "http://example.com/document.txt";
            mockFileInfo.setSource("AIUI-RAG2");

            KnowledgeResponse response = new KnowledgeResponse();
            response.setCode(0);
            JSONArray dataArray = new JSONArray();

            ChunkInfo chunk = new ChunkInfo();
            chunk.setContent("Test chunk content");
            chunk.setDocId("file-uuid-001");
            dataArray.add(JSON.parseObject(JSON.toJSONString(chunk)));
            response.setData(dataArray);

            when(knowledgeV2ServiceCallHandler.documentSplit(any(), any())).thenReturn(response);
            when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
            when(previewKnowledgeMapper.countByFileId(anyString())).thenReturn(0L);
            when(previewKnowledgeMapper.insertBatch(anyList())).thenReturn(1);
            when(fileInfoV2Service.updateById(any(FileInfoV2.class))).thenReturn(true);
            when(extractKnowledgeTaskService.updateById(any(ExtractKnowledgeTask.class))).thenReturn(true);

            // When
            knowledgeService.knowledgeExtractAsync(contentType, url, mockSliceConfig, mockFileInfo, mockExtractTask);

            // Then
            verify(knowledgeV2ServiceCallHandler, times(1)).documentSplit(any(), any());
            verify(previewKnowledgeMapper, times(1)).insertBatch(anyList());
            verify(fileInfoV2Service, times(1)).updateById(any(FileInfoV2.class));
        }

        /**
         * Test knowledge extraction with CBG source - upload flow.
         */
        @Test
        @DisplayName("Extract knowledge with CBG source")
        void testKnowledgeExtractAsync_CBG() {
            // Given
            String contentType = "text/plain";
            String url = "http://example.com/document.txt";
            mockFileInfo.setSource("CBG-RAG");
            mockFileInfo.setType("text/plain");
            // Regression guard: CBG-RAG must not forward oldDocId even if lastUuid exists.
            mockFileInfo.setLastUuid("cbg-previous-doc-id");

            KnowledgeResponse response = new KnowledgeResponse();
            response.setCode(0);
            JSONArray dataArray = new JSONArray();

            ChunkInfo chunk = new ChunkInfo();
            chunk.setContent("Test chunk content");
            chunk.setDocId("cbg-doc-001");
            dataArray.add(JSON.parseObject(JSON.toJSONString(chunk)));
            response.setData(dataArray);

            when(s3Util.getObject(anyString())).thenReturn(new java.io.ByteArrayInputStream("test".getBytes()));
            when(knowledgeV2ServiceCallHandler.documentUpload(any(), any(), any(), any(), any(), any(), any())).thenReturn(response);
            when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
            when(previewKnowledgeMapper.countByFileId(anyString())).thenReturn(0L);
            when(previewKnowledgeMapper.insertBatch(anyList())).thenReturn(1);
            when(fileInfoV2Service.updateById(any(FileInfoV2.class))).thenReturn(true);
            when(extractKnowledgeTaskService.updateById(any(ExtractKnowledgeTask.class))).thenReturn(true);

            // When
            knowledgeService.knowledgeExtractAsync(contentType, url, mockSliceConfig, mockFileInfo, mockExtractTask);

            // Then
            verify(s3Util, times(1)).getObject(anyString());
            // CBG-RAG multipart form must not carry documentId; datasetId is
            // null because CBG-RAG keeps the legacy single-dataset behavior.
            verify(knowledgeV2ServiceCallHandler, times(1)).documentUpload(
                    any(), any(), any(), any(), any(), isNull(), isNull());
        }

        /** Ragflow-RAG first slice: lastUuid=null forwards as oldDocId=null. */
        @Test
        @DisplayName("Extract knowledge with Ragflow-RAG source, first slice (lastUuid=null)")
        void testKnowledgeExtractAsync_RagflowRAG_FirstSlice() {
            // Given
            String contentType = "text/plain";
            String url = "http://example.com/document.txt";
            mockFileInfo.setSource("Ragflow-RAG");
            mockFileInfo.setType("text/plain");
            mockFileInfo.setLastUuid(null);

            KnowledgeResponse response = new KnowledgeResponse();
            response.setCode(0);
            JSONArray dataArray = new JSONArray();
            ChunkInfo chunk = new ChunkInfo();
            chunk.setContent("First slice chunk");
            chunk.setDocId("ragflow-doc-001");
            dataArray.add(JSON.parseObject(JSON.toJSONString(chunk)));
            response.setData(dataArray);

            when(s3Util.getObject(anyString())).thenReturn(new java.io.ByteArrayInputStream("test".getBytes()));
            when(knowledgeV2ServiceCallHandler.documentUpload(any(), any(), any(), any(), any(), any(), any())).thenReturn(response);
            when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
            when(previewKnowledgeMapper.countByFileId(anyString())).thenReturn(0L);
            when(previewKnowledgeMapper.insertBatch(anyList())).thenReturn(1);
            when(fileInfoV2Service.updateById(any(FileInfoV2.class))).thenReturn(true);
            when(extractKnowledgeTaskService.updateById(any(ExtractKnowledgeTask.class))).thenReturn(true);
            when(repoService.getById(mockFileInfo.getRepoId())).thenReturn(mockRepo);

            // When
            knowledgeService.knowledgeExtractAsync(contentType, url, mockSliceConfig, mockFileInfo, mockExtractTask);

            verify(knowledgeV2ServiceCallHandler, times(1)).documentUpload(
                    any(), any(), any(), any(), any(), isNull(), eq("ds-real-id-001"));
        }

        /** Ragflow-RAG re-slice: existing lastUuid forwards as oldDocId. */
        @Test
        @DisplayName("Extract knowledge with Ragflow-RAG source, re-slice forwards lastUuid")
        void testKnowledgeExtractAsync_RagflowRAG_ReSlice() {
            // Given
            String contentType = "text/plain";
            String url = "http://example.com/document.txt";
            mockFileInfo.setSource("Ragflow-RAG");
            mockFileInfo.setType("text/plain");
            mockFileInfo.setLastUuid("doc-old-ragflow");

            KnowledgeResponse response = new KnowledgeResponse();
            response.setCode(0);
            JSONArray dataArray = new JSONArray();
            ChunkInfo chunk = new ChunkInfo();
            chunk.setContent("Re-slice chunk");
            chunk.setDocId("doc-new-ragflow");
            dataArray.add(JSON.parseObject(JSON.toJSONString(chunk)));
            response.setData(dataArray);

            when(s3Util.getObject(anyString())).thenReturn(new java.io.ByteArrayInputStream("test".getBytes()));
            when(knowledgeV2ServiceCallHandler.documentUpload(any(), any(), any(), any(), any(), any(), any())).thenReturn(response);
            when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
            when(previewKnowledgeMapper.countByFileId(anyString())).thenReturn(0L);
            when(previewKnowledgeMapper.insertBatch(anyList())).thenReturn(1);
            when(fileInfoV2Service.updateById(any(FileInfoV2.class))).thenReturn(true);
            when(extractKnowledgeTaskService.updateById(any(ExtractKnowledgeTask.class))).thenReturn(true);
            when(repoService.getById(mockFileInfo.getRepoId())).thenReturn(mockRepo);

            // When
            knowledgeService.knowledgeExtractAsync(contentType, url, mockSliceConfig, mockFileInfo, mockExtractTask);

            verify(knowledgeV2ServiceCallHandler, times(1)).documentUpload(
                    any(), any(), any(), any(), any(), eq("doc-old-ragflow"), eq("ds-real-id-001"));
        }

        /**
         * Test extraction failure with non-zero response code.
         */
        @Test
        @DisplayName("Extract knowledge fails with non-zero response code")
        void testKnowledgeExtractAsync_NonZeroResponseCode() {
            // Given
            String contentType = "text/plain";
            String url = "http://example.com/document.txt";
            mockFileInfo.setSource("AIUI-RAG2");

            KnowledgeResponse response = new KnowledgeResponse();
            response.setCode(1);
            response.setMessage("Extraction failed");

            when(knowledgeV2ServiceCallHandler.documentSplit(any(), any())).thenReturn(response);
            when(fileInfoV2Service.updateById(any(FileInfoV2.class))).thenReturn(true);
            when(extractKnowledgeTaskService.updateById(any(ExtractKnowledgeTask.class))).thenReturn(true);

            // When
            knowledgeService.knowledgeExtractAsync(contentType, url, mockSliceConfig, mockFileInfo, mockExtractTask);

            // Then
            verify(fileInfoV2Service, times(1)).updateById(any(FileInfoV2.class));
            assertThat(mockExtractTask.getStatus()).isEqualTo(2);
        }

        /**
         * Test extraction with special error code 11111.
         */
        @Test
        @DisplayName("Extract knowledge with error code 11111")
        void testKnowledgeExtractAsync_ErrorCode11111() {
            // Given
            String contentType = "text/plain";
            String url = "http://example.com/document.txt";
            mockFileInfo.setSource("AIUI-RAG2");

            KnowledgeResponse response = new KnowledgeResponse();
            response.setCode(11111);
            response.setMessage("Error (inner error message)");

            when(knowledgeV2ServiceCallHandler.documentSplit(any(), any())).thenReturn(response);
            when(fileInfoV2Service.updateById(any(FileInfoV2.class))).thenReturn(true);
            when(extractKnowledgeTaskService.updateById(any(ExtractKnowledgeTask.class))).thenReturn(true);

            // When
            knowledgeService.knowledgeExtractAsync(contentType, url, mockSliceConfig, mockFileInfo, mockExtractTask);

            // Then
            verify(fileInfoV2Service, times(1)).updateById(any(FileInfoV2.class));
        }

        /**
         * Test extraction with empty chunks - image file.
         */
        @Test
        @DisplayName("Extract knowledge with empty chunks for image")
        void testKnowledgeExtractAsync_EmptyChunks_Image() {
            // Given
            String contentType = "jpeg"; // Using file extension, not MIME type
            String url = "http://example.com/image.jpg";
            mockFileInfo.setSource("AIUI-RAG2");

            KnowledgeResponse response = new KnowledgeResponse();
            response.setCode(0);
            response.setData(new JSONArray());

            when(knowledgeV2ServiceCallHandler.documentSplit(any(), any())).thenReturn(response);
            when(fileInfoV2Service.updateById(any(FileInfoV2.class))).thenReturn(true);
            when(extractKnowledgeTaskService.updateById(any(ExtractKnowledgeTask.class))).thenReturn(true);

            // When
            knowledgeService.knowledgeExtractAsync(contentType, url, mockSliceConfig, mockFileInfo, mockExtractTask);

            // Then
            verify(fileInfoV2Service, times(1)).updateById(any(FileInfoV2.class));
            assertThat(mockFileInfo.getReason()).contains("check if the image contains text");
        }

        /**
         * Test extraction with empty chunks - non-image file.
         */
        @Test
        @DisplayName("Extract knowledge with empty chunks for non-image")
        void testKnowledgeExtractAsync_EmptyChunks_NonImage() {
            // Given
            String contentType = "text/plain";
            String url = "http://example.com/document.txt";
            mockFileInfo.setSource("AIUI-RAG2");

            KnowledgeResponse response = new KnowledgeResponse();
            response.setCode(0);
            response.setData(new JSONArray());

            when(knowledgeV2ServiceCallHandler.documentSplit(any(), any())).thenReturn(response);
            when(fileInfoV2Service.updateById(any(FileInfoV2.class))).thenReturn(true);
            when(extractKnowledgeTaskService.updateById(any(ExtractKnowledgeTask.class))).thenReturn(true);

            // When
            knowledgeService.knowledgeExtractAsync(contentType, url, mockSliceConfig, mockFileInfo, mockExtractTask);

            // Then
            verify(fileInfoV2Service, times(1)).updateById(any(FileInfoV2.class));
            assertThat(mockFileInfo.getReason()).contains("file meets upload requirements");
        }

        /**
         * Test CBG extraction when S3 file not found.
         */
        @Test
        @DisplayName("CBG extraction fails when S3 file not found")
        void testKnowledgeExtractAsync_CBG_S3FileNotFound() {
            // Given
            String contentType = "text/plain";
            String url = "http://example.com/document.txt";
            mockFileInfo.setSource("CBG-RAG");

            when(s3Util.getObject(anyString())).thenReturn(null);
            when(fileInfoV2Service.updateById(any(FileInfoV2.class))).thenReturn(true);
            when(extractKnowledgeTaskService.updateById(any(ExtractKnowledgeTask.class))).thenReturn(true);

            // When
            knowledgeService.knowledgeExtractAsync(contentType, url, mockSliceConfig, mockFileInfo, mockExtractTask);

            // Then
            verify(s3Util, times(1)).getObject(anyString());
            assertThat(mockFileInfo.getReason()).contains("Failed to get file from S3");
        }

        /**
         * Test extraction with HTML file type.
         */
        @Test
        @DisplayName("Extract knowledge with HTML file type")
        void testKnowledgeExtractAsync_HTMLFile() {
            // Given
            String contentType = "text/html";
            String url = "http://example.com/document.html";
            mockFileInfo.setSource("AIUI-RAG2");
            mockFileInfo.setType("text/html");

            KnowledgeResponse response = new KnowledgeResponse();
            response.setCode(0);
            JSONArray dataArray = new JSONArray();

            ChunkInfo chunk = new ChunkInfo();
            chunk.setContent("Test HTML content");
            chunk.setDocId("file-uuid-001");
            dataArray.add(JSON.parseObject(JSON.toJSONString(chunk)));
            response.setData(dataArray);

            when(knowledgeV2ServiceCallHandler.documentSplit(any(), any())).thenReturn(response);
            when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
            when(previewKnowledgeMapper.countByFileId(anyString())).thenReturn(0L);
            when(previewKnowledgeMapper.insertBatch(anyList())).thenReturn(1);
            when(fileInfoV2Service.updateById(any(FileInfoV2.class))).thenReturn(true);
            when(extractKnowledgeTaskService.updateById(any(ExtractKnowledgeTask.class))).thenReturn(true);

            // When
            knowledgeService.knowledgeExtractAsync(contentType, url, mockSliceConfig, mockFileInfo, mockExtractTask);

            // Then
            verify(knowledgeV2ServiceCallHandler, times(1)).documentSplit(any(), any());
        }
    }

    /**
     * Test cases for the knowledgeEmbeddingExtractAsync method. Validates asynchronous knowledge
     * extraction with embedding.
     */
    @Nested
    @DisplayName("knowledgeEmbeddingExtractAsync Tests")
    class KnowledgeEmbeddingExtractAsyncTests {

        private SliceConfig mockSliceConfig;
        private FileInfoV2Service mockFileService;

        @BeforeEach
        void setUp() {
            mockSliceConfig = new SliceConfig();
            mockSliceConfig.setLengthRange(Arrays.asList(300, 800));
            mockSliceConfig.setSeperator(Arrays.asList("\n"));
            mockFileService = mock(FileInfoV2Service.class);
        }

        /**
         * Test successful extraction with embedding trigger.
         */
        @Test
        @DisplayName("Extract and embed knowledge successfully")
        void testKnowledgeEmbeddingExtractAsync_Success() {
            // Given
            String contentType = "text/plain";
            String url = "http://example.com/document.txt";
            mockFileInfo.setSource("AIUI-RAG2");
            mockFileInfo.setSpaceId(1L);

            KnowledgeResponse response = new KnowledgeResponse();
            response.setCode(0);
            JSONArray dataArray = new JSONArray();

            ChunkInfo chunk = new ChunkInfo();
            chunk.setContent("Test chunk content");
            chunk.setDocId("file-uuid-001");
            dataArray.add(JSON.parseObject(JSON.toJSONString(chunk)));
            response.setData(dataArray);

            DealFileResult dealFileResult = new DealFileResult();
            dealFileResult.setParseSuccess(true);
            dealFileResult.setTaskId("task-001");

            when(knowledgeV2ServiceCallHandler.documentSplit(any(), any())).thenReturn(response);
            when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
            when(previewKnowledgeMapper.countByFileId(anyString())).thenReturn(0L);
            when(previewKnowledgeMapper.insertBatch(anyList())).thenReturn(1);
            when(fileInfoV2Service.updateById(any(FileInfoV2.class))).thenReturn(true);
            when(extractKnowledgeTaskService.updateById(any(ExtractKnowledgeTask.class))).thenReturn(true);
            doNothing().when(mockFileService).saveTaskAndUpdateFileStatus(anyLong());
            when(mockFileService.embeddingFile(anyLong(), anyLong())).thenReturn(dealFileResult);

            // When
            knowledgeService.knowledgeEmbeddingExtractAsync(contentType, url, mockSliceConfig,
                    mockFileInfo, mockExtractTask, mockFileService);

            // Then
            verify(knowledgeV2ServiceCallHandler, times(1)).documentSplit(any(), any());
            verify(mockFileService, times(1)).saveTaskAndUpdateFileStatus(mockFileInfo.getId());
            verify(mockFileService, times(1)).embeddingFile(mockFileInfo.getId(), mockFileInfo.getSpaceId());
        }

        /**
         * Test extraction with embedding when extraction fails.
         */
        @Test
        @DisplayName("Extract and embed fails when extraction returns error")
        void testKnowledgeEmbeddingExtractAsync_ExtractionFails() {
            // Given
            String contentType = "text/plain";
            String url = "http://example.com/document.txt";
            mockFileInfo.setSource("AIUI-RAG2");

            KnowledgeResponse response = new KnowledgeResponse();
            response.setCode(1);
            response.setMessage("Extraction failed");

            when(knowledgeV2ServiceCallHandler.documentSplit(any(), any())).thenReturn(response);
            when(fileInfoV2Service.updateById(any(FileInfoV2.class))).thenReturn(true);
            when(extractKnowledgeTaskService.updateById(any(ExtractKnowledgeTask.class))).thenReturn(true);

            // When
            knowledgeService.knowledgeEmbeddingExtractAsync(contentType, url, mockSliceConfig,
                    mockFileInfo, mockExtractTask, mockFileService);

            // Then
            verify(mockFileService, never()).saveTaskAndUpdateFileStatus(anyLong());
            verify(mockFileService, never()).embeddingFile(anyLong(), anyLong());
        }

        /**
         * Test CBG extraction with embedding.
         */
        @Test
        @DisplayName("Extract and embed with CBG source")
        void testKnowledgeEmbeddingExtractAsync_CBG() {
            // Given
            String contentType = "text/plain";
            String url = "http://example.com/document.txt";
            mockFileInfo.setSource("CBG-RAG");
            mockFileInfo.setType("text/plain");
            mockFileInfo.setSpaceId(1L);

            KnowledgeResponse response = new KnowledgeResponse();
            response.setCode(0);
            JSONArray dataArray = new JSONArray();

            ChunkInfo chunk = new ChunkInfo();
            chunk.setContent("Test chunk content");
            chunk.setDocId("cbg-doc-001");
            dataArray.add(JSON.parseObject(JSON.toJSONString(chunk)));
            response.setData(dataArray);

            DealFileResult dealFileResult = new DealFileResult();
            dealFileResult.setParseSuccess(true);
            dealFileResult.setTaskId("task-001");

            when(s3Util.getObject(anyString())).thenReturn(new java.io.ByteArrayInputStream("test".getBytes()));
            when(knowledgeV2ServiceCallHandler.documentUpload(any(), any(), any(), any(), any(), any(), any())).thenReturn(response);
            when(fileInfoV2Service.getById(anyLong())).thenReturn(mockFileInfo);
            when(previewKnowledgeMapper.countByFileId(anyString())).thenReturn(0L);
            when(previewKnowledgeMapper.insertBatch(anyList())).thenReturn(1);
            when(fileInfoV2Service.updateById(any(FileInfoV2.class))).thenReturn(true);
            when(extractKnowledgeTaskService.updateById(any(ExtractKnowledgeTask.class))).thenReturn(true);
            doNothing().when(mockFileService).saveTaskAndUpdateFileStatus(anyLong());
            when(mockFileService.embeddingFile(anyLong(), anyLong())).thenReturn(dealFileResult);

            // When
            knowledgeService.knowledgeEmbeddingExtractAsync(contentType, url, mockSliceConfig,
                    mockFileInfo, mockExtractTask, mockFileService);

            // Then
            verify(s3Util, times(1)).getObject(anyString());
            verify(mockFileService, times(1)).saveTaskAndUpdateFileStatus(mockFileInfo.getId());
            verify(mockFileService, times(1)).embeddingFile(mockFileInfo.getId(), mockFileInfo.getSpaceId());
        }

        /**
         * Test embedding with empty chunks.
         */
        @Test
        @DisplayName("Extract and embed with empty chunks")
        void testKnowledgeEmbeddingExtractAsync_EmptyChunks() {
            // Given
            String contentType = "text/plain";
            String url = "http://example.com/document.txt";
            mockFileInfo.setSource("AIUI-RAG2");

            KnowledgeResponse response = new KnowledgeResponse();
            response.setCode(0);
            response.setData(new JSONArray());

            when(knowledgeV2ServiceCallHandler.documentSplit(any(), any())).thenReturn(response);
            when(fileInfoV2Service.updateById(any(FileInfoV2.class))).thenReturn(true);
            when(extractKnowledgeTaskService.updateById(any(ExtractKnowledgeTask.class))).thenReturn(true);

            // When
            knowledgeService.knowledgeEmbeddingExtractAsync(contentType, url, mockSliceConfig,
                    mockFileInfo, mockExtractTask, mockFileService);

            // Then
            verify(mockFileService, never()).saveTaskAndUpdateFileStatus(anyLong());
            verify(mockFileService, never()).embeddingFile(anyLong(), anyLong());
        }
    }

    /**
     * datasetId routing tests.
     *
     * <p>
     * Tests for {@code datasetId} resolution and forwarding through delete paths.
     */
    @Nested
    @DisplayName("datasetId routing tests")
    class DatasetIdRoutingTests {

        @BeforeEach
        void resetBizConfig() {
            // These tests assert the legacy fallback routing where only CBG-RAG is
            // CBG-compatible, so pin the static BizConfig to null instead of relying
            // on test execution order.
            new ProjectContent().setBizConfig(null);
        }

        @Test
        @DisplayName("resolveRagflowDatasetIdOrNull returns null for non-Ragflow-RAG sources")
        void resolveRagflowDatasetIdOrNull_NonRagflowRAG_returnsNull() {
            FileInfoV2 file = new FileInfoV2();
            file.setSource("CBG-RAG");
            file.setRepoId(42L);
            String result = ReflectionTestUtils.invokeMethod(
                    knowledgeService, "resolveRagflowDatasetIdOrNull", file);
            assertThat(result).isNull();
        }

        @Test
        @DisplayName("resolveRagflowDatasetIdOrNull throws when Ragflow-RAG file lacks repoId")
        void resolveRagflowDatasetIdOrNull_RagflowRAG_nullRepoId_throws() {
            FileInfoV2 file = new FileInfoV2();
            file.setSource("Ragflow-RAG");
            file.setRepoId(null);
            file.setId(99L);
            BusinessException ex = assertThrows(BusinessException.class,
                    () -> ReflectionTestUtils.invokeMethod(
                            knowledgeService, "resolveRagflowDatasetIdOrNull", file));
            assertThat(ex.getResponseEnum()).isEqualTo(ResponseEnum.REPO_STATUS_ILLEGAL);
        }

        @Test
        @DisplayName("resolveRagflowDatasetIdOrNull throws when Repo missing")
        void resolveRagflowDatasetIdOrNull_RagflowRAG_repoNotFound_throws() {
            FileInfoV2 file = new FileInfoV2();
            file.setSource("Ragflow-RAG");
            file.setRepoId(42L);
            when(repoService.getById(42L)).thenReturn(null);
            BusinessException ex = assertThrows(BusinessException.class,
                    () -> ReflectionTestUtils.invokeMethod(
                            knowledgeService, "resolveRagflowDatasetIdOrNull", file));
            assertThat(ex.getResponseEnum()).isEqualTo(ResponseEnum.REPO_STATUS_ILLEGAL);
        }

        @Test
        @DisplayName("resolveRagflowDatasetIdOrNull returns null when ragflowDatasetId blank (legacy fallback)")
        void resolveRagflowDatasetIdOrNull_RagflowRAG_blankDatasetId_returnsNull() {
            FileInfoV2 file = new FileInfoV2();
            file.setSource("Ragflow-RAG");
            file.setRepoId(42L);
            Repo repo = new Repo();
            repo.setCoreRepoId("abc-uuid");
            repo.setRagflowDatasetId(null);
            when(repoService.getById(42L)).thenReturn(repo);
            String result = ReflectionTestUtils.invokeMethod(
                    knowledgeService, "resolveRagflowDatasetIdOrNull", file);
            assertThat(result).isNull();
        }

        @Test
        @DisplayName("resolveRagflowDatasetIdOrNull returns ragflowDatasetId on happy path")
        void resolveRagflowDatasetIdOrNull_happyPath_returnsDatasetId() {
            FileInfoV2 file = new FileInfoV2();
            file.setSource("Ragflow-RAG");
            file.setRepoId(42L);
            Repo repo = new Repo();
            repo.setCoreRepoId("abc-uuid");
            repo.setRagflowDatasetId("ds-real-id-001");
            when(repoService.getById(42L)).thenReturn(repo);
            String result = ReflectionTestUtils.invokeMethod(
                    knowledgeService, "resolveRagflowDatasetIdOrNull", file);
            assertThat(result).isEqualTo("ds-real-id-001");
        }

        @Test
        @DisplayName("deleteKnowledgeDoc sets datasetId on Ragflow-RAG request")
        void deleteKnowledgeDoc_RagflowRAG_setsDatasetIdOnRequest() {
            JSONArray deleteDocIds = new JSONArray();
            deleteDocIds.add("doc-ragflow-001");

            FileInfoV2 ragflowFile = new FileInfoV2();
            ragflowFile.setSource("Ragflow-RAG");
            ragflowFile.setRepoId(100L);
            ragflowFile.setId(1L);
            when(fileInfoV2Service.getOnly(any(QueryWrapper.class))).thenReturn(ragflowFile);

            Repo ragflowRepo = new Repo();
            ragflowRepo.setId(100L);
            ragflowRepo.setCoreRepoId("ragflow-core-uuid");
            ragflowRepo.setRagflowDatasetId("ds-real-id-001");
            when(repoService.getById(100L)).thenReturn(ragflowRepo);

            KnowledgeResponse response = new KnowledgeResponse();
            response.setCode(0);
            when(knowledgeV2ServiceCallHandler.deleteDocOrChunk(any())).thenReturn(response);

            knowledgeService.deleteKnowledgeDoc(deleteDocIds, null);

            ArgumentCaptor<KnowledgeRequest> captor = ArgumentCaptor.forClass(KnowledgeRequest.class);
            verify(knowledgeV2ServiceCallHandler).deleteDocOrChunk(captor.capture());
            assertThat(captor.getValue().getDatasetId()).isEqualTo("ds-real-id-001");
            assertThat(captor.getValue().getGroup()).isNull();
        }

        @Test
        @DisplayName("deleteKnowledgeDoc leaves datasetId null for non-Ragflow-RAG (AIUI/CBG)")
        void deleteKnowledgeDoc_NonRagflowRAG_doesNotSetDatasetId() {
            JSONArray deleteDocIds = new JSONArray();
            deleteDocIds.add("doc-aiui-001");

            FileInfoV2 aiuiFile = new FileInfoV2();
            aiuiFile.setSource("AIUI-RAG2");
            aiuiFile.setRepoId(100L);
            when(fileInfoV2Service.getOnly(any(QueryWrapper.class))).thenReturn(aiuiFile);

            KnowledgeResponse response = new KnowledgeResponse();
            response.setCode(0);
            when(knowledgeV2ServiceCallHandler.deleteDocOrChunk(any())).thenReturn(response);

            knowledgeService.deleteKnowledgeDoc(deleteDocIds, null);

            ArgumentCaptor<KnowledgeRequest> captor = ArgumentCaptor.forClass(KnowledgeRequest.class);
            verify(knowledgeV2ServiceCallHandler).deleteDocOrChunk(captor.capture());
            assertThat(captor.getValue().getDatasetId()).isNull();
            // Repo should not be loaded for non-Ragflow-RAG sources.
            verify(repoService, never()).getById(anyLong());
        }

        @Test
        @DisplayName("deleteKnowledgeDoc leaves datasetId null for Ragflow-RAG with legacy NULL repo")
        void deleteKnowledgeDoc_RagflowRAG_legacyNullDatasetId_skipsDatasetId() {
            JSONArray deleteDocIds = new JSONArray();
            deleteDocIds.add("doc-ragflow-legacy");

            FileInfoV2 ragflowFile = new FileInfoV2();
            ragflowFile.setSource("Ragflow-RAG");
            ragflowFile.setRepoId(100L);
            ragflowFile.setId(1L);
            when(fileInfoV2Service.getOnly(any(QueryWrapper.class))).thenReturn(ragflowFile);

            Repo legacyRepo = new Repo();
            legacyRepo.setId(100L);
            legacyRepo.setCoreRepoId("legacy-core-uuid");
            legacyRepo.setRagflowDatasetId(null);
            when(repoService.getById(100L)).thenReturn(legacyRepo);

            KnowledgeResponse response = new KnowledgeResponse();
            response.setCode(0);
            when(knowledgeV2ServiceCallHandler.deleteDocOrChunk(any())).thenReturn(response);

            knowledgeService.deleteKnowledgeDoc(deleteDocIds, null);

            ArgumentCaptor<KnowledgeRequest> captor = ArgumentCaptor.forClass(KnowledgeRequest.class);
            verify(knowledgeV2ServiceCallHandler).deleteDocOrChunk(captor.capture());
            assertThat(captor.getValue().getDatasetId()).isNull();
        }

        @Test
        @DisplayName("deleteKnowledgeDoc skips invalid Ragflow-RAG metadata and continues")
        void deleteKnowledgeDoc_RagflowRAG_invalidMetadata_skipsAndContinues() {
            JSONArray deleteDocIds = new JSONArray();
            deleteDocIds.add("doc-ragflow-invalid");
            deleteDocIds.add("doc-ragflow-valid");

            FileInfoV2 invalidFile = new FileInfoV2();
            invalidFile.setSource("Ragflow-RAG");
            invalidFile.setRepoId(404L);
            invalidFile.setId(1L);
            invalidFile.setUuid("doc-ragflow-invalid");

            FileInfoV2 validFile = new FileInfoV2();
            validFile.setSource("Ragflow-RAG");
            validFile.setRepoId(100L);
            validFile.setId(2L);
            validFile.setUuid("doc-ragflow-valid");
            when(fileInfoV2Service.getOnly(any(QueryWrapper.class))).thenReturn(invalidFile, validFile);

            Repo ragflowRepo = new Repo();
            ragflowRepo.setId(100L);
            ragflowRepo.setCoreRepoId("ragflow-core-uuid");
            ragflowRepo.setRagflowDatasetId("ds-real-id-001");
            when(repoService.getById(anyLong())).thenAnswer(invocation -> {
                Long repoId = invocation.getArgument(0);
                return Long.valueOf(100L).equals(repoId) ? ragflowRepo : null;
            });

            KnowledgeResponse response = new KnowledgeResponse();
            response.setCode(0);
            when(knowledgeV2ServiceCallHandler.deleteDocOrChunk(any())).thenReturn(response);

            knowledgeService.deleteKnowledgeDoc(deleteDocIds, null);

            ArgumentCaptor<KnowledgeRequest> captor = ArgumentCaptor.forClass(KnowledgeRequest.class);
            verify(knowledgeV2ServiceCallHandler).deleteDocOrChunk(captor.capture());
            assertThat(captor.getValue().getDocId()).isEqualTo("doc-ragflow-valid");
            assertThat(captor.getValue().getDatasetId()).isEqualTo("ds-real-id-001");
        }

        @Test
        @DisplayName("deleteKnowledgeChunks sets datasetId on Ragflow-RAG request")
        void deleteKnowledgeChunks_RagflowRAG_setsDatasetIdOnRequest() {
            String docId = "doc-ragflow-001";
            JSONArray chunkIds = new JSONArray();
            chunkIds.add("chunk-001");

            FileInfoV2 ragflowFile = new FileInfoV2();
            ragflowFile.setSource("Ragflow-RAG");
            ragflowFile.setRepoId(100L);
            ragflowFile.setId(1L);
            when(fileInfoV2Service.getOnly(any(QueryWrapper.class))).thenReturn(ragflowFile);

            Repo ragflowRepo = new Repo();
            ragflowRepo.setId(100L);
            ragflowRepo.setCoreRepoId("ragflow-core-uuid");
            ragflowRepo.setRagflowDatasetId("ds-real-id-001");
            when(repoService.getById(100L)).thenReturn(ragflowRepo);

            KnowledgeResponse response = new KnowledgeResponse();
            response.setCode(0);
            when(knowledgeV2ServiceCallHandler.deleteDocOrChunk(any())).thenReturn(response);

            knowledgeService.deleteKnowledgeChunks(docId, chunkIds);

            ArgumentCaptor<KnowledgeRequest> captor = ArgumentCaptor.forClass(KnowledgeRequest.class);
            verify(knowledgeV2ServiceCallHandler).deleteDocOrChunk(captor.capture());
            assertThat(captor.getValue().getDatasetId()).isEqualTo("ds-real-id-001");
            assertThat(captor.getValue().getGroup()).isNull();
        }

        @Test
        @DisplayName("deleteKnowledgeChunks leaves datasetId null for non-Ragflow-RAG (AIUI/CBG)")
        void deleteKnowledgeChunks_NonRagflowRAG_doesNotSetDatasetId() {
            String docId = "doc-aiui-001";
            JSONArray chunkIds = new JSONArray();
            chunkIds.add("chunk-001");

            FileInfoV2 aiuiFile = new FileInfoV2();
            aiuiFile.setSource("AIUI-RAG2");
            aiuiFile.setRepoId(100L);
            when(fileInfoV2Service.getOnly(any(QueryWrapper.class))).thenReturn(aiuiFile);

            KnowledgeResponse response = new KnowledgeResponse();
            response.setCode(0);
            when(knowledgeV2ServiceCallHandler.deleteDocOrChunk(any())).thenReturn(response);

            knowledgeService.deleteKnowledgeChunks(docId, chunkIds);

            ArgumentCaptor<KnowledgeRequest> captor = ArgumentCaptor.forClass(KnowledgeRequest.class);
            verify(knowledgeV2ServiceCallHandler).deleteDocOrChunk(captor.capture());
            assertThat(captor.getValue().getDatasetId()).isNull();
            verify(repoService, never()).getById(anyLong());
        }

        @Test
        @DisplayName("deleteKnowledgeChunks skips invalid Ragflow-RAG metadata")
        void deleteKnowledgeChunks_RagflowRAG_invalidMetadata_skipsDelete() {
            String docId = "doc-ragflow-invalid";
            JSONArray chunkIds = new JSONArray();
            chunkIds.add("chunk-001");

            FileInfoV2 invalidFile = new FileInfoV2();
            invalidFile.setSource("Ragflow-RAG");
            invalidFile.setRepoId(404L);
            invalidFile.setId(1L);
            invalidFile.setUuid(docId);
            when(fileInfoV2Service.getOnly(any(QueryWrapper.class))).thenReturn(invalidFile);

            knowledgeService.deleteKnowledgeChunks(docId, chunkIds);

            verify(knowledgeV2ServiceCallHandler, never()).deleteDocOrChunk(any());
        }
    }
}
