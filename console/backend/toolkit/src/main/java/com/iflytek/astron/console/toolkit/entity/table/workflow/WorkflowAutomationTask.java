package com.iflytek.astron.console.toolkit.entity.table.workflow;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.util.Date;

@Data
@TableName("workflow_automation_task")
public class WorkflowAutomationTask {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String taskName;
    private String flowId;
    private String workflowName;
    private String version;
    private Long spaceId;
    private String uid;
    private String cronExpression;
    private String scheduleType;
    private String timezone;
    private String inputParams;
    private Boolean enabled;
    private Boolean deleted;
    private Date nextFireTime;
    private Date lastRunTime;
    private String lastRunStatus;
    private String lastRunMessage;
    private Date createTime;
    private Date updateTime;
}
