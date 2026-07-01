package com.iflytek.astron.console.hub.service.agentmemory.provider;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
public class Mem0MemoryProvider implements AgentMemoryProvider {

    public static final String PROVIDER = "MEM0";
    private static final String DEFAULT_BASE_URL = "https://api.mem0.ai";
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(6);

    private final String baseUrl;
    private final HttpClient httpClient;

    public Mem0MemoryProvider() {
        this(DEFAULT_BASE_URL);
    }

    Mem0MemoryProvider(String baseUrl) {
        this(baseUrl, HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(3))
                .build());
    }

    Mem0MemoryProvider(String baseUrl, HttpClient httpClient) {
        this.baseUrl = StringUtils.removeEnd(StringUtils.defaultIfBlank(baseUrl, DEFAULT_BASE_URL), "/");
        this.httpClient = httpClient;
    }

    @Override
    public String provider() {
        return PROVIDER;
    }

    @Override
    public List<AgentMemorySearchResult> search(
            AgentMemoryProviderContext context, String query, int topK, double minScore) {
        if (StringUtils.isBlank(query)) {
            return List.of();
        }
        JSONObject payload = new JSONObject()
                .fluentPut("query", query)
                .fluentPut("filters", scopeFilters(context))
                .fluentPut("top_k", topK)
                .fluentPut("threshold", minScore);
        String responseBody = post(context.apiKey(), "/v3/memories/search/", payload);
        return parseItems(responseBody).stream()
                .map(item -> new AgentMemorySearchResult(
                        item.id(), item.memory(), item.score(), item.metadata()))
                .filter(item -> item.score() == null || item.score() >= minScore)
                .limit(topK)
                .toList();
    }

    @Override
    public void addTurn(AgentMemoryProviderContext context, AgentMemoryTurn turn) {
        if (StringUtils.isBlank(turn.userText()) || StringUtils.isBlank(turn.assistantText())) {
            return;
        }
        List<Map<String, String>> messages = List.of(
                Map.of("role", "user", "content", turn.userText()),
                Map.of("role", "assistant", "content", turn.assistantText()));
        Map<String, Object> metadata = new LinkedHashMap<>(context.metadata());
        metadata.putAll(turn.metadata());
        metadata.put("source", turn.source());

        JSONObject payload = new JSONObject()
                .fluentPut("messages", messages)
                .fluentPut("user_id", context.userId())
                .fluentPut("app_id", context.agentId())
                .fluentPut("run_id", turn.runId())
                .fluentPut("infer", true)
                .fluentPut("metadata", metadata);
        post(context.apiKey(), "/v3/memories/add/", payload);
    }

    @Override
    public List<AgentMemoryItem> list(AgentMemoryProviderContext context, int page, int pageSize) {
        JSONObject payload = new JSONObject()
                .fluentPut("filters", scopeFilters(context));
        String path = "/v3/memories/?page=" + Math.max(1, page)
                + "&page_size=" + Math.max(1, pageSize);
        String responseBody = post(context.apiKey(), path, payload);
        return parseItems(responseBody);
    }

    @Override
    public void delete(AgentMemoryProviderContext context, String memoryId) {
        if (StringUtils.isBlank(memoryId)) {
            return;
        }
        delete(context.apiKey(), "/v1/memories/" + urlEncode(memoryId) + "/");
    }

    @Override
    public void clear(AgentMemoryProviderContext context) {
        String query = "?user_id=" + urlEncode(context.userId())
                + "&app_id=" + urlEncode(context.agentId());
        delete(context.apiKey(), "/v1/memories/" + query);
    }

    private JSONObject scopeFilters(AgentMemoryProviderContext context) {
        return new JSONObject()
                .fluentPut("user_id", context.userId())
                .fluentPut("app_id", context.agentId());
    }

    private String post(String apiKey, String path, JSONObject payload) {
        HttpRequest request = baseRequest(apiKey, path)
                .POST(HttpRequest.BodyPublishers.ofString(payload.toJSONString(), StandardCharsets.UTF_8))
                .build();
        return send(request);
    }

    private void delete(String apiKey, String path) {
        HttpRequest request = baseRequest(apiKey, path).DELETE().build();
        send(request);
    }

    private HttpRequest.Builder baseRequest(String apiKey, String path) {
        return HttpRequest.newBuilder(URI.create(baseUrl + path))
                .timeout(REQUEST_TIMEOUT)
                .header("Authorization", "Token " + apiKey)
                .header("Content-Type", "application/json; charset=UTF-8")
                .header("Accept", "application/json");
    }

    private String send(HttpRequest request) {
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            int statusCode = response.statusCode();
            if (statusCode >= 200 && statusCode < 300) {
                return StringUtils.defaultString(response.body());
            }
            throw new IllegalStateException("Mem0 request failed with HTTP " + statusCode
                    + ": " + StringUtils.abbreviate(StringUtils.defaultString(response.body()), 300));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Mem0 request interrupted", e);
        } catch (java.io.IOException e) {
            log.warn("Mem0 provider request failed: {}", e.getMessage());
            throw new IllegalStateException("Mem0 request failed", e);
        }
    }

    private List<AgentMemoryItem> parseItems(String responseBody) {
        if (StringUtils.isBlank(responseBody)) {
            return List.of();
        }
        JSONArray array = extractArray(responseBody);
        if (array == null || array.isEmpty()) {
            return List.of();
        }
        List<AgentMemoryItem> items = new ArrayList<>();
        for (int i = 0; i < array.size(); i++) {
            JSONObject item = array.getJSONObject(i);
            if (item == null) {
                continue;
            }
            String memory = firstString(item, "memory", "text", "content");
            if (StringUtils.isBlank(memory)) {
                continue;
            }
            items.add(new AgentMemoryItem(
                    firstString(item, "id", "memory_id"),
                    memory,
                    firstDouble(item, "score", "relevance", "similarity"),
                    toMap(item.getJSONObject("metadata")),
                    firstString(item, "created_at", "createdAt", "create_time"),
                    firstString(item, "updated_at", "updatedAt", "update_time")));
        }
        return items;
    }

    private JSONArray extractArray(String responseBody) {
        Object parsed = JSON.parse(responseBody);
        if (parsed instanceof JSONArray array) {
            return array;
        }
        if (!(parsed instanceof JSONObject object)) {
            return null;
        }
        for (String key : List.of("results", "memories", "data")) {
            Object value = object.get(key);
            if (value instanceof JSONArray array) {
                return array;
            }
            if (value instanceof JSONObject nested) {
                for (String nestedKey : List.of("results", "memories", "data")) {
                    Object nestedValue = nested.get(nestedKey);
                    if (nestedValue instanceof JSONArray nestedArray) {
                        return nestedArray;
                    }
                }
            }
        }
        return null;
    }

    private String firstString(JSONObject object, String... keys) {
        for (String key : keys) {
            String value = object.getString(key);
            if (StringUtils.isNotBlank(value)) {
                return value;
            }
        }
        return null;
    }

    private Double firstDouble(JSONObject object, String... keys) {
        for (String key : keys) {
            Double value = object.getDouble(key);
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private Map<String, Object> toMap(JSONObject object) {
        if (object == null || object.isEmpty()) {
            return Map.of();
        }
        return new LinkedHashMap<>(object);
    }

    private String urlEncode(String value) {
        return URLEncoder.encode(StringUtils.defaultString(value), StandardCharsets.UTF_8);
    }
}
