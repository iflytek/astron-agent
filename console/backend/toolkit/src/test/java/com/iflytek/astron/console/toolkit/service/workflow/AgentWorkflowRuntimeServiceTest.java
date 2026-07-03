package com.iflytek.astron.console.toolkit.service.workflow;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.entity.workflow.Workflow;
import com.iflytek.astron.console.toolkit.entity.workflow.AgentWorkflowDefinition;
import com.iflytek.astron.console.toolkit.mapper.workflow.WorkflowMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AgentWorkflowRuntimeServiceTest {

    private static final String PROTOCOL = "{\"nodes\":[{\"id\":\"node-start::abc\",\"data\":{\"outputs\":["
            + "{\"name\":\"AGENT_USER_INPUT\",\"required\":true,\"description\":\"user question\","
            + "\"schema\":{\"type\":\"string\"}},"
            + "{\"name\":\"city\",\"required\":false,\"schema\":{\"type\":\"string\"},\"description\":\"city name\"},"
            + "{\"name\":\"doc\",\"required\":true,\"fileType\":\"pdf\",\"schema\":{\"type\":\"string\"}}"
            + "]}}]}";

    private static final String ARRAY_PROTOCOL = "{\"nodes\":[{\"id\":\"node-start::xyz\",\"data\":{\"outputs\":["
            + "{\"name\":\"tags\",\"required\":false,\"schema\":{\"type\":\"array-string\"}}"
            + "]}}]}";

    private Workflow sampleWorkflow() {
        Workflow workflow = new Workflow();
        workflow.setFlowId("flow123");
        workflow.setName("Weather Report");
        workflow.setDescription("Generate a weather report");
        workflow.setUid("me");
        workflow.setSpaceId(7L);
        workflow.setDeleted(false);
        workflow.setPublishedData(PROTOCOL);
        return workflow;
    }

    private AgentWorkflowRuntimeService newService(WorkflowMapper mapper, WorkflowChatRunClient client) {
        return new AgentWorkflowRuntimeService(mapper, client);
    }

    @Test
    void resolveWorkflows_buildsFunctionNameAndSchemaFromStartNode() {
        WorkflowMapper mapper = mock(WorkflowMapper.class);
        when(mapper.selectList(any())).thenReturn(List.of(sampleWorkflow()));

        List<AgentWorkflowDefinition> defs =
                newService(mapper, mock(WorkflowChatRunClient.class)).resolveWorkflows(List.of("flow123"));

        assertThat(defs).hasSize(1);
        AgentWorkflowDefinition def = defs.get(0);
        assertThat(def.getFlowId()).isEqualTo("flow123");
        assertThat(def.getFunctionName()).isEqualTo("workflow_flow123");
        assertThat(def.getDescription()).contains("Weather Report").contains("Generate a weather report");

        JSONObject schema = JSON.parseObject(def.getInputSchema());
        JSONObject properties = schema.getJSONObject("properties");
        assertThat(properties.keySet()).containsExactlyInAnyOrder("AGENT_USER_INPUT", "city", "doc");
        // file inputs are exposed as string URLs
        assertThat(properties.getJSONObject("doc").getString("type")).isEqualTo("string");
        assertThat(properties.getJSONObject("doc").getString("description")).contains("file URL");
        assertThat(schema.getJSONArray("required")).containsExactlyInAnyOrder("AGENT_USER_INPUT", "doc");
    }

    @Test
    void resolveWorkflows_skipsDeletedAndUnknown() {
        Workflow deleted = sampleWorkflow();
        deleted.setDeleted(true);
        WorkflowMapper mapper = mock(WorkflowMapper.class);
        when(mapper.selectList(any())).thenReturn(List.of(deleted));

        assertThat(newService(mapper, mock(WorkflowChatRunClient.class)).resolveWorkflows(List.of("flow123")))
                .isEmpty();
        assertThat(newService(mapper, mock(WorkflowChatRunClient.class)).resolveWorkflows(List.of())).isEmpty();
    }

    @Test
    void checkWorkflowsAccessible_allowsOwnAndSameSpace_rejectsOthers() {
        Workflow own = sampleWorkflow();
        Workflow space = sampleWorkflow();
        space.setFlowId("flowSpace");
        space.setUid("someone");
        Workflow foreign = sampleWorkflow();
        foreign.setFlowId("flowForeign");
        foreign.setUid("someone");
        foreign.setSpaceId(99L);
        WorkflowMapper mapper = mock(WorkflowMapper.class);
        when(mapper.selectList(any())).thenReturn(List.of(own, space, foreign));

        AgentWorkflowRuntimeService service = newService(mapper, mock(WorkflowChatRunClient.class));
        assertThat(service.checkWorkflowsAccessible("me", 7L, List.of("flow123", "flowSpace"))).isTrue();
        assertThat(service.checkWorkflowsAccessible("me", 7L, List.of("flowForeign"))).isFalse();
        assertThat(service.checkWorkflowsAccessible("me", 7L, List.of("flowMissing"))).isFalse();
        assertThat(service.checkWorkflowsAccessible("me", 7L, List.of())).isTrue();
    }

    @Test
    void checkWorkflowsAccessible_jsonOverload_allowsOwnRejectsForeignAndToleratesMalformed() {
        Workflow own = sampleWorkflow();
        Workflow foreign = sampleWorkflow();
        foreign.setFlowId("flowForeign");
        foreign.setUid("someone");
        foreign.setSpaceId(99L);
        WorkflowMapper mapper = mock(WorkflowMapper.class);
        when(mapper.selectList(any())).thenReturn(List.of(own, foreign));

        AgentWorkflowRuntimeService service = newService(mapper, mock(WorkflowChatRunClient.class));

        // Accessible flowId named in the raw JSON array.
        assertThat(service.checkWorkflowsAccessible("me", 7L, "[{\"flowId\":\"flow123\"}]")).isTrue();

        // Foreign flowId named in the raw JSON array must be rejected.
        assertThat(service.checkWorkflowsAccessible("me", 7L, "[{\"flowId\":\"flowForeign\"}]")).isFalse();

        // Malformed JSON parses to an empty flowId list, which is trivially accessible; this is
        // safe because the resolver's own tolerant parser also yields an empty list, so nothing
        // gets assembled or executed.
        assertThat(service.checkWorkflowsAccessible("me", 7L, "not json")).isTrue();
        assertThat(service.checkWorkflowsAccessible("me", 7L, (String) null)).isTrue();
    }

    @Test
    void runWorkflow_sendsNonStreamingRequestAndExtractsContent() throws Exception {
        WorkflowMapper mapper = mock(WorkflowMapper.class);
        when(mapper.selectList(any())).thenReturn(List.of(sampleWorkflow()));
        WorkflowChatRunClient client = mock(WorkflowChatRunClient.class);
        when(client.chat(any())).thenReturn(
                "{\"code\":0,\"choices\":[{\"delta\":{\"role\":\"assistant\",\"content\":\"sunny\"},\"index\":0}]}");

        AgentWorkflowRuntimeService service = newService(mapper, client);
        AgentWorkflowDefinition def = service.resolveWorkflows(List.of("flow123")).get(0);
        String result = service.runWorkflow(def, "user-1", new JSONObject().fluentPut("city", "Beijing"));

        assertThat(result).isEqualTo("sunny");
        ArgumentCaptor<JSONObject> captor = ArgumentCaptor.forClass(JSONObject.class);
        verify(client).chat(captor.capture());
        JSONObject body = captor.getValue();
        assertThat(body.getString("flow_id")).isEqualTo("flow123");
        assertThat(body.getString("uid")).isEqualTo("user-1");
        assertThat(body.getBooleanValue("stream")).isFalse();
        assertThat(body.getJSONArray("history")).isEmpty();
        assertThat(body.getJSONObject("parameters").getString("city")).isEqualTo("Beijing");
    }

    @Test
    void runWorkflow_mapsErrorAndInterruptToReadableMessages() throws Exception {
        WorkflowMapper mapper = mock(WorkflowMapper.class);
        when(mapper.selectList(any())).thenReturn(List.of(sampleWorkflow()));
        WorkflowChatRunClient client = mock(WorkflowChatRunClient.class);
        AgentWorkflowRuntimeService service = newService(mapper, client);
        AgentWorkflowDefinition def = service.resolveWorkflows(List.of("flow123")).get(0);

        when(client.chat(any())).thenReturn("{\"code\":20205,\"message\":\"flow not released\"}");
        assertThat(service.runWorkflow(def, "u", new JSONObject())).contains("flow not released");

        when(client.chat(any())).thenReturn(
                "{\"code\":0,\"event_data\":{\"event_id\":\"e1\"},\"choices\":[{\"delta\":{\"content\":\"\"}}]}");
        assertThat(service.runWorkflow(def, "u", new JSONObject())).contains("Q&A node");

        when(client.chat(any())).thenThrow(new java.io.IOException("boom"));
        assertThat(service.runWorkflow(def, "u", new JSONObject())).contains("WORKFLOW_CALL_FAILED");
    }

    @Test
    void runWorkflow_invalidJsonResponse_returnsBadResponseError() throws Exception {
        WorkflowMapper mapper = mock(WorkflowMapper.class);
        when(mapper.selectList(any())).thenReturn(List.of(sampleWorkflow()));
        WorkflowChatRunClient client = mock(WorkflowChatRunClient.class);
        when(client.chat(any())).thenReturn("not json");

        AgentWorkflowRuntimeService service = newService(mapper, client);
        AgentWorkflowDefinition def = service.resolveWorkflows(List.of("flow123")).get(0);

        assertThat(service.runWorkflow(def, "u", new JSONObject())).contains("WORKFLOW_BAD_RESPONSE");
    }

    @Test
    void runWorkflow_noChoicesInResponse_returnsEmptyResponseError() throws Exception {
        WorkflowMapper mapper = mock(WorkflowMapper.class);
        when(mapper.selectList(any())).thenReturn(List.of(sampleWorkflow()));
        WorkflowChatRunClient client = mock(WorkflowChatRunClient.class);
        AgentWorkflowRuntimeService service = newService(mapper, client);
        AgentWorkflowDefinition def = service.resolveWorkflows(List.of("flow123")).get(0);

        when(client.chat(any())).thenReturn("{}");
        assertThat(service.runWorkflow(def, "u", new JSONObject())).contains("WORKFLOW_EMPTY_RESPONSE");

        when(client.chat(any())).thenReturn("{\"code\":0,\"choices\":[]}");
        assertThat(service.runWorkflow(def, "u", new JSONObject())).contains("WORKFLOW_EMPTY_RESPONSE");
    }

    @Test
    void resolveWorkflows_buildsArraySchemaForArrayStringType() {
        Workflow workflow = sampleWorkflow();
        workflow.setPublishedData(ARRAY_PROTOCOL);
        WorkflowMapper mapper = mock(WorkflowMapper.class);
        when(mapper.selectList(any())).thenReturn(List.of(workflow));

        List<AgentWorkflowDefinition> defs =
                newService(mapper, mock(WorkflowChatRunClient.class)).resolveWorkflows(List.of("flow123"));

        assertThat(defs).hasSize(1);
        JSONObject schema = JSON.parseObject(defs.get(0).getInputSchema());
        JSONObject tags = schema.getJSONObject("properties").getJSONObject("tags");
        assertThat(tags.getString("type")).isEqualTo("array");
        assertThat(tags.getJSONObject("items").getString("type")).isEqualTo("string");
    }

    @Test
    void resolveWorkflows_resolvesFunctionNameCollisionBySuffix() {
        Workflow first = sampleWorkflow();
        first.setFlowId("flow#1");
        Workflow second = sampleWorkflow();
        second.setFlowId("flow_1");
        WorkflowMapper mapper = mock(WorkflowMapper.class);
        when(mapper.selectList(any())).thenReturn(List.of(first, second));

        List<AgentWorkflowDefinition> defs =
                newService(mapper, mock(WorkflowChatRunClient.class)).resolveWorkflows(List.of("flow#1", "flow_1"));

        assertThat(defs).hasSize(2);
        assertThat(defs.get(0).getFunctionName()).isEqualTo("workflow_flow_1");
        assertThat(defs.get(1).getFunctionName()).isEqualTo("workflow_flow_1_2");
    }

    @Test
    void resolveWorkflows_truncatesLongFunctionNameToMaxLength() {
        String longFlowId = "a".repeat(80);
        Workflow workflow = sampleWorkflow();
        workflow.setFlowId(longFlowId);
        WorkflowMapper mapper = mock(WorkflowMapper.class);
        when(mapper.selectList(any())).thenReturn(List.of(workflow));

        List<AgentWorkflowDefinition> defs =
                newService(mapper, mock(WorkflowChatRunClient.class)).resolveWorkflows(List.of(longFlowId));

        assertThat(defs).hasSize(1);
        String functionName = defs.get(0).getFunctionName();
        assertThat(functionName.length()).isLessThanOrEqualTo(64);
        assertThat(functionName).startsWith("workflow_aaa");
    }
}
