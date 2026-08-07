package com.iflytek.astron.console.toolkit.entity.dto.talkagent;

import lombok.Data;

/**
 * Data Transfer Object representing configuration for Talk Agent.
 * <p>
 * This class defines interaction-related configurations for a chatbot assistant, including
 * text/voice interaction type, virtual human scene settings, and workflow linkage.
 * </p>
 *
 * <p>
 * <b>Usage:</b> Used for transferring configuration data between service layers when initializing
 * or updating Talk Agent behaviors.
 * </p>
 *
 * @author cczhu10
 * @date 2025-10-10
 */
@Data
public class TalkAgentConfigDto {

    /**
     * Assistant (Bot) ID.
     * <p>
     * Used to identify the corresponding assistant or chatbot.
     * </p>
     */
    private Integer botId;

    /**
     * Interaction type.
     * <ul>
     * <li>0 - Text interaction</li>
     * <li>1 - Voice call</li>
     * <li>2 - Virtual human dialogue</li>
     * </ul>
     */
    private Integer interactType;

    /**
     * Virtual human scene ID.
     * <p>
     * Specifies which virtual scene is bound to this Talk Agent.
     * </p>
     */
    private String sceneId;

    /**
     * Whether the virtual human feature is enabled.
     * <ul>
     * <li>1 - Enabled</li>
     * <li>0 - Disabled</li>
     * </ul>
     */
    private Integer sceneEnable;

    /**
     * Virtual human mode.
     * <ul>
     * <li>0 - Virtual broadcast mode</li>
     * <li>1 - Virtual call mode</li>
     * </ul>
     */
    private Integer sceneMode;

    /**
     * Scene ID for virtual human call.
     * <p>
     * Used to define the virtual human scene configuration when in call mode.
     * </p>
     */
    private String callSceneId;

    /**
     * Configuration details for the virtual human call.
     * <p>
     * Usually stored as a JSON string containing parameters for voice, video, and gesture settings.
     * </p>
     */
    private String sceneCallConfig;

    /**
     * Voice name or voice actor code.
     * <p>
     * Defines the TTS (Text-to-Speech) speaker used in voice generation.
     * </p>
     */
    private String vcn;

    /**
     * Whether the voice (TTS speaker) feature is enabled.
     * <ul>
     * <li>1 - Enabled</li>
     * <li>0 - Disabled</li>
     * </ul>
     */
    private Integer vcnEnable;

    /**
     * Workflow ID.
     * <p>
     * Represents the associated workflow process ID, linking the configuration to a specific flow.
     * </p>
     */
    private String flowId;
}
