package com.iflytek.astron.console.toolkit.entity.dto.skill;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Data;

@Data
public class SkillImportDto {
    private Long id;
    private Long parentId;
    private String folderName;
    private String fileName;
    private String name;
    private String description;
    private String downloadUrl;
    private List<SkillImportResourceDto> resources;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime updateTime;
}
