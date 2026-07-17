package com.iflytek.astron.console.toolkit.entity.platform;

import lombok.Data;

@Data
public class PlatformAccountCardDto {
    private String type;
    private String name;
    private boolean configured;
    private PlatformAccountConfigDto config;

    public PlatformAccountCardDto(PlatformAccountType type, boolean configured, PlatformAccountConfigDto config) {
        this.type = type.getValue();
        this.name = type.getDisplayName();
        this.configured = configured;
        this.config = config;
    }
}
