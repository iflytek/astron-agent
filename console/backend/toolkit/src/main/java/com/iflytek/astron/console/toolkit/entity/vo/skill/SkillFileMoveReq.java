package com.iflytek.astron.console.toolkit.entity.vo.skill;

import lombok.Data;

@Data
public class SkillFileMoveReq {
    private Long id;
    private Long targetParentId;
    private Integer sortOrder;
}
