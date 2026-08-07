package com.iflytek.astron.console.commons.dto.bot;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Debug chat bot request parameters
 *
 * @author yingpeng
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class DebugChatBotReqDto {

    /**
     * Question text
     */
    private String text;

    /**
     * Bot ID
     */
    private Integer botId;

    /**
     * Debug session ID
     */
    private String debugSessionId;

    /**
     * Prompt
     */
    private String prompt;

    /**
     * Message history
     */
    private List<String> messages;

    /**
     * User ID
     */
    private String uid;

    /**
     * Space ID verified by the controller
     */
    private Long spaceId;

    /**
     * Opened tool
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
     * Selected workflows JSON list
     */
    private String workflows;

    /**
     * Model name
     */
    private String model;

    /**
     * Model ID
     */
    private Long modelId;

    /**
     * MaaS dataset list
     */
    private List<String> maasDatasetList;

    /**
     * Personality configuration
     */
    private String personalityConfig;
}
