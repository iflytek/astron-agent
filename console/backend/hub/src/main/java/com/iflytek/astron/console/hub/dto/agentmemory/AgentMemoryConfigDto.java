package com.iflytek.astron.console.hub.dto.agentmemory;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@Schema(name = "AgentMemoryConfigDto", description = "Agent memory configuration response")
public class AgentMemoryConfigDto {

    @Schema(description = "Bot ID")
    private Integer botId;

    @Schema(description = "Memory provider")
    private String provider;

    @Schema(description = "Whether memory is enabled")
    private Boolean enabled;

    @Schema(description = "Whether API key has been configured")
    private Boolean hasApiKey;

    @Schema(description = "Whether memories are searched before each chat")
    private Boolean autoSearch;

    @Schema(description = "Memory search result count")
    private Integer searchTopK;

    @Schema(description = "Minimum relevance score")
    private Double minScore;

    @Schema(description = "Create time")
    private LocalDateTime createdAt;

    @Schema(description = "Modify time")
    private LocalDateTime updatedAt;
}
