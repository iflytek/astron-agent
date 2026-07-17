package com.iflytek.astron.console.toolkit.entity.vo.skill;

import lombok.Data;

@Data
public class SkillSandboxConfigReq {
    private String provider;
    private Boolean enabled;
    private String apiKey;
    private Boolean apiKeyMasked;
    private Integer timeoutSeconds;
    private Boolean allowInternetAccess;
}
