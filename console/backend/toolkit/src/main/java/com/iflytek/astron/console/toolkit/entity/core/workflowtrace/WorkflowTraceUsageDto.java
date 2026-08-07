package com.iflytek.astron.console.toolkit.entity.core.workflowtrace;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Data;

@Data
public class WorkflowTraceUsageDto {
    @JsonAlias("question_tokens")
    private Long questionTokens = 0L;

    @JsonAlias("prompt_tokens")
    private Long promptTokens = 0L;

    @JsonAlias("completion_tokens")
    private Long completionTokens = 0L;

    @JsonAlias("total_tokens")
    private Long totalTokens = 0L;
}
