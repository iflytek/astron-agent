package com.iflytek.astron.console.toolkit.service.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.baomidou.mybatisplus.core.conditions.AbstractWrapper;
import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.config.JwtClaimsFilter;
import com.iflytek.astron.console.commons.entity.workflow.Workflow;
import com.iflytek.astron.console.commons.enums.space.SpaceRoleEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.service.space.SpaceUserService;
import com.iflytek.astron.console.commons.service.data.UserLangChainDataService;
import com.iflytek.astron.console.toolkit.entity.table.workflow.WorkflowVersion;
import com.iflytek.astron.console.toolkit.mapper.workflow.WorkflowMapper;
import com.iflytek.astron.console.toolkit.mapper.workflow.WorkflowVersionMapper;
import com.iflytek.astron.console.toolkit.tool.DataPermissionCheckTool;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

class VersionServiceAuthorizationTest {

    private VersionService service;
    private WorkflowMapper workflowMapper;
    private WorkflowVersionMapper workflowVersionMapper;
    private DataPermissionCheckTool permissionCheck;
    private SpaceUserService spaceUserService;
    private UserLangChainDataService userLangChainDataService;

    @BeforeAll
    static void initTableInfo() {
        TableInfoHelper.initTableInfo(
                new MapperBuilderAssistant(new MybatisConfiguration(), ""),
                WorkflowVersion.class);
    }

    @BeforeEach
    void setUp() {
        service = new VersionService();
        workflowMapper = mock(WorkflowMapper.class);
        workflowVersionMapper = mock(WorkflowVersionMapper.class);
        permissionCheck = mock(DataPermissionCheckTool.class);
        spaceUserService = mock(SpaceUserService.class);
        userLangChainDataService = mock(UserLangChainDataService.class);
        service.workflowMapper = workflowMapper;
        service.workflowVersionMapper = workflowVersionMapper;
        service.dataPermissionCheckTool = permissionCheck;
        service.spaceUserService = spaceUserService;
        service.userLangChainDataService = userLangChainDataService;
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setAttribute(JwtClaimsFilter.USER_ID_ATTRIBUTE, "current-user");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
    }

    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void restoreRejectsVersionThatDoesNotBelongToAuthorizedFlow() {
        Workflow ownedWorkflow = workflow("owned-flow");
        when(workflowMapper.selectOne(any())).thenReturn(ownedWorkflow);
        when(workflowVersionMapper.selectOne(any())).thenReturn(null);
        WorkflowVersion request = new WorkflowVersion();
        request.setId(99L);
        request.setFlowId("owned-flow");

        assertThatThrownBy(() -> service.restore(request))
                .isInstanceOf(BusinessException.class);

        verify(workflowMapper, never()).update(any(), any(Wrapper.class));
        verify(workflowVersionMapper, never()).update(any(), any(Wrapper.class));
    }

    @Test
    void channelResultUpdateStopsBeforeMutationWhenWorkflowIsUnauthorized() {
        WorkflowVersion version = new WorkflowVersion();
        version.setId(99L);
        version.setFlowId("victim-flow");
        Workflow victimWorkflow = workflow("victim-flow");
        victimWorkflow.setUid("victim");
        victimWorkflow.setIsPublic(Boolean.TRUE);
        when(workflowVersionMapper.selectOne(any())).thenReturn(version);
        when(workflowMapper.selectOne(any())).thenReturn(victimWorkflow);
        WorkflowVersion request = new WorkflowVersion();
        request.setId(99L);
        request.setPublishResult("Success");

        assertThatThrownBy(() -> service.update_channel_result(request))
                .isInstanceOf(BusinessException.class);

        verify(workflowVersionMapper, never()).update(any(), any(Wrapper.class));
    }

    @Test
    void metadataQueriesAuthorizeTheirWorkflowBeforeReadingVersions() {
        Workflow workflow = workflow("flow-1");
        when(workflowMapper.selectOne(any())).thenReturn(workflow);
        doThrow(new BusinessException(ResponseEnum.INSUFFICIENT_PERMISSIONS))
                .when(permissionCheck)
                .checkWorkflowVisible(workflow, null);
        WorkflowVersion request = new WorkflowVersion();
        request.setFlowId("flow-1");
        request.setName("v1.0");

        assertThatThrownBy(() -> service.haveVersionSysData(request))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.publishResult("flow-1", "v1.0"))
                .isInstanceOf(BusinessException.class);

        verify(workflowVersionMapper, never()).selectList(any());
    }

    @Test
    void boundBotResultUpdateUsesExplicitOwnerWithoutRequestContext() {
        RequestContextHolder.resetRequestAttributes();
        WorkflowVersion version = version(99L, "flow-1");
        Workflow workflow = workflow("flow-1");
        workflow.setUid("owner");
        workflow.setSpaceId(100L);
        when(workflowVersionMapper.selectOne(any())).thenReturn(version);
        when(workflowMapper.selectOne(any())).thenReturn(workflow);
        when(spaceUserService.getRole(100L, "owner")).thenReturn(SpaceRoleEnum.OWNER);
        when(workflowVersionMapper.update(any(), any(Wrapper.class))).thenReturn(1);
        WorkflowVersion request = version(99L, "flow-1");
        request.setPublishResult("Success");

        service.updateChannelResultForBoundBotPublish(request, "owner", 100L);

        verify(workflowVersionMapper).update(any(), any(Wrapper.class));
        verify(permissionCheck, never()).checkWorkflowBelong(any(Workflow.class), any());
    }

    @Test
    void resultUpdateFindsActiveVersionAndWritesResultUsingNumericDeletionFlag() {
        WorkflowVersion stored = version(99L, "flow-1");
        stored.setDeleted(1L);
        when(workflowVersionMapper.selectOne(any())).thenReturn(stored);
        when(workflowMapper.selectOne(any())).thenReturn(workflow("flow-1"));
        when(workflowVersionMapper.update(any(), any(Wrapper.class))).thenReturn(1);
        WorkflowVersion request = version(99L, "flow-1");
        request.setPublishResult("Success");

        assertThat(service.update_channel_result(request).code()).isZero();

        ArgumentCaptor<Wrapper<WorkflowVersion>> lookup = ArgumentCaptor.forClass(Wrapper.class);
        verify(workflowVersionMapper).selectOne(lookup.capture());
        assertActiveVersionFilter(lookup.getValue());
        ArgumentCaptor<Wrapper<WorkflowVersion>> update = ArgumentCaptor.forClass(Wrapper.class);
        verify(workflowVersionMapper).update(any(), update.capture());
        assertActiveVersionFilter(update.getValue());
        assertThat(((AbstractWrapper<?, ?, ?>) update.getValue()).getParamNameValuePairs().values())
                .contains("成功");
    }

    @Test
    void deleteTransitionsActiveVersionFromOneToTwo() {
        WorkflowVersion stored = version(99L, "flow-1");
        stored.setDeleted(1L);
        when(workflowVersionMapper.selectOne(any())).thenReturn(stored);
        when(workflowMapper.selectOne(any())).thenReturn(workflow("flow-1"));
        when(workflowVersionMapper.update(any(), any(Wrapper.class))).thenReturn(1);

        service.logicDelete(99L);

        ArgumentCaptor<Wrapper<WorkflowVersion>> update = ArgumentCaptor.forClass(Wrapper.class);
        verify(workflowVersionMapper).update(any(), update.capture());
        assertActiveVersionFilter(update.getValue());
        assertThat(((AbstractWrapper<?, ?, ?>) update.getValue()).getParamNameValuePairs().values())
                .contains(2L);
    }

    @Test
    void publishResultOnlyQueriesActiveVersions() {
        when(workflowMapper.selectOne(any())).thenReturn(workflow("flow-1"));
        when(workflowVersionMapper.selectList(any())).thenReturn(java.util.List.of());

        service.publishResult("flow-1", "v1.0");

        ArgumentCaptor<Wrapper<WorkflowVersion>> lookup = ArgumentCaptor.forClass(Wrapper.class);
        verify(workflowVersionMapper).selectList(lookup.capture());
        assertActiveVersionFilter(lookup.getValue());
    }

    private void assertActiveVersionFilter(Wrapper<WorkflowVersion> wrapper) {
        assertThat(wrapper.getSqlSegment()).contains("deleted =");
        assertThat(((AbstractWrapper<?, ?, ?>) wrapper).getParamNameValuePairs().values())
                .contains(1L)
                .doesNotContain(false, 0, 0L);
    }

    @Test
    void boundBotResultUpdateRejectsMismatchedFlow() {
        WorkflowVersion storedVersion = version(99L, "victim-flow");
        when(workflowVersionMapper.selectOne(any())).thenReturn(storedVersion);
        WorkflowVersion request = version(99L, "other-flow");
        request.setPublishResult("Success");

        assertThatThrownBy(() -> service.updateChannelResultForBoundBotPublish(
                request, "owner", null))
                .isInstanceOf(BusinessException.class);

        verify(workflowMapper, never()).selectOne(any());
        verify(workflowVersionMapper, never()).update(any(), any(Wrapper.class));
    }

    @Test
    void boundBotResultUpdateRejectsUnknownVersion() {
        when(workflowVersionMapper.selectOne(any())).thenReturn(null);
        WorkflowVersion request = version(404L, "flow-1");
        request.setPublishResult("Success");

        assertThatThrownBy(() -> service.updateChannelResultForBoundBotPublish(
                        request, "owner", null))
                .isInstanceOf(BusinessException.class);

        verify(workflowMapper, never()).selectOne(any());
        verify(workflowVersionMapper, never()).update(any(), any(Wrapper.class));
    }

    @Test
    void boundBotResultUpdateRejectsMismatchedSpace() {
        WorkflowVersion version = version(99L, "space-flow");
        Workflow workflow = workflow("space-flow");
        workflow.setUid("owner");
        workflow.setSpaceId(100L);
        when(workflowVersionMapper.selectOne(any())).thenReturn(version);
        when(workflowMapper.selectOne(any())).thenReturn(workflow);
        WorkflowVersion request = version(99L, "space-flow");
        request.setPublishResult("Success");

        assertThatThrownBy(() -> service.updateChannelResultForBoundBotPublish(
                request, "owner", 200L))
                .isInstanceOf(BusinessException.class);

        verify(spaceUserService, never()).getRole(any(), any());
        verify(workflowVersionMapper, never()).update(any(), any(Wrapper.class));
    }

    @Test
    void publicWorkflowNeverGrantsRestoreOrVersionDeletePermission() {
        Workflow publicVictim = workflow("public-flow");
        publicVictim.setUid("victim");
        publicVictim.setIsPublic(Boolean.TRUE);
        WorkflowVersion stored = version(99L, "public-flow");
        when(workflowMapper.selectOne(any())).thenReturn(publicVictim);
        when(workflowVersionMapper.selectOne(any())).thenReturn(stored);
        WorkflowVersion restore = version(99L, "public-flow");

        assertThatThrownBy(() -> service.restore(restore))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.logicDelete(99L))
                .isInstanceOf(BusinessException.class);

        verify(workflowMapper, never()).update(any(), any(Wrapper.class));
        verify(workflowVersionMapper, never()).update(any(), any(Wrapper.class));
    }

    @Test
    void getMaxVersionResolvesAuthoritativeFlowAndAuthorizesBeforeVersionQuery() {
        when(userLangChainDataService.findFlowIdByBotId(7)).thenReturn("victim-flow");
        Workflow victim = workflow("victim-flow");
        victim.setUid("victim");
        when(workflowMapper.selectOne(any())).thenReturn(victim);
        doThrow(new BusinessException(ResponseEnum.INSUFFICIENT_PERMISSIONS))
                .when(permissionCheck)
                .checkWorkflowVisible(victim, null);

        assertThatThrownBy(() -> service.getMaxVersion("7"))
                .isInstanceOf(BusinessException.class)
                .extracting("responseEnum")
                .isEqualTo(ResponseEnum.INSUFFICIENT_PERMISSIONS);

        verify(workflowVersionMapper, never()).selectOne(any());
    }

    private WorkflowVersion version(Long id, String flowId) {
        WorkflowVersion version = new WorkflowVersion();
        version.setId(id);
        version.setFlowId(flowId);
        return version;
    }

    private Workflow workflow(String flowId) {
        Workflow workflow = new Workflow();
        workflow.setFlowId(flowId);
        workflow.setDeleted(false);
        workflow.setUid("current-user");
        return workflow;
    }
}
