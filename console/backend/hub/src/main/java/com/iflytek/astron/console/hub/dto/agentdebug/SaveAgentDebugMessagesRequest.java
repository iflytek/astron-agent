package com.iflytek.astron.console.hub.dto.agentdebug;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.Map;
import lombok.Data;

@Data
@Schema(name = "SaveAgentDebugMessagesRequest", description = "Save agent debug messages request")
public class SaveAgentDebugMessagesRequest {

    @NotNull
    @Schema(description = "Messages", requiredMode = Schema.RequiredMode.REQUIRED)
    private List<Map<String, Object>> messages;
}
