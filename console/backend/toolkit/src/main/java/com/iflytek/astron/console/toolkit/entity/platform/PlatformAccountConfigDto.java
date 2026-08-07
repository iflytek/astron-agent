package com.iflytek.astron.console.toolkit.entity.platform;

import lombok.Data;

@Data
public class PlatformAccountConfigDto {
    private IflytekOpenPlatformConfig iflytekOpenPlatform;
    private AiAbilityChatConfig aiAbilityChat;
    private VirtualManConfig virtualMan;
    private KnowledgePlatformConfig knowledgePlatform;
    private Boolean configured;

    @Data
    public static class IflytekOpenPlatformConfig {
        private String platformAppId;
        private String platformApiKey;
        private String platformApiSecret;
        private String sparkApiPassword;
        private String sparkRtasrApiKey;
    }

    @Data
    public static class AiAbilityChatConfig {
        private String baseUrl;
        private String model;
        private String apiKey;
    }

    @Data
    public static class VirtualManConfig {
        private String sparkVirtualManAppId;
        private String sparkVirtualManApiKey;
        private String sparkVirtualManApiSecret;
    }

    @Data
    public static class KnowledgePlatformConfig {
        private RagflowConfig ragflow;
        private XinghuoKnowledgeConfig xinghuo;
    }

    @Data
    public static class RagflowConfig {
        private String baseUrl;
        private String apiToken;
        private Integer timeout;
        private String defaultGroup;
    }

    @Data
    public static class XinghuoKnowledgeConfig {
        private String datasetId;
    }
}
