package com.iflytek.astron.console.hub.service.chat.springai;

import com.iflytek.astron.console.hub.service.ManagedWebSearchService;
import com.iflytek.astron.console.hub.service.McpRuntimeToolService;
import com.iflytek.astron.console.toolkit.entity.tool.AgentToolDefinition;
import com.iflytek.astron.console.toolkit.entity.workflow.AgentWorkflowDefinition;
import com.iflytek.astron.console.toolkit.service.tool.AgentToolRuntimeService;
import com.iflytek.astron.console.toolkit.service.workflow.AgentWorkflowRuntimeService;
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
        return newResolver(mcp, mock(AgentToolRuntimeService.class));
    }

    private AgentToolCallbackResolver newResolver(McpRuntimeToolService mcp, AgentToolRuntimeService link) {
        return newResolver(mcp, link, mock(AgentWorkflowRuntimeService.class));
    }

    private AgentToolCallbackResolver newResolver(McpRuntimeToolService mcp, AgentToolRuntimeService link,
            AgentWorkflowRuntimeService workflowRuntime) {
        return new AgentToolCallbackResolver(mock(ManagedWebSearchService.class), new McpToolCallbackFactory(mcp),
                new SkillToolCallbackFactory(mock(SkillRuntimeToolService.class)), new LinkToolCallbackFactory(link),
                new WorkflowToolCallbackFactory(workflowRuntime));
    }

    @Test
    void webSearchAndCurrentTimeFromOpenedTool() throws Exception {
        McpRuntimeToolService mcp = mock(McpRuntimeToolService.class);
        when(mcp.listTools(any())).thenReturn(List.of());
        List<ToolCallback> tools =
                newResolver(mcp).resolve("web_search,current_time", null, null, null, null, new ChatToolContext("u"));
        List<String> names = tools.stream().map(t -> t.getToolDefinition().name()).toList();
        assertTrue(names.contains("web_search"));
        assertTrue(names.contains("current_time"));
    }

    @Test
    void builtinToolsAlwaysPresentEvenWhenOpenedToolBlank() throws Exception {
        McpRuntimeToolService mcp = mock(McpRuntimeToolService.class);
        when(mcp.listTools(any())).thenReturn(List.of());
        List<ToolCallback> tools = newResolver(mcp).resolve("", null, null, null, null, new ChatToolContext("u"));
        List<String> names = tools.stream().map(t -> t.getToolDefinition().name()).toList();
        assertTrue(names.contains("web_search"));
        assertTrue(names.contains("current_time"));
    }

    @Test
    void mcpUrlsParsedFromJsonArrayString() throws Exception {
        McpRuntimeToolService mcp = mock(McpRuntimeToolService.class);
        when(mcp.listTools(List.of("http://a", "http://b"))).thenReturn(List.of());
        newResolver(mcp).resolve(null, "[\"http://a\",\"http://b\"]", null, null, null, new ChatToolContext("u"));
        verify(mcp).listTools(List.of("http://a", "http://b"));
    }

    @Test
    void pluginToolIdsParsedFromToolsJsonAndExposedAsCallbacks() throws Exception {
        McpRuntimeToolService mcp = mock(McpRuntimeToolService.class);
        when(mcp.listTools(any())).thenReturn(List.of());
        AgentToolRuntimeService link = mock(AgentToolRuntimeService.class);
        when(link.resolveTools(List.of("tool@a", "tool@b"))).thenReturn(List.of(
                AgentToolDefinition.builder()
                        .toolId("tool@a")
                        .functionName("getWeather")
                        .description("d")
                        .inputSchema("{\"type\":\"object\",\"properties\":{}}")
                        .build()));

        String toolsJson = "[{\"toolId\":\"tool@a\",\"name\":\"A\"},{\"toolId\":\"tool@b\"},{\"toolId\":\"tool@a\"}]";
        List<ToolCallback> tools =
                newResolver(mcp, link).resolve(null, null, null, toolsJson, null, new ChatToolContext("u"));

        // duplicate tool@a is de-duplicated before resolveTools is called
        verify(link).resolveTools(List.of("tool@a", "tool@b"));
        List<String> names = tools.stream().map(t -> t.getToolDefinition().name()).toList();
        assertTrue(names.contains("getWeather"));
    }

    @Test
    void workflowFlowIdsParsedFromWorkflowsJsonAndExposedAsCallbacks() throws Exception {
        McpRuntimeToolService mcp = mock(McpRuntimeToolService.class);
        when(mcp.listTools(any())).thenReturn(List.of());
        AgentWorkflowRuntimeService workflowRuntime = mock(AgentWorkflowRuntimeService.class);
        when(workflowRuntime.resolveWorkflows(List.of("flowA", "flowB"))).thenReturn(List.of(
                AgentWorkflowDefinition.builder()
                        .flowId("flowA")
                        .functionName("workflow_flowA")
                        .description("d")
                        .inputSchema("{\"type\":\"object\",\"properties\":{}}")
                        .build()));

        String workflowsJson = "[{\"flowId\":\"flowA\",\"name\":\"A\"},{\"flowId\":\"flowB\"},{\"flowId\":\"flowA\"}]";
        List<ToolCallback> tools = newResolver(mcp, mock(AgentToolRuntimeService.class), workflowRuntime)
                .resolve(null, null, null, null, workflowsJson, new ChatToolContext("u"));

        // duplicate flowA is de-duplicated before resolveWorkflows is called
        verify(workflowRuntime).resolveWorkflows(List.of("flowA", "flowB"));
        List<String> names = tools.stream().map(t -> t.getToolDefinition().name()).toList();
        assertTrue(names.contains("workflow_flowA"));
    }
}
