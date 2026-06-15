package com.iflytek.astron.console.hub.service.chat.springai;

import com.alibaba.fastjson2.JSON;
import com.iflytek.astron.console.hub.service.ManagedWebSearchService;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Resolves the set of Spring AI tool callbacks for a bot from its {@code openedTool} CSV and MCP
 * server URLs. Replaces the tool-selection role of the removed ProviderToolOrchestrator. All
 * providers use the managed web_search tool (decision C); no provider-native search.
 */
@Service
@RequiredArgsConstructor
public class AgentToolCallbackResolver {

    private static final String TOOL_WEB_SEARCH = "web_search";
    private static final String TOOL_IFLY_SEARCH_LEGACY = "ifly_search";
    private static final String TOOL_CURRENT_TIME = "current_time";

    private final ManagedWebSearchService managedWebSearchService;
    private final McpToolCallbackFactory mcpToolCallbackFactory;

    public List<ToolCallback> resolve(String openedTool, String mcpServerUrls, ChatToolContext context)
            throws IOException {
        Set<String> enabled = parseEnabledTools(openedTool);
        List<ToolCallback> callbacks = new ArrayList<>();
        if (enabled.contains(TOOL_WEB_SEARCH) || enabled.contains(TOOL_IFLY_SEARCH_LEGACY)) {
            callbacks.add(new WebSearchToolCallback(managedWebSearchService, context));
        }
        if (enabled.contains(TOOL_CURRENT_TIME)) {
            callbacks.add(new CurrentTimeToolCallback());
        }
        callbacks.addAll(mcpToolCallbackFactory.build(parseMcpUrls(mcpServerUrls), context));
        return callbacks;
    }

    private Set<String> parseEnabledTools(String openedTool) {
        if (StringUtils.isBlank(openedTool)) {
            return Set.of();
        }
        return Arrays.stream(openedTool.split(","))
                .map(String::trim)
                .filter(StringUtils::isNotBlank)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private List<String> parseMcpUrls(String mcpServerUrls) {
        if (StringUtils.isBlank(mcpServerUrls)) {
            return List.of();
        }
        String trimmed = mcpServerUrls.trim();
        if (trimmed.startsWith("[")) {
            return JSON.parseArray(trimmed, String.class)
                    .stream()
                    .filter(StringUtils::isNotBlank)
                    .map(String::trim)
                    .distinct()
                    .toList();
        }
        return Arrays.stream(trimmed.split(","))
                .map(String::trim)
                .filter(StringUtils::isNotBlank)
                .distinct()
                .toList();
    }
}
