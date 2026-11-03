package com.iflytek.astron.console.toolkit.service.extra;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.toolkit.config.properties.ApiUrl;
import com.iflytek.astron.console.toolkit.entity.core.workflow.FlowProtocol;
import com.iflytek.astron.console.toolkit.util.OkHttpUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.slf4j.LoggerFactory;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mockStatic;

class CoreSystemServiceComparisonTest {

    private static final String INTERNAL_KEY =
            "0123456789abcdef0123456789abcdef";

    private CoreSystemService coreSystemService;

    @BeforeEach
    void setUp() {
        coreSystemService = new CoreSystemService();
        ApiUrl apiUrl = new ApiUrl();
        apiUrl.setWorkflow("http://core");
        apiUrl.setTenantId("tenant");
        ReflectionTestUtils.setField(coreSystemService, "apiUrl", apiUrl);
        ReflectionTestUtils.setField(
                coreSystemService, "workflowInternalApiKey", INTERNAL_KEY);
    }

    @Test
    void getComparisonReturnsExactProtocolData() {
        try (MockedStatic<OkHttpUtil> okHttp = mockStatic(OkHttpUtil.class)) {
            okHttp.when(() -> OkHttpUtil.post(
                    "http://core/workflow/v1/protocol/compare/get",
                    Map.of("X-Workflow-Internal-Key", INTERNAL_KEY),
                    "{\"flow_id\":\"flow-1\",\"version\":\"cmp-1\"}"))
                    .thenReturn("{\"code\":0,\"message\":\"success\","
                            + "\"data\":{\"data\":{\"nodes\":[],\"edges\":[]}}}");

            JSONObject snapshot = coreSystemService.getComparison("flow-1", "cmp-1");

            assertThat(snapshot.getJSONObject("data").getJSONArray("nodes")).isEmpty();
        }
    }

    @Test
    void getComparisonFailsClosedForMissingOrInvalidData() {
        try (MockedStatic<OkHttpUtil> okHttp = mockStatic(OkHttpUtil.class)) {
            okHttp.when(() -> OkHttpUtil.post(
                    "http://core/workflow/v1/protocol/compare/get",
                    Map.of("X-Workflow-Internal-Key", INTERNAL_KEY),
                    "{\"flow_id\":\"flow-1\",\"version\":\"missing\"}"))
                    .thenReturn("{\"code\":1001,\"message\":\"not found\"}");

            assertThatThrownBy(() -> coreSystemService.getComparison("flow-1", "missing"))
                    .isInstanceOf(BusinessException.class);
        }
    }

    @Test
    void addComparisonsLogDoesNotExposeProtocolBody() {
        String sentinel = "comparison-secret-that-must-not-be-logged";
        FlowProtocol protocol = new FlowProtocol();
        protocol.setDescription(sentinel);
        Logger logger = (Logger) LoggerFactory.getLogger(CoreSystemService.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try (MockedStatic<OkHttpUtil> okHttp = mockStatic(OkHttpUtil.class)) {
            okHttp.when(() -> OkHttpUtil.post(
                    org.mockito.ArgumentMatchers.anyString(),
                    anyMap(),
                    org.mockito.ArgumentMatchers.anyString()))
                    .thenReturn("{\"code\":0,\"message\":\""
                            + sentinel
                            + "\",\"data\":{\"echo\":\""
                            + sentinel
                            + "\"}}");

            coreSystemService.addComparisons(protocol, "flow-1", "cmp-1");
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }

        assertThat(appender.list)
                .extracting(ILoggingEvent::getFormattedMessage)
                .anySatisfy(message -> assertThat(message)
                        .contains("flowId = flow-1")
                        .contains("bodyBytes = ")
                        .doesNotContain(sentinel))
                .noneSatisfy(message -> assertThat(message).contains(sentinel));
    }

    @Test
    void deleteComparisonLogsDoNotExposeResponsePayloads() {
        String sentinel = "comparison-secret-and-signed-url-must-not-leak";
        Logger logger = (Logger) LoggerFactory.getLogger(CoreSystemService.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try (MockedStatic<OkHttpUtil> okHttp = mockStatic(OkHttpUtil.class)) {
            okHttp.when(() -> OkHttpUtil.delete(anyString(), anyMap(), anyString()))
                    .thenReturn("{\"code\":0,\"message\":\"" + sentinel + "\",\"data\":{}}");

            coreSystemService.deleteComparisons("flow-1", "cmp-1");
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }

        assertThat(appender.list)
                .extracting(ILoggingEvent::getFormattedMessage)
                .anySatisfy(message -> assertThat(message)
                        .contains("workflow delete comparisons", "bodyBytes = "))
                .noneSatisfy(message -> assertThat(message).contains(sentinel));
    }

}
