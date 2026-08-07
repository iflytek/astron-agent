package com.iflytek.astron.console.hub.dto.publish.prepare;

import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * Feishu publish prepare data DTO
 *
 * @author Omuigix
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class FeishuPrepareDto extends BasePrepareDto {

    /**
     * Feishu app ID
     */
    private String appId;

    /**
     * Feishu app secret
     */
    private String appSecret;

    /**
     * Bot name for Feishu
     */
    private String botName;

    /**
     * Bot description for Feishu
     */
    private String botDescription;

    /**
     * Bot avatar URL for Feishu
     */
    private String botAvatar;

    /**
     * Suggested configuration
     */
    private SuggestedConfig suggestedConfig;

    @Data
    public static class SuggestedConfig {
        private String displayName;
        private String description;
    }
}
