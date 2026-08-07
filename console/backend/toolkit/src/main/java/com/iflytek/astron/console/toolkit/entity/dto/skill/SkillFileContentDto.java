package com.iflytek.astron.console.toolkit.entity.dto.skill;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class SkillFileContentDto {
    private Long id;
    private Long parentId;
    private String name;
    private String entryType;
    private Integer sortOrder;
    private String fileExt;
    private String content;
    private Long fileSize;
    private Boolean skillEntry;
    private String skillName;
    private String skillDescription;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "GMT+8")
    private LocalDateTime updateTime;
}
