package com.iflytek.astron.console.commons.enums;

import lombok.Getter;

/**
 * Binding status enum for agent and WeChat official account
 *
 * @author Omuigix
 */
@Getter
public enum BotOffiaccountStatusEnum {

    /**
     * Bound
     */
    BOUND(1, "Bound"),

    /**
     * Unbound
     */
    UNBOUND(2, "Unbound");

    /**
     * Status code
     */
    private final Integer status;

    /**
     * Status description
     */
    private final String desc;

    BotOffiaccountStatusEnum(Integer status, String desc) {
        this.status = status;
        this.desc = desc;
    }
}
