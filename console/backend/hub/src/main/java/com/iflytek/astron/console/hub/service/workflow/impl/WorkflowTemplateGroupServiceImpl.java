package com.iflytek.astron.console.hub.service.workflow.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.iflytek.astron.console.commons.entity.bot.BotTypeList;
import com.iflytek.astron.console.commons.service.bot.BotTypeListService;
import com.iflytek.astron.console.commons.util.space.SpaceInfoUtil;
import com.iflytek.astron.console.hub.entity.WorkflowTemplateGroup;
import com.iflytek.astron.console.hub.entity.maas.ExportedWorkflowTemplate;
import com.iflytek.astron.console.hub.mapper.ExportedWorkflowTemplateMapper;
import com.iflytek.astron.console.hub.service.workflow.WorkflowTemplateGroupService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * @author cherry
 */
@Service
public class WorkflowTemplateGroupServiceImpl implements WorkflowTemplateGroupService {
    @Autowired
    private ExportedWorkflowTemplateMapper exportedWorkflowTemplateMapper;

    @Autowired
    private BotTypeListService botTypeListService;

    @Override
    public List<WorkflowTemplateGroup> getTemplateGroup() {
        LambdaQueryWrapper<ExportedWorkflowTemplate> templateQueryWrapper = new LambdaQueryWrapper<>();
        templateQueryWrapper.eq(ExportedWorkflowTemplate::getIsDelete, 0)
                .isNotNull(ExportedWorkflowTemplate::getGroupId);
        withSpaceScope(templateQueryWrapper);

        Set<Integer> usedGroupIds = exportedWorkflowTemplateMapper.selectList(templateQueryWrapper)
                .stream()
                .map(ExportedWorkflowTemplate::getGroupId)
                .filter(groupId -> groupId != null)
                .map(Long::intValue)
                .collect(Collectors.toSet());
        if (usedGroupIds.isEmpty()) {
            return Collections.emptyList();
        }

        return botTypeListService.getBotTypeList()
                .stream()
                .filter(botType -> usedGroupIds.contains(botType.getTypeKey()))
                .map(this::toWorkflowTemplateGroup)
                .sorted(Comparator.comparing(WorkflowTemplateGroup::getSortIndex, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
    }

    private WorkflowTemplateGroup toWorkflowTemplateGroup(BotTypeList botType) {
        WorkflowTemplateGroup group = new WorkflowTemplateGroup();
        group.setId(botType.getTypeKey());
        group.setGroupName(botType.getTypeName());
        group.setGroupNameEn(botType.getTypeNameEn());
        group.setSortIndex(botType.getOrderNum());
        group.setIsDelete(0);
        return group;
    }

    private LambdaQueryWrapper<ExportedWorkflowTemplate> withSpaceScope(LambdaQueryWrapper<ExportedWorkflowTemplate> queryWrapper) {
        Long spaceId = SpaceInfoUtil.getSpaceId();
        if (spaceId == null) {
            queryWrapper.isNull(ExportedWorkflowTemplate::getSpaceId);
        } else {
            queryWrapper.eq(ExportedWorkflowTemplate::getSpaceId, spaceId);
        }
        return queryWrapper;
    }
}
