package com.iflytek.astron.console.commons.enums.bot;

import com.iflytek.astron.console.commons.util.I18nUtil;

/**
 * @author mingsuiyongheng Default model enum class
 */
public enum DefaultBotModelEnum {
    X1("default.bot.model.x1", "x1", "https://openres.xfyun.cn/xfyundoc/2025-09-24/e9b74fbb-c2d6-4f4a-8c07-0ea7f03ee03a/1758681839941/icon.png"),
    SPARK_4_0("default.bot.model.spark_4_0", "spark", "https://openres.xfyun.cn/xfyundoc/2025-09-24/e9b74fbb-c2d6-4f4a-8c07-0ea7f03ee03a/1758681839941/icon.png");

    private String nameKey;
    private String domain;
    private String icon;

    DefaultBotModelEnum(String nameKey, String domain, String icon) {
        this.nameKey = nameKey;
        this.domain = domain;
        this.icon = icon;
    }

    public String getName() {
        return I18nUtil.getMessage(nameKey);
    }

    public String getDomain() {
        return domain;
    }

    public String getIcon() {
        return icon;
    }

    /**
     * Get the corresponding enum constant by domain
     *
     * @param domain Model domain
     * @return Corresponding enum constant, returns null if not found
     */
    public static DefaultBotModelEnum getByDomain(String domain) {
        if (domain == null) {
            return null;
        }
        for (DefaultBotModelEnum model : DefaultBotModelEnum.values()) {
            if (domain.equals(model.getDomain())) {
                return model;
            }
        }
        return null;
    }
}
