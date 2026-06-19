package com.iflytek.astron.console.hub.service.publish.impl;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.entity.bot.ChatBotBase;
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
import com.iflytek.astron.console.hub.dto.publish.approval.PublishApprovalDecisionDto;
import com.iflytek.astron.console.hub.dto.publish.approval.PublishApprovalQueryDto;
import com.iflytek.astron.console.hub.dto.publish.approval.PublishApprovalReviewDto;
import com.iflytek.astron.console.hub.dto.publish.approval.PublishApprovalSubmitDto;
import com.iflytek.astron.console.hub.entity.PublishApproval;
import com.iflytek.astron.console.hub.enums.publish.PublishApprovalActionEnum;
import com.iflytek.astron.console.hub.enums.publish.PublishApprovalResourceTypeEnum;
import com.iflytek.astron.console.hub.enums.publish.PublishApprovalStatusEnum;
import com.iflytek.astron.console.hub.enums.publish.PublishApprovalTypeEnum;
import com.iflytek.astron.console.hub.mapper.PublishApprovalMapper;
import com.iflytek.astron.console.hub.service.publish.PublishApprovalService;
import com.iflytek.astron.console.hub.service.publish.executor.PublishApprovalExecutor;
import com.iflytek.astron.console.toolkit.mapper.workflow.WorkflowMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class PublishApprovalServiceImpl implements PublishApprovalService {

    private final PublishApprovalMapper publishApprovalMapper;
    private final SpaceService spaceService;
    private final SpaceUserService spaceUserService;
    private final ChatBotBaseMapper chatBotBaseMapper;
    private final WorkflowMapper workflowMapper;
    private final AppMstService appMstService;
    private final List<PublishApprovalExecutor> publishApprovalExecutors;

    @Override
    public PublishApprovalDecisionDto submitIfRequired(PublishApprovalSubmitDto submitDto) {
        Long effectiveSpaceId = resolveEffectiveSpaceId(submitDto);
        submitDto.setSpaceId(effectiveSpaceId);
        normalizePublishSnapshotSpaceId(submitDto);
        if (effectiveSpaceId == null) {
            return directDecision();
        }

        SpaceRoleEnum currentRole = spaceUserService.getRole(effectiveSpaceId, submitDto.getRequesterUid());
        if (currentRole == null) {
            throw new BusinessException(ResponseEnum.INSUFFICIENT_PERMISSIONS);
        }
        if (isOwnerOrAdmin(currentRole)) {
            return directDecision();
        }

        if (PublishApprovalActionEnum.OFFLINE == submitDto.getPublishAction()) {
            throw new BusinessException(ResponseEnum.INSUFFICIENT_PERMISSIONS);
        }

        if (!isApprovalEnabledPublishType(submitDto.getPublishType())) {
            return directDecision();
        }

        SpaceTypeEnum spaceType = resolveSpaceType(effectiveSpaceId);
        validateApprovalTarget(submitDto);
        PublishApproval approval = buildApproval(submitDto, spaceType);
        PublishApproval existing = findActiveApproval(approval);
        if (existing != null) {
            return activeDecision(existing);
        }

        try {
            publishApprovalMapper.insert(approval);
        } catch (DuplicateKeyException e) {
            PublishApproval duplicate = findActiveApproval(approval);
            if (duplicate != null) {
                return activeDecision(duplicate);
            }
            throw e;
        }
        return pendingDecision(approval.getId());
    }

    @Override
    public PageResponse<PublishApprovalDto> page(PublishApprovalQueryDto queryDto, String currentUid, Long spaceId) {
        PublishApprovalQueryDto query = queryDto == null ? new PublishApprovalQueryDto() : queryDto;
        int page = query.getPage() == null || query.getPage() < 1 ? 1 : query.getPage();
        int size = query.getSize() == null || query.getSize() < 1 ? 10 : query.getSize();
        LambdaQueryWrapper<PublishApproval> wrapper = new LambdaQueryWrapper<PublishApproval>()
                .eq(PublishApproval::getSpaceId, spaceId)
                .eq(PublishApproval::getDeleted, 0);
        if (StringUtils.isNotBlank(query.getApprovalStatus())) {
            wrapper.eq(PublishApproval::getApprovalStatus, query.getApprovalStatus().trim().toUpperCase());
        }
        if (StringUtils.isNotBlank(query.getResourceType())) {
            wrapper.eq(PublishApproval::getResourceType, query.getResourceType().trim().toUpperCase());
        }
        if (StringUtils.isNotBlank(query.getPublishType())) {
            wrapper.eq(PublishApproval::getPublishType, PublishApprovalTypeEnum.normalize(query.getPublishType()).name());
        }
        if (StringUtils.isNotBlank(query.getPublishAction())) {
            wrapper.eq(PublishApproval::getPublishAction, query.getPublishAction().trim().toUpperCase());
        }
        if (StringUtils.isNotBlank(query.getResourceId())) {
            wrapper.eq(PublishApproval::getResourceId, query.getResourceId());
        }

        SpaceRoleEnum currentRole = spaceUserService.getRole(spaceId, currentUid);
        boolean canReview = isOwnerOrAdmin(currentRole);
        if (canReview) {
            if (StringUtils.isNotBlank(query.getRequesterUid())) {
                wrapper.eq(PublishApproval::getRequesterUid, query.getRequesterUid());
            }
        } else {
            wrapper.eq(PublishApproval::getRequesterUid, currentUid);
        }
        wrapper.orderByDesc(PublishApproval::getCreatedTime);

        Page<PublishApproval> resultPage = publishApprovalMapper.selectPage(new Page<>(page, size), wrapper);
        List<PublishApprovalDto> records = resultPage.getRecords()
                .stream()
                .map(approval -> toDto(approval, canReview, currentUid))
                .toList();
        return PageResponse.of(page, size, resultPage.getTotal(), records);
    }

    @Override
    public PublishApprovalDto detail(Long approvalId, String currentUid, Long spaceId) {
        PublishApproval approval = requireApproval(approvalId, spaceId);
        SpaceRoleEnum currentRole = spaceUserService.getRole(spaceId, currentUid);
        boolean canReview = isOwnerOrAdmin(currentRole);
        if (!canReview && !Objects.equals(approval.getRequesterUid(), currentUid)) {
            throw new BusinessException(ResponseEnum.INSUFFICIENT_PERMISSIONS);
        }
        return toDto(approval, canReview, currentUid);
    }

    @Override
    public PublishApprovalDecisionDto approve(
            Long approvalId,
            PublishApprovalReviewDto reviewDto,
            String reviewerUid,
            Long spaceId) {
        assertReviewer(spaceId, reviewerUid);
        PublishApproval approval = requirePendingApproval(approvalId, spaceId);
        markExecuting(approval, reviewDto, reviewerUid);

        try {
            ApiResult<Object> result = executeWithoutRequestContext(approval);
            if (result != null && result.code() != 0) {
                throw new BusinessException(ResponseEnum.OPERATION_FAILED, result.message());
            }
            approval.setApprovalStatus(PublishApprovalStatusEnum.APPROVED.name());
            approval.setExecutionResult(JSON.toJSONString(result == null ? null : result.data()));
            approval.setExecutedTime(LocalDateTime.now());
            approval.setUpdatedTime(LocalDateTime.now());
            publishApprovalMapper.updateById(approval);
            return decision(false, approval.getId(), PublishApprovalStatusEnum.APPROVED.name());
        } catch (RuntimeException e) {
            approval.setApprovalStatus(PublishApprovalStatusEnum.EXECUTE_FAILED.name());
            approval.setExecutionResult(JSON.toJSONString(e.getMessage()));
            approval.setExecutedTime(LocalDateTime.now());
            approval.setUpdatedTime(LocalDateTime.now());
            publishApprovalMapper.updateById(approval);
            throw e;
        }
    }

    @Override
    public PublishApprovalDecisionDto reject(Long approvalId, PublishApprovalReviewDto reviewDto, String reviewerUid, Long spaceId) {
        assertReviewer(spaceId, reviewerUid);
        PublishApproval approval = requirePendingApproval(approvalId, spaceId);
        markTerminalFromPending(
                approval,
                PublishApprovalStatusEnum.REJECTED,
                reviewerUid,
                reviewDto == null ? null : reviewDto.getReviewComment());
        return decision(false, approval.getId(), PublishApprovalStatusEnum.REJECTED.name());
    }

    @Override
    public PublishApprovalDecisionDto cancel(Long approvalId, String currentUid, Long spaceId) {
        PublishApproval approval = requirePendingApproval(approvalId, spaceId);
        if (!Objects.equals(approval.getRequesterUid(), currentUid)) {
            throw new BusinessException(ResponseEnum.INSUFFICIENT_PERMISSIONS);
        }
        markTerminalFromPending(approval, PublishApprovalStatusEnum.CANCELED, null, null);
        return decision(false, approval.getId(), PublishApprovalStatusEnum.CANCELED.name());
    }

    private Long resolveEffectiveSpaceId(PublishApprovalSubmitDto submitDto) {
        Long requestSpaceId = submitDto.getSpaceId();
        ResourceSpace resourceSpace = resolveResourceSpace(submitDto);
        return resourceSpace.found() && resourceSpace.spaceId() != null ? resourceSpace.spaceId() : requestSpaceId;
    }

    private ResourceSpace resolveResourceSpace(PublishApprovalSubmitDto submitDto) {
        if (PublishApprovalResourceTypeEnum.BOT == submitDto.getResourceType()) {
            ChatBotBase botBase = chatBotBaseMapper.selectById(parseBotId(submitDto.getResourceId()));
            return botBase == null ? ResourceSpace.notFound() : ResourceSpace.found(botBase.getSpaceId());
        }
        if (PublishApprovalResourceTypeEnum.WORKFLOW == submitDto.getResourceType()) {
            Workflow workflow = resolveWorkflow(submitDto.getResourceId());
            return workflow == null ? ResourceSpace.notFound() : ResourceSpace.found(workflow.getSpaceId());
        }
        return ResourceSpace.notFound();
    }

    private record ResourceSpace(Long spaceId, boolean found) {
        private static ResourceSpace found(Long spaceId) {
            return new ResourceSpace(spaceId, true);
        }

        private static ResourceSpace notFound() {
            return new ResourceSpace(null, false);
        }
    }

    private SpaceTypeEnum resolveSpaceType(Long spaceId) {
        if (spaceId == null) {
            return null;
        }
        return spaceService.getSpaceType(spaceId);
    }

    private void normalizePublishSnapshotSpaceId(PublishApprovalSubmitDto submitDto) {
        if (StringUtils.isBlank(submitDto.getPublishSnapshot())) {
            return;
        }
        try {
            JSONObject snapshot = JSON.parseObject(submitDto.getPublishSnapshot());
            snapshot.put("spaceId", submitDto.getSpaceId());
            submitDto.setPublishSnapshot(snapshot.toJSONString());
        } catch (Exception ex) {
            // Snapshot is auxiliary audit data; approval decisions use the normalized DTO spaceId.
            log.warn("Failed to normalize publish approval snapshot spaceId", ex);
        }
    }

    private boolean isOwnerOrAdmin(SpaceRoleEnum role) {
        return SpaceRoleEnum.OWNER == role || SpaceRoleEnum.ADMIN == role;
    }

    private boolean isApprovalEnabledPublishType(PublishApprovalTypeEnum publishType) {
        return PublishApprovalTypeEnum.MARKET == publishType || PublishApprovalTypeEnum.API == publishType;
    }

    private void validateApprovalTarget(PublishApprovalSubmitDto submitDto) {
        if (PublishApprovalResourceTypeEnum.BOT == submitDto.getResourceType()) {
            Integer botId = parseBotId(submitDto.getResourceId());
            int hasPermission = chatBotBaseMapper.checkBotPermission(
                    botId,
                    submitDto.getRequesterUid(),
                    submitDto.getSpaceId());
            if (hasPermission <= 0) {
                throw new BusinessException(ResponseEnum.BOT_NOT_EXISTS);
            }
        }

        if (PublishApprovalTypeEnum.API == submitDto.getPublishType()
                && (StringUtils.isBlank(submitDto.getTargetId())
                        || appMstService.getByAppId(submitDto.getRequesterUid(), submitDto.getTargetId()) == null)) {
            throw new BusinessException(ResponseEnum.USER_APP_ID_NOT_EXISTE);
        }
    }

    private Integer parseBotId(String resourceId) {
        if (StringUtils.isBlank(resourceId)) {
            throw new BusinessException(ResponseEnum.PARAMETER_ERROR);
        }
        try {
            return Integer.valueOf(resourceId);
        } catch (NumberFormatException e) {
            throw new BusinessException(ResponseEnum.PARAMETER_ERROR);
        }
    }

    private Workflow resolveWorkflow(String resourceId) {
        if (StringUtils.isBlank(resourceId)) {
            throw new BusinessException(ResponseEnum.PARAMETER_ERROR);
        }
        Workflow workflow = null;
        try {
            workflow = workflowMapper.selectById(Long.valueOf(resourceId));
        } catch (NumberFormatException ignored) {
            // Resource ID may be the workflow flowId string for future workflow approval callers.
        }
        if (workflow != null) {
            return workflow;
        }
        return workflowMapper.selectOne(new LambdaQueryWrapper<Workflow>()
                .eq(Workflow::getFlowId, resourceId));
    }

    private void assertReviewer(Long spaceId, String uid) {
        SpaceRoleEnum currentRole = spaceUserService.getRole(spaceId, uid);
        if (!isOwnerOrAdmin(currentRole)) {
            throw new BusinessException(ResponseEnum.INSUFFICIENT_PERMISSIONS);
        }
    }

    private PublishApproval requireApproval(Long approvalId, Long spaceId) {
        PublishApproval approval = publishApprovalMapper.selectById(approvalId);
        if (approval == null || !Objects.equals(approval.getSpaceId(), spaceId) || Objects.equals(approval.getDeleted(), 1)) {
            throw new BusinessException(ResponseEnum.DATA_NOT_EXIST);
        }
        return approval;
    }

    private PublishApproval requirePendingApproval(Long approvalId, Long spaceId) {
        PublishApproval approval = requireApproval(approvalId, spaceId);
        if (!Objects.equals(approval.getApprovalStatus(), PublishApprovalStatusEnum.PENDING.name())) {
            throw new BusinessException(ResponseEnum.OPERATION_FAILED);
        }
        return approval;
    }

    private PublishApprovalExecutor findExecutor(PublishApproval approval) {
        return publishApprovalExecutors.stream()
                .filter(executor -> executor.supports(approval))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ResponseEnum.OPERATION_FAILED));
    }

    private void markExecuting(PublishApproval approval, PublishApprovalReviewDto reviewDto, String reviewerUid) {
        LocalDateTime now = LocalDateTime.now();
        String reviewComment = reviewDto == null ? null : reviewDto.getReviewComment();

        PublishApproval update = new PublishApproval();
        update.setId(approval.getId());
        update.setApprovalStatus(PublishApprovalStatusEnum.EXECUTING.name());
        update.setReviewerUid(reviewerUid);
        update.setReviewComment(reviewComment);
        update.setReviewedTime(now);
        update.setUpdatedTime(now);

        int rows = publishApprovalMapper.update(update, new LambdaUpdateWrapper<PublishApproval>()
                .eq(PublishApproval::getId, approval.getId())
                .eq(PublishApproval::getSpaceId, approval.getSpaceId())
                .eq(PublishApproval::getApprovalStatus, PublishApprovalStatusEnum.PENDING.name())
                .eq(PublishApproval::getDeleted, 0));
        if (rows != 1) {
            throw new BusinessException(ResponseEnum.OPERATION_FAILED);
        }

        approval.setApprovalStatus(PublishApprovalStatusEnum.EXECUTING.name());
        approval.setReviewerUid(reviewerUid);
        approval.setReviewComment(reviewComment);
        approval.setReviewedTime(now);
        approval.setUpdatedTime(now);
    }

    private void markTerminalFromPending(
            PublishApproval approval,
            PublishApprovalStatusEnum status,
            String reviewerUid,
            String reviewComment) {
        LocalDateTime now = LocalDateTime.now();
        PublishApproval update = new PublishApproval();
        update.setId(approval.getId());
        update.setApprovalStatus(status.name());
        update.setReviewerUid(reviewerUid);
        update.setReviewComment(reviewComment);
        update.setUpdatedTime(now);
        if (PublishApprovalStatusEnum.REJECTED == status) {
            update.setReviewedTime(now);
        }

        int rows = publishApprovalMapper.update(update, new LambdaUpdateWrapper<PublishApproval>()
                .eq(PublishApproval::getId, approval.getId())
                .eq(PublishApproval::getSpaceId, approval.getSpaceId())
                .eq(PublishApproval::getApprovalStatus, PublishApprovalStatusEnum.PENDING.name())
                .eq(PublishApproval::getDeleted, 0));
        if (rows != 1) {
            throw new BusinessException(ResponseEnum.OPERATION_FAILED);
        }

        approval.setApprovalStatus(status.name());
        approval.setReviewerUid(reviewerUid);
        approval.setReviewComment(reviewComment);
        approval.setUpdatedTime(now);
        if (PublishApprovalStatusEnum.REJECTED == status) {
            approval.setReviewedTime(now);
        }
    }

    private ApiResult<Object> executeWithoutRequestContext(PublishApproval approval) {
        RequestAttributes previousAttributes = RequestContextHolder.getRequestAttributes();
        try {
            RequestContextHolder.resetRequestAttributes();
            return findExecutor(approval).execute(approval);
        } finally {
            if (previousAttributes == null) {
                RequestContextHolder.resetRequestAttributes();
            } else {
                RequestContextHolder.setRequestAttributes(previousAttributes);
            }
        }
    }

    private PublishApproval buildApproval(PublishApprovalSubmitDto submitDto, SpaceTypeEnum spaceType) {
        LocalDateTime now = LocalDateTime.now();
        PublishApproval approval = new PublishApproval();
        approval.setSpaceId(submitDto.getSpaceId());
        approval.setSpaceType(spaceType == null ? null : spaceType.getCode());
        approval.setResourceType(submitDto.getResourceType().name());
        approval.setResourceId(submitDto.getResourceId());
        approval.setResourceName(submitDto.getResourceName());
        approval.setPublishType(submitDto.getPublishType().name());
        approval.setPublishAction(submitDto.getPublishAction().name());
        approval.setTargetId(StringUtils.defaultIfBlank(submitDto.getTargetId(), "SQUARE"));
        approval.setTargetHash(targetHash(approval.getTargetId(), submitDto.getPublishSnapshot()));
        approval.setApprovalStatus(PublishApprovalStatusEnum.PENDING.name());
        approval.setRequesterUid(submitDto.getRequesterUid());
        approval.setAppOwnerUid(submitDto.getAppOwnerUid());
        approval.setRequestReason(submitDto.getRequestReason());
        approval.setPublishSnapshot(submitDto.getPublishSnapshot());
        approval.setCreatedTime(now);
        approval.setUpdatedTime(now);
        approval.setDeleted(0);
        return approval;
    }

    private PublishApproval findActiveApproval(PublishApproval approval) {
        LambdaQueryWrapper<PublishApproval> wrapper = new LambdaQueryWrapper<PublishApproval>()
                .eq(PublishApproval::getSpaceId, approval.getSpaceId())
                .eq(PublishApproval::getResourceType, approval.getResourceType())
                .eq(PublishApproval::getResourceId, approval.getResourceId())
                .eq(PublishApproval::getPublishType, approval.getPublishType())
                .eq(PublishApproval::getPublishAction, approval.getPublishAction())
                .eq(PublishApproval::getTargetHash, approval.getTargetHash())
                .in(PublishApproval::getApprovalStatus,
                        PublishApprovalStatusEnum.PENDING.name(),
                        PublishApprovalStatusEnum.EXECUTING.name())
                .eq(PublishApproval::getDeleted, 0)
                .last("LIMIT 1");
        return publishApprovalMapper.selectOne(wrapper);
    }

    private String targetHash(String targetId, String snapshot) {
        String raw = StringUtils.defaultString(targetId) + "|" + StringUtils.defaultString(snapshot);
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash).substring(0, 16);
        } catch (Exception e) {
            return Integer.toHexString(raw.hashCode());
        }
    }

    private PublishApprovalDecisionDto directDecision() {
        return PublishApprovalDecisionDto.builder()
                .approvalRequired(false)
                .build();
    }

    private PublishApprovalDecisionDto pendingDecision(Long approvalId) {
        return PublishApprovalDecisionDto.builder()
                .approvalRequired(true)
                .approvalId(approvalId)
                .status(PublishApprovalStatusEnum.PENDING.name())
                .build();
    }

    private PublishApprovalDecisionDto activeDecision(PublishApproval approval) {
        return PublishApprovalDecisionDto.builder()
                .approvalRequired(true)
                .approvalId(approval.getId())
                .status(approval.getApprovalStatus())
                .build();
    }

    private PublishApprovalDecisionDto decision(boolean approvalRequired, Long approvalId, String status) {
        return PublishApprovalDecisionDto.builder()
                .approvalRequired(approvalRequired)
                .approvalId(approvalId)
                .status(status)
                .build();
    }

    private PublishApprovalDto toDto(PublishApproval approval, boolean canReview, String currentUid) {
        return PublishApprovalDto.builder()
                .id(approval.getId())
                .spaceId(approval.getSpaceId())
                .resourceType(approval.getResourceType())
                .resourceId(approval.getResourceId())
                .resourceName(approval.getResourceName())
                .publishType(approval.getPublishType())
                .publishAction(approval.getPublishAction())
                .targetId(approval.getTargetId())
                .approvalStatus(approval.getApprovalStatus())
                .requesterUid(approval.getRequesterUid())
                .reviewerUid(approval.getReviewerUid())
                .appOwnerUid(approval.getAppOwnerUid())
                .requestReason(approval.getRequestReason())
                .reviewComment(approval.getReviewComment())
                .publishSnapshot(approval.getPublishSnapshot())
                .executionResult(approval.getExecutionResult())
                .canReview(canReview)
                .canCancel(canCancelApproval(approval, currentUid))
                .createdTime(approval.getCreatedTime())
                .reviewedTime(approval.getReviewedTime())
                .executedTime(approval.getExecutedTime())
                .updatedTime(approval.getUpdatedTime())
                .build();
    }

    private boolean canCancelApproval(PublishApproval approval, String currentUid) {
        return Objects.equals(approval.getRequesterUid(), currentUid)
                && Objects.equals(approval.getApprovalStatus(), PublishApprovalStatusEnum.PENDING.name());
    }
}
