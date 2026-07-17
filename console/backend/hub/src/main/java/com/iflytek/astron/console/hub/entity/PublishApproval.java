package com.iflytek.astron.console.hub.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("publish_approval")
public class PublishApproval {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long spaceId;

    private Integer spaceType;

    private String resourceType;

    private String resourceId;

    private String resourceName;

    private String publishType;

    private String publishAction;

    private String targetId;

    private String targetHash;

    private String approvalStatus;

    private String requesterUid;

    private String reviewerUid;

    private String appOwnerUid;

    private String requestReason;

    private String reviewComment;

    private String publishSnapshot;

    private String executionResult;

    private LocalDateTime createdTime;

    private LocalDateTime reviewedTime;

    private LocalDateTime executedTime;

    private LocalDateTime updatedTime;

    private Integer deleted;
}
