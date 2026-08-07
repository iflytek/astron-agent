package com.iflytek.astron.console.hub.dto.publish;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Bot time series statistics data VO
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class BotTimeSeriesStatsVO {

    /**
     * Statistics date
     */
    private LocalDate date;

    /**
     * Daily conversation count
     */
    private Integer chatCount;

    /**
     * Daily user count
     */
    private Integer userCount;

    /**
     * Daily token consumption
     */
    private Integer tokenCount;

    /**
     * Daily message rounds
     */
    private Integer messageCount;
}
