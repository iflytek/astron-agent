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
