package com.iflytek.astron.console.toolkit.entity.dto.skill;

import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
public class SkillDirectoryUploadResultDto {
    private List<SkillFileTreeNodeDto> tree = new ArrayList<>();
    private List<SkillFileTreeNodeDto> uploadedNodes = new ArrayList<>();
    private List<String> skippedFiles = new ArrayList<>();
}
