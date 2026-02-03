package com.iflytek.astron.console.toolkit.entity.core.openapi;

import com.alibaba.fastjson2.annotation.JSONField;
import lombok.Data;

@Data
public class SecurityScheme {
    String type;
    String name;
    String in;
    @JSONField(name = "x-value")
    String value;
}
