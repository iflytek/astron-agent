package com.iflytek.astron.console.hub.service.chat.impl;

import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.dto.llm.SparkChatRequest;
import org.apache.commons.lang3.StringUtils;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Shared tool orchestration for bot debug and formal chat.
 *
 * Current provider capability matrix for enabled web search: - spark: native support via
 * SparkChatRequest.enableWebSearch - google: native support via Gemini tools.google_search -
 * anthropic: native support via Anthropic web_search tool + beta header - other OpenAI-compatible
 * providers: model-driven function tool calling via ifly_search
 */
final class ProviderToolOrchestrator {

    static final String TOOL_IFLY_SEARCH = "ifly_search";
    static final String OPENAI_SEARCH_TOOL_NAME = "ifly_search";
    static final String PROVIDER_SPARK = "spark";
    static final String PROVIDER_GOOGLE = "google";
    static final String PROVIDER_ANTHROPIC = "anthropic";

    private ProviderToolOrchestrator() {}

    static ToolExecutionPlan resolve(String provider, String openedTool) {
        Set<String> enabledTools = parseEnabledTools(openedTool);
        boolean webSearchEnabled = enabledTools.contains(TOOL_IFLY_SEARCH);
        String normalizedProvider = normalizeProvider(provider);

        if (!webSearchEnabled) {
            return new ToolExecutionPlan(normalizedProvider, enabledTools, WebSearchMode.DISABLED);
        }

        return switch (normalizedProvider) {
            case PROVIDER_SPARK -> new ToolExecutionPlan(normalizedProvider, enabledTools, WebSearchMode.SPARK_NATIVE);
            case PROVIDER_GOOGLE -> new ToolExecutionPlan(normalizedProvider, enabledTools, WebSearchMode.GOOGLE_NATIVE);
            case PROVIDER_ANTHROPIC -> new ToolExecutionPlan(normalizedProvider, enabledTools, WebSearchMode.ANTHROPIC_NATIVE);
            default -> new ToolExecutionPlan(normalizedProvider, enabledTools, WebSearchMode.OPENAI_FUNCTION);
        };
    }

    static void applyToSparkRequest(SparkChatRequest request, ToolExecutionPlan plan) {
        request.setEnableWebSearch(plan.webSearchMode() == WebSearchMode.SPARK_NATIVE);
    }

    static void applyToPromptRequest(JSONObject request, ToolExecutionPlan plan) {
        switch (plan.webSearchMode()) {
            case DISABLED -> {
                return;
            }
            case GOOGLE_NATIVE -> request.put("tools", buildGoogleTools());
            case ANTHROPIC_NATIVE -> {
                request.put("tools", buildAnthropicTools());
                request.put("anthropicBeta", "web-search-2025-03-05");
            }
            case OPENAI_FUNCTION -> {
                request.put("managedWebSearch", true);
                request.put("tools", buildOpenAiCompatibleSearchTools());
            }
            case SPARK_NATIVE -> {
            }
            default -> {
            }
        }
    }

    static String normalizeProvider(String provider) {
        if (StringUtils.isBlank(provider)) {
            return "openai";
        }
        return provider.trim().toLowerCase(Locale.ROOT);
    }

    private static Set<String> parseEnabledTools(String openedTool) {
        if (StringUtils.isBlank(openedTool)) {
            return Set.of();
        }
        List<String> tools = Arrays.stream(openedTool.split(","))
                .map(String::trim)
                .filter(StringUtils::isNotBlank)
                .toList();
        return new LinkedHashSet<>(tools);
    }

    private static JSONArray buildGoogleTools() {
        JSONArray tools = new JSONArray();
        tools.add(new JSONObject().fluentPut("google_search", new JSONObject()));
        return tools;
    }

    private static JSONArray buildAnthropicTools() {
        JSONArray tools = new JSONArray();
        tools.add(new JSONObject()
                .fluentPut("type", "web_search_20250305")
                .fluentPut("name", "web_search")
                .fluentPut("max_uses", 5));
        return tools;
    }

    private static JSONArray buildOpenAiCompatibleSearchTools() {
        JSONArray tools = new JSONArray();
        JSONObject function = new JSONObject();
        function.put("name", OPENAI_SEARCH_TOOL_NAME);
        function.put("description", "Search the live web for up-to-date information when the user asks about current events, recent facts, or anything that requires real-time information.");

        JSONObject parameters = new JSONObject();
        parameters.put("type", "object");
        JSONObject properties = new JSONObject();
        properties.put("query", new JSONObject()
                .fluentPut("type", "string")
                .fluentPut("description", "A precise web search query based on the user's request."));
        parameters.put("properties", properties);
        JSONArray required = new JSONArray();
        required.add("query");
        parameters.put("required", required);
        parameters.put("additionalProperties", false);

        function.put("parameters", parameters);

        tools.add(new JSONObject()
                .fluentPut("type", "function")
                .fluentPut("function", function));
        return tools;
    }

    record ToolExecutionPlan(String provider, Set<String> enabledTools, WebSearchMode webSearchMode) {}

    enum WebSearchMode {
        DISABLED,
        SPARK_NATIVE,
        GOOGLE_NATIVE,
        ANTHROPIC_NATIVE,
        OPENAI_FUNCTION
    }
}
