package com.iflytek.astron.console.toolkit.entity.core.workflow.sse;

import com.fasterxml.jackson.databind.JsonNode;
import com.iflytek.astron.console.toolkit.util.JacksonUtil;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DeltaStructuredEventTest {

    @Test
    void agentEventSurvivesWorkflowSseDtoRoundTrip() {
        String json = """
                {
                  "choices": [{
                    "delta": {
                      "role": "assistant",
                      "content": "",
                      "reasoning_content": "",
                      "agent_event": {
                        "version": 1,
                        "runId": "run-1",
                        "seq": 1,
                        "type": "execution_start",
                        "startedAt": 100
                      }
                    }
                  }]
                }
                """;

        ChatResponse response = JacksonUtil.parseObject(json, ChatResponse.class);
        JsonNode serialized = JacksonUtil.parseJSONObject(
                JacksonUtil.toJSONString(response, JacksonUtil.NON_NULL_OBJECT_MAPPER));
        JsonNode agentEvent = serialized.at("/choices/0/delta/agent_event");
        JsonNode expectedAgentEvent = JacksonUtil.parseJSONObject("""
                {
                  "version": 1,
                  "runId": "run-1",
                  "seq": 1,
                  "type": "execution_start",
                  "startedAt": 100
                }
                """);

        assertThat(agentEvent.isMissingNode()).isFalse();
        assertThat(agentEvent).isEqualTo(expectedAgentEvent);
    }
}
