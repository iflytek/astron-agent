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
import com.iflytek.astron.console.toolkit.entity.dto.WorkflowComparisonReq;
import com.iflytek.astron.console.toolkit.entity.dto.WorkflowReq;
import com.iflytek.astron.console.toolkit.entity.core.workflow.sse.ChatResponse;
import com.iflytek.astron.console.toolkit.entity.table.database.DbInfo;
import com.iflytek.astron.console.toolkit.entity.table.ConfigInfo;
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
import com.iflytek.astron.console.toolkit.service.extra.CoreSystemService;
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
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Collection;
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
    private CoreSystemService coreSystemService;
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
        coreSystemService = mock(CoreSystemService.class);
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
        ReflectionTestUtils.setField(workflowService, "coreSystemService", coreSystemService);
        ReflectionTestUtils.setField(workflowService, "apiUrl", apiUrl);
        ReflectionTestUtils.setField(workflowService, "configInfoMapper", configInfoMapper);
        ConfigInfo multiRoundTypes = new ConfigInfo();
        multiRoundTypes.setValue("");
        when(configInfoMapper.selectOne(any(Wrapper.class))).thenReturn(multiRoundTypes);
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
    void executionEligibilityRejectsPersistedUnresolvedDependency() {
        Workflow workflow = executableWorkflow("flow-eligibility-unresolved",
                workflowWithUnresolvedDependency());
        when(workflowMapper.selectOne(any(Wrapper.class))).thenReturn(workflow);

        assertUnresolvedDependencyFailure(
                () -> workflowService.ensureExecutionEligible("flow-eligibility-unresolved"));

        verify(dataPermissionCheckTool).checkWorkflowBelong(workflow, null);
    }

    @Test
    void executionEligibilityAcceptsAuthorizedExecutablePersistedDraft() {
        Workflow workflow = executableWorkflow("flow-eligibility-valid", emptyWorkflow());
        when(workflowMapper.selectOne(any(Wrapper.class))).thenReturn(workflow);

        assertThatCode(() -> workflowService.ensureExecutionEligible("flow-eligibility-valid"))
                .doesNotThrowAnyException();

        verify(dataPermissionCheckTool).checkWorkflowBelong(workflow, null);
    }

    @Test
    void executionEligibilityRejectsWorkflowOutsideCurrentPermissionScopeBeforeDependencyQueries() {
        Workflow workflow = executableWorkflow("flow-eligibility-foreign", emptyWorkflow());
        when(workflowMapper.selectOne(any(Wrapper.class))).thenReturn(workflow);
        BusinessException forbidden = new BusinessException(ResponseEnum.INSUFFICIENT_PERMISSIONS);
        doThrow(forbidden).when(dataPermissionCheckTool).checkWorkflowBelong(workflow, null);

        assertThatThrownBy(() -> workflowService.ensureExecutionEligible("flow-eligibility-foreign"))
                .isSameAs(forbidden);

        verifyNoInteractions(toolBoxMapper, dbInfoMapper, repoMapper, groupVisibilityMapper);
    }

    @Test
    void explicitExecutionScopeKeepsResourceLevelFailClosedSemanticsForNonMember() {
        setSpaceContext(100L);
        when(spaceUserService.getRole(100L, "requester-uid")).thenReturn(null);

        assertUnresolvedDependencyFailure(() -> workflowService.ensureNoUnresolvedImportDependencies(
                workflowWithUnresolvedDependency(), "requester-uid", 100L));

        verify(spaceUserService).getRole(100L, "requester-uid");
    }

    @Test
    void explicitExecutionScopeRejectsPrivateSameSpaceWorkflowForFormerMember() {
        BizWorkflowData workflow = workflowWithNode("flow::node",
                new JSONObject().fluentPut("flowId", "private-space-flow"));
        when(workflowMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                nestedWorkflow("private-space-flow", "space-owner", 100L, false, false)));
        when(spaceUserService.getRole(100L, "former-member")).thenReturn(null);

        assertUnresolvedDependencyFailure(() -> workflowService.ensureNoUnresolvedImportDependencies(
                workflow, "former-member", 100L));

        verify(spaceUserService).getRole(100L, "former-member");
    }

    @Test
    void explicitExecutionScopeAllowsPrivateSameSpaceWorkflowForCurrentMember() {
        BizWorkflowData workflow = workflowWithNode("flow::node",
                new JSONObject().fluentPut("flowId", "private-space-flow"));
        when(workflowMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                nestedWorkflow("private-space-flow", "space-owner", 100L, false, false)));
        when(spaceUserService.getRole(100L, "current-member"))
                .thenReturn(SpaceRoleEnum.MEMBER);

        assertThatCode(() -> workflowService.ensureNoUnresolvedImportDependencies(
                workflow, "current-member", 100L)).doesNotThrowAnyException();
    }

    @Test
    void explicitExecutionScopeAllowsPublicCrossSpaceWorkflowForNonMember() {
        BizWorkflowData workflow = workflowWithNode("flow::node",
                new JSONObject().fluentPut("flowId", "public-cross-space-flow"));
        when(workflowMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                nestedWorkflow("public-cross-space-flow", "other-owner", 200L, true, false)));
        when(spaceUserService.getRole(100L, "non-member")).thenReturn(null);

        assertThatCode(() -> workflowService.ensureNoUnresolvedImportDependencies(
                workflow, "non-member", 100L)).doesNotThrowAnyException();
    }

    @Test
    void addComparisonsPreservesUnresolvedDependencyError() {
        WorkflowComparisonReq request = new WorkflowComparisonReq();
        request.setFlowId("flow-comparison-unresolved");
        request.setData(workflowWithUnresolvedDependency());
        Workflow workflow = executableWorkflow("flow-comparison-unresolved", emptyWorkflow());
        when(workflowMapper.selectOne(any(Wrapper.class))).thenReturn(workflow);

        assertUnresolvedDependencyFailure(() -> workflowService.addComparisons(request));
        verify(dataPermissionCheckTool).checkWorkflowBelong(workflow, null);
    }

    @Test
    void addComparisonsRejectsForeignWorkflowBeforeWritingCoreSnapshot() {
        WorkflowComparisonReq request = new WorkflowComparisonReq();
        request.setFlowId("flow-comparison-foreign");
        request.setData(emptyWorkflow());
        Workflow workflow = executableWorkflow("flow-comparison-foreign", emptyWorkflow());
        when(workflowMapper.selectOne(any(Wrapper.class))).thenReturn(workflow);
        BusinessException forbidden = new BusinessException(ResponseEnum.INSUFFICIENT_PERMISSIONS);
        doThrow(forbidden).when(dataPermissionCheckTool).checkWorkflowBelong(workflow, null);

        assertThatThrownBy(() -> workflowService.addComparisons(request)).isSameAs(forbidden);

        verifyNoInteractions(toolBoxMapper, dbInfoMapper, repoMapper, groupVisibilityMapper);
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
    void historicalComparisonChatValidatesExactSnapshotInsteadOfLiveDraft() {
        Workflow workflow = executableWorkflow("flow-chat-comparison",
                workflowWithUnresolvedDependency());
        when(workflowMapper.selectOne(any(Wrapper.class))).thenReturn(workflow);
        when(coreSystemService.getComparison("flow-chat-comparison", "comparison-version"))
                .thenReturn(comparisonProtocol(emptyWorkflow()));
        when(appService.remoteCallAkSk("app-1")).thenReturn(new AkSk("api-key", "api-secret"));
        ChatBizReq request = chatRequest("flow-chat-comparison", "chat-comparison");
        request.setVersion("comparison-version");

        try (MockedStatic<OkHttpUtil> okHttp = mockStatic(OkHttpUtil.class)) {
            workflowService.sseChat(request);

            okHttp.verify(() -> OkHttpUtil.connectRealEventSource(
                    eq("http://core/workflow/v1/debug/chat/completions"), anyMap(),
                    anyString(), any(EventSourceListener.class)), times(1));
        }

        verify(dataPermissionCheckTool).checkWorkflowBelong(workflow, null);
        verify(coreSystemService).getComparison("flow-chat-comparison", "comparison-version");
        verifyNoInteractions(toolBoxMapper, dbInfoMapper, repoMapper, groupVisibilityMapper);
    }

    @Test
    void historicalComparisonChatRejectsRevokedSnapshotDependencyBeforeCoreExecution() {
        Workflow workflow = executableWorkflow("flow-chat-comparison-revoked", emptyWorkflow());
        when(workflowMapper.selectOne(any(Wrapper.class))).thenReturn(workflow);
        BizWorkflowData snapshot = workflowWithNode("plugin::snapshot", new JSONObject()
                .fluentPut("pluginId", "revoked-tool")
                .fluentPut("operationId", "operation")
                .fluentPut("version", "V1.0"));
        when(coreSystemService.getComparison(
                "flow-chat-comparison-revoked", "comparison-version"))
                .thenReturn(comparisonProtocol(snapshot));
        when(toolBoxMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                tool("revoked-tool", "operation", "V1.0", "other-user", null,
                        false, 1, false)));
        ChatBizReq request = chatRequest(
                "flow-chat-comparison-revoked", "chat-comparison-revoked");
        request.setVersion("comparison-version");

        try (MockedStatic<OkHttpUtil> okHttp = mockStatic(OkHttpUtil.class)) {
            workflowService.sseChat(request);

            okHttp.verify(() -> OkHttpUtil.connectRealEventSource(anyString(), anyMap(),
                    anyString(), any(EventSourceListener.class)), never());
        }

        verifyNoInteractions(appService);
    }

    @Test
    void historicalComparisonResumeRejectsDeletedSnapshotDependencyBeforeCoreExecution() {
        Workflow workflow = executableWorkflow("flow-resume-comparison-deleted", emptyWorkflow());
        when(workflowMapper.selectOne(any(Wrapper.class))).thenReturn(workflow);
        BizWorkflowData snapshot = workflowWithNode("flow::snapshot",
                new JSONObject().fluentPut("flowId", "deleted-nested-flow"));
        when(coreSystemService.getComparison(
                "flow-resume-comparison-deleted", "comparison-version"))
                .thenReturn(comparisonProtocol(snapshot));
        when(workflowMapper.selectList(any(Wrapper.class))).thenReturn(List.of());
        ChatResumeReq request = resumeRequest(
                "flow-resume-comparison-deleted", "resume-comparison-deleted");
        request.setVersion("comparison-version");

        try (MockedStatic<OkHttpUtil> okHttp = mockStatic(OkHttpUtil.class)) {
            workflowService.sseChatResume(request);

            okHttp.verify(() -> OkHttpUtil.connectRealEventSource(anyString(), anyMap(),
                    anyString(), any(EventSourceListener.class)), never());
        }

        verifyNoInteractions(appService);
    }

    @Test
    void historicalComparisonChatStillRejectsForeignTopLevelWorkflow() {
        Workflow workflow = executableWorkflow("flow-chat-comparison-foreign",
                workflowWithUnresolvedDependency());
        when(workflowMapper.selectOne(any(Wrapper.class))).thenReturn(workflow);
        doThrow(new BusinessException(ResponseEnum.INSUFFICIENT_PERMISSIONS))
                .when(dataPermissionCheckTool)
                .checkWorkflowBelong(workflow, null);
        ChatBizReq request = chatRequest("flow-chat-comparison-foreign", "chat-comparison-foreign");
        request.setVersion("comparison-version");

        try (MockedStatic<OkHttpUtil> okHttp = mockStatic(OkHttpUtil.class)) {
            workflowService.sseChat(request);

            okHttp.verify(() -> OkHttpUtil.connectRealEventSource(anyString(), anyMap(),
                    anyString(), any(EventSourceListener.class)), never());
        }

        verify(dataPermissionCheckTool).checkWorkflowBelong(workflow, null);
        verifyNoInteractions(appService, toolBoxMapper, dbInfoMapper, repoMapper);
    }

    @Test
    void chatReturnsUnresolvedDependencyBusinessCodeInSseFrame() {
        Workflow workflow = executableWorkflow("flow-chat-code",
                workflowWithUnresolvedDependency());
        when(workflowMapper.selectOne(any(Wrapper.class))).thenReturn(workflow);

        SseEmitter emitter = workflowService.sseChat(
                chatRequest("flow-chat-code", "chat-code"));

        ChatResponse response = extractEarlySseResponse(emitter);
        assertThat(response.getCode())
                .isEqualTo(ResponseEnum.WORKFLOW_IMPORT_DEPENDENCY_UNRESOLVED.getCode());
        assertThat(response.getMessage()).isNotBlank();
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
    void malformedUnknownAndIncompleteImportIssuesFailClosed() {
        BizWorkflowData malformed = workflowWithIssue("plugin::malformed",
                new JSONObject(), new JSONObject());
        malformed.getNodes()
                .getFirst()
                .getData()
                .getNodeMeta()
                .put(
                        "importDependencies", new JSONArray(List.of("not-an-object")));

        BizWorkflowData unknownStatus = workflowWithIssue("plugin::unknown-status",
                importIssue("plugin", "source-plugin", null)
                        .fluentPut("status", "FUTURE_STATE"),
                new JSONObject()
                        .fluentPut("pluginId", "target-plugin")
                        .fluentPut("operationId", "target-operation")
                        .fluentPut("version", "V1.0"));

        BizWorkflowData unknownType = workflowWithIssue("plugin::unknown-type",
                importIssue("future-resource", "source-plugin", null), new JSONObject());

        BizWorkflowData missingIdentity = workflowWithIssue("plugin::missing-identity",
                importIssue("plugin", null, null), new JSONObject()
                        .fluentPut("pluginId", "target-plugin")
                        .fluentPut("operationId", "target-operation")
                        .fluentPut("version", "V1.0"));

        when(toolBoxMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                tool("target-plugin", "target-operation", "V1.0", "current-user", null,
                        false, 1, false)));

        assertUnresolvedDependencyFailure(
                () -> workflowService.ensureNoUnresolvedImportDependencies(malformed));
        assertUnresolvedDependencyFailure(
                () -> workflowService.ensureNoUnresolvedImportDependencies(unknownStatus));
        assertUnresolvedDependencyFailure(
                () -> workflowService.ensureNoUnresolvedImportDependencies(unknownType));
        assertUnresolvedDependencyFailure(
                () -> workflowService.ensureNoUnresolvedImportDependencies(missingIdentity));
    }

    @Test
    void knownResolvedImportIssueDoesNotBlockAnExecutableBinding() {
        BizWorkflowData workflow = workflowWithIssue("plugin::mapped",
                importIssue("plugin", null, null).fluentPut("status", "MAPPED"),
                new JSONObject()
                        .fluentPut("pluginId", "target-plugin")
                        .fluentPut("operationId", "target-operation")
                        .fluentPut("version", "V1.0"));
        when(toolBoxMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                tool("target-plugin", "target-operation", "V1.0", "current-user", null,
                        false, 1, false)));

        assertThatCode(() -> workflowService.ensureNoUnresolvedImportDependencies(workflow))
                .doesNotThrowAnyException();
    }

    @Test
    void resolvedImportIssueOnUnknownNodeFailsClosed() {
        BizWorkflowData workflow = workflowWithIssue("future-resource::mapped",
                importIssue("plugin", null, null).fluentPut("status", "MAPPED"),
                new JSONObject());

        assertUnresolvedDependencyFailure(
                () -> workflowService.ensureNoUnresolvedImportDependencies(workflow));
    }

    @Test
    void resolvedImportIssueWithMismatchedNodeTypeFailsClosed() {
        BizWorkflowData workflow = workflowWithIssue("database::mapped",
                importIssue("plugin", null, null).fluentPut("status", "MAPPED"),
                new JSONObject());

        assertUnresolvedDependencyFailure(
                () -> workflowService.ensureNoUnresolvedImportDependencies(workflow));
    }

    @Test
    void knownResolvedFallbackOnKnownNodeIsClearedAndUnknownFallbacksFailClosed() {
        BizWorkflowData resolved = workflowWithNode("plugin::mapped", new JSONObject()
                .fluentPut("pluginId", "target-plugin")
                .fluentPut("operationId", "target-operation")
                .fluentPut("version", "V1.0"));
        resolved.getNodes()
                .getFirst()
                .getData()
                .getNodeMeta()
                .put("importDependencyStatus", "MAPPED");
        when(toolBoxMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                tool("target-plugin", "target-operation", "V1.0", "current-user", null,
                        false, 1, false)));

        assertThatCode(() -> workflowService.ensureNoUnresolvedImportDependencies(resolved))
                .doesNotThrowAnyException();
        assertThat(resolved.getNodes().getFirst().getData().getNodeMeta())
                .doesNotContainKey("importDependencyStatus");

        BizWorkflowData unknownStatus = workflowWithNode("plugin::future", new JSONObject());
        unknownStatus.getNodes()
                .getFirst()
                .getData()
                .getNodeMeta()
                .put("importDependencyStatus", "FUTURE_STATE");
        assertUnresolvedDependencyFailure(
                () -> workflowService.ensureNoUnresolvedImportDependencies(unknownStatus));

        BizWorkflowData unknownNode = workflowWithNode("future-resource::mapped", new JSONObject());
        unknownNode.getNodes()
                .getFirst()
                .getData()
                .getNodeMeta()
                .put("importDependencyStatus", "MAPPED");
        assertUnresolvedDependencyFailure(
                () -> workflowService.ensureNoUnresolvedImportDependencies(unknownNode));
    }

    @Test
    void displayOnlyRepoListDoesNotBecomeAnExecutableKnowledgeBinding() {
        BizWorkflowData normal = workflowWithNode("knowledge-base::display-only",
                new JSONObject().fluentPut("repoList", new JSONArray(List.of(
                        new JSONObject().fluentPut("coreRepoId", "display-repo")))));
        BizWorkflowData professional = workflowWithNode("knowledge-pro-base::display-only",
                new JSONObject().fluentPut("repoList", new JSONArray(List.of(
                        new JSONObject().fluentPut("repoId", "display-repo")))));
        when(repoMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                repository("display-repo", "current-user", null, false)));

        assertThatCode(() -> workflowService.ensureNoUnresolvedImportDependencies(normal))
                .doesNotThrowAnyException();
        assertThatCode(() -> workflowService.ensureNoUnresolvedImportDependencies(professional))
                .doesNotThrowAnyException();

        verifyNoInteractions(repoMapper);
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
                importIssue("database", "source-database", null),
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
                importIssue("workflow", "source-flow", null),
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
                importIssue("knowledge", "source-repo", null),
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
    void expertKnowledgeReposRejectRepositoryOutsideExecutionScope() {
        BizWorkflowData workflow = workflowWithNode("knowledge-expert-base::node",
                new JSONObject().fluentPut("repos", new JSONArray(List.of(
                        new JSONObject().fluentPut("repoId", "foreign-expert-repo")))));
        when(repoMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                repository("foreign-expert-repo", "other-user", null, false)));

        assertUnresolvedDependencyFailure(
                () -> workflowService.ensureNoUnresolvedImportDependencies(workflow));

        verify(repoMapper, times(1)).selectList(any(Wrapper.class));
    }

    @Test
    void expertKnowledgeReposAllowRepositoryVisibleInExecutionScope() {
        BizWorkflowData workflow = workflowWithNode("knowledge-expert-base::node",
                new JSONObject().fluentPut("repos", new JSONArray(List.of(
                        new JSONObject().fluentPut("repoId", "owned-expert-repo")))));
        when(repoMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                repository("owned-expert-repo", "current-user", null, false)));

        assertThatCode(() -> workflowService.ensureNoUnresolvedImportDependencies(workflow))
                .doesNotThrowAnyException();

        verify(repoMapper, times(1)).selectList(any(Wrapper.class));
    }

    @Test
    void knowledgeReposTakePrecedenceOverLegacyRepoIdDuringExecutionValidation() {
        BizWorkflowData workflow = workflowWithNode("knowledge-base::node",
                new JSONObject()
                        .fluentPut("repos", new JSONArray(List.of(
                                new JSONObject().fluentPut("repoId", "active-repo"))))
                        .fluentPut("repoId", new JSONArray(List.of("ignored-legacy-repo"))));
        when(repoMapper.selectList(any(Wrapper.class))).thenReturn(List.of(
                repository("active-repo", "current-user", null, false)));

        assertThatCode(() -> workflowService.ensureNoUnresolvedImportDependencies(workflow))
                .doesNotThrowAnyException();

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
    void explicitPersonalRemoteKnowledgeWithoutRequestContextFailsClosedAsUnresolved() {
        BizWorkflowData workflow = workflowWithNode("knowledge-base::node",
                new JSONObject().fluentPut("repoId", new JSONArray(List.of("2001"))));
        when(repoMapper.selectList(any(Wrapper.class))).thenReturn(List.of());
        RequestContextHolder.resetRequestAttributes();

        assertUnresolvedDependencyFailure(() -> workflowService.ensureNoUnresolvedImportDependencies(
                workflow, "approval-user", null));

        verify(repoService, never()).getStarFireData(any());
    }

    @Test
    void topLevelSpaceWorkflowRejectsFormerMemberBeforeCredentialsAndCore() {
        Workflow workflow = executableWorkflow("flow-former-member", emptyWorkflow());
        workflow.setUid("space-owner");
        workflow.setSpaceId(100L);
        when(workflowMapper.selectOne(any(Wrapper.class))).thenReturn(workflow);
        setSpaceContext(100L);
        when(spaceUserService.getRole(100L, "current-user")).thenReturn(null);

        try (MockedStatic<OkHttpUtil> okHttp = mockStatic(OkHttpUtil.class)) {
            assertThatThrownBy(() -> workflowService.ensureExecutionEligible("flow-former-member"))
                    .isInstanceOf(BusinessException.class)
                    .extracting("responseEnum")
                    .isEqualTo(ResponseEnum.INSUFFICIENT_PERMISSIONS);

            okHttp.verifyNoInteractions();
        }

        verifyNoInteractions(appService, toolBoxMapper, dbInfoMapper, repoMapper);
        verify(dataPermissionCheckTool, never()).checkWorkflowBelong(any(), any());
    }

    @Test
    void topLevelSpaceWorkflowAllowsCurrentMember() {
        Workflow workflow = executableWorkflow("flow-current-member", emptyWorkflow());
        workflow.setUid("space-owner");
        workflow.setSpaceId(100L);
        when(workflowMapper.selectOne(any(Wrapper.class))).thenReturn(workflow);
        setSpaceContext(100L);
        when(spaceUserService.getRole(100L, "current-user"))
                .thenReturn(SpaceRoleEnum.MEMBER);

        assertThatCode(() -> workflowService.ensureExecutionEligible("flow-current-member"))
                .doesNotThrowAnyException();

        verify(dataPermissionCheckTool).checkWorkflowBelong(workflow, 100L);
    }

    @Test
    void topLevelPublicWorkflowCannotExecuteAcrossScope() {
        Workflow workflow = executableWorkflow("flow-public-foreign", emptyWorkflow());
        workflow.setUid("other-user");
        workflow.setIsPublic(Boolean.TRUE);
        when(workflowMapper.selectOne(any(Wrapper.class))).thenReturn(workflow);

        assertThatThrownBy(() -> workflowService.ensureExecutionEligible("flow-public-foreign"))
                .isInstanceOf(BusinessException.class)
                .extracting("responseEnum")
                .isEqualTo(ResponseEnum.INSUFFICIENT_PERMISSIONS);

        verify(dataPermissionCheckTool, never()).checkWorkflowBelong(any(), any());
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
        when(spaceUserService.getRole(7L, "current-user")).thenReturn(SpaceRoleEnum.MEMBER);
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

    private JSONObject comparisonProtocol(BizWorkflowData workflowData) {
        return new JSONObject().fluentPut("data", new JSONObject()
                .fluentPut("nodes", JSON.parseArray(JSON.toJSONString(workflowData.getNodes())))
                .fluentPut("edges", new JSONArray()));
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

    @SuppressWarnings("unchecked")
    private ChatResponse extractEarlySseResponse(SseEmitter emitter) {
        Collection<ResponseBodyEmitter.DataWithMediaType> events =
                (Collection<ResponseBodyEmitter.DataWithMediaType>) ReflectionTestUtils.getField(
                        emitter, "earlySendAttempts");
        assertThat(events).isNotNull();
        return events.stream()
                .map(ResponseBodyEmitter.DataWithMediaType::getData)
                .filter(ChatResponse.class::isInstance)
                .map(ChatResponse.class::cast)
                .findFirst()
                .orElseThrow();
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
