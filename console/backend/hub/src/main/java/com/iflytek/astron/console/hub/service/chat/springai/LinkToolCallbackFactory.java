package com.iflytek.astron.console.hub.service.chat.springai;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.toolkit.entity.tool.AgentToolDefinition;
import com.iflytek.astron.console.toolkit.service.tool.AgentToolRuntimeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.definition.ToolDefinition;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Builds Spring AI tool callbacks from tool-square plugins (Link tools) the bot has imported. Each
 * imported {@code tool@xxx} is resolved to a callable definition and executed through the core-link
 * {@code http_run} runtime by {@link AgentToolRuntimeService} (the same production path used by the
 * plugin "debug" feature and the workflow agent).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LinkToolCallbackFactory {

    private final AgentToolRuntimeService agentToolRuntimeService;

    public List<ToolCallback> build(List<String> toolIds, ChatToolContext context) {
        List<ToolCallback> callbacks = new ArrayList<>();
        for (AgentToolDefinition definition : agentToolRuntimeService.resolveTools(toolIds)) {
            callbacks.add(new LinkToolCallback(definition, context));
        }
        return callbacks;
    }

    private class LinkToolCallback implements ToolCallback {

        private final AgentToolDefinition definition;
        private final ChatToolContext context;

        LinkToolCallback(AgentToolDefinition definition, ChatToolContext context) {
            this.definition = definition;
            this.context = context;
        }

        @Override
        public ToolDefinition getToolDefinition() {
            return ToolDefinition.builder()
                    .name(definition.getFunctionName())
                    .description(StringUtils.defaultIfBlank(definition.getDescription(),
                            "Call plugin " + definition.getFunctionName() + "."))
                    .inputSchema(StringUtils.defaultIfBlank(definition.getInputSchema(),
                            "{\"type\":\"object\",\"properties\":{}}"))
                    .build();
        }

        @Override
        public String call(String toolInput) {
            log.info("link tool invoked, tool={}, toolId={}", definition.getFunctionName(), definition.getToolId());
            JSONObject args;
            try {
                args = StringUtils.isBlank(toolInput) ? new JSONObject() : JSON.parseObject(toolInput);
            } catch (Exception e) {
                log.warn("Failed to parse link tool input as JSON, tool: {}, input: {}",
                        definition.getFunctionName(), toolInput);
                args = new JSONObject();
            }
            String content = agentToolRuntimeService.runTool(definition, args);
            context.addTrace(new JSONObject()
                    .fluentPut("type", "link")
                    .fluentPut("deskToolName", "Plugin: " + definition.getFunctionName())
                    .fluentPut("toolName", definition.getFunctionName())
                    .fluentPut("toolId", definition.getToolId())
                    .fluentPut("arguments", args)
                    .fluentPut("content", StringUtils.abbreviate(content, 2000)));
            return content;
        }
    }
}
