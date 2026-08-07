package com.iflytek.astron.console.toolkit.entity.vo.skill;

import lombok.Data;

@Data
public class SkillFileCreateReq {
    private Long parentId;
    private String name;
    private String content;
}
