package com.iflytek.astron.console.commons.entity.agentdebug;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("agent_debug_message")
@Schema(name = "AgentDebugMessage", description = "Agent debug message")
public class AgentDebugMessage {

    @TableId(type = IdType.AUTO)
    @Schema(description = "Primary key")
    private Long id;

    @Schema(description = "Session ID")
    private String sessionId;

    @Schema(description = "Message order in session")
    private Integer messageIndex;

    @Schema(description = "Serialized message JSON")
    private String messageJson;

    @Schema(description = "Create time")
    private LocalDateTime createTime;

    @Schema(description = "Modify time")
    private LocalDateTime updateTime;
}
