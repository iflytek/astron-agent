package com.iflytek.astron.console.toolkit.entity.dto;

import com.iflytek.astron.console.toolkit.entity.dto.talkagent.TalkAgentConfigDto;
import lombok.Data;

/**
 * @Author clliu19
 * @Date: 2025/10/23 17:42
 */
@Data
public class CloneFlowReq {
    Long maasId;
    Integer botId;
    String password;
    Integer flowType;
    TalkAgentConfigDto flowConfig;
}
