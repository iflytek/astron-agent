package com.iflytek.astron.console.hub.service.chat.springai;

import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.toolkit.entity.workflow.AgentWorkflowDefinition;
import com.iflytek.astron.console.toolkit.service.workflow.AgentWorkflowRuntimeService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.ai.tool.ToolCallback;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WorkflowToolCallbackFactoryTest {

    private AgentWorkflowDefinition sampleDefinition() {
        return AgentWorkflowDefinition.builder()
                .flowId("flow123")
                .name("Weather Report")
                .functionName("workflow_flow123")
                .description("Weather Report: generate a report")
                .inputSchema("{\"type\":\"object\",\"properties\":{\"city\":{\"type\":\"string\"}},\"required\":[]}")
                .build();
    }

    @Test
    void buildExposesWorkflowAsToolCallback() {
        AgentWorkflowRuntimeService runtime = mock(AgentWorkflowRuntimeService.class);
        when(runtime.resolveWorkflows(List.of("flow123"))).thenReturn(List.of(sampleDefinition()));

        List<ToolCallback> callbacks =
                new WorkflowToolCallbackFactory(runtime).build(List.of("flow123"), new ChatToolContext("u1"));

        assertThat(callbacks).hasSize(1);
        var definition = callbacks.get(0).getToolDefinition();
        assertThat(definition.name()).isEqualTo("workflow_flow123");
        assertThat(definition.description()).contains("Weather Report");
        assertThat(definition.inputSchema()).contains("city");
    }

    @Test
    void callRunsWorkflowWithParsedArgsAndRecordsTrace() {
        AgentWorkflowRuntimeService runtime = mock(AgentWorkflowRuntimeService.class);
        when(runtime.resolveWorkflows(List.of("flow123"))).thenReturn(List.of(sampleDefinition()));
        when(runtime.runWorkflow(any(), eq("u1"), any())).thenReturn("sunny");

        ChatToolContext context = new ChatToolContext("u1");
        ToolCallback callback =
                new WorkflowToolCallbackFactory(runtime).build(List.of("flow123"), context).get(0);
        String result = callback.call("{\"city\":\"Beijing\"}");

        assertThat(result).isEqualTo("sunny");
        ArgumentCaptor<JSONObject> args = ArgumentCaptor.forClass(JSONObject.class);
        verify(runtime).runWorkflow(any(), eq("u1"), args.capture());
        assertThat(args.getValue().getString("city")).isEqualTo("Beijing");
        List<JSONObject> trace = context.drainTrace();
        assertThat(trace).hasSize(1);
        assertThat(trace.get(0).getString("type")).isEqualTo("workflow");
        assertThat(trace.get(0).getString("toolName")).isEqualTo("workflow_flow123");
    }
}
