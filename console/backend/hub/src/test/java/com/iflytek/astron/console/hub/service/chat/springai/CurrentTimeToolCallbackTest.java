package com.iflytek.astron.console.hub.service.chat.springai;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class CurrentTimeToolCallbackTest {

    @Test
    void definitionNameIsCurrentTime() {
        CurrentTimeToolCallback cb = new CurrentTimeToolCallback();
        assertEquals("current_time", cb.getToolDefinition().name());
        assertNotNull(cb.getToolDefinition().inputSchema());
    }

    @Test
    void callReturnsNonEmptyTime() {
        CurrentTimeToolCallback cb = new CurrentTimeToolCallback();
        String out = cb.call("{\"timezone\":\"Asia/Shanghai\"}");
        assertNotNull(out);
        assertFalse(out.isBlank());
    }

    @Test
    void callToleratesEmptyArgs() {
        CurrentTimeToolCallback cb = new CurrentTimeToolCallback();
        assertNotNull(cb.call("{}"));
    }

    @Test
    void callToleratesMalformedJson() {
        CurrentTimeToolCallback cb = new CurrentTimeToolCallback();
        assertNotNull(cb.call("not-json{"));
    }
}
