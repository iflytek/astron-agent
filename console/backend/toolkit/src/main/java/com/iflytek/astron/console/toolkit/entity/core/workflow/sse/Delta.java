package com.iflytek.astron.console.toolkit.entity.core.workflow.sse;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.Map;

@Data
public class Delta {
    String role;
    String content;

    @JsonProperty("reasoning_content")
    String reasoningContent;

    @JsonProperty("agent_event")
    Map<String, Object> agentEvent;
}
