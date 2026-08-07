package com.iflytek.astron.console.hub.dto.agentmemory;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(name = "AgentMemoryItemDto", description = "Agent memory item response")
public class AgentMemoryItemDto {

    @Schema(description = "Provider memory ID")
    private String id;

    @Schema(description = "Memory text")
    private String memory;

    @Schema(description = "Relevance score")
    private Double score;

    @Schema(description = "Provider metadata")
    private Map<String, Object> metadata;

    @Schema(description = "Create time")
    private String createdAt;

    @Schema(description = "Modify time")
    private String updatedAt;
}
