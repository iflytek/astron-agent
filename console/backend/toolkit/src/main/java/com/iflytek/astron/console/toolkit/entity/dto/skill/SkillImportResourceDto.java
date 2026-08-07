package com.iflytek.astron.console.toolkit.entity.dto.skill;

import lombok.Data;

@Data
public class SkillImportResourceDto {
    private String path;
    private String name;
    private String downloadUrl;
    private String fileExt;
    private Long fileSize;
}
