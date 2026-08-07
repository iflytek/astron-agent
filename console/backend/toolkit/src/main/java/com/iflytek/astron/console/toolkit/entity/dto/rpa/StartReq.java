package com.iflytek.astron.console.toolkit.entity.dto.rpa;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.Map;

@Data
public class StartReq {
    @NotBlank
    private String projectId;
    private String execPosition = "EXECUTOR";
    // Can be empty, default RPA currently enabled version
    private Integer version;
    private Map<String, Object> params = Map.of();
}
