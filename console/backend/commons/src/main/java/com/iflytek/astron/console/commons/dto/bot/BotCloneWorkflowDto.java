package com.iflytek.astron.console.commons.dto.bot;

import lombok.Data;

@Data
public class BotCloneWorkflowDto {
    Long maasId;
    Integer botId;
    String password;
    Integer flowType;
    TalkAgentConfigDto flowConfig;
}
