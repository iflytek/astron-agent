package com.iflytek.astron.console.hub.dto.agentdebug;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
@Schema(name = "CreateAgentDebugSessionRequest", description = "Create agent debug session request")
public class CreateAgentDebugSessionRequest {

    @NotNull
    @Schema(description = "Bot ID", requiredMode = Schema.RequiredMode.REQUIRED)
    private Integer botId;

    @Schema(description = "Session title")
    private String title;
}
