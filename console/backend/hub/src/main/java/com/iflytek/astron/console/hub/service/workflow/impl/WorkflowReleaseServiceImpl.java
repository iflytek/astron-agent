package com.iflytek.astron.console.hub.service.workflow.impl;

import com.iflytek.astron.console.commons.enums.bot.ReleaseTypeEnum;
import com.iflytek.astron.console.commons.service.data.UserLangChainDataService;
import com.iflytek.astron.console.commons.mapper.bot.ChatBotApiMapper;
import com.iflytek.astron.console.commons.dto.bot.ChatBotApi;
import com.iflytek.astron.console.commons.util.MaasUtil;
import com.iflytek.astron.console.toolkit.common.constant.WorkflowConst;
import com.iflytek.astron.console.toolkit.entity.table.workflow.WorkflowVersion;
import com.iflytek.astron.console.toolkit.mapper.workflow.WorkflowVersionMapper;
import com.iflytek.astron.console.toolkit.service.workflow.VersionService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.iflytek.astron.console.hub.dto.workflow.WorkflowReleaseRequestDto;
import com.iflytek.astron.console.hub.dto.workflow.WorkflowReleaseResponseDto;
import com.iflytek.astron.console.hub.service.workflow.WorkflowReleaseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;

/**
 * Workflow release service implementation Simplified version: no approval process, direct publish
 * and sync
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WorkflowReleaseServiceImpl implements WorkflowReleaseService {

    private final UserLangChainDataService userLangChainDataService;
    private final WorkflowVersionMapper workflowVersionMapper;
    private final ChatBotApiMapper chatBotApiMapper;
    private final MaasUtil maasUtil;
    private final VersionService versionService;

    // MaaS appId configuration
    @Value("${maas.appId}")
    private String maasAppId;

    // Release status constants (reserved for future use)
    @SuppressWarnings("unused")
    private static final String RELEASE_SUCCESS = WorkflowConst.PublishResult.SUCCESS;
    @SuppressWarnings("unused")
    private static final String RELEASE_FAIL = WorkflowConst.PublishResult.FAILED;

    @Override
    public WorkflowReleaseResponseDto publishWorkflow(Integer botId, String uid, Long spaceId, String publishType) {
        log.info("Starting workflow bot publish: botId={}, uid={}, spaceId={}, publishType={}",
                botId, uid, spaceId, publishType);

        try {
            // 1. Get flowId
            String flowId = userLangChainDataService.findFlowIdByBotId(botId);
            if (!StringUtils.hasText(flowId)) {
                log.error("Failed to get flowId by botId: botId={}", botId);
                return createErrorResponse("Unable to get workflow ID");
            }

            // 2. Get version name for new release
            String versionName = getNextVersionName(flowId);
            if (!StringUtils.hasText(versionName)) {
                log.error("Failed to get version name by flowId: flowId={}", flowId);
                return createErrorResponse("Unable to get version name");
            }

            // 3. Check if version already exists
            // if (isVersionExists(botId, versionName)) {
            // log.info("Version already exists, skipping publish: botId={}, versionName={}", botId,
            // versionName);
            // return createSuccessResponse(null, versionName);
            // }

            // 4. Create workflow version record
            WorkflowReleaseRequestDto request = new WorkflowReleaseRequestDto();
            request.setBotId(botId.toString());
            request.setFlowId(flowId);
            request.setPublishChannel(getPublishChannelCode(publishType));
            request.setPublishResult(WorkflowConst.PublishResult.SUCCESS);
            request.setDescription("");
            request.setName(versionName);

            WorkflowReleaseResponseDto response = createWorkflowVersion(request);
            if (!response.getSuccess()) {
                return response;
            }

            // 5. Sync to API system directly (no approval needed)
            String appId;
            if (ReleaseTypeEnum.MARKET.name().equals(publishType)) {
                appId = maasAppId;
            } else {
                appId = getAppIdByBotId(botId);
            }
            syncToApiSystem(botId, flowId, versionName, appId);

            // 6. Update audit result to success
            updateAuditResult(response.getWorkflowVersionId(), WorkflowConst.PublishResult.SUCCESS);

            log.info("Workflow bot publish and sync successful: botId={}, versionId={}, versionName={}",
                    botId, response.getWorkflowVersionId(), response.getWorkflowVersionName());

            return response;

        } catch (Exception e) {
            log.error("Workflow bot publish failed: botId={}, uid={}, spaceId={}", botId, uid, spaceId, e);
            return createErrorResponse("Publish failed: " + e.getMessage());
        }
    }

    /**
     * Get next version name for workflow release Simplified to match old project logic exactly - no
     * fallback
     */
    private String getNextVersionName(String flowId) {
        log.info("Getting next workflow version name for bound bot publish: flowId={}", flowId);

        try {
            WorkflowVersion query = new WorkflowVersion();
            query.setFlowId(flowId);
            var response = versionService.getVersionNameForBoundBotPublish(query);
            if (response != null && response.code() == 0 && response.data() != null) {
                String versionName = response.data().getString("workflowVersionName");
                if (StringUtils.hasText(versionName)) {
                    log.info("Got version name from VersionService: {} for flowId: {}", versionName, flowId);
                    return versionName;
                }
            }
        } catch (Exception e) {
            log.error("Exception occurred while getting version name, flowId={}", flowId, e);
            return null;
        }

        return null;
    }

    /**
     * Check if a workflow version already exists for the given botId and versionName Reference: old
     * project's VersionService.getVersionSysData method
     */
    private boolean isVersionExists(Integer botId, String versionName) {
        log.info("Checking if version exists: botId={}, versionName={}", botId, versionName);

        try {
            // Query workflow_version table to check if version exists
            LambdaQueryWrapper<WorkflowVersion> queryWrapper = new LambdaQueryWrapper<WorkflowVersion>()
                    .eq(WorkflowVersion::getBotId, botId.toString()) // botId is stored as String in WorkflowVersion
                    .eq(WorkflowVersion::getName, versionName)
                    .last("LIMIT 1");

            WorkflowVersion existingVersion = workflowVersionMapper.selectOne(queryWrapper);

            boolean exists = existingVersion != null;
            log.debug("Version exists check result: botId={}, versionName={}, exists={}",
                    botId, versionName, exists);

            return exists;

        } catch (Exception e) {
            log.error("Failed to check if version exists: botId={}, versionName={}",
                    botId, versionName, e);
            // In case of error, assume version doesn't exist to allow creation
            return false;
        }
    }

    private WorkflowReleaseResponseDto createWorkflowVersion(WorkflowReleaseRequestDto request) {
        log.info("Creating workflow version: request={}", request);

        try {
            WorkflowVersion workflowVersion = new WorkflowVersion();
            workflowVersion.setBotId(request.getBotId());
            workflowVersion.setFlowId(request.getFlowId());
            workflowVersion.setPublishChannel(Long.valueOf(request.getPublishChannel()));
            workflowVersion.setPublishResult(request.getPublishResult());
            workflowVersion.setDescription(request.getDescription());
            workflowVersion.setName(request.getName());

            var response = versionService.createForBoundBotPublish(workflowVersion);
            JSONObject data = response == null ? null : response.data();
            if (response == null || response.code() != 0 || data == null) {
                return createErrorResponse("Invalid response data format");
            }

            WorkflowReleaseResponseDto result = new WorkflowReleaseResponseDto();
            result.setSuccess(true);
            result.setWorkflowVersionId(data.getLong("workflowVersionId"));
            result.setWorkflowVersionName(data.getString("workflowVersionName"));
            if (!StringUtils.hasText(result.getWorkflowVersionName())) {
                result.setWorkflowVersionName(request.getName());
            }

            log.info("Successfully created workflow version: versionId={}, versionName={}",
                    result.getWorkflowVersionId(), result.getWorkflowVersionName());
            return result;

        } catch (Exception e) {
            log.error("Exception occurred while creating workflow version: request={}", request, e);
            return createErrorResponse("Exception occurred while creating version: " + e.getMessage());
        }
    }

    private void syncToApiSystem(Integer botId, String flowId, String versionName, String appId) {
        log.info("Syncing workflow to API system: botId={}, flowId={}, versionName={}, appId={}",
                botId, flowId, versionName, appId);

        try {
            // 1. Get version system data
            JSONObject versionData = getVersionSysData(botId, versionName);
            if (versionData == null) {
                log.error("Failed to get version system data: botId={}, versionName={}", botId, versionName);
                throw new IllegalStateException("Failed to get version system data");
            }

            // 2. Use MaasUtil's createApi method to publish and bind
            maasUtil.createApi(flowId, appId, versionName, versionData);

            log.info("Successfully synced workflow to API system: botId={}, flowId={}, versionName={}", botId, flowId, versionName);

        } catch (Exception e) {
            log.error("Exception occurred while syncing workflow to API system: botId={}, flowId={}, versionName={}, appId={}",
                    botId, flowId, versionName, appId, e);
            throw e;
        }
    }

    /**
     * Get version system data from database
     */
    private JSONObject getVersionSysData(Integer botId, String versionName) {
        try {
            log.info("Getting version system data from database: botId={}, versionName={}", botId, versionName);

            // Query database for workflow version
            LambdaQueryWrapper<WorkflowVersion> queryWrapper = new LambdaQueryWrapper<WorkflowVersion>()
                    .eq(WorkflowVersion::getBotId, botId.toString())
                    .eq(WorkflowVersion::getName, versionName)
                    .last("LIMIT 1");

            WorkflowVersion workflowVersion = workflowVersionMapper.selectOne(queryWrapper);

            if (workflowVersion == null) {
                log.warn("Workflow version not found in database: botId={}, versionName={}", botId, versionName);
                return null;
            }

            String sysData = workflowVersion.getSysData();
            if (sysData != null && !sysData.trim().isEmpty()) {
                try {
                    JSONObject versionData = JSON.parseObject(sysData);
                    return versionData == null || versionData.isEmpty() ? null : versionData;
                } catch (Exception e) {
                    log.error("Failed to parse sysData JSON: botId={}, versionName={}, sysData={}",
                            botId, versionName, sysData, e);
                    return null;
                }
            }

            log.warn("SysData is empty for version: botId={}, versionName={}", botId, versionName);
            return null;

        } catch (Exception e) {
            log.error("Exception occurred while getting version system data: botId={}, versionName={}",
                    botId, versionName, e);
            return null;
        }
    }

    /**
     * Update audit result
     */
    private boolean updateAuditResult(Long versionId, String auditResult) {
        if (versionId == null) {
            log.warn("Version ID is null, skipping audit result update");
            return false;
        }

        try {
            log.info("Updating audit result: versionId={}, auditResult={}", versionId, auditResult);

            WorkflowVersion update = new WorkflowVersion();
            update.setId(versionId);
            update.setPublishResult(auditResult);
            var response = versionService.update_channel_result(update);
            if (response != null && response.code() == 0) {
                log.info("Successfully updated audit result: versionId={}, auditResult={}", versionId, auditResult);
                return true;
            }
            log.error("Failed to update audit result: versionId={}, auditResult={}", versionId, auditResult);
            return false;

        } catch (Exception e) {
            log.error("Exception occurred while updating audit result: versionId={}, auditResult={}",
                    versionId, auditResult, e);
            return false;
        }
    }

    /**
     * Get publish channel code
     */
    private Integer getPublishChannelCode(String publishType) {
        try {
            Integer typeCode = Integer.parseInt(publishType);
            // Direct return since ReleaseTypeEnum code is the channel code
            return typeCode;
        } catch (NumberFormatException e) {
            ReleaseTypeEnum releaseType = ReleaseTypeEnum.getByName(publishType);
            if (releaseType != null) {
                return releaseType.getCode();
            }
            log.warn("Invalid publish type format: {}", publishType);
            return ReleaseTypeEnum.MARKET.getCode();
        }
    }

    /**
     * Get appId by botId from chat_bot_api table, fallback to configured maas appId
     */
    private String getAppIdByBotId(Integer botId) {
        try {
            // Query chat_bot_api table to find appId for the given botId
            LambdaQueryWrapper<ChatBotApi> queryWrapper = new LambdaQueryWrapper<ChatBotApi>()
                    .eq(ChatBotApi::getBotId, botId)
                    .last("LIMIT 1");

            ChatBotApi chatBotApi = chatBotApiMapper.selectOne(queryWrapper);

            if (chatBotApi != null && chatBotApi.getAppId() != null) {
                log.debug("Found appId for botId {}: {}", botId, chatBotApi.getAppId());
                return chatBotApi.getAppId();
            } else {
                // Fallback to configured maas appId
                log.debug("No appId found for botId: {}, using configured maas appId: {}", botId, maasAppId);
                return maasAppId;
            }
        } catch (Exception e) {
            // Fallback to configured maas appId on error
            log.error("Failed to get appId for botId: {}, using configured maas appId: {}", botId, maasAppId, e);
            return maasAppId;
        }
    }

    /**
     * Create success response
     */
    private WorkflowReleaseResponseDto createSuccessResponse(Long versionId, String versionName) {
        WorkflowReleaseResponseDto response = new WorkflowReleaseResponseDto();
        response.setSuccess(true);
        response.setWorkflowVersionId(versionId);
        response.setWorkflowVersionName(versionName);
        return response;
    }

    /**
     * Create error response
     */
    private WorkflowReleaseResponseDto createErrorResponse(String errorMessage) {
        WorkflowReleaseResponseDto response = new WorkflowReleaseResponseDto();
        response.setSuccess(false);
        response.setErrorMessage(errorMessage);
        return response;
    }
}
