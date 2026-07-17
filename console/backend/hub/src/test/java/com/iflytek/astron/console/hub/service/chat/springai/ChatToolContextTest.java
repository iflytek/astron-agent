package com.iflytek.astron.console.hub.service.chat.springai;

import com.alibaba.fastjson2.JSONObject;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ChatToolContextTest {

    @Test
    void collectsTraceEntriesInOrderAndDrainClears() {
        ChatToolContext ctx = new ChatToolContext("u1");
        assertEquals("u1", ctx.getUserId());
        ctx.addTrace(new JSONObject().fluentPut("deskToolName", "Web Search"));
        ctx.addTrace(new JSONObject().fluentPut("deskToolName", "MCP: x"));
        assertEquals(2, ctx.drainTrace().size());
        assertTrue(ctx.drainTrace().isEmpty(), "drain should clear the buffer");
    }

    @Test
    void nullEntryIgnored() {
        ChatToolContext ctx = new ChatToolContext("u");
        ctx.addTrace(null);
        assertTrue(ctx.drainTrace().isEmpty());
    }
}
