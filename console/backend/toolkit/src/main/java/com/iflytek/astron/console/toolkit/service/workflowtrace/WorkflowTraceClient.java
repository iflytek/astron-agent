package com.iflytek.astron.console.toolkit.service.workflowtrace;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.iflytek.astron.console.toolkit.entity.core.workflowtrace.WorkflowTraceExecutionDetailDto;
import com.iflytek.astron.console.toolkit.entity.core.workflowtrace.WorkflowTraceExecutionItemDto;
import com.iflytek.astron.console.toolkit.entity.core.workflowtrace.WorkflowTraceExecutionPageDto;
import com.iflytek.astron.console.toolkit.entity.core.workflowtrace.WorkflowTraceNodeDto;
import com.iflytek.astron.console.toolkit.entity.core.workflowtrace.WorkflowTraceUsageDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkflowTraceClient {

    private static final Set<String> HIDDEN_CONFIG_KEYS = Set.of(
            "url",
            "base_url",
            "apikey",
            "apisecret",
            "appid",
            "source",
            "node_id",
            "uid");
    private static final Set<String> MODEL_CONFIG_KEYS = Set.of(
            "topK",
            "maxTokens",
            "temperature",
            "enableChatHistory",
            "message",
            "model_name",
            "systemTemplate",
            "template");

    private final WorkflowTraceEsClient workflowTraceEsClient;
    private final ObjectMapper objectMapper = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    public WorkflowTraceExecutionPageDto queryExecutions(
            String flowId,
            @Nullable String appId,
            @Nullable String chatId,
            @Nullable Long startTime,
            @Nullable Long endTime,
            Integer page,
            Integer pageSize,
            HttpHeaders inboundHeaders) {
        JsonNode result = workflowTraceEsClient.search(buildExecutionQueryBody(
                flowId,
                appId,
                chatId,
                startTime,
                endTime,
                page,
                pageSize));
        JsonNode hits = result.path("hits");

        WorkflowTraceExecutionPageDto response = new WorkflowTraceExecutionPageDto();
        response.setTotal(extractTotal(hits.path("total")));

        List<WorkflowTraceExecutionItemDto> items = new ArrayList<>();
        for (JsonNode document : hits.path("hits")) {
            items.add(buildExecutionItem(document.path("_source")));
        }
        response.setList(items);
        return response;
    }

    public WorkflowTraceExecutionDetailDto getExecutionDetail(
            String sid,
            String flowId,
            @Nullable String appId,
            HttpHeaders inboundHeaders) {
        JsonNode result = workflowTraceEsClient.search(buildExecutionDetailQueryBody(sid, flowId, appId));
        JsonNode hits = result.path("hits").path("hits");
        JsonNode source = hits.isArray() && !hits.isEmpty()
                ? hits.get(0).path("_source")
                : objectMapper.createObjectNode();

        WorkflowTraceExecutionDetailDto detail = new WorkflowTraceExecutionDetailDto();
        detail.setExecution(buildExecutionItem(source));
        Map<String, Object> executionRawStatus = extractRawStatus(source);

        List<WorkflowTraceNodeDto> nodes = new ArrayList<>();
        for (JsonNode rawNode : source.path("trace")) {
            nodes.add(buildNode(rawNode));
        }
        attachExecutionStatusToFailedNode(nodes, executionRawStatus);
        detail.setNodes(nodes);
        return detail;
    }

    private ObjectNode buildExecutionQueryBody(
            String flowId,
            @Nullable String appId,
            @Nullable String chatId,
            @Nullable Long startTime,
            @Nullable Long endTime,
            Integer page,
            Integer pageSize) {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("from", Math.max(page - 1, 0) * pageSize);
        body.put("size", pageSize);
        body.set("query", buildQuery(flowId, appId, chatId, startTime, endTime, null));

        ArrayNode sort = body.putArray("sort");
        sort.addObject().putObject("start_time").put("order", "desc");

        ArrayNode sourceFields = body.putArray("_source");
        sourceFields.add("sid");
        sourceFields.add("flow_id");
        sourceFields.add("app_id");
        sourceFields.add("chat_id");
        sourceFields.add("start_time");
        sourceFields.add("end_time");
        sourceFields.add("duration");
        sourceFields.add("usage");
        sourceFields.add("status");
        sourceFields.add("srv.workflow_name");
        sourceFields.add("srv.workflow_version");

        return body;
    }

    private ObjectNode buildExecutionDetailQueryBody(
            String sid,
            String flowId,
            @Nullable String appId) {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("size", 1);
        body.set("query", buildQuery(flowId, appId, null, null, null, sid));
        return body;
    }

    private ObjectNode buildQuery(
            String flowId,
            @Nullable String appId,
            @Nullable String chatId,
            @Nullable Long startTime,
            @Nullable Long endTime,
            @Nullable String sid) {
        ObjectNode bool = objectMapper.createObjectNode();
        ArrayNode must = bool.putArray("must");
        ArrayNode mustNot = bool.putArray("must_not");

        addTermQuery(must, "flow_id.keyword", flowId);
        addTermQuery(must, "sub.keyword", "workflow");
        if (sid != null) {
            addTermQuery(must, "sid.keyword", sid);
        }
        if (appId != null) {
            addTermQuery(must, "app_id.keyword", appId);
        }
        if (chatId != null) {
            addTermQuery(must, "chat_id.keyword", chatId);
        }
        if (startTime != null || endTime != null) {
            ObjectNode range = must.addObject().putObject("range").putObject("start_time");
            if (startTime != null) {
                range.put("gte", startTime);
            }
            if (endTime != null) {
                range.put("lte", endTime);
            }
        }

        addTermQuery(mustNot, "log_caller.keyword", "build");

        ObjectNode query = objectMapper.createObjectNode();
        query.set("bool", bool);
        return query;
    }

    private void addTermQuery(ArrayNode arrayNode, String field, String value) {
        arrayNode.addObject().putObject("term").put(field, value);
    }

    private WorkflowTraceExecutionItemDto buildExecutionItem(JsonNode source) {
        WorkflowTraceExecutionItemDto item = new WorkflowTraceExecutionItemDto();
        item.setSid(asText(source.get("sid")));
        item.setFlowId(asText(source.get("flow_id")));
        item.setFlowName(resolveFlowName(source));
        item.setStartTime(asLong(source.get("start_time")));
        item.setEndTime(asLong(source.get("end_time")));
        item.setDuration(asInt(source.get("duration")));
        item.setStatus(normalizeExecutionStatus(source));
        item.setUsage(buildUsage(source.get("usage")));
        return item;
    }

    private WorkflowTraceNodeDto buildNode(JsonNode rawNode) {
        JsonNode data = rawNode.path("data");
        Map<String, Object> rawConfig = toMap(data.get("config"));

        WorkflowTraceNodeDto node = new WorkflowTraceNodeDto();
        node.setId(asText(rawNode.get("id")));
        node.setNodeId(firstNonBlank(asText(rawNode.get("node_id")), asText(rawNode.get("func_id"))));
        node.setNodeName(firstNonBlank(asText(rawNode.get("node_name")), asText(rawNode.get("func_name"))));
        node.setNodeType(firstNonBlank(asText(rawNode.get("node_type")), asText(rawNode.get("func_type"))));
        node.setNextLogIds(asStringList(rawNode.get("next_log_ids")));
        node.setStartTime(asLong(rawNode.get("start_time")));
        node.setEndTime(asLong(rawNode.get("end_time")));
        node.setDuration(asInt(rawNode.get("duration")));
        node.setFirstFrameDuration(rawNode.hasNonNull("first_frame_duration")
                ? asInt(rawNode.get("first_frame_duration"))
                : -1);
        node.setStatus(normalizeNodeStatus(rawNode));
        node.setRawStatus(extractRawStatus(rawNode));
        node.setUsage(buildUsage(data.get("usage")));
        node.setInput(buildNodeInput(data, rawConfig));
        node.setConfig(sanitizeConfig(rawConfig));
        node.setOutput(buildNodeOutput(data, rawConfig));
        node.setLogs(asStringList(rawNode.get("logs")));
        return node;
    }

    private void attachExecutionStatusToFailedNode(
            List<WorkflowTraceNodeDto> nodes,
            Map<String, Object> executionRawStatus) {
        if (executionRawStatus.isEmpty() || !isFailedStatusPayload(executionRawStatus)) {
            return;
        }

        for (int index = nodes.size() - 1; index >= 0; index--) {
            WorkflowTraceNodeDto node = nodes.get(index);
            if (!"failed".equals(node.getStatus())) {
                continue;
            }
            if (node.getRawStatus() != null && !node.getRawStatus().isEmpty()) {
                return;
            }
            node.setRawStatus(new LinkedHashMap<>(executionRawStatus));
            return;
        }
    }

    private boolean isFailedStatusPayload(Map<String, Object> status) {
        Object codeValue = status.get("code");
        if (codeValue instanceof Number number) {
            long code = number.longValue();
            return code != 0 && code != 200;
        }
        String message = String.valueOf(status.getOrDefault("message", ""));
        String normalized = message.toLowerCase(Locale.ROOT);
        return normalized.contains("error") || normalized.contains("failed");
    }

    private WorkflowTraceUsageDto buildUsage(@Nullable JsonNode rawUsage) {
        WorkflowTraceUsageDto usage = new WorkflowTraceUsageDto();
        usage.setQuestionTokens(firstLong(rawUsage, "question_tokens", "questionTokens"));
        usage.setPromptTokens(firstLong(rawUsage, "prompt_tokens", "promptTokens"));
        usage.setCompletionTokens(firstLong(rawUsage, "completion_tokens", "completionTokens"));
        usage.setTotalTokens(firstLong(rawUsage, "total_tokens", "totalTokens"));
        return usage;
    }

    private String normalizeExecutionStatus(JsonNode source) {
        JsonNode status = source.get("status");
        if (status != null && status.isTextual()) {
            String normalized = status.asText("").toLowerCase(Locale.ROOT);
            if (isKnownStatus(normalized)) {
                return normalized;
            }
        }
        if (status != null && status.isObject()) {
            return status.path("code").asLong(0) == 0 ? "success" : "failed";
        }
        return asLong(source.get("end_time")) > 0 ? "success" : "running";
    }

    private String normalizeNodeStatus(JsonNode rawNode) {
        JsonNode status = rawNode.get("status");
        if (status != null && status.isTextual()) {
            String normalized = status.asText("").toLowerCase(Locale.ROOT);
            if (isKnownStatus(normalized)) {
                return normalized;
            }
        }
        if (status != null && status.isObject()) {
            return normalizeStatusPayload(status);
        }
        if (rawNode.has("running_status") && !rawNode.path("running_status").asBoolean(true) && !isEndNode(rawNode)) {
            return "failed";
        }
        if (asLong(rawNode.get("end_time")) > 0) {
            return hasErrorLogs(rawNode.get("logs")) ? "failed" : "success";
        }
        if (rawNode.has("running_status") && !rawNode.path("running_status").asBoolean(true)) {
            return "failed";
        }
        return "running";
    }

    private String normalizeStatusPayload(JsonNode status) {
        long code = status.path("code").asLong(0);
        if (code == 0 || code == 200) {
            return "success";
        }
        if (code > 0) {
            return "failed";
        }
        String message = status.path("message").asText("").toLowerCase(Locale.ROOT);
        if (message.contains("error") || message.contains("failed")) {
            return "failed";
        }
        return "running";
    }

    private boolean isEndNode(JsonNode rawNode) {
        String normalized = (firstNonBlank(asText(rawNode.get("node_id")), asText(rawNode.get("func_id")))
                + " "
                + firstNonBlank(asText(rawNode.get("node_type")), asText(rawNode.get("func_type"))))
                .toLowerCase(Locale.ROOT);
        return normalized.contains("node-end::")
                || normalized.contains("结束")
                || normalized.endsWith(" end");
    }

    private Map<String, Object> extractRawStatus(JsonNode rawNode) {
        JsonNode status = rawNode.get("status");
        return status != null && status.isObject() ? toMap(status) : new LinkedHashMap<>();
    }

    private Map<String, Object> sanitizeConfig(Map<String, Object> config) {
        Map<String, Object> sanitized = new LinkedHashMap<>();
        if (config.containsKey("model_name")) {
            for (String key : MODEL_CONFIG_KEYS) {
                if (config.containsKey(key)) {
                    sanitized.put(key, config.get(key));
                }
            }
            return sanitized;
        }
        for (Map.Entry<String, Object> entry : config.entrySet()) {
            if (!HIDDEN_CONFIG_KEYS.contains(entry.getKey().toLowerCase(Locale.ROOT))) {
                sanitized.put(entry.getKey(), entry.getValue());
            }
        }
        return sanitized;
    }

    private Map<String, Object> buildNodeInput(JsonNode data, Map<String, Object> config) {
        Map<String, Object> nodeInput = toMap(data.get("input"));
        mergeTraceVariables(nodeInput, data.get("input_vars"));
        if (!nodeInput.isEmpty()) {
            return nodeInput;
        }

        Object requestBody = parseStructuredValue(config.get("req_body"));
        if (requestBody instanceof Map<?, ?> requestBodyMap) {
            return castMap(requestBodyMap);
        }
        if (requestBody instanceof List<?> requestBodyList) {
            Map<String, Object> input = new LinkedHashMap<>();
            input.put("requestBody", requestBodyList);
            return input;
        }

        Map<String, Object> fallback = new LinkedHashMap<>();
        Object requestHeaders = parseStructuredValue(config.get("req_headers"));
        if (hasMeaningfulValue(requestBody)) {
            fallback.put("requestBody", requestBody);
        }
        if (hasMeaningfulValue(requestHeaders)) {
            fallback.put("requestHeaders", requestHeaders);
        }
        Object message = parseStructuredValue(config.get("message"));
        if (hasMeaningfulValue(message)) {
            fallback.put("message", message);
        }
        return fallback;
    }

    private Map<String, Object> buildNodeOutput(JsonNode data, Map<String, Object> config) {
        Map<String, Object> nodeOutput = toMap(data.get("output"));
        mergeTraceVariables(nodeOutput, data.get("output_vars"));
        if (!nodeOutput.isEmpty()) {
            return nodeOutput;
        }

        Object responseFormat = parseStructuredValue(config.get("respFormat"));
        if (hasMeaningfulValue(responseFormat)) {
            Map<String, Object> output = new LinkedHashMap<>();
            output.put("responseFormat", responseFormat);
            return output;
        }
        return new LinkedHashMap<>();
    }

    private void mergeTraceVariables(Map<String, Object> target, @Nullable JsonNode variables) {
        if (variables == null || !variables.isArray()) {
            return;
        }
        for (JsonNode variable : variables) {
            if (variable.isTextual()) {
                variable = parseJsonNode(variable.asText(""));
            }
            String name = asText(variable.get("name"));
            if (name.isBlank()) {
                continue;
            }
            Object value = variable.has("value")
                    ? objectMapper.convertValue(variable.get("value"), Object.class)
                    : null;
            target.put(name, parseStructuredValue(value));
        }
    }

    private JsonNode parseJsonNode(String value) {
        if (value == null || value.isBlank()) {
            return objectMapper.createObjectNode();
        }
        try {
            return objectMapper.readTree(value);
        } catch (JsonProcessingException e) {
            return objectMapper.createObjectNode();
        }
    }

    private Object parseStructuredValue(@Nullable Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Map<?, ?> || value instanceof List<?> || value instanceof Number || value instanceof Boolean) {
            return value;
        }
        if (!(value instanceof String rawString)) {
            return value;
        }
        String raw = rawString.trim();
        if (raw.isEmpty()) {
            return null;
        }
        char firstChar = raw.charAt(0);
        if (firstChar != '{' && firstChar != '[' && firstChar != '"') {
            return value;
        }
        try {
            return objectMapper.readValue(raw, Object.class);
        } catch (JsonProcessingException e) {
            return value;
        }
    }

    private long extractTotal(JsonNode total) {
        if (total == null || total.isMissingNode() || total.isNull()) {
            return 0L;
        }
        return total.isObject() ? total.path("value").asLong(0L) : total.asLong(0L);
    }

    private boolean hasErrorLogs(@Nullable JsonNode logs) {
        if (logs == null || !logs.isArray()) {
            return false;
        }
        for (JsonNode logNode : logs) {
            if (logNode.isTextual() && logNode.asText().contains("\"level\":\"ERROR\"")) {
                return true;
            }
        }
        return false;
    }

    private long firstLong(@Nullable JsonNode node, String primary, String alternate) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return 0L;
        }
        if (node.has(primary)) {
            return asLong(node.get(primary));
        }
        if (node.has(alternate)) {
            return asLong(node.get(alternate));
        }
        return 0L;
    }

    private long asLong(@Nullable JsonNode node) {
        return node == null || node.isMissingNode() || node.isNull() ? 0L : node.asLong(0L);
    }

    private int asInt(@Nullable JsonNode node) {
        return (int) asLong(node);
    }

    private String asText(@Nullable JsonNode node) {
        return node == null || node.isMissingNode() || node.isNull() ? "" : node.asText("");
    }

    private String resolveFlowName(JsonNode source) {
        JsonNode srv = source.path("srv");
        return firstNonBlank(
                asText(srv.get("workflow_name")),
                asText(source.get("flow_name")),
                asText(source.get("flow_id")));
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return "";
    }

    private boolean isKnownStatus(String value) {
        return "success".equals(value) || "running".equals(value) || "failed".equals(value);
    }

    private List<String> asStringList(@Nullable JsonNode node) {
        List<String> values = new ArrayList<>();
        if (node == null || !node.isArray()) {
            return values;
        }
        for (JsonNode item : node) {
            values.add(item.asText(""));
        }
        return values;
    }

    private Map<String, Object> toMap(@Nullable JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull() || !node.isObject()) {
            return new LinkedHashMap<>();
        }
        return objectMapper.convertValue(node, new TypeReference<LinkedHashMap<String, Object>>() {});
    }

    private Map<String, Object> castMap(Map<?, ?> source) {
        return objectMapper.convertValue(source, new TypeReference<LinkedHashMap<String, Object>>() {});
    }

    private boolean hasMeaningfulValue(@Nullable Object value) {
        if (value == null) {
            return false;
        }
        if (value instanceof String stringValue) {
            return !stringValue.isBlank();
        }
        if (value instanceof Map<?, ?> mapValue) {
            return !mapValue.isEmpty();
        }
        return true;
    }
}
