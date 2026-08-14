package com.iflytek.astron.console.toolkit.service.workflow;

import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.constructor.SafeConstructor;
import org.yaml.snakeyaml.error.YAMLException;

import java.io.InputStream;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Loads and validates the portable structure of an imported workflow YAML document. */
@Slf4j
final class WorkflowYamlParser {
    private static final int MAX_YAML_ALIASES = 50;
    private static final int MAX_YAML_NESTING_DEPTH = 50;
    private static final int MAX_YAML_CODE_POINTS = 20 * 1024 * 1024;

    private WorkflowYamlParser() {}

    static ParsedWorkflowDsl parse(InputStream inputStream) {
        Object loaded;
        try {
            LoaderOptions loaderOptions = createLoaderOptions();
            loaded = new Yaml(new SafeConstructor(loaderOptions)).load(inputStream);
        } catch (YAMLException | ClassCastException e) {
            throw invalidWorkflowDsl(e);
        }
        if (!(loaded instanceof Map<?, ?> rootMap)) {
            throw invalidWorkflowDsl(null);
        }
        Map<String, Object> root = toStringKeyMap(rootMap);
        if (!root.containsKey("flowMeta") || !root.containsKey("flowData")) {
            throw invalidWorkflowDsl(null);
        }
        if (!(root.get("flowMeta") instanceof Map<?, ?> metaRaw)
                || !(root.get("flowData") instanceof Map<?, ?> flowRaw)) {
            throw invalidWorkflowDsl(null);
        }
        Map<String, Object> meta = toStringKeyMap(metaRaw);
        Map<String, Object> flow = toStringKeyMap(flowRaw);
        validateWorkflowMetaShape(meta);
        validateWorkflowDslShape(flow);
        return new ParsedWorkflowDsl(meta, flow, root.get("dependencyManifest"));
    }

    static LoaderOptions createLoaderOptions() {
        LoaderOptions options = new LoaderOptions();
        options.setAllowDuplicateKeys(false);
        options.setAllowRecursiveKeys(false);
        options.setMaxAliasesForCollections(MAX_YAML_ALIASES);
        options.setNestingDepthLimit(MAX_YAML_NESTING_DEPTH);
        options.setCodePointLimit(MAX_YAML_CODE_POINTS);
        return options;
    }

    private static Map<String, Object> toStringKeyMap(Map<?, ?> raw) {
        Map<String, Object> result = new LinkedHashMap<>();
        raw.forEach((key, value) -> result.put(String.valueOf(key), value));
        return result;
    }

    /** Metadata is optional, but typed fields must retain the export contract. */
    private static void validateWorkflowMetaShape(Map<String, Object> meta) {
        for (String field : List.of(
                "name", "description", "avatarIcon", "avatarColor", "edgeType",
                "advancedConfig")) {
            Object value = meta.get(field);
            if (value != null && !(value instanceof String)) {
                throw invalidWorkflowDsl(null);
            }
        }
        Object category = meta.get("category");
        if (category != null && !(category instanceof Number)) {
            throw invalidWorkflowDsl(null);
        }
    }

    /** Reject malformed collection shapes before Jackson or node cleaners dereference them. */
    private static void validateWorkflowDslShape(Map<String, Object> flow) {
        Object rawNodes = flow.get("nodes");
        Object rawEdges = flow.get("edges");
        if (!(rawNodes instanceof Collection<?> nodes)
                || !(rawEdges instanceof Collection<?> edges)) {
            throw invalidWorkflowDsl(null);
        }
        for (Object rawNode : nodes) {
            if (!(rawNode instanceof Map<?, ?> node)
                    || StringUtils.isBlank(stringValue(node.get("id")))
                    || !(node.get("data") instanceof Map<?, ?> data)) {
                throw invalidWorkflowDsl(null);
            }
            Object nodeParam = data.get("nodeParam");
            if (nodeParam != null && !(nodeParam instanceof Map<?, ?>)) {
                throw invalidWorkflowDsl(null);
            }
            validateAgentDslShape(stringValue(node.get("id")), nodeParam);
        }
        if (edges.stream()
                .anyMatch(edge -> !(edge instanceof Map<?, ?> edgeMap)
                        || StringUtils.isBlank(stringValue(edgeMap.get("source")))
                        || StringUtils.isBlank(stringValue(edgeMap.get("target"))))) {
            throw invalidWorkflowDsl(null);
        }
    }

    /** Agent dependency containers are security-sensitive and must have deterministic shapes. */
    private static void validateAgentDslShape(String nodeId, Object rawNodeParam) {
        if (!StringUtils.startsWith(nodeId, "agent::") || rawNodeParam == null) {
            return;
        }
        Map<?, ?> nodeParam = (Map<?, ?>) rawNodeParam;
        Object rawPlugin = nodeParam.get("plugin");
        if (rawPlugin == null) {
            return;
        }
        if (!(rawPlugin instanceof Map<?, ?> plugin)) {
            throw invalidWorkflowDsl(null);
        }
        validateCollectionOfMaps(plugin.get("tools"), true);
        validateCollectionOfMaps(plugin.get("toolsList"), false);
        Object rawKnowledge = plugin.get("knowledge");
        if (rawKnowledge == null) {
            return;
        }
        if (!(rawKnowledge instanceof Collection<?> knowledge)) {
            throw invalidWorkflowDsl(null);
        }
        for (Object rawItem : knowledge) {
            if (!(rawItem instanceof Map<?, ?> item)
                    || !(item.get("match") instanceof Map<?, ?> match)
                    || !(match.get("repoIds") instanceof Collection<?>)) {
                throw invalidWorkflowDsl(null);
            }
        }
    }

    private static void validateCollectionOfMaps(Object rawCollection, boolean allowStrings) {
        if (rawCollection == null) {
            return;
        }
        if (!(rawCollection instanceof Collection<?> collection)
                || collection.stream()
                        .anyMatch(item -> !(item instanceof Map<?, ?>)
                                && !(allowStrings && item instanceof String))) {
            throw invalidWorkflowDsl(null);
        }
    }

    private static BusinessException invalidWorkflowDsl(Throwable cause) {
        if (cause != null) {
            log.warn("workflow DSL validation failed: {}", cause.getMessage());
        }
        return new BusinessException(ResponseEnum.WORKFLOW_DLS_UPLOAD_FAILED);
    }

    private static String stringValue(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    record ParsedWorkflowDsl(
            Map<String, Object> meta, Map<String, Object> flow, Object dependencyManifest) {}
}
