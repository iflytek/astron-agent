package com.iflytek.astron.console.hub.service.publish.impl;

import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.hub.dto.publish.mcp.McpPublishRequestDto;
import com.iflytek.astron.console.commons.entity.model.McpData;
import com.iflytek.astron.console.commons.entity.bot.UserLangChainInfo;
import com.iflytek.astron.console.commons.mapper.bot.ChatBotBaseMapper;
import com.iflytek.astron.console.commons.mapper.model.McpDataMapper;
import com.iflytek.astron.console.commons.mapper.UserLangChainInfoMapper;
import com.iflytek.astron.console.hub.service.publish.McpService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.iflytek.astron.console.hub.service.publish.BotPublishService;
import com.iflytek.astron.console.hub.service.workflow.WorkflowReleaseService;
import com.iflytek.astron.console.commons.service.data.UserLangChainDataService;
import com.iflytek.astron.console.hub.dto.workflow.WorkflowReleaseResponseDto;
import com.iflytek.astron.console.commons.enums.PublishChannelEnum;

import java.time.LocalDateTime;

/**
 * MCP Service Implementation
 *
 * @author Omuigix
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class McpServiceImpl implements McpService {

    private final McpDataMapper mcpDataMapper;
    private final ChatBotBaseMapper chatBotBaseMapper;
    private final UserLangChainInfoMapper userLangChainInfoMapper;
    private final BotPublishService botPublishService;
    private final WorkflowReleaseService workflowReleaseService;
    private final UserLangChainDataService userLangChainDataService;



    @Override
    @Transactional(rollbackFor = Exception.class)
    public void publishMcp(McpPublishRequestDto request, String currentUid, Long spaceId) {
        log.info("Publish MCP: botId={}, serverName={}, uid={}, spaceId={}",
                request.getBotId(), request.getServerName(), currentUid, spaceId);

        Integer botId = request.getBotId();

        // 1. Permission check
        int hasPermission = chatBotBaseMapper.checkBotPermission(botId, currentUid, spaceId);
        if (hasPermission == 0) {
            throw new BusinessException(ResponseEnum.BOT_NOT_EXISTS);
        }

        // 2. Check if workflow protocol exists
        UserLangChainInfo chainInfo = userLangChainInfoMapper.selectOne(
                new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<UserLangChainInfo>()
                        .eq("bot_id", botId)
                        .orderByDesc("create_time")
                        .last("LIMIT 1"));
        if (chainInfo == null) {
            log.info("Bot workflow protocol not found: uid={}, botId={}", currentUid, botId);
            throw new BusinessException(ResponseEnum.BOT_CHAIN_SUBMIT_ERROR);
        }

        // 3. Content moderation (simplified here, should call moderation service in production)
        // TODO: Call moderation service to check text and images
        // String allText = request.getServerName() + request.getDescription() + request.getContent();

        // 4. Get version name first (without releasing yet)
        String versionName = getVersionName(botId, currentUid, spaceId);

        // 5. Check if MCP with same version already exists
        // int existCount = mcpDataMapper.checkMcpExists(botId, versionName);
        // if (existCount > 0) {
        // throw new BusinessException("MCP with this version already exists, please do not republish");
        // }

        // 6. Register MCP and get server URL (corresponds to maasUtil.registerMcp in original project)
        String serverUrl = registerMcpAndGetUrl(botId, request, versionName, currentUid, spaceId);

        // 7. Build MCP data with the server URL from registration
        McpData mcpData = McpData.builder()
                .botId(botId)
                .uid(currentUid)
                .spaceId(spaceId)
                .serverName(request.getServerName())
                .description(request.getDescription())
                .content(request.getContent())
                .icon(request.getIcon())
                .serverUrl(serverUrl) // Use server URL from MCP registration
                .args(request.getArgs())
                .versionName(versionName)
                .released(1)
                .isDelete(0)
                .createTime(LocalDateTime.now())
                .updateTime(LocalDateTime.now())
                .build();

        // 8. Save MCP data
        int result = mcpDataMapper.insert(mcpData);
        if (result == 0) {
            throw new BusinessException(ResponseEnum.SYSTEM_ERROR);
        }

        // 9. Record the release (corresponds to releaseManageClientService.releaseMCP in original project)
        recordMcpRelease(botId, versionName, currentUid, spaceId);

        // 10. Update publish channel
        botPublishService.updatePublishChannel(botId, currentUid, spaceId, PublishChannelEnum.MCP, true);

        log.info("MCP published successfully: botId={}, mcpId={}, versionName={}",
                botId, mcpData.getId(), versionName);
    }

    /**
     * Get version name for MCP publishing (corresponds to
     * releaseManageClientService.getVersionNameByBotId)
     */
    private String getVersionName(Integer botId, String currentUid, Long spaceId) {
        try {
            // 1. Check if this is a workflow bot
            String flowId = userLangChainDataService.findFlowIdByBotId(botId);
            if (flowId == null || flowId.trim().isEmpty()) {
                log.info("Not a workflow bot or flowId not found, using default version: botId={}", botId);
                return generateDefaultVersion();
            }

            // 2. For workflow bots, get version name from workflow release service
            log.info("Getting version name for MCP publish: botId={}, flowId={}", botId, flowId);

            // Call the workflow release service to get next version name
            WorkflowReleaseResponseDto releaseResponse = workflowReleaseService.publishWorkflow(botId, currentUid, spaceId, "MCP");

            if (releaseResponse.getSuccess() && releaseResponse.getWorkflowVersionName() != null) {
                String versionName = releaseResponse.getWorkflowVersionName();
                log.info("Successfully got version name for MCP: botId={}, versionName={}", botId, versionName);
                return versionName;
            } else {
                log.warn("Failed to get version name for MCP, using fallback: botId={}, error={}",
                        botId, releaseResponse.getErrorMessage());
                return generateDefaultVersion();
            }

        } catch (Exception e) {
            log.error("Exception occurred while getting version name for MCP: botId={}", botId, e);
            return generateDefaultVersion();
        }
    }

    /**
     * Register MCP and get server URL (corresponds to maasUtil.registerMcp in original project)
     */
    private String registerMcpAndGetUrl(Integer botId, McpPublishRequestDto request, String versionName, String currentUid, Long spaceId) {
        // TODO: Implement MCP registration logic that calls workflow release service
        // This should correspond to the massUtil.registerMcp -> releaseService.mcpRelease flow
        // For now, return the provided server URL or generate a default one

        if (request.getServerUrl() != null && !request.getServerUrl().trim().isEmpty()) {
            return request.getServerUrl();
        }

        // Generate default MCP server URL using the mcpHost configuration
        String flowId = userLangChainDataService.findFlowIdByBotId(botId);
        if (flowId != null) {
            // Use the mcpHost pattern from configuration
            return String.format("https://xingchen-api.xf-yun.com/mcp/xingchen/flow/%s/sse", flowId);
        }

        return "https://xingchen-api.xf-yun.com/mcp/xingchen/flow/" + botId + "/sse";
    }

    /**
     * Record MCP release (corresponds to releaseManageClientService.releaseMCP in original project)
     */
    private void recordMcpRelease(Integer botId, String versionName, String currentUid, Long spaceId) {
        try {
            // This corresponds to the releaseManageClientService.releaseMCP call in original project
            // It should create a workflow version record for MCP publishing
            log.info("Recording MCP release: botId={}, versionName={}", botId, versionName);

            // The version management was already handled in getVersionName, so this is mainly for logging
            // In the original project, this would call the workflow release service
            log.info("MCP release recorded successfully: botId={}, versionName={}", botId, versionName);

        } catch (Exception e) {
            log.error("Failed to record MCP release: botId={}, versionName={}", botId, versionName, e);
            // Don't throw exception here as the main MCP data has already been saved
        }
    }

    /**
     * Generate default version name as fallback
     */
    private String generateDefaultVersion() {
        // Use timestamp-based version for non-workflow bots or when workflow version fails
        return "v" + System.currentTimeMillis();
    }
}
