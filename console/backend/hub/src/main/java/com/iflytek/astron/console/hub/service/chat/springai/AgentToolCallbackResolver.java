package com.iflytek.astron.console.hub.service.chat.springai;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.hub.service.ManagedWebSearchService;
import lombok.RequiredArgsConstructor;
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
@Service
@RequiredArgsConstructor
public class AgentToolCallbackResolver {

    private final ManagedWebSearchService managedWebSearchService;
    private final McpToolCallbackFactory mcpToolCallbackFactory;
    private final SkillToolCallbackFactory skillToolCallbackFactory;

    /**
     * @param openedTool retained for future per-tool gating; built-in tools are always included.
     * @param skills enriched skill entries; each yields read_skill_/run_skill_ tool callbacks.
     */
    public List<ToolCallback> resolve(String openedTool, String mcpServerUrls, List<JSONObject> skills,
            ChatToolContext context) throws IOException {
        List<ToolCallback> callbacks = new ArrayList<>();
        callbacks.add(new WebSearchToolCallback(managedWebSearchService, context));
        callbacks.add(new CurrentTimeToolCallback());
        callbacks.addAll(mcpToolCallbackFactory.build(parseMcpUrls(mcpServerUrls), context));
        callbacks.addAll(skillToolCallbackFactory.build(skills));
        return callbacks;
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
