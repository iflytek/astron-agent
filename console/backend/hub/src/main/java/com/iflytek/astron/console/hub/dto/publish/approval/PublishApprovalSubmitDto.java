package com.iflytek.astron.console.hub.dto.publish.approval;

import com.iflytek.astron.console.hub.enums.publish.PublishApprovalActionEnum;
import com.iflytek.astron.console.hub.enums.publish.PublishApprovalResourceTypeEnum;
import com.iflytek.astron.console.hub.enums.publish.PublishApprovalTypeEnum;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublishApprovalSubmitDto {

    private Long spaceId;

    private String requesterUid;

    private PublishApprovalResourceTypeEnum resourceType;

    private String resourceId;

    private String resourceName;

    private PublishApprovalTypeEnum publishType;

    private PublishApprovalActionEnum publishAction;

    private String targetId;

    private String appOwnerUid;

    private String requestReason;

    private String publishSnapshot;
}
