package com.iflytek.astron.console.toolkit.entity.vo;

import lombok.Data;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

import org.apache.commons.lang3.StringUtils;

/**
 * Result of resolving external dependencies while importing a workflow.
 *
 * <p>
 * The report is deliberately a response-only object. It is never stored in the workflow record and
 * can therefore be added to the import endpoint without changing the persistence schema.
 * </p>
 */
@Data
public class WorkflowImportReport implements Serializable {
    private static final long serialVersionUID = 1L;

    private String version = "1";
    private int total;
    private int resolved;
    private int unresolved;
    private int ambiguous;
    private List<WorkflowImportReportEntry> entries = new ArrayList<>();

    public void add(WorkflowImportReportEntry entry) {
        if (entry == null) {
            return;
        }
        normalizeProtocolFields(entry);
        entries.add(entry);
        total++;
        if ("MAPPED".equals(entry.getStatus())) {
            resolved++;
        } else if ("AMBIGUOUS".equals(entry.getStatus())) {
            ambiguous++;
        } else {
            unresolved++;
        }
    }

    /** Fill protocol defaults without deriving machine-readable fields from display text. */
    private void normalizeProtocolFields(WorkflowImportReportEntry entry) {
        if (StringUtils.isBlank(entry.getMappingType())) {
            entry.setMappingType(WorkflowImportReportEntry.MAPPING_NONE);
        }
        if (StringUtils.isNotBlank(entry.getReasonCode())) {
            return;
        }
        if ("MAPPED".equals(entry.getStatus())) {
            boolean sourceIdMatched = entry.getSourcePluginId() != null
                    && entry.getSourcePluginId().equals(entry.getTargetPluginId());
            entry.setMappingType(sourceIdMatched
                    ? WorkflowImportReportEntry.MAPPING_SOURCE_ID
                    : WorkflowImportReportEntry.MAPPING_COMPATIBLE_NAME);
            entry.setReasonCode(sourceIdMatched
                    ? WorkflowImportReportEntry.REASON_SOURCE_ID_MATCHED
                    : WorkflowImportReportEntry.REASON_UNIQUE_COMPATIBLE_NAME_MATCHED);
            return;
        }
        if ("AMBIGUOUS".equals(entry.getStatus())) {
            entry.setReasonCode(WorkflowImportReportEntry.REASON_MULTIPLE_TOOL_VERSIONS);
        } else if ("INCOMPATIBLE".equals(entry.getStatus())) {
            entry.setReasonCode(WorkflowImportReportEntry.REASON_CONTRACT_INCOMPATIBLE);
        } else if ("database".equals(entry.getDependencyType())) {
            entry.setReasonCode(WorkflowImportReportEntry.REASON_DATABASE_MISSING);
        } else if ("workflow".equals(entry.getDependencyType())) {
            entry.setReasonCode(WorkflowImportReportEntry.REASON_WORKFLOW_MISSING);
        } else if ("knowledge".equals(entry.getDependencyType())) {
            entry.setReasonCode(WorkflowImportReportEntry.REASON_KNOWLEDGE_MISSING);
        } else {
            entry.setReasonCode(WorkflowImportReportEntry.REASON_TOOL_MISSING);
        }
    }
}
