package com.iflytek.astron.console.toolkit.entity.platform;

import lombok.Getter;

import java.util.Arrays;

@Getter
public enum PlatformAccountType {
    IFLYTEK_OPEN_PLATFORM("iflytek_open_platform", "IFLYTEK_OPEN_PLATFORM", "讯飞开放平台"),
    AI_ABILITY_CHAT("ai_ability_chat", "AI_ABILITY_CHAT", "AI Ability Chat"),
    VIRTUAL_MAN("virtual_man", "VIRTUAL_MAN", "虚拟人能力"),
    KNOWLEDGE_PLATFORM("knowledge_platform", "KNOWLEDGE_PLATFORM", "知识库平台");

    private final String value;
    private final String code;
    private final String displayName;

    PlatformAccountType(String value, String code, String displayName) {
        this.value = value;
        this.code = code;
        this.displayName = displayName;
    }

    public static PlatformAccountType fromValue(String value) {
        return Arrays.stream(values())
                .filter(type -> type.value.equalsIgnoreCase(value) || type.code.equalsIgnoreCase(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown platform account type: " + value));
    }
}
