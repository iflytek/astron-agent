package com.iflytek.astron.console.toolkit.entity.vo;

import lombok.Data;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

/** One dependency resolution decision made during workflow import. */
@Data
public class WorkflowImportReportEntry implements Serializable {
    private static final long serialVersionUID = 1L;

    public static final String MAPPING_NONE = "NONE";
    public static final String MAPPING_SOURCE_ID = "SOURCE_ID";
    public static final String MAPPING_COMPATIBLE_NAME = "COMPATIBLE_NAME";

    public static final String REASON_SOURCE_ID_MATCHED = "SOURCE_ID_MATCHED";
    public static final String REASON_UNIQUE_COMPATIBLE_NAME_MATCHED =
            "UNIQUE_COMPATIBLE_NAME_MATCHED";
    public static final String REASON_TOOL_MISSING = "TOOL_MISSING";
    public static final String REASON_CONTRACT_INCOMPATIBLE = "CONTRACT_INCOMPATIBLE";
    public static final String REASON_SAME_NAME_CONTRACT_INCOMPATIBLE =
            "SAME_NAME_CONTRACT_INCOMPATIBLE";
    public static final String REASON_MULTIPLE_TOOL_VERSIONS = "MULTIPLE_TOOL_VERSIONS";
    public static final String REASON_MULTIPLE_COMPATIBLE_TOOLS = "MULTIPLE_COMPATIBLE_TOOLS";
    public static final String REASON_DATABASE_MISSING = "DATABASE_MISSING";
    public static final String REASON_WORKFLOW_MISSING = "WORKFLOW_MISSING";
    public static final String REASON_KNOWLEDGE_MISSING = "KNOWLEDGE_MISSING";
    public static final String REASON_KNOWLEDGE_ITEMS_MISSING = "KNOWLEDGE_ITEMS_MISSING";

    private String nodeId;
    private String nodeType;
    private String dependencyType;
    private String status;
    private String reasonCode;
    private String reason;
    private String mappingType;

    private String sourcePluginId;
    private String sourceName;
    private String sourceOperationId;
    private String sourceVersion;
    private String sourceStableKey;

    private String targetPluginId;
    private String targetOperationId;
    private String targetVersion;
    private List<String> candidatePluginIds = new ArrayList<>();
}
