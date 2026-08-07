package com.iflytek.astron.console.hub.service.workflow;

import com.iflytek.astron.console.hub.entity.maas.WorkflowSkillExportRequest;
import com.iflytek.astron.console.hub.entity.maas.WorkflowSkillExportResponse;

public interface WorkflowSkillExportService {
    WorkflowSkillExportResponse exportSkill(WorkflowSkillExportRequest request);
}
