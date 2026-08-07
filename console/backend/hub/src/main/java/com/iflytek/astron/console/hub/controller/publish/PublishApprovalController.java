package com.iflytek.astron.console.hub.controller.publish;

import com.iflytek.astron.console.commons.annotation.RateLimit;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.commons.util.RequestContextUtil;
import com.iflytek.astron.console.commons.util.space.SpaceInfoUtil;
import com.iflytek.astron.console.hub.dto.PageResponse;
import com.iflytek.astron.console.hub.dto.publish.approval.PublishApprovalDecisionDto;
import com.iflytek.astron.console.hub.dto.publish.approval.PublishApprovalDto;
import com.iflytek.astron.console.hub.dto.publish.approval.PublishApprovalQueryDto;
import com.iflytek.astron.console.hub.dto.publish.approval.PublishApprovalReviewDto;
import com.iflytek.astron.console.hub.service.publish.PublishApprovalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@Tag(name = "Publish Approval Management", description = "Publish approval list and review APIs")
@RestController
@RequestMapping("/publish/approvals")
@RequiredArgsConstructor
@Validated
public class PublishApprovalController {

    private final PublishApprovalService publishApprovalService;

    @Operation(summary = "Get publish approval list", description = "Get publish approvals in current space")
    @RateLimit(limit = 30, window = 60, dimension = "USER")
    @GetMapping
    public ApiResult<PageResponse<PublishApprovalDto>> page(@ModelAttribute PublishApprovalQueryDto queryDto) {
        String currentUid = RequestContextUtil.getUID();
        Long spaceId = SpaceInfoUtil.getSpaceId();
        return ApiResult.success(publishApprovalService.page(queryDto, currentUid, spaceId));
    }

    @Operation(summary = "Get publish approval detail", description = "Get publish approval detail in current space")
    @RateLimit(limit = 60, window = 60, dimension = "USER")
    @GetMapping("/{approvalId}")
    public ApiResult<PublishApprovalDto> detail(@PathVariable Long approvalId) {
        String currentUid = RequestContextUtil.getUID();
        Long spaceId = SpaceInfoUtil.getSpaceId();
        return ApiResult.success(publishApprovalService.detail(approvalId, currentUid, spaceId));
    }

    @Operation(summary = "Approve publish approval", description = "Approve and execute a publish approval")
    @RateLimit(limit = 20, window = 60, dimension = "USER")
    @PostMapping("/{approvalId}/approve")
    public ApiResult<PublishApprovalDecisionDto> approve(
            @PathVariable Long approvalId,
            @RequestBody(required = false) PublishApprovalReviewDto reviewDto) {
        String currentUid = RequestContextUtil.getUID();
        Long spaceId = SpaceInfoUtil.getSpaceId();
        log.info("Approving publish approval: approvalId={}, reviewerUid={}, spaceId={}", approvalId, currentUid, spaceId);
        return ApiResult.success(publishApprovalService.approve(approvalId, reviewDto, currentUid, spaceId));
    }

    @Operation(summary = "Reject publish approval", description = "Reject a publish approval")
    @RateLimit(limit = 20, window = 60, dimension = "USER")
    @PostMapping("/{approvalId}/reject")
    public ApiResult<PublishApprovalDecisionDto> reject(
            @PathVariable Long approvalId,
            @RequestBody(required = false) PublishApprovalReviewDto reviewDto) {
        String currentUid = RequestContextUtil.getUID();
        Long spaceId = SpaceInfoUtil.getSpaceId();
        log.info("Rejecting publish approval: approvalId={}, reviewerUid={}, spaceId={}", approvalId, currentUid, spaceId);
        return ApiResult.success(publishApprovalService.reject(approvalId, reviewDto, currentUid, spaceId));
    }

    @Operation(summary = "Cancel publish approval", description = "Cancel current user's pending publish approval")
    @RateLimit(limit = 20, window = 60, dimension = "USER")
    @PostMapping("/{approvalId}/cancel")
    public ApiResult<PublishApprovalDecisionDto> cancel(@PathVariable Long approvalId) {
        String currentUid = RequestContextUtil.getUID();
        Long spaceId = SpaceInfoUtil.getSpaceId();
        log.info("Canceling publish approval: approvalId={}, requesterUid={}, spaceId={}", approvalId, currentUid, spaceId);
        return ApiResult.success(publishApprovalService.cancel(approvalId, currentUid, spaceId));
    }
}
