package com.iflytek.astron.console.toolkit.service.workflow;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.iflytek.astron.console.commons.entity.workflow.Workflow;
import com.iflytek.astron.console.toolkit.common.constant.WorkflowConst;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.BizWorkflowData;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.BizWorkflowNode;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.node.BizInputOutput;
import com.iflytek.astron.console.toolkit.entity.workflow.AgentWorkflowDefinition;
import com.iflytek.astron.console.toolkit.mapper.workflow.WorkflowMapper;
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
 * Resolves workflows the bot has imported into agent-callable definitions (tool name + JSON schema
 * from the start-node inputs) and executes them synchronously (stream=false) through the core
 * workflow chat endpoint. Mirrors {@code AgentToolRuntimeService}, the plugin counterpart.
 * Publish state is enforced by the workflow engine at run time; the save-time guard here focuses
 * on ownership (own or same-space) so crafted requests cannot attach another owner's workflow.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AgentWorkflowRuntimeService {

    private static final int MAX_FUNCTION_NAME_LENGTH = 64;
    private static final Set<String> RESERVED_FUNCTION_NAMES = Set.of("web_search", "current_time");
    private static final Set<String> JSON_TYPES = Set.of("string", "number", "integer", "boolean", "object", "array");

    private final WorkflowMapper workflowMapper;
    private final WorkflowChatRunClient workflowChatRunClient;

    /** Load each imported workflow and build an agent-callable definition per flow id. */
    public List<AgentWorkflowDefinition> resolveWorkflows(List<String> flowIds) {
        List<String> ids = normalize(flowIds);
        if (ids.isEmpty()) {
            return List.of();
        }
        List<Workflow> workflows = selectByFlowIds(ids);
        if (workflows.isEmpty()) {
            log.warn("No workflows found for flow ids: {}", ids);
            return List.of();
        }
        List<AgentWorkflowDefinition> definitions = new ArrayList<>();
        Set<String> usedNames = new LinkedHashSet<>();
        for (Workflow workflow : workflows) {
            try {
                definitions.add(buildDefinition(workflow, usedNames));
            } catch (Exception e) {
                log.warn("Skip agent workflow, flowId: {}, error: {}",
                        workflow == null ? null : workflow.getFlowId(), e.getMessage());
            }
        }
        log.info("Resolved {} agent workflow(s) from {} requested id(s)", definitions.size(), ids.size());
        return definitions;
    }

    /**
     * Save-time guard: every requested workflow must exist, not be deleted, and be owned by the
     * user or shared in the same space.
     */
    public boolean checkWorkflowsAccessible(String uid, Long spaceId, List<String> flowIds) {
        List<String> ids = normalize(flowIds);
        if (ids.isEmpty()) {
            return true;
        }
        Map<String, Workflow> byFlowId = new HashMap<>();
        for (Workflow workflow : selectByFlowIds(ids)) {
            if (workflow != null && StringUtils.isNotBlank(workflow.getFlowId())) {
                byFlowId.put(workflow.getFlowId(), workflow);
            }
        }
        for (String id : ids) {
            Workflow workflow = byFlowId.get(id);
            if (workflow == null) {
                log.warn("Reject bot workflow, not found: {}", id);
                return false;
            }
            boolean accessible = StringUtils.equals(uid, workflow.getUid())
                    || (spaceId != null && spaceId.equals(workflow.getSpaceId()));
            if (!accessible) {
                log.warn("Reject bot workflow, not accessible by uid {}: {}", uid, id);
                return false;
            }
        }
        return true;
    }

    /** Convenience guard for callers holding the raw workflows JSON (e.g. the debug endpoint). */
    public boolean checkWorkflowsAccessible(String uid, Long spaceId, String workflowsJson) {
        return checkWorkflowsAccessible(uid, spaceId, parseFlowIds(workflowsJson));
    }

    /** Extract the {@code flowId} list from a workflows JSON array; tolerant of malformed input. */
    public List<String> parseFlowIds(String workflowsJson) {
        if (StringUtils.isBlank(workflowsJson)) {
            return List.of();
        }
        List<String> flowIds = new ArrayList<>();
        try {
            JSONArray array = JSON.parseArray(workflowsJson.trim());
            for (int i = 0; i < array.size(); i++) {
                JSONObject item = array.getJSONObject(i);
                if (item == null) {
                    continue;
                }
                String flowId = item.getString("flowId");
                if (StringUtils.isNotBlank(flowId)) {
                    flowIds.add(flowId.trim());
                }
            }
        } catch (Exception e) {
            log.warn("Invalid workflows json, ignored: {}", workflowsJson);
            return List.of();
        }
        return flowIds.stream().distinct().toList();
    }

    /** Execute the workflow with the model-provided arguments; returns a string for the model. */
    public String runWorkflow(AgentWorkflowDefinition definition, String uid, JSONObject modelArgs) {
        if (definition == null) {
            return errorContent("WORKFLOW_NOT_FOUND", "Workflow metadata is missing.");
        }
        JSONObject body = new JSONObject();
        body.put("flow_id", definition.getFlowId());
        body.put("uid", StringUtils.defaultIfBlank(uid, "agent"));
        body.put("parameters", modelArgs == null ? new JSONObject() : modelArgs);
        body.put("history", new JSONArray());
        body.put("stream", false);

        try {
            String responseBody = workflowChatRunClient.chat(body);
            return extractResult(definition, responseBody);
        } catch (Exception e) {
            log.warn("Workflow run failed, flowId: {}, error: {}", definition.getFlowId(), e.getMessage());
            return errorContent("WORKFLOW_CALL_FAILED", "Workflow call failed: " + e.getMessage());
        }
    }

    private List<Workflow> selectByFlowIds(List<String> flowIds) {
        List<Workflow> workflows =
                workflowMapper.selectList(new LambdaQueryWrapper<Workflow>().in(Workflow::getFlowId, flowIds));
        if (workflows == null) {
            return List.of();
        }
        return workflows.stream()
                .filter(w -> w != null && !Boolean.TRUE.equals(w.getDeleted()))
                .toList();
    }

    private AgentWorkflowDefinition buildDefinition(Workflow workflow, Set<String> usedNames) {
        String name = StringUtils.trimToEmpty(workflow.getName());
        String description = StringUtils.trimToEmpty(workflow.getDescription());
        String combined = StringUtils.isBlank(description) ? name : name + ": " + description;
        return AgentWorkflowDefinition.builder()
                .flowId(workflow.getFlowId())
                .name(name)
                .functionName(uniqueFunctionName(workflow.getFlowId(), usedNames))
                .description(StringUtils.defaultIfBlank(combined, "Run workflow " + workflow.getFlowId()))
                .inputSchema(buildInputSchema(extractStartNodeInputs(workflow)))
                .build();
    }

    /** The workflow start node declares its inputs as {@code node.data.outputs}. */
    private List<BizInputOutput> extractStartNodeInputs(Workflow workflow) {
        String protocol = StringUtils.defaultIfBlank(workflow.getPublishedData(), workflow.getData());
        if (StringUtils.isBlank(protocol)) {
            return List.of();
        }
        try {
            BizWorkflowData data = JSON.parseObject(protocol, BizWorkflowData.class);
            if (data == null || data.getNodes() == null) {
                return List.of();
            }
            for (BizWorkflowNode node : data.getNodes()) {
                if (node != null
                        && StringUtils.startsWith(node.getId(), WorkflowConst.NodeType.START)
                        && node.getData() != null
                        && node.getData().getOutputs() != null) {
                    return node.getData().getOutputs();
                }
            }
        } catch (Exception e) {
            log.warn("Parse workflow start-node inputs failed, flowId={}", workflow.getFlowId(), e);
        }
        return List.of();
    }

    private String buildInputSchema(List<BizInputOutput> inputs) {
        JSONObject properties = new JSONObject();
        JSONArray required = new JSONArray();
        for (BizInputOutput input : inputs == null ? List.<BizInputOutput>of() : inputs) {
            if (input == null || StringUtils.isBlank(input.getName())) {
                continue;
            }
            JSONObject property = new JSONObject();
            String type = input.getSchema() == null ? "string"
                    : StringUtils.defaultIfBlank(input.getSchema().getType(), "string");
            boolean fileInput = isFileInput(input);
            if (fileInput) {
                property.put("type", "string");
            } else if (StringUtils.startsWith(type, "array")) {
                property.put("type", "array");
                String itemType = StringUtils.removeStart(type, "array-");
                property.put("items", new JSONObject().fluentPut("type",
                        JSON_TYPES.contains(itemType) ? itemType : "string"));
            } else {
                property.put("type", JSON_TYPES.contains(type) ? type : "string");
            }
            List<String> descriptionParts = new ArrayList<>();
            if (StringUtils.isNotBlank(input.getDescription())) {
                descriptionParts.add(input.getDescription());
            }
            if (fileInput) {
                descriptionParts.add("Pass a publicly accessible file URL.");
            }
            if (!descriptionParts.isEmpty()) {
                property.put("description", String.join(" ", descriptionParts));
            }
            properties.put(input.getName(), property);
            if (Boolean.TRUE.equals(input.getRequired()) && !required.contains(input.getName())) {
                required.add(input.getName());
            }
        }
        JSONObject schema = new JSONObject();
        schema.put("type", "object");
        schema.put("properties", properties);
        schema.put("required", required);
        return schema.toJSONString();
    }

    private boolean isFileInput(BizInputOutput input) {
        return StringUtils.isNotBlank(input.getFileType())
                || StringUtils.containsIgnoreCase(input.getCustomParameterType(), "file");
    }

    private String extractResult(AgentWorkflowDefinition definition, String responseBody) {
        JSONObject json;
        try {
            json = JSON.parseObject(responseBody);
        } catch (Exception e) {
            log.warn("Invalid workflow response, flowId: {}", definition.getFlowId());
            return errorContent("WORKFLOW_BAD_RESPONSE", "Workflow returned an unreadable response.");
        }
        if (json == null) {
            return errorContent("WORKFLOW_EMPTY_RESPONSE", "Workflow returned an empty response.");
        }
        Integer code = json.getInteger("code");
        if (code != null && code != 0) {
            return errorContent("WORKFLOW_ERROR",
                    StringUtils.defaultIfBlank(json.getString("message"), "Workflow returned an error."));
        }
        if (json.get("event_data") != null) {
            return errorContent("WORKFLOW_INTERRUPT",
                    "This workflow contains an interactive Q&A node and cannot run automatically in an agent chat.");
        }
        JSONArray choices = json.getJSONArray("choices");
        if (choices != null) {
            for (int i = 0; i < choices.size(); i++) {
                JSONObject choice = choices.getJSONObject(i);
                JSONObject delta = choice == null ? null : choice.getJSONObject("delta");
                String content = delta == null ? null : delta.getString("content");
                if (StringUtils.isNotBlank(content)) {
                    return content;
                }
            }
        }
        return errorContent("WORKFLOW_EMPTY_RESPONSE", "Workflow returned no content.");
    }

    private String uniqueFunctionName(String flowId, Set<String> usedNames) {
        String base = "workflow_" + StringUtils.defaultString(flowId).replaceAll("[^A-Za-z0-9_-]", "_");
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

    private List<String> normalize(List<String> flowIds) {
        if (flowIds == null || flowIds.isEmpty()) {
            return List.of();
        }
        return flowIds.stream()
                .filter(StringUtils::isNotBlank)
                .map(String::trim)
                .distinct()
                .toList();
    }

    private String errorContent(String code, String message) {
        return new JSONObject()
                .fluentPut("error", code)
                .fluentPut("message", message)
                .toJSONString();
    }
}
