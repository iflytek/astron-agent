package com.iflytek.astron.console.toolkit.service.knowledge;

import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.iflytek.astron.console.commons.config.JwtClaimsFilter;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.dto.dataset.DatasetStats;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.service.data.IDatasetFileService;
import com.iflytek.astron.console.toolkit.common.constant.ProjectContent;
import com.iflytek.astron.console.toolkit.config.properties.ApiUrl;
import com.iflytek.astron.console.toolkit.config.properties.BizConfig;
import com.iflytek.astron.console.toolkit.config.properties.RepoAuthorizedConfig;
import com.iflytek.astron.console.toolkit.entity.table.ConfigInfo;
import com.iflytek.astron.console.toolkit.entity.table.group.GroupVisibility;
import com.iflytek.astron.console.toolkit.entity.table.relation.FlowRepoRel;
import com.iflytek.astron.console.toolkit.entity.table.repo.Repo;
import com.iflytek.astron.console.toolkit.entity.table.repo.FileInfoV2;
import com.iflytek.astron.console.toolkit.entity.table.repo.HitTestHistory;
import com.iflytek.astron.console.toolkit.entity.table.repo.FileDirectoryTree;
import com.iflytek.astron.console.toolkit.entity.dto.RepoDto;
import com.iflytek.astron.console.toolkit.entity.dto.SparkBotVO;
import com.iflytek.astron.console.toolkit.entity.common.PageData;
import com.iflytek.astron.console.toolkit.entity.core.knowledge.QueryRequest;
import com.iflytek.astron.console.toolkit.entity.core.knowledge.KnowledgeResponse;
import com.iflytek.astron.console.toolkit.entity.core.knowledge.QueryRespData;
import com.iflytek.astron.console.toolkit.entity.core.knowledge.ChunkInfo;
import com.iflytek.astron.console.toolkit.entity.vo.knowledge.RepoVO;
import com.iflytek.astron.console.toolkit.handler.KnowledgeV2ServiceCallHandler;
import com.iflytek.astron.console.toolkit.handler.UserInfoManagerHandler;
import com.iflytek.astron.console.commons.util.space.SpaceInfoUtil;
import com.iflytek.astron.console.toolkit.mapper.ConfigInfoMapper;
import com.iflytek.astron.console.toolkit.mapper.bot.SparkBotMapper;
import com.iflytek.astron.console.toolkit.mapper.knowledge.KnowledgeMapper;
import com.iflytek.astron.console.toolkit.mapper.relation.FlowRepoRelMapper;
import com.iflytek.astron.console.toolkit.mapper.repo.FileInfoV2Mapper;
import com.iflytek.astron.console.toolkit.mapper.repo.RepoMapper;
import com.iflytek.astron.console.toolkit.service.bot.BotRepoRelService;
import com.iflytek.astron.console.toolkit.service.bot.BotRepoSubscriptService;
import com.iflytek.astron.console.toolkit.service.extra.OpenPlatformService;
import com.iflytek.astron.console.toolkit.service.group.GroupVisibilityService;
import com.iflytek.astron.console.toolkit.service.repo.FileDirectoryTreeService;
import com.iflytek.astron.console.toolkit.service.repo.FileInfoV2Service;
import com.iflytek.astron.console.toolkit.service.repo.HitTestHistoryService;
import com.iflytek.astron.console.toolkit.service.repo.RepoService;
import com.iflytek.astron.console.toolkit.tool.DataPermissionCheckTool;
import com.iflytek.astron.console.toolkit.util.S3Util;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.alibaba.fastjson2.JSONObject;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for RepoService
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
@DisplayName("RepoService Unit Tests")
class RepoServiceTest {

    @Mock
    private RepoMapper repoMapper;

    @Mock
    private ConfigInfoMapper configInfoMapper;

    @Mock
    private RepoAuthorizedConfig repoAuthorizedConfig;

    @Mock
    private KnowledgeV2ServiceCallHandler knowledgeV2ServiceCallHandler;

    @Mock
    private BotRepoSubscriptService botRepoSubscriptService;

    @Mock
    private BotRepoRelService botRepoRelService;

    @Mock
    private HitTestHistoryService historyService;

    @Mock
    private FileInfoV2Service fileInfoV2Service;

    @Mock
    private FileInfoV2Mapper fileInfoV2Mapper;

    @Mock
    private IDatasetFileService datasetFileService;

    @Mock
    private FileDirectoryTreeService directoryTreeService;

    @Mock
    private S3Util s3UtilClient;

    @Mock
    private SparkBotMapper sparkBotMapper;

    @Mock
    private GroupVisibilityService groupVisibilityService;

    @Mock
    private DataPermissionCheckTool dataPermissionCheckTool;

    @Mock
    private OpenPlatformService openPlatformService;

    @Mock
    private FlowRepoRelMapper flowRepoRelMapper;

    @Mock
    private KnowledgeMapper knowledgeMapper;

    @Mock
    private ApiUrl apiUrl;

    @InjectMocks
    private RepoService repoService;

    private RepoVO mockRepoVO;
    private Repo mockRepo;
    private MockHttpServletRequest mockRequest;

    /**
     * Set up test fixtures before each test method. Initializes common test data including mock
     * repository objects and request context.
     */
    @BeforeEach
    void setUp() {
        // Initialize mock HttpServletRequest and set up RequestContextHolder
        mockRequest = new MockHttpServletRequest();
        mockRequest.setAttribute(JwtClaimsFilter.USER_ID_ATTRIBUTE, "user-001");
        ServletRequestAttributes attributes = new ServletRequestAttributes(mockRequest);
        RequestContextHolder.setRequestAttributes(attributes);

        // Set baseMapper for ServiceImpl - Required for MyBatis-Plus
        ReflectionTestUtils.setField(repoService, "baseMapper", repoMapper);
        ReflectionTestUtils.setField(repoService, "self", repoService);

        BizConfig bizConfig = new BizConfig();
        bizConfig.setCbgRagCompatibleSources(Arrays.asList(
                ProjectContent.FILE_SOURCE_CBG_RAG_STR,
                ProjectContent.FILE_SOURCE_RAG_FLOW_RAG_STR));
        bizConfig.setAiuiRagCompatibleSources(
                Arrays.asList(ProjectContent.FILE_SOURCE_AIUI_RAG2_STR));
        bizConfig.setSparkRagCompatibleSources(
                Arrays.asList(ProjectContent.FILE_SOURCE_SPARK_RAG_STR));
        new ProjectContent().setBizConfig(bizConfig);

        // Initialize mock RepoVO
        mockRepoVO = new RepoVO();
        mockRepoVO.setName("Test Repository");
        mockRepoVO.setDesc("Test Description");
        mockRepoVO.setTag("AIUI-RAG2"); // Use correct tag value for validation
        mockRepoVO.setAvatarIcon("icon-url");
        mockRepoVO.setAvatarColor("#FF0000");
        mockRepoVO.setVisibility(0);
        mockRepoVO.setAppId("app-001");
        mockRepoVO.setSource(0);
        mockRepoVO.setUids(new ArrayList<>());

        // Initialize mock Repo
        mockRepo = new Repo();
        mockRepo.setId(1L);
        mockRepo.setName("Test Repository");
        mockRepo.setDescription("Test Description");
        mockRepo.setTag("AIUI-RAG2"); // Use correct tag value for validation
        mockRepo.setUserId("user-001");
        mockRepo.setCoreRepoId("core-repo-001");
        mockRepo.setOuterRepoId("outer-repo-001");
        mockRepo.setStatus(ProjectContent.REPO_STATUS_CREATED);
        mockRepo.setDeleted(false);
        mockRepo.setVisibility(0);
        mockRepo.setEnableAudit(false);
        mockRepo.setIcon("icon-url");
        mockRepo.setColor("#FF0000");
        mockRepo.setCreateTime(new Date());
        mockRepo.setUpdateTime(new Date());
    }

    /**
     * Clean up after each test method. Clears the RequestContextHolder and the static BizConfig on
     * ProjectContent to avoid side effects between tests.
     */
    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
        new ProjectContent().setBizConfig(null);
    }

    /**
     * Test cases for the createRepo method. Validates repository creation functionality including
     * success scenarios and error handling.
     */
    @Nested
    @DisplayName("createRepo Tests")
    class CreateRepoTests {

        /**
         * Test successful repository creation with AIUI tag.
         */
        @Test
        @DisplayName("Create repository successfully with AIUI tag")
        void testCreateRepo_Success_WithAIUI() {
            try (MockedStatic<UserInfoManagerHandler> userMock = mockStatic(UserInfoManagerHandler.class);
                    MockedStatic<SpaceInfoUtil> spaceMock = mockStatic(SpaceInfoUtil.class)) {

                // Setup static mocks
                userMock.when(UserInfoManagerHandler::getUserId).thenReturn("user-001");
                spaceMock.when(SpaceInfoUtil::getSpaceId).thenReturn(null);

                // Given
                mockRepoVO.setTag("AIUI-RAG2");

                // Mock selectOne with two parameters (wrapper, throwEx) - MyBatis-Plus uses this signature
                when(repoMapper.selectOne(any(), anyBoolean())).thenReturn(null);
                when(repoMapper.insert(any(Repo.class))).thenAnswer(invocation -> {
                    Repo repo = invocation.getArgument(0);
                    repo.setId(1L);
                    return 1;
                });
                doNothing().when(groupVisibilityService).setRepoVisibility(anyLong(), anyInt(), anyInt(), anyList());

                // When
                Repo result = repoService.createRepo(mockRepoVO);

                // Then
                assertThat(result).isNotNull();
                assertThat(result.getName()).isEqualTo("Test Repository");
                assertThat(result.getTag()).isEqualTo("AIUI-RAG2");
                assertThat(result.getDeleted()).isFalse();
                verify(repoMapper, times(1)).insert(any(Repo.class));
                verify(groupVisibilityService, times(1)).setRepoVisibility(anyLong(), anyInt(), anyInt(), anyList());
            }
        }

        /**
         * Test successful repository creation with CBG tag.
         */
        @Test
        @DisplayName("Create repository successfully with CBG tag")
        void testCreateRepo_Success_WithCBG() {
            try (MockedStatic<UserInfoManagerHandler> userMock = mockStatic(UserInfoManagerHandler.class);
                    MockedStatic<SpaceInfoUtil> spaceMock = mockStatic(SpaceInfoUtil.class)) {

                // Setup static mocks
                userMock.when(UserInfoManagerHandler::getUserId).thenReturn("user-001");
                spaceMock.when(SpaceInfoUtil::getSpaceId).thenReturn(null);

                // Given
                mockRepoVO.setTag("CBG-RAG");

                when(repoMapper.selectOne(any(), anyBoolean())).thenReturn(null);
                when(repoMapper.insert(any(Repo.class))).thenAnswer(invocation -> {
                    Repo repo = invocation.getArgument(0);
                    repo.setId(1L);
                    return 1;
                });
                doNothing().when(groupVisibilityService).setRepoVisibility(anyLong(), anyInt(), anyInt(), anyList());

                // When
                Repo result = repoService.createRepo(mockRepoVO);

                // Then
                assertThat(result).isNotNull();
                assertThat(result.getTag()).isEqualTo("CBG-RAG");
                verify(repoMapper, times(1)).insert(any(Repo.class));
            }
        }

        /**
         * Test repository creation with duplicate name.
         */
        @Test
        @DisplayName("Create repository - duplicate name")
        void testCreateRepo_DuplicateName() {
            try (MockedStatic<UserInfoManagerHandler> userMock = mockStatic(UserInfoManagerHandler.class);
                    MockedStatic<SpaceInfoUtil> spaceMock = mockStatic(SpaceInfoUtil.class)) {

                // Setup static mocks
                userMock.when(UserInfoManagerHandler::getUserId).thenReturn("user-001");
                spaceMock.when(SpaceInfoUtil::getSpaceId).thenReturn(null);

                // Given
                Repo existingRepo = new Repo();
                existingRepo.setId(1L);
                existingRepo.setName("Test Repository");

                when(repoMapper.selectOne(any(), anyBoolean())).thenReturn(existingRepo);

                // When & Then
                assertThatThrownBy(() -> repoService.createRepo(mockRepoVO))
                        .isInstanceOf(BusinessException.class)
                        .extracting("responseEnum")
                        .isEqualTo(ResponseEnum.REPO_NAME_DUPLICATE);

                verify(repoMapper, never()).insert(any(Repo.class));
            }
        }

        /**
         * Test repository creation with invalid tag.
         */
        @Test
        @DisplayName("Create repository - invalid tag")
        void testCreateRepo_InvalidTag() {
            try (MockedStatic<UserInfoManagerHandler> userMock = mockStatic(UserInfoManagerHandler.class);
                    MockedStatic<SpaceInfoUtil> spaceMock = mockStatic(SpaceInfoUtil.class)) {

                // Setup static mocks
                userMock.when(UserInfoManagerHandler::getUserId).thenReturn("user-001");
                spaceMock.when(SpaceInfoUtil::getSpaceId).thenReturn(null);

                // Given
                mockRepoVO.setTag("INVALID_TAG");

                when(repoMapper.selectOne(any(), anyBoolean())).thenReturn(null);

                // When & Then
                assertThatThrownBy(() -> repoService.createRepo(mockRepoVO))
                        .isInstanceOf(BusinessException.class)
                        .extracting("responseEnum")
                        .isEqualTo(ResponseEnum.REPO_TYPE_NOT_MATCH);

                verify(repoMapper, never()).insert(any(Repo.class));
            }
        }

        /**
         * Test repository creation with custom outer repo ID.
         */
        @Test
        @DisplayName("Create repository - with custom outer repo ID")
        void testCreateRepo_WithCustomOuterRepoId() {
            try (MockedStatic<UserInfoManagerHandler> userMock = mockStatic(UserInfoManagerHandler.class);
                    MockedStatic<SpaceInfoUtil> spaceMock = mockStatic(SpaceInfoUtil.class)) {

                // Setup static mocks
                userMock.when(UserInfoManagerHandler::getUserId).thenReturn("user-001");
                spaceMock.when(SpaceInfoUtil::getSpaceId).thenReturn(null);

                // Given
                mockRepoVO.setOuterRepoId("custom-repo-id");

                when(repoMapper.selectOne(any(), anyBoolean())).thenReturn(null);
                when(repoMapper.insert(any(Repo.class))).thenAnswer(invocation -> {
                    Repo repo = invocation.getArgument(0);
                    repo.setId(1L);
                    return 1;
                });
                doNothing().when(groupVisibilityService).setRepoVisibility(anyLong(), anyInt(), anyInt(), anyList());

                // When
                Repo result = repoService.createRepo(mockRepoVO);

                // Then
                assertThat(result).isNotNull();
                assertThat(result.getCoreRepoId()).isEqualTo("custom-repo-id");
                assertThat(result.getOuterRepoId()).isEqualTo("custom-repo-id");
                verify(repoMapper, times(1)).insert(any(Repo.class));
            }
        }

        /**
         * Test repository creation with visibility set.
         */
        @Test
        @DisplayName("Create repository - with visibility set")
        void testCreateRepo_WithVisibility() {
            try (MockedStatic<UserInfoManagerHandler> userMock = mockStatic(UserInfoManagerHandler.class);
                    MockedStatic<SpaceInfoUtil> spaceMock = mockStatic(SpaceInfoUtil.class)) {

                // Setup static mocks
                userMock.when(UserInfoManagerHandler::getUserId).thenReturn("user-001");
                spaceMock.when(SpaceInfoUtil::getSpaceId).thenReturn(null);

                // Given
                mockRepoVO.setVisibility(1);
                mockRepoVO.setUids(Arrays.asList("user-001", "user-002"));

                when(repoMapper.selectOne(any(), anyBoolean())).thenReturn(null);
                when(repoMapper.insert(any(Repo.class))).thenAnswer(invocation -> {
                    Repo repo = invocation.getArgument(0);
                    repo.setId(1L);
                    return 1;
                });
                doNothing().when(groupVisibilityService).setRepoVisibility(anyLong(), anyInt(), anyInt(), anyList());

                // When
                Repo result = repoService.createRepo(mockRepoVO);

                // Then
                assertThat(result).isNotNull();
                assertThat(result.getVisibility()).isEqualTo(1);
                verify(groupVisibilityService, times(1)).setRepoVisibility(eq(1L), eq(1), eq(1), anyList());
            }
        }

        /**
         * Test repository creation with null source (default to 0).
         */
        @Test
        @DisplayName("Create repository - null source defaults to 0")
        void testCreateRepo_NullSource_DefaultsToZero() {
            try (MockedStatic<UserInfoManagerHandler> userMock = mockStatic(UserInfoManagerHandler.class);
                    MockedStatic<SpaceInfoUtil> spaceMock = mockStatic(SpaceInfoUtil.class)) {

                // Setup static mocks
                userMock.when(UserInfoManagerHandler::getUserId).thenReturn("user-001");
                spaceMock.when(SpaceInfoUtil::getSpaceId).thenReturn(null);

                // Given
                mockRepoVO.setSource(null);

                when(repoMapper.selectOne(any(), anyBoolean())).thenReturn(null);
                when(repoMapper.insert(any(Repo.class))).thenAnswer(invocation -> {
                    Repo repo = invocation.getArgument(0);
                    repo.setId(1L);
                    assertThat(repo.getSource()).isEqualTo(0);
                    return 1;
                });
                doNothing().when(groupVisibilityService).setRepoVisibility(anyLong(), anyInt(), anyInt(), anyList());

                // When
                Repo result = repoService.createRepo(mockRepoVO);

                // Then
                assertThat(result).isNotNull();
                verify(repoMapper, times(1)).insert(any(Repo.class));
            }
        }

        @Test
        @DisplayName("createRepo with Ragflow-RAG tag persists ragflow dataset id")
        void createRepo_ragflowRag_persistsDatasetId() {
            try (MockedStatic<UserInfoManagerHandler> userMock = mockStatic(UserInfoManagerHandler.class);
                    MockedStatic<SpaceInfoUtil> spaceMock = mockStatic(SpaceInfoUtil.class)) {

                userMock.when(UserInfoManagerHandler::getUserId).thenReturn("user-001");
                spaceMock.when(SpaceInfoUtil::getSpaceId).thenReturn(null);

                mockRepoVO.setName("kb_alpha");
                mockRepoVO.setTag(ProjectContent.FILE_SOURCE_RAG_FLOW_RAG_STR);
                mockRepoVO.setOuterRepoId("caller-controlled-id");
                mockRepoVO.setVisibility(0);

                when(repoMapper.selectOne(any(), anyBoolean())).thenReturn(null);
                when(knowledgeV2ServiceCallHandler.createRagflowDataset(anyString(), eq("kb_alpha")))
                        .thenReturn("ds-real-id-001");
                when(repoMapper.insert(any(Repo.class))).thenAnswer(invocation -> {
                    Repo r = invocation.getArgument(0);
                    r.setId(42L);
                    return 1;
                });
                doNothing().when(groupVisibilityService).setRepoVisibility(anyLong(), anyInt(), anyInt(), anyList());

                Repo saved = repoService.createRepo(mockRepoVO);

                assertThat(saved.getRagflowDatasetId()).isEqualTo("ds-real-id-001");
                assertThat(saved.getTag()).isEqualTo(ProjectContent.FILE_SOURCE_RAG_FLOW_RAG_STR);
                assertThat(saved.getCoreRepoId()).isNotEqualTo("caller-controlled-id");
                assertThat(saved.getOuterRepoId()).isEqualTo(saved.getCoreRepoId());
                assertThat(saved.getCoreRepoId()).hasSize(32);
                ArgumentCaptor<String> datasetNameCaptor = ArgumentCaptor.forClass(String.class);
                verify(knowledgeV2ServiceCallHandler).createRagflowDataset(datasetNameCaptor.capture(), eq("kb_alpha"));
                assertThat(datasetNameCaptor.getValue()).isNotEqualTo(saved.getCoreRepoId());
                assertThat(datasetNameCaptor.getValue()).isEqualTo("kb_alpha-" + saved.getCoreRepoId());
                verify(repoMapper, times(1)).insert(any(Repo.class));
            }
        }

        @Test
        @DisplayName("createRepo with Ragflow-RAG tag keeps dataset name within max length")
        void createRepo_ragflowRag_truncatesReadableDatasetNameOnly() {
            try (MockedStatic<UserInfoManagerHandler> userMock = mockStatic(UserInfoManagerHandler.class);
                    MockedStatic<SpaceInfoUtil> spaceMock = mockStatic(SpaceInfoUtil.class)) {

                userMock.when(UserInfoManagerHandler::getUserId).thenReturn("user-001");
                spaceMock.when(SpaceInfoUtil::getSpaceId).thenReturn(null);

                String longRepoName = "k".repeat(300);
                mockRepoVO.setName(longRepoName);
                mockRepoVO.setTag(ProjectContent.FILE_SOURCE_RAG_FLOW_RAG_STR);
                mockRepoVO.setVisibility(0);

                when(repoMapper.selectOne(any(), anyBoolean())).thenReturn(null);
                when(knowledgeV2ServiceCallHandler.createRagflowDataset(anyString(), eq(longRepoName)))
                        .thenReturn("ds-real-id-002");
                when(repoMapper.insert(any(Repo.class))).thenAnswer(invocation -> {
                    Repo r = invocation.getArgument(0);
                    r.setId(43L);
                    return 1;
                });
                doNothing().when(groupVisibilityService).setRepoVisibility(anyLong(), anyInt(), anyInt(), anyList());

                Repo saved = repoService.createRepo(mockRepoVO);

                ArgumentCaptor<String> datasetNameCaptor = ArgumentCaptor.forClass(String.class);
                verify(knowledgeV2ServiceCallHandler).createRagflowDataset(datasetNameCaptor.capture(), eq(longRepoName));
                assertThat(datasetNameCaptor.getValue()).hasSize(255);
                assertThat(datasetNameCaptor.getValue()).endsWith("-" + saved.getCoreRepoId());
            }
        }

        @Test
        @DisplayName("createRepo rolls back when RAGFlow create fails")
        void createRepo_ragflowFailure_doesNotPersist() {
            try (MockedStatic<UserInfoManagerHandler> userMock = mockStatic(UserInfoManagerHandler.class);
                    MockedStatic<SpaceInfoUtil> spaceMock = mockStatic(SpaceInfoUtil.class)) {

                userMock.when(UserInfoManagerHandler::getUserId).thenReturn("user-001");
                spaceMock.when(SpaceInfoUtil::getSpaceId).thenReturn(null);

                mockRepoVO.setName("kb_failing");
                mockRepoVO.setTag(ProjectContent.FILE_SOURCE_RAG_FLOW_RAG_STR);

                when(repoMapper.selectOne(any(), anyBoolean())).thenReturn(null);
                when(knowledgeV2ServiceCallHandler.createRagflowDataset(anyString(), eq("kb_failing")))
                        .thenThrow(new BusinessException(
                                ResponseEnum.REPO_CREATE_RAGFLOW_FAILED,
                                "RAGFlow unreachable"));

                assertThatThrownBy(() -> repoService.createRepo(mockRepoVO))
                        .isInstanceOf(BusinessException.class)
                        .extracting("responseEnum")
                        .isEqualTo(ResponseEnum.REPO_CREATE_RAGFLOW_FAILED);

                verify(repoMapper, never()).insert(any(Repo.class));
            }
        }

        @Test
        @DisplayName("createRepo with non-Ragflow tag does not call RAGFlow")
        void createRepo_nonRagflowTag_skipsRagflow() {
            try (MockedStatic<UserInfoManagerHandler> userMock = mockStatic(UserInfoManagerHandler.class);
                    MockedStatic<SpaceInfoUtil> spaceMock = mockStatic(SpaceInfoUtil.class)) {

                userMock.when(UserInfoManagerHandler::getUserId).thenReturn("user-001");
                spaceMock.when(SpaceInfoUtil::getSpaceId).thenReturn(null);

                mockRepoVO.setName("cbg_kb");
                mockRepoVO.setTag(ProjectContent.FILE_SOURCE_CBG_RAG_STR);
                mockRepoVO.setVisibility(0);

                when(repoMapper.selectOne(any(), anyBoolean())).thenReturn(null);
                when(repoMapper.insert(any(Repo.class))).thenAnswer(invocation -> {
                    Repo r = invocation.getArgument(0);
                    r.setId(43L);
                    return 1;
                });
                doNothing().when(groupVisibilityService).setRepoVisibility(anyLong(), anyInt(), anyInt(), anyList());

                Repo saved = repoService.createRepo(mockRepoVO);

                assertThat(saved.getRagflowDatasetId()).isNull();
                verifyNoInteractions(knowledgeV2ServiceCallHandler);
            }
        }
    }

    /**
     * Test cases for the getOnly methods. Validates repository query functionality with different
     * wrapper types.
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
            QueryWrapper<Repo> wrapper = new QueryWrapper<>();
            wrapper.eq("name", "Test Repository");

            when(repoMapper.selectOne(any(), anyBoolean())).thenReturn(mockRepo);

            // When
            Repo result = repoService.getOnly(wrapper);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getName()).isEqualTo("Test Repository");
            verify(repoMapper, times(1)).selectOne(any(), anyBoolean());
        }

        /**
         * Test getOnly with QueryWrapper - no result found.
         */
        @Test
        @DisplayName("getOnly with QueryWrapper - no result")
        void testGetOnly_QueryWrapper_NoResult() {
            // Given
            QueryWrapper<Repo> wrapper = new QueryWrapper<>();
            wrapper.eq("name", "Nonexistent Repository");

            when(repoMapper.selectOne(any(), anyBoolean())).thenReturn(null);

            // When
            Repo result = repoService.getOnly(wrapper);

            // Then
            assertThat(result).isNull();
            verify(repoMapper, times(1)).selectOne(any(), anyBoolean());
        }

        /**
         * Test getOnly with LambdaQueryWrapper successfully.
         */
        @Test
        @DisplayName("getOnly with LambdaQueryWrapper - success")
        void testGetOnly_LambdaQueryWrapper_Success() {
            // Given
            LambdaQueryWrapper<Repo> wrapper = new LambdaQueryWrapper<>();
            wrapper.eq(Repo::getName, "Test Repository");

            when(repoMapper.selectOne(any(), anyBoolean())).thenReturn(mockRepo);

            // When
            Repo result = repoService.getOnly(wrapper);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getName()).isEqualTo("Test Repository");
            verify(repoMapper, times(1)).selectOne(any(), anyBoolean());
        }

        /**
         * Test getOnly with LambdaQueryWrapper - no result found.
         */
        @Test
        @DisplayName("getOnly with LambdaQueryWrapper - no result")
        void testGetOnly_LambdaQueryWrapper_NoResult() {
            // Given
            LambdaQueryWrapper<Repo> wrapper = new LambdaQueryWrapper<>();
            wrapper.eq(Repo::getName, "Nonexistent Repository");

            when(repoMapper.selectOne(any(), anyBoolean())).thenReturn(null);

            // When
            Repo result = repoService.getOnly(wrapper);

            // Then
            assertThat(result).isNull();
            verify(repoMapper, times(1)).selectOne(any(), anyBoolean());
        }
    }

    /**
     * Test cases for edge cases and boundary conditions.
     */
    @Nested
    @DisplayName("Edge Case Tests")
    class EdgeCaseTests {

        /**
         * Test createRepo with null RepoVO.
         */
        @Test
        @DisplayName("Create repository - null RepoVO")
        void testCreateRepo_NullRepoVO() {
            // When & Then
            assertThatThrownBy(() -> repoService.createRepo(null))
                    .isInstanceOf(NullPointerException.class);
        }

        /**
         * Test createRepo with empty name.
         */
        @Test
        @DisplayName("Create repository - empty name")
        void testCreateRepo_EmptyName() {
            try (MockedStatic<UserInfoManagerHandler> userMock = mockStatic(UserInfoManagerHandler.class);
                    MockedStatic<SpaceInfoUtil> spaceMock = mockStatic(SpaceInfoUtil.class)) {

                // Setup static mocks
                userMock.when(UserInfoManagerHandler::getUserId).thenReturn("user-001");
                spaceMock.when(SpaceInfoUtil::getSpaceId).thenReturn(null);

                // Given
                mockRepoVO.setName("");

                when(repoMapper.selectOne(any(), anyBoolean())).thenReturn(null);
                when(repoMapper.insert(any(Repo.class))).thenAnswer(invocation -> {
                    Repo repo = invocation.getArgument(0);
                    repo.setId(1L);
                    return 1;
                });
                doNothing().when(groupVisibilityService).setRepoVisibility(anyLong(), anyInt(), anyInt(), anyList());

                // When
                Repo result = repoService.createRepo(mockRepoVO);

                // Then
                assertThat(result).isNotNull();
                verify(repoMapper, times(1)).insert(any(Repo.class));
            }
        }

        /**
         * Test createRepo with very long name.
         */
        @Test
        @DisplayName("Create repository - very long name")
        void testCreateRepo_VeryLongName() {
            try (MockedStatic<UserInfoManagerHandler> userMock = mockStatic(UserInfoManagerHandler.class);
                    MockedStatic<SpaceInfoUtil> spaceMock = mockStatic(SpaceInfoUtil.class)) {

                // Setup static mocks
                userMock.when(UserInfoManagerHandler::getUserId).thenReturn("user-001");
                spaceMock.when(SpaceInfoUtil::getSpaceId).thenReturn(null);

                // Given
                mockRepoVO.setName("A".repeat(500));

                when(repoMapper.selectOne(any(), anyBoolean())).thenReturn(null);
                when(repoMapper.insert(any(Repo.class))).thenAnswer(invocation -> {
                    Repo repo = invocation.getArgument(0);
                    repo.setId(1L);
                    return 1;
                });
                doNothing().when(groupVisibilityService).setRepoVisibility(anyLong(), anyInt(), anyInt(), anyList());

                // When
                Repo result = repoService.createRepo(mockRepoVO);

                // Then
                assertThat(result).isNotNull();
                verify(repoMapper, times(1)).insert(any(Repo.class));
            }
        }

        /**
         * Test createRepo with null tag.
         */
        @Test
        @DisplayName("Create repository - null tag")
        void testCreateRepo_NullTag() {
            try (MockedStatic<UserInfoManagerHandler> userMock = mockStatic(UserInfoManagerHandler.class);
                    MockedStatic<SpaceInfoUtil> spaceMock = mockStatic(SpaceInfoUtil.class)) {

                // Setup static mocks
                userMock.when(UserInfoManagerHandler::getUserId).thenReturn("user-001");
                spaceMock.when(SpaceInfoUtil::getSpaceId).thenReturn(null);

                // Given
                mockRepoVO.setTag(null);

                when(repoMapper.selectOne(any(), anyBoolean())).thenReturn(null);

                // When & Then
                assertThatThrownBy(() -> repoService.createRepo(mockRepoVO))
                        .isInstanceOf(BusinessException.class);

                verify(repoMapper, never()).insert(any(Repo.class));
            }
        }
    }

    /**
     * Test cases for exception scenarios.
     */
    @Nested
    @DisplayName("Exception Tests")
    class ExceptionTests {

        /**
         * Test createRepo when database insert fails.
         */
        @Test
        @DisplayName("Create repository - database insert fails")
        void testCreateRepo_DatabaseInsertFails() {
            try (MockedStatic<UserInfoManagerHandler> userMock = mockStatic(UserInfoManagerHandler.class);
                    MockedStatic<SpaceInfoUtil> spaceMock = mockStatic(SpaceInfoUtil.class)) {

                // Setup static mocks
                userMock.when(UserInfoManagerHandler::getUserId).thenReturn("user-001");
                spaceMock.when(SpaceInfoUtil::getSpaceId).thenReturn(null);

                // Given
                when(repoMapper.selectOne(any(), anyBoolean())).thenReturn(null);
                when(repoMapper.insert(any(Repo.class))).thenThrow(new RuntimeException("Database error"));

                // When & Then
                assertThatThrownBy(() -> repoService.createRepo(mockRepoVO))
                        .isInstanceOf(RuntimeException.class)
                        .hasMessageContaining("Database error");

                verify(groupVisibilityService, never()).setRepoVisibility(anyLong(), anyInt(), anyInt(), anyList());
            }
        }

        /**
         * Test createRepo when visibility service fails.
         */
        @Test
        @DisplayName("Create repository - visibility service fails")
        void testCreateRepo_VisibilityServiceFails() {
            try (MockedStatic<UserInfoManagerHandler> userMock = mockStatic(UserInfoManagerHandler.class);
                    MockedStatic<SpaceInfoUtil> spaceMock = mockStatic(SpaceInfoUtil.class)) {

                // Setup static mocks
                userMock.when(UserInfoManagerHandler::getUserId).thenReturn("user-001");
                spaceMock.when(SpaceInfoUtil::getSpaceId).thenReturn(null);

                // Given
                when(repoMapper.selectOne(any(), anyBoolean())).thenReturn(null);
                when(repoMapper.insert(any(Repo.class))).thenAnswer(invocation -> {
                    Repo repo = invocation.getArgument(0);
                    repo.setId(1L); // Must set ID for visibility service call
                    return 1;
                });
                doThrow(new RuntimeException("Visibility service error"))
                        .when(groupVisibilityService)
                        .setRepoVisibility(anyLong(), anyInt(), anyInt(), anyList());

                // When & Then
                assertThatThrownBy(() -> repoService.createRepo(mockRepoVO))
                        .isInstanceOf(RuntimeException.class)
                        .hasMessageContaining("Visibility service error");

                verify(repoMapper, times(1)).insert(any(Repo.class));
            }
        }

        /**
         * Test getOnly with QueryWrapper when database query fails.
         */
        @Test
        @DisplayName("getOnly with QueryWrapper - database query fails")
        void testGetOnly_QueryWrapper_DatabaseQueryFails() {
            // Given
            QueryWrapper<Repo> wrapper = new QueryWrapper<>();
            wrapper.eq("name", "Test Repository");

            when(repoMapper.selectOne(any(), anyBoolean()))
                    .thenThrow(new RuntimeException("Database query error"));

            // When & Then
            assertThatThrownBy(() -> repoService.getOnly(wrapper))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessageContaining("Database query error");
        }
    }

    /**
     * Test cases for the updateRepo method.
     */
    @Nested
    @DisplayName("updateRepo Tests")
    class UpdateRepoTests {

        /**
         * Test successful repository update.
         */
        @Test
        @DisplayName("Update repository successfully")
        void testUpdateRepo_Success() {
            // Given
            mockRepoVO.setId(1L);
            mockRepoVO.setName("Updated Repository");
            mockRepoVO.setDesc("Updated Description");

            when(repoMapper.selectById(1L)).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
            when(repoMapper.selectOne(any(), anyBoolean())).thenReturn(null);
            when(repoMapper.updateById(any(Repo.class))).thenReturn(1);
            doNothing().when(groupVisibilityService).setRepoVisibility(anyLong(), anyInt(), anyInt(), anyList());

            // When
            Repo result = repoService.updateRepo(mockRepoVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getName()).isEqualTo("Updated Repository");
            assertThat(result.getDescription()).isEqualTo("Updated Description");
            verify(repoMapper, times(1)).updateById(any(Repo.class));
            verify(groupVisibilityService, times(1)).setRepoVisibility(eq(1L), eq(1), eq(0), anyList());
        }

        /**
         * Test update repository - repository does not exist.
         */
        @Test
        @DisplayName("Update repository - repository not exist")
        void testUpdateRepo_RepoNotExist() {
            // Given
            mockRepoVO.setId(999L);

            when(repoMapper.selectById(999L)).thenReturn(null);

            // When & Then
            assertThatThrownBy(() -> repoService.updateRepo(mockRepoVO))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_NOT_EXIST);

            verify(repoMapper, never()).updateById(any(Repo.class));
        }

        /**
         * Test update repository - duplicate name with another repository.
         */
        @Test
        @DisplayName("Update repository - duplicate name")
        void testUpdateRepo_DuplicateName() {
            // Given
            mockRepoVO.setId(1L);
            mockRepoVO.setName("Duplicate Name");

            Repo anotherRepo = new Repo();
            anotherRepo.setId(2L);
            anotherRepo.setName("Duplicate Name");

            when(repoMapper.selectById(1L)).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
            when(repoMapper.selectOne(any(), anyBoolean())).thenReturn(anotherRepo);

            // When & Then
            assertThatThrownBy(() -> repoService.updateRepo(mockRepoVO))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_NAME_DUPLICATE);

            verify(repoMapper, never()).updateById(any(Repo.class));
        }

        /**
         * Test update repository - same name as current repository (should succeed).
         */
        @Test
        @DisplayName("Update repository - same name as self")
        void testUpdateRepo_SameNameAsSelf() {
            // Given
            mockRepoVO.setId(1L);
            mockRepoVO.setName("Test Repository");

            when(repoMapper.selectById(1L)).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
            when(repoMapper.selectOne(any(), anyBoolean())).thenReturn(mockRepo);
            when(repoMapper.updateById(any(Repo.class))).thenReturn(1);
            doNothing().when(groupVisibilityService).setRepoVisibility(anyLong(), anyInt(), anyInt(), anyList());

            // When
            Repo result = repoService.updateRepo(mockRepoVO);

            // Then
            assertThat(result).isNotNull();
            verify(repoMapper, times(1)).updateById(any(Repo.class));
        }

        /**
         * Test update repository with visibility change.
         */
        @Test
        @DisplayName("Update repository - change visibility")
        void testUpdateRepo_ChangeVisibility() {
            // Given
            mockRepoVO.setId(1L);
            mockRepoVO.setVisibility(1);
            mockRepoVO.setUids(Arrays.asList("user-002", "user-003"));

            when(repoMapper.selectById(1L)).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
            when(repoMapper.selectOne(any(), anyBoolean())).thenReturn(null);
            when(repoMapper.updateById(any(Repo.class))).thenReturn(1);
            doNothing().when(groupVisibilityService).setRepoVisibility(anyLong(), anyInt(), anyInt(), anyList());

            // When
            Repo result = repoService.updateRepo(mockRepoVO);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getVisibility()).isEqualTo(1);
            verify(groupVisibilityService, times(1)).setRepoVisibility(eq(1L), eq(1), eq(1), anyList());
        }
    }

    /**
     * Test cases for the setTop method.
     */
    @Nested
    @DisplayName("setTop Tests")
    class SetTopTests {

        /**
         * Test setTop - set repository to top.
         */
        @Test
        @DisplayName("setTop - set to top")
        void testSetTop_SetToTop() {
            // Given
            mockRepo.setIsTop(false);

            when(repoMapper.selectById(1L)).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
            when(repoMapper.updateById(any(Repo.class))).thenReturn(1);

            // When
            repoService.setTop(1L);

            // Then
            verify(repoMapper, times(1)).updateById(any(Repo.class));
            assertThat(mockRepo.getIsTop()).isTrue();
        }

        /**
         * Test setTop - unset repository from top.
         */
        @Test
        @DisplayName("setTop - unset from top")
        void testSetTop_UnsetFromTop() {
            // Given
            mockRepo.setIsTop(true);

            when(repoMapper.selectById(1L)).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
            when(repoMapper.updateById(any(Repo.class))).thenReturn(1);

            // When
            repoService.setTop(1L);

            // Then
            verify(repoMapper, times(1)).updateById(any(Repo.class));
            assertThat(mockRepo.getIsTop()).isFalse();
        }

        /**
         * Test setTop - repository does not exist.
         */
        @Test
        @DisplayName("setTop - repository not found")
        void testSetTop_RepoNotFound() {
            // Given
            when(repoMapper.selectById(999L)).thenReturn(null);

            // When & Then
            assertThatThrownBy(() -> repoService.setTop(999L))
                    .isInstanceOf(NullPointerException.class);

            verify(repoMapper, never()).updateById(any(Repo.class));
        }
    }

    /**
     * Test cases for the enableRepo method.
     */
    @Nested
    @DisplayName("enableRepo Tests")
    class EnableRepoTests {

        /**
         * Test enableRepo - enable from created status.
         */
        @Test
        @DisplayName("enableRepo - enable from created status")
        void testEnableRepo_EnableFromCreated() {
            // Given
            mockRepo.setStatus(ProjectContent.REPO_STATUS_CREATED);

            when(repoMapper.selectById(1L)).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));

            // When
            repoService.enableRepo(1L, 0);

            // Then
            verify(repoMapper, times(1)).selectById(1L);
        }

        /**
         * Test enableRepo - enable from unpublished status.
         */
        @Test
        @DisplayName("enableRepo - enable from unpublished status")
        void testEnableRepo_EnableFromUnpublished() {
            // Given
            mockRepo.setStatus(ProjectContent.REPO_STATUS_UNPUBLISHED);

            when(repoMapper.selectById(1L)).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));

            // When
            repoService.enableRepo(1L, 1);

            // Then
            verify(repoMapper, times(1)).selectById(1L);
        }

        /**
         * Test enableRepo - illegal status transition.
         */
        @Test
        @DisplayName("enableRepo - illegal status transition")
        void testEnableRepo_IllegalStatusTransition() {
            // Given
            mockRepo.setStatus(ProjectContent.REPO_STATUS_CREATED);

            when(repoMapper.selectById(1L)).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));

            // When & Then
            assertThatThrownBy(() -> repoService.enableRepo(1L, 1))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_STATUS_ILLEGAL);
        }

        /**
         * Test enableRepo - repository does not exist.
         */
        @Test
        @DisplayName("enableRepo - repository not exist")
        void testEnableRepo_RepoNotExist() {
            // Given
            when(repoMapper.selectById(999L)).thenReturn(null);

            // When & Then
            assertThatThrownBy(() -> repoService.enableRepo(999L, 1))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_NOT_EXIST);
        }
    }

    /**
     * Test cases for the listFiles method.
     */
    @Nested
    @DisplayName("listFiles Tests")
    class ListFilesTests {

        /**
         * Test listFiles - successful retrieval.
         */
        @Test
        @DisplayName("listFiles - success")
        void testListFiles_Success() {
            // Given
            List<FileInfoV2> mockFiles = new ArrayList<>();
            FileInfoV2 file1 = new FileInfoV2();
            file1.setId(1L);
            file1.setName("file1.txt");
            mockFiles.add(file1);

            when(repoMapper.selectById(1L)).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
            when(fileInfoV2Mapper.listFiles(1L)).thenReturn(mockFiles);

            // When
            Object result = repoService.listFiles(1L);

            // Then
            assertThat(result).isNotNull();
            assertThat(result).isInstanceOf(List.class);
            verify(fileInfoV2Mapper, times(1)).listFiles(1L);
        }

        /**
         * Test listFiles - empty list.
         */
        @Test
        @DisplayName("listFiles - empty list")
        void testListFiles_EmptyList() {
            // Given
            when(repoMapper.selectById(1L)).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
            when(fileInfoV2Mapper.listFiles(1L)).thenReturn(new ArrayList<>());

            // When
            Object result = repoService.listFiles(1L);

            // Then
            assertThat(result).isNotNull();
            assertThat(result).isInstanceOf(List.class);
            assertThat(((List<?>) result)).isEmpty();
        }
    }

    /**
     * Test cases for the deleteRepo method.
     */
    @Nested
    @DisplayName("deleteRepo Tests")
    class DeleteRepoTests {

        /**
         * Test deleteRepo - successful deletion.
         */
        @Test
        @DisplayName("deleteRepo - success")
        void testDeleteRepo_Success() {
            // Given
            when(repoMapper.selectById(1L)).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
            when(botRepoRelService.count(any())).thenReturn(0L);
            when(repoMapper.updateById(any(Repo.class))).thenReturn(1);
            when(fileInfoV2Mapper.getFileInfoV2ByRepoId(1L)).thenReturn(new ArrayList<>());

            // When
            Object result = repoService.deleteRepo(1L, "AIUI-RAG2", mockRequest);

            // Then
            assertThat(result).isNotNull();
            verify(repoMapper, times(1)).updateById(any(Repo.class));
            assertThat(mockRepo.getDeleted()).isTrue();
        }

        /**
         * Test deleteRepo - repository not exist.
         */
        @Test
        @DisplayName("deleteRepo - repository not exist")
        void testDeleteRepo_RepoNotExist() {
            // Given
            when(repoMapper.selectById(999L)).thenReturn(null);

            // When & Then
            assertThatThrownBy(() -> repoService.deleteRepo(999L, "AIUI-RAG2", mockRequest))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_NOT_EXIST);
        }

        /**
         * Test deleteRepo - repository in use by bots.
         */
        @Test
        @DisplayName("deleteRepo - repository in use")
        void testDeleteRepo_InUse() {
            // Given
            when(repoMapper.selectById(1L)).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
            when(botRepoRelService.count(any())).thenReturn(1L);

            // When & Then
            assertThatThrownBy(() -> repoService.deleteRepo(1L, "AIUI-RAG2", mockRequest))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_DELETE_FAILED_BOT_USED);

            verify(repoMapper, never()).updateById(any(Repo.class));
        }

        /**
         * Test deleteRepo - delete Spark platform repository. Tests the Spark-compatible tag branch that
         * delegates to deleteXinghuoDataset.
         */
        @Test
        @DisplayName("deleteRepo - Spark platform repository")
        void testDeleteRepo_SparkRepository() {
            try (MockedStatic<com.iflytek.astron.console.toolkit.util.OkHttpUtil> okHttpMock =
                    mockStatic(com.iflytek.astron.console.toolkit.util.OkHttpUtil.class)) {

                // Given
                when(apiUrl.getDeleteXinghuoDatasetUrl()).thenReturn("https://api.example.com/delete");

                JSONObject mockResponse = new JSONObject();
                mockResponse.put("code", 0);
                mockResponse.put("message", "success");

                okHttpMock.when(() -> com.iflytek.astron.console.toolkit.util.OkHttpUtil.post(
                        anyString(), any(Map.class), any(Map.class), any()))
                        .thenReturn(mockResponse.toJSONString());

                // When - Use Spark-compatible tag to trigger Spark deletion path
                Object result = repoService.deleteRepo(100L, "SparkDesk-RAG", mockRequest);

                // Then
                assertThat(result).isNotNull();
                assertThat(result).isInstanceOf(JSONObject.class);
                JSONObject jsonResult = (JSONObject) result;
                assertThat(jsonResult.getInteger("code")).isEqualTo(0);

                // Verify Spark deletion API was called
                okHttpMock.verify(() -> com.iflytek.astron.console.toolkit.util.OkHttpUtil.post(
                        anyString(), any(Map.class), any(Map.class), any()), times(1));

                // Verify local repo deletion methods were NOT called
                verify(repoMapper, never()).selectById(anyLong());
                verify(repoMapper, never()).updateById(any(Repo.class));
            }
        }
    }

    /**
     * Test cases for the updateRepoStatus method.
     */
    @Nested
    @DisplayName("updateRepoStatus Tests")
    class UpdateRepoStatusTests {

        /**
         * Test updateRepoStatus - always returns true (logic commented out).
         */
        @Test
        @DisplayName("updateRepoStatus - returns true")
        void testUpdateRepoStatus_ReturnsTrue() {
            // Given
            mockRepoVO.setOperType(2);

            // When
            boolean result = repoService.updateRepoStatus(mockRepoVO);

            // Then
            assertThat(result).isTrue();
        }
    }

    /**
     * Test cases for the listHitTestHistoryByPage method.
     */
    @Nested
    @DisplayName("listHitTestHistoryByPage Tests")
    class ListHitTestHistoryByPageTests {

        /**
         * Test listHitTestHistoryByPage - successful retrieval.
         */
        @Test
        @DisplayName("listHitTestHistoryByPage - success")
        void testListHitTestHistoryByPage_Success() {
            // Given
            List<HitTestHistory> mockHistoryList = new ArrayList<>();
            HitTestHistory history1 = new HitTestHistory();
            history1.setId(1L);
            history1.setQuery("test query");
            mockHistoryList.add(history1);

            when(historyService.count(any(LambdaQueryWrapper.class))).thenReturn(1L);
            when(historyService.list(any(LambdaQueryWrapper.class))).thenReturn(mockHistoryList);

            // When
            PageData<HitTestHistory> result = repoService.listHitTestHistoryByPage(1L, 1, 10);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getTotalCount()).isEqualTo(1L);
            assertThat(result.getPageData()).hasSize(1);
        }

        /**
         * Test listHitTestHistoryByPage - empty list.
         */
        @Test
        @DisplayName("listHitTestHistoryByPage - empty list")
        void testListHitTestHistoryByPage_EmptyList() {
            // Given
            when(historyService.count(any(LambdaQueryWrapper.class))).thenReturn(0L);
            when(historyService.list(any(LambdaQueryWrapper.class))).thenReturn(new ArrayList<>());

            // When
            PageData<HitTestHistory> result = repoService.listHitTestHistoryByPage(1L, 1, 10);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getTotalCount()).isEqualTo(0L);
            assertThat(result.getPageData()).isEmpty();
        }
    }

    /**
     * Test cases for the getRepoUseStatus method.
     */
    @Nested
    @DisplayName("getRepoUseStatus Tests")
    class GetRepoUseStatusTests {

        /**
         * Test getRepoUseStatus - repository is in use.
         */
        @Test
        @DisplayName("getRepoUseStatus - in use")
        void testGetRepoUseStatus_InUse() {
            // Given
            List<SparkBotVO> mockBots = new ArrayList<>();
            SparkBotVO bot = new SparkBotVO();
            bot.setUuid("bot-001");
            mockBots.add(bot);

            when(repoMapper.selectById(1L)).thenReturn(mockRepo);
            when(sparkBotMapper.listSparkBotByRepoId(1L, "user-001")).thenReturn(mockBots);
            when(flowRepoRelMapper.selectList(any())).thenReturn(new ArrayList<>());
            when(datasetFileService.getMaasDataset(1L)).thenReturn(new ArrayList<>());

            // When
            Object result = repoService.getRepoUseStatus(1L, mockRequest);

            // Then
            assertThat(result).isNotNull();
            assertThat(result).isInstanceOf(Boolean.class);
            assertThat((Boolean) result).isTrue();
        }

        /**
         * Test getRepoUseStatus - repository is not in use.
         */
        @Test
        @DisplayName("getRepoUseStatus - not in use")
        void testGetRepoUseStatus_NotInUse() {
            // Given
            when(repoMapper.selectById(1L)).thenReturn(mockRepo);
            when(sparkBotMapper.listSparkBotByRepoId(1L, "user-001")).thenReturn(new ArrayList<>());
            when(flowRepoRelMapper.selectList(any())).thenReturn(new ArrayList<>());
            when(datasetFileService.getMaasDataset(1L)).thenReturn(new ArrayList<>());

            // When
            Object result = repoService.getRepoUseStatus(1L, mockRequest);

            // Then
            assertThat(result).isNotNull();
            assertThat(result).isInstanceOf(Boolean.class);
            assertThat((Boolean) result).isFalse();
        }
    }

    /**
     * Test cases for the getDetail method.
     */
    @Nested
    @DisplayName("getDetail Tests")
    class GetDetailTests {

        /**
         * Test getDetail - successful retrieval for AIUI tag.
         */
        @Test
        @DisplayName("getDetail - success with AIUI tag")
        void testGetDetail_Success_AIUITag() {
            // Given
            List<FileInfoV2> mockFiles = new ArrayList<>();
            FileInfoV2 file1 = new FileInfoV2();
            file1.setId(1L);
            file1.setUuid("file-uuid-001");
            file1.setCharCount(1000L);
            mockFiles.add(file1);

            when(repoMapper.selectById(1L)).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
            doNothing().when(dataPermissionCheckTool).checkRepoVisible(any(Repo.class));
            when(s3UtilClient.getS3Prefix()).thenReturn("https://s3.example.com/");
            when(sparkBotMapper.listSparkBotByRepoId(1L, "user-001")).thenReturn(new ArrayList<>());
            when(fileInfoV2Mapper.getFileInfoV2ByRepoId(1L)).thenReturn(mockFiles);
            when(knowledgeMapper.countByFileId("file-uuid-001")).thenReturn(10L);

            // When
            RepoDto result = repoService.getDetail(1L, "AIUI-RAG2", mockRequest);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getFileCount()).isEqualTo(1L);
            assertThat(result.getCharCount()).isEqualTo(1000L);
            assertThat(result.getKnowledgeCount()).isEqualTo(10L);
            assertThat(result.getTag()).isEqualTo("AIUI-RAG2");
        }

        /**
         * Test getDetail - repository not exist.
         */
        @Test
        @DisplayName("getDetail - repository not exist")
        void testGetDetail_RepoNotExist() {
            // Given
            when(repoMapper.selectById(999L)).thenReturn(null);

            // When & Then
            assertThatThrownBy(() -> repoService.getDetail(999L, "AIUI-RAG2", mockRequest))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_NOT_EXIST);
        }

        /**
         * Test getDetail - empty file list.
         */
        @Test
        @DisplayName("getDetail - empty file list")
        void testGetDetail_EmptyFileList() {
            // Given
            when(repoMapper.selectById(1L)).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
            doNothing().when(dataPermissionCheckTool).checkRepoVisible(any(Repo.class));
            when(s3UtilClient.getS3Prefix()).thenReturn("https://s3.example.com/");
            when(sparkBotMapper.listSparkBotByRepoId(1L, "user-001")).thenReturn(new ArrayList<>());
            when(fileInfoV2Mapper.getFileInfoV2ByRepoId(1L)).thenReturn(new ArrayList<>());

            // When
            RepoDto result = repoService.getDetail(1L, "AIUI-RAG2", mockRequest);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getFileCount()).isEqualTo(0L);
            assertThat(result.getCharCount()).isEqualTo(0L);
            assertThat(result.getKnowledgeCount()).isEqualTo(0L);
        }
    }

    /**
     * Test cases for the list method with various scenarios to improve coverage.
     */
    @Nested
    @DisplayName("list Tests")
    class ListMethodTests {

        @Test
        @DisplayName("list - basic pagination without filters")
        void testList_BasicPagination() {
            try (MockedStatic<UserInfoManagerHandler> userMock = mockStatic(UserInfoManagerHandler.class);
                    MockedStatic<SpaceInfoUtil> spaceMock = mockStatic(SpaceInfoUtil.class);
                    MockedStatic<com.iflytek.astron.console.toolkit.util.OkHttpUtil> okHttpMock =
                            mockStatic(com.iflytek.astron.console.toolkit.util.OkHttpUtil.class)) {

                // Setup
                userMock.when(UserInfoManagerHandler::getUserId).thenReturn("user-001");
                spaceMock.when(SpaceInfoUtil::getSpaceId).thenReturn(null);

                // Mock external API call to prevent NullPointerException
                when(apiUrl.getDatasetUrl()).thenReturn("https://api.example.com/dataset");
                okHttpMock.when(() -> com.iflytek.astron.console.toolkit.util.OkHttpUtil.get(anyString(), any(Map.class)))
                        .thenReturn("{\"data\":null}");

                List<RepoDto> mockRepos = createMockRepoDtoList();
                when(groupVisibilityService.getRepoVisibilityList()).thenReturn(new ArrayList<>());
                when(repoMapper.list(anyString(), any(), anyList(), any(), any())).thenReturn(mockRepos);
                when(configInfoMapper.getListByCategoryAndCode("ICON", "rag")).thenReturn(createMockConfigInfos());
                when(directoryTreeService.list(any(LambdaQueryWrapper.class))).thenReturn(new ArrayList<>());
                when(s3UtilClient.getS3Prefix()).thenReturn("https://s3.example.com/");
                doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(RepoDto.class));

                // When
                PageData<RepoDto> result = repoService.list(1, 10, null, null, mockRequest, null);

                // Then
                assertThat(result).isNotNull();
                assertThat(result.getPageData()).isNotEmpty();
                assertThat(result.getTotalCount()).isEqualTo(mockRepos.size());
                verify(repoMapper, times(1)).list(anyString(), any(), anyList(), any(), any());
            }
        }

        @Test
        @DisplayName("list - with content filter")
        void testList_WithContentFilter() {
            try (MockedStatic<UserInfoManagerHandler> userMock = mockStatic(UserInfoManagerHandler.class);
                    MockedStatic<SpaceInfoUtil> spaceMock = mockStatic(SpaceInfoUtil.class);
                    MockedStatic<com.iflytek.astron.console.toolkit.util.OkHttpUtil> okHttpMock =
                            mockStatic(com.iflytek.astron.console.toolkit.util.OkHttpUtil.class)) {

                userMock.when(UserInfoManagerHandler::getUserId).thenReturn("user-001");
                spaceMock.when(SpaceInfoUtil::getSpaceId).thenReturn(null);

                // Mock external API call
                when(apiUrl.getDatasetUrl()).thenReturn("https://api.example.com/dataset");
                okHttpMock.when(() -> com.iflytek.astron.console.toolkit.util.OkHttpUtil.get(anyString(), any(Map.class)))
                        .thenReturn("{\"data\":null}");

                List<RepoDto> mockRepos = createMockRepoDtoList();
                when(groupVisibilityService.getRepoVisibilityList()).thenReturn(new ArrayList<>());
                when(repoMapper.list(anyString(), any(), anyList(), eq("test"), any())).thenReturn(mockRepos);
                when(configInfoMapper.getListByCategoryAndCode("ICON", "rag")).thenReturn(createMockConfigInfos());
                when(directoryTreeService.list(any(LambdaQueryWrapper.class))).thenReturn(new ArrayList<>());
                when(s3UtilClient.getS3Prefix()).thenReturn("https://s3.example.com/");
                doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(RepoDto.class));

                // When
                PageData<RepoDto> result = repoService.list(1, 10, "test", null, mockRequest, null);

                // Then
                assertThat(result).isNotNull();
                verify(repoMapper, times(1)).list(anyString(), any(), anyList(), eq("test"), any());
            }
        }

        @Test
        @DisplayName("list - with tag filter")
        void testList_WithTagFilter() {
            try (MockedStatic<UserInfoManagerHandler> userMock = mockStatic(UserInfoManagerHandler.class);
                    MockedStatic<SpaceInfoUtil> spaceMock = mockStatic(SpaceInfoUtil.class);
                    MockedStatic<com.iflytek.astron.console.toolkit.util.OkHttpUtil> okHttpMock =
                            mockStatic(com.iflytek.astron.console.toolkit.util.OkHttpUtil.class)) {

                userMock.when(UserInfoManagerHandler::getUserId).thenReturn("user-001");
                spaceMock.when(SpaceInfoUtil::getSpaceId).thenReturn(null);

                // Mock external API call
                when(apiUrl.getDatasetUrl()).thenReturn("https://api.example.com/dataset");
                okHttpMock.when(() -> com.iflytek.astron.console.toolkit.util.OkHttpUtil.get(anyString(), any(Map.class)))
                        .thenReturn("{\"data\":null}");

                List<RepoDto> mockRepos = createMockRepoDtoList();
                when(groupVisibilityService.getRepoVisibilityList()).thenReturn(new ArrayList<>());
                when(repoMapper.list(anyString(), any(), anyList(), any(), any())).thenReturn(mockRepos);
                when(configInfoMapper.getListByCategoryAndCode("ICON", "rag")).thenReturn(createMockConfigInfos());
                when(directoryTreeService.list(any(LambdaQueryWrapper.class))).thenReturn(new ArrayList<>());
                when(s3UtilClient.getS3Prefix()).thenReturn("https://s3.example.com/");
                doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(RepoDto.class));

                // When
                PageData<RepoDto> result = repoService.list(1, 10, null, null, mockRequest, "AIUI-RAG2");

                // Then
                assertThat(result).isNotNull();
                // All repos should be filtered to match the tag
                result.getPageData().forEach(repo -> assertThat(repo.getTag()).isEqualTo("AIUI-RAG2"));
            }
        }

        @Test
        @DisplayName("list - with visibility permissions")
        void testList_WithVisibilityPermissions() {
            try (MockedStatic<UserInfoManagerHandler> userMock = mockStatic(UserInfoManagerHandler.class);
                    MockedStatic<SpaceInfoUtil> spaceMock = mockStatic(SpaceInfoUtil.class);
                    MockedStatic<com.iflytek.astron.console.toolkit.util.OkHttpUtil> okHttpMock =
                            mockStatic(com.iflytek.astron.console.toolkit.util.OkHttpUtil.class)) {

                userMock.when(UserInfoManagerHandler::getUserId).thenReturn("user-001");
                spaceMock.when(SpaceInfoUtil::getSpaceId).thenReturn(null);

                // Mock external API call
                when(apiUrl.getDatasetUrl()).thenReturn("https://api.example.com/dataset");
                okHttpMock.when(() -> com.iflytek.astron.console.toolkit.util.OkHttpUtil.get(anyString(), any(Map.class)))
                        .thenReturn("{\"data\":null}");

                List<GroupVisibility> visibilityList = new ArrayList<>();
                GroupVisibility gv = new GroupVisibility();
                gv.setRelationId("1");
                visibilityList.add(gv);

                List<RepoDto> mockRepos = createMockRepoDtoList();
                when(groupVisibilityService.getRepoVisibilityList()).thenReturn(visibilityList);
                when(repoMapper.list(anyString(), any(), anyList(), any(), any())).thenReturn(mockRepos);
                when(configInfoMapper.getListByCategoryAndCode("ICON", "rag")).thenReturn(createMockConfigInfos());
                when(directoryTreeService.list(any(LambdaQueryWrapper.class))).thenReturn(new ArrayList<>());
                when(s3UtilClient.getS3Prefix()).thenReturn("https://s3.example.com/");
                doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(RepoDto.class));

                // When
                PageData<RepoDto> result = repoService.list(1, 10, null, null, mockRequest, null);

                // Then
                assertThat(result).isNotNull();
                verify(groupVisibilityService, times(1)).getRepoVisibilityList();
            }
        }

        @Test
        @DisplayName("list - with spaceId set")
        void testList_WithSpaceId() {
            try (MockedStatic<UserInfoManagerHandler> userMock = mockStatic(UserInfoManagerHandler.class);
                    MockedStatic<SpaceInfoUtil> spaceMock = mockStatic(SpaceInfoUtil.class)) {

                userMock.when(UserInfoManagerHandler::getUserId).thenReturn("user-001");
                spaceMock.when(SpaceInfoUtil::getSpaceId).thenReturn(100L);

                // No need to mock OkHttpUtil when spaceId is not null (getStarFireData won't be called)

                List<RepoDto> mockRepos = createMockRepoDtoList();
                when(groupVisibilityService.getRepoVisibilityList()).thenReturn(new ArrayList<>());
                when(repoMapper.list(anyString(), eq(100L), anyList(), any(), any())).thenReturn(mockRepos);
                when(configInfoMapper.getListByCategoryAndCode("ICON", "rag")).thenReturn(createMockConfigInfos());
                when(directoryTreeService.list(any(LambdaQueryWrapper.class))).thenReturn(new ArrayList<>());
                when(s3UtilClient.getS3Prefix()).thenReturn("https://s3.example.com/");
                doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(RepoDto.class));

                // When
                PageData<RepoDto> result = repoService.list(1, 10, null, null, mockRequest, null);

                // Then
                assertThat(result).isNotNull();
                verify(repoMapper, times(1)).list(anyString(), eq(100L), anyList(), any(), any());
            }
        }
    }

    /**
     * Test cases for createRepo with spaceId scenarios to improve branch coverage.
     */
    @Nested
    @DisplayName("createRepo SpaceId Tests")
    class CreateRepoSpaceIdTests {

        @Test
        @DisplayName("createRepo - with spaceId set")
        void testCreateRepo_WithSpaceId() {
            try (MockedStatic<UserInfoManagerHandler> userMock = mockStatic(UserInfoManagerHandler.class);
                    MockedStatic<SpaceInfoUtil> spaceMock = mockStatic(SpaceInfoUtil.class)) {

                userMock.when(UserInfoManagerHandler::getUserId).thenReturn("user-001");
                spaceMock.when(SpaceInfoUtil::getSpaceId).thenReturn(100L);

                mockRepoVO.setName("Test Repo with Space");

                when(repoMapper.selectOne(any(), anyBoolean())).thenReturn(null);
                when(repoMapper.insert(any(Repo.class))).thenAnswer(invocation -> {
                    Repo repo = invocation.getArgument(0);
                    repo.setId(1L);
                    assertThat(repo.getSpaceId()).isEqualTo(100L);
                    return 1;
                });
                doNothing().when(groupVisibilityService).setRepoVisibility(anyLong(), anyInt(), anyInt(), anyList());

                // When
                Repo result = repoService.createRepo(mockRepoVO);

                // Then
                assertThat(result).isNotNull();
                assertThat(result.getSpaceId()).isEqualTo(100L);
                verify(repoMapper, times(1)).insert(any(Repo.class));
            }
        }

        @Test
        @DisplayName("createRepo - spaceId duplicate name check")
        void testCreateRepo_SpaceIdDuplicateCheck() {
            try (MockedStatic<UserInfoManagerHandler> userMock = mockStatic(UserInfoManagerHandler.class);
                    MockedStatic<SpaceInfoUtil> spaceMock = mockStatic(SpaceInfoUtil.class)) {

                userMock.when(UserInfoManagerHandler::getUserId).thenReturn("user-001");
                spaceMock.when(SpaceInfoUtil::getSpaceId).thenReturn(100L);

                mockRepoVO.setName("Duplicate Repo");

                Repo existingRepo = new Repo();
                existingRepo.setId(1L);
                existingRepo.setName("Duplicate Repo");
                existingRepo.setSpaceId(100L);

                when(repoMapper.selectOne(any(), anyBoolean())).thenReturn(existingRepo);

                // When & Then
                assertThatThrownBy(() -> repoService.createRepo(mockRepoVO))
                        .isInstanceOf(BusinessException.class)
                        .extracting("responseEnum")
                        .isEqualTo(ResponseEnum.REPO_NAME_DUPLICATE);
            }
        }
    }

    /**
     * Test cases for updateRepo with spaceId scenarios.
     */
    @Nested
    @DisplayName("updateRepo SpaceId Tests")
    class UpdateRepoSpaceIdTests {

        @Test
        @DisplayName("updateRepo - with spaceId set")
        void testUpdateRepo_WithSpaceId() {
            try (MockedStatic<SpaceInfoUtil> spaceMock = mockStatic(SpaceInfoUtil.class)) {

                spaceMock.when(SpaceInfoUtil::getSpaceId).thenReturn(100L);

                mockRepoVO.setId(1L);
                mockRepoVO.setName("Updated Repo");
                mockRepo.setSpaceId(100L);

                when(repoMapper.selectById(1L)).thenReturn(mockRepo);
                doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
                when(repoMapper.selectOne(any(), anyBoolean())).thenReturn(null);
                when(repoMapper.updateById(any(Repo.class))).thenReturn(1);
                doNothing().when(groupVisibilityService).setRepoVisibility(anyLong(), anyInt(), anyInt(), anyList());

                // When
                Repo result = repoService.updateRepo(mockRepoVO);

                // Then
                assertThat(result).isNotNull();
                verify(repoMapper, times(1)).updateById(any(Repo.class));
            }
        }
    }

    /**
     * Test cases for the hitTest method.
     */
    @Nested
    @DisplayName("hitTest Tests")
    class HitTestTests {

        /**
         * Test hitTest - successful hit test.
         */
        @Test
        @DisplayName("hitTest - success")
        void testHitTest_Success() {
            // Given
            FileDirectoryTree tree1 = new FileDirectoryTree();
            tree1.setAppId("1");
            tree1.setFileId(1L);
            tree1.setIsFile(1);
            tree1.setHitCount(0L);

            FileInfoV2 file1 = new FileInfoV2();
            file1.setId(1L);
            file1.setUuid("file-uuid-001");
            file1.setEnabled(1);

            ChunkInfo chunk1 = new ChunkInfo();
            chunk1.setDocId("file-uuid-001");
            chunk1.setContent("test content");
            chunk1.setDataIndex("chunk-001");

            // Create JSON response data
            JSONObject chunkJson = new JSONObject();
            chunkJson.put("docId", "file-uuid-001");
            chunkJson.put("content", "test content");
            chunkJson.put("dataIndex", "chunk-001");

            JSONObject respDataJson = new JSONObject();
            respDataJson.put("results", new com.alibaba.fastjson2.JSONArray());
            respDataJson.getJSONArray("results").add(chunkJson);

            KnowledgeResponse knowledgeResponse = new KnowledgeResponse();
            knowledgeResponse.setCode(0);
            knowledgeResponse.setMessage("success");
            knowledgeResponse.setData(respDataJson);

            when(repoMapper.selectById(1L)).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
            when(directoryTreeService.list(any(LambdaQueryWrapper.class))).thenReturn(Arrays.asList(tree1));
            when(fileInfoV2Service.getById(1L)).thenReturn(file1);
            when(knowledgeV2ServiceCallHandler.knowledgeQuery(any(QueryRequest.class))).thenReturn(knowledgeResponse);
            when(historyService.save(any(HitTestHistory.class))).thenReturn(true);
            when(fileInfoV2Service.getOnly(any(QueryWrapper.class))).thenReturn(file1);
            when(directoryTreeService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(tree1);
            when(directoryTreeService.updateById(any(FileDirectoryTree.class))).thenReturn(true);

            // When
            Object result = repoService.hitTest(1L, "test query", 10, true);

            // Then
            assertThat(result).isNotNull();
            assertThat(result).isInstanceOf(List.class);
            verify(historyService, times(1)).save(any(HitTestHistory.class));
            verify(directoryTreeService, times(1)).updateById(any(FileDirectoryTree.class));
        }

        /**
         * Test hitTest - repository not exist.
         */
        @Test
        @DisplayName("hitTest - repository not exist")
        void testHitTest_RepoNotExist() {
            // Given
            when(repoMapper.selectById(999L)).thenReturn(null);

            // When & Then
            assertThatThrownBy(() -> repoService.hitTest(999L, "test query", 10, true))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_NOT_EXIST);
        }

        /**
         * Test hitTest - no files in directory tree.
         */
        @Test
        @DisplayName("hitTest - no files in directory")
        void testHitTest_NoFiles() {
            // Given
            when(repoMapper.selectById(1L)).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
            when(directoryTreeService.list(any(LambdaQueryWrapper.class))).thenReturn(new ArrayList<>());

            // When
            Object result = repoService.hitTest(1L, "test query", 10, true);

            // Then
            assertThat(result).isNotNull();
            assertThat(result).isInstanceOf(com.alibaba.fastjson2.JSONArray.class);
            verify(knowledgeV2ServiceCallHandler, never()).knowledgeQuery(any());
        }

        /**
         * Test hitTest - no enabled files.
         */
        @Test
        @DisplayName("hitTest - no enabled files")
        void testHitTest_NoEnabledFiles() {
            // Given
            FileDirectoryTree tree1 = new FileDirectoryTree();
            tree1.setAppId("1");
            tree1.setFileId(1L);
            tree1.setIsFile(1);

            FileInfoV2 file1 = new FileInfoV2();
            file1.setId(1L);
            file1.setEnabled(0); // Disabled file

            when(repoMapper.selectById(1L)).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
            when(directoryTreeService.list(any(LambdaQueryWrapper.class))).thenReturn(Arrays.asList(tree1));
            when(fileInfoV2Service.getById(1L)).thenReturn(file1);

            // When & Then
            assertThatThrownBy(() -> repoService.hitTest(1L, "test query", 10, true))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_FILE_DISABLED);
        }

        /**
         * Test hitTest - knowledge query fails.
         */
        @Test
        @DisplayName("hitTest - knowledge query fails")
        void testHitTest_QueryFails() {
            // Given
            FileDirectoryTree tree1 = new FileDirectoryTree();
            tree1.setAppId("1");
            tree1.setFileId(1L);
            tree1.setIsFile(1);

            FileInfoV2 file1 = new FileInfoV2();
            file1.setId(1L);
            file1.setEnabled(1);

            KnowledgeResponse knowledgeResponse = new KnowledgeResponse();
            knowledgeResponse.setCode(1); // Error code
            knowledgeResponse.setMessage("Query failed");

            when(repoMapper.selectById(1L)).thenReturn(mockRepo);
            doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
            when(directoryTreeService.list(any(LambdaQueryWrapper.class))).thenReturn(Arrays.asList(tree1));
            when(fileInfoV2Service.getById(1L)).thenReturn(file1);
            when(knowledgeV2ServiceCallHandler.knowledgeQuery(any(QueryRequest.class))).thenReturn(knowledgeResponse);

            // When & Then
            assertThatThrownBy(() -> repoService.hitTest(1L, "test query", 10, true))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.REPO_KNOWLEDGE_QUERY_FAILED);
        }

        /**
         * Test hitTest - CBG-RAG with references processing.
         */
        @Test
        @DisplayName("hitTest - CBG-RAG with references")
        void testHitTest_CbgRagWithReferences() {
            try (MockedStatic<UserInfoManagerHandler> userMock = mockStatic(UserInfoManagerHandler.class)) {

                userMock.when(UserInfoManagerHandler::getUserId).thenReturn("user-001");

                Repo cbgRepo = new Repo();
                cbgRepo.setId(1L);
                cbgRepo.setTag("CBG-RAG");
                cbgRepo.setCoreRepoId("core-001");

                FileDirectoryTree tree = new FileDirectoryTree();
                tree.setAppId("1");
                tree.setFileId(1L);
                tree.setIsFile(1);
                tree.setHitCount(0L);

                FileInfoV2 file = new FileInfoV2();
                file.setId(1L);
                file.setUuid("file-uuid-001");
                file.setEnabled(1);
                file.setSource("CBG-RAG");
                file.setStatus(5);

                // Create chunk with references
                JSONObject references = new JSONObject();
                references.put("ref1", "https://example.com/image1.png");
                references.put("ref2", "https://example.com/image2.png");

                JSONObject chunkJson = new JSONObject();
                chunkJson.put("docId", "file-uuid-001");
                chunkJson.put("content", "test content");
                chunkJson.put("references", references);

                JSONObject respDataJson = new JSONObject();
                respDataJson.put("results", new com.alibaba.fastjson2.JSONArray());
                respDataJson.getJSONArray("results").add(chunkJson);

                KnowledgeResponse knowledgeResponse = new KnowledgeResponse();
                knowledgeResponse.setCode(0);
                knowledgeResponse.setData(respDataJson);

                when(repoMapper.selectById(1L)).thenReturn(cbgRepo);
                doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
                when(directoryTreeService.list(any(LambdaQueryWrapper.class))).thenReturn(Arrays.asList(tree));
                when(fileInfoV2Service.getById(1L)).thenReturn(file);
                when(fileInfoV2Mapper.getFileInfoV2ByRepoId(1L)).thenReturn(Arrays.asList(file));
                when(knowledgeV2ServiceCallHandler.knowledgeQuery(any(QueryRequest.class))).thenReturn(knowledgeResponse);
                when(historyService.save(any())).thenReturn(true);
                when(fileInfoV2Service.getOnly(any())).thenReturn(file);
                when(directoryTreeService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(tree);
                when(directoryTreeService.updateById(any())).thenReturn(true);

                // When
                Object result = repoService.hitTest(1L, "test query", 10, true);

                // Then
                assertThat(result).isNotNull();
                assertThat(result).isInstanceOf(List.class);
                verify(historyService, times(1)).save(any());
            }
        }

        /**
         * Test hitTest - multiple file hits with deduplication.
         */
        @Test
        @DisplayName("hitTest - file hit count deduplication")
        void testHitTest_FileHitCountDeduplication() {
            try (MockedStatic<UserInfoManagerHandler> userMock = mockStatic(UserInfoManagerHandler.class)) {

                userMock.when(UserInfoManagerHandler::getUserId).thenReturn("user-001");

                FileDirectoryTree tree = new FileDirectoryTree();
                tree.setAppId("1");
                tree.setFileId(1L);
                tree.setIsFile(1);
                tree.setHitCount(0L);

                FileInfoV2 file = new FileInfoV2();
                file.setId(1L);
                file.setUuid("file-uuid-001");
                file.setEnabled(1);
                file.setAddress("files/test-file.txt"); // Set address to avoid null

                // Create multiple chunks from the same file
                JSONObject chunk1 = new JSONObject();
                chunk1.put("docId", "file-uuid-001");
                chunk1.put("content", "chunk 1");

                JSONObject chunk2 = new JSONObject();
                chunk2.put("docId", "file-uuid-001");
                chunk2.put("content", "chunk 2");

                JSONObject respDataJson = new JSONObject();
                respDataJson.put("results", new com.alibaba.fastjson2.JSONArray());
                respDataJson.getJSONArray("results").add(chunk1);
                respDataJson.getJSONArray("results").add(chunk2);

                KnowledgeResponse knowledgeResponse = new KnowledgeResponse();
                knowledgeResponse.setCode(0);
                knowledgeResponse.setData(respDataJson);

                when(repoMapper.selectById(1L)).thenReturn(mockRepo);
                doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
                when(directoryTreeService.list(any(LambdaQueryWrapper.class))).thenReturn(Arrays.asList(tree));
                when(fileInfoV2Service.getById(1L)).thenReturn(file);
                when(knowledgeV2ServiceCallHandler.knowledgeQuery(any(QueryRequest.class))).thenReturn(knowledgeResponse);
                when(historyService.save(any())).thenReturn(true);
                when(fileInfoV2Service.getOnly(any())).thenReturn(file);
                when(directoryTreeService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(tree);
                when(directoryTreeService.updateById(any())).thenReturn(true);
                // Use lenient stubbing or anyString() to handle both null and non-null
                lenient().when(s3UtilClient.getS3Url(anyString())).thenReturn("https://s3.example.com/file");

                // When
                Object result = repoService.hitTest(1L, "test query", 10, true);

                // Then
                assertThat(result).isNotNull();
                // Hit count should only be incremented once despite multiple chunks from same file
                verify(directoryTreeService, times(1)).updateById(any(FileDirectoryTree.class));
            }
        }
    }

    /**
     * Test cases for listRepos method with parallel processing.
     */
    @Nested
    @DisplayName("listRepos Tests")
    class ListReposTests {

        @Test
        @DisplayName("listRepos - basic pagination")
        void testListRepos_BasicPagination() {
            try (MockedStatic<UserInfoManagerHandler> userMock = mockStatic(UserInfoManagerHandler.class);
                    MockedStatic<SpaceInfoUtil> spaceMock = mockStatic(SpaceInfoUtil.class);
                    MockedStatic<cn.hutool.core.thread.ThreadUtil> threadMock = mockStatic(cn.hutool.core.thread.ThreadUtil.class);
                    MockedStatic<com.iflytek.astron.console.toolkit.util.OkHttpUtil> okHttpMock =
                            mockStatic(com.iflytek.astron.console.toolkit.util.OkHttpUtil.class)) {

                userMock.when(UserInfoManagerHandler::getUserId).thenReturn("user-001");
                spaceMock.when(SpaceInfoUtil::getSpaceId).thenReturn(null);

                // Mock thread execution to run synchronously
                threadMock.when(() -> cn.hutool.core.thread.ThreadUtil.execute(any(Runnable.class)))
                        .thenAnswer(invocation -> {
                            Runnable task = invocation.getArgument(0);
                            task.run();
                            return null;
                        });

                // Mock external API
                when(apiUrl.getDatasetUrl()).thenReturn("https://api.example.com/dataset");
                okHttpMock.when(() -> com.iflytek.astron.console.toolkit.util.OkHttpUtil.get(anyString(), any(Map.class)))
                        .thenReturn("{\"data\":null}");

                // Mock Page response
                com.github.pagehelper.Page<RepoDto> mockPage = new com.github.pagehelper.Page<>();
                mockPage.addAll(createMockRepoDtoList());

                when(groupVisibilityService.getRepoVisibilityList()).thenReturn(new ArrayList<>());
                when(repoMapper.getModelListByCondition(anyString(), any(), anyList(), any())).thenReturn(mockPage);
                when(configInfoMapper.getListByCategoryAndCode("ICON", "rag")).thenReturn(createMockConfigInfos());
                when(directoryTreeService.list(any(LambdaQueryWrapper.class))).thenReturn(new ArrayList<>());
                when(s3UtilClient.getS3Prefix()).thenReturn("https://s3.example.com/");
                when(sparkBotMapper.listSparkBotByRepoId(anyLong(), anyString())).thenReturn(new ArrayList<>());
                when(flowRepoRelMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(new ArrayList<>());
                doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(RepoDto.class));

                // When
                PageData<RepoDto> result = repoService.listRepos(1, 10, null, mockRequest);

                // Then
                assertThat(result).isNotNull();
                assertThat(result.getPageData()).isNotEmpty();
                verify(repoMapper, times(1)).getModelListByCondition(anyString(), any(), anyList(), any());
            }
        }

        @Test
        @DisplayName("listRepos - with spaceId")
        void testListRepos_WithSpaceId() {
            try (MockedStatic<UserInfoManagerHandler> userMock = mockStatic(UserInfoManagerHandler.class);
                    MockedStatic<SpaceInfoUtil> spaceMock = mockStatic(SpaceInfoUtil.class);
                    MockedStatic<cn.hutool.core.thread.ThreadUtil> threadMock = mockStatic(cn.hutool.core.thread.ThreadUtil.class)) {

                userMock.when(UserInfoManagerHandler::getUserId).thenReturn("user-001");
                spaceMock.when(SpaceInfoUtil::getSpaceId).thenReturn(100L);

                // Mock thread execution
                threadMock.when(() -> cn.hutool.core.thread.ThreadUtil.execute(any(Runnable.class)))
                        .thenAnswer(invocation -> {
                            Runnable task = invocation.getArgument(0);
                            task.run();
                            return null;
                        });

                com.github.pagehelper.Page<RepoDto> mockPage = new com.github.pagehelper.Page<>();
                mockPage.addAll(createMockRepoDtoList());

                when(groupVisibilityService.getRepoVisibilityList()).thenReturn(new ArrayList<>());
                when(repoMapper.getModelListByCondition(anyString(), eq(100L), anyList(), any())).thenReturn(mockPage);
                when(configInfoMapper.getListByCategoryAndCode("ICON", "rag")).thenReturn(createMockConfigInfos());
                when(directoryTreeService.list(any(LambdaQueryWrapper.class))).thenReturn(new ArrayList<>());
                when(s3UtilClient.getS3Prefix()).thenReturn("https://s3.example.com/");
                when(sparkBotMapper.listSparkBotByRepoId(anyLong(), anyString())).thenReturn(new ArrayList<>());
                when(flowRepoRelMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(new ArrayList<>());
                doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(RepoDto.class));

                // When
                PageData<RepoDto> result = repoService.listRepos(1, 10, null, mockRequest);

                // Then
                assertThat(result).isNotNull();
                verify(repoMapper, times(1)).getModelListByCondition(anyString(), eq(100L), anyList(), any());
            }
        }

        @Test
        @DisplayName("listRepos - with content filter")
        void testListRepos_WithContentFilter() {
            try (MockedStatic<UserInfoManagerHandler> userMock = mockStatic(UserInfoManagerHandler.class);
                    MockedStatic<SpaceInfoUtil> spaceMock = mockStatic(SpaceInfoUtil.class);
                    MockedStatic<cn.hutool.core.thread.ThreadUtil> threadMock = mockStatic(cn.hutool.core.thread.ThreadUtil.class);
                    MockedStatic<com.iflytek.astron.console.toolkit.util.OkHttpUtil> okHttpMock =
                            mockStatic(com.iflytek.astron.console.toolkit.util.OkHttpUtil.class)) {

                userMock.when(UserInfoManagerHandler::getUserId).thenReturn("user-001");
                spaceMock.when(SpaceInfoUtil::getSpaceId).thenReturn(null);

                threadMock.when(() -> cn.hutool.core.thread.ThreadUtil.execute(any(Runnable.class)))
                        .thenAnswer(invocation -> {
                            Runnable task = invocation.getArgument(0);
                            task.run();
                            return null;
                        });

                when(apiUrl.getDatasetUrl()).thenReturn("https://api.example.com/dataset");
                okHttpMock.when(() -> com.iflytek.astron.console.toolkit.util.OkHttpUtil.get(anyString(), any(Map.class)))
                        .thenReturn("{\"data\":null}");

                com.github.pagehelper.Page<RepoDto> mockPage = new com.github.pagehelper.Page<>();
                mockPage.addAll(createMockRepoDtoList());

                when(groupVisibilityService.getRepoVisibilityList()).thenReturn(new ArrayList<>());
                when(repoMapper.getModelListByCondition(anyString(), any(), anyList(), eq("test"))).thenReturn(mockPage);
                when(configInfoMapper.getListByCategoryAndCode("ICON", "rag")).thenReturn(createMockConfigInfos());
                when(directoryTreeService.list(any(LambdaQueryWrapper.class))).thenReturn(new ArrayList<>());
                when(s3UtilClient.getS3Prefix()).thenReturn("https://s3.example.com/");
                when(sparkBotMapper.listSparkBotByRepoId(anyLong(), anyString())).thenReturn(new ArrayList<>());
                when(flowRepoRelMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(new ArrayList<>());
                doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(RepoDto.class));

                // When
                PageData<RepoDto> result = repoService.listRepos(1, 10, "test", mockRequest);

                // Then
                assertThat(result).isNotNull();
                verify(repoMapper, times(1)).getModelListByCondition(anyString(), any(), anyList(), eq("test"));
            }
        }
    }

    /**
     * Test cases for getStarFireData method.
     */
    @Nested
    @DisplayName("getStarFireData Tests")
    class GetStarFireDataTests {

        @Test
        @DisplayName("getStarFireData - success with data")
        void testGetStarFireData_Success() {
            try (MockedStatic<com.iflytek.astron.console.toolkit.util.OkHttpUtil> okHttpMock =
                    mockStatic(com.iflytek.astron.console.toolkit.util.OkHttpUtil.class)) {

                when(apiUrl.getDatasetUrl()).thenReturn("https://api.example.com/dataset");

                JSONArray mockData = new JSONArray();
                JSONObject repo = new JSONObject();
                repo.put("id", 1L);
                repo.put("name", "Spark Repo");
                mockData.add(repo);

                JSONObject response = new JSONObject();
                response.put("data", mockData);

                okHttpMock.when(() -> com.iflytek.astron.console.toolkit.util.OkHttpUtil.get(anyString(), any(Map.class)))
                        .thenReturn(response.toJSONString());

                mockRequest.addHeader("Authorization", "Bearer test-token");

                // When
                JSONArray result = repoService.getStarFireData(mockRequest);

                // Then
                assertThat(result).isNotNull();
                assertThat(result).hasSize(1);
            }
        }

        @Test
        @DisplayName("getStarFireData - null data")
        void testGetStarFireData_NullData() {
            try (MockedStatic<com.iflytek.astron.console.toolkit.util.OkHttpUtil> okHttpMock =
                    mockStatic(com.iflytek.astron.console.toolkit.util.OkHttpUtil.class)) {

                when(apiUrl.getDatasetUrl()).thenReturn("https://api.example.com/dataset");

                JSONObject response = new JSONObject();
                response.put("data", null);

                okHttpMock.when(() -> com.iflytek.astron.console.toolkit.util.OkHttpUtil.get(anyString(), any(Map.class)))
                        .thenReturn(response.toJSONString());

                // When
                JSONArray result = repoService.getStarFireData(mockRequest);

                // Then
                assertThat(result).isNull();
            }
        }

        @Test
        @DisplayName("getStarFireData - with authorization header")
        void testGetStarFireData_WithAuthHeader() {
            try (MockedStatic<com.iflytek.astron.console.toolkit.util.OkHttpUtil> okHttpMock =
                    mockStatic(com.iflytek.astron.console.toolkit.util.OkHttpUtil.class)) {

                when(apiUrl.getDatasetUrl()).thenReturn("https://api.example.com/dataset");
                mockRequest.addHeader("Authorization", "Bearer test-token");

                okHttpMock.when(() -> com.iflytek.astron.console.toolkit.util.OkHttpUtil.get(anyString(), any(Map.class)))
                        .thenReturn("{\"data\":null}");

                // When
                repoService.getStarFireData(mockRequest);

                // Then
                okHttpMock.verify(() -> com.iflytek.astron.console.toolkit.util.OkHttpUtil.get(anyString(), any(Map.class)), times(1));
            }
        }
    }

    /**
     * Test cases for deleteXinghuoDataset method.
     */
    @Nested
    @DisplayName("deleteXinghuoDataset Tests")
    class DeleteXinghuoDatasetTests {

        @Test
        @DisplayName("deleteXinghuoDataset - success")
        void testDeleteXinghuoDataset_Success() {
            try (MockedStatic<com.iflytek.astron.console.toolkit.util.OkHttpUtil> okHttpMock =
                    mockStatic(com.iflytek.astron.console.toolkit.util.OkHttpUtil.class)) {

                when(apiUrl.getDeleteXinghuoDatasetUrl()).thenReturn("https://api.example.com/delete");

                JSONObject response = new JSONObject();
                response.put("code", 0);
                response.put("message", "success");

                okHttpMock.when(() -> com.iflytek.astron.console.toolkit.util.OkHttpUtil.post(anyString(), any(Map.class), any(Map.class), any()))
                        .thenReturn(response.toJSONString());

                mockRequest.addHeader("Authorization", "Bearer test-token");

                // When
                JSONObject result = repoService.deleteXinghuoDataset(mockRequest, "123");

                // Then
                assertThat(result).isNotNull();
                assertThat(result.getInteger("code")).isEqualTo(0);
            }
        }

        @Test
        @DisplayName("deleteXinghuoDataset - with authorization")
        void testDeleteXinghuoDataset_WithAuth() {
            try (MockedStatic<com.iflytek.astron.console.toolkit.util.OkHttpUtil> okHttpMock =
                    mockStatic(com.iflytek.astron.console.toolkit.util.OkHttpUtil.class)) {

                when(apiUrl.getDeleteXinghuoDatasetUrl()).thenReturn("https://api.example.com/delete");
                mockRequest.addHeader("Authorization", "Bearer test-token");

                okHttpMock.when(() -> com.iflytek.astron.console.toolkit.util.OkHttpUtil.post(anyString(), any(Map.class), any(Map.class), any()))
                        .thenReturn("{\"code\":0}");

                // When
                repoService.deleteXinghuoDataset(mockRequest, "123");

                // Then
                okHttpMock.verify(() -> com.iflytek.astron.console.toolkit.util.OkHttpUtil.post(anyString(), any(Map.class), any(Map.class), any()), times(1));
            }
        }
    }

    /**
     * Test cases for convertAndMergeJsonArrays static helper method.
     */
    @Nested
    @DisplayName("convertAndMergeJsonArrays Tests")
    class ConvertAndMergeTests {

        @Test
        @DisplayName("convertAndMergeJsonArrays - with null Spark data")
        void testConvertAndMerge_NullSparkData() {
            List<RepoDto> xcRepos = createMockRepoDtoList();

            List<RepoDto> result = RepoService.convertAndMergeJsonArrays(xcRepos, null, null, null);

            assertThat(result).isEqualTo(xcRepos);
            assertThat(result).hasSize(xcRepos.size());
        }

        @Test
        @DisplayName("convertAndMergeJsonArrays - with Spark data and content filter")
        void testConvertAndMerge_WithSparkDataAndFilter() {
            List<RepoDto> xcRepos = new ArrayList<>();
            RepoDto repo1 = new RepoDto();
            repo1.setName("Test Repository");
            xcRepos.add(repo1);

            JSONArray sparkArray = new JSONArray();
            JSONObject sparkRepo = new JSONObject();
            sparkRepo.put("id", 100L);
            sparkRepo.put("name", "Spark Test Repository");
            sparkRepo.put("description", "Spark Description");
            sparkRepo.put("status", 1);
            sparkRepo.put("createTime", new Date());
            sparkRepo.put("updateTime", new Date());
            sparkRepo.put("fileNum", 5L);
            sparkRepo.put("charCount", 1000L);
            sparkRepo.put("botList", new JSONArray());
            sparkArray.add(sparkRepo);

            List<RepoDto> result = RepoService.convertAndMergeJsonArrays(
                    xcRepos, sparkArray, "Test", "icon-address");

            assertThat(result).hasSize(2);
            assertThat(result.stream().allMatch(r -> r.getName().contains("Test"))).isTrue();
        }

        @Test
        @DisplayName("convertAndMergeJsonArrays - with bot list in Spark data")
        void testConvertAndMerge_WithBotList() {
            List<RepoDto> xcRepos = new ArrayList<>();

            JSONArray sparkArray = new JSONArray();
            JSONObject sparkRepo = new JSONObject();
            sparkRepo.put("id", 100L);
            sparkRepo.put("name", "Spark Repo");
            sparkRepo.put("uid", "spark-user");
            sparkRepo.put("status", 1);
            sparkRepo.put("createTime", new Date());
            sparkRepo.put("updateTime", new Date());
            sparkRepo.put("fileNum", 5L);
            sparkRepo.put("charCount", 1000L);

            JSONArray botList = new JSONArray();
            JSONObject bot = new JSONObject();
            bot.put("name", "Test Bot");
            bot.put("botId", "bot-001");
            botList.add(bot);
            sparkRepo.put("botList", botList);

            sparkArray.add(sparkRepo);

            List<RepoDto> result = RepoService.convertAndMergeJsonArrays(
                    xcRepos, sparkArray, null, "icon-address");

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getBots()).hasSize(1);
            assertThat(result.get(0).getBots().get(0).getName()).isEqualTo("Test Bot");
        }

        @Test
        @DisplayName("convertAndMergeJsonArrays - with empty bot list")
        void testConvertAndMerge_WithEmptyBotList() {
            List<RepoDto> xcRepos = new ArrayList<>();

            JSONArray sparkArray = new JSONArray();
            JSONObject sparkRepo = new JSONObject();
            sparkRepo.put("id", 100L);
            sparkRepo.put("name", "Spark Repo");
            sparkRepo.put("status", 1);
            sparkRepo.put("createTime", new Date());
            sparkRepo.put("updateTime", new Date());
            sparkRepo.put("fileNum", 5L);
            sparkRepo.put("charCount", 1000L);
            sparkRepo.put("botList", new JSONArray());
            sparkArray.add(sparkRepo);

            List<RepoDto> result = RepoService.convertAndMergeJsonArrays(
                    xcRepos, sparkArray, null, "icon-address");

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getBots()).isEmpty();
        }
    }

    /**
     * Additional test cases for getDetail method - Spark RAG detailed scenarios.
     */
    @Nested
    @DisplayName("getDetail Spark RAG Detailed Tests")
    class GetDetailSparkRagDetailedTests {

        @Test
        @DisplayName("getDetail - Spark RAG with API success and file list")
        void testGetDetail_SparkRag_ApiSuccess() {
            try (MockedStatic<com.iflytek.astron.console.toolkit.util.OkHttpUtil> okHttpMock =
                    mockStatic(com.iflytek.astron.console.toolkit.util.OkHttpUtil.class)) {

                // Mock dataset file API response
                String fileApiResponse = "{\"flag\":true,\"code\":0,\"data\":[" +
                        "{\"charCount\":500,\"paraCount\":10}," +
                        "{\"charCount\":300,\"paraCount\":5}" +
                        "]}";

                // Mock dataset list API response
                JSONArray sparkData = new JSONArray();
                JSONObject sparkRepo = new JSONObject();
                sparkRepo.put("id", 100L);
                sparkRepo.put("name", "Spark Dataset");
                sparkData.add(sparkRepo);
                String datasetResponse = "{\"data\":" + sparkData.toJSONString() + "}";

                when(apiUrl.getDatasetFileUrl()).thenReturn("https://api.example.com/dataset/file");
                when(apiUrl.getDatasetUrl()).thenReturn("https://api.example.com/dataset");

                okHttpMock.when(() -> com.iflytek.astron.console.toolkit.util.OkHttpUtil.get(
                        contains("datasetId=100"), any(Map.class)))
                        .thenReturn(fileApiResponse);

                okHttpMock.when(() -> com.iflytek.astron.console.toolkit.util.OkHttpUtil.get(
                        eq("https://api.example.com/dataset"), any(Map.class)))
                        .thenReturn(datasetResponse);

                // When
                RepoDto result = repoService.getDetail(100L, "SparkDesk-RAG", mockRequest);

                // Then
                assertThat(result).isNotNull();
                assertThat(result.getName()).isEqualTo("Spark Dataset");
                assertThat(result.getFileCount()).isEqualTo(2L);
                assertThat(result.getCharCount()).isEqualTo(800L);
                assertThat(result.getKnowledgeCount()).isEqualTo(15L);
                assertThat(result.getTag()).isEqualTo("SparkDesk-RAG");
            }
        }

        @Test
        @DisplayName("getDetail - Spark RAG with API failure")
        void testGetDetail_SparkRag_ApiFailure() {
            try (MockedStatic<com.iflytek.astron.console.toolkit.util.OkHttpUtil> okHttpMock =
                    mockStatic(com.iflytek.astron.console.toolkit.util.OkHttpUtil.class)) {

                // Mock failed API response
                String failedResponse = "{\"flag\":false,\"code\":500,\"data\":null}";
                String datasetResponse = "{\"data\":null}";

                when(apiUrl.getDatasetFileUrl()).thenReturn("https://api.example.com/dataset/file");
                when(apiUrl.getDatasetUrl()).thenReturn("https://api.example.com/dataset");

                okHttpMock.when(() -> com.iflytek.astron.console.toolkit.util.OkHttpUtil.get(
                        contains("datasetId=100"), any(Map.class)))
                        .thenReturn(failedResponse);

                okHttpMock.when(() -> com.iflytek.astron.console.toolkit.util.OkHttpUtil.get(
                        eq("https://api.example.com/dataset"), any(Map.class)))
                        .thenReturn(datasetResponse);

                // When
                RepoDto result = repoService.getDetail(100L, "SparkDesk-RAG", mockRequest);

                // Then
                assertThat(result).isNotNull();
                assertThat(result.getFileCount()).isEqualTo(0L);
                assertThat(result.getCharCount()).isEqualTo(0L);
                assertThat(result.getKnowledgeCount()).isEqualTo(0L);
            }
        }

        @Test
        @DisplayName("getDetail - Spark RAG with authorization header")
        void testGetDetail_SparkRag_WithAuth() {
            try (MockedStatic<com.iflytek.astron.console.toolkit.util.OkHttpUtil> okHttpMock =
                    mockStatic(com.iflytek.astron.console.toolkit.util.OkHttpUtil.class)) {

                // Create a request with Authorization header
                MockHttpServletRequest requestWithAuth = new MockHttpServletRequest();
                requestWithAuth.addHeader("Authorization", "Bearer token123");

                String apiResponse = "{\"flag\":true,\"code\":0,\"data\":[]}";
                String datasetResponse = "{\"data\":null}";

                when(apiUrl.getDatasetFileUrl()).thenReturn("https://api.example.com/dataset/file");
                when(apiUrl.getDatasetUrl()).thenReturn("https://api.example.com/dataset");

                okHttpMock.when(() -> com.iflytek.astron.console.toolkit.util.OkHttpUtil.get(
                        anyString(), any(Map.class)))
                        .thenReturn(apiResponse, datasetResponse);

                // When
                RepoDto result = repoService.getDetail(100L, "SparkDesk-RAG", requestWithAuth);

                // Then
                assertThat(result).isNotNull();
                // Verify authorization header was passed
                okHttpMock.verify(() -> com.iflytek.astron.console.toolkit.util.OkHttpUtil.get(
                        anyString(), argThat(map -> map.containsKey("Authorization"))),
                        atLeastOnce());
            }
        }
    }

    /**
     * Additional branch tests for hitTest method.
     */
    @Nested
    @DisplayName("hitTest Additional Branch Tests")
    class HitTestAdditionalBranchTests {

        @Test
        @DisplayName("hitTest - AIUI-RAG tag branch with S3 URL")
        void testHitTest_AiuiRagBranch() {
            try (MockedStatic<UserInfoManagerHandler> userMock = mockStatic(UserInfoManagerHandler.class)) {
                userMock.when(UserInfoManagerHandler::getUserId).thenReturn("user-001");

                // Arrange - AIUI-RAG repository
                Repo mockRepo = new Repo();
                mockRepo.setId(1L);
                mockRepo.setTag("AIUI-RAG2");
                mockRepo.setCoreRepoId("test-core-repo-id");

                FileDirectoryTree tree = new FileDirectoryTree();
                tree.setFileId(1L);
                tree.setAppId("1");
                tree.setIsFile(1);
                tree.setHitCount(0L);

                FileInfoV2 file = new FileInfoV2();
                file.setId(1L);
                file.setEnabled(1);
                file.setStatus(5);
                file.setAddress("test/file.txt");
                file.setUuid("file-uuid-001");

                ChunkInfo chunk = new ChunkInfo();
                chunk.setDocId("file-uuid-001");
                chunk.setContent("Test content");

                QueryRespData respData = new QueryRespData();
                respData.setResults(Arrays.asList(chunk));
                JSONObject respDataJson = new JSONObject();
                respDataJson.put("results", respData.getResults());

                KnowledgeResponse knowledgeResponse = new KnowledgeResponse();
                knowledgeResponse.setCode(0);
                knowledgeResponse.setData(respDataJson);

                when(repoMapper.selectById(1L)).thenReturn(mockRepo);
                doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));
                when(directoryTreeService.list(any(LambdaQueryWrapper.class))).thenReturn(Arrays.asList(tree));
                when(fileInfoV2Service.getById(1L)).thenReturn(file);
                when(knowledgeV2ServiceCallHandler.knowledgeQuery(any(QueryRequest.class))).thenReturn(knowledgeResponse);
                when(historyService.save(any())).thenReturn(true);
                when(fileInfoV2Service.getOnly(any())).thenReturn(file);
                when(directoryTreeService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(tree);
                when(directoryTreeService.updateById(any())).thenReturn(true);
                when(s3UtilClient.getS3Url("test/file.txt")).thenReturn("https://s3.example.com/test/file.txt");

                // When
                Object result = repoService.hitTest(1L, "test query", 10, true);

                // Then
                assertThat(result).isNotNull();
                // Verify S3 URL was set for AIUI-RAG
                verify(s3UtilClient, times(1)).getS3Url("test/file.txt");

                @SuppressWarnings("unchecked")
                List<ChunkInfo> chunks = (List<ChunkInfo>) result;
                FileInfoV2 fileInfo = (FileInfoV2) chunks.get(0).getFileInfo();
                assertThat(fileInfo.getDownloadUrl()).isEqualTo("https://s3.example.com/test/file.txt");
            }
        }

        @Test
        @DisplayName("hitTest - with isBelongLoginUser=false")
        void testHitTest_NoBelongCheck() {
            try (MockedStatic<UserInfoManagerHandler> userMock = mockStatic(UserInfoManagerHandler.class)) {
                userMock.when(UserInfoManagerHandler::getUserId).thenReturn("user-001");

                Repo mockRepo = new Repo();
                mockRepo.setId(1L);
                mockRepo.setTag("CBG-RAG");
                mockRepo.setCoreRepoId("core-repo-id");

                FileDirectoryTree tree = new FileDirectoryTree();
                tree.setFileId(1L);
                tree.setAppId("1");
                tree.setIsFile(1);
                tree.setHitCount(0L);

                FileInfoV2 file = new FileInfoV2();
                file.setId(1L);
                file.setEnabled(1);
                file.setUuid("file-uuid-001");

                // Create proper response data with results
                JSONObject chunkJson = new JSONObject();
                chunkJson.put("docId", "file-uuid-001");
                chunkJson.put("content", "test content");

                JSONObject respDataJson = new JSONObject();
                respDataJson.put("results", new com.alibaba.fastjson2.JSONArray());
                respDataJson.getJSONArray("results").add(chunkJson);

                KnowledgeResponse response = new KnowledgeResponse();
                response.setCode(0);
                response.setData(respDataJson);

                when(repoMapper.selectById(1L)).thenReturn(mockRepo);
                when(directoryTreeService.list(any(LambdaQueryWrapper.class))).thenReturn(Arrays.asList(tree));
                when(fileInfoV2Service.getById(1L)).thenReturn(file);
                when(knowledgeV2ServiceCallHandler.knowledgeQuery(any())).thenReturn(response);
                when(historyService.save(any())).thenReturn(true);
                when(fileInfoV2Service.getOnly(any())).thenReturn(file);
                when(directoryTreeService.getOnly(any(LambdaQueryWrapper.class))).thenReturn(tree);
                when(directoryTreeService.updateById(any())).thenReturn(true);

                // When - isBelongLoginUser=false should skip belong check
                Object result = repoService.hitTest(1L, "query", 10, false);

                // Then
                assertThat(result).isNotNull();
                // Verify checkRepoBelong was NOT called
                verify(dataPermissionCheckTool, never()).checkRepoBelong(any(Repo.class));
            }
        }
    }

    /**
     * Additional test cases for enableRepo method.
     */
    @Nested
    @DisplayName("enableRepo Additional Tests")
    class EnableRepoAdditionalTests {

        @Test
        @DisplayName("enableRepo - disable from PUBLISHED status")
        void testEnableRepo_DisableFromPublished() {
            try (MockedStatic<UserInfoManagerHandler> userMock = mockStatic(UserInfoManagerHandler.class)) {
                userMock.when(UserInfoManagerHandler::getUserId).thenReturn("user-001");

                Repo mockRepo = new Repo();
                mockRepo.setId(1L);
                mockRepo.setStatus(ProjectContent.REPO_STATUS_PUBLISHED);
                mockRepo.setUserId("user-001");

                when(repoMapper.selectById(1L)).thenReturn(mockRepo);
                doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(Repo.class));

                // When - disable from PUBLISHED status
                repoService.enableRepo(1L, 0);

                // Then - should transition to UNPUBLISHED
                // Verify the method completes without exception
                verify(repoMapper, times(1)).selectById(1L);
            }
        }
    }

    /**
     * Additional test cases for getRepoUseStatus method.
     */
    @Nested
    @DisplayName("getRepoUseStatus Additional Tests")
    class GetRepoUseStatusAdditionalTests {

        @Test
        @DisplayName("getRepoUseStatus - used by workflow")
        void testGetRepoUseStatus_UsedByFlow() {
            try (MockedStatic<UserInfoManagerHandler> userMock = mockStatic(UserInfoManagerHandler.class)) {
                userMock.when(UserInfoManagerHandler::getUserId).thenReturn("user-001");

                Repo mockRepo = new Repo();
                mockRepo.setId(1L);
                mockRepo.setCoreRepoId("core-repo-123");

                FlowRepoRel flowRel = new FlowRepoRel();
                flowRel.setFlowId("flow-001");
                flowRel.setRepoId("core-repo-123");

                when(repoMapper.selectById(1L)).thenReturn(mockRepo);
                when(sparkBotMapper.listSparkBotByRepoId(1L, "user-001")).thenReturn(new ArrayList<>());
                when(flowRepoRelMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(Arrays.asList(flowRel));
                when(datasetFileService.getMaasDataset(1L)).thenReturn(new ArrayList<>());

                // When
                Object result = repoService.getRepoUseStatus(1L, mockRequest);

                // Then
                assertThat(result).isEqualTo(true);
                verify(flowRepoRelMapper, times(1)).selectList(any(LambdaQueryWrapper.class));
            }
        }

        @Test
        @DisplayName("getRepoUseStatus - used by MaaS bot")
        void testGetRepoUseStatus_UsedByMaas() {
            try (MockedStatic<UserInfoManagerHandler> userMock = mockStatic(UserInfoManagerHandler.class)) {
                userMock.when(UserInfoManagerHandler::getUserId).thenReturn("user-001");

                Repo mockRepo = new Repo();
                mockRepo.setId(1L);
                mockRepo.setCoreRepoId("core-repo-123");

                DatasetStats maasBot = new DatasetStats();
                maasBot.setName("MaaS Bot");
                maasBot.setBotId("maas-bot-001");

                when(repoMapper.selectById(1L)).thenReturn(mockRepo);
                when(sparkBotMapper.listSparkBotByRepoId(1L, "user-001")).thenReturn(new ArrayList<>());
                when(flowRepoRelMapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(new ArrayList<>());
                when(datasetFileService.getMaasDataset(1L)).thenReturn(Arrays.asList(maasBot));

                // When
                Object result = repoService.getRepoUseStatus(1L, mockRequest);

                // Then
                assertThat(result).isEqualTo(true);
                verify(datasetFileService, times(1)).getMaasDataset(1L);
            }
        }
    }

    /**
     * Test cases for list method with empty files scenario.
     */
    @Nested
    @DisplayName("list Empty Files Tests")
    class ListEmptyFilesTests {

        @Test
        @DisplayName("list - repository with no files")
        void testList_RepoWithNoFiles() {
            try (MockedStatic<UserInfoManagerHandler> userMock = mockStatic(UserInfoManagerHandler.class);
                    MockedStatic<SpaceInfoUtil> spaceMock = mockStatic(SpaceInfoUtil.class);
                    MockedStatic<com.iflytek.astron.console.toolkit.util.OkHttpUtil> okHttpMock =
                            mockStatic(com.iflytek.astron.console.toolkit.util.OkHttpUtil.class)) {

                userMock.when(UserInfoManagerHandler::getUserId).thenReturn("user-001");
                spaceMock.when(SpaceInfoUtil::getSpaceId).thenReturn(null);

                when(apiUrl.getDatasetUrl()).thenReturn("https://api.example.com/dataset");
                okHttpMock.when(() -> com.iflytek.astron.console.toolkit.util.OkHttpUtil.get(anyString(), any(Map.class)))
                        .thenReturn("{\"data\":null}");

                RepoDto repo = new RepoDto();
                repo.setId(1L);
                repo.setName("Empty Repo");
                repo.setTag("AIUI-RAG2");

                when(groupVisibilityService.getRepoVisibilityList()).thenReturn(new ArrayList<>());
                when(repoMapper.list(anyString(), any(), anyList(), any(), any())).thenReturn(Arrays.asList(repo));
                when(configInfoMapper.getListByCategoryAndCode("ICON", "rag")).thenReturn(createMockConfigInfos());
                doNothing().when(dataPermissionCheckTool).checkRepoBelong(any(RepoDto.class));
                when(s3UtilClient.getS3Prefix()).thenReturn("https://s3.example.com/");

                // Return empty file list - this tests the !fileIds.isEmpty() branch
                when(directoryTreeService.list(any(LambdaQueryWrapper.class))).thenReturn(new ArrayList<>());

                // When
                PageData<RepoDto> result = repoService.list(1, 10, null, null, mockRequest, null);

                // Then
                assertThat(result).isNotNull();
                assertThat(result.getPageData()).hasSize(1);
                assertThat(result.getPageData().get(0).getFileCount()).isEqualTo(0L);
                // charCount should not be set when fileIds is empty
                verify(fileInfoV2Mapper, never()).listByIds(any());
            }
        }
    }

    /**
     * Additional test cases for getStarFireData method.
     */
    @Nested
    @DisplayName("getStarFireData Additional Tests")
    class GetStarFireDataAdditionalTests {

        @Test
        @DisplayName("getStarFireData - without authorization header")
        void testGetStarFireData_NoAuth() {
            try (MockedStatic<com.iflytek.astron.console.toolkit.util.OkHttpUtil> okHttpMock =
                    mockStatic(com.iflytek.astron.console.toolkit.util.OkHttpUtil.class)) {

                // Create a request without Authorization header
                MockHttpServletRequest requestWithoutAuth = new MockHttpServletRequest();
                when(apiUrl.getDatasetUrl()).thenReturn("https://api.example.com/dataset");

                String response = "{\"data\":null}";
                okHttpMock.when(() -> com.iflytek.astron.console.toolkit.util.OkHttpUtil.get(
                        eq("https://api.example.com/dataset"), any(Map.class)))
                        .thenReturn(response);

                // When
                JSONArray result = repoService.getStarFireData(requestWithoutAuth);

                // Then
                assertThat(result).isNull();
                // Verify that the headers map does not contain Authorization
                okHttpMock.verify(() -> com.iflytek.astron.console.toolkit.util.OkHttpUtil.get(
                        eq("https://api.example.com/dataset"),
                        argThat(map -> !map.containsKey("Authorization"))),
                        times(1));
            }
        }

        @Test
        @DisplayName("getStarFireData - with empty string authorization")
        void testGetStarFireData_EmptyAuth() {
            try (MockedStatic<com.iflytek.astron.console.toolkit.util.OkHttpUtil> okHttpMock =
                    mockStatic(com.iflytek.astron.console.toolkit.util.OkHttpUtil.class)) {

                // Create a request with empty Authorization header
                MockHttpServletRequest requestWithEmptyAuth = new MockHttpServletRequest();
                requestWithEmptyAuth.addHeader("Authorization", "   ");
                when(apiUrl.getDatasetUrl()).thenReturn("https://api.example.com/dataset");

                String response = "{\"data\":null}";
                okHttpMock.when(() -> com.iflytek.astron.console.toolkit.util.OkHttpUtil.get(
                        anyString(), any(Map.class)))
                        .thenReturn(response);

                // When
                JSONArray result = repoService.getStarFireData(requestWithEmptyAuth);

                // Then
                assertThat(result).isNull();
                // Empty/blank string should not add Authorization header
                okHttpMock.verify(() -> com.iflytek.astron.console.toolkit.util.OkHttpUtil.get(
                        anyString(),
                        argThat(map -> !map.containsKey("Authorization"))),
                        times(1));
            }
        }
    }

    // Helper methods for new tests

    private List<RepoDto> createMockRepoDtoList() {
        List<RepoDto> repos = new ArrayList<>();

        RepoDto repo1 = new RepoDto();
        repo1.setId(1L);
        repo1.setName("Test Repo 1");
        repo1.setTag("AIUI-RAG2");
        repo1.setUserId("user-001");
        repos.add(repo1);

        RepoDto repo2 = new RepoDto();
        repo2.setId(2L);
        repo2.setName("Test Repo 2");
        repo2.setTag("AIUI-RAG2");
        repo2.setUserId("user-001");
        repos.add(repo2);

        return repos;
    }

    private List<ConfigInfo> createMockConfigInfos() {
        List<ConfigInfo> configs = new ArrayList<>();

        ConfigInfo config1 = new ConfigInfo();
        config1.setRemarks("AIUI-RAG2");
        config1.setName("badge-");
        config1.setValue("aiui");
        config1.setIsValid(1);
        configs.add(config1);

        ConfigInfo config2 = new ConfigInfo();
        config2.setRemarks("CBG-RAG");
        config2.setName("badge-");
        config2.setValue("cbg");
        config2.setIsValid(1);
        configs.add(config2);

        return configs;
    }
}
