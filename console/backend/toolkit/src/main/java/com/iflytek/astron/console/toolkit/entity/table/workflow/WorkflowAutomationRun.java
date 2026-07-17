package com.iflytek.astron.console.toolkit.entity.table.workflow;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.util.Date;

@Data
@TableName("workflow_automation_run")
public class WorkflowAutomationRun {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long taskId;
    private String flowId;
    private Long spaceId;
    private String uid;
    private String triggerType;
    private Date scheduledFireTime;
    private Date startTime;
    private Date endTime;
    private String status;
    private String requestParams;
    private String responseSummary;
    private String errorMessage;
    private Long durationMs;
    private Date createTime;
}
