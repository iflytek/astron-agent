package com.iflytek.astron.console.toolkit.service.workflow;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.toolkit.entity.dto.talkagent.TalkAgentConfigDto;
import com.iflytek.astron.console.toolkit.entity.table.workflow.WorkflowConfig;
import com.iflytek.astron.console.toolkit.mapper.workflow.WorkflowConfigMapper;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Service class for handling Talk Agent configuration.
 * <p>
 * This service is responsible for retrieving and assembling Talk Agent configuration based on the
 * given bot ID, version, and configuration type.
 * </p>
 *
 * <p>
 * <b>Usage:</b> Used by workflow modules to obtain the voice assistant configuration corresponding
 * to a specific version of a workflow.
 * </p>
 *
 * @author clliu19
 * @date 2025/10/23
 */
@Service
@Slf4j
public class TalkAgentService {

    @Autowired
    private VersionService versionService;

    @Autowired
    private WorkflowConfigMapper workflowConfigMapper;

    /**
     * Retrieves Talk Agent configuration data for a specified bot.
     * <p>
     * If the version number is not specified:
     * <ul>
     * <li>When {@code type == "chat"}, the system will obtain the maximum available version.</li>
     * <li>Otherwise, the version is set to "-1".</li>
     * </ul>
     * The configuration is parsed from the workflow configuration JSON and mapped into
     * {@link TalkAgentConfigDto}.
     * </p>
     *
     * @param botId the unique identifier of the bot or assistant
     * @param version the version name; if null or blank, logic determines the latest or default version
     * @param type the configuration type (e.g., "chat", "edit", etc.)
     * @return the {@link TalkAgentConfigDto} object containing configuration details; returns an empty
     *         DTO if no matching workflow configuration is found
     * @throws RuntimeException if JSON parsing fails or database query encounters unexpected issues
     */
    public TalkAgentConfigDto getTalkAgentConfig(Integer botId, String version, String type) {
        // Build query condition for retrieving workflow configuration
        LambdaQueryWrapper<WorkflowConfig> lqw = new LambdaQueryWrapper<>();
        lqw.eq(WorkflowConfig::getBotId, botId);

        // Determine version based on type and provided version
        if (StringUtils.isBlank(version)) {
            if ("chat".equals(type)) {
                // Obtain the maximum available version for the bot when in chat mode
                ApiResult<JSONObject> maxVersion = versionService.getMaxVersion(String.valueOf(botId));
                String versionNum = maxVersion.data().getString("versionNum");
                if ("0".equals(versionNum)) {
                    versionNum = "-1";
                }
                lqw.eq(WorkflowConfig::getVersionNum, versionNum);
            } else {
                // If not chat mode and version not specified, use default placeholder "-1"
                lqw.eq(WorkflowConfig::getVersionNum, "-1");
            }
        } else {
            // Use version name as query key
            lqw.eq(WorkflowConfig::getName, version);
        }

        // Query workflow configuration from database
        WorkflowConfig workflowConfig = workflowConfigMapper.selectOne(lqw);

        TalkAgentConfigDto talkAgentConfigDto = new TalkAgentConfigDto();
        if (workflowConfig != null) {
            // Parse stored JSON configuration into DTO
            talkAgentConfigDto = JSON.parseObject(workflowConfig.getConfig(), TalkAgentConfigDto.class);
            talkAgentConfigDto.setBotId(workflowConfig.getBotId());
            talkAgentConfigDto.setFlowId(workflowConfig.getFlowId());
            log.debug("TalkAgent configuration loaded successfully for botId: {}, version: {}", botId, version);
        } else {
            log.warn("No TalkAgent configuration found for botId: {}, version: {}", botId, version);
        }

        return talkAgentConfigDto;
    }
}
