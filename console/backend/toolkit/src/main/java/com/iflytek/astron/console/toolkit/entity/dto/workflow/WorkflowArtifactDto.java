package com.iflytek.astron.console.toolkit.entity.dto.workflow;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class WorkflowArtifactDto {
    private Long id;
    private Long workflowId;
    private String runId;
    private String nodeId;
    private String skillId;
    private String fileName;
    private String contentType;
    private Long fileSize;
    private String source;
    private String downloadUrl;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime createTime;
}
