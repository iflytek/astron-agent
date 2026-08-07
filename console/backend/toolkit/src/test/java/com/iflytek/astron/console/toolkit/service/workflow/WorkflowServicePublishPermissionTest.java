package com.iflytek.astron.console.toolkit.service.workflow;

import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.iflytek.astron.console.commons.config.JwtClaimsFilter;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.entity.workflow.Workflow;
import com.iflytek.astron.console.commons.enums.space.SpaceRoleEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.service.space.SpaceUserService;
import com.iflytek.astron.console.toolkit.tool.DataPermissionCheckTool;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkflowServicePublishPermissionTest {

    @Mock
    private DataPermissionCheckTool dataPermissionCheckTool;
    @Mock
    private SpaceUserService spaceUserService;

    private WorkflowService workflowService;

    @BeforeAll
    static void initTableInfo() {
        TableInfoHelper.initTableInfo(new MapperBuilderAssistant(new MybatisConfiguration(), ""), Workflow.class);
    }

    @BeforeEach
    void setUp() {
        workflowService = spy(new WorkflowService());
        ReflectionTestUtils.setField(workflowService, "dataPermissionCheckTool", dataPermissionCheckTool);
        ReflectionTestUtils.setField(workflowService, "spaceUserService", spaceUserService);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("space-id", "100");
        request.setAttribute(JwtClaimsFilter.USER_ID_ATTRIBUTE, "member-uid");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
    }

    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void spaceMemberShouldNotSetWorkflowCanPublish() {
        Workflow workflow = workflow(100L);
        doReturn(workflow).when(workflowService).getById(1L);
        when(spaceUserService.getRole(100L, "member-uid")).thenReturn(SpaceRoleEnum.MEMBER);

        assertThatThrownBy(() -> workflowService.canPublishSet(1L))
                .isInstanceOf(BusinessException.class)
                .extracting("code")
                .isEqualTo(ResponseEnum.INSUFFICIENT_PERMISSIONS.getCode());

        verify(workflowService, never()).update(any(Wrapper.class));
    }

    @Test
    void spaceAdminShouldSetWorkflowCanPublish() {
        Workflow workflow = workflow(100L);
        doReturn(workflow).when(workflowService).getById(1L);
        doReturn(true).when(workflowService).update(any(Wrapper.class));
        when(spaceUserService.getRole(100L, "member-uid")).thenReturn(SpaceRoleEnum.ADMIN);

        Object result = workflowService.canPublishSet(1L);

        assertThat(result).isEqualTo(true);
        verifyNoInteractions(dataPermissionCheckTool);
        verify(workflowService).update(any(Wrapper.class));
    }

    @Test
    void spaceMemberShouldNotSetWorkflowCanPublishNot() {
        Workflow workflow = workflow(100L);
        doReturn(workflow).when(workflowService).getById(1L);
        when(spaceUserService.getRole(100L, "member-uid")).thenReturn(SpaceRoleEnum.MEMBER);

        assertThatThrownBy(() -> workflowService.canPublishSetNot(1L))
                .isInstanceOf(BusinessException.class)
                .extracting("code")
                .isEqualTo(ResponseEnum.INSUFFICIENT_PERMISSIONS.getCode());

        verifyNoInteractions(dataPermissionCheckTool);
        verify(workflowService, never()).update(any(Wrapper.class));
    }

    @Test
    void spaceAdminShouldSetWorkflowCanPublishNot() {
        Workflow workflow = workflow(100L);
        doReturn(workflow).when(workflowService).getById(1L);
        doReturn(true).when(workflowService).update(any(Wrapper.class));
        when(spaceUserService.getRole(100L, "member-uid")).thenReturn(SpaceRoleEnum.ADMIN);

        Object result = workflowService.canPublishSetNot(1L);

        assertThat(result).isEqualTo(true);
        verifyNoInteractions(dataPermissionCheckTool);
        verify(workflowService).update(any(Wrapper.class));
    }

    @Test
    void spaceOwnerShouldSetWorkflowCanPublish() {
        Workflow workflow = workflow(100L);
        doReturn(workflow).when(workflowService).getById(1L);
        doReturn(true).when(workflowService).update(any(Wrapper.class));
        when(spaceUserService.getRole(100L, "member-uid")).thenReturn(SpaceRoleEnum.OWNER);

        Object result = workflowService.canPublishSet(1L);

        assertThat(result).isEqualTo(true);
        verifyNoInteractions(dataPermissionCheckTool);
        verify(workflowService).update(any(Wrapper.class));
    }

    @Test
    void spaceOwnerShouldSetWorkflowCanPublishNot() {
        Workflow workflow = workflow(100L);
        doReturn(workflow).when(workflowService).getById(1L);
        doReturn(true).when(workflowService).update(any(Wrapper.class));
        when(spaceUserService.getRole(100L, "member-uid")).thenReturn(SpaceRoleEnum.OWNER);

        Object result = workflowService.canPublishSetNot(1L);

        assertThat(result).isEqualTo(true);
        verifyNoInteractions(dataPermissionCheckTool);
        verify(workflowService).update(any(Wrapper.class));
    }

    @Test
    void publicWorkflowFromAnotherSpaceShouldNotSetWorkflowCanPublish() {
        Workflow workflow = workflow(200L);
        workflow.setIsPublic(true);
        doReturn(workflow).when(workflowService).getById(1L);

        assertThatThrownBy(() -> workflowService.canPublishSet(1L))
                .isInstanceOf(BusinessException.class)
                .extracting("code")
                .isEqualTo(ResponseEnum.INSUFFICIENT_PERMISSIONS.getCode());

        verifyNoInteractions(dataPermissionCheckTool);
        verify(workflowService, never()).update(any(Wrapper.class));
    }

    @Test
    void publicWorkflowFromAnotherSpaceShouldNotSetWorkflowCanPublishNot() {
        Workflow workflow = workflow(200L);
        workflow.setIsPublic(true);
        doReturn(workflow).when(workflowService).getById(1L);

        assertThatThrownBy(() -> workflowService.canPublishSetNot(1L))
                .isInstanceOf(BusinessException.class)
                .extracting("code")
                .isEqualTo(ResponseEnum.INSUFFICIENT_PERMISSIONS.getCode());

        verifyNoInteractions(dataPermissionCheckTool);
        verify(workflowService, never()).update(any(Wrapper.class));
    }

    private Workflow workflow(Long spaceId) {
        Workflow workflow = new Workflow();
        workflow.setId(1L);
        workflow.setAppId("app-1");
        workflow.setFlowId("flow-1");
        workflow.setSpaceId(spaceId);
        return workflow;
    }
}
