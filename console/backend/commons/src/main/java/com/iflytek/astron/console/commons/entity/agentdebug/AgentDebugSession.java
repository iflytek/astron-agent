package com.iflytek.astron.console.commons.entity.agentdebug;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("agent_debug_session")
@Schema(name = "AgentDebugSession", description = "Agent debug session")
public class AgentDebugSession {

    @TableId(type = IdType.INPUT)
    @Schema(description = "Session ID")
    private String id;

    @Schema(description = "Bot ID")
    private Integer botId;

    @Schema(description = "User ID")
    private String uid;

    @Schema(description = "Space ID")
    private Long spaceId;

    @Schema(description = "Session title")
    private String title;

    @Schema(description = "Message count")
    private Integer messageCount;

    @Schema(description = "Deletion status: 0 Not delete, 1 Delete")
    private Integer isDelete;

    @Schema(description = "Create time")
    private LocalDateTime createTime;

    @Schema(description = "Modify time")
    private LocalDateTime updateTime;
}
