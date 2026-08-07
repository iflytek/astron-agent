package com.iflytek.astron.console.hub.service;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.toolkit.config.properties.ApiUrl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.zip.CRC32;

@Slf4j
@Service
@RequiredArgsConstructor
public class McpRuntimeToolService {

    private static final String MCP_TOOL_LIST_PATH = "/api/v1/mcp/tool_list";
    private static final String MCP_CALL_TOOL_PATH = "/api/v1/mcp/call_tool";
    private static final int MAX_FUNCTION_NAME_LENGTH = 64;
    private static final String MCP_FUNCTION_PREFIX = "mcp_";
    private static final Set<String> RESERVED_FUNCTION_NAMES = Set.of("web_search", "ifly_search", "current_time");
    private static final MediaType JSON_MEDIA_TYPE = MediaType.get("application/json; charset=utf-8");

    private final OkHttpClient httpClient;
    private final ApiUrl apiUrl;

    public List<McpRuntimeTool> listTools(List<String> serverUrls) throws IOException {
        List<String> normalizedUrls = normalizeUrls(serverUrls);
        if (normalizedUrls.isEmpty()) {
            return List.of();
        }

        JSONObject requestBody = new JSONObject()
                .fluentPut("mcp_server_ids", new JSONArray())
                .fluentPut("mcp_server_urls", new JSONArray(normalizedUrls));
        JSONObject response = post(MCP_TOOL_LIST_PATH, requestBody);
        if (response.getIntValue("code") != 0) {
            throw new IOException("MCP tool list failed: " + response.getString("message"));
        }

        JSONObject data = response.getJSONObject("data");
        JSONArray servers = data == null ? null : data.getJSONArray("servers");
        if (servers == null || servers.isEmpty()) {
            return List.of();
        }

        List<McpRuntimeTool> tools = new ArrayList<>();
        Set<String> usedFunctionNames = new LinkedHashSet<>();
        for (int i = 0; i < servers.size(); i++) {
            JSONObject server = servers.getJSONObject(i);
            if (server == null) {
                continue;
            }
            int status = server.getIntValue("server_status");
            String serverId = StringUtils.defaultString(server.getString("server_id"));
            String serverUrl = StringUtils.defaultString(server.getString("server_url"));
            if (status != 0) {
                log.warn("MCP server skipped, serverId: {}, serverUrl: {}, status: {}, message: {}",
                        serverId, serverUrl, status, server.getString("server_message"));
                continue;
            }
            JSONArray serverTools = server.getJSONArray("tools");
            if (serverTools == null || serverTools.isEmpty()) {
                continue;
            }
            for (int j = 0; j < serverTools.size(); j++) {
                JSONObject tool = serverTools.getJSONObject(j);
                if (tool == null || StringUtils.isBlank(tool.getString("name"))) {
                    continue;
                }
                String toolName = tool.getString("name");
                tools.add(new McpRuntimeTool(
                        buildFunctionName(serverId, serverUrl, toolName, usedFunctionNames),
                        serverId,
                        serverUrl,
                        toolName,
                        StringUtils.defaultIfBlank(tool.getString("description"), "Call MCP tool " + toolName + "."),
                        normalizeInputSchema(tool.getJSONObject("inputSchema"))));
            }
        }
        return tools;
    }

    public String callTool(McpRuntimeTool tool, JSONObject arguments) throws IOException {
        if (tool == null) {
            return buildToolErrorContent("MCP_TOOL_NOT_FOUND", "MCP tool metadata is missing.");
        }
        JSONObject requestBody = new JSONObject()
                .fluentPut("mcp_server_id", StringUtils.defaultString(tool.serverId()))
                .fluentPut("mcp_server_url", StringUtils.defaultString(tool.serverUrl()))
                .fluentPut("tool_name", tool.toolName())
                .fluentPut("tool_args", arguments == null ? new JSONObject() : arguments);
        JSONObject response = post(MCP_CALL_TOOL_PATH, requestBody);
        if (response.getIntValue("code") != 0) {
            return buildToolErrorContent(
                    "MCP_TOOL_CALL_FAILED",
                    StringUtils.defaultIfBlank(response.getString("message"), "MCP tool call failed."));
        }

        JSONObject data = response.getJSONObject("data");
        if (data == null) {
            return response.toJSONString();
        }
        String content = stringifyMcpContent(data.getJSONArray("content"));
        if (data.getBooleanValue("isError")) {
            return buildToolErrorContent("MCP_TOOL_ERROR", StringUtils.defaultIfBlank(content, "MCP tool returned an error."));
        }
        return StringUtils.defaultIfBlank(content, data.toJSONString());
    }

    private JSONObject post(String path, JSONObject requestBody) throws IOException {
        Request request = new Request.Builder()
                .url(resolveGatewayUrl(path))
                .post(RequestBody.create(requestBody.toJSONString(), JSON_MEDIA_TYPE))
                .addHeader("Content-Type", "application/json")
                .build();
        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("MCP gateway request failed: " + response.message());
            }
            ResponseBody body = response.body();
            if (body == null) {
                throw new IOException("MCP gateway response body is empty");
            }
            String bodyString = body.string();
            JSONObject json;
            try {
                json = JSON.parseObject(bodyString);
            } catch (RuntimeException e) {
                throw new IOException("Failed to parse MCP gateway response as JSON: " + bodyString, e);
            }
            if (json == null) {
                throw new IOException("MCP gateway returned empty or null JSON response: " + bodyString);
            }
            return json;
        }
    }

    private String resolveGatewayUrl(String path) {
        String baseUrl = StringUtils.defaultIfBlank(apiUrl.getToolUrl(), "http://127.0.0.1:18888");
        return StringUtils.stripEnd(baseUrl, "/") + path;
    }

    private List<String> normalizeUrls(List<String> urls) {
        if (urls == null || urls.isEmpty()) {
            return List.of();
        }
        return urls.stream()
                .filter(StringUtils::isNotBlank)
                .map(String::trim)
                .distinct()
                .toList();
    }

    private JSONObject normalizeInputSchema(JSONObject inputSchema) {
        if (inputSchema == null || inputSchema.isEmpty()) {
            return new JSONObject()
                    .fluentPut("type", "object")
                    .fluentPut("properties", new JSONObject())
                    .fluentPut("required", new JSONArray());
        }
        JSONObject normalized = JSON.parseObject(inputSchema.toJSONString());
        if (StringUtils.isBlank(normalized.getString("type"))) {
            normalized.put("type", "object");
        }
        if (normalized.get("properties") == null) {
            normalized.put("properties", new JSONObject());
        }
        if (normalized.get("required") == null) {
            normalized.put("required", new JSONArray());
        }
        return normalized;
    }

    private String buildFunctionName(String serverId, String serverUrl, String toolName, Set<String> usedFunctionNames) {
        String safeToolName = sanitizeFunctionNamePart(toolName);
        if (canUseOriginalToolName(toolName, safeToolName, usedFunctionNames)) {
            usedFunctionNames.add(safeToolName);
            return safeToolName;
        }

        String hash = shortHash(serverId + "|" + serverUrl + "|" + toolName);
        int maxToolNameLength = Math.max(1, MAX_FUNCTION_NAME_LENGTH - MCP_FUNCTION_PREFIX.length() - hash.length() - 1);
        if (safeToolName.length() > maxToolNameLength) {
            safeToolName = safeToolName.substring(0, maxToolNameLength);
        }
        String base = MCP_FUNCTION_PREFIX + hash + "_" + safeToolName;
        String candidate = base;
        int suffix = 2;
        while (usedFunctionNames.contains(candidate) || RESERVED_FUNCTION_NAMES.contains(candidate)) {
            String suffixText = "_" + suffix++;
            int maxBaseLength = MAX_FUNCTION_NAME_LENGTH - suffixText.length();
            candidate = base.length() > maxBaseLength ? base.substring(0, maxBaseLength) + suffixText : base + suffixText;
        }
        usedFunctionNames.add(candidate);
        return candidate;
    }

    private boolean canUseOriginalToolName(String toolName, String safeToolName, Set<String> usedFunctionNames) {
        return StringUtils.equals(toolName, safeToolName)
                && safeToolName.length() <= MAX_FUNCTION_NAME_LENGTH
                && !RESERVED_FUNCTION_NAMES.contains(safeToolName)
                && !usedFunctionNames.contains(safeToolName);
    }

    private String sanitizeFunctionNamePart(String value) {
        String sanitized = StringUtils.defaultString(value)
                .replaceAll("[^A-Za-z0-9_-]", "_")
                .replaceAll("_+", "_");
        sanitized = StringUtils.strip(sanitized, "_-");
        return StringUtils.defaultIfBlank(sanitized, "tool");
    }

    private String shortHash(String value) {
        CRC32 crc32 = new CRC32();
        crc32.update(StringUtils.defaultString(value).getBytes(StandardCharsets.UTF_8));
        return Long.toHexString(crc32.getValue());
    }

    private String stringifyMcpContent(JSONArray content) {
        if (content == null || content.isEmpty()) {
            return "";
        }
        List<String> parts = new ArrayList<>();
        for (int i = 0; i < content.size(); i++) {
            Object element = content.get(i);
            if (element instanceof JSONObject item) {
                if ("text".equals(item.getString("type"))) {
                    parts.add(StringUtils.defaultString(item.getString("text")));
                } else {
                    parts.add(item.toJSONString());
                }
            } else if (element != null) {
                parts.add(element.toString());
            }
        }
        return String.join("\n", parts);
    }

    private String buildToolErrorContent(String code, String message) {
        return new JSONObject()
                .fluentPut("error", code)
                .fluentPut("message", message)
                .toJSONString();
    }

    public record McpRuntimeTool(String functionName, String serverId, String serverUrl, String toolName,
            String description, JSONObject inputSchema) {

        JSONObject toJson() {
            return new JSONObject()
                    .fluentPut("functionName", functionName)
                    .fluentPut("serverId", serverId)
                    .fluentPut("serverUrl", serverUrl)
                    .fluentPut("toolName", toolName)
                    .fluentPut("description", description)
                    .fluentPut("inputSchema", inputSchema);
        }

        static McpRuntimeTool fromJson(JSONObject jsonObject) {
            if (jsonObject == null) {
                return null;
            }
            return new McpRuntimeTool(
                    jsonObject.getString("functionName"),
                    jsonObject.getString("serverId"),
                    jsonObject.getString("serverUrl"),
                    jsonObject.getString("toolName"),
                    jsonObject.getString("description"),
                    jsonObject.getJSONObject("inputSchema"));
        }
    }
}
