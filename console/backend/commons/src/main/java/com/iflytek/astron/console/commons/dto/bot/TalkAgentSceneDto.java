package com.iflytek.astron.console.commons.dto.bot;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TalkAgentSceneDto {
    private String sceneId;
    private String defaultVCN;
    private String name;
    private String gender;
    private String posture;
    private List<String> type;
    private String avatar;
    private String sampleAvatar;
}
