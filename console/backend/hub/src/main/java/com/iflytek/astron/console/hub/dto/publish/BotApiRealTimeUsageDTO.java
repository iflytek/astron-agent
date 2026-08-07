package com.iflytek.astron.console.hub.dto.publish;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * @author yun-zhi-ztl
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Bot Api Real Time Usage DTO")
public class BotApiRealTimeUsageDTO {

    @Schema(description = "Bot Id", example = "123")
    private Integer botId;

    @Schema(description = "Application ID")
    private String appId;

    @Schema(description = "Communication channel")
    private String channel;

    @Schema(description = "Count of usage")
    private long usedCount;

    @Schema(description = "Threshold value")
    private long threshold;

    @Schema(description = "Remaining count")
    private long remainCount;

    @Schema(description = "Meter parameter")
    private String meterParam;

    @Schema(description = "Left quantity")
    private long left;

    @Schema(description = "Expiration date")
    private String expireDate;

    @Schema(description = "Historical usage count")
    private long historyUsedCount;

    @Schema(description = "Concurrency")
    private int conc;
}
