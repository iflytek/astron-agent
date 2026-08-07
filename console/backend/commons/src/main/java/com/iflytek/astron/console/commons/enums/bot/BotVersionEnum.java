package com.iflytek.astron.console.commons.enums.bot;

import lombok.Getter;

/**
 * @author yun-zhi-ztl
 */

@Getter
public enum BotVersionEnum {
    BASE_BOT(1, "Command Assistant"),
    WORKFLOW(3, "Workflow Assistant"),
    TALK(4, "Talk Assistant");

    public final Integer version;
    public final String desc;

    BotVersionEnum(Integer version, String desc) {
        this.version = version;
        this.desc = desc;
    }

    public static boolean isBaseBot(Integer version) {
        if (null == version) {
            return false;
        } else {
            return BASE_BOT.getVersion().equals(version);
        }

    }

    public static boolean isWorkflow(Integer version) {
        if (null == version) {
            return false;
        } else {
            return WORKFLOW.getVersion().equals(version);
        }
    }

    public static boolean isTalkAgent(Integer version) {
        if (null == version) {
            return false;
        } else {
            return TALK.getVersion().equals(version);
        }
    }
}
