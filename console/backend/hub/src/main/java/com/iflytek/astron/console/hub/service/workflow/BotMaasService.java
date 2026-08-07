package com.iflytek.astron.console.hub.service.workflow;


import com.iflytek.astron.console.commons.dto.bot.BotInfoDto;
import com.iflytek.astron.console.commons.dto.workflow.CloneSynchronize;
import com.iflytek.astron.console.hub.entity.maas.MaasDuplicate;
import com.iflytek.astron.console.hub.entity.maas.MaasTemplate;
import com.iflytek.astron.console.hub.entity.maas.WorkflowTemplateExportRequest;
import com.iflytek.astron.console.hub.entity.maas.WorkflowTemplateQueryDto;
import jakarta.servlet.http.HttpServletRequest;

import java.util.List;


public interface BotMaasService {
    BotInfoDto createFromTemplate(String uid, MaasDuplicate massDuplicate, HttpServletRequest request);

    Integer maasCopySynchronize(CloneSynchronize synchronize);

    List<MaasTemplate> templateList(WorkflowTemplateQueryDto queryDto);

    MaasTemplate exportTemplate(String uid, WorkflowTemplateExportRequest exportRequest);

    void deleteTemplate(String uid, Long templateId);
}
