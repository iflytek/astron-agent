package com.iflytek.astron.console.hub.dto.publish.approval;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublishApprovalQueryDto {

    private Integer page;

    private Integer size;

    private String approvalStatus;

    private String resourceType;

    private String publishType;

    private String publishAction;

    private String resourceId;

    private String requesterUid;
}
