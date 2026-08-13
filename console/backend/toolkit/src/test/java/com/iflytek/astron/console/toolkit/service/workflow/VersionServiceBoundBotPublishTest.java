package com.iflytek.astron.console.toolkit.service.workflow;

import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.config.JwtClaimsFilter;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.entity.workflow.Workflow;
import com.iflytek.astron.console.commons.enums.space.SpaceRoleEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.commons.service.space.SpaceUserService;
import com.iflytek.astron.console.toolkit.entity.core.workflow.FlowProtocol;
import com.iflytek.astron.console.toolkit.entity.table.workflow.WorkflowVersion;
import com.iflytek.astron.console.toolkit.mapper.workflow.WorkflowMapper;
import com.iflytek.astron.console.toolkit.mapper.workflow.WorkflowVersionMapper;
import com.iflytek.astron.console.toolkit.tool.DataPermissionCheckTool;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VersionServiceBoundBotPublishTest {

    @Mock
    private WorkflowMapper workflowMapper;
    @Mock
    private WorkflowVersionMapper workflowVersionMapper;
    @Mock
    private DataPermissionCheckTool dataPermissionCheckTool;
    @Mock
    private WorkflowService workflowService;
    @Mock
    private SpaceUserService spaceUserService;

    private VersionService versionService;

    @BeforeEach
    void setUp() {
        versionService = spy(new VersionService());
        versionService.workflowMapper = workflowMapper;
        versionService.workflowVersionMapper = workflowVersionMapper;
        versionService.dataPermissionCheckTool = dataPermissionCheckTool;
        versionService.workflowService = workflowService;
        versionService.spaceUserService = spaceUserService;

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setAttribute(JwtClaimsFilter.USER_ID_ATTRIBUTE, "current-user");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
    }

    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void getVersionNameForBoundBotPublishShouldNotCheckWorkflowSpaceBelong() {
        when(workflowMapper.selectOne(any())).thenReturn(workflow());
        when(workflowVersionMapper.selectOne(any())).thenReturn(null);

        WorkflowVersion query = new WorkflowVersion();
        query.setFlowId("flow-1");
        ApiResult<JSONObject> result = versionService.getVersionNameForBoundBotPublish(query);

        assertThat(result.code()).isZero();
        assertThat(result.data().getString("workflowVersionName")).isEqualTo("v1.0");
        verify(dataPermissionCheckTool, never()).checkWorkflowBelong(any(Workflow.class), any());
    }

    @Test
    void createForBoundBotPublishShouldPreserveUnresolvedDependencyErrorWithoutMutatingVersions() {
        Workflow workflow = workflow();
        workflow.setSpaceId(1L);
        when(workflowMapper.selectOne(any())).thenReturn(workflow);
        when(spaceUserService.getRole(1L, "requester-uid"))
                .thenReturn(SpaceRoleEnum.MEMBER);
        BusinessException unresolved =
                new BusinessException(ResponseEnum.WORKFLOW_IMPORT_DEPENDENCY_UNRESOLVED);
        when(workflowService.buildWorkflowData(any(), any(), any(), any())).thenThrow(unresolved);
        WorkflowVersion create = new WorkflowVersion();
        create.setFlowId("flow-1");
        create.setName("v1.0");

        assertThatThrownBy(() -> versionService.createForBoundBotPublish(
                create, "requester-uid", 1L))
                .isSameAs(unresolved)
                .extracting("code")
                .isEqualTo(ResponseEnum.WORKFLOW_IMPORT_DEPENDENCY_UNRESOLVED.getCode());

        verify(workflowVersionMapper, never()).update(any(), any());
        verify(workflowVersionMapper, never()).insert(any(WorkflowVersion.class));
    }

    @Test
    void createForBoundBotPublishShouldRejectFormerMemberBeforeReadingEmptyWorkflowData() {
        Workflow workflow = workflow();
        workflow.setSpaceId(1L);
        workflow.setData("");
        when(workflowMapper.selectOne(any())).thenReturn(workflow);
        when(spaceUserService.getRole(1L, "former-member")).thenReturn(null);

        assertInsufficientPermissions(
                () -> versionService.createForBoundBotPublish(
                        createRequest(), "former-member", 1L));

        verifyNoInteractions(workflowService);
        verify(workflowVersionMapper, never()).update(any(), any());
        verify(workflowVersionMapper, never()).insert(any(WorkflowVersion.class));
    }

    @Test
    void createForBoundBotPublishShouldRejectForeignPersonalWorkflow() {
        Workflow workflow = workflow();
        workflow.setSpaceId(null);
        workflow.setUid("owner-uid");
        when(workflowMapper.selectOne(any())).thenReturn(workflow);

        assertInsufficientPermissions(
                () -> versionService.createForBoundBotPublish(
                        createRequest(), "foreign-uid", null));

        verifyNoInteractions(spaceUserService, workflowService);
        verify(workflowVersionMapper, never()).update(any(), any());
        verify(workflowVersionMapper, never()).insert(any(WorkflowVersion.class));
    }

    @Test
    void createForBoundBotPublishShouldAllowCurrentTeamMember() {
        Workflow workflow = workflow();
        workflow.setSpaceId(1L);
        when(workflowMapper.selectOne(any())).thenReturn(workflow);
        when(spaceUserService.getRole(1L, "current-member"))
                .thenReturn(SpaceRoleEnum.MEMBER);
        when(workflowService.buildWorkflowData(any(), any(), any(), any()))
                .thenReturn(new FlowProtocol());
        doNothing().when(versionService).updateIsVersionForFlowId("flow-1");

        ApiResult<JSONObject> result = versionService.createForBoundBotPublish(
                createRequest(), "current-member", 1L);

        assertThat(result.code()).isZero();
        verify(workflowService).buildWorkflowData(
                any(), any(), org.mockito.ArgumentMatchers.eq("current-member"),
                org.mockito.ArgumentMatchers.eq(1L));
        verify(versionService).updateIsVersionForFlowId("flow-1");
        verify(workflowVersionMapper).insert(any(WorkflowVersion.class));
    }

    @Test
    void ordinaryCreateShouldRejectForeignPublicWorkflow() {
        Workflow workflow = personalWorkflow("owner-uid");
        workflow.setIsPublic(true);
        when(workflowMapper.selectOne(any())).thenReturn(workflow);

        assertInsufficientPermissions(
                () -> versionService.createForSpace(createRequest(), null));

        verifyNoInteractions(spaceUserService, workflowService);
        verify(workflowVersionMapper, never()).insert(any(WorkflowVersion.class));
    }

    @Test
    void ordinaryCreateShouldRejectForeignAdminOwnedWorkflow() {
        Workflow workflow = personalWorkflow("admin-user");
        when(workflowMapper.selectOne(any())).thenReturn(workflow);

        assertInsufficientPermissions(
                () -> versionService.createForSpace(createRequest(), null));

        verifyNoInteractions(spaceUserService, workflowService);
        verify(workflowVersionMapper, never()).insert(any(WorkflowVersion.class));
    }

    @Test
    void ordinaryCreateShouldRejectForeignPrivateWorkflow() {
        Workflow workflow = personalWorkflow("owner-uid");
        when(workflowMapper.selectOne(any())).thenReturn(workflow);

        assertInsufficientPermissions(
                () -> versionService.createForSpace(createRequest(), null));

        verifyNoInteractions(spaceUserService, workflowService);
        verify(workflowVersionMapper, never()).insert(any(WorkflowVersion.class));
    }

    @Test
    void ordinaryCreateShouldAllowCurrentTeamMember() {
        Workflow workflow = workflow();
        workflow.setSpaceId(1L);
        when(workflowMapper.selectOne(any())).thenReturn(workflow);
        when(spaceUserService.getRole(1L, "current-user"))
                .thenReturn(SpaceRoleEnum.MEMBER);
        when(workflowService.buildWorkflowData(any(), any(), any(), any()))
                .thenReturn(new FlowProtocol());
        doNothing().when(versionService).updateIsVersionForFlowId("flow-1");

        ApiResult<JSONObject> result = versionService.createForSpace(createRequest(), 1L);

        assertThat(result.code()).isZero();
        verify(workflowService).buildWorkflowData(
                any(), any(), org.mockito.ArgumentMatchers.eq("current-user"),
                org.mockito.ArgumentMatchers.eq(1L));
        verify(versionService).updateIsVersionForFlowId("flow-1");
        verify(workflowVersionMapper).insert(any(WorkflowVersion.class));
    }

    @Test
    void ordinaryCreateShouldRejectDeletedWorkflowViaFilteredLookup() {
        Workflow deleted = personalWorkflow("current-user");
        deleted.setDeleted(true);
        when(workflowMapper.selectOne(any())).thenReturn(deleted);

        assertThatThrownBy(() -> versionService.createForSpace(createRequest(), null))
                .isInstanceOf(BusinessException.class)
                .extracting("code")
                .isEqualTo(ResponseEnum.WORKFLOW_NOT_EXIST.getCode());

        verifyNoInteractions(spaceUserService, workflowService);
        verify(workflowVersionMapper, never()).insert(any(WorkflowVersion.class));
    }

    private void assertInsufficientPermissions(org.assertj.core.api.ThrowableAssert.ThrowingCallable action) {
        assertThatThrownBy(action)
                .isInstanceOf(BusinessException.class)
                .extracting("code")
                .isEqualTo(ResponseEnum.INSUFFICIENT_PERMISSIONS.getCode());
    }

    private WorkflowVersion createRequest() {
        WorkflowVersion create = new WorkflowVersion();
        create.setFlowId("flow-1");
        create.setName("v1.0");
        return create;
    }

    private Workflow workflow() {
        Workflow workflow = new Workflow();
        workflow.setId(7L);
        workflow.setFlowId("flow-1");
        workflow.setName("workflow");
        workflow.setDescription("description");
        workflow.setData("{}");
        workflow.setSpaceId(99L);
        workflow.setIsPublic(false);
        return workflow;
    }

    private Workflow personalWorkflow(String uid) {
        Workflow workflow = workflow();
        workflow.setUid(uid);
        workflow.setSpaceId(null);
        return workflow;
    }
}
