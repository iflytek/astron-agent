package com.iflytek.astron.console.toolkit.entity.dto.rpa;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.Map;

@Data
public class StartReq {
    @NotBlank
    private String projectId;
    private String execPosition = "EXECUTOR";
    // Nullable, defaults to current active RPA version
    private Integer version;
    private Map<String, Object> params = Map.of();
}
