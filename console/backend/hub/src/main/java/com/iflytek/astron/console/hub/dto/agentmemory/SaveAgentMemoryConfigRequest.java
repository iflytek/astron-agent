package com.iflytek.astron.console.hub.dto.agentmemory;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
@Schema(name = "SaveAgentMemoryConfigRequest", description = "Save agent memory configuration request")
public class SaveAgentMemoryConfigRequest {

    @NotNull
    @Schema(description = "Bot ID", requiredMode = Schema.RequiredMode.REQUIRED)
    private Integer botId;

    @Schema(description = "Memory provider")
    private String provider;

    @Schema(description = "Whether memory is enabled")
    private Boolean enabled;

    @Schema(description = "RSA encrypted provider API key")
    private String apiKeyCiphertext;

    @Schema(description = "Whether memories are searched before each chat")
    private Boolean autoSearch;

    @Schema(description = "Memory search result count")
    private Integer searchTopK;

    @Schema(description = "Minimum relevance score")
    private Double minScore;
}
