package com.iflytek.astron.console.hub.service.publish.impl;

import com.alibaba.fastjson2.JSONObject;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.entity.bot.ChatBotBase;
import com.iflytek.astron.console.commons.entity.user.AppMst;
import com.iflytek.astron.console.commons.entity.workflow.Workflow;
import com.iflytek.astron.console.commons.enums.space.SpaceRoleEnum;
import com.iflytek.astron.console.commons.enums.space.SpaceTypeEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.mapper.bot.ChatBotBaseMapper;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.commons.service.space.SpaceService;
import com.iflytek.astron.console.commons.service.space.SpaceUserService;
import com.iflytek.astron.console.commons.service.user.AppMstService;
import com.iflytek.astron.console.hub.dto.PageResponse;
import com.iflytek.astron.console.hub.dto.publish.approval.PublishApprovalDto;
import com.iflytek.astron.console.hub.dto.publish.approval.PublishApprovalQueryDto;
import com.iflytek.astron.console.hub.dto.publish.approval.PublishApprovalDecisionDto;
import com.iflytek.astron.console.hub.dto.publish.approval.PublishApprovalReviewDto;
import com.iflytek.astron.console.hub.dto.publish.approval.PublishApprovalSubmitDto;
import com.iflytek.astron.console.hub.entity.PublishApproval;
import com.iflytek.astron.console.hub.enums.publish.PublishApprovalActionEnum;
import com.iflytek.astron.console.hub.enums.publish.PublishApprovalResourceTypeEnum;
import com.iflytek.astron.console.hub.enums.publish.PublishApprovalStatusEnum;
import com.iflytek.astron.console.hub.enums.publish.PublishApprovalTypeEnum;
import com.iflytek.astron.console.hub.mapper.PublishApprovalMapper;
import com.iflytek.astron.console.hub.service.publish.executor.PublishApprovalExecutor;
import com.iflytek.astron.console.toolkit.mapper.workflow.WorkflowMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PublishApprovalServiceImpl")
class PublishApprovalServiceImplTest {

    @Mock
    private PublishApprovalMapper publishApprovalMapper;
    @Mock
    private SpaceService spaceService;
    @Mock
    private SpaceUserService spaceUserService;
    @Mock
    private ChatBotBaseMapper chatBotBaseMapper;
    @Mock
    private WorkflowMapper workflowMapper;
    @Mock
    private AppMstService appMstService;
    @Mock
    private PublishApprovalExecutor publishApprovalExecutor;

    private PublishApprovalServiceImpl publishApprovalService;

    @BeforeEach
    void setUp() {
        publishApprovalService = new PublishApprovalServiceImpl(
                publishApprovalMapper,
                spaceService,
                spaceUserService,
                chatBotBaseMapper,
                workflowMapper,
                appMstService,
                List.of(publishApprovalExecutor));
    }

    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void personalSpacePublishShouldNotCreateApproval() {
        PublishApprovalSubmitDto submit = submitDto("member-uid", PublishApprovalActionEnum.PUBLISH);
        submit.setSpaceId(null);

        PublishApprovalDecisionDto decision = publishApprovalService.submitIfRequired(submit);

        assertThat(decision.getApprovalRequired()).isFalse();
        assertThat(decision.getStatus()).isNull();
        verify(spaceService, never()).getSpaceType(any());
        verify(spaceUserService, never()).getRole(any(), any());
        verify(publishApprovalMapper, never()).insert(any(PublishApproval.class));
    }

    @Test
    void personalSpaceOwnerPublishShouldNotCreateApproval() {
        PublishApprovalSubmitDto submit = submitDto("owner-uid", PublishApprovalActionEnum.PUBLISH);
        when(spaceUserService.getRole(100L, "owner-uid")).thenReturn(SpaceRoleEnum.OWNER);

        PublishApprovalDecisionDto decision = publishApprovalService.submitIfRequired(submit);

        assertThat(decision.getApprovalRequired()).isFalse();
        verify(spaceService, never()).getSpaceType(100L);
        verify(publishApprovalMapper, never()).insert(any(PublishApproval.class));
    }

    @Test
    void memberShouldOnlyListOwnApprovals() {
        PublishApproval approval = pendingApproval(123L, "member-uid");
        Page<PublishApproval> resultPage = new Page<>(1, 10);
        resultPage.setTotal(1L);
        resultPage.setRecords(List.of(approval));
        when(spaceUserService.getRole(100L, "member-uid")).thenReturn(SpaceRoleEnum.MEMBER);
        when(publishApprovalMapper.selectPage(any(Page.class), any())).thenReturn(resultPage);

        PageResponse<PublishApprovalDto> response = publishApprovalService.page(
                PublishApprovalQueryDto.builder().page(1).size(10).build(),
                "member-uid",
                100L);

        assertThat(response.getTotal()).isEqualTo(1L);
        assertThat(response.getRecords()).hasSize(1);
        assertThat(response.getRecords().get(0).getRequesterUid()).isEqualTo("member-uid");
        assertThat(response.getRecords().get(0).getCanReview()).isFalse();
        assertThat(response.getRecords().get(0).getCanCancel()).isTrue();
    }

    @Test
    void adminShouldReceiveReviewCapabilityInApprovalList() {
        PublishApproval approval = pendingApproval(123L, "member-uid");
        Page<PublishApproval> resultPage = new Page<>(1, 10);
        resultPage.setTotal(1L);
        resultPage.setRecords(List.of(approval));
        when(spaceUserService.getRole(100L, "admin-uid")).thenReturn(SpaceRoleEnum.ADMIN);
        when(publishApprovalMapper.selectPage(any(Page.class), any())).thenReturn(resultPage);

        PageResponse<PublishApprovalDto> response = publishApprovalService.page(
                PublishApprovalQueryDto.builder().page(1).size(10).build(),
                "admin-uid",
                100L);

        assertThat(response.getRecords()).hasSize(1);
        assertThat(response.getRecords().get(0).getCanReview()).isTrue();
        assertThat(response.getRecords().get(0).getCanCancel()).isFalse();
    }

    @Test
    void adminShouldApprovePendingApprovalAndExecutePublish() {
        PublishApproval approval = pendingApproval(123L, "member-uid");
        when(spaceUserService.getRole(100L, "admin-uid")).thenReturn(SpaceRoleEnum.ADMIN);
        when(publishApprovalMapper.selectById(123L)).thenReturn(approval);
        when(publishApprovalMapper.update(any(PublishApproval.class), any())).thenReturn(1);
        when(publishApprovalExecutor.supports(approval)).thenReturn(true);
        when(publishApprovalExecutor.execute(approval)).thenReturn(ApiResult.success("published"));

        PublishApprovalDecisionDto decision = publishApprovalService.approve(
                123L,
                PublishApprovalReviewDto.builder().reviewComment("ok").build(),
                "admin-uid",
                100L);

        assertThat(decision.getApprovalRequired()).isFalse();
        assertThat(decision.getApprovalId()).isEqualTo(123L);
        assertThat(decision.getStatus()).isEqualTo(PublishApprovalStatusEnum.APPROVED.name());

        ArgumentCaptor<PublishApproval> captor = ArgumentCaptor.forClass(PublishApproval.class);
        verify(publishApprovalMapper).updateById(captor.capture());
        PublishApproval executed = captor.getValue();
        assertThat(executed.getApprovalStatus()).isEqualTo(PublishApprovalStatusEnum.APPROVED.name());
        assertThat(executed.getReviewerUid()).isEqualTo("admin-uid");
        assertThat(executed.getReviewComment()).isEqualTo("ok");
        assertThat(executed.getExecutionResult()).contains("published");
    }

    @Test
    void approveShouldNotExecuteWhenPendingStatusWasAlreadyTaken() {
        PublishApproval approval = pendingApproval(123L, "member-uid");
        when(spaceUserService.getRole(100L, "admin-uid")).thenReturn(SpaceRoleEnum.ADMIN);
        when(publishApprovalMapper.selectById(123L)).thenReturn(approval);
        when(publishApprovalMapper.update(any(PublishApproval.class), any())).thenReturn(0);

        assertThatThrownBy(() -> publishApprovalService.approve(
                123L,
                PublishApprovalReviewDto.builder().reviewComment("ok").build(),
                "admin-uid",
                100L))
                .isInstanceOf(BusinessException.class)
                .extracting("code")
                .isEqualTo(ResponseEnum.OPERATION_FAILED.getCode());

        verify(publishApprovalExecutor, never()).execute(any());
        verify(publishApprovalMapper, never()).updateById(any(PublishApproval.class));
    }

    @Test
    void approveShouldExecuteWithoutReviewerRequestContextAndRestoreContext() {
        PublishApproval approval = pendingApproval(123L, "member-uid");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer reviewer-token");
        ServletRequestAttributes attributes = new ServletRequestAttributes(request);
        RequestContextHolder.setRequestAttributes(attributes);

        when(spaceUserService.getRole(100L, "admin-uid")).thenReturn(SpaceRoleEnum.ADMIN);
        when(publishApprovalMapper.selectById(123L)).thenReturn(approval);
        when(publishApprovalMapper.update(any(PublishApproval.class), any())).thenReturn(1);
        when(publishApprovalExecutor.supports(approval)).thenReturn(true);
        when(publishApprovalExecutor.execute(approval)).thenAnswer(invocation -> {
            assertThat(RequestContextHolder.getRequestAttributes()).isNull();
            return ApiResult.success("published");
        });

        publishApprovalService.approve(
                123L,
                PublishApprovalReviewDto.builder().reviewComment("ok").build(),
                "admin-uid",
                100L);

        assertThat(RequestContextHolder.getRequestAttributes()).isSameAs(attributes);
    }

    @Test
    void memberShouldNotApproveApproval() {
        when(spaceUserService.getRole(100L, "member-uid")).thenReturn(SpaceRoleEnum.MEMBER);

        assertThatThrownBy(() -> publishApprovalService.approve(
                123L,
                PublishApprovalReviewDto.builder().build(),
                "member-uid",
                100L))
                .isInstanceOf(BusinessException.class)
                .extracting("code")
                .isEqualTo(ResponseEnum.INSUFFICIENT_PERMISSIONS.getCode());

        verify(publishApprovalMapper, never()).selectById(any());
        verify(publishApprovalExecutor, never()).execute(any());
    }

    @Test
    void requesterShouldCancelOwnPendingApproval() {
        PublishApproval approval = pendingApproval(123L, "member-uid");
        when(publishApprovalMapper.selectById(123L)).thenReturn(approval);
        when(publishApprovalMapper.update(any(PublishApproval.class), any())).thenReturn(1);

        PublishApprovalDecisionDto decision = publishApprovalService.cancel(123L, "member-uid", 100L);

        assertThat(decision.getStatus()).isEqualTo(PublishApprovalStatusEnum.CANCELED.name());
        ArgumentCaptor<PublishApproval> captor = ArgumentCaptor.forClass(PublishApproval.class);
        verify(publishApprovalMapper).update(captor.capture(), any());
        assertThat(captor.getValue().getApprovalStatus()).isEqualTo(PublishApprovalStatusEnum.CANCELED.name());
    }

    @Test
    void cancelShouldFailWhenPendingStatusWasAlreadyTaken() {
        PublishApproval approval = pendingApproval(123L, "member-uid");
        when(publishApprovalMapper.selectById(123L)).thenReturn(approval);
        when(publishApprovalMapper.update(any(PublishApproval.class), any())).thenReturn(0);

        assertThatThrownBy(() -> publishApprovalService.cancel(123L, "member-uid", 100L))
                .isInstanceOf(BusinessException.class)
                .extracting("code")
                .isEqualTo(ResponseEnum.OPERATION_FAILED.getCode());

        verify(publishApprovalMapper, never()).updateById(any(PublishApproval.class));
    }

    @Test
    void adminShouldRejectPendingApprovalWithConditionalStatusChange() {
        PublishApproval approval = pendingApproval(123L, "member-uid");
        when(spaceUserService.getRole(100L, "admin-uid")).thenReturn(SpaceRoleEnum.ADMIN);
        when(publishApprovalMapper.selectById(123L)).thenReturn(approval);
        when(publishApprovalMapper.update(any(PublishApproval.class), any())).thenReturn(1);

        PublishApprovalDecisionDto decision = publishApprovalService.reject(
                123L,
                PublishApprovalReviewDto.builder().reviewComment("no").build(),
                "admin-uid",
                100L);

        assertThat(decision.getStatus()).isEqualTo(PublishApprovalStatusEnum.REJECTED.name());
        ArgumentCaptor<PublishApproval> captor = ArgumentCaptor.forClass(PublishApproval.class);
        verify(publishApprovalMapper).update(captor.capture(), any());
        assertThat(captor.getValue().getApprovalStatus()).isEqualTo(PublishApprovalStatusEnum.REJECTED.name());
        assertThat(captor.getValue().getReviewerUid()).isEqualTo("admin-uid");
        assertThat(captor.getValue().getReviewComment()).isEqualTo("no");
    }

    @Test
    void rejectShouldFailWhenPendingStatusWasAlreadyTaken() {
        PublishApproval approval = pendingApproval(123L, "member-uid");
        when(spaceUserService.getRole(100L, "admin-uid")).thenReturn(SpaceRoleEnum.ADMIN);
        when(publishApprovalMapper.selectById(123L)).thenReturn(approval);
        when(publishApprovalMapper.update(any(PublishApproval.class), any())).thenReturn(0);

        assertThatThrownBy(() -> publishApprovalService.reject(
                123L,
                PublishApprovalReviewDto.builder().reviewComment("no").build(),
                "admin-uid",
                100L))
                .isInstanceOf(BusinessException.class)
                .extracting("code")
                .isEqualTo(ResponseEnum.OPERATION_FAILED.getCode());

        verify(publishApprovalMapper, never()).updateById(any(PublishApproval.class));
    }

    @Test
    void teamAdminPublishShouldNotCreateApproval() {
        PublishApprovalSubmitDto submit = submitDto("admin-uid", PublishApprovalActionEnum.PUBLISH);
        when(spaceUserService.getRole(100L, "admin-uid")).thenReturn(SpaceRoleEnum.ADMIN);

        PublishApprovalDecisionDto decision = publishApprovalService.submitIfRequired(submit);

        assertThat(decision.getApprovalRequired()).isFalse();
        verify(publishApprovalMapper, never()).insert(any(PublishApproval.class));
    }

    @Test
    void spaceMemberPublishToMarketShouldCreatePendingApproval() {
        PublishApprovalSubmitDto submit = submitDto("member-uid", PublishApprovalActionEnum.PUBLISH);
        when(spaceService.getSpaceType(100L)).thenReturn(SpaceTypeEnum.FREE);
        when(spaceUserService.getRole(100L, "member-uid")).thenReturn(SpaceRoleEnum.MEMBER);
        when(chatBotBaseMapper.checkBotPermission(42, "member-uid", 100L)).thenReturn(1);
        when(publishApprovalMapper.selectOne(any())).thenReturn(null);
        when(publishApprovalMapper.insert(any(PublishApproval.class))).thenAnswer(invocation -> {
            PublishApproval approval = invocation.getArgument(0);
            approval.setId(123L);
            return 1;
        });

        PublishApprovalDecisionDto decision = publishApprovalService.submitIfRequired(submit);

        assertThat(decision.getApprovalRequired()).isTrue();
        assertThat(decision.getApprovalId()).isEqualTo(123L);
        assertThat(decision.getStatus()).isEqualTo(PublishApprovalStatusEnum.PENDING.name());

        ArgumentCaptor<PublishApproval> captor = ArgumentCaptor.forClass(PublishApproval.class);
        verify(publishApprovalMapper).insert(captor.capture());
        PublishApproval approval = captor.getValue();
        assertThat(approval.getSpaceId()).isEqualTo(100L);
        assertThat(approval.getSpaceType()).isEqualTo(SpaceTypeEnum.FREE.getCode());
        assertThat(approval.getResourceType()).isEqualTo(PublishApprovalResourceTypeEnum.BOT.name());
        assertThat(approval.getPublishType()).isEqualTo(PublishApprovalTypeEnum.MARKET.name());
        assertThat(approval.getApprovalStatus()).isEqualTo(PublishApprovalStatusEnum.PENDING.name());
        assertThat(approval.getRequesterUid()).isEqualTo("member-uid");
        assertThat(approval.getTargetHash()).isNotBlank();
    }

    @Test
    void teamBotPublishWithoutRequestSpaceIdShouldCreatePendingApproval() {
        PublishApprovalSubmitDto submit = submitDto("member-uid", PublishApprovalActionEnum.PUBLISH);
        submit.setSpaceId(null);
        ChatBotBase botBase = new ChatBotBase();
        botBase.setId(42);
        botBase.setSpaceId(100L);
        when(chatBotBaseMapper.selectById(42)).thenReturn(botBase);
        when(spaceService.getSpaceType(100L)).thenReturn(SpaceTypeEnum.TEAM);
        when(spaceUserService.getRole(100L, "member-uid")).thenReturn(SpaceRoleEnum.MEMBER);
        when(chatBotBaseMapper.checkBotPermission(42, "member-uid", 100L)).thenReturn(1);
        when(publishApprovalMapper.selectOne(any())).thenReturn(null);
        when(publishApprovalMapper.insert(any(PublishApproval.class))).thenAnswer(invocation -> {
            PublishApproval approval = invocation.getArgument(0);
            approval.setId(123L);
            return 1;
        });

        PublishApprovalDecisionDto decision = publishApprovalService.submitIfRequired(submit);

        assertThat(decision.getApprovalRequired()).isTrue();
        assertThat(decision.getApprovalId()).isEqualTo(123L);

        ArgumentCaptor<PublishApproval> captor = ArgumentCaptor.forClass(PublishApproval.class);
        verify(publishApprovalMapper).insert(captor.capture());
        assertThat(captor.getValue().getSpaceId()).isEqualTo(100L);
    }

    @Test
    void teamWorkflowPublishWithoutRequestSpaceIdShouldCreatePendingApproval() {
        PublishApprovalSubmitDto submit = submitDto("member-uid", PublishApprovalActionEnum.PUBLISH);
        submit.setResourceType(PublishApprovalResourceTypeEnum.WORKFLOW);
        submit.setResourceId("1000");
        submit.setSpaceId(null);
        Workflow workflow = new Workflow();
        workflow.setId(1000L);
        workflow.setSpaceId(100L);
        when(workflowMapper.selectById(1000L)).thenReturn(workflow);
        when(spaceService.getSpaceType(100L)).thenReturn(SpaceTypeEnum.TEAM);
        when(spaceUserService.getRole(100L, "member-uid")).thenReturn(SpaceRoleEnum.MEMBER);
        when(publishApprovalMapper.selectOne(any())).thenReturn(null);
        when(publishApprovalMapper.insert(any(PublishApproval.class))).thenAnswer(invocation -> {
            PublishApproval approval = invocation.getArgument(0);
            approval.setId(124L);
            return 1;
        });

        PublishApprovalDecisionDto decision = publishApprovalService.submitIfRequired(submit);

        assertThat(decision.getApprovalRequired()).isTrue();
        assertThat(decision.getApprovalId()).isEqualTo(124L);

        ArgumentCaptor<PublishApproval> captor = ArgumentCaptor.forClass(PublishApproval.class);
        verify(publishApprovalMapper).insert(captor.capture());
        assertThat(captor.getValue().getSpaceId()).isEqualTo(100L);
    }

    @Test
    void teamBotPublishShouldUseResourceSpaceOverRequestSpaceId() {
        PublishApprovalSubmitDto submit = submitDto("member-uid", PublishApprovalActionEnum.PUBLISH);
        submit.setSpaceId(200L);
        ChatBotBase botBase = new ChatBotBase();
        botBase.setId(42);
        botBase.setSpaceId(100L);
        when(chatBotBaseMapper.selectById(42)).thenReturn(botBase);
        when(spaceService.getSpaceType(100L)).thenReturn(SpaceTypeEnum.TEAM);
        when(spaceUserService.getRole(100L, "member-uid")).thenReturn(SpaceRoleEnum.MEMBER);
        when(chatBotBaseMapper.checkBotPermission(42, "member-uid", 100L)).thenReturn(1);
        when(publishApprovalMapper.selectOne(any())).thenReturn(null);
        when(publishApprovalMapper.insert(any(PublishApproval.class))).thenAnswer(invocation -> {
            PublishApproval approval = invocation.getArgument(0);
            approval.setId(125L);
            return 1;
        });

        PublishApprovalDecisionDto decision = publishApprovalService.submitIfRequired(submit);

        assertThat(decision.getApprovalRequired()).isTrue();
        assertThat(decision.getApprovalId()).isEqualTo(125L);

        ArgumentCaptor<PublishApproval> captor = ArgumentCaptor.forClass(PublishApproval.class);
        verify(publishApprovalMapper).insert(captor.capture());
        assertThat(captor.getValue().getSpaceId()).isEqualTo(100L);
        assertThat(JSONObject.parseObject(captor.getValue().getPublishSnapshot()).getLong("spaceId")).isEqualTo(100L);
        verify(spaceService, never()).getSpaceType(200L);
        verify(spaceUserService, never()).getRole(200L, "member-uid");
    }

    @Test
    void teamWorkflowPublishShouldUseResourceSpaceOverRequestSpaceId() {
        PublishApprovalSubmitDto submit = submitDto("member-uid", PublishApprovalActionEnum.PUBLISH);
        submit.setResourceType(PublishApprovalResourceTypeEnum.WORKFLOW);
        submit.setResourceId("1000");
        submit.setSpaceId(200L);
        Workflow workflow = new Workflow();
        workflow.setId(1000L);
        workflow.setSpaceId(100L);
        when(workflowMapper.selectById(1000L)).thenReturn(workflow);
        when(spaceService.getSpaceType(100L)).thenReturn(SpaceTypeEnum.TEAM);
        when(spaceUserService.getRole(100L, "member-uid")).thenReturn(SpaceRoleEnum.MEMBER);
        when(publishApprovalMapper.selectOne(any())).thenReturn(null);
        when(publishApprovalMapper.insert(any(PublishApproval.class))).thenAnswer(invocation -> {
            PublishApproval approval = invocation.getArgument(0);
            approval.setId(126L);
            return 1;
        });

        PublishApprovalDecisionDto decision = publishApprovalService.submitIfRequired(submit);

        assertThat(decision.getApprovalRequired()).isTrue();
        assertThat(decision.getApprovalId()).isEqualTo(126L);

        ArgumentCaptor<PublishApproval> captor = ArgumentCaptor.forClass(PublishApproval.class);
        verify(publishApprovalMapper).insert(captor.capture());
        assertThat(captor.getValue().getSpaceId()).isEqualTo(100L);
        assertThat(JSONObject.parseObject(captor.getValue().getPublishSnapshot()).getLong("spaceId")).isEqualTo(100L);
        verify(spaceService, never()).getSpaceType(200L);
        verify(spaceUserService, never()).getRole(200L, "member-uid");
    }

    @Test
    void botWithoutResourceSpaceShouldUseRequestSpaceIdForApproval() {
        PublishApprovalSubmitDto submit = submitDto("member-uid", PublishApprovalActionEnum.PUBLISH);
        submit.setSpaceId(100L);
        ChatBotBase botBase = new ChatBotBase();
        botBase.setId(42);
        botBase.setSpaceId(null);
        when(chatBotBaseMapper.selectById(42)).thenReturn(botBase);
        when(spaceService.getSpaceType(100L)).thenReturn(SpaceTypeEnum.FREE);
        when(spaceUserService.getRole(100L, "member-uid")).thenReturn(SpaceRoleEnum.MEMBER);
        when(chatBotBaseMapper.checkBotPermission(42, "member-uid", 100L)).thenReturn(1);
        when(publishApprovalMapper.selectOne(any())).thenReturn(null);
        when(publishApprovalMapper.insert(any(PublishApproval.class))).thenAnswer(invocation -> {
            PublishApproval approval = invocation.getArgument(0);
            approval.setId(127L);
            return 1;
        });

        PublishApprovalDecisionDto decision = publishApprovalService.submitIfRequired(submit);

        assertThat(decision.getApprovalRequired()).isTrue();
        assertThat(decision.getApprovalId()).isEqualTo(127L);
        ArgumentCaptor<PublishApproval> captor = ArgumentCaptor.forClass(PublishApproval.class);
        verify(publishApprovalMapper).insert(captor.capture());
        assertThat(captor.getValue().getSpaceId()).isEqualTo(100L);
    }

    @Test
    void workflowWithoutResourceSpaceShouldUseRequestSpaceIdForApproval() {
        PublishApprovalSubmitDto submit = submitDto("member-uid", PublishApprovalActionEnum.PUBLISH);
        submit.setResourceType(PublishApprovalResourceTypeEnum.WORKFLOW);
        submit.setResourceId("1000");
        submit.setSpaceId(100L);
        Workflow workflow = new Workflow();
        workflow.setId(1000L);
        workflow.setSpaceId(null);
        when(workflowMapper.selectById(1000L)).thenReturn(workflow);
        when(spaceService.getSpaceType(100L)).thenReturn(SpaceTypeEnum.FREE);
        when(spaceUserService.getRole(100L, "member-uid")).thenReturn(SpaceRoleEnum.MEMBER);
        when(publishApprovalMapper.selectOne(any())).thenReturn(null);
        when(publishApprovalMapper.insert(any(PublishApproval.class))).thenAnswer(invocation -> {
            PublishApproval approval = invocation.getArgument(0);
            approval.setId(128L);
            return 1;
        });

        PublishApprovalDecisionDto decision = publishApprovalService.submitIfRequired(submit);

        assertThat(decision.getApprovalRequired()).isTrue();
        assertThat(decision.getApprovalId()).isEqualTo(128L);
        ArgumentCaptor<PublishApproval> captor = ArgumentCaptor.forClass(PublishApproval.class);
        verify(publishApprovalMapper).insert(captor.capture());
        assertThat(captor.getValue().getSpaceId()).isEqualTo(100L);
    }

    @Test
    void concurrentDuplicateSubmitShouldReturnExistingPendingApproval() {
        PublishApprovalSubmitDto submit = submitDto("member-uid", PublishApprovalActionEnum.PUBLISH);
        PublishApproval existing = pendingApproval(123L, "member-uid");
        when(spaceService.getSpaceType(100L)).thenReturn(SpaceTypeEnum.TEAM);
        when(spaceUserService.getRole(100L, "member-uid")).thenReturn(SpaceRoleEnum.MEMBER);
        when(chatBotBaseMapper.checkBotPermission(42, "member-uid", 100L)).thenReturn(1);
        when(publishApprovalMapper.selectOne(any())).thenReturn(null, existing);
        when(publishApprovalMapper.insert(any(PublishApproval.class))).thenThrow(new DuplicateKeyException("duplicate"));

        PublishApprovalDecisionDto decision = publishApprovalService.submitIfRequired(submit);

        assertThat(decision.getApprovalRequired()).isTrue();
        assertThat(decision.getApprovalId()).isEqualTo(123L);
        verify(publishApprovalMapper).insert(any(PublishApproval.class));
        verify(publishApprovalMapper, org.mockito.Mockito.times(2)).selectOne(any());
    }

    @Test
    void executingApprovalShouldBlockDuplicateSubmitForSameTarget() {
        PublishApprovalSubmitDto submit = submitDto("member-uid", PublishApprovalActionEnum.PUBLISH);
        PublishApproval existing = pendingApproval(123L, "member-uid");
        existing.setApprovalStatus(PublishApprovalStatusEnum.EXECUTING.name());
        when(spaceService.getSpaceType(100L)).thenReturn(SpaceTypeEnum.TEAM);
        when(spaceUserService.getRole(100L, "member-uid")).thenReturn(SpaceRoleEnum.MEMBER);
        when(chatBotBaseMapper.checkBotPermission(42, "member-uid", 100L)).thenReturn(1);
        when(publishApprovalMapper.selectOne(any())).thenReturn(existing);

        PublishApprovalDecisionDto decision = publishApprovalService.submitIfRequired(submit);

        assertThat(decision.getApprovalRequired()).isTrue();
        assertThat(decision.getApprovalId()).isEqualTo(123L);
        assertThat(decision.getStatus()).isEqualTo(PublishApprovalStatusEnum.EXECUTING.name());
        verify(publishApprovalMapper, never()).insert(any(PublishApproval.class));
    }

    @Test
    void teamMemberPublishToReservedChannelShouldNotCreateApproval() {
        PublishApprovalSubmitDto submit = submitDto("member-uid", PublishApprovalActionEnum.PUBLISH);
        submit.setPublishType(PublishApprovalTypeEnum.MCP);
        when(spaceUserService.getRole(100L, "member-uid")).thenReturn(SpaceRoleEnum.MEMBER);

        PublishApprovalDecisionDto decision = publishApprovalService.submitIfRequired(submit);

        assertThat(decision.getApprovalRequired()).isFalse();
        verify(publishApprovalMapper, never()).insert(any(PublishApproval.class));
    }

    @Test
    void nonSpaceMemberShouldNotCreatePendingApproval() {
        PublishApprovalSubmitDto submit = submitDto("stranger-uid", PublishApprovalActionEnum.PUBLISH);
        when(spaceUserService.getRole(100L, "stranger-uid")).thenReturn(null);

        assertThatThrownBy(() -> publishApprovalService.submitIfRequired(submit))
                .isInstanceOf(BusinessException.class)
                .extracting("code")
                .isEqualTo(ResponseEnum.INSUFFICIENT_PERMISSIONS.getCode());

        verify(publishApprovalMapper, never()).insert(any(PublishApproval.class));
        verify(chatBotBaseMapper, never()).checkBotPermission(any(Integer.class), any(String.class), any(Long.class));
    }

    @Test
    void teamMemberShouldNotCreateApprovalForBotWithoutPermission() {
        PublishApprovalSubmitDto submit = submitDto("member-uid", PublishApprovalActionEnum.PUBLISH);
        when(spaceService.getSpaceType(100L)).thenReturn(SpaceTypeEnum.TEAM);
        when(spaceUserService.getRole(100L, "member-uid")).thenReturn(SpaceRoleEnum.MEMBER);
        when(chatBotBaseMapper.checkBotPermission(42, "member-uid", 100L)).thenReturn(0);

        assertThatThrownBy(() -> publishApprovalService.submitIfRequired(submit))
                .isInstanceOf(BusinessException.class)
                .extracting("code")
                .isEqualTo(ResponseEnum.BOT_NOT_EXISTS.getCode());

        verify(publishApprovalMapper, never()).insert(any(PublishApproval.class));
    }

    @Test
    void teamMemberShouldNotCreateApiApprovalForMissingApp() {
        PublishApprovalSubmitDto submit = submitDto("member-uid", PublishApprovalActionEnum.PUBLISH);
        submit.setPublishType(PublishApprovalTypeEnum.API);
        submit.setTargetId("app-1");
        when(spaceService.getSpaceType(100L)).thenReturn(SpaceTypeEnum.TEAM);
        when(spaceUserService.getRole(100L, "member-uid")).thenReturn(SpaceRoleEnum.MEMBER);
        when(chatBotBaseMapper.checkBotPermission(42, "member-uid", 100L)).thenReturn(1);
        when(appMstService.getByAppId("member-uid", "app-1")).thenReturn(null);

        assertThatThrownBy(() -> publishApprovalService.submitIfRequired(submit))
                .isInstanceOf(BusinessException.class)
                .extracting("code")
                .isEqualTo(ResponseEnum.USER_APP_ID_NOT_EXISTE.getCode());

        verify(publishApprovalMapper, never()).insert(any(PublishApproval.class));
    }

    @Test
    void teamMemberShouldCreateApiApprovalForOwnedApp() {
        PublishApprovalSubmitDto submit = submitDto("member-uid", PublishApprovalActionEnum.PUBLISH);
        submit.setPublishType(PublishApprovalTypeEnum.API);
        submit.setTargetId("app-1");
        when(spaceService.getSpaceType(100L)).thenReturn(SpaceTypeEnum.TEAM);
        when(spaceUserService.getRole(100L, "member-uid")).thenReturn(SpaceRoleEnum.MEMBER);
        when(chatBotBaseMapper.checkBotPermission(42, "member-uid", 100L)).thenReturn(1);
        when(appMstService.getByAppId("member-uid", "app-1")).thenReturn(AppMst.builder().appId("app-1").build());
        when(publishApprovalMapper.selectOne(any())).thenReturn(null);
        when(publishApprovalMapper.insert(any(PublishApproval.class))).thenAnswer(invocation -> {
            PublishApproval approval = invocation.getArgument(0);
            approval.setId(124L);
            return 1;
        });

        PublishApprovalDecisionDto decision = publishApprovalService.submitIfRequired(submit);

        assertThat(decision.getApprovalRequired()).isTrue();
        assertThat(decision.getApprovalId()).isEqualTo(124L);
    }

    @Test
    void spaceMemberShouldCreateApiApprovalForOwnedAppInFreeSpace() {
        PublishApprovalSubmitDto submit = submitDto("member-uid", PublishApprovalActionEnum.PUBLISH);
        submit.setPublishType(PublishApprovalTypeEnum.API);
        submit.setTargetId("app-1");
        when(spaceService.getSpaceType(100L)).thenReturn(SpaceTypeEnum.FREE);
        when(spaceUserService.getRole(100L, "member-uid")).thenReturn(SpaceRoleEnum.MEMBER);
        when(chatBotBaseMapper.checkBotPermission(42, "member-uid", 100L)).thenReturn(1);
        when(appMstService.getByAppId("member-uid", "app-1")).thenReturn(AppMst.builder().appId("app-1").build());
        when(publishApprovalMapper.selectOne(any())).thenReturn(null);
        when(publishApprovalMapper.insert(any(PublishApproval.class))).thenAnswer(invocation -> {
            PublishApproval approval = invocation.getArgument(0);
            approval.setId(129L);
            return 1;
        });

        PublishApprovalDecisionDto decision = publishApprovalService.submitIfRequired(submit);

        assertThat(decision.getApprovalRequired()).isTrue();
        assertThat(decision.getApprovalId()).isEqualTo(129L);
    }

    @Test
    void teamMemberOfflineShouldBeRejectedWithoutApproval() {
        PublishApprovalSubmitDto submit = submitDto("member-uid", PublishApprovalActionEnum.OFFLINE);
        when(spaceUserService.getRole(100L, "member-uid")).thenReturn(SpaceRoleEnum.MEMBER);

        assertThatThrownBy(() -> publishApprovalService.submitIfRequired(submit))
                .isInstanceOf(BusinessException.class)
                .extracting("code")
                .isEqualTo(ResponseEnum.INSUFFICIENT_PERMISSIONS.getCode());

        verify(publishApprovalMapper, never()).insert(any(PublishApproval.class));
    }

    @Test
    void teamBotOfflineWithoutRequestSpaceIdShouldBeRejected() {
        PublishApprovalSubmitDto submit = submitDto("member-uid", PublishApprovalActionEnum.OFFLINE);
        submit.setSpaceId(null);
        ChatBotBase botBase = new ChatBotBase();
        botBase.setId(42);
        botBase.setSpaceId(100L);
        when(chatBotBaseMapper.selectById(42)).thenReturn(botBase);
        when(spaceUserService.getRole(100L, "member-uid")).thenReturn(SpaceRoleEnum.MEMBER);

        assertThatThrownBy(() -> publishApprovalService.submitIfRequired(submit))
                .isInstanceOf(BusinessException.class)
                .extracting("code")
                .isEqualTo(ResponseEnum.INSUFFICIENT_PERMISSIONS.getCode());

        verify(publishApprovalMapper, never()).insert(any(PublishApproval.class));
    }

    @Test
    void teamWorkflowOfflineWithoutRequestSpaceIdShouldBeRejected() {
        PublishApprovalSubmitDto submit = submitDto("member-uid", PublishApprovalActionEnum.OFFLINE);
        submit.setResourceType(PublishApprovalResourceTypeEnum.WORKFLOW);
        submit.setResourceId("1000");
        submit.setSpaceId(null);
        Workflow workflow = new Workflow();
        workflow.setId(1000L);
        workflow.setSpaceId(100L);
        when(workflowMapper.selectById(1000L)).thenReturn(workflow);
        when(spaceUserService.getRole(100L, "member-uid")).thenReturn(SpaceRoleEnum.MEMBER);

        assertThatThrownBy(() -> publishApprovalService.submitIfRequired(submit))
                .isInstanceOf(BusinessException.class)
                .extracting("code")
                .isEqualTo(ResponseEnum.INSUFFICIENT_PERMISSIONS.getCode());

        verify(publishApprovalMapper, never()).insert(any(PublishApproval.class));
    }

    private PublishApprovalSubmitDto submitDto(String uid, PublishApprovalActionEnum action) {
        return PublishApprovalSubmitDto.builder()
                .spaceId(100L)
                .requesterUid(uid)
                .resourceType(PublishApprovalResourceTypeEnum.BOT)
                .resourceId("42")
                .resourceName("Test Bot")
                .publishType(PublishApprovalTypeEnum.MARKET)
                .publishAction(action)
                .targetId("SQUARE")
                .publishSnapshot("{\"botId\":42}")
                .build();
    }

    private PublishApproval pendingApproval(Long id, String requesterUid) {
        PublishApproval approval = new PublishApproval();
        approval.setId(id);
        approval.setSpaceId(100L);
        approval.setSpaceType(SpaceTypeEnum.TEAM.getCode());
        approval.setResourceType(PublishApprovalResourceTypeEnum.BOT.name());
        approval.setResourceId("42");
        approval.setResourceName("Test Bot");
        approval.setPublishType(PublishApprovalTypeEnum.MARKET.name());
        approval.setPublishAction(PublishApprovalActionEnum.PUBLISH.name());
        approval.setTargetId("SQUARE");
        approval.setTargetHash("hash");
        approval.setApprovalStatus(PublishApprovalStatusEnum.PENDING.name());
        approval.setRequesterUid(requesterUid);
        approval.setPublishSnapshot("{\"botId\":42}");
        approval.setCreatedTime(LocalDateTime.now());
        approval.setUpdatedTime(LocalDateTime.now());
        approval.setDeleted(0);
        return approval;
    }
}
