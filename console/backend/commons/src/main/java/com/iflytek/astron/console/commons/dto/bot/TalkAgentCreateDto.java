package com.iflytek.astron.console.commons.dto.bot;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class TalkAgentCreateDto extends BotCreateForm {
    private TalkAgentConfigDto talkAgentConfig;
}
