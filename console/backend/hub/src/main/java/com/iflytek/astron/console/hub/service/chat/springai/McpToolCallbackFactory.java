package com.iflytek.astron.console.hub.service.chat.springai;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.hub.service.McpRuntimeToolService;
import com.iflytek.astron.console.hub.service.McpRuntimeToolService.McpRuntimeTool;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.definition.ToolDefinition;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/** Builds Spring AI tool callbacks from MCP tools exposed by the internal MCP runtime gateway. */
@Slf4j
@Service
@RequiredArgsConstructor
public class McpToolCallbackFactory {

    private final McpRuntimeToolService mcpRuntimeToolService;

    public List<ToolCallback> build(List<String> serverUrls, ChatToolContext context) throws IOException {
        List<ToolCallback> callbacks = new ArrayList<>();
        for (McpRuntimeTool tool : mcpRuntimeToolService.listTools(serverUrls)) {
            callbacks.add(new McpToolCallback(tool, context));
        }
        return callbacks;
    }

    private class McpToolCallback implements ToolCallback {

        private final McpRuntimeTool tool;
        private final ChatToolContext context;

        McpToolCallback(McpRuntimeTool tool, ChatToolContext context) {
            this.tool = tool;
            this.context = context;
        }

        @Override
        public ToolDefinition getToolDefinition() {
            return ToolDefinition.builder()
                    .name(tool.functionName())
                    .description(StringUtils.defaultIfBlank(tool.description(), "Call MCP tool " + tool.toolName() + "."))
                    .inputSchema(tool.inputSchema() == null
                            ? "{\"type\":\"object\",\"properties\":{}}"
                            : tool.inputSchema().toJSONString())
                    .build();
        }

        @Override
        public String call(String toolInput) {
            log.info("mcp tool invoked, tool={}", tool.toolName());
            JSONObject args;
            try {
                args = StringUtils.isBlank(toolInput) ? new JSONObject() : JSON.parseObject(toolInput);
            } catch (Exception e) {
                log.warn("Failed to parse MCP tool input as JSON, tool: {}, input: {}", tool.toolName(), toolInput);
                args = new JSONObject();
            }
            String content;
            try {
                content = mcpRuntimeToolService.callTool(tool, args);
            } catch (IOException e) {
                log.warn("MCP tool call failed, tool: {}, error: {}", tool.toolName(), e.getMessage());
                content = "MCP tool call failed: " + e.getMessage();
            }
            context.addTrace(new JSONObject()
                    .fluentPut("type", "mcp")
                    .fluentPut("deskToolName", "MCP: " + tool.toolName())
                    .fluentPut("toolName", tool.toolName())
                    .fluentPut("serverUrl", tool.serverUrl())
                    .fluentPut("arguments", args)
                    .fluentPut("content", StringUtils.abbreviate(content, 2000)));
            return content;
        }
    }
}
