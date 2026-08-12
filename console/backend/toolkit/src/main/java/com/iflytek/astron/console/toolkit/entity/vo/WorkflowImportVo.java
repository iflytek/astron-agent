package com.iflytek.astron.console.toolkit.entity.vo;

import com.iflytek.astron.console.commons.entity.workflow.Workflow;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * Imported workflow response with non-breaking resource-resolution details.
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class WorkflowImportVo extends Workflow {
    private WorkflowImportReport importReport;
}
