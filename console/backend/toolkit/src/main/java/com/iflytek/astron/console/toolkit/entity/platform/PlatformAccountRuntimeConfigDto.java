package com.iflytek.astron.console.toolkit.entity.platform;

import lombok.Data;

@Data
public class PlatformAccountRuntimeConfigDto {
    private String sparkAppId;
    private String sparkVirtualManAppId;
    private boolean iflytekOpenPlatformConfigured;
    private boolean aiAbilityChatConfigured;
    private boolean virtualManConfigured;
    private boolean ragflowConfigured;
    private boolean xinghuoKnowledgeConfigured;
}
