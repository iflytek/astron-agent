package com.iflytek.astron.console.hub.entity.maas;

import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;

@Data
@TableName("exported_workflow_template")
public class ExportedWorkflowTemplate {

    private Long id;
    private String title;
    private String subtitle;
    private String coverUrl;
    private Long groupId;
    private Long sourceWorkflowId;
    private String snapshotYaml;
    private String creatorUid;
    private Long spaceId;
    private Byte isDelete;

    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime createTime;

    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime updateTime;
}
