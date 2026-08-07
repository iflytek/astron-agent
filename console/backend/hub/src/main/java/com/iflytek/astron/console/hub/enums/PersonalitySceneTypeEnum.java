package com.iflytek.astron.console.hub.enums;

/**
 * Personality configuration scene type enumeration
 */
public enum PersonalitySceneTypeEnum {
    SPACE(1, "Companionship Scene"),
    ENTERPRISE(2, "Training Scene");

    private final Integer code;
    private final String desc;

    PersonalitySceneTypeEnum(Integer code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public static PersonalitySceneTypeEnum getByCode(Integer code) {
        for (PersonalitySceneTypeEnum value : values()) {
            if (value.code.equals(code)) {
                return value;
            }
        }
        return null;
    }

    public Integer getCode() {
        return code;
    }

    public String getDesc() {
        return desc;
    }
}
