package com.iflytek.astron.console.toolkit.entity.table.workflow;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import com.iflytek.astron.console.commons.entity.workflow.Workflow;

class WorkflowProtocolEntitySanitizationTest {

    @Test
    void allPersistedDraftTemporaryAndPublishedProtocolsRemoveOnlyModelSecrets() {
        String protocol = """
                {"nodes":[
                  {"id":"spark-llm::1","data":{"nodeParam":{"modelId":42,"apiKey":"model-secret","apiSecret":"model-sk"}}},
                  {"id":"agent::2","data":{"nodeParam":{"modelId":42,"api_key":"agent-secret","plugin":{"apiKey":"nested-tool-key"},"modelConfig":{"apiKey":"nested-secret"}}}},
                  {"id":"database::3","data":{"nodeParam":{"apiKey":"database-key","apiSecret":"database-sk"}}},
                  {"id":"plugin::4","data":{"nodeParam":{"apiKey":"tool-key"}}}
                ]}
                """;
        Workflow workflow = new Workflow();
        WorkflowVersion version = new WorkflowVersion();
        FlowProtocolTemp temp = new FlowProtocolTemp();
        workflow.setData(protocol);
        workflow.setPublishedData(protocol);
        version.setData(protocol);
        version.setSysData(protocol);
        temp.setBizProtocol(protocol);
        temp.setSysProtocol(protocol);
        for (String stored : java.util.List.of(workflow.getData(), workflow.getPublishedData(),
                version.getData(), version.getSysData(), temp.getBizProtocol(), temp.getSysProtocol())) {
            assertThat(stored)
                    .contains("modelId", "42", "database-key", "database-sk", "tool-key", "nested-tool-key")
                    .doesNotContain("model-secret", "model-sk", "agent-secret", "nested-secret");
        }
    }

    private static final String BUSINESS_PROTOCOL =
            "{\"node\":{\"sandbox\":{\"apiKey\":\"secret\"},\"apiKey\":\"model-key\"}}";
    private static final String SYSTEM_PROTOCOL =
            "{\"node\":{\"sandbox\":{\"enabled\":true,\"uid\":\"user-1\",\"apiKey\":\"secret\"}}}";

    @Test
    void sanitizesWorkflowVersionBusinessAndSystemProtocols() {
        WorkflowVersion version = new WorkflowVersion();

        version.setData(BUSINESS_PROTOCOL);
        version.setSysData(SYSTEM_PROTOCOL);

        assertThat(version.getData())
                .contains("model-key")
                .doesNotContain("sandbox", "secret");
        assertThat(version.getSysData())
                .contains("sandbox", "enabled", "user-1")
                .doesNotContain("apiKey", "secret");
    }

    @Test
    void sanitizesTemporaryAndComparisonProtocols() {
        FlowProtocolTemp temp = new FlowProtocolTemp();
        WorkflowComparison comparison = new WorkflowComparison();

        temp.setBizProtocol(BUSINESS_PROTOCOL);
        temp.setSysProtocol(SYSTEM_PROTOCOL);
        comparison.setData(BUSINESS_PROTOCOL);

        assertThat(temp.getBizProtocol()).doesNotContain("sandbox", "secret");
        assertThat(temp.getSysProtocol())
                .contains("sandbox", "user-1")
                .doesNotContain("apiKey", "secret");
        assertThat(comparison.getData()).doesNotContain("sandbox", "secret");
    }

    @Test
    void invalidDatabaseValuesCannotBeReturnedThroughEntities() {
        String invalid = "{\"sandbox\":{\"apiKey\":\"must-not-leak\"}";
        WorkflowVersion version = new WorkflowVersion();
        FlowProtocolTemp temp = new FlowProtocolTemp();
        WorkflowComparison comparison = new WorkflowComparison();

        version.setData(invalid);
        version.setSysData(invalid);
        temp.setBizProtocol(invalid);
        temp.setSysProtocol(invalid);
        comparison.setData(invalid);

        assertThat(version.getData()).isNull();
        assertThat(version.getSysData()).isNull();
        assertThat(temp.getBizProtocol()).isNull();
        assertThat(temp.getSysProtocol()).isNull();
        assertThat(comparison.getData()).isNull();
    }
}
