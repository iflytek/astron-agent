package com.iflytek.astron.console.hub.dto.publish.prepare;

import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.List;

/**
 * MCP publish prepare data DTO
 *
 * @author Omuigix
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class McpPrepareDto extends BasePrepareDto {

    /**
     * Input type definitions for workflow
     */
    private List<InputTypeDto> inputTypes;

    /**
     * Suggested configuration for new MCP setup
     */
    private SuggestedConfig suggestedConfig;

    /**
     * Current MCP content information Contains existing MCP configuration data or default values for
     * new setup
     */
    private McpContentInfo contentInfo;

    @Data
    public static class InputTypeDto {
        private String name;
        private String type;
        private String description;
        private Boolean required;
    }

    @Data
    public static class SuggestedConfig {
        private String serviceName;
        private String overview;
        private String content;
    }

    @Data
    public static class McpContentInfo {
        private String serverName;
        private String description;
        private String content;
        private String icon;
        private String serverUrl;
        private Object args;
        private String versionName;
        private String released;
    }
}
