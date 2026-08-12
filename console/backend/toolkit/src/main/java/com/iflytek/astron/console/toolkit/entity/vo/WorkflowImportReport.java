package com.iflytek.astron.console.toolkit.entity.vo;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * Result details for resource bindings resolved while importing a workflow.
 */
@Data
public class WorkflowImportReport {
    private int mappedPluginCount;
    private List<UnresolvedPlugin> unresolvedPlugins = new ArrayList<>();

    public void pluginMapped() {
        mappedPluginCount++;
    }

    public void pluginUnresolved(String nodeId, String nodeLabel, String pluginName, String reason) {
        unresolvedPlugins.add(new UnresolvedPlugin(nodeId, nodeLabel, pluginName, reason));
    }

    /**
     * Plugin node that could not be safely rebound in the target environment.
     */
    @Data
    @AllArgsConstructor
    public static class UnresolvedPlugin {
        private String nodeId;
        private String nodeLabel;
        private String pluginName;
        private String reason;
    }
}
