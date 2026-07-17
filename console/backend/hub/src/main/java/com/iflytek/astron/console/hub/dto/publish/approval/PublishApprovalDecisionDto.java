package com.iflytek.astron.console.hub.dto.publish.approval;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublishApprovalDecisionDto {

    private Boolean approvalRequired;

    private Long approvalId;

    private String status;
}
