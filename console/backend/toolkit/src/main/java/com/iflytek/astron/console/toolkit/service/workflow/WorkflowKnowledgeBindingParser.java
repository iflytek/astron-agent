package com.iflytek.astron.console.toolkit.service.workflow;

import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.toolkit.common.constant.WorkflowConst;
import org.apache.commons.lang3.StringUtils;

import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Canonical parser for repository bindings carried by workflow knowledge nodes.
 *
 * <p>
 * Import cleaning and execution authorization are separate security boundaries. Keeping the
 * node-type and field rules here prevents either boundary from silently accepting a runtime field
 * that the other one does not inspect.
 */
final class WorkflowKnowledgeBindingParser {
    private WorkflowKnowledgeBindingParser() {}

    static String nodeType(String nodeId) {
        if (StringUtils.isBlank(nodeId)) {
            return null;
        }
        int separator = nodeId.indexOf("::");
        return separator <= 0 ? null : nodeId.substring(0, separator);
    }

    static boolean hasType(String nodeId, String expectedType) {
        return Objects.equals(expectedType, nodeType(nodeId));
    }

    static boolean isDirectKnowledgeType(String nodeType) {
        return WorkflowConst.NodeType.KNOWLEDGE.equals(nodeType)
                || WorkflowConst.NodeType.KNOWLEDGE_PRO.equals(nodeType)
                || WorkflowConst.NodeType.KNOWLEDGE_EXPERT.equals(nodeType);
    }

    static KnowledgeBindings parse(String nodeType, JSONObject param) {
        if (!isDirectKnowledgeType(nodeType) || param == null) {
            return KnowledgeBindings.empty();
        }

        Set<String> repositoryIds = new LinkedHashSet<>();
        boolean malformed = false;
        if (WorkflowConst.NodeType.KNOWLEDGE.equals(nodeType)) {
            Object rawRepositories = param.get("repos");
            if (rawRepositories instanceof Collection<?> repositories
                    && !repositories.isEmpty()) {
                // Core gives the new repos format precedence and ignores legacy repoId/docIds.
                // Authorization and import cleaning must inspect the same effective binding.
                malformed |= collectRepositoryObjects(param, "repos", repositoryIds);
            } else if (rawRepositories != null
                    && !(rawRepositories instanceof Collection<?>)) {
                malformed = true;
            } else {
                malformed |= collectStringBinding(param, "repoId", repositoryIds);
            }
        } else if (WorkflowConst.NodeType.KNOWLEDGE_PRO.equals(nodeType)) {
            malformed |= collectStringBinding(param, "repoIds", repositoryIds);
        } else {
            malformed |= collectRepositoryObjects(param, "repos", repositoryIds);
        }
        return new KnowledgeBindings(repositoryIds, malformed);
    }

    private static boolean collectStringBinding(JSONObject param, String field,
            Set<String> repositoryIds) {
        if (!param.containsKey(field) || param.get(field) == null) {
            return false;
        }
        Object rawValue = param.get(field);
        if (rawValue instanceof Collection<?> values) {
            boolean malformed = false;
            for (Object value : values) {
                String repositoryId = stringValue(value);
                if (StringUtils.isBlank(repositoryId)) {
                    malformed = true;
                } else {
                    repositoryIds.add(repositoryId);
                }
            }
            return malformed;
        }
        String repositoryId = stringValue(rawValue);
        if (StringUtils.isBlank(repositoryId)) {
            return true;
        }
        repositoryIds.add(repositoryId);
        return false;
    }

    private static boolean collectRepositoryObjects(JSONObject param, String field,
            Set<String> repositoryIds) {
        if (!param.containsKey(field) || param.get(field) == null) {
            return false;
        }
        Object rawRepositories = param.get(field);
        if (!(rawRepositories instanceof Collection<?> repositories)) {
            return true;
        }
        boolean malformed = false;
        for (Object rawRepository : repositories) {
            JSONObject repository = asJsonObject(rawRepository);
            if (repository == null) {
                malformed = true;
                continue;
            }
            String repositoryId = repository.getString("repoId");
            if (StringUtils.isBlank(repositoryId)) {
                malformed = true;
            } else {
                repositoryIds.add(repositoryId);
            }
        }
        return malformed;
    }

    private static JSONObject asJsonObject(Object value) {
        if (value instanceof JSONObject jsonObject) {
            return jsonObject;
        }
        return value instanceof Map<?, ?> map ? new JSONObject(map) : null;
    }

    private static String stringValue(Object value) {
        return value instanceof String string ? string : null;
    }

    record KnowledgeBindings(Set<String> repositoryIds, boolean malformed) {
        KnowledgeBindings {
            repositoryIds = Collections.unmodifiableSet(new LinkedHashSet<>(repositoryIds));
        }

        static KnowledgeBindings empty() {
            return new KnowledgeBindings(Set.of(), false);
        }
    }
}
