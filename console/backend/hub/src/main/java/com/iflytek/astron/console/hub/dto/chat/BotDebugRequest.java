package com.iflytek.astron.console.hub.dto.chat;

import lombok.Data;


/**
 * Bot debug request DTO
 *
 * @author yingpeng
 */
@Data
public class BotDebugRequest {

    /**
     * Text content
     */
    private String text;

    /**
     * Bot ID for scoped debug capabilities such as memory.
     */
    private Integer botId;

    /**
     * Debug session ID for scoped memory run metadata.
     */
    private String debugSessionId;

    /**
     * Prompt
     */
    private String prompt;

    /**
     * Whether multi-turn conversation is needed
     */
    private Boolean multiTurn = false;

    /**
     * Array parameters
     */
    private String arr;

    /**
     * Dataset list
     */
    private String datasetList;

    /**
     * Whether strict matching
     */
    private Integer accordStrictly = 0;

    /**
     * Open tools
     */
    private String openedTool;

    /**
     * Custom MCP server URL list
     */
    private String mcpServerUrls;

    /**
     * Selected skills JSON list
     */
    private String skills;

    /**
     * Selected plugin tools (tool square) JSON list
     */
    private String tools;

    /**
     * Model name
     */
    private String model = "spark";

    /**
     * MaaS dataset list
     */
    private String maasDatasetList;

    private Long modelId;

    /**
     * Personality configuration
     */
    private String personalityConfig;
}
