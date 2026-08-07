package com.iflytek.astron.console.hub.dto.publish;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.List;

/**
 * Bot time series statistics response DTO. Field order is consistent with frontend page time series
 * chart display order: cumulative sessions, active users, average session interactions, token
 * consumption
 */
@Data
@Schema(description = "Bot time series statistics data")
public class BotTimeSeriesResponseDto {

    @Schema(description = "Cumulative session count")
    private List<TimeSeriesItem> chatMessages;

    @Schema(description = "Active user count")
    private List<TimeSeriesItem> activityUser;

    @Schema(description = "Average session interaction count")
    private List<TimeSeriesItem> avgChatMessages;

    @Schema(description = "Token consumption")
    private List<TimeSeriesItem> tokenUsed;

    @Data
    @Schema(description = "Time series data item")
    public static class TimeSeriesItem {
        @Schema(description = "Date", example = "2024-01-15")
        private String date;

        @Schema(description = "Statistical count", example = "10")
        private Integer count;

        public TimeSeriesItem(String date, Integer count) {
            this.date = date;
            this.count = count;
        }

        public TimeSeriesItem() {}
    }
}
