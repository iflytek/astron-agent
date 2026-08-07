package com.iflytek.astron.console.toolkit.service.workflow;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.iflytek.astron.console.commons.service.workflow.WorkflowVersionLookupService;
import com.iflytek.astron.console.toolkit.common.constant.WorkflowConst;
import com.iflytek.astron.console.toolkit.entity.table.workflow.WorkflowVersion;
import com.iflytek.astron.console.toolkit.mapper.workflow.WorkflowVersionMapper;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class WorkflowVersionLookupServiceImpl implements WorkflowVersionLookupService {

    private final WorkflowVersionMapper workflowVersionMapper;

    @Override
    public Optional<String> findLatestSuccessfulVersionName(Integer botId) {
        if (botId == null) {
            return Optional.empty();
        }
        WorkflowVersion latestVersion = workflowVersionMapper.selectOne(
                Wrappers.lambdaQuery(WorkflowVersion.class)
                        .eq(WorkflowVersion::getBotId, String.valueOf(botId))
                        .in(WorkflowVersion::getPublishResult,
                                WorkflowConst.PublishResult.SUCCESS,
                                WorkflowConst.PublishResult.LEGACY_SUCCESS,
                                WorkflowConst.PublishResult.LEGACY_SUCCESS_UPPER)
                        .orderByDesc(WorkflowVersion::getCreatedTime)
                        .last("LIMIT 1"));
        return latestVersion == null || StringUtils.isBlank(latestVersion.getName())
                ? Optional.empty()
                : Optional.of(latestVersion.getName());
    }

    @Override
    public Optional<Boolean> isPublishedVersion(String flowId, String versionName) {
        if (StringUtils.isBlank(flowId) || StringUtils.isBlank(versionName)) {
            return Optional.empty();
        }
        WorkflowVersion workflowVersion = workflowVersionMapper.selectOne(
                Wrappers.lambdaQuery(WorkflowVersion.class)
                        .eq(WorkflowVersion::getFlowId, flowId)
                        .eq(WorkflowVersion::getName, versionName)
                        .orderByDesc(WorkflowVersion::getCreatedTime)
                        .last("LIMIT 1"));
        return workflowVersion == null
                ? Optional.empty()
                : Optional.of(WorkflowConst.PublishResult.isSuccess(workflowVersion.getPublishResult()));
    }
}
