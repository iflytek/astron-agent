package com.iflytek.astron.console.hub.service.chat.springai;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.hub.service.ManagedWebSearchService;
import com.iflytek.astron.console.hub.service.ManagedWebSearchService.SearchAugmentation;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.definition.ToolDefinition;

/**
 * Spring AI tool wrapping the managed web search (Spark X1 deep web search). Returns the
 * summarized, citation-tagged answer as the tool result and records the search trace into
 * {@link ChatToolContext}.
 */
@Slf4j
public class WebSearchToolCallback implements ToolCallback {

    private static final String INPUT_SCHEMA = """
            {"type":"object","properties":{"query":{"type":"string",\
            "description":"A precise web search query based on the user's request."}},"required":["query"]}""";

    private final ManagedWebSearchService managedWebSearchService;
    private final ChatToolContext context;

    public WebSearchToolCallback(ManagedWebSearchService managedWebSearchService, ChatToolContext context) {
        this.managedWebSearchService = managedWebSearchService;
        this.context = context;
    }

    @Override
    public ToolDefinition getToolDefinition() {
        return ToolDefinition.builder()
                .name("web_search")
                .description("Search the live web for up-to-date external information (recent events, prices, "
                        + "policies, schedules, releases, rankings, status).")
                .inputSchema(INPUT_SCHEMA)
                .build();
    }

    @Override
    public String call(String toolInput) {
        String query = null;
        if (StringUtils.isNotBlank(toolInput)) {
            try {
                JSONObject args = JSON.parseObject(toolInput);
                if (args != null) {
                    query = args.getString("query");
                }
            } catch (Exception e) {
                log.warn("Failed to parse web_search tool input as JSON: {}", toolInput);
            }
        }
        if (StringUtils.isBlank(query)) {
            return "No query provided.";
        }
        log.info("web_search tool invoked, userId={}, query={}", context.getUserId(), query);

        SearchAugmentation result = managedWebSearchService.search(query, context.getUserId());
        if (result.failed()) {
            return "Web search failed: " + StringUtils.defaultString(result.errorMessage());
        }
        JSONArray toolCalls;
        try {
            toolCalls = JSON.parseArray(StringUtils.defaultIfBlank(result.traceJson(), "[]"));
        } catch (Exception e) {
            log.warn("Failed to parse web search trace JSON, skipping trace");
            toolCalls = null;
        }
        if (toolCalls != null) {
            for (int i = 0; i < toolCalls.size(); i++) {
                context.addTrace(toolCalls.getJSONObject(i));
            }
        }
        return StringUtils.defaultIfBlank(result.summary(), "No results.");
    }
}
