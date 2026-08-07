package com.iflytek.astron.console.hub.enums.publish;

public enum PublishApprovalTypeEnum {
    MARKET,
    API,
    MCP,
    WECHAT,
    FEISHU;

    public static PublishApprovalTypeEnum normalize(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim().toUpperCase();
        if ("BOT_API".equals(normalized)) {
            return API;
        }
        return valueOf(normalized);
    }
}
