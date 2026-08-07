package com.iflytek.astron.console.hub.dto.publish.approval;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublishApprovalDto {

    private Long id;

    private Long spaceId;

    private String resourceType;

    private String resourceId;

    private String resourceName;

    private String publishType;

    private String publishAction;

    private String targetId;

    private String approvalStatus;

    private String requesterUid;

    private String reviewerUid;

    private String appOwnerUid;

    private String requestReason;

    private String reviewComment;

    private String publishSnapshot;

    private String executionResult;

    private Boolean canReview;

    private Boolean canCancel;

    private LocalDateTime createdTime;

    private LocalDateTime reviewedTime;

    private LocalDateTime executedTime;

    private LocalDateTime updatedTime;
}
