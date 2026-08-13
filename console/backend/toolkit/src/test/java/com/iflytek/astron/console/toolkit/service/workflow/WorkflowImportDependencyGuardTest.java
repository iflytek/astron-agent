package com.iflytek.astron.console.toolkit.service.workflow;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.iflytek.astron.console.commons.config.JwtClaimsFilter;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.entity.workflow.Workflow;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.enums.space.SpaceRoleEnum;
import com.iflytek.astron.console.commons.service.space.SpaceUserService;
import com.iflytek.astron.console.commons.util.SseEmitterUtil;
import com.iflytek.astron.console.toolkit.config.properties.ApiUrl;
import com.iflytek.astron.console.toolkit.config.properties.BizConfig;
import com.iflytek.astron.console.toolkit.entity.biz.external.app.AkSk;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.BizWorkflowData;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.BizWorkflowNode;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.ChatBizReq;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.ChatResumeReq;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.WorkflowDebugDto;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.node.BizNodeData;
import com.iflytek.astron.console.toolkit.entity.dto.WorkflowReq;
import com.iflytek.astron.console.toolkit.entity.table.database.DbInfo;
import com.iflytek.astron.console.toolkit.entity.table.group.GroupVisibility;
import com.iflytek.astron.console.toolkit.entity.table.repo.Repo;
import com.iflytek.astron.console.toolkit.entity.table.tool.ToolBox;
import com.iflytek.astron.console.toolkit.mapper.ConfigInfoMapper;
import com.iflytek.astron.console.toolkit.mapper.database.DbInfoMapper;
import com.iflytek.astron.console.toolkit.mapper.group.GroupVisibilityMapper;
import com.iflytek.astron.console.toolkit.mapper.repo.RepoMapper;
import com.iflytek.astron.console.toolkit.mapper.tool.ToolBoxMapper;
import com.iflytek.astron.console.toolkit.mapper.workflow.WorkflowMapper;
import com.iflytek.astron.console.toolkit.service.extra.AppService;
import com.iflytek.astron.console.toolkit.service.repo.RepoService;
import com.iflytek.astron.console.toolkit.tool.DataPermissionCheckTool;
import com.iflytek.astron.console.toolkit.util.OkHttpUtil;
import okhttp3.sse.EventSourceListener;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class WorkflowImportDependencyGuardTest {

    private WorkflowService workflowService;
    private ToolBoxMapper toolBoxMapper;
    private DbInfoMapper dbInfoMapper;
    private WorkflowMapper workflowMapper;
    private RepoMapper repoMapper;
    private GroupVisibilityMapper groupVisibilityMapper;
    private SpaceUserService spaceUserService;
    private RepoService repoService;
    private DataPermissionCheckTool dataPermissionCheckTool;
    private AppService appService;
    private ApiUrl apiUrl;
    private ConfigInfoMapper configInfoMapper;

    @BeforeEach
    void setUp() {
        workflowService = new WorkflowService();
        toolBoxMapper = mock(ToolBoxMapper.class);
        dbInfoMapper = mock(DbInfoMapper.class);
        workflowMapper = mock(WorkflowMapper.class);
        repoMapper = mock(RepoMapper.class);
        groupVisibilityMapper = mock(GroupVisibilityMapper.class);
        spaceUserService = mock(SpaceUserService.class);
        repoService = mock(RepoService.class);
        dataPermissionCheckTool = mock(DataPermissionCheckTool.class);
        appService = mock(AppService.class);
        apiUrl = new ApiUrl();
        apiUrl.setWorkflow("http://core");
        configInfoMapper = mock(ConfigInfoMapper.class);
        ReflectionTestUtils.setField(workflowService, "toolBoxMapper", toolBoxMapper);
        ReflectionTestUtils.setField(workflowService, "dbInfoMapper", dbInfoMapper);
        ReflectionTestUtils.setField(workflowService, "workflowMapper", workflowMapper);
        ReflectionTestUtils.setField(workflowService, "repoMapper", repoMapper);
        ReflectionTestUtils.setField(workflowService, "groupVisibilityMapper", groupVisibilityMapper);
        ReflectionTestUtils.setField(workflowService, "spaceUserService", spaceUserService);
        ReflectionTestUtils.setField(workflowService, "repoService", repoService);
        ReflectionTestUtils.setField(workflowService, "dataPermissionCheckTool",
                dataPermissionCheckTool);
        ReflectionTestUtils.setField(workflowService, "appService", appService);
        ReflectionTestUtils.setField(workflowService, "apiUrl", apiUrl);
        ReflectionTestUtils.setField(workflowService, "configInfoMapper", configInfoMapper);
        when(repoService.getStarFireData(any())).thenReturn(new JSONArray());
        BizConfig bizConfig = new BizConfig();
        bizConfig.setAdminUid("admin-user");
        ReflectionTestUtils.setField(workflowService, "bizConfig", bizConfig);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setAttribute(JwtClaimsFilter.USER_ID_ATTRIBUTE, "current-user");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
    }

    @AfterEach
    void tearDown() {
        SseEmitterUtil.close("chat-valid");
        SseEmitterUtil.close("resume-valid");
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void buildRejectsUnresolvedImportedDependencyBeforeSaving() {
        WorkflowReq request = new WorkflowReq();
        request.setData(workflowWithUnresolvedDependency());

        assertUnresolvedDependencyFailure(() -> workflowService.build(request));
    }

    @Test
    void nodeDebugRejectsAuthoritativeUnresolvedDependencyWhenRequestOmitsIt() {
        Workflow workflow = executableWorkflow("flow-node-marker",
                workflowWithUnresolvedDependency());
        when(workflowMapper.selectOne(any(Wrapper.class))).thenReturn(workflow);
        WorkflowDebugDto request = new WorkflowDebugDto();
        request.setFlowId("flow-node-marker");
        request.setData(workflowWithNode("message::node", new JSONObject()));

        try (MockedStatic<OkHttpUtil> okHttp = mockStatic(OkHttpUtil.class)) {
            assertUnresolvedDependencyFailure(
                    () -> workflowService.nodeDebug("message::node", request));

            okHttp.verify(() -> OkHttpUtil.post(anyString(), anyString()), never());
        }

        verify(dataPermissionCheckTool).checkWorkflowBelong(workflow, null);
        verifyNoInteractions(appService);
    }

    @Test
    void nodeDebugRejectsUnresolvedSubmittedDependencyBeforeCredentialInjection() {
        Workflow workflow = executableWorkflow("flow-node-request", emptyWorkflow());
        when(workflowMapper.selectOne(any(Wrapper.class))).thenReturn(workflow);
        WorkflowDebugDto request = new WorkflowDebugDto();
        request.setFlowId("flow-node-request");
        request.setData(workflowWithUnresolvedDependency());

        assertUnresolvedDependencyFailure(() -> workflowService.nodeDebug("plugin::node", request));

        verify(dataPermissionCheckTool).checkWorkflowBelong(workflow, null);
        verifyNoInteractions(appService);
    }

    @Test
    void nodeDebugRejectsWorkflowOutsideCurrentPermissionScopeBeforeCoreCall() {
        Workflow workflow = executableWorkflow("flow-node-foreign", emptyWorkflow());
        when(workflowMapper.selectOne(any(Wrapper.class))).thenReturn(workflow);
        doThrow(new BusinessException(ResponseEnum.INSUFFICIENT_PERMISSIONS))
                .when(dataPermissionCheckTool)
                .checkWorkflowBelong(workflow, null);
        WorkflowDebugDto request = new WorkflowDebugDto();
        request.setFlowId("flow-node-foreign");
        request.setData(workflowWithNode("message::node", new JSONObject()));

        try (MockedStatic<OkHttpUtil> okHttp = mockStatic(OkHttpUtil.class)) {
            assertThatThrownBy(() -> workflowService.nodeDebug("message::node", request))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.INSUFFICIENT_PERMISSIONS);

            okHttp.verify(() -> OkHttpUtil.post(anyString(), anyString()), never());
        }

        verify(dataPermissionCheckTool).checkWorkflowBelong(workflow, null);
        verifyNoInteractions(appService, toolBoxMapper, dbInfoMapper, repoMapper);
    }

    @Test
    void nodeDebugWithAuthoritativeExecutableDraftContinuesToCore() {
        Workflow workflow = executableWorkflow("flow-node-valid", emptyWorkflow());
        when(workflowMapper.selectOne(any(Wrapper.class))).thenReturn(workflow);
        when(appService.remoteCallAkSk("app-1"))
                .thenReturn(new AkSk("api-key", "api-secret"));
        WorkflowDebugDto request = new WorkflowDebugDto();
        request.setFlowId("flow-node-valid");
        BizWorkflowData submitted = workflowWithNode("message::node",
                new JSONObject().fluentPut("appId", "app-1"));
        submitted.setEdges(List.of());
        BizNodeData submittedNode = submitted.getNodes().getFirst().getData();
        submittedNode.setInputs(List.of());
        submittedNode.setOutputs(List.of());
        request.setData(submitted);

        try (MockedStatic<OkHttpUtil> okHttp = mockStatic(OkHttpUtil.class)) {
            okHttp.when(() -> OkHttpUtil.post(
                    eq("http://core/workflow/v1/node/debug/"), anyString()))
                    .thenReturn("{\"code\":0,\"data\":{\"result\":\"ok\"}}");

            assertThat(workflowService.nodeDebug("message::node", request).code()).isZero();

            okHttp.verify(() -> OkHttpUtil.post(
                    eq("http://core/workflow/v1/node/debug/"), anyString()), times(1));
        }

        verify(dataPermissionCheckTool).checkWorkflowBelong(workflow, null);
        verify(appService, times(1)).remoteCallAkSk("app-1");
    }

    @Test
    void protocolConversionRejectsUnresolvedImportedDependencyBeforePublish() {
        WorkflowReq request = new WorkflowReq();
        request.setData(workflowWithUnresolvedDependency());

        assertUnresolvedDependencyFailure(() -> workflowService.buildWorkflowData(request, "flow-1"));
    }

    @Test
    void chatRejectsImportedDependencyMarkerFromAuthoritativeDraftBeforeCoreCall() {
        Workflow workflow = executableWorkflow("flow-chat-marker",
                workflowWithUnresolvedDependency());
        when(workflowMapper.selectOne(any(Wrapper.class))).thenReturn(workflow);

        try (MockedStatic<OkHttpUtil> okHttp = mockStatic(OkHttpUtil.class)) {
            workflowService.sseChat(chatRequest("flow-chat-marker", "chat-marker"));

            okHttp.verify(() -> OkHttpUtil.connectRealEventSource(anyString(), anyMap(),
                    anyString(), any(EventSourceListener.class)), never());
        }

        verify(dataPermissionCheckTool).checkWorkflowBelong(workflow, null);
        verifyNoInteractions(appService);
    }

    @Test
    void resumeRejectsImportedDependencyMarkerFromAuthoritativeDraftBeforeCoreCall() {
        Workflow workflow = executableWorkflow("flow-resume-marker",
                workflowWithUnresolvedDependency());
        when(workflowMapper.selectOne(any(Wrapper.class))).thenReturn(workflow);

        try (MockedStatic<OkHttpUtil> okHttp = mockStatic(OkHttpUtil.class)) {
            workflowService.sseChatResume(
                    resumeRequest("flow-resume-marker", "resume-marker"));

            okHttp.verify(() -> OkHttpUtil.connectRealEventSource(anyString(), anyMap(),
                    anyString(), any(EventSourceListener.class)), never());
        }

        verify(dataPermissionCheckTool).checkWorkflowBelong(workflow, null);
        verifyNoInteractions(appService);
    }

    @Test
    void chatRejectsDependencyAfterAuthoritativeToolAccessIsRevokedBeforeCoreCall() {
        BizWorkflowData data = workflowWithNode("plugin::node", new JSONObject()
                .fluentPut("pluginId", "revoked-tool")
                .fluentPut("operationId", "operation")
                .fluentPut("version", "V1.0"));
        Workflow workflow = executableWorkflow("flow-chat-revoked", data);
        when(workflowMapper.selectOne(any(Wrapper.class))).thenReturn(workflow);
        when(toolBoxMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                tool("revoked-tool", "operation", "V1.0", "other-user", null,
                        false, 1, false)));

        try (MockedStatic<OkHttpUtil> okHttp = mockStatic(OkHttpUtil.class)) {
            workflowService.sseChat(chatRequest("flow-chat-revoked", "chat-revoked"));

            okHttp.verify(() -> OkHttpUtil.connectRealEventSource(anyString(), anyMap(),
                    anyString(), any(EventSourceListener.class)), never());
        }

        verify(dataPermissionCheckTool).checkWorkflowBelong(workflow, null);
        verifyNoInteractions(appService);
    }

    @Test
    void resumeRejectsDependencyAfterAuthoritativeToolAccessIsRevokedBeforeCoreCall() {
        BizWorkflowData data = workflowWithNode("plugin::node", new JSONObject()
                .fluentPut("pluginId", "revoked-tool")
                .fluentPut("operationId", "operation")
                .fluentPut("version", "V1.0"));
        Workflow workflow = executableWorkflow("flow-resume-revoked", data);
        when(workflowMapper.selectOne(any(Wrapper.class))).thenReturn(workflow);
        when(toolBoxMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                tool("revoked-tool", "operation", "V1.0", "other-user", null,
                        false, 1, false)));

        try (MockedStatic<OkHttpUtil> okHttp = mockStatic(OkHttpUtil.class)) {
            workflowService.sseChatResume(
                    resumeRequest("flow-resume-revoked", "resume-revoked"));

            okHttp.verify(() -> OkHttpUtil.connectRealEventSource(anyString(), anyMap(),
                    anyString(), any(EventSourceListener.class)), never());
        }

        verify(dataPermissionCheckTool).checkWorkflowBelong(workflow, null);
        verifyNoInteractions(appService);
    }

    @Test
    void resumeRejectsWorkflowOutsideCurrentPermissionScopeBeforeDependencyOrCoreCall() {
        Workflow workflow = executableWorkflow("flow-resume-foreign", emptyWorkflow());
        when(workflowMapper.selectOne(any(Wrapper.class))).thenReturn(workflow);
        doThrow(new BusinessException(ResponseEnum.INSUFFICIENT_PERMISSIONS))
                .when(dataPermissionCheckTool)
                .checkWorkflowBelong(workflow, null);

        try (MockedStatic<OkHttpUtil> okHttp = mockStatic(OkHttpUtil.class)) {
            workflowService.sseChatResume(
                    resumeRequest("flow-resume-foreign", "resume-foreign"));

            okHttp.verify(() -> OkHttpUtil.connectRealEventSource(anyString(), anyMap(),
                    anyString(), any(EventSourceListener.class)), never());
        }

        verify(dataPermissionCheckTool).checkWorkflowBelong(workflow, null);
        verifyNoInteractions(appService, toolBoxMapper, dbInfoMapper, repoMapper);
    }

    @Test
    void chatWithAuthoritativeExecutableDraftContinuesToCore() {
        Workflow workflow = executableWorkflow("flow-chat-valid", emptyWorkflow());
        when(workflowMapper.selectOne(any(Wrapper.class))).thenReturn(workflow);
        when(appService.remoteCallAkSk("app-1")).thenReturn(new AkSk("api-key", "api-secret"));

        try (MockedStatic<OkHttpUtil> okHttp = mockStatic(OkHttpUtil.class)) {
            SseEmitter emitter = workflowService.sseChat(
                    chatRequest("flow-chat-valid", "chat-valid"));

            assertThat(emitter).isNotNull();
            okHttp.verify(() -> OkHttpUtil.connectRealEventSource(
                    eq("http://core/workflow/v1/debug/chat/completions"), anyMap(),
                    anyString(), any(EventSourceListener.class)), times(1));
        }

        verify(dataPermissionCheckTool).checkWorkflowBelong(workflow, null);
        verify(appService).remoteCallAkSk("app-1");
    }

    @Test
    void resumeWithAuthoritativeExecutableDraftContinuesToCore() {
        Workflow workflow = executableWorkflow("flow-resume-valid", emptyWorkflow());
        when(workflowMapper.selectOne(any(Wrapper.class))).thenReturn(workflow);
        when(appService.remoteCallAkSk("app-1")).thenReturn(new AkSk("api-key", "api-secret"));

        try (MockedStatic<OkHttpUtil> okHttp = mockStatic(OkHttpUtil.class)) {
            SseEmitter emitter = workflowService.sseChatResume(
                    resumeRequest("flow-resume-valid", "resume-valid"));

            assertThat(emitter).isNotNull();
            okHttp.verify(() -> OkHttpUtil.connectRealEventSource(
                    eq("http://core/workflow/v1/debug/resume"), anyMap(), anyString(),
                    any(EventSourceListener.class)), times(1));
        }

        verify(dataPermissionCheckTool).checkWorkflowBelong(workflow, null);
        verify(appService).remoteCallAkSk("app-1");
    }

    @Test
    void resolvedWorkflowPassesDependencyGuard() {
        BizNodeData data = new BizNodeData();
        data.setNodeMeta(new JSONObject());
        BizWorkflowNode node = new BizWorkflowNode();
        node.setId("message::node");
        node.setData(data);
        BizWorkflowData workflow = new BizWorkflowData();
        workflow.setNodes(List.of(node));

        assertThatCode(() -> workflowService.ensureNoUnresolvedImportDependencies(workflow))
                .doesNotThrowAnyException();
    }

    @Test
    void manuallyReboundPluginClearsStaleImportMarker() {
        when(toolBoxMapper.selectList(any(Wrapper.class)))
                .thenReturn(List.of(tool("target-plugin", "target-operation", "V1.0",
                        "current-user", null, false, 1, false)));
        BizWorkflowData workflow = workflowWithUnresolvedDependency();
        BizNodeData data = workflow.getNodes().getFirst().getData();
        data.setNodeParam(new JSONObject()
                .fluentPut("pluginId", "target-plugin")
                .fluentPut("operationId", "target-operation")
                .fluentPut("version", "V1.0"));

        assertThatCode(() -> workflowService.ensureNoUnresolvedImportDependencies(workflow))
                .doesNotThrowAnyException();
        assertThat(data.getNodeMeta())
                .doesNotContainKeys("importDependencies", "importDependencyStatus",
                        "importDependencyReason");
    }

    @Test
    void staleSourcePluginIdDoesNotClearImportMarker() {
        BizWorkflowData workflow = workflowWithUnresolvedDependency();
        workflow.getNodes()
                .getFirst()
                .getData()
                .setNodeParam(new JSONObject()
                        .fluentPut("pluginId", "source-plugin")
                        .fluentPut("operationId", "source-operation"));

        assertUnresolvedDependencyFailure(
                () -> workflowService.ensureNoUnresolvedImportDependencies(workflow));
    }

    @Test
    void restoredSameSourcePluginClearsMarkerOnlyWhenDatabaseBindingIsExecutable() {
        when(toolBoxMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                tool("source-plugin", "source-operation", "V1.0", "current-user", null,
                        false, 1, false)));
        BizWorkflowData workflow = workflowWithUnresolvedDependency();
        BizNodeData data = workflow.getNodes().getFirst().getData();
        data.setNodeParam(new JSONObject()
                .fluentPut("pluginId", "source-plugin")
                .fluentPut("operationId", "source-operation")
                .fluentPut("version", "V1.0"));

        assertThatCode(() -> workflowService.ensureNoUnresolvedImportDependencies(workflow))
                .doesNotThrowAnyException();
        assertThat(data.getNodeMeta()).doesNotContainKey("importDependencies");
    }

    @Test
    void reboundAgentKnowledgeClearsStaleImportMarker() {
        Repo repository = repository("target-repo", "current-user", null, false);
        when(repoMapper.selectList(any(Wrapper.class))).thenReturn(List.of(repository));
        JSONObject issue = importIssue("knowledge", null, null);
        JSONObject knowledge = new JSONObject().fluentPut("match",
                new JSONObject().fluentPut("repoIds", new JSONArray(List.of("target-repo"))));
        BizWorkflowData workflow = workflowWithIssue("agent::node", issue,
                new JSONObject().fluentPut("plugin",
                        new JSONObject().fluentPut("knowledge", new JSONArray(List.of(knowledge)))));

        assertThatCode(() -> workflowService.ensureNoUnresolvedImportDependencies(workflow))
                .doesNotThrowAnyException();
        assertThat(workflow.getNodes().getFirst().getData().getNodeMeta())
                .doesNotContainKeys("importDependencies", "importDependencyStatus");
    }

    @Test
    void fabricatedDatabaseIdCannotClearImportMarker() {
        BizWorkflowData workflow = workflowWithIssue("database::node",
                importIssue("database", null, null),
                new JSONObject().fluentPut("dbId", "999"));

        assertUnresolvedDependencyFailure(
                () -> workflowService.ensureNoUnresolvedImportDependencies(workflow));

        DbInfo database = database(999L, "current-user", null, false);
        when(dbInfoMapper.selectList(any(Wrapper.class))).thenReturn(List.of(database));
        assertThatCode(() -> workflowService.ensureNoUnresolvedImportDependencies(workflow))
                .doesNotThrowAnyException();
    }

    @Test
    void fabricatedOrForeignNestedWorkflowCannotClearImportMarker() {
        BizWorkflowData workflow = workflowWithIssue("flow::node",
                importIssue("workflow", null, null),
                new JSONObject().fluentPut("flowId", "target-flow"));

        assertUnresolvedDependencyFailure(
                () -> workflowService.ensureNoUnresolvedImportDependencies(workflow));

        when(workflowMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                nestedWorkflow("target-flow", "other-user", null, false, false)));
        assertUnresolvedDependencyFailure(
                () -> workflowService.ensureNoUnresolvedImportDependencies(workflow));

        when(workflowMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                nestedWorkflow("target-flow", "current-user", null, false, false)));
        assertThatCode(() -> workflowService.ensureNoUnresolvedImportDependencies(workflow))
                .doesNotThrowAnyException();
    }

    @Test
    void fabricatedKnowledgeIdsCannotClearNormalOrAgentMarkers() {
        BizWorkflowData normal = workflowWithIssue("knowledge-base::node",
                importIssue("knowledge", null, null),
                new JSONObject().fluentPut("repoId", new JSONArray(List.of("repo-a"))));
        JSONObject knowledge = new JSONObject().fluentPut("match",
                new JSONObject().fluentPut("repoIds", new JSONArray(List.of("repo-a", "repo-b"))));
        BizWorkflowData agent = workflowWithIssue("agent::node",
                importIssue("knowledge", null, null),
                new JSONObject().fluentPut("plugin",
                        new JSONObject().fluentPut("knowledge", new JSONArray(List.of(knowledge)))));

        assertUnresolvedDependencyFailure(
                () -> workflowService.ensureNoUnresolvedImportDependencies(normal));
        when(repoMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                repository("repo-a", "current-user", null, false)));
        assertThatCode(() -> workflowService.ensureNoUnresolvedImportDependencies(normal))
                .doesNotThrowAnyException();

        assertUnresolvedDependencyFailure(
                () -> workflowService.ensureNoUnresolvedImportDependencies(agent));
        when(repoMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                repository("repo-a", "current-user", null, false),
                repository("repo-b", "current-user", null, false)));
        assertThatCode(() -> workflowService.ensureNoUnresolvedImportDependencies(agent))
                .doesNotThrowAnyException();
    }

    @Test
    void fabricatedDatabaseIdIsRejectedAfterImportMarkersAreDeleted() {
        BizWorkflowData workflow = workflowWithIssue("database::node",
                importIssue("database", null, null),
                new JSONObject().fluentPut("dbId", "999"));
        deleteImportMarkers(workflow);

        assertUnresolvedDependencyFailure(
                () -> workflowService.ensureNoUnresolvedImportDependencies(workflow));
        verify(dbInfoMapper, times(1)).selectList(any(Wrapper.class));
    }

    @Test
    void fabricatedNestedWorkflowIdIsRejectedAfterImportMarkersAreDeleted() {
        BizWorkflowData workflow = workflowWithIssue("flow::node",
                importIssue("workflow", null, null),
                new JSONObject().fluentPut("flowId", "fabricated-flow"));
        deleteImportMarkers(workflow);

        assertUnresolvedDependencyFailure(
                () -> workflowService.ensureNoUnresolvedImportDependencies(workflow));
        verify(workflowMapper, times(1)).selectList(any(Wrapper.class));
    }

    @Test
    void fabricatedKnowledgeIdIsRejectedAfterImportMarkersAreDeleted() {
        BizWorkflowData workflow = workflowWithIssue("knowledge-base::node",
                importIssue("knowledge", null, null),
                new JSONObject().fluentPut("repoId", new JSONArray(List.of("fabricated-repo"))));
        deleteImportMarkers(workflow);

        assertUnresolvedDependencyFailure(
                () -> workflowService.ensureNoUnresolvedImportDependencies(workflow));
        verify(repoMapper, times(1)).selectList(any(Wrapper.class));
    }

    @Test
    void fabricatedAgentKnowledgeIdIsRejectedAfterImportMarkersAreDeleted() {
        JSONObject knowledge = new JSONObject().fluentPut("match",
                new JSONObject().fluentPut("repoIds",
                        new JSONArray(List.of("fabricated-agent-repo"))));
        BizWorkflowData workflow = workflowWithIssue("agent::node",
                importIssue("knowledge", null, null),
                new JSONObject().fluentPut("plugin",
                        new JSONObject().fluentPut("knowledge",
                                new JSONArray(List.of(knowledge)))));
        deleteImportMarkers(workflow);

        assertUnresolvedDependencyFailure(
                () -> workflowService.ensureNoUnresolvedImportDependencies(workflow));
        verify(repoMapper, times(1)).selectList(any(Wrapper.class));
    }

    @Test
    void nullableWorkflowPublicFlagDoesNotThrowDuringAuthoritativeValidation() {
        BizWorkflowData workflow = workflowWithNode("flow::node",
                new JSONObject().fluentPut("flowId", "owned-flow"));
        when(workflowMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                nestedWorkflow("owned-flow", "current-user", null, null, false)));

        assertThatCode(() -> workflowService.ensureNoUnresolvedImportDependencies(workflow))
                .doesNotThrowAnyException();
    }

    @Test
    void visibleKnowledgeBindingMayUseOuterRepositoryId() {
        BizWorkflowData workflow = workflowWithNode("knowledge-base::node",
                new JSONObject().fluentPut("repoId", new JSONArray(List.of("outer-repo"))));
        Repo repository = repository("core-repo", "current-user", null, false);
        repository.setOuterRepoId("outer-repo");
        when(repoMapper.selectList(any(Wrapper.class))).thenReturn(List.of(repository));

        assertThatCode(() -> workflowService.ensureNoUnresolvedImportDependencies(workflow))
                .doesNotThrowAnyException();
    }

    @Test
    void personalRemoteKnowledgeBindingWithoutLocalRowPassesExecutionGuard() {
        BizWorkflowData workflow = workflowWithNode("knowledge-base::node",
                new JSONObject().fluentPut("repoId", new JSONArray(List.of("2001"))));
        when(repoMapper.selectList(any(Wrapper.class))).thenReturn(List.of());
        when(repoService.getStarFireData(any())).thenReturn(new JSONArray(List.of(
                new JSONObject().fluentPut("id", 2001L).fluentPut("uid", "current-user"))));

        assertThatCode(() -> workflowService.ensureNoUnresolvedImportDependencies(workflow))
                .doesNotThrowAnyException();
    }

    @Test
    void adminOwnedPrivateDatabaseIsRejectedButOwnedPersonalDatabasePasses() {
        BizWorkflowData workflow = workflowWithNode("database::node",
                new JSONObject().fluentPut("dbId", "101"));
        when(dbInfoMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                database(101L, "admin-user", null, false)));

        assertUnresolvedDependencyFailure(
                () -> workflowService.ensureNoUnresolvedImportDependencies(workflow));

        when(dbInfoMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                database(101L, "current-user", null, false)));
        assertThatCode(() -> workflowService.ensureNoUnresolvedImportDependencies(workflow))
                .doesNotThrowAnyException();
    }

    @Test
    void spaceDatabaseRequiresSameSpaceMembership() {
        setSpaceContext(7L);
        BizWorkflowData workflow = workflowWithNode("database::node",
                new JSONObject().fluentPut("dbId", "102"));
        when(dbInfoMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                database(102L, "space-owner", 7L, false)));

        assertUnresolvedDependencyFailure(
                () -> workflowService.ensureNoUnresolvedImportDependencies(workflow));

        when(spaceUserService.getRole(7L, "current-user")).thenReturn(SpaceRoleEnum.MEMBER);
        assertThatCode(() -> workflowService.ensureNoUnresolvedImportDependencies(workflow))
                .doesNotThrowAnyException();

        when(dbInfoMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                database(102L, "space-owner", 8L, false)));
        assertUnresolvedDependencyFailure(
                () -> workflowService.ensureNoUnresolvedImportDependencies(workflow));
    }

    @Test
    void adminOwnedPrivateRepositoryIsRejectedButOwnedPersonalRepositoryPasses() {
        BizWorkflowData workflow = workflowWithNode("knowledge-base::node",
                new JSONObject().fluentPut("repoId", new JSONArray(List.of("repo-private"))));
        when(repoMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                repository(41L, "repo-private", "admin-user", null, 0, false)));

        assertUnresolvedDependencyFailure(
                () -> workflowService.ensureNoUnresolvedImportDependencies(workflow));

        when(repoMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                repository(41L, "repo-private", "current-user", null, 0, false)));
        assertThatCode(() -> workflowService.ensureNoUnresolvedImportDependencies(workflow))
                .doesNotThrowAnyException();
    }

    @Test
    void personalSharedRepositoryBindingUsesTypeOneVisibility() {
        BizWorkflowData workflow = workflowWithNode("knowledge-base::node",
                new JSONObject().fluentPut("repoId", new JSONArray(List.of("shared-repo"))));
        when(repoMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                repository(42L, "shared-repo", "other-user", null, 1, false)));
        when(groupVisibilityMapper.getRepoVisibilityList("current-user", null))
                .thenReturn(List.of(repositoryShare("42", null)));

        assertThatCode(() -> workflowService.ensureNoUnresolvedImportDependencies(workflow))
                .doesNotThrowAnyException();
        verify(groupVisibilityMapper, times(1))
                .getRepoVisibilityList("current-user", null);
    }

    @Test
    void spaceRepositoryAllowsSameSpaceAndSharedRowsForMembersInOneBatch() {
        setSpaceContext(7L);
        when(spaceUserService.getRole(7L, "current-user")).thenReturn(SpaceRoleEnum.MEMBER);
        BizWorkflowData workflow = workflowWithNode("knowledge-base::node",
                new JSONObject().fluentPut("repoId",
                        new JSONArray(List.of("same-space-repo", "shared-space-repo"))));
        when(repoMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                repository(51L, "same-space-repo", "space-owner", 7L, 0, false),
                repository(52L, "shared-space-repo", "other-owner", 8L, 1, false)));
        when(groupVisibilityMapper.getRepoVisibilityList("current-user", 7L))
                .thenReturn(List.of(repositoryShare("52", 7L)));

        assertThatCode(() -> workflowService.ensureNoUnresolvedImportDependencies(workflow))
                .doesNotThrowAnyException();
        verify(repoMapper, times(1)).selectList(any(Wrapper.class));
        verify(groupVisibilityMapper, times(1))
                .getRepoVisibilityList("current-user", 7L);
        verify(spaceUserService, times(1)).getRole(7L, "current-user");
    }

    @Test
    void personalWorkflowAllowsAdminPrivateWorkflow() {
        BizWorkflowData workflow = workflowWithNode("flow::node",
                new JSONObject().fluentPut("flowId", "admin-flow"));
        when(workflowMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                nestedWorkflow("admin-flow", "admin-user", 9L, false, false)));

        assertThatCode(() -> workflowService.ensureNoUnresolvedImportDependencies(workflow))
                .doesNotThrowAnyException();
    }

    @Test
    void spaceWorkflowAllowsPublicAndSameSpaceButRejectsPrivateCrossSpaceAdminWorkflow() {
        setSpaceContext(7L);
        BizWorkflowData workflow = workflowWithNode("flow::node",
                new JSONObject().fluentPut("flowId", "target-flow"));
        when(workflowMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                nestedWorkflow("target-flow", "space-owner", 7L, false, false)));
        assertThatCode(() -> workflowService.ensureNoUnresolvedImportDependencies(workflow))
                .doesNotThrowAnyException();

        when(workflowMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                nestedWorkflow("target-flow", "other-user", 8L, true, false)));
        assertThatCode(() -> workflowService.ensureNoUnresolvedImportDependencies(workflow))
                .doesNotThrowAnyException();

        when(workflowMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                nestedWorkflow("target-flow", "admin-user", 8L, false, false)));
        assertUnresolvedDependencyFailure(
                () -> workflowService.ensureNoUnresolvedImportDependencies(workflow));
    }

    @Test
    void agentSameNameReplacementRemovesUnresolvedDisplayAndClearsMarker() {
        when(toolBoxMapper.selectList(any(Wrapper.class)))
                .thenReturn(List.of(tool("target-plugin", "target-operation", "V2.0",
                        "current-user", null, false, 1, false)));
        JSONObject issue = importIssue("plugin", "source-plugin", "Portable Plugin");
        JSONObject unresolvedDisplay = new JSONObject()
                .fluentPut("type", "tool")
                .fluentPut("toolId", "source-plugin")
                .fluentPut("sourcePluginId", "source-plugin")
                .fluentPut("importDependencyStatus", "MISSING")
                .fluentPut("name", "Portable Plugin");
        JSONObject replacementDisplay = new JSONObject()
                .fluentPut("type", "tool")
                .fluentPut("toolId", "target-plugin")
                .fluentPut("name", "Portable Plugin");
        JSONObject plugin = new JSONObject()
                .fluentPut("tools", new JSONArray(List.of(new JSONObject()
                        .fluentPut("tool_id", "target-plugin")
                        .fluentPut("version", "V2.0"))))
                .fluentPut("toolsList", new JSONArray(List.of(
                        unresolvedDisplay, replacementDisplay)));
        BizWorkflowData workflow = workflowWithIssue("agent::node", issue,
                new JSONObject().fluentPut("plugin", plugin));

        assertThatCode(() -> workflowService.ensureNoUnresolvedImportDependencies(workflow))
                .doesNotThrowAnyException();
        assertThat(plugin.getJSONArray("toolsList"))
                .extracting(item -> ((JSONObject) item).getString("toolId"))
                .containsExactly("target-plugin");
    }

    @Test
    void agentMarkerDoesNotClearWhenRuntimeDisplayMatchesButDatabaseToolIsUnavailable() {
        JSONObject issue = importIssue("plugin", "source-plugin", "Portable Plugin");
        JSONObject unresolvedDisplay = new JSONObject()
                .fluentPut("type", "tool")
                .fluentPut("toolId", "source-plugin")
                .fluentPut("sourcePluginId", "source-plugin")
                .fluentPut("importDependencyStatus", "MISSING")
                .fluentPut("name", "Portable Plugin");
        JSONObject plugin = new JSONObject()
                .fluentPut("tools", new JSONArray(List.of(new JSONObject()
                        .fluentPut("tool_id", "source-plugin")
                        .fluentPut("version", "V1.0"))))
                .fluentPut("toolsList", new JSONArray(List.of(unresolvedDisplay)));
        BizWorkflowData workflow = workflowWithIssue("agent::node", issue,
                new JSONObject().fluentPut("plugin", plugin));

        assertUnresolvedDependencyFailure(
                () -> workflowService.ensureNoUnresolvedImportDependencies(workflow));
        assertThat(unresolvedDisplay).containsEntry("importDependencyStatus", "MISSING");
    }

    @Test
    void unrelatedAgentToolDoesNotRepairUnresolvedDependency() {
        JSONObject issue = importIssue("plugin", "source-plugin", "Portable Plugin");
        JSONObject unresolvedDisplay = new JSONObject()
                .fluentPut("type", "tool")
                .fluentPut("toolId", "source-plugin")
                .fluentPut("sourcePluginId", "source-plugin")
                .fluentPut("importDependencyStatus", "MISSING")
                .fluentPut("name", "Portable Plugin");
        JSONObject unrelatedDisplay = new JSONObject()
                .fluentPut("type", "tool")
                .fluentPut("toolId", "unrelated-plugin")
                .fluentPut("name", "Unrelated Plugin");
        JSONObject plugin = new JSONObject()
                .fluentPut("tools", new JSONArray(List.of(new JSONObject()
                        .fluentPut("tool_id", "unrelated-plugin"))))
                .fluentPut("toolsList", new JSONArray(List.of(
                        unresolvedDisplay, unrelatedDisplay)));
        BizWorkflowData workflow = workflowWithIssue("agent::node", issue,
                new JSONObject().fluentPut("plugin", plugin));

        assertUnresolvedDependencyFailure(
                () -> workflowService.ensureNoUnresolvedImportDependencies(workflow));
    }

    @Test
    void pluginBindingRequiresFormalVisibleMatchingOperationAndVersion() {
        BizWorkflowData workflow = workflowWithNode("plugin::node", new JSONObject()
                .fluentPut("pluginId", "tool-id")
                .fluentPut("operationId", "expected-operation")
                .fluentPut("version", "V2.0"));

        when(toolBoxMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                tool("tool-id", "expected-operation", "V2.0", "current-user", null,
                        false, 0, false)));
        assertUnresolvedDependencyFailure(
                () -> workflowService.ensureNoUnresolvedImportDependencies(workflow));

        when(toolBoxMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                tool("tool-id", "other-operation", "V2.0", "current-user", null,
                        false, 1, false)));
        assertUnresolvedDependencyFailure(
                () -> workflowService.ensureNoUnresolvedImportDependencies(workflow));

        when(toolBoxMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                tool("tool-id", "expected-operation", "V3.0", "current-user", null,
                        false, 1, false)));
        assertUnresolvedDependencyFailure(
                () -> workflowService.ensureNoUnresolvedImportDependencies(workflow));
    }

    @Test
    void pluginBindingAllowsEligiblePersonalAndPublicTools() {
        BizWorkflowData workflow = workflowWithNode("plugin::node", new JSONObject()
                .fluentPut("pluginId", "tool-id")
                .fluentPut("operationId", "operation")
                .fluentPut("version", "V1.0"));
        when(toolBoxMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                tool("tool-id", "operation", "V1.0", "current-user", null,
                        false, 1, false)));

        assertThatCode(() -> workflowService.ensureNoUnresolvedImportDependencies(workflow))
                .doesNotThrowAnyException();

        when(toolBoxMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                tool("tool-id", "operation", "V1.0", "other-user", null,
                        true, 1, false)));
        assertThatCode(() -> workflowService.ensureNoUnresolvedImportDependencies(workflow))
                .doesNotThrowAnyException();
    }

    @Test
    void pluginBindingAllowsAuthoritativeNullVersionWhenDslOmitsVersion() {
        BizWorkflowData workflow = workflowWithNode("plugin::node", new JSONObject()
                .fluentPut("pluginId", "legacy-tool")
                .fluentPut("operationId", "operation"));
        when(toolBoxMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                tool("legacy-tool", "operation", null, "current-user", null,
                        false, 1, false)));

        assertThatCode(() -> workflowService.ensureNoUnresolvedImportDependencies(workflow))
                .doesNotThrowAnyException();
    }

    @Test
    void pluginBindingRejectsPrivateForeignAndDeletedTools() {
        BizWorkflowData workflow = workflowWithNode("plugin::node", new JSONObject()
                .fluentPut("pluginId", "tool-id")
                .fluentPut("operationId", "operation"));
        when(toolBoxMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                tool("tool-id", "operation", "V1.0", "other-user", null,
                        false, 1, false)));
        assertUnresolvedDependencyFailure(
                () -> workflowService.ensureNoUnresolvedImportDependencies(workflow));

        when(toolBoxMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                tool("tool-id", "operation", "V1.0", "current-user", null,
                        false, 1, true)));
        assertUnresolvedDependencyFailure(
                () -> workflowService.ensureNoUnresolvedImportDependencies(workflow));
    }

    @Test
    void spaceToolRequiresCurrentSpaceMembership() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("space-id", "7");
        request.setAttribute(JwtClaimsFilter.USER_ID_ATTRIBUTE, "current-user");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
        BizWorkflowData workflow = workflowWithNode("plugin::node", new JSONObject()
                .fluentPut("pluginId", "space-tool")
                .fluentPut("operationId", "operation")
                .fluentPut("version", "V1.0"));
        when(toolBoxMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                tool("space-tool", "operation", "V1.0", "space-owner", 7L,
                        false, 1, false)));

        assertUnresolvedDependencyFailure(
                () -> workflowService.ensureNoUnresolvedImportDependencies(workflow));

        when(spaceUserService.getRole(7L, "current-user")).thenReturn(SpaceRoleEnum.MEMBER);
        assertThatCode(() -> workflowService.ensureNoUnresolvedImportDependencies(workflow))
                .doesNotThrowAnyException();
    }

    @Test
    void agentRuntimeObjectRequiresMatchingVersionButLegacyStringOnlyRequiresTool() {
        ToolBox formal = tool("agent-tool", "runtime-operation", "V2.0",
                "current-user", null, false, 1, false);
        when(toolBoxMapper.selectList(any(Wrapper.class))).thenReturn(List.of(formal));
        BizWorkflowData versioned = agentWorkflow(new JSONArray(List.of(new JSONObject()
                .fluentPut("tool_id", "agent-tool")
                .fluentPut("version", "V1.0"))));
        assertUnresolvedDependencyFailure(
                () -> workflowService.ensureNoUnresolvedImportDependencies(versioned));

        BizWorkflowData legacy = agentWorkflow(new JSONArray(List.of("agent-tool")));
        assertThatCode(() -> workflowService.ensureNoUnresolvedImportDependencies(legacy))
                .doesNotThrowAnyException();
    }

    @Test
    void multiplePluginNodesUseOneAuthoritativeBatchQuery() {
        when(toolBoxMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                tool("tool-a", "operation-a", "V1.0", "current-user", null,
                        false, 1, false),
                tool("tool-b", "operation-b", "V1.0", "current-user", null,
                        false, 1, false)));
        BizWorkflowData workflow = new BizWorkflowData();
        workflow.setNodes(List.of(
                workflowWithNode("plugin::a", new JSONObject()
                        .fluentPut("pluginId", "tool-a")
                        .fluentPut("operationId", "operation-a")
                        .fluentPut("version", "V1.0")).getNodes().getFirst(),
                workflowWithNode("plugin::b", new JSONObject()
                        .fluentPut("pluginId", "tool-b")
                        .fluentPut("operationId", "operation-b")
                        .fluentPut("version", "V1.0")).getNodes().getFirst()));

        assertThatCode(() -> workflowService.ensureNoUnresolvedImportDependencies(workflow))
                .doesNotThrowAnyException();
        verify(toolBoxMapper, times(1)).selectList(any(Wrapper.class));
    }

    private BizWorkflowData workflowWithUnresolvedDependency() {
        JSONObject issue = importIssue("plugin", "source-plugin", null);
        return workflowWithIssue("plugin::node", issue, new JSONObject());
    }

    private JSONObject importIssue(String dependencyType, String sourcePluginId,
            String sourceName) {
        return new JSONObject()
                .fluentPut("dependencyType", dependencyType)
                .fluentPut("status", "MISSING")
                .fluentPut("sourcePluginId", sourcePluginId)
                .fluentPut("sourceName", sourceName);
    }

    private BizWorkflowData workflowWithIssue(String nodeId, JSONObject issue,
            JSONObject nodeParam) {
        BizNodeData data = new BizNodeData();
        data.setNodeParam(nodeParam);
        data.setNodeMeta(new JSONObject()
                .fluentPut("importDependencyStatus", "MISSING")
                .fluentPut("importDependencies", new JSONArray(List.of(issue))));
        BizWorkflowNode node = new BizWorkflowNode();
        node.setId(nodeId);
        node.setData(data);
        BizWorkflowData workflow = new BizWorkflowData();
        workflow.setNodes(List.of(node));
        return workflow;
    }

    private BizWorkflowData workflowWithNode(String nodeId, JSONObject nodeParam) {
        BizNodeData data = new BizNodeData();
        data.setNodeParam(nodeParam);
        data.setNodeMeta(new JSONObject());
        BizWorkflowNode node = new BizWorkflowNode();
        node.setId(nodeId);
        node.setData(data);
        BizWorkflowData workflow = new BizWorkflowData();
        workflow.setNodes(List.of(node));
        return workflow;
    }

    private BizWorkflowData agentWorkflow(JSONArray tools) {
        return workflowWithNode("agent::node", new JSONObject().fluentPut("plugin",
                new JSONObject().fluentPut("tools", tools)
                        .fluentPut("toolsList", new JSONArray())));
    }

    private BizWorkflowData emptyWorkflow() {
        BizWorkflowData workflow = new BizWorkflowData();
        workflow.setNodes(List.of());
        return workflow;
    }

    private Workflow executableWorkflow(String flowId, BizWorkflowData data) {
        Workflow workflow = new Workflow();
        workflow.setId(1L);
        workflow.setAppId("app-1");
        workflow.setFlowId(flowId);
        workflow.setUid("current-user");
        workflow.setDeleted(false);
        workflow.setData(JSON.toJSONString(data));
        return workflow;
    }

    private ChatBizReq chatRequest(String flowId, String chatId) {
        ChatBizReq request = new ChatBizReq();
        request.setFlowId(flowId);
        request.setChatId(chatId);
        request.setInputs(new JSONObject());
        return request;
    }

    private ChatResumeReq resumeRequest(String flowId, String eventId) {
        ChatResumeReq request = new ChatResumeReq();
        request.setFlowId(flowId);
        request.setEventId(eventId);
        request.setContent("continue");
        return request;
    }

    private ToolBox tool(String toolId, String operationId, String version, String userId,
            Long spaceId, boolean isPublic, int status, boolean deleted) {
        ToolBox tool = new ToolBox();
        tool.setToolId(toolId);
        tool.setOperationId(operationId);
        tool.setVersion(version);
        tool.setUserId(userId);
        tool.setSpaceId(spaceId);
        tool.setIsPublic(isPublic);
        tool.setStatus(status);
        tool.setDeleted(deleted);
        return tool;
    }

    private DbInfo database(long dbId, String uid, Long spaceId, boolean deleted) {
        DbInfo database = new DbInfo();
        database.setDbId(dbId);
        database.setUid(uid);
        database.setSpaceId(spaceId);
        database.setDeleted(deleted);
        return database;
    }

    private Workflow nestedWorkflow(String flowId, String uid, Long spaceId,
            Boolean isPublic, boolean deleted) {
        Workflow workflow = new Workflow();
        workflow.setFlowId(flowId);
        workflow.setUid(uid);
        workflow.setSpaceId(spaceId);
        workflow.setIsPublic(isPublic);
        workflow.setDeleted(deleted);
        return workflow;
    }

    private Repo repository(String coreRepoId, String uid, Long spaceId, boolean deleted) {
        return repository(null, coreRepoId, uid, spaceId, 0, deleted);
    }

    private Repo repository(Long id, String coreRepoId, String uid, Long spaceId,
            Integer visibility, boolean deleted) {
        Repo repository = new Repo();
        repository.setId(id);
        repository.setCoreRepoId(coreRepoId);
        repository.setUserId(uid);
        repository.setSpaceId(spaceId);
        repository.setVisibility(visibility);
        repository.setDeleted(deleted);
        return repository;
    }

    private GroupVisibility repositoryShare(String relationId, Long spaceId) {
        GroupVisibility visibility = new GroupVisibility();
        visibility.setType(1);
        visibility.setRelationId(relationId);
        visibility.setUserId("current-user");
        visibility.setSpaceId(spaceId);
        return visibility;
    }

    private void setSpaceContext(Long spaceId) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("space-id", String.valueOf(spaceId));
        request.setAttribute(JwtClaimsFilter.USER_ID_ATTRIBUTE, "current-user");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
    }

    private void deleteImportMarkers(BizWorkflowData workflow) {
        JSONObject meta = workflow.getNodes().getFirst().getData().getNodeMeta();
        meta.remove("importDependencies");
        meta.remove("importDependencyStatus");
        meta.remove("importDependencyReason");
    }

    private void assertUnresolvedDependencyFailure(ThrowingCall call) {
        assertThatThrownBy(call::run)
                .isInstanceOf(BusinessException.class)
                .extracting("responseEnum")
                .isEqualTo(ResponseEnum.WORKFLOW_IMPORT_DEPENDENCY_UNRESOLVED);
    }

    @FunctionalInterface
    private interface ThrowingCall {
        void run() throws Exception;
    }
}
