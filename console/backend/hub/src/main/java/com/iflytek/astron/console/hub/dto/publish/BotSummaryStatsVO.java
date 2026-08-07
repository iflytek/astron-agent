package com.iflytek.astron.console.hub.dto.publish;

import lombok.Data;

/**
 * The overall statistics data VO of the agent: the order of fields is consistent with the display
 * order on the front-end page: total number of sessions, total number of users, total TOKEN
 * consumption (k), total number of messages
 */
@Data
public class BotSummaryStatsVO {

    /**
     * Total number of sessions
     */
    private long totalChats;

    /**
     * Cumulative number of users
     */
    private long totalUsers;

    /**
     * Cumulative TOKEN Consumption (k)
     */
    private long totalTokens;

    /**
     * Total number of messages
     */
    private long totalMessages;
}
