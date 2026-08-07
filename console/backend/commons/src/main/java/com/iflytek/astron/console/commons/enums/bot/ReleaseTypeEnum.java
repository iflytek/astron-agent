package com.iflytek.astron.console.commons.enums.bot;

public enum ReleaseTypeEnum {

    MARKET(1, "Bot Market"),

    BOT_API(2, "Bot API"),

    WECHAT(3, "WeChat Official Account"),

    MCP(4, "MCP"),

    FEISHU(5, "Feishu"),
    ;

    private Integer code;

    private String desc;

    public Integer getCode() {
        return code;
    }

    public String getDesc() {
        return desc;
    }

    /**
     * Get enum by string name (case insensitive)
     */
    public static ReleaseTypeEnum getByName(String name) {
        if (name == null) {
            return null;
        }

        try {
            return valueOf(name.toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    ReleaseTypeEnum(Integer code, String desc) {
        this.code = code;
        this.desc = desc;
    }

}
