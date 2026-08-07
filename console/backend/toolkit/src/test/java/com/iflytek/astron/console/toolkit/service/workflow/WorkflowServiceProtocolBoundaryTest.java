package com.iflytek.astron.console.toolkit.service.workflow;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.node.BizInputOutput;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.node.BizSchema;
import com.iflytek.astron.console.toolkit.entity.core.workflow.node.InputOutput;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class WorkflowServiceProtocolBoundaryTest {

    private WorkflowService workflowService;

    @BeforeEach
    void setUp() {
        workflowService = new WorkflowService();
    }

    @Test
    void outputCopyDefaultsMissingRequiredToFalseAndPreservesTrue() {
        List<InputOutput> outputs = new ArrayList<>();

        ReflectionTestUtils.invokeMethod(
                workflowService,
                "outputCopy",
                List.of(output("optional", null), output("required", Boolean.TRUE)),
                outputs);

        assertThat(outputs).extracting(InputOutput::getRequired).containsExactly(Boolean.FALSE, Boolean.TRUE);

        JSONArray serializedOutputs = JSON.parseArray(JSON.toJSONString(outputs));
        assertThat(serializedOutputs.getJSONObject(0).containsKey("required")).isTrue();
        assertThat(serializedOutputs.getJSONObject(0).getBoolean("required")).isFalse();
        assertThat(serializedOutputs.getJSONObject(1).getBoolean("required")).isTrue();
    }

    @Test
    void protocolUpdateLogContainsSafeSummaryWithoutProtocolBody() {
        String url = "http://workflow/workflow/v1/protocol/update/flow-1";
        String flowId = "flow-1";
        String body = "{\"modelApiKey\":\"secret-api-key\",\"prompt\":\"敏感提示词\"}";
        JSONObject protocolJson = new JSONObject().fluentPut(
                "data",
                new JSONObject()
                        .fluentPut("nodes", new JSONArray(List.of(new JSONObject(), new JSONObject())))
                        .fluentPut("edges", new JSONArray(List.of(new JSONObject()))));

        Logger logger = (Logger) LoggerFactory.getLogger(WorkflowService.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            ReflectionTestUtils.invokeMethod(
                    workflowService, "logWorkflowProtocolUpdate", url, flowId, body, protocolJson);
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }

        assertThat(appender.list).hasSize(1);
        String message = appender.list.getFirst().getFormattedMessage();
        assertThat(message)
                .contains("url = " + url)
                .contains("flowId = " + flowId)
                .contains("bodyBytes = " + body.getBytes(StandardCharsets.UTF_8).length)
                .contains("nodeCount = 2")
                .contains("edgeCount = 1")
                .doesNotContain(body)
                .doesNotContain("secret-api-key")
                .doesNotContain("敏感提示词");
    }

    private static BizInputOutput output(String name, Boolean required) {
        BizSchema schema = new BizSchema();
        schema.setType("string");

        BizInputOutput output = new BizInputOutput();
        output.setName(name);
        output.setRequired(required);
        output.setSchema(schema);
        return output;
    }
}
