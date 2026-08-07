package com.iflytek.astron.console.hub.dto.publish.prepare;

import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * API publish prepare data DTO
 *
 * @author Omuigix
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class ApiPrepareDto extends BasePrepareDto {

    /**
     * API endpoint URL
     */
    private String apiEndpoint;

    /**
     * API documentation URL
     */
    private String documentation;

    /**
     * Generated API key
     */
    private String apiKey;

    /**
     * Authentication type
     */
    private String authType;

    /**
     * Suggested configuration
     */
    private SuggestedConfig suggestedConfig;

    @Data
    public static class SuggestedConfig {
        private Integer rateLimitPerMinute;
        private Boolean enableAuth;
    }
}
