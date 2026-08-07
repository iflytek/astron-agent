package com.iflytek.astron.console.toolkit.service.openapi.impl;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.dto.bot.ChatBotApi;
import com.iflytek.astron.console.commons.entity.workflow.Workflow;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.mapper.bot.ChatBotApiMapper;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.BizWorkflowData;
import com.iflytek.astron.console.toolkit.entity.dto.external.AppInfoResponse;
import com.iflytek.astron.console.toolkit.entity.dto.openapi.WorkflowIoTransRequest;
import com.iflytek.astron.console.toolkit.service.external.ExternalApiService;
import com.iflytek.astron.console.toolkit.service.openapi.OpenApiService;
import com.iflytek.astron.console.toolkit.service.workflow.WorkflowService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

/**
 * Open API Service Implementation
 */
@Service
@Slf4j
public class OpenApiServiceImpl implements OpenApiService {

    @Autowired
    private ExternalApiService externalApiService;

    @Autowired
    private WorkflowService workflowService;

    @Autowired
    private ChatBotApiMapper chatBotApiMapper;

    @Override
    public List<JSONObject> getWorkflowIoTransformations(WorkflowIoTransRequest request) {
        try {
            String appId = getAppIdByApiKey(request.getApiKey());

            if (!StringUtils.hasText(appId)) {
                log.error("appId is empty, apiKey:{}", request.getApiKey());
                throw new BusinessException(ResponseEnum.UNAUTHORIZED);
            }

            // String appId = "663777f0";

            List<ChatBotApi> chatBotApiList = getChatBotApiByAppId(appId);

            if (chatBotApiList.isEmpty()) {
                log.info("No ChatBotApi records found for appId: {}", appId);
                return null;
            }

            return processWorkflowTransformations(chatBotApiList);

        } catch (BusinessException e) {
            log.error("Business error in getWorkflowIoTransformations: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error in getWorkflowIoTransformations", e);
            throw new BusinessException(ResponseEnum.INTERNAL_SERVER_ERROR);
        }
    }

    private List<ChatBotApi> getChatBotApiByAppId(String appId) {
        LambdaQueryWrapper<ChatBotApi> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(ChatBotApi::getAppId, appId);
        return chatBotApiMapper.selectList(queryWrapper);
    }

    /**
     * Get appId by calling external API with apiKey
     */
    private String getAppIdByApiKey(String apiKey) {
        AppInfoResponse appInfoResponse = externalApiService.getAppInfoByApiKey(apiKey);
        if (appInfoResponse.getCode() != 0 || appInfoResponse.getData() == null) {
            log.error("Failed to get app info from external API: code={}, message={}",
                    appInfoResponse.getCode(), appInfoResponse.getMessage());
            throw new BusinessException(ResponseEnum.DATA_NOT_FOUND);
        }

        String appId = appInfoResponse.getData().getAppid();
        log.info("Successfully retrieved appId: {} for apiKey: {}", appId, apiKey);
        return appId;
    }

    /**
     * Process workflow transformations for all ChatBotApi records
     */
    private List<JSONObject> processWorkflowTransformations(List<ChatBotApi> chatBotApiList) {

        List<String> workflowIds = chatBotApiList.stream()
                .map(ChatBotApi::getAssistantId)
                .filter(StringUtils::hasText)
                .toList();

        if (workflowIds.isEmpty()) {
            return new ArrayList<>();
        }

        List<Workflow> workflowList = getWorkflowsById(workflowIds);

        return processWorkflowList(workflowList);
    }

    /**
     *
     */
    private List<Workflow> getWorkflowsById(List<String> workflowIds) {
        LambdaQueryWrapper<Workflow> workflowQueryWrapper = new LambdaQueryWrapper<>();
        workflowQueryWrapper.in(Workflow::getFlowId, workflowIds)
                .eq(Workflow::getDeleted, false);

        return workflowService.list(workflowQueryWrapper);
    }

    /**
     * Process a list of workflows to extract IO transformations
     */
    private List<JSONObject> processWorkflowList(List<Workflow> workflows) {
        List<JSONObject> results = new ArrayList<>();

        for (Workflow workflow : workflows) {
            JSONObject transformation = processSingleWorkflow(workflow);
            if (transformation != null) {
                results.add(transformation);
            }
        }

        return results;
    }

    /**
     * Process a single workflow to extract IO transformation
     */
    private JSONObject processSingleWorkflow(Workflow workflow) {
        if (!StringUtils.hasText(workflow.getData())) {
            return null;
        }

        try {
            BizWorkflowData bizWorkflowData = JSON.parseObject(workflow.getData(), BizWorkflowData.class);
            if (bizWorkflowData == null || bizWorkflowData.getNodes() == null) {
                return null;
            }

            JSONObject ioTransformation = workflowService.getIoTrans(bizWorkflowData.getNodes());
            if (ioTransformation != null) {
                enrichTransformationWithMetadata(ioTransformation, workflow);
            }

            return ioTransformation;
        } catch (Exception e) {
            log.error("Error processing workflow data for workflow id: {}", workflow.getId(), e);
            return null;
        }
    }

    /**
     * Add workflow metadata to transformation object
     */
    private void enrichTransformationWithMetadata(JSONObject transformation, Workflow workflow) {
        transformation.put("workflowId", workflow.getId());
        transformation.put("workflowName", workflow.getName());
        transformation.put("workDescription", workflow.getDescription());
        transformation.put("uid", workflow.getUid());
        transformation.put("spaceId", workflow.getSpaceId());
        transformation.put("createTime", workflow.getCreateTime());
        transformation.put("updateTime", workflow.getUpdateTime());
    }

}
