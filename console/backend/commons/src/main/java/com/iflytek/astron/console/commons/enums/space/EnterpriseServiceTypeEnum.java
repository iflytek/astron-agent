package com.iflytek.astron.console.commons.enums.space;

import com.baomidou.mybatisplus.annotation.EnumValue;

public enum EnterpriseServiceTypeEnum {
    NONE(0, "None"),
    TEAM(1, "Team"),
    ENTERPRISE(2, "Enterprise");

    @EnumValue
    private Integer code;

    private String desc;

    EnterpriseServiceTypeEnum(Integer code, String desc) {
        this.code = code;
        this.desc = desc;
    }

    public Integer getCode() {
        return code;
    }

    public String getDesc() {
        return desc;
    }
}
