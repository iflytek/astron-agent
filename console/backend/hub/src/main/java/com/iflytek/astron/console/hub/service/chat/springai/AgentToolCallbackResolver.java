package com.iflytek.astron.console.hub.service.chat.springai;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.hub.service.ManagedWebSearchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Resolves the Spring AI tool callbacks for a standalone agent. {@code web_search} and
 * {@code current_time} are built-in tools that are ALWAYS available (matching the legacy default
 * behavior where OpenAI-compatible providers always exposed them, regardless of the bot's
 * {@code openedTool}); MCP tools are added from the bot's configured MCP server URLs. All providers
 * use the managed web_search tool (decision C).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AgentToolCallbackResolver {

    private final ManagedWebSearchService managedWebSearchService;
    private final McpToolCallbackFactory mcpToolCallbackFactory;
    private final SkillToolCallbackFactory skillToolCallbackFactory;
    private final LinkToolCallbackFactory linkToolCallbackFactory;

    /**
     * @param openedTool retained for future per-tool gating; built-in tools are always included.
     * @param skills enriched skill entries; each yields read_skill_/run_skill_ tool callbacks.
     * @param tools saved tool-square plugins JSON ({@code [{"toolId":"tool@xxx",...}]}); each yields a
     *        Link tool callback executed through the core-link runtime.
     */
    public List<ToolCallback> resolve(String openedTool, String mcpServerUrls, List<JSONObject> skills,
            String tools, ChatToolContext context) throws IOException {
        List<ToolCallback> callbacks = new ArrayList<>();
        callbacks.add(new WebSearchToolCallback(managedWebSearchService, context));
        callbacks.add(new CurrentTimeToolCallback());
        callbacks.addAll(mcpToolCallbackFactory.build(parseMcpUrls(mcpServerUrls), context));
        callbacks.addAll(skillToolCallbackFactory.build(skills));
        callbacks.addAll(linkToolCallbackFactory.build(parseToolIds(tools), context));
        return callbacks;
    }

    /**
     * Extract the {@code toolId} list from the saved plugin tools JSON; tolerant of malformed input.
     */
    private List<String> parseToolIds(String tools) {
        if (StringUtils.isBlank(tools)) {
            return List.of();
        }
        List<String> toolIds = new ArrayList<>();
        try {
            JSONArray array = JSON.parseArray(tools.trim());
            for (int i = 0; i < array.size(); i++) {
                JSONObject item = array.getJSONObject(i);
                if (item == null) {
                    continue;
                }
                String toolId = item.getString("toolId");
                if (StringUtils.isNotBlank(toolId)) {
                    toolIds.add(toolId.trim());
                }
            }
        } catch (Exception e) {
            log.warn("Invalid bot tools json, ignored: {}", tools);
            return List.of();
        }
        return toolIds.stream().distinct().toList();
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
