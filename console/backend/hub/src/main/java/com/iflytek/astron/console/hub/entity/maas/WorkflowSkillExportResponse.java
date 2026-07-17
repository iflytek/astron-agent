package com.iflytek.astron.console.hub.entity.maas;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class WorkflowSkillExportResponse {
    private String fileName;
    private String content;
    private Boolean aiGeneratedMetadata;
}
