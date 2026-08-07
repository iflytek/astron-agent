package com.iflytek.astron.console.hub.service.publish.impl;

import cn.hutool.core.util.StrUtil;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.enums.bot.ReleaseTypeEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.commons.service.data.UserLangChainDataService;
import com.iflytek.astron.console.hub.service.publish.ReleaseManageClientService;
import com.iflytek.astron.console.toolkit.common.constant.WorkflowConst;
import com.iflytek.astron.console.toolkit.entity.table.workflow.WorkflowVersion;
import com.iflytek.astron.console.toolkit.service.workflow.VersionService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * @author yun-zhi-ztl
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class ReleaseManageClientServiceImpl implements ReleaseManageClientService {

    private final UserLangChainDataService userLangChainDataService;
    private final VersionService versionService;

    private static final String RELEASE_SUCCESS = WorkflowConst.PublishResult.SUCCESS;

    @Override
    public String getVersionNameByBotId(Long botId, Long spaceId, HttpServletRequest request) {
        String flowId = userLangChainDataService.findFlowIdByBotId(botId.intValue());
        if (StrUtil.isBlank(flowId)) {
            log.error("getVersionNameByBotId - Failed to get flowId by botId, botId={}", botId);
            throw new BusinessException(ResponseEnum.WORKFLOW_VERSION_GET_NAME_FAILED);
        }

        WorkflowVersion query = new WorkflowVersion();
        query.setFlowId(flowId);
        ApiResult<JSONObject> response = versionService.getVersionNameForBoundBotPublish(query);
        JSONObject data = response == null ? null : response.data();
        String versionName = data == null ? null : data.getString("workflowVersionName");
        if (response == null || response.code() != 0 || StrUtil.isBlank(versionName)) {
            log.error("getVersionNameByBotId - Failed to get version name, botId={}, flowId={}, spaceId={}",
                    botId, flowId, spaceId);
            throw new BusinessException(ResponseEnum.WORKFLOW_VERSION_GET_NAME_FAILED);
        }
        return versionName;
    }

    @Override
    public void releaseBotApi(Integer botId, String flowId, String versionName, Long spaceId, HttpServletRequest request) {
        if (botId == null || StrUtil.isBlank(flowId) || StrUtil.isBlank(versionName)) {
            throw new BusinessException(ResponseEnum.WORKFLOW_VERSION_PUBLISH_FAILED);
        }
        String boundFlowId = userLangChainDataService.findFlowIdByBotId(botId);
        if (!StrUtil.equals(boundFlowId, flowId)) {
            log.error("releaseBotApi - FlowId does not match bot binding, botId={}, flowId={}, boundFlowId={}",
                    botId, flowId, boundFlowId);
            throw new BusinessException(ResponseEnum.WORKFLOW_VERSION_PUBLISH_FAILED);
        }

        WorkflowVersion workflowVersion = new WorkflowVersion();
        workflowVersion.setBotId(botId.toString());
        workflowVersion.setFlowId(flowId);
        workflowVersion.setPublishChannel(Long.valueOf(ReleaseTypeEnum.BOT_API.getCode()));
        workflowVersion.setPublishResult(RELEASE_SUCCESS);
        workflowVersion.setDescription("");
        workflowVersion.setName(versionName);

        ApiResult<JSONObject> response = versionService.createForBoundBotPublish(workflowVersion);
        if (response == null || response.code() != 0 || response.data() == null) {
            log.error("releaseBotApi - Failed to create workflow version, botId={}, flowId={}, versionName={}, spaceId={}",
                    botId, flowId, versionName, spaceId);
            throw new BusinessException(ResponseEnum.WORKFLOW_VERSION_PUBLISH_FAILED);
        }
    }
}
