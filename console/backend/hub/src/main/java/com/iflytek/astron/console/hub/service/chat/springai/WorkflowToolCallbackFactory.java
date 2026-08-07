package com.iflytek.astron.console.hub.service.chat.springai;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.toolkit.entity.workflow.AgentWorkflowDefinition;
import com.iflytek.astron.console.toolkit.service.workflow.AgentWorkflowRuntimeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.definition.ToolDefinition;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Builds Spring AI tool callbacks from published workflows the bot has imported. Each flow id is
 * resolved to a callable definition (schema from the workflow start-node inputs) and executed
 * synchronously through the core workflow chat endpoint by {@link AgentWorkflowRuntimeService}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WorkflowToolCallbackFactory {

    private final AgentWorkflowRuntimeService agentWorkflowRuntimeService;

    public List<ToolCallback> build(List<String> flowIds, ChatToolContext context) {
        List<ToolCallback> callbacks = new ArrayList<>();
        for (AgentWorkflowDefinition definition : agentWorkflowRuntimeService.resolveWorkflows(flowIds)) {
            callbacks.add(new WorkflowToolCallback(definition, context));
        }
        return callbacks;
    }

    private class WorkflowToolCallback implements ToolCallback {

        private final AgentWorkflowDefinition definition;
        private final ChatToolContext context;

        WorkflowToolCallback(AgentWorkflowDefinition definition, ChatToolContext context) {
            this.definition = definition;
            this.context = context;
        }

        @Override
        public ToolDefinition getToolDefinition() {
            return ToolDefinition.builder()
                    .name(definition.getFunctionName())
                    .description(StringUtils.defaultIfBlank(definition.getDescription(),
                            "Run workflow " + definition.getFunctionName() + "."))
                    .inputSchema(StringUtils.defaultIfBlank(definition.getInputSchema(),
                            "{\"type\":\"object\",\"properties\":{}}"))
                    .build();
        }

        @Override
        public String call(String toolInput) {
            log.info("workflow tool invoked, tool={}, flowId={}", definition.getFunctionName(),
                    definition.getFlowId());
            JSONObject args;
            try {
                args = StringUtils.isBlank(toolInput) ? new JSONObject() : JSON.parseObject(toolInput);
            } catch (Exception e) {
                log.warn("Failed to parse workflow tool input as JSON, tool: {}, input: {}",
                        definition.getFunctionName(), toolInput);
                args = new JSONObject();
            }
            String content = agentWorkflowRuntimeService.runWorkflow(definition, context.getUserId(), args);
            context.addTrace(new JSONObject()
                    .fluentPut("type", "workflow")
                    .fluentPut("deskToolName", "Workflow: " + StringUtils.defaultIfBlank(definition.getName(),
                            definition.getFunctionName()))
                    .fluentPut("toolName", definition.getFunctionName())
                    .fluentPut("flowId", definition.getFlowId())
                    .fluentPut("arguments", args)
                    .fluentPut("content", StringUtils.abbreviate(content, 2000)));
            return content;
        }
    }
}
