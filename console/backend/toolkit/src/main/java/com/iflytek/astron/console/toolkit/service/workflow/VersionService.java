package com.iflytek.astron.console.toolkit.service.workflow;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.alibaba.fastjson2.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.entity.workflow.Workflow;
import com.iflytek.astron.console.commons.enums.bot.BotTypeEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.commons.service.data.UserLangChainDataService;
import com.iflytek.astron.console.commons.service.space.SpaceUserService;
import com.iflytek.astron.console.commons.util.space.SpaceInfoUtil;
import com.iflytek.astron.console.commons.util.WorkflowProtocolSanitizer;
import com.iflytek.astron.console.toolkit.common.constant.WorkflowConst;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.BizWorkflowData;
import com.iflytek.astron.console.toolkit.entity.core.workflow.FlowProtocol;
import com.iflytek.astron.console.toolkit.entity.dto.WorkflowReq;
import com.iflytek.astron.console.toolkit.entity.table.workflow.WorkflowConfig;
import com.iflytek.astron.console.toolkit.entity.table.workflow.WorkflowVersion;
import com.iflytek.astron.console.toolkit.handler.UserInfoManagerHandler;
import com.iflytek.astron.console.toolkit.mapper.workflow.*;
import com.iflytek.astron.console.toolkit.tool.DataPermissionCheckTool;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Remaining channel publishing metadata for migration scope 05.
 * Workflow snapshot creation, restore and execution now belong to Python workflows.
 *
 * @author VersionService Team
 * @since 1.0.0
 */
@Service
@Slf4j
public class VersionService {

    // workflow_version uses 1/2, unlike the boolean deletion flag on workflow.
    private static final long VERSION_ACTIVE = 1L;
    private static final long VERSION_DELETED = 2L;


    @Autowired
    DataPermissionCheckTool dataPermissionCheckTool;

    @Autowired
    SpaceUserService spaceUserService;

    @Autowired
    UserLangChainDataService userLangChainDataService;

    @Autowired
    WorkflowMapper workflowMapper;

    @Autowired
    WorkflowVersionMapper workflowVersionMapper;

    @Autowired
    private WorkflowConfigMapper workflowConfigMapper;

    @Value("${spring.profiles.active}")
    String env;

    private static final Random random = new Random();

    /**
     * Create workflow version with input parameters createDto: New parameters: String flowId flowId
     * String botId botId String name version name Long publishChannel workflow publish channel info
     * enum values 1: WeChat Official Account 2: Spark Desk 3: API 4: MCP String publishResult workflow
     * publish data 3 enum values: Success Failed Under Review String description workflow publish
     * description
     */
    // Exception database operation rollback

    private void assertWorkflowExecutionScope(
            Workflow workflow, String executionUid, Long executionSpaceId) {
        if (StringUtils.isBlank(executionUid)) {
            throw new BusinessException(ResponseEnum.INSUFFICIENT_PERMISSIONS);
        }
        if (executionSpaceId == null) {
            if (workflow.getSpaceId() != null
                    || !Objects.equals(workflow.getUid(), executionUid)) {
                throw new BusinessException(ResponseEnum.INSUFFICIENT_PERMISSIONS);
            }
            return;
        }
        if (!Objects.equals(workflow.getSpaceId(), executionSpaceId)
                || spaceUserService == null
                || spaceUserService.getRole(executionSpaceId, executionUid) == null) {
            throw new BusinessException(ResponseEnum.INSUFFICIENT_PERMISSIONS);
        }
    }

    private Workflow requireWorkflow(String flowId) {
        Workflow workflow = workflowMapper.selectOne(Wrappers.lambdaQuery(Workflow.class)
                .eq(Workflow::getFlowId, flowId)
                .eq(Workflow::getDeleted, false));
        if (workflow == null || Boolean.TRUE.equals(workflow.getDeleted())) {
            throw new BusinessException(ResponseEnum.WORKFLOW_NOT_EXIST);
        }
        return workflow;
    }

    /**
     * Update isVersion flag for all versions of a specific flowId. Sets all versions' isVersion to 2
     * (inactive) for the given flowId.
     *
     * @param flowId Flow ID to update versions for
     */
    public void updateIsVersionForFlowId(String flowId) {
        // Build update conditions
        LambdaUpdateWrapper<WorkflowVersion> updateWrapper = new LambdaUpdateWrapper<>();
        updateWrapper.eq(WorkflowVersion::getFlowId, flowId)
                .eq(WorkflowVersion::getIsVersion, 1)
                .set(WorkflowVersion::getIsVersion, 2);
        // Execute update
        workflowVersionMapper.update(null, updateWrapper);
    }

    /**
     * Extract the numeric part from version string (e.g., "Version V1.0" -> 1.0)
     *
     * @param version Version string to extract number from
     * @return Numeric value of the version, or 0.0 if no valid number found
     */
    private static double extractVersionNumber(String version) {
        Pattern pattern = Pattern.compile("v(\\d+\\.?\\d*)");
        Matcher matcher = pattern.matcher(version);
        if (matcher.find()) {
            return Double.parseDouble(matcher.group(1));
        }
        return 0.0;
    }

    /**
     * Get version name for creating new version. Determines the appropriate version name based on
     * workflow changes.
     *
     * @param createDto Version creation parameters
     * @return API result with suggested version name
     */
    public ApiResult<JSONObject> getVersionName(WorkflowVersion createDto) {
        return getVersionNameForSpace(createDto, SpaceInfoUtil.getSpaceId());
    }

    public ApiResult<JSONObject> getVersionNameForSpace(WorkflowVersion createDto, Long spaceId) {
        log.info(
                "Starting to get workflow version name, flowId={}, botId={}",
                createDto.getFlowId(),
                createDto.getBotId());
        Workflow workflow = requireWorkflow(createDto.getFlowId());
        dataPermissionCheckTool.checkWorkflowVisible(workflow, spaceId);
        return buildVersionName(createDto, workflow);
    }

    /**
     * Get a workflow version name for a bot-bound publish flow after the caller has already verified
     * bot publish permission and resolved the flowId from the bot binding.
     */
    public ApiResult<JSONObject> getVersionNameForBoundBotPublish(WorkflowVersion createDto) {
        log.info(
                "Starting to get workflow version name for bound bot publish, flowId={}, botId={}",
                createDto.getFlowId(),
                createDto.getBotId());
        Workflow workflow = requireWorkflow(createDto.getFlowId());
        return buildVersionName(createDto, workflow);
    }

    private ApiResult<JSONObject> buildVersionName(WorkflowVersion createDto, Workflow workflow) {
        try {
            // Get the maximum version integer
            WorkflowVersion workflowVersion = workflowVersionMapper.selectOne(Wrappers.lambdaQuery(WorkflowVersion.class)
                    .eq(WorkflowVersion::getFlowId, createDto.getFlowId())
                    .orderByDesc(WorkflowVersion::getCreatedTime)
                    .isNotNull(WorkflowVersion::getSysData)
                    .last("limit 1"));
            if (workflowVersion == null) {
                return ApiResult.success(new JSONObject()
                        .fluentPut("workflowVersionName", "v1.0"));
            }
            String data = workflowVersion.getData();
            String preAdvanceConfig = workflowVersion.getAdvancedConfig();
            String maxName = workflowVersion.getName();

            String name;
            String workflow_data = workflow.getData();
            // Compare the latest version of advanced configuration to see if there are any updates
            String advancedConfig = workflow.getAdvancedConfig();
            boolean configNoChange = true;
            if (Objects.equals(workflow.getType(), BotTypeEnum.TALK.getType())) {
                WorkflowConfig draftCfg = workflowConfigMapper.selectOne(new LambdaQueryWrapper<WorkflowConfig>()
                        .eq(WorkflowConfig::getFlowId, workflow.getFlowId())
                        .eq(WorkflowConfig::getVersionNum, "-1")
                        .eq(WorkflowConfig::getDeleted, false));
                String draftConfig = (draftCfg != null) ? draftCfg.getConfig() : null;

                List<WorkflowConfig> beforeVersionConfigList = workflowConfigMapper.selectList(new LambdaQueryWrapper<WorkflowConfig>()
                        .eq(WorkflowConfig::getFlowId, workflow.getFlowId())
                        .ne(WorkflowConfig::getVersionNum, "-1")
                        .eq(WorkflowConfig::getDeleted, false));
                Optional<WorkflowConfig> latestNonDraftCfgOpt = beforeVersionConfigList.stream()
                        .filter(cfg -> StrUtil.isNotBlank(cfg.getName()))
                        .filter(cfg -> extractVersionNumberSafely(cfg.getName()) > 0D)
                        .max(Comparator
                                .comparingDouble((WorkflowConfig cfg) -> extractVersionNumberSafely(cfg.getName()))
                                .thenComparing(WorkflowConfig::getUpdatedTime, Comparator.nullsLast(Date::compareTo)));

                // Compare draft configuration and historical configuration
                configNoChange = latestNonDraftCfgOpt
                        .map(WorkflowConfig::getConfig)
                        .map(latestCfg -> Objects.equals(latestCfg, draftConfig))
                        .orElse(false);
            }
            Boolean advanceConfigChange = Objects.equals(preAdvanceConfig, advancedConfig);
            Boolean dataNoChange = Objects.equals(workflow_data, data);
            boolean needBump = !(Boolean.TRUE.equals(dataNoChange) && Boolean.TRUE.equals(advanceConfigChange) && configNoChange);
            name = incrementVersion(maxName, needBump);
            return ApiResult.success(new JSONObject()
                    .fluentPut("workflowVersionName", name));
        } catch (Exception e) {
            throw new BusinessException(ResponseEnum.WORKFLOW_VERSION_GET_NAME_FAILED);
        }
    }

    private static double extractVersionNumberSafely(String versionName) {
        if (StrUtil.isBlank(versionName)) {
            return 0D;
        }
        try {
            return extractVersionNumber(versionName.toLowerCase(Locale.ROOT));
        } catch (Exception ignore) {
            return 0D;
        }
    }

    /**
     * Increment version number based on type.
     *
     * @param maxVersion Current maximum version
     * @param type Whether to increment (true) or keep same (false)
     * @return New version string
     */
    public static String incrementVersion(String maxVersion, Boolean type) {
        if (maxVersion == null) {
            return "v1.0";
        }

        double maxVersionNumber = extractVersionNumber(maxVersion);

        // Extract numeric part and add 1
        String incrementedNumber;
        if (type) {
            incrementedNumber = String.valueOf(maxVersionNumber + 1);
        } else {
            incrementedNumber = String.valueOf(maxVersionNumber);
        }
        return "v" + incrementedNumber;
    }

    /**
     * Generate unique version number using timestamp and random number. Creates a 19-digit version
     * number by combining current timestamp with a 6-digit random number.
     *
     * @return Generated version number string with maximum length of 19 digits
     */
    public static String generateVersionNumber() {
        // Get current timestamp in milliseconds
        long timestamp = System.currentTimeMillis();
        // Generate a 6-digit random number
        int randomNumber = random.nextInt(900000) + 100000;
        // Combine timestamp and random number, ensure total length is 19 digits
        String versionNumber = String.valueOf(timestamp) + String.valueOf(randomNumber);
        // If length exceeds 19 digits, truncate
        if (versionNumber.length() > 19) {
            versionNumber = versionNumber.substring(0, 19);
        }
        return versionNumber;
    }

    /**
     * Query publish results for a specific workflow version.
     *
     * @param flowId Flow ID to query
     * @param name Version name to query
     * @return List of publish results by channel
     */
    public Object publishResult(String flowId, String name) {
        log.info("Starting to query workflow version publish result, input workflow flowId: {}, version name: {}", flowId, name);
        // Security validation
        Workflow workflow = requireWorkflow(flowId);
        dataPermissionCheckTool.checkWorkflowVisible(workflow, SpaceInfoUtil.getSpaceId());

        List<WorkflowVersion> workflowVersions = workflowVersionMapper.selectList(
                Wrappers.lambdaQuery(WorkflowVersion.class)
                        .eq(WorkflowVersion::getFlowId, flowId)
                        .eq(WorkflowVersion::getDeleted, VERSION_ACTIVE)
                        .eq(WorkflowVersion::getName, name));
        List<Map<String, Object>> resultList = new ArrayList<>();
        Set<Long> addedChannels = new HashSet<>();
        for (WorkflowVersion version : workflowVersions) {
            Long publishChannel = version.getPublishChannel();
            if (!addedChannels.contains(publishChannel)) {
                Map<String, Object> map = new HashMap<>();
                map.put("publishChannel", publishChannel);
                map.put("publishResult", WorkflowConst.PublishResult.normalize(version.getPublishResult()));
                resultList.add(map);
                addedChannels.add(publishChannel);
            }
        }
        return ApiResult.success(resultList);
    }

    /**
     * Update channel publish result for a version.
     *
     * @param createDto Update parameters including result status
     * @return Update operation result
     */
    @Transactional
    public ApiResult<JSONObject> update_channel_result(WorkflowVersion createDto) {
        log.info(
                "Starting to update workflow version result, versionId={}, publishResult={}",
                createDto.getId(),
                createDto.getPublishResult());
        Workflow workflow = requireVersionUpdateWorkflow(createDto);
        assertWorkflowExecutionScope(
                workflow,
                UserInfoManagerHandler.getUserId(),
                SpaceInfoUtil.getSpaceId());
        return updateChannelResultAfterAuthorization(createDto);
    }

    /**
     * Updates a version result for the asynchronous bound-bot publish path. The caller must pass the
     * trusted user and space captured by the publish event; unlike the public API, this path never
     * depends on a servlet request context.
     */
    @Transactional
    public ApiResult<JSONObject> updateChannelResultForBoundBotPublish(
            WorkflowVersion createDto, String executionUid, Long executionSpaceId) {
        log.info(
                "Starting bound bot workflow version result update, versionId={}, flowId={}, publishResult={}",
                createDto.getId(),
                createDto.getFlowId(),
                createDto.getPublishResult());
        Workflow workflow = requireVersionUpdateWorkflow(createDto);
        assertWorkflowExecutionScope(workflow, executionUid, executionSpaceId);
        return updateChannelResultAfterAuthorization(createDto);
    }

    private Workflow requireVersionUpdateWorkflow(WorkflowVersion createDto) {
        if (createDto == null || createDto.getId() == null) {
            throw new BusinessException(ResponseEnum.WORKFLOW_VERSION_NOT_FOUND);
        }
        WorkflowVersion workflowVersion = workflowVersionMapper.selectOne(
                Wrappers.lambdaQuery(WorkflowVersion.class)
                        .eq(WorkflowVersion::getId, createDto.getId())
                        .eq(WorkflowVersion::getDeleted, VERSION_ACTIVE)
                        .last("limit 1"));
        if (workflowVersion == null
                || (StringUtils.isNotBlank(createDto.getFlowId())
                        && !StringUtils.equals(createDto.getFlowId(), workflowVersion.getFlowId()))) {
            log.warn("Active workflow version not found for result update: versionId={}, flowId={}",
                    createDto.getId(), createDto.getFlowId());
            throw new BusinessException(ResponseEnum.WORKFLOW_VERSION_NOT_FOUND);
        }
        createDto.setFlowId(workflowVersion.getFlowId());
        Workflow workflow = workflowMapper.selectOne(Wrappers.lambdaQuery(Workflow.class)
                .eq(Workflow::getFlowId, workflowVersion.getFlowId())
                .eq(Workflow::getDeleted, false)
                .last("limit 1"));
        if (workflow == null) {
            throw new BusinessException(ResponseEnum.WORKFLOW_NOT_EXIST);
        }
        return workflow;
    }

    private ApiResult<JSONObject> updateChannelResultAfterAuthorization(
            WorkflowVersion createDto) {
        try {
            LambdaUpdateWrapper<WorkflowVersion> updateWrapper = new LambdaUpdateWrapper<>();
            // Update flowId corresponding records, set isVersion to 2
            updateWrapper.eq(WorkflowVersion::getId, createDto.getId())
                    .eq(WorkflowVersion::getFlowId, createDto.getFlowId())
                    .eq(WorkflowVersion::getDeleted, VERSION_ACTIVE)
                    .set(WorkflowVersion::getPublishResult,
                            WorkflowConst.PublishResult.normalize(createDto.getPublishResult()))
                    .set(WorkflowVersion::getUpdatedTime, new Date());
            // Execute update
            if (workflowVersionMapper.update(null, updateWrapper) != 1) {
                throw new BusinessException(ResponseEnum.WORKFLOW_VERSION_PUBLISH_FAILED);
            }
            log.info("Workflow version publish result successful, version ID: {}, publish result: {}", createDto.getId(), createDto.getPublishResult());

            return ApiResult.success(new JSONObject());
        } catch (Exception e) {
            log.info("Workflow version publish result failed, failure reason: {}, version ID: {}, publish result: {}", e, createDto.getId(), createDto.getPublishResult());
            throw new BusinessException(ResponseEnum.WORKFLOW_VERSION_PUBLISH_FAILED);
        }
    }

    /**
     * Get maximum version for a specific bot.
     *
     * @param botId Bot ID to query maximum version for
     * @return API result with maximum version info
     */
    public ApiResult<JSONObject> getMaxVersion(String botId) {
        log.info("Querying workflow maximum version number, botId: {}", botId);

        try {
            Integer numericBotId = Integer.valueOf(botId);
            String flowId = userLangChainDataService.findFlowIdByBotId(numericBotId);
            if (StringUtils.isBlank(flowId)) {
                throw new BusinessException(ResponseEnum.WORKFLOW_NOT_EXIST);
            }
            Workflow workflow = requireWorkflow(flowId);
            dataPermissionCheckTool.checkWorkflowVisible(
                    workflow, SpaceInfoUtil.getSpaceId());
            // Query latest version (ordered by creation time descending)
            WorkflowVersion latestVersion = workflowVersionMapper.selectOne(
                    Wrappers.lambdaQuery(WorkflowVersion.class)
                            .eq(WorkflowVersion::getBotId, botId)
                            .eq(WorkflowVersion::getFlowId, flowId)
                            .eq(WorkflowVersion::getDeleted, VERSION_ACTIVE)
                            .in(WorkflowVersion::getPublishResult,
                                    WorkflowConst.PublishResult.SUCCESS,
                                    WorkflowConst.PublishResult.LEGACY_SUCCESS,
                                    WorkflowConst.PublishResult.LEGACY_SUCCESS_UPPER)
                            .orderByDesc(WorkflowVersion::getCreatedTime)
                            .last("LIMIT 1"));

            // Return result: if version exists return version name, if no version return "Draft Version"
            String versionDisplay = (latestVersion != null) ? latestVersion.getName() : "Draft Version";
            JSONObject workflowMaxVersion = new JSONObject().fluentPut("workflowMaxVersion", versionDisplay)
                    .fluentPut("versionNum", (latestVersion != null) ? latestVersion.getVersionNum() : "0");
            return ApiResult.success(workflowMaxVersion);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("Query workflow maximum version number exception, botId: {}", botId, e);
            throw new BusinessException(ResponseEnum.WORKFLOW_VERSION_GET_MAX_FAILED);
        }
    }
}
