package com.iflytek.astron.console.hub.dto.workflow;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;

@Data
@Schema(description = "Workflow trace execution query parameters")
public class WorkflowTraceExecutionQueryRequestDto {

    @Schema(description = "Application ID", example = "a01c2bc7")
    private String appId;

    @Schema(description = "Chat ID", example = "chat-123")
    private String chatId;

    @Schema(description = "Execution start time in milliseconds", example = "1710000000000")
    private Long startTime;

    @Schema(description = "Execution end time in milliseconds", example = "1710000006200")
    private Long endTime;

    @Schema(description = "Page number (1-based)", example = "1")
    @Min(value = 1, message = "Page number must be at least 1")
    private Integer page = 1;

    @Schema(description = "Page size (1-100)", example = "20")
    @Min(value = 1, message = "Page size must be at least 1")
    @Max(value = 100, message = "Page size cannot exceed 100")
    private Integer pageSize = 20;
}
