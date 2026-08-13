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
import com.iflytek.astron.console.commons.service.space.SpaceUserService;
import com.iflytek.astron.console.commons.util.space.SpaceInfoUtil;
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
 * Version service for managing workflow versions. Handles workflow version creation, listing,
 * restoration, and lifecycle management. Provides version comparison and publishing capabilities.
 *
 * @author VersionService Team
 * @since 1.0.0
 */
@Service
@Slf4j
public class VersionService {

    @Autowired
    WorkflowService workflowService;

    @Autowired
    DataPermissionCheckTool dataPermissionCheckTool;

    @Autowired
    SpaceUserService spaceUserService;

    @Autowired
    WorkflowMapper workflowMapper;

    @Autowired
    WorkflowVersionMapper workflowVersionMapper;

    @Autowired
    private WorkflowConfigMapper workflowConfigMapper;


    @Value("${spring.profiles.active}")
    String env;

    private static final Random random = new Random();

    public Object listPage(Page<WorkflowVersion> page, String flowId) {
        Page<WorkflowVersion> newPage = new Page<>(page.getCurrent(), page.getSize());
        Workflow workflow = workflowMapper.selectOne(Wrappers.lambdaQuery(Workflow.class).eq(Workflow::getFlowId, flowId));
        if (workflow == null) {
            throw new BusinessException(ResponseEnum.WORKFLOW_NOT_EXIST);
        }
        dataPermissionCheckTool.checkWorkflowBelong(workflow, SpaceInfoUtil.getSpaceId());
        Page<WorkflowVersion> result = workflowVersionMapper.selectPageByCondition(newPage, flowId);
        setAgentConfig(null, flowId, result);
        return result;
    }

    public Object list_botId_Page(Page<WorkflowVersion> page, String botId) {
        Page<WorkflowVersion> workflowVersionIPage = workflowVersionMapper.selectPageLatestByName(page, botId);
        setAgentConfig(botId, null, workflowVersionIPage);
        return workflowVersionIPage;
    }

    private void setAgentConfig(String botId, String flowIdStr, Page<WorkflowVersion> workflowVersionPage) {
        // get WorkflowConfig
        Map<String, String> cfgByVersion = Collections.emptyMap();
        try {
            List<WorkflowConfig> workflowConfigs = new ArrayList<>();
            if (StringUtils.isNotBlank(botId)) {
                Integer botIdInt = Integer.parseInt(botId);
                workflowConfigs = workflowConfigMapper.selectList(
                        Wrappers.<WorkflowConfig>lambdaQuery()
                                .eq(WorkflowConfig::getBotId, botIdInt)
                                .eq(WorkflowConfig::getDeleted, false));
            }
            if (StringUtils.isNotBlank(flowIdStr)) {
                workflowConfigs = workflowConfigMapper.selectList(
                        Wrappers.<WorkflowConfig>lambdaQuery()
                                .eq(WorkflowConfig::getFlowId, flowIdStr)
                                .eq(WorkflowConfig::getDeleted, false));
            }

            if (CollUtil.isNotEmpty(workflowConfigs)) {
                cfgByVersion = workflowConfigs.stream()
                        .filter(cfg -> cfg.getVersionNum() != null)
                        .collect(Collectors.toMap(
                                WorkflowConfig::getVersionNum,
                                WorkflowConfig::getConfig,
                                (exist, replace) -> exist));
            }
        } catch (NumberFormatException ignore) {
            // When botId is not a number, the voice intelligent agent configuration query is skipped;
            log.warn("pase error e= ", ignore);
        }

        String flowId = null;
        if (StringUtils.isNotBlank(flowIdStr)) {
            flowId = flowIdStr;
        } else {
            if (CollUtil.isNotEmpty(workflowVersionPage.getRecords())) {
                flowId = workflowVersionPage.getRecords().get(0).getFlowId();
            }
        }

        String advancedConfig = null;
        if (StrUtil.isNotBlank(flowId)) {
            Workflow flow = workflowMapper.selectOne(
                    Wrappers.<Workflow>lambdaQuery().eq(Workflow::getFlowId, flowId));
            if (flow != null) {
                advancedConfig = flow.getAdvancedConfig();
            }
        }

        for (WorkflowVersion record : workflowVersionPage.getRecords()) {
            record.setFlowConfig(cfgByVersion.get(record.getVersionNum()));
            if (record.getAdvancedConfig() == null) {
                record.setAdvancedConfig(advancedConfig);
            }
        }
    }

    /**
     * Create workflow version with input parameters createDto: New parameters: String flowId flowId
     * String botId botId String name version name Long publishChannel workflow publish channel info
     * enum values 1: WeChat Official Account 2: Spark Desk 3: API 4: MCP String publishResult workflow
     * publish data 3 enum values: Success Failed Under Review String description workflow publish
     * description
     */
    // Exception database operation rollback
    @Transactional
    public ApiResult<JSONObject> create(WorkflowVersion createDto) {
        return createForSpace(createDto, SpaceInfoUtil.getSpaceId());
    }

    @Transactional
    public ApiResult<JSONObject> createForSpace(WorkflowVersion createDto, Long spaceId) {
        log.info("Starting to add version, input data: {}", createDto);
        String executionUid = UserInfoManagerHandler.getUserId();
        Workflow workflow = requireWorkflow(createDto.getFlowId());
        assertWorkflowExecutionScope(workflow, executionUid, spaceId);
        return createVersion(createDto, workflow, executionUid, spaceId);
    }

    /**
     * Create a workflow version for a bot-bound publish flow after the caller has already verified bot
     * publish permission and resolved the flowId from the bot binding.
     */
    @Transactional
    public ApiResult<JSONObject> createForBoundBotPublish(WorkflowVersion createDto) {
        return createForBoundBotPublish(
                createDto,
                UserInfoManagerHandler.getUserId(),
                SpaceInfoUtil.getSpaceId());
    }

    @Transactional
    public ApiResult<JSONObject> createForBoundBotPublish(
            WorkflowVersion createDto, String executionUid, Long executionSpaceId) {
        log.info("Starting to add version for bound bot publish, input data: {}", createDto);
        Workflow workflow = requireWorkflow(createDto.getFlowId());
        assertWorkflowExecutionScope(workflow, executionUid, executionSpaceId);
        return createVersion(createDto, workflow, executionUid, executionSpaceId);
    }

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

    private ApiResult<JSONObject> createVersion(
            WorkflowVersion createDto, Workflow workflow, String executionUid, Long executionSpaceId) {
        try {
            // Create workflow version
            WorkflowVersion workflowVersion = new WorkflowVersion();

            // Set version number
            String versionNum = generateVersionNumber();

            // Get core test protocol
            WorkflowReq workflowReq = new WorkflowReq();
            workflowReq.setId(workflow.getId());
            workflowReq.setName(workflow.getName());
            workflowReq.setDescription(workflow.getDescription());
            workflowReq.setData(JSONObject.parseObject(workflow.getData(), BizWorkflowData.class));
            FlowProtocol flowProtocol = workflowService.buildWorkflowData(
                    workflowReq, createDto.getFlowId(), executionUid, executionSpaceId);

            // Only mutate version state after the authoritative workflow build validation succeeds.
            updateIsVersionForFlowId(createDto.getFlowId());

            // Data setting
            workflowVersion.setBotId(createDto.getBotId());
            workflowVersion.setVersionNum(versionNum);
            workflowVersion.setName(createDto.getName());
            workflowVersion.setData(workflow.getData());
            workflowVersion.setSysData(JSONObject.toJSONString(flowProtocol));
            workflowVersion.setPublishChannel(createDto.getPublishChannel());
            workflowVersion.setPublishResult(WorkflowConst.PublishResult.normalize(createDto.getPublishResult()));
            workflowVersion.setFlowId(createDto.getFlowId());
            workflowVersion.setDescription(createDto.getDescription());
            // Set advanced configuration information
            workflowVersion.setAdvancedConfig(workflow.getAdvancedConfig());
            // Determine whether it is a voice intelligent agent
            if (Objects.equals(workflow.getType(), BotTypeEnum.TALK.getType())) {
                WorkflowConfig workflowConfig = workflowConfigMapper.selectOne(new LambdaQueryWrapper<WorkflowConfig>()
                        .eq(WorkflowConfig::getFlowId, workflow.getFlowId())
                        .eq(WorkflowConfig::getVersionNum, "-1")
                        .eq(WorkflowConfig::getDeleted, false));
                WorkflowConfig latestConfig = workflowConfigMapper.selectOne(new LambdaQueryWrapper<WorkflowConfig>()
                        .eq(WorkflowConfig::getFlowId, workflow.getFlowId())
                        .eq(WorkflowConfig::getName, createDto.getName())
                        .eq(WorkflowConfig::getDeleted, false)
                        .orderByDesc(WorkflowConfig::getUpdatedTime)
                        .last("limit 1"));
                if (latestConfig != null) {
                    latestConfig.setConfig(workflowConfig.getConfig());
                    workflowConfigMapper.updateById(workflowConfig);
                } else {
                    workflowConfig.setVersionNum(versionNum);
                    workflowConfig.setId(null);
                    workflowConfig.setName(createDto.getName());
                    workflowConfigMapper.insert(workflowConfig);
                }

            }
            workflowVersionMapper.insert(workflowVersion);

            return ApiResult.success(new JSONObject()
                    .fluentPut("workflowVersionId", workflowVersion.getId())
                    .fluentPut("workflowVersionName", createDto.getName()));
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException(ResponseEnum.WORKFLOW_VERSION_ADD_FAILED);
        }
        //
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
        log.info("Starting to get workflow version name, input data: {}", createDto);
        Workflow workflow = requireWorkflow(createDto.getFlowId());
        dataPermissionCheckTool.checkWorkflowBelong(workflow, spaceId);
        return buildVersionName(createDto, workflow);
    }

    /**
     * Get a workflow version name for a bot-bound publish flow after the caller has already verified
     * bot publish permission and resolved the flowId from the bot binding.
     */
    public ApiResult<JSONObject> getVersionNameForBoundBotPublish(WorkflowVersion createDto) {
        log.info("Starting to get workflow version name for bound bot publish, input data: {}", createDto);
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
     * Get system data for a specific version.
     *
     * @param createDto Version query parameters
     * @return API result with system data
     */
    public ApiResult<JSONObject> getVersionSysData(WorkflowVersion createDto) {
        WorkflowVersion workflowVersion = workflowVersionMapper.selectOne(Wrappers.lambdaQuery(WorkflowVersion.class)
                .eq(WorkflowVersion::getBotId, createDto.getBotId())
                .eq(WorkflowVersion::getName, createDto.getName())
                .last("limit 1"));
        if (workflowVersion == null) {
            throw new BusinessException(ResponseEnum.WORKFLOW_VERSION_NOT_FOUND);
        }
        String sysData = workflowVersion.getSysData();
        return ApiResult.success(new JSONObject()
                .fluentPut("sysData", sysData));
    }

    /**
     * Check if version has system data.
     *
     * @param createDto Version check parameters
     * @return API result with availability flag
     */
    public ApiResult<JSONObject> haveVersionSysData(WorkflowVersion createDto) {
        List<WorkflowVersion> workflowVersions = workflowVersionMapper.selectList(Wrappers.lambdaQuery(WorkflowVersion.class)
                .eq(WorkflowVersion::getFlowId, createDto.getFlowId())
                .eq(WorkflowVersion::getName, createDto.getName()));
        if (workflowVersions.isEmpty()) {
            throw new BusinessException(ResponseEnum.WORKFLOW_VERSION_NOT_FOUND);
        }
        boolean haveSysData = workflowVersions.stream()
                .noneMatch(wv -> WorkflowConst.PublishResult.isSuccess(wv.getPublishResult()));
        return ApiResult.success(new JSONObject()
                .fluentPut("haveSysData", haveSysData));
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
     * Restore a specific version as the current version. Updates workflow with the selected version's
     * data and marks it as active.
     *
     * @param createDto Restore version parameters
     * @return API result of restoration operation
     */
    @Transactional
    public ApiResult<JSONObject> restore(WorkflowVersion createDto) {
        log.info("Starting to restore version, input data: {}", createDto);
        Workflow workflow = workflowMapper.selectOne(Wrappers.lambdaQuery(Workflow.class).eq(Workflow::getFlowId, createDto.getFlowId()));
        if (workflow == null) {
            throw new BusinessException(ResponseEnum.WORKFLOW_NOT_EXIST);
        }
        dataPermissionCheckTool.checkWorkflowBelong(workflow, SpaceInfoUtil.getSpaceId());

        // Restore version functionality: 1: First update the version protocol to the workflow protocol 2:
        // Set all other versions' isVersion to 2 for flowId, then set the current passed version id to 1.
        try {
            // Get version protocol data
            WorkflowVersion workflowVersion = workflowVersionMapper.selectOne(Wrappers.lambdaQuery(WorkflowVersion.class).eq(WorkflowVersion::getId, createDto.getId()));
            String data = workflowVersion.getData();
            // Update workflow table protocol data
            updateFlowIdWorkflow(createDto.getFlowId(), data);

            LambdaUpdateWrapper<WorkflowVersion> updateWrapper1 = new LambdaUpdateWrapper<>();
            // Update flowId corresponding records, set isVersion to 2
            updateWrapper1.eq(WorkflowVersion::getFlowId, createDto.getFlowId())
                    .set(WorkflowVersion::getIsVersion, 2);
            // Execute update
            workflowVersionMapper.update(null, updateWrapper1);


            LambdaUpdateWrapper<WorkflowVersion> updateWrapper2 = new LambdaUpdateWrapper<>();
            // Update id corresponding records, set isVersion to 1
            updateWrapper2
                    .eq(WorkflowVersion::getId, createDto.getId())
                    .set(WorkflowVersion::getIsVersion, 1);
            // Execute update
            workflowVersionMapper.update(null, updateWrapper2);

            return ApiResult.success(new JSONObject());
        } catch (Exception e) {
            throw new BusinessException(ResponseEnum.WORKFLOW_VERSION_REDUCTION_FAILED);
        }
    }

    /**
     * Update workflow data for a specific flowId.
     *
     * @param flowId Flow ID to update
     * @param data New workflow data
     */
    public void updateFlowIdWorkflow(String flowId, String data) {
        // Build update conditions
        LambdaUpdateWrapper<Workflow> updateWrapper = new LambdaUpdateWrapper<>();
        updateWrapper.eq(Workflow::getFlowId, flowId)
                .set(Workflow::getData, data)
                .set(Workflow::getCanPublish, false);
        // Execute update
        workflowMapper.update(null, updateWrapper);
    }

    /**
     * Logical delete of a workflow version. Marks version as deleted rather than physical deletion.
     *
     * @param id Version ID to delete
     * @return Delete operation result
     */
    public Object logicDelete(Long id) {
        // Security validation
        WorkflowVersion workflowVersion = workflowVersionMapper.selectOne(Wrappers.lambdaQuery(WorkflowVersion.class).eq(WorkflowVersion::getId, id));
        String flowId = workflowVersion.getFlowId();
        Workflow workflow = workflowMapper.selectOne(Wrappers.lambdaQuery(Workflow.class).eq(Workflow::getFlowId, flowId));
        if (workflow == null) {
            throw new BusinessException(ResponseEnum.WORKFLOW_NOT_EXIST);
        }
        dataPermissionCheckTool.checkWorkflowBelong(workflow, SpaceInfoUtil.getSpaceId());

        LambdaUpdateWrapper<WorkflowVersion> updateWrapper = new LambdaUpdateWrapper<>();
        // Update id corresponding records, set getDeleted to 2 for deletion
        updateWrapper
                .eq(WorkflowVersion::getId, id)
                .set(WorkflowVersion::getDeleted, 2);
        // Execute update
        workflowVersionMapper.update(null, updateWrapper);

        return ApiResult.success(new JSONObject());
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
        Workflow workflow = workflowMapper.selectOne(Wrappers.lambdaQuery(Workflow.class).eq(Workflow::getFlowId, flowId));
        if (workflow == null) {
            throw new BusinessException(ResponseEnum.WORKFLOW_NOT_EXIST);
        }
        Long spaceId = SpaceInfoUtil.getSpaceId();
        // dataPermissionCheckTool.checkWorkflowBelong(workflow, spaceId);

        List<WorkflowVersion> workflowVersions = workflowVersionMapper.selectList(Wrappers.lambdaQuery(WorkflowVersion.class).eq(WorkflowVersion::getFlowId, flowId).eq(WorkflowVersion::getName, name));
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
        log.info("Starting to update version result, input data: {}", createDto);
        WorkflowVersion workflowVersion = workflowVersionMapper.selectOne(Wrappers.lambdaQuery(WorkflowVersion.class).eq(WorkflowVersion::getId, createDto.getId()));
        if (workflowVersion == null) {
            throw new BusinessException(ResponseEnum.WORKFLOW_VERSION_NOT_FOUND);
        }
        Workflow workflow = workflowMapper.selectOne(Wrappers.lambdaQuery(Workflow.class).eq(Workflow::getFlowId, workflowVersion.getFlowId()));
        if (workflow == null) {
            throw new BusinessException(ResponseEnum.WORKFLOW_NOT_EXIST);
        }
        // dataPermissionCheckTool.checkWorkflowBelong(workflow);

        try {
            LambdaUpdateWrapper<WorkflowVersion> updateWrapper = new LambdaUpdateWrapper<>();
            // Update flowId corresponding records, set isVersion to 2
            updateWrapper.eq(WorkflowVersion::getId, createDto.getId())
                    .set(WorkflowVersion::getPublishResult,
                            WorkflowConst.PublishResult.normalize(createDto.getPublishResult()))
                    .set(WorkflowVersion::getUpdatedTime, new Date());
            // Execute update
            workflowVersionMapper.update(null, updateWrapper);
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
            // Query latest version (ordered by creation time descending)
            WorkflowVersion latestVersion = workflowVersionMapper.selectOne(
                    Wrappers.lambdaQuery(WorkflowVersion.class)
                            .eq(WorkflowVersion::getBotId, botId)
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
        } catch (Exception e) {
            log.error("Query workflow maximum version number exception, botId: {}", botId, e);
            throw new BusinessException(ResponseEnum.WORKFLOW_VERSION_GET_MAX_FAILED);
        }
    }
}
