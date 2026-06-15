package com.iflytek.astron.console.hub.service.chat.springai;

import com.alibaba.fastjson2.JSONObject;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;

class AgentSseBridgeTest {

    @Test
    void emitsContentEventsAndAccumulatesFinalResult() throws Exception {
        SseEmitter emitter = mock(SseEmitter.class);
        List<Object> sent = new ArrayList<>();
        doAnswer(inv -> {
            sent.add(inv.getArgument(0));
            return null;
        }).when(emitter).send(any(SseEmitter.SseEventBuilder.class));

        AgentSseBridge bridge = new AgentSseBridge(emitter, "stream1");
        bridge.emitContent("Hello");
        bridge.emitContent(" World");

        assertEquals("Hello World", bridge.getFinalResult().toString());
        assertEquals(2, sent.size());
    }

    @Test
    void emitReasoningAccumulatesThinking() throws Exception {
        SseEmitter emitter = mock(SseEmitter.class);
        doAnswer(inv -> null).when(emitter).send(any(SseEmitter.SseEventBuilder.class));
        AgentSseBridge bridge = new AgentSseBridge(emitter, "s");
        bridge.emitReasoning("think...");
        assertEquals("think...", bridge.getThinkingResult().toString());
    }

    @Test
    void emitToolTraceMarksManagedSearch() throws Exception {
        SseEmitter emitter = mock(SseEmitter.class);
        doAnswer(inv -> null).when(emitter).send(any(SseEmitter.SseEventBuilder.class));
        AgentSseBridge bridge = new AgentSseBridge(emitter, "s");
        bridge.emitToolTrace(List.of(new JSONObject().fluentPut("type", "web_search")));
        org.junit.jupiter.api.Assertions.assertTrue(bridge.isManagedSearchTrace());
        org.junit.jupiter.api.Assertions.assertTrue(bridge.getTraceResult().length() > 0);
    }
}
