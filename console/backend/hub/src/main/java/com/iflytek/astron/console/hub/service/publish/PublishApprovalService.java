package com.iflytek.astron.console.hub.service.publish;

import com.iflytek.astron.console.hub.dto.PageResponse;
import com.iflytek.astron.console.hub.dto.publish.approval.PublishApprovalDto;
import com.iflytek.astron.console.hub.dto.publish.approval.PublishApprovalDecisionDto;
import com.iflytek.astron.console.hub.dto.publish.approval.PublishApprovalQueryDto;
import com.iflytek.astron.console.hub.dto.publish.approval.PublishApprovalReviewDto;
import com.iflytek.astron.console.hub.dto.publish.approval.PublishApprovalSubmitDto;

public interface PublishApprovalService {

    PublishApprovalDecisionDto submitIfRequired(PublishApprovalSubmitDto submitDto);

    PageResponse<PublishApprovalDto> page(PublishApprovalQueryDto queryDto, String currentUid, Long spaceId);

    PublishApprovalDto detail(Long approvalId, String currentUid, Long spaceId);

    PublishApprovalDecisionDto approve(
            Long approvalId,
            PublishApprovalReviewDto reviewDto,
            String reviewerUid,
            Long spaceId);

    PublishApprovalDecisionDto reject(Long approvalId, PublishApprovalReviewDto reviewDto, String reviewerUid, Long spaceId);

    PublishApprovalDecisionDto cancel(Long approvalId, String currentUid, Long spaceId);
}
