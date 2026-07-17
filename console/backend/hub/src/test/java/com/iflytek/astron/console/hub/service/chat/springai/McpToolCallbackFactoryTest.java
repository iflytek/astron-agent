package com.iflytek.astron.console.hub.service.chat.springai;

import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.hub.service.McpRuntimeToolService;
import com.iflytek.astron.console.hub.service.McpRuntimeToolService.McpRuntimeTool;
import org.junit.jupiter.api.Test;
import org.springframework.ai.tool.ToolCallback;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class McpToolCallbackFactoryTest {

    @Test
    void buildsOneCallbackPerToolAndTracesOnCall() throws Exception {
        McpRuntimeToolService svc = mock(McpRuntimeToolService.class);
        McpRuntimeTool tool = new McpRuntimeTool("mcp_weather", "s1", "http://srv", "weather",
                "desc", new JSONObject().fluentPut("type", "object"));
        when(svc.listTools(List.of("http://srv"))).thenReturn(List.of(tool));
        when(svc.callTool(eq(tool), any())).thenReturn("rainy");

        ChatToolContext ctx = new ChatToolContext("u1");
        List<ToolCallback> callbacks = new McpToolCallbackFactory(svc).build(List.of("http://srv"), ctx);

        assertEquals(1, callbacks.size());
        assertEquals("mcp_weather", callbacks.get(0).getToolDefinition().name());
        assertEquals("rainy", callbacks.get(0).call("{\"city\":\"x\"}"));
        assertEquals(1, ctx.drainTrace().size());
    }

    @Test
    void emptyUrlsYieldNoCallbacks() throws Exception {
        McpRuntimeToolService svc = mock(McpRuntimeToolService.class);
        when(svc.listTools(List.of())).thenReturn(List.of());
        List<ToolCallback> callbacks = new McpToolCallbackFactory(svc).build(List.of(), new ChatToolContext("u"));
        assertTrue(callbacks.isEmpty());
    }

    @Test
    void malformedInputFallsBackToEmptyArgs() throws Exception {
        McpRuntimeToolService svc = mock(McpRuntimeToolService.class);
        McpRuntimeTool tool = new McpRuntimeTool("mcp_x", "s", "http://s", "x", "d", new JSONObject());
        when(svc.listTools(List.of("http://s"))).thenReturn(List.of(tool));
        when(svc.callTool(eq(tool), any())).thenReturn("ok");

        List<ToolCallback> callbacks = new McpToolCallbackFactory(svc).build(List.of("http://s"), new ChatToolContext("u"));
        // Malformed JSON must not throw; the tool is still invoked (with empty args fallback)
        assertEquals("ok", callbacks.get(0).call("not-json{"));
    }
}
