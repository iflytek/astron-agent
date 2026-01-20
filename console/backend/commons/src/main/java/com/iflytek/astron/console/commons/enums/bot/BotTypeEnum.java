package com.iflytek.astron.console.commons.enums.bot;

/**
 * @author yingpeng
 */
public enum BotTypeEnum {

    SYSTEM_BOT(1, "Command Bot"),
    WORKFLOW_BOT(3, "Workflow Bot"),
    TALK(4, "Conversational assistant");

    private final Integer type;

    private final String desc;

    BotTypeEnum(Integer type, String desc) {
        this.type = type;
        this.desc = desc;
    }

    public Integer getType() {
        return type;
    }

    public String getDesc() {
        return desc;
    }

    /**
     * Get enum by type
     */
    public static BotTypeEnum getByType(Integer type) {
        if (type == null) {
            return null;
        }
        for (BotTypeEnum botType : values()) {
            if (botType.getType().equals(type)) {
                return botType;
            }
        }
        return null;
    }

    /**
     * Determine if it is a workflow bot
     */
    public static boolean isWorkflowBot(Integer type) {
        return WORKFLOW_BOT.getType().equals(type);
    }

    /**
     * Determine if it is a workflow bot
     */
    public static boolean isTalkBot(Integer type) {
        return TALK.getType().equals(type);
    }
}
