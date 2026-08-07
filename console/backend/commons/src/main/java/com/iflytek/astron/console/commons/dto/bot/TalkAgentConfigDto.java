package com.iflytek.astron.console.commons.dto.bot;

import lombok.Data;

@Data
public class TalkAgentConfigDto {
    private Integer botId;
    private Integer interactType;
    private String sceneId;
    private Integer sceneEnable;
    private Integer sceneMode;
    private String callSceneId;
    private String sceneCallConfig;
    private String vcn;
    private Integer vcnEnable;
    private String flowId;
}
