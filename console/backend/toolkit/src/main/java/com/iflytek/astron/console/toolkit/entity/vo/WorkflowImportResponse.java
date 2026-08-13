package com.iflytek.astron.console.toolkit.entity.vo;

import com.iflytek.astron.console.commons.entity.workflow.Workflow;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * A Workflow enriched with an import report. Extending Workflow is intentional: existing
 * integrations (notably BotMaasService) cast the import result to Workflow. The extra property is
 * serialized by the HTTP response but is not persisted because this type is only used as a response
 * object.
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class WorkflowImportResponse extends Workflow {
    private WorkflowImportReport importReport;
}
