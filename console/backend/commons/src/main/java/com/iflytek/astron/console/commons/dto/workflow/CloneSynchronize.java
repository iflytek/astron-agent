package com.iflytek.astron.console.commons.dto.workflow;

import lombok.Data;

@Data
public class CloneSynchronize {

    private String uid;
    private Long originId;
    private Long currentId;
    private Long spaceId;
    private String flowId;
}
