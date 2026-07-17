package com.iflytek.astron.console.toolkit.entity.dto.skill;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class SkillSandboxConfigDto {
    private String provider;
    private Boolean enabled;
    private String apiKey;
    private Boolean apiKeyMasked;
    private Integer timeoutSeconds;
    private Boolean allowInternetAccess;
    private String lastTestStatus;
    private String lastTestMessage;
    private String artifactUploadUrl;
    private String artifactUploadToken;
    private Long spaceId;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime lastTestTime;
}
