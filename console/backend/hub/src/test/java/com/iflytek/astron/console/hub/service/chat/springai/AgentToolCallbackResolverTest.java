package com.iflytek.astron.console.hub.service.chat.springai;

import com.iflytek.astron.console.hub.service.ManagedWebSearchService;
import com.iflytek.astron.console.hub.service.McpRuntimeToolService;
import org.junit.jupiter.api.Test;
import org.springframework.ai.tool.ToolCallback;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AgentToolCallbackResolverTest {

    private AgentToolCallbackResolver newResolver(McpRuntimeToolService mcp) {
        return new AgentToolCallbackResolver(mock(ManagedWebSearchService.class), new McpToolCallbackFactory(mcp));
    }

    @Test
    void webSearchAndCurrentTimeFromOpenedTool() throws Exception {
        McpRuntimeToolService mcp = mock(McpRuntimeToolService.class);
        when(mcp.listTools(any())).thenReturn(List.of());
        List<ToolCallback> tools = newResolver(mcp).resolve("web_search,current_time", null, new ChatToolContext("u"));
        List<String> names = tools.stream().map(t -> t.getToolDefinition().name()).toList();
        assertTrue(names.contains("web_search"));
        assertTrue(names.contains("current_time"));
    }

    @Test
    void builtinToolsAlwaysPresentEvenWhenOpenedToolBlank() throws Exception {
        McpRuntimeToolService mcp = mock(McpRuntimeToolService.class);
        when(mcp.listTools(any())).thenReturn(List.of());
        List<ToolCallback> tools = newResolver(mcp).resolve("", null, new ChatToolContext("u"));
        List<String> names = tools.stream().map(t -> t.getToolDefinition().name()).toList();
        assertTrue(names.contains("web_search"));
        assertTrue(names.contains("current_time"));
    }

    @Test
    void mcpUrlsParsedFromJsonArrayString() throws Exception {
        McpRuntimeToolService mcp = mock(McpRuntimeToolService.class);
        when(mcp.listTools(List.of("http://a", "http://b"))).thenReturn(List.of());
        newResolver(mcp).resolve(null, "[\"http://a\",\"http://b\"]", new ChatToolContext("u"));
        verify(mcp).listTools(List.of("http://a", "http://b"));
    }
}
