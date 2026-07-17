package com.iflytek.astron.console.hub.dto.agentdebug;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@Schema(name = "AgentDebugSessionDto", description = "Agent debug session response")
public class AgentDebugSessionDto {

    @Schema(description = "Session ID")
    private String id;

    @Schema(description = "Bot ID")
    private Integer botId;

    @Schema(description = "Session title")
    private String title;

    @Schema(description = "Create time")
    private LocalDateTime createdAt;

    @Schema(description = "Modify time")
    private LocalDateTime updatedAt;

    @Schema(description = "Message count")
    private Integer messageCount;
}
