package com.iflytek.astron.console.hub.dto.publish;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Unified publish request DTO for all publish types Supports MARKET, MCP, WECHAT, API, FEISHU
 * publishing
 */
@Data
@Schema(description = "Unified publish request")
public class UnifiedPublishRequestDto {

    @NotBlank(message = "Publish type cannot be blank")
    @Schema(description = "Publish type", example = "MARKET", allowableValues = {"MARKET", "MCP", "WECHAT", "API", "FEISHU"})
    private String publishType;

    @NotBlank(message = "Action cannot be blank")
    @Schema(description = "Publish action", example = "PUBLISH", allowableValues = {"PUBLISH", "OFFLINE"})
    private String action;

    @NotNull(message = "Publish data cannot be null")
    @Schema(description = "Publish data, structure varies by publish type")
    private Object publishData;
}
