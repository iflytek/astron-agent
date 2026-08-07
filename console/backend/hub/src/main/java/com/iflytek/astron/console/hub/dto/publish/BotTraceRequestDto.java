package com.iflytek.astron.console.hub.dto.publish;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;

/**
 * Bot Trace Request DTO
 *
 * Encapsulates parameters for bot trace log retrieval
 *
 * @author Omuigix
 */
@Data
@Schema(description = "Bot trace log query parameters")
public class BotTraceRequestDto {

    @Schema(description = "Start time for log filtering (ISO format)", example = "2025-09-24T00:00:00")
    private String startTime;

    @Schema(description = "End time for log filtering (ISO format)", example = "2025-09-24T23:59:59")
    private String endTime;

    @Schema(description = "Page number (1-based)", example = "1")
    @Min(value = 1, message = "Page number must be at least 1")
    private Integer page = 1;

    @Schema(description = "Number of items per page (1-100)", example = "20")
    @Min(value = 1, message = "Page size must be at least 1")
    @Max(value = 100, message = "Page size cannot exceed 100")
    private Integer pageSize = 20;

    @Schema(description = "Log level filter", example = "ERROR", allowableValues = {"DEBUG", "INFO", "WARN", "ERROR"})
    private String logLevel;

    @Schema(description = "Keyword search in log content", example = "exception")
    private String keyword;

    @Schema(description = "Trace ID for specific trace filtering", example = "trace-12345")
    private String traceId;

    @Schema(description = "Session ID for session-specific logs", example = "session-abc123")
    private String sessionId;
}
