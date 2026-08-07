package com.iflytek.astron.console.hub.dto.publish.prepare;

import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.List;

/**
 * Market publish prepare data DTO
 *
 * @author Omuigix
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class MarketPrepareDto extends BasePrepareDto {

    /**
     * Complete workflow configuration JSON
     */
    private String workflowConfigJson;

    /**
     * Whether bot supports multi-file parameters
     */
    private Boolean botMultiFileParam;

    /**
     * Suggested tags for the bot
     */
    private List<String> suggestedTags;

    /**
     * Available category options
     */
    private List<String> categoryOptions;

    /**
     * Bot name
     */
    private String botName;

    /**
     * Bot description
     */
    private String botDescription;

    /**
     * Bot avatar URL
     */
    private String botAvatar;
}
