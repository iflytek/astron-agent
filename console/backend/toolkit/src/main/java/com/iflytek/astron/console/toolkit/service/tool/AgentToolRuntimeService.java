package com.iflytek.astron.console.toolkit.service.tool;

import cn.hutool.core.codec.Base64;
import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.toolkit.config.properties.BizConfig;
import com.iflytek.astron.console.toolkit.config.properties.CommonConfig;
import com.iflytek.astron.console.toolkit.entity.table.tool.ToolBox;
import com.iflytek.astron.console.toolkit.entity.tool.AgentToolDefinition;
import com.iflytek.astron.console.toolkit.entity.tool.Message;
import com.iflytek.astron.console.toolkit.entity.tool.ToolHeader;
import com.iflytek.astron.console.toolkit.entity.tool.ToolParameter;
import com.iflytek.astron.console.toolkit.entity.tool.ToolPayload;
import com.iflytek.astron.console.toolkit.entity.tool.ToolProtocolDto;
import com.iflytek.astron.console.toolkit.entity.tool.WebSchema;
import com.iflytek.astron.console.toolkit.entity.tool.WebSchemaItem;
import com.iflytek.astron.console.toolkit.handler.ToolServiceCallHandler;
import com.iflytek.astron.console.toolkit.mapper.tool.ToolBoxMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Resolves tool-square plugins (Link tools, id {@code tool@xxx}) into agent-callable definitions
 * and executes them through the core-link {@code http_run} endpoint. Mirrors the production
 * tool-run path already used by the plugin "debug" feature ({@code ToolBoxService.debugTool}) and
 * the workflow agent's Python {@code LinkPluginFactory}: model-visible parameters
 * ({@code from == 0}) are exposed in the input schema, business-passthrough parameters
 * ({@code from == 1}) are filled from their defaults, and the request is assembled as
 * base64-encoded header/query/body segments.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AgentToolRuntimeService {

    private static final String TYPE_OBJECT = "object";
    private static final int FROM_BUSINESS = 1;
    private static final Set<String> RESERVED_FUNCTION_NAMES = Set.of("web_search", "current_time");
    private static final int MAX_FUNCTION_NAME_LENGTH = 64;

    private final ToolBoxMapper toolBoxMapper;
    private final CommonConfig commonConfig;
    private final BizConfig bizConfig;
    private final ToolServiceCallHandler toolServiceCallHandler;

    /** Load the latest version of each tool id and build an agent-callable definition per tool. */
    public List<AgentToolDefinition> resolveTools(List<String> toolIds) {
        List<String> ids = normalize(toolIds);
        if (ids.isEmpty()) {
            return List.of();
        }
        List<ToolBox> toolBoxes = toolBoxMapper.getToolsLastVersion(ids);
        if (toolBoxes == null || toolBoxes.isEmpty()) {
            log.warn("No tool-square tools found for ids: {}", ids);
            return List.of();
        }
        List<AgentToolDefinition> definitions = new ArrayList<>();
        Set<String> usedNames = new LinkedHashSet<>();
        for (ToolBox toolBox : toolBoxes) {
            try {
                AgentToolDefinition definition = buildDefinition(toolBox, usedNames);
                if (definition != null) {
                    definitions.add(definition);
                }
            } catch (Exception e) {
                log.warn("Skip agent tool, toolId: {}, error: {}",
                        toolBox == null ? null : toolBox.getToolId(), e.getMessage());
            }
        }
        log.info("Resolved {} agent plugin tool(s) from {} requested id(s)", definitions.size(), ids.size());
        return definitions;
    }

    /**
     * Save-time guard: every requested tool must be importable by this user — public, owned by the
     * user, or shared in the same space. Blocks crafted requests that reference another user's private
     * {@code tool@xxx} (which would otherwise run under the owner's identity at chat time).
     */
    public boolean checkToolsAccessible(String uid, Long spaceId, List<String> toolIds) {
        List<String> ids = normalize(toolIds);
        if (ids.isEmpty()) {
            return true;
        }
        List<ToolBox> toolBoxes = toolBoxMapper.getToolsLastVersion(ids);
        Map<String, ToolBox> byToolId = new HashMap<>();
        if (toolBoxes != null) {
            for (ToolBox toolBox : toolBoxes) {
                if (toolBox != null && StringUtils.isNotBlank(toolBox.getToolId())) {
                    byToolId.put(toolBox.getToolId(), toolBox);
                }
            }
        }
        for (String id : ids) {
            ToolBox toolBox = byToolId.get(id);
            if (toolBox == null) {
                log.warn("Reject bot tool, not found: {}", id);
                return false;
            }
            boolean accessible = Boolean.TRUE.equals(toolBox.getIsPublic())
                    || StringUtils.equals(uid, toolBox.getUserId())
                    || StringUtils.equals(toolBox.getUserId(), bizConfig.getAdminUid())
                    || (spaceId != null && spaceId.equals(toolBox.getSpaceId()));
            if (!accessible) {
                log.warn("Reject bot tool, not accessible by uid {}: {}", uid, id);
                return false;
            }
        }
        return true;
    }

    /** Execute the resolved tool with the model-provided arguments; returns a string for the model. */
    public String runTool(AgentToolDefinition definition, JSONObject modelArgs) {
        if (definition == null) {
            return errorContent("TOOL_NOT_FOUND", "Tool metadata is missing.");
        }
        JSONObject args = modelArgs == null ? new JSONObject() : modelArgs;
        JSONObject header = new JSONObject();
        JSONObject query = new JSONObject();
        JSONObject path = new JSONObject();
        JSONObject body = new JSONObject();
        for (WebSchemaItem item : safe(definition.getInputs())) {
            if (item == null || StringUtils.isBlank(item.getName())) {
                continue;
            }
            Object value = assembleValue(item, args);
            String location = StringUtils.lowerCase(StringUtils.defaultString(item.getLocation()));
            switch (location) {
                case "header" -> header.put(item.getName(), value);
                case "query" -> query.put(item.getName(), value);
                case "path" -> path.put(item.getName(), value);
                default -> body.put(item.getName(), value);
            }
        }

        ToolProtocolDto request = buildRequest(definition, header, query, path, body);
        ToolProtocolDto response;
        try {
            response = toolServiceCallHandler.toolRun(request);
        } catch (Exception e) {
            log.warn("Tool run failed, toolId: {}, error: {}", definition.getToolId(), e.getMessage());
            return errorContent("TOOL_CALL_FAILED", "Tool call failed: " + e.getMessage());
        }
        return extractResult(response);
    }

    private ToolProtocolDto buildRequest(AgentToolDefinition definition, JSONObject header, JSONObject query,
            JSONObject path, JSONObject body) {
        ToolHeader toolHeader = new ToolHeader();
        toolHeader.setUid(definition.getUid());
        toolHeader.setAppId(commonConfig.getAppId());

        ToolParameter parameter = new ToolParameter();
        parameter.setToolId(definition.getToolId());
        parameter.setOperationId(definition.getOperationId());
        parameter.setVersion(definition.getVersion());

        Message message = new Message();
        if (!header.isEmpty()) {
            message.setHeader(Base64.encode(header.toString()));
        }
        if (!query.isEmpty()) {
            message.setQuery(Base64.encode(query.toString()));
        }
        if (!path.isEmpty()) {
            message.setPath(Base64.encode(path.toString()));
        }
        if (!body.isEmpty()) {
            message.setBody(Base64.encode(body.toString()));
        }
        ToolPayload payload = new ToolPayload();
        payload.setMessage(message);

        ToolProtocolDto request = new ToolProtocolDto();
        request.setHeader(toolHeader);
        request.setParameter(parameter);
        request.setPayload(payload);
        return request;
    }

    private String extractResult(ToolProtocolDto response) {
        if (response == null || response.getHeader() == null) {
            return errorContent("TOOL_EMPTY_RESPONSE", "Tool returned an empty response.");
        }
        Integer code = response.getHeader().getCode();
        if (code != null && code != 0) {
            return errorContent("TOOL_ERROR",
                    StringUtils.defaultIfBlank(response.getHeader().getMessage(), "Tool returned an error."));
        }
        if (response.getPayload() == null || response.getPayload().getText() == null) {
            return errorContent("TOOL_EMPTY_RESPONSE", "Tool returned no content.");
        }
        return StringUtils.defaultString(response.getPayload().getText().getText());
    }

    /** Build the request value for a single item, recursing into object children (flat arg lookup). */
    private Object assembleValue(WebSchemaItem item, JSONObject args) {
        if (TYPE_OBJECT.equalsIgnoreCase(StringUtils.defaultString(item.getType()))) {
            JSONObject object = new JSONObject();
            for (WebSchemaItem child : safe(item.getChildren())) {
                if (child == null || StringUtils.isBlank(child.getName())) {
                    continue;
                }
                object.put(child.getName(), assembleValue(child, args));
            }
            return object;
        }
        if (isBusiness(item)) {
            return item.getDft();
        }
        return args.containsKey(item.getName()) ? args.get(item.getName()) : item.getDft();
    }

    private AgentToolDefinition buildDefinition(ToolBox toolBox, Set<String> usedNames) {
        if (toolBox == null || StringUtils.isBlank(toolBox.getToolId())) {
            return null;
        }
        List<WebSchemaItem> inputs = parseInputs(toolBox.getWebSchema());
        String functionName = uniqueFunctionName(toolBox, usedNames);
        String inputSchema = buildInputSchema(inputs);
        return AgentToolDefinition.builder()
                .toolId(toolBox.getToolId())
                .operationId(toolBox.getOperationId())
                .version(StringUtils.defaultIfBlank(toolBox.getVersion(), "V1.0"))
                .uid(toolBox.getUserId())
                .functionName(functionName)
                .description(StringUtils.defaultIfBlank(toolBox.getDescription(),
                        "Call tool " + StringUtils.defaultString(toolBox.getName())))
                .inputSchema(inputSchema)
                .inputs(inputs)
                .build();
    }

    private List<WebSchemaItem> parseInputs(String webSchemaJson) {
        if (StringUtils.isBlank(webSchemaJson)) {
            return List.of();
        }
        WebSchema webSchema = JSON.parseObject(webSchemaJson, WebSchema.class);
        if (webSchema == null || webSchema.getToolRequestInput() == null) {
            return List.of();
        }
        return webSchema.getToolRequestInput();
    }

    /**
     * Flatten model-visible leaf parameters into a single JSON schema, mirroring the Python factory.
     */
    private String buildInputSchema(List<WebSchemaItem> inputs) {
        JSONObject properties = new JSONObject();
        JSONArray required = new JSONArray();
        collectSchema(inputs, properties, required);
        JSONObject schema = new JSONObject();
        schema.put("type", "object");
        schema.put("properties", properties);
        schema.put("required", required);
        return schema.toJSONString();
    }

    private void collectSchema(List<WebSchemaItem> items, JSONObject properties, JSONArray required) {
        for (WebSchemaItem item : safe(items)) {
            if (item == null || StringUtils.isBlank(item.getName())) {
                continue;
            }
            if (TYPE_OBJECT.equalsIgnoreCase(StringUtils.defaultString(item.getType()))) {
                collectSchema(item.getChildren(), properties, required);
                continue;
            }
            if (isBusiness(item)) {
                continue;
            }
            JSONObject property = new JSONObject();
            property.put("type", StringUtils.defaultIfBlank(item.getType(), "string"));
            if (StringUtils.isNotBlank(item.getDescription())) {
                property.put("description", item.getDescription());
            }
            properties.put(item.getName(), property);
            if (Boolean.TRUE.equals(item.getRequired()) && !required.contains(item.getName())) {
                required.add(item.getName());
            }
        }
    }

    private boolean isBusiness(WebSchemaItem item) {
        return item.getFrom() != null && item.getFrom() == FROM_BUSINESS;
    }

    private String uniqueFunctionName(ToolBox toolBox, Set<String> usedNames) {
        String base = sanitize(StringUtils.defaultIfBlank(toolBox.getOperationId(), toolBox.getName()));
        if (base.length() > MAX_FUNCTION_NAME_LENGTH) {
            base = base.substring(0, MAX_FUNCTION_NAME_LENGTH);
        }
        String candidate = base;
        int suffix = 2;
        while (usedNames.contains(candidate) || RESERVED_FUNCTION_NAMES.contains(candidate)) {
            String suffixText = "_" + suffix++;
            int maxBaseLength = MAX_FUNCTION_NAME_LENGTH - suffixText.length();
            candidate = (base.length() > maxBaseLength ? base.substring(0, maxBaseLength) : base) + suffixText;
        }
        usedNames.add(candidate);
        return candidate;
    }

    private String sanitize(String value) {
        String sanitized = StringUtils.defaultString(value)
                .replaceAll("[^A-Za-z0-9_-]", "_")
                .replaceAll("_+", "_");
        sanitized = StringUtils.strip(sanitized, "_-");
        return StringUtils.defaultIfBlank(sanitized, "tool");
    }

    private List<String> normalize(List<String> toolIds) {
        if (toolIds == null || toolIds.isEmpty()) {
            return List.of();
        }
        return toolIds.stream()
                .filter(StringUtils::isNotBlank)
                .map(String::trim)
                .distinct()
                .toList();
    }

    private <T> List<T> safe(List<T> list) {
        return list == null ? List.of() : list;
    }

    private String errorContent(String code, String message) {
        return new JSONObject()
                .fluentPut("error", code)
                .fluentPut("message", message)
                .toJSONString();
    }
}
